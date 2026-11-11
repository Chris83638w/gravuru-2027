import {ACRYLIC_SIZES,acrylicSelection,acrylicOptions} from '../configurator/variant-m/acrylic-product.mjs';
import {baseAnchors} from '../configurator/variant-m/acrylic-base-anchors.mjs';
import fs from 'node:fs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import {selectedProfile,resolvedOptions} from '../configurator/variant-m/contract.mjs';
import {keepoutPreview,spacerPreview} from '../configurator/variant-m/option-media.mjs';
import {designAreaPreview} from '../configurator/variant-m/design-area.mjs';
import {textsNearHoles,holeHintText} from '../platform/sources/app/shared/models/hole-proximity.mjs';
import {surfacePreview,scenePreview} from '../configurator/variant-m/material-surface.mjs';
import {examplePhotoMarkup,emptyMaskedPhotoMarkup} from '../configurator/variant-m/photo-placeholder.mjs';
import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {workshopResources} from './catalog.mjs';

// Resolve shared fonts only for the new model family, never persist the merged map.
export function previewFonts(config,load=workshopResources){
 return isLayeredDoorbell(config)?load(config.localResources).fonts:config.localResources.fonts;
}

// Illustration choice only; never writes a product option or customer default.
export function overviewOptions(config){
 return Object.fromEntries((config.profile.optionGroups||[]).map(g=>[g.id,g.id==='base'&&g.values.some(v=>v.id==='eiche')?'eiche':g.defaultValueId||g.values[0]?.id]));
}
export function productOverview(document){
 const p=document.config.profile,options=overviewOptions(document.config);
 const sizes=document.config.acrylic?(p.optionGroups.find(g=>g.id==='size')?.values||[]).map(v=>({widthMm:ACRYLIC_SIZES[v.id].width,heightMm:ACRYLIC_SIZES[v.id].height})):document.config.steelFormats?p.optionGroups.find(g=>g.id==='size').values.map(v=>({widthMm:v.widthMm,heightMm:v.heightMm})):[{widthMm:p.geometry.width,heightMm:p.geometry.height}];
 const previewLabel=document.config.doorbell?'Edelstahl 1,5 mm · Acrylglas 3 mm':p.optionGroups?.find(g=>g.id==='base')?.values.find(v=>v.id===options.base)?.label||'';
 return {sizes,previewLabel,method:getProcessingProfile(p).method,material:p.material.kind,widthMm:p.geometry.width,heightMm:p.geometry.height,designCount:p.designs.length,defaultDesignName:(p.designs.find(d=>d.id===p.defaultDesignId)||p.designs[0])?.name||''};
}
const image=name=>'data:image/jpeg;base64,'+fs.readFileSync(new URL('./preview-assets/'+name,import.meta.url)).toString('base64');
let backdrop,example;
export function defaultPhotoSvg(){
 example??=image('reference.jpg');
 // Only the photograph inside the existing acrylic reference. Explicit clipping
 // prevents the reference's caption/plate border leaking into square photo slots.
 return `<svg xmlns="http://www.w3.org/2000/svg" width="81mm" height="69mm" viewBox="0 0 810 690" preserveAspectRatio="xMidYMid slice" overflow="hidden"><defs><clipPath id="sample-photo-crop"><rect width="810" height="690"/></clipPath></defs><g clip-path="url(#sample-photo-crop)"><image href="${example}" x="-140" y="-110" width="1086" height="1448"/></g></svg>`;
}
// Reuse the actual saved design, shared renderer and existing acrylic scene.
// No customer uploads or scene are added to the saved product or print output.
export function productPreview(model,{options={},examples=[],designId,layout='portrait',keepout=false,designArea=keepout}={}){
 const c=model.universal;
 if(isLayeredDoorbell(c))options=resolvedOptions(c,options);
 const p=c.acrylic?c.profile:selectedProfile(c,options),d=structuredClone(p.designs.find(d=>d.id===(designId||p.defaultDesignId))||p.designs[0]);
 examples=examples.filter(e=>e.designId===d.id);
 const media=[];
 if(c.acrylic){
  const photo=d.objects.find(o=>o.id==='photo-main'&&o.type==='photoSlot');
  if(photo&&!d.importedSource){example??=image('reference.jpg');photo.media={mediaId:'reference',revisionId:'1'};photo.crop={x:130/1086,y:101/1448,width:827/1086,height:708/1448};media.push({mediaId:'reference',revisionId:'1',url:'blob:gravuru-workshop-reference',width:1086,height:1448});}
 }
 for(const e of examples){const slot=d.objects.find(o=>o.id===e.slotId&&o.type==='photoSlot');if(!slot)continue;slot.media={mediaId:e.assetId,revisionId:'1'};slot.crop={x:0,y:0,width:1,height:1};media.push({mediaId:e.assetId,revisionId:'1',url:'blob:workshop-'+e.assetId,width:slot.w,height:slot.h});}
 const photoExampleMarkup=o=>{
  const e=examples.find(e=>e.slotId===o.id),hint=c.photo.hints?.find(h=>h.designId===d.id&&h.slotId===o.id);
  if(e)return examplePhotoMarkup(o,e.assetId,hint,e.url,{blendMode:p.material.kind==='slate'?'lighten':undefined,grayscale:p.material.kind==='slate'});
  if(c.acrylic&&o.id==='photo-main'&&!d.importedSource){
   const photo=defaultPhotoSvg();
   return examplePhotoMarkup(o,'0'.repeat(64),hint,'data:image/svg+xml;base64,'+Buffer.from(photo).toString('base64'));
  }
  return p.material.kind==='slate'&&o.type==='photoSlot'&&c.photo.enabled?emptyMaskedPhotoMarkup(o,getProcessingProfile(p).ink,p.material.color):'';
 };
 let svg=studioSvg(p,d,previewFonts(c),{frameKey:options.frame,color:options.color,mountingKey:options.mounting,motifs:c.localResources.motifs,media,handles:false,id:'product-card',photoExampleMarkup});
 svg=svg.replace('href="blob:gravuru-workshop-reference"','href="'+example+'"');
 for(const e of examples)svg=svg.replaceAll('href="blob:workshop-'+e.assetId+'"','href="'+e.url+'"');
 if(c.familyAcrylic)svg=spacerPreview(svg,p);
 if(!c.acrylic)return scenePreview(designAreaPreview(keepoutPreview(surfacePreview(svg,c.materialSurface,p.geometry),p,{show:keepout}),c,p,{show:designArea}),c.sceneBackground);
 backdrop??=image('scene-empty-v2.jpg');
 svg=svg.replace(/viewBox="[^"]+"/,'x="85.794" y="49.956" width="915.498" height="1196.048" viewBox="0 0 150 200"').replace('fill="url(#studio-product-card-surface)"','fill="transparent"');
 const choice=acrylicSelection(acrylicOptions(options),c.acrylic.pricing),b=choice.base;
 let front='',back='';
 if(b.asset){
  const a=baseAnchors[b.asset],scale=912/(a.right-a.left),slot=1246-b.insertionMm*1196/choice.size.height;
  const x=542-(a.left+a.right)/2*scale,y=slot-a.slot*scale;
  const url='data:image/png;base64,'+fs.readFileSync(new URL('../designs/acrylic-unser-anfang/'+b.asset.replace('.png','-v2.png'),import.meta.url)).toString('base64');
  const layer=clip=>'<g clip-path="url(#editor-base-'+clip+')"><image href="'+url+'" x="'+x+'" y="'+y+'" width="'+a.width*scale+'" height="'+a.height*scale+'"/></g>';
  back='<defs><clipPath id="editor-base-back"><rect x="0" y="'+(y+(a.bodyTop-8)*scale)+'" width="1086" height="'+(a.slot-a.bodyTop+8)*scale+'"/></clipPath><clipPath id="editor-base-front"><rect x="0" y="'+slot+'" width="1086" height="1448"/></clipPath></defs>'+layer('back');front=layer('front');
 }
 const scene=c.sceneBackground||backdrop;
 const composition='<image data-scene-background="true" href="'+scene+'" width="1086" height="1448" preserveAspectRatio="xMidYMid slice"/>'+back+svg+front;
 if(layout==='card'){
  // Extend only the empty photographic edge strips of the existing scene.
  // The complete plate, artwork and base keep their original proportions.
  const edge=(x,width,left)=>'<svg x="'+x+'" width="'+width+'" height="1448" viewBox="'+left+' 0 1 1448" preserveAspectRatio="none"><image href="'+scene+'" width="1086" height="1448" preserveAspectRatio="xMidYMid slice"/></svg>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1448">'+edge(0,657,0)+edge(1743,657,1085)+'<g transform="translate(657 0)">'+composition+'</g></svg>';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1086 1448">'+composition+'</svg>';
}

// Merchant editor: same hint as the customer view for texts near drill holes.
export function previewHoleHint(config,{options={},designId}={}){
 if(config.acrylic)return '';
 const p=selectedProfile(config,options),d=p.designs.find(d=>d.id===(designId||p.defaultDesignId))||p.designs[0];
 return holeHintText(textsNearHoles(d,p,previewFonts(config)));
}

