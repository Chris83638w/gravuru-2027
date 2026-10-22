// Fixed one-product, one-field CAS operation. Not used by the running application.
// Transport restrictions follow the deployed shopify-admin-readonly.mjs client.
import {ADMIN_READONLY_IDENTITY} from '../../app/workshop/shopify-admin-readonly.mjs';
import {TARGET,assertPlan,same,digest,fail} from './tier-update-plan.mjs';
export const READ_QUERY=`query GravuruMemorialTierCasRead { shop { myshopifyDomain currencyCode plan { partnerDevelopment } } currentAppInstallation { app { id } accessScopes { handle } } product(id: "gid://shopify/Product/16138083107196") { id status pricing: metafield(namespace: "$app", key: "personalization") { id namespace key type value compareDigest } } }`;
export const SET_MUTATION=`mutation GravuruMemorialTierCasSet($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { metafields { id namespace key type value compareDigest } userErrors { field code message } } }`;
export function createTierPricingCas({readSecret},{fetchImpl=globalThis.fetch,timeoutMs=20000}={}){
 if(typeof readSecret!=='function'||typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)fail('cas_configuration');
 const {shopDomain,clientId,appId,apiVersion}=ADMIN_READONLY_IDENTITY;let accessToken;
 async function request(url,options,version=false){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);let reader;
  try{
   const response=await fetchImpl(url,{...options,redirect:'error',cache:'no-store',signal:controller.signal});
   if(!response.ok||response.redirected||version&&response.headers.get('x-shopify-api-version')!==apiVersion||!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')||!response.body)fail('cas_transport');
   const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>1048576))fail('cas_size');
   reader=response.body.getReader();let bytes=0;const chunks=[];for(;;){const {done,value}=await reader.read();if(controller.signal.aborted)fail('cas_timeout');if(done)break;bytes+=value.byteLength;if(bytes>1048576)fail('cas_size');chunks.push(Buffer.from(value));}
   return JSON.parse(Buffer.concat(chunks,bytes).toString('utf8'));
  }catch(error){if(error?.code?.startsWith('cas_'))throw error;fail('cas_network_or_response');}
  finally{clearTimeout(timer);controller.abort();if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
 }
 async function auth(){
  const secret=await readSecret();if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{16,256}$/.test(secret))fail('cas_secret');
  const result=await request(`https://${shopDomain}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:secret}).toString()});
  if(typeof result?.access_token!=='string'||!/^[\x21-\x7e]{16,4096}$/.test(result.access_token)||!Number.isInteger(result.expires_in)||result.expires_in<120||result.expires_in>86400||typeof result.scope!=='string')fail('cas_token');accessToken=result.access_token;
 }
 async function execute(query,variables={}){
  const result=await request(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json','X-Shopify-Access-Token':accessToken},body:JSON.stringify({query,variables})},true);
  if(!result?.data||result.errors!==undefined&&(!Array.isArray(result.errors)||result.errors.length))fail('cas_graphql');return result.data;
 }
 function field(value){
  if(!value||!/^gid:\/\/shopify\/Metafield\/[1-9][0-9]*$/.test(value.id||'')||value.namespace!=='app--423276544001'||value.key!=='personalization'||value.type!=='json'||typeof value.value!=='string'||value.value.length>65536||typeof value.compareDigest!=='string'||!/^[a-f0-9]{64}$/.test(value.compareDigest))fail('cas_metafield');
  let pricing;try{pricing=JSON.parse(value.value);}catch{fail('cas_metafield_json');}return {metafield:value,pricing};
 }
 async function inspect(){
  const data=await execute(READ_QUERY),installation=data.currentAppInstallation;
  if(data.shop?.myshopifyDomain!==shopDomain||data.shop.currencyCode!=='EUR'||typeof data.shop.plan?.partnerDevelopment!=='boolean'||installation?.app?.id!==appId||!Array.isArray(installation.accessScopes)||!installation.accessScopes.some(s=>s.handle==='write_products')||data.product?.id!==TARGET.shopifyProductId||!['ACTIVE','DRAFT'].includes(data.product.status))fail('cas_identity');
  return field(data.product.pricing);
 }
 return Object.freeze({async apply(plan,{saveBackup}){
  assertPlan(plan);if(typeof saveBackup!=='function')fail('cas_backup_required');
  try{
   await auth();const before=await inspect();if(!same(before.pricing,plan.pricingBefore))fail('cas_previous_changed');
   const backup={schema:'gravuru-memorial-pricing-backup/v1',productId:TARGET.shopifyProductId,appId,apiVersion,pricingBeforeSha256:plan.pricingBeforeSha256,pricingAfterSha256:plan.pricingAfterSha256,metafield:before.metafield,pricing:before.pricing};
   const saved=await saveBackup(backup);if(!saved||!/^[a-f0-9]{64}$/.test(saved.sha256||''))fail('cas_backup_unverified');
   const input={ownerId:TARGET.shopifyProductId,namespace:'$app',key:'personalization',type:'json',value:JSON.stringify(plan.pricingAfter),compareDigest:before.metafield.compareDigest};
   // Exactly one mutation, with a non-null server-provided compareDigest. No retry.
   const data=await execute(SET_MUTATION,{metafields:[input]}),payload=data.metafieldsSet;
   if(!payload||!Array.isArray(payload.userErrors)||payload.userErrors.length||!Array.isArray(payload.metafields)||payload.metafields.length!==1)fail('cas_mutation_not_confirmed');
   const returned=field(payload.metafields[0]);if(returned.metafield.id!==before.metafield.id||!same(returned.pricing,plan.pricingAfter))fail('cas_mutation_readback');
   const after=await inspect();if(after.metafield.id!==before.metafield.id||!same(after.pricing,plan.pricingAfter)||after.metafield.compareDigest!==returned.metafield.compareDigest)fail('cas_readback');
   return {schema:'gravuru-memorial-pricing-cas/v1',ok:true,productId:TARGET.shopifyProductId,pricingRevision:String(after.pricing.revision),pricingSha256:digest(after.pricing),previousBackupSha256:saved.sha256,metafieldId:after.metafield.id,compareDigest:after.metafield.compareDigest,mutations:1,productionReady:false};
  }finally{accessToken=undefined;}
 }});
}
