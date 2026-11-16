import test from 'node:test';
import assert from 'node:assert/strict';
import {compactPricingHistory,encodeFunctionPricing} from './pricing-storage.mjs';
import {resolvedPricingHistory,pricingForLine,expandPricingVariants} from './pricing-history.mjs';
import {cartTransformRun} from './cart_transform_run.mjs';
import {cartTransformStrict as strictTransform,cartTransformRun as isolatedTransform,rejectedPricingLines} from './cart_transform_run.mjs';

// Chris 15.11.2026: Abgewiesene Positionen sperren nicht mehr den ganzen Warenkorb. Streng geprüft
// wird weiter: die bisherige Prüfung wirft, die Position bekommt keinen Preis und steht auf der Sperrliste.
function assertRejected(value,pattern){
 if(pattern)assert.throws(()=>strictTransform(structuredClone(value)),pattern);else assert.throws(()=>strictTransform(structuredClone(value)));
 const rejected=rejectedPricingLines(structuredClone(value));assert.ok(rejected.length>0,'Position steht auf der Sperrliste');
 const ops=isolatedTransform(structuredClone(value)).operations;
 for(const r of rejected)assert.ok(!ops.some(o=>o.lineUpdate?.cartLineId===r.lineId&&o.lineUpdate.price),'abgewiesene Position ohne Preis');
}

const productId='gid://shopify/Product/16190784438652';
function contract(){
 const variants=Object.fromEntries(Array.from({length:404},(_,i)=>[String(58104613339516+i*32768),1748+i]));
 const old={schema:'gravuru-personalization-pricing/v1',enabled:true,productId,revision:1,currency:'EUR',variants,extraMotifCents:169,extraPhotoCents:999};
 return {...structuredClone(old),schema:'gravuru-personalization-pricing/v2',revision:2,extraLogoCents:1299,history:[structuredClone(old)]};
}
function line(p,revision=2,variantId='58104613339516',logos=1){return {id:'line',quantity:1,revision:{value:String(revision)},designFile:{value:'saved-design'},motifs:{value:'0'},uploads:{value:'0'},logos:{value:String(logos)},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/'+variantId,product:{id:productId,pricing:{jsonValue:p}}}};}
const input=l=>({presentmentCurrencyRate:'1',cart:{lines:[l]}});
test('404 complete current and old variant prices survive below the Function input limit',()=>{
 const before=contract(),snapshot=structuredClone(before),{pricing:after,value,bytes}=encodeFunctionPricing(before);
 assert.ok(Buffer.byteLength(JSON.stringify(before))>10000);assert.ok(bytes<10000);assert.equal(bytes,Buffer.byteLength(value));
 assert.deepEqual(before,snapshot);assert.equal(after.history[0].variantsFromRevision,2);assert.equal(after.history[0].variants,undefined);
 assert.deepEqual(resolvedPricingHistory(after),before.history);
 for(const id of Object.keys(before.variants))for(const revision of [1,2])for(const logos of revision===2?[0,1,4]:[0]){
  assert.deepEqual(cartTransformRun(input(line(after,revision,id,logos))),cartTransformRun(input(line(before,revision,id,logos))));
 }
 assert.equal(cartTransformRun(input(line(after))).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'30.47');
 assert.deepEqual(compactPricingHistory(after),after);
});
test('later changed prices keep old revision references stable after recompaction',()=>{
 const p=expandPricingVariants(encodeFunctionPricing(contract()).pricing),{history,...oldCurrent}=p;
 const later={...structuredClone(oldCurrent),revision:3,variants:{...oldCurrent.variants,'58104613339516':9999},history:[...history,oldCurrent]};
 assert.equal(pricingForLine(line(later,1)).variants['58104613339516'],1748);
 assert.equal(pricingForLine(line(later,2)).variants['58104613339516'],1748);
 assert.equal(pricingForLine(line(later,3)).variants['58104613339516'],9999);
 const after=encodeFunctionPricing(later).pricing;
 assert.deepEqual({...expandPricingVariants(after),history:resolvedPricingHistory(after)},{...later,history:resolvedPricingHistory(later)});
 for(const revision of [1,2,3])assert.deepEqual(cartTransformRun(input(line(after,revision,undefined,0))),cartTransformRun(input(line(later,revision,undefined,0))));
});
test('dangling, cyclic, ambiguous and mixed references reject without altering legacy offers',()=>{
 for(const mutate of [p=>p.history[0].variantsFromRevision=99,p=>p.history[0].variantsFromRevision=1,p=>p.history[0].variants={},p=>p.history[0].variantsFromRevision='2',p=>p.variantsFromRevision=1,p=>p.history.push({...p.history[0]})]){
  const p=encodeFunctionPricing(contract()).pricing;mutate(p);assert.throws(()=>encodeFunctionPricing(p));
 }
 const p=contract();p.history[0].legacyOffers=[{offer:'a'.repeat(64),config:'konfig_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',revision:1,quantity:1,unitCents:1748,variantId:'58104613339516'}];
 assert.deepEqual(resolvedPricingHistory(encodeFunctionPricing(p).pricing)[0],p.history[0]);
});
test('missing/omitted pricing fails closed for personalized cart, ordinary product still passes',()=>{
 const l=line(null);assertRejected(input(l),/pricing unavailable/);
 for(const k of ['revision','designFile','logos','motifs','uploads'])delete l[k];
 assert.deepEqual(cartTransformRun(input(l)),{operations:[]});
 l.configuration={value:'konfig_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};l.offer={value:'a'.repeat(64)};
 assertRejected(input(l),/pricing unavailable/);
});
test('unequal prices retain explicit historical deltas and UTF8 bytes are checked',()=>{
 const p=contract();p.history[0].variants['58104613339516']+=1;
 const c=compactPricingHistory(p);assert.deepEqual(c.history[0].variantDeltas,[[1,'0']]);assert.deepEqual(resolvedPricingHistory(c),p.history);assert.ok(encodeFunctionPricing(c).bytes<10000);
 const one=contract();one.history=[];one.note='ä'.repeat(6000);assert.throws(()=>encodeFunctionPricing(one));
});

test('historical delta ranges are strict, disjoint and preserve zero or higher prices',()=>{
 const p=contract();p.history[0].variants['58104613339516']+=20;
 for(const bad of [[],[[0,'0']],[[20,'01']],[[20,'1-0']],[[20,'0-0']],[[20,'404']],[[20,'0,0']],[[20,'0'],[30,'0']],[[20,'0'],[20,'1']],[[20,'9007199254740992']],[[20,'1,0']],[[20,'0-999999999']],[[20,'']],[[20,0]],[[-99999,'0']]]){
  const c=compactPricingHistory(p);c.history[0].variantDeltas=bad;assert.throws(()=>resolvedPricingHistory(c));
 }
 const unbound=contract();unbound.history[0].variantDeltas=[[1,'0']];assert.throws(()=>resolvedPricingHistory(unbound));
 const c=compactPricingHistory(p);c.history[0].variantDeltas=[[-1748,'0']];assert.equal(resolvedPricingHistory(c)[0].variants['58104613339516'],0);
 const changedKeys=contract();delete changedKeys.history[0].variants['58104613339516'];assert.deepEqual(resolvedPricingHistory(encodeFunctionPricing(changedKeys).pricing),changedKeys.history);
});

test('sequence IDs, prices and mutually exclusive table representations are exact',()=>{
 const p=encodeFunctionPricing(contract()).pricing;assert.equal(p.variants,undefined);assert.equal(p.variantSequence.prices36.length,404*p.variantSequence.width);assert.deepEqual(expandPricingVariants(p).variants,contract().variants);
 for(const mutate of [p=>p.variants={},p=>p.variantSequence.step=0,p=>p.variantSequence.step=0.5,p=>p.variantSequence.first='058104613339516',p=>p.variantSequence.first='9007199254740991',p=>{p.variantSequence.width=6;p.variantSequence.prices36='zzzzzz'+p.variantSequence.prices36.slice(6)},p=>p.variantSequence.prices36='!'+p.variantSequence.prices36.slice(1),p=>p.variantSequence.width=0,p=>p.variantSequence.width=7,p=>p.variantSequence.prices36+='0',p=>p.variantSequence.prices=[],p=>p.variantSequence.extra=1,p=>p.history[0].variantSequence=p.variantSequence]){
  const c=structuredClone(p);mutate(c);assert.throws(()=>encodeFunctionPricing(c));
 }
 assert.throws(()=>pricingForLine(line(p,2,'58104613339517')),/Missing historical variant/);
 const unordered=contract();unordered.variants=Object.fromEntries(Object.entries(unordered.variants).reverse());assert.deepEqual(expandPricingVariants(encodeFunctionPricing(unordered).pricing).variants,contract().variants);
 const nonSequence=contract();nonSequence.variants['58104613339517']=1234;const c=encodeFunctionPricing({...nonSequence,history:[]}).pricing;assert.ok(c.variants);assert.equal(c.variantSequence,undefined);
});

test('raw input cache is isolated by the complete contract and by Function invocation',()=>{
 const first=contract(),second=contract();second.variants['58104613339516']+=117;
 const a=encodeFunctionPricing(first).pricing,b=encodeFunctionPricing(second).pricing;
 const raw=l=>{const r=structuredClone(l),f=r.merchandise.product.pricing;r.merchandise.product.pricing={value:JSON.stringify(f.jsonValue)};return r;};
 const lines=[line(a,2),line(b,2),line(a,1,undefined,0),line(b,1,undefined,0)];
 const invoke=ls=>cartTransformRun({presentmentCurrencyRate:'1',cart:{lines:ls}});
 assert.deepEqual(invoke(lines.map(raw)),invoke(lines));assert.deepEqual(invoke(lines.toReversed().map(raw)),invoke(lines.toReversed()));
 const strictInvoke=ls=>strictTransform({presentmentCurrencyRate:'1',cart:{lines:ls}});
 const bad=structuredClone(b);bad.currency='USD';assert.throws(()=>strictInvoke([raw(lines[0]),raw(line(bad))]));
 // Einzelsperre: die gültige Position behält ihren Preis, nur die fehlerhafte steht auf der Sperrliste.
 assert.deepEqual(invoke([raw(lines[0]),raw(line(bad))]).operations,invoke([raw(lines[0])]).operations);assert.deepEqual(rejectedPricingLines({presentmentCurrencyRate:'1',cart:{lines:[raw(lines[0]),raw(line(bad))]}}).map(r=>r.index),[1]);
 const other=structuredClone(b);other.productId='gid://shopify/Product/9';for(const h of other.history)h.productId=other.productId;
 const mixed=line(other);mixed.merchandise.product.id=other.productId;assert.deepEqual(invoke([raw(lines[0]),raw(mixed)]),invoke([lines[0],mixed]));
 const changed=contract();changed.variants['58104613339516']+=999;const c=encodeFunctionPricing(changed).pricing;assert.deepEqual(invoke([raw(line(c))]),invoke([line(c)]));
 const malformed=raw(line(a));malformed.merchandise.product.pricing.value='{';assert.throws(()=>strictInvoke([malformed]));assertRejected({presentmentCurrencyRate:'1',cart:{lines:[malformed]}});
});

test('independent historical ID sequences never look up the selected variant in an unrelated revision',()=>{
 const base={schema:'gravuru-personalization-pricing/v1',enabled:true,productId,currency:'EUR',extraMotifCents:169,extraPhotoCents:999};
 const make=(revision,offset)=>({...base,revision,variants:Object.fromEntries(Array.from({length:8},(_,i)=>[String(58104613339516+offset+i),1000+i]))});
 const p={...make(3,0),history:[make(1,100),make(2,200)]},compact=encodeFunctionPricing(p).pricing;
 const selected=line(p,1,'58104613339616',0),after=line(compact,1,'58104613339616',0);
 assert.deepEqual(cartTransformRun(input(after)),cartTransformRun(input(selected)));
 after.merchandise.product.pricing={value:JSON.stringify(compact)};assert.deepEqual(cartTransformRun(input(after)),cartTransformRun(input(selected)));
});
