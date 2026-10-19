import {printDelivery} from './print-delivery.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {rasterizePrint,formPrintSettings} from './form-print-proof.mjs';
import {digest} from './review-package.mjs';
import {geometryContourPdf} from './form-contour-pdf.mjs';
import {exportSettings} from '../configurator/variant-m/print-export-model.mjs';
import {productionPackage} from './production-summary.mjs';
import {surfaceFileName} from '../configurator/variant-m/surfaces.mjs';
export const ACRYLIC_PRINT_RECIPE='gravuru-acrylic-print-proof/v5';
export const acrylicPrintKey=settings=>digest(JSON.stringify({recipe:ACRYLIC_PRINT_RECIPE,settings:formPrintSettings(settings)}));
export async function acrylicContourProof(archive,archiveHash){
 const a=await acrylicArtwork(archive,archiveHash);
 return geometryContourPdf(a.geometry,`${a.manifest.product.id}:${a.manifest.product.revision}; geometry=${a.geometrySha256}`);
}
// Druckdatei einer Fläche (Raster, Weiß, Kontur) aus der gesicherten Gestaltung.
async function printSide(a,requested){
 const g=a.geometry,raw=await rasterizePrint({svg:a.svg,geometry:g,settings:requested,textFields:a.textFields,photoFields:a.photoFields,photos:a.photos});
 const count=raw.width*raw.height;
 if(!Number.isInteger(raw.width)||!Number.isInteger(raw.height)||raw.width<1||raw.height<1||count>32000000)throw Error('Ungültige Rastermaße.');
 const pixels={width:raw.width,height:raw.height,...Object.fromEntries(['rgb','alpha','whiteAllowed','whiteAlpha'].map(k=>[k,new Uint8Array(Buffer.from(raw[k],'base64'))]))};
 if(pixels.rgb.length!==count*3||['alpha','whiteAllowed','whiteAlpha'].some(k=>pixels[k].length!==count))throw Error('Unvollständige Rasterdaten.');
 const settings=exportSettings({width:g.widthMm,height:g.heightMm},{...requested,bleedMm:raw.bleedMm,whiteBleedMm:raw.whiteBleedMm});
 const artwork=raw.artworkLayers.map(l=>l.type==='text'?l:{...l,rgb:new Uint8Array(Buffer.from(l.rgb,'base64')),alpha:new Uint8Array(Buffer.from(l.alpha,'base64'))});
 const delivery=await printDelivery({settings,pixels,paths:raw.paths,artwork});
 return {raw,settings,delivery,pdf:delivery.pdf};
}
export async function createAcrylicPrintProof(archive,archiveHash,input={},context={}){
 const a=await acrylicArtwork(archive,archiveHash),requested=formPrintSettings({...a.manifest.productionProfile?.document.output,...input});
 if(a.manifest.product.method!=='print')throw Object.assign(Error('Acrylgravur benötigt eine eigene Ausgabe ohne Druckweiß.'),{status:422});
 const front=await printSide(a,requested),{raw,settings,delivery}=front,{pdf}=delivery,warnings=[];
 if(requested.bleedMm&&!raw.bleedMm)warnings.push('Kein Druck am Außenrand: Der angeforderte Überdruck wurde nicht hinzugefügt.');
 warnings.push('Generische CMYK-Separation; gemessenes ICC-Profil und RIP-/Maschinenabnahme fehlen.');
 const metadata={schema:ACRYLIC_PRINT_RECIPE,sourceReviewSchema:a.manifest.schema,downloads:delivery.downloads,productionProfile:a.manifest.productionProfile||null,profileSettingsOverridden:a.manifest.productionProfile?JSON.stringify(requested)!==JSON.stringify(formPrintSettings(a.manifest.productionProfile.document.output)):false,snapshotId:a.manifest.id,sourcePackageSha256:archiveHash,geometrySha256:a.geometrySha256,requested,settings,edgeInk:raw.edgeInk,vectorGlyphs:raw.textVectors.length,pixelWidth:raw.width,pixelHeight:raw.height,pdfSha256:digest(pdf),warnings,productionReady:false,source:'Serverseitig aus eingefrorenen Kundenobjekten, Schriftpfaden, Designquellen und Original-/bearbeiteten Bilddateien. Browser-PNG unbenutzt.',colorConversion:'Generische DeviceCMYK-Separation; kein gemessenes Maschinen-ICC.',photoSources:a.photos.map(p=>({fieldId:p.fieldId,path:p.sourcePath,width:p.width,height:p.height}))};
 // K14 / Ü15.1: gestaltete Rückseite → eigene Druck-, Weiß- und SVG-Datei mit „-rueckseite“;
 // die Vorderseite heißt dann „-vorderseite“. Ohne Rückseite bleiben alle Namen wie bisher.
 const sides=[{id:'front',a,side:front}];
 if(a.surfaces.includes('back')){const b=await acrylicArtwork(archive,archiveHash,{surfaceId:'back'});sides.push({id:'back',a:b,side:await printSide(b,{...requested,mirror:b.mirrorFor(requested.mirror)})});}
 const two=sides.length>1,name=(n,id)=>two?surfaceFileName(n,id):n;
 if(two){
  for(const s of sides){const d=s.side.delivery.downloads;d.pdf.name=name(d.pdf.name,s.id);if(d.white)d.white.name=name(d.white.name,s.id);}
  metadata.surfaces=sides.map(s=>({id:s.id,pdf:s.side.settings.profile==='mimaki'?s.side.delivery.downloads.pdf.name:name('technische-druckpruefung.pdf',s.id),pdfSha256:digest(s.side.pdf),mirror:s.side.settings.mirror,geometrySha256:s.a.geometrySha256,...(s.side.delivery.downloads.white?{white:s.side.delivery.downloads.white.name}:{})}));
  metadata.photoSources.push(...sides[1].a.photos.map(p=>({fieldId:'back-'+p.fieldId,path:p.sourcePath,width:p.width,height:p.height})));
 }
 const extras=[];
 for(const s of sides){
  const {settings:st,delivery:dl,pdf:sp}=s.side;
  extras.push({name:st.profile==='mimaki'?dl.downloads.pdf.name:name('technische-druckpruefung.pdf',s.id),blob:new Blob([sp])});
  if(s.id==='front')extras.push({name:'druckpruefung.json',blob:new Blob([JSON.stringify(metadata,null,2)])});
  extras.push({name:name('gesicherte-gestaltung.svg',s.id),blob:new Blob([s.a.svg])});
  extras.push(...dl.extras.map(e=>({...e,name:name(e.name,s.id)})));
 }
 const {archive:output}=await productionPackage({files:a.files,manifest:a.manifest,metadata,pdf,extras,orderLines:context.orderLines});
 return {pdf,archive:output,metadata};
}
