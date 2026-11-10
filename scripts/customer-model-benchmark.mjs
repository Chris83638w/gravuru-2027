// Lokales Messskript für GET /api/shop-entry/model (Paket 1a). Nur synthetische Daten, kein Netzwerk nach außen
// (nur Loopback), keine echten Produkt-, Kunden- oder Shopdaten. Vorbild: scripts/shop-gallery-benchmark.mjs.
//
// Die Prüfbank hat die Größenordnung der echten r4-Bank: ca. 240 Designs, 80 Formate (Familienformate „alle Größen“),
// Dokument über 10 MB. Formate und Preise stammen aus den vorhandenen Testfixtures (app/workshop/test-fixtures),
// das Polster (katalog.bench, nur an Designs, die der Start nicht mitschickt) macht das Dokument nur groß.
//
// Aufruf:  node scripts/customer-model-benchmark.mjs [--runs 20] [--model-cache off|enabled] [--designs-per-size 3] [--pad-kb 50] [--live-like]
// `--live-like` (Paket 1a-2): live-naher Aufbau – echte Zuordnungsablage (shop-product-binding-store) mit 404 Varianten, echte
// Katalog-Freigabe (catalog-live-orders, an), öffentlicher Vorschauspeicher an (temporäres Verzeichnis). Die Abschnittszeiten
// (msContext, msChecks, msStartPublic …) der Protokollzeile model_response_cache stehen dann unter `sections` in der Ausgabe.
// Ausgabe: JSON mit Phasen (Median aus N Abrufen) und HTTP-Messung (Erstabruf, Treffer, vier gleichzeitig).
// Lokale Werte sind keine Live-Aussage.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createWorkshop} from '../app/workshop/http.mjs';
import {build} from '../app/configurator/variant-m/build.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';
import {measureText} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';
import {prepareConfig,quote} from '../app/configurator/variant-m/contract.mjs';
import {FAMILY_FORMATS_SCHEMA} from '../app/configurator/variant-m/family-formats.mjs';
import {createShopEntry} from '../app/workshop/shop-entry.mjs';
import {createModelSlimmer} from '../app/workshop/shop-model-slim.mjs';
import {shopStartModel} from '../app/workshop/shop-start-model.mjs';
import {createShopDesignGallery} from '../app/workshop/shop-design-gallery.mjs';
import {shopGalleryModel} from '../app/workshop/shop-gallery-model.mjs';
import {withCustomerReadScope} from '../app/workshop/customer-read-scope.mjs';
import {createMotifSearchStats} from '../app/workshop/motif-search-stats.mjs';
import {appProxySignature} from '../app/workshop/shopify-app-proxy.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const fixtures=path.join(here,'../app/workshop/test-fixtures/acryl3-rear/');
const origin='https://app.example',shopDomain='bench-synthetic.myshopify.com',secret='synthetic-benchmark-secret',proxyPath='/apps/konfigurator',pagePath='/konfigurator/shop/';
const productGid='gid://shopify/Product/9000000001',variantGid='gid://shopify/ProductVariant/9000000002';
const median=values=>{const s=[...values].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const round=n=>+n.toFixed(2);
const stat=values=>({median:round(median(values)),min:round(Math.min(...values)),max:round(Math.max(...values)),n:values.length});

export function syntheticBank({designsPerSize=3,padKb=50}={}){
 const f=JSON.parse(fs.readFileSync(fixtures+'steel.json','utf8')),formats=[],designs=[];let c;
 for(const s of f.sizes){
  const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},n=familyProductConfig(view,s,1),p=n.profile;
  if(!c||s.groupKey==='AB'&&s.widthMm===120)c=n;
  const ids=[];
  for(let k=1;k<=designsPerSize;k++){
   const d=structuredClone(p.designs[0]);d.id='bench-'+s.key+'-'+k;d.name='Design '+k;d.themes=['familienschilder'];
   d.katalog={...(k>1?{bench:'x'.repeat(padKb*1024)}:{}),designId:'BENCH-'+s.groupKey+'-'+s.key+'-D'+k,plateMm:[s.widthMm,s.heightMm]};
   const o=d.objects[0];Object.assign(o,{text:'Name',fieldKey:'name',size:3.2,x:s.widthMm/2,y:s.heightMm/2});measureText(o,n.localResources.fonts);
   for(let q=0;q<15;q++)d.objects.push({rotation:0,id:'pad-'+q,type:'graphic',shape:'rect',filled:false,strokeWidth:0.4,x:s.widthMm/2+(q%5)*0.2,y:s.heightMm/2+Math.floor(q/5)*0.2,w:2,h:1,color:'#731c19',templateOrigin:true,customerEditable:false});
   designs.push(d);ids.push(d.id);
  }
  formats.push({key:s.key,form:s.groupKey,label:s.label,geometry:structuredClone(p.geometry),variants:[{color:'steel',familyId:f.id,sizeKey:s.key,basePriceCents:s.baseCents,material:p.material,mounting:p.optionGroups[0].values,designIds:ids}]});
 }
 const start=formats.find(s=>s.form==='AB'&&s.geometry.width===120)||formats[0];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:start.key,defaultColor:'steel',colors:[{id:'steel',label:'steel'}],formats,designs,source:{shopProduct:{sizeKey:start.key,themeId:'familienschilder',defaultDesignId:designs.find(d=>start.variants[0].designIds.includes(d.id)).katalog.designId,groessenWahl:'alle'}}};
 c.profile.themeId='familienschilder';c.profile.defaultDesignId=start.variants[0].designIds[0];
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',required:true,defaultValueId:start.key,values:formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}))},{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[{id:'K00',label:'Ohne',priceCents:0,currency:'EUR'}]}];
 delete c.familyAcrylic;
 return {config:prepareConfig(c),startKey:start.key,formats:formats.length,designs:designs.length};
}

// Arbeitsverzeichnis, echte Werkstatt (SQLite) und die synthetische Bank als erste Revision.
export function openBench(options={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-model-bench-'));
 build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const workshop=createWorkshop({filename:path.join(dir,'native.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 const bank=syntheticBank(options),document=makeProductDocument(bank.config,{name:'Prüfbank'});
 const record=workshop.repository.create(document);
 const bytes=JSON.stringify(workshop.repository.get(record.id,{revision:1}).document).length;
 return {dir,workshop,record,bank,documentBytes:bytes,close(){workshop.close();fs.rmSync(dir,{recursive:true,force:true});}};
}

// ---- Live-naher Aufbau (Paket 1a-2) ----
// Wie live: ein Shopify-Produkt mit `variants` Varianten, alle fest an denselben Produktstand (12-MB-Dokument) gebunden, echte
// Zuordnungsablage (registry.resolve liest/prüft den Beleg), echte Katalog-Freigabe (catalogLiveApproval prüft den Belegstand).
// Es werden nur synthetische Zeilen in die Prüfbank-Datenbank geschrieben (eigene Verbindung, vor der Messung).
const plainObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
// Gleiche kanonische Prüfsumme wie shop-product-binding-store.mjs (bei Abweichung schlägt der Aufbau laut fehl).
function canonical(v){
 if(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(plainObject(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 throw Error('Dokument nicht kanonisierbar');
}
export function liveLikeFixture(bench,{variants=404}={}){
 const {workshop,record,bank}=bench,tenantId=workshop.tenantId,storeId='acryl',config=workshop.model(record.id,1).universal;
 const adapter={tenantId,storeId,shopDomain,getCurrentProduct(){throw Error('nicht im Messskript');}};
 const registry=workshop.orderIntake.idBindings({storeId,shopDomain,adapter});
 const db=new DatabaseSync(path.join(bench.dir,'native.sqlite'));db.exec('PRAGMA busy_timeout=5000');
 try{
  const row=db.prepare('SELECT document FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=1').get(tenantId,record.id);
  const documentSha=createHash('sha256').update(canonical(JSON.parse(row.document))).digest('hex'),rawSha=createHash('sha256').update(row.document).digest('hex');
  const formats=bank.config.familyFormats.formats,keys=formats.map(f=>f.key),now=new Date().toISOString(),gids=[];
  db.exec('BEGIN');
  for(let i=0;i<variants;i++){
   const gid=i===0?variantGid:'gid://shopify/ProductVariant/'+(9000001000+i),size=i===0?bank.startKey:keys[i%keys.length],mounting=i<keys.length?'K00':'K0'+(1+Math.floor(i/keys.length));
   const options={size,mounting},unitCents=i===0||mounting==='K00'?quote(config,[],formats.find(f=>f.key===size).variants[0].designIds[0],options).unitCents:1000+i;
   const bid='binding_'+String(i+1).padStart(8,'0')+'-0000-4000-8000-000000000000',variantId=gid.split('/').at(-1);
   db.prepare('INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)').run(bid,shopDomain,variantId,record.id,1,unitCents,now,tenantId);
   db.prepare('INSERT INTO form_shop_binding_selections(binding_id,options,tenant_id) VALUES(?,?,?)').run(bid,JSON.stringify(options),tenantId);
   db.prepare('INSERT INTO shop_product_binding_revisions(tenant_id,shop,variant_gid,revision,product_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,evidence_read_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(tenantId,shopDomain,gid,1,productGid,storeId,bid,record.id,1,documentSha,now,now);
   db.prepare('INSERT INTO shop_product_binding_heads(tenant_id,shop,variant_gid,revision) VALUES(?,?,?,1)').run(tenantId,shopDomain,gid);
   gids.push(gid);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS catalog_live_order_approvals(tenant_id TEXT NOT NULL,shop TEXT NOT NULL,product_gid TEXT NOT NULL,cfg_id TEXT NOT NULL,cfg_revision INTEGER NOT NULL,document_sha256 TEXT NOT NULL,variants_json TEXT NOT NULL,approval_id TEXT NOT NULL,approved_at TEXT NOT NULL,PRIMARY KEY(tenant_id,shop,product_gid,cfg_id,cfg_revision))`);
  db.prepare('INSERT INTO catalog_live_order_approvals VALUES(?,?,?,?,?,?,?,?,?)').run(tenantId,shopDomain,productGid,record.id,1,rawSha,JSON.stringify(gids.sort()),'synthetic-benchmark',now);
  db.exec('COMMIT');
 }finally{db.close();}
 return {registry,variants};
}

// Kundeneinstieg mit echter Werkstatt, fest zugeordneter Variante und synthetischer Katalogfreigabe (nur hier im Messskript).
export function benchEntry(bench,{modelResponseCache,liveLike=false,events=null,clock=null}={}){
 const {workshop,record,bank}=bench,config=workshop.model(record.id,1).universal;
 const options={size:bank.startKey,mounting:'K00'};
 const unitCents=quote(config,[],config.profile.defaultDesignId,options).unitCents;
 const binding={storeId:'acryl',tenantId:workshop.tenantId,shopDomain,shopifyProductId:productGid,shopifyVariantId:variantGid,productId:record.id,productRevision:1,bindingId:'binding_00000001-0000-4000-8000-000000000000',assignmentRevision:1,options,unitCents};
 // Standard: Zuordnung und Freigabe als Attrappe. `liveLike`: echte Zuordnungsablage und echte Katalog-Freigabe (liveLikeFixture).
 const stub={resolve(identity){if(identity.shopifyProductId!==productGid||identity.shopifyVariantId!==variantGid)throw Object.assign(Error(),{status:404,code:'shop_binding_active_not_found'});return structuredClone(binding);}};
 const registry=liveLike?bench.live.registry:stub;
 const scoped=liveLike?{...workshop,sessionContext:{shopDomain}}:{...workshop,sessionContext:{shopDomain},orderIntake:{...workshop.orderIntake,bindings:()=>[],catalogLiveApproval:()=>({id:'synthetic-benchmark'})}};
 const store={storeId:'acryl',registry,workshop:scoped,apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html',cart:async()=>{throw Error('nicht im Messskript');},catalogLiveOrders:true};
 // Wie im Betrieb: das PNG-Rohlingbild wird durch eine kleine WebP-Fassung ersetzt (hier ein Platzhalter).
 const surface=config.materialSurface,swaps=new Map(typeof surface==='string'?[[surface,'data:image/webp;base64,'+'A'.repeat(60000)]]:[]);
 const slimmer=createModelSlimmer({fetchJson:null,surfaceSwaps:swaps,fontUrl:hash=>pagePath+'schriften/'+hash+'.json'});
 const entryOptions={origin,shopDomain,secret,stores:[store],proxyPath,pagePath,limits:{startPerMinute:100000,requestsPerMinute:100000},modelSlimmer:slimmer,logger:events?e=>events.push(e):()=>{},...(clock?{clock}:{}),...(liveLike?{publicPreviewDirectory:bench.live.previewDir}:{}),...(modelResponseCache?{modelResponseCache}:{})};
 return {store,binding,slimmer,entryOptions,create:()=>createShopEntry(entryOptions)};
}

async function serve(entry,timings){
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,origin);if(!entry.matches(url.pathname)){res.writeHead(404).end();return;}
  const at=performance.now();res.on('finish',()=>timings.push(performance.now()-at));
  entry.handle(req,res,url);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const agent=new http.Agent({keepAlive:true,maxSockets:16});
 const request=(pathname,headers={})=>new Promise((resolve,reject)=>{
  const at=performance.now();
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:pathname,method:'GET',agent,headers:{Host:'app.example','X-Forwarded-Proto':'https',...headers}},res=>{
   let first=null;const chunks=[];res.on('data',c=>{first??=performance.now()-at;chunks.push(c);});
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks),totalMs:performance.now()-at,firstByteMs:first??performance.now()-at}));
  });req.on('error',reject);req.end();
 });
 const open=async()=>{
  const search=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'',product:productGid.split('/').at(-1),variant:variantGid.split('/').at(-1)});
  search.set('signature',appProxySignature(search,secret));
  const r=await request(proxyPath+'/start?'+search);if(r.status!==302)throw Error('start '+r.status+' '+r.body);
  return new URLSearchParams(new URL(r.headers.location).hash.slice(1)).get('s');
 };
 return {server,request,open,close:async()=>{agent.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}

export async function measure({runs=20,modelResponseCache=false,designsPerSize=3,padKb=50,motifWrites=false,liveLike=false,variants=404}={}){
 const bench=openBench({designsPerSize,padKb}),{workshop,record}=bench;
 if(liveLike){const previewDir=path.join(bench.dir,'public-previews');fs.mkdirSync(previewDir);bench.live={...liveLikeFixture(bench,{variants}),previewDir};}
 // Mit `motifWrites`: vor jedem Abruf wird – wie bei jeder Motivsuche im Betrieb – eine Suche in die echte Tabelle
 // motif_search_daily DERSELBEN Datei geschrieben (eigene Verbindung, eindeutiger Suchbegriff). Die Zeit dafür zählt nicht mit.
 const stats=motifWrites?createMotifSearchStats({filename:path.join(bench.dir,'native.sqlite'),tenantId:workshop.tenantId}):null;
 let searches=0;const search=()=>{if(stats&&!stats.record({query:'eiche '+(searches++)+' x'+Math.random().toString(36).slice(2,6),resultCount:2,group:'Messung'}))throw Error('Motivsuche wurde nicht protokolliert');};
 try{
  const result={schema:'gravuru-customer-model-benchmark/v1',note:'lokal, synthetisch, keine Live-Aussage',node:process.version,modelResponseCache:!!modelResponseCache,liveLike:!!liveLike,variants:liveLike?variants:null,motifSearchBetweenCalls:!!motifWrites,runs,
   bank:{designs:bench.bank.designs,formats:bench.bank.formats,documentBytes:bench.documentBytes}};
  // ---- Phasen, jeweils in einer frischen Lesephase wie bei einer Anfrage ----
  const phase={documentRead:[],modelBuilt:[],startModel:[],galleryStart:[],serialize:[]};
  const first=performance.now();withCustomerReadScope(()=>workshop.model(record.id,1));result.firstModelBuildMs=round(performance.now()-first);
  const {store,binding,slimmer,create}=benchEntry(bench);
  const gallery=createShopDesignGallery({secret,resolve:()=>({store,binding:structuredClone(binding)}),modelFor:()=>workshop.model(record.id,1),cardFor:(s,b)=>shopGalleryModel(s.workshop.repository.get(b.productId,{revision:b.productRevision})),allowedAssets:()=>new Set(),previewUrl:hash=>pagePath+'vorschauen/'+hash+'.svg'});
  let startNull=0,bytes=0;
  for(let i=0;i<runs;i++){
   let at=performance.now();withCustomerReadScope(()=>workshop.repository.get(record.id,{revision:1}));phase.documentRead.push(performance.now()-at);
   let model;at=performance.now();withCustomerReadScope(()=>{model=workshop.model(record.id,1);});phase.modelBuilt.push(performance.now()-at);
   let copy;at=performance.now();copy=shopStartModel(model,null,{deferFonts:true,options:binding.options});slimmer.slim(copy.universal,{deferAll:true,key:null,source:()=>model.universal.localResources.fonts});phase.startModel.push(performance.now()-at);
   const designId=copy.universal.profile.defaultDesignId;
   let start=null;at=performance.now();withCustomerReadScope(()=>{try{start=gallery.start({store,binding:structuredClone(binding),session:{sid:'bench'}},model,designId);}catch{}});phase.galleryStart.push(performance.now()-at);if(!start)startNull++;
   at=performance.now();const body=Buffer.from(JSON.stringify({model:copy,startPreview:start,binding,editorPath:store.nativeEditorPath,shopDomain,themeCartPath:'x',expiresAt:0,customerId:null,productionReady:false}));phase.serialize.push(performance.now()-at);bytes=body.length;
  }
  result.phasesMs=Object.fromEntries(Object.entries(phase).map(([k,v])=>[k,stat(v)]));result.responseBytes=bytes;result.startPreviewMissingInPhases=startNull;
  // ---- HTTP: Erstabruf (frischer Einstieg, leerer Antwortspeicher), Treffer, vier gleichzeitig ----
  const firstCalls=[],firstServer=[],hits=[],hitsServer=[],four=[],fourServer=[];
  for(let i=0;i<runs;i++){
   const timings=[],entry=benchEntry(bench,{modelResponseCache,liveLike}).create(),s=await serve(entry,timings);
   try{
    const token=await s.open(),headers={'X-Gravuru-Shop-Session':token};search();timings.length=0;
    const r=await s.request('/api/shop-entry/model',headers);if(r.status!==200)throw Error('model '+r.status+' '+r.body);
    if(!JSON.parse(r.body).startPreview)throw Error('startPreview fehlt in der Messung');
    firstCalls.push(r.totalMs);firstServer.push(timings.at(-1));
   }finally{await s.close();}
  }
  {
   const timings=[],entry=benchEntry(bench,{modelResponseCache,liveLike}).create(),s=await serve(entry,timings);
   try{
    const token=await s.open(),headers={'X-Gravuru-Shop-Session':token};
    await s.request('/api/shop-entry/model',headers);
    for(let i=0;i<runs;i++){search();timings.length=0;const r=await s.request('/api/shop-entry/model',headers);if(r.status!==200)throw Error('model '+r.status);hits.push(r.totalMs);hitsServer.push(timings.at(-1));}
    for(let i=0;i<runs;i++){
     search();timings.length=0;const t=await Promise.all([0,1,2,3].map(()=>s.request('/api/shop-entry/model',headers)));
     if(t.some(r=>r.status!==200))throw Error('gleichzeitig '+t.map(r=>r.status));
     four.push(Math.max(...t.map(r=>r.totalMs)));fourServer.push(timings.reduce((a,b)=>a+b,0));
    }
   }finally{await s.close();}
  }
  result.http={
   firstCall:{clientMs:stat(firstCalls),serverMs:stat(firstServer)},
   repeatedCall:{clientMs:stat(hits),serverMs:stat(hitsServer)},
   fourConcurrent:{slowestClientMs:stat(four),sumServerMs:stat(fourServer)},
  };
  // ---- Abschnittszeiten der Treffer aus der Protokollzeile model_response_cache (wie live gelesen), Summe je Abruf ----
  if(modelResponseCache){
   const events=[],clock={now:Date.now()},entry=benchEntry(bench,{modelResponseCache,liveLike,events,clock:()=>clock.now}).create(),s=await serve(entry,[]);
   try{
    const token=await s.open(),headers={'X-Gravuru-Shop-Session':token},line=()=>events.filter(e=>e.event==='model_response_cache').at(-1);
    await s.request('/api/shop-entry/model',headers);clock.now+=61000;await s.request('/api/shop-entry/model',headers);
    for(let i=0;i<runs;i++){search();const r=await s.request('/api/shop-entry/model',headers);if(r.status!==200)throw Error('model '+r.status);}
    clock.now+=61000;await s.request('/api/shop-entry/model',headers);
    const e=line(),per=k=>round(e[k]/Math.max(1,e.timed));
    result.sections={calls:e.timed,hits:e.hits,perCallMs:{msContext:per('msContext'),msState:per('msState'),msChecks:per('msChecks'),msStartGallery:per('msStartGallery'),msStartPublic:per('msStartPublic'),msSend:per('msSend')}};
   }finally{await s.close();}
  }
  result.motifSearchesWritten=searches;
  return result;
 }finally{stats?.close();bench.close();}
}

function args(argv){
 const out={runs:20,cache:'off',designsPerSize:3,padKb:50,motif:'none',liveLike:false};
 for(let i=0;i<argv.length;i++){
  const k=argv[i],v=argv[i+1];
  if(k==='--runs'&&/^\d+$/.test(v||''))out.runs=+argv[++i];
  else if(k==='--model-cache'&&['off','enabled'].includes(v))out.cache=argv[++i];
  else if(k==='--motif-search'&&['none','between'].includes(v))out.motif=argv[++i];
  else if(k==='--live-like')out.liveLike=true;
  else if(k==='--designs-per-size'&&/^\d+$/.test(v||''))out.designsPerSize=+argv[++i];
  else if(k==='--pad-kb'&&/^\d+$/.test(v||''))out.padKb=+argv[++i];
  else throw Error('unbekanntes Argument '+k);
 }
 return out;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const a=args(process.argv.slice(2));
 measure({runs:a.runs,modelResponseCache:a.cache==='enabled',designsPerSize:a.designsPerSize,padKb:a.padKb,motifWrites:a.motif==='between',liveLike:a.liveLike}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
}
