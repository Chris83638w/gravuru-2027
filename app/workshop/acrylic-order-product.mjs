import {readReviewPackage,digest} from './review-package.mjs';
import {makeProductDocument,validateProductDocument,validateProductDesign} from './product-model.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'order_product_draft'});};
// Build a NEW native template from frozen layout. No original image bytes, upload
// identities, order tokens or existing shop binding enter the product document.
export function planAcrylicOrderProduct({line,archive,input,assets}){
 const {files,manifest}=readReviewPackage(archive,line.sourcePackageSha256,'gravuru-acrylic-review/v1');
 if(manifest.id!==line.snapshotId||manifest.product.id!==line.product.id||manifest.product.revision!==line.product.revision)fail('Bestellposition und gesicherte Acrylgestaltung stimmen nicht überein.');
 let saved,frozen;try{saved=JSON.parse(files.get('produkt-und-gestaltung.json'));frozen=JSON.parse(files.get('konfigurator-quellen.json'));}catch{fail('Der gesicherte Acrylstand ist unvollständig.');}
 if(saved.schema!=='gravuru-acrylic-review-input/v1'||saved.state.design.id!==manifest.source.designId)fail('Der gesicherte Acryl-Designbezug fehlt.');
 const source=saved.product.config.profile.designs.find(d=>d.id===saved.state.design.id);if(!source)fail('Die ursprüngliche Acrylvorlage fehlt.');
 const design=validateProductDesign(saved.product,saved.state.design,{options:saved.state.options,fonts:frozen.localResources.fonts,motifs:frozen.localResources.motifs});
 const usedIds=new Set(source.objects.map(o=>o.id));let removedUploads=0;design.objects=design.objects.filter(o=>{if(o.uxHidden)return false;if(o.type==='image'&&o.uxUploadId){removedUploads++;return false;}return true;}).map((o,i)=>{
  const item=structuredClone(o),original=source.objects.find(s=>s.id===o.id);
  for(const k of Object.keys(item))if(k.startsWith('ux'))delete item[k];
  if(item.type==='photoSlot')for(const k of ['media','crop','photoProcessing'])delete item[k];
  if(item.type==='text'&&input.textMode==='template')item.text=original?.text||'Dein Text';
  if(!original){let id='addition-'+i;while(usedIds.has(id))id+='-new';item.id=id;usedIds.add(id);}
  return item;
 });
 if(!design.objects.length)fail('Die Gestaltung enthält nach dem Entfernen privater Uploads keine wiederverwendbaren Elemente.');
 if(design.customerFields)design.customerFields=design.customerFields.filter(f=>design.objects.some(o=>o.id===f.id));
 const config=structuredClone(saved.product.config);config.localResources=structuredClone(frozen.localResources);config.localResources.fonts={...structuredClone(saved.product.config.localResources?.fonts||{}),...config.localResources.fonts};
 config.profile.designs=[design];config.profile.defaultDesignId=design.id;
 config.profile.id='order-design-draft';config.profile.revision=1;config.profile.binding={kind:'local-review',productId:'order-design-draft'};config.reviewOnly=true;config.profile.features={...config.profile.features,orderEnabled:false,productionConfirmed:false};
 for(const group of config.profile.optionGroups)group.defaultValueId=saved.state.options[group.id];
 if(config.localResources.photoExamples)config.localResources.photoExamples=config.localResources.photoExamples.filter(e=>e.designId===design.id&&design.objects.some(o=>o.id===e.slotId));
 if(config.localResources.photoPlaceholders)config.localResources.photoPlaceholders=config.localResources.photoPlaceholders.filter(e=>e.designId===design.id&&design.objects.some(o=>o.id===e.slotId));
 if(config.photo.hints)config.photo.hints=config.photo.hints.filter(h=>h.designId===design.id&&design.objects.some(o=>o.id===h.slotId));
 const document=makeProductDocument(config,{name:input.name.trim(),kind:'product'});
 const ref=saved.product.productionProfile,profile=manifest.productionProfile;
 if(ref||profile||line.productionProfile){
  let bundled;try{bundled=JSON.parse(files.get('fertigungsprofil.json'));}catch{fail('Der gesicherte Fertigungsprofilstand fehlt im Bestellpaket.');}
  if(!ref||!profile||!line.productionProfile||profile.id!==ref.id||profile.revision!==ref.revision||line.productionProfile.id!==ref.id||line.productionProfile.revision!==ref.revision||line.productionProfile.sha256!==profile.sha256||digest(JSON.stringify(profile.document))!==profile.sha256||JSON.stringify(bundled)!==JSON.stringify(profile))fail('Bestellposition, Produkt und gesichertes Fertigungsprofil stimmen nicht überein.');
  // Preserve the exact manufacturing revision; no lookup of a newer profile here.
  document.productionProfile=structuredClone(ref);
 }

 // Freeze the bundled resource choice rather than inheriting a later global profile.
 for(const value of Object.values(document.profileAssignments)){value.mode='empty';value.profileId=null;}
 for(const o of document.config.profile.designs[0].objects){const old=saved.product.elementRights[design.id]?.[o.id],next=document.elementRights[design.id][o.id];if(old)for(const key of Object.keys(next))next[key]=next[key]&&old[key];}
 const checked=validateProductDocument(document);assets.validateDocument(checked);
 const origin={orderLineId:line.id,snapshotId:line.snapshotId,packageSha256:line.sourcePackageSha256,productId:line.product.id,productRevision:line.product.revision};
 const token=digest(JSON.stringify({recipe:'acrylic-order-product/v1',origin,document:checked,textMode:input.textMode}));
 return {document:checked,token,origin,textMode:input.textMode,photoCount:manifest.photos.length,removedFields:source.objects.filter(o=>!design.objects.some(v=>v.id===o.id)).length,
  fields:checked.config.profile.designs[0].objects.filter(o=>['text','photoSlot'].includes(o.type)).map(o=>({id:o.id,label:o.fieldKey||o.id,type:o.type,...(o.type==='text'?{text:o.text}:{})})),
  warnings:[...(profile?['Fertigungsprofil „'+profile.document.name+'“ · Stand '+profile.revision+' wird übernommen. Keine automatische Maschinenfreigabe.']:[]),'Kundenfotos und ihre Bearbeitungs-/Uploaddaten werden nicht übernommen. Fotobereiche bleiben austauschbar.',...(removedUploads?[removedUploads+' zusätzlich hochgeladene Bildelemente werden entfernt.']:[]),input.textMode==='customer'?'Kundentexte werden ausdrücklich als neue Beispieltexte übernommen. Vor Verwendung prüfen.':'Beispieltexte stammen aus der ursprünglichen Vorlage; neue Textfelder erhalten „Dein Text“.','Die ausgewählte Ausführung wird vorausgewählt; alle ursprünglichen kaufbaren Ausführungen bleiben erhalten.','Neuer privater Acrylentwurf mit gesicherten Schriften/Motiven, ohne Shop-Verknüpfung oder Veröffentlichung.']};
}
