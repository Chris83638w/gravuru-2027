import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {importEnvironment} from './design-assets.mjs';
export const MAX_CUSTOMER_PHOTO=15*1024*1024;
export function prepareCustomerPhoto(bytes){
 if(typeof bytes!=='string'||bytes.length>Math.ceil(MAX_CUSTOMER_PHOTO/3)*4||!bytes.length||bytes.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(bytes)||Buffer.from(bytes,'base64').toString('base64')!==bytes)throw Object.assign(Error('Ungültiges Foto oder größer als 15 MB.'),{status:422});
 return new Promise((resolve,reject)=>{
  const child=spawn(process.env.GRAVURU_PYTHON||'python3',[fileURLToPath(new URL('./photo-import.py',import.meta.url))],{env:importEnvironment(),stdio:['pipe','pipe','pipe']});let done=false,size=0;const chunks=[];
  const end=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422,code:'invalid_customer_photo'})):resolve(result);};
  const timer=setTimeout(()=>{child.kill();end('Das Foto konnte nicht rechtzeitig geprüft werden.');},30000);
  child.on('error',()=>end('Die private Fotoprüfung ist nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>16*1024*1024){child.kill();end('Die Fotovorschau ist zu groß.');}else chunks.push(chunk);});
  child.on('close',code=>{if(done)return;try{const result=JSON.parse(Buffer.concat(chunks).toString());if(code!==0||result.error)end(result.error||'Das Foto konnte nicht geprüft werden.');else if(![result.width,result.height].every(n=>Number.isInteger(n)&&n>0)||typeof result.preview!=='string')end('Ungültige Fotovorschau.');else end(null,{...result,original:Buffer.from(bytes,'base64'),preview:Buffer.from(result.preview,'base64')});}catch{end('Das Foto konnte nicht geprüft werden.');}});
  child.stdin.end(JSON.stringify({bytes}));
 });
}
