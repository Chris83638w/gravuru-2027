import test from 'node:test';
import assert from 'node:assert/strict';
import {attachRevisionPreview} from './shop-cart-preview.mjs';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('a secured revision preview returns without the recorded Shopify file wait',async()=>{
 const delays=[2200,3400,2200];
 const fast=[],slow=[];
 for(const delay of delays){
  const payload={properties:{_gravuru_bild:'https://app.example/gestaltung/x.png'},preview:{base64:'abc',type:'image/png'}};
  const started=performance.now();
  const resolved=await attachRevisionPreview({checkoutImage:()=>wait(delay).then(()=>'https://cdn.shopify.com/s/files/a.png'),source:'https://app.example/gestaltung/x.png',payload});
  fast.push(performance.now()-started);
  assert.equal(resolved.status,'persoenlich_gesichert');
  assert.equal(payload.properties._gravuru_checkout_image,undefined);
  const blocking=performance.now();
  await attachRevisionPreview({checkoutImage:async()=>'https://cdn.shopify.com/s/files/ready.png',source:'https://app.example/gestaltung/x.png',payload:{properties:{},preview:{base64:'abc'}}});
  slow.push(performance.now()-blocking);
 }
 assert.ok(Math.max(...fast)<100,fast.join(','));
 assert.ok(fast.length===3);
});

test('a ready Shopify file is still used, and a missing preview stays an error',async()=>{
 const payload={properties:{},preview:{base64:'abc'}};
 const ready=await attachRevisionPreview({checkoutImage:async()=>'https://cdn.shopify.com/s/files/ready.png',source:'x',payload});
 assert.equal(ready.hosted,'https://cdn.shopify.com/s/files/ready.png');
 await assert.rejects(()=>attachRevisionPreview({checkoutImage:()=>wait(30).then(()=>{throw Object.assign(Error('später'),{code:'checkout_image_pending'});}),source:'x',payload:{properties:{}}}),error=>error.code==='checkout_image_pending');
});
