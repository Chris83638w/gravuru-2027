import {randomUUID} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'output_check'});};
const keys=['requestId','format','sha256','stage','result','machine','software','notes'];
function clean(input,file){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==keys.length||keys.some(k=>!Object.hasOwn(input,k)))fail(422,'Bitte vollständige Prüfangaben senden.');
 if(typeof input.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.requestId))fail(422,'Ungültige Prüfanforderung.');
 if(!['pdf','white-pdf'].includes(input.format)||input.format!==file.format||typeof input.sha256!=='string'||!/^[a-f0-9]{64}$/.test(input.sha256))fail(422,'Bitte eine gespeicherte PDF auswählen.');
 if(input.sha256!==file.sha256)fail(409,'Die Prüfsumme stimmt nicht mit dieser PDF überein. Bitte die Datei erneut auswählen.');
 if(!['import','print'].includes(input.stage)||!['passed','failed'].includes(input.result))fail(422,'Prüfschritt und Ergebnis auswählen.');
 const text=(value,max,required)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)||required&&!value.trim())fail(422,'Programm, Maschine oder Hinweis fehlen beziehungsweise sind ungültig.');return value.trim();};
 return {format:input.format,filename:file.name,sha256:file.sha256,stage:input.stage,result:input.result,machine:text(input.machine,200,input.stage==='print'),software:text(input.software,200,true),notes:text(input.notes,2000,input.result==='failed'),source:'operator-report',productionReady:false};
}
// Append-only operator observations, never an automatic manufacturing release.
export function createOutputChecks(db){
 db.exec(`CREATE TABLE IF NOT EXISTS export_output_checks(id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES form_export_jobs(id),request_id TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(job_id,request_id));
 CREATE TRIGGER IF NOT EXISTS export_output_check_no_update BEFORE UPDATE ON export_output_checks BEGIN SELECT RAISE(ABORT,'Output checks are immutable');END;
 CREATE TRIGGER IF NOT EXISTS export_output_check_no_delete BEFORE DELETE ON export_output_checks BEGIN SELECT RAISE(ABORT,'Output checks are immutable');END;`);
 const read=row=>({id:row.id,jobId:row.job_id,createdAt:row.created_at,...JSON.parse(row.document)});
 return {
  list(jobId){return {checks:db.prepare('SELECT * FROM export_output_checks WHERE job_id=? ORDER BY rowid DESC LIMIT 200').all(jobId).map(read),total:db.prepare('SELECT count(*) AS total FROM export_output_checks WHERE job_id=?').get(jobId).total};},
  add(jobId,input,file){
   const job=db.prepare('SELECT status FROM form_export_jobs WHERE id=?').get(jobId);if(!job)fail(404,'Ausgabeauftrag nicht gefunden.');if(job.status!=='completed')fail(409,'Nur eine fertig gespeicherte Ausgabe kann geprüft werden.');
   const document=JSON.stringify(clean(input,file)),old=db.prepare('SELECT * FROM export_output_checks WHERE job_id=? AND request_id=?').get(jobId,input.requestId);
   if(old){if(old.document!==document)fail(409,'Diese Prüfanforderung wurde bereits mit anderen Angaben gespeichert.');return read(old);}
   const id='check_'+randomUUID(),createdAt=new Date().toISOString();
   db.prepare('INSERT OR IGNORE INTO export_output_checks VALUES(?,?,?,?,?)').run(id,jobId,input.requestId,document,createdAt);
   const saved=db.prepare('SELECT * FROM export_output_checks WHERE job_id=? AND request_id=?').get(jobId,input.requestId);
   if(saved.document!==document)fail(409,'Diese Prüfanforderung wurde bereits mit anderen Angaben gespeichert.');
   return read(saved);
  }
 };
}
