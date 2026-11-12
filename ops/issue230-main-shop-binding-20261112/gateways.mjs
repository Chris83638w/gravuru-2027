// Operator-only gateways over explicitly supplied authenticated/native instances.
// No credential lookup, network fetch, DB constructor or host start in this file.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {POLICY,digest} from './main-operator.mjs';
const need=(v,code)=>{if(!v)throw Object.assign(Error(code),{code});};
const VARIANTS='id sku price compareAtPrice selectedOptions{name value} inventoryItem{id tracked}';
export const READ_MAIN=`query Issue230MainRead($id:ID!){shop{myshopifyDomain currencyCode}product(id:$id){id updatedAt status title handle descriptionHtml vendor productType tags templateSuffix seo{title description} featuredMedia{id} media(first:100){nodes{id}pageInfo{hasNextPage}} customization:metafield(namespace:"custom",key:"customization_id"){value} cut:metafield(namespace:"custom",key:"gravuru_product_cut"){value} personalization:metafield(namespace:"$app",key:"personalization"){value} options{id name position} variants(first:250){nodes{${VARIANTS}}pageInfo{hasNextPage endCursor}}}}`;
export const READ_VARIANTS=`query Issue230MainReadMore($id:ID!,$after:String!){shop{myshopifyDomain currencyCode}product(id:$id){id updatedAt variants(first:250,after:$after){nodes{${VARIANTS}}pageInfo{hasNextPage endCursor}}}}`;
export const UPDATE_VARIANTS=`mutation Issue230MainVariants($productId:ID!,$variants:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$productId,variants:$variants,allowPartialUpdates:false){product{id}productVariants{id price selectedOptions{name value}}userErrors{field code message}}}`;
export const READ_PRICING=`query Issue230MainPricing {shop{myshopifyDomain currencyCode}currentAppInstallation{app{id}accessScopes{handle}}product(id:"${POLICY.shopifyProductId}"){id status pricing:metafield(namespace:"$app",key:"personalization"){id namespace key type value compareDigest}}}`;
export const SET_PRICING='mutation Issue230MainPricingCAS($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{id namespace key type value compareDigest}userErrors{field code}}}';
function data(response){need(response&&(!response.errors||Array.isArray(response.errors)&&response.errors.length===0),'graphql_error');return response.data??response;}
const cents=v=>{need(typeof v==='string'&&/^\d+\.\d{1,2}$/.test(v),'shop_price_format');const [a,b]=v.split('.');return Number(a)*100+Number(b.padEnd(2,'0'));};
export function createMainShopifyGateway({graphqlRead,graphqlWriteOnce,mutationRetries,clock=Date.now}){
 need(typeof graphqlRead==='function','authenticated_read_transport_required');
 function identity(v){need(v.shop?.myshopifyDomain===POLICY.shopDomain&&v.shop.currencyCode==='EUR'&&v.product?.id===POLICY.shopifyProductId,'graphql_shop_identity');return v.product;}
 async function inspect(){
  const p=identity(data(await graphqlRead(READ_MAIN,{id:POLICY.shopifyProductId}))),rows=[],seen=new Set(),cursors=new Set();
  need(p.media?.pageInfo?.hasNextPage===false&&Array.isArray(p.media.nodes)&&typeof p.updatedAt==='string'&&Array.isArray(p.options),'graphql_incomplete_product');
  let page=p.variants;
  for(;;){
   need(Array.isArray(page?.nodes)&&typeof page.pageInfo?.hasNextPage==='boolean','graphql_incomplete_variants');
   for(const row of page.nodes){need(!seen.has(row.id),'graphql_duplicate_variant');seen.add(row.id);rows.push(row);}
   need(rows.length<=808,'graphql_extra_variants');if(!page.pageInfo.hasNextPage)break;
   const cursor=page.pageInfo.endCursor;need(typeof cursor==='string'&&cursor&&!cursors.has(cursor)&&cursors.size<4,'graphql_cursor');cursors.add(cursor);
   const next=identity(data(await graphqlRead(READ_VARIANTS,{id:p.id,after:cursor})));need(next.updatedAt===p.updatedAt,'shop_changed_during_pagination');page=next.variants;
  }
  need(rows.length===808,'graphql_808_required');
  return {shopDomain:POLICY.shopDomain,currency:'EUR',productId:p.id,status:p.status,complete:true,readAt:new Date(clock()).toISOString(),updatedAt:p.updatedAt,
   protectedProduct:{title:p.title,handle:p.handle,descriptionHtml:p.descriptionHtml,vendor:p.vendor,productType:p.productType,tags:p.tags,templateSuffix:p.templateSuffix,seo:p.seo,featuredMedia:p.featuredMedia,media:p.media.nodes,customization:p.customization,cut:p.cut,personalization:p.personalization},
   optionDefinitions:p.options,variants:rows.map(v=>({id:v.id,priceCents:cents(v.price),selectedOptions:v.selectedOptions,protectedVariant:{sku:v.sku,compareAtPrice:v.compareAtPrice,inventoryItem:v.inventoryItem}}))};
 }
 async function updateVariants(input){
  need(typeof graphqlWriteOnce==='function'&&mutationRetries===0,'single_attempt_write_transport_required');
  need(input.productId===POLICY.shopifyProductId&&input.allowPartialUpdates===false&&Array.isArray(input.variants)&&input.variants.length===182,'mutation_scope');
  need(new Set(input.variants.map(v=>v.id)).size===182&&input.variants.every(v=>Object.keys(v).every(k=>['id','price','optionValues'].includes(k))&&/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/.test(v.id)),'mutation_fields');
  await readPricing(); // Owning authenticated app must be proven before ANY write.
  const result=data(await graphqlWriteOnce(UPDATE_VARIANTS,{productId:input.productId,variants:input.variants})).productVariantsBulkUpdate;
  need(result?.product?.id===POLICY.shopifyProductId&&Array.isArray(result.userErrors)&&result.userErrors.length===0&&Array.isArray(result.productVariants)&&result.productVariants.length===182,'mutation_unconfirmed');
  need(new Set(result.productVariants.map(v=>v.id)).size===182&&result.productVariants.every(v=>input.variants.some(x=>x.id===v.id)),'mutation_result_scope');
  return {updatedIds:result.productVariants.map(v=>v.id)};
 }
 async function readPricing(){const d=data(await graphqlRead(READ_PRICING,{}));need(d.shop?.myshopifyDomain===POLICY.shopDomain&&d.shop.currencyCode==='EUR'&&d.currentAppInstallation?.app?.id==='gid://shopify/App/423276544001'&&d.currentAppInstallation.accessScopes?.some(s=>s.handle==='write_products')&&d.product?.id===POLICY.shopifyProductId&&d.product.status==='DRAFT'&&Object.hasOwn(d.product,'pricing'),'pricing_owner_identity');return d.product.pricing;}
 async function writePricingOnce({before,value}){need(typeof graphqlWriteOnce==='function'&&mutationRetries===0,'single_attempt_write_transport_required');need(typeof value==='string'&&Buffer.byteLength(value,'utf8')<=10000,'pricing_function_input_size');need(digest(await readPricing())===digest(before),'pricing_cas_preimage_changed');const p=data(await graphqlWriteOnce(SET_PRICING,{metafields:[{ownerId:POLICY.shopifyProductId,namespace:'$app',key:'personalization',type:'json',value,compareDigest:before?.compareDigest??null}]})).metafieldsSet;need(p&&Array.isArray(p.userErrors)&&p.userErrors.length===0&&p.metafields?.length===1&&p.metafields[0].value===value,'pricing_write_unconfirmed');return p.metafields[0];}
 return Object.freeze({inspect,updateVariants,readPricing,writePricingOnce});
}

const registryConnections=new WeakMap();
export function createMainReadOnlyGateway({workshop,registry}){
 need(workshop?.tenantId===POLICY.tenantId&&workshop.repository?.tenantId===POLICY.tenantId&&registry?.tenantId===POLICY.tenantId&&registry.storeId===POLICY.storeId&&registry.shopDomain===POLICY.shopDomain&&typeof registry.resolveMany==='function'&&typeof workshop.orderIntake?.catalogLiveApprovals==='function','native_readonly_scope');
 return Object.freeze({inspect(){const r=workshop.repository.get(POLICY.productId);return {tenantId:POLICY.tenantId,storeId:POLICY.storeId,productId:r.id,revision:r.revision,status:r.status,documentSha256:digest(r.document),metadataSha256:digest(r.metadata)};},resolveMany:pairs=>registry.resolveMany(pairs),catalogApprovals:(revision,variantIds)=>workshop.orderIntake.catalogLiveApprovals(variantIds.map(shopifyVariantId=>({shopDomain:POLICY.shopDomain,shopifyProductId:POLICY.shopifyProductId,shopifyVariantId,productId:POLICY.productId,productRevision:revision})))});
}
export function createMainBindingConnection({workshop,adapter,pricing}){
 need(workshop?.tenantId===POLICY.tenantId&&workshop.orderIntake?.tenantId===POLICY.tenantId&&typeof workshop.orderIntake.idBindings==='function'&&typeof pricing?.provider==='function'&&adapter?.tenantId===POLICY.tenantId&&adapter.storeId===POLICY.storeId&&adapter.shopDomain===POLICY.shopDomain,'native_priced_registry_required');
 const registry=workshop.orderIntake.idBindings({storeId:POLICY.storeId,shopDomain:POLICY.shopDomain,adapter,personalizationPricingFor:pricing.provider});registryConnections.set(registry,{adapter,pricing});return registry;
}
export async function createMainNativeGateway({codeRoot,workshop,registry,reader,adapter,pricing}){
 need(workshop?.tenantId===POLICY.tenantId&&workshop.repository?.tenantId===POLICY.tenantId&&registry?.tenantId===POLICY.tenantId&&registry.storeId===POLICY.storeId&&registry.shopDomain===POLICY.shopDomain,'native_gateway_scope');
 need(typeof registry.resolveMany==='function'&&typeof registry.persist==='function'&&typeof workshop.orderIntake?.catalogLiveApprovals==='function'&&typeof workshop.orderIntake?.approveCatalogLiveProducts==='function','existing_registry_required');
 need(adapter?.tenantId===POLICY.tenantId&&adapter.storeId===POLICY.storeId&&adapter.shopDomain===POLICY.shopDomain&&typeof adapter.withBindingReadSnapshot==='function','existing_registry_adapter_required');
 need(registryConnections.get(registry)?.adapter===adapter&&registryConnections.get(registry)?.pricing===pricing,'native_priced_registry_required');
 const load=file=>import(pathToFileURL(path.resolve(codeRoot,'app/workshop',file)).href);
 // The host supplies the EXACT adapter already registered by this registry.
 // A second adapter would miss its WeakMap-bound transaction/read-stamp scope.
 const {createShopProductBindingCheck}=await load('shop-product-binding-check.mjs');
 const checker=createShopProductBindingCheck({adapter,reader,maxEvidenceAgeMs:60000});
 return Object.freeze({
  inspect(){const r=workshop.repository.get(POLICY.productId);return {tenantId:POLICY.tenantId,storeId:POLICY.storeId,productId:r.id,revision:r.revision,status:r.status,documentSha256:digest(r.document),metadataSha256:digest(r.metadata)};},
  resolveMany:pairs=>registry.resolveMany(pairs),check:input=>checker.check(input),persist:input=>registry.persist(input),
  catalogApprovals:(revision,variantIds)=>workshop.orderIntake.catalogLiveApprovals(variantIds.map(shopifyVariantId=>({shopDomain:POLICY.shopDomain,shopifyProductId:POLICY.shopifyProductId,shopifyVariantId,productId:POLICY.productId,productRevision:revision}))),
  approveCatalog:({approvalId})=>workshop.orderIntake.approveCatalogLiveProducts({shopDomain:POLICY.shopDomain,products:[{shopifyProductId:POLICY.shopifyProductId,productId:POLICY.productId,productRevision:2}],approvalId,registry})
 });
}
