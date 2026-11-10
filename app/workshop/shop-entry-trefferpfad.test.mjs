import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {openBench,benchEntry,liveLikeFixture} from '../../scripts/customer-model-benchmark.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {createPublicDesignPreviews} from './public-design-previews.mjs';

// Paket 1a-2: Trefferpfad des Modellabrufs mit echter Zuordnungsablage, echter Katalog-Freigabe und öffentlichem Vorschauspeicher
// (live-naher Aufbau aus scripts/customer-model-benchmark.mjs, klein). Jeder Fall vergleicht mit dem Weg ohne Antwortspeicher.
const origin='https://app.example',shopDomain='bench-synthetic.myshopify.com',secret='synthetic-benchmark-secret',proxyPath='/apps/konfigurator';
const productId='9000000001',variantId='9000000002';

async function harness(fn){
 const bench=openBench({designsPerSize:2,padKb:0}),{workshop}=bench,servers=[];
 try{
  bench.live={...liveLikeFixture(bench,{variants:90}),previewDir:path.join(bench.dir,'pp')};fs.mkdirSync(bench.live.previewDir);
  const counters={models:0},realModel=workshop.model;workshop.model=(id,revision)=>{counters.models++;return realModel(id,revision);};
  const time=Date.now(),clock=()=>time;
  const mk=cache=>{const entry=benchEntry(bench,{modelResponseCache:cache,liveLike:true,clock}).create(),srv=http.createServer((req,res)=>{const url=new URL(req.url,origin);if(!entry.matches(url.pathname)){res.writeHead(404).end();return;}entry.handle(req,res,url);});srv.listen(0,'127.0.0.1');servers.push(srv);return {srv,ready:once(srv,'listening'),request:p=>null};};
  const on=mk(true),off=mk(false);await Promise.all([on.ready,off.ready]);
  const call=(c,p,headers)=>new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port:c.srv.address().port,path:p,headers:{Host:'app.example','X-Forwarded-Proto':'https',...headers}},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>{const body=Buffer.concat(chunks);let data=null;try{data=JSON.parse(body);}catch{}resolve({status:res.statusCode,headers:res.headers,body,data});});});r.on('error',reject);r.end();});
  const open=async()=>{
   const search=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(time/1000)),logged_in_customer_id:'',product:productId,variant:variantId});search.set('signature',appProxySignature(search,secret));
   const r=await call(off,proxyPath+'/start?'+search,{});assert.equal(r.status,302,r.body.toString());
   return {'X-Gravuru-Shop-Session':new URLSearchParams(new URL(r.headers.location).hash.slice(1)).get('s')};
  };
  // Beide Wege nacheinander; Status, Fehlercode und (bei 200) Körper müssen gleich sein.
  const both=async(headers,query='')=>{
   const a=await call(on,'/api/shop-entry/model'+query,headers),b=await call(off,'/api/shop-entry/model'+query,headers);
   assert.equal(a.status,b.status,a.body.toString().slice(0,300));assert.equal(a.data?.error?.code,b.data?.error?.code);assert.equal(a.data?.error?.message,b.data?.error?.message);
   if(a.status===200)assert.ok(a.body.equals(b.body),'Körper mit/ohne Speicher bytegleich');
   return a;
  };
  const sideDb=()=>new DatabaseSync(path.join(bench.dir,'native.sqlite'));
  await fn({bench,workshop,counters,open,both,on:(h,q='')=>call(on,'/api/shop-entry/model'+q,h),sideDb});
 }finally{for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}bench.close();}
}

test('hit path: body equals the uncached path, the model is not rebuilt, previews attach as before',()=>harness(async({open,both,on,counters})=>{
 const headers=await open(),first=await both(headers);assert.equal(first.status,200);assert.ok(first.data.startPreview?.target);
 const before=counters.models;
 for(let i=0;i<3;i++){const hit=await on(headers);assert.equal(hit.status,200);assert.ok(hit.body.equals(first.body));}
 assert.equal(counters.models,before,'Treffer baut das Modell nicht (auch nicht für die öffentliche Startvorschau)');
 const again=await both(headers);assert.ok(again.body.equals(first.body));
}));

test('pause and approval are decided per request: a warm entry answers 423 / the same error as without memory, then recovers',()=>harness(async({open,both,workshop,bench,sideDb})=>{
 const headers=await open(),id=bench.record.id;await both(headers);await both(headers);
 workshop.konfis.set(id,{to:'paused',expectedStatus:'draft',productRevision:1,actor:'test'});
 const paused=await both(headers);assert.equal(paused.status,423);assert.equal(paused.data.error.code,'konfi_paused');
 workshop.konfis.set(id,{to:'released',expectedStatus:'paused',productRevision:1,actor:'test'});
 assert.equal((await both(headers)).status,200);
 // Freigabe mit anderem Belegstand (Trigger der Freigabetabelle fallen lassen, Zeile ändern): Fehler wie ohne Speicher, sofort.
 const db=sideDb();const old=db.prepare('SELECT document_sha256 FROM catalog_live_order_approvals').get().document_sha256;
 db.exec("UPDATE catalog_live_order_approvals SET document_sha256='"+'0'.repeat(64)+"'");
 const broken=await both(headers);assert.notEqual(broken.status,200);
 db.exec("UPDATE catalog_live_order_approvals SET document_sha256='"+old+"'");db.close();
 assert.equal((await both(headers)).status,200,'mit der richtigen Freigabe wieder 200');
}));

test('a changed document under a dropped trigger is detected like without memory (schema change drops every entry)',()=>harness(async({open,both,sideDb,bench})=>{
 const headers=await open();await both(headers);await both(headers);
 const db=sideDb();db.exec('DROP TRIGGER immutable_revision_update');
 db.prepare('UPDATE product_revisions SET document=json_set(document,\'$.name\',?) WHERE product_id=? AND revision=1').run('verändert',bench.record.id);db.close();
 const changed=await both(headers);assert.notEqual(changed.status,200);
 assert.equal(changed.data.error.code,'shop_binding_active_integrity');
}));

test('archiving the product fails like without memory, also with a warm memo',()=>harness(async({open,both,workshop,bench})=>{
 const headers=await open();await both(headers);await both(headers);
 const rec=workshop.repository.get(bench.record.id);
 workshop.repository.setArchived(rec.id,{expectedRevision:rec.revision,archived:true});
 const archived=await both(headers);assert.notEqual(archived.status,200);
}));

test('the public preview digest of a held frozen model is remembered per object; a mutable model is hashed every time',()=>{
 const seen=[],cache={rendererFingerprint:'r',get:id=>{seen.push(id.source);return null;}};
 const deepFreeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(deepFreeze);Object.freeze(v);}return v;};
 const base={configuration:{id:'cfg_a',revision:1},key:'acryl',universal:{profile:{designs:[{id:'d1',objects:[],themes:[]}],optionGroups:[]},familyFormats:{fixedSize:true}}};
 const binding={storeId:'s',tenantId:'t',shopDomain:'x',shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/2',productId:'cfg_a',productRevision:1,bindingId:'b',assignmentRevision:1,options:{},unitCents:1};
 const store={storeId:'s',workshop:{tenantId:'t'}};
 const previews=createPublicDesignPreviews({cache,resolve:()=>({store,binding}),modelFor:()=>structuredClone(base),checkBinding:()=>{},gallery:{start:()=>({target:'t'})},previewUrl:h=>h});
 const item={shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId,designId:'d1'};
 const withModel=model=>previews.attach({items:[item]},{modelFor:()=>model});
 const frozen=deepFreeze(structuredClone(base));
 withModel(frozen);withModel(frozen);
 const plain=previews.attach({items:[item]});
 assert.equal(seen.length,3);assert.equal(seen[0],seen[1]);assert.equal(seen[0],seen[2],'gleiche Prüfsumme wie ohne Merken');
 seen.length=0;
 const mutable=structuredClone(base);withModel(mutable);mutable.universal.profile.designs[0].themes.push('neu');withModel(mutable);
 assert.equal(seen.length,2);assert.notEqual(seen[0],seen[1],'veränderliches Modell wird bei jedem Abruf neu gehasht');
 assert.ok(plain);
});
