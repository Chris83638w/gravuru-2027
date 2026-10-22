import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readCredentials,createShopifyClient,exportProducts,buildSkuIndex,summarize,writeExport,redact,parseArgs,run,PRODUCTS_QUERY,VARIANTS_QUERY,SHOP_DOMAIN,API_VERSION} from './shop-export.mjs';

// Synthetischer Shop: 7 Produkte, eines mit 3 Varianten über zwei Variantenseiten, eine doppelte SKU.
const SECRET='synthetic_client_secret_0123456789';
const TOKEN='shpat_synthetic_access_token_000001';
function product(n,variants){return {id:'gid://shopify/Product/'+n,title:'Produkt '+n,handle:'produkt-'+n,status:n%3===0?'DRAFT':'ACTIVE',productType:'Türschild',vendor:'gravuru',tags:['t'+n],updatedAt:'2026-10-23T00:00:00Z',
 options:[{id:'gid://shopify/ProductOption/'+n,name:variants.length>1?'Befestigung':'Title',position:1,optionValues:variants.map(v=>({id:'gid://shopify/ProductOptionValue/'+v.id,name:v.title}))}],
 metafield:n===1?{value:'3100000'}:null,variants:variants.map(v=>({id:'gid://shopify/ProductVariant/'+v.id,sku:v.sku,title:v.title,price:v.price,compareAtPrice:null,inventoryItem:{tracked:false},selectedOptions:[{name:variants.length>1?'Befestigung':'Title',value:v.title}]}))};}
const SHOP=[
 product(1,[{id:11,sku:'TRE-V2A-7x2-D5',title:'Ohne Bohrung',price:'8.99'},{id:12,sku:'TRE-V2A-7x2-D5-KGL',title:'Selbstklebend – glatte Flächen',price:'11.98'},{id:13,sku:'TRE-V2A-7x2-D5-KRA',title:'Selbstklebend – raue Flächen',price:'12.98'}]),
 product(2,[{id:21,sku:'GT-PS-30x20',title:'Default Title',price:'19.99'}]),
 product(3,[{id:31,sku:'GT-PS-30x20',title:'Default Title',price:'49.95'}]),
 product(4,[{id:41,sku:null,title:'Default Title',price:'34.90'}]),
 product(5,[{id:51,sku:'TRE-S-8x3,5-D1',title:'Default Title',price:'16.90'}]),
 product(6,[{id:61,sku:'TO-A-9x6-D38',title:'Default Title',price:'22.90'}]),
 product(7,[{id:71,sku:'TRE-AV2A-9x6(7x4)-D3',title:'Default Title',price:'29.90'}])
];
const cost=(req,avail=1000)=>({requestedQueryCost:req,actualQueryCost:req,throttleStatus:{maximumAvailable:1000,currentlyAvailable:avail,restoreRate:50}});
const json=(body,status=200,headers={})=>({ok:status>=200&&status<300,status,headers:{get:k=>headers[k.toLowerCase()]??null},text:async()=>JSON.stringify(body)});
// Fake-Shopify: Token nur gegen das richtige Geheimnis; Produkte paginiert; Varianten des ersten Produkts auf zwei Seiten.
function fakeShopify({variantsPerPage=2,tokenCalls={n:0},requests=[],fail429Once=false,throttleOnce=false}={}){
 let served429=false,throttled=false;
 return async(url,init)=>{
  requests.push({url,headers:init.headers,body:init.body});
  if(url.endsWith('/admin/oauth/access_token')){
   tokenCalls.n++;const params=new URLSearchParams(init.body);
   if(params.get('client_secret')!==SECRET||params.get('grant_type')!=='client_credentials')return json({error:'invalid_client'},401);
   return json({access_token:TOKEN,expires_in:86399,scope:'read_products'});
  }
  assert.equal(url,`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`);
  if(init.headers['X-Shopify-Access-Token']!==TOKEN)return json({errors:[{message:'Invalid API key or access token'}]},401);
  if(fail429Once&&!served429){served429=true;return json({errors:'rate'},429,{'retry-after':'0.01'});}
  if(throttleOnce&&!throttled){throttled=true;return json({errors:[{message:'Throttled',extensions:{code:'THROTTLED'}}],extensions:{cost:cost(400,10)}});}
  const {query,variables}=JSON.parse(init.body);
  if(query===PRODUCTS_QUERY){
   const start=variables.after?Number(variables.after):0,slice=SHOP.slice(start,start+variables.first);
   const nodes=slice.map(p=>({...p,variants:{nodes:p.variants.slice(0,variantsPerPage),pageInfo:{hasNextPage:p.variants.length>variantsPerPage,endCursor:String(variantsPerPage)}}}));
   return json({data:{products:{nodes,pageInfo:{hasNextPage:start+variables.first<SHOP.length,endCursor:String(start+variables.first)}}},extensions:{cost:cost(354)}});
  }
  if(query===VARIANTS_QUERY){
   const p=SHOP.find(x=>x.id===variables.id),start=Number(variables.after);
   const nodes=p.variants.slice(start,start+variables.first),hasNextPage=start+variables.first<p.variants.length;
   return json({data:{product:{id:p.id,variants:{nodes,pageInfo:{hasNextPage,endCursor:String(start+variables.first)}}}},extensions:{cost:cost(30)}});
  }
  return json({errors:[{message:'unknown query'}]});
 };
}
const client=(fetchImpl,extra={})=>createShopifyClient({credentials:{kind:'client_credentials',secret:SECRET},fetchImpl,sleep:async()=>{},...extra});

test('Zugang: Token, Geheimnisdatei oder Geheimnis aus der Umgebung – Fehler nennen nur Feldnamen',()=>{
 assert.deepEqual(readCredentials({GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN:TOKEN}),{kind:'token',accessToken:TOKEN,source:'GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN'});
 assert.deepEqual(readCredentials({GRAVURU_SHOPIFY_CLIENT_SECRET_FILE:'/x/secret',GRAVURU_SHOPIFY_CLIENT_SECRET:'ignored_because_file_wins_000'},{readFile:f=>{assert.equal(f,'/x/secret');return SECRET+'\n';}}),{kind:'client_credentials',secret:SECRET,source:'GRAVURU_SHOPIFY_CLIENT_SECRET_FILE'});
 assert.deepEqual(readCredentials({GRAVURU_SHOPIFY_CLIENT_SECRET:SECRET}),{kind:'client_credentials',secret:SECRET,source:'GRAVURU_SHOPIFY_CLIENT_SECRET'});
 assert.throws(()=>readCredentials({}),{code:'credentials_missing'});
 assert.throws(()=>readCredentials({GRAVURU_SHOPIFY_CLIENT_SECRET:'kurz'}),{code:'credentials_format'});
 const err=(()=>{try{readCredentials({GRAVURU_SHOPIFY_CLIENT_SECRET_FILE:'/nicht/da'},{readFile:()=>{throw Error('ENOENT');}});}catch(e){return e;}})();
 assert.equal(err.code,'credentials_file');assert.doesNotMatch(err.message,/ENOENT|nicht\/da/);
 assert.equal(redact('Fehler mit '+SECRET+' und '+TOKEN,[SECRET,TOKEN]),'Fehler mit [redacted] und [redacted]');
});

test('Export: Token einmal holen, alle Seiten lesen, Varianten nachladen, Index mit doppelter SKU, Summary ohne Geheimnis',async()=>{
 const tokenCalls={n:0},requests=[],fetchImpl=fakeShopify({tokenCalls,requests});
 const c=client(fetchImpl),pages=[];
 const result=await exportProducts(c,{pageSize:3,variantPageSize:2,onPage:p=>pages.push(p)});
 assert.equal(result.complete,true);assert.equal(result.pages,3);assert.equal(result.variantPages,1);assert.equal(result.products.length,7);
 assert.deepEqual(pages.map(p=>[p.page,p.products,p.hasNextPage]),[[1,3,true],[2,6,true],[3,7,false]]);
 assert.equal(tokenCalls.n,1,'Token wird zwischengespeichert');
 const first=result.products[0];
 assert.deepEqual(first.variants.nodes.map(v=>v.sku),['TRE-V2A-7x2-D5','TRE-V2A-7x2-D5-KGL','TRE-V2A-7x2-D5-KRA'],'dritte Variante aus der Nachladeseite');
 assert.deepEqual(first.metafield,{value:'3100000'});assert.equal(first.variants.nodes[0].inventoryItem.tracked,false);
 assert.deepEqual(first.options,[{id:'gid://shopify/ProductOption/1',name:'Befestigung',position:1,values:['Ohne Bohrung','Selbstklebend – glatte Flächen','Selbstklebend – raue Flächen'],optionValueIds:['gid://shopify/ProductOptionValue/11','gid://shopify/ProductOptionValue/12','gid://shopify/ProductOptionValue/13']}],'Optionswerte aus optionValues abgeleitet');
 assert.equal(result.products[3].variants.nodes[0].sku,null);
 const index=buildSkuIndex(result.products);
 assert.deepEqual(index.counts,{variants:9,withSku:8,withoutSku:1,uniqueSkus:6,duplicateSkus:1});
 assert.deepEqual(index.duplicates.map(d=>[d.sku,d.entries.map(e=>e.productId)]),[['GT-PS-30x20',['gid://shopify/Product/2','gid://shopify/Product/3']]]);
 assert.equal(index.skus['GT-PS-30x20'],undefined,'doppelte SKU steht nicht als Erster-Treffer im Index');
 assert.deepEqual(index.skus['TRE-AV2A-9x6(7x4)-D3'],{productId:'gid://shopify/Product/7',variantId:'gid://shopify/ProductVariant/71',price:'29.90',status:'ACTIVE',handle:'produkt-7'});
 assert.deepEqual(index.skus['TRE-S-8x3,5-D1'].variantId,'gid://shopify/ProductVariant/51');
 const summary=summarize({...result,skuIndex:index,startedAt:'2026-10-23T10:00:00.000Z',finishedAt:'2026-10-23T10:00:04.000Z',pageSize:3,variantPageSize:2,stats:c.stats});
 assert.equal(summary.durationMs,4000);assert.deepEqual(summary.byStatus,{ACTIVE:5,DRAFT:2});assert.equal(summary.withCustomizationId,1);assert.deepEqual(summary.duplicateSkus,['GT-PS-30x20']);
 assert.equal(summary.requests,4);assert.equal(summary.requestedCost,354*3+30);
 const text=JSON.stringify([summary,index,result.products]);assert.doesNotMatch(text,new RegExp(SECRET));assert.doesNotMatch(text,new RegExp(TOKEN));
 for(const r of requests.filter(r=>r.url.endsWith('graphql.json')))assert.equal(r.headers['X-Shopify-Access-Token'],TOKEN);
});

test('--max-pages liefert einen Teilexport mit Cursor; Dateien werden geschrieben',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-shop-export-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const result=await exportProducts(client(fakeShopify()),{pageSize:3,variantPageSize:100,maxPages:1});
 assert.equal(result.complete,false);assert.equal(result.products.length,3);assert.equal(result.lastCursor,'3');
 const skuIndex=buildSkuIndex(result.products),summary=summarize({...result,skuIndex,startedAt:'2026-10-23T10:00:00.000Z',finishedAt:'2026-10-23T10:00:01.000Z',pageSize:3,variantPageSize:100});
 const files=await writeExport(dir,{products:result.products,skuIndex,summary,exportedAt:'2026-10-23T10:00:01.000Z',note:'Teil'});
 assert.deepEqual(files.map(f=>path.basename(f)),['products.json','sku-index.json','summary.json']);
 const products=JSON.parse(fs.readFileSync(path.join(dir,'products.json'),'utf8'));
 assert.equal(products.schema,'gravuru-shop-export/v1');assert.equal(products.complete,false);assert.equal(products.products.length,3);assert.equal(products.note,'Teil');
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'summary.json'),'utf8')).lastCursor,'3');
});

test('Wiederholung bei 429 und THROTTLED mit Wartezeit, Ablehnung bei falschem Geheimnis, Token-Erneuerung bei 401',async()=>{
 const waits=[];
 const c=createShopifyClient({credentials:{kind:'client_credentials',secret:SECRET},fetchImpl:fakeShopify({fail429Once:true,throttleOnce:true}),sleep:async ms=>{waits.push(ms);}});
 const result=await exportProducts(c,{pageSize:250});
 assert.equal(result.products.length,7);assert.equal(c.stats.retries,2);assert.equal(c.stats.throttleWaits,1);
 assert.ok(waits.length===2&&waits[0]===10,'Retry-After in Sekunden → Millisekunden');assert.ok(waits[1]>=1000,'THROTTLED wartet auf den Kostenstand');
 const wrong=createShopifyClient({credentials:{kind:'client_credentials',secret:'falsches_geheimnis_000000000'},fetchImpl:fakeShopify(),sleep:async()=>{}});
 await assert.rejects(exportProducts(wrong),e=>{assert.equal(e.code,'token_http');assert.doesNotMatch(e.message,/falsches_geheimnis/);return true;});
 // Festes Token: direkt verwendet, bei 401 sofort Fehler ohne Geheimnis im Text.
 const tokenCalls={n:0};const direct=createShopifyClient({credentials:{kind:'token',accessToken:TOKEN},fetchImpl:fakeShopify({tokenCalls}),sleep:async()=>{}});
 assert.equal((await exportProducts(direct,{pageSize:250})).products.length,7);assert.equal(tokenCalls.n,0);
 const bad=createShopifyClient({credentials:{kind:'token',accessToken:'shpat_wrong_token_0000000000'},fetchImpl:fakeShopify(),sleep:async()=>{}});
 await assert.rejects(exportProducts(bad),e=>{assert.equal(e.code,'http_401');assert.doesNotMatch(e.message,/shpat_wrong/);return true;});
 // Abgelaufenes Token (401 bei client_credentials) wird einmal erneuert.
 let graphqlCalls=0;const renew=async(url,init)=>{if(url.endsWith('access_token'))return json({access_token:TOKEN,expires_in:3600,scope:'read_products'});graphqlCalls++;if(graphqlCalls===1)return json({errors:[{message:'expired'}]},401);return json({data:{products:{nodes:[],pageInfo:{hasNextPage:false,endCursor:null}}},extensions:{cost:cost(10)}});};
 const r=await exportProducts(createShopifyClient({credentials:{kind:'client_credentials',secret:SECRET},fetchImpl:renew,sleep:async()=>{}}));
 assert.equal(r.products.length,0);assert.equal(graphqlCalls,2);
});

test('GraphQL-Fehler und ungültige Argumente brechen klar ab',async()=>{
 const broken=async(url)=>url.endsWith('access_token')?json({access_token:TOKEN,expires_in:3600,scope:''}):json({errors:[{message:'Field products doesnt exist',extensions:{code:'undefinedField'}}]});
 await assert.rejects(exportProducts(client(broken)),{code:'graphql'});
 await assert.rejects(exportProducts(client(fakeShopify()),{pageSize:0}),/--page-size/);
 assert.throws(()=>createShopifyClient({credentials:{kind:'client_credentials',secret:SECRET},fetchImpl:fakeShopify(),shopDomain:'fremd.example.com'}),{code:'configuration'});
 assert.deepEqual(parseArgs(['--out','x','--max-pages','2','--page-size','50']),{out:'x',maxPages:2,pageSize:50,variantPageSize:100,quiet:false});
 assert.throws(()=>parseArgs(['--out','x','--max-pages','null']),/--max-pages/);
});

test('run(): kompletter Lauf mit Fake-Shop, Secret-Datei und Ausgabeordner',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-shop-export-run-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const secretFile=path.join(dir,'secret.txt');fs.writeFileSync(secretFile,SECRET+'\n');
 let out='',err='';
 const summary=await run(['--out',path.join(dir,'export'),'--page-size','4'],{env:{GRAVURU_SHOPIFY_CLIENT_SECRET_FILE:secretFile},fetchImpl:fakeShopify(),stdout:{write:s=>out+=s},stderr:{write:s=>err+=s}});
 assert.equal(summary.products,7);assert.equal(summary.complete,true);assert.equal(summary.pages,2);
 assert.ok(fs.existsSync(path.join(dir,'export','sku-index.json')));
 assert.doesNotMatch(out+err,new RegExp(SECRET));assert.match(err,/GRAVURU_SHOPIFY_CLIENT_SECRET_FILE/);
 await assert.rejects(run([],{env:{},fetchImpl:fakeShopify()}),/Aufruf/);
});
