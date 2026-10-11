import {graphicMarkup} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW,NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {validateProductDesign} from './product-model.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {artworkViewport} from '../configurator/variant-m/print-geometry.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {photoShape,photoClip,photoMaskURL} from '../platform/sources/app/shared/models/photo-shape.mjs';
import {textPaths} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {escapeXml as esc} from '../platform/sources/app/shared/models/design-content.mjs';
import {elementColor} from '../platform/sources/app/shared/models/processing-profiles.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'acrylic_artwork'});};
const dataSvg=bytes=>'data:image/svg+xml;base64,'+bytes.toString('base64');
const number=v=>Number(v.toFixed(8));
export function nativeContour(g){
 const w=g.width,h=g.height,r=g.cornerRadiusMm||0;
 const ellipse=(x,y,rx,ry)=>`M${x-rx} ${y}a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`;
 const d=g.shape==='ellipse'?ellipse(w/2,h/2,w/2,h/2):r?`M${r} 0H${w-r}A${r} ${r} 0 0 1 ${w} ${r}V${h-r}A${r} ${r} 0 0 1 ${w-r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h-r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`:`M0 0H${w}V${h}H0Z`;
 return {schema:'gravuru-contour/v1',widthMm:w,heightMm:h,holeCount:g.holes.length,contours:[{role:'outer',d},...g.holes.map(h=>({role:'hole',d:ellipse(h.x,h.y,h.diameter/2,h.diameter/2)}))]};
}
export async function acrylicArtwork(archive,archiveHash,{engraving=false}={}){
 const {files,manifest}=readReviewPackage(archive,archiveHash,NATIVE_REVIEW_SCHEMAS),saved=JSON.parse(files.get('produkt-und-gestaltung.json')),config=JSON.parse(files.get('konfigurator-quellen.json')),state=saved.state;
 const native=manifest.schema===NATIVE_REVIEW;
 if(saved.schema!==(native?'gravuru-native-review-input/v1':'gravuru-acrylic-review-input/v1')||native!==(config.profile.material.kind==='slate')||saved.profileRevision!==config.profile.revision||manifest.product.id!==config.profile.id)fail('Die gesicherte Produktrevision ist nicht eindeutig.');
 const design=validateProductDesign(saved.product,state.design,{options:state.options,fonts:config.localResources.fonts,motifs:config.localResources.motifs});
 const viewport=artworkViewport(config,{mOptions:state.options}),geometry=nativeContour(viewport.geometry),parts=[],photos=[],textFields=[],photoFields=[];
 if(geometry.widthMm!==manifest.product.widthMm||geometry.heightMm!==manifest.product.heightMm)fail('Das gesicherte Druckformat stimmt nicht überein.');
 const maskFor=(o,id)=>{const bytes=o.photoMaskAssetId&&files.get('quellen/'+o.photoMaskAssetId+'-vorschau.svg');if(o.photoShape==='template'&&!bytes)fail('Original-Fotomaske fehlt im gesicherten Stand.');const clip=photoClip(o,id,bytes?dataSvg(bytes):undefined);clip.defs=clip.defs.replace('<mask ',`<mask data-mask-scale="${viewport.scale}" `);return clip;};
 const transform=o=>`translate(${number(viewport.x)} ${number(viewport.y)}) scale(${number(viewport.scale)}) translate(${o.x} ${o.y}) rotate(${o.rotation||0})`;
 for(const [index,o] of design.objects.entries()){
  if(o.uxHidden)continue;const field='native-'+index,color=engraving?'#000000':elementColor(config.profile,o);let body='';
  if(o.type==='text'){body=textPaths(o,config.localResources.fonts);if(!body&&o.text.trim())fail('Gesicherte Schriftpfade fehlen.');textFields.push(field);}
  else if(o.uxUploadId){
   const entry=manifest.photos.find(p=>p.uploadId===o.uxUploadId);if(!entry)fail('Ein Originalbild fehlt im gesicherten Stand.');
   const path=entry.edited?.path||entry.path,bytes=files.get(path);if(!bytes)fail('Die gespeicherte Bildfassung fehlt.');
   const photo=await prepareCustomerPhoto(bytes.toString('base64')),p=photoPlacement(o,photo),clip='native-photo-'+index;
   const image=`<g data-photo-pan="${field}"><image href="data:image/png;base64,${photo.preview.toString('base64')}" x="${o.type==='photoSlot'?p.x:-o.w/2}" y="${o.type==='photoSlot'?p.y:-o.h/2}" width="${o.type==='photoSlot'?p.w:o.w}" height="${o.type==='photoSlot'?p.h:o.h}" preserveAspectRatio="xMidYMid meet"${o.type==='photoSlot'?` transform="rotate(${p.angle} ${p.cx} ${p.cy})"`:''}/></g>`;
   const mask=maskFor(o,clip);
   body=o.type==='photoSlot'?`<defs>${mask.defs}</defs><g ${mask.attribute}>${image}</g>`:image;
   photos.push({fieldId:field,bytes:bytes.toString('base64'),width:photo.width,height:photo.height,tone:'original',...(o.uxUploadKind==='logo'&&o.uxLogoTint?{nativeTint:color}:{}),sourcePath:path});photoFields.push(field);
  }else if(o.type==='photoSlot'){
   const example=config.localResources.photoExamples?.find(e=>e.designId===design.id&&e.slotId===o.id);if(o.required&&!example)fail('Erforderliches eigenes Foto fehlt.');if(!example)continue;
   const bytes=files.get('quellen/'+example.assetId+'-vorschau.svg');if(!bytes)fail('Beispielfoto fehlt im gesicherten Stand.');const clip='native-example-'+index,mask=maskFor(o,clip);
   body=`<defs>${mask.defs}</defs><g ${mask.attribute}><image href="${dataSvg(bytes)}" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/></g>`;
  }else if(o.type==='graphic'){
   body=graphicMarkup(o,color);
   if(!body)fail('Unbekannte gespeicherte Grafikform.');
  }else if(o.type==='motif'){
   const motif=config.localResources.motifs.find(m=>m.key===o.motif);if(!motif)fail('Gesicherte Motivquelle fehlt.');let fragment=motif.svgFragment;
   if(motif.artwork){
    const bytes=files.get('quellen/'+motif.artwork.assetId+'-vorschau.svg');if(!bytes)fail('Gesicherte importierte Designquelle fehlt.');const fit=Math.min(o.w/motif.artwork.widthMm,o.h/motif.artwork.heightMm)*viewport.scale;
    const tint=engraving||o.preserveColors===false?` data-native-tint="${esc(color)}" data-raster-width-mm="${number(motif.artwork.widthMm*fit)}" data-raster-height-mm="${number(motif.artwork.heightMm*fit)}"`:'';
    fragment=`<image href="${dataSvg(bytes)}" width="${motif.artwork.widthMm}" height="${motif.artwork.heightMm}" preserveAspectRatio="none"${tint}/>`;
   }else if(engraving||o.preserveColors===false){fragment=fragment.replace(/(fill|stroke)="(?!none\b)[^"]*"/g,`$1="${color}"`);}
   body=`<svg x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" viewBox="${motif.bounds.join(' ')}" preserveAspectRatio="xMidYMid meet" color="${color}">${fragment}</svg>`;
  }else fail('Dieser gespeicherte Elementtyp ist für die Acryl-Ausgabe noch nicht unterstützt: '+o.type);
  parts.push(`<g data-field="${field}" transform="${transform(o)}" fill="${esc(color)}">${body}</g>`);
 }
 if(design.marks?.length)fail('Diese Vorlage enthält noch nicht übernommene Gestaltungslinien. Bitte vor der Fertigung prüfen.');
 const clip=engraving?`<defs><clipPath id="native-engraving-contour"><path d="${geometry.contours.map(c=>c.d).join(' ')}" clip-rule="evenodd"/></clipPath></defs>`:'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.widthMm}mm" height="${geometry.heightMm}mm" viewBox="0 0 ${geometry.widthMm} ${geometry.heightMm}">${clip}<g data-native-design="true"${engraving?' clip-path="url(#native-engraving-contour)"':''}>${parts.join('')}</g></svg>`;
 return {files,manifest,svg,geometry,geometrySha256:digest(JSON.stringify(geometry)),photos,textFields,photoFields};
}
