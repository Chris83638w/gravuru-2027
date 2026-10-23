// Shop-Export (Händlerhost): alle Shopify-Produkte mit Varianten lesen und als Dateien ablegen.
// Aufruf: node scripts/shop-export.mjs --out <ordner> [--max-pages n] [--page-size 250] [--variants-first 100]
// Zugang (nur Namen, nie Werte ausgeben): GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN (direkt) oder
// GRAVURU_SHOPIFY_CLIENT_SECRET_FILE (Datei) bzw. GRAVURU_SHOPIFY_CLIENT_SECRET → client_credentials.
// Nur node:*-Module, keine npm-Abhängigkeiten, nur lesende GraphQL-Abfragen. Spezifikation: scripts/SHOP-SYNC.txt.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const SHOP_DOMAIN='gravuru-design.myshopify.com';
export const CLIENT_ID='9640dd7a6907f0c73e7013ea8c24869b';// öffentliche App-Kennung (kein Geheimnis)
export const API_VERSION='2026-07';
export const EXPORT_SCHEMA='gravuru-shop-export/v1';
export const SKU_INDEX_SCHEMA='gravuru-shop-sku-index/v1';
export const SUMMARY_SCHEMA='gravuru-shop-export-summary/v1';
export const METAFIELD={namespace:'custom',key:'customization_id'};
const VARIANT_FIELDS='id sku title price compareAtPrice inventoryItem{tracked} selectedOptions{name value}';
export const PRODUCTS_QUERY=`query GravuruShopExport($first:Int!,$after:String,$variants:Int!){products(first:$first,after:$after,sortKey:ID){nodes{id title handle status productType vendor tags updatedAt options{id name position optionValues{id name}} metafield(namespace:"${METAFIELD.namespace}",key:"${METAFIELD.key}"){value} designSha:metafield(namespace:"custom",key:"design_sha256"){value} variants(first:$variants){nodes{${VARIANT_FIELDS}} pageInfo{hasNextPage endCursor}}} pageInfo{hasNextPage endCursor}}}`;
export const VARIANTS_QUERY=`query GravuruShopExportVariants($id:ID!,$first:Int!,$after:String){product(id:$id){id variants(first:$first,after:$after){nodes{${VARIANT_FIELDS}} pageInfo{hasNextPage endCursor}}}}`;

const SECRET=/^[A-Za-z0-9_-]{16,256}$/,TOKEN=/^[\x21-\x7e]{16,4096}$/;
const fail=(message,code)=>{throw Object.assign(Error(message),code?{code}:{});};
const defaultSleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// Zugang aus der Umgebung. Rückgabe trägt den Wert nur im Speicher; Fehlermeldungen nennen nur Feldnamen.
export function readCredentials(env=process.env,{readFile=file=>fs.readFileSync(file,'utf8')}={}){
 const token=env.GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN;
 if(token!==undefined&&token!==''){if(!TOKEN.test(token))fail('GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN hat ein ungültiges Format.','credentials_format');return {kind:'token',accessToken:token,source:'GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN'};}
 const file=env.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE;
 if(file!==undefined&&file!==''){
  let secret;try{secret=String(readFile(file)).trim();}catch{fail('GRAVURU_SHOPIFY_CLIENT_SECRET_FILE ist nicht lesbar.','credentials_file');}
  if(!SECRET.test(secret))fail('Inhalt von GRAVURU_SHOPIFY_CLIENT_SECRET_FILE hat ein ungültiges Format.','credentials_format');
  return {kind:'client_credentials',secret,source:'GRAVURU_SHOPIFY_CLIENT_SECRET_FILE'};
 }
 const secret=env.GRAVURU_SHOPIFY_CLIENT_SECRET;
 if(secret!==undefined&&secret!==''){if(!SECRET.test(secret))fail('GRAVURU_SHOPIFY_CLIENT_SECRET hat ein ungültiges Format.','credentials_format');return {kind:'client_credentials',secret,source:'GRAVURU_SHOPIFY_CLIENT_SECRET'};}
 fail('Zugang fehlt: GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN oder GRAVURU_SHOPIFY_CLIENT_SECRET_FILE bzw. GRAVURU_SHOPIFY_CLIENT_SECRET setzen.','credentials_missing');
}

// Geheimnisse aus Fehlertexten entfernen, bevor etwas protokolliert wird.
export function redact(text,secrets){let out=String(text);for(const s of secrets)if(s&&s.length>=8)out=out.replaceAll(s,'[redacted]');return out;}

// Shopify-Admin-Client: Token holen (client_credentials) oder festes Token, GraphQL mit
// Kostenbremse (extensions.cost.throttleStatus) und Wiederholung mit Backoff bei 429/5xx/THROTTLED/Netzfehlern.
export function createShopifyClient({shopDomain=SHOP_DOMAIN,clientId=CLIENT_ID,apiVersion=API_VERSION,credentials,fetchImpl=globalThis.fetch,now=Date.now,sleep=defaultSleep,log=()=>{},maxRetries=6,timeoutMs=45000}={}){
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain))fail('Shop-Domain ungültig.','configuration');
 if(!credentials||!['token','client_credentials'].includes(credentials.kind))fail('Zugang fehlt.','credentials_missing');
 if(typeof fetchImpl!=='function')fail('fetch fehlt.','configuration');
 const secrets=[credentials.secret,credentials.accessToken].filter(Boolean);
 const stats={requests:0,retries:0,throttleWaits:0,throttleWaitMs:0,requestedCost:0,actualCost:0,tokenRequests:0};
 let cached=credentials.kind==='token'?{value:credentials.accessToken,refreshAt:Infinity}:null;
 const clean=e=>redact(e?.message||String(e),secrets);
 async function http(url,init){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(url,{...init,redirect:'error',signal:controller.signal});
   const text=await response.text();
   let json=null;try{json=JSON.parse(text);}catch{}
   return {status:response.status,ok:response.ok,headers:response.headers,json,textLength:text.length};
  }finally{clearTimeout(timer);}
 }
 async function token(){
  if(cached&&now()<cached.refreshAt)return cached.value;
  stats.tokenRequests++;
  const started=now();
  let response;
  try{response=await http(`https://${shopDomain}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:credentials.secret}).toString()});}
  catch(e){fail('Token-Anfrage fehlgeschlagen: '+clean(e),'token_network');}
  if(!response.ok)fail('Token-Anfrage abgelehnt: HTTP '+response.status,'token_http');
  const v=response.json;
  if(!TOKEN.test(v?.access_token||'')||!Number.isInteger(v.expires_in)||v.expires_in<120)fail('Token-Antwort unvollständig.','token_response');
  secrets.push(v.access_token);
  cached={value:v.access_token,refreshAt:started+v.expires_in*1000-60000};
  return cached.value;
 }
 const throttleWait=(cost,needed)=>{
  const t=cost?.throttleStatus;if(!t||!Number.isFinite(t.currentlyAvailable)||!(t.restoreRate>0))return 0;
  const missing=needed-t.currentlyAvailable;return missing>0?Math.ceil(missing/t.restoreRate*1000)+250:0;
 };
 let lastCost=null;
 async function graphql(query,variables={}){
  let attempt=0;
  for(;;){
   // Vor der Anfrage warten, wenn der letzte Kostenstand für dieselbe Abfrage nicht reicht.
   const pre=throttleWait(lastCost,lastCost?.requestedQueryCost??0);
   if(pre>0){stats.throttleWaits++;stats.throttleWaitMs+=pre;log('Kostenbremse: '+pre+' ms warten');await sleep(pre);}
   const accessToken=await token();stats.requests++;
   let response,error=null;
   try{response=await http(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json','X-Shopify-Access-Token':accessToken},body:JSON.stringify({query,variables})});}
   catch(e){error='Netzfehler: '+clean(e);}
   if(!error&&response.status===401){if(credentials.kind==='token')fail('Shopify lehnt GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN ab (HTTP 401).','http_401');cached=null;error='HTTP 401 (Token abgelaufen, wird erneuert)';}
   else if(!error&&(response.status===429||response.status>=500)){const retryAfter=Number(response.headers?.get?.('retry-after'));error='HTTP '+response.status+(Number.isFinite(retryAfter)&&retryAfter>0?' (Retry-After '+retryAfter+' s)':'');if(Number.isFinite(retryAfter)&&retryAfter>0)error={message:error,waitMs:retryAfter*1000};}
   else if(!error&&!response.ok)fail('Shopify-Anfrage abgelehnt: HTTP '+response.status,'http_'+response.status);
   else if(!error&&!response.json)error='Antwort ist kein JSON';
   if(!error){
    const body=response.json,cost=body.extensions?.cost??null;
    if(cost){lastCost=cost;stats.requestedCost+=cost.requestedQueryCost||0;stats.actualCost+=cost.actualQueryCost||0;}
    const errors=Array.isArray(body.errors)?body.errors:[];
    const throttled=errors.some(e=>e?.extensions?.code==='THROTTLED'||/throttled/i.test(e?.message||''));
    if(throttled){const wait=Math.max(1000,throttleWait(cost,cost?.requestedQueryCost??0));lastCost=null;error={message:'THROTTLED',waitMs:wait};}
    else if(errors.length){fail('GraphQL-Fehler: '+errors.map(e=>redact(e.message,secrets)+(e.extensions?.code?' ['+e.extensions.code+']':'')).join('; '),'graphql');}
    else if(!body.data)fail('GraphQL-Antwort ohne Daten.','graphql');
    else return {data:body.data,cost};
   }
   attempt++;if(attempt>maxRetries)fail('Shopify-Anfrage nach '+maxRetries+' Wiederholungen nicht erfolgreich: '+(error.message||error),'retries_exhausted');
   const wait=error.waitMs??Math.min(30000,500*2**attempt);
   stats.retries++;if(error.message==='THROTTLED'){stats.throttleWaits++;stats.throttleWaitMs+=wait;}
   log('Wiederholung '+attempt+'/'+maxRetries+' nach '+wait+' ms: '+(error.message||error));
   await sleep(wait);
  }
 }
 return Object.freeze({shopDomain,apiVersion,graphql,stats});
}

const normalizeVariant=v=>({id:v.id,sku:v.sku??null,title:v.title??null,price:v.price,compareAtPrice:v.compareAtPrice??null,inventoryItem:{tracked:v.inventoryItem?.tracked===true},selectedOptions:(v.selectedOptions||[]).map(o=>({name:o.name,value:o.value}))});
export function normalizeProduct(p){
 return {id:p.id,title:p.title,handle:p.handle,status:p.status,productType:p.productType??'',vendor:p.vendor??null,tags:Array.isArray(p.tags)?p.tags:[],updatedAt:p.updatedAt??null,
  // Werte aus optionValues (API ≥ 2024-04); ältere Exporte liefern `values` direkt.
  options:(p.options||[]).map(o=>({id:o.id??null,name:o.name,position:o.position??null,values:Array.isArray(o.optionValues)?o.optionValues.map(v=>v.name):Array.isArray(o.values)?o.values:[],...(Array.isArray(o.optionValues)?{optionValueIds:o.optionValues.map(v=>v.id??null)}:{})})),
  metafield:p.metafield&&typeof p.metafield.value==='string'?{value:p.metafield.value}:null,
  designSha256:p.designSha&&typeof p.designSha.value==='string'?p.designSha.value:null,
  variants:{nodes:(p.variants?.nodes||[]).map(normalizeVariant)}};
}

// Alle Produkte seitenweise (sortKey ID); Varianten über 100 je Produkt werden nachgeladen.
export async function exportProducts(client,{pageSize=250,variantPageSize=100,maxPages=Infinity,onPage=()=>{}}={}){
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>250)fail('--page-size: 1 bis 250.');
 if(!Number.isInteger(variantPageSize)||variantPageSize<1||variantPageSize>250)fail('--variants-first: 1 bis 250.');
 const products=[];let after=null,pages=0,complete=false,variantPages=0;
 for(;;){
  const {data}=await client.graphql(PRODUCTS_QUERY,{first:pageSize,after,variants:variantPageSize});
  const page=data.products;if(!page||!Array.isArray(page.nodes))fail('Produktliste fehlt in der Antwort.','response');
  pages++;
  for(const raw of page.nodes){
   const product=normalizeProduct(raw);
   let info=raw.variants?.pageInfo;
   while(info?.hasNextPage){
    variantPages++;
    const more=(await client.graphql(VARIANTS_QUERY,{id:product.id,first:variantPageSize,after:info.endCursor})).data.product;
    if(more?.id!==product.id||!Array.isArray(more.variants?.nodes))fail('Varianten von '+product.id+' konnten nicht nachgeladen werden.','response');
    product.variants.nodes.push(...more.variants.nodes.map(normalizeVariant));info=more.variants.pageInfo;
   }
   products.push(product);
  }
  onPage({page:pages,products:products.length,hasNextPage:page.pageInfo?.hasNextPage===true});
  after=page.pageInfo?.endCursor??null;
  if(page.pageInfo?.hasNextPage!==true){complete=true;break;}
  if(pages>=maxPages)break;
 }
 return {products,pages,variantPages,complete,lastCursor:after};
}

// SKU → {productId, variantId, price, status, handle}; doppelte SKUs getrennt gelistet (kein stiller Erster-Treffer).
export function buildSkuIndex(products){
 const seen=new Map();let variants=0,withoutSku=0;
 for(const p of products)for(const v of p.variants.nodes){
  variants++;const sku=typeof v.sku==='string'?v.sku.trim():'';
  if(!sku){withoutSku++;continue;}
  if(!seen.has(sku))seen.set(sku,[]);
  seen.get(sku).push({productId:p.id,variantId:v.id,price:v.price,status:p.status,handle:p.handle});
 }
 const skus={},duplicates=[];
 for(const [sku,entries] of [...seen.entries()].sort(([a],[b])=>a.localeCompare(b,'en'))){
  if(entries.length===1)skus[sku]=entries[0];else duplicates.push({sku,entries});
 }
 return {schema:SKU_INDEX_SCHEMA,skus,duplicates,counts:{variants,withSku:variants-withoutSku,withoutSku,uniqueSkus:Object.keys(skus).length,duplicateSkus:duplicates.length}};
}

export function summarize({products,pages,variantPages,complete,lastCursor,skuIndex,startedAt,finishedAt,pageSize,variantPageSize,stats,shopDomain=SHOP_DOMAIN,apiVersion=API_VERSION}){
 const byStatus={};for(const p of products)byStatus[p.status]=(byStatus[p.status]||0)+1;
 return {schema:SUMMARY_SCHEMA,shopDomain,apiVersion,startedAt,finishedAt,durationMs:Date.parse(finishedAt)-Date.parse(startedAt),pages,variantPages,pageSize,variantPageSize,complete,lastCursor,
  products:products.length,variants:skuIndex.counts.variants,byStatus,withCustomizationId:products.filter(p=>p.metafield).length,
  skus:skuIndex.counts,duplicateSkus:skuIndex.duplicates.map(d=>d.sku),requests:stats?.requests??null,retries:stats?.retries??null,throttleWaits:stats?.throttleWaits??null,throttleWaitMs:stats?.throttleWaitMs??null,requestedCost:stats?.requestedCost??null,actualCost:stats?.actualCost??null};
}

async function atomicWrite(file,value){const temp=file+'.new';await fsp.writeFile(temp,JSON.stringify(value,null,1)+'\n');await fsp.rename(temp,file);}
export async function writeExport(outDir,{products,skuIndex,summary,exportedAt,note}){
 await fsp.mkdir(outDir,{recursive:true});
 await atomicWrite(path.join(outDir,'products.json'),{schema:EXPORT_SCHEMA,shopDomain:summary.shopDomain,apiVersion:summary.apiVersion,exportedAt,complete:summary.complete,...(note?{note}:{}),products});
 await atomicWrite(path.join(outDir,'sku-index.json'),skuIndex);
 await atomicWrite(path.join(outDir,'summary.json'),summary);
 return ['products.json','sku-index.json','summary.json'].map(n=>path.join(outDir,n));
}

export function parseArgs(argv){
 const value=name=>{const i=argv.indexOf('--'+name);return i>=0&&!String(argv[i+1]??'').startsWith('--')?argv[i+1]:undefined;};
 const int=(name,fallback)=>{const v=value(name);if(v===undefined)return fallback;const n=Number(v);if(!Number.isInteger(n)||n<1)fail('--'+name+' braucht eine ganze Zahl ≥ 1.');return n;};
 return {out:value('out'),maxPages:int('max-pages',Infinity),pageSize:int('page-size',250),variantPageSize:int('variants-first',100),quiet:argv.includes('--quiet')};
}

export async function run(argv,{env=process.env,fetchImpl=globalThis.fetch,stdout=process.stdout,stderr=process.stderr}={}){
 const args=parseArgs(argv);
 if(!args.out)fail('Aufruf: node scripts/shop-export.mjs --out <ordner> [--max-pages n] [--page-size 250] [--variants-first 100]');
 const log=m=>{if(!args.quiet)stderr.write(m+'\n');};
 const credentials=readCredentials(env);
 log('Zugang: '+credentials.source+' ('+credentials.kind+'), Shop '+SHOP_DOMAIN+', API '+API_VERSION);
 const client=createShopifyClient({credentials,fetchImpl,log});
 const startedAt=new Date().toISOString();
 const result=await exportProducts(client,{pageSize:args.pageSize,variantPageSize:args.variantPageSize,maxPages:args.maxPages,onPage:p=>log('Seite '+p.page+': '+p.products+' Produkte'+(p.hasNextPage?' …':' (Ende)'))});
 const finishedAt=new Date().toISOString(),skuIndex=buildSkuIndex(result.products);
 const summary=summarize({...result,skuIndex,startedAt,finishedAt,pageSize:args.pageSize,variantPageSize:args.variantPageSize,stats:client.stats});
 const files=await writeExport(path.resolve(args.out),{products:result.products,skuIndex,summary,exportedAt:finishedAt,note:result.complete?undefined:'Teilexport (--max-pages '+args.maxPages+'), letzter Cursor in summary.json'});
 stdout.write(JSON.stringify({products:summary.products,variants:summary.variants,pages:summary.pages,complete:summary.complete,duplicateSkus:summary.duplicateSkus,durationMs:summary.durationMs,files},null,1)+'\n');
 return summary;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(e=>{process.stderr.write((e.code?'['+e.code+'] ':'')+e.message+'\n');process.exitCode=1;});
