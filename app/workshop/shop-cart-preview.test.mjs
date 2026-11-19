import test from 'node:test';
import assert from 'node:assert/strict';
import {attachRevisionPreview} from './shop-cart-preview.mjs';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const cdn='https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+'a'.repeat(64)+'.png';

test('an old client still receives the saved preview when the Shopify file is not ready',async()=>{
 const payload={properties:{_gravuru_bild:'https://app.example/gestaltung/x.png'},preview:{base64:'abc',type:'image/png'}};
 const started=performance.now();
 const resolved=await attachRevisionPreview({checkoutImage:()=>wait(2200).then(()=>cdn),source:'https://app.example/gestaltung/x.png',payload,waitMs:0});
 assert.ok(performance.now()-started<100);
 assert.equal(resolved.status,'persoenlich_gesichert');
 assert.equal(payload.properties._gravuru_checkout_image,undefined);
 assert.equal(payload.preview.base64,'abc');
});

test('a hosted client waits inside the recorded file budget and does not keep the PNG when the file is late',async()=>{
 const late={properties:{_gravuru_bild:'https://app.example/gestaltung/x.png'},preview:{base64:'iVBORw0KGgo=',type:'image/png'}};
 const pending=await attachRevisionPreview({checkoutImage:()=>wait(500).then(()=>cdn),source:'https://app.example/gestaltung/x.png',payload:late,waitMs:40});
 assert.equal(pending.pending,true);
 assert.equal(late.properties._gravuru_checkout_image,undefined);
 assert.equal(late.preview.base64,'iVBORw0KGgo=');
 const ready={properties:{_gravuru_bild:'https://app.example/gestaltung/x.png'},preview:{base64:'iVBORw0KGgo=',type:'image/png'}};
 const started=performance.now();
 const resolved=await attachRevisionPreview({checkoutImage:()=>wait(120).then(()=>cdn),source:'https://app.example/gestaltung/x.png',payload:ready,waitMs:4000});
 assert.equal(resolved.hosted,cdn);
 assert.equal(ready.properties._gravuru_checkout_image,cdn);
 assert.ok(performance.now()-started<1000);
});

test('the remaining Shopify file wait overlaps the price check',async()=>{
 // Recorded in live-sanitized.json, cart/data at 14:32:38 UTC: token 1950 ms, poll 2251 ms, revalidate 1081 ms.
 const tokenMs=1950,pollMs=2251,revalidateMs=1081;
 const payload={properties:{_gravuru_bild:'https://app.example/gestaltung/x.png'},preview:{base64:'abc',type:'image/png'}};
 const started=performance.now();
 const image=attachRevisionPreview({checkoutImage:()=>wait(tokenMs+pollMs).then(()=>cdn),source:'https://app.example/gestaltung/x.png',payload,waitMs:8000});
 await wait(revalidateMs);
 const resolved=await image;
 const elapsed=performance.now()-started;
 assert.equal(resolved.status,'shopify_bereit');
 assert.ok(elapsed<tokenMs+pollMs+revalidateMs-700,String(elapsed));
 assert.ok(elapsed>=tokenMs+pollMs-80);
});

test('a Shopify failure is not reported as still in progress',async()=>{
 const payload={properties:{_gravuru_bild:'https://app.example/gestaltung/x.png'},preview:{base64:'abc',type:'image/png'}};
 const failed=await attachRevisionPreview({checkoutImage:async()=>{throw Object.assign(Error('Shopify'),{code:'checkout_image_failed'});},source:'https://app.example/gestaltung/x.png',payload,waitMs:4000});
 assert.equal(failed.failed,true);
 assert.equal(failed.pending,undefined);
 assert.equal(payload.properties._gravuru_checkout_image,undefined);
});

test('a ready Shopify file is still used, and a missing preview stays an error',async()=>{
 const payload={properties:{},preview:{base64:'abc'}};
 const ready=await attachRevisionPreview({checkoutImage:async()=>cdn,source:'x',payload});
 assert.equal(ready.hosted,cdn);
 await assert.rejects(()=>attachRevisionPreview({checkoutImage:()=>wait(30).then(()=>{throw Object.assign(Error('später'),{code:'checkout_image_pending'});}),source:'x',payload:{properties:{}},waitMs:0}),error=>error.code==='checkout_image_pending');
});
