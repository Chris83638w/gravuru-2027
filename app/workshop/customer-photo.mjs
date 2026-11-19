import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {importEnvironment} from './design-assets.mjs';
export const MAX_CUSTOMER_PHOTO=15*1024*1024;

function validateBytes(bytes){
 if(typeof bytes!=='string'||bytes.length>Math.ceil(MAX_CUSTOMER_PHOTO/3)*4||!bytes.length||bytes.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(bytes)||Buffer.from(bytes,'base64').toString('base64')!==bytes)
  throw Object.assign(Error('Ungültiges Foto oder größer als 15 MB.'),{status:422});
}
function imported(bytes,result){
 if(![result?.width,result?.height].every(n=>Number.isInteger(n)&&n>0)||typeof result.preview!=='string')
  throw Object.assign(Error('Ungültige Fotovorschau.'),{status:422,code:'invalid_customer_photo'});
 return {...result,original:Buffer.from(bytes,'base64'),preview:Buffer.from(result.preview,'base64')};
}
function runImport(payload,pair=false){
 return new Promise((resolve,reject)=>{
  const args=[fileURLToPath(new URL('./photo-import.py',import.meta.url))];
  if(pair)args.push('--review-previews');
  const child=spawn(process.env.GRAVURU_PYTHON||'python3',args,{env:importEnvironment(),stdio:['pipe','pipe','pipe']});
  let done=false,size=0;const chunks=[];
  const end=(error,result,retrySeparately=false)=>{
   if(done)return;
   done=true;clearTimeout(timer);
   if(error)reject(Object.assign(Error(error),{status:422,code:'invalid_customer_photo',retrySeparately}));
   else resolve(result);
  };
  const timer=setTimeout(()=>{child.kill();end('Das Foto konnte nicht rechtzeitig geprüft werden.',null,true);},30000);
  child.on('error',()=>end('Die private Fotoprüfung ist nicht verfügbar.'));
  child.stdin.on('error',()=>{});
  child.stderr.on('data',()=>{});
  child.stdout.on('data',chunk=>{
   size+=chunk.length;
   if(size>(pair?32:16)*1024*1024){child.kill();end('Die Fotovorschau ist zu groß.',null,true);}
   else chunks.push(chunk);
  });
  child.on('close',(code,signal)=>{
   if(done)return;
   try{
    const result=JSON.parse(Buffer.concat(chunks).toString());
    if(code!==0||result.error)end(result.error||'Das Foto konnte nicht geprüft werden.',null,!!signal||result.retrySeparately===true);
    else end(null,result);
   }catch{end('Das Foto konnte nicht geprüft werden.',null,!!signal);}
  });
  child.stdin.end(JSON.stringify(payload));
 });
}
export function prepareCustomerPhoto(bytes,{monochrome=false,previewColor='original'}={}){
 if(!['original','grayscale','sepia'].includes(previewColor))throw Object.assign(Error('Ungültige Vorschaufarbe.'),{status:422});
 validateBytes(bytes);
 return runImport({bytes,monochrome,previewColor}).then(result=>imported(bytes,result));
}

// Only the two small rendered previews can share an interpreter. Uploaded originals keep their own worker.
export async function prepareReviewPreviewPair(customer,reference){
 if(customer.length<=512*1024 && reference.length<=256*1024){
  validateBytes(customer);validateBytes(reference);
  try{
   const result=await runImport({customer,reference},true);
   return {customer:imported(customer,result.customer),reference:imported(reference,result.reference)};
  }catch(error){
   if(!error.retrySeparately)throw error;
   // Each image retains the same memory and time allowance it has on the single-image path.
  }
 }
 return {customer:await prepareCustomerPhoto(customer),reference:await prepareCustomerPhoto(reference)};
}
