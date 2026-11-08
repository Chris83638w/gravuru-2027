import test from 'node:test';
import assert from 'node:assert/strict';
import {compactPricingHistory,encodeFunctionPricing} from './pricing-storage.mjs';
import {resolvedPricingHistory,pricingForLine} from './pricing-history.mjs';
import {cartTransformRun} from './cart_transform_run.mjs';
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
test('later changed prices keep old revision references stable and oversized unique maps cannot publish',()=>{
 const p=encodeFunctionPricing(contract()).pricing,{history,...oldCurrent}=p;
 const later={...structuredClone(oldCurrent),revision:3,variants:{...oldCurrent.variants,'58104613339516':9999},history:[...history,oldCurrent]};
 assert.equal(pricingForLine(line(later,1)).variants['58104613339516'],1748);
 assert.equal(pricingForLine(line(later,2)).variants['58104613339516'],1748);
 assert.equal(pricingForLine(line(later,3)).variants['58104613339516'],9999);
 assert.throws(()=>encodeFunctionPricing(later),/10000-byte/);
});
test('dangling, cyclic, ambiguous and mixed references reject without altering legacy offers',()=>{
 for(const mutate of [p=>p.history[0].variantsFromRevision=99,p=>p.history[0].variantsFromRevision=1,p=>p.history[0].variants={},p=>p.history[0].variantsFromRevision='2',p=>p.variantsFromRevision=1,p=>p.history.push({...p.history[0]})]){
  const p=encodeFunctionPricing(contract()).pricing;mutate(p);assert.throws(()=>encodeFunctionPricing(p));
 }
 const p=contract();p.history[0].legacyOffers=[{offer:'a'.repeat(64),config:'konfig_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',revision:1,quantity:1,unitCents:1748,variantId:'58104613339516'}];
 assert.deepEqual(resolvedPricingHistory(encodeFunctionPricing(p).pricing)[0],p.history[0]);
});
test('missing/omitted pricing fails closed for personalized cart, ordinary product still passes',()=>{
 const l=line(null);assert.throws(()=>cartTransformRun(input(l)),/pricing unavailable/);
 for(const k of ['revision','designFile','logos','motifs','uploads'])delete l[k];
 assert.deepEqual(cartTransformRun(input(l)),{operations:[]});
 l.configuration={value:'konfig_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};l.offer={value:'a'.repeat(64)};
 assert.throws(()=>cartTransformRun(input(l)),/pricing unavailable/);
});
test('unequal price map is never shared and UTF8 bytes are checked before publication',()=>{
 const p=contract();p.history[0].variants['58104613339516']+=1;
 const c=compactPricingHistory(p);assert.deepEqual(c.history[0].variants,p.history[0].variants);assert.throws(()=>encodeFunctionPricing(c));
 const one=contract();one.history=[];one.note='ä'.repeat(6000);assert.throws(()=>encodeFunctionPricing(one));
});
