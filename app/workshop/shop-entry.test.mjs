import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import {once} from 'node:events';
import {createShopEntry} from './shop-entry.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {createModelSlimmer} from './shop-model-slim.mjs';

// Fixture: die drei 7×2-Hauptprodukte (Edelstahl-Türschilder, Befestigung als Variante) aus der Shopify-
// Übergabe vom 22.10.2026. Shopify-IDs und Preise stammen aus der Datei; Werkstattmodell, Registry, Entwürfe
// und Warenkorb sind synthetisch (wie im Gateway-Test). Kein echter Datenbestand, kein Shopify-Aufruf.
const mapping=JSON.parse(fs.readFileSync(new URL('../../docs/handoffs/2026-10-22-shopify-7x2-hauptprodukte.json',import.meta.url),'utf8'));
const origin='https://app.example',shopDomain=mapping.shopDomain,secret='synthetic-app-secret-value',proxyPath='/apps/konfigurator';
const sha=c=>c.repeat(64),assetA=sha('a'),assetB=sha('b'),draftToken='d'.repeat(64);
const uuid=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000000';
function fixture(){
 let time=1_800_000_000_000,storeId='acryl';
 const bindings=new Map(),legacy=[];
 for(const [i,product] of mapping.products.entries())for(const [j,variant] of product.variants.entries()){
  const bindingId='binding_'+uuid(i*10+j+1);
  bindings.set(product.shopifyProductId+'|'+variant.shopifyVariantId,{storeId,tenantId:'gravuru',shopDomain,shopifyProductId:product.shopifyProductId,shopifyVariantId:variant.shopifyVariantId,productId:product.localWorkshopRecord,productRevision:3,bindingId,assignmentRevision:1,options:{mounting:variant.mountingKey},unitCents:variant.priceCents});
  legacy.push({id:bindingId,shopDomain,variantId:variant.shopifyVariantId.split('/').at(-1),productId:product.localWorkshopRecord,productRevision:3,unitCents:variant.priceCents,options:{mounting:variant.mountingKey}});
 }
 const first=mapping.products[0],ids={shopifyProductId:first.shopifyProductId,shopifyVariantId:first.variants[0].shopifyVariantId};
 const registry={resolve(identity){const b=bindings.get(identity.shopifyProductId+'|'+identity.shopifyVariantId);if(!b)throw Object.assign(Error(),{status:404,code:'shop_binding_active_not_found'});return structuredClone(b);}};
 const models=new Map(mapping.products.map(p=>[p.localWorkshopRecord,{key:'acryl',name:p.shopifyTitle,configuration:{id:p.localWorkshopRecord,revision:3},legacy:{designs:[]},universal:{profile:{id:p.konfiProductId,revision:p.localWorkshopRecord+':3',defaultDesignId:'d1',optionGroups:[{id:'mounting',name:'Befestigung',defaultValueId:'K00',values:p.variants.map(v=>({id:v.mountingKey,label:v.optionValue}))}],designs:[{id:'d1',objects:[{id:'p1',type:'photoSlot',photoMaskAssetId:assetA}]}]},localResources:{fonts:{},motifs:[{key:'artwork',svgFragment:'<image href="/api/workshop/design-assets/'+assetB+'/preview.svg"/>'}],photoExamples:[]}}}]));
 const drafts=new Map(),manifests=new Map(),cartCalls=[];
 const draft={id:'adraft_'+uuid(77),productId:first.localWorkshopRecord,productRevision:3,designId:'d1',revision:2,snapshotId:'proof_1'};
 drafts.set(draft.id,draft);manifests.set('proof_1',{schema:'gravuru-native-review/v1',id:'proof_1',product:{id:draft.productId,revision:3},selection:{options:{mounting:'B02'},price:{quantity:1}}});
 const workshop={tenantId:'gravuru',sessionContext:{shopDomain},model:(id,rev)=>{const m=models.get(id);if(!m||m.configuration.revision!==rev)throw Object.assign(Error('fehlt'),{status:404});return structuredClone(m);},
  repository:{get:id=>({id,revision:3,status:'draft',document:{}})},assets:{read:id=>{if(![assetA,assetB].includes(id))throw Object.assign(Error('fehlt'),{status:404});return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');}},
  customerDrafts:{acrylicDrafts:{get:(id,token)=>{const d=drafts.get(id);if(!d||token!==draftToken)throw Object.assign(Error('Dieser private Acrylentwurf ist nicht zugänglich.'),{status:404,code:'acrylic_draft'});return structuredClone(d);},create(){throw Error('nicht im Fixture');},save(){throw Error('nicht im Fixture');}},review:id=>({manifest:structuredClone(manifests.get(id))}),cartConfigurations:{forDraft:()=>null}},
  orderIntake:{bindings:()=>structuredClone(legacy)}};
 let cartResult=()=>({cartId:'gid://shopify/Cart/synthetic',checkoutUrl:'https://'+shopDomain+'/checkouts/cn/synthetic',lineId:'gid://shopify/CartLine/1?cart=synthetic',configuration:{id:'konfig_'+uuid(9),rev:1},quantity:1,unitCents:1148,totalCents:1148,currency:'EUR',paymentConfirmed:false,mode:'create',duplicate:false,testOnly:true,productionReady:false});
 const store={storeId,registry,workshop,apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html',cart:async(binding,input,context)=>{cartCalls.push({binding,input,existingCart:context.existingCart});return cartResult();}};
 const options={origin,shopDomain,secret,stores:[store],proxyPath,clock:()=>time,limits:{startPerMinute:1000,requestsPerMinute:1000},modelSlimmer:null};
 return {bindings,legacy,models,ids,first,draft,manifests,store,options,cartCalls,setCart:fn=>{cartResult=fn;},tick:ms=>{time+=ms;},now:()=>time};
}
function signed(f,params){
 const search=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(f.now()/1000)),logged_in_customer_id:'',...params});
 search.set('signature',appProxySignature(search,secret));return search;
}
async function run(fn,mutate=()=>{}){
 const f=fixture();mutate(f);const entry=createShopEntry(f.options);
 const server=http.createServer((req,res)=>{const url=new URL(req.url,origin);if(!entry.matches(url.pathname)){res.writeHead(404).end();return;}entry.handle(req,res,url);});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const request=(path,method='GET',data,extra={})=>new Promise((resolve,reject)=>{
  const bytes=data===undefined?null:Buffer.from(typeof data==='string'?data:JSON.stringify(data));
  const headers=Object.fromEntries(Object.entries({Host:'app.example','X-Forwarded-Proto':'https',...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(bytes?{'Content-Length':bytes.length}:{}),...extra}).filter(([,v])=>v!==undefined));
  const req=http.request({host:'127.0.0.1',port:server.address().port,path,method,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const body=Buffer.concat(chunks);let data=null;try{data=JSON.parse(body);}catch{}resolve({status:res.statusCode,headers:res.headers,body,data});});});req.on('error',reject);req.end(bytes);
 });
 const open=(params={})=>request(proxyPath+'/start?'+signed(f,{product:f.ids.shopifyProductId.split('/').at(-1),variant:f.ids.shopifyVariantId.split('/').at(-1),...params}));
 const token=async(params)=>{const r=await open(params);assert.equal(r.status,302,r.body.toString());const fragment=new URLSearchParams(new URL(r.headers.location).hash.slice(1));return {token:fragment.get('s'),fragment,location:r.headers.location};};
 try{await fn(f,request,{open,token,entry});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
const session=t=>({'X-Gravuru-Shop-Session':t});

test('signed start resolves the binding through the registry and redirects with a session in the fragment',()=>run(async(f,request,{open,token})=>{
 const r=await open();
 assert.equal(r.status,302);assert.match(r.headers['content-type'],/text\/html/);assert.equal(r.headers['x-robots-tag'],'noindex, nofollow, noarchive');
 const target=new URL(r.headers.location);assert.equal(target.origin,origin);assert.equal(target.pathname,'/konfigurator/shop/');assert.equal(target.search,'');
 const fragment=new URLSearchParams(target.hash.slice(1));assert.match(fragment.get('s'),/^gse1\./);assert.deepEqual([...fragment.keys()],['s']);
 assert.ok(r.body.toString().includes(r.headers.location.replace(/&/g,'&amp;')),'Rückfall-Link enthalten');
 // Bearbeiten-Verweis (K8) und Rücksprung werden unverändert durchgereicht; fremde Adressen nicht.
 const edit=await token({config:'konfig_'+uuid(9),rev:'2',line:'1234:abcd',back:'/products/tuerschild-edelstahl-v2a-personalisiert-7x2?variant=1'});
 assert.equal(edit.fragment.get('config'),'konfig_'+uuid(9));assert.equal(edit.fragment.get('rev'),'2');assert.equal(edit.fragment.get('line'),'1234:abcd');assert.equal(edit.fragment.get('back'),'/products/tuerschild-edelstahl-v2a-personalisiert-7x2?variant=1');
 for(const bad of [{back:'https://evil.example/'},{back:'//evil.example'},{config:'konfig_x',rev:'1'},{rev:'1'},{line:'x'}])assert.equal((await open(bad)).status,422);
 // Alle 15 Varianten der drei Hauptprodukte sind erreichbar; jedes Token nennt den eigenen cfg-Stand.
 for(const product of f.models.keys()){const p=mapping.products.find(x=>x.localWorkshopRecord===product);for(const v of p.variants){const t=await token({product:p.shopifyProductId.split('/').at(-1),variant:v.shopifyVariantId.split('/').at(-1)});const payload=JSON.parse(Buffer.from(t.token.split('.')[1],'base64url').toString());assert.equal(payload.c,product);assert.equal(payload.va,v.shopifyVariantId.split('/').at(-1));}}
}));
test('invalid, foreign-shop, expired and replayed-old signatures are refused before any registry lookup',()=>run(async(f,request,{open})=>{
 let lookups=0;const resolve=f.store.registry.resolve;f.store.registry.resolve=v=>{lookups++;return resolve(v);};
 const base={product:f.ids.shopifyProductId.split('/').at(-1),variant:f.ids.shopifyVariantId.split('/').at(-1)};
 const forged=signed(f,base);forged.set('variant','1');assert.equal((await request(proxyPath+'/start?'+forged)).status,401);
 const unsigned=new URLSearchParams({...base,shop:shopDomain,timestamp:String(Math.floor(f.now()/1000))});assert.equal((await request(proxyPath+'/start?'+unsigned)).status,401);
 const other=signed(f,base);other.set('shop','other.myshopify.com');other.set('signature',appProxySignature(other,secret));assert.equal((await request(proxyPath+'/start?'+other)).status,401);
 const old=signed(f,{...base,timestamp:String(Math.floor(f.now()/1000)-600)});old.set('signature',appProxySignature(old,secret));assert.equal((await request(proxyPath+'/start?'+old)).status,401);
 assert.equal(lookups,0);
 assert.equal((await open()).status,302);assert.equal(lookups,1);
 assert.equal((await request(proxyPath+'/start?'+signed(f,base),'POST',{})).status,405);
}));
test('missing, duplicate and form bindings answer with a customer message instead of an editor',()=>run(async(f,request,{open})=>{
 const missing=await open({variant:'999'});assert.equal(missing.status,404);assert.match(missing.headers['content-type'],/text\/html/);assert.ok(missing.body.toString().includes('noch nicht für den Konfigurator eingerichtet'));
 f.models.get(f.first.localWorkshopRecord).key='form';const form=await open();assert.equal(form.status,404);assert.ok(form.body.toString().includes('noch nicht für den Konfigurator eingerichtet'));
 f.models.get(f.first.localWorkshopRecord).key='acryl';
 f.options.stores.push({...f.store,storeId:'legacy',registry:{resolve:v=>({...f.store.registry.resolve(v),storeId:'legacy'})}});
 const entry=createShopEntry(f.options);const res={headers:{},writeHead(status,headers){this.status=status;this.headers=headers;return this;},end(bytes){this.body=String(bytes);}};
 await entry.handle({method:'GET',headers:{host:'app.example','x-forwarded-proto':'https'}},res,new URL(proxyPath+'/start?'+signed(f,{product:f.ids.shopifyProductId.split('/').at(-1),variant:f.ids.shopifyVariantId.split('/').at(-1)}),origin));
 assert.equal(res.status,409);
}));
test('paused product and anonymous customer handling on start',()=>run(async(f,request,{open,token})=>{
 const model=f.store.workshop.model;f.store.workshop.model=()=>{throw Object.assign(Error('pausiert'),{status:423,code:'konfi_paused'});};
 const paused=await open();assert.equal(paused.status,423);assert.ok(paused.body.toString().includes('pausiert'));
 f.store.workshop.model=model;
 const anonymous=await token();assert.equal(JSON.parse(Buffer.from(anonymous.token.split('.')[1],'base64url').toString()).cu,null);
 const customer=await token({logged_in_customer_id:'42'});assert.equal(JSON.parse(Buffer.from(customer.token.split('.')[1],'base64url').toString()).cu,'gid://shopify/Customer/42');
}));
test('page and script are served with a strict policy and nothing else leaks',()=>run(async(f,request)=>{
 const page=await request('/konfigurator/shop/');assert.equal(page.status,200);assert.match(page.headers['content-type'],/text\/html/);assert.ok(page.body.toString().includes('/konfigurator/shop/shop-entry-page.mjs'));assert.match(page.headers['content-security-policy'],/frame-src 'self'/);
 const script=await request('/konfigurator/shop/shop-entry-page.mjs',undefined,undefined,{'Sec-Fetch-Site':'same-origin'});assert.equal(script.status,200);assert.match(script.headers['content-type'],/text\/javascript/);assert.ok(script.body.toString().includes('./shop-entry-client.mjs'));
 const client=await request('/konfigurator/shop/shop-entry-client.mjs',undefined,undefined,{'Sec-Fetch-Site':'same-origin'});assert.equal(client.status,200);assert.ok(client.body.toString().includes('/api/shop-entry/'));
 assert.equal((await request('/konfigurator/shop/shop-entry-page.mjs',undefined,undefined,{'Sec-Fetch-Site':'cross-site'})).status,403);
 assert.equal((await request('/konfigurator/shop/?x=1')).status,404);
 assert.equal((await request('/konfigurator/shop/other.mjs')).status,404);
 assert.equal((await request('/api/shop-entry/orders')).status,404);
 assert.equal((await request('/api/shop-entry/model',undefined,undefined,{Host:'other.example'})).status,403);
 assert.equal((await request('/api/shop-entry/model',undefined,undefined,{'X-Forwarded-Proto':'http'})).status,403);
}));
test('model route serves only the bound product, preselects the shop variant and pins assignment revision',()=>run(async(f,request,{token})=>{
 const b02=f.first.variants.find(v=>v.mountingKey==='B02');
 const {token:t}=await token({variant:b02.shopifyVariantId.split('/').at(-1)});
 const model=await request('/api/shop-entry/model',undefined,undefined,session(t));
 assert.equal(model.status,200);assert.equal(model.data.model.configuration.id,f.first.localWorkshopRecord);assert.equal(model.data.model.universal.profile.optionGroups[0].defaultValueId,'B02');
 assert.deepEqual(model.data.binding,{shopifyProductId:f.first.shopifyProductId,shopifyVariantId:b02.shopifyVariantId,productId:f.first.localWorkshopRecord,productRevision:3,options:{mounting:'B02'}});
 assert.equal(model.data.editorPath,'/_merchant-acryl-editor.html');assert.equal(model.data.shopDomain,shopDomain);assert.equal(model.data.productionReady,false);
 assert.equal(model.data.model.universal.profile.optionGroups[0].values.length,5);
 // Das Servermodell selbst bleibt unverändert (Vorauswahl nur in der Antwortkopie).
 assert.equal(f.models.get(f.first.localWorkshopRecord).universal.profile.optionGroups[0].defaultValueId,'K00');
 for(const bad of [{},session('gse1.x.y'),session(t.slice(0,-2)+'zz')])assert.equal((await request('/api/shop-entry/model',undefined,undefined,bad)).status,403);
 assert.equal((await request('/api/shop-entry/model','POST',{},session(t))).status,405);
 assert.equal((await request('/api/shop-entry/model?revision=1',undefined,undefined,session(t))).status,404);
 assert.equal((await request('/api/shop-entry/model',undefined,undefined,{...session(t),Origin:'https://other.example'})).status,403);
 const key=f.first.shopifyProductId+'|'+b02.shopifyVariantId;f.bindings.get(key).assignmentRevision++;
 assert.equal((await request('/api/shop-entry/model',undefined,undefined,session(t))).status,409);
 f.bindings.get(key).assignmentRevision--;f.bindings.get(key).productRevision=4;f.models.get(f.first.localWorkshopRecord).configuration.revision=4;
 assert.equal((await request('/api/shop-entry/model',undefined,undefined,session(t))).status,409);
}));
test('session expiry ends model, asset and cart access; a fresh start works again',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();
 assert.equal((await request('/api/shop-entry/model',undefined,undefined,session(t))).status,200);
 f.tick(4*60*60*1000+1000);
 const expired=await request('/api/shop-entry/model',undefined,undefined,session(t));assert.equal(expired.status,403);assert.equal(expired.data.error.code,'shop_entry_expired');assert.match(expired.data.error.message,/abgelaufen/);
 assert.equal((await request('/api/shop-entry/design-assets/'+assetA+'/preview.svg',undefined,undefined,session(t))).status,403);
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},{...session(t),'X-Gravuru-Draft':draftToken})).status,403);
 assert.equal(f.cartCalls.length,0);
 const fresh=await token();assert.equal((await request('/api/shop-entry/model',undefined,undefined,session(fresh.token))).status,200);
}));
test('design assets are limited to the resources named by this product model',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();
 for(const id of [assetA,assetB]){const r=await request('/api/shop-entry/design-assets/'+id+'/preview.svg',undefined,undefined,session(t));assert.equal(r.status,200);assert.match(r.headers['content-type'],/image\/svg\+xml/);assert.match(r.headers['content-security-policy'],/sandbox/);}
 assert.equal((await request('/api/shop-entry/design-assets/'+sha('c')+'/preview.svg',undefined,undefined,session(t))).status,404);
 assert.equal((await request('/api/shop-entry/design-assets/'+assetA+'/original',undefined,undefined,session(t))).status,404);
}));
test('cart uses the registry binding of the configured variant, never the page variant or browser prices',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();
 const headers={...session(t),'X-Gravuru-Draft':draftToken};
 const cart=await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},headers);
 assert.equal(cart.status,200,JSON.stringify(cart.data));
 const b02=f.first.variants.find(v=>v.mountingKey==='B02');
 assert.equal(f.cartCalls.length,1);assert.equal(f.cartCalls[0].binding.shopifyVariantId,b02.shopifyVariantId);assert.deepEqual(f.cartCalls[0].binding.options,{mounting:'B02'});assert.equal(f.cartCalls[0].binding.unitCents,1148);
 assert.deepEqual(f.cartCalls[0].input,{draftId:f.draft.id,expectedRevision:2,quantity:1});assert.equal(f.cartCalls[0].existingCart,undefined);
 assert.equal(cart.data.shopifyVariantId,b02.shopifyVariantId);assert.equal(cart.data.checkoutUrl,'https://'+shopDomain+'/checkouts/cn/synthetic');assert.equal(cart.data.productionReady,false);assert.equal(cart.data.paymentConfirmed,false,'Die Seite verlangt paymentConfirmed:false (shop-entry-client.mjs).');assert.equal(cart.data.totalCents,1148);assert.equal(cart.data.lineId,'gid://shopify/CartLine/1?cart=synthetic');
 // Ein zweiter Entwurf derselben Sitzung ergänzt den gemerkten Warenkorb (kein zweiter Checkout).
 const second=await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1,configId:'konfig_'+uuid(9)},headers);
 assert.equal(second.status,200);assert.deepEqual(f.cartCalls[1].existingCart,{cartId:'gid://shopify/Cart/synthetic'});
 // Browserpreise, Varianten-IDs oder fremde Felder werden nicht angenommen.
 for(const extra of [{unitCents:1},{shopifyVariantId:b02.shopifyVariantId},{cartId:'gid://shopify/Cart/x'},{cartLineId:'gid://shopify/CartLine/1'},{quantity:0},{quantity:100},{draftId:'draft_'+uuid(1)}])assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1,...extra},headers)).status,422);
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},session(t))).status,422);
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},{...headers,'X-Gravuru-Draft':'e'.repeat(64)})).status,404);
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},{...headers,Origin:undefined})).status,403);
 assert.equal(f.cartCalls.length,2);
}));
test('unbound or ambiguous configured variants block before any cart call; foreign drafts too',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();const headers={...session(t),'X-Gravuru-Draft':draftToken};
 f.manifests.get('proof_1').selection.options={mounting:'XYZ'};
 const unbound=await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},headers);assert.equal(unbound.status,404);assert.equal(unbound.data.error.code,'shop_entry_variant_unbound');
 f.manifests.get('proof_1').selection.options={mounting:'B02'};
 // Eine zweite aktive Zuordnung derselben Ausführung auf einer anderen Variante ist nicht eindeutig.
 const kgl=f.first.variants.find(v=>v.mountingKey==='KGL');f.legacy.push({id:'binding_'+uuid(99),shopDomain,variantId:kgl.shopifyVariantId.split('/').at(-1),productId:f.first.localWorkshopRecord,productRevision:3,unitCents:1148,options:{mounting:'B02'}});
 f.bindings.get(f.first.shopifyProductId+'|'+kgl.shopifyVariantId).options={mounting:'B02'};
 const ambiguous=await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},headers);assert.equal(ambiguous.status,409);assert.equal(ambiguous.data.error.code,'shop_entry_variant_duplicate');
 f.legacy.pop();f.bindings.get(f.first.shopifyProductId+'|'+kgl.shopifyVariantId).options={mounting:'KGL'};
 f.draft.productId='cfg_'+uuid(5);
 const foreign=await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},headers);assert.equal(foreign.status,409);assert.equal(foreign.data.error.code,'shop_entry_product');
 assert.equal(f.cartCalls.length,0);
}));
test('a failed handoff forgets the remembered cart and reports a retryable customer message',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();const headers={...session(t),'X-Gravuru-Draft':draftToken};
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},headers)).status,200);
 f.setCart(()=>{throw Object.assign(Error('Warenkorbübergabe nicht bestätigt.'),{status:502,code:'cart_review'});});
 const failed=await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:3,quantity:1},headers);
 assert.equal(failed.status,502);assert.match(failed.data.error.message,/noch einmal/);assert.deepEqual(f.cartCalls[1].existingCart,{cartId:'gid://shopify/Cart/synthetic'});
 f.setCart(()=>({cartId:'gid://shopify/Cart/next',checkoutUrl:'https://'+shopDomain+'/checkouts/cn/next',lineId:'gid://shopify/CartLine/2?cart=next',configuration:{id:'konfig_'+uuid(9),rev:2},quantity:1,unitCents:1148,totalCents:1148,currency:'EUR',paymentConfirmed:false,mode:'create',duplicate:false}));
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:4,quantity:1},headers)).status,200);
 assert.equal(f.cartCalls[2].existingCart,undefined);
 // Antworten mit fremder Checkout-Adresse werden nicht weitergegeben.
 f.setCart(()=>({cartId:'gid://shopify/Cart/x',checkoutUrl:'https://evil.example/checkout',quantity:1,unitCents:1148,totalCents:1148,currency:'EUR',paymentConfirmed:false,mode:'create'}));
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:5,quantity:1},headers)).status,503);
}));
test('parallel cart clicks of one session are serialised while a body is still arriving',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();const headers={...session(t),'X-Gravuru-Draft':draftToken};
 const bytes=Buffer.from(JSON.stringify({draftId:f.draft.id,expectedRevision:2,quantity:1}));
 let finish;
 // Eigener Server mit derselben Fixture: die erste Anfrage hält ihren Body offen, die zweite bekommt 409.
 const server=http.createServer();const entry=createShopEntry(f.options);server.on('request',(req,res)=>entry.handle(req,res,new URL(req.url,origin)));server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const slow=new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/shop-entry/cart',method:'POST',headers:{Host:'app.example','X-Forwarded-Proto':'https',Origin:origin,'Content-Type':'application/json','Content-Length':bytes.length,...headers}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);finish=()=>req.end(bytes.subarray(1));req.write(bytes.subarray(0,1));});
  await once(server,'request');
  const second=await new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/shop-entry/cart',method:'POST',headers:{Host:'app.example','X-Forwarded-Proto':'https',Origin:origin,'Content-Type':'application/json','Content-Length':bytes.length,...headers}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end(bytes);});
  assert.equal(second,409);assert.equal(f.cartCalls.length,0);
  finish();assert.equal(await slow,200);assert.equal(f.cartCalls.length,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}));
test('draft save route refuses foreign products and oversized or malformed bodies before any review work',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();
 const foreign=await request('/api/shop-entry/acrylic-drafts','POST',{input:{productId:'cfg_'+uuid(5),productRevision:3}},session(t));assert.equal(foreign.status,409);assert.equal(foreign.data.error.code,'shop_entry_product');
 assert.equal((await request('/api/shop-entry/acrylic-drafts','POST',{input:{productId:f.first.localWorkshopRecord,productRevision:3},extra:1},session(t))).status,422);
 assert.equal((await request('/api/shop-entry/acrylic-drafts','POST','[]',session(t))).status,400);
 assert.equal((await request('/api/shop-entry/acrylic-drafts','POST',{input:{}},{...session(t),'Content-Type':'text/plain'})).status,415);
 assert.equal((await request('/api/shop-entry/acrylic-drafts/'+f.draft.id,'POST',{input:{productId:f.first.localWorkshopRecord,productRevision:3},expectedRevision:2},session(t))).status,404);
 assert.equal((await request('/api/shop-entry/acrylic-drafts/'+f.draft.id,'POST',{input:{productId:f.first.localWorkshopRecord,productRevision:3},expectedRevision:1},{...session(t),'X-Gravuru-Draft':draftToken})).status,409);
 assert.equal((await request('/api/shop-entry/acrylic-drafts','POST',{input:{}},{...session(t),'Content-Length':String(200*1024*1024)})).status,413);
}));
test('rate limits answer 429 and misconfiguration fails closed',()=>run(async(f,request,{open})=>{
 assert.equal((await open()).status,302);assert.equal((await open()).status,429);
 for(const bad of [{origin:'http://app.example'},{proxyPath:'apps'},{proxyPath:'/api/x'},{pagePath:'/konfigurator/shop'},{stores:[]},{secret:'short'},{limits:{startPerMinute:0}},{stores:[{...f.store,nativeEditorPath:'/editor.html'}]}])assert.throws(()=>createShopEntry({...f.options,...bad}),e=>e.status===503);
},f=>{f.options.limits={startPerMinute:1,requestsPerMinute:1000};}));
test('host integration takes the customer entry only as an explicit, well-formed setting',async()=>{
 const {createConfiguratorIntegration}=await import('./configurator-integration.mjs');
 const stores={legacy:{repository:{},customerDrafts:{}},acryl:{repository:{},customerDrafts:{}}},base={mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl'};
 for(const shopEntry of ['x',[],{},{proxyPath:1},{proxyPath:'/apps/konfigurator',other:1}])assert.throws(()=>createConfiguratorIntegration({settings:{...base,shopEntry},...stores}),/Kundeneinstieg/);
 // Ohne den Schlüssel bleibt die bisherige Prüfung unverändert (hier scheitert sie erst an den fehlenden echten Stores).
 assert.throws(()=>createConfiguratorIntegration({settings:base,...stores,shopifySessions:{shopDomain,secret,clientId:'c'}}),e=>!/Kundeneinstieg/.test(e.message));
});

function nativeDoorbellEntryFixture(f,{enabled=true}={}){
 const model=f.models.get(f.first.localWorkshopRecord);
 model.universal.doorbell={schema:'gravuru-doorbell/v1'};
 model.universal.reviewOnly=true;
 model.universal.profile.binding={kind:'local-review'};
 model.universal.profile.features={orderEnabled:false,productionConfirmed:false};
 f.store.doorbellLiveOrders=enabled;
 f.store.workshop.repository.get=id=>({id,revision:3,status:'draft',document:{config:f.models.get(id)?.universal}});
 f.approvedVariants=new Set();f.approvalCalls=[];
 f.store.workshop.orderIntake.doorbellLiveApproval=identity=>{
  f.approvalCalls.push(identity);
  assert.equal(identity.shopDomain,shopDomain);assert.equal(identity.shopifyProductId,f.first.shopifyProductId);
  assert.equal(identity.productId,f.first.localWorkshopRecord);assert.equal(identity.productRevision,3);
  return f.approvedVariants.has(identity.shopifyVariantId)?{id:'approved-fixture-revision-3',approvedAt:'2026-10-27T00:00:00.000Z'}:null;
 };
}
test('new doorbells require the exact live approval at start and on every private session request',()=>run(async(f,request,{open,token})=>{
 assert.equal((await open()).status,404);
 f.approvedVariants.add(f.ids.shopifyVariantId);
 const {token:t}=await token();
 const loaded=await request('/api/shop-entry/model',undefined,undefined,session(t));
 assert.equal(loaded.status,200);assert.equal(loaded.data.model.universal.reviewOnly,true);
 assert.equal(loaded.data.model.universal.profile.features.orderEnabled,false);
 assert.equal(loaded.data.model.universal.profile.features.productionConfirmed,false);
 assert.equal(loaded.data.productionReady,false);
 f.approvedVariants.clear();
 for(const path of ['/api/shop-entry/model','/api/shop-entry/design-assets/'+assetA+'/preview.svg'])assert.equal((await request(path,undefined,undefined,session(t))).status,404);
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:f.draft.id,expectedRevision:2,quantity:1},{...session(t),'X-Gravuru-Draft':draftToken})).status,404);
 assert.equal(f.cartCalls.length,0);
},f=>nativeDoorbellEntryFixture(f)));

test('an approved doorbell still cannot start while its live order intake is disabled',()=>run(async(f,request,{open})=>{
 f.approvedVariants.add(f.ids.shopifyVariantId);
 assert.equal((await open()).status,404);assert.equal(f.approvalCalls.length,0);
},f=>nativeDoorbellEntryFixture(f,{enabled:false})));

test('changing a doorbell variant rechecks its live approval before any cart handoff',()=>run(async(f,request,{token})=>{
 f.approvedVariants.add(f.ids.shopifyVariantId);
 const {token:t}=await token(),headers={...session(t),'X-Gravuru-Draft':draftToken},input={draftId:f.draft.id,expectedRevision:2,quantity:1};
 const selected=f.first.variants.find(v=>v.mountingKey==='B02').shopifyVariantId;
 assert.notEqual(selected,f.ids.shopifyVariantId);
 const denied=await request('/api/shop-entry/cart','POST',input,headers);
 assert.equal(denied.status,404);assert.equal(denied.data.error.code,'shop_entry_doorbell_unapproved');assert.equal(f.cartCalls.length,0);
 f.approvedVariants.add(selected);
 const allowed=await request('/api/shop-entry/cart','POST',input,headers);
 assert.equal(allowed.status,200,JSON.stringify(allowed.data));assert.equal(f.cartCalls.length,1);
 assert.equal(f.cartCalls[0].binding.shopifyVariantId,selected);
 assert.equal(allowed.data.productionReady,false);assert.equal(allowed.data.paymentConfirmed,false);
},f=>nativeDoorbellEntryFixture(f)));


test('embed start: window flag in the fragment, page framable only by the own shop, embed module served through the proxy',()=>run(async(f,request,{open,token})=>{
 const embedded=await token({embed:'1',back:'/products/x'});
 assert.equal(embedded.fragment.get('embed'),'1');assert.equal(embedded.fragment.get('back'),'/products/x');
 assert.equal((await token()).fragment.get('embed'),null);
 assert.equal((await open({embed:'yes'})).status,422);
 const page=await request('/konfigurator/shop/');
 assert.match(page.headers['content-security-policy'],new RegExp("frame-ancestors https://"+shopDomain.replace(/\./g,'\\.')+"$"));
 // Vorwärmen: Editor-Seite + Kernkatalog je Datenbereich als Hinweis, Client-Modul vorgeladen.
 const html=page.body.toString(),warm=html.match(/<meta name="gravuru-warm" content="([^"]+)">/);
 assert.deepEqual(JSON.parse(warm[1].replaceAll('&quot;','"')),{acryl:['/_merchant-acryl-editor.html','/_acryl-runtime/lazy/katalog-kern.json']});
 assert.match(html,/<link rel="modulepreload" href="\/konfigurator\/shop\/shop-entry-client\.mjs">/);
 assert.doesNotMatch(page.headers['content-security-policy'],/frame-ancestors[^;]*\*/);
 const module=await request(proxyPath+'/shop-embed.mjs?'+signed(f,{}));
 assert.equal(module.status,200);assert.match(module.headers['content-type'],/text\/javascript/);
 const text=module.body.toString();
 assert.ok(text.includes("const EDITOR_ORIGIN='"+origin+"',PROXY='"+proxyPath+"'"));assert.ok(!text.includes('__EDITOR_ORIGIN__'));
 assert.ok(text.includes("from './theme-cart-client.mjs'"));
 assert.equal((await request(proxyPath+'/shop-embed.mjs')).status,401,'nur über den signierten App-Proxy');
}));
test('embed scripts load on every product page without using up the cart rate limit',()=>run(async(f,request)=>{
 for(let i=0;i<5;i++)for(const name of ['shop-embed.mjs','theme-cart-client.mjs']){
  const r=await request(proxyPath+'/'+name+'?'+signed(f,{}));
  assert.equal(r.status,200,name);assert.equal(r.headers['cache-control'],'public, max-age=300');
 }
 // Die eigentliche Übergabe zählt weiter: erster Aufruf frei, zweiter begrenzt.
 assert.notEqual((await request(proxyPath+'/cart?'+signed(f,{}))).status,429);
 assert.equal((await request(proxyPath+'/cart?'+signed(f,{}))).status,429);
},f=>{f.options.limits={startPerMinute:1,requestsPerMinute:1000};}));
test('customer model passes through the model slimmer with a revision key; the stored model stays complete',()=>run(async(f,request,{token})=>{
 const {token:t}=await token();
 const loaded=await request('/api/shop-entry/model',undefined,undefined,session(t));
 assert.equal(loaded.status,200);assert.equal(loaded.data.model.universal.slimmed,true);
 assert.match(f.slimKeys[0],/:3$|:\d+$/);
 assert.equal(f.models.get(f.first.localWorkshopRecord).universal.slimmed,undefined,'gespeichertes Modell unverändert');
},f=>{f.slimKeys=[];f.options.modelSlimmer={ready:()=>true,load(){},slim(universal,{key}){f.slimKeys.push(String(key));universal.slimmed=true;return {fonts:[],surface:false};}};}));
test('own fonts no design uses are served as immutable files from the shop entry and listed for lazy loading',()=>run(async(f,request,{token,entry})=>{
 const {token:t}=await token();
 const loaded=await request('/api/shop-entry/model',undefined,undefined,session(t));
 assert.equal(loaded.status,200);
 const u=loaded.data.model.universal;assert.deepEqual(Object.keys(u.localResources.fonts),['Nutzt']);
 assert.equal(u.localResources.lazyFonts.length,1);const url=u.localResources.lazyFonts[0].url;
 assert.match(url,/^\/konfigurator\/shop\/schriften\/[a-f0-9]{64}\.json$/);assert.equal(entry.matches(url),true);
 const file=await request(url);
 assert.equal(file.status,200);assert.equal(file.headers['cache-control'],'public, max-age=31536000, immutable');assert.match(file.headers['content-type'],/application\/json/);
 assert.deepEqual(file.data,{regular:{units:1000,glyphs:{A:{a:600,d:'M1 1'}}},bold:null});
 assert.equal((await request(url,'HEAD')).status,200);
 assert.equal((await request(url.replace(/[a-f0-9]{64}/,'0'.repeat(64)))).status,404);
 assert.equal((await request(url+'?x=1')).status,404);
 assert.equal((await request(url,'POST',{})).status,405);
 assert.equal((await request(url,'GET',undefined,{'Sec-Fetch-Site':'cross-site'})).status,403);
 // Verdrängt (anderes Produkt füllt den Speicher): die Route liefert geprüft aus dem gespeicherten Modell nach.
 f.options.modelSlimmer.slim({profile:{designs:[]},localResources:{fonts:{Fremd:{regular:{units:1000,glyphs:{}},bold:null}}}},{key:'anderes:1'});
 const refilled=await request(url);assert.equal(refilled.status,200);assert.deepEqual(refilled.data,file.data);
 assert.equal(entry.matches('/konfigurator/shop/schriften/../x.json'),false);assert.equal(entry.matches('/konfigurator/shop/schriften/ABC.json'),false);
 // Das gespeicherte Modell (Prüfung, Warenkorb) bleibt vollständig.
 assert.ok(f.models.get(f.first.localWorkshopRecord).universal.localResources.fonts.Eigen);
},f=>{
 for(const m of f.models.values()){m.universal.localResources.fonts={Nutzt:{regular:{units:1000,glyphs:{A:{a:600,d:'M0 0'}}},bold:null},Eigen:{regular:{units:1000,glyphs:{A:{a:600,d:'M1 1'}}},bold:null}};m.universal.profile.designs[0].objects.push({id:'t1',type:'text',font:'Nutzt'});}
 const slimmer=createModelSlimmer({fetchJson:async p=>{if(p.endsWith('katalog-kern.json'))return {font_index:[]};throw Error('404');},fontUrl:hash=>'/konfigurator/shop/schriften/'+hash+'.json',maxFontFiles:1});
 slimmer.load();f.options.modelSlimmer=slimmer;
}));
