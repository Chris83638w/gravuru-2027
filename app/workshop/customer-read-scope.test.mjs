import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {withCustomerReadScope,customerDatabaseRead,customerReadMemo} from './customer-read-scope.mjs';
import {createProductRepository} from './repository.mjs';
import {withCartTiming,cartTimingHeaders} from './shop-cart-timing.mjs';

test('interleaved customer phases isolate tenant/store/revision and report the bounded memo',async()=>{
 const owner={},events=[];let reads=0;
 const read=key=>customerReadMemo(owner,key,()=>({key,n:++reads}));
 const customer=key=>withCartTiming('theme-cart',e=>events.push(e),()=>withCustomerReadScope(async()=>{
  const first=read(key);assert.equal(read(key),first);
  assert.notEqual(read(key+':revision2'),first);
  await Promise.resolve();
  withCustomerReadScope(()=>{const next=read(key);assert.notEqual(next,first);assert.equal(read(key),next);});
  cartTimingHeaders(200);
 }));
 await Promise.all([customer('tenant-a:store-a:product:1'),customer('tenant-b:store-b:product:1')]);
 assert.equal(reads,6);assert.ok(events.every(e=>e.counts.customer_read_hit===2));
 await withCartTiming('theme-cart',e=>events.push(e),()=>withCustomerReadScope(()=>{
  for(let i=0;i<18;i++)read('key:'+i);
  read('key:0');read('key:17');cartTimingHeaders(200);
 }));
 assert.equal(events.at(-1).counts.customer_read_overflow,3);
 assert.equal(events.at(-1).counts.customer_read_hit,1);
 assert.equal(events.at(-1).steps.customer_read_freeze.calls,19);
});

test('read phases reuse detached immutable JSON only synchronously; callers outside keep normal semantics',()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE value(body TEXT); INSERT INTO value VALUES('{\"price\":1999,\"options\":{\"logo\":true}}')");
 let reads=0;const get=()=>customerDatabaseRead(db,'value',()=>{reads++;return JSON.parse(db.prepare('SELECT body FROM value').get().body);});
 try{
  withCustomerReadScope(()=>{const first=get();assert.equal(first,get());assert.throws(()=>{first.options.logo=false;},TypeError);assert.equal(get().options.logo,true);withCustomerReadScope(()=>assert.equal(get(),first));});
  assert.equal(reads,1);const outside=get();outside.price=0;assert.equal(get().price,1999);assert.equal(reads,3);
  withCustomerReadScope(()=>get());assert.equal(reads,4);
 }finally{db.close();}
});
test('await boundaries do not retain a read phase or leak into a concurrent request',async()=>{
 const owner={},read=()=>({}),first=await withCustomerReadScope(async()=>{
  const before=customerReadMemo(owner,'key',read);assert.equal(before,customerReadMemo(owner,'key',read));
  await Promise.resolve();assert.notEqual(before,customerReadMemo(owner,'key',read));return before;
 });
 withCustomerReadScope(()=>assert.notEqual(first,customerReadMemo(owner,'key',read)));
});
test('same-connection writes and rolled-back write epochs force a full read again',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE value(n); INSERT INTO value VALUES(1)');
 let reads=0;const get=()=>customerDatabaseRead(db,'value',()=>{reads++;return db.prepare('SELECT n FROM value').get().n;});
 try{withCustomerReadScope(()=>{
  assert.equal(get(),1);assert.equal(get(),1);db.exec('UPDATE value SET n=2');assert.equal(get(),2);
  db.exec('BEGIN; UPDATE value SET n=3; ROLLBACK');assert.equal(get(),2);assert.equal(reads,3);
 });}finally{db.close();}
});
test('committed writes on another connection invalidate the phase without opening a read transaction',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-customer-epoch-')),file=path.join(dir,'db.sqlite'),a=new DatabaseSync(file),b=new DatabaseSync(file);
 a.exec('PRAGMA journal_mode=WAL; CREATE TABLE value(n); INSERT INTO value VALUES(1)');
 let reads=0;const get=()=>customerDatabaseRead(a,'value',()=>{reads++;return a.prepare('SELECT n FROM value').get().n;});
 try{withCustomerReadScope(()=>{
  assert.equal(get(),1);assert.equal(a.isTransaction,false);b.exec('UPDATE value SET n=2');assert.equal(get(),2);assert.equal(reads,2);
 });}finally{a.close();b.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('ordinary and temporary schema changes including a shadow table invalidate the phase',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE value(n); INSERT INTO value VALUES(1)');
 let reads=0;const get=()=>customerDatabaseRead(db,'value',()=>{reads++;return db.prepare('SELECT n FROM value').get().n;});
 try{withCustomerReadScope(()=>{
  assert.equal(get(),1);db.exec('CREATE INDEX value_index ON value(n)');assert.equal(get(),1);
  db.exec('CREATE TEMP TABLE value(n); INSERT INTO temp.value VALUES(9)');assert.equal(get(),9);
  db.exec('DROP TABLE temp.value');assert.equal(get(),1);assert.equal(reads,4);
 });}finally{db.close();}
});
test('a write inside the synchronous loader is detected before any value can be reused',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE value(n); INSERT INTO value VALUES(1)');
 try{assert.throws(()=>withCustomerReadScope(()=>customerDatabaseRead(db,'value',()=>{const value=db.prepare('SELECT n FROM value').get();db.exec('UPDATE value SET n=2');return value;})),{code:'customer_read_changed'});
 assert.equal(withCustomerReadScope(()=>customerDatabaseRead(db,'value',()=>db.prepare('SELECT n FROM value').get())).n,2);
 }finally{db.close();}
});
test('native repository preserves previous revisions and rechecks source changes in the same phase',()=>{
 const repository=createProductRepository({filename:':memory:',tenantId:'gravuru'});
 const doc={name:'Test',kind:'product',masterId:null,config:{basePriceCents:1999}},created=repository.create(doc);
 try{withCustomerReadScope(()=>{
  const old=repository.get(created.id,{revision:1});assert.equal(repository.get(created.id,{revision:1}),old);
  assert.throws(()=>{old.document.config.basePriceCents=0;},TypeError);
  const next=repository.save(created.id,{...doc,name:'Next'},1);assert.equal(next.revision,2);
  const current=repository.get(created.id);assert.equal(current.document.name,'Next');assert.equal(repository.get(created.id,{revision:1}).document.config.basePriceCents,1999);
  assert.notEqual(repository.get(created.id,{revision:1}),old);
 });const ordinary=repository.get(created.id);ordinary.document.name='caller copy';assert.equal(repository.get(created.id).document.name,'Next');
 }finally{repository.close();}
});
