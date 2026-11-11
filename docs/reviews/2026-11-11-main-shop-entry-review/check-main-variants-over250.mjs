// Read-only source audit. Real v9 config + read inventory, synthetic in-memory
// session/registry/draft/cart transport. No DB open, listener or live request.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {pageConfig,currentVariant,startHref} from '../issue230-integration-candidate/app/workshop/ui/shop-embed.mjs';
import {createShopEntryClient} from '../issue230-integration-candidate/app/workshop/ui/shop-entry-client.mjs';
import {createThemeCartClient} from '../issue230-integration-candidate/app/workshop/ui/theme-cart-client.mjs';
import {createShopEntry} from '../issue230-integration-candidate/app/workshop/shop-entry.mjs';
import {appProxySignature} from '../issue230-integration-candidate/app/workshop/shopify-app-proxy.mjs';
import {familyFormatCombinations,familyFormatPrice,selectedFamilyProfile} from '../issue230-integration-candidate/app/configurator/variant-m/family-formats.mjs';

const read=relative=>JSON.parse(fs.readFileSync(new URL(relative,import.meta.url),'utf8'));
const inventory=read('./main-target-preview/variant-mapping.preview.json');
const plan=read('../product-plans-run-v9/Tuerschild-Acrylglas-3mm_v4/plan.json');
const config=structuredClone(plan.products[0].document.config);
const shopIds=inventory.shopifySnapshotPages.flatMap(p=>p.variantIds);
assert.equal(shopIds.length,808);assert.equal(new Set(shopIds).size,808);
const target=inventory.matches.find(m=>m.shopifyVariantId==='gid://shopify/ProductVariant/58104626479484');
const initial=inventory.matches.find(m=>shopIds.indexOf(m.shopifyVariantId)<250);
assert.ok(target&&initial);assert.equal(shopIds.indexOf(target.shopifyVariantId),330);
const id=gid=>gid.split('/').at(-1),first250=shopIds.slice(0,250).map(id);
const productId=id(target.shopifyProductId),targetId=id(target.shopifyVariantId);
function documentFor(selected,formValue){return {
 getElementById:key=>key==='gravuru-konfi'?{textContent:JSON.stringify({productId,variantId:selected,variants:first250,back:'/products/target'})}:null,
 querySelectorAll:selector=>selector==='form[action*="/cart/add"]'?[{querySelector:s=>s==='[name="id"]'?{value:formValue}:null}]:[],
};}
const directDoc=documentFor(targetId,targetId),directConfig=pageConfig(directDoc);
assert.ok(directConfig);assert.equal(directConfig.variants.length,250);
assert.equal(directConfig.variantId,first250[0]);
const wrongDirect=new URL(startHref(directConfig,currentVariant(directConfig,directDoc),''),'https://example.invalid');
assert.equal(wrongDirect.searchParams.get('variant'),first250[0]);assert.notEqual(wrongDirect.searchParams.get('variant'),targetId);
const changedDoc=documentFor(id(initial.shopifyVariantId),targetId),changedConfig=pageConfig(changedDoc);
assert.equal(currentVariant(changedConfig,changedDoc),id(initial.shopifyVariantId));
const combinations=familyFormatCombinations(config);
assert.equal(combinations.length,778);
assert.ok(combinations.some(c=>JSON.stringify(c)===JSON.stringify(target.nativeOptions)));
assert.equal(familyFormatPrice(config,target.nativeOptions),1499);
const selected=selectedFamilyProfile(config,target.nativeOptions);
assert.equal(selected.geometry.width,120);assert.equal(selected.geometry.height,80);

// Real entry request/session/cart routing, injected inert adapters only.
const origin='https://app.example',shopDomain='gravuru-design.myshopify.com',proxyPath='/apps/konfigurator';
const secret='synthetic-read-only-over250-secret',now=1_800_000_000_000;
const cfg='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',revision=2;
const draftId='adraft_00000001-0000-4000-8000-000000000000',draftToken='d'.repeat(64);
const bindings=inventory.matches.map((m,i)=>({storeId:'acryl',tenantId:'gravuru',shopDomain,shopifyProductId:m.shopifyProductId,shopifyVariantId:m.shopifyVariantId,productId:cfg,productRevision:revision,bindingId:'binding_'+String(i+1).padStart(8,'0')+'-0000-4000-8000-000000000000',assignmentRevision:1,options:m.nativeOptions,unitCents:m.v9UnitCents}));
const registry={resolve:input=>{const b=bindings.find(b=>b.shopifyProductId===input.shopifyProductId&&b.shopifyVariantId===input.shopifyVariantId);if(!b)throw Object.assign(Error('synthetic missing'),{code:'shop_binding_active_not_found',status:404});return structuredClone(b);}};
const draft={id:draftId,productId:cfg,productRevision:revision,revision:1,snapshotId:'synthetic-review'};
const calls=[];
const workshop={tenantId:'gravuru',sessionContext:{shopDomain},
 model:()=>({key:'acryl',name:'Read-only v9 fixture',configuration:{id:cfg,revision},legacy:{designs:[]},universal:structuredClone(config)}),
 repository:{get:()=>({id:cfg,revision,status:'draft',document:{config}})},assets:{read(){throw Error('No assets permitted');}},
 customerDrafts:{acrylicDrafts:{get:(value,token)=>{assert.equal(value,draftId);assert.equal(token,draftToken);return draft;},create(){throw Error('No write');},save(){throw Error('No write');}},review:()=>({manifest:{selection:{options:target.nativeOptions}}}),cartConfigurations:{forDraft:()=>null}},
 orderIntake:{bindings:()=>bindings.map(b=>({id:b.bindingId,shopDomain,variantId:id(b.shopifyVariantId),productId:cfg,productRevision:revision,unitCents:b.unitCents,options:b.options})),catalogLiveApproval:()=>({id:'synthetic-approval'})},
};
const store={storeId:'acryl',workshop,registry,apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',catalogLiveOrders:true,cart:async(binding)=>{calls.push(binding);return {cartId:'gid://shopify/Cart/synthetic',checkoutUrl:'https://'+shopDomain+'/checkouts/cn/synthetic',lineId:'gid://shopify/CartLine/synthetic',configuration:{id:'konfig_00000001-0000-4000-8000-000000000000',rev:1},quantity:1,unitCents:binding.unitCents,totalCents:binding.unitCents,currency:'EUR',paymentConfirmed:false,mode:'create'};}};
const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,clock:()=>now,modelSlimmer:null,logger:()=>{}});
const request=(url,options={})=>new Promise((resolve,reject)=>{
 const req=Readable.from(options.body?[Buffer.from(options.body)]:[]);req.method=options.method||'GET';req.url=url;req.headers={host:'app.example','x-forwarded-proto':'https',...(req.method==='GET'?{}:{origin,'content-type':'application/json'}),...Object.fromEntries(Object.entries(options.headers||{}).map(([k,v])=>[k.toLowerCase(),v]))};
 const res=new EventEmitter();res.headersSent=false;res.writeHead=(status,headers)=>{res.status=status;res.headers=headers;res.headersSent=true;return res;};res.end=bytes=>resolve(new Response(bytes,{status:res.status,headers:res.headers}));
 Promise.resolve(entry.handle(req,res,new URL(url,origin))).catch(reject);
});
async function start(variant){const params=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(now/1000),logged_in_customer_id:'',product:productId,variant});params.set('signature',appProxySignature(params,secret));const r=await request(proxyPath+'/start?'+params);assert.equal(r.status,302,await r.clone().text());return new URLSearchParams(new URL(r.headers.get('location')).hash.slice(1)).get('s');}
const token=await start(id(initial.shopifyVariantId));
const client=createShopEntryClient({token,fetchImpl:request});
const loaded=await client.loadModel();assert.equal(familyFormatCombinations(loaded.model.universal).length,778);
assert.equal(familyFormatPrice(loaded.model.universal,target.nativeOptions),1499);
const submitted=await client.submitCart({draftId,expectedRevision:1,quantity:1},{draftToken});
assert.equal(calls.length,1);assert.equal(calls[0].shopifyVariantId,target.shopifyVariantId);assert.equal(submitted.shopifyVariantId,target.shopifyVariantId);assert.equal(submitted.totalCents,1499);
const directToken=await start(targetId);const directClient=createShopEntryClient({token:directToken,fetchImpl:request});
const directModel=await directClient.loadModel();assert.equal(directModel.binding.shopifyVariantId,target.shopifyVariantId);

// Real theme-cart browser transport also has no pageConfig/first250 dependency.
const configuration={id:'konfig_00000001-0000-4000-8000-000000000000',rev:1};
const payload={schema:'gravuru-theme-cart/v1',shopDomain,variantId:targetId,productId,quantity:1,unitCents:1499,totalCents:1499,currency:'EUR',configuration,mode:'create',properties:{_gravuru_config:configuration.id,_gravuru_rev:'1',_gravuru_offer:'a'.repeat(64)},preview:{type:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n6EAAAAASUVORK5CYII='},paymentConfirmed:false,productionReady:false};
let cart={currency:'EUR',items:[]},sentId=null,claims=0;
const themeClient=createThemeCartClient({claim:async()=>{claims++;},fetchImpl:async(url,opts={})=>{
 if(url==='/cart.js')return Response.json(cart);
 assert.equal(url,'/cart/add.js');assert.equal(opts.method,'POST');sentId=opts.body.get('items[0][id]');
 cart={currency:'EUR',items:[{key:'synthetic-line',variant_id:targetId,product_id:productId,quantity:1,original_price:1499,original_line_price:1499,final_line_price:1499,properties:{...payload.properties,_Entwurf:'https://cdn.shopify.com/uploads/synthetic-proof.png'}}]};return Response.json({items:cart.items});
}});
const themeResult=await themeClient.submit(payload);assert.equal(sentId,targetId);assert.equal(claims,1);assert.equal(themeResult.line.variant_id,targetId);
const result={schema:'gravuru-over250-readonly-check/v1',codeCommit:'af6fd986c735d97bddc974261398ab8c4e88e00b',checksPassed:6,shopVariantCount:shopIds.length,v9VariantCount:combinations.length,target:{shopifyVariantId:target.shopifyVariantId,shopInventoryPosition:331,options:target.nativeOptions,unitCents:1499},observed:{directPageSelectionReplacedBy:wrongDirect.searchParams.get('variant'),selectionAfterThemeChangeReplacedBy:currentVariant(changedConfig,changedDoc),actualEntryCartBinding:submitted.shopifyVariantId,actualThemeCartSentId:sentId,nativeDirectStartBeyond250Accepted:true},sourceHashes:{variantMapping:createHash('sha256').update(fs.readFileSync(new URL('./main-target-preview/variant-mapping.preview.json',import.meta.url))).digest('hex'),v9Plan:createHash('sha256').update(fs.readFileSync(new URL('../product-plans-run-v9/Tuerschild-Acrylglas-3mm_v4/plan.json',import.meta.url))).digest('hex')},limits:['808-ID inventory and v9 configuration are real saved read evidence. Registry/head/draft/approval/Shopify transport are synthetic inert adapters; no current DB assignment is claimed.','The shared server selection path was exercised through /cart; theme-cart payload preparation was source-reviewed, with the actual browser theme-cart transport tested separately.','No browser rendering, live JS hash, live purchase, DB changes or network calls. Source entry/transport exports were imported unchanged.']};
fs.writeFileSync(new URL('./main-variants-over250-proof.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
