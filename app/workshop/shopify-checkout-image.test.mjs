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
test('foreign or mutable sources never reach Shopify',async()=>{
 const f=fixture([]);
 for(const s of [source.replace(origin,'https://evil.example'),source+'?x=1',source+'#x',origin+'/api/private',undefined])await assert.rejects(f.service(s),e=>e.code==='checkout_image_pending');
 assert.equal(f.calls.length,0);
});
test('failed, ambiguous, generic-file and wrong-CDN results cannot become checkout images',async()=>{
 for(const nodes of [[ready,ready],[{...ready,id:'gid://shopify/GenericFile/123'}],[{...ready,fileStatus:'FAILED'}],[{...ready,image:{url:url.replace('/files/gravuru-','/uploads/gravuru-')}}],[{...ready,image:{url:url.replace('0920','0000')}}]]){
  const f=fixture([{data:{files:{nodes}}}]);await assert.rejects(f.service(source),e=>e.status===502);
 }
 const f=fixture([{data:{files:{nodes:[]}}},{data:{fileCreate:{files:[],userErrors:[{message:'denied'}]}}}]);await assert.rejects(f.service(source),/Gestaltungsvorschau/);
});
test('processing is bounded and a later retry can complete the same media',async()=>{
 const processing={id:ready.id,fileStatus:'PROCESSING'};
 const f=fixture([{data:{files:{nodes:[processing]}}},...Array.from({length:12},()=>({data:{node:processing}})),{data:{files:{nodes:[ready]}}}]);
 await assert.rejects(f.service(source),/Gestaltungsvorschau/);assert.equal(f.waits(),12);assert.equal(await f.service(source),url);
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
