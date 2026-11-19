import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createShopifyCheckoutImages} from './shopify-checkout-image.mjs';
import {withCartTiming,cartTimingStep,cartTimingHeaders} from './shop-cart-timing.mjs';
const origin='https://app.example',shopDomain='gravuru-design.myshopify.com';
const source=origin+'/gestaltung/acryl/offer_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/'+'b'.repeat(64)+'.png';
const filename='gravuru-gestaltung-'+createHash('sha256').update(source).digest('hex')+'.png';
const url='https://cdn.shopify.com/s/files/1/0920/5550/3228/files/'+filename+'?v=1';
const ready={id:'gid://shopify/MediaImage/123',fileStatus:'READY',image:{url}};
function fixture(responses){
 const calls=[];let waits=0;
 const service=createShopifyCheckoutImages({origin,shopDomain,getAccessToken:async()=>'synthetic-token'},{wait:async()=>{waits++;},fetchImpl:async(endpoint,options)=>{
  assert.equal(endpoint,'https://'+shopDomain+'/admin/api/2026-07/graphql.json');assert.equal(options.redirect,'error');
  calls.push(JSON.parse(options.body));assert.ok(responses.length,'unexpected network call');return Response.json(responses.shift());
 }});
 return {service,calls,waits:()=>waits};
}
test('immutable preview is registered as IMAGE, awaited until READY, and reused concurrently',async()=>{
 const f=fixture([{data:{files:{nodes:[]}}},{data:{fileCreate:{files:[{id:ready.id,fileStatus:'PROCESSING'}],userErrors:[]}}},{data:{node:ready}}]);
 assert.deepEqual(await Promise.all([f.service(source),f.service(source)]),[url,url]);
 assert.equal(await f.service(source),url);assert.equal(f.calls.length,3);assert.equal(f.waits(),1);
 assert.deepEqual(f.calls[1].variables.files,[{originalSource:source,filename,contentType:'IMAGE',duplicateResolutionMode:'RAISE_ERROR',alt:'Deine Gestaltung'}]);
});
test('restart reuses existing READY MediaImage without overwriting or creating it again',async()=>{
 const f=fixture([{data:{files:{nodes:[ready]}}}]);assert.equal(await f.service(source),url);assert.equal(f.calls.length,1);
});
test('a Shopify 5xx and a dropped connection stay retryable',async()=>{
 const down=fixture([]);
 down.service=createShopifyCheckoutImages({origin,shopDomain,getAccessToken:async()=>'synthetic-token'},{fetchImpl:async()=>new Response('',{status:503})});
 await assert.rejects(down.service(source),error=>error.code==='checkout_image_pending'&&error.status===503);
 const dropped=createShopifyCheckoutImages({origin,shopDomain,getAccessToken:async()=>'synthetic-token'},{fetchImpl:async()=>{throw Error('network');}});
 await assert.rejects(dropped(source),error=>error.code==='checkout_image_pending');
});
test('foreign or mutable sources never reach Shopify',async()=>{
 const f=fixture([]);
 for(const s of [source.replace(origin,'https://evil.example'),source+'?x=1',source+'#x',origin+'/api/private',undefined])await assert.rejects(f.service(s),e=>e.code==='checkout_image_failed');
 assert.equal(f.calls.length,0);
});
test('failed, ambiguous, generic-file and wrong-CDN results cannot become checkout images',async()=>{
 for(const nodes of [[ready,ready],[{...ready,id:'gid://shopify/GenericFile/123'}],[{...ready,fileStatus:'FAILED'}],[{...ready,image:{url:url.replace('/files/gravuru-','/uploads/gravuru-')}}],[{...ready,image:{url:url.replace('0920','0000')}}]]){
  const f=fixture([{data:{files:{nodes}}}]);await assert.rejects(f.service(source),e=>e.status===502);
 }
 const f=fixture([{data:{files:{nodes:[]}}},{data:{fileCreate:{files:[],userErrors:[{message:'denied'}]}}},{data:{files:{nodes:[]}}}]);await assert.rejects(f.service(source),error=>error.code==='checkout_image_failed');
});

test('pre-save and handoff share one immutable snapshot file; a later revision has a new source',async()=>{
 const snapshot=origin+'/gestaltung/acryl/proof_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/'+'c'.repeat(64)+'/'+'d'.repeat(64)+'.png';
 const next=snapshot.replace('proof_aaaaaaaa','proof_bbbbbbbb');
 const events=[],files=new Map();let creates=0;
 const service=createShopifyCheckoutImages({origin,shopDomain,getAccessToken:async()=>'synthetic'},{fetchImpl:async(_,opts)=>{
  const {query,variables}=JSON.parse(opts.body);
  if(query.includes('query CheckoutImage('))return Response.json({data:{files:{nodes:[]}}});
  creates++;const input=variables.files[0],file={id:'gid://shopify/MediaImage/'+creates,fileStatus:'READY',image:{url:'https://cdn.shopify.com/s/files/1/0920/5550/3228/files/'+input.filename}};files.set(input.originalSource,file);return Response.json({data:{fileCreate:{files:[file],userErrors:[]}}});
 }});
 let pre;
 await withCartTiming('acrylic-drafts',e=>events.push(e),()=>{pre=service(snapshot);cartTimingHeaders(201);});
 const handoff=service(snapshot);assert.equal(await pre,await handoff);assert.equal(creates,1);
 assert.equal(await service(snapshot),await pre);assert.equal(creates,1);
 assert.notEqual(await service(next),await pre);assert.equal(creates,2);
 assert.equal(files.size,2);
 const parent=events.find(e=>e.route==='acrylic-drafts'),job=events.find(e=>e.route==='checkout-image');
 assert.equal(parent.counts.checkout_image_started,1);assert.equal(job.parentTraceId,parent.traceId);
});

test('another process wins file creation: recover the exact existing file after duplicate rejection',async()=>{
 const f=fixture([{data:{files:{nodes:[]}}},{data:{fileCreate:{files:[],userErrors:[{message:'duplicate filename'}]}}},{data:{files:{nodes:[ready]}}}]);
 assert.equal(await f.service(source),url);assert.equal(f.calls.filter(c=>c.query.includes('mutation')).length,1);assert.equal(f.calls.length,3);
});

test('two service instances racing the same source create one file and both succeed',async()=>{
 let lookups=0,creates=0,file=null,release;
 const barrier=new Promise(r=>{release=r;});
 const options={fetchImpl:async(_,opts)=>{
  const {query}=JSON.parse(opts.body);
  if(query.includes('query CheckoutImage(')){
   lookups++;if(lookups<=2){if(lookups===2)release();await barrier;return Response.json({data:{files:{nodes:[]}}});}
   return Response.json({data:{files:{nodes:file?[file]:[]}}});
  }
  if(file)return Response.json({data:{fileCreate:{files:[],userErrors:[{message:'duplicate'}]}}});
  creates++;file=ready;return Response.json({data:{fileCreate:{files:[file],userErrors:[]}}});
 }};
 const config={origin,shopDomain,getAccessToken:async()=>'synthetic'};
 const a=createShopifyCheckoutImages(config,options),b=createShopifyCheckoutImages(config,options);
 assert.deepEqual(await Promise.all([a(source),b(source)]),[url,url]);assert.equal(creates,1);assert.equal(lookups,3);
});

test('pending capacity is bounded and a rejected warmup can retry after slots finish',async()=>{
 let release;const barrier=new Promise(r=>{release=r;});
 const service=createShopifyCheckoutImages({origin,shopDomain,getAccessToken:async()=>'synthetic'},{fetchImpl:async(_,opts)=>{
  const {variables}=JSON.parse(opts.body);await barrier;const name=variables.query.slice('filename:'.length);
  return Response.json({data:{files:{nodes:[{...ready,image:{url:'https://cdn.shopify.com/s/files/1/0920/5550/3228/files/'+name}}]}}});
 }});
 const address=i=>source.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',String(i).padStart(8,'0')+'-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 const jobs=Array.from({length:64},(_,i)=>service(address(i)));
 await assert.rejects(service(address(64)),{code:'checkout_image_pending'});
 release();await Promise.all(jobs);assert.ok(await service(address(64)));
});
test('processing is bounded and a later retry can complete the same media',async()=>{
 const processing={id:ready.id,fileStatus:'PROCESSING'};
 const f=fixture([{data:{files:{nodes:[processing]}}},...Array.from({length:12},()=>({data:{node:processing}})),{data:{files:{nodes:[ready]}}}]);
 await assert.rejects(f.service(source),error=>error.code==='checkout_image_pending');assert.equal(f.waits(),12);assert.equal(await f.service(source),url);
});

test('image timings separate lookup, create, polling, pending reuse and ready cache without private URLs',async()=>{
 const events=[],logger=e=>events.push(e);
 const f=fixture([{data:{files:{nodes:[]}}},{data:{fileCreate:{files:[{id:ready.id,fileStatus:'PROCESSING'}],userErrors:[]}}},{data:{node:ready}}]);
 let pending;
 await withCartTiming('theme-cart',logger,()=>{pending=f.service(source);cartTimingHeaders(200);});
 await withCartTiming('cart/data',logger,async()=>{assert.equal(await cartTimingStep('checkout_image_wait',()=>f.service(source)),url);cartTimingHeaders(200);});
 await pending;
 await withCartTiming('cart/data',logger,async()=>{assert.equal(await f.service(source),url);cartTimingHeaders(200);});
 const start=events.find(e=>e.route==='theme-cart'),job=events.find(e=>e.route==='checkout-image');
 assert.equal(job.parentTraceId,start.traceId);assert.equal(start.counts.checkout_image_started,1);
 for(const stage of ['access_token','shopify_lookup','shopify_create','shopify_poll_wait','shopify_poll'])assert.ok(job.steps[stage],stage);
 assert.equal(job.steps.access_token.calls,3);
 assert.ok(events.some(e=>e.counts.checkout_image_pending===1));assert.ok(events.some(e=>e.counts.checkout_image_cached===1));
 const log=JSON.stringify(events);for(const value of [source,url,filename,'synthetic-token',ready.id])assert.ok(!log.includes(value));
});
