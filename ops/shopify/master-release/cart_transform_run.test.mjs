import test from 'node:test';
import assert from 'node:assert/strict';
import {cartTransformRun as live} from './price-v1.mjs';
import {cartTransformRun as master} from './cart_transform_run.mjs';
import {cartTransformStrict as strictTransform,cartTransformRun as isolatedTransform,rejectedPricingLines} from './cart_transform_run.mjs';

// Chris 15.11.2026: Abgewiesene Positionen sperren nicht mehr den ganzen Warenkorb. Streng geprüft
// wird weiter: die bisherige Prüfung wirft, die Position bekommt keinen Preis und steht auf der Sperrliste.
function assertRejected(value,pattern){
 if(pattern)assert.throws(()=>strictTransform(structuredClone(value)),pattern);else assert.throws(()=>strictTransform(structuredClone(value)));
 const rejected=rejectedPricingLines(structuredClone(value));assert.ok(rejected.length>0,'Position steht auf der Sperrliste');
 const ops=isolatedTransform(structuredClone(value)).operations;
 for(const r of rejected)assert.ok(!ops.some(o=>o.lineUpdate?.cartLineId===r.lineId&&o.lineUpdate.price),'abgewiesene Position ohne Preis');
}

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
test('V3 checkout rejects tampered selections directly and keeps earlier carts in a mixed cart unchanged',()=>{
 const v3=()=>{const v=input({withTiers:false}),l=v.cart.lines[0];l.merchandise.product.pricing.jsonValue.schema='gravuru-personalization-pricing/v3';l.merchandise.product.pricing.jsonValue.optionPrices={silikon:699,'staender-klar':1399};l.options={value:'silikon,staender-klar'};return v;};
 assert.equal(master(v3()).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'40.97');
 for(const value of [undefined,'','constructor','silikon,silikon','silikon:1','staender-klar,silikon']){const v=v3();v.cart.lines[0].options.value=value;assertRejected(v);}
 const old=input({motifs:1}),logo=input({v2:true,logos:1}),newOptions=v3();logo.cart.lines[0].id='logo';newOptions.cart.lines[0].id='options';
 assert.deepEqual(master({...old,cart:{lines:[...old.cart.lines,...logo.cart.lines,...newOptions.cart.lines]}}).operations,[...live(old).operations,...master(logo).operations,...master(newOptions).operations]);
 const historical=v3(),line=historical.cart.lines[0],prior=structuredClone(line.merchandise.product.pricing.jsonValue);line.merchandise.product.pricing.jsonValue={...prior,revision:2,history:[prior]};assert.deepEqual(master(historical),master(v3()));
});
test('invalid or unpriced logos, invalid scopes and stale pricing fail closed',()=>{
 for(const change of [
  v=>v.cart.lines[0].logos.value='5',v=>v.cart.lines[0].logos.value='-1',v=>v.cart.lines[0].uploads.value='4',
  v=>v.cart.lines[0].revision.value='2',v=>v.cart.lines[0].merchandise.product.pricing.jsonValue.extraLogoCents=0,
  v=>delete v.cart.lines[0].merchandise.product.pricing.jsonValue.quantityTierScope,
  v=>v.cart.lines[0].merchandise.product.pricing.jsonValue.enabled=false,
 ]){const v=input({v2:true,logos:1});change(v);assertRejected(v);}
 assertRejected(input({logos:1}));
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
 assertRejected(oldD8(),/Invalid personalization quantity/);
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
 for(const mutate of mutations){const v=registerOld(oldD8());mutate(v.cart.lines[0]);assertRejected(v);}
 const v=registerOld(oldD8());v.presentmentCurrencyRate='0';assertRejected(v);
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
 current.cart.lines[0].logos.value='1';assertRejected(current,/Logo requires V2/);
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
 for(const mutate of mutations){const value=withHistory(input({v2:true,logos:1}));mutate(value.cart.lines[0]);assertRejected(value);}
 for(const mutate of [l=>l.offer.value='e'.repeat(64),l=>l.quantity=2,l=>l.configRevision.value='9']){
  const value=withHistory(registerOld(oldD8()));mutate(value.cart.lines[0]);assertRejected(value);
 }
});
