import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {prepareCartRequest,verifyCartResponse} from './storefront-cart.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
const shop='gravuru-synthetic.myshopify.com';
const offer=()=>({scope:'test-checkout-only',variantId:'301',quantity:2,unitCents:2999,currency:'EUR',property:{name:'_gravuru_offer',value:randomBytes(32).toString('hex')}});
const response=o=>({data:{cartCreate:{cart:{id:'gid://shopify/Cart/synthetic',checkoutUrl:'https://'+shop+'/checkout/synthetic',lines:{nodes:[{id:'synthetic-line',quantity:o.quantity,attributes:[{key:o.property.name,value:o.property.value}],merchandise:{id:'gid://shopify/ProductVariant/'+o.variantId},cost:{amountPerQuantity:{amount:'29.99',currencyCode:'EUR'},totalAmount:{amount:'59.98',currencyCode:'EUR'}}}],pageInfo:{hasNextPage:false}}},userErrors:[],warnings:[]}}});
test('cart request contains only saved variant, quantity and opaque line reference; never client price or private artwork',()=>{
 const o=offer(),r=prepareCartRequest({...o,photo:'private',text:'private',unitPrice:1});
 assert.deepEqual(r.variables,{input:{lines:[{merchandiseId:'gid://shopify/ProductVariant/301',quantity:2,attributes:[{key:'_gravuru_offer',value:o.property.value}]}]}});
 assert.equal(JSON.stringify(r).includes('private'),false);
 for(const invalid of [{scope:'live'},{quantity:0},{quantity:1.5},{quantity:100},{currency:'USD'},{unitCents:-1},{variantId:'301?shop=other'},{property:{name:'_gravuru_offer',value:'bad'}}])assert.throws(()=>prepareCartRequest({...o,...invalid}),e=>e.status===422);
});
test('cart response must preserve exact saved price, quantity and design; partial results and price changes cannot proceed',()=>{
 const o=offer();assert.equal(verifyCartResponse(response(o),o,shop).paymentConfirmed,false);
 const changes=[r=>r.errors=[{message:'hidden raw error'}],r=>r.data.cartCreate.userErrors.push({message:'No stock'}),r=>r.data.cartCreate.warnings.push({code:'MERCHANDISE_NOT_ENOUGH_STOCK'}),r=>r.data.cartCreate.cart.lines.pageInfo.hasNextPage=true,r=>r.data.cartCreate.cart.lines.nodes.push(r.data.cartCreate.cart.lines.nodes[0]),r=>r.data.cartCreate.cart.lines.nodes[0].quantity=1,r=>r.data.cartCreate.cart.lines.nodes[0].merchandise.id='gid://shopify/ProductVariant/302',r=>r.data.cartCreate.cart.lines.nodes[0].cost.totalAmount.amount='59.00',r=>r.data.cartCreate.cart.lines.nodes[0].cost.amountPerQuantity.currencyCode='USD',r=>r.data.cartCreate.cart.lines.nodes[0].attributes[0].value='f'.repeat(64),r=>r.data.cartCreate.cart.lines.nodes[0].attributes={},r=>r.data.cartCreate.cart.id=9];
 for(const change of changes){const r=response(o);change(r);assert.throws(()=>verifyCartResponse(r,o,shop),e=>e.status===422&&!e.message.includes(o.property.value));}
});
test('checkout redirect accepts only HTTPS on the explicitly bound shop without credentials or foreign host',()=>{
 const o=offer();for(const url of ['http://'+shop+'/checkout','https://foreign.invalid/checkout','https://'+shop+'.foreign.invalid','https://name:password@'+shop,'https://'+shop+':8443/checkout','javascript:alert(1)','bad']){const r=response(o);r.data.cartCreate.cart.checkoutUrl=url;assert.throws(()=>verifyCartResponse(r,o,shop),e=>e.status===422&&!e.message.includes(url));}
});
test('operator cart preview is CSRF protected and binds a private snapshot to its saved revision and price',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-cart-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy}),server=createPreviewServer({workshop:w,outputDirectory:dir});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));w.close();fs.rmSync(dir,{recursive:true,force:true});});const base='http://127.0.0.1:'+server.address().port;
 // Minimal synthetic snapshot exercises the real private store and HTTP adapter; browser acceptance uses an imported design.
 const record={id:'cfg_synthetic',revision:1,status:'draft',document:{schema:'gravuru-form-product/v1',kind:'product',designs:[{}],basePriceCents:2999}};
 const draft=w.customerDrafts.create(record,'design-synthetic',{}),manifest={id:'proof_synthetic',product:{id:record.id,revision:1,basePriceCents:2999,currency:'EUR'},source:{draftId:draft.id,draftRevision:1},photos:[],packageSha256:'a'.repeat(64)};
 w.customerDrafts.capture(draft.id,draft.token,1,{manifest,preview:Buffer.from('<svg/>'),contourPdf:Buffer.alloc(0),package:Buffer.alloc(0),photos:Buffer.alloc(0)});
 const binding=w.orderIntake.bind({shopDomain:shop,variantId:'301',record});const data={bindingId:binding.id,snapshotId:manifest.id,quantity:2};
 const token=(await(await fetch(base+'/api/workshop/session')).json()).csrfToken;
 const post=(d,csrf=token)=>fetch(base+'/api/workshop/order-cart-preview',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrf},body:JSON.stringify(d)});
 assert.equal((await post(data,'wrong')).status,403);assert.equal((await post({...data,unitCents:1})).status,422);assert.equal((await post({...data,quantity:0})).status,422);
 const r=await post(data);assert.equal(r.status,201);assert.equal(r.headers.get('cache-control'),'no-store');const v=await r.json();assert.equal(v.sent,false);assert.equal(v.paymentConfirmed,false);assert.equal(v.summary.totalCents,5998);assert.equal(v.summary.productRevision,1);assert.equal(v.request.variables.input.lines[0].quantity,2);assert.equal(w.orderIntake.list().length,0);assert.equal((await fetch(base+'/werkstatt/warenkorbpruefung/')).status,200);
});
