import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createDoorbellLiveIntake} from './configurator-integration.mjs';
const config={shopDomain:'gravuru-design.myshopify.com',apiVersion:'2026-07',secret:'synthetic_private_secret_123',mode:'doorbell-live-approved'};
const sign=payload=>{const raw=Buffer.from(JSON.stringify(payload));return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':config.shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':'synthetic-routing-event'}};};
test('explicit live router never invokes legacy, authenticates before routing and preserves test routing',()=>{
 const calls=[],tokens={legacy:'a'.repeat(64),acryl:'b'.repeat(64)};
 const stores=['legacy','acryl'].map(storeId=>({storeId,intake:{ownsOfferToken:token=>token===tokens[storeId],bindings:()=>[],receive(raw,headers,cfg,routing){calls.push({storeId,mode:cfg.mode,lines:routing.acceptedLineIds});return {duplicate:false,lines:[{storeId}],errors:[]};}}}));
 const router=createDoorbellLiveIntake(stores);
 const payload={id:100,test:false,financial_status:'paid',currency:'EUR',line_items:[{id:101,variant_id:201,properties:[{name:'_gravuru_offer',value:tokens.acryl}]}]};
 let s=sign(payload);assert.equal(router.receive(s.raw,s.headers,config).lines.length,1);assert.deepEqual(calls,[{storeId:'acryl',mode:'doorbell-live-approved',lines:['101']}]);
 calls.length=0;s=sign({...payload,line_items:[{...payload.line_items[0],properties:[{name:'_gravuru_offer',value:tokens.legacy}]}]});
 assert.throws(()=>router.receive(s.raw,s.headers,config));assert.deepEqual(calls,[]);
 s=sign({...payload,test:true,line_items:[...payload.line_items,{id:102,variant_id:202,properties:[{name:'_gravuru_offer',value:tokens.legacy}]}]});
 router.receive(s.raw,s.headers,config);assert.deepEqual(calls.map(c=>[c.storeId,c.mode]),[['acryl','test-only'],['legacy','test-only']]);
 calls.length=0;assert.throws(()=>router.receive(Buffer.concat([s.raw,Buffer.from(' ')]),s.headers,config));assert.deepEqual(calls,[]);
 assert.throws(()=>createDoorbellLiveIntake(stores.filter(s=>s.storeId!=='acryl')));
});

