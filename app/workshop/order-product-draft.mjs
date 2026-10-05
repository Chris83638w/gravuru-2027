import {readReviewPackage,digest} from './review-package.mjs';
import {resolveFormCustomer} from './form-customer-model.mjs';
import {verifyFormSource,validateFormProduct} from './form-product.mjs';
import {verifyFormDesignSources} from './form-designs.mjs';

const fail=(message,status=422)=>{throw Object.assign(Error(message),{status,code:'order_product_draft'});};
const key=id=>'order-product:'+id;
export function orderProductDraft(repository,line){
  const prior=repository.importItem(key(line.id));
  return prior?repository.get(prior.id):null;
}

export function planOrderProductDraft({line,archive,input,assets,contours,fonts}){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['name','textMode','token'].includes(k)) ||
     typeof input.name!=='string'||!input.name.trim()||input.name.length>200||!['template','customer'].includes(input.textMode))fail('Produktname und Textübernahme bitte ausdrücklich festlegen.');
  const {files,manifest}=readReviewPackage(archive,line.sourcePackageSha256);
  if(manifest.id!==line.snapshotId||manifest.product.id!==line.product.id||manifest.product.revision!==line.product.revision)fail('Bestellposition und gesicherte Gestaltung stimmen nicht überein.');
  let saved,frozenFonts;try{saved=JSON.parse(files.get('produkt-und-gestaltung.json'));frozenFonts=JSON.parse(files.get('schriften.json'));}catch{fail('Der gesicherte Produktstand ist unvollständig.');}
  if(saved.schema!=='gravuru-form-review-input/v1'||saved.designId!==manifest.source.designId)fail('Der gesicherte Designbezug ist unvollständig.');
  const original=saved.product.designs?.find(d=>d.id===saved.designId);
  if(!original)fail('Das bestellte Design ist nicht im Prüfstand enthalten.');
  for(const name of new Set(saved.customer.fields.filter(f=>f.font&&!f.deleted).map(f=>f.font))){
    if(!frozenFonts?.[name]||!fonts[name]||digest(JSON.stringify(frozenFonts[name]))!==digest(JSON.stringify(fonts[name])))fail('Eine gesicherte Schrift ist hier verändert oder nicht mehr verfügbar.');
  }
  // Only layout/state is reused. Private image bytes and draft access tokens never enter the product.
  const resolved=resolveFormCustomer(saved.product,saved.designId,saved.customer,{assets,fonts,media:()=>({})});
  const document=resolved.document,design=document.designs.find(d=>d.id===saved.designId);
  if(input.textMode==='template')for(const field of design.fields.filter(f=>f.type==='text'))field.text=original.fields.find(f=>f.id===field.id).text;
  document.name=input.name.trim();document.kind='product';document.masterId=null;document.seo={title:document.name.slice(0,70),description:''};
  document.designs=[design];document.defaultDesignId=design.id;
  const checked=verifyFormDesignSources(verifyFormSource(validateFormProduct(document),contours),assets,fonts);
  const origin={orderLineId:line.id,snapshotId:line.snapshotId,packageSha256:line.sourcePackageSha256,productId:line.product.id,productRevision:line.product.revision};
  const token=digest(JSON.stringify({recipe:'order-product-draft/v1',origin,document:checked,textMode:input.textMode}));
  return {document:checked,token,origin,textMode:input.textMode,photoCount:manifest.photos.length,
    removedFields:original.fields.length-design.fields.length,
    fields:design.fields.map(f=>({id:f.id,label:f.label,type:f.type,...(f.type==='text'?{text:f.text}:{})})),
    warnings:[...(manifest.photos.length?['Kundenfotos werden nicht als Produktbilder übernommen. Die Fotobereiche bleiben austauschbar.']:[]),
      input.textMode==='customer'?'Kundentexte werden als neue Beispieltexte übernommen. Vor Verwendung prüfen.':'Beispieltexte stammen aus der ursprünglichen Produktvorlage.',
      'Neuer privater Produktentwurf: keine Shop-Verknüpfung und keine Veröffentlichung.']};
}

export function applyOrderProductDraft(repository,plan,token){
  if(token!==plan.token)fail('Die Übernahme wurde seit der Vorschau geändert. Bitte erneut prüfen.',409);
  const [result]=repository.importBatch([{key:key(plan.origin.orderLineId),fingerprint:plan.token,document:plan.document}]);
  return {created:result.created,product:repository.get(result.id),origin:plan.origin};
}
