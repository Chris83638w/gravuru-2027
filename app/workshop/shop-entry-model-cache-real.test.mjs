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
import {createMotifSearchStats} from './motif-search-stats.mjs';
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

test('real changes of THIS product (new revision, publish, archive) and of the schema apply at once',async()=>{
 const cases=[
  ['neue Revision speichern',({workshop,records})=>{const r=workshop.repository.get(records[0].id);workshop.repository.save(r.id,structuredClone(r.document),r.revision);}],
  ['Veröffentlichung',({workshop,records})=>{workshop.repository.publish(records[0].id,{expectedRevision:workshop.repository.get(records[0].id).revision});}],
  ['Archivierung',({workshop,records})=>{workshop.repository.setArchived(records[0].id,{expectedRevision:workshop.repository.get(records[0].id).revision,archived:true});}],
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
  assert.equal((await both(headers)).status,200,name+': Bytegleichheit nach der Änderung');
  assert.equal((await calls(()=>model(headers))).calls,0,name+': danach wieder Treffer');
 });
});

// Zufälliger Suchtext nur aus Buchstaben: Die Auswertung verwirft Suchtexte mit längeren Ziffernfolgen (normalizedMotifQuery),
// und `toString(36)` lieferte in rund 0,8 % der Läufe eine solche Folge – dann schlug die Prüfung unten grundlos fehl.
const letters=()=>Math.random().toString(36).replace(/[^a-z]/g,'')||'x';
test('real customer-side and other-product writes into the same database file leave a warm entry alone',()=>harness(async({workshop,records,variants,open,both,calls,model,file})=>{
 const stats=createMotifSearchStats({filename:file,tenantId:workshop.tenantId}),side=new DatabaseSync(file);
 side.exec('CREATE TABLE IF NOT EXISTS zz_fremd(x)');// Schemaänderungen verwerfen alles (eigener Test); hier nur Zeilen.
 const headers=await open(variants[0]),otherHeaders=await open(variants[2]);
 const first=await both(headers);await both(otherHeaders);
 try{
  const writes=[
   ['Motivsuche protokolliert (echte Tabelle motif_search_daily)',()=>{assert.equal(stats.record({query:'Eiche '+letters(),resultCount:3,group:'Prüfgruppe'}),true);}],
   ['Motivsuche, viele Eingaben hintereinander',()=>{for(let i=0;i<20;i++)stats.record({query:'Tanne '+i+' '+letters(),resultCount:0,group:'Prüfgruppe'});}],
   ['Konfi-Status eines ANDEREN Produkts',()=>{workshop.konfis.set(records[1].id,{to:'paused',expectedStatus:'draft',productRevision:1,actor:'test'});}],
   ['anderes Produkt: neue Revision',()=>{const r=workshop.repository.get(records[1].id);workshop.repository.save(r.id,structuredClone(r.document),r.revision);}],
   ['anderes Produkt: Veröffentlichung',()=>{workshop.repository.publish(records[2].id,{expectedRevision:workshop.repository.get(records[2].id).revision});}],
   ['anderes Produkt: Archivierung',()=>{workshop.repository.setArchived(records[2].id,{expectedRevision:workshop.repository.get(records[2].id).revision,archived:true});}],
   ['Kopie eines anderen Produkts anlegen',()=>{workshop.repository.copy(records[1].id,{expectedRevision:workshop.repository.get(records[1].id).revision,name:'Kopie'});}],
   ['fremde Verbindung fügt Zeilen in eine eigene Tabelle ein',()=>{side.exec('INSERT INTO zz_fremd VALUES(1)');}],
   ['zurückgerollter Versuch einer fremden Verbindung',()=>{side.exec('BEGIN');side.exec('INSERT INTO zz_fremd VALUES(2)');side.exec('ROLLBACK');}],
  ];
  for(const [name,write] of writes){
   write();
   const hit=await calls(()=>model(headers));
   assert.equal(hit.calls,0,name+': weiter Treffer');
   assert.ok(hit.result.body.equals(first.body),name+': Antwort unverändert');
  }
  // Der Zustand des ANDEREN Produkts bleibt ein eigener: sein Eintrag ist pausiert (423), dieser läuft weiter.
  assert.equal((await both(headers)).status,200);
  const paused=await both(otherHeaders);assert.equal(paused.status,423,'das pausierte andere Produkt antwortet trotz warmem Eintrag 423');
 }finally{stats.close();side.close();}
}));

test('changed options of the same assignment never get the old entry (real model, only options differ in the key)',()=>harness(async({variants,open,both,calls,model})=>{
 const [a,b]=variants,headers=await open(a);
 const size=r=>r.data.model.universal.profile.optionGroups.find(g=>g.id==='size').defaultValueId;
 const old=await both(headers);assert.equal(size(old),a.binding.options.size);
 assert.equal((await calls(()=>model(headers))).calls,0);
 a.binding.options={...a.binding.options,size:b.binding.options.size};
 const changed=await both(headers);
 assert.equal(size(changed),b.binding.options.size,'Antwort folgt den neuen Optionen');
 assert.ok(!changed.body.equals(old.body));
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
