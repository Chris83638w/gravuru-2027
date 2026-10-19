import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {tenantOption,ensureTenantColumn,TENANT_COLUMN} from './tenant.mjs';

const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'batch_job'});};
const validId=id=>{if(!/^imp_[a-f0-9-]{36}$/.test(id||''))fail(404,'Gespeicherte Importprüfung nicht gefunden.');};
/** Private immutable input snapshots; progress comes from the existing import journal. */
export function createImportJobStore({filename,table,prepare,plan,tenantId}){
  if(!['batch_jobs','variant_batch_jobs'].includes(table))throw new TypeError('Unknown import job table.');
  const tenant=tenantOption({tenantId});
  const db=new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS ${table} (
      id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL, created_at TEXT NOT NULL, row_count INTEGER NOT NULL,
      input TEXT NOT NULL CHECK(json_valid(input)), ${TENANT_COLUMN}
    );
    CREATE TRIGGER IF NOT EXISTS ${table}_immutable BEFORE UPDATE ON ${table}
      BEGIN SELECT RAISE(ABORT,'Import snapshots are immutable'); END;`);
  ensureTenantColumn(db,table);
  const summary=row=>({id:row.id,name:row.name,createdAt:row.created_at,rowCount:row.row_count});
  const rowFor=id=>{validId(id);const row=db.prepare(`SELECT * FROM ${table} WHERE id=? AND tenant_id=?`).get(id,tenant);if(!row)fail(404,'Gespeicherte Importprüfung nicht gefunden.');return row;};
  return {
    create({name,input}={}){
      if(typeof name!=='string'||!name.trim()||name.length>160||/[\x00-\x1f]/.test(name))fail(422,'Einen Namen bis 160 Zeichen für die Importprüfung angeben.');
      const saved=prepare(input);
      const json=JSON.stringify(saved);if(Buffer.byteLength(json)>2*1024*1024)fail(413,'Importprüfung überschreitet 2 MB. Tabelle bitte aufteilen.');
      const fingerprint=createHash('sha256').update(json).digest('hex');
      db.exec('BEGIN IMMEDIATE');
      try{
        const existing=db.prepare(`SELECT * FROM ${table} WHERE fingerprint=? AND tenant_id=?`).get(fingerprint,tenant);
        if(existing){db.exec('COMMIT');return {...summary(existing),existing:true};}
        if(db.prepare(`SELECT count(*) AS count FROM ${table} WHERE tenant_id=?`).get(tenant).count>=100)fail(422,'100 Importprüfungen gespeichert. Nicht mehr benötigte Prüfungen zuerst entfernen; Gruppen und Produkte bleiben dabei erhalten.');
        const id='imp_'+randomUUID(),createdAt=new Date().toISOString();
        db.prepare(`INSERT INTO ${table}(id,fingerprint,name,created_at,row_count,input,tenant_id) VALUES(?,?,?,?,?,?,?)`).run(id,fingerprint,name.trim(),createdAt,saved.rows.length,json,tenant);
        db.exec('COMMIT');return {id,name:name.trim(),createdAt,rowCount:saved.rows.length,existing:false};
      }catch(error){db.exec('ROLLBACK');throw error;}
    },
    list(){return db.prepare(`SELECT id,name,created_at,row_count FROM ${table} WHERE tenant_id=? ORDER BY created_at DESC,id DESC`).all(tenant).map(summary);},
    review(id){
      const row=rowFor(id),input=JSON.parse(row.input);
      const {entries,...review}=plan(input);
      return {...summary(row),input,plan:review};
    },
    remove(id){rowFor(id);db.prepare(`DELETE FROM ${table} WHERE id=? AND tenant_id=?`).run(id,tenant);return {removed:true};},
    close(){db.close();},
  };
}
