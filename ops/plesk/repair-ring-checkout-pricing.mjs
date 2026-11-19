import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {merchantConfig} from './merchant-config.mjs';
import {createShopifyClient} from '../../scripts/shop-export.mjs';
import {ADMIN_READONLY_IDENTITY as identity} from '../../app/workshop/shopify-admin-readonly.mjs';
import {capturePersonalization} from '../../app/workshop/cart-personalization.mjs';
import {prepareShopProduct} from '../../app/workshop/shop-preparation.mjs';
import {cartTransformRun} from '../shopify/einzelsperre-release/preis/src/master-release/cart_transform_run.mjs';
import {cartValidationsGenerateRun} from '../shopify/einzelsperre-release/pruefung/src/cart_validation_run.mjs';

const productId='gid://shopify/Product/16126387257724';
const cfgId='cfg_d9fb1702-b41e-49f0-9eda-117be91f436a';
const digest=value=>createHash('sha256').update(value).digest('hex');
const optionKey=o=>JSON.stringify(Object.entries(o).sort());
const inspection=`query RingRead($id:ID!){
 shop{myshopifyDomain currencyCode} currentAppInstallation{app{id} accessScopes{handle}}
 product(id:$id){id status variants(first:120){nodes{id price} pageInfo{hasNextPage}}
 pricing:metafield(namespace:"$app",key:"personalization"){id namespace key type value compareDigest}}
}`;
const setField=`mutation RingSet($values:[MetafieldsSetInput!]!){metafieldsSet(metafields:$values){metafields{id compareDigest} userErrors{code message}}}`;
const deleteField=`mutation RingRestore($fields:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$fields){deletedMetafields{ownerId key namespace} userErrors{message}}}`;
const [action,dbFile,receiptDir]=process.argv.slice(2);
assert(['plan','apply','readback','rollback'].includes(action)&&path.isAbsolute(dbFile)&&path.isAbsolute(receiptDir));
process.umask(0o077);
const cfg=merchantConfig(process.env);
assert.equal(cfg.host,'app-2027.gravuru-designwerkstatt.de');
const api=createShopifyClient({shopDomain:identity.shopDomain,clientId:identity.clientId,apiVersion:identity.apiVersion,
 credentials:{kind:'client_credentials',secret:cfg.runtimeEnv.GRAVURU_SHOPIFY_CLIENT_SECRET},maxRetries:0});
async function inspect(){
 const {data}=await api.graphql(inspection,{id:productId});
 assert.equal(data.shop.myshopifyDomain,'gravuru-design.myshopify.com');
 assert.equal(data.shop.currencyCode,'EUR');
 assert.equal(data.currentAppInstallation.app.id,identity.appId);
 assert(data.currentAppInstallation.accessScopes.some(s=>s.handle==='write_products'));
 const product=data.product;
 assert.equal(product.id,productId);
 assert.equal(product.status,'ACTIVE');
 assert.equal(product.variants.pageInfo.hasNextPage,false);
 assert.equal(product.variants.nodes.length,120);
 if(product.pricing){
  const f=product.pricing;
  assert(f.namespace==='app--423276544001'&&f.key==='personalization'&&f.type==='json'&&/^[a-f0-9]{64}$/.test(f.compareDigest));
 }
 return product;
}
function pricePlan(product){
 const db=new DatabaseSync(dbFile,{readOnly:true});
 try{
  const record=db.prepare("SELECT r.document,r.status FROM products p JOIN product_revisions r ON p.id=r.product_id AND r.tenant_id=p.tenant_id AND r.revision=p.revision WHERE p.tenant_id='gravuru' AND p.id=? AND p.revision=2 AND p.archived=0").get(cfgId);
  const approval=db.prepare("SELECT document_sha256,variants_json FROM doorbell_live_order_approvals WHERE tenant_id='gravuru' AND shop=? AND product_gid=? AND cfg_id=? AND cfg_revision=2").get(identity.shopDomain,productId,cfgId);
  assert(record&&approval&&digest(record.document)===approval.document_sha256);
  const document=JSON.parse(record.document);
  const prepared=prepareShopProduct({id:cfgId,revision:2,status:record.status,document});
  assert(prepared.sourceReady&&prepared.variants.length===120);
  const native=new Map(prepared.variants.map(row=>[optionKey(row.options),row.priceCents]));
  const selected=db.prepare(`SELECT r.variant_gid,b.unit_cents,s.options,p.binding_id existing FROM shop_product_binding_heads h
   JOIN shop_product_binding_revisions r USING(tenant_id,shop,variant_gid,revision)
   JOIN form_shop_bindings b ON b.id=r.binding_id AND b.tenant_id=h.tenant_id AND b.product_id=r.cfg_id AND b.product_revision=r.cfg_revision
   JOIN form_shop_binding_selections s ON s.binding_id=b.id AND s.tenant_id=b.tenant_id
   LEFT JOIN form_shop_binding_personalization p ON p.binding_id=b.id AND p.tenant_id=b.tenant_id
   WHERE h.tenant_id='gravuru' AND h.shop=? AND r.product_gid=? AND r.cfg_id=? AND r.cfg_revision=2
   AND r.store_id='acryl' ORDER BY r.variant_gid`).all(identity.shopDomain,productId,cfgId);
  assert.equal(selected.length,120);
  const variantIds=selected.map(r=>r.variant_gid.split('/').at(-1));
  assert.deepEqual(variantIds,[...JSON.parse(approval.variants_json)].sort());
  const livePrices=new Map(product.variants.nodes.map(v=>[v.id,v.price]));
  const variants={};
  selected.forEach((r,index)=>{
   assert.equal(r.existing,null);
   assert.equal(native.get(optionKey(JSON.parse(r.options))),r.unit_cents);
   assert.equal(livePrices.get(r.variant_gid),(r.unit_cents/100).toFixed(2));
   variants[variantIds[index]]=r.unit_cents;
  });
  assert.equal(variants['57471227756924'],4999);
  const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId,revision:2,currency:'EUR',
   extraMotifCents:document.config.extraMotifCents,extraPhotoCents:document.config.photo.extraPriceCents,variants};
  assert.equal(pricing.extraPhotoCents,0);assert.equal(pricing.extraMotifCents,0);
  const value=JSON.stringify(pricing);
  assert(Buffer.byteLength(value)<10000);
  for(const [variantId,cents] of Object.entries(variants)){
   const contract=capturePersonalization(pricing,{variantId,baseCents:cents,document});
   assert.equal(contract.baseCents,cents);
   for(const quantity of [1,2,5,99]){
    const line={id:'gid://shopify/CartLine/1',quantity,motifs:{value:'0'},uploads:{value:'0'},revision:{value:'2'},designFile:{value:'fixture-design'},
     merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/'+variantId,product:{id:productId,title:'Ring',pricing:{value}}}};
    const input={presentmentCurrencyRate:'1.0',cart:{lines:[line]},buyerJourney:{step:'CHECKOUT_COMPLETION'}};
    assert.equal(cartValidationsGenerateRun(input).operations.length,0);
    assert.equal(cartTransformRun(input).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,(cents/100).toFixed(2));
    const incomplete={...input,cart:{lines:[{...line,designFile:null}]}};
    assert.equal(cartValidationsGenerateRun(incomplete).operations[0].validationAdd.errors.length,1);
   }
  }
  const amounts=Object.values(variants);
  return {value,stamp:{productId,count:amounts.length,minCents:Math.min(...amounts),maxCents:Math.max(...amounts),
   acceptedPriceCases:480,incompleteCasesBlocked:480,digest:digest(value),documentDigest:approval.document_sha256}};
 }finally{db.close();}
}
const original=await inspect();
const {value,stamp}=pricePlan(original);
const backupFile=path.join(receiptDir,'ring-festpreis-vorher.json');
const target={ownerId:productId,namespace:'$app',key:'personalization'};
if(action==='apply'&&original.pricing===null){
 const backup={original:null,...stamp};
 if(fs.existsSync(backupFile))assert.deepEqual(JSON.parse(fs.readFileSync(backupFile)),backup);
 else fs.writeFileSync(backupFile,JSON.stringify(backup),{flag:'wx',mode:0o600});
 assert.deepEqual(JSON.parse(fs.readFileSync(backupFile)),backup);
 const {data}=await api.graphql(setField,{values:[{...target,type:'json',value,compareDigest:null}]});
 assert.deepEqual(data.metafieldsSet.userErrors,[]);assert.equal(data.metafieldsSet.metafields.length,1);
}
if(action==='rollback'){
 assert.deepEqual(JSON.parse(fs.readFileSync(backupFile)),{original:null,...stamp});
 if(original.pricing){
  assert.equal(original.pricing.value,value);
  const live=await inspect();
  assert.equal(live.pricing.id,original.pricing.id);assert.equal(live.pricing.compareDigest,original.pricing.compareDigest);
  const {data}=await api.graphql(deleteField,{fields:[target]});
  assert.deepEqual(data.metafieldsDelete.userErrors,[]);assert.equal(data.metafieldsDelete.deletedMetafields[0].ownerId,productId);
 }
}
const final=['plan'].includes(action)?original:await inspect();
if(action==='apply'||action==='readback')assert.equal(final.pricing?.value,value);
if(action==='rollback')assert.equal(final.pricing,null);
if(action==='plan'&&final.pricing)assert.equal(final.pricing.value,value);
console.log(JSON.stringify({action,checkedAt:new Date().toISOString(),...stamp,matched:final.pricing?.value===value}));
