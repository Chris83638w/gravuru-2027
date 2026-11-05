// Free rectangular uploads keep the complete source image, in physical mm.
// Existing shaped/fixed template slots retain their product geometry.
export function newPhotoBounds(width,height){
 return {x:width/2,y:height/2,w:width*.6,h:height*.65};
}
export function fitUploadedPhoto(object, asset) {
 if(object.type!=='photoSlot'||object.acrylicFixed||object.photoMaskAssetId||!['rect',undefined].includes(object.photoShape))return;
 if(!(asset.width>0&&asset.height>0))return;
 const scale=Math.min(object.w/asset.width,object.h/asset.height);
 object.w=asset.width*scale;object.h=asset.height*scale;
}
export function photoSizeLimit(object,width,height){
 const ratio=object.h/object.w,a=(object.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
 return Math.max(.1,Math.min(width/(c+ratio*s),height/(s+ratio*c)));
}
export function resizePhoto(object,value,width,height){
 const ratio=object.h/object.w,max=photoSizeLimit(object,width,height);
 const w=Math.max(Math.min(5,max),Math.min(max,Number(value)||object.w));
 object.w=w;object.h=w*ratio;
 const a=(object.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
 const rx=(w*c+object.h*s)/2,ry=(w*s+object.h*c)/2;
 object.x=Math.max(rx,Math.min(width-rx,object.x));object.y=Math.max(ry,Math.min(height-ry,object.y));
}
