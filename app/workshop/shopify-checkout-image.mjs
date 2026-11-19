import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {cartTimingStep,cartTimingCount,cartTimingBackground} from './shop-cart-timing.mjs';

// Cart Ajax uploads are not MediaImages. Shopify rejects those /uploads/ URLs
// in lineUpdate.image even when the PNG itself is publicly readable.
const fields='id fileStatus ... on MediaImage { image { url } }';
const fail=code=>{const name=code||'checkout_image_failed';throw Object.assign(Error(name==='checkout_image_pending'?'Die Gestaltungsvorschau wird noch für den Warenkorb vorbereitet. Bitte erneut versuchen.':'Die Vorschau für die Kasse konnte nicht erstellt werden. Es wurde nichts in den Warenkorb gelegt.'),{status:name==='checkout_image_pending'?503:502,code:name});};
const THROTTLE_BUDGET_MS=12000;
const backoff=attempt=>Math.min(4000,500*2**Math.min(attempt,3));
export function shopifyRetryDelay(response,attempt,now=Date.now){
 const raw=response?.headers?.get?.('retry-after');
 if(typeof raw==='string'&&raw.trim()){
  const seconds=Number(raw);
  if(Number.isFinite(seconds)&&seconds>=0){const ms=Math.min(Math.round(seconds*1000),4000);if(ms>0)return ms;}
  const when=Date.parse(raw);if(Number.isFinite(when)){const ms=when-now();if(ms>0)return Math.min(ms,4000);}
 }
 return backoff(attempt);
}
const throttled=data=>Array.isArray(data?.errors)&&data.errors.some(error=>error?.extensions?.code==='THROTTLED'||/^throttled$/i.test(String(error?.message||'')));
export function createShopifyCheckoutImages({origin,shopDomain,getAccessToken},{fetchImpl=fetch,wait=delay,now=Date.now}={}){
 const cache=new Map(),pending=new Map();
 async function request(stage,query,variables){
  const token=await cartTimingStep('access_token',()=>getAccessToken());
  return cartTimingStep(stage,async()=>{
   let spent=0;
   for(let attempt=0;;attempt++){
    let response;try{response=await fetchImpl('https://'+shopDomain+'/admin/api/2026-07/graphql.json',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});}catch{fail('checkout_image_pending');}
    if(response.status===429){const ms=shopifyRetryDelay(response,attempt,now);if(spent+ms>THROTTLE_BUDGET_MS)fail('checkout_image_pending');spent+=ms;await wait(ms);continue;}
    if(!response.ok)fail(response.status>=500?'checkout_image_pending':'checkout_image_failed');
    const data=await response.json();
    if(throttled(data)){const ms=shopifyRetryDelay(response,attempt,now);if(spent+ms>THROTTLE_BUDGET_MS)fail('checkout_image_pending');spent+=ms;await wait(ms);continue;}
    if(data.errors?.length||!data.data)fail('checkout_image_failed');return data.data;
   }
  });
 }
 return async function checkoutImage(source){
  let parsed;try{parsed=new URL(source);}catch{fail();}
  if(parsed.origin!==origin||parsed.search||parsed.hash||!/^\/gestaltung\/[-A-Za-z0-9_]{1,100}\/(?:offer_[a-f0-9-]{36}\/|proof_[a-f0-9-]{36}\/[a-f0-9]{64}\/)[a-f0-9]{64}\.png$/.test(parsed.pathname))fail();
  const filename='gravuru-gestaltung-'+createHash('sha256').update(source).digest('hex')+'.png';
  if(cache.has(filename)){cartTimingCount('checkout_image_cached');return cache.get(filename);}
  if(pending.has(filename)){cartTimingCount('checkout_image_pending');return pending.get(filename);}
  if(pending.size>=64)fail('checkout_image_pending');
  cartTimingCount('checkout_image_started');
  const task=cartTimingBackground(async()=>{
   const found=await request('shopify_lookup','query CheckoutImage($query:String!){files(first:2,query:$query){nodes{'+fields+'}}}',{query:'filename:'+filename});
   if(found.files.nodes.length>1)fail();let file=found.files.nodes[0];
   if(!file){
    const created=await request('shopify_create','mutation CheckoutImageCreate($files:[FileCreateInput!]!){fileCreate(files:$files){files{'+fields+'}userErrors{field message}}}',{files:[{originalSource:source,filename,contentType:'IMAGE',duplicateResolutionMode:'RAISE_ERROR',alt:'Deine Gestaltung'}]});
    if(created.fileCreate.userErrors?.length||created.fileCreate.files.length!==1){
     // Another process may have created this exact deterministic filename after
     // our lookup. Never create a renamed duplicate; recover that same file.
     const raced=await request('shopify_lookup','query CheckoutImage($query:String!){files(first:2,query:$query){nodes{'+fields+'}}}',{query:'filename:'+filename});
     if(raced.files.nodes.length!==1)fail();file=raced.files.nodes[0];
    }else file=created.fileCreate.files[0];
   }
   for(let n=0;n<12;n++){
    if(file?.fileStatus==='FAILED')fail('checkout_image_failed');
    if(!/^gid:\/\/shopify\/MediaImage\/[0-9]+$/.test(file?.id||''))fail('checkout_image_failed');
    if(file.fileStatus==='READY'&&file.image?.url){
     const url=file.image.url;
     if(!/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/0920\/5550\/3228\/files\/gravuru-gestaltung-[a-f0-9]{64}\.png(?:\?v=[0-9]+)?$/.test(url)||new URL(url).pathname.split('/').at(-1)!==filename)fail();
     if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(filename,url);return url;
    }
    await cartTimingStep('shopify_poll_wait',()=>wait(750));
    file=(await request('shopify_poll','query CheckoutImageReady($id:ID!){node(id:$id){... on MediaImage{'+fields+'}}}',{id:file.id})).node;
   }
   fail('checkout_image_pending');
  }).catch(error=>{if(error?.code==='checkout_image_pending'||error?.code==='checkout_image_failed')throw error;fail('checkout_image_pending');}).finally(()=>pending.delete(filename));
  pending.set(filename,task);return task;
 };
}
