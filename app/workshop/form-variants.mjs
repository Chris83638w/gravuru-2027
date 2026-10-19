import {planVariantBatch} from './variant-batch.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {isFormProduct,FORM_MATERIALS} from './form-product.mjs';
import {tenantOption,ensureTenantColumns,TENANT_COLUMN} from './tenant.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'form_variants'});};
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail(422,'Ausführungen: Felder fehlen oder sind unbekannt.');};
const version=v=>{if(!Number.isSafeInteger(v)||v<1)fail(422,'Ein fester gespeicherter Stand ist erforderlich.');};
const label=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f]/.test(v))fail(422,'Bitte einen gültigen Namen eingeben.');return v.trim();};
export function createFormVariants({filename,repository,tenantId}){
 const tenant=tenantOption({tenantId:tenantId??repository?.tenantId});
 const db=new DatabaseSync(filename);db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS form_variant_sets(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,${TENANT_COLUMN});
 CREATE TABLE IF NOT EXISTS form_variant_revisions(set_id TEXT NOT NULL REFERENCES form_variant_sets(id),revision INTEGER NOT NULL,document TEXT NOT NULL CHECK(json_valid(document)),sha256 TEXT NOT NULL,created_at TEXT NOT NULL,${TENANT_COLUMN},PRIMARY KEY(set_id,revision));
 CREATE TABLE IF NOT EXISTS form_variant_imports(import_key TEXT NOT NULL,fingerprint TEXT NOT NULL,set_id TEXT NOT NULL REFERENCES form_variant_sets(id),created_at TEXT NOT NULL,${TENANT_COLUMN},PRIMARY KEY(tenant_id,import_key));
 CREATE TABLE IF NOT EXISTS form_variant_members(set_id TEXT NOT NULL,revision INTEGER NOT NULL,variant_id TEXT NOT NULL,product_id TEXT NOT NULL,product_revision INTEGER NOT NULL,${TENANT_COLUMN},PRIMARY KEY(set_id,revision,variant_id),FOREIGN KEY(set_id,revision) REFERENCES form_variant_revisions(set_id,revision));
 CREATE TRIGGER IF NOT EXISTS form_variant_immutable BEFORE UPDATE ON form_variant_revisions BEGIN SELECT RAISE(ABORT,'Variant revisions are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_variant_no_delete BEFORE DELETE ON form_variant_revisions BEGIN SELECT RAISE(ABORT,'Variant revisions are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_variant_member_immutable BEFORE UPDATE ON form_variant_members BEGIN SELECT RAISE(ABORT,'Variant members are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_variant_member_no_delete BEFORE DELETE ON form_variant_members BEGIN SELECT RAISE(ABORT,'Variant members are immutable');END;`);
 // K13: Importschlüssel kommen aus der Händlertabelle und sind nur je Mandant eindeutig – bestehende Tabelle neu aufbauen.
 ensureTenantColumns(db,['form_variant_sets','form_variant_revisions','form_variant_members']);
 if(!db.prepare('PRAGMA table_info(form_variant_imports)').all().some(c=>c.name==='tenant_id'))db.exec(`BEGIN IMMEDIATE;
  CREATE TABLE form_variant_imports_k13(import_key TEXT NOT NULL,fingerprint TEXT NOT NULL,set_id TEXT NOT NULL REFERENCES form_variant_sets(id),created_at TEXT NOT NULL,${TENANT_COLUMN},PRIMARY KEY(tenant_id,import_key));
  INSERT INTO form_variant_imports_k13(import_key,fingerprint,set_id,created_at) SELECT import_key,fingerprint,set_id,created_at FROM form_variant_imports;
  DROP TABLE form_variant_imports; ALTER TABLE form_variant_imports_k13 RENAME TO form_variant_imports; COMMIT;`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 // Product revisions are validated through the repository, also for isolated :memory: stores.
 // Existing product snapshots cannot be deleted or updated.
 function validate(input){
  exact(input,['name','defaultVariantId','archived','variants']);const d=structuredClone(input);d.name=label(d.name,160);
  if(typeof d.archived!=='boolean'||!Array.isArray(d.variants)||!d.variants.length||d.variants.length>50)fail(422,'Bitte 1 bis 50 Ausführungen zuordnen.');
  const ids=new Set(),names=new Set(),products=new Set();
  for(const v of d.variants){
   exact(v,['id','label','productId','productRevision']);v.label=label(v.label,100);version(v.productRevision);
   if(typeof v.id!=='string'||!/^[a-zA-Z0-9][\w-]{0,79}$/.test(v.id)||ids.has(v.id)||names.has(v.label.toLocaleLowerCase('de-DE'))||products.has(v.productId))fail(422,'Ausführungs-ID, Name und Produkt dürfen nicht doppelt vorkommen.');
   if(typeof v.productId!=='string'||!/^cfg_[a-f0-9-]+$/.test(v.productId))fail(422,'Eine gespeicherte Produkt-ID ist erforderlich.');
   const record=repository.get(v.productId,{revision:v.productRevision}),current=repository.get(v.productId),p=record.document;
   if(!isFormProduct(p)||p.kind!=='product'||(!d.archived&&(current.document.kind!=='product'||current.status==='archived')))fail(422,'Nur aktive freie Formprodukte können als Ausführung zugeordnet werden.');
   if(!p.material.id||p.material.thicknessMm===null||!p.processingMethod||p.basePriceCents===null||!p.designs?.length)fail(422,'Ausführung benötigt Material, Stärke, Verfahren, Preis und mindestens ein Design.');
   repository.validate(p);ids.add(v.id);names.add(v.label.toLocaleLowerCase('de-DE'));products.add(v.productId);
  }
  if(!ids.has(d.defaultVariantId))fail(422,'Die Standardausführung muss in der Auswahl enthalten sein.');return d;
 }
 function get(id,revision){
  if(typeof id!=='string'||!/^variants_[a-f0-9-]+$/.test(id))fail(404,'Ausführungsgruppe nicht gefunden.');if(revision!==undefined)version(revision);
  const r=db.prepare('SELECT r.* FROM form_variant_revisions r JOIN form_variant_sets s ON s.id=r.set_id WHERE s.id=? AND s.tenant_id=? AND r.tenant_id=s.tenant_id AND r.revision=COALESCE(?,s.revision)').get(id,tenant,revision??null);
  if(!r)fail(404,'Ausführungsgruppe oder Stand nicht gefunden.');return {id:r.set_id,revision:r.revision,document:JSON.parse(r.document),sha256:r.sha256,createdAt:r.created_at};
 }
 function append(id,revision,d){const json=JSON.stringify(d);db.prepare('INSERT INTO form_variant_revisions(set_id,revision,document,sha256,created_at,tenant_id) VALUES(?,?,?,?,?,?)').run(id,revision,json,createHash('sha256').update(json).digest('hex'),new Date().toISOString(),tenant);for(const v of d.variants)db.prepare('INSERT INTO form_variant_members(set_id,revision,variant_id,product_id,product_revision,tenant_id) VALUES(?,?,?,?,?,?)').run(id,revision,v.id,v.productId,v.productRevision,tenant);return get(id,revision);}
 function options(id,revision,{customer=false}={}){
  const group=get(id,revision),archived=get(id).document.archived;if(customer&&(archived||group.document.archived))fail(422,'Diese Ausführungsgruppe ist nicht verfügbar.');
  return {...group,variants:group.document.variants.map(v=>{
   const record=repository.get(v.productId,{revision:v.productRevision}),current=repository.get(v.productId),d=record.document;
   return {...v,currentRevision:current.revision,available:!archived&&!group.document.archived&&current.status!=='archived'&&current.document.kind==='product',materialName:FORM_MATERIALS.find(m=>m.id===d.material.id)?.name||d.material.id,material:d.material,geometry:{widthMm:d.form.geometry.widthMm,heightMm:d.form.geometry.heightMm,holeCount:d.form.geometry.holeCount},method:d.processingMethod,basePriceCents:d.basePriceCents,designs:d.designs.map(a=>({id:a.id,name:a.name})),defaultDesignId:d.defaultDesignId,previewUrl:'/api/workshop/products/'+v.productId+'/preview.svg?revision='+v.productRevision};
  })};
 }
 function select(id,revision,variantId){
  version(revision);const group=options(id,revision,{customer:true}),v=group.variants.find(v=>v.id===(variantId??group.document.defaultVariantId));if(!v||!v.available)fail(422,'Diese Ausführung ist nicht verfügbar.');
  const record=repository.get(v.productId,{revision:v.productRevision});repository.validate(record.document);
  return {groupId:id,groupRevision:revision,variantId:v.id,productId:v.productId,productRevision:v.productRevision,basePriceCents:record.document.basePriceCents,href:'/?'+new URLSearchParams({configuration:v.productId,revision:v.productRevision,group:id,groupRevision:revision,variant:v.id})};
 }
 const store={get,options,select,validate,tenantId:tenant,
  importItem:key=>{const r=db.prepare('SELECT * FROM form_variant_imports WHERE import_key=? AND tenant_id=?').get(key,tenant);return r?{fingerprint:r.fingerprint,id:r.set_id}:null;},
  plan:input=>planVariantBatch(store,input),
  commit:input=>tx(()=>{
   const plan=planVariantBatch(store,input);if(!plan.entries.length||!plan.valid&&input.skipErrors!==true)fail(422,'Die Tabelle enthält Fehler. Korrigieren oder ausdrücklich nur gültige Gruppen übernehmen.');
   if(!input.token||input.token!==plan.token)fail(409,'Importdaten geändert. Bitte erneut prüfen.');
   const groups=plan.entries.map(e=>{const prior=store.importItem(e.key);if(prior)return {key:e.key,id:prior.id,created:false,updated:false};
    const id=e.groupId||'variants_'+randomUUID(),rev=e.action==='update'?e.expectedRevision+1:1;
    if(e.action==='create')db.prepare('INSERT INTO form_variant_sets(id,revision,tenant_id) VALUES(?,1,?)').run(id,tenant);else db.prepare('UPDATE form_variant_sets SET revision=? WHERE id=? AND tenant_id=?').run(rev,id,tenant);
    append(id,rev,e.document);db.prepare('INSERT INTO form_variant_imports(import_key,fingerprint,set_id,created_at,tenant_id) VALUES(?,?,?,?,?)').run(e.key,e.fingerprint,id,new Date().toISOString(),tenant);return {key:e.key,id,revision:rev,created:e.action==='create',updated:e.action==='update'};
   });return {groups,errors:plan.report.filter(r=>r.status==='error')};
  }),
  list:()=>db.prepare('SELECT id FROM form_variant_sets WHERE tenant_id=? ORDER BY rowid DESC').all(tenant).map(r=>get(r.id)),
  history:id=>{get(id);return db.prepare('SELECT revision FROM form_variant_revisions WHERE set_id=? AND tenant_id=? ORDER BY revision DESC').all(id,tenant).map(r=>get(id,r.revision));},
  create:input=>tx(()=>{const d=validate(input),id='variants_'+randomUUID();db.prepare('INSERT INTO form_variant_sets(id,revision,tenant_id) VALUES(?,1,?)').run(id,tenant);return append(id,1,d);}),
  save:(id,input,expected)=>tx(()=>{const old=get(id);version(expected);if(old.revision!==expected)fail(409,'Ausführungsgruppe inzwischen geändert. Eingaben bleiben erhalten; bitte aktuellen Stand laden.');const d=validate(input);db.prepare('UPDATE form_variant_sets SET revision=? WHERE id=? AND tenant_id=?').run(old.revision+1,id,tenant);return append(id,old.revision+1,d);}),
  close:()=>db.close()};
 return store;
}
