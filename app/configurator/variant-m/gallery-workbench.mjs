import {photoColorMode} from '../../platform/sources/app/shared/models/photo-color.mjs';

const photoState=(o,asset)=>JSON.stringify([o.w,o.h,o.photoShape||null,o.photoMaskAssetId||null,o.uxPhotoCrop||null,o.uxPhotoColor||'original',!!asset.edited,asset.photoEdit||null]);
export function retainedGalleryBlob(files,url){
 for(const asset of files.values()){
  if(asset.url===url)return asset.blob||asset.file;
  if(asset.originalUrl===url)return asset.originalBlob||asset.file;
  if(asset.editSourceUrl===url&&asset.editSourceBlob)return asset.editSourceBlob;
 }
 throw Error('Die Bearbeitungsquelle des Fotos fehlt. Bitte die Vorlage neu öffnen oder das Foto erneut auswählen.');
}
export async function installGalleryWorkbench({el,config,files,say,pending}){
 if(!config?.workbench?.gallery)return null;
 const parent=window.parent,origin=location.origin,bootstrap=parent.GravuruGalleryEditor;
 if(parent===window||!bootstrap||parent.location.origin!==origin)throw Error('Die private Galerieverbindung fehlt.');
 // Only this operator host: the customer checkout and session messaging do
 // not belong to a native template edit. Keep the customer editor unchanged.
 const style=document.createElement('style');style.textContent='.fk-buy-dock,[data-ux-save-state],.ux-session-note{display:none!important}';el.shadowRoot.append(style);
 for(const node of el.shadowRoot.querySelectorAll('.fk-buy-dock'))node.style.setProperty('display','none','important');
 const protectedIds=new Set(config.profile.designs[0].objects.filter(o=>o.technicalLocked||o.role==='guide'||o.type==='motif-raster').map(o=>o.id));
 const sync=el.sync;el.sync=function(...args){for(const object of this.state.objects)if(protectedIds.has(object.id))object.uxLocked=true;return sync.apply(this,args);};
 let saving=false;
 const send=data=>parent.postMessage(data,origin);
 const blob=async url=>{const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('Das gespeicherte Originalfoto konnte nicht geladen werden.');return response.blob();};
 try{for(const photo of bootstrap.photos){
  const object=el.state.objects.find(o=>o.id===photo.objectId&&o.type==='photoSlot');if(!object)continue;
  const query=new URLSearchParams({productId:bootstrap.context.productId,designId:bootstrap.context.designId,originalId:bootstrap.context.originalId,revision:String(bootstrap.context.revision),assetId:photo.assetId});
  const get=part=>blob('/originale/editor/media?'+query+'&part='+part);
  const original=await get('original'),processed=photo.schema?await get('processed'):original,editSource=photo.schema?await get('editSource'):original;
  const url=URL.createObjectURL(processed),image=new Image();image.src=url;await image.decode();
  const id=crypto.randomUUID(),asset={file:new File([original],'Galeriefoto.png',{type:original.type||'image/png'}),blob:processed,url,
   originalUrl:URL.createObjectURL(original),editSourceUrl:URL.createObjectURL(editSource),originalBlob:original,editSourceBlob:editSource,
   edited:photo.edited||false,photoEdit:photo.photoEdit||undefined,editSourceColor:photo.editSourceColor||'original',width:image.naturalWidth,height:image.naturalHeight,galleryAssetId:photo.assetId};
  Object.assign(object,{uxUploadId:id,uxUploadKind:'photo',uxPhotoColor:photo.color||(config.profile.material.kind==='slate'?'grayscale':'original')});
  if(photo.crop)object.uxPhotoCrop=structuredClone(photo.crop);
  else if(!photo.schema)object.uxPhotoCrop={zoom:1,x:0,y:0,angle:0}; // Existing native example SVGs explicitly use cover framing.
  files.set(id,asset);
 }}catch(error){send({type:'gravuru-gallery-start-error',message:error.message});throw error;}
 el.normalize();el.sync();
 for(const object of el.state.objects){const asset=files.get(object.uxUploadId);if(asset?.galleryAssetId)asset.galleryBaseline=photoState(object,asset);}
 const initial=new Map(el.state.objects.map(o=>[o.id,structuredClone(o)])),source=new Map(config.profile.designs[0].objects.map(o=>[o.id,o]));
 async function snapshot(requestId){
  if(saving)return;
  if(pending()){send({type:'gravuru-gallery-error',requestId,message:'Bitte warten, bis der Bild-Upload abgeschlossen ist.'});return;}
  saving=true;
  try{
   const objects=structuredClone(el.state.objects),photos=[];
   // Existing source precision survives a no-op save even if a customer
   // control displays two decimals or the legacy shell measures a text box.
   for(const object of objects)for(const key of ['x','y','w','h','size','rotation','lineHeight'])if(initial.get(object.id)?.[key]===object[key]&&source.get(object.id)?.[key]!==undefined)object[key]=source.get(object.id)[key];
   for(const object of objects){
    if(!object.uxUploadId)continue;
    const asset=files.get(object.uxUploadId);
    if(!asset)throw Error('Ein Foto fehlt. Bitte erneut hochladen, bevor du speicherst.');
    if(object.type!=='photoSlot'||object.uxUploadKind!=='photo')throw Error('Dieses Upload-Format ist noch nicht als native Galerievorlage verbunden. Bitte den Upload entfernen oder als vorhandenes Katalogmotiv verwenden.');
    if(asset.galleryAssetId&&asset.galleryBaseline===photoState(el.state.objects.find(o=>o.id===object.id),asset))photos.push({objectId:object.id,assetId:asset.galleryAssetId});
    else {
     const original=asset.originalBlob||asset.file;
     // Blob URLs are presentation handles, not network endpoints. Use their
     // retained bytes; the editor's same-origin CSP intentionally rejects a
     // fetch(blob:...). Earlier crops/background edits keep their own source.
     const editSource=asset.editSourceUrl?retainedGalleryBlob(files,asset.editSourceUrl):asset.editSourceBlob||original;
     photos.push({objectId:object.id,original,processed:asset.blob||asset.file,editSource,widthMm:object.w,heightMm:object.h,
      edited:!!asset.edited,color:photoColorMode(config.profile,object),editSourceColor:asset.editSourceColor||'original',photoEdit:asset.photoEdit||null,crop:object.uxPhotoCrop||null,
      photoShape:object.photoShape||'rect',photoMaskAssetId:object.photoMaskAssetId||null});
    }
   }
   send({type:'gravuru-gallery-snapshot',requestId,designId:el.state.designId,objects,photos});
  }catch(error){send({type:'gravuru-gallery-error',requestId,message:error.message});}
  finally{saving=false;}
 }
 window.addEventListener('message',event=>{
  if(event.origin!==origin||event.source!==parent)return;
  if(event.data?.type==='gravuru-gallery-snapshot-request'&&typeof event.data.requestId==='string')void snapshot(event.data.requestId);
  if(event.data?.type==='gravuru-gallery-saved'){
   for(const photo of event.data.photos||[]){const o=el.state.objects.find(o=>o.id===photo.objectId),asset=o&&files.get(o.uxUploadId);if(asset){asset.galleryAssetId=photo.assetId;asset.galleryBaseline=photoState(o,asset);}}
   say('Galerievorlage gespeichert.');
  }
 });
 send({type:'gravuru-gallery-ready',designId:el.state.designId});
 return {save:()=>send({type:'gravuru-gallery-save-request'})};
}
