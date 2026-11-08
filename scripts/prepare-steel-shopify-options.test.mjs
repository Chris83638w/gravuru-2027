import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareSteelOptions,verifySteelOptions,compareSteelShopProduct,renderSteelOptions} from './prepare-steel-shopify-options.mjs';

// Exact catalogue blob also independently compared against the 04.11 Excel.
const source={commit:'3c6051fbbc7904969948950fae12cae2ae663f30',blob:'2e046d4a26bb524cfb15efad1b281ba316a7f0ea'};
const bytes=fs.readFileSync(new URL('./fixtures/steel-shopify-options/family.json',import.meta.url));
const plan=prepareSteelOptions(bytes,source);
const identity={productId:'gid://shopify/Product/91',skuPrefix:'fixture-',shopDomain:'gravuru-design.myshopify.com',currency:'EUR'};
function remote(){return {id:identity.productId,status:'DRAFT',variants:{pageInfo:{hasNextPage:false},nodes:plan.rows.flatMap(r=>r.variants.map(v=>({sku:identity.skuPrefix+r.sizeKey+'-'+v.mountingId,price:(v.unitPriceCents/100).toFixed(2)}))).map((v,i)=>({...v,id:'gid://shopify/ProductVariant/'+(1000+i)}))}};}

test('real pinned catalogue retains all eight forms, 80 sizes and 404 valid combinations',()=>{
 assert.deepEqual(plan.counts,{forms:8,sizes:80,combinations:404});
 assert.deepEqual(Object.fromEntries(plan.forms.map(f=>[f.key,f.sizes])),{RE:27,AB:10,QU:7,OV:10,EL:7,R:5,RT1:7,RT2:7});
 assert.equal(plan.source.sha256,'0c1cfeb0a185c9f58f1ca9c70d9d733da1297df52d3227866fc47d4671771e42');
 assert.equal(plan.confirmation.status,'pending');assert.equal(plan.productsCreated,0);assert.equal(plan.shopifyWrites,0);
});
test('small plate has no invented four-hole options; exact source dimensions and hole geometry remain',()=>{
 const small=plan.rows.find(r=>r.sizeKey==='GR-ES-RE-80X20-T15');
 assert.equal(small.basePriceCents,949);assert.deepEqual(small.variants.map(v=>v.mountingId),['K00','KGL','KRA','B02','B02S']);
 assert.equal(small.variants.find(v=>v.mountingId==='B02S').unitPriceCents,1218);
 assert.equal(small.variants.find(v=>v.mountingId==='B02').holes.length,2);
 assert.ok(small.variants.find(v=>v.mountingId==='B02').holes.every(h=>h.diameter===4));
 const exact=plan.rows.find(r=>r.sizeKey==='GR-ES-RE-70X23P3-T15');assert.equal(exact.heightMm,23.3);
 const large=plan.rows.find(r=>r.sizeKey==='GR-ES-RE-300X200-T15');
 assert.equal(large.basePriceCents,7499);assert.equal(large.variants.find(v=>v.mountingId==='B04S').unitPriceCents,7828);
});
test('modified bytes, a partial catalogue and tampered review cannot reuse the old review',()=>{
 assert.throws(()=>prepareSteelOptions(Buffer.concat([bytes,Buffer.from(' ')]),source),/Git-Stand/);
 const family=JSON.parse(bytes);family.sizes.pop();const changed=Buffer.from(JSON.stringify(family));
 const blob=createHash('sha1').update('blob '+changed.length+'\0').update(changed).digest('hex');
 assert.throws(()=>prepareSteelOptions(changed,{...source,blob}),/Form\/Größenbestand/);
 const edited=structuredClone(plan);edited.rows[0].basePriceCents=1;
 assert.throws(()=>verifySteelOptions(edited,bytes),/erneut anzeigen/);
 const approved=structuredClone(plan);approved.confirmation.status='confirmed';
 assert.throws(()=>verifySteelOptions(approved,bytes),/erneut anzeigen/);
 assert.deepEqual(verifySteelOptions(plan,bytes),plan);
});
test('matching remote IDs are retained without granting create or write authority',()=>{
 const result=compareSteelShopProduct(plan,remote(),identity);
 assert.equal(result.mappingComplete,true);assert.equal(result.pricesMatch,true);assert.equal(result.matched.length,404);
 assert.equal(result.matched[0].shopifyVariantId,'gid://shopify/ProductVariant/1000');
 assert.equal(result.creationAllowed,false);assert.equal(result.writesAllowed,false);
});
test('additional accessory fields cannot disappear from the confirmation overview',()=>{
 const f=JSON.parse(bytes);f.options=[{id:'extra',label:'Zusätzliches Zubehör',kind:'checkbox',priceCents:299}];
 const b=Buffer.from(JSON.stringify(f)),blob=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 assert.throws(()=>prepareSteelOptions(b,{...source,blob}),/Zusatzfelder benötigen/);
});
test('captured real Shopify candidate contains all 404 matching prices without authorizing a write',()=>{
 const readback=JSON.parse(fs.readFileSync(new URL('../docs/reviews/2026-11-08-steel-shopify/existing-product-readback.json',import.meta.url)));
 const result=compareSteelShopProduct(plan,readback.product,{productId:'gid://shopify/Product/16190784438652',skuPrefix:readback.skuPrefix,shopDomain:readback.shop.domain,currency:readback.shop.currencyCode});
 assert.equal(result.readVariants,404);assert.equal(result.mappingComplete,true);assert.equal(result.pricesMatch,true);assert.equal(result.writesAllowed,false);
 assert.equal(result.nativeSessionBindingVerified,false);
 const saved=JSON.parse(fs.readFileSync(new URL('../docs/reviews/2026-11-08-steel-shopify/options-plan.json',import.meta.url)));
 assert.deepEqual(verifySteelOptions(saved,bytes),plan);
});
test('changed price and missing/unexpected variants produce a blocked reconciliation',()=>{
 const product=remote();product.variants.nodes[0].price='0.01';product.variants.nodes.pop();
 product.variants.nodes.push({id:'gid://shopify/ProductVariant/9999',sku:'foreign',price:'1.00'});
 const result=compareSteelShopProduct(plan,product,identity);
 assert.equal(result.mappingComplete,false);assert.equal(result.pricesMatch,false);assert.equal(result.changes.length,1);
 assert.deepEqual(result.issues.map(i=>i.code),['unexpected_variant','missing_variant']);
});
test('partial, duplicate, wrong-shop and wrong-product readbacks fail before mapping',()=>{
 const partial=remote();partial.variants.pageInfo.hasNextPage=true;
 assert.throws(()=>compareSteelShopProduct(plan,partial,identity),/Alle Varianten/);
 const duplicate=remote();duplicate.variants.nodes[1].sku=duplicate.variants.nodes[0].sku;
 assert.throws(()=>compareSteelShopProduct(plan,duplicate,identity),/Doppelte/);
 assert.throws(()=>compareSteelShopProduct(plan,remote(),{...identity,shopDomain:'other.myshopify.com'}),/Shop/);
 assert.throws(()=>compareSteelShopProduct(plan,remote(),{...identity,productId:'gid:\/\/shopify\/Product\/99'}),/eindeutig/);
});
test('human review contains all source rows and no hidden defaults or product creation claim',()=>{
 const review=renderSteelOptions(plan);
 assert.equal(review.split('\n').filter(l=>l.startsWith('| ')&&!l.startsWith('| Kataloggröße')).length,80);
 assert.match(review,/Noch nicht bestätigt/);assert.match(review,/Form → Größe → Befestigung/);
 assert.match(review,/23\.3/);assert.match(review,/Retro 2/);
});
