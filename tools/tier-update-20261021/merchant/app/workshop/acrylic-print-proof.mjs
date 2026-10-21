import {printDelivery} from './print-delivery.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {rasterizePrint,formPrintSettings} from './form-print-proof.mjs';
import {digest} from './review-package.mjs';
import {geometryContourPdf} from './form-contour-pdf.mjs';
import {exportSettings,zipFiles} from '../configurator/variant-m/print-export-model.mjs';
export const ACRYLIC_PRINT_RECIPE='gravuru-acrylic-print-proof/v5';
export const acrylicPrintKey=settings=>digest(JSON.stringify({recipe:ACRYLIC_PRINT_RECIPE,settings:formPrintSettings(settings)}));
export async function acrylicContourProof(archive,archiveHash){
 const a=await acrylicArtwork(archive,archiveHash);
 return geometryContourPdf(a.geometry,`${a.manifest.product.id}:${a.manifest.product.revision}; geometry=${a.geometrySha256}`);
}
export async function createAcrylicPrintProof(archive,archiveHash,input={}){
 const a=await acrylicArtwork(archive,archiveHash),requested=formPrintSettings({...a.manifest.productionProfile?.document.output,...input}),g=a.geometry;
 if(a.manifest.product.method!=='print')throw Object.assign(Error('Acrylgravur benötigt eine eigene Ausgabe ohne Druckweiß.'),{status:422});
 const raw=await rasterizePrint({svg:a.svg,geometry:g,settings:requested,textFields:a.textFields,photoFields:a.photoFields,photos:a.photos});
 const count=raw.width*raw.height;
 if(!Number.isInteger(raw.width)||!Number.isInteger(raw.height)||raw.width<1||raw.height<1||count>32000000)throw Error('Ungültige Rastermaße.');
 const pixels={width:raw.width,height:raw.height,...Object.fromEntries(['rgb','alpha','whiteAllowed','whiteAlpha'].map(k=>[k,new Uint8Array(Buffer.from(raw[k],'base64'))]))};
 if(pixels.rgb.length!==count*3||['alpha','whiteAllowed','whiteAlpha'].some(k=>pixels[k].length!==count))throw Error('Unvollständige Rasterdaten.');
 const settings=exportSettings({width:g.widthMm,height:g.heightMm},{...requested,bleedMm:raw.bleedMm,whiteBleedMm:raw.whiteBleedMm});
 const artwork=raw.artworkLayers.map(l=>l.type==='text'?l:{...l,rgb:new Uint8Array(Buffer.from(l.rgb,'base64')),alpha:new Uint8Array(Buffer.from(l.alpha,'base64'))});
 const delivery=await printDelivery({settings,pixels,paths:raw.paths,artwork}),{pdf}=delivery,warnings=[];
 if(requested.bleedMm&&!raw.bleedMm)warnings.push('Kein Druck am Außenrand: Der angeforderte Überdruck wurde nicht hinzugefügt.');
 warnings.push('Generische CMYK-Separation; gemessenes ICC-Profil und RIP-/Maschinenabnahme fehlen.');
 const metadata={schema:ACRYLIC_PRINT_RECIPE,sourceReviewSchema:a.manifest.schema,downloads:delivery.downloads,productionProfile:a.manifest.productionProfile||null,profileSettingsOverridden:a.manifest.productionProfile?JSON.stringify(requested)!==JSON.stringify(formPrintSettings(a.manifest.productionProfile.document.output)):false,snapshotId:a.manifest.id,sourcePackageSha256:archiveHash,geometrySha256:a.geometrySha256,requested,settings,edgeInk:raw.edgeInk,vectorGlyphs:raw.textVectors.length,pixelWidth:raw.width,pixelHeight:raw.height,pdfSha256:digest(pdf),warnings,productionReady:false,source:'Serverseitig aus eingefrorenen Kundenobjekten, Schriftpfaden, Designquellen und Original-/bearbeiteten Bilddateien. Browser-PNG unbenutzt.',colorConversion:'Generische DeviceCMYK-Separation; kein gemessenes Maschinen-ICC.',photoSources:a.photos.map(p=>({fieldId:p.fieldId,path:p.sourcePath,width:p.width,height:p.height}))};
 const extras=[{name:settings.profile==='mimaki'?delivery.downloads.pdf.name:'technische-druckpruefung.pdf',blob:new Blob([pdf])},{name:'druckpruefung.json',blob:new Blob([JSON.stringify(metadata,null,2)])},{name:'gesicherte-gestaltung.svg',blob:new Blob([a.svg])}];
 extras.push(...delivery.extras);
 const output=Buffer.from(await (await zipFiles([...a.files].map(([name,bytes])=>({name,blob:new Blob([bytes])})).concat(extras))).arrayBuffer());
 return {pdf,archive:output,metadata};
}
