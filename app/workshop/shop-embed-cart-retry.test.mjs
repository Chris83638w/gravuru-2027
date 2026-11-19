import test from 'node:test';
import assert from 'node:assert/strict';
import {CHECKOUT_WAIT_TEXT,readCartDataUntilReady} from './ui/shop-embed.mjs';

const pending=()=>Object.assign(Error('Die Gestaltungsvorschau wird noch für den Warenkorb vorbereitet. Bitte erneut versuchen.'),{code:'checkout_image_pending'});
const failed=()=>Object.assign(Error('Die Vorschau für die Kasse konnte nicht erstellt werden. Es wurde nichts in den Warenkorb gelegt.'),{code:'checkout_image_failed'});

test('cart/data is retried while the checkout file is pending and theme-cart is not called again',async()=>{
 let now=0,attempts=0;const calls=[];
 const payload=await readCartDataUntilReady(async()=>{
  calls.push('data');attempts++;
  if(attempts<3)throw pending();
  return {shopDomain:'shop.myshopify.com'};
 },{now:()=>now,sleep:async ms=>{now+=ms;},intervalMs:1200,limitMs:14000,onWait(){calls.push('wait');}});
 assert.equal(payload.shopDomain,'shop.myshopify.com');
 assert.deepEqual(calls,['data','wait','data','wait','data']);
 assert.equal(calls.includes('theme-cart'),false);
 assert.equal(now,2400);
 assert.match(CHECKOUT_WAIT_TEXT,/Vorschau wird für die Kasse vorbereitet/);
});

test('the recorded live waits of 4.2, 4.8 and 5.4 seconds still finish inside the retry limit',async()=>{
 for(const readyAt of [4200,4800,5400]){
  let now=0;
  const payload=await readCartDataUntilReady(async()=>{if(now<readyAt)throw pending();return {readyAt};},{now:()=>now,sleep:async ms=>{now+=ms;},intervalMs:1200,limitMs:14000});
  assert.equal(payload.readyAt,readyAt);
  assert.ok(now<=14000);
 }
});

test('a real Shopify failure does not retry and does not open the cart',async()=>{
 let calls=0;
 await assert.rejects(readCartDataUntilReady(async()=>{calls++;throw failed();},{sleep:async()=>{throw Error('kein weiteres Warten');},intervalMs:1200,limitMs:14000}),error=>error.code==='checkout_image_failed');
 assert.equal(calls,1);
});

test('retries stop at the overall limit without creating a cart line',async()=>{
 let now=0,calls=0;
 await assert.rejects(readCartDataUntilReady(async()=>{calls++;throw pending();},{now:()=>now,sleep:async ms=>{now+=ms;},intervalMs:1200,limitMs:14000}),error=>error.code==='checkout_image_pending');
 assert.ok(now<=14000);
 assert.ok(calls>1&&calls<14);
});
