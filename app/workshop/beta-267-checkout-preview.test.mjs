import test from 'node:test';
import assert from 'node:assert/strict';
import {attachCheckoutPreview,resolveCheckoutPreview} from './beta-267-checkout-preview.mjs';

const slow=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('preview-first returns the secured personal image without waiting for Shopify',async()=>{
 const started=performance.now();
 const resolved=await resolveCheckoutPreview({checkoutImage:async()=>{await slow(400);return 'https://cdn.shopify.com/s/files/a.png';},source:'https://app.example/gestaltung/a.png',hasSecuredPreview:true,previewFirst:true,budgetMs:0});
 assert.equal(resolved.hosted,null);assert.equal(resolved.status,'persoenlich_gesichert');
 assert.ok(performance.now()-started<200);
});

test('an already finished Shopify file is still attached',async()=>{
 const resolved=await resolveCheckoutPreview({checkoutImage:async()=>'https://cdn.shopify.com/s/files/ready.png',source:'https://app.example/gestaltung/a.png',hasSecuredPreview:true,previewFirst:true,budgetMs:0});
 assert.equal(resolved.status,'shopify_bereit');assert.equal(resolved.hosted,'https://cdn.shopify.com/s/files/ready.png');
});

test('missing personal preview stays a visible error instead of a generic image',async()=>{
 await assert.rejects(()=>resolveCheckoutPreview({checkoutImage:async()=>{await slow(50);throw Object.assign(Error('später'),{code:'checkout_image_pending'});},source:'x',hasSecuredPreview:false,previewFirst:true,budgetMs:0}),error=>error.code==='checkout_image_pending');
});

test('the blocking path still waits and surfaces Shopify errors',async()=>{
 const started=performance.now();
 const resolved=await resolveCheckoutPreview({checkoutImage:async()=>{await slow(40);return 'https://cdn.shopify.com/s/files/waited.png';},source:'x',hasSecuredPreview:true,previewFirst:false});
 assert.equal(resolved.hosted,'https://cdn.shopify.com/s/files/waited.png');assert.ok(performance.now()-started>=30);
 await assert.rejects(()=>resolveCheckoutPreview({checkoutImage:async()=>{throw Object.assign(Error('nein'),{code:'checkout_image_rejected'});},source:'x',hasSecuredPreview:true,previewFirst:true,budgetMs:20}),error=>error.code==='checkout_image_rejected');
});

test('attach writes the status onto the cart payload and keeps the personal PNG',async()=>{
 const payload={properties:{},preview:{base64:'abc',type:'image/png'}};
 const resolved=await attachCheckoutPreview({checkoutImage:()=>slow(300).then(()=>'https://cdn.shopify.com/s/files/late.png'),source:'x',payload,previewFirst:true,budgetMs:0});
 assert.equal(resolved.status,'persoenlich_gesichert');
 assert.equal(payload.properties._gravuru_vorschau_status,'persoenlich_gesichert');
 assert.equal(payload.properties._gravuru_checkout_image,undefined);
 assert.equal(payload.preview.base64,'abc');
});
