import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {batchReportData} from './batch-report.mjs';
import {planBatch} from './batch.mjs';

const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'batch_job'});};
const validId=id=>{if(!/^imp_[a-f0-9-]{36}$/.test(id||''))fail(404,'Gespeicherte Importprüfung nicht gefunden.');};
/** Private immutable input snapshots; progress comes from the existing import journal. */
export function createBatchJobs({filename,repository,assets}){
  const db=new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS batch_jobs (
      id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL, created_at TEXT NOT NULL, row_count INTEGER NOT NULL,
      input TEXT NOT NULL CHECK(json_valid(input))
    );
    CREATE TRIGGER IF NOT EXISTS batch_jobs_immutable BEFORE UPDATE ON batch_jobs
      BEGIN SELECT RAISE(ABORT,'Import snapshots are immutable'); END;`);
  const summary=row=>({id:row.id,name:row.name,createdAt:row.created_at,rowCount:row.row_count});
  const rowFor=id=>{validId(id);const row=db.prepare('SELECT * FROM batch_jobs WHERE id=?').get(id);if(!row)fail(404,'Gespeicherte Importprüfung nicht gefunden.');return row;};
  return {
    create({name,input}={}){
      if(typeof name!=='string'||!name.trim()||name.length>160||/[\x00-\x1f]/.test(name))fail(422,'Einen Namen bis 160 Zeichen für die Importprüfung angeben.');
      if(!input||Object.keys(input).some(k=>!['rows','designRows','designFiles','masterId','masterRevision'].includes(k)))fail(422,'Nur geprüfte Importdaten können gespeichert werden.');
      const data=batchReportData(repository,{...input,mode:'report'},assets);
      // Pin selected defaults in each row. No token, customer media or resolved product document is saved.
      const saved={rows:data.rows,designRows:data.designRows,designFiles:structuredClone(input.designFiles||[])};
      const json=JSON.stringify(saved);if(Buffer.byteLength(json)>2*1024*1024)fail(413,'Importprüfung überschreitet 2 MB. Tabelle bitte aufteilen.');
      const fingerprint=createHash('sha256').update(json).digest('hex');
      db.exec('BEGIN IMMEDIATE');
      try{
        const existing=db.prepare('SELECT * FROM batch_jobs WHERE fingerprint=?').get(fingerprint);
        if(existing){db.exec('COMMIT');return {...summary(existing),existing:true};}
        if(db.prepare('SELECT count(*) AS count FROM batch_jobs').get().count>=100)fail(422,'100 Importprüfungen gespeichert. Nicht mehr benötigte Prüfungen zuerst entfernen; Produkte bleiben dabei erhalten.');
        const id='imp_'+randomUUID(),createdAt=new Date().toISOString();
        db.prepare('INSERT INTO batch_jobs VALUES(?,?,?,?,?,?)').run(id,fingerprint,name.trim(),createdAt,saved.rows.length,json);
        db.exec('COMMIT');return {id,name:name.trim(),createdAt,rowCount:saved.rows.length,existing:false};
      }catch(error){db.exec('ROLLBACK');throw error;}
    },
    list(){return db.prepare('SELECT id,name,created_at,row_count FROM batch_jobs ORDER BY created_at DESC,id DESC').all().map(summary);},
    review(id){
      const row=rowFor(id),input=JSON.parse(row.input);
      const {entries,...plan}=planBatch(repository,input,assets);
      return {...summary(row),input,plan};
    },
    remove(id){rowFor(id);db.prepare('DELETE FROM batch_jobs WHERE id=?').run(id);return {removed:true};},
    close(){db.close();},
  };
}
