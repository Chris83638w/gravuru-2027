import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {aiFail,aiDigest,aiRequest} from './ai-design-plan.mjs';
import {tenantOption,ensureTenantColumns,TENANT_COLUMN} from './tenant.mjs';

const invalid=message=>{throw aiFail(422,'ai_batch_invalid',message);};
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const compatibility=record=>{
 const p=record.document.config?.profile;
 if(!p?.designs?.length||record.status==='archived')invalid('Bitte aktive Produkte mit nativen, einzeln bearbeitbaren Designs auswählen.');
 return aiDigest(stable({material:p.material,geometry:p.geometry,processing:p.processing}));
};
const selection=input=>{
 if(!Array.isArray(input)||!input.length||input.length>100)invalid('Bitte 1 bis 100 Produkte auswählen.');
 const ids=new Set();
 for(const p of input){if(!p||!/^cfg_[a-f0-9-]{36}$/.test(p.productId)||!Number.isSafeInteger(p.expectedRevision)||p.expectedRevision<1||ids.has(p.productId))invalid('Jedes Produkt benötigt eine eindeutige ID und seinen gespeicherten Stand.');ids.add(p.productId);}
 return input;
};

// Own only the queue. Child jobs, cost accounting, proposals and apply journal
// remain in the existing single-job engine. No second provider or apply path.
export function createAiBatchJobs({filename,repository,aiJobs,clock=()=>new Date(),intervalMs=250,tenantId}){
 const tenant=tenantOption({tenantId:tenantId??repository?.tenantId});
 const db=new DatabaseSync(filename);let closed=false;
 db.exec(`PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS ai_design_batches(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,request TEXT NOT NULL,status TEXT NOT NULL,message TEXT NOT NULL,created_at TEXT NOT NULL,${TENANT_COLUMN});
 CREATE TABLE IF NOT EXISTS ai_design_batch_items(batch_id TEXT NOT NULL,position INTEGER NOT NULL,product_id TEXT NOT NULL,name TEXT NOT NULL,job_id TEXT NOT NULL UNIQUE,request TEXT NOT NULL,status TEXT NOT NULL,message TEXT NOT NULL,${TENANT_COLUMN},PRIMARY KEY(batch_id,position));`);
 ensureTenantColumns(db,['ai_design_batches','ai_design_batch_items']);
 db.prepare("UPDATE ai_design_batches SET status='paused',message=? WHERE status='running' AND tenant_id=?").run('Nach Neustart angehalten. Vorhandene Antworten bleiben erhalten; nur noch nicht gestartete Produkte können fortgesetzt werden.',tenant);
 const row=id=>{const r=db.prepare('SELECT * FROM ai_design_batches WHERE id=? AND tenant_id=?').get(id,tenant);if(!r)throw aiFail(404,'ai_batch_missing','KI-Stapel nicht gefunden.');return r;};
 const items=id=>db.prepare('SELECT * FROM ai_design_batch_items WHERE batch_id=? AND tenant_id=? ORDER BY position').all(id,tenant);
 const child=id=>{try{return aiJobs.get(id);}catch(e){if(e.code==='ai_job_missing')return null;throw e;}};
 // Reconcile completed/interrupted child requests before an explicit resume.
 for(const i of db.prepare("SELECT job_id FROM ai_design_batch_items WHERE status IN ('queued','started') AND tenant_id=?").all(tenant)){const job=child(i.job_id);if(job&&job.status!=='running')db.prepare("UPDATE ai_design_batch_items SET status='done' WHERE job_id=? AND tenant_id=?").run(i.job_id,tenant);}
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const update=(id,status,message='')=>db.prepare('UPDATE ai_design_batches SET status=?,message=? WHERE id=? AND tenant_id=?').run(status,message,id,tenant);
 function prepare(input){
  selection(input);let group=null;
  const products=input.map(p=>{
   if(Object.keys(p).some(k=>!['productId','expectedRevision'].includes(k)))invalid('Ungültige Produktauswahl.');
   const r=repository.get(p.productId);if(r.revision!==p.expectedRevision)throw aiFail(409,'ai_stale','Ein ausgewähltes Produkt wurde inzwischen geändert. Bitte die Übersicht aktualisieren.');
   const key=compatibility(r);if(group&&group!==key)invalid('Material, Stärke, Form, Maße und Fertigungsverfahren müssen im Stapel übereinstimmen. Bitte passende Produkte auswählen.');group=key;
   const c=r.document.config;
   return {...p,name:r.document.name,defaultDesignId:c.profile.defaultDesignId,designs:c.profile.designs.map(d=>({id:d.id,name:d.name,photos:d.objects.filter(o=>o.type==='photoSlot'&&!o.technicalLocked&&c.localResources.photoExamples?.some(e=>e.designId===d.id&&e.slotId===o.id)).map((o,i)=>({id:o.id,label:o.label||'Musterfoto '+(i+1)}))}))};
  });
  return {products,budget:aiJobs.status()};
 }
 function get(id){
  const r=row(id),entries=items(id).map(i=>({productId:i.product_id,name:i.name,jobId:i.job_id,status:i.status,message:i.message,job:child(i.job_id)}));
  return {id:r.id,status:r.status,message:r.message,createdAt:r.created_at,instruction:JSON.parse(r.request).instruction,kind:JSON.parse(r.request).kind,items:entries,budget:aiJobs.status()};
 }
 function active(except=''){if(db.prepare("SELECT 1 FROM ai_design_batches WHERE status='running' AND id<>? AND tenant_id=?").get(except,tenant))throw aiFail(409,'ai_batch_busy','Ein KI-Stapel läuft bereits. Bitte diesen zuerst beenden oder abbrechen.');}
 function start(input){
  if(!input||Object.keys(input).sort().join(',')!=='batchId,instruction,kind,preservePhotos,preserveText,products'||!/^aib_[a-f0-9-]{36}$/.test(input.batchId)||!['layout','image_generate','photo_edit'].includes(input.kind))invalid('Ungültiger KI-Stapelauftrag.');
  selection(input.products);
  // Canonical child requests validate all options before persisting anything.
  const requests=input.products.map(p=>{
   if(Object.keys(p).some(k=>!['productId','expectedRevision','designId','targetObjectId'].includes(k)))invalid('Ungültige Designzuordnung.');
   return aiRequest({requestId:'air_'+randomUUID(),expectedRevision:p.expectedRevision,designId:p.designId,instruction:input.instruction,preserveText:input.preserveText,preservePhotos:input.preservePhotos,kind:input.kind,...(p.targetObjectId!==undefined?{targetObjectId:p.targetObjectId}:{})});
  });
  const fingerprint=aiDigest(input),prior=db.prepare('SELECT * FROM ai_design_batches WHERE id=? AND tenant_id=?').get(input.batchId,tenant);
  if(prior){if(prior.fingerprint!==fingerprint)throw aiFail(409,'ai_batch_reused','Die Stapelkennung gehört bereits zu einem anderen Auftrag.');return {...get(input.batchId),duplicate:true};}
  active();const prepared=prepare(input.products.map(({productId,expectedRevision})=>({productId,expectedRevision})));
  for(let i=0;i<requests.length;i++)aiJobs.preflight(input.products[i].productId,requests[i]);
  if(prepared.budget.availableCents<prepared.budget.reservationCents)throw aiFail(409,'ai_budget_exhausted','Das Monatsbudget reicht nicht für den ersten Auftrag.');
  transaction(()=>{
   db.prepare('INSERT INTO ai_design_batches(id,fingerprint,request,status,message,created_at,tenant_id) VALUES(?,?,?,?,?,?,?)').run(input.batchId,fingerprint,JSON.stringify(input),'running','',clock().toISOString(),tenant);
   const insert=db.prepare('INSERT INTO ai_design_batch_items(batch_id,position,product_id,name,job_id,request,status,message,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)');
   requests.forEach((request,i)=>insert.run(input.batchId,i,input.products[i].productId,prepared.products[i].name,request.requestId,JSON.stringify(request),'queued','',tenant));
  });
  return get(input.batchId);
 }
 function pump(){
  if(closed)return;
  const batch=db.prepare("SELECT * FROM ai_design_batches WHERE status='running' AND tenant_id=? ORDER BY rowid LIMIT 1").get(tenant);if(!batch)return;
  // Persisted child IDs bridge both crash windows around aiJobs.start.
  for(const item of items(batch.id)){
   if(!['queued','started'].includes(item.status))continue;
   const job=child(item.job_id);
   if(job){
    if(job.status==='running')return;
    db.prepare("UPDATE ai_design_batch_items SET status='done' WHERE job_id=? AND tenant_id=?").run(item.job_id,tenant);
    if(['uncertain','cost_review'].includes(job.status)){update(batch.id,'paused','Eine Antwort oder ihre Kosten sind unbestätigt. Bereits gestartete Aufträge werden nicht wiederholt. Verbleibende Produkte können nach Prüfung fortgesetzt werden.');return;}
    continue;
   }
   try{
    aiJobs.start(item.product_id,JSON.parse(item.request));
    db.prepare("UPDATE ai_design_batch_items SET status='started' WHERE job_id=? AND tenant_id=?").run(item.job_id,tenant);
   }catch(e){
    if(['ai_budget_exhausted','ai_disabled','ai_images_disabled'].includes(e.code)){update(batch.id,'paused',e.message+' Noch nicht gestartete Produkte bleiben in der Warteschlange.');return;}
    db.prepare("UPDATE ai_design_batch_items SET status='error',message=? WHERE job_id=? AND tenant_id=?").run(['ai_stale','ai_archived','ai_design_unsupported','ai_photo_missing','ai_photo_locked','ai_element_limit'].includes(e.code)?e.message:'Dieses Produkt konnte nicht gestartet werden. Bitte seinen aktuellen Stand prüfen.',item.job_id,tenant);
   }
   return;
  }
  update(batch.id,'completed','Alle Produkte bearbeitet. Gültige Vorschläge einzeln prüfen und übernehmen.');
 }
 const timer=setInterval(()=>{try{pump();}catch{db.prepare("UPDATE ai_design_batches SET status='paused',message=? WHERE status='running' AND tenant_id=?").run('Die Stapelverarbeitung wurde angehalten. Bereits gestartete Aufträge vor dem Fortsetzen prüfen.',tenant);}},intervalMs);timer.unref();
 return {
  prepare,start,get,
  list(){return db.prepare('SELECT id FROM ai_design_batches WHERE tenant_id=? ORDER BY rowid DESC LIMIT 30').all(tenant).map(({id})=>{const b=get(id);return {id,status:b.status,instruction:b.instruction,count:b.items.length,createdAt:b.createdAt};});},
  resume(id){const r=row(id);if(r.status!=='paused')throw aiFail(409,'ai_batch_state','Nur ein angehaltener Stapel kann fortgesetzt werden.');active(id);const budget=aiJobs.status();if(!budget.enabled)throw aiFail(503,'ai_disabled',budget.reason);if(budget.availableCents<budget.reservationCents)throw aiFail(409,'ai_budget_exhausted','Das Monatsbudget reicht noch nicht zum Fortsetzen.');update(id,'running');return get(id);},
  cancel(id){const r=row(id);if(['running','paused'].includes(r.status)){update(id,'cancelled','Stapel abgebrochen. Fertige Vorschläge bleiben zur Prüfung erhalten. Bereits versendete Aufträge können Kosten verursachen.');for(const item of items(id)){const job=child(item.job_id);if(job?.status==='running')aiJobs.cancel(job.id);db.prepare("UPDATE ai_design_batch_items SET status=? WHERE job_id=? AND status IN ('queued','started') AND tenant_id=?").run(job?'done':'cancelled',item.job_id,tenant);}}return get(id);},
  close(){clearInterval(timer);closed=true;db.close();}
 };
}
