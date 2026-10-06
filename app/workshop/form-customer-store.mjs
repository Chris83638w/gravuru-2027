import {createOrderIntake} from './order-intake.mjs';
import {createExportJobStore} from './export-jobs.mjs';
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
 CREATE TRIGGER IF NOT EXISTS form_customer_photo_immutable BEFORE UPDATE ON form_customer_photos BEGIN SELECT RAISE(ABORT,'Customer originals are immutable'); END;
 CREATE TABLE IF NOT EXISTS form_review_snapshots(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,draft_revision INTEGER NOT NULL,manifest TEXT NOT NULL,preview BLOB NOT NULL,contour_pdf BLOB NOT NULL,package BLOB NOT NULL,photos BLOB NOT NULL,UNIQUE(draft_id,draft_revision));
 CREATE TABLE IF NOT EXISTS acrylic_review_requests(request_hash TEXT PRIMARY KEY,snapshot_id TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS form_review_snapshot_immutable BEFORE UPDATE ON form_review_snapshots BEGIN SELECT RAISE(ABORT,'Review snapshots are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS form_review_snapshot_no_delete BEFORE DELETE ON form_review_snapshots BEGIN SELECT RAISE(ABORT,'Review snapshots require an explicit retention migration'); END;
 CREATE TABLE IF NOT EXISTS form_print_proofs(snapshot_id TEXT NOT NULL,recipe_key TEXT NOT NULL,metadata TEXT NOT NULL,pdf BLOB NOT NULL,archive BLOB NOT NULL,PRIMARY KEY(snapshot_id,recipe_key));
 CREATE TRIGGER IF NOT EXISTS form_print_proof_immutable BEFORE UPDATE ON form_print_proofs BEGIN SELECT RAISE(ABORT,'Print proofs are immutable'); END;`);
 const exportJobs=createExportJobStore({database:db});
 const publicRow=r=>({id:r.id,productId:r.product_id,productRevision:r.product_revision,designId:r.design_id,revision:r.revision,state:JSON.parse(r.state)});
 const auth=(id,token)=>{const r=typeof id==='string'&&db.prepare('SELECT * FROM form_customer_drafts WHERE id=?').get(id);if(!r||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(hash(token)),Buffer.from(r.token_hash)))fail(404,'Dieser private Entwurf ist hier nicht zugänglich.');return r;};
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 const snapshot=(id,columns='manifest')=>{const r=typeof id==='string'&&db.prepare('SELECT '+columns+' FROM form_review_snapshots WHERE id=?').get(id);if(!r)fail(404,'Prüfstand nicht gefunden.');return r;};
 const summary=r=>{const m=JSON.parse(r.manifest);return {id:m.id,createdAt:m.createdAt,product:m.product,source:m.source,blockers:m.blockers,warnings:m.warnings,photoCount:m.photos.length,packageSha256:m.packageSha256};};
 const orderIntake=createOrderIntake({database:db,snapshot:id=>JSON.parse(snapshot(id).manifest)});
 return {exportJobs,orderIntake,
  findAcrylicReview(key){const r=db.prepare('SELECT snapshot_id FROM acrylic_review_requests WHERE request_hash=?').get(key);return r?summary(snapshot(r.snapshot_id)):null;},
  captureAcrylicReview(key,bundle){return transaction(()=>{const old=db.prepare('SELECT snapshot_id FROM acrylic_review_requests WHERE request_hash=?').get(key);if(old)return summary(snapshot(old.snapshot_id));const m=bundle.manifest;db.prepare('INSERT INTO form_review_snapshots VALUES(?,?,?,?,?,?,?,?)').run(m.id,m.source.draftId,1,JSON.stringify(m),bundle.preview,bundle.contourPdf,bundle.package,bundle.photos);db.prepare('INSERT INTO acrylic_review_requests VALUES(?,?)').run(key,m.id);return summary(snapshot(m.id));});},
  printProof(id,key){snapshot(id);const r=db.prepare('SELECT * FROM form_print_proofs WHERE snapshot_id=? AND recipe_key=?').get(id,key);return r?{metadata:JSON.parse(r.metadata),pdf:Buffer.from(r.pdf),archive:Buffer.from(r.archive)}:null;},
  savePrintProof(id,key,result){return transaction(()=>{snapshot(id);db.prepare('INSERT OR IGNORE INTO form_print_proofs VALUES(?,?,?,?,?)').run(id,key,JSON.stringify(result.metadata),result.pdf,result.archive);});},
  findSnapshot:(draftId,version)=>{const r=db.prepare('SELECT manifest FROM form_review_snapshots WHERE draft_id=? AND draft_revision=?').get(draftId,version);return r?summary(r):null;},
  capture(id,token,expectedRevision,bundle){return transaction(()=>{const r=auth(id,token);if(r.revision!==expectedRevision||bundle.manifest.source.draftRevision!==r.revision||bundle.manifest.source.draftId!==r.id||bundle.manifest.product.id!==r.product_id||bundle.manifest.product.revision!==r.product_revision)fail(409,'Der Entwurf wurde inzwischen geändert. Bitte den neuen Stand prüfen und erneut sichern.');const old=db.prepare('SELECT manifest FROM form_review_snapshots WHERE draft_id=? AND draft_revision=?').get(id,r.revision);if(old)return summary(old);db.prepare('INSERT INTO form_review_snapshots VALUES(?,?,?,?,?,?,?,?)').run(bundle.manifest.id,id,r.revision,JSON.stringify(bundle.manifest),bundle.preview,bundle.contourPdf,bundle.package,bundle.photos);return summary(snapshot(bundle.manifest.id));});},
  listSnapshots:()=>db.prepare('SELECT manifest FROM form_review_snapshots ORDER BY rowid DESC LIMIT 200').all().map(summary),
  review(id){const r=snapshot(id,'manifest,preview');return {manifest:JSON.parse(r.manifest),preview:Buffer.from(r.preview).toString()};},
  downloadSnapshot(id,kind){const columns=new Map([['package','package'],['contour','contour_pdf'],['photos','photos']]),column=columns.get(kind);if(!column)fail(422,'Dieser Prüfstand enthält noch keine freigegebene Produktions-PDF.');return Buffer.from(snapshot(id,column)[column]);},
  create(record,designId,state){return transaction(()=>{const id='draft_'+randomUUID(),token=randomBytes(32).toString('hex'),at=new Date().toISOString(),json=JSON.stringify(state);db.prepare('INSERT INTO form_customer_drafts VALUES(?,?,?,?,?,?,?,?)').run(id,hash(token),record.id,record.revision,designId,1,json,at);db.prepare('INSERT INTO form_customer_revisions VALUES(?,?,?,?)').run(id,1,json,at);return {...publicRow(auth(id,token)),token};});},
  get:(id,token)=>publicRow(auth(id,token)),
  save(id,token,state,expectedRevision){return transaction(()=>{const r=auth(id,token);if(r.revision!==expectedRevision)fail(409,'Dieser Entwurf wurde inzwischen geändert. Deine Eingaben bleiben erhalten; bitte den gespeicherten Stand erneut laden.');const version=r.revision+1,json=JSON.stringify(state);db.prepare('INSERT INTO form_customer_revisions VALUES(?,?,?,?)').run(id,version,json,new Date().toISOString());db.prepare('UPDATE form_customer_drafts SET revision=?,state=? WHERE id=?').run(version,json,id);return publicRow(auth(id,token));});},
  addPhoto(id,token,photo){auth(id,token);return transaction(()=>{const usage=db.prepare('SELECT count(*) AS count,coalesce(sum(length(original)),0) AS bytes FROM form_customer_photos WHERE draft_id=?').get(id);if(usage.count>=40||usage.bytes+photo.original.length>64*1024*1024)fail(413,'Dieser Entwurf enthält bereits zu viele Fotodaten. Bitte einen neuen Entwurf beginnen.');const mediaId='photo_'+randomUUID(),sourceSha256=hash(photo.original);db.prepare('INSERT INTO form_customer_photos VALUES(?,?,?,?,?,?,?)').run(mediaId,id,sourceSha256,photo.original,photo.preview,photo.width,photo.height);return {mediaId,width:photo.width,height:photo.height,sourceSha256};});},
  photo(id,token,mediaId){auth(id,token);const r=db.prepare('SELECT * FROM form_customer_photos WHERE id=? AND draft_id=?').get(mediaId,id);if(!r)fail(422,'Das Foto gehört nicht zu diesem Entwurf.');return {mediaId:r.id,width:r.width,height:r.height,preview:Buffer.from(r.preview),original:Buffer.from(r.original),sourceSha256:r.source_sha256};},
  close:()=>db.close()
 };
}
