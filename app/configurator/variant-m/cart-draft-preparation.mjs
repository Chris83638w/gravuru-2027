// Exact canonical equality avoids hash collisions. This key stays in memory;
// it is never sent, persisted, or logged and contains no rendered image bytes.
export function canonicalCartDraft(value){
 if(Array.isArray(value))return '['+value.map(v=>canonicalCartDraft(v??null)).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonicalCartDraft(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export const changedCartDraft=()=>Error('Die Gestaltung wurde während der Sicherung geändert. Bitte erneut in den Warenkorb legen.');

// One remembered preparation and one serial save queue per editor. A changed
// design may supersede a running save, but cannot race its private revision.
export function createCartDraftPreparation({key,prepare}){
 let current=null,completed=null,tail=Promise.resolve(),closed=false,generation=0;
 function get(){
  if(closed)return Promise.reject(changedCartDraft());
  const wanted=key();
  if(current?.key===wanted)return current.promise;
  const job={key:wanted,generation};current=job;
  job.promise=tail.catch(()=>{}).then(async()=>{
   if(closed||job.generation!==generation||key()!==wanted)throw changedCartDraft();
   if(completed?.key===wanted)return completed.saved;
   const saved=await prepare(wanted);
   completed=closed||job.generation!==generation?null:{key:wanted,saved};
   if(closed||job.generation!==generation||key()!==wanted)throw changedCartDraft();
   return saved;
  });
  tail=job.promise;
  job.promise.catch(()=>{if(current===job)current=null;});
  return job.promise;
 }
 function invalidate(){generation++;current=null;completed=null;}
 return {get,prefetch(){try{get().catch(()=>{});}catch{}},invalidate,close(){closed=true;invalidate();}};
}
