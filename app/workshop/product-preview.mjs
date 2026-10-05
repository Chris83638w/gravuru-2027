import {acrylicSelection} from '../configurator/variant-m/acrylic-product.mjs';
import {baseAnchors} from '../configurator/variant-m/acrylic-base-anchors.mjs';
import fs from 'node:fs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';

export function productOverview(document){
 const p=document.config.profile;
 return {method:getProcessingProfile(p).method,material:p.material.kind,widthMm:p.geometry.width,heightMm:p.geometry.height,designCount:p.designs.length,defaultDesignName:(p.designs.find(d=>d.id===p.defaultDesignId)||p.designs[0])?.name||''};
}
const image=name=>'data:image/jpeg;base64,'+fs.readFileSync(new URL('./preview-assets/'+name,import.meta.url)).toString('base64');
let backdrop,example;
// Reuse the actual saved design, shared renderer and existing acrylic scene.
// No customer uploads or scene are added to the saved product or print output.
export function productPreview(model,{options={},examples=[],designId}={}){
 const c=model.universal,p=c.profile,d=structuredClone(p.designs.find(d=>d.id===(designId||p.defaultDesignId))||p.designs[0]);
 examples=examples.filter(e=>e.designId===d.id);
 const media=[];
 if(c.acrylic){
  const photo=d.objects.find(o=>o.id==='photo-main'&&o.type==='photoSlot');
  if(photo&&!d.importedSource){example??=image('reference.jpg');photo.media={mediaId:'reference',revisionId:'1'};photo.crop={x:130/1086,y:101/1448,width:827/1086,height:708/1448};media.push({mediaId:'reference',revisionId:'1',url:'blob:gravuru-workshop-reference',width:1086,height:1448});}
 }
 for(const e of examples){const slot=d.objects.find(o=>o.id===e.slotId&&o.type==='photoSlot');if(!slot)continue;slot.media={mediaId:e.assetId,revisionId:'1'};slot.crop={x:0,y:0,width:1,height:1};media.push({mediaId:e.assetId,revisionId:'1',url:'blob:workshop-'+e.assetId,width:slot.w,height:slot.h});}
 let svg=studioSvg(p,d,c.localResources.fonts,{motifs:c.localResources.motifs,media,handles:false,id:'product-card'});
 svg=svg.replace('href="blob:gravuru-workshop-reference"','href="'+example+'"');
 for(const e of examples)svg=svg.replaceAll('href="blob:workshop-'+e.assetId+'"','href="'+e.url+'"');
 if(!c.acrylic)return svg;
 backdrop??=image('scene-empty-v2.jpg');
 svg=svg.replace(/viewBox="[^"]+"/,'x="85.794" y="49.956" width="915.498" height="1196.048" viewBox="0 0 150 200"').replace('fill="url(#studio-product-card-surface)"','fill="transparent"');
 const choice=acrylicSelection(options,c.acrylic.pricing),b=choice.base;
 let front='',back='';
 if(b.asset){
  const a=baseAnchors[b.asset],scale=912/(a.right-a.left),slot=1246-b.insertionMm*1196/choice.size.height;
  const x=542-(a.left+a.right)/2*scale,y=slot-a.slot*scale;
  const url='data:image/png;base64,'+fs.readFileSync(new URL('../designs/acrylic-unser-anfang/'+b.asset.replace('.png','-v2.png'),import.meta.url)).toString('base64');
  const layer=clip=>'<g clip-path="url(#editor-base-'+clip+')"><image href="'+url+'" x="'+x+'" y="'+y+'" width="'+a.width*scale+'" height="'+a.height*scale+'"/></g>';
  back='<defs><clipPath id="editor-base-back"><rect x="0" y="'+(y+(a.bodyTop-8)*scale)+'" width="1086" height="'+(a.slot-a.bodyTop+8)*scale+'"/></clipPath><clipPath id="editor-base-front"><rect x="0" y="'+slot+'" width="1086" height="1448"/></clipPath></defs>'+layer('back');front=layer('front');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1086 1448"><image href="'+backdrop+'" width="1086" height="1448"/>'+back+svg+front+'</svg>';
}
