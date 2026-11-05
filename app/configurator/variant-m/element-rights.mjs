export const ELEMENT_RIGHT_FIELDS=Object.freeze({
  content:['text','font','bold','italic'], color:['color','preserveColors','opacity'],
  replace:['motif','uxUploadId','uxUploadKind','uxPhotoBackground','uxPhotoCrop','uxPhotoColor'],
  move:['x','y','rotation'], scale:['w','h','size'],
});
export const ELEMENT_RIGHTS=Object.freeze(['content','color','replace','move','scale','delete']);
const structural=['letterSpacing','textAnchor','lineHeight','type','fieldKey','photoShape','photoMaskAssetId','shape','filled','strokeWidth','assetId','required','templateOrigin','customerEditable','locked','technicalLocked','acrylicFixed','role'];
export const rightForProperty=key=>Object.entries(ELEMENT_RIGHT_FIELDS).find(([,fields])=>fields.includes(key))?.[0];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Source leading is fixed relative to font size when the customer may scale text.
const templateProperties=(original,object,permission)=>permission.scale&&original.type==='text'&&Number.isFinite(original.lineHeight)&&Number.isFinite(original.size)&&original.size>0&&Number.isFinite(object.size)&&object.size>0?{...original,lineHeight:original.lineHeight*(object.size/original.size)}:original;
const sameTemplateProperty=(key,value,expected,permission)=>same(value,expected)||(key==='lineHeight'&&permission.scale&&Number.isFinite(value)&&Number.isFinite(expected)&&Math.abs(value-expected)<=1e-9*Math.max(1,Math.abs(expected)));

// Rights derived from the legacy flags of a template element. This is the only
// source when a product carries no rights document, and the upper bound a
// rights document may grant (see product-model capability check).
export function legacyElementRights(object){
  const editable=object.customerEditable!==false&&!object.technicalLocked&&!object.locked;
  const movable=editable&&!object.acrylicFixed;
  return {content:editable&&object.type==='text',color:editable&&['text','motif','graphic'].includes(object.type),
    replace:editable&&(object.type==='photoSlot'||movable&&object.type==='motif'),move:movable,scale:movable,
    delete:!object.acrylicFixed&&!object.locked&&!object.technicalLocked&&object.customerEditable!==false};
}
// Rights table for every template element of a design: the persisted document
// (`workshopElementRights`) if present, otherwise the legacy flags. A document
// without an entry for an element fails closed.
export function designElementRights(config,designId,source){
  const document=config?.workshopElementRights;
  return Object.fromEntries(source.map(object=>[object.id,document?{...(document[designId]?.[object.id]??{})}:legacyElementRights(object)]));
}

// Free additions by the customer. Without an explicit product flag, text and
// motifs may be added (what `newEditableObject` offers); photo areas, raster
// motifs and graphics only ever come from the template. Logo uploads follow
// `config.logo.enabled` and are not counted here.
export const CUSTOMER_ADDITION_LIMIT=19;
export function customerAdditionPolicy(config){
  const p=config?.customerAdditions;
  if(p===undefined)return {text:true,motifs:true,maxElements:CUSTOMER_ADDITION_LIMIT};
  return {text:p.text===true,motifs:p.motifs===true,maxElements:p.maxElements};
}
export function validateCustomerAdditions(config){
  const p=config?.customerAdditions;
  if(p===undefined)return;
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='maxElements,motifs,text'||typeof p.text!=='boolean'||typeof p.motifs!=='boolean'||!Number.isInteger(p.maxElements)||p.maxElements<0||p.maxElements>CUSTOMER_ADDITION_LIMIT)throw Error('Kundenfreigaben zum Hinzufügen: Text, Motive und höchstens '+CUSTOMER_ADDITION_LIMIT+' zusätzliche Elemente festlegen.');
}
// Trusted template lines (design.marks) become editable objects in the editor;
// they are template-derived, not customer additions.
export const isDecorationLine=(object,design)=>object.uxDecoration===true&&object.type==='motif'&&object.id===object.motif&&(design.marks||[]).some((_,i)=>'ux-line-'+design.id+'-'+i===object.motif);

export function canEditElement(config,designId,object,right){
  if(!object)return false;
  if(config?.workbench?.embedded)return true;
  const source=config?.profile?.designs?.find(d=>d.id===designId)?.objects.find(o=>o.id===object.id);
  // Layer order of template elements is fixed; only added elements may be reordered above them.
  if(right==='order')return !source;
  if(!config?.workshopElementRights)return true;
  if(!source)return !object.technicalLocked&&!object.locked;
  return config.workshopElementRights[designId]?.[source.id]?.[right]===true;
}

// Mirrors the persisted document's six independent rights. It does not validate
// price/media, grant new-object capabilities, or replace server validation.
// Previous accepted objects preserve allowed edits when a forbidden deletion is undone.
// Template elements keep their layer order; added elements always lie above them.
export function restoreElementRights(source,objects,rights,previous=[]){
  const result=objects.map(object=>structuredClone(object)),blocked=new Set();
  const restore=(object,original,key)=>{if(same(object[key],original[key]))return;blocked.add(original.id);if(Object.hasOwn(original,key))object[key]=structuredClone(original[key]);else delete object[key];};
  for(const original of source){
    const permission=rights[original.id]??{};
    let index=result.findIndex(object=>object.id===original.id),object=result[index];
    for(let i=result.length-1;i>index&&index>=0;i--)if(result[i].id===original.id){result.splice(i,1);blocked.add(original.id);}
    if(!object&&!permission.delete){
      object=structuredClone(previous.find(item=>item.id===original.id)??original);
      index=Math.min(source.indexOf(original),result.length);result.splice(index,0,object);blocked.add(original.id);
    }
    if(!object)continue;
    const template=templateProperties(original,object,permission);
    for(const key of structural)if(!sameTemplateProperty(key,object[key],template[key],permission))restore(object,template,key);
    for(const [right,fields] of Object.entries(ELEMENT_RIGHT_FIELDS))if(!permission[right]){
      for(const key of fields){
        // Text width/height follow its permitted content; point size does not.
        if(right==='scale'&&original.type==='text'&&permission.content&&['w','h'].includes(key))continue;
        restore(object,original,key);
      }
    }
    if(!permission.delete){
      if(object.uxHidden===true&&original.uxHidden!==true)restore(object,original,'uxHidden');
      if(object.opacity===0&&original.opacity!==0){
        const prior=previous.find(item=>item.id===original.id);
        restore(object,{...original,opacity:prior?.opacity>0?prior.opacity:original.opacity},'opacity');
      }
    }
  }
  const position=new Map(source.map((object,i)=>[object.id,i]));
  const ordered=[...result.filter(object=>position.has(object.id)).sort((a,b)=>position.get(a.id)-position.get(b.id)),...result.filter(object=>!position.has(object.id))];
  for(const [i,object] of ordered.entries())if(result[i]!==object){blocked.add(object.id);}
  return {objects:ordered,blockedIds:[...blocked]};
}

// Server-side gate for every accepted customer design (draft, cart, order):
// the restored version must equal the submitted one, additions must be
// permitted, and template layers keep their order. Returns a German message or null.
export function templateRightsIssue(config,design,source,objects){
  const rights=designElementRights(config,source.id,source.objects),originals=new Map(source.objects.map(object=>[object.id,object]));
  const label=object=>object.fieldKey||object.id;
  const restored=restoreElementRights(source.objects,objects,rights);
  for(const id of restored.blockedIds){
    const original=originals.get(id);
    if(!original)continue;
    const matches=objects.filter(object=>object.id===id),current=matches[0],permission=rights[id];
    if(matches.length>1)return 'Das Vorlagenelement „'+label(original)+'“ darf nicht dupliziert werden.';
    if(!current||current.uxHidden===true&&original.uxHidden!==true||current.opacity===0&&original.opacity!==0)return 'Das Vorlagenelement „'+label(original)+'“ darf nicht entfernt oder ausgeblendet werden.';
    const template=templateProperties(original,current,permission);
    if(structural.some(key=>!sameTemplateProperty(key,current[key],template[key],permission)))return 'Das Vorlagenelement „'+label(original)+'“ darf seine Vorlageneigenschaften nicht ändern.';
    for(const [right,fields] of Object.entries(ELEMENT_RIGHT_FIELDS))if(!permission[right]&&fields.some(key=>!same(current[key],original[key])&&!(right==='scale'&&original.type==='text'&&permission.content&&['w','h'].includes(key))))return 'Das Vorlagenelement „'+label(original)+'“ darf nicht verändert werden (Recht '+right+' fehlt).';
  }
  const templateIds=objects.filter(object=>originals.has(object.id)).map(object=>object.id);
  const expected=source.objects.map(object=>object.id).filter(id=>templateIds.includes(id));
  if(templateIds.join('\0')!==expected.join('\0'))return 'Die Ebenenreihenfolge der Vorlagenelemente darf nicht verändert werden.';
  const lastTemplate=objects.findLastIndex(object=>originals.has(object.id));
  if(objects.some((object,i)=>!originals.has(object.id)&&i<lastTemplate))return 'Neue Elemente müssen oberhalb der Vorlagenelemente liegen.';
  if(!same(restored.objects,objects))return 'Dieses Vorlagenelement darf nicht verändert werden.';
  const policy=customerAdditionPolicy(config);
  let added=0;
  for(const object of objects.filter(object=>!originals.has(object.id)&&!isDecorationLine(object,design))){
    if(object.type==='image'&&object.uxUploadKind==='logo'&&object.uxUploadId)continue;
    // Photo uploads have their own enabled/count/file validation in the contract.
    // A valid additional photo is not a free text/motif addition.
    if(config.photo?.enabled&&object.type==='photoSlot'&&object.uxUploadKind==='photo'&&object.uxUploadId)continue;
    if(!['text','motif'].includes(object.type))return 'Dieses Element wird nicht zum freien Hinzufügen angeboten.';
    if(!(object.type==='text'?policy.text:policy.motifs))return object.type==='text'?'Eigener Text ist bei diesem Produkt nicht vorgesehen.':'Eigene Motive sind bei diesem Produkt nicht vorgesehen.';
    if(++added>policy.maxElements)return 'Für dieses Produkt sind höchstens '+policy.maxElements+' zusätzliche Elemente möglich.';
  }
  return null;
}

export function canDeleteTemplateElement(config,designId,object){
 if(!object||object.technicalLocked)return false;
 if(config?.workshopElementRights)return config.workshopElementRights[designId]?.[object.id]?.delete===true;
 return !object.acrylicFixed&&!object.locked&&object.type!=='motif-raster'&&object.customerEditable!==false;
}
