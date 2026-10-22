import {isDeepStrictEqual} from 'node:util';
import {ORDER_FIELDS,ORDER_QUERY,ORDER_WEBHOOK_URI,matchesOrderSubscription} from './order-webhook-registration.mjs';
const update='mutation GravuruOrderProductField($id:ID!,$subscription:WebhookSubscriptionInput!){webhookSubscriptionUpdate(id:$id,webhookSubscription:$subscription){webhookSubscription{id topic uri format filter includeFields apiVersion{handle}} userErrors{field message}}}';
const oldFields=ORDER_FIELDS.filter(f=>f!=='line_items.product_id');
const fail=code=>{throw Object.assign(Error('Existing test webhook could not be upgraded.'),{code});};
// Preserve subscription identity, destination, filter and version. No replacement,
// additional subscription, replay, authentication change or customer fields.
export async function upgradeOrderWebhookFields({graphql,beforeUpdate,priorAttempt=false}){
 if(typeof graphql!=='function'||typeof beforeUpdate!=='function')fail('upgrade_config');
 const read=async()=>{
  const all=(await graphql(ORDER_QUERY)).webhookSubscriptions;
  if(!Array.isArray(all?.nodes)||all.pageInfo?.hasNextPage!==false)fail('inventory_incomplete');
  const list=all.nodes.filter(s=>s.uri===ORDER_WEBHOOK_URI);
  if(list.length!==1)fail('subscription_conflict');return list[0];
 };
 const before=await read();
 if(matchesOrderSubscription(before))return {changed:false,confirmed:true,before,after:before};
 if(!matchesOrderSubscription({...before,includeFields:[...ORDER_FIELDS]})||!Array.isArray(before.includeFields)||!isDeepStrictEqual([...before.includeFields].sort(),[...oldFields].sort()))fail('unexpected_subscription');
 if(priorAttempt)fail('uncertain_prior_attempt');
 await beforeUpdate({before,change:{includeFields:[...ORDER_FIELDS]}});
 if(!isDeepStrictEqual(await read(),before))fail('concurrent_subscription_change');
 const result=(await graphql(update,{id:before.id,subscription:{includeFields:[...ORDER_FIELDS]}})).webhookSubscriptionUpdate;
 if(result?.userErrors?.length||!matchesOrderSubscription(result?.webhookSubscription)||result.webhookSubscription.id!==before.id)fail('mutation_unconfirmed');
 const after=await read();
 if(!matchesOrderSubscription(after)||after.id!==before.id)fail('readback_unconfirmed');
 return {changed:true,confirmed:true,before,after};
}
