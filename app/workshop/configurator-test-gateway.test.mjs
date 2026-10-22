import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createConfiguratorTestGateway} from './configurator-test-gateway.mjs';
const origin='https://test.example',shopDomain='test.myshopify.com',csrfToken='a'.repeat(64);
const ids={shopifyProductId:'gid://shopify/Product/11',shopifyVariantId:'gid://shopify/ProductVariant/12'};
function fixture(){
 let time=100000,cartCalls=0;const cartContexts=[];
 const binding={...ids,storeId:'acryl',tenantId:'gravuru',shopDomain,productId:'cfg_'+ '1'.repeat(36),productRevision:5,bindingId:'binding_1',assignmentRevision:1,options:{}};
 const store={storeId:'acryl',registry:{resolve:()=>structuredClone(binding)},workshop:{tenantId:'gravuru',sessionContext:{shopDomain},model:()=>({key:'form',configuration:{id:binding.productId,revision:binding.productRevision}})},apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html',cart:async(b,input,{draftToken,existingCart})=>{cartCalls++;cartContexts.push(existingCart);return {cartId:'gid://shopify/Cart/synthetic',checkoutUrl:'https://test.myshopify.com/checkout',draftTokenSeen:!!draftToken};}};
 const options={mode:'merchant-test-only',origin,shopDomain,csrfToken,stores:[store],clock:()=>time,verifyMerchant:(auth)=>{if(!['Bearer merchant','Bearer other'].includes(auth))throw Object.assign(Error(),{status:401,code:'shopify_session'});return {role:'merchant',shopDomain,subject:auth==='Bearer merchant'?'1':'2'};}};
 return {binding,store,options,cartContexts,tick:()=>time+=31*60000,calls:()=>cartCalls};
}
async function run(fn,mutate=()=>{}){
 const f=fixture();mutate(f);const gateway=createConfiguratorTestGateway(f.options);
 const server=http.createServer((req,res)=>gateway.handle(req,res,new URL(req.url,origin)));server.listen(0,'127.0.0.1');await once(server,'listening');
 const request=(path,method='GET',data,extra={})=>new Promise((resolve,reject)=>{
  const bytes=data===undefined?null:Buffer.from(JSON.stringify(data));
  const headers=Object.fromEntries(Object.entries({Host:'test.example','X-Forwarded-Proto':'https',Origin:origin,Authorization:'Bearer merchant','X-Gravuru-Csrf':csrfToken,'Content-Type':'application/json',...(bytes?{'Content-Length':bytes.length}:{}),...extra}).filter(([,v])=>v!==undefined));
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/configurator-test/'+path,method,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(Buffer.concat(chunks))});}catch(e){reject(e);}});});req.on('error',reject);req.end(bytes);
 });
 try{await fn(f,request,server);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
test('bootstrap and explicit IDs return narrow form session and bound model',()=>run(async(f,request)=>{
 const start=await request('session');assert.equal(start.status,200);assert.equal(start.data.publicAccess,false);
 const session=await request('sessions','POST',ids);assert.equal(session.status,201);assert.equal(session.data.editorKind,'form');assert.equal(session.data.editorPath,'/_merchant-acryl-form-editor.html');assert.equal(session.data.productionReady,false);assert.equal(session.data.binding.productRevision,5);assert.equal(Date.parse(session.data.expiresAt),1900000);
 const model=await request('model','GET',undefined,{'X-Gravuru-Configurator':session.data.token});assert.equal(model.status,200);assert.equal(model.data.configuration.id,f.binding.productId);
}));
test('anonymous and customer role cannot create sessions',()=>run(async(f,request)=>{
 for(const Authorization of ['', 'Bearer customer'])assert.equal((await request('sessions','POST',ids,{Authorization})).status,401);
 assert.equal(f.calls(),0);
}));
test('host, Origin, forwarded HTTPS and CSRF fail closed',()=>run(async(f,request)=>{
 for(const h of [{Host:'other.example'},{Origin:'https://other.example'},{'X-Forwarded-Proto':'http'},{'X-Gravuru-Csrf':'b'.repeat(64)},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await request('sessions','POST',ids,h)).status,403);
}));
test('browser cannot supply store, tenant, URL, price or config ID',()=>run(async(f,request)=>{
 for(const key of ['storeId','tenantId','url','unitCents','productId'])assert.equal((await request('sessions','POST',{...ids,[key]:'forbidden'})).status,422);
 assert.equal((await request('model?productId=other')).status,404);
 assert.equal((await request('orders')).status,404);
}));
test('duplicates across stores block before cart call',()=>run(async(f,request)=>{
 assert.equal((await request('sessions','POST',ids)).status,409);assert.equal(f.calls(),0);
},f=>{const copy={...f.store,storeId:'legacy',registry:{resolve:()=>({...f.binding,storeId:'legacy'})}};f.options.stores.push(copy);}));
test('unknown binding is distinct from a broken store; both block',async()=>{
 for(const error of [{status:404,code:'shop_binding_active_not_found'},{status:409,code:'shop_binding_corrupt'}])await run(async(f,request)=>assert.equal((await request('sessions','POST',ids)).status,error.status),f=>f.store.registry.resolve=()=>{throw error;});
});
test('binding scope mismatch blocks',()=>run(async(f,request)=>assert.equal((await request('sessions','POST',ids)).status,409),f=>f.binding.tenantId='foreign'));
test('session bound to merchant, expiry and assignment revision',()=>run(async(f,request)=>{
 const session=(await request('sessions','POST',ids)).data,headers={'X-Gravuru-Configurator':session.token};
 assert.equal((await request('model','GET',undefined,{...headers,Authorization:'Bearer other'})).status,403);
 f.binding.assignmentRevision++;assert.equal((await request('model','GET',undefined,headers)).status,409);f.binding.assignmentRevision--;
 f.tick();assert.equal((await request('model','GET',undefined,headers)).status,403);
}));
test('cart uses selected store and private draft header; manufacturing never enabled',()=>run(async(f,request)=>{
 const session=(await request('sessions','POST',ids)).data;
 const cart=await request('cart','POST',{draftId:'adraft_test',expectedRevision:1,quantity:1},{'X-Gravuru-Configurator':session.token,'X-Gravuru-Draft':'b'.repeat(64)});
 assert.equal(cart.status,200);assert.equal(f.calls(),1);assert.equal(cart.data.testOnly,true);assert.equal(cart.data.productionReady,false);
}));
test('session request cap is bounded',()=>run(async(f,request)=>{
 assert.equal((await request('sessions','POST',ids)).status,201);assert.equal((await request('sessions','POST',ids)).status,429);
},f=>f.options.maxSessions=1));
test('default/public mode cannot be activated accidentally',()=>{const f=fixture();assert.throws(()=>createConfiguratorTestGateway({...f.options,mode:'public'}));assert.throws(()=>createConfiguratorTestGateway({...f.options,stores:[]}));});
test('normal same-origin GET needs no Origin header, POST still does',()=>run(async(f,request)=>{
 assert.equal((await request('session','GET',undefined,{Origin:undefined,'Sec-Fetch-Site':'same-origin'})).status,200);
 assert.equal((await request('sessions','POST',ids,{Origin:undefined})).status,403);
}));
test('wrong product model is not returned even from the chosen store',()=>run(async(f,request)=>assert.equal((await request('sessions','POST',ids)).status,409),f=>f.store.workshop.model=()=>({key:'form',configuration:{id:'other',revision:5}})));
test('different designs share private cart; original create retry stays create',()=>run(async(f,request)=>{
 const seen=f.cartContexts;
 const a=(await request('sessions','POST',ids)).data,b=(await request('sessions','POST',ids)).data;
 const headers=token=>({'X-Gravuru-Configurator':token,'X-Gravuru-Draft':'b'.repeat(64)});
 const first={draftId:'adraft_1',expectedRevision:1,quantity:1},second={draftId:'adraft_2',expectedRevision:1,quantity:1};
 assert.equal((await request('cart','POST',first,headers(a.token))).status,200);
 assert.equal((await request('cart','POST',second,headers(b.token))).status,200);
 assert.equal((await request('cart','POST',first,headers(a.token))).status,200);
 assert.deepEqual(seen,[undefined,{cartId:'gid://shopify/Cart/synthetic'},undefined]);
}));
test('merchant cart ownership is not shared with another merchant',()=>run(async(f,request)=>{
 const seen=f.cartContexts;
 const first=(await request('sessions','POST',ids)).data;
 await request('cart','POST',{draftId:'adraft_1',expectedRevision:1,quantity:1},{'X-Gravuru-Configurator':first.token,'X-Gravuru-Draft':'b'.repeat(64)});
 const other=(await request('sessions','POST',ids,{Authorization:'Bearer other'})).data;
 await request('cart','POST',{draftId:'adraft_2',expectedRevision:1,quantity:1},{Authorization:'Bearer other','X-Gravuru-Configurator':other.token,'X-Gravuru-Draft':'c'.repeat(64)});
 assert.deepEqual(seen,[undefined,undefined]);
}));
test('busy claim covers a body still arriving over HTTP and releases after completion',()=>run(async(f,request,server)=>{
 const session=(await request('sessions','POST',ids)).data,headers={'X-Gravuru-Configurator':session.token,'X-Gravuru-Draft':'b'.repeat(64)};
 const bytes=Buffer.from(JSON.stringify({draftId:'adraft_slow',expectedRevision:1,quantity:1}));
 let finish;const completed=new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/configurator-test/cart',method:'POST',headers:{Host:'test.example','X-Forwarded-Proto':'https',Origin:origin,Authorization:'Bearer merchant','X-Gravuru-Csrf':csrfToken,'Content-Type':'application/json','Content-Length':bytes.length,...headers}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);finish=()=>req.end(bytes.subarray(1));req.write(bytes.subarray(0,1));
 });
 await once(server,'request');
 assert.equal((await request('cart','POST',{draftId:'adraft_second',expectedRevision:1,quantity:1},headers)).status,409);assert.equal(f.calls(),0);
 finish();assert.equal(await completed,200);
 assert.equal((await request('cart','POST',{draftId:'adraft_second',expectedRevision:1,quantity:1},headers)).status,200);
}));
