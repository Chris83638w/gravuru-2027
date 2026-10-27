import {readDraft,cleanObject,validatePhotoFile} from './contract.mjs';

export function legacyCartDraft(config,snapshot,commerceProductId){
 if(snapshot?.schema!=='gravuru-shopify-design/v1')throw Error('Unbekannter Warenkorbentwurf.');
 if(!commerceProductId||snapshot.productId!==commerceProductId||snapshot.profileId!==config.profile.id||snapshot.revision!==config.profile.revision)throw Error('Entwurf gehört zu einem anderen Produkt oder einer anderen Vorlagenrevision.');
 return {schema:'gravuru-universal-customer-draft/v1',productId:config.profile.binding.productId,profileId:snapshot.profileId,profileRevision:snapshot.revision,design:snapshot.design,options:snapshot.options};
}
export function legacyPhotoMappings(snapshot,photos){
 if(!Array.isArray(snapshot.uploads)||!Array.isArray(photos)||photos.length!==snapshot.uploads.length)throw Error('Die gespeicherten Fotos sind unvollständig.');
 const used=new Set(snapshot.design.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId)),seen=new Set();
 for(const mapping of snapshot.uploads){
  if(!used.has(mapping.uploadId)||seen.has(mapping.uploadId))throw Error('Fotozuordnung stimmt nicht.');
  seen.add(mapping.uploadId);
  const photo=photos.find(p=>p.uploadId===mapping.uploadId);
  if(!photo||photo.originalName!==mapping.original||photo.editedName!==mapping.edited)throw Error('Fotozuordnung stimmt nicht.');
  validatePhotoFile(photo.original);if(mapping.edited)validatePhotoFile(photo.edited);
 }
 if(seen.size!==used.size)throw Error('Ein Foto fehlt im gespeicherten Entwurf.');
 return photos;
}
export function installLegacyCartRestore({el,config,files}){
 const bridge=window.parent.GravuruCommerce;
 if(!bridge||!config||(typeof el.restoreDraft!=='function'&&typeof el.import!=='function'))return;
 let restoring=false,restored=false;
 window.addEventListener('message',async event=>{
  const message=event.data;
  if(event.origin!==location.origin||event.source!==window.parent||message?.session!==bridge.session||message.type!=='gravuru-cart-restore'||restoring||restored)return;
  restoring=true;
  const staged=new Map(),urls=[],previousState=structuredClone(el.state),previousFiles=new Map(files);
  try{
   const draft=legacyCartDraft(config,message.snapshot,bridge.binding.productId);
   await el.uxEnsureDraftResources?.(draft);
   const motifs=Object.entries(el.motifs).map(([key,svgFragment])=>({key,svgFragment}));
   readDraft(config,draft,el.fontData,motifs);
   if(!Number.isSafeInteger(message.quantity)||message.quantity<1||message.quantity>99)throw Error('Ungültige gespeicherte Menge.');
   for(const photo of legacyPhotoMappings(message.snapshot,message.photos)){
    const file=new File([photo.original],photo.originalName,{type:photo.original.type}),originalUrl=URL.createObjectURL(file);urls.push(originalUrl);
    const originalImage=new Image();originalImage.src=originalUrl;await originalImage.decode();
    if(originalImage.naturalWidth*originalImage.naturalHeight>40_000_000)throw Error('Gespeichertes Bild ist zu groß.');
    const entry={file,url:originalUrl,editSourceUrl:originalUrl,width:originalImage.naturalWidth,height:originalImage.naturalHeight};
    if(photo.edited){const url=URL.createObjectURL(photo.edited);urls.push(url);const editedImage=new Image();editedImage.src=url;await editedImage.decode();Object.assign(entry,{blob:photo.edited,edited:true,originalUrl,url,width:editedImage.naturalWidth,height:editedImage.naturalHeight});}
    staged.set(photo.uploadId,entry);
   }
   for(const [id,photo] of staged)files.set(id,photo);
   if(typeof el.restoreDraft==='function')el.restoreDraft(draft);
   else await el.import(new File([JSON.stringify(draft)],'warenkorb-entwurf.json',{type:'application/json'}));
   if(JSON.stringify(el.state.objects.map(cleanObject))!==JSON.stringify(draft.design.objects.map(cleanObject)))throw Error('Die gespeicherte Anordnung wurde nicht unverändert übernommen.');
   const quantity=el.shadowRoot.querySelector('[data-fk-quantity]');
   quantity.value=String(message.quantity);quantity.dispatchEvent(new Event('input',{bubbles:true}));
   el.state.selected=null;el.sync();
   const status=el.shadowRoot.querySelector('.status');if(status)status.textContent='Deine Gestaltung mit Fotos ist aus dem Warenkorb geladen.';
   restored=true;
   window.parent.postMessage({type:'gravuru-cart-restored',session:bridge.session,objects:el.state.objects.length,photos:staged.size},location.origin);
  }catch(error){
   for(const url of urls)URL.revokeObjectURL(url);
   files.clear();for(const [id,photo] of previousFiles)files.set(id,photo);
   el.state=previousState;el.sync();
   window.parent.postMessage({type:'gravuru-cart-restore-error',session:bridge.session,message:error.message},location.origin);
  }finally{restoring=false;}
 });
}
