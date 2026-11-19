import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {cartTimingStep,cartTimingCount,cartTimingBackground} from './shop-cart-timing.mjs';

// Cart Ajax uploads are not MediaImages. Shopify rejects those /uploads/ URLs
// in lineUpdate.image even when the PNG itself is publicly readable.
const fields='id fileStatus ... on MediaImage { image { url } }';
const fail=()=>{throw Object.assign(Error('Die Gestaltungsvorschau wird noch für den Warenkorb vorbereitet. Bitte erneut versuchen.'),{status:502,code:'checkout_image_pending'});};
export function createShopifyCheckoutImages({origin,shopDomain,getAccessToken},{fetchImpl=fetch,wait=delay}={}){
 const cache=new Map(),pending=new Map();
 async function request(stage,query,variables){
  const token=await cartTimingStep('access_token',()=>getAccessToken());
  return cartTimingStep(stage,async()=>{
   const response=await fetchImpl('https://'+shopDomain+'/admin/api/2026-07/graphql.json',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
   if(!response.ok)fail();const data=await response.json();if(data.errors?.length||!data.data)fail();return data.data;
  });
 }
 return async function checkoutImage(source,{justSaved=false}={}){
  let parsed;try{parsed=new URL(source);}catch{fail();}
  if(parsed.origin!==origin||parsed.search||parsed.hash||!/^\/gestaltung\/[-A-Za-z0-9_]{1,100}\/(?:offer_[a-f0-9-]{36}\/|proof_[a-f0-9-]{36}\/[a-f0-9]{64}\/)[a-f0-9]{64}\.png$/.test(parsed.pathname))fail();
  const filename='gravuru-gestaltung-'+createHash('sha256').update(source).digest('hex')+'.png';
  if(cache.has(filename)){cartTimingCount('checkout_image_cached');return cache.get(filename);}
  if(pending.has(filename)){cartTimingCount('checkout_image_pending');return pending.get(filename);}
  if(pending.size>=64)fail();
  cartTimingCount('checkout_image_started');
  const task=cartTimingBackground(async()=>{
   const lookup=async()=>{
    const found=await request('shopify_lookup','query CheckoutImage($query:String!){files(first:2,query:$query){nodes{'+fields+'}}}',{query:'filename:'+filename});
    if(found.files.nodes.length>1)fail();
    return found.files.nodes[0];
   };
   // A freshly persisted snapshot has a new server-generated ID. A duplicate still resolves the exact filename.
   let file;
   if(!justSaved || !parsed.pathname.includes('/proof_'))file=await lookup();
   if(!file){
    const created=await request('shopify_create','mutation CheckoutImageCreate($files:[FileCreateInput!]!){fileCreate(files:$files){files{'+fields+'}userErrors{field message}}}',{files:[{originalSource:source,filename,contentType:'IMAGE',duplicateResolutionMode:'RAISE_ERROR',alt:'Deine Gestaltung'}]});
    if(created.fileCreate.userErrors?.length||created.fileCreate.files.length!==1){
     // Another process may have created this exact deterministic filename after
     // our lookup. Never create a renamed duplicate; recover that same file.
     file=await lookup();if(!file)fail();
    }else file=created.fileCreate.files[0];
   }
   for(let n=0;n<12;n++){
    if(!/^gid:\/\/shopify\/MediaImage\/[0-9]+$/.test(file?.id||'')||file.fileStatus==='FAILED')fail();
    if(file.fileStatus==='READY'&&file.image?.url){
     const url=file.image.url;
     if(!/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/0920\/5550\/3228\/files\/gravuru-gestaltung-[a-f0-9]{64}\.png(?:\?v=[0-9]+)?$/.test(url)||new URL(url).pathname.split('/').at(-1)!==filename)fail();
     if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(filename,url);return url;
    }
    await cartTimingStep('shopify_poll_wait',()=>wait(750));
    file=(await request('shopify_poll','query CheckoutImageReady($id:ID!){node(id:$id){... on MediaImage{'+fields+'}}}',{id:file.id})).node;
   }
   fail();
  }).catch(()=>fail()).finally(()=>pending.delete(filename));
  pending.set(filename,task);return task;
 };
}
