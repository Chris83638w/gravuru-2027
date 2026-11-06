import {SESSION_GUARD_TTL_MS} from './session-guard.mjs';

// Photos stay on this device. Binary data belongs in IndexedDB, never localStorage,
// URLs, analytics or the product contract. The same revision boundary as drafts applies.
export function createSessionUploads({key,files,indexedDB=globalThis.indexedDB,clock=Date.now,urls=URL}){
 let database=null;const written=new Set(),pending=new Map();
 const open=()=>database??=new Promise((resolve,reject)=>{
  if(!indexedDB)return reject(Error('Bildspeicher nicht verfügbar.'));
  const request=indexedDB.open('gravuru-session-uploads',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('uploads',{keyPath:'key'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 const blobFor=url=>{for(const asset of files.values())if(asset.url===url)return asset.blob||asset.file;return null;};
 async function persist(id){
  if(written.has(id))return true;if(pending.has(id))return pending.get(id);
  const asset=files.get(id);if(!asset)return false;
  const task=(async()=>{
   const db=await open(),record={key:key+':'+id,savedAt:clock(),file:asset.file,blob:asset.blob||asset.file,
    originalBlob:blobFor(asset.originalUrl)||asset.file,editSourceBlob:blobFor(asset.editSourceUrl)||asset.file,
    width:asset.width,height:asset.height,edited:!!asset.edited,photoEdit:asset.photoEdit,editSourceColor:asset.editSourceColor,vectorLogo:asset.vectorLogo};
   if(!(record.blob instanceof Blob))throw Error('Bilddatei fehlt.');
   await new Promise((resolve,reject)=>{const tx=db.transaction('uploads','readwrite');tx.objectStore('uploads').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Bildspeicherung abgebrochen.'));});
   written.add(id);return true;
  })();pending.set(id,task);try{return await task;}finally{pending.delete(id);}
 }
 async function restore(references){
  const missing=[];let db;try{db=await open();}catch{return references.map(r=>r.uploadId);}
  for(const {uploadId:id} of references){
   if(files.has(id))continue;
   const record=await new Promise(resolve=>{const request=db.transaction('uploads').objectStore('uploads').get(key+':'+id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);});
   if(!record||clock()-record.savedAt>SESSION_GUARD_TTL_MS||!(record.blob instanceof Blob)){missing.push(id);continue;}
   const {file,blob,width,height,edited,photoEdit,editSourceColor,vectorLogo}=record;
   files.set(id,{file,blob,width,height,edited,photoEdit,editSourceColor,vectorLogo,url:urls.createObjectURL(blob),originalUrl:urls.createObjectURL(record.originalBlob||file),editSourceUrl:urls.createObjectURL(record.editSourceBlob||file)});written.add(id);
  }
  return missing;
 }
 async function prune(){try{const db=await open(),tx=db.transaction('uploads','readwrite'),store=tx.objectStore('uploads'),cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(clock()-c.value.savedAt>SESSION_GUARD_TTL_MS)c.delete();c.continue();}};}catch{}}
 return {persist,restore,prune};
}
