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
 line.designImage={value:'https://cdn.shopify.com/s/files/1/0920/5550/3228/uploads/master_test.png'};
 assert.deepEqual(master(mixed).operations[1].lineUpdate.image,{url:line.designImage.value});
 line.designImage.value='https://example.org/private.png';assert.equal(master(mixed).operations[1].lineUpdate.image,undefined);
});
