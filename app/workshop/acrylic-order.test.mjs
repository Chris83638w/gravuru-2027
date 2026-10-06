import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {createHmac,randomBytes} from 'node:crypto';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createOrderIntake} from './order-intake.mjs';import {makeProductDocument,resolveProduct} from './product-model.mjs';import {build} from '../configurator/variant-m/build.mjs';
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-native-binding-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];seed.universal.acrylic.pricing.bases.buche=999;
 const record={id:'cfg_acrylic_synthetic',revision:1,status:'draft',document:makeProductDocument(seed.universal,{name:'Acryl · Prüfmuster',kind:'product'})},db=new DatabaseSync(path.join(dir,'test.sqlite')),states=new Map();t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
 function state(id,options={size:'large',base:'eiche',wall:'wall'},extra=0){const r=resolveProduct(record.document,{options}),unit=r.price.unitCents+extra;const m={id,schema:'gravuru-acrylic-review/v1',packageSha256:'a'.repeat(64),product:{id:record.id,revision:1,basePriceCents:unit,currency:'EUR',name:'Prüfmuster'},selection:{options,labels:[],geometry:r.physical,price:{...r.price,unitCents:unit,quantity:2,totalCents:unit*2}},productionProfile:null};states.set(id,m);return m;}
 const m=state('proof_eiche'),intake=createOrderIntake({database:db,snapshot:id=>{assert.ok(states.has(id));return structuredClone(states.get(id));}}),args={shopDomain:'gravuru-synthetic.myshopify.com',variantId:'301',record,snapshotId:m.id};return {db,intake,record,m,state,args};
}
test('native bindings pin exact options even when different bases cost the same; quantity and revision cannot drift',t=>{
 const f=fixture(t),b=f.intake.bind(f.args);assert.equal(b.unitCents,3697);assert.deepEqual(b.options,f.m.selection.options);assert.deepEqual(f.intake.bind(f.args),b);
 const samePrice=f.state('proof_buche',{size:'large',base:'buche',wall:'wall'});assert.equal(samePrice.product.basePriceCents,b.unitCents);
 assert.throws(()=>f.intake.bind({...f.args,snapshotId:samePrice.id}),/anderen Ausführung/);assert.throws(()=>f.intake.offer({bindingId:b.id,snapshotId:samePrice.id,quantity:2}),/Ausführung/);
 assert.throws(()=>f.intake.offer({bindingId:b.id,snapshotId:f.m.id,quantity:1}),/Menge/);assert.throws(()=>f.intake.bind({...f.args,record:{...f.record,revision:2}}),/Produktstand/);
 assert.throws(()=>f.intake.bind({...f.args,snapshotId:undefined}),/Prüfstand/);assert.throws(()=>f.db.exec("UPDATE form_shop_binding_selections SET options='{}'"),/immutable/);assert.throws(()=>f.db.exec('DELETE FROM form_shop_binding_selections'),/immutable/);
 const changed=structuredClone(f.record.document);changed.config.acrylic.pricing.sizes.large+=100;assert.throws(()=>f.intake.bind({...f.args,record:{...f.record,document:changed}}),/Aufpreisbindung/);
});
test('native charged extras fail closed before offering a base-price Shopify variant',t=>{
 const f=fixture(t);f.state('proof_extra',undefined,169);assert.throws(()=>f.intake.bind({...f.args,snapshotId:'proof_extra'}),/Aufpreisbindung/);assert.equal(f.intake.bindings().length,0);
});
test('signed native test order freezes selection, amount and source without enabling customer downloads',t=>{
 const f=fixture(t),b=f.intake.bind(f.args),offer=f.intake.offer({bindingId:b.id,snapshotId:f.m.id,quantity:2}),config={shopDomain:f.args.shopDomain,apiVersion:'2026-07',secret:randomBytes(32).toString('hex')};
 const payload={id:101,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:201,variant_id:301,quantity:2,price:'36.97',properties:[offer.property]}]};
 const receive=p=>{const raw=Buffer.from(JSON.stringify(p));return f.intake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':config.shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':'native-test-event'},config);};
 for(const change of [{price:'35.97'},{quantity:1},{variant_id:302}]){const p=structuredClone(payload);Object.assign(p.line_items[0],change);assert.throws(()=>receive(p),/weichen/);assert.equal(f.intake.list().length,0);}
 assert.throws(()=>receive({...payload,test:false}),/Live/);const first=receive(payload),line=first.lines[0];assert.equal(line.totalCents,7394);assert.deepEqual(line.selection,f.m.selection);assert.equal(line.sourceSchema,f.m.schema);assert.equal(line.sourcePackageSha256,f.m.packageSha256);assert.equal(line.customerDownloadAllowed,false);assert.equal(line.productionReady,false);assert.equal(receive(payload).duplicate,true);
 f.m.selection.options.base='none';assert.equal(f.intake.get(line.id).selection.options.base,'eiche');assert.ok(!JSON.stringify(f.intake.list()).includes(offer.property.value));
});
