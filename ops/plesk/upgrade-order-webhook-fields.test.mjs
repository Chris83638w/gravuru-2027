import test from 'node:test';import assert from 'node:assert/strict';
import {upgradeOrderWebhookFields} from './upgrade-order-webhook-fields.mjs';
import {ORDER_FIELDS,ORDER_WEBHOOK_URI} from './order-webhook-registration.mjs';
function fixture(){
 const state={row:{id:'gid://shopify/WebhookSubscription/123',topic:'ORDERS_PAID',uri:ORDER_WEBHOOK_URI,format:'JSON',filter:'test:true',apiVersion:{handle:'2026-07'},includeFields:ORDER_FIELDS.filter(f=>f!=='line_items.product_id')},mutations:[],backup:null,reads:0};
 const graphql=async(q,v)=>{if(q.startsWith('mutation')){state.mutations.push(v);assert.ok(state.backup);state.row={...state.row,...v.subscription};return {webhookSubscriptionUpdate:{webhookSubscription:state.row,userErrors:[]}};}state.reads++;return {webhookSubscriptions:{nodes:[structuredClone(state.row)],pageInfo:{hasNextPage:false}}};};
 return {state,args:{graphql,beforeUpdate:async v=>{state.backup=structuredClone(v);}}};
}
test('adds only product_id to same test subscription after backup and reread',async()=>{const {state,args}=fixture();const r=await upgradeOrderWebhookFields(args);assert.equal(r.confirmed,true);assert.equal(state.mutations.length,1);assert.deepEqual(Object.keys(state.mutations[0].subscription),['includeFields']);assert.equal(r.before.id,r.after.id);assert.equal(r.before.includeFields.includes('line_items.product_id'),false);assert.equal(r.after.includeFields.includes('line_items.product_id'),true);});
test('already updated subscription never mutates',async()=>{const {state,args}=fixture();state.row.includeFields=[...ORDER_FIELDS];assert.equal((await upgradeOrderWebhookFields(args)).changed,false);assert.equal(state.mutations.length,0);});
test('unexpected filter or field list is refused',async()=>{for(const change of [{filter:null},{includeFields:['id']}]){const {state,args}=fixture();Object.assign(state.row,change);await assert.rejects(upgradeOrderWebhookFields(args));assert.equal(state.mutations.length,0);}});
test('uncertain earlier attempt is not repeated',async()=>{const {state,args}=fixture();await assert.rejects(upgradeOrderWebhookFields({...args,priorAttempt:true}),{code:'uncertain_prior_attempt'});assert.equal(state.mutations.length,0);});
test('concurrent change after backup aborts',async()=>{const {state,args}=fixture();args.beforeUpdate=async()=>{state.row.filter=null;};await assert.rejects(upgradeOrderWebhookFields(args),{code:'concurrent_subscription_change'});assert.equal(state.mutations.length,0);});
