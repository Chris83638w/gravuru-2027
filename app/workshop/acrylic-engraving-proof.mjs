import {acrylicArtwork} from './acrylic-artwork.mjs';
import {renderEngraving,formEngravingSettings} from './form-engraving-proof.mjs';
import {digest} from './review-package.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
export const ACRYLIC_ENGRAVING_RECIPE='gravuru-acrylic-engraving-proof/v2';
export const acrylicEngravingKey=settings=>digest(JSON.stringify({recipe:ACRYLIC_ENGRAVING_RECIPE,settings:formEngravingSettings(settings)}));
export async function createAcrylicEngravingProof(archive,archiveHash,input={}){
 const a=await acrylicArtwork(archive,archiveHash,{engraving:true});
 if(a.manifest.product.method!=='engraving')throw Object.assign(Error('Diese Ausgabe benötigt ein gespeichertes natives Gravurprodukt.'),{status:422});
 const settings=formEngravingSettings({...a.manifest.productionProfile?.document.output,...input}),raw=await renderEngraving({svg:a.svg,geometry:a.geometry,settings,photoFields:a.photoFields,photos:a.photos});
 const pdf=Buffer.from(raw.pdf,'base64'),contour=Buffer.from(raw.contour,'base64');
 if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-'))||!contour.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Ungültige Gravur-PDF.');
 const metadata={schema:ACRYLIC_ENGRAVING_RECIPE,productionProfile:a.manifest.productionProfile||null,profileSettingsOverridden:a.manifest.productionProfile?JSON.stringify(settings)!==JSON.stringify(formEngravingSettings(a.manifest.productionProfile.document.output)):false,snapshotId:a.manifest.id,sourcePackageSha256:archiveHash,geometrySha256:a.geometrySha256,settings,pixelWidth:raw.pixelWidth,pixelHeight:raw.pixelHeight,pdfSha256:digest(pdf),contourSha256:digest(contour),productionReady:false,
  artwork:settings.mode==='vector'?'Vorhandene Schrift-/Motivpfade; keine automatische Vektorisierung.':'Graustufen aus den gesicherten Original-/bearbeiteten Bildern und schwarzen Schrift-/Motivpfaden. Weiß bedeutet keine Gravur.',
  contour:'Separate Datei in gleicher Orientierung; nicht Bestandteil der Gravur-PDF.',
  warnings:['Die helle Gravurfarbe der Produktvorschau ist kein Maschinenwert. Schrift und Bibliotheksmotive werden als schwarze Gravurpfade ausgegeben.','Material-, Maschinenparameter und Probegravur sind noch nicht freigegeben.'],
  photoSources:a.photos.map(p=>({fieldId:p.fieldId,path:p.sourcePath,width:p.width,height:p.height}))};
 const extra=[['technische-gravurpruefung.pdf',pdf],['gravur-kontur-1zu1.pdf',contour],['gravurpruefung.json',Buffer.from(JSON.stringify(metadata,null,2))],['gesicherte-gravurgestaltung.svg',Buffer.from(a.svg)]];
 const output=Buffer.from(await (await zipFiles([...a.files,...extra].map(([name,bytes])=>({name,blob:new Blob([bytes])})))).arrayBuffer());
 return {pdf,archive:output,metadata};
}
