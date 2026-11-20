import {NATIVE_INPUT_EMBEDDED,NATIVE_INPUT_REFERENCE,REVIEW_SOURCES_FILE,reviewSourcesJson,savedProductDocument,savedReviewSources} from './review-product.mjs';
import {isFamilyFormats} from '../configurator/variant-m/family-formats.mjs';
import {designPaintOrder} from '../platform/sources/app/shared/models/design-layer-order.mjs';
import {doorbellSeparations} from './doorbell-artwork.mjs';
import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {photoColorMode} from '../platform/sources/app/shared/models/photo-color.mjs';
import {validateContourGeometry,flattenContourPath,reverseContourPath} from './contour-path.mjs';
import {graphicMarkup} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW,NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {validateProductDesign} from './product-model.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {customerVectorLogoFragment} from './customer-vector-logo-media.mjs';
import {artworkViewport} from '../configurator/variant-m/print-geometry.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {photoShape,photoClip,photoMaskURL} from '../platform/sources/app/shared/models/photo-shape.mjs';
import {textPaths} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {escapeXml as esc} from '../platform/sources/app/shared/models/design-content.mjs';
import {elementColor} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import {isGuideObject,selectedProfile} from '../configurator/variant-m/contract.mjs';
import {objectSurface,surfaceGeometry,producedSurfaces,surfaceMirror,hasBack} from '../configurator/variant-m/surfaces.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'acrylic_artwork'});};
const dataSvg=bytes=>'data:image/svg+xml;base64,'+bytes.toString('base64');
const number=v=>Number(v.toFixed(8));
export function nativeContour(g){
 const w=g.width,h=g.height,r=g.cornerRadiusMm||0;
 const ellipse=(x,y,rx,ry,sweep=0)=>`M${x-rx} ${y}a${rx} ${ry} 0 1 ${sweep} ${2*rx} 0a${rx} ${ry} 0 1 ${sweep} ${-2*rx} 0Z`;
 // sweep 1 = rounded (convex) corner, sweep 0 = eingezogene Ecke (concave quarter circle centred on the corner)
 const cornered=sw=>`M${r} 0H${w-r}A${r} ${r} 0 0 ${sw} ${w} ${r}V${h-r}A${r} ${r} 0 0 ${sw} ${w-r} ${h}H${r}A${r} ${r} 0 0 ${sw} 0 ${h-r}V${r}A${r} ${r} 0 0 ${sw} ${r} 0Z`;
 if(g.shape==='contour')try{validateContourGeometry(g);}catch(e){fail(e.message);}
 const d=g.shape==='contour'?g.outlinePath:g.shape==='ellipse'?ellipse(w/2,h/2,w/2,h/2):r?cornered(g.shape==='plaque'?0:1):`M0 0H${w}V${h}H0Z`;
 // CairoSVG clips with nonzero winding even when clip-rule is evenodd. Keep
 // the authoritative outer path untouched and orient generated holes against it.
 const points=g.shape==='contour'?flattenContourPath(d):null;
 const holeSweep=points&&points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)<0?1:0;
 const winding=path=>{const p=flattenContourPath(path);return Math.sign(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0));};
 const cutouts=(g.cutoutPaths||[]).map(path=>({role:'hole',d:winding(path)===winding(d)?reverseContourPath(path):path}));
 return {schema:'gravuru-contour/v1',widthMm:w,heightMm:h,holeCount:g.holes.length+cutouts.length,contours:[{role:'outer',d},...cutouts,...g.holes.map(h=>({role:'hole',d:ellipse(h.x,h.y,h.diameter/2,h.diameter/2,holeSweep)}))]};
}
// K14 / Ü15.1: `surfaceId` wählt die Fläche (Standard vorn, wie bisher). Die Rückseite wird
// seitenrichtig ausgegeben, ihre Kontur hat die von hinten gespiegelten Bohrlöcher.
// `productDocument`: holt bei Paketen mit Verweis den Produktstand aus der Werkstatt (review-product.mjs); bei Paketen mit
// eingebettetem Produktstand wird er nicht gebraucht.
export async function acrylicArtwork(archive,archiveHash,{engraving=false,surfaceId='front',productDocument=null}={}){
 const read=readReviewPackage(archive,archiveHash,NATIVE_REVIEW_SCHEMAS),manifest=read.manifest,saved=JSON.parse(read.files.get('produkt-und-gestaltung.json')),state=saved.state;
 let files=read.files,config=JSON.parse(files.get(REVIEW_SOURCES_FILE));
 const layered=isLayeredDoorbell(config);
 if(config.doorbell&&!layered)fail('Die getrennte Fertigungsausgabe für Edelstahlträger und Acrylglasauflage ist noch nicht angebunden.');
 const native=manifest.schema===NATIVE_REVIEW;
 if(!(native?[NATIVE_INPUT_EMBEDDED,NATIVE_INPUT_REFERENCE]:['gravuru-acrylic-review-input/v1']).includes(saved.schema)||native!==(['slate','steel'].includes(config.profile.material.kind)||!!config.familyAcrylic||isFamilyFormats(config)||layered)||saved.profileRevision!==config.profile.revision||manifest.product.id!==config.profile.id)fail('Die gesicherte Produktrevision ist nicht eindeutig.');
 // Profile fonts were frozen at checkout after the original product document.
 // Validate against those hash-verified paths, just like validateAcrylicReview;
 // never resolve a missing font from today's library or the browser.
 const stored=savedProductDocument(saved,manifest,productDocument),product=stored.document;
 // Gekürzte Konfiguration (Paket mit Verweis): aus dem geprüften Produktstand vollständig wiederherstellen, bevor irgendetwas
 // daraus gelesen wird. Alle folgenden Leser und das Fertigungspaket sehen die Datei Byte für Byte wie bisher.
 const sources=savedReviewSources(config,product);
 if(sources.restored){config=sources.config;files=new Map(files);files.set(REVIEW_SOURCES_FILE,reviewSourcesJson(config));}
 const document={...product,config:{...product.config,localResources:{...product.config.localResources,fonts:{...product.config.localResources?.fonts,...config.localResources.fonts}}}};
 const design=validateProductDesign(document,state.design,{options:state.options,fonts:config.localResources.fonts,motifs:config.localResources.motifs});
 if(surfaceId!=='front'&&!(surfaceId==='back'&&hasBack(config.profile)))fail('Dieses Produkt hat keine solche Seite.');
 const layers=layered?doorbellSeparations(config,state.options):null;
 if(layers){if(surfaceId!=='front')fail('Die Funkklingel wird in einer gemeinsamen Vorderseitenregistrierung gefertigt.');let frozen;try{frozen=JSON.parse(files.get('funkklingel-fertigung.json'));}catch{fail('Die gesicherten Funkklingelkonturen fehlen.');}if(JSON.stringify(frozen)!==JSON.stringify(layers))fail('Die gesicherten Funkklingelkonturen stimmen nicht mit der Produktrevision überein.');}
 const viewport=artworkViewport(config,{mOptions:state.options}),geometry=layers?.geometry??nativeContour(surfaceGeometry(viewport.geometry,surfaceId)),parts=[],photos=[],textFields=[],photoFields=[];
 if(geometry.widthMm!==manifest.product.widthMm||geometry.heightMm!==manifest.product.heightMm)fail('Das gesicherte Druckformat stimmt nicht überein.');
 const maskFor=(o,id)=>{const bytes=o.photoMaskAssetId&&files.get('quellen/'+o.photoMaskAssetId+'-vorschau.svg');if(o.photoShape==='template'&&!bytes)fail('Original-Fotomaske fehlt im gesicherten Stand.');const clip=photoClip(o,id,bytes?dataSvg(bytes):undefined);clip.defs=clip.defs.replace('<mask ',`<mask data-mask-scale="${viewport.scale}" `);return clip;};
 const transform=o=>`translate(${number(viewport.x)} ${number(viewport.y)}) scale(${number(viewport.scale)}) translate(${o.x} ${o.y}) rotate(${o.rotation||0})`;
 for(const [index,o] of designPaintOrder(design).map(o=>[design.objects.indexOf(o),o])){
  if(o.uxHidden||isGuideObject(o))continue; // Ü6.1: Hilfsebenen sind Vorschau, nie Fertigung
  if(objectSurface(o)!==surfaceId)continue; // Ü15.1: je Fläche eine eigene Datei
  const field='native-'+index,color=engraving?'#000000':elementColor(config.profile,o);let body='';
  if(o.type==='text'){body=textPaths(o,config.localResources.fonts);if(!body&&o.text.trim())fail('Gesicherte Schriftpfade fehlen.');textFields.push(field);}
  else if(o.uxUploadId){
   const entry=manifest.photos.find(p=>p.uploadId===o.uxUploadId);if(!entry)fail('Ein Originalbild fehlt im gesicherten Stand.');
   if(entry.kind==='vector-logo'||o.uxVectorLogo){
    const logo=customerVectorLogoFragment(entry,o,files);
    body=`<svg x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" viewBox="0 0 ${logo.width} ${logo.height}" preserveAspectRatio="xMidYMid meet">${logo.fragment}</svg>`;
   }else{
   const path=entry.edited?.path||entry.path,bytes=files.get(path);if(!bytes)fail('Die gespeicherte Bildfassung fehlt.');
   const photo=await prepareCustomerPhoto(bytes.toString('base64')),p=photoPlacement(o,photo),clip='native-photo-'+index;
   const image=`<g data-photo-pan="${field}"><image href="data:image/png;base64,${photo.preview.toString('base64')}" x="${o.type==='photoSlot'?p.x:-o.w/2}" y="${o.type==='photoSlot'?p.y:-o.h/2}" width="${o.type==='photoSlot'?p.w:o.w}" height="${o.type==='photoSlot'?p.h:o.h}" preserveAspectRatio="xMidYMid meet"${o.type==='photoSlot'?` transform="rotate(${p.angle} ${p.cx} ${p.cy})"`:''}/></g>`;
   const mask=maskFor(o,clip);
   body=o.type==='photoSlot'?`<defs>${mask.defs}</defs><g ${mask.attribute}>${image}</g>`:image;
   photos.push({fieldId:field,bytes:bytes.toString('base64'),width:photo.width,height:photo.height,...nativePhotoTreatment(config.profile,o,{edited:!!entry.edited,engraving}),...(o.uxUploadKind==='logo'&&o.uxLogoTint?{nativeTint:color}:{}),sourcePath:path});photoFields.push(field);
   }
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
    // Engraving uses the preview rule: coverage = 1 − luminance (white stays
    // unengraved, photos keep tones); steel vectors are solid ink.
    const tonal=engraving?(config.profile.material.kind==='steel'&&motif.vectorOnly===true?'solid':'tone'):'flat';
    // Source decoration is already black vector artwork. Keep it as vectors
    // only when the immutable selected template and verified asset agree.
    const original=layered?selectedProfile(config,state.options).designs.find(d=>d.id===design.id)?.objects.find(v=>v.id===o.id):null;
    const raw=bytes.toString('utf8'),paints=[...raw.matchAll(/\b(?:fill|stroke)\s*=\s*"([^"]*)"/g)].map(m=>m[1]);
    const sourceVector=engraving&&layered&&original?.uxDecoration===true&&original.customerEditable===false&&original.templateOrigin===true&&original.motif===o.motif&&o.uxDecoration===true&&motif.vectorOnly===true&&motif.embeddedOnly===true&&digest(bytes)===motif.artwork.previewSha256&&paints.some(p=>p==='#000000')&&paints.every(p=>p==='#000000'||p==='none')&&!/<(?:image|text|style|script|filter|use|foreignObject)\b/.test(raw);
    const tint=(engraving||o.preserveColors===false)&&!sourceVector?` data-native-tint="${esc(color)}" data-native-tonal="${tonal}" data-raster-width-mm="${number(motif.artwork.widthMm*fit)}" data-raster-height-mm="${number(motif.artwork.heightMm*fit)}"`:'';
    fragment=`<image href="${dataSvg(bytes)}" width="${motif.artwork.widthMm}" height="${motif.artwork.heightMm}" preserveAspectRatio="none"${tint}/>`;
   }else if(engraving||o.preserveColors===false){fragment=fragment.replace(/(fill|stroke)="(?!none\b)[^"]*"/g,`$1="${color}"`);}
   body=`<svg x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" viewBox="${motif.bounds.join(' ')}" preserveAspectRatio="xMidYMid meet" color="${color}">${fragment}</svg>`;
  }else fail('Dieser gespeicherte Elementtyp ist für die Acryl-Ausgabe noch nicht unterstützt: '+o.type);
  parts.push(`<g data-field="${field}" transform="${transform(o)}" fill="${esc(color)}">${body}</g>`);
 }
 if(design.marks?.length)fail('Diese Vorlage enthält noch nicht übernommene Gestaltungslinien. Bitte vor der Fertigung prüfen.');
 const clip=engraving?`<defs><clipPath id="native-engraving-contour"><path d="${geometry.contours.filter(c=>c.role==='outer').map(c=>c.d).join(' ')}" clip-rule="evenodd"/></clipPath></defs>`:'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.widthMm}mm" height="${geometry.heightMm}mm" viewBox="0 0 ${geometry.widthMm} ${geometry.heightMm}">${clip}<g data-native-design="true"${engraving?' clip-path="url(#native-engraving-contour)"':''}>${parts.join('')}</g></svg>`;
 return {files,manifest,...(stored.reference?{productDocument:product,productReference:stored.reference}:{}),svg,geometry,...(layers?{doorbellLayers:layers}:{}),geometrySha256:digest(JSON.stringify(geometry)),photos,textFields,photoFields,surfaceId,surfaces:producedSurfaces(config.profile,design.objects),mirrorFor:front=>surfaceMirror(config,surfaceId,front)};
}

// Applied customer edits already contain their colour transform. Gravure keeps
// its established production luminance conversion; material light is preview-only.
export function nativePhotoTreatment(profile,object,{edited=false,engraving=false}={}){
 return {tone:edited||engraving||object.uxUploadKind!=='photo'?'original':photoColorMode(profile,object),nativeGrayscale:true};
}
