import {createGallerySyncShopifyTransport} from '../../app/workshop/gallery-shop-sync-transport.mjs';

const fail=code=>{throw Object.assign(Error('Der vorhandene Shopify-Leseanschluss konnte nicht bestätigt werden.'),{code,status:502});};
const allowed=new Set(['GallerySyncProduct','GallerySyncVariants']);

/** Reuses the existing private app's token provider. Only the two existing
 * gallery read operations are admitted; no OAuth setup, secrets discovery,
 * products, metafields or media are written by this connection. */
export function createGalleryProductionShopifyRead({shopDomain,apiVersion,getAccessToken,accessToken,fetchImpl=globalThis.fetch,timeoutMs=15000,maxBytes=8*1024*1024,clock=Date.now}={}){
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain||'')||!/^20\d{2}-(01|04|07|10)$/.test(apiVersion||'')||typeof fetchImpl!=='function'||
   (typeof getAccessToken==='function')===(typeof accessToken==='string'&&accessToken.length>0)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>16*1024*1024)fail('gallery_connection_auth_config');
 const endpoint=`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
 async function graphql(query,variables){
  // Reject mutations before obtaining credentials or contacting the network.
  const operation=/^query (GallerySyncProduct|GallerySyncVariants)\(/.exec(query||'')?.[1];
  if(!allowed.has(operation)||/\bmutation\b|__schema|__type/.test(query)||!variables||Object.keys(variables).some(k=>!['id','after'].includes(k))||!/^gid:\/\/shopify\/Product\/[1-9]\d{0,19}$/.test(variables.id))fail('gallery_connection_read_only');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const token=typeof getAccessToken==='function'?await getAccessToken():accessToken;
   if(typeof token!=='string'||!token||token.length>16384)fail('gallery_connection_auth');
   const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
   if(!response.ok||response.redirected||response.headers?.get('x-shopify-api-version')!==apiVersion||!/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type')||'')||Number(response.headers?.get('content-length')||0)>maxBytes)fail('gallery_connection_response');
   const reader=response.body?.getReader?.();if(!reader)fail('gallery_connection_response');
   const chunks=[];let size=0;
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();fail('gallery_connection_response_size');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(body?.errors?.length||!body?.data)fail('gallery_connection_graphql');
   return body;
  }catch(error){if(error?.code?.startsWith('gallery_connection_'))throw error;fail('gallery_connection_read_failed');}
  finally{clearTimeout(timer);}
 }
 const transport=createGallerySyncShopifyTransport({shopDomain,graphql,writesEnabled:false,clock});
 return Object.freeze({graphql,transport,shopDomain,canWrite:false});
}
