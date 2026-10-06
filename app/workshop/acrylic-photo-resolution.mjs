import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';

// Match cover + crop for photo slots and xMidYMid meet for other uploads.
// This measures available pixels, not focus, compression or prior upscaling.
export function acrylicPhotoResolution(object,photo,scale){
 const source=photo.edited||photo;
 if(![source.width,source.height,object.w,object.h,scale].every(n=>Number.isFinite(n)&&n>0))return null;
 const fit=object.type==='photoSlot'?photoPlacement(object,source):(()=>{
  const ratio=Math.min(object.w/source.width,object.h/source.height);
  return {w:source.width*ratio,h:source.height*ratio};
 })();
 const widthMm=fit.w*scale,heightMm=fit.h*scale;
 return {objectId:object.id,uploadId:photo.uploadId,label:object.label||object.name||(object.type==='photoSlot'?'Foto':'Hinzugefügtes Bild'),
  source:photo.edited?'edited':'original',path:source.path,width:source.width,height:source.height,
  placedWidthMm:Number(widthMm.toFixed(3)),placedHeightMm:Number(heightMm.toFixed(3)),
  effectiveDpi:Math.floor(Math.min(source.width/widthMm,source.height/heightMm)*25.4)};
}
