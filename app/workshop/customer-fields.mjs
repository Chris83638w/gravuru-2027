import {validateProductDocument,validateProductDesign} from './product-model.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {sha256} from './design-assets.mjs';

const fail=(code,message)=>{throw Object.assign(Error(message),{status:422,code});};
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(value);
const rights=type=>({content:type==='text',color:false,replace:type==='photoSlot',move:false,scale:false,delete:false});

// Fields are explicit additions to an unchanged source, never inferred from PDF paths.
// The normal product repository owns revisions, conflicts and historical snapshots.
export function planCustomerFields(repository,assets,id,input){
  const record=repository.get(id);
  if(record.revision!==input.expectedRevision)throw Object.assign(Error('Die Konfiguration wurde geändert. Bitte den aktuellen Stand laden.'),{status:409,code:'stale_revision'});
  if(record.status==='archived')fail('archived_product','Bitte die Konfiguration zuerst wieder aktivieren.');
  const document=structuredClone(record.document),design=document.config.profile.designs.find(d=>d.id===input.designId);
  if(!design?.importedSource)fail('import_required','Bitte ein importiertes Design auswählen.');
  if(!Array.isArray(input.fields)||input.fields.length>19)fail('invalid_fields','Höchstens 19 Kundenfelder pro importiertem Design.');
  if(input.fields.length&&input.sourcePrepared!==true)fail('source_not_prepared','Bitte bestätigen: Die Originalgrafik enthält an diesen Stellen keine zu ersetzenden Texte oder Fotos.');
  const previous=new Set((design.customerFields||[]).map(f=>f.id));
  const originalOrder=design.objects.map(o=>o.id);
  design.objects=design.objects.filter(o=>!previous.has(o.id));
  const designRights=document.elementRights[design.id];
  for(const old of previous)delete designRights[old];
  const ids=new Set(design.objects.map(o=>o.id)),keys=new Set(design.objects.map(o=>o.fieldKey).filter(Boolean));
  design.customerFields=[];
  for(const field of input.fields){
    if(!field||!validId(field.id)||!field.id.startsWith('customer-')||ids.has(field.id))fail('invalid_field_id','Kundenfelder brauchen eindeutige Kennungen.');
    if(!validId(field.fieldKey)||keys.has(field.fieldKey))fail('invalid_field_key','Jedes Kundenfeld braucht einen eindeutigen Feldschlüssel.');
    if(typeof field.label!=='string'||!field.label.trim()||field.label.length>80||/[\x00-\x1f]/.test(field.label))fail('invalid_field_label','Bitte eine verständliche Feldbezeichnung mit höchstens 80 Zeichen eingeben.');
    if(!['text','photoSlot'].includes(field.type))fail('invalid_field_type','Nur Textfelder und Fotobereiche sind unterstützt.');
    if(![field.x,field.y].every(Number.isFinite))fail('invalid_field_geometry','Bitte gültige Positionen in mm eingeben.');
    ids.add(field.id);keys.add(field.fieldKey);
    const object={id:field.id,fieldKey:field.fieldKey,type:field.type,x:field.x,y:field.y,rotation:0,customerEditable:true,templateOrigin:true};
    if(field.type==='text'){
      for(const key of ['allowScale','allowDelete'])if(field[key]!==undefined&&typeof field[key]!=='boolean')throw Object.assign(Error('Größen-/Löschfreigabe muss ein Wahrheitswert sein.'),{status:422});
      if(field.allowMove!==undefined&&typeof field.allowMove!=='boolean')fail('invalid_field_right','Positionsfreigabe muss ein Wahrheitswert sein.');
      if(typeof field.allowColor!=='boolean')fail('invalid_field_right','Farbfreigabe ausdrücklich festlegen.');
      if(!Object.hasOwn(document.config.localResources.fonts,field.font))fail('invalid_field_font','Bitte eine vorhandene Schrift auswählen.');
      Object.assign(object,{text:field.text,font:field.font,size:field.size,color:field.color,bold:false,w:1,h:1,...(field.letterSpacing!==undefined?{letterSpacing:field.letterSpacing}:{})});
      // Product validation checks text, font, colour and size before measuring.
    }else{
      if(!document.config.photo.enabled)fail('photo_disabled','Fotofunktion für dieses Produkt nicht freigegeben.');
      if(!/^photo-[\w-]+$/.test(field.fieldKey)||typeof field.required!=='boolean')fail('invalid_photo_field','Fotofelder benötigen einen Schlüssel photo-… und eine Pflichtfeld-Auswahl.');
      if(field.shape==='circle'&&field.widthMm!==field.heightMm)fail('invalid_photo_shape','Ein runder Fotobereich braucht gleiche Breite und Höhe.');
      Object.assign(object,{w:field.widthMm,h:field.heightMm,photoShape:field.shape,required:field.required,acrylicFixed:true});
    }
    design.objects.push(object);
    design.customerFields.push({id:field.id,label:field.label.trim()});
    designRights[object.id]={...rights(object.type),color:object.type==='text'&&field.allowColor,move:object.type==='text'&&field.allowMove!==false,scale:object.type==='text'&&field.allowScale!==false,delete:object.type==='text'&&field.allowDelete!==false};
  }
  if(design.preparedTemplate)design.objects.sort((a,b)=>{const rank=o=>{const i=originalOrder.indexOf(o.id);return i<0?originalOrder.length:i;};return rank(a)-rank(b);});
  if(document.config.photo.hints)document.config.photo.hints=document.config.photo.hints.filter(h=>h.designId!==design.id||design.objects.some(o=>o.id===h.slotId&&o.type==='photoSlot'));
  if(document.config.localResources.photoExamples)document.config.localResources.photoExamples=document.config.localResources.photoExamples.filter(e=>e.designId!==design.id||design.objects.some(o=>o.id===e.slotId&&o.type==='photoSlot'));
  let checked;
  try{
    checked=validateProductDocument(document);
    const current=checked.config.profile.designs.find(d=>d.id===design.id);
    for(const object of current.objects.filter(o=>o.type==='text'))measureText(object,checked.config.localResources.fonts);
    validateProductDesign(checked,current,{template:true});
    assets.validateDocument(checked);
  }catch(error){fail('invalid_fields',error.message);}
  const current=checked.config.profile.designs.find(d=>d.id===design.id);
  const svg=studioSvg(checked.config.profile,current,checked.config.localResources.fonts,{motifs:checked.config.localResources.motifs,handles:false});
  const token=sha256(JSON.stringify({id,expectedRevision:input.expectedRevision,document:checked}));
  return {document:checked,designId:design.id,expectedRevision:record.revision,token,svg,fields:current.customerFields,
    warnings:['Die Originalgrafik bleibt unverändert. Bereits enthaltene Texte und Fotos werden nicht entfernt oder automatisch editierbar.','Die Originalgrafik und Fotomaske bleiben gesperrt. Textposition, Größenänderung und Entfernen werden je Feld im Backend freigegeben.']};
}

export function applyCustomerFields(repository,assets,id,input){
  const plan=planCustomerFields(repository,assets,id,input);
  if(plan.token!==input.token)throw Object.assign(Error('Die Felder wurden seit der Vorschau geändert. Bitte erneut prüfen.'),{status:409,code:'review_changed'});
  return repository.save(id,plan.document,input.expectedRevision);
}
