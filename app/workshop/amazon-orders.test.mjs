import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAmazonOrder,normalizeAmazonOrderQuery,amazonMoney} from './amazon-orders.mjs';

export const amazonTestOrder=(patch={})=>({orderId:'TEST-ORDER-01',createdTime:'2026-10-15T10:00:00Z',lastUpdatedTime:'2026-10-15T11:00:00Z',salesChannel:{channelName:'AMAZON',marketplaceId:'A1PA6795UKMFR9'},fulfillment:{fulfillmentStatus:'UNSHIPPED',fulfilledBy:'MERCHANT',shipByWindow:{latestDateTime:'2026-10-19T20:00:00Z'}},orderItems:[{orderItemId:'TEST-ITEM-01',quantityOrdered:2,product:{sellerSku:'TEST-SLATE-01',asin:'B000TEST01',title:'Synthetischer Produkttitel',price:{unitPrice:{amount:'29.99',currencyCode:'EUR'}}},fulfillment:{quantityFulfilled:0,quantityUnfulfilled:2}}],...structuredClone(patch)});
const options={provenance:'synthetic',marketplaceIds:['A1PA6795UKMFR9']};

test('v2026 projection omits buyer, recipient, free text, signed custom URL and unknown fields',()=>{
 const raw=amazonTestOrder();raw.buyer={name:'PRIVATE-CUSTOMER',email:'SECRET@example.invalid'};raw.recipient={address:{addressLine1:'PRIVATE-ADDRESS'}};raw.secret='PRIVATE-KEY';raw.orderItems[0].product.customization={customizedUrl:'https://example.invalid/file?signature=PRIVATE-SIGNATURE'};raw.orderItems[0].cancellation={cancellationRequest:{requester:'BUYER',cancelReason:'PRIVATE-REASON'}};
 const projected=normalizeAmazonOrder(raw,options),text=JSON.stringify(projected);
 assert.ok(!text.includes('PRIVATE'));assert.ok(!text.includes('example.invalid'));assert.ok(!text.includes('Produkttitel'));assert.equal(projected.items[0].customizationAvailable,true);assert.equal(projected.items[0].cancellationRequested,true);assert.equal(projected.items[0].unitCents,2999);assert.equal(projected.items[0].totalCents,5998);assert.equal(projected.fulfillmentStatus,'UNSHIPPED');
});
test('explicit trusted test provenance and marketplace allowlist are required',()=>{
 for(const provenance of [undefined,'live','production',true])assert.throws(()=>normalizeAmazonOrder(amazonTestOrder(),{provenance}),/zugelassen/);
 assert.throws(()=>normalizeAmazonOrder(amazonTestOrder(),{...options,marketplaceIds:['OTHER']}),/Marktplatz/);
 assert.throws(()=>normalizeAmazonOrder({...amazonTestOrder(),test:true},{}),/zugelassen/);
});
test('normalization rejects ambiguous items, unsafe quantities, malformed dates and money',()=>{
 const raw=amazonTestOrder();
 assert.throws(()=>normalizeAmazonOrder({...raw,orderItems:[...raw.orderItems,...raw.orderItems]},options),/Doppelte/);
 for(const n of [-1,1.5,100001,Number.MAX_SAFE_INTEGER])assert.throws(()=>normalizeAmazonOrder({...raw,orderItems:[{...raw.orderItems[0],quantityOrdered:n}]},options),/Menge/);
 assert.throws(()=>normalizeAmazonOrder({...raw,lastUpdatedTime:'2026-10-14T10:00:00Z'},options),/vor der/);
 assert.throws(()=>normalizeAmazonOrder({...raw,lastUpdatedTime:'yesterday'},options),/Änderungszeit/);
 assert.throws(()=>normalizeAmazonOrder({...raw,orderItems:[{...raw.orderItems[0],fulfillment:{quantityFulfilled:3}}]},options),/Versandmenge/);
 for(const amount of ['1e3','1.009','-1.00',2.99,'99999999999999999'])assert.throws(()=>amazonMoney({amount,currencyCode:'EUR'}));
 assert.deepEqual(amazonMoney({amount:'0.1',currencyCode:'EUR'}),{cents:10,currency:'EUR'});
 assert.throws(()=>amazonMoney({amount:'10',currencyCode:'JPY'}),/Währung/);
});
test('missing optional money remains unknown, unit price and proceeds are distinct',()=>{
 const raw=amazonTestOrder();delete raw.orderItems[0].product.price;raw.orderItems[0].proceeds={proceedsTotal:{amount:'49.00',currencyCode:'EUR'}};
 const item=normalizeAmazonOrder(raw,options).items[0];assert.equal(item.unitCents,null);assert.equal(item.totalCents,null);assert.equal(item.proceedsCents,4900);assert.equal(item.currency,'EUR');
 raw.orderItems[0].product.price={unitPrice:{amount:'29.99',currencyCode:'GBP'}};assert.throws(()=>normalizeAmazonOrder(raw,options),/widersprechen/);
});
test('sanitized custom-availability flag preserves the manual-review blocker without any download URL',()=>{
 const raw=amazonTestOrder();raw.orderItems[0].product.customizationAvailable=true;
 assert.equal(normalizeAmazonOrder(raw,options).items[0].customizationAvailable,true);
 for(const value of ['true',1,{},null]){raw.orderItems[0].product.customizationAvailable=value;assert.equal(normalizeAmazonOrder(raw,options).items[0].customizationAvailable,false);}
});
test('checkpoint query has a bounded non-restricted allowlist',()=>{
 const query=normalizeAmazonOrderQuery({lastUpdatedAfter:'2026-10-15T00:00:00Z',marketplaceIds:['A1PA6795UKMFR9'],includedData:['CANCELLATION','PROCEEDS','FULFILLMENT'],fulfilledBy:['MERCHANT'],maxResultsPerPage:100});assert.equal(query.lastUpdatedAfter,'2026-10-15T00:00:00.000Z');
 for(const input of [{buyerEmail:'PRIVATE'},{includedData:['BUYER']},{includedData:['RECIPIENT']},{maxResultsPerPage:101},{marketplaceIds:[]}])assert.throws(()=>normalizeAmazonOrderQuery(input));
});
