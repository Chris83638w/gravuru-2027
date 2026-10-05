import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {chmodSync} from 'node:fs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'customer_draft'});};
export function createFormCustomerStore({filename}){
 const db=new DatabaseSync(filename);
 if(filename!==':memory:')chmodSync(filename,0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS form_customer_drafts(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,product_id TEXT NOT NULL,product_revision INTEGER NOT NULL,design_id TEXT NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS form_customer_revisions(draft_id TEXT NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(draft_id,revision));
 CREATE TRIGGER IF NOT EXISTS form_customer_revision_immutable BEFORE UPDATE ON form_customer_revisions BEGIN SELECT RAISE(ABORT,'Customer revisions are immutable'); END;
 CREATE TABLE IF NOT EXISTS form_customer_photos(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,source_sha256 TEXT NOT NULL,original BLOB NOT NULL,preview BLOB NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL);
 CREATE TRIGGER IF NOT EXISTS form_customer_photo_immutable BEFORE UPDATE ON form_customer_photos BEGIN SELECT RAISE(ABORT,'Customer originals are immutable'); END;`);
 const publicRow=r=>({id:r.id,productId:r.product_id,productRevision:r.product_revision,designId:r.design_id,revision:r.revision,state:JSON.parse(r.state)});
 const auth=(id,token)=>{const r=typeof id==='string'&&db.prepare('SELECT * FROM form_customer_drafts WHERE id=?').get(id);if(!r||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(hash(token)),Buffer.from(r.token_hash)))fail(404,'Dieser private Entwurf ist hier nicht zugänglich.');return r;};
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 return {
  create(record,designId,state){return transaction(()=>{const id='draft_'+randomUUID(),token=randomBytes(32).toString('hex'),at=new Date().toISOString(),json=JSON.stringify(state);db.prepare('INSERT INTO form_customer_drafts VALUES(?,?,?,?,?,?,?,?)').run(id,hash(token),record.id,record.revision,designId,1,json,at);db.prepare('INSERT INTO form_customer_revisions VALUES(?,?,?,?)').run(id,1,json,at);return {...publicRow(auth(id,token)),token};});},
  get:(id,token)=>publicRow(auth(id,token)),
  save(id,token,state,expectedRevision){return transaction(()=>{const r=auth(id,token);if(r.revision!==expectedRevision)fail(409,'Dieser Entwurf wurde inzwischen geändert. Deine Eingaben bleiben erhalten; bitte den gespeicherten Stand erneut laden.');const version=r.revision+1,json=JSON.stringify(state);db.prepare('INSERT INTO form_customer_revisions VALUES(?,?,?,?)').run(id,version,json,new Date().toISOString());db.prepare('UPDATE form_customer_drafts SET revision=?,state=? WHERE id=?').run(version,json,id);return publicRow(auth(id,token));});},
  addPhoto(id,token,photo){auth(id,token);return transaction(()=>{const usage=db.prepare('SELECT count(*) AS count,coalesce(sum(length(original)),0) AS bytes FROM form_customer_photos WHERE draft_id=?').get(id);if(usage.count>=40||usage.bytes+photo.original.length>64*1024*1024)fail(413,'Dieser Entwurf enthält bereits zu viele Fotodaten. Bitte einen neuen Entwurf beginnen.');const mediaId='photo_'+randomUUID(),sourceSha256=hash(photo.original);db.prepare('INSERT INTO form_customer_photos VALUES(?,?,?,?,?,?,?)').run(mediaId,id,sourceSha256,photo.original,photo.preview,photo.width,photo.height);return {mediaId,width:photo.width,height:photo.height,sourceSha256};});},
  photo(id,token,mediaId){auth(id,token);const r=db.prepare('SELECT * FROM form_customer_photos WHERE id=? AND draft_id=?').get(mediaId,id);if(!r)fail(422,'Das Foto gehört nicht zu diesem Entwurf.');return {mediaId:r.id,width:r.width,height:r.height,preview:Buffer.from(r.preview),original:Buffer.from(r.original),sourceSha256:r.source_sha256};},
  close:()=>db.close()
 };
}
