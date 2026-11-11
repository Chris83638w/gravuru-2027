import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from './repository.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {createShopProductBindingStore} from './shop-product-binding-store.mjs';

// New synthetic SQLite files only; no application construction or real data.
const scope={tenantId:'gravuru',storeId:'epoch-test',shopDomain:'epoch-test.myshopify.com'};
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'):JSON.stringify(v);
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
const noWrite=()=>{throw Error('No writes through the reader');};
function fixture(t,{legacy=false,count=101,bytes=1024*1024}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-gallery-epoch-')),filename=path.join(dir,'copy.sqlite');
 const document={name:'Synthetic old revision',kind:'product',masterId:null,payload:'x'.repeat(bytes)};
 let repository,id;
 if(!legacy){repository=createProductRepository({filename,tenantId:scope.tenantId});id=repository.create(document).id;}
 const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA recursive_triggers=OFF;');
 if(legacy){
  db.exec(`CREATE TABLE products(id TEXT PRIMARY KEY,revision INTEGER,archived INTEGER,kind TEXT);
   CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,document TEXT,metadata TEXT,status TEXT,PRIMARY KEY(product_id,revision));
   CREATE TABLE form_shop_bindings(id TEXT PRIMARY KEY,shop TEXT,variant_id TEXT,product_id TEXT,product_revision INTEGER,unit_cents INTEGER,created_at TEXT);
   CREATE TABLE form_shop_binding_selections(binding_id TEXT PRIMARY KEY,options TEXT);`);
  id='cfg_legacy';db.prepare('INSERT INTO products VALUES(?,1,0,?)').run(id,'product');
  db.prepare('INSERT INTO product_revisions VALUES(?,1,?,?,?)').run(id,JSON.stringify(document),'{}','draft');
 }else createOrderIntake({database:db,tenantId:scope.tenantId,snapshot:noWrite});
 const options={orderIntake:{tenantId:scope.tenantId,bindVariants:noWrite,bindings:noWrite},adapter:{...scope,getCurrentProduct:noWrite},...scope,legacySingleStore:legacy};
 createShopProductBindingStore({database:db,...options,logger:noWrite});
 const at='2026-11-12T00:00:00Z';
 for(let i=0;i<count;i++){
  const binding='b'+i,variant=String(10000+i);
  db.prepare(`INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at${legacy?'':',tenant_id'}) VALUES(?,?,?,?,?,?,?${legacy?'':',?'})`).run(binding,scope.shopDomain,variant,id,1,269,at,...(legacy?[]:[scope.tenantId]));
  db.prepare('INSERT INTO shop_product_binding_revisions(tenant_id,shop,variant_gid,revision,product_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,evidence_read_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(scope.tenantId,scope.shopDomain,'gid://shopify/ProductVariant/'+variant,1,'gid://shopify/Product/1',scope.storeId,binding,id,1,digest(document),at,at);
  db.prepare('INSERT INTO shop_product_binding_heads VALUES(?,?,?,1)').run(scope.tenantId,scope.shopDomain,'gid://shopify/ProductVariant/'+variant);
 }
 repository?.close();
 const stats={rawReads:0,bindingReads:0,headReads:0},logs=[];
 let afterBinding=null;
 const observed=new Proxy(db,{get(target,key){
  if(key==='prepare')return sql=>{const statement=target.prepare(sql);return new Proxy(statement,{get(s,k){const value=Reflect.get(s,k,s);if(k!=='get')return typeof value==='function'?value.bind(s):value;return (...args)=>{
   if(/r\.document/.test(sql))stats.rawReads++;
   if(/p\.revision AS head/.test(sql))stats.headReads++;
   const result=value.apply(s,args);
   if(/SELECT b\.\*,s\.options/.test(sql)){stats.bindingReads++;afterBinding?.();}
   return result;
  };}});};
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 const reader=createShopProductBindingStore({database:observed,...options,readOnly:true,logger:item=>logs.push(item)});
 t.after(()=>{db.close();assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});
 return {db,id,filename,reader,stats,logs,setAfterBinding:fn=>{afterBinding=fn;}};
}
async function atSecondYield(change,work){
 const real=global.setImmediate;let calls=0;
 global.setImmediate=(fn,...args)=>real(()=>{if(++calls===2)change();fn(...args);});
 try{return await work();}finally{global.setImmediate=real;}
}
for(const legacy of [false,true])test('101 '+(legacy?'legacy':'native')+' bindings reuse two raw reads, with current heads/selections and no cross-scan cache',async t=>{
 const f=fixture(t,{legacy}),before=f.db.prepare('SELECT total_changes() AS n').get().n;
 const rows=await f.reader.listActiveForGallery();assert.equal(rows.length,101);assert.equal(f.stats.rawReads,2);
 assert.equal(f.stats.headReads,102);assert.equal(f.stats.bindingReads,101);assert.ok(rows.every(x=>x.unitCents===269&&x.productRevision===1));
 assert.equal(f.db.prepare('PRAGMA recursive_triggers').get().recursive_triggers,0);
 assert.equal(f.db.prepare('SELECT total_changes() AS n').get().n,before);
 await f.reader.listActiveForGallery();assert.equal(f.stats.rawReads,4,'each scan rereads the actual revision');
});
for(const change of ['own-metadata','foreign-metadata','replace-metadata','archive','status','kind','head'])test('legacy async gallery rejects '+change+' after a cached epoch',async t=>{
 const f=fixture(t,{legacy:true,bytes:256});let other;
 const rows=await atSecondYield(()=>{
  if(change==='foreign-metadata'){other=new DatabaseSync(f.filename);other.prepare('UPDATE product_revisions SET metadata=? WHERE product_id=?').run('{ }',f.id);other.close();}
  else if(change==='replace-metadata'){
   const old=f.db.prepare('SELECT * FROM product_revisions WHERE product_id=?').get(f.id);
   f.db.prepare('INSERT OR REPLACE INTO product_revisions VALUES(?,?,?,?,?)').run(f.id,1,old.document,'{ }',old.status);
  }else if(change==='own-metadata')f.db.prepare('UPDATE product_revisions SET metadata=? WHERE product_id=?').run('{ }',f.id);
  else if(change==='status')f.db.exec("UPDATE product_revisions SET status='archived'");
  else if(change==='kind')f.db.exec("UPDATE products SET kind='master'");
  else f.db.exec('UPDATE products SET '+(change==='archive'?'archived=1':'revision=2'));
 },()=>f.reader.listActiveForGallery());
 assert.equal(rows.length,8);assert.ok(f.logs.every(x=>x.code==='shop_binding_cfg_changed'));assert.ok(f.stats.rawReads>2||['archive','status','kind'].includes(change));
});
for(const change of ['rollback','main-schema','temp-schema','temporary-shadow'])test('gallery rechecks raw baseline after '+change+' and preserves unchanged data',async t=>{
 const f=fixture(t,{legacy:true,bytes:256});
 const rows=await atSecondYield(()=>{
  if(change==='rollback')f.db.exec("BEGIN; UPDATE product_revisions SET metadata='{ }'; ROLLBACK");
  else if(change==='main-schema')f.db.exec('CREATE INDEX epoch_test_index ON products(kind)');
  else if(change==='temp-schema')f.db.exec('CREATE TEMP TABLE unrelated(n)');
  else f.db.exec("CREATE TEMP TABLE product_revisions AS SELECT * FROM main.product_revisions; UPDATE temp.product_revisions SET metadata='{ }'");
 },()=>f.reader.listActiveForGallery());
 assert.equal(rows.length,change==='temporary-shadow'?8:101);assert.ok(f.stats.rawReads>2);
 if(change!=='temporary-shadow')assert.equal(f.stats.rawReads,3,'one fresh stamp after unrelated epoch, no repeated document parse');
});
test('a change during a cache-hit binding read is rejected and cannot replace the original baseline',async t=>{
 const f=fixture(t,{legacy:true,bytes:256});
 f.setAfterBinding(()=>{if(f.stats.bindingReads===2)f.db.exec("UPDATE product_revisions SET metadata='{ }'");});
 const rows=await f.reader.listActiveForGallery();assert.equal(rows.length,1);assert.equal(f.logs.length,100);
 assert.ok(f.logs.every(x=>x.code==='shop_binding_cfg_changed'));
});
test('native REPLACE with recursive triggers disabled cannot reuse a cached immutable revision',async t=>{
 const f=fixture(t,{bytes:256});
 const rows=await atSecondYield(()=>{
  assert.equal(f.db.prepare('PRAGMA recursive_triggers').get().recursive_triggers,0);
  const old=f.db.prepare('SELECT * FROM product_revisions WHERE product_id=? AND revision=1').get(f.id);
  const changed={...old,metadata:'{ }'},keys=Object.keys(changed);
  f.db.prepare('INSERT OR REPLACE INTO product_revisions('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>changed[k]));
  f.db.exec('PRAGMA recursive_triggers=ON');
 },()=>f.reader.listActiveForGallery());
 assert.equal(rows.length,8);assert.ok(f.logs.every(x=>x.code==='shop_binding_cfg_changed'));assert.ok(f.stats.rawReads>2);
});
