import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createStorefrontCartTransport} from './storefront-transport.mjs';
const shop='gravuru-synthetic.myshopify.com',token='synthetic-private-token-only',buyerIp='192.0.2.5';
const config=()=>({shopDomain:shop,apiVersion:'2026-07',privateToken:token});
const offer=()=>({scope:'test-checkout-only',variantId:'301',quantity:2,unitCents:2999,currency:'EUR',property:{name:'_gravuru_offer',value:'a'.repeat(64)}});
const payload=o=>({data:{cartCreate:{cart:{id:'gid://shopify/Cart/synthetic',checkoutUrl:`https://${shop}/checkout/synthetic`,lines:{nodes:[{quantity:o.quantity,attributes:[{key:o.property.name,value:o.property.value}],merchandise:{id:'gid://shopify/ProductVariant/'+o.variantId},cost:{amountPerQuantity:{amount:'29.99',currencyCode:'EUR'},totalAmount:{amount:'59.98',currencyCode:'EUR'}}}],pageInfo:{hasNextPage:false}}},userErrors:[],warnings:[]}}});
const json=(res,value,status=200,headers={})=>{res.writeHead(status,{'content-type':'application/json','x-shopify-api-version':'2026-07',...headers});res.end(JSON.stringify(value));};
async function fixture(t,handler,options={}){
 const seen=[];const server=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;seen.push({url:req.url,headers:req.headers,body:JSON.parse(body)});await handler(req,res);});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 const calls=[],fetchImpl=(url,init)=>{calls.push({url,init});assert.equal(url,`https://${shop}/api/2026-07/graphql.json`);return fetch(`http://127.0.0.1:${server.address().port}${new URL(url).pathname}`,init);};
 return {seen,calls,create:createStorefrontCartTransport(config(),{fetchImpl,...options})};
}
const safeError=(code)=>e=>{assert.equal(e.code,code);assert.equal(e.retryable,false);assert.equal(e.mayHaveCreatedCart,true);for(const secret of [token,'upstream-secret','a'.repeat(64)])assert.ok(!String(e.stack).includes(secret));return true;};

function existingCartFixture({count=1,changeAfter,changeBefore,update=false,failAfter=false}={}){
 const o={...offer(),configuration:{id:'konfig_'+'1'.repeat(36),rev:update?2:1}},cartId='gid://shopify/Cart/existing?key=synthetic-secret',lineId='gid://shopify/CartLine/old';
 const node=(id,attrs=[])=>({id,quantity:2,attributes:attrs,merchandise:{id:'gid://shopify/ProductVariant/301'},cost:{amountPerQuantity:{amount:'29.99',currencyCode:'EUR'},totalAmount:{amount:'59.98',currencyCode:'EUR'}}});
 let lines=Array.from({length:count},(_,i)=>node('gid://shopify/CartLine/unrelated-'+i,[{key:'custom',value:String(i)}])),mutations=0,reads=0;
 if(update)lines.push(node(lineId,[{key:'_gravuru_config',value:o.configuration.id},{key:'_gravuru_rev',value:'1'},{key:'_gravuru_offer',value:'b'.repeat(64)}]));
 changeBefore?.(lines,o);
 const cart=nodes=>({id:cartId,checkoutUrl:`https://${shop}/checkout/synthetic`,lines:{nodes,pageInfo:{hasNextPage:false}}});
 const fetchImpl=async(_url,init)=>{
  const body=JSON.parse(init.body);
  if(body.query.includes('query GravuruCartRead')){
   reads++;if(failAfter&&mutations)throw Error('private-upstream-detail');
   const start=body.variables.after?Number(body.variables.after):0,nodes=structuredClone(lines.slice(start,start+100)),hasNextPage=start+100<lines.length;
   return Response.json({data:{cart:{...cart(nodes),lines:{nodes,pageInfo:{hasNextPage,endCursor:hasNextPage?String(start+100):null}}}}});
  }
  mutations++;const line=body.variables.lines[0],created=node('gid://shopify/CartLine/new',line.attributes);
  if(update)lines=lines.filter(l=>l.id!==lineId);lines.push(created);changeAfter?.(lines,o);
  return Response.json({data:{[update?'cartLinesUpdate':'cartLinesAdd']:{userErrors:[],warnings:[],cart:cart([])}}});
 };
 return {o,cartId,lineId,counts:()=>({mutations,reads}),run:()=>createStorefrontCartTransport(config(),{fetchImpl})(o,{buyerIp,...(update?{replace:{cartId,lineId}}:{addTo:{cartId}})})};
}

test('adding to a paginated existing cart preserves every unrelated design, even for the same Shopify variant',async()=>{
 const f=existingCartFixture({count:105}),r=await f.run();assert.equal(r.mode,'add');assert.equal(r.cartId,f.cartId);assert.equal(r.lineId,'gid://shopify/CartLine/new');assert.deepEqual(f.counts(),{mutations:1,reads:4});
});
test('update accepts Shopify changing its line id only after proving the old configuration and preserved remaining lines',async()=>{
 const f=existingCartFixture({update:true}),r=await f.run();assert.equal(r.mode,'update');assert.equal(r.previousLineId,f.lineId);assert.equal(r.lineId,'gid://shopify/CartLine/new');assert.deepEqual(f.counts(),{mutations:1,reads:2});
});
test('existing duplicate configuration fails before a mutation',async()=>{
 const f=existingCartFixture({changeBefore:(lines,o)=>lines[0].attributes.push({key:'_gravuru_config',value:o.configuration.id})});await assert.rejects(f.run,e=>e.mayHaveCreatedCart===false);assert.equal(f.counts().mutations,0);
});
test('unrelated removals, changed price, merged designs and lost post-read never return checkout or retry',async t=>{
 for(const changeAfter of [lines=>lines.shift(),lines=>lines[0].cost.totalAmount.amount='1.00',lines=>lines.at(-1).quantity+=2,lines=>lines.push(structuredClone(lines.at(-1)))])await t.test(String(changeAfter),async()=>{const f=existingCartFixture({changeAfter});await assert.rejects(f.run,e=>e.mayHaveCreatedCart===true);assert.equal(f.counts().mutations,1);});
 const f=existingCartFixture({failAfter:true});await assert.rejects(f.run,e=>e.mayHaveCreatedCart===true&&!e.message.includes('private-upstream'));assert.equal(f.counts().mutations,1);
});
test('server transport sends one bound HTTPS request with private auth and buyer IP, returning only verified cart details',async t=>{
 const o=offer(),f=await fixture(t,(_q,r)=>json(r,payload(o)));
 const result=await f.create({...o,photo:'private-artwork'},{buyerIp});assert.equal(result.paymentConfirmed,false);assert.equal(result.totalCents,5998);assert.equal(result.checkoutUrl,`https://${shop}/checkout/synthetic`);
 assert.equal(f.seen.length,1);assert.equal(f.calls[0].init.redirect,'manual');assert.equal(f.calls[0].init.cache,'no-store');assert.equal(f.seen[0].headers['shopify-storefront-private-token'],token);assert.equal(f.seen[0].headers['shopify-storefront-buyer-ip'],buyerIp);assert.equal(f.seen[0].body.variables.input.lines[0].merchandiseId,'gid://shopify/ProductVariant/301');assert.ok(!JSON.stringify(f.seen[0].body).includes('private-artwork'));assert.ok(!JSON.stringify(result).includes(token));
});
test('invalid config, buyer context, offers and already-cancelled requests never reach the network',async()=>{
 let count=0;const fetchImpl=()=>{count++;throw Error('must not send');};
 for(const bad of [{shopDomain:'evil.invalid'},{shopDomain:shop+'/path'},{shopDomain:'https://'+shop},{shopDomain:'bad-.myshopify.com'},{shopDomain:'user@'+shop},{apiVersion:'latest'},{privateToken:''},{privateToken:token+'\nInjected: true'},{endpoint:'https://evil.invalid'}])assert.throws(()=>createStorefrontCartTransport({...config(),...bad},{fetchImpl}),e=>e.code==='storefront_config');
 const create=createStorefrontCartTransport(config(),{fetchImpl});
 for(const ip of [undefined,'127.0.0.1, 192.0.2.1','text','fe80::1%eth0'])await assert.rejects(()=>create(offer(),{buyerIp:ip}),e=>e.mayHaveCreatedCart===false);
 await assert.rejects(()=>create({...offer(),scope:'live'},{buyerIp}),e=>e.code==='cart_handoff');
 await assert.rejects(()=>create(offer(),{buyerIp,signal:AbortSignal.abort()}),e=>e.code==='storefront_cancelled'&&e.mayHaveCreatedCart===false);assert.equal(count,0);
});
test('redirect, denial, throttling and upstream failures are sanitized and never retried',async t=>{
 for(const status of [302,401,403,429,430,500,503])await t.test(String(status),async t=>{
  const f=await fixture(t,(_q,r)=>json(r,{errors:[{message:'upstream-secret'}]},status,{location:'https://elsewhere.invalid/secret','retry-after':'0'}));
  await assert.rejects(()=>f.create(offer(),{buyerIp}),safeError('storefront_http'));assert.equal(f.seen.length,1);assert.equal(f.calls.length,1);
 });
});
test('malformed JSON, wrong content type, excessive body, and changed API version are not accepted',async t=>{
 const handlers=[r=>r.end('{broken'),r=>{r.setHeader('content-type','text/html');r.end('upstream-secret');},r=>{r.setHeader('content-length','1048577');r.end();},r=>r.end(' '.repeat(1048577)),r=>{r.setHeader('x-shopify-api-version','2026-10');r.end('{}');}];
 for(let i=0;i<handlers.length;i++)await t.test(String(i),async t=>{const f=await fixture(t,(_q,r)=>{r.setHeader('content-type','application/json');handlers[i](r);});await assert.rejects(()=>f.create(offer(),{buyerIp}),safeError(i===4?'storefront_version':'storefront_response'));assert.equal(f.seen.length,1);});
});
test('GraphQL errors, warnings, incomplete responses, incorrect prices and foreign checkout never escape as a usable cart',async t=>{
 const changes=[p=>p.errors=[{message:'upstream-secret'}],p=>p.errors={message:'upstream-secret'},p=>p.data.cartCreate.userErrors=[{message:'upstream-secret'}],p=>p.data.cartCreate.warnings=[{code:'stock'}],p=>p.data.cartCreate.cart.lines.nodes=[null],p=>delete p.data.cartCreate.cart.lines.nodes[0].cost,p=>p.data.cartCreate.cart.lines.nodes[0].cost.totalAmount.amount='1.00',p=>p.data.cartCreate.cart.checkoutUrl='https://elsewhere.invalid/secret'];
 for(let i=0;i<changes.length;i++)await t.test(String(i),async t=>{const p=payload(offer());changes[i](p);const f=await fixture(t,(_q,r)=>json(r,p));await assert.rejects(()=>f.create(offer(),{buyerIp}),safeError('storefront_cart_mismatch'));assert.equal(f.calls.length,1);});
});
test('network interruption, response-body timeout and caller cancellation have unknown outcome and no automatic second cart',async t=>{
 for(const mode of ['disconnect','timeout','cancel'])await t.test(mode,async t=>{
  const controller=new AbortController(),f=await fixture(t,(req,r)=>{if(mode==='disconnect'){req.socket.destroy();return;}r.writeHead(200,{'content-type':'application/json'});r.write('{');if(mode==='cancel')controller.abort();},{timeoutMs:100});
  await assert.rejects(()=>f.create(offer(),{buyerIp,signal:controller.signal}),safeError(mode==='disconnect'?'storefront_network':'storefront_interrupted'));assert.equal(f.seen.length,1);assert.equal(f.calls.length,1);
 });
});
test('verification remains bound to the originally sent offer even if the caller changes its object while awaiting HTTP',async t=>{
 const o=offer(),p=payload(o),f=await fixture(t,(_q,r)=>{o.unitCents=1;o.quantity=1;o.property.value='b'.repeat(64);json(r,p);});
 const result=await f.create(o,{buyerIp:'2001:db8::1'});assert.equal(result.totalCents,5998);assert.equal(result.quantity,2);
});
