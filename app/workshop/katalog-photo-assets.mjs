// Preserve catalogue photo bytes, image placement and the exact vector aperture.
// The native renderer receives immutable mask/example assets, not a flattened
// replacement photograph. Preview-only calls never write an asset store.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {escapeXml} from '../platform/sources/app/shared/models/design-content.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const uri=s=>'data:image/svg+xml;base64,'+Buffer.from(s).toString('base64');
export function katalogPhotoExampleSvg(image,dir){
 let href=image.href;
 if(!href.startsWith('data:')){
  if(!dir||! /^[\w.-]+\.(png|jpe?g)$/i.test(href))throw Error('Original-Fotodatei ist nicht eindeutig zugeordnet.');
  const filename=path.resolve(dir,href);if(path.dirname(filename)!==path.resolve(dir))throw Error('Fotodatei liegt außerhalb des Designs.');
  const bytes=fs.readFileSync(filename),mime=/\.png$/i.test(href)?'png':'jpeg';href=`data:image/${mime};base64,${bytes.toString('base64')}`;
 }
 if(!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(href))throw Error('Originalfoto braucht PNG- oder JPEG-Bytes.');
 const [x,y,w,h]=image.bounds,[bx,by,bw,bh]=image.viewport;
 const aspect=['none','xMidYMid meet','xMidYMid slice'].includes(image.preserveAspectRatio)?image.preserveAspectRatio:'xMidYMid meet';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}mm" height="${bh}mm" viewBox="${bx} ${by} ${bw} ${bh}"><defs><clipPath id="original-photo-mask"><path d="${escapeXml(image.maskPath)}" clip-rule="${image.maskEvenodd?'evenodd':'nonzero'}"/></clipPath></defs><image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${aspect}" clip-path="url(#original-photo-mask)" href="${href}"/></svg>`;
}
export async function prepareKatalogPhotoAssets(converted,design,{assets,previewOnly=false}={}){
 const result={...converted,template:structuredClone(converted.template),examples:[],previewMaskUrls:[]};
 for(const item of converted.photoAssets||[]){
  const slot=result.template.objects.find(o=>o.id===item.slotId);
  if(!slot)throw Error('Original-Fotofeld fehlt.');
  if(item.maskSvg){
   if(previewOnly){result.previewMaskUrls.push({id:slot.photoMaskAssetId,url:uri(item.maskSvg)});}
   else{
    if(!assets)throw Error('Die Original-Fotomaske benötigt die Designressourcen-Ablage.');
    const mask=await assets.import({name:'Katalog-Fotomaske.svg',bytes:Buffer.from(item.maskSvg).toString('base64')});slot.photoMaskAssetId=mask.assetId;
   }
  }
  if(item.exampleImage){
   const svg=katalogPhotoExampleSvg(item.exampleImage,design.dir),uploadHint=item.exampleImage.uploadHint===true;
   if(previewOnly)result.examples.push({slotId:slot.id,assetId:hash(svg),url:uri(svg),uploadHint});
   else{if(!assets)throw Error('Das Originalfoto benötigt die Designressourcen-Ablage.');const asset=await assets.import({name:'Katalog-Originalfoto.svg',bytes:Buffer.from(svg).toString('base64')});result.examples.push({slotId:slot.id,assetId:asset.assetId,uploadHint});}
  }
 }
 return result;
}
