import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readReviewPackage,digest} from './review-package.mjs';
import {importEnvironment} from './design-assets.mjs';
import {printPDF,exportSettings,zipFiles} from '../configurator/variant-m/print-export-model.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'form_print_proof'});};
export const FORM_PRINT_RECIPE='gravuru-form-print-proof/v3';
export function formPrintSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['profile','dpi','white','bleedMm','whiteBleedMm','mirror'].includes(k)))fail('Ungültige Druckeinstellungen.');
 const s=exportSettings({width:1,height:1},input);
 return Object.fromEntries(['profile','dpi','white','bleedMm','whiteBleedMm','mirror'].map(k=>[k,s[k]]));
}
export const formPrintKey=settings=>digest(JSON.stringify({recipe:FORM_PRINT_RECIPE,settings:formPrintSettings(settings)}));
function rasterize(data){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.env.GRAVURU_PYTHON||'python3',[fileURLToPath(new URL('./form-print-worker.py',import.meta.url))],{env:importEnvironment(),stdio:['pipe','pipe','pipe']});let done=false,size=0;const chunks=[];
  const end=(e,value)=>{if(done)return;done=true;clearTimeout(timer);e?reject(Object.assign(Error(e),{status:422,code:'form_print_failed'})):resolve(value);};
  const timer=setTimeout(()=>{child.kill();end('Die Druckprüfung hat das Zeitlimit überschritten. Bitte 300 dpi oder ein kleineres Format verwenden.');},120000);
  child.on('error',()=>end('Die Python-Druckprüfung ist nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
  child.stdout.on('data',b=>{size+=b.length;if(size>230*1024*1024){child.kill();end('Die Druckdaten sind zu groß.');}else chunks.push(b);});
  child.on('close',code=>{if(done)return;try{const v=JSON.parse(Buffer.concat(chunks));if(code||v.error)end(v.error||'Druckprüfung fehlgeschlagen.');else end(null,v);}catch{end('Die Druckdaten konnten nicht gelesen werden.');}});child.stdin.end(JSON.stringify(data));
 });
}
export async function createFormPrintProof(archive,archiveHash,input={}){
 const {files,manifest}=readReviewPackage(archive,archiveHash),requested=formPrintSettings({...manifest.productionProfile?.document.output,...input});
 if(manifest.product.method!=='print')fail('Diese Ausgabe ist nur für Druckprodukte bestimmt. Gravur benötigt eine eigene Ausgabe ohne Druckweiß.');
 const saved=JSON.parse(files.get('produkt-und-gestaltung.json')),g=saved.product.form.geometry,design=saved.product.designs.find(d=>d.id===saved.designId);
 const raw=await rasterize({svg:files.get('gestaltung-vorschau.svg').toString(),geometry:g,settings:requested,textFields:[...design.fields.filter(f=>f.type==='text').map(f=>f.id),...(saved.customer.additions||[]).filter(f=>f.type==='text'&&!f.deleted).map(f=>f.id)],photoFields:design.fields.filter(f=>f.type==='photo').map(f=>f.id),photos:manifest.photos.map(p=>({...p,bytes:files.get(p.path).toString('base64')}))});
 if(!Number.isInteger(raw.width)||!Number.isInteger(raw.height)||raw.width<1||raw.height<1||raw.width*raw.height>32000000)fail('Ungültige Rastermaße.');
 const pixels={width:raw.width,height:raw.height,...Object.fromEntries(['rgb','alpha','whiteAllowed','whiteAlpha'].map(k=>[k,new Uint8Array(Buffer.from(raw[k],'base64'))]))};
 if(pixels.rgb.length!==raw.width*raw.height*3||pixels.alpha.length!==raw.width*raw.height||pixels.whiteAllowed.length!==raw.width*raw.height||pixels.whiteAlpha.length!==raw.width*raw.height)fail('Unvollständige Rasterdaten.');
 const settings=exportSettings({width:g.widthMm,height:g.heightMm},{...requested,bleedMm:raw.bleedMm,whiteBleedMm:raw.whiteBleedMm});
 const artwork=raw.artworkLayers.map(l=>l.type==='text'?l:{...l,rgb:new Uint8Array(Buffer.from(l.rgb,'base64')),alpha:new Uint8Array(Buffer.from(l.alpha,'base64'))});
 const pdf=Buffer.from(await (await printPDF({settings,pixels,paths:raw.paths,artwork})).arrayBuffer());
 const warnings=[...manifest.warnings];
 if(requested.bleedMm&&!raw.bleedMm)warnings.push('Kein Druck am Außenrand: Der angeforderte Überdruck wurde nicht hinzugefügt.');
 const metadata={schema:FORM_PRINT_RECIPE,productionProfile:manifest.productionProfile||null,profileSettingsOverridden:manifest.productionProfile?JSON.stringify(requested)!==JSON.stringify(formPrintSettings(manifest.productionProfile.document.output)):false,snapshotId:manifest.id,sourcePackageSha256:archiveHash,requested,settings,geometrySha256:saved.product.form.geometrySha256,vectorGlyphs:raw.textVectors.length,pixelWidth:raw.width,pixelHeight:raw.height,edgeInk:raw.edgeInk,pdfSha256:digest(pdf),warnings,productionReady:false,colorConversion:'Generische DeviceCMYK-Separation, kein gemessenes ICC-Profil.',colorArtwork:'Explizite Textfelder als CMYK-Vektorpfade in ursprünglicher Reihenfolge; zugehöriges Weiß ebenfalls als Schriftpfade. Importierte Designquelle und Fotos gerastert; Schnittkontur als Vektor.'};
 const extras=[{name:'technische-druckpruefung.pdf',blob:new Blob([pdf])},{name:'druckpruefung.json',blob:new Blob([JSON.stringify(metadata,null,2)])}];
 const archiveWithPrint=Buffer.from(await (await zipFiles([...files].map(([name,bytes])=>({name,blob:new Blob([bytes])})).concat(extras))).arrayBuffer());
 return {pdf,archive:archiveWithPrint,metadata};
}
