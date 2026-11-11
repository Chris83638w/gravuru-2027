import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from './repository.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {createShopProductBindingStore} from './shop-product-binding-store.mjs';

// NEW synthetic databases only. Native table/registry contracts; deliberately
// synthetic opaque payloads, not an approved product or production validator.
const scope={tenantId:'gravuru',storeId:'memory-test',shopDomain:'memory-test.myshopify.com'};
const MiB=1024*1024,productCount=40,documentBytes=2*MiB,metadataBytes=MiB/2,retainedLimit=48*MiB;
const moduleUrl=new URL('./shop-product-binding-store.mjs',import.meta.url).href;
const canonical=value=>value&&typeof value==='object'?(Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'):JSON.stringify(value);
const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const noWrite=()=>{throw Error('No binding or customer writes in this reader fixture');};
const adapter={...scope,getCurrentProduct:noWrite};
const orders={tenantId:scope.tenantId,bindVariants:noWrite,bindings:noWrite};
const registry=(db,extra={})=>createShopProductBindingStore({database:db,orderIntake:orders,adapter,...scope,...extra});
function temporary(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-gallery-memory-'));
 t.after(()=>{assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});
 return dir;
}
function insertBinding(db,{id,document,variant,index=1,legacy=false}){
 const bindingId='synthetic-binding-'+variant,variantId=String(10000+variant),at='2026-11-11T00:00:00.000Z';
 db.prepare(`INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at${legacy?'':',tenant_id'}) VALUES(?,?,?,?,?,?,?${legacy?'':',?'})`).run(bindingId,scope.shopDomain,variantId,id,1,269,at,...(legacy?[]:[scope.tenantId]));
 db.prepare('INSERT INTO shop_product_binding_revisions(tenant_id,shop,variant_gid,revision,product_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,evidence_read_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(scope.tenantId,scope.shopDomain,'gid://shopify/ProductVariant/'+variantId,1,'gid://shopify/Product/'+index,scope.storeId,bindingId,id,1,digest(document),at,at);
 db.prepare('INSERT INTO shop_product_binding_heads(tenant_id,shop,variant_gid,revision) VALUES(?,?,?,1)').run(scope.tenantId,scope.shopDomain,'gid://shopify/ProductVariant/'+variantId);
}
function seedNative(filename){
 const repository=createProductRepository({filename,tenantId:scope.tenantId,snapshotMetadata:()=>({synthetic:'m'.repeat(metadataBytes)})});
 const db=new DatabaseSync(filename);
 try{
  createOrderIntake({database:db,tenantId:scope.tenantId,snapshot:noWrite});registry(db);
  for(let i=0;i<productCount;i++){
   const record=repository.create({name:'Synthetic '+i,kind:'product',masterId:null,payload:String(i).padStart(3,'0')+'x'.repeat(documentBytes)});
   insertBinding(db,{id:record.id,document:record.document,variant:i,index:i+1});
  }
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
 }finally{db.close();repository.close();}
}
async function memoryWorker(filename,storeUrl){
 assert.equal(typeof global.gc,'function','child must use --expose-gc');
 const {createShopProductBindingStore:make}=await import(storeUrl);
 const db=new DatabaseSync(filename,{readOnly:true});
 const realImmediate=global.setImmediate,samples=[];
 try{
  const store=make({database:db,orderIntake:orders,adapter,...scope,readOnly:true,logger:noWrite});
  const beforeChanges=db.prepare('SELECT total_changes() AS n').get().n;
  global.gc();const base=process.memoryUsage().heapUsed;
  const measure=()=>{global.gc();const use=process.memoryUsage();const row={processed:Math.min(samples.length*8,productCount),heapUsed:use.heapUsed,retainedBytes:use.heapUsed-base,rss:use.rss};samples.push(row);if(row.retainedBytes>retainedLimit)throw Object.assign(Error('controlled retained-heap threshold'),{code:'retained_heap_limit'});};
  let abort;const aborted=new Promise((resolve,reject)=>{abort=reject;});
  global.setImmediate=(fn,...args)=>realImmediate(()=>{try{measure();fn(...args);}catch(error){abort(error);}});
  let settled=false;
  const finish=error=>{if(settled)return;settled=true;global.setImmediate=realImmediate;console.log(JSON.stringify({schema:'gallery-read-retention-proof/v1',outcome:error?.code||'pass',products:productCount,documentBytes,metadataBytes,retainedLimit,childOldSpaceMiB:128,samples,peakRetainedBytes:Math.max(...samples.map(x=>x.retainedBytes)),peakSampledRss:Math.max(...samples.map(x=>x.rss)),returnedBindings:error?null:productCount,sqliteChanges:db.prepare('SELECT total_changes() AS n').get().n-beforeChanges}));db.close();process.exitCode=error?23:0;};
  try{const result=await Promise.race([store.listActiveForGallery(),aborted]);assert.equal(result.length,productCount);measure();finish();}catch(error){finish(error);}
 }catch(error){global.setImmediate=realImmediate;try{db.close();}catch{}throw error;}
}
function legacyFixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-gallery-memory-')),db=new DatabaseSync(path.join(dir,'legacy.sqlite'));
 // Explicit fixed-store legacy schema: no tenant inference or migration.
 db.exec(`CREATE TABLE products(id TEXT PRIMARY KEY,revision INTEGER,archived INTEGER,kind TEXT);
 CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,document TEXT,metadata TEXT,status TEXT);
 CREATE TABLE form_shop_bindings(id TEXT PRIMARY KEY,shop TEXT,variant_id TEXT,product_id TEXT,product_revision INTEGER,unit_cents INTEGER,created_at TEXT);
 CREATE TABLE form_shop_binding_selections(binding_id TEXT PRIMARY KEY,options TEXT);`);
 t.after(()=>{db.close();assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});
 const logs=[],store=registry(db,{legacySingleStore:true,logger:item=>logs.push(item)});
 for(const [index,id] of ['cfg_a','cfg_b'].entries()){
  const document={kind:'product',masterId:null,name:'Synthetic '+id};
  db.prepare('INSERT INTO products VALUES(?,1,0,?)').run(id,'product');
  db.prepare('INSERT INTO product_revisions VALUES(?,1,?,?,?)').run(id,JSON.stringify(document),'{}','draft');
  for(let j=0;j<9;j++)insertBinding(db,{id,document,variant:index*9+j,index:index+1,legacy:true});
 }
 return {db,store,logs};
}
async function atSecondYield(work,run){
 const original=global.setImmediate;let count=0;
 global.setImmediate=(fn,...args)=>original(()=>{if(++count===2)work();fn(...args);});
 try{return await run();}finally{global.setImmediate=original;}
}

if(process.argv[2]==='--seed-memory-fixture'){
 seedNative(process.argv[3]);
 console.log(JSON.stringify({products:productCount,documentBytes,metadataBytes}));
}else if(process.argv[2]==='--memory-worker'){
 await memoryWorker(process.argv[3],process.argv[4]||moduleUrl);
}else{
 test('async gallery releases multi-MiB source strings instead of retaining one raw snapshot per product',{timeout:60000},t=>{
  const filename=path.join(temporary(t),'workshop.sqlite');seedNative(filename);
  const child=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=128',fileURLToPath(import.meta.url),'--memory-worker',filename],{encoding:'utf8',timeout:45000,maxBuffer:MiB,windowsHide:true});
  assert.equal(child.error,undefined);assert.equal(child.status,0,child.stdout+'\n'+child.stderr);
  const report=JSON.parse(child.stdout.trim());assert.equal(report.outcome,'pass');assert.equal(report.returnedBindings,productCount);assert.equal(report.sqliteChanges,0);assert.ok(report.peakRetainedBytes<retainedLimit);
  t.diagnostic(JSON.stringify(report));
 });
 test('legacy gallery still rejects metadata byte changes between bindings of the same product',async t=>{
  const {db,store,logs}=legacyFixture(t);
  const rows=await atSecondYield(()=>db.prepare('UPDATE product_revisions SET metadata=? WHERE product_id=?').run('{ }','cfg_a'),()=>store.listActiveForGallery());
  assert.equal(rows.filter(x=>x.productId==='cfg_a').length,8);assert.equal(rows.filter(x=>x.productId==='cfg_b').length,9);
  assert.deepEqual(logs.map(x=>x.code),['shop_binding_cfg_changed']);
 });
 test('legacy gallery detects another product changed during a previous product scan',async t=>{
  const {db,store,logs}=legacyFixture(t);
  const rows=await atSecondYield(()=>db.prepare('UPDATE product_revisions SET document=? WHERE product_id=?').run(JSON.stringify({kind:'product',masterId:null,name:'Changed synthetic B'}),'cfg_b'),()=>store.listActiveForGallery());
  assert.equal(rows.length,9);assert.ok(rows.every(x=>x.productId==='cfg_a'));
  assert.deepEqual(logs.map(x=>x.code),Array(9).fill('shop_binding_active_integrity'));
 });
}
