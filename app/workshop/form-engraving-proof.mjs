import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readReviewPackage,digest} from './review-package.mjs';
import {importEnvironment} from './design-assets.mjs';
import {productionPackage} from './production-summary.mjs';
import {ORDER_FILES_SCHEMA,orderFileSet,orderEngravingFiles} from './print-delivery.mjs';
import {contourPdfPath} from '../configurator/variant-m/contour-pdf-path.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'form_engraving'});};
// v3 (#265, ENTSCHEIDUNGEN 3.61/3.62): Auch Formprodukte alter Art führen die zwei Dateien der Bestellansicht – „PDF“ und „SVG“
// im Aufbau der Musterdatei von Chris (seitenrichtig, Ebene „03 Gravur“ in reinem Schwarz, Außenkontur blau, Löcher bei
// Acrylglas rot, sonst blau, Linie 0,001 mm; dieselben Namen und derselbe Bau wie beim nativen Produkt, acrylic-engraving-proof.mjs).
// Die bisherigen Dateien des Pakets bleiben wie sie sind; Ausgaben der Vorversion bleiben unter ihrem Schlüssel gültig.
export const FORM_ENGRAVING_RECIPE='gravuru-form-engraving-proof/v3';
export function formEngravingSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['mode','dpi','mirror'].includes(k)))fail('Ungültige Gravureinstellungen.');
 const s={mode:'raster',dpi:300,mirror:false,...input};if(!['raster','vector'].includes(s.mode)||![300,600].includes(s.dpi)||typeof s.mirror!=='boolean')fail('Ungültige Gravureinstellungen.');return s;
}
export const formEngravingKey=settings=>digest(JSON.stringify({recipe:FORM_ENGRAVING_RECIPE,settings:formEngravingSettings(settings)}));
// #265, ENTSCHEIDUNGEN 3.62: Die Konturlinien der Gravur-Bestelldatei stehen wie in der Musterdatei direkt als Pfadoperatoren im
// Seiteninhalt. Dafür bekommt der Worker je Ring der Kontur den PDF-Pfad in Millimetern – vom selben geprüften Umsetzer wie die
// Schnittkontur des Drucks (contour-pdf-path.mjs: alle Befehle des Konturformats, Kurven bleiben Kurven, Bögen werden Kurvenstücke).
function withOrderPaths(data){
 const order=data.orderFiles;if(!order||typeof order!=='object'||Array.isArray(order)||!Array.isArray(data.geometry?.contours))return data;
 return {...data,orderFiles:{...order,paths:data.geometry.contours.map(c=>contourPdfPath(/[Zz]\s*$/.test(c.d)?c.d:c.d+' Z'))}};
}
export function renderEngraving(input){return new Promise((resolve,reject)=>{
 let data;try{data=withOrderPaths(input);}catch{reject(Object.assign(Error('Die Kontur lässt sich nicht in die Bestelldatei übernehmen.'),{status:422}));return;}
 const child=spawn(process.env.GRAVURU_PYTHON||'python3',[fileURLToPath(new URL('./form-engraving-worker.py',import.meta.url))],{env:importEnvironment(),stdio:['pipe','pipe','pipe']});let done=false,size=0;const chunks=[];
 const end=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422})):resolve(result);};
 const timer=setTimeout(()=>{child.kill();end('Die Gravurprüfung hat das Zeitlimit überschritten. Bitte Format und Auflösung prüfen.');},120000);
 child.on('error',()=>end('Python ist für die Gravurprüfung nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});child.stdout.on('data',b=>{size+=b.length;if(size>128*1024*1024){child.kill();end('Die Gravurausgabe ist zu groß.');}else chunks.push(b);});child.on('close',code=>{if(done)return;try{const v=JSON.parse(Buffer.concat(chunks));end(code||v.error?v.error||'Gravurausgabe fehlgeschlagen.':null,v);}catch{end('Die Gravurausgabe konnte nicht gelesen werden.');}});child.stdin.end(JSON.stringify(data));
});}
export async function createFormEngravingProof(archive,archiveHash,input={},context={}){
 const {files,manifest}=readReviewPackage(archive,archiveHash);if(manifest.product.method!=='engraving')fail('Diese Ausgabe benötigt ein Gravurprodukt.');
 const settings=formEngravingSettings({...manifest.productionProfile?.document.output,...input}),saved=JSON.parse(files.get('produkt-und-gestaltung.json')),design=saved.product.designs.find(d=>d.id===saved.designId);
 // Die Gestaltung des Formprodukts liegt wie die Kontur in Millimetern (form-review-snapshot.mjs: viewBox 0 0 Breite Höhe);
 // der Worker prüft das, bevor er die Konturen in die Bestelldateien legt.
 const geometry=saved.product.form.geometry;
 const result=await renderEngraving({svg:files.get('gestaltung-vorschau.svg').toString(),geometry,settings,photoFields:design.fields.filter(f=>f.type==='photo').map(f=>f.id),photos:manifest.photos.map(p=>({...p,bytes:files.get(p.path).toString('base64')})),orderFiles:orderEngravingFiles({manifest})});
 const pdf=Buffer.from(result.pdf,'base64'),contour=Buffer.from(result.contour,'base64'),orderPdf=Buffer.from(result.orderPdf,'base64');if(typeof result.orderSvg!=='string'||[pdf,contour,orderPdf].some(bytes=>!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))))fail('Ungültige Gravur-PDF.');
 const metadata={schema:FORM_ENGRAVING_RECIPE,snapshotId:manifest.id,sourcePackageSha256:archiveHash,productionProfile:manifest.productionProfile||null,settings,pixelWidth:result.pixelWidth,pixelHeight:result.pixelHeight,pdfSha256:digest(pdf),contourSha256:digest(contour),productionReady:false,warnings:[...manifest.warnings,'Graustufen sind keine festgelegten Leistungswerte. Material-, Maschinenparameter und Probegravur müssen separat freigegeben werden.'],artwork:settings.mode==='vector'?'Vorhandene Vektorformen und Schriftpfade; keine gerasterten Bilder.':'Graustufenraster aus Originalfotos und gespeicherter Gestaltung; Weiß bedeutet keine Gravur.',contour:'Separate Datei, gleiche Orientierung; nicht Bestandteil der Gravur-PDF.'};
 // „PDF“ und „SVG“ der Bestellansicht im Aufbau der Musterdatei (3.62), nie gespiegelt.
 const order={pdf:['gravur-1zu1-mit-kontur.pdf',orderPdf],svg:['gravur-1zu1-mit-kontur.svg',Buffer.from(result.orderSvg)]};
 metadata.orderFiles={schema:ORDER_FILES_SCHEMA,surfaces:[orderFileSet('front',order)]};
 const extras=[['technische-gravurpruefung.pdf',pdf],['gravur-kontur-1zu1.pdf',contour],['gravurpruefung.json',Buffer.from(JSON.stringify(metadata,null,2))],order.pdf,order.svg];
 const {archive:output}=await productionPackage({files,manifest,metadata,pdf,extras,orderLines:context.orderLines});return {pdf,archive:output,metadata};
}
