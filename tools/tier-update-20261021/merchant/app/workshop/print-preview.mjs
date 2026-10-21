import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {importEnvironment} from './design-assets.mjs';
import {outputDownload} from './print-delivery.mjs';
import {digest} from './review-package.mjs';
const fail=message=>Object.assign(Error(message),{status:422,code:'print_preview'});
export async function printPreview(result,mode){
 if(!['color','white','engraving'].includes(mode))throw fail('Bitte eine vorhandene Farb- oder Weißebene eines Druckauftrags wählen.');
 const engraving=['raster','vector'].includes(result.metadata.settings.mode);
 if((mode==='engraving')!==engraving)throw fail('Gravurvorschau nur für Gravuraufträge; Farbe und Weiß nur für Druckaufträge.');
 if(mode==='white'&&result.metadata.settings.white==='none')throw fail('Diese Ausgabe wurde ohne Weißunterlegung erstellt.');
 const source=outputDownload(result,mode==='white'&&result.metadata.downloads?.white?'white-pdf':'pdf').bytes;
 const expected=mode==='white'&&result.metadata.downloads?.white?result.metadata.downloads.white.sha256:result.metadata.pdfSha256;
 if(expected&&digest(source)!==expected)throw fail('Die gespeicherte PDF stimmt nicht mit ihrer Prüfsumme überein.');
 if(source.length>64*1024*1024)throw fail('Diese PDF ist für die Bildschirmvorschau zu groß. Bitte die gesicherte PDF herunterladen.');
 const png=await new Promise((resolve,reject)=>{
  const child=spawn(process.env.GRAVURU_PYTHON||'python3',[fileURLToPath(new URL('./print-preview.py',import.meta.url)),mode],{env:importEnvironment(),stdio:['pipe','pipe','pipe']});let finished=false,size=0;const chunks=[];
  const end=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(fail(error)):resolve(value);};
  const timer=setTimeout(()=>{child.kill();end('Die PDF-Vorschau hat das Zeitlimit überschritten. Die gesicherte PDF bleibt erhalten.');},20000);
  child.on('error',()=>end('Die PDF-Vorschau ist derzeit nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
  child.stdout.on('data',data=>{size+=data.length;if(size>8*1024*1024){child.kill();end('Die PDF-Vorschau ist zu groß.');}else chunks.push(data);});
  child.on('close',code=>{if(code)return end('Die gespeicherte PDF besitzt keine eindeutig darstellbare Ausgabe. Bitte die PDF direkt prüfen.');const bytes=Buffer.concat(chunks);if(bytes.length<8||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return end('Die PDF-Vorschau konnte nicht gelesen werden.');end(null,bytes);});child.stdin.end(source);
 });
 return {png,sourceSha256:digest(source),mode};
}
