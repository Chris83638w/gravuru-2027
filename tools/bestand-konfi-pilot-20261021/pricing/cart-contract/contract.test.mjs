import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSchema,parse,validate} from 'graphql';
import {commerce,contract} from '../load-pricing.mjs';
import {setup,keyRing} from './fixtures.mjs';
import {cartTransformRun} from './proposed/cart_transform_run.js';
import {cartTransformRun as legacyRun} from './original/cart_transform_run.js';
import {encode,decode,verifySignedQuote,verifyReturnedLine,validatePricing,calculate,moneyCents} from './proposed/price-contract.mjs';

for(const [quantity,amount,total]of [[1,'32.98',3298],[2,'31.60',6320],[3,'30.68',9204],[4,'30.68',12272],[99,'30.68',303732]]){
 test('real proposed Function: observed-price case qty '+quantity,()=>{
  const f=setup({quantity});assert.equal(f.offer.quote.totalCents,total);
  assert.equal(cartTransformRun(f.input).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,amount);
 });
}
test('serializer roundtrip, separate signature, bounded attributes and public-key verification',()=>{
 const f=setup();assert.deepEqual(decode(encode(f.offer.quote)),f.offer.quote);
 assert.deepEqual(verifySignedQuote(f.offer.payload,f.offer.signature,keyRing),f.offer.quote);
 assert.ok(f.offer.attributes.every(a=>a.value.length<=240));
 assert.equal(Object.hasOwn(keyRing,'privateKey'),false);
});
test('modified amount, photo count, field price, reverse side or quantity cannot reuse a signature',()=>{
 const f=setup();
 for(const key of ['unitCents','uploads','fieldCents','backCents','quantity']){
  const altered={...f.offer.quote,[key]:f.offer.quote[key]+1};
  assert.throws(()=>verifySignedQuote(encode(altered),f.offer.signature,keyRing),/signature mismatch/);
 }
});
test('v2 never falls back when signature or chunks are removed',()=>{
 for(const key of ['signature','q0','q1','q2','q3']){
  const f=setup();delete f.line[key];assert.throws(()=>cartTransformRun(f.input),/quote|signature/i);
 }
});
test('v2 ignores untrusted legacy amount/count attributes',()=>{
 const f=setup();f.line.motifs={value:'0'};f.line.uploads={value:'0'};
 assert.equal(cartTransformRun(f.input).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'31.60');
});
test('quantity, variant, product, revision and snapshot changes fail closed',()=>{
 for(const mutate of [
  f=>f.line.quantity++,f=>f.line.merchandise.id='gid://shopify/ProductVariant/5',
  f=>f.line.merchandise.product.id='gid://shopify/Product/5',
  f=>f.line.revision.value='6',f=>f.line.designFile.value='proof_other:'+ 'b'.repeat(64)
 ]){
  const f=setup();mutate(f);assert.throws(()=>cartTransformRun(f.input),/does not match/);
 }
});
test('changed authoritative pricing invalidates existing signed quote',()=>{
 const f=setup();f.pricing.extraPhotoCents++;assert.throws(()=>cartTransformRun(f.input),/Stale product price contract/);
});
test('unknown public key, invalid signature and currency mismatch block v2',()=>{
 const f=setup();f.input.shop.quoteKeys.jsonValue={schema:'gravuru-quote-public-keys/v1',keys:{}};
 assert.throws(()=>cartTransformRun(f.input),/Unknown signing key/);
 const a=setup();a.line.signature.value='00'.repeat(64);assert.throws(()=>cartTransformRun(a.input),/signature mismatch/);
 const b=setup();b.line.cost.amountPerQuantity.currencyCode='USD';assert.throws(()=>cartTransformRun(b.input),/EUR/);
 const c=setup();c.input.presentmentCurrencyRate='1.01';assert.throws(()=>cartTransformRun(c.input),/EUR/);
});
test('all four field kinds plus back and motif are included before tier; photo after it',()=>{
 const f=setup({mounting:'observed-hole2',edit:(c,s)=>{
  c.profile.optionFields=[
   {id:'name',kind:'text',label:'Name',priceCents:100},
   {id:'date',kind:'date',label:'Datum',priceCents:200},
   {id:'finish',kind:'select',label:'Auswahl',choices:[{id:'yes',label:'Ja',priceCents:300}]},
   {id:'gift',kind:'checkbox',label:'Zusatz',priceCents:400}
  ];
  Object.assign(s.mOptions,{name:'Synthetisches Muster',date:'2026-10-21',finish:'yes',gift:true});
  c.profile.surfaces=[{id:'front'},{id:'back',priceCents:500}];
  s.objects.push({id:'m',type:'motif',motif:'synthetic'}, {id:'b',type:'text',surfaceId:'back',text:'Test'});
 }});
 assert.equal(f.offer.quote.fieldCents,1000);assert.equal(f.offer.quote.backCents,500);
 // (2299+299+169+1000+500) * .94 -> 4011; photo999 -> 5010.
 assert.equal(f.offer.quote.unitCents,5010);assert.equal(f.offer.quote.totalCents,10020);
 assert.equal(cartTransformRun(f.input).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'50.10');
 assert.ok(!f.offer.payload.includes('Synthetisches Muster'));
});
test('hidden fields do not leak their value or surcharge into the offer',()=>{
 const f=setup({edit:(c,s)=>{
  c.profile.optionFields=[{id:'gift',kind:'checkbox',label:'Zusatz',priceCents:400,visibleIf:{groupId:'mounting',valueIds:['observed-hole2']}}];
  s.mOptions.gift=true;
 }});
 assert.equal(f.offer.quote.fieldCents,0);assert.equal(f.offer.quote.unitCents,3160);
});
test('open price data cannot be signed or published',()=>{
 for(const mutate of [
  c=>c.quantityTiers=[{minQuantity:2,percentOff:null}],
  c=>c.photo.extraPriceCents=null,
  c=>{c.profile.surfaces=[{id:'front'},{id:'back',priceCents:null}];}
 ]){
  assert.throws(()=>setup({edit:(c,s)=>{mutate(c);if(c.profile.surfaces)s.objects.push({id:'b',type:'text',surfaceId:'back'});}}));
 }
 const f=setup();f.pricing.quantityTiers=[{minQuantity:2,percentOff:null}];
 assert.throws(()=>validatePricing(f.pricing),/Unconfirmed/);
});
test('original half-up rounding is used in emitted Shopify cents',()=>{
 const f=setup({quantity:2,photo:false,edit:c=>{c.basePriceCents=1990;c.quantityTiers=[{minQuantity:2,percentOff:5}];}});
 assert.equal(f.offer.quote.unitCents,1891);assert.equal(f.offer.quote.totalCents,3782);
 assert.equal(cartTransformRun(f.input).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'18.91');
});
test('unitCents tier changes base only; option/photo add-ons keep exact source semantics',()=>{
 const f=setup({quantity:3,mounting:'observed-hole2',edit:c=>{c.quantityTiers=[{minQuantity:3,unitCents:1999}];}});
 assert.equal(f.offer.quote.unitCents,3297);
 assert.equal(cartTransformRun(f.input).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'32.97');
});
test('proposal equals pinned original prices across all9 mountings and quantities1..99',()=>{
 const base=setup(),mountings=base.config.profile.optionGroups[0].values.map(v=>v.id);
 for(const mounting of mountings)for(const quantity of [1,2,3,4,98,99]){
  const f=setup({quantity,mounting});
  const expected=commerce.commercePrice(f.config,f.state,quantity);
  assert.equal(f.offer.quote.unitCents,expected.unitCents);
  assert.equal(moneyCents(cartTransformRun(f.input).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount),expected.unitCents);
 }
});
test('Shopify response must contain exact real amounts and immutable reference',()=>{
 const f=setup(),q=f.offer.quote;
 const line={quantity:q.quantity,merchandise:{id:q.variantId},attributes:f.offer.attributes,
  cost:{amountPerQuantity:{amount:'31.60',currencyCode:'EUR'},totalAmount:{amount:'63.20',currencyCode:'EUR'}}};
 assert.equal(verifyReturnedLine(line,q,f.offer.signature),true);
 for(const key of ['_gravuru_q0','_gravuru_q1','_gravuru_q2','_gravuru_q3','_gravuru_qsig','_gravuru_revision','Bearbeitbarer Entwurf']){
  const missing=structuredClone(line);missing.attributes=missing.attributes.filter(a=>a.key!==key);
  assert.throws(()=>verifyReturnedLine(missing,q,f.offer.signature),/attribute mismatch/);
  const duplicate=structuredClone(line);duplicate.attributes.push(duplicate.attributes.find(a=>a.key===key));
  assert.throws(()=>verifyReturnedLine(duplicate,q,f.offer.signature),/attribute mismatch/);
  const changed=structuredClone(line);changed.attributes.find(a=>a.key===key).value+='!';
  assert.throws(()=>verifyReturnedLine(changed,q,f.offer.signature),/attribute mismatch/);
 }
 line.cost.totalAmount.amount='65.96';assert.throws(()=>verifyReturnedLine(line,q,f.offer.signature),/actual amount/);
 line.cost.totalAmount.amount='63.20';line.cost.amountPerQuantity.amount='32.98';
 assert.throws(()=>verifyReturnedLine(line,q,f.offer.signature),/actual amount/);
});
test('unmigrated v1 route produces exactly historical operation shape',()=>{
 const f=setup(),pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:f.pricing.productId,currency:'EUR',revision:'5',variants:f.pricing.variants,extraMotifCents:169,extraPhotoCents:999};
 f.line.merchandise.product.pricing.jsonValue=pricing;f.line.motifs={value:'1'};f.line.uploads={value:'1'};
 for(const key of ['q0','q1','q2','q3','signature'])delete f.line[key];
 assert.deepEqual(cartTransformRun(f.input),legacyRun(f.input));
});
test('v2 missing, disabled or downgraded metadata throws; ordinary foreign product still passes',()=>{
 for(const mutate of [f=>{f.pricing.enabled=false;},f=>{delete f.line.merchandise.product.pricing;},f=>{f.pricing.schema='gravuru-personalization-pricing/v1';}]){
  const f=setup();mutate(f);assert.throws(()=>cartTransformRun(f.input),/configuration|downgrade/);
 }
 const noAttributes=setup();noAttributes.pricing.enabled=false;
 for(const key of ['q0','q1','q2','q3','signature'])delete noAttributes.line[key];
 assert.throws(()=>cartTransformRun(noAttributes.input),/configuration/);
 const foreign=setup();delete foreign.line.merchandise.product.pricing;
 for(const key of ['q0','q1','q2','q3','signature'])delete foreign.line[key];
 assert.deepEqual(cartTransformRun(foreign.input),{operations:[]});
});
test('legacy unsafe sums or exchange rate cannot produce Infinity or inaccurate amounts',()=>{
 for(const mutate of [f=>{f.pricing.extraMotifCents=Number.MAX_SAFE_INTEGER;},f=>{f.input.presentmentCurrencyRate='1e300';}]){
  const f=setup();f.pricing.schema='gravuru-personalization-pricing/v1';f.line.motifs={value:'200'};f.line.uploads={value:'4'};
  for(const key of ['q0','q1','q2','q3','signature'])delete f.line[key];
  mutate(f);assert.throws(()=>cartTransformRun(f.input),/Unsafe legacy/);
 }
});
test('extracted tier functions are unchanged source bodies',()=>{
 const source=readFileSync(new URL('../sources/contract.mjs',import.meta.url),'utf8');
 const expected=source.slice(source.indexOf('export const QUANTITY_TIER_MAX'),source.indexOf('// Anzeige neben der Menge'));
 const actual=readFileSync(new URL('./proposed/quantity-tiers.mjs',import.meta.url),'utf8');
 assert.equal(actual.slice(actual.indexOf('export const QUANTITY_TIER_MAX')).trimEnd(),expected.trimEnd());
});
test('proposed GraphQL query validates against the existing pinned Function schema',()=>{
 const schema=buildSchema(readFileSync(new URL('./original/schema.graphql',import.meta.url),'utf8'));
 const query=parse(readFileSync(new URL('./proposed/cart_transform_run.graphql',import.meta.url),'utf8'));
 assert.deepEqual(validate(schema,query).map(error=>error.message),[]);
});

