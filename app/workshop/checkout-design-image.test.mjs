import test from 'node:test';
import assert from 'node:assert/strict';
import {cartTransformRun} from '../../ops/shopify/checkout-image/cart_transform_run.mjs';
import {checkoutDesignImage,withCheckoutDesignImages} from '../../ops/shopify/checkout-image/cart-image.mjs';
const image='https://cdn.shopify.com/s/files/1/0920/5550/3228/uploads/synthetic.png';
const line=()=>({id:'gid://shopify/CartLine/1',configuration:{value:'konfig_12345678-1234-1234-1234-123456789012'},configRevision:{value:'1'},offer:{value:'a'.repeat(64)},designImage:{value:image},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/2',product:{id:'gid://shopify/Product/3'}}});
test('unpriced D8 gets only its customer image; no price contract or surcharge is invented',()=>{
 const input={cart:{lines:[line()]},presentmentCurrencyRate:'1'};
 assert.deepEqual(cartTransformRun(input),{operations:[{lineUpdate:{cartLineId:line().id,image:{url:image}}}]});
});
test('image joins the same price operation and preserves all trusted pricing checks',()=>{
 const l=line();l.merchandise.product.pricing={jsonValue:{enabled:true,schema:'gravuru-personalization-pricing/v1',productId:l.merchandise.product.id,currency:'EUR',revision:2,variants:{'2':2000},extraMotifCents:169,extraPhotoCents:400}};
 l.revision={value:'2'};l.designFile={value:'saved'};l.motifs={value:'1'};l.uploads={value:'0'};
 const input={cart:{lines:[l]},presentmentCurrencyRate:'1'};
 assert.deepEqual(cartTransformRun(input),{operations:[{lineUpdate:{cartLineId:l.id,price:{adjustment:{fixedPricePerUnit:{amount:'21.69'}}},image:{url:image}}}]});
 l.revision.value='1';assert.throws(()=>cartTransformRun(input),/completed/);
 l.revision.value='2';l.motifs.value='-1';assert.throws(()=>cartTransformRun(input),/quantity/);
});
test('foreign, malformed and missing images leave existing operations intact',()=>{
 for(const value of [image.replace('0920','0000'),image.replace('.png','.jpg'),image.replace('cdn.shopify.com','cdn.shopify.com.evil'),image+'#x','https://evil.example/x.png',undefined])assert.equal(checkoutDesignImage({...line(),designImage:{value}}),null);
 assert.equal(checkoutDesignImage({...line(),offer:null}),null);
 const price={lineUpdate:{cartLineId:line().id,price:{adjustment:{fixedPricePerUnit:{amount:'1.00'}}},title:'Existing'}};
 const original={operations:[price]};const result=withCheckoutDesignImages({cart:{lines:[line()]}},original);
 assert.equal(original.operations[0].lineUpdate.image,undefined);assert.deepEqual(result.operations[0].lineUpdate.price,price.lineUpdate.price);assert.equal(result.operations[0].lineUpdate.title,'Existing');
 const expanded={operations:[{lineExpand:{cartLineId:line().id,expandedCartItems:[]}}]};assert.deepEqual(withCheckoutDesignImages({cart:{lines:[line()]}},expanded),expanded);
});
