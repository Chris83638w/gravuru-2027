import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createProductRepository} from '../../app/workshop/repository.mjs';
import {createOrderIntake} from '../../app/workshop/order-intake.mjs';
import {createShopBindingReadAdapter} from '../../app/workshop/shop-product-binding-adapter.mjs';
import {planShopProductBindings} from '../../app/workshop/shop-product-binding-plan.mjs';
import {moduleProfileTestSource} from '../../app/workshop/test-fixtures/module-profile-source.mjs';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
import {openProductionModuleReadonlyTarget} from './gallery-production-readonly-target.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('native readonly target opens existing SQLite without migration, rejects writes and scopes IDs',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'module-readonly-')),filename=path.join(dir,'workshop.sqlite'),tenantId='test',shopDomain='read-only-module-test.myshopify.com',storeId='acryl';
 const repository=createProductRepository({filename,tenantId}),db=new DatabaseSync(filename),orderIntake=createOrderIntake({database:db,tenantId,snapshot(){throw Error('No orders in test');}});
 const record=repository.create(moduleProfileTestSource()),workshop={tenantId,repository,orderIntake,productionProfiles:{resolve(){throw Error('No profile');}},sessionContext:{shopDomain}};
 const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}}),registry=orderIntake.idBindings({storeId,shopDomain,adapter});
 const pair={shopifyProductId:'gid://shopify/Product/100001',shopifyVariantId:'gid://shopify/ProductVariant/100101'},now=Date.now();
 const plan=planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now,maxEvidenceAgeMs:60000,selections:[{...pair,productId:record.id,productRevision:1,options:{mounting:'none'}}],shopifyEvidence:{tenantId,shopDomain,readAt:new Date(now).toISOString(),complete:true,products:[{id:pair.shopifyProductId,variants:[{id:pair.shopifyVariantId,productId:pair.shopifyProductId,priceCents:1999}]}]}});
 registry.persist({plan,expectedHeads:[{shopifyVariantId:pair.shopifyVariantId,revision:null}]});
 const expected={tenantId,shopDomain,storeId,productId:record.id,revision:1,documentSha256:syncHash(record.document),shopifyProductId:pair.shopifyProductId,shopifyVariantIds:Array.from({length:404},(_,i)=>`gid://shopify/ProductVariant/${100101+i}`)};
 db.close();repository.close();const before=sha(filename),target=openProductionModuleReadonlyTarget({filename,expected});
 try{
  const [bound]=target.readBindings([pair]);assert.equal(bound.unitCents,1999);assert.equal(bound.productId,record.id);
  assert.equal(target.targetWorkshop.repository.get(record.id).revision,1);
  assert.throws(()=>target.targetWorkshop.orderIntake.withBindingTransaction(()=>{}),{code:'module_readonly_write'});
  assert.throws(()=>target.readBindings([{...pair,shopifyVariantId:'gid://shopify/ProductVariant/999999'}]),{code:'module_readonly_scope'});
  assert.throws(()=>target.targetWorkshop.repository.get('cfg_00000000-0000-4000-8000-000000000099'),{code:'module_readonly_product'});
  assert.equal(target.targetWorkshop.repository.save,undefined);assert.equal(target.canActivate,false);
 }finally{target.close();}
 assert.equal(sha(filename),before,'No schema, journal, product, binding or order mutation');
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
});
