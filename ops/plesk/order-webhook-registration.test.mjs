import test from 'node:test';import assert from 'node:assert/strict';
import {ensureOrderSubscription,ORDER_WEBHOOK_URI,ORDER_FIELDS,matchesOrderSubscription} from './order-webhook-registration.mjs';
function fixture({scope=true,identity=true,conflict=false,prior=false,uncertain=false}={}){
 let entries=conflict?[{uri:ORDER_WEBHOOK_URI,id:'other'}]:[],mutations=0,attempts=0,reads=0;
 const item={id:'gid://shopify/WebhookSubscription/901',uri:ORDER_WEBHOOK_URI,topic:'ORDERS_PAID',format:'JSON',filter:'test:true',includeFields:[...ORDER_FIELDS],apiVersion:{handle:'2026-07'}};
 const input={secret:'synthetic_private_secret',priorAttempt:prior,beforeCreate:()=>{attempts++;},probeImpl:async()=>({status:401}),fetchImpl:async(url,o)=>{
  assert.equal(o.redirect,'error');
  if(url.endsWith('/access_token'))return Response.json({access_token:'synthetic_private_access_token'});
  assert.equal(url,'https://gravuru-design.myshopify.com/admin/api/2026-07/graphql.json');
  const {query,variables}=JSON.parse(o.body);let data;
  if(query.includes('Identity'))data={shop:{myshopifyDomain:'gravuru-design.myshopify.com'},currentAppInstallation:{app:{id:identity?'gid://shopify/App/423276544001':'other'},accessScopes:scope?[{handle:'read_orders'}]:[]}};
  else if(query.startsWith('mutation')){mutations++;assert.deepEqual(variables.subscription,{uri:ORDER_WEBHOOK_URI,format:'JSON',filter:'test:true',includeFields:[...ORDER_FIELDS]});entries=[item];if(uncertain)throw Error('lost response');data={webhookSubscriptionCreate:{webhookSubscription:item,userErrors:[]}};}
  else {reads++;data={webhookSubscriptions:{nodes:entries,pageInfo:{hasNextPage:false}}};}
  return Response.json({data},{headers:{'x-shopify-api-version':'2026-07'}});
 }};
 return {input,item,get mutations(){return mutations;},get attempts(){return attempts;},get reads(){return reads;}};
}
test('fixed test-only subscription is created once and verified by readback; next call only reads',async()=>{
 const f=fixture(),r=await ensureOrderSubscription(f.input);assert.equal(r.registered,true);assert.equal(r.alreadyPresent,false);assert.equal(f.mutations,1);assert.equal(f.attempts,1);assert.equal(f.reads,2);
 assert.equal((await ensureOrderSubscription({...f.input,priorAttempt:true})).alreadyPresent,true);assert.equal(f.mutations,1);
 assert.equal(matchesOrderSubscription({...f.item,apiVersion:{handle:'2026-10'}}),false);
});
test('missing scope, wrong app, conflicting endpoint and uncertain prior attempt never mutate',async()=>{
 for(const [options,code]of [[{scope:false},'orders_scope_missing'],[{identity:false},'registration_identity'],[{conflict:true},'subscription_conflict'],[{prior:true},'subscription_outcome_unresolved']]){
  const f=fixture(options);await assert.rejects(ensureOrderSubscription(f.input),{code});assert.equal(f.mutations,0);assert.equal(f.attempts,0);
 }
});
test('lost create response is reconciled by readback, not by a second create',async()=>{
 const f=fixture({uncertain:true});await assert.rejects(ensureOrderSubscription(f.input),{code:'registration_network'});assert.equal(f.attempts,1);
 assert.equal((await ensureOrderSubscription({...f.input,priorAttempt:true})).alreadyPresent,true);assert.equal(f.mutations,1);
});
