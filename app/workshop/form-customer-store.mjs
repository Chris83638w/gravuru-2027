import {createOrderIntake} from './order-intake.mjs';
import {createCustomerDownloads} from './customer-downloads.mjs';
import {createShopDraftJournal} from './shop-draft-transfer.mjs';
import {createExportJobStore} from './export-jobs.mjs';
import {createCartHandoffJournal} from './cart-handoff-journal.mjs';
import {createCartConfigurations} from './cart-configuration.mjs';
import {createAcrylicDraftStore} from './acrylic-draft-store.mjs';
import {cartTimingRead,cartTimingDetail,cartTimingCount,cartTimingBytes} from './shop-cart-timing.mjs';
import {createCustomerDraftStore} from './customer-draft-store.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {chmodSync} from 'node:fs';
import {tenantOption,ensureTenantColumns,TENANT_COLUMN} from './tenant.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'customer_draft'});};
export function createFormCustomerStore({filename,clock=Date.now,autoRelease=null,tenantId}){
 // K13: ein Store je Mandant; alle Teilstores (Bestellungen, Ausgaben, Entwürfe, Journale) erben den Mandanten.
 const tenant=tenantOption({tenantId});
 const db=new DatabaseSync(filename);
 if(filename!==':memory:')chmodSync(filename,0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS form_customer_drafts(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,product_id TEXT NOT NULL,product_revision INTEGER NOT NULL,design_id TEXT NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL,${TENANT_COLUMN});
 CREATE TABLE IF NOT EXISTS form_customer_revisions(draft_id TEXT NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL,${TENANT_COLUMN},PRIMARY KEY(draft_id,revision));
 CREATE TRIGGER IF NOT EXISTS form_customer_revision_immutable BEFORE UPDATE ON form_customer_revisions BEGIN SELECT RAISE(ABORT,'Customer revisions are immutable'); END;
 CREATE TABLE IF NOT EXISTS form_customer_photos(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,source_sha256 TEXT NOT NULL,original BLOB NOT NULL,preview BLOB NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,${TENANT_COLUMN});
 CREATE TRIGGER IF NOT EXISTS form_customer_photo_immutable BEFORE UPDATE ON form_customer_photos BEGIN SELECT RAISE(ABORT,'Customer originals are immutable'); END;
 CREATE TABLE IF NOT EXISTS form_review_snapshots(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,draft_revision INTEGER NOT NULL,manifest TEXT NOT NULL,preview BLOB NOT NULL,contour_pdf BLOB NOT NULL,package BLOB NOT NULL,photos BLOB NOT NULL,${TENANT_COLUMN},UNIQUE(draft_id,draft_revision));
 CREATE TABLE IF NOT EXISTS acrylic_review_requests(request_hash TEXT PRIMARY KEY,snapshot_id TEXT NOT NULL,${TENANT_COLUMN});
 CREATE TRIGGER IF NOT EXISTS form_review_snapshot_immutable BEFORE UPDATE ON form_review_snapshots BEGIN SELECT RAISE(ABORT,'Review snapshots are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS form_review_snapshot_no_delete BEFORE DELETE ON form_review_snapshots BEGIN SELECT RAISE(ABORT,'Review snapshots require an explicit retention migration'); END;
 CREATE TABLE IF NOT EXISTS form_print_proofs(snapshot_id TEXT NOT NULL,recipe_key TEXT NOT NULL,metadata TEXT NOT NULL,pdf BLOB NOT NULL,archive BLOB NOT NULL,${TENANT_COLUMN},PRIMARY KEY(snapshot_id,recipe_key));
 CREATE TRIGGER IF NOT EXISTS form_print_proof_immutable BEFORE UPDATE ON form_print_proofs BEGIN SELECT RAISE(ABORT,'Print proofs are immutable'); END;`);
 ensureTenantColumns(db,['form_customer_drafts','form_customer_revisions','form_customer_photos','form_review_snapshots','acrylic_review_requests','form_print_proofs']);
 const exportJobs=createExportJobStore({database:db,tenantId:tenant});
 const cartHandoffs=createCartHandoffJournal({database:db,tenantId:tenant});
 // K8 (Ü9.1): Konfigurations-ID/Revision je Warenkorbübergabe; Inhalte bleiben im Prüfstand.
 const cartConfigurations=createCartConfigurations({database:db,clock,tenantId:tenant});
 const publicRow=r=>({id:r.id,productId:r.product_id,productRevision:r.product_revision,designId:r.design_id,revision:r.revision,state:JSON.parse(r.state)});
 const auth=(id,token)=>{const r=typeof id==='string'&&db.prepare('SELECT * FROM form_customer_drafts WHERE id=? AND tenant_id=?').get(id,tenant);if(!r||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(hash(token)),Buffer.from(r.token_hash)))fail(404,'Dieser private Entwurf ist hier nicht zugänglich.');return r;};
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 const snapshot=(id,columns='manifest')=>{const r=typeof id==='string'&&cartTimingRead('review_snapshot_read',()=>db.prepare(`SELECT ${columns} FROM form_review_snapshots WHERE id=? AND tenant_id=?`).get(id,tenant));cartTimingCount('review_rows_returned',r?1:0);if(!r)fail(404,'Prüfstand nicht gefunden.');cartTimingBytes('review_manifest_bytes',r.manifest);return r;};
 const summary=r=>{const m=JSON.parse(r.manifest);return {id:m.id,createdAt:m.createdAt,product:m.product,source:m.source,blockers:m.blockers,warnings:m.warnings,photoCount:m.photos.length,photoHints:m.photoHints||[],photoResolution:(m.photoResolution||[]).map(p=>({objectId:p.objectId,grade:p.grade,effectiveDpi:p.effectiveDpi,targetDpi:p.targetDpi})),packageSha256:m.packageSha256};};
 const orderIntake=createOrderIntake({database:db,snapshot:id=>JSON.parse(snapshot(id).manifest),clock,autoRelease,configurations:cartConfigurations,tenantId:tenant});
 const acrylicDrafts=createAcrylicDraftStore({database:db,tenantId:tenant,capture(bundle){const m=bundle.manifest;db.prepare('INSERT INTO form_review_snapshots(id,draft_id,draft_revision,manifest,preview,contour_pdf,package,photos,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)').run(m.id,m.source.draftId,m.source.draftRevision,JSON.stringify(m),bundle.preview,bundle.contourPdf,bundle.package,bundle.photos,tenant);}});
 const printProof=(id,key)=>{snapshot(id);const r=db.prepare('SELECT * FROM form_print_proofs WHERE snapshot_id=? AND recipe_key=? AND tenant_id=?').get(id,key,tenant);return r?{metadata:JSON.parse(r.metadata),pdf:Buffer.from(r.pdf),archive:Buffer.from(r.archive)}:null;};
 const customerDownloads=createCustomerDownloads({database:db,orders:orderIntake,jobs:exportJobs,printProof,clock,tenantId:tenant});
 const shopDraftTransfers=createShopDraftJournal({database:db,tenantId:tenant});
 // K7: Entwürfe im Kundenkonto (Eigentümer = Shopify-Kunde), getrennt von Token-Entwürfen und Prüfständen.
 const accountDrafts=createCustomerDraftStore({database:db,clock,tenantId:tenant});
 return {tenantId:tenant,exportJobs,orderIntake,cartHandoffs,cartConfigurations,acrylicDrafts,accountDrafts,customerDownloads,shopDraftTransfers,
  findAcrylicReview(key){const r=db.prepare('SELECT snapshot_id FROM acrylic_review_requests WHERE request_hash=? AND tenant_id=?').get(key,tenant);return r?summary(snapshot(r.snapshot_id)):null;},
  captureAcrylicReview(key,bundle){return transaction(()=>{const old=db.prepare('SELECT snapshot_id FROM acrylic_review_requests WHERE request_hash=? AND tenant_id=?').get(key,tenant);if(old)return summary(snapshot(old.snapshot_id));const m=bundle.manifest;db.prepare('INSERT INTO form_review_snapshots(id,draft_id,draft_revision,manifest,preview,contour_pdf,package,photos,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)').run(m.id,m.source.draftId,1,JSON.stringify(m),bundle.preview,bundle.contourPdf,bundle.package,bundle.photos,tenant);db.prepare('INSERT INTO acrylic_review_requests(request_hash,snapshot_id,tenant_id) VALUES(?,?,?)').run(key,m.id,tenant);return summary(snapshot(m.id));});},
  printProof,
  savePrintProof(id,key,result){return transaction(()=>{snapshot(id);db.prepare('INSERT OR IGNORE INTO form_print_proofs(snapshot_id,recipe_key,metadata,pdf,archive,tenant_id) VALUES(?,?,?,?,?,?)').run(id,key,JSON.stringify(result.metadata),result.pdf,result.archive,tenant);});},
  findSnapshot:(draftId,version)=>{const r=db.prepare('SELECT manifest FROM form_review_snapshots WHERE draft_id=? AND draft_revision=? AND tenant_id=?').get(draftId,version,tenant);return r?summary(r):null;},
  capture(id,token,expectedRevision,bundle){return transaction(()=>{const r=auth(id,token);if(r.revision!==expectedRevision||bundle.manifest.source.draftRevision!==r.revision||bundle.manifest.source.draftId!==r.id||bundle.manifest.product.id!==r.product_id||bundle.manifest.product.revision!==r.product_revision)fail(409,'Der Entwurf wurde inzwischen geändert. Bitte den neuen Stand prüfen und erneut sichern.');const old=db.prepare('SELECT manifest FROM form_review_snapshots WHERE draft_id=? AND draft_revision=? AND tenant_id=?').get(id,r.revision,tenant);if(old)return summary(old);db.prepare('INSERT INTO form_review_snapshots(id,draft_id,draft_revision,manifest,preview,contour_pdf,package,photos,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)').run(bundle.manifest.id,id,r.revision,JSON.stringify(bundle.manifest),bundle.preview,bundle.contourPdf,bundle.package,bundle.photos,tenant);return summary(snapshot(bundle.manifest.id));});},
  listSnapshots:()=>db.prepare('SELECT manifest FROM form_review_snapshots WHERE tenant_id=? ORDER BY rowid DESC LIMIT 200').all(tenant).map(summary),
  review(id){const r=snapshot(id,'manifest,preview');return {manifest:cartTimingDetail('review_manifest_json',()=>JSON.parse(r.manifest)),preview:cartTimingDetail('review_preview_copy',()=>Buffer.from(r.preview).toString())};},
  downloadSnapshot(id,kind){const columns=new Map([['package','package'],['contour','contour_pdf'],['photos','photos']]),column=columns.get(kind);if(!column)fail(422,'Dieser Prüfstand enthält noch keine freigegebene Produktions-PDF.');const bytes=Buffer.from(snapshot(id,column)[column]);if(kind==='package')cartTimingBytes('review_package_bytes',bytes);return bytes;},
  create(record,designId,state){return transaction(()=>{const id='draft_'+randomUUID(),token=randomBytes(32).toString('hex'),at=new Date().toISOString(),json=JSON.stringify(state);db.prepare('INSERT INTO form_customer_drafts(id,token_hash,product_id,product_revision,design_id,revision,state,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,hash(token),record.id,record.revision,designId,1,json,at,tenant);db.prepare('INSERT INTO form_customer_revisions(draft_id,revision,state,created_at,tenant_id) VALUES(?,?,?,?,?)').run(id,1,json,at,tenant);return {...publicRow(auth(id,token)),token};});},
  get:(id,token)=>publicRow(auth(id,token)),
  save(id,token,state,expectedRevision){return transaction(()=>{const r=auth(id,token);if(r.revision!==expectedRevision)fail(409,'Dieser Entwurf wurde inzwischen geändert. Deine Eingaben bleiben erhalten; bitte den gespeicherten Stand erneut laden.');const version=r.revision+1,json=JSON.stringify(state);db.prepare('INSERT INTO form_customer_revisions(draft_id,revision,state,created_at,tenant_id) VALUES(?,?,?,?,?)').run(id,version,json,new Date().toISOString(),tenant);db.prepare('UPDATE form_customer_drafts SET revision=?,state=? WHERE id=? AND tenant_id=?').run(version,json,id,tenant);return publicRow(auth(id,token));});},
  addPhoto(id,token,photo){auth(id,token);return transaction(()=>{const usage=db.prepare('SELECT count(*) AS count,coalesce(sum(length(original)),0) AS bytes FROM form_customer_photos WHERE draft_id=? AND tenant_id=?').get(id,tenant);if(usage.count>=40||usage.bytes+photo.original.length>64*1024*1024)fail(413,'Dieser Entwurf enthält bereits zu viele Fotodaten. Bitte einen neuen Entwurf beginnen.');const mediaId='photo_'+randomUUID(),sourceSha256=hash(photo.original);db.prepare('INSERT INTO form_customer_photos(id,draft_id,source_sha256,original,preview,width,height,tenant_id) VALUES(?,?,?,?,?,?,?,?)').run(mediaId,id,sourceSha256,photo.original,photo.preview,photo.width,photo.height,tenant);return {mediaId,width:photo.width,height:photo.height,sourceSha256};});},
  photo(id,token,mediaId){auth(id,token);const r=db.prepare('SELECT * FROM form_customer_photos WHERE id=? AND draft_id=? AND tenant_id=?').get(mediaId,id,tenant);if(!r)fail(422,'Das Foto gehört nicht zu diesem Entwurf.');return {mediaId:r.id,width:r.width,height:r.height,preview:Buffer.from(r.preview),original:Buffer.from(r.original),sourceSha256:r.source_sha256};},
  close:()=>db.close()
 };
}
