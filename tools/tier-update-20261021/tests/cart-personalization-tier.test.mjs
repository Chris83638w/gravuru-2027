import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {capturePersonalization,personalizationForSnapshot,personalizationAttributes} from '../merchant/app/workshop/cart-personalization.mjs';
import {createOrderIntake} from '../merchant/app/workshop/order-intake.mjs';
import {NATIVE_REVIEW} from '../merchant/app/workshop/native-review-schema.mjs';

const tiers=[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}];
const sha='a'.repeat(64),variantId='42',shopDomain='synthetic-gravuru.myshopify.com';
const clone=v=>structuredClone(v);
function metadata(rules=tiers) {
 const p={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:'gid://shopify/Product/123',revision:31,currency:'EUR',variants:{[variantId]:2299},extraMotifCents:169,extraPhotoCents:999};
 if(rules!==undefined){p.quantityTiers=clone(rules);p.quantityTierScope='complete-unit';}
 return p;
}
function doc(rules=tiers) {
 const d={config:{extraMotifCents:169,photo:{extraPriceCents:999}}};
 if(rules!==undefined){d.config.quantityTiers=clone(rules);d.config.quantityTierScope='complete-unit';}
 return d;
}
function contract(rules=tiers) {
 return capturePersonalization(metadata(rules),{variantId,baseCents:2299,document:doc(rules)});
}
function proof(q=2,{rules=tiers,motifs=0,photos=1,base=2299}={}) {
 const list=base+169*motifs+photos*999;
 // Independent test oracle: the pilot has exact integer percentage tiers.
 const tier=rules?.filter(t=>q>=t.minQuantity).at(-1)??null;
 const discounted=tier?Math.round(list*(100-tier.percentOff)/100):list;
 const unit=discounted;
 const p={quantity:q,additionalMotifs:motifs,chargedUploads:photos,unitCents:unit,totalCents:unit*q};
 if(rules!==undefined)Object.assign(p,{listUnitCents:list,quantityTierScope:'complete-unit',quantityTier:clone(tier),quantityTierDiscountCents:list-discounted});
 return {schema:NATIVE_REVIEW,id:'proof_00000000-0000-4000-8000-000000000002',packageSha256:sha,
  product:{id:'cfg-synthetic',revision:6,basePriceCents:unit,currency:'EUR'},
  selection:{options:{mount:'none'},price:p}};
}
const fails=fn=>assert.throws(fn,e=>e.status===422);

test('capture keeps legacy serialized contract exactly when tiers are absent',()=>{
 const p=metadata();delete p.quantityTiers;delete p.quantityTierScope;const d=doc();delete d.config.quantityTiers;delete d.config.quantityTierScope;
 assert.deepEqual(capturePersonalization(p,{variantId,baseCents:2299,document:d}),{
  productId:p.productId,revision:'31',baseCents:2299,extraMotifCents:169,extraPhotoCents:999
 });
});
test('capture requires matching trusted product and Shopify rules',()=>{
 const p=metadata(),d=doc();d.config.quantityTiers[0].percentOff=7;
 fails(()=>capturePersonalization(p,{variantId,baseCents:2299,document:d}));
 delete d.config.quantityTiers;delete d.config.quantityTierScope;fails(()=>capturePersonalization(p,{variantId,baseCents:2299,document:d}));
 const p2=metadata();delete p2.quantityTiers;delete p2.quantityTierScope;fails(()=>capturePersonalization(p2,{variantId,baseCents:2299,document:doc()}));
});
test('captured tiers are cloned and canonicalized',()=>{
 const p=metadata(),d=doc(),c=capturePersonalization(p,{variantId,baseCents:2299,document:d});
 p.quantityTiers[0].percentOff=80;d.config.quantityTiers[0].minQuantity=80;
 assert.deepEqual(c.quantityTiers,tiers);
 assert.equal(c.quantityTierScope,'complete-unit');
});
test('complete-unit scope is explicit and identical on product and Shopify contract',()=>{
 for(const side of ['product','shop'])for(const scope of [undefined,null,'base-only','before-photos']){
  const p=metadata(),d=doc(),target=side==='product'?d.config:p;
  if(scope===undefined)delete target.quantityTierScope;else target.quantityTierScope=scope;
  fails(()=>capturePersonalization(p,{variantId,baseCents:2299,document:d}));
 }
 const p=metadata(),d=doc();delete p.quantityTiers;delete d.config.quantityTiers;
 fails(()=>capturePersonalization(p,{variantId,baseCents:2299,document:d}));
});
test('checkout rejects null, open, fixed, duplicate, unsorted and malformed tiers',()=>{
 for(const rules of [null,[{minQuantity:2,percentOff:null}],[{minQuantity:2,unitCents:1}],
 [{minQuantity:2,percentOff:6},{minQuantity:2,percentOff:10}],
 [{minQuantity:3,percentOff:10},{minQuantity:2,percentOff:6}],
 [{minQuantity:1,percentOff:6}],[{minQuantity:100,percentOff:6}],
 [{minQuantity:2,percentOff:0}],[{minQuantity:2,percentOff:100}],
 [{minQuantity:2,percentOff:6.123}],[{minQuantity:2,percentOff:NaN}],
 [{minQuantity:2,percentOff:6,unexpected:true}],Array.from({length:11},(_,i)=>({minQuantity:i+2,percentOff:6}))]) {
  fails(()=>capturePersonalization(metadata(rules),{variantId,baseCents:2299,document:doc(rules)}));
 }
});
for(const [q,unit,total] of [[1,3298,3298],[2,3100,6200],[3,2968,8904],[4,2968,11872],[99,2968,293832]]) {
 test('quantity '+q+' discounts the complete unit including photo and checks total',()=>{
  const m=proof(q),r=personalizationForSnapshot(contract(),m);
  assert.equal(r.unitCents,unit);assert.equal(m.selection.price.totalCents,total);
  assert.equal(r.personalization.uploads,1);assert.equal(r.personalization.revision,'31');
  assert.equal(r.personalization.designReference,'gravuru:'+m.id+':'+sha);
  assert.equal(personalizationAttributes(r.personalization).length,4);
 });
}
test('motifs and zero to four paid uploads are discounted together',()=>{
 for(const q of [1,2,3,99])for(const motifs of [0,1,2,200])for(const photos of [0,1,4]){
  const m=proof(q,{motifs,photos}),r=personalizationForSnapshot(contract(),m);
  assert.equal(r.unitCents,m.selection.price.unitCents);
 }
});
test('empty tiers explicitly retain normal full price',()=>{
 const m=proof(3,{rules:[]});
 assert.equal(personalizationForSnapshot(contract([]),m).unitCents,3298);
});
test('legacy snapshots without tier keys remain valid',()=>{
 const p=metadata(),d=doc();delete p.quantityTiers;delete p.quantityTierScope;delete d.config.quantityTiers;delete d.config.quantityTierScope;
 const c=capturePersonalization(p,{variantId,baseCents:2299,document:d});
 const m=proof(2,{rules:[]});delete m.selection.price.quantityTier;delete m.selection.price.quantityTierDiscountCents;delete m.selection.price.listUnitCents;delete m.selection.price.quantityTierScope;
 assert.equal(personalizationForSnapshot(c,m).unitCents,3298);
});
test('snapshot cannot invent a tier for a legacy binding',()=>{
 const p=metadata(),d=doc();delete p.quantityTiers;delete p.quantityTierScope;delete d.config.quantityTiers;delete d.config.quantityTierScope;
 fails(()=>personalizationForSnapshot(capturePersonalization(p,{variantId,baseCents:2299,document:d}),proof(2)));
});
test('changed quantity, tier, discount, list, unit, total, upload and product price reject',()=>{
 const edits=[
  m=>m.selection.price.quantity=3,m=>m.selection.price.quantity=0,m=>m.selection.price.quantity=NaN,
  m=>m.selection.price.quantityTier.percentOff=7,m=>m.selection.price.quantityTier.minQuantity=3,
  m=>m.selection.price.quantityTier.extra=1,m=>m.selection.price.quantityTierScope='base-only',m=>delete m.selection.price.quantityTierScope,m=>delete m.selection.price.quantityTier,
  m=>m.selection.price.quantityTierDiscountCents++,m=>m.selection.price.listUnitCents--,
  m=>m.selection.price.unitCents--,m=>m.selection.price.totalCents--,
  m=>m.selection.price.chargedUploads=0,m=>m.selection.price.chargedUploads=5,
  m=>m.selection.price.additionalMotifs=-1,m=>m.product.basePriceCents--,
  m=>m.selection.price.fieldCents=10,m=>m.selection.price.backCents=10,
  m=>m.packageSha256='invalid'];
 for(const edit of edits){const m=proof();edit(m);fails(()=>personalizationForSnapshot(contract(),m));}
});
test('nonfinite/unsafe contract arithmetic rejects',()=>{
 for(const [key,value] of [['baseCents',Infinity],['extraMotifCents',Number.MAX_SAFE_INTEGER],['extraPhotoCents',NaN]]){
  const c=contract();c[key]=value;fails(()=>personalizationForSnapshot(c,proof()));
 }
});
test('half cents round up before quantity multiplication',()=>{
 const c=contract([{minQuantity:2,percentOff:50}]);c.baseCents=1;
 const m=proof(2,{rules:[{minQuantity:2,percentOff:50}],base:1,photos:0});
 assert.equal(personalizationForSnapshot(c,m).unitCents,1);
 assert.equal(m.selection.price.totalCents,2);
});

function intakeFixture(q=2) {
 const db=new DatabaseSync(':memory:'),m=proof(q);
 const api=createOrderIntake({database:db,snapshot:id=>{assert.equal(id,m.id);return m;},clock:()=>1803139200000});
 db.prepare('INSERT INTO form_shop_bindings VALUES(?,?,?,?,?,?,?)').run('binding-synthetic',shopDomain,variantId,m.product.id,6,2299,'2026-10-21T00:00:00Z');
 db.prepare('INSERT INTO form_shop_binding_personalization VALUES(?,?)').run('binding-synthetic',JSON.stringify(contract()));
 db.prepare('INSERT INTO form_shop_binding_selections VALUES(?,?)').run('binding-synthetic',JSON.stringify(m.selection.options));
 const offer=api.offer({bindingId:'binding-synthetic',snapshotId:m.id,quantity:q});
 const config={shopDomain,apiVersion:'2026-07',secret:'public-synthetic-webhook-secret'};
 const payload={id:1000001,test:true,financial_status:'paid',currency:'EUR',cancelled_at:null,line_items:[{id:2000001,variant_id:Number(variantId),quantity:q,price:(offer.unitCents/100).toFixed(2),properties:[offer.property,...personalizationAttributes(offer.personalization).map(a=>({name:a.key,value:a.value}))]}]};
 const receive=(p=payload,event='synthetic-event-0001')=>{
  const raw=Buffer.from(JSON.stringify(p));
  return api.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),
   'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':event},config);
 };
 return {db,api,m,offer,payload,receive};
}
for(const [q,unit,total] of [[2,3100,6200],[3,2968,8904]]){
 test('unchanged order intake resolves and records quantity '+q+' with no production release',()=>{
  const f=intakeFixture(q);
  try{
   const resolved=f.api.resolveCartOffer({offerId:f.offer.id,offerToken:f.offer.property.value,snapshotId:f.m.id,shopDomain});
   assert.equal(resolved.unitCents,unit);assert.equal(resolved.quantity,q);
   const r=f.receive(),line=r.lines[0];
   assert.equal(r.duplicate,false);assert.equal(line.unitCents,unit);assert.equal(line.totalCents,total);
   assert.equal(line.product.revision,6);assert.equal(line.snapshotId,f.m.id);
   assert.equal(line.sourcePackageSha256,sha);assert.equal(line.test,true);
   assert.equal(line.productionReady,false);assert.equal(line.customerDownloadAllowed,false);
   assert.equal(f.receive().duplicate,true);assert.equal(f.api.list().length,1);
  }finally{f.db.close();}
 });
}
test('unchanged webhook rejects altered true Shopify prices, amount and snapshot attributes',()=>{
 const mutations=[
  p=>p.line_items[0].price='32.98',p=>p.line_items[0].quantity=3,p=>p.line_items[0].variant_id=43,
  p=>p.line_items[0].properties.find(a=>a.name==='_gravuru_uploads').value='0',
  p=>p.line_items[0].properties.find(a=>a.name==='_gravuru_revision').value='30',
  p=>p.line_items[0].properties.find(a=>a.name==='Bearbeitbarer Entwurf').value='gravuru:proof_other:'+sha,
  p=>p.line_items[0].properties.push({name:'_gravuru_uploads',value:'1'}),
  p=>p.test=false,p=>p.financial_status='pending'
 ];
 for(const mutate of mutations){const f=intakeFixture();try{mutate(f.payload);assert.throws(()=>f.receive());assert.equal(f.api.list().length,0);}finally{f.db.close();}}
});
test('unchanged offer path rejects mismatch with immutable quantity/revision/package',()=>{
 for(const mutate of [
  f=>f.api.offer({bindingId:'binding-synthetic',snapshotId:f.m.id,quantity:3}),
  f=>{f.m.product.revision=7;return f.api.offer({bindingId:'binding-synthetic',snapshotId:f.m.id,quantity:2});},
  f=>{f.m.packageSha256='b'.repeat(64);return f.api.resolveCartOffer({offerId:f.offer.id,offerToken:f.offer.property.value,snapshotId:f.m.id,shopDomain});}
 ]){const f=intakeFixture();try{assert.throws(()=>mutate(f));assert.equal(f.api.list().length,0);}finally{f.db.close();}}
});

