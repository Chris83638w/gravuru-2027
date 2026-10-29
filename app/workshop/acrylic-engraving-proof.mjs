import {renderDoorbellCutPdfs} from './doorbell-artwork.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {renderEngraving,formEngravingSettings} from './form-engraving-proof.mjs';
import {digest} from './review-package.mjs';
import {productionPackage} from './production-summary.mjs';
import {surfaceFileName} from '../configurator/variant-m/surfaces.mjs';
export const ACRYLIC_ENGRAVING_RECIPE='gravuru-acrylic-engraving-proof/v4';
export const acrylicEngravingKey=settings=>digest(JSON.stringify({recipe:ACRYLIC_ENGRAVING_RECIPE,settings:formEngravingSettings(settings)}));
export async function createAcrylicEngravingProof(archive,archiveHash,input={},context={}){
 const a=await acrylicArtwork(archive,archiveHash,{engraving:true});
 if(a.manifest.product.method!=='engraving')throw Object.assign(Error('Diese Ausgabe benötigt ein gespeichertes natives Gravurprodukt.'),{status:422});
 const settings=formEngravingSettings({...a.manifest.productionProfile?.document.output,...input}),raw=await renderEngraving({svg:a.svg,geometry:a.geometry,settings,photoFields:a.photoFields,photos:a.photos});
 const cutPdfs=a.doorbellLayers?await renderDoorbellCutPdfs(a.doorbellLayers):null;
 const pdf=Buffer.from(raw.pdf,'base64'),contour=cutPdfs?.acrylic??Buffer.from(raw.contour,'base64');
 if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-'))||!contour.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Ungültige Gravur-PDF.');
 const metadata={schema:ACRYLIC_ENGRAVING_RECIPE,productionProfile:a.manifest.productionProfile||null,profileSettingsOverridden:a.manifest.productionProfile?JSON.stringify(settings)!==JSON.stringify(formEngravingSettings(a.manifest.productionProfile.document.output)):false,snapshotId:a.manifest.id,sourcePackageSha256:archiveHash,geometrySha256:a.geometrySha256,settings,pixelWidth:raw.pixelWidth,pixelHeight:raw.pixelHeight,pdfSha256:digest(pdf),contourSha256:digest(contour),productionReady:false,
  artwork:settings.mode==='vector'?'Vorhandene Schrift-/Motivpfade; keine automatische Vektorisierung.':'Graustufen aus den gesicherten Original-/bearbeiteten Bildern und schwarzen Schrift-/Motivpfaden. Weiß bedeutet keine Gravur.',
  contour:'Separate Datei in gleicher Orientierung; nicht Bestandteil der Gravur-PDF.',
  warnings:['Die helle Gravurfarbe der Produktvorschau ist kein Maschinenwert. Schrift und Bibliotheksmotive werden als schwarze Gravurpfade ausgegeben.','Material-, Maschinenparameter und Probegravur sind noch nicht freigegeben.'],
  photoSources:a.photos.map(p=>({fieldId:p.fieldId,path:p.sourcePath,width:p.width,height:p.height}))};
 // K14 / Ü15.1: gestaltete Rückseite → eigene Gravur-, Kontur- und SVG-Datei; die Dateien der
 // Vorderseite tragen dann „-vorderseite“. Ohne Rückseite bleiben alle Namen wie bisher.
 const sides=[{id:'front',pdf,contour,svg:a.svg,mirror:settings.mirror}];
 if(a.surfaces.includes('back')){
  const b=await acrylicArtwork(archive,archiveHash,{engraving:true,surfaceId:'back'}),backSettings={...settings,mirror:b.mirrorFor(settings.mirror)};
  const rb=await renderEngraving({svg:b.svg,geometry:b.geometry,settings:backSettings,photoFields:b.photoFields,photos:b.photos}),bp=Buffer.from(rb.pdf,'base64'),bc=Buffer.from(rb.contour,'base64');
  if(!bp.subarray(0,5).equals(Buffer.from('%PDF-'))||!bc.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Ungültige Gravur-PDF der Rückseite.');
  sides.push({id:'back',pdf:bp,contour:bc,svg:b.svg,mirror:backSettings.mirror,geometrySha256:b.geometrySha256});
  metadata.photoSources.push(...b.photos.map(p=>({fieldId:'back-'+p.fieldId,path:p.sourcePath,width:p.width,height:p.height})));
 }
 const two=sides.length>1,name=(n,id)=>two?surfaceFileName(n,id):n;
 if(two)metadata.surfaces=sides.map(s=>({id:s.id,pdf:name('technische-gravurpruefung.pdf',s.id),pdfSha256:digest(s.pdf),contour:name('gravur-kontur-1zu1.pdf',s.id),contourSha256:digest(s.contour),mirror:s.mirror,...(s.geometrySha256?{geometrySha256:s.geometrySha256}:{})}));
 if(a.doorbellLayers){metadata.layered={schema:a.doorbellLayers.schema,selection:a.doorbellLayers.selection,geometrySha256:a.doorbellLayers.geometrySha256,steelCutSha256:digest(cutPdfs.steel),acrylicCutSha256:digest(cutPdfs.acrylic),cutMirror:false,engravingMirror:settings.mirror};metadata.contour='Getrennte rote Vektorschnitte für Edelstahlträger und Acrylauflage in gemeinsamer Vorderseitenregistrierung. Der blaue äußere Referenzrand und das Gerätebild sind ausgeschlossen. Schnittdateien werden nicht mit der Gravur gespiegelt.';}
 const extra=[...sides.flatMap(s=>[[name('technische-gravurpruefung.pdf',s.id),s.pdf],[name('gravur-kontur-1zu1.pdf',s.id),s.contour]]),['gravurpruefung.json',Buffer.from(JSON.stringify(metadata,null,2))],...sides.map(s=>[name('gesicherte-gravurgestaltung.svg',s.id),Buffer.from(s.svg)])];
 if(a.doorbellLayers)extra.push(['edelstahltraeger-schnitt-1zu1.pdf',cutPdfs.steel],['acrylauflage-schnitt-1zu1.pdf',cutPdfs.acrylic],['edelstahltraeger-schnitt.svg',Buffer.from(a.doorbellLayers.steel.svg)],['acrylauflage-schnitt.svg',Buffer.from(a.doorbellLayers.acrylic.svg)]);
 const {archive:output}=await productionPackage({files:a.files,manifest:a.manifest,metadata,pdf,extras:extra,orderLines:context.orderLines});
 return {pdf,archive:output,metadata};
}
