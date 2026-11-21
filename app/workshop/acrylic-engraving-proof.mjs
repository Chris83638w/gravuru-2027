import {PRODUCT_DOCUMENT_FILE,productDocumentJson} from './review-product.mjs';
import {renderDoorbellCutPdfs} from './doorbell-artwork.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {renderEngraving,formEngravingSettings} from './form-engraving-proof.mjs';
import {digest} from './review-package.mjs';
import {productionPackage} from './production-summary.mjs';
import {surfaceFileName} from '../configurator/variant-m/surfaces.mjs';
import {ORDER_FILES_SCHEMA,contourStroke,svgWithContour,orderFileSet} from './print-delivery.mjs';
// v8 (#265, ENTSCHEIDUNGEN 3.61): Die Bestellansicht führt je Fläche nur noch „PDF“ und „SVG“, beide immer mit Kontur
// (`gravur-1zu1-mit-kontur.pdf/.svg`, seit v7 im Paket). Die übrigen Dateien des Pakets bleiben wie bisher. Ausgaben der
// Vorversion bleiben unter ihrem Schlüssel gültig und abrufbar; für eine Bestellposition entsteht der Auftrag mit dem neuen
// Schlüssel beim Öffnen ihrer Ausgaben von selbst (http.mjs `ensureOrderOutput`).
export const ACRYLIC_ENGRAVING_RECIPE='gravuru-acrylic-engraving-proof/v8';
// #265, ENTSCHEIDUNGEN 3.57 (5): Ohne Fertigungsprofil und ohne ausdrückliche Wahl gilt `auto` – Vektor, wenn die Gestaltung kein
// Foto enthält, sonst Raster. Entschieden wird beim Bau (form-engraving-worker.py), weil erst dort feststeht, ob die Gestaltung
// Rasterbilder enthält; `metadata.settings.mode` nennt das Ergebnis. Mit Fertigungsprofil gilt das Profil unverändert, eine
// ausdrückliche Wahl (Knopf „Ausgabe“: Raster oder Vektor) ebenso.
const engravingSettings=settings=>settings?.mode==='auto'?{...formEngravingSettings({...settings,mode:'raster'}),mode:'auto'}:formEngravingSettings(settings);
export const acrylicEngravingSettings=(profileOutput,input={})=>profileOutput?formEngravingSettings({...profileOutput,...input}):engravingSettings({mode:'auto',...input});
export const acrylicEngravingKey=settings=>digest(JSON.stringify({recipe:ACRYLIC_ENGRAVING_RECIPE,settings:engravingSettings(settings)}));
export async function createAcrylicEngravingProof(archive,archiveHash,input={},context={}){
 const a=await acrylicArtwork(archive,archiveHash,{engraving:true,productDocument:context.productDocument});
 if(a.manifest.product.method!=='engraving')throw Object.assign(Error('Diese Ausgabe benötigt ein gespeichertes natives Gravurprodukt.'),{status:422});
 // #265, ENTSCHEIDUNGEN 3.61: `stroke` ist die Farbe der Anlegekontur in „PDF“ und „SVG“ der Bestellansicht. Bei der
 // zweischichtigen Funkklingel ist `a.geometry` die Acrylauflage (sie trägt die Gestaltung – von Chris am 21.11.2026 so
 // entschieden); die Schnittdateien des Edelstahlträgers bleiben wie bisher getrennt im Paket.
 const requested=acrylicEngravingSettings(a.manifest.productionProfile?.document.output,input),stroke=contourStroke(a,{engraving:true});
 const raw=await renderEngraving({svg:a.svg,geometry:a.geometry,settings:requested,photoFields:a.photoFields,photos:a.photos,materialKind:a.manifest.product.material.kind,contourStroke:stroke});
 const settings={...requested,mode:raw.mode};
 const cutPdfs=a.doorbellLayers?await renderDoorbellCutPdfs(a.doorbellLayers):null;
 const pdf=Buffer.from(raw.pdf,'base64'),contour=cutPdfs?.acrylic??Buffer.from(raw.contour,'base64'),pdfContour=Buffer.from(raw.pdfContour,'base64');
 if([pdf,contour,pdfContour].some(bytes=>!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))))throw Error('Ungültige Gravur-PDF.');
 const metadata={schema:ACRYLIC_ENGRAVING_RECIPE,productionProfile:a.manifest.productionProfile||null,profileSettingsOverridden:a.manifest.productionProfile?JSON.stringify(settings)!==JSON.stringify(formEngravingSettings(a.manifest.productionProfile.document.output)):false,snapshotId:a.manifest.id,sourcePackageSha256:archiveHash,geometrySha256:a.geometrySha256,settings,pixelWidth:raw.pixelWidth,pixelHeight:raw.pixelHeight,pdfSha256:digest(pdf),contourSha256:digest(contour),productionReady:false,
  artwork:settings.mode==='vector'?'Vorhandene Schrift-/Motivpfade; keine automatische Vektorisierung.':'Graustufen aus den gesicherten Original-/bearbeiteten Bildern und schwarzen Schrift-/Motivpfaden. Weiß bedeutet keine Gravur.',
  contour:'Separate Datei in gleicher Orientierung; nicht Bestandteil der Gravur-PDF.',
  warnings:['Die helle Gravurfarbe der Produktvorschau ist kein Maschinenwert. Schrift und Bibliotheksmotive werden als schwarze Gravurpfade ausgegeben.','Material-, Maschinenparameter und Probegravur sind noch nicht freigegeben.'],
  photoSources:a.photos.map(p=>({fieldId:p.fieldId,path:p.sourcePath,width:p.width,height:p.height}))};
 if(requested.mode==='auto'){
  metadata.modeRule={requested:'auto',applied:settings.mode,rule:'Ohne Fertigungsprofil: Vektor, wenn die Gestaltung kein Foto enthält, sonst Raster.'};
  if(settings.mode==='raster'&&!a.photos.length)metadata.warnings.push('Die Gestaltung enthält ohne Kundenfoto Rasterbilder (z. B. eingefärbte Designquelle); deshalb Raster statt Vektor.');
 }
 // K14 / Ü15.1: gestaltete Rückseite → eigene Gravur-, Kontur- und SVG-Datei; die Dateien der
 // Vorderseite tragen dann „-vorderseite“. Ohne Rückseite bleiben alle Namen wie bisher.
 const sides=[{id:'front',pdf,contour,pdfContour,svg:a.svg,productionSvg:raw.svg,mirror:settings.mirror,mode:settings.mode,geometry:a.geometry}];
 if(a.surfaces.includes('back')){
  const b=await acrylicArtwork(archive,archiveHash,{engraving:true,surfaceId:'back',productDocument:context.productDocument}),backSettings={...requested,mirror:b.mirrorFor(settings.mirror)};
  const rb=await renderEngraving({svg:b.svg,geometry:b.geometry,settings:backSettings,photoFields:b.photoFields,photos:b.photos,contourStroke:stroke}),bp=Buffer.from(rb.pdf,'base64'),bc=Buffer.from(rb.contour,'base64'),bk=Buffer.from(rb.pdfContour,'base64');
  if([bp,bc,bk].some(bytes=>!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))))throw Error('Ungültige Gravur-PDF der Rückseite.');
  sides.push({id:'back',pdf:bp,contour:bc,pdfContour:bk,svg:b.svg,productionSvg:rb.svg,mirror:backSettings.mirror,mode:rb.mode,geometry:b.geometry,geometrySha256:b.geometrySha256});
  metadata.photoSources.push(...b.photos.map(p=>({fieldId:'back-'+p.fieldId,path:p.sourcePath,width:p.width,height:p.height})));
 }
 const two=sides.length>1,name=(n,id)=>two?surfaceFileName(n,id):n;
 if(two)metadata.surfaces=sides.map(s=>({id:s.id,pdf:name('technische-gravurpruefung.pdf',s.id),pdfSha256:digest(s.pdf),contour:name('gravur-kontur-1zu1.pdf',s.id),contourSha256:digest(s.contour),mirror:s.mirror,mode:s.mode,...(s.geometrySha256?{geometrySha256:s.geometrySha256}:{})}));
 if(a.doorbellLayers){metadata.layered={schema:a.doorbellLayers.schema,selection:a.doorbellLayers.selection,geometrySha256:a.doorbellLayers.geometrySha256,steelCutSha256:digest(cutPdfs.steel),acrylicCutSha256:digest(cutPdfs.acrylic),cutMirror:false,engravingMirror:settings.mirror};metadata.contour='Getrennte rote Vektorschnitte für Edelstahlträger und Acrylauflage in gemeinsamer Vorderseitenregistrierung. Der blaue äußere Referenzrand und das Gerätebild sind ausgeschlossen. Schnittdateien werden nicht mit der Gravur gespiegelt.';}
 metadata.productionSvg=sides.map(s=>({surfaceId:s.id,path:name('gravur-fertigung.svg',s.id),sha256:digest(Buffer.from(s.productionSvg)),mirror:s.mirror}));
 // #265, ENTSCHEIDUNGEN 3.61: die zwei Downloads je Fläche – immer mit Kontur. „PDF“ ist die Gravur-PDF plus Kontur als
 // Haarlinie auf eigener Ebene, „SVG“ die Fertigungs-SVG plus Kontur; beide in der Ausrichtung der Gravur (gespiegelt wie sie).
 // Gravur-PDF, getrennte Konturdatei und Fertigungs-SVG bleiben unverändert im Paket (Seite „Ausgaben“).
 for(const s of sides)s.order={pdf:[name('gravur-1zu1-mit-kontur.pdf',s.id),s.pdfContour],svg:[name('gravur-1zu1-mit-kontur.svg',s.id),Buffer.from(svgWithContour(s.productionSvg,s.geometry,{mirror:s.mirror,stroke}))]};
 metadata.orderFiles={schema:ORDER_FILES_SCHEMA,surfaces:sides.map(s=>orderFileSet(s.id,s.order))};
 const extra=[...sides.flatMap(s=>[[name('technische-gravurpruefung.pdf',s.id),s.pdf],[name('gravur-kontur-1zu1.pdf',s.id),s.contour],[name('gravur-fertigung.svg',s.id),Buffer.from(s.productionSvg)],s.order.pdf,s.order.svg]),['gravurpruefung.json',Buffer.from(JSON.stringify(metadata,null,2))],...sides.map(s=>[name('gesicherte-gravurgestaltung.svg',s.id),Buffer.from(s.svg)])];
 if(a.doorbellLayers)extra.push(['edelstahltraeger-schnitt-1zu1.pdf',cutPdfs.steel],['acrylauflage-schnitt-1zu1.pdf',cutPdfs.acrylic],['edelstahltraeger-schnitt.svg',Buffer.from(a.doorbellLayers.steel.svg)],['acrylauflage-schnitt.svg',Buffer.from(a.doorbellLayers.acrylic.svg)]);
 // Paket mit Verweis: Der geholte und geprüfte Produktstand kommt ins Fertigungspaket; es bleibt für sich vollständig.
 if(a.productDocument)extra.push([PRODUCT_DOCUMENT_FILE,Buffer.from(productDocumentJson(a.productDocument))]);
 const {archive:output}=await productionPackage({files:a.files,manifest:a.manifest,metadata,pdf,extras:extra,orderLines:context.orderLines});
 return {pdf,archive:output,metadata};
}
