import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readReviewPackage,digest} from './review-package.mjs';
import {importEnvironment} from './design-assets.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'form_engraving'});};
export const FORM_ENGRAVING_RECIPE='gravuru-form-engraving-proof/v1';
export function formEngravingSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['mode','dpi','mirror'].includes(k)))fail('Ungültige Gravureinstellungen.');
 const s={mode:'raster',dpi:300,mirror:false,...input};if(!['raster','vector'].includes(s.mode)||![300,600].includes(s.dpi)||typeof s.mirror!=='boolean')fail('Ungültige Gravureinstellungen.');return s;
}
export const formEngravingKey=settings=>digest(JSON.stringify({recipe:FORM_ENGRAVING_RECIPE,settings:formEngravingSettings(settings)}));
function render(data){return new Promise((resolve,reject)=>{
 const child=spawn(process.env.GRAVURU_PYTHON||'python3',[fileURLToPath(new URL('./form-engraving-worker.py',import.meta.url))],{env:importEnvironment(),stdio:['pipe','pipe','pipe']});let done=false,size=0;const chunks=[];
 const end=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422})):resolve(result);};
 const timer=setTimeout(()=>{child.kill();end('Die Gravurprüfung hat das Zeitlimit überschritten. Bitte Format und Auflösung prüfen.');},120000);
 child.on('error',()=>end('Python ist für die Gravurprüfung nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});child.stdout.on('data',b=>{size+=b.length;if(size>128*1024*1024){child.kill();end('Die Gravurausgabe ist zu groß.');}else chunks.push(b);});child.on('close',code=>{if(done)return;try{const v=JSON.parse(Buffer.concat(chunks));end(code||v.error?v.error||'Gravurausgabe fehlgeschlagen.':null,v);}catch{end('Die Gravurausgabe konnte nicht gelesen werden.');}});child.stdin.end(JSON.stringify(data));
});}
export async function createFormEngravingProof(archive,archiveHash,input={}){
 const {files,manifest}=readReviewPackage(archive,archiveHash);if(manifest.product.method!=='engraving')fail('Diese Ausgabe benötigt ein Gravurprodukt.');
 const settings=formEngravingSettings({...manifest.productionProfile?.document.output,...input}),saved=JSON.parse(files.get('produkt-und-gestaltung.json')),design=saved.product.designs.find(d=>d.id===saved.designId);
 const result=await render({svg:files.get('gestaltung-vorschau.svg').toString(),geometry:saved.product.form.geometry,settings,photoFields:design.fields.filter(f=>f.type==='photo').map(f=>f.id),photos:manifest.photos.map(p=>({...p,bytes:files.get(p.path).toString('base64')}))});
 const pdf=Buffer.from(result.pdf,'base64'),contour=Buffer.from(result.contour,'base64');if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-'))||!contour.subarray(0,5).equals(Buffer.from('%PDF-')))fail('Ungültige Gravur-PDF.');
 const metadata={schema:FORM_ENGRAVING_RECIPE,snapshotId:manifest.id,sourcePackageSha256:archiveHash,productionProfile:manifest.productionProfile||null,settings,pixelWidth:result.pixelWidth,pixelHeight:result.pixelHeight,pdfSha256:digest(pdf),contourSha256:digest(contour),productionReady:false,warnings:[...manifest.warnings,'Graustufen sind keine festgelegten Leistungswerte. Material-, Maschinenparameter und Probegravur müssen separat freigegeben werden.'],artwork:settings.mode==='vector'?'Vorhandene Vektorformen und Schriftpfade; keine gerasterten Bilder.':'Graustufenraster aus Originalfotos und gespeicherter Gestaltung; Weiß bedeutet keine Gravur.',contour:'Separate Datei, gleiche Orientierung; nicht Bestandteil der Gravur-PDF.'};
 const extras=[['technische-gravurpruefung.pdf',pdf],['gravur-kontur-1zu1.pdf',contour],['gravurpruefung.json',Buffer.from(JSON.stringify(metadata,null,2))]];
 const output=Buffer.from(await (await zipFiles([...files,...extras].map(([name,bytes])=>({name,blob:new Blob([bytes])})))).arrayBuffer());return {pdf,archive:output,metadata};
}
