import {createOutputChecks} from './output-checks.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {tenantOption,ensureTenantColumn,ensureTenantColumns,TENANT_COLUMN} from './tenant.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'export_job'});};
export function createExportJobStore({filename,database,clock=Date.now,tenantId}){
 const tenant=tenantOption({tenantId});
 const db=database||new DatabaseSync(filename);db.exec(`PRAGMA busy_timeout=5000;PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS form_export_jobs(id TEXT PRIMARY KEY,snapshot_id TEXT NOT NULL,recipe_key TEXT NOT NULL,recipe TEXT NOT NULL,settings TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('queued','running','completed','failed')),attempts INTEGER NOT NULL DEFAULT 0,lease_token TEXT,lease_until INTEGER,error TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,${TENANT_COLUMN},UNIQUE(snapshot_id,recipe_key));
 CREATE TABLE IF NOT EXISTS form_export_events(id INTEGER PRIMARY KEY,job_id TEXT NOT NULL REFERENCES form_export_jobs(id),status TEXT NOT NULL,at INTEGER NOT NULL,message TEXT NOT NULL,${TENANT_COLUMN});
 CREATE TRIGGER IF NOT EXISTS form_export_request_immutable BEFORE UPDATE OF snapshot_id,recipe_key,recipe,settings ON form_export_jobs BEGIN SELECT RAISE(ABORT,'Export requests are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_export_event_immutable BEFORE UPDATE ON form_export_events BEGIN SELECT RAISE(ABORT,'Export events are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_export_event_no_delete BEFORE DELETE ON form_export_events BEGIN SELECT RAISE(ABORT,'Export events are immutable');END;`);
 ensureTenantColumns(db,['form_export_jobs','form_export_events']);
 // Prüfstand und gesicherte Ausgaben gehören form-customer-store.mjs; ein eigenständiger Auftragsspeicher ergänzt deren Mandantenspalte nur, wenn sie fehlt.
 for(const table of ['form_review_snapshots','form_print_proofs'])if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))ensureTenantColumn(db,table,{index:false});
 const checks=createOutputChecks(db,tenant);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 const row=id=>{const r=db.prepare('SELECT * FROM form_export_jobs WHERE id=? AND tenant_id=?').get(id,tenant);if(!r)fail(404,'Ausgabeauftrag nicht gefunden.');return r;};
 const publicRow=r=>({id:r.id,snapshotId:r.snapshot_id,recipeKey:r.recipe_key,recipe:r.recipe,settings:JSON.parse(r.settings),status:r.status,attempts:r.attempts,error:r.error,createdAt:r.created_at,updatedAt:r.updated_at});
 const event=(id,status,message)=>db.prepare('INSERT INTO form_export_events(job_id,status,at,message,tenant_id) VALUES(?,?,?,?,?)').run(id,status,clock(),message,tenant);
 const get=id=>publicRow(row(id));
 const snapshotJobs=db.prepare('SELECT * FROM form_export_jobs WHERE snapshot_id=? AND tenant_id=? ORDER BY created_at DESC,rowid DESC LIMIT 200');
 const snapshotCount=db.prepare('SELECT count(*) AS total FROM form_export_jobs WHERE snapshot_id=? AND tenant_id=?');
 const owned=(r,token)=>r.status==='running'&&r.lease_token===token;
 // #265 Stufe C, ENTSCHEIDUNGEN 3.57 (2): Beobachter für fehlgeschlagene Aufträge (shopify-order-review-tag.mjs setzt damit
 // „Bitte prüfen“ auch an die Shopify-Bestellung). Ohne Beobachter ändert sich nichts. Aufruf erst nach dem Commit; ein Fehler
 // oder ein abgelehntes Promise eines Beobachters ändert weder den Auftrag noch den Arbeiter.
 const failedListeners=new Set();
 const notifyFailed=job=>{for(const listener of failedListeners){try{const pending=listener({...job});if(typeof pending?.then==='function')pending.then(null,()=>{});}catch{/* Auftrag und Arbeiter bleiben unverändert. */}}};
 return {get,checks,tenantId:tenant,forSnapshot(snapshotId){return {jobs:snapshotJobs.all(snapshotId,tenant).map(publicRow),total:snapshotCount.get(snapshotId,tenant).total};},list:()=>db.prepare('SELECT * FROM form_export_jobs WHERE tenant_id=? ORDER BY created_at DESC,rowid DESC LIMIT 200').all(tenant).map(publicRow),events:id=>{row(id);return db.prepare('SELECT status,at,message FROM form_export_events WHERE job_id=? AND tenant_id=? ORDER BY id').all(id,tenant);},
  enqueue({snapshotId,recipeKey,recipe,settings}){return tx(()=>{
   if(!db.prepare('SELECT 1 FROM form_review_snapshots WHERE id=? AND tenant_id=?').get(snapshotId,tenant))fail(404,'Prüfstand nicht gefunden.');
   const old=db.prepare('SELECT * FROM form_export_jobs WHERE snapshot_id=? AND recipe_key=? AND tenant_id=?').get(snapshotId,recipeKey,tenant);if(old)return publicRow(old);
   if(db.prepare("SELECT count(*) AS n FROM form_export_jobs WHERE status IN ('queued','running') AND tenant_id=?").get(tenant).n>=500)fail(409,'Bitte vorhandene Ausgabeaufträge zuerst abschließen.');
   const cached=Boolean(db.prepare('SELECT 1 FROM form_print_proofs WHERE snapshot_id=? AND recipe_key=? AND tenant_id=?').get(snapshotId,recipeKey,tenant)),id='job_'+randomUUID(),now=clock(),status=cached?'completed':'queued';db.prepare('INSERT INTO form_export_jobs(id,snapshot_id,recipe_key,recipe,settings,status,created_at,updated_at,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,snapshotId,recipeKey,recipe,JSON.stringify(settings),status,now,now,tenant);event(id,status,cached?'Bereits gesicherte Ausgabe übernommen.':'Ausgabe angefordert.');return get(id);
  });},
  claim(leaseMs=150000){return tx(()=>{
   const now=clock();if(db.prepare("SELECT 1 FROM form_export_jobs WHERE status='running' AND lease_until>? AND tenant_id=? LIMIT 1").get(now,tenant))return null;
   const r=db.prepare("SELECT * FROM form_export_jobs WHERE tenant_id=? AND (status='queued' OR (status='running' AND lease_until<=?)) ORDER BY created_at,rowid LIMIT 1").get(tenant,now);if(!r)return null;
   const token=randomUUID();db.prepare("UPDATE form_export_jobs SET status='running',attempts=attempts+1,lease_token=?,lease_until=?,error=NULL,updated_at=? WHERE id=? AND tenant_id=?").run(token,now+leaseMs,now,r.id,tenant);event(r.id,'running',r.status==='running'?'Nach unterbrochener Verarbeitung erneut übernommen.':'Verarbeitung gestartet.');return {...get(r.id),leaseToken:token};
  });},
  finish(id,token,result){return tx(()=>{const r=row(id);if(!owned(r,token))return false;
   db.prepare('INSERT OR IGNORE INTO form_print_proofs(snapshot_id,recipe_key,metadata,pdf,archive,tenant_id) VALUES(?,?,?,?,?,?)').run(r.snapshot_id,r.recipe_key,JSON.stringify(result.metadata),result.pdf,result.archive,tenant);db.prepare("UPDATE form_export_jobs SET status='completed',lease_token=NULL,lease_until=NULL,error=NULL,updated_at=? WHERE id=? AND tenant_id=?").run(clock(),id,tenant);event(id,'completed','Ausgabe unveränderlich gesichert.');return true;});},
  fail(id,token,message){let snapshotId=null;const done=tx(()=>{const r=row(id);if(!owned(r,token))return false;const error=String(message).slice(0,500);db.prepare("UPDATE form_export_jobs SET status='failed',lease_token=NULL,lease_until=NULL,error=?,updated_at=? WHERE id=? AND tenant_id=?").run(error,clock(),id,tenant);event(id,'failed',error);snapshotId=r.snapshot_id;return true;});if(done)notifyFailed({id,snapshotId});return done;},
  onFailed(listener){if(typeof listener!=='function')fail(422,'Beobachter für fehlgeschlagene Ausgabeaufträge fehlt.');failedListeners.add(listener);return ()=>failedListeners.delete(listener);},
  retry(id){return tx(()=>{const r=row(id);if(r.status!=='failed')return get(id);db.prepare("UPDATE form_export_jobs SET status='queued',error=NULL,updated_at=? WHERE id=? AND tenant_id=?").run(clock(),id,tenant);event(id,'queued','Erneut angefordert; gesicherter Eingabestand unverändert.');return get(id);});},
  release(id,token){return tx(()=>{const r=row(id);if(!owned(r,token))return false;db.prepare("UPDATE form_export_jobs SET status='queued',lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND tenant_id=?").run(clock(),id,tenant);event(id,'queued','Verarbeitung beendet; Auftrag bleibt für den nächsten Start erhalten.');return true;});},close:()=>{if(!database)db.close();}};
}
export function createExportWorker({jobs,recipe,render,intervalMs=1000}){
 let closed=false,working=false,active=null;
 async function kick(){if(closed||working)return;working=true;try{while(!closed){active=jobs.claim();if(!active)break;const job=active;try{if(!(Array.isArray(recipe)?recipe:[recipe]).includes(job.recipe))fail(422,'Diese Rezeptversion ist hier nicht mehr ausführbar. Bitte einen neuen Ausgabeauftrag aus dem unveränderten Prüfstand anlegen.');const result=await render(job);if(!closed)jobs.finish(job.id,job.leaseToken,result);}catch(e){if(!closed)jobs.fail(job.id,job.leaseToken,e.status===422?e.message:'Ausgabe konnte nicht erstellt werden. Der gesicherte Stand bleibt erhalten; bitte erneut versuchen.');}finally{active=null;}}}finally{working=false;}}
 const timer=setInterval(()=>{void kick().catch(()=>{});},intervalMs);timer.unref();
 return {kick:()=>{void kick().catch(()=>{});},async wait(id,timeoutMs=135000){const started=Date.now();while(!closed){const job=jobs.get(id);if(job.status==='completed')return job;if(job.status==='failed')fail(422,job.error);if(Date.now()-started>timeoutMs)fail(504,'Die Ausgabe läuft weiter. Den Auftrag unter „Ausgaben“ erneut öffnen.');await new Promise(r=>setTimeout(r,150));}fail(503,'Verarbeitung wird nach dem nächsten Start fortgesetzt.');},close(){closed=true;clearInterval(timer);if(active)jobs.release(active.id,active.leaseToken);}};
}
