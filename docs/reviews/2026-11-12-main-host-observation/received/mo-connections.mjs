// Privater createConnections-Anschluss für Astras Main-Operator v2 (ops/issue230-main-shop-binding-20261112 @ 49912d0).
// NUR für den Kopienlauf: native Seite = tatsächliche Fabrik/Registry/Adapter des Kandidaten auf einer Wegwerfkopie,
// Shopify = synthetisch im Speicher mit Zustandsdatei (GraphQL-Ebene, damit der echte Gateway des Pakets läuft), Netz gesperrt.
// Der Functionbeleg ist ein ausdrücklicher TEST-Beleg. Diese Datei enthält keine Zugangsdaten und öffnet nie Live-Daten.
import './vh-netzwaechter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
const O=process.env.MO_ORDNER,RT=process.env.MO_RT;
need(typeof O==='string'&&/^mainanschluss-\d{8}T\d{6}Z$/.test(path.basename(O))&&path.basename(path.dirname(O))==='sicherungen-db'&&typeof RT==='string','mo_nur_kopienordner');
const PAKET=path.join(O,'paket'),DATEN=path.join(O,'daten'),BAU=path.join(O,'bau'),ZUSTAND=path.join(O,'shop-zustand.json'),EVIDENZ=path.join(O,'main-evidence.private.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const paket=f=>import(pathToFileURL(path.join(PAKET,f)).href),rt=f=>import(pathToFileURL(path.join(RT,f)).href);
const APP='gid://shopify/App/423276544001',NS='app--423276544001';
export const TEST_FUNCTION={schema:'issue230-active-pricing-function-evidence/v1',releaseId:'TEST-ONLY-kopienlauf-1199363391489',wasmSha256:'a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2',buildSourceSha256:'5977e9d9a510223d55f2f6635910aa7af97fcd300eaeec6480a56d921129f1a7',reviewEvidenceSha256:'72874750425e0d1ded1e9e79516dc0c8bcbb0cde9a5f8ec25c732ec69a99db1e',formats:['history','v2','valueInput','variantDeltas','variantSequence','variantsFromRevision'],kennzeichnung:'TEST-Functionbeleg nur für den Kopienlauf: Version im Dashboard gelesen, WASM nicht neu gelesen; kein produktiver Beleg'};
const protokoll=globalThis.__moProtokoll??=[];

// ---- synthetisches Shopify (Zustand in Datei, damit getrennte Operatoraufrufe denselben Stand sehen)
function ladeShop(POLICY){
 if(fs.existsSync(ZUSTAND))return JSON.parse(fs.readFileSync(ZUSTAND,'utf8'));
 const m=JSON.parse(gunzipSync(fs.readFileSync(path.join(PAKET,'variant-mapping.preview.json.gz')))),value=fs.readFileSync(path.join(PAKET,'fixtures/personalization.value.json'),'utf8');
 const beleg=JSON.parse(fs.readFileSync(path.join(PAKET,'fixtures/app-personalization-lesebeleg.json'),'utf8')),text=JSON.stringify(beleg);
 const id=(text.match(/gid:\/\/shopify\/Metafield\/\d+/)||[])[0],compareDigest='66b0aa6d8ab008aa31bc3ab39cec8d10760061bab055c3d990e74b882ed6500d';
 need(id&&text.includes(compareDigest)&&sha(value)==='7c997f49153d43a937a75501ed5bc016eda1003e129d1735528b801ee7962cf5','mo_preisbeleg');
 const variants=[...m.matches.map(r=>({id:r.shopifyVariantId,sku:r.sku,price:(r.currentShopUnitCents/100).toFixed(2),selectedOptions:r.currentShopSelectedOptions})),...m.residualVariants.map(r=>({id:r.id,sku:r.sku,price:r.price,selectedOptions:r.selectedOptions}))]
  .map((v,i)=>({...v,compareAtPrice:null,inventoryItem:{id:'gid://shopify/InventoryItem/'+(990000000+i),tracked:false}}));
 const zustand={kennzeichnung:'SYNTHETISCHES Shopify für den Kopienlauf – kein echter Shopstand',updatedAt:'2026-11-12T00:00:00Z',zaehler:{lesen:0,variantenBulk:0,metafeld:0,abgelehnt:0},
  product:{id:POLICY.shopifyProductId,status:'DRAFT',title:'SYNTHETISCH Hauptacryl (Kopienlauf)',handle:'synthetisch-hauptacryl-kopienlauf',descriptionHtml:'<p>synthetisch</p>',vendor:'gravuru',productType:'synthetisch',tags:['synthetisch'],templateSuffix:'konfi',seo:{title:null,description:null},featuredMedia:null,media:[],customization:{value:POLICY.productId},cut:null,
   options:variants[0].selectedOptions.map((o,i)=>({id:'gid://shopify/ProductOption/'+(980000000+i),name:o.name,position:i+1}))},
  pricing:{id,namespace:NS,key:'personalization',type:'json',value,compareDigest},variants};
 fs.writeFileSync(ZUSTAND,JSON.stringify(zustand),{flag:'wx',mode:0o600});return zustand;
}
export function syntheticShop(POLICY,g){
 const z=ladeShop(POLICY),save=()=>{const t=ZUSTAND+'.neu';fs.writeFileSync(t,JSON.stringify(z),{mode:0o600});fs.renameSync(t,ZUSTAND);};
 const shop={myshopifyDomain:POLICY.shopDomain,currencyCode:'EUR'},row=v=>({id:v.id,sku:v.sku,price:v.price,compareAtPrice:v.compareAtPrice,selectedOptions:structuredClone(v.selectedOptions),inventoryItem:structuredClone(v.inventoryItem)});
 const page=from=>({nodes:z.variants.slice(from,from+250).map(row),pageInfo:{hasNextPage:from+250<z.variants.length,endCursor:from+250<z.variants.length?'c'+(from+250):null}});
 async function read(query,variables){
  z.zaehler.lesen++;
  if(query===g.READ_MAIN){need(variables.id===z.product.id,'syn_produkt');const p=z.product;return {data:{shop,product:{id:p.id,updatedAt:z.updatedAt,status:p.status,title:p.title,handle:p.handle,descriptionHtml:p.descriptionHtml,vendor:p.vendor,productType:p.productType,tags:p.tags,templateSuffix:p.templateSuffix,seo:p.seo,featuredMedia:p.featuredMedia,media:{nodes:p.media,pageInfo:{hasNextPage:false}},customization:p.customization,cut:p.cut,personalization:z.pricing?{value:z.pricing.value}:null,options:p.options,variants:page(0)}}};}
  if(query===g.READ_VARIANTS){const from=Number(String(variables.after).slice(1));need(variables.id===z.product.id&&[250,500,750].includes(from),'syn_cursor');return {data:{shop,product:{id:z.product.id,updatedAt:z.updatedAt,variants:page(from)}}};}
  if(query===g.READ_PRICING)return {data:{shop,currentAppInstallation:{app:{id:APP},accessScopes:[{handle:'read_products'},{handle:'write_products'}]},product:{id:z.product.id,status:z.product.status,pricing:z.pricing?structuredClone(z.pricing):null}}};
  need(false,'syn_unerwartete_abfrage');
 }
 async function writeOnce(query,variables){
  if(query===g.UPDATE_VARIANTS){
   need(variables.productId===z.product.id&&z.product.status==='DRAFT','syn_produkt');const by=new Map(z.variants.map(v=>[v.id,v])),out=[];
   for(const v of variables.variants){const t=by.get(v.id);need(t&&Object.keys(v).every(k=>['id','price','optionValues'].includes(k)),'syn_variante');if(v.price!==undefined)t.price=v.price;if(v.optionValues)t.selectedOptions=v.optionValues.map(o=>({name:o.optionName,value:o.name}));out.push({id:t.id,price:t.price,selectedOptions:structuredClone(t.selectedOptions)});}
   z.zaehler.variantenBulk++;z.zaehler.variantenGeaendert=(z.zaehler.variantenGeaendert??0)+out.length;z.updatedAt=new Date().toISOString();save();
   return {data:{productVariantsBulkUpdate:{product:{id:z.product.id},productVariants:out,userErrors:[]}}};
  }
  need(query===g.SET_PRICING&&variables.metafields?.length===1,'syn_unerwartete_mutation');const m=variables.metafields[0];
  need(m.ownerId===z.product.id&&m.namespace==='$app'&&m.key==='personalization'&&m.type==='json'&&z.product.status==='DRAFT','syn_metafeld');
  if((z.pricing?.compareDigest??null)!==m.compareDigest){z.zaehler.abgelehnt++;save();return {data:{metafieldsSet:{metafields:[],userErrors:[{field:['metafields','0'],code:'STALE_OBJECT'}]}}};}
  z.pricing={id:z.pricing?.id??'gid://shopify/Metafield/970000001',namespace:NS,key:'personalization',type:'json',value:m.value,compareDigest:sha('SYNTHETISCH:'+m.value)};z.zaehler.metafeld++;z.updatedAt=new Date().toISOString();save();
  if(globalThis.__moFehler?.pricingAntwortVerloren){globalThis.__moFehler.pricingAntwortVerloren=false;globalThis.__moFehler.ausgeloest=(globalThis.__moFehler.ausgeloest??0)+1;throw new Error('Synthetisch verlorene Antwort nach ausgeführtem Metafeld-CAS');}
  return {data:{metafieldsSet:{metafields:[structuredClone(z.pricing)],userErrors:[]}}};
 }
 const cents=p=>{const [a,b='']=p.split('.');return Number(a)*100+Number(b.padEnd(2,'0'));};
 const reader={async inspectVariants(ids){z.zaehler.lesen++;const by=new Map(z.variants.map(v=>[v.id,v]));return {installation:{shopDomain:POLICY.shopDomain,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const v=by.get(id);return v?{id,found:true,productId:z.product.id,status:z.product.status,priceCents:cents(v.price),options:structuredClone(v.selectedOptions)}:{id,found:false};})};}};
 return {read,writeOnce,reader,zustand:()=>structuredClone({zaehler:z.zaehler,updatedAt:z.updatedAt,pricingSha256:z.pricing?sha(z.pricing.value):null,pricingBytes:z.pricing?Buffer.byteLength(z.pricing.value):null})};
}

export async function createConnections({readOnly,mode}={}){
 need(typeof readOnly==='boolean'&&['plan','apply','reconcile','finish-catalog'].includes(mode)&&readOnly===(mode==='plan'||mode==='reconcile'),'mo_modus');
 const [{POLICY,loadPinnedMapping},g,{loadPricingFunctions,createMainPricingConnection},{createWorkshop},{createShopBindingReadAdapter},{SHOPIFY_IDENTITY}]=await Promise.all([paket('main-operator.mjs'),paket('gateways.mjs'),paket('main-pricing.mjs'),rt('app/workshop/http.mjs'),rt('app/workshop/shop-product-binding-adapter.mjs'),rt('app/workshop/shopify-runtime-config.mjs')]);
 need(SHOPIFY_IDENTITY.shopDomain===POLICY.shopDomain,'mo_shopidentitaet');
 const seed=JSON.parse(fs.readFileSync(path.join(BAU,'models.json'),'utf8'))[0],wFile=path.join(DATEN,'workshop.sqlite');
 delete process.env.GRAVURU_KATALOG_WORKER;
 // tatsächliche native Fabrik – dieselbe wie im Host (scripts/shopify-admin-test-server.mjs), ohne HTTP-Server
 const workshop=createWorkshop({filename:wFile,seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:{mode:'test-only',shopDomain:POLICY.shopDomain,clientId:SHOPIFY_IDENTITY.clientId,secret:crypto.randomBytes(32).toString('hex')}});
 const eintrag={mode,readOnly,idBindingsOhnePreisprovider:0,idBindingsMitPreisprovider:0,checker:0,evidenzNeuGelesen:false};protokoll.push(eintrag);
 try{
  need(workshop.tenantId===POLICY.tenantId,'mo_mandant');
  // derselbe Adapteraufruf wie configurator-integration.mjs:46 (Acryl-Store)
  const adapter=createShopBindingReadAdapter({storeId:POLICY.storeId,tenantId:workshop.tenantId,shopDomain:POLICY.shopDomain,productionProfileScope:{storeId:POLICY.storeId,tenantId:workshop.tenantId},workshop});
  const syn=syntheticShop(POLICY,g),shopify=g.createMainShopifyGateway({graphqlRead:syn.read,graphqlWriteOnce:syn.writeOnce,mutationRetries:0});
  const functions=await loadPricingFunctions(RT);
  let plain=null;const hostRegistry=()=>{if(!plain){plain=workshop.orderIntake.idBindings({storeId:POLICY.storeId,shopDomain:POLICY.shopDomain,adapter});eintrag.idBindingsOhnePreisprovider++;}return plain;};
  let evidence;
  if(fs.existsSync(EVIDENZ))evidence=JSON.parse(fs.readFileSync(EVIDENZ,'utf8'));
  else{
   // Nur beim ersten Plan: die 808 tatsächlichen ursprünglichen R1-Zuordnungen aus der vorhandenen Registry lesen und privat festhalten.
   need(mode==='plan','mo_evidenz_fehlt');const mapping=loadPinnedMapping(path.join(PAKET,'variant-mapping.preview.json.gz')),ids=[...mapping.matches,...mapping.residual].map(v=>v.id);
   const rows=await hostRegistry().resolveMany(ids.map(id=>({shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:id})));need(rows.length===808&&rows.every(r=>r.productRevision===1&&typeof r.bindingId==='string'),'mo_r1_zuordnungen');
   evidence={observedField:await shopify.readPricing(),historicalContracts:rows.map(r=>({bindingId:r.bindingId,shopifyVariantId:r.shopifyVariantId,contract:workshop.orderIntake.bindingPricing(r.bindingId)})),functionEvidence:{...TEST_FUNCTION,observedAt:new Date().toISOString()}};
   fs.writeFileSync(EVIDENZ,JSON.stringify(evidence),{flag:'wx',mode:0o600});eintrag.evidenzNeuGelesen=true;
  }
  const targetDocument=workshop.repository.get(POLICY.productId,{revision:2}).document;
  const pricing=createMainPricingConnection({native:functions,repository:workshop.repository,orders:workshop.orderIntake,shopify,targetDocument,evidence,verifyActiveFunction:async()=>({...TEST_FUNCTION,observedAt:new Date().toISOString()})});
  let native;
  if(readOnly)native=g.createMainReadOnlyGateway({workshop,registry:hostRegistry()});
  else{const registry=g.createMainBindingConnection({workshop,adapter,pricing});eintrag.idBindingsMitPreisprovider++;native=await g.createMainNativeGateway({codeRoot:RT,workshop,registry,reader:syn.reader,adapter,pricing});eintrag.checker++;}
  eintrag.nativeMethoden=Object.keys(native).sort();
  let zu=false;return {shopify,native,pricing,async close(){if(!zu){zu=true;globalThis.__moShopZustand=syn.zustand();workshop.close();}}};
 }catch(e){try{workshop.close();}catch{}throw e;}
}
