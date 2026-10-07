import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const currentProducts=repository=>repository.list({includeArchived:true}).filter(row=>row.document.schema!=='gravuru-form-product/v1'||row.document.profileAssignments);
const reviewToken=(records,review,input)=>createHash('sha256').update(JSON.stringify({input,review,products:records.map(row=>({id:row.id,revision:row.revision,status:row.status}))})).digest('hex');
function checkToken(actual,expected){
  if(typeof actual!=='string'||!/^[a-f0-9]{64}$/.test(actual))throw Object.assign(Error('Ungültige Bestätigung der Profilvorschau.'),{status:422,code:'invalid_impact_token'});
  if(actual!==expected)throw Object.assign(Error('Produkte oder Zuordnungen haben sich seit der Vorschau geändert. Bitte die Auswirkungen erneut prüfen.'),{status:409,code:'profile_impact_changed'});
}
function productChange(row,before,after,type){
  const source=before.sources[type],target=after.sources[type],changedTypes=Object.keys(before.selections).filter(key=>!isDeepStrictEqual(before.selections[key],after.selections[key]));
  return {id:row.id,name:row.document.name,kind:row.kind,revision:row.revision,status:row.status,source:{level:source.level,categoryId:source.categoryId},target:{level:target.level,categoryId:target.categoryId},selectionChanged:changedTypes.length>0,changes:changedTypes.map(key=>({type:key,before:before.selections[key],after:after.selections[key]}))};
}

/** Current product selection only; historical product/order snapshots are never rewritten. */
export function profileChangeImpact(repository,profiles,id,document,expectedRevision){
  const records=currentProducts(repository);
  const review=profiles.previewSave(id,document,expectedRevision,records.map(row=>row.document));
  const products=[];
  review.comparisons.forEach(({before,after},index)=>{
    const source=before.sources[review.profile.type];
    if(source.profileId!==id)return;
    products.push(productChange(records[index],before,after,review.profile.type));
  });
  const token=reviewToken(records,review,{id,document,expectedRevision});
  return {profile:review.profile,settingsRevision:review.settingsRevision,token,products,total:products.length,changed:products.filter(row=>row.selectionChanged).length,scope:'current-product-selections'};
}

export function saveReviewedProfile(repository,profiles,id,{document,expectedRevision,impactToken}){
  if(impactToken!==undefined){
    const current=profileChangeImpact(repository,profiles,id,document,expectedRevision);
    checkToken(impactToken,current.token);
  }
  return profiles.save(id,document,expectedRevision);
}

export function assignmentChangeImpact(repository,profiles,input){
  if(Object.hasOwn(input,'categoryId')&&(typeof input.categoryId!=='string'||!input.categoryId.trim()))throw Object.assign(Error('Bitte eine Kategorie-ID angeben.'),{status:422,code:'category_required'});
  const {type,assignment,expectedRevision}=input,categoryId=Object.hasOwn(input,'categoryId')?input.categoryId:null;
  const records=currentProducts(repository),review=profiles.previewAssignment(categoryId,type,assignment,expectedRevision,records.map(row=>row.document)),products=[];
  review.comparisons.forEach(({before,after},index)=>{
    const product=productChange(records[index],before,after,type);
    if(product.selectionChanged||!isDeepStrictEqual(before.sources[type],after.sources[type]))products.push(product);
  });
  return {kind:'assignment',profile:{type,name:categoryId===null?'Standardzuordnung':`Kategorie „${categoryId}“`},settingsRevision:review.settingsRevision,token:reviewToken(records,review,{type,assignment,expectedRevision,categoryId}),products,total:products.length,changed:products.filter(row=>row.selectionChanged).length,scope:'current-product-selections'};
}

export function saveReviewedAssignment(repository,profiles,input){
  if(input.impactToken!==undefined)checkToken(input.impactToken,assignmentChangeImpact(repository,profiles,input).token);
  return Object.hasOwn(input,'categoryId')?profiles.setCategory(input.categoryId,input.type,input.assignment,input.expectedRevision):profiles.setDefault(input.type,input.assignment,input.expectedRevision);
}
