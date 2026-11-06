import {roundDesign} from './design-edit.mjs';
import {photoColorMode} from '../../platform/sources/app/shared/models/photo-color.mjs';

const photoState=(o,asset)=>JSON.stringify([o.w,o.h,o.photoShape||null,o.photoMaskAssetId||null,o.uxPhotoCrop||null,o.uxPhotoColor||'original',!!asset.edited,asset.photoEdit||null]);
export async function installGalleryWorkbench({el,config,files,say,pending}){
 if(!config?.workbench?.gallery)return null;
 const parent=window.parent,origin=location.origin,bootstrap=parent.GravuruGalleryEditor;
 if(parent===window||!bootstrap||parent.location.origin!==origin)throw Error('Die private Galerieverbindung fehlt.');
 let saving=false;
 const send=data=>parent.postMessage(data,origin);
 const blob=async url=>{const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('Das gespeicherte Originalfoto konnte nicht geladen werden.');return response.blob();};
 for(const photo of bootstrap.photos){
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
  asset.galleryBaseline=photoState(object,asset);files.set(id,asset);
 }
 el.normalize();el.sync();
 async function snapshot(requestId){
  if(saving)return;
  if(pending()){send({type:'gravuru-gallery-error',requestId,message:'Bitte warten, bis der Bild-Upload abgeschlossen ist.'});return;}
  saving=true;
  try{
   const objects=roundDesign({objects:el.state.objects}).objects,photos=[];
   for(const object of objects){
    if(!object.uxUploadId)continue;
    const asset=files.get(object.uxUploadId);
    if(!asset)throw Error('Ein Foto fehlt. Bitte erneut hochladen, bevor du speicherst.');
    if(object.type!=='photoSlot'||object.uxUploadKind!=='photo')throw Error('Dieses Upload-Format ist noch nicht als native Galerievorlage verbunden. Bitte den Upload entfernen oder als vorhandenes Katalogmotiv verwenden.');
    if(asset.galleryAssetId&&asset.galleryBaseline===photoState(object,asset))photos.push({objectId:object.id,assetId:asset.galleryAssetId});
    else {
     const original=asset.originalBlob||asset.file;
     const editSource=asset.editSourceUrl?await blob(asset.editSourceUrl):asset.editSourceBlob||original;
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
