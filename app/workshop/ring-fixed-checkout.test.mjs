import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {createOrderIntake} from './order-intake.mjs';

test('approved Ring fixed price follows the saved revision through offer creation and resolution',()=>{
 const database=new DatabaseSync(':memory:');
 try{
  const shop='gravuru-design.myshopify.com',product='cfg_d9fb1702-b41e-49f0-9eda-117be91f436a';
  const selections={format:'16x28',frame:'FK-RUNDUM',color:'schwarz',mounting:'K00'};
  const manifest={schema:'gravuru-native-review/v1',id:'proof_first',packageSha256:'a'.repeat(64),
   product:{id:product,revision:2,currency:'EUR',basePriceCents:4999},
   selection:{options:selections,price:{quantity:1,unitCents:4999,totalCents:4999,additionalMotifs:0,chargedUploads:0}}};
  const intake=createOrderIntake({database,tenantId:'gravuru',snapshot:()=>structuredClone(manifest)});
  function bind(id,productId,variant){
   database.prepare('INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at,tenant_id) VALUES(?,?,?,?,2,4999,?,?)')
    .run(id,shop,variant,productId,new Date().toISOString(),'gravuru');
   database.prepare('INSERT INTO form_shop_binding_selections(binding_id,options,tenant_id) VALUES(?,?,?)').run(id,JSON.stringify(selections),'gravuru');
  }
  bind('binding_1',product,'57471227756924');
  const a=intake.offer({bindingId:'binding_1',snapshotId:manifest.id,quantity:1});
  assert.deepEqual(a.personalization,{revision:'2',motifs:0,uploads:0,designReference:'gravuru:proof_first:'+manifest.packageSha256});
  assert.equal(intake.resolveCartOffer({offerId:a.id,offerToken:a.property.value,snapshotId:manifest.id,shopDomain:shop}).personalization.designReference,a.personalization.designReference);
  assert.equal(database.prepare('SELECT count(*) n FROM form_offer_personalization').get().n,0);
  manifest.product.id='cfg_different';
  bind('binding_2',manifest.product.id,'123');
  assert.equal(intake.offer({bindingId:'binding_2',snapshotId:manifest.id,quantity:1}).personalization,undefined);
 }finally{database.close();}
});
