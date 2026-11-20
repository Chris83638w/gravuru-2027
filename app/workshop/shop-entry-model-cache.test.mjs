import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createShopEntry} from './shop-entry.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {createModelSlimmer} from './shop-model-slim.mjs';
import {MODULE_PROFILE_SCHEMA} from '../configurator/variant-m/module-profile.mjs';
import {quote} from '../configurator/variant-m/contract.mjs';
import {syntheticBank} from '../../scripts/customer-model-benchmark.mjs';
import {universalWithDesignParts} from './ui/shop-design-switch.mjs';
import {fixedSignConfig} from './test-fixtures/door-sign-all-sizes.mjs';

// Paket 1a, Teil 1: Antwortspeicher des Kundenmodells mit einer synthetischen Werkstatt, deren Datenbankstand,
// Pause, Freigaben und Zuordnung der Test steuert. Je Test laufen ZWEI Einstiege über dieselbe Werkstatt und
// dieselbe Sitzung: einer mit Antwortspeicher, einer ohne (= Basisstand). Beide müssen dieselbe Antwort geben.
// Teil 2 (echte SQLite-Werkstatt, Bytegleichheit, echte Schreibvorgänge) steht in shop-entry-model-cache-real.test.mjs.
const origin='https://app.example',shopDomain='cache-test.myshopify.com',secret='synthetic-app-secret-value',proxyPath='/apps/konfigurator',pagePath='/konfigurator/shop/';
const PRODUCT='cfg_00000000-0000-4000-8000-000000000001',productGid='gid://shopify/Product/101',variantGid='gid://shopify/ProductVariant/201';
const sha=c=>c.repeat(64),assetA=sha('a'),assetB=sha('b');
const DOORBELL={schema:'gravuru-doorbell/v1'};

let bankCache=null;
const bank=()=>bankCache??=syntheticBank({designsPerSize:2,padKb:0});
// Flavor „bank“: echte Familienformate (Katalogfreigabe, Startvorschau, Designauswahl). Flavor „plain“: kleines Modell mit
// ausgeschalteter Designauswahl (keine Startvorschau), für Funkklingel-, Verschlanker- und Grafikfälle.
function state(flavor='bank'){
 const s={flavor,time:1_800_000_000_000,epoch:1,readEpoch:true,product:{headRevision:3,headPublishedRevision:null,archived:false,schemaVersion:1},stateReads:0,paused:false,catalogApproved:true,doorbellApproved:true,modelCalls:0,modelError:null,onModel:null,docConfig:{},modelExtra:{},bindings:new Map()};
 const b=bank(),format=f=>b.config.familyFormats.formats.find(x=>x.key===f),other=b.config.familyFormats.formats.find(x=>x.key!==b.startKey);
 s.startKey=b.startKey;s.otherKey=other.key;s.designs=format(b.startKey).variants[0].designIds;
 const optionsFor={201:flavor==='bank'?{size:b.startKey,mounting:'K00'}:{mounting:'K00'},202:flavor==='bank'?{size:other.key,mounting:'K00'}:{mounting:'B02'}};
 const unit=(options)=>flavor==='bank'?quote(b.config,[],format(options.size).variants[0].designIds[0],options).unitCents:1148;
 const binding=(n)=>({storeId:'acryl',tenantId:'gravuru',shopDomain,shopifyProductId:productGid,shopifyVariantId:'gid://shopify/ProductVariant/'+n,productId:PRODUCT,productRevision:3,bindingId:'binding_00000000-0000-4000-8000-00000000000'+(n%10),assignmentRevision:1,options:optionsFor[n],unitCents:unit(optionsFor[n])});
 s.bindings.set(variantGid,binding(201));
 s.bindings.set('gid://shopify/ProductVariant/202',binding(202));
 if(flavor==='bank')s.docConfig=b.config;
 const plain=()=>({profile:{id:'p',revision:PRODUCT+':3',defaultDesignId:'d1',optionGroups:[{id:'mounting',name:'Befestigung',defaultValueId:'K00',values:[{id:'K00',label:'Ohne'},{id:'B02',label:'Mit'}]}],designs:[{id:'d1',objects:[{id:'p1',type:'photoSlot',photoMaskAssetId:assetA}]},{id:'d2',objects:[]}]},localResources:{fonts:{},motifs:[{key:'artwork',svgFragment:'<image href="/api/workshop/design-assets/'+assetB+'/preview.svg"/>'}],photoExamples:[]},moduleProfile:{schema:MODULE_PROFILE_SCHEMA,id:'fixed-design',revision:1,modules:{options:true,designs:false,text:true,motifs:true,photo:true,logo:true,colors:false}}});
 s.model=()=>({key:'acryl',name:'Prüfprodukt',configuration:{id:PRODUCT,revision:3},galleryCategoryIds:[],legacy:{designs:[]},universal:{...(flavor==='bank'?structuredClone(b.config):plain()),...s.modelExtra}});
 return s;
}
function workshop(s,{withEpoch=true,withPause=true,withState=true}={}){
 const assets=new Map([[assetA,Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],[assetB,Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')]]);
 return {tenantId:'gravuru',sessionContext:{shopDomain},
  model:(id,rev)=>{
   s.modelCalls++;
   if(s.paused)throw Object.assign(Error('pausiert'),{status:423});
   if(s.modelError)throw s.modelError;
   if(id!==PRODUCT||rev!==3)throw Object.assign(Error('fehlt'),{status:404});
   s.onModel?.();return structuredClone(s.model());
  },
  galleryModel:(id,rev)=>{const m=s.model();return {key:m.key,configuration:m.configuration,galleryCategoryIds:m.galleryCategoryIds,universal:m.universal};},
  repository:{get:id=>{s.docReads=(s.docReads||0)+1;if(s.missing)throw Object.assign(Error('Konfiguration nicht gefunden.'),{status:404,code:'not_found'});return {id,revision:3,status:'draft',document:{config:s.docConfig}};},
   ...(withState?{revisionState:(id,{revision}={})=>{
    s.stateReads++;
    if(s.missing)throw Object.assign(Error('Konfiguration nicht gefunden.'),{status:404,code:'not_found'});
    if(id!==PRODUCT)throw Object.assign(Error('Konfiguration nicht gefunden.'),{status:404,code:'not_found'});
    if(revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1))throw Object.assign(Error('ungültig'),{status:422,code:'invalid_revision'});
    if((revision??3)!==3)throw Object.assign(Error('Revision nicht gefunden.'),{status:404,code:'revision_not_found'});
    return {tenantId:'gravuru',id,revision:3,publishedRevision:null,status:'draft',updatedAt:'x',...s.product};
   }}:{}),
   ...(withEpoch?{readEpoch:()=>{if(!s.readEpoch)throw Error('Stand nicht lesbar');return 'epoch-'+s.epoch;}}:{})},
  ...(withPause?{konfis:{paused:id=>id===PRODUCT&&s.paused}}:{}),
  assets:{read:id=>{if(!assets.has(id))throw Object.assign(Error('fehlt'),{status:404});return assets.get(id);}},
  customerDrafts:{acrylicDrafts:{get(){throw Error('nicht im Test');},create(){throw Error('nicht im Test');},save(){throw Error('nicht im Test');}},review(){throw Error('nicht im Test');},cartConfigurations:{forDraft:()=>null}},
  orderIntake:{bindings:()=>[],catalogLiveApproval:()=>s.catalogApproved?{id:'catalog-approval'}:null,doorbellLiveApproval:()=>s.doorbellApproved?{id:'doorbell-approval'}:null}};
}
function storeFor(s,workshopOptions){
 const registry={resolve(identity){const b=s.bindings.get(identity.shopifyVariantId);if(!b||b.shopifyProductId!==identity.shopifyProductId)throw Object.assign(Error(),{status:404,code:'shop_binding_active_not_found'});return structuredClone(b);}};
 return {storeId:'acryl',registry,workshop:workshop(s,workshopOptions),apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html',cart:async()=>{throw Error('nicht im Test');},catalogLiveOrders:true,doorbellLiveOrders:true};
}
const signed=(s,params)=>{
 const search=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(s.time/1000)),logged_in_customer_id:'',...params});
 search.set('signature',appProxySignature(search,secret));return search;
};
// `options.cache`: false | true | Grenzen; `workshopOptions`: Fähigkeiten der Werkstatt; `slimmer`: Verschlanker beider Einstiege.
async function run(fn,{flavor='bank',setup=()=>{},cache=true,workshopOptions,slimmer=null,limits={},logger=()=>{}}={}){
 const s=state(flavor);setup(s);
 const store=storeFor(s,workshopOptions);
 const base={origin,shopDomain,secret,stores:[store],proxyPath,pagePath,clock:()=>s.time,limits:{startPerMinute:1000,requestsPerMinute:1000,...limits},modelSlimmer:slimmer,logger};
 const entries={on:createShopEntry({...base,modelResponseCache:cache}),off:createShopEntry(base)};
 const servers=[];
 const client=entry=>{
  const server=http.createServer((req,res)=>{const url=new URL(req.url,origin);if(!entry.matches(url.pathname)){res.writeHead(404).end();return;}entry.handle(req,res,url);});
  server.listen(0,'127.0.0.1');servers.push(server);
  return {entry,ready:once(server,'listening'),request:(path,headers={})=>new Promise((resolve,reject)=>{
   const req=http.request({host:'127.0.0.1',port:server.address().port,path,method:'GET',headers:{Host:'app.example','X-Forwarded-Proto':'https',...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const body=Buffer.concat(chunks);let data=null;try{data=JSON.parse(body);}catch{}resolve({status:res.statusCode,headers:res.headers,body,data});});});req.on('error',reject);req.end();
  })};
 };
 const on=client(entries.on),off=client(entries.off);await Promise.all([on.ready,off.ready]);
 const open=async(variant=variantGid)=>{
  const r=await off.request(proxyPath+'/start?'+signed(s,{product:productGid.split('/').at(-1),variant:variant.split('/').at(-1)}));
  assert.equal(r.status,302,r.body.toString());
  return {'X-Gravuru-Shop-Session':new URLSearchParams(new URL(r.headers.location).hash.slice(1)).get('s')};
 };
 const model=(client,headers,query='')=>client.request('/api/shop-entry/model'+query,headers);
 // Beide Einstiege fragen und vergleichen; gibt die Antwort mit Speicher zurück.
 const both=async(headers,query='',extra={})=>{
  const a=await model(on,{...headers,...extra},query),b=await model(off,{...headers,...extra},query);
  assert.equal(a.status,b.status,'Status mit/ohne Speicher: '+a.body.toString().slice(0,200)+' | '+b.body.toString().slice(0,200));
  assert.equal(a.data?.error?.code,b.data?.error?.code);assert.equal(a.data?.error?.message,b.data?.error?.message);
  if(a.status===200)assert.ok(a.body.equals(b.body),'Antwortkörper mit/ohne Speicher müssen bytegleich sein');
  return a;
 };
 try{await fn({s,on,off,open,model,both,store,entries});}finally{for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
}
const calls=async(s,work)=>{const before=s.modelCalls;const result=await work();return {result,calls:s.modelCalls-before};};

test('a warm response is served without building the model again and is byte-identical to the uncached one',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();
 const first=await both(headers);assert.equal(first.status,200);
 const {calls:hitCalls,result:hit}=await calls(s,()=>model(on,headers));
 assert.equal(hitCalls,0,'Treffer darf das Servermodell nicht erneut bauen');
 assert.equal(hit.status,200);assert.ok(hit.body.equals(first.body));
 const queries=['','?design='+s.designs[1],'?design='+s.designs[0]];
 for(const query of queries)await both(headers,query);
 const {calls:again}=await calls(s,async()=>{for(const query of queries)assert.equal((await model(on,headers,query)).status,200);});
 assert.equal(again,0);
 assert.equal(hit.headers['cache-control'],'private, no-store');assert.equal(hit.headers['content-type'],'application/json; charset=utf-8');
 assert.equal(Number(hit.headers['content-length']),hit.body.length);
}));

test('option sets and design choices have their own entries; no entry answers for another key',()=>run(async({s,open,both})=>{
 const a=await open(variantGid),b=await open('gid://shopify/ProductVariant/202');
 const size=r=>r.data.model.universal.profile.optionGroups.find(g=>g.id==='size').defaultValueId;
 assert.notEqual(s.startKey,s.otherKey);
 assert.equal(size(await both(a)),s.startKey);assert.equal(size(await both(b)),s.otherKey);
 // Danach (alle warm) liefern beide wieder genau ihre eigene Antwort.
 assert.equal(size(await both(a)),s.startKey);assert.equal(size(await both(b)),s.otherKey);
 const own=await both(a,'?design='+s.designs[1]);
 assert.equal(own.data.model.universal.profile.defaultDesignId,s.designs[1]);
 assert.equal((await both(a,'?design='+s.designs[1])).data.model.universal.profile.defaultDesignId,s.designs[1]);
 assert.equal((await both(a)).data.model.universal.profile.defaultDesignId,s.designs[0]);
}));

test('customer-side writes into the same database file leave the entry alone; changes of THIS product apply at once',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();await both(headers);
 // Motivsuche, Entwurf, Konfi-Status eines anderen Produkts, Auftrag: Schreibvorgänge in der Datei, nicht am Produkt.
 for(const name of ['Motivsuche protokolliert','Entwurf gespeichert','Konfi-Status eines anderen Produkts','Auftrag angelegt','fremde Verbindung']){
  s.epoch++;
  assert.equal((await calls(s,()=>model(on,headers))).calls,0,name+': weiter Treffer');
 }
 // Neue Revision, Veröffentlichung, Archivierung, Schemaänderung dieses Produkts.
 for(const [name,write] of [['neue Revision',()=>{s.product.headRevision++;}],['Veröffentlichung',()=>{s.product.headPublishedRevision=s.product.headRevision;}],['Archivierung',()=>{s.product.archived=true;}],['Schemaänderung',()=>{s.product.schemaVersion++;}]]){
  assert.equal((await calls(s,()=>model(on,headers))).calls,0,name+': vorher Treffer');
  write();
  const {calls:n,result}=await calls(s,()=>model(on,headers));
  assert.ok(n>=1,name+': nach der Änderung wird frisch gebaut');assert.equal(result.status,200);
  assert.equal((await both(headers)).status,200,name+': Bytegleichheit nach der Änderung');
  assert.equal((await calls(s,()=>model(on,headers))).calls,0,name+': danach wieder Treffer');
 }
}));

test('changed options of the same assignment never get the old entry (everything else in the key stays equal)',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();
 const group=r=>r.data.model.universal.profile.optionGroups.find(g=>g.id==='mounting').defaultValueId;
 const first=await both(headers);assert.equal(group(first),'K00');
 assert.equal((await calls(s,()=>model(on,headers))).calls,0,'Treffer vor der Änderung');
 // Gleiche Zuordnung (bindingId, assignmentRevision, Revision, unitCents), nur die Optionen ändern sich.
 const binding=s.bindings.get(variantGid);binding.options={mounting:'B02'};
 const changed=await both(headers);
 assert.equal(group(changed),'B02','die Antwort folgt den neuen Optionen');
 assert.notDeepEqual(changed.body,first.body);
 assert.equal((await calls(s,()=>model(on,headers))).calls,0,'neue Optionen: danach Treffer');
 binding.options={mounting:'K00'};
 assert.equal(group(await both(headers)),'K00','zurück zu den alten Optionen: wieder deren Antwort');
 // Reihenfolge der Schlüssel in den Optionen ist kein anderer Eintrag.
 binding.options={size:'x',mounting:'K00'};await both(headers);
 binding.options={mounting:'K00',size:'x'};
 assert.equal((await calls(s,()=>model(on,headers))).calls,0,'gleiche Optionen in anderer Reihenfolge: gleicher Eintrag');
},{flavor:'plain'}));

test('unknown product, missing revision and another tenant give the same status and code with a warm entry as without the store',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();await both(headers);
 assert.equal((await calls(s,()=>model(on,headers))).calls,0);
 s.missing=true;
 const gone=await both(headers);
 assert.equal(gone.status,404);assert.equal(gone.data.error.code,'not_found');
 s.missing=false;
 assert.equal((await both(headers)).status,200);
}));

test('counters go through the logger: numbers only, at most one line per minute',async()=>{
 const lines=[];
 await run(async({s,on,open,model})=>{
  const headers=await open();
  await model(on,headers);await model(on,headers);await model(on,headers);
  assert.equal(lines.length,0,'innerhalb derselben Minute keine Zeile');
  s.time+=61_000;
  await model(on,headers);await model(on,headers);
  assert.equal(lines.length,1);
  const line=lines[0];
  assert.equal(line.event,'model_response_cache');
  assert.equal(line.hits,3);assert.equal(line.misses,1);assert.equal(line.stores,1);assert.equal(line.invalidations,0);assert.equal(line.evictions,0);
  assert.deepEqual(Object.keys(line).sort(),['bytes','entries','event','evictions','hits','invalidations','misses','models','msBuild','msChecks','msContext','msSend','msStartGallery','msStartPublic','msState','stores','timed']);
  assert.ok(Object.values(line).every(v=>typeof v==='string'||Number.isSafeInteger(v)));
  assert.ok(!JSON.stringify(line).match(/gid:|cfg_|binding_|session|shop/i),'keine Kunden-, Sitzungs- oder Produktdaten');
  s.time+=30_000;await model(on,headers);
  assert.equal(lines.length,1,'weniger als eine Minute später keine zweite Zeile');
  s.product.headRevision++;s.time+=61_000;
  await model(on,headers);await model(on,headers);
  assert.equal(lines.length,2);assert.equal(lines[1].invalidations,1);assert.equal(lines[1].hits,2);
 },{logger:e=>lines.push(e)});
});

test('the product state is read on every request, also on hits',()=>run(async({s,on,open,model})=>{
 const headers=await open();await model(on,headers);
 const before=s.stateReads;
 for(let i=0;i<3;i++)await model(on,headers);
 assert.equal(s.stateReads-before,3);
}));

test('an unreadable database state or a write while building never stores an entry',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();
 s.onModel=()=>{s.epoch++;};
 await both(headers);
 s.onModel=null;
 assert.ok((await calls(s,()=>model(on,headers))).calls>=1,'Schreibvorgang während des Aufbaus: nicht gespeichert');
 assert.equal((await calls(s,()=>model(on,headers))).calls,0);
 s.readEpoch=false;s.product.headRevision++;
 const {calls:n}=await calls(s,async()=>{await both(headers);await both(headers);});
 assert.ok(n>=4,'ohne lesbaren Stand läuft jeder Abruf wie bisher: '+n);
}));

test('stores without revisionState, readEpoch or konfis.paused run exactly as before',async()=>{
 for(const workshopOptions of [{withEpoch:false},{withPause:false},{withState:false}])await run(async({s,on,open,model,both})=>{
  const headers=await open();await both(headers);
  const {calls:n}=await calls(s,async()=>{for(let i=0;i<3;i++)assert.equal((await model(on,headers)).status,200);});
  assert.equal(n,3,JSON.stringify(workshopOptions));
 },{workshopOptions});
});

test('pause is checked on every request, also with a warm entry; same status, code and text',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();await both(headers);
 s.paused=true;
 const paused=await both(headers);
 assert.equal(paused.status,423);assert.equal(paused.data.error.code,'konfi_paused');
 s.paused=false;
 assert.equal((await calls(s,()=>model(on,headers))).calls,0,'Aufhebung der Pause: der Eintrag war nie ungültig');
 assert.equal((await both(headers)).status,200);
}));

test('catalog and doorbell approvals are read fresh on every hit and their result is never stored',async()=>{
 for(const [kind,flag,code] of [['catalog','catalogApproved','shop_entry_catalog_release'],['doorbell','doorbellApproved','shop_entry_doorbell_unapproved']])await run(async({s,on,open,model,both})=>{
  const headers=await open();await both(headers);
  assert.equal((await calls(s,()=>model(on,headers))).calls,0,kind+': warm');
  s[flag]=false;
  const revoked=await both(headers);assert.equal(revoked.status,404);assert.equal(revoked.data.error.code,code);
  assert.equal((await calls(s,()=>model(on,headers))).calls,0,kind+': Fehler wird nicht gespeichert, Eintrag bleibt für die Rückkehr gültig');
  s[flag]=true;
  assert.equal((await both(headers)).status,200);
 },{flavor:kind==='catalog'?'bank':'plain',setup:s=>{
  // Die Art der Freigabe steht im gespeicherten Dokument (1. Prüfung) und im gebauten Modell (2. Prüfung).
  if(kind==='doorbell'){s.docConfig={doorbell:DOORBELL};s.modelExtra={doorbell:DOORBELL};}
 },slimmer:kind==='catalog'?null:{ready:()=>true,load(){},slim(){return {fonts:[],surface:false};}}});
});

test('approval kind of the document and of the model are both re-checked in the original order',()=>run(async({s,open,both})=>{
 const headers=await open();await both(headers);
 s.catalogApproved=false;
 const r=await both(headers);assert.equal(r.status,404);assert.equal(r.data.error.code,'shop_entry_catalog_release');
 s.paused=true;
 assert.equal((await both(headers)).status,404,'Freigabe des Dokuments wird vor der Pause geprüft (wie im Basisstand)');
 s.catalogApproved=true;
 assert.equal((await both(headers)).status,423);
},{flavor:'plain',setup:s=>{s.docConfig={familyFormats:{source:{shopProduct:{}}}};}}));

test('session, origin, binding, tenant and rate limit are checked on every request with a warm entry',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();await both(headers);
 // falsche Herkunft
 assert.equal((await both(headers,'',{Origin:'https://foreign.example'})).status,403);
 assert.equal((await both(headers,'',{'Sec-Fetch-Site':'cross-site'})).status,403);
 // ungültige und fehlende Sitzung
 assert.equal((await both({'X-Gravuru-Shop-Session':'x'.repeat(10)})).status,403);
 assert.equal((await both({})).status,403);
 // geänderte Zuordnung, anderer Mandant, entfernte Zuordnung
 const original=s.bindings.get(variantGid);
 s.bindings.set(variantGid,{...original,assignmentRevision:2});
 assert.equal((await both(headers)).data.error.code,'shop_entry_changed');
 s.bindings.set(variantGid,{...original,productRevision:4});
 assert.equal((await both(headers)).data.error.code,'shop_entry_changed');
 s.bindings.set(variantGid,{...original,tenantId:'fremd'});
 assert.equal((await both(headers)).data.error.code,'shop_entry_scope');
 s.bindings.delete(variantGid);
 assert.equal((await both(headers)).status,404);
 s.bindings.set(variantGid,original);
 assert.equal((await both(headers)).status,200);
 // abgelaufene Sitzung
 s.time+=5*60*60*1000;
 const expired=await both(headers);assert.equal(expired.status,403);assert.equal(expired.data.error.code,'shop_entry_expired');
}));

test('the rate limiter still counts warm requests',()=>run(async({on,open,model})=>{
 const headers=await open();
 const statuses=[];for(let i=0;i<6;i++)statuses.push((await model(on,headers)).status);
 assert.deepEqual(statuses,[200,200,200,429,429,429]);
},{limits:{requestsPerMinute:3}}));

test('a disabled design choice answers 403 every time and the error is never stored; the default stays warm',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();await both(headers);
 for(let i=0;i<2;i++){const r=await both(headers,'?design=d2');assert.equal(r.status,403);assert.equal(r.data.error.code,'shop_entry_design_disabled');}
 assert.equal((await calls(s,()=>model(on,headers))).calls,0);
 assert.equal((await both(headers,'?design=d1')).status,200);
},{flavor:'plain'}));

test('error responses are not stored: a transient model error is followed by a fresh build and then hits',()=>run(async({s,on,open,model,both})=>{
 const headers=await open();
 s.modelError=Object.assign(Error('kurz weg'),{status:503});
 assert.equal((await both(headers)).status,503);
 s.modelError=null;
 assert.equal((await both(headers)).status,200);
 assert.equal((await calls(s,()=>model(on,headers))).calls,0);
}));

test('entry count and byte limits apply; oversized responses are not stored',async()=>{
 await run(async({s,on,open,model,both})=>{
  const a=await open(variantGid),b=await open('gid://shopify/ProductVariant/202'),d2='?design='+s.designs[1];
  await both(a);await both(b);await both(a,d2);
  // Grenze 2: der älteste Eintrag (a) wurde verdrängt, b und a?design=d2 sind noch da.
  assert.equal((await calls(s,()=>model(on,b))).calls,0);
  assert.equal((await calls(s,()=>model(on,a,d2))).calls,0);
  assert.ok((await calls(s,()=>model(on,a))).calls>=1,'verdrängter Eintrag wird neu gebaut');
 },{cache:{maxEntries:2}});
 await run(async({s,on,open,model,both})=>{
  const headers=await open();await both(headers);
  assert.ok((await calls(s,()=>model(on,headers))).calls>=1,'Antwort größer als die Byte-Grenze: nie gespeichert');
 },{cache:{maxBytes:100}});
 await run(async({s,on,open,model,both})=>{
  const a=await open(variantGid),q1='?design='+s.designs[0],q2='?design='+s.designs[1];
  await both(a);await both(a,q2);await both(a,q1);
  assert.equal((await calls(s,()=>model(on,a,q1))).calls,0,'Einträge desselben Produktstands teilen ein gehaltenes Modell');
  assert.equal((await calls(s,()=>model(on,a,q2))).calls,0);
 },{cache:{maxEntries:2,maxModels:1}});
 await assert.rejects(async()=>run(async()=>{},{cache:{maxEntries:0}}),{status:503,code:'shop_entry_config'});
 await assert.rejects(async()=>run(async()=>{},{cache:{bogus:1}}),{status:503,code:'shop_entry_config'});
 await assert.rejects(async()=>run(async()=>{},{cache:'ja'}),{status:503,code:'shop_entry_config'});
});

test('doorbell models are stored only while the slimmer is ready; cold and ready states never share an entry',async()=>{
 let ready=false,loads=0;
 const slimmer={ready:()=>ready,load(){loads++;},slim(universal){universal.slimmedWith=ready?'catalog':'none';return {fonts:[],surface:false};}};
 await run(async({s,on,open,model,both})=>{
  const headers=await open();
  const cold=await both(headers);assert.equal(cold.data.model.universal.slimmedWith,'none');
  assert.ok((await calls(s,()=>model(on,headers))).calls>=1,'Funkklingel + nicht bereit: nicht gespeichert');
  ready=true;
  const warm=await both(headers);assert.equal(warm.data.model.universal.slimmedWith,'catalog');
  assert.equal((await calls(s,()=>model(on,headers))).calls,0,'bereit: gespeichert');
 },{flavor:'plain',setup:s=>{s.modelExtra={doorbell:DOORBELL};s.docConfig={doorbell:DOORBELL};},slimmer});
 // Ordinary product: slimming never depends on the catalog (deferAll), so cold entries may be stored, but a state change gets a new key.
 ready=false;
 const seen=[];
 const plain={ready:()=>ready,load(){},slim(universal){seen.push(ready);universal.slimmedWith=ready?'catalog':'none';return {fonts:[],surface:false};}};
 await run(async({s,on,open,model,both})=>{
  const headers=await open();
  await both(headers);assert.equal((await calls(s,()=>model(on,headers))).calls,0,'kalt gespeichert');
  ready=true;
  const after=await both(headers);assert.equal(after.data.model.universal.slimmedWith,'catalog','nach „bereit“ keine veraltete Antwort');
  assert.equal((await calls(s,()=>model(on,headers))).calls,0);
 },{flavor:'plain',slimmer:plain});
});

test('lazy font files stay reachable when the answer comes from the store; vanished files force a rebuild',()=>{
 const slimmer=createModelSlimmer({fetchJson:null,fontUrl:hash=>pagePath+'schriften/'+hash+'.json',maxFontFiles:3,maxSources:3});
 const noise=n=>slimmer.slim({localResources:{fonts:Object.fromEntries([1,2,3].map(i=>['Fremd'+n+i,{regular:{units:1000,glyphs:{A:{a:600,d:'L'+n+' '+i+' 9'}}},bold:null}]))}},{deferAll:true,key:null,source:()=>({})});
 return run(async({s,on,open,model,both})=>{
  const headers=await open();
  const first=await both(headers);
  const urls=r=>r.data.model.universal.localResources.lazyFonts.map(f=>f.url);
  assert.equal(urls(first).length,3,'drei Schriften sind ausgelagert');
  for(const url of urls(first))assert.equal((await on.request(url)).status,200);
  const warm=await calls(s,()=>model(on,headers));
  assert.equal(warm.calls,0,'Dateien noch vorhanden: Treffer');
  for(const url of urls(warm.result))assert.equal((await on.request(url)).status,200);
  // Andere Produkte verdrängen Dateien und Herkunft aller drei Schriften.
  noise(1);
  for(const url of urls(first))assert.equal((await on.request(url)).status,404,'Vorbedingung: die Dateien sind wirklich weg');
  // Nur der Einstieg mit Speicher fragt (der ohne Speicher teilt den Verschlanker und würde die Dateien selbst wieder anlegen).
  const rebuilt=await calls(s,()=>model(on,headers));
  assert.ok(rebuilt.calls>=1,'verschwundene Dateien: kein Treffer, sondern neu aufbauen');
  for(const url of urls(rebuilt.result))assert.equal((await on.request(url)).status,200,'nach dem Neuaufbau wieder abrufbar');
  assert.equal((await calls(s,()=>model(on,headers))).calls,0,'danach wieder Treffer');
  assert.ok((await both(headers)).status===200);
 },{setup:s=>{const resources=structuredClone(bank().config.localResources);resources.fonts.Zweit={regular:{units:1000,glyphs:{A:{a:600,d:'M1 1'}}},bold:null};resources.fonts.Dritt={regular:{units:1000,glyphs:{A:{a:600,d:'M2 2'}}},bold:null};s.modelExtra={localResources:resources};},slimmer});
});

test('the asset route answers the same with and without the store after warm model requests',()=>run(async({on,off,open,both})=>{
 const headers=await open();
 await both(headers);for(let i=0;i<3;i++)await both(headers);
 const ask=(client,hash)=>client.request('/api/shop-entry/design-assets/'+hash+'/preview.svg',headers);
 const seen=[];
 for(const hash of [assetA,assetB,sha('c'),sha('d')]){
  const a=await ask(on,hash),b=await ask(off,hash);
  assert.equal(a.status,b.status,hash);assert.ok(a.body.equals(b.body));seen.push(a.status);
 }
 assert.deepEqual(seen,[200,200,404,404],'Grafiken des Modells werden geliefert, fremde abgelehnt');
},{flavor:'plain'}));

// Auftrag #265, Stufe 2 (Chris 20.11.2026): Design-Teile weiterer Designs desselben Produktstands, nur lesend.
const designParts=(client,headers,query)=>client.request('/api/shop-entry/design-parts'+query,headers);

test('Stufe 2: die Startantwort trägt den Fingerabdruck; eingesetzte Design-Teile ergeben genau das Modell des Designs',()=>run(async({s,on,off,open,model,both})=>{
 const headers=await open();
 const start=await both(headers);assert.match(start.data.designBase,/^[a-f0-9]{64}$/);
 const second=await both(headers,'?design='+s.designs[1]);assert.equal(second.data.designBase,start.data.designBase);
 // Auch der Treffer aus dem Antwortspeicher trägt ihn.
 assert.equal((await model(on,headers)).data.designBase,start.data.designBase);
 const query='?designs='+[s.designs[1],s.designs[0]].join(',');
 const a=await designParts(on,headers,query),b=await designParts(off,headers,query);
 assert.equal(a.status,200,a.body.toString().slice(0,200));assert.ok(a.body.equals(b.body),'mit und ohne Speicher bytegleich');
 assert.deepEqual(a.data.binding,start.data.binding);assert.deepEqual(a.data.configuration,{id:PRODUCT,revision:3});
 assert.deepEqual(a.data.designs.map(d=>d.id),[s.designs[1],s.designs[0]]);
 for(const d of a.data.designs)assert.equal(d.base,start.data.designBase);
 assert.deepEqual(universalWithDesignParts(start.data.model.universal,a.data.designs[0].parts,s.designs[1]),second.data.model.universal);
 assert.deepEqual(universalWithDesignParts(second.data.model.universal,a.data.designs[1].parts,s.designs[0]),start.data.model.universal);
 assert.ok(a.body.length<second.body.length,'zwei Designs zusammen sind kleiner als ein vollständiges Modell');
 assert.equal(a.headers['cache-control'],'private, no-store');assert.equal(a.headers['content-type'],'application/json; charset=utf-8');
 // Zweiter Abruf: kein neuer Modellaufbau, dieselben Bytes.
 const {calls:again,result:hit}=await calls(s,()=>designParts(on,headers,query));
 assert.equal(again,0);assert.equal(hit.status,200);assert.ok(hit.body.equals(a.body));
 // Preise, Größen und Befestigungen stehen nicht in der Antwort.
 assert.equal(/basePriceCents|priceCents|quantityTiers|unitCents/.test(a.body.toString()),false);
}));

test('Stufe 2: Design-Teile gelten nur für die Ausführung der Sitzung; unbekannte oder dort nicht verfügbare Designs fehlen in der Antwort',()=>run(async({s,on,open})=>{
 const a=await open(variantGid),b=await open('gid://shopify/ProductVariant/202');
 const mine=await designParts(on,a,'?designs='+s.designs[1]+',gibt-es-nicht');
 assert.equal(mine.status,200);assert.deepEqual(mine.data.designs.map(d=>d.id),[s.designs[1]]);
 // Dieselben Kennungen in der Sitzung einer anderen Größe: dort gehören sie nicht zur gewählten Ausführung.
 const other=await designParts(on,b,'?designs='+s.designs[1]+','+s.designs[0]);
 assert.equal(other.status,200);assert.deepEqual(other.data.designs,[]);
 assert.equal(other.data.binding.shopifyVariantId,'gid://shopify/ProductVariant/202');
}));

test('Stufe 2: Sitzung, Pause, Freigabe und Produktstand werden bei jedem Abruf der Design-Teile frisch geprüft',()=>run(async({s,on,open,model})=>{
 const headers=await open(),query='?designs='+s.designs[1];
 assert.equal((await designParts(on,{},query)).status,(await model(on,{})).status);
 assert.equal((await designParts(on,headers,query)).status,200);
 s.paused=true;let r=await designParts(on,headers,query);assert.equal(r.status,423);assert.equal(r.data.error.code,'konfi_paused');s.paused=false;
 s.catalogApproved=false;r=await designParts(on,headers,query);assert.equal(r.status,404);assert.equal(r.data.error.code,'shop_entry_catalog_release');s.catalogApproved=true;
 assert.equal((await calls(s,()=>designParts(on,headers,query))).calls,0,'nach bestandener Prüfung wieder aus dem Speicher');
 // Anderer Stand des Produkts: der Eintrag gilt nicht mehr, die Teile werden neu gebildet.
 s.product={...s.product,headRevision:4};
 const rebuilt=await calls(s,()=>designParts(on,headers,query));assert.equal(rebuilt.result.status,200);assert.ok(rebuilt.calls>0);
}));

test('Stufe 2: nur gültige Anfragen; Produkte ohne Größenwahl im Konfi haben keine einzelnen Design-Teile',async()=>{
 await run(async({s,on,open})=>{
  const headers=await open(),many=Array.from({length:49},(_,i)=>'d'+i).join(',');
  for(const query of ['','?designs=','?designs=a&designs=b','?designs=a,a','?designs=a,,b','?designs=a&x=1','?design=a','?designs='+many,'?designs='+'x'.repeat(201)]){
   const r=await designParts(on,headers,query);assert.equal(r.status,404,query);assert.equal(r.data.error.code,'shop_entry_route',query);
  }
  assert.equal((await designParts(on,headers,'?designs='+Array.from({length:48},(_,i)=>'d'+i).join(','))).status,200);
 });
 await run(async({on,open,model})=>{
  const headers=await open();assert.equal((await model(on,headers)).data.designBase,undefined);
  const r=await designParts(on,headers,'?designs=d2');assert.equal(r.status,404);assert.equal(r.data.error.code,'shop_entry_design_parts');
 },{flavor:'plain'});
});

// Familie mit fester Größe (wie Acrylglas 12 × 8 cm im Shop): ein Format, vier Designs, dieselbe Sitzung und Zuordnung.
const fixedSetup=s=>{
 const config=fixedSignConfig(4),options={mounting:'K00'};
 s.docConfig=config;
 s.model=()=>({key:'acryl',name:'Familienschild feste Größe',configuration:{id:PRODUCT,revision:3},galleryCategoryIds:[],legacy:{designs:[]},universal:{...structuredClone(config),...s.modelExtra}});
 for(const binding of s.bindings.values()){binding.options=options;binding.unitCents=quote(config,[],'fs-1',options).unitCents;}
};
test('Stufe 2 gilt auch für die Familie mit fester Größe: Fingerabdruck in der Startantwort, Design-Teile je Design',()=>run(async({s,on,off,open,both})=>{
 const headers=await open();
 const start=await both(headers);assert.match(start.data.designBase,/^[a-f0-9]{64}$/);
 assert.notEqual(start.data.model.universal.familyFormats.fixedSize,undefined);
 // Der Start schickt weiter nur das Startdesign.
 assert.deepEqual(start.data.model.universal.profile.designs.map(d=>d.id),['fs-1']);
 const third=await both(headers,'?design=fs-3');assert.equal(third.data.designBase,start.data.designBase);
 const query='?designs=fs-3,fs-2,gibt-es-nicht';
 const a=await designParts(on,headers,query),b=await designParts(off,headers,query);
 assert.equal(a.status,200,a.body.toString().slice(0,200));assert.ok(a.body.equals(b.body),'mit und ohne Speicher bytegleich');
 assert.deepEqual(a.data.designs.map(d=>d.id),['fs-3','fs-2']);
 for(const d of a.data.designs)assert.equal(d.base,start.data.designBase);
 assert.deepEqual(universalWithDesignParts(start.data.model.universal,a.data.designs[0].parts,'fs-3'),third.data.model.universal);
 assert.equal(/basePriceCents|priceCents|quantityTiers|unitCents/.test(a.body.toString()),false);
 // Zweiter Abruf aus dem Speicher; Pause gilt weiter bei jedem Abruf.
 const {calls:again}=await calls(s,()=>designParts(on,headers,query));assert.equal(again,0);
 s.paused=true;const paused=await designParts(on,headers,query);assert.equal(paused.status,423);assert.equal(paused.data.error.code,'konfi_paused');
},{setup:fixedSetup}));

// 20.11.2026, nach Astras Messung in #267 (erste Aufrufe nach dem Aufspielen 9,8 und 12,9 s; je Abruf ohne Treffer rund 0,6 s
// am echten Server): ein Speichereintrag je Design, das Modell kommt vom Modellzweig, das Dokument wird nicht erneut gelesen.
test('Design-Teile: nach dem Start der Gestaltung baut kein Abruf das Modell neu oder liest das Dokument, auch nicht beim ersten Mal',()=>run(async({s,on,off,open,model})=>{
 const headers=await open();
 assert.equal((await model(on,headers)).status,200);
 const ids=['fs-2','fs-3','fs-4'],before={calls:s.modelCalls,docs:s.docReads};
 const first=await designParts(on,headers,'?designs='+ids.join(','));
 assert.equal(first.status,200);assert.deepEqual(first.data.designs.map(d=>d.id),ids);
 assert.equal(s.modelCalls-before.calls,0,'das gehaltene Modell des Modellzweigs genügt');
 assert.equal(s.docReads-before.docs,0,'die Art der Freigabe ist aus dem Modellzweig bekannt');
 // Ohne Speicher dieselben Bytes.
 assert.ok(first.body.equals((await designParts(off,headers,'?designs='+ids.join(','))).body));
},{setup:fixedSetup}));

test('Design-Teile: jede andere Zusammenstellung schon gelieferter Designs kommt aus dem Speicher; nur neue Designs werden gerechnet',()=>run(async({s,on,off,open,model})=>{
 const headers=await open();await model(on,headers);
 await designParts(on,headers,'?designs=fs-2,fs-3');
 for(const query of ['?designs=fs-3','?designs=fs-3,fs-2','?designs=fs-2,fs-4,fs-3','?designs=fs-4,gibt-es-nicht,fs-2']){
  const before={calls:s.modelCalls,docs:s.docReads},a=await designParts(on,headers,query),b=await designParts(off,headers,query);
  assert.equal(a.status,200,query);assert.ok(a.body.equals(b.body),'bytegleich mit dem Weg ohne Speicher: '+query);
  assert.deepEqual(a.data.designs.map(d=>d.id),query.slice(9).split(',').filter(id=>id.startsWith('fs-')),query);
  // `off` hat keinen Speicher und baut immer; gezählt wird deshalb vor dem Vergleichsabruf.
  assert.equal(s.modelCalls-before.calls-1,0,'kein neuer Modellaufbau mit Speicher: '+query);
 }
},{setup:fixedSetup}));

test('Design-Teile: Pause, Freigabe und anderer Produktstand greifen auch bei Treffern je Design und beim gehaltenen Modell',()=>run(async({s,on,open,model})=>{
 const headers=await open();await model(on,headers);
 assert.equal((await designParts(on,headers,'?designs=fs-2')).status,200);
 // Teils im Speicher (fs-2), teils neu (fs-3): Pause und Freigabe kommen vor jeder Antwort.
 s.paused=true;let r=await designParts(on,headers,'?designs=fs-2,fs-3');assert.equal(r.status,423);assert.equal(r.data.error.code,'konfi_paused');
 r=await designParts(on,headers,'?designs=fs-2');assert.equal(r.status,423);s.paused=false;
 s.catalogApproved=false;r=await designParts(on,headers,'?designs=fs-2,fs-3');assert.equal(r.status,404);assert.equal(r.data.error.code,'shop_entry_catalog_release');
 r=await designParts(on,headers,'?designs=fs-2');assert.equal(r.status,404);s.catalogApproved=true;
 // Anderer Produktstand: weder Einträge noch gehaltenes Modell noch gemerkte Art gelten weiter.
 s.product={...s.product,headRevision:4};
 const before={calls:s.modelCalls,docs:s.docReads};r=await designParts(on,headers,'?designs=fs-2,fs-3');
 assert.equal(r.status,200);assert.ok(s.modelCalls>before.calls,'Modell neu aufgebaut');assert.ok(s.docReads>before.docs,'Dokument neu gelesen');
},{setup:fixedSetup}));

