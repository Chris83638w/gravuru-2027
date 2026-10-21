// Explicit native package: no automatic fitting, photo masks and rotations survive.
// v1 remains handled unchanged by prepared-design.mjs. Assets use the existing sanitizer.
import {sha256} from './design-assets.mjs';
import {validateProductDocument,validateProductDesign} from './product-model.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
const fail=(message,status=422)=>{throw Object.assign(Error(message),{status,code:'prepared_design_invalid'});};
const idValid=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(s);
const rotation=l=>{const r=l.rotation??0;if(!Number.isFinite(r)||Math.abs(r)>360)fail('Ungültige Drehung.');return r;};
const sizeOK=(w,h)=>[w,h].every(v=>Number.isFinite(v)&&v>0&&v<=2000);
const lockedRights={content:false,color:false,replace:false,move:false,scale:false,delete:false};
export async function planNativePreparedDesign(repository,assets,id,input){
 const record=repository.get(id),p=input.package;
 if(record.revision!==input.expectedRevision)fail('Die Konfiguration wurde geändert. Bitte neu laden.',409);
 if(record.status==='archived')fail('Archivierte Produkte können nicht importiert werden.');
 if(p.schema!=='gravuru-prepared-design/v2'||!idValid(p.designId)||!idValid(p.designSku)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!/^[a-f0-9]{64}$/.test(p.sourceSha256||''))fail('Ungültiges natives Vorlagenpaket.');
 if(!sizeOK(p.widthMm,p.heightMm)||p.fit!=='actual-size'||!Number.isFinite(p.blankBottomMm)||p.blankBottomMm<0||p.blankBottomMm>=p.heightMm||!Array.isArray(p.layers)||p.layers.length<2||p.layers.length>20)fail('Native Maße, Freiraum oder Ebenenzahl ungültig.');
 const document=structuredClone(record.document),config=document.config,geometry=config.profile.geometry;
 if(config.profile.material.kind!=='acrylic'||p.materialKind!=='acrylic'||geometry.width!==p.widthMm||geometry.height!==p.heightMm)fail('Die native Vorlage benötigt dieselbe Acryl-Designfläche. Es wird nicht automatisch skaliert.');
 if(config.profile.designs.some(d=>d.id===p.designId||d.preparedTemplate?.designSku===p.designSku))fail('Design-ID oder Design-SKU ist bereits vorhanden.',409);
 if(config.profile.designs.length>=60)fail('Höchstens 60 Designs pro Produkt.');
 const d={id:p.designId,name:p.name,category:p.category||'',objects:[],marks:[],customerFields:[],preparedTemplate:{schema:p.schema,sourceSha256:p.sourceSha256,packageSha256:sha256(JSON.stringify(p)),scale:1,widthMm:p.widthMm,heightMm:p.heightMm,blankBottomMm:p.blankBottomMm,designSku:p.designSku}};
 const table={},seen=new Set();let photos=0;
 async function asset(file,w,h,label){
  if(!file||typeof file.name!=='string'||typeof file.bytes!=='string')fail(label+' fehlt.');
  const a=await assets.import(file);
  if(a.format!=='svg'||Math.abs(a.widthMm-w)>.001||Math.abs(a.heightMm-h)>.001)fail(label+': SVG-Maße stimmen nicht mit der Ebene überein.');
  return a;
 }
 for(const l of p.layers){
  if(!l||!idValid(l.id)||seen.has(l.id)||![l.x,l.y].every(Number.isFinite))fail('Ebenenkennung oder Position ungültig.');seen.add(l.id);
  const o={id:l.id,x:l.x,y:l.y,rotation:rotation(l),templateOrigin:true};
  if(l.type==='artwork'){
   if(!sizeOK(l.widthMm,l.heightMm))fail('Motivmaße ungültig.');
   const a=await asset({name:l.name,bytes:l.bytes},l.widthMm,l.heightMm,'Motiv'),r=assets.resource(a.assetId);
   if(!config.localResources.motifs.some(m=>m.key===r.key))config.localResources.motifs.push(r);
   Object.assign(o,{type:'motif',motif:r.key,w:l.widthMm,h:l.heightMm,color:'#000000',preserveColors:true,locked:true,customerEditable:false,acrylicFixed:true});
   d.importedSource??={assetId:a.assetId,originalName:l.name,fit:'actual-size',scale:1};
   table[o.id]={...lockedRights};
  }else{
   if(!['text','photoSlot'].includes(l.type)||!l.id.startsWith('customer-')||!idValid(l.fieldKey)||typeof l.label!=='string'||!l.label.trim()||l.label.length>80)fail('Kundenfeld unvollständig.');
   Object.assign(o,{type:l.type,fieldKey:l.fieldKey,customerEditable:true});
   table[o.id]={...lockedRights};
   if(l.type==='text'){
    if(!Object.hasOwn(config.localResources.fonts,l.font)||typeof l.allowColor!=='boolean'||['allowMove','allowScale','allowDelete'].some(k=>l[k]!==false))fail('Text benötigt vorhandene Schrift und feste Layoutrechte.');
    Object.assign(o,{text:l.text,font:l.font,size:l.size,letterSpacing:l.letterSpacing??0,color:l.color,bold:false,w:1,h:1});
    measureText(o,config.localResources.fonts);table[o.id].content=true;table[o.id].color=l.allowColor;
   }else{
    if(!config.photo.enabled||!sizeOK(l.widthMm,l.heightMm)||typeof l.required!=='boolean'||!['rect','circle','arch','template'].includes(l.shape))fail('Fotofeld ungültig.');
    photos++;Object.assign(o,{w:l.widthMm,h:l.heightMm,photoShape:l.shape,required:l.required,acrylicFixed:true});table[o.id].replace=true;
    if(l.shape==='template')o.photoMaskAssetId=(await asset(l.mask,l.widthMm,l.heightMm,'Fotomaske')).assetId;
    else if(l.mask!==undefined)fail('Eine eigene Fotomaske benötigt die Form template.');
    if(l.example){const a=await asset(l.example,l.widthMm,l.heightMm,'Beispielfoto');config.localResources.photoExamples??=[];config.localResources.photoExamples.push({designId:d.id,slotId:o.id,assetId:a.assetId});}
   }
   d.customerFields.push({id:o.id,label:l.label});
  }
  const angle=o.rotation*Math.PI/180,halfH=(Math.abs(o.w*Math.sin(angle))+Math.abs(o.h*Math.cos(angle)))/2;
  if(o.y+halfH>p.heightMm-p.blankBottomMm+.001)fail('Eine Ebene ragt in den bestätigten Sockelfreiraum.');
  d.objects.push(o);
 }
 if(photos!==1||!d.importedSource)fail('Genau ein Fotofeld und eine separate Motivebene sind erforderlich.');
 config.profile.designs.push(d);document.elementRights[d.id]=table;
 if(input.makeDefault===true)config.profile.defaultDesignId=d.id;
 const checked=validateProductDocument(document);assets.validateDocument(checked);
 const design=checked.config.profile.designs.find(v=>v.id===d.id);validateProductDesign(checked,design);
 const photoExampleMarkup=o=>{const e=checked.config.localResources.photoExamples?.find(e=>e.designId===d.id&&e.slotId===o.id);return e?`<image href="/api/workshop/design-assets/${e.assetId}/preview.svg" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}"/>`:null;};
 const token=sha256(JSON.stringify({id,expectedRevision:input.expectedRevision,document:checked}));
 return {document:checked,token,designId:d.id,designSku:p.designSku,name:d.name,fields:d.customerFields.length,layers:d.objects.length,scale:1,svg:studioSvg(checked.config.profile,design,checked.config.localResources.fonts,{motifs:checked.config.localResources.motifs,handles:false,photoExampleMarkup}),warnings:['Native Designfläche 1:1; keine automatische Skalierung.','Design-SKU zugeordnet; keine Shopify-Varianten angelegt.','Beispielfoto ist keine Kundenbestellung. Ein eigener Foto-Upload bleibt erforderlich.','RGB-Entwurf; keine Fertigungsfreigabe.']};
}
