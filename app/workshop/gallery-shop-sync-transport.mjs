import {createHash} from 'node:crypto';
import {syncFail,syncHash} from './gallery-shop-sync-native.mjs';

const clone=v=>structuredClone(v);
const VARIANT_FIELDS='id price compareAtPrice sku selectedOptions{name value} inventoryItem{id tracked}';
const RELEASE_QUERY=`query GallerySyncProduct($id:ID!){shop{myshopifyDomain currencyCode}product(id:$id){id updatedAt title handle status descriptionHtml seo{title description} options{name values} variants(first:250){nodes{${VARIANT_FIELDS}}pageInfo{hasNextPage endCursor}}media(first:100){nodes{id status ... on MediaImage{image{url}}}pageInfo{hasNextPage}}metafield(namespace:"gravuru",key:"gallery_release"){value compareDigest}pricing:metafield(namespace:"$app",key:"personalization"){jsonValue}}}`;
const VARIANTS_QUERY=`query GallerySyncVariants($id:ID!,$after:String!){shop{myshopifyDomain currencyCode}product(id:$id){id updatedAt variants(first:250,after:$after){nodes{${VARIANT_FIELDS}}pageInfo{hasNextPage endCursor}}}}`;
const RELEASE_MUTATION=`mutation GallerySyncRelease($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{value compareDigest}userErrors{field message code}}}`;
export const GALLERY_SYNC_OPERATIONS=Object.freeze({product:RELEASE_QUERY,variants:VARIANTS_QUERY,release:RELEASE_MUTATION});
export function remoteCommerceHash(snapshot){return syncHash({id:snapshot.id,shopDomain:snapshot.shopDomain,commerce:snapshot.commerce,variants:snapshot.variants});}
export function remoteReleaseMatches(snapshot,desired){return snapshot.release?.value===desired.release&&desired.images.every(image=>snapshot.media.some(m=>m.id===image.id&&m.sha256===image.sha256));}
export function remoteBaselineMatches(snapshot,baseline){return remoteCommerceHash(snapshot)===remoteCommerceHash(baseline)&&syncHash(snapshot.release)===syncHash(baseline.release)&&syncHash(snapshot.media)===syncHash(baseline.media);}

/** Narrow Admin GraphQL adapter. graphql is an existing authenticated server
 * transport; no credentials or URLs arrive from the browser. Writes default off.
 * Optional mediaAdapter must implement inspect(product) / apply({images,...})
 * and prove exact current image hashes, exclusive ownership and completion.
 * It must not treat Shopify's transient READY status as content verification.
 */
export function createGallerySyncShopifyTransport({shopDomain,graphql,writesEnabled=false,mediaAdapter,clock=Date.now}={}){
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)||typeof graphql!=='function')syncFail('gallery_sync_transport','Ein authentifizierter Shopify-Transport fehlt.',422);
 async function call(query,variables,guard){const response=await graphql(query,variables,guard);if(response?.errors?.length)syncFail('gallery_sync_graphql','Shopify konnte den gezielten Abgleich nicht bestätigen.',502);return response.data??response;}
 async function inspect(mapping){
  const data=await call(RELEASE_QUERY,{id:mapping.shopifyProductId}),product=data.product;
  if(data.shop?.myshopifyDomain!==shopDomain||data.shop.currencyCode!=='EUR'||!product||product.id!==mapping.shopifyProductId)syncFail('gallery_sync_remote_identity','Shop, Währung oder Produkt passen nicht zur festen Zuordnung.');
  if(!Array.isArray(product.variants?.nodes)||typeof product.variants.pageInfo?.hasNextPage!=='boolean'||product.media?.pageInfo?.hasNextPage!==false)syncFail('gallery_sync_remote_incomplete','Der Shopify-Beleg ist unvollständig; vollständige Medienzuordnung ist erforderlich.',422);
  const nodes=[...product.variants.nodes],seenIds=new Set(nodes.map(v=>v.id)),cursors=new Set();let page=product.variants;
  if(seenIds.size!==nodes.length)syncFail('gallery_sync_remote_incomplete','Shopify liefert doppelte Varianten.',422);
  while(page.pageInfo.hasNextPage){
   const after=page.pageInfo.endCursor;
   if(typeof after!=='string'||!after||cursors.has(after)||cursors.size>=40)syncFail('gallery_sync_remote_incomplete','Die vollständige Variantenliste kann nicht eindeutig gelesen werden.',422);
   cursors.add(after);const next=await call(VARIANTS_QUERY,{id:mapping.shopifyProductId,after}),p=next.product;
   if(next.shop?.myshopifyDomain!==shopDomain||next.shop?.currencyCode!=='EUR'||p?.id!==product.id||!product.updatedAt||p.updatedAt!==product.updatedAt)syncFail('gallery_sync_remote_changed','Das Produkt wurde während des vollständigen Variantenlesens geändert. Bitte neu prüfen.');
   page=p.variants;
   if(!Array.isArray(page?.nodes)||!page.nodes.length||typeof page.pageInfo?.hasNextPage!=='boolean'||new Set(page.nodes.map(v=>v.id)).size!==page.nodes.length||page.nodes.some(v=>seenIds.has(v.id)))syncFail('gallery_sync_remote_incomplete','Die Variantenpagination enthält fehlende oder doppelte Einträge.',422);
   for(const v of page.nodes){seenIds.add(v.id);nodes.push(v);}
  }
  const cents=value=>{if(!/^\d+\.\d{2}$/.test(value))syncFail('gallery_sync_remote_price','Shopify liefert einen unklaren Preis.');return Number(value.replace('.',''));};
  const variants=nodes.map(v=>({id:v.id,priceCents:cents(v.price)}));
  const media=mediaAdapter?await mediaAdapter.inspect(product):product.media.nodes.map(m=>({id:m.id,status:m.status,url:m.image?.url??null}));
  return {shopDomain,id:product.id,readAt:new Date(clock()).toISOString(),variants,media,
   release:product.metafield?{value:product.metafield.value,compareDigest:product.metafield.compareDigest}:{value:null,compareDigest:null},
   commerce:{title:product.title,handle:product.handle,status:product.status,descriptionHtml:product.descriptionHtml,seo:product.seo,options:product.options,variants:nodes,personalizationPricing:product.pricing?.jsonValue??null}};
 }
 async function apply({mapping,baseline,desired,beforeWrite}){
  if(!writesEnabled)syncFail('gallery_sync_live_disabled','Shopify-Schreibzugriffe sind für diesen Anschluss deaktiviert.',403);
  if(desired.images.length&&!mediaAdapter)syncFail('gallery_sync_media_disabled','Der gezielte Produktbild-Anschluss ist noch nicht freigegeben.',422);
  const fresh=await inspect(mapping);if(!remoteBaselineMatches(fresh,baseline))syncFail('gallery_sync_remote_changed','Das Shopprodukt wurde seit der Vorschau geändert.');
  if(desired.images.length)await mediaAdapter.apply({mapping,baseline:fresh,images:clone(desired.images)});
  beforeWrite?.();
  const data=await call(RELEASE_MUTATION,{metafields:[{ownerId:mapping.shopifyProductId,namespace:'gravuru',key:'gallery_release',type:'json',value:desired.release,compareDigest:baseline.release.compareDigest}]},beforeWrite);
  if(data.metafieldsSet?.userErrors?.length)syncFail('gallery_sync_remote_cas','Shopify hat die Freigabe wegen eines Konflikts nicht übernommen.');
  return inspect(mapping);
 }
 return Object.freeze({mode:'shopify',shopDomain,canWrite:writesEnabled,canUpdateImages:!!mediaAdapter,canWriteImages:mediaAdapter?.canWrite===true,inspect,apply});
}

/** Isolated in-memory shop for the private acceptance environment. No network. */
export function createGallerySyncTestTransport({shopDomain,products,clock=Date.now,beforeWrite,afterWrite}={}){
 const records=new Map(products.map(p=>[p.id,clone({...p,shopDomain,release:p.release||{value:null,compareDigest:null},media:p.media||[]})]));
 const writes=[];
 const inspect=async mapping=>{const p=records.get(mapping.shopifyProductId);if(!p)syncFail('gallery_sync_test_product','Produkt im isolierten Testsystem fehlt.',404);return {...clone(p),readAt:new Date(clock()).toISOString()};};
 async function apply({mapping,baseline,desired,beforeWrite:guard}){
  const current=await inspect(mapping);if(!remoteBaselineMatches(current,baseline))syncFail('gallery_sync_remote_changed','Das Testprodukt wurde parallel geändert.');
  if(beforeWrite)await beforeWrite({mapping,desired});
  guard?.();
  const p=records.get(mapping.shopifyProductId);p.release={value:desired.release,compareDigest:createHash('sha256').update(desired.release).digest('hex')};
  for(const image of desired.images){const old=p.media.find(m=>m.id===image.id);if(!old)syncFail('gallery_sync_media_missing','Das zugeordnete Testbild fehlt.');Object.assign(old,{sha256:image.sha256,url:image.url});}
  writes.push({productId:p.id,release:desired.release,images:clone(desired.images)});
  if(afterWrite)await afterWrite({mapping,desired});
  return inspect(mapping);
 }
 return Object.freeze({mode:'test',shopDomain,canWrite:true,canUpdateImages:true,canWriteImages:true,inspect,apply,writes,
  changeForTest(id,change){const p=records.get(id);if(!p)throw Error('Unknown test product');change(p);}});
}
