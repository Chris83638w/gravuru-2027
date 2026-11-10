import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {createShopEntry} from './shop-entry.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {createModelSlimmer} from './shop-model-slim.mjs';
import {makeProductDocument} from './product-model.mjs';
import {quote} from '../configurator/variant-m/contract.mjs';
import {openBench} from '../../scripts/customer-model-benchmark.mjs';

// Paket 1a, Teil 2: echte SQLite-Werkstatt (synthetische Prüfbank mit 80 Formaten, siehe scripts/customer-model-benchmark.mjs).
// Bytegleichheit gegen den Basisstand, Ungültigkeit nach echten Schreibvorgängen, Pause über den echten Konfi-Status.
const origin='https://app.example',shopDomain='cache-real.myshopify.com',secret='synthetic-app-secret-value',proxyPath='/apps/konfigurator',pagePath='/konfigurator/shop/';

async function harness(fn,{products=3}={}){
 const bench=openBench({designsPerSize:2,padKb:0}),{workshop,bank}=bench;
 const server=[],time=1_800_000_000_000;
 try{
  const records=[bench.record];
  for(let i=1;i<products;i++)records.push(workshop.repository.create(makeProductDocument(bank.config,{name:'Prüfprodukt '+i})));
  const formats=bank.config.familyFormats.formats,start=formats.find(f=>f.key===bank.startKey),other=formats.find(f=>f.key!==bank.startKey);
  const bindings=new Map(),variants=[];
  records.forEach((record,i)=>[start,other].forEach((format,j)=>{
   const options={size:format.key,mounting:'K00'},variantId='gid://shopify/ProductVariant/'+(5000+i*10+j),productId='gid://shopify/Product/'+(900+i);
   const binding={storeId:'acryl',tenantId:workshop.tenantId,shopDomain,shopifyProductId:productId,shopifyVariantId:variantId,productId:record.id,productRevision:1,bindingId:'binding_00000000-0000-4000-8000-0000000000'+i+j,assignmentRevision:1,options,unitCents:quote(bank.config,[],format.variants[0].designIds[0],options).unitCents};
   bindings.set(variantId+'|'+productId,binding);variants.push({binding,format,productId,variantId,designIds:format.variants[0].designIds});
  }));
  const counters={models:0},approval={catalog:true};
  const scoped={...workshop,model:(id,revision)=>{counters.models++;return workshop.model(id,revision);},sessionContext:{shopDomain},orderIntake:{...workshop.orderIntake,bindings:()=>[],catalogLiveApproval:()=>approval.catalog?{id:'synthetic-real-test'}:null}};
  const registry={resolve(identity){const b=bindings.get(identity.shopifyVariantId+'|'+identity.shopifyProductId);if(!b)throw Object.assign(Error(),{status:404,code:'shop_binding_active_not_found'});return structuredClone(b);}};
  const store={storeId:'acryl',registry,workshop:scoped,apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html',cart:async()=>{throw Error('nicht im Test');},catalogLiveOrders:true};
  const base={origin,shopDomain,secret,stores:[store],proxyPath,pagePath,clock:()=>time,limits:{startPerMinute:100000,requestsPerMinute:100000},logger:()=>{}};
  const slimmerFor=()=>createModelSlimmer({fetchJson:null,surfaceSwaps:new Map(),fontUrl:hash=>pagePath+'schriften/'+hash+'.json'});
  const entries={on:createShopEntry({...base,modelSlimmer:slimmerFor(),modelResponseCache:true}),off:createShopEntry({...base,modelSlimmer:slimmerFor()})};
  const client=entry=>{
   const srv=http.createServer((req,res)=>{const url=new URL(req.url,origin);if(!entry.matches(url.pathname)){res.writeHead(404).end();return;}entry.handle(req,res,url);});
   srv.listen(0,'127.0.0.1');server.push(srv);
   return {ready:once(srv,'listening'),request:(p,headers={})=>new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:srv.address().port,path:p,method:'GET',headers:{Host:'app.example','X-Forwarded-Proto':'https',...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const body=Buffer.concat(chunks);let data=null;try{data=JSON.parse(body);}catch{}resolve({status:res.statusCode,headers:res.headers,body,data});});});req.on('error',reject);req.end();
   })};
  };
  const on=client(entries.on),off=client(entries.off);await Promise.all([on.ready,off.ready]);
  const open=async variant=>{
   const search=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(time/1000)),logged_in_customer_id:'',product:variant.productId.split('/').at(-1),variant:variant.variantId.split('/').at(-1)});
   search.set('signature',appProxySignature(search,secret));
   const r=await off.request(proxyPath+'/start?'+search);assert.equal(r.status,302,r.body.toString());
   return {'X-Gravuru-Shop-Session':new URLSearchParams(new URL(r.headers.location).hash.slice(1)).get('s')};
  };
  const both=async(headers,query='')=>{
   const a=await on.request('/api/shop-entry/model'+query,headers),b=await off.request('/api/shop-entry/model'+query,headers);
   assert.equal(a.status,b.status,a.body.toString().slice(0,300));assert.equal(a.data?.error?.code,b.data?.error?.code);
   if(a.status===200){assert.ok(a.body.equals(b.body),'Antwortkörper mit/ohne Speicher müssen bytegleich sein');assert.equal(a.headers['content-length'],b.headers['content-length']);assert.equal(a.headers['cache-control'],b.headers['cache-control']);}
   return a;
  };
  const calls=async work=>{const before=counters.models;const result=await work();return {result,calls:counters.models-before};};
  const model=(headers,query='')=>on.request('/api/shop-entry/model'+query,headers);
  await fn({bench,workshop,records,variants,counters,approval,open,both,calls,model,on,off,file:path.join(bench.dir,'native.sqlite')});
 }finally{for(const srv of server){srv.closeAllConnections();await new Promise(resolve=>srv.close(resolve));}bench.close();}
}

test('three products x with/without design x two option sets: the stored response equals the uncached one byte for byte',()=>harness(async({variants,open,both,calls,model})=>{
 assert.equal(variants.length,6);
 let checked=0;
 for(const variant of variants){
  const headers=await open(variant);
  for(const query of ['','?design='+variant.designIds[1]]){
   const miss=await both(headers,query);
   assert.equal(miss.status,200);assert.ok(miss.data.startPreview?.target,'Startvorschau mit sitzungsgebundenem Ziel');
   const hit=await calls(()=>model(headers,query));
   assert.equal(hit.calls,0,'Treffer baut das Modell nicht');
   assert.ok(hit.result.body.equals(miss.body),'Treffer bytegleich zum ersten Abruf');
   const again=await both(headers,query);assert.ok(again.body.equals(miss.body));
   checked++;
  }
 }
 assert.equal(checked,12);
}));

test('the start-preview target is issued per session: two sessions share one entry but never one token',()=>harness(async({variants,open,both,calls,model})=>{
 const variant=variants[0],a=await open(variant),b=await open(variant);
 const first=await both(a);await both(b);
 const hitA=await calls(()=>model(a)),hitB=await calls(()=>model(b));
 assert.equal(hitA.calls+hitB.calls,0);
 assert.notEqual(hitA.result.data.startPreview.target,hitB.result.data.startPreview.target);
 assert.equal(hitA.result.data.startPreview.target,first.data.startPreview.target,'dieselbe Sitzung bekommt dasselbe Token');
 assert.deepEqual({...hitA.result.data,startPreview:null,expiresAt:null},{...hitB.result.data,startPreview:null,expiresAt:null},'übrige Antwort gleich (Sitzungsfelder ausgenommen)');
 assert.match(hitB.result.data.startPreview.target,/^sgt1\./);
}));

test('real writes on the product database invalidate the entries: new revision, publish, archive, copy, foreign connection, schema change',async()=>{
 const cases=[
  ['neue Revision speichern',({workshop,records})=>{const r=workshop.repository.get(records[0].id);workshop.repository.save(r.id,structuredClone(r.document),r.revision);}],
  ['Veröffentlichung',({workshop,records})=>{workshop.repository.publish(records[0].id,{expectedRevision:workshop.repository.get(records[0].id).revision});}],
  ['Archivierung',({workshop,records})=>{workshop.repository.setArchived(records[1].id,{expectedRevision:workshop.repository.get(records[1].id).revision,archived:true});}],
  ['anderes Produkt anlegen',({workshop,records})=>{workshop.repository.copy(records[2].id,{expectedRevision:workshop.repository.get(records[2].id).revision,name:'Kopie'});}],
  ['fremde Verbindung schreibt',({file})=>{const db=new DatabaseSync(file);db.exec('CREATE TABLE IF NOT EXISTS zz_fremd(x)');db.exec('INSERT INTO zz_fremd VALUES(1)');db.close();}],
  ['Schemaänderung durch fremde Verbindung',({file})=>{const db=new DatabaseSync(file);db.exec('CREATE TABLE zz_schema(x)');db.close();}],
 ];
 for(const [name,write] of cases)await harness(async context=>{
  const {variants,open,both,calls,model}=context;
  const variant=variants[0],headers=await open(variant);
  await both(headers);
  assert.equal((await calls(()=>model(headers))).calls,0,name+': vorher Treffer');
  write(context);
  const after=await calls(()=>model(headers));
  assert.ok(after.calls>=1,name+': nächster Abruf wird frisch gebaut');
  assert.equal(after.result.status,200);
  assert.equal((await both(headers)).status,200);
  assert.equal((await calls(()=>model(headers))).calls,0,name+': danach wieder Treffer');
 });
});

test('a foreign write that is rolled back leaves nothing to invalidate; the committed one does',()=>harness(async({variants,open,both,calls,model,file})=>{
 const headers=await open(variants[0]);await both(headers);
 const db=new DatabaseSync(file);
 try{
  db.exec('CREATE TABLE zz_rollback(x)');
  assert.ok((await calls(()=>model(headers))).calls>=1,'festgeschriebene Schemaänderung');
  await both(headers);
  assert.equal((await calls(()=>model(headers))).calls,0);
  db.exec('BEGIN');db.exec('INSERT INTO zz_rollback VALUES(1)');db.exec('ROLLBACK');
  assert.equal((await calls(()=>model(headers))).calls,0,'zurückgerollt und nie festgeschrieben: Stand unverändert');
  db.exec('INSERT INTO zz_rollback VALUES(2)');
  assert.ok((await calls(()=>model(headers))).calls>=1,'festgeschriebener Schreibvorgang');
  await both(headers);
 }finally{db.close();}
}));

test('pause and approval come from live state: a warm entry answers 423 / 404 at once and recovers',()=>harness(async({workshop,variants,approval,open,both})=>{
 const variant=variants[0],headers=await open(variant);
 await both(headers);
 const id=variant.binding.productId;
 workshop.konfis.set(id,{to:'paused',expectedStatus:'draft',productRevision:1,actor:'test'});
 const paused=await both(headers);assert.equal(paused.status,423);assert.equal(paused.data.error.code,'konfi_paused');
 workshop.konfis.set(id,{to:'released',expectedStatus:'paused',productRevision:1,actor:'test'});
 const back=await both(headers);assert.equal(back.status,200);
 approval.catalog=false;
 const revoked=await both(headers);assert.equal(revoked.status,404);assert.equal(revoked.data.error.code,'shop_entry_catalog_release');
 approval.catalog=true;
 assert.equal((await both(headers)).status,200);
}));

test('a pinned old revision still answers like the uncached path after a newer revision exists',()=>harness(async({workshop,records,variants,open,both,calls,model})=>{
 const headers=await open(variants[0]);
 const before=await both(headers);
 const r=workshop.repository.get(records[0].id),document=structuredClone(r.document);document.name='Neu';
 const saved=workshop.repository.save(r.id,document,r.revision);assert.equal(saved.revision,2);
 const after=await calls(()=>model(headers));
 assert.ok(after.calls>=1);assert.ok(after.result.body.equals(before.body),'feste Revision 1 bleibt unverändert');
 await both(headers);
 assert.equal((await calls(()=>model(headers))).calls,0);
}));
