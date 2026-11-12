// Fixed operator-only GraphQL steps over an EXISTING authenticated client.
// No token reading, retries, product publication, variants update or media calls.
import {isDeepStrictEqual as equal} from 'node:util';
import {SHOP,digest} from './six-drafts.mjs';
const fail=(code)=>{throw Object.assign(Error('Sechs-DRAFT-Shop-Schritt nicht bestätigt: '+code),{code:'six_drafts_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const IDENTITY='shop { myshopifyDomain currencyCode } currentAppInstallation { app { id } accessScopes { handle } }';
export const READ_PRODUCT=`query Issue230SixDraftRead($id:ID!){${IDENTITY} product(id:$id){id handle title status publishedAt templateSuffix tags seo{title description} variants(first:100){nodes{id price selectedOptions{name value}}pageInfo{hasNextPage}} pricing:metafield(namespace:"$app",key:"personalization"){jsonValue value compareDigest} customizationId:metafield(namespace:"custom",key:"customization_id"){value compareDigest}}}`;
export const SET_META='mutation Issue230SixDraftMetafields($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{namespace key value compareDigest}userErrors{field code message}}}';
export const SET_TEMPLATE='mutation Issue230SixDraftTemplate($product:ProductUpdateInput!){productUpdate(product:$product){product{id status templateSuffix}userErrors{field code message}}}';
const APP='gid://shopify/App/423276544001';

export function createSixDraftShopSteps({client,readonlyReader,native}={}){
 need(typeof client?.graphql==='function'&&typeof readonlyReader?.inspectVariants==='function'&&typeof native?.verifyShopDraftProduct==='function','configuration');
 async function call(query,variables){const r=await client.graphql(query,variables);need(r?.data&&(!r.errors||Array.isArray(r.errors)&&!r.errors.length),'graphql');return r.data;}
 async function readProduct(id){
  need(/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/.test(id),'product_id');
  const d=await call(READ_PRODUCT,{id});need(d.shop?.myshopifyDomain===SHOP&&d.shop.currencyCode==='EUR'&&d.currentAppInstallation?.app?.id===APP&&d.currentAppInstallation.accessScopes?.some(s=>s.handle==='write_products'),'installation');
  need(d.product?.id===id,'product_missing');return d.product;
 }
 function validate(product,request){native.verifyShopDraftProduct(product,request);need(product.publishedAt===null,'published');}
 const checkpoint=(fn,value)=>{const r=fn(value);need(!r?.then,'async_checkpoint');};
 async function write(query,variables,check,save,phase,productId){
  check();checkpoint(save,{phase:phase+'-intent',shopifyProductId:productId,payloadSha256:digest(variables)});
  try{
   const d=await call(query,variables),payload=query===SET_META?d.metafieldsSet:d.productUpdate;
   need(Array.isArray(payload?.userErrors)&&payload.userErrors.length===0,'write_unconfirmed');
   checkpoint(save,{phase:phase+'-response',shopifyProductId:productId});
  }catch(error){checkpoint(save,{phase:phase+'-unknown',shopifyProductId:productId});fail('unknown_reconcile_only');}
 }
 async function ensurePricing({productId,pricing,request,check,checkpoint:save}){
  let p=await readProduct(productId);validate(p,request);check();
  if(p.pricing!==null){need(equal(p.pricing?.jsonValue,pricing),'pricing_conflict');return;}
  await write(SET_META,{metafields:[{ownerId:productId,namespace:'$app',key:'personalization',type:'json',value:JSON.stringify(pricing),compareDigest:null}]},check,save,'pricing',productId);
  p=await readProduct(productId);validate(p,request);need(equal(p.pricing?.jsonValue,pricing),'pricing_readback');check();
 }
 async function ensureEntry({productId,entry,pricing,request,check,checkpoint:save}){
  let p=await readProduct(productId);validate(p,request);need(equal(p.pricing?.jsonValue,pricing),'pricing_changed');check();
  need(entry.templateSuffix==='konfi'&&/^cfg_[a-f0-9-]{36}$/.test(entry.customizationId),'entry');
  if(p.templateSuffix!=='konfi'){
   need(p.templateSuffix===null||p.templateSuffix==='','template_conflict');
   await write(SET_TEMPLATE,{product:{id:productId,templateSuffix:'konfi'}},check,save,'template',productId);
   p=await readProduct(productId);validate(p,request);need(p.templateSuffix==='konfi'&&equal(p.pricing?.jsonValue,pricing),'template_readback');check();
  }
  if(p.customizationId!==null)need(p.customizationId?.value===entry.customizationId,'customization_conflict');
  else{
   await write(SET_META,{metafields:[{ownerId:productId,namespace:'custom',key:'customization_id',type:'single_line_text_field',value:entry.customizationId,compareDigest:null}]},check,save,'entry',productId);
   p=await readProduct(productId);validate(p,request);need(p.customizationId?.value===entry.customizationId&&p.templateSuffix==='konfi'&&equal(p.pricing?.jsonValue,pricing),'entry_readback');check();
  }
 }
 return {readProduct,ensurePricing,ensureEntry,inspectVariants:ids=>readonlyReader.inspectVariants(ids)};
}
