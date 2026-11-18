import {createGallerySyncShopifyTransport,GALLERY_SYNC_OPERATIONS} from '../../app/workshop/gallery-shop-sync-transport.mjs';

const fail=code=>{throw Object.assign(Error('Der vorhandene Shopify-Leseanschluss konnte nicht bestätigt werden.'),{code,status:502});};
const allowed=new Set([GALLERY_SYNC_OPERATIONS.product,GALLERY_SYNC_OPERATIONS.variants]);

/** Reuses the existing private app's token provider. Only the two existing
 * gallery read operations are admitted; no OAuth setup, secrets discovery,
 * products, metafields or media are written by this connection. */
export function createGalleryProductionShopifyRead(options={}){return createConnection(options);}

/** Explicit server-only release writer. No product, option, price, media or
 * generic metafield mutation is admitted; the existing engine supplies CAS. */
export function createGalleryProductionShopifyRelease(options={}){
 const {expected,allowedProfileIds,writesEnabled=false}=options;
 if(typeof writesEnabled!=='boolean'||!expected?.productId||!/^gid:\/\/shopify\/Product\/[1-9]\d{0,19}$/.test(expected.shopifyProductId||'')||!Number.isSafeInteger(expected.revision)||!Array.isArray(allowedProfileIds)||!allowedProfileIds.length)fail('gallery_connection_release_scope');
 return createConnection(options,{expected:structuredClone(expected),allowed:new Set(allowedProfileIds),enabled:writesEnabled});
}
function createConnection({shopDomain,apiVersion,getAccessToken,accessToken,fetchImpl=globalThis.fetch,timeoutMs=15000,maxBytes=8*1024*1024,clock=Date.now}={},release=null){
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain||'')||!/^20\d{2}-(01|04|07|10)$/.test(apiVersion||'')||typeof fetchImpl!=='function'||
   (typeof getAccessToken==='function')===(typeof accessToken==='string'&&accessToken.length>0)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>16*1024*1024)fail('gallery_connection_auth_config');
 const endpoint=`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
 async function graphql(query,variables,beforeWrite){
  // Reject mutations before obtaining credentials or contacting the network.
  const mutation=query===GALLERY_SYNC_OPERATIONS.release;
  if(mutation){
   const m=variables?.metafields?.[0];
   if(!release?.enabled||typeof beforeWrite!=='function'||Object.keys(variables||{}).join(',')!=='metafields'||variables.metafields.length!==1||!m||Object.keys(m).sort().join(',')!=='compareDigest,key,namespace,ownerId,type,value'||m.ownerId!==release.expected.shopifyProductId||m.namespace!=='gravuru'||m.key!=='gallery_release'||m.type!=='json'||typeof m.value!=='string'||m.value.length>4096||m.compareDigest!==null&&!/^[a-f0-9]{64}$/.test(m.compareDigest||''))fail('gallery_connection_release_scope');
   let value;try{value=JSON.parse(m.value);}catch{fail('gallery_connection_release_scope');}
   if(Object.keys(value).sort().join(',')!=='designId,documentSha256,kind,moduleProfile,nativeSource,productId,productRevision,schema,sourceFingerprint,sourceRevision'||value.schema!=='gravuru-gallery-shop-sync/v1'||value.kind!=='module-profile'||value.productId!==release.expected.productId||value.nativeSource?.productId!==release.expected.productId||value.nativeSource.revision!==release.expected.revision||value.sourceRevision!==release.expected.revision||!release.allowed.has(value.moduleProfile?.id)||!Number.isSafeInteger(value.moduleProfile.revision)||value.moduleProfile.revision<1||!Number.isSafeInteger(value.productRevision)||value.productRevision<release.expected.revision||![value.moduleProfile.sha256,value.documentSha256,value.sourceFingerprint].every(v=>/^[a-f0-9]{64}$/.test(v||'')))fail('gallery_connection_release_scope');
  }else if(!allowed.has(query)||!variables||Object.keys(variables).some(k=>!['id','after'].includes(k))||!/^gid:\/\/shopify\/Product\/[1-9]\d{0,19}$/.test(variables.id)||release&&variables.id!==release.expected.shopifyProductId)fail('gallery_connection_read_only');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const token=typeof getAccessToken==='function'?await getAccessToken():accessToken;
   if(typeof token!=='string'||!token||token.length>16384)fail('gallery_connection_auth');
   if(mutation){const result=beforeWrite();if(result?.then)fail('gallery_connection_async_guard');}
   const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
   if(!response.ok||response.redirected||response.headers?.get('x-shopify-api-version')!==apiVersion||!/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type')||'')||Number(response.headers?.get('content-length')||0)>maxBytes)fail('gallery_connection_response');
   const reader=response.body?.getReader?.();if(!reader)fail('gallery_connection_response');
   const chunks=[];let size=0;
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();fail('gallery_connection_response_size');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(body?.errors?.length||!body?.data)fail('gallery_connection_graphql');
   return body;
  }catch(error){if(error?.code?.startsWith('gallery_connection_')||error?.code?.startsWith('gallery_sync_'))throw error;fail('gallery_connection_read_failed');}
  finally{clearTimeout(timer);}
 }
 const transport=createGallerySyncShopifyTransport({shopDomain,graphql,writesEnabled:release?.enabled===true,clock});
 return Object.freeze({graphql,transport,shopDomain,canWrite:release?.enabled===true});
}
