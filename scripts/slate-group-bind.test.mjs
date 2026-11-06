import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlateLiveReader,bindSlatePlan} from './slate-group-bind.mjs';
const id='gid://shopify/ProductVariant/58117933695356',productId='gid://shopify/Product/16192353829244';
function fixture(){
 const variant={shopifyVariantId:id,sku:'MG-S-22x14-D1-AH02-GOLD',priceCents:2898,label:'2 Abstandshalter – Gold',options:{mounting:'AH02','ah-farbe-2':'gold'}};
 const plan={entries:[{shopify:{id:productId},variants:[variant]}]};
 const data={shop:{myshopifyDomain:'gravuru-design.myshopify.com',currencyCode:'EUR'},nodes:[{id,sku:variant.sku,price:'28.98',selectedOptions:[{name:'Befestigung',value:variant.label}],product:{id:productId,status:'DRAFT',variantsCount:{count:1}}}]};
 return {plan,data,client:{async graphql(){return {data};}}};
}
test('fresh slate evidence verifies exact conditional-colour SKU and combined Shopify label',async()=>{
 const f=fixture(),r=await createSlateLiveReader(f.client,f.plan).inspectVariants([id]);
 assert.equal(r.variants[0].priceCents,2898);assert.equal(r.variants[0].productId,productId);
 assert.deepEqual(f.plan.entries[0].variants[0].options,{mounting:'AH02','ah-farbe-2':'gold'});
});
test('stale price, colour, identity, status and variant count cannot enter the shared binding registry',async()=>{
 for(const mutate of [v=>v.price='28.99',v=>v.sku+='-SCHWARZ',v=>v.selectedOptions[0].value='Schwarz',v=>v.product.id='gid://shopify/Product/9',v=>v.product.status='ACTIVE',v=>v.product.variantsCount.count=2]){
  const f=fixture();mutate(f.data.nodes[0]);await assert.rejects(createSlateLiveReader(f.client,f.plan).inspectVariants([id]),/weichen/);
 }
});
test('unplanned IDs and incomplete native imports never reach the network or write path',async()=>{
 const f=fixture();await assert.rejects(createSlateLiveReader(f.client,f.plan).inspectVariants(['gid://shopify/ProductVariant/2']),/Ungeplante/);
 await assert.rejects(bindSlatePlan({entries:[{action:'unchanged',native:null}]},{workshop:{},reader:{},apply:true}),/importiert/);
});
