import {prepareShopProduct} from '../../app/workshop/shop-preparation.mjs';
import {prepareThemeCart} from '../../app/workshop/theme-cart.mjs';

export const cartShopDomain='gravuru-beta267.myshopify.com';
const variantKey=o=>JSON.stringify([o.format??o.formatKey,o.color,o.frame,o.mounting]);
const failure=(status,message)=>Object.assign(Error(message),{status});

export function createRingTransfer({workshop,record,entry,variants}){
  const catalogue=new Map(variants.map(v=>[variantKey(v),v]));
  const plan=prepareShopProduct(record);
  const mappings=plan.variants.flatMap(v=>{
    const match=catalogue.get(variantKey(v.options));
    if(!match?.existingVariantId)return [];
    if(match.priceCents!==v.priceCents)throw Error('Ring-Preis stimmt nicht mit dem Katalog überein.');
    return [{key:v.key,variantId:String(match.existingVariantId)}];
  });
  const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:entry.shopifyProductId,revision:record.revision,currency:'EUR',
    variants:Object.fromEntries(variants.filter(v=>v.existingVariantId).map(v=>[v.existingVariantId,v.priceCents])),
    extraMotifCents:record.document.config.extraMotifCents??0,extraPhotoCents:record.document.config.photo?.extraPriceCents??0};
  const bound=workshop.orderIntake.bindVariants({record,shopDomain:cartShopDomain,mappings,personalizationPricing:pricing});
  const bindings=new Map(bound.bindings.map(b=>[String(b.variantId),{storeId:'ring',tenantId:workshop.tenantId,shopDomain:cartShopDomain,
    shopifyProductId:entry.shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+b.variantId,
    bindingId:b.id,productId:b.productId,productRevision:b.productRevision,options:b.options,unitCents:b.unitCents,assignmentRevision:1}]));
  const registry={resolve({shopifyProductId,shopifyVariantId}){
    if(shopifyProductId!==entry.shopifyProductId)throw failure(404,'Prüfprodukt fehlt.');
    const binding=bindings.get(shopifyVariantId.split('/').pop());if(!binding)throw failure(404,'Prüfvariante fehlt.');return binding;
  }};
  // The loopback transport represents a single synthetic shop. All offer,
  // price, draft-grant and revision checks still run against the local workshop.
  const cartWorkshop={customerDrafts:workshop.customerDrafts,repository:workshop.repository,
    tenantId:workshop.tenantId,sessionContext:{shopDomain:cartShopDomain}};
  return ({draft,manifest,quantity,token,nonce})=>{
    const variant=catalogue.get(variantKey(manifest.selection.options));
    if(!variant?.existingVariantId||draft.productId!==record.id)throw failure(422,'Diese Ring-Ausführung ist nicht an die Prüfvariante gebunden.');
    const binding=bindings.get(String(variant.existingVariantId));
    const transfer=prepareThemeCart({workshop:cartWorkshop,registry,shopDomain:cartShopDomain,proxyPath:'/apps/konfigurator'},
      binding,{draftId:draft.id,expectedRevision:draft.revision,quantity},{draftToken:token});
    transfer.claim(nonce);
    return {...transfer.payload.configuration,variant:transfer.payload.variantId,sku:variant.existingSku};
  };
}
