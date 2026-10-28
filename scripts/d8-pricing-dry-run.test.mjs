import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeAcrylicConfig} from '../app/configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument,resolveProduct} from '../app/workshop/product-model.mjs';
import {prepareD8Pricing,run,D8,D8_READ_QUERY} from './d8-pricing-dry-run.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../app/designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
function fixture(){
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));config.extraMotifCents=0;
 const document=makeProductDocument(config),options={},resolved=resolveProduct(document,{options});
 const record={id:'cfg_00000000-0000-4000-8000-000000000001',revision:3,status:'draft',document},functionId='synthetic-reviewed-function';
 return {schema:'gravuru-d8-pricing-readback/v1',record,expectedFunctionId:functionId,
  binding:{id:'binding_00000000-0000-4000-8000-000000000002',shopDomain:D8.shop,variantId:D8.variant,productId:record.id,productRevision:3,options:resolved.resolvedOptions,unitCents:resolved.price.unitCents},
  shopify:{data:{shop:{myshopifyDomain:D8.shop,currencyCode:'EUR',plan:{partnerDevelopment:true,shopifyPlus:false}},
   currentAppInstallation:{app:{id:D8.app},accessScopes:[{handle:'read_cart_transforms'}]},
   productVariant:{id:'gid://shopify/ProductVariant/'+D8.variant,price:(resolved.price.unitCents/100).toFixed(2),product:{id:D8.product,pricing:null}},
   cartTransforms:{nodes:[{id:'gid://shopify/CartTransform/1',functionId,blockOnFailure:true}],pageInfo:{hasNextPage:false}},
   shopifyFunctions:{nodes:[{id:functionId,title:'synthetic',apiType:'cart_transform'}],pageInfo:{hasNextPage:false}}}}};
}
test('offline D8 proposal changes only motif mode/cents, keeps original and creates no network or database writes',()=>{
 const f=fixture(),saved=structuredClone(f),p=prepareD8Pricing(f);assert.deepEqual(f,saved);
 assert.equal(p.dryRun,true);assert.equal(p.applied,false);assert.equal(p.shopifyRequests,0);assert.equal(p.dbWrites,0);
 assert.equal(p.candidate.document.config.extraMotifCents,169);assert.equal(p.candidate.document.config.motifCharge,'additional');
 assert.equal(p.candidate.expectedNewRevision,4);assert.deepEqual(p.rollback.document,f.record.document);
 assert.equal(p.checks.oneAdditionalMotifCents-p.checks.originalCents,169);assert.deepEqual(Object.keys(p.pricing.variants),[D8.variant]);
 assert.equal(p.metafieldProposal.compareDigest,null);assert.equal(p.rollback.neverRestoreWholeDatabaseOverOrders,true);
 assert.ok(D8_READ_QUERY.includes('cartTransforms'));assert.ok(!D8_READ_QUERY.includes('mutation'));
});
test('D8 refuses wrong app/shop/variant, missing or inactive function, incomplete pages and unsupported plan',()=>{
 const cases=[
  f=>f.shopify.data.currentAppInstallation.app.id='gid://shopify/App/99',
  f=>f.shopify.data.shop.myshopifyDomain='other.myshopify.com',
  f=>f.shopify.data.productVariant.id='gid://shopify/ProductVariant/99',
  f=>f.shopify.data.cartTransforms.nodes=[],
  f=>f.shopify.data.shopifyFunctions.nodes=[],
  f=>f.shopify.data.cartTransforms.pageInfo.hasNextPage=true,
  f=>f.shopify.data.shop.plan.partnerDevelopment=false,
  f=>f.expectedFunctionId='wrong',
  f=>f.shopify.data.currentAppInstallation.accessScopes=[],
 ];for(const change of cases){const f=fixture();change(f);assert.throws(()=>prepareD8Pricing(f));}
});
test('D8 refuses changed source/binding/base price or a pre-existing Shopify contract instead of replacing it',()=>{
 for(const change of [f=>f.record.document.config.extraMotifCents=99,f=>f.binding.productRevision++,f=>f.binding.unitCents++,f=>f.shopify.data.productVariant.price='0.01',f=>f.shopify.data.productVariant.product.pricing={value:'{}'},f=>delete f.shopify.data.productVariant.product.pricing]){
  const f=fixture();change(f);assert.throws(()=>prepareD8Pricing(f));
 }
});
test('CLI writes a fresh private proposal only, refuses apply/live flags and never overwrites an output',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-d8-dry-'));
 try{const input=path.join(dir,'input.json'),out=path.join(dir,'proposal');fs.writeFileSync(input,JSON.stringify(fixture()));
  const bytes=fs.readFileSync(input);const result=run(['--input',input,'--out',out]);assert.equal(result.applied,false);assert.deepEqual(fs.readFileSync(input),bytes);
  assert.ok(fs.existsSync(path.join(out,'proposal.json')));assert.throws(()=>run(['--input',input,'--out',out]),/exist/i);
  for(const flag of ['--apply','--live','--commit'])assert.throws(()=>run(['--input',input,'--out',out,flag,'yes']),/kein Live/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
