import {sha256} from './design-assets.mjs';
import {fittedArtwork} from '../configurator/variant-m/design-area.mjs';
import {objectIssue} from '../platform/sources/app/shared/models/design-content.mjs';
import {validateProductDocument,validateProductDesign} from './product-model.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {MAX_FORM_DESIGNS} from './form-designs.mjs';
import {applyNewMotifRights} from '../configurator/variant-m/new-motif-rights.mjs';
const fail=(message,status=422)=>{throw Object.assign(Error(message),{status,code:'prepared_design_invalid'});};
const validId=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(s);
const rights=type=>({content:type==='text',color:false,replace:type==='photoSlot',move:false,scale:false,delete:false});

// A package drawn for exactly this product size is placed 1:1 on the plate.
// Any other size is fitted proportionally into this product's own contour
// (same rule as SVG/PDF import); never into another material's area.
export function preparedPlacement(config,p){
 const g=config.profile.geometry,doorbell=config.profile.kind==='layered-doorbell';
 const width=doorbell?160:g.width,height=doorbell?280:g.height;
 if(Math.abs(p.widthMm-width)<=.5&&Math.abs(p.heightMm-height)<=.5){
  const scale=Math.min(width/p.widthMm,height/p.heightMm),box={type:'motif',acrylicFixed:true,templateOrigin:true,x:width/2,y:height/2,w:p.widthMm*scale,h:p.heightMm*scale,rotation:0};
  if(!objectIssue(box,config.profile))return {scale,ox:(width-box.w)/2,oy:(height-box.h)/2,fit:'original'};
 }
 const f=fittedArtwork(config,p.widthMm,p.heightMm);
 return {scale:f.scale,ox:f.x-f.w/2,oy:f.y-f.h/2,fit:'contain'};
}

// The package is data, never executable code. Every artwork is sanitized by the
// existing asset importer. A preview does not write a product revision.
export async function planPreparedDesign(repository,assets,id,input){
 const record=repository.get(id);
 if(record.revision!==input.expectedRevision)fail('Die Konfiguration wurde geändert. Bitte neu laden.',409);
 if(record.status==='archived')fail('Archivierte Produkte können nicht importiert werden.');
 const p=input.package;
 if(!p||p.schema!=='gravuru-prepared-design/v1'||!validId(p.designId)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!/^[a-f0-9]{64}$/.test(p.sourceSha256||''))fail('Ungültiges Vorlagenpaket.');
 if(![p.widthMm,p.heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=2000)||!Array.isArray(p.layers)||p.layers.length<2||p.layers.length>20)fail('Ungültige Abmessungen oder Ebenenzahl.');
 const document=structuredClone(record.document),config=document.config;
 if(config.profile.designs.some(d=>d.id===p.designId))fail('Diese Design-ID ist bereits vorhanden. Eine vorhandene Vorlage wird nicht überschrieben.',409);
 if(config.profile.designs.length>=MAX_FORM_DESIGNS)fail('Höchstens '+MAX_FORM_DESIGNS+' Designs pro Produkt.');
 const {scale,ox,oy,fit}=preparedPlacement(config,p);
 const d={id:p.designId,name:p.name,objects:[],marks:[],customerFields:[],preparedTemplate:{schema:p.schema,sourceSha256:p.sourceSha256,packageSha256:sha256(JSON.stringify(p)),scale,fit}};
 const table={},seen=new Set();
 if(p.wholePrintDesign!==undefined)d.wholePrintDesign=p.wholePrintDesign;
 for(const layer of p.layers){
  if(!layer||!validId(layer.id)||seen.has(layer.id))fail('Ebenenkennungen fehlen oder sind doppelt.');seen.add(layer.id);
  let o={id:layer.id,rotation:0,templateOrigin:true};
  if(layer.type==='artwork'){
   const a=await assets.import({name:layer.name,bytes:layer.bytes});
   if(a.format!=='svg'||Math.abs(a.widthMm-p.widthMm)>.001||Math.abs(a.heightMm-p.heightMm)>.001)fail('Grafikebenen müssen dieselbe SVG-Zeichenfläche verwenden.');
   const resource=assets.resource(a.assetId);
   if(!config.localResources.motifs.some(m=>m.key===resource.key))config.localResources.motifs.push(resource);
   Object.assign(o,{type:'motif',motif:resource.key,x:ox+p.widthMm*scale/2,y:oy+p.heightMm*scale/2,w:p.widthMm*scale,h:p.heightMm*scale,color:'#000000',preserveColors:true,locked:true,customerEditable:false,acrylicFixed:true});
   d.importedSource??={assetId:a.assetId,originalName:layer.name,fit:'visible',scale};
  }else{
   if(!['text','photoSlot'].includes(layer.type)||!layer.id.startsWith('customer-')||!validId(layer.fieldKey)||typeof layer.label!=='string'||!layer.label.trim()||layer.label.length>80||![layer.x,layer.y].every(Number.isFinite))fail('Kundenfeld ist unvollständig.');
   Object.assign(o,{type:layer.type,fieldKey:layer.fieldKey,x:ox+layer.x*scale,y:oy+layer.y*scale,customerEditable:true});
   if(layer.type==='text'){
    if(!Object.hasOwn(config.localResources.fonts,layer.font)||typeof layer.allowColor!=='boolean')fail('Vorhandene Schrift und Farbfreigabe angeben.');
    Object.assign(o,{text:layer.text,font:layer.font,size:layer.size*scale,letterSpacing:(layer.letterSpacing??0)*scale,color:layer.color,bold:false,w:1,h:1});
    // Prepared customer-field packages keep their non-negative tracking contract.
    // Catalogue masters may separately retain negative source tracking.
    if(o.letterSpacing<0)fail('Zeichenabstand in vorbereiteten Kundenfeldern darf nicht negativ sein.');
   }else{
    if(!config.photo.enabled)fail('Fotofunktion nicht freigegeben.');
    Object.assign(o,{w:layer.widthMm*scale,h:layer.heightMm*scale,photoShape:layer.shape,required:layer.required,acrylicFixed:true});
    if(layer.example){
     const a=await assets.import(layer.example);
     if(a.format!=='svg'||Math.abs(a.widthMm-layer.widthMm)>.001||Math.abs(a.heightMm-layer.heightMm)>.001)fail('Beispielfoto muss zur unveränderten Fotomaske passen.');
     config.localResources.photoExamples??=[];
     config.localResources.photoExamples.push({designId:d.id,slotId:o.id,assetId:a.assetId});
    }
   }
   d.customerFields.push({id:o.id,label:layer.label});
  }
  d.objects.push(o);table[o.id]=applyNewMotifRights(o,rights(layer.type),d);
  if(layer.type==='text'){
   for(const key of ['allowScale','allowDelete'])if(layer[key]!==undefined&&typeof layer[key]!=='boolean')throw Object.assign(Error('Größen-/Löschfreigabe muss ein Wahrheitswert sein.'),{status:422});
      if(layer.allowMove!==undefined&&typeof layer.allowMove!=='boolean')fail('Positionsfreigabe muss ein Wahrheitswert sein.');
   table[o.id].color=layer.allowColor;table[o.id].move=layer.allowMove!==false;table[o.id].scale=layer.allowScale!==false;table[o.id].delete=layer.allowDelete!==false;
  }
 }
 if(!d.importedSource||!d.customerFields.length)fail('Grafik und Kundenfelder fehlen.');
 config.profile.designs.push(d);document.elementRights[d.id]=table;
 if(input.makeDefault===true)config.profile.defaultDesignId=d.id;
 const checked=validateProductDocument(document);assets.validateDocument(checked);
 const design=checked.config.profile.designs.find(v=>v.id===d.id);validateProductDesign(checked,design,{template:true});
 const token=sha256(JSON.stringify({id,expectedRevision:input.expectedRevision,document:checked}));
 return {document:checked,token,designId:d.id,name:d.name,fields:d.customerFields.length,layers:d.objects.length,scale,svg:studioSvg(checked.config.profile,design,config.localResources.fonts,{motifs:config.localResources.motifs,handles:false}),fit,warnings:[fit==='original'?'Originalmaß 1:1 auf der Platte platziert.':'Paketmaß weicht vom Produkt ab: proportional auf '+Math.round(scale*1000)/10+' % in die Produktkontur eingepasst.','Neues Design: bestehende Designs und Preise bleiben erhalten.',config.localResources.photoExamples?.some(e=>e.designId===d.id)?'Beispielfoto bleibt als anklickbare Vorschau. Kunden müssen ihr eigenes Foto hochladen.':'Kein Beispielfoto enthalten. Kunden laden ihr eigenes Foto hoch.','Vorbereitete Ebenen werden übernommen. Dies ist keine automatische Zerlegung beliebiger Bilder oder PDFs.','RGB-Vorschau: keine freigegebene Druckdatei.']};
}
export async function applyPreparedDesign(repository,assets,id,input){
 const plan=await planPreparedDesign(repository,assets,id,input);
 if(plan.token!==input.token)fail('Vorlage seit der Vorschau geändert. Bitte erneut prüfen.',409);
 return repository.save(id,plan.document,input.expectedRevision);
}
