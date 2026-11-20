import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {createOrderIntake} from './order-intake.mjs';
import {fixedDoorbellProducts,directDoorbellProducts,hasFixedDoorbellCheckout} from './fixed-doorbell-checkout-products.mjs';

test('only confirmed doorbell profiles at their verified revision receive fixed checkout fields',()=>{
 assert.equal(Object.keys(fixedDoorbellProducts).length,85);
 assert.equal(Object.keys(directDoorbellProducts).length,41);
 const rows=Object.entries({...fixedDoorbellProducts,...directDoorbellProducts});
 assert.equal(rows.length,126);assert.equal(new Set(rows.map(([,profile])=>profile)).size,126);
 for(const [shopifyProduct,profile] of rows){
  assert.match(shopifyProduct,/^gid:\/\/shopify\/Product\/[0-9]+$/);
  assert.equal(hasFixedDoorbellCheckout(profile,2),true);
  assert.equal(hasFixedDoorbellCheckout(profile,1),false);
  assert.equal(hasFixedDoorbellCheckout(profile,3),false);
 }
 assert.equal(hasFixedDoorbellCheckout('cfg_other',2),false);
});

for(const [label,shopifyProduct,variant,format,cents] of [
 ['Ring','16126387257724','57471227756924','16x28',4999],['AOSU','16182701621628','58046739054972','24x20',5999],
 ['AOSU Hochformat über Direktlink','16124413084028','57465408291196','16x28',4999]]){
test(label+' fixed price follows the saved revision through offer creation and resolution',()=>{
 const database=new DatabaseSync(':memory:');
 try{
  const shop='gravuru-design.myshopify.com',product=(fixedDoorbellProducts['gid://shopify/Product/'+shopifyProduct]||directDoorbellProducts['gid://shopify/Product/'+shopifyProduct]);
  const selections={format,frame:'FK-RUNDUM',color:'schwarz',mounting:'K00'};
  const manifest={schema:'gravuru-native-review/v1',id:'proof_first',packageSha256:'a'.repeat(64),
   product:{id:product,revision:2,currency:'EUR',basePriceCents:cents},
   selection:{options:selections,price:{quantity:1,unitCents:cents,totalCents:cents,additionalMotifs:0,chargedUploads:0}}};
  const intake=createOrderIntake({database,tenantId:'gravuru',snapshot:()=>structuredClone(manifest)});
  function bind(id,productId,variant){
   database.prepare('INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at,tenant_id) VALUES(?,?,?,?,2,?,?,?)')
    .run(id,shop,variant,productId,cents,new Date().toISOString(),'gravuru');
   database.prepare('INSERT INTO form_shop_binding_selections(binding_id,options,tenant_id) VALUES(?,?,?)').run(id,JSON.stringify(selections),'gravuru');
  }
  bind('binding_1',product,variant);
  const a=intake.offer({bindingId:'binding_1',snapshotId:manifest.id,quantity:1});
  assert.deepEqual(a.personalization,{revision:'2',motifs:0,uploads:0,designReference:'gravuru:proof_first:'+manifest.packageSha256});
  assert.equal(intake.resolveCartOffer({offerId:a.id,offerToken:a.property.value,snapshotId:manifest.id,shopDomain:shop}).personalization.designReference,a.personalization.designReference);
  assert.equal(database.prepare('SELECT count(*) n FROM form_offer_personalization').get().n,0);
  manifest.product.id='cfg_different';
  bind('binding_2',manifest.product.id,'123');
  assert.equal(intake.offer({bindingId:'binding_2',snapshotId:manifest.id,quantity:1}).personalization,undefined);
 }finally{database.close();}
});
}
