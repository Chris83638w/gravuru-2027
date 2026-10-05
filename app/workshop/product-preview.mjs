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
export function productPreview(model){
 const c=model.universal,p=c.profile,d=structuredClone(p.designs.find(d=>d.id===p.defaultDesignId)||p.designs[0]);
 const media=[];
 if(c.acrylic){
  const photo=d.objects.find(o=>o.id==='photo-main'&&o.type==='photoSlot');
  if(photo){example??=image('reference.jpg');photo.media={mediaId:'reference',revisionId:'1'};photo.crop={x:130/1086,y:101/1448,width:827/1086,height:708/1448};media.push({mediaId:'reference',revisionId:'1',url:'blob:gravuru-workshop-reference',width:1086,height:1448});}
 }
 let svg=studioSvg(p,d,c.localResources.fonts,{motifs:c.localResources.motifs,media,handles:false,id:'product-card'});
 svg=svg.replace('href="blob:gravuru-workshop-reference"','href="'+example+'"');
 if(!c.acrylic)return svg;
 backdrop??=image('scene-empty-v2.jpg');
 svg=svg.replace(/viewBox="[^"]+"/,'x="85.794" y="49.956" width="915.498" height="1196.048" viewBox="0 0 150 200"').replace('fill="url(#studio-product-card-surface)"','fill="transparent"');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1086 1448"><image href="'+backdrop+'" width="1086" height="1448"/>'+svg+'</svg>';
}
