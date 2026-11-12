// Private createConnections-Datei für Astras Main-Operator v2 (ops/issue230-main-shop-binding-20261112 @ 49912d0, Manifest de182709…)
// – AUSFÜHRUNG AUF DEN TATSÄCHLICHEN DATEN, Freigabe #168 6829898414 („Ja, Gesamtpaket ausführen“, Umfang f26ada8).
// plan/reconcile : Astras Readonly-Anschluss (Manifest 5eea1f58…, zwei SQLite-Dateien readOnly + query_only), Shopify nur Lesetransport.
// apply/finish   : tatsächliche native Fabrik/Registry/Adapter des laufenden Kandidaten auf den tatsächlichen Dateien (wie im Kopienlauf
//                  mo-connections.mjs und im Sechs-DRAFT-Lauf), Shopify mit Einmal-Schreibtransport (keine Wiederholung von Mutationen).
// Functionbeleg  : echter frischer Callback aus fr-callback.mjs (Host-CLI, nur appVersions/activeAppVersion).
// Keine Zugangswerte in dieser Datei, in Ausgaben oder Belegen. Netz ausschließlich zum Shop-Host.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const SHOP='gravuru-design.myshopify.com',FR_SHA='a19760739bd0ece91d56becc6c645e4e9cfc3ba886cb9e43d85287fbb42b1839';
const protokoll=globalThis.__mlProtokoll??=[],geheim=globalThis.__mlGeheim??=[];
const warte=ms=>new Promise(r=>setTimeout(r,ms));

// ---- Shopify-Zugang: vorhandene Eigentümer-App (Client-Credentials wie im Readonly-Lauf); liefert Lese- und Einmal-Schreibtransport
export async function shopZugang({P,identity,fetchImpl=globalThis.fetch,secret=null,pause=2500}={}){
 need(identity?.shopDomain===SHOP&&typeof identity.clientId==='string'&&/^\d{4}-\d{2}$/.test(identity.apiVersion),'ml_shopidentitaet');
 const e={lesen:0,mutationen:0,kosten:[],fehler:[],fremd:0,gedrosselt:0,drossel:null};
 const merke=(art,text)=>{let t=String(text);for(const g of geheim)if(g)t=t.replaceAll(g,'[entfernt]');if(e.fehler.length<40)e.fehler.push(art+': '+t.slice(0,300));};
 const nurShop=(url,o)=>{let h='';try{h=new URL(String(url)).host;}catch{}if(h!==SHOP){e.fremd++;throw Object.assign(new Error('Netz gesperrt außer Shop-Host'),{code:'ml_fremdes_netz'});}return fetchImpl(url,o);};
 if(secret===null){
  const appText=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),cfgFile=(appText.match(/process\.env\.GRAVURU_SHOPIFY_CONFIG_FILE\s*=\s*(["'])(.*?)\1/)||[])[2];need(cfgFile,'ml_konfiguration');
  const secretFile=JSON.parse(fs.readFileSync(cfgFile,'utf8')).values?.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,st=fs.statSync(secretFile);need(st.isFile()&&!(st.mode&0o077)&&st.size>=16&&st.size<=1024,'ml_secretdatei');
  secret=fs.readFileSync(secretFile,'utf8').trim();
 }
 geheim.push(secret);need(/^[A-Za-z0-9_-]{16,256}$/.test(secret),'ml_secretformat');
 const mitFrist=async(url,o,ms)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await nurShop(url,{...o,redirect:'error',cache:'no-store',signal:c.signal});}finally{clearTimeout(t);}};
 const tr=await mitFrist(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:identity.clientId,client_secret:secret}).toString()},30000);
 if(!tr.ok)throw Object.assign(new Error('Tokenabruf HTTP '+tr.status),{code:'ml_token_http'});
 const tk=await tr.json();need(typeof tk.access_token==='string'&&tk.access_token.length>=16,'ml_token');geheim.push(tk.access_token);
 const gql=`https://${SHOP}/admin/api/${identity.apiVersion}/graphql.json`;
 async function post(query,variables,ms){
  const r=await mitFrist(gql,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json','X-Shopify-Access-Token':tk.access_token},body:JSON.stringify({query,variables})},ms);
  if(!r.ok){merke('http',r.status);throw Object.assign(new Error('Shopify HTTP '+r.status),{code:'ml_http_'+r.status});}
  const j=await r.json(),c=j.extensions?.cost;if(c){e.kosten.push([c.requestedQueryCost,c.actualQueryCost]);if(c.throttleStatus)e.drossel=[c.throttleStatus.maximumAvailable,c.throttleStatus.currentlyAvailable,c.throttleStatus.restoreRate];}
  if(Array.isArray(j.errors)&&j.errors.length)for(const x of j.errors.slice(0,3))merke('graphql',String(x?.extensions?.code||'')+' '+String(x?.message));
  for(const v of Object.values(j.data||{}))if(Array.isArray(v?.userErrors)&&v.userErrors.length)for(const x of v.userErrors.slice(0,5))merke('userErrors',String(x.code||'')+' '+JSON.stringify(x.field||null)+' '+String(x.message||''));
  return j;
 }
 const gedrosselt=j=>Array.isArray(j.errors)&&j.errors.some(x=>x?.extensions?.code==='THROTTLED');
 // Lesen ist wiederholbar: nur bei Drosselung bis zu dreimal neu versuchen. Mutationen werden NIE wiederholt.
 async function graphqlRead(query,variables){need(typeof query==='string'&&/^\s*query\b/.test(query),'ml_nur_lesen');e.lesen++;let j;for(let i=0;;i++){j=await post(query,variables,60000);if(!gedrosselt(j)||i>=3)break;e.gedrosselt++;await warte(pause);}return j;}
 async function graphqlWriteOnce(query,variables){need(typeof query==='string'&&/^\s*mutation\b/.test(query),'ml_nur_mutation');e.mutationen++;return post(query,variables,180000);}
 return {graphqlRead,graphqlWriteOnce,nurShop,secret,eintrag:e};
}

export async function createConnections({readOnly,mode}={}){
 need(typeof readOnly==='boolean'&&['plan','apply','reconcile','finish-catalog'].includes(mode)&&readOnly===(mode==='plan'||mode==='reconcile'),'ml_modus');
 const O=process.env.ML_ORDNER,P=process.env.ML_P,RT=process.env.ML_RT,STG=import.meta.dirname;
 need(typeof O==='string'&&/^mainlive-\d{8}T\d{6}Z$/.test(path.basename(O))&&path.basename(path.dirname(O))==='sicherungen-db'&&typeof P==='string'&&typeof RT==='string','ml_ordner');
 const BASIS=path.dirname(O),PAKET=path.join(BASIS,'mainanschluss-20261112T105018Z','paket'),ROP=path.join(BASIS,'readonly-ausgang-20261112T160607Z','ro-paket'),READER=path.join(BASIS,'functioncallback-20261112T163355Z','reader');
 const LIVE=path.join(P,'acryl-employee-20261021-v1','data'),BAU=path.join(O,'bau'),EVIDENZ=path.join(O,'main-evidence.private.json');
 const paket=f=>import(pathToFileURL(path.join(PAKET,f)).href),rt=f=>import(pathToFileURL(path.join(RT,f)).href);
 need(sha(fs.readFileSync(path.join(STG,'fr-callback.mjs')))===FR_SHA,'ml_callback_geaendert');
 const [op,g,mp,ro,frc]=await Promise.all([paket('main-operator.mjs'),paket('gateways.mjs'),paket('main-pricing.mjs'),rt('app/workshop/shopify-admin-readonly.mjs'),import(pathToFileURL(path.join(STG,'fr-callback.mjs')).href)]);
 const {POLICY,loadPinnedMapping,bindingView}=op,I=ro.ADMIN_READONLY_IDENTITY;need(POLICY.shopDomain===SHOP&&I.shopDomain===SHOP,'ml_shopidentitaet');
 const eintrag={mode,readOnly,start:new Date().toISOString(),evidenzNeuGelesen:false,functionLesungen:[],idBindingsMitPreisprovider:0,checker:0};protokoll.push(eintrag);
 const z=await shopZugang({P,identity:I});eintrag.shop=z.eintrag;
 const shopify=readOnly?g.createMainShopifyGateway({graphqlRead:z.graphqlRead})
  :g.createMainShopifyGateway({graphqlRead:z.graphqlRead,graphqlWriteOnce:(q,v)=>{need(q===g.UPDATE_VARIANTS||q===g.SET_PRICING,'ml_fremde_mutation');return z.graphqlWriteOnce(q,v);},mutationRetries:0});
 process.umask(0o077);const belegDir=path.join(O,'function-belege',mode+'-'+eintrag.start.replace(/[-:.]/g,'')+'-'+protokoll.length);fs.mkdirSync(belegDir,{recursive:true,mode:0o700});
 const verifyActiveFunction=frc.createVerifyActiveFunction({privateRoot:P,readerDir:READER,belegDir,log:eintrag.functionLesungen});
 const functions=await mp.loadPricingFunctions(RT);
 let target=null,workshop=null;
 try{
  if(readOnly){
   const {createMainProductionReadonlyAdapterFactory}=await import(pathToFileURL(path.join(ROP,'adapter-factory.mjs')).href);
   const adapterFactory=await createMainProductionReadonlyAdapterFactory({codeRoot:RT,operatorRoot:PAKET,workshopFilename:fs.realpathSync(path.join(LIVE,'workshop.sqlite')),profilesFilename:fs.realpathSync(path.join(LIVE,'profiles.sqlite'))});
   target=await adapterFactory({readOnly:true,mode});
   let evidence;
   if(fs.existsSync(EVIDENZ))evidence=JSON.parse(fs.readFileSync(EVIDENZ,'utf8'));
   else{
    // Nur beim ersten Plan: Preisfeld, die 808 tatsächlichen ursprünglichen R1-Zuordnungen/Verträge und den echten Functionbeleg frisch lesen und privat festhalten.
    need(mode==='plan','ml_evidenz_fehlt');const mapping=loadPinnedMapping(path.join(PAKET,'variant-mapping.preview.json.gz')),ids=[...mapping.matches,...mapping.residual].map(v=>v.id);
    const rows=(await target.native.resolveMany(ids.map(id=>({shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:id})))).map(bindingView);
    need(rows.length===808&&new Set(rows.map(r=>r.bindingId)).size===808&&rows.every(r=>r.productRevision===1&&typeof r.bindingId==='string'),'ml_r1_zuordnungen');
    evidence={observedField:await shopify.readPricing(),historicalContracts:rows.map(r=>({bindingId:r.bindingId,shopifyVariantId:r.shopifyVariantId,contract:target.workshop.orderIntake.bindingPricing(r.bindingId)})),functionEvidence:await verifyActiveFunction()};
    const text=JSON.stringify(evidence);need(!geheim.some(x=>x&&text.includes(x)),'ml_evidenz_zugangswert');fs.writeFileSync(EVIDENZ,text,{flag:'wx',mode:0o600});eintrag.evidenzNeuGelesen=true;
   }
   const targetDocument=target.workshop.repository.get(POLICY.productId,{revision:2}).document;
   const pricing=mp.createMainPricingConnection({native:functions,repository:target.workshop.repository,orders:target.workshop.orderIntake,shopify,targetDocument,evidence,verifyActiveFunction});
   eintrag.nativeMethoden=Object.keys(target.native).sort();eintrag.canWrite=target.canWrite;
   let zu=false;const t=target;return {shopify,native:t.native,pricing,async close(){if(!zu){zu=true;eintrag.ende=new Date().toISOString();t.close();}}};
  }
  need(fs.existsSync(EVIDENZ),'ml_evidenz_fehlt');const evidence=JSON.parse(fs.readFileSync(EVIDENZ,'utf8'));
  const [{createWorkshop},{createShopBindingReadAdapter},{SHOPIFY_IDENTITY}]=await Promise.all([rt('app/workshop/http.mjs'),rt('app/workshop/shop-product-binding-adapter.mjs'),rt('app/workshop/shopify-runtime-config.mjs')]);
  need(SHOPIFY_IDENTITY.shopDomain===POLICY.shopDomain,'ml_shopidentitaet');
  const seed=JSON.parse(fs.readFileSync(path.join(BAU,'models.json'),'utf8'))[0];
  delete process.env.GRAVURU_KATALOG_WORKER;
  // tatsächliche native Fabrik – derselbe Aufruf wie im Kopienlauf und im Sechs-DRAFT-Lauf, ohne HTTP-Server, auf den tatsächlichen Dateien
  workshop=createWorkshop({filename:path.join(LIVE,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:{mode:'test-only',shopDomain:POLICY.shopDomain,clientId:SHOPIFY_IDENTITY.clientId,secret:crypto.randomBytes(32).toString('hex')}});
  need(workshop.tenantId===POLICY.tenantId,'ml_mandant');
  // derselbe Adapteraufruf wie configurator-integration.mjs:46 (Acryl-Store)
  const adapter=createShopBindingReadAdapter({storeId:POLICY.storeId,tenantId:workshop.tenantId,shopDomain:POLICY.shopDomain,productionProfileScope:{storeId:POLICY.storeId,tenantId:workshop.tenantId},workshop});
  const targetDocument=workshop.repository.get(POLICY.productId,{revision:2}).document;
  const pricing=mp.createMainPricingConnection({native:functions,repository:workshop.repository,orders:workshop.orderIntake,shopify,targetDocument,evidence,verifyActiveFunction});
  const registry=g.createMainBindingConnection({workshop,adapter,pricing});eintrag.idBindingsMitPreisprovider++;
  const reader=ro.createShopifyAdminReadonly({readSecret:async()=>z.secret},{fetchImpl:z.nurShop});
  const native=await g.createMainNativeGateway({codeRoot:RT,workshop,registry,reader,adapter,pricing});eintrag.checker++;
  eintrag.nativeMethoden=Object.keys(native).sort();
  let zu=false;const w=workshop;return {shopify,native,pricing,async close(){if(!zu){zu=true;eintrag.ende=new Date().toISOString();w.close();}}};
 }catch(e){try{target?.close();}catch{}try{workshop?.close();}catch{}throw e;}
}
