import test from 'node:test';
import assert from 'node:assert/strict';
import {cartTransformRun as live} from './price-v1.mjs';
import {cartTransformRun as master} from './cart_transform_run.mjs';
const productId='gid://shopify/Product/16077798965628',variantId='gid://shopify/ProductVariant/57265913332092';
const tiers=[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}];
function input({v2=false,quantity=1,motifs=0,uploads=0,logos=0,rate='1',withTiers=true}={}){
 const pricing={schema:'gravuru-personalization-pricing/v'+(v2?2:1),enabled:true,productId,revision:1,currency:'EUR',variants:{57265913332092:1999},extraMotifCents:169,extraPhotoCents:500,...(v2?{extraLogoCents:1299}:{}),...(withTiers?{quantityTiers:tiers,quantityTierScope:'complete-unit'}:{})};
 return {presentmentCurrencyRate:rate,cart:{lines:[{id:'line',quantity,motifs:{value:String(motifs)},uploads:{value:String(uploads)},logos:{value:String(logos)},revision:{value:'1'},designFile:{value:'saved-design'},merchandise:{__typename:'ProductVariant',id:variantId,product:{id:productId,pricing:{jsonValue:pricing}}}}]}};
}
test('all released V1 prices and discounts remain exact for quantities, photos, motifs and currencies',()=>{
 for(const quantity of [1,2,3,4,5,9,10,99])for(const motifs of [0,1,2,200])for(const uploads of [0,1,4])for(const rate of ['1','1.23','0.87'])for(const withTiers of [true,false]){
  const value=input({quantity,motifs,uploads,rate,withTiers});assert.deepEqual(master(value),live(value));
 }
});
test('V2 applies 12.99 per logo and discounts complete unit once with the released cent rounding',()=>{
 for(const quantity of [1,3,5,10,99])for(const logos of [0,1,2,4])for(const motifs of [0,1,2]){
  const value=input({v2:true,quantity,logos,motifs});
  const old=input({quantity,motifs});old.cart.lines[0].merchandise.product.pricing.jsonValue.variants[57265913332092]+=logos*1299;
  assert.deepEqual(master(value),live(old));
 }
 assert.equal(master(input({v2:true,logos:1,motifs:1})).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'34.67');
});
test('invalid or unpriced logos, invalid scopes and stale pricing fail closed',()=>{
 for(const change of [
  v=>v.cart.lines[0].logos.value='5',v=>v.cart.lines[0].logos.value='-1',v=>v.cart.lines[0].uploads.value='4',
  v=>v.cart.lines[0].revision.value='2',v=>v.cart.lines[0].merchandise.product.pricing.jsonValue.extraLogoCents=0,
  v=>delete v.cart.lines[0].merchandise.product.pricing.jsonValue.quantityTierScope,
  v=>v.cart.lines[0].merchandise.product.pricing.jsonValue.enabled=false,
 ]){const v=input({v2:true,logos:1});change(v);assert.throws(()=>master(v));}
 assert.throws(()=>master(input({logos:1})));
});
test('mixed carts preserve existing lines and add only trusted checkout images',()=>{
 const old=input({quantity:3,motifs:2}),added=input({v2:true,logos:1});added.cart.lines[0].id='logo';
 const mixed={...old,cart:{lines:[...old.cart.lines,...added.cart.lines,{id:'normal',merchandise:{__typename:'ProductVariant',id:variantId,product:{id:productId}}}]}};
 assert.deepEqual(master(mixed).operations,[...live(old).operations,...master(added).operations]);
 const line=mixed.cart.lines[1];line.configuration={value:'konfig_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};line.configRevision={value:'1'};line.offer={value:'a'.repeat(64)};
 line.checkoutImage={value:'https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+'a'.repeat(64)+'.png'};
 assert.deepEqual(master(mixed).operations[1].lineUpdate.image,{url:line.checkoutImage.value});
 line.checkoutImage.value='https://example.org/private.png';assert.equal(master(mixed).operations[1].lineUpdate.image,undefined);
});

function oldD8(){
 const v=input({v2:true}),line=v.cart.lines[0];
 for(const key of ['motifs','uploads','logos','revision','designFile'])delete line[key];
 line.configuration={value:'konfig_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};
 line.configRevision={value:'2'};line.offer={value:'c'.repeat(64)};
 return v;
}
function registerOld(v){
 const l=v.cart.lines[0];
 l.merchandise.product.pricing.jsonValue.legacyOffers=[{offer:l.offer.value,config:l.configuration.value,revision:2,variantId:'57265913332092',quantity:1,unitCents:1999}];
 return v;
}
test('pre-contract cart reproduces live failure; only an app-owned saved-offer match preserves it',()=>{
 assert.throws(()=>master(oldD8()),/Invalid personalization quantity/);
 const v=registerOld(oldD8());
 assert.equal(master(v).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'19.99');
 const current=input({v2:true,logos:1,motifs:1});current.cart.lines[0].id='new-logo';
 const photo=input({uploads:1,motifs:1});photo.cart.lines[0].id='existing-photo';
 const combined={...v,cart:{lines:[...v.cart.lines,...current.cart.lines,...photo.cart.lines]}};
 assert.deepEqual(master(combined).operations,[...master(current).operations,...live(photo).operations,...master(v).operations]);
});
test('legacy migration cannot authorize altered offers, designs, variants, quantity or new personalization',()=>{
 const mutations=[
  l=>l.offer.value='d'.repeat(64),l=>l.configuration.value='konfig_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  l=>l.configRevision.value='3',l=>l.quantity=2,l=>l.merchandise.id='gid://shopify/ProductVariant/9',
  ...['motifs','uploads','logos','revision','designFile'].map(k=>l=>l[k]={value:'0'}),
  l=>l.merchandise.product.id='gid://shopify/Product/9',
  l=>l.merchandise.product.pricing.jsonValue.currency='USD',
  l=>l.merchandise.product.pricing.jsonValue.legacyOffers.push(l.merchandise.product.pricing.jsonValue.legacyOffers[0]),
  l=>l.merchandise.product.pricing.jsonValue.legacyOffers[0].unitCents=-1,
  l=>l.merchandise.product.pricing.jsonValue.legacyOffers[0].quantity=1.5,
  l=>l.merchandise.product.pricing.jsonValue.legacyOffers[0].extra='untrusted',
 ];
 for(const mutate of mutations){const v=registerOld(oldD8());mutate(v.cart.lines[0]);assert.throws(()=>master(v));}
 const v=registerOld(oldD8());v.presentmentCurrencyRate='0';assert.throws(()=>master(v));
 const current=input({v2:true,logos:1});current.cart.lines[0].merchandise.product.pricing.jsonValue.legacyOffers=registerOld(oldD8()).cart.lines[0].merchandise.product.pricing.jsonValue.legacyOffers;
 assert.deepEqual(master(current),master(input({v2:true,logos:1})));
});

function withHistory(value){
 const line=value.cart.lines[0],previous=structuredClone(line.merchandise.product.pricing.jsonValue);
 line.merchandise.product.pricing.jsonValue={...input().cart.lines[0].merchandise.product.pricing.jsonValue,revision:2,history:[previous]};
 return value;
}
test('new no-logo contract preserves saved V2 and exact legacy carts without mutating input',()=>{
 for(const quantity of [1,3,5,10])for(const logos of [0,1,4]){
  const old=input({v2:true,quantity,logos,motifs:2}),updated=withHistory(structuredClone(old)),before=structuredClone(updated);
  assert.deepEqual(master(updated),master(old));assert.deepEqual(updated,before);
 }
 const legacy=registerOld(oldD8());assert.deepEqual(master(withHistory(structuredClone(legacy))),master(legacy));
 const current=withHistory(input({v2:true,motifs:1}));current.cart.lines[0].revision.value='2';
 const expected=input({motifs:1});expected.cart.lines[0].revision.value='2';expected.cart.lines[0].merchandise.product.pricing.jsonValue.revision=2;
 assert.deepEqual(master(current),live(expected));
 current.cart.lines[0].logos.value='1';assert.throws(()=>master(current),/Logo requires V2/);
});
test('historical contracts cannot weaken revision, legacy offer or product validation',()=>{
 const mutations=[
  l=>l.revision.value='3',
  l=>l.merchandise.product.pricing.jsonValue.history[0].revision=2,
  l=>l.merchandise.product.pricing.jsonValue.history[0].enabled=false,
  l=>l.merchandise.product.pricing.jsonValue.history[0].productId='gid://shopify/Product/9',
  l=>l.merchandise.product.pricing.jsonValue.history[0].currency='USD',
  l=>l.merchandise.product.pricing.jsonValue.history[0].history=[],
  l=>l.merchandise.product.pricing.jsonValue.history.push(l.merchandise.product.pricing.jsonValue.history[0]),
 ];
 for(const mutate of mutations){const value=withHistory(input({v2:true,logos:1}));mutate(value.cart.lines[0]);assert.throws(()=>master(value));}
 for(const mutate of [l=>l.offer.value='e'.repeat(64),l=>l.quantity=2,l=>l.configRevision.value='9']){
  const value=withHistory(registerOld(oldD8()));mutate(value.cart.lines[0]);assert.throws(()=>master(value));
 }
});
