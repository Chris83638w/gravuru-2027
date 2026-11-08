// One product, one app-owned field, one compare-and-set. Not app runtime code.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
// Same verified identity as shopify-admin-readonly.mjs; kept closed here so this
// emergency tool bundles without importing the running app or product fixtures.
const I=Object.freeze({appId:'gid://shopify/App/423276544001',shopDomain:'gravuru-design.myshopify.com',apiVersion:'2026-07',clientId:'9640dd7a6907f0c73e7013ea8c24869b'});
import {encodeFunctionPricing} from '../shopify/master-release/pricing-storage.mjs';
import {resolvedPricingHistory} from '../shopify/master-release/pricing-history.mjs';
export const TARGET='gid://shopify/Product/16190784438652';
export const EXPECTED_BEFORE_SHA='76012d418f5c82b8f7c0c8339a0441f3fe41286aa903d287d84f00d169daf1ed';
export const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
const expand=p=>({...p,...(p.history===undefined?{}:{history:resolvedPricingHistory(p)})});
export function planSteelPricingInput(raw,expectedBeforeSha=EXPECTED_BEFORE_SHA){
 if(typeof raw!=='string'||sha(raw)!==expectedBeforeSha)fail('previous_pricing_changed');
 const before=JSON.parse(raw);
 if(before.productId!==TARGET||before.schema!=='gravuru-personalization-pricing/v2'||before.revision!==2||before.enabled!==true||before.currency!=='EUR'||before.extraLogoCents!==1299||Object.keys(before.variants||{}).length!==404||before.variants['58104613339516']!==1748||before.history?.length!==1||before.history[0].revision!==1||before.history[0].schema!=='gravuru-personalization-pricing/v1')fail('previous_pricing_contract');
 const encoded=encodeFunctionPricing(before);
 if(encoded.pricing.history[0].variantsFromRevision!==2||!isDeepStrictEqual(expand(before),expand(encoded.pricing)))fail('semantic_pricing_changed');
 return {before,after:encoded.pricing,value:encoded.value,beforeSha:sha(raw),afterSha:sha(encoded.value),beforeBytes:Buffer.byteLength(raw),afterBytes:encoded.bytes};
}
export const READ=`query SteelPricingRepairRead { shop { myshopifyDomain currencyCode } currentAppInstallation { app { id } accessScopes { handle } } product(id:"${TARGET}") { id status pricing:metafield(namespace:"$app",key:"personalization") { id namespace key type value compareDigest } } }`;
export const SET='mutation SteelPricingRepairSet($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{id namespace key type value compareDigest} userErrors{field code}}}';
export function createSteelPricingRepair({readSecret},{fetchImpl=globalThis.fetch,fixtureSha}={}){
 // Test fixture hashes are accepted only with an explicitly injected transport.
 // The executable entry point has no hash override and uses the observed SHA.
 if(fixtureSha!==undefined&&fetchImpl===globalThis.fetch)fail('repair_test_transport_required');
 const expectedBeforeSha=fixtureSha??EXPECTED_BEFORE_SHA;
 if(I.appId!=='gid://shopify/App/423276544001'||I.shopDomain!=='gravuru-design.myshopify.com'||I.apiVersion!=='2026-07'||typeof readSecret!=='function')fail('repair_identity');
 let token;
 async function request(url,init,version=false){
  let reader;
  try{
   const r=await fetchImpl(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!r.ok||r.redirected||version&&r.headers.get('x-shopify-api-version')!==I.apiVersion||!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')||''))fail('repair_transport');
   reader=r.body.getReader();const chunks=[];let size=0;
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576)fail('repair_response_size');chunks.push(Buffer.from(value));}
   return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch(e){if(e.code?.startsWith('repair_'))throw e;fail('repair_response');}finally{try{await reader?.cancel();}catch{}}
 }
 async function auth(){
  const secret=await readSecret();if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{16,256}$/.test(secret))fail('repair_secret');
  const t=await request(`https://${I.shopDomain}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:I.clientId,client_secret:secret}).toString()});
  if(typeof t.access_token!=='string'||!/^[\x21-\x7e]{16,4096}$/.test(t.access_token)||!Number.isInteger(t.expires_in)||t.expires_in<120||t.expires_in>86400||typeof t.scope!=='string'||!t.scope.split(',').map(x=>x.trim()).includes('write_products'))fail('repair_token');token=t.access_token;
 }
 async function query(query,variables={}){
  const r=await request(`https://${I.shopDomain}/admin/api/${I.apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})},true);
  if(!r.data||r.errors?.length)fail('repair_graphql');return r.data;
 }
 function field(m){
  if(!m||!/^gid:\/\/shopify\/Metafield\/[1-9][0-9]*$/.test(m.id||'')||m.namespace!=='app--423276544001'||m.key!=='personalization'||m.type!=='json'||typeof m.value!=='string'||Buffer.byteLength(m.value)>100000||!/^[a-f0-9]{64}$/.test(m.compareDigest||''))fail('repair_metafield');return m;
 }
 async function inspect(){
  const d=await query(READ);
  if(d.shop?.myshopifyDomain!==I.shopDomain||d.shop.currencyCode!=='EUR'||d.currentAppInstallation?.app?.id!==I.appId||!d.currentAppInstallation.accessScopes?.some(s=>s.handle==='write_products')||d.product?.id!==TARGET||!['ACTIVE','DRAFT'].includes(d.product.status))fail('repair_read_identity');
  return field(d.product.pricing);
 }
 async function commit(before,value){
  const payload=(await query(SET,{metafields:[{ownerId:TARGET,namespace:'$app',key:'personalization',type:'json',value,compareDigest:before.compareDigest}]})).metafieldsSet;
  if(!payload||!Array.isArray(payload.userErrors)||payload.userErrors.length||payload.metafields?.length!==1)fail('repair_write_unconfirmed');
  const returned=field(payload.metafields[0]),after=await inspect();
  if(after.id!==before.id||returned.id!==before.id||after.compareDigest!==returned.compareDigest||after.value!==value||returned.value!==value)fail('repair_write_readback');
  return after;
 }
 return Object.freeze({
  async preview(){try{await auth();const before=await inspect(),p=planSteelPricingInput(before.value,expectedBeforeSha);return {productId:TARGET,beforeBytes:p.beforeBytes,afterBytes:p.afterBytes,beforeSha:p.beforeSha,afterSha:p.afterSha,currentRevision:2,historicalRevision:1,all404VariantsPreserved:true,mutations:0};}finally{token=undefined;}},
  async apply({saveBackup,confirmedFunctionRelease}){
   if(typeof saveBackup!=='function'||typeof confirmedFunctionRelease!=='string'||!/^gravuru-[a-z0-9-]{1,100}$/.test(confirmedFunctionRelease))fail('repair_backup_and_release_required');
   try{
    await auth();const before=await inspect(),p=planSteelPricingInput(before.value,expectedBeforeSha);
    const backup={schema:'gravuru-steel-pricing-input-backup/v1',productId:TARGET,appId:I.appId,apiVersion:I.apiVersion,createdAt:new Date().toISOString(),confirmedFunctionRelease,metafield:before,beforeSha:p.beforeSha,afterSha:p.afterSha};
    const saved=await saveBackup(backup);if(!saved||!/^[a-f0-9]{64}$/.test(saved.sha256||''))fail('repair_backup_unverified');
    const after=await commit(before,p.value);
    return {schema:'gravuru-steel-pricing-input-repair/v1',ok:true,productId:TARGET,beforeSha:p.beforeSha,afterSha:sha(after.value),beforeBytes:p.beforeBytes,afterBytes:Buffer.byteLength(after.value),backupSha:saved.sha256,mutations:1};
   }finally{token=undefined;}
  },
  async restore({backup,saveBackup}){
   if(backup?.schema!=='gravuru-steel-pricing-input-backup/v1'||backup.productId!==TARGET||backup.appId!==I.appId||backup.apiVersion!==I.apiVersion||typeof saveBackup!=='function')fail('repair_restore_contract');
   const p=planSteelPricingInput(field(backup.metafield).value,expectedBeforeSha);
   if(backup.beforeSha!==p.beforeSha||backup.afterSha!==p.afterSha)fail('repair_restore_hash');
   try{
    await auth();const before=await inspect();if(sha(before.value)!==p.afterSha)fail('repair_restore_current_changed');
    const saved=await saveBackup({schema:'gravuru-steel-pricing-input-rollback-backup/v1',productId:TARGET,metafield:before});if(!saved||!/^[a-f0-9]{64}$/.test(saved.sha256||''))fail('repair_backup_unverified');
    const after=await commit(before,backup.metafield.value);
    return {ok:true,restoredSha:sha(after.value),mutations:1,warning:'Original oversized field restored; personalized checkout remains blocked with repaired Function.'};
   }finally{token=undefined;}
  }
 });
}
