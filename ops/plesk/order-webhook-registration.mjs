import {ORDER_WEBHOOK_PATH} from '../../app/workshop/shopify-order-webhook.mjs';
export const ORDER_WEBHOOK_URI='https://app-2027.gravuru-designwerkstatt.de'+ORDER_WEBHOOK_PATH;
export const ORDER_FIELDS=Object.freeze(['id','test','financial_status','cancelled_at','currency','updated_at','line_items.id','line_items.variant_id','line_items.quantity','line_items.price','line_items.properties','customer.id']);
export const ORDER_QUERY='query GravuruOrderWebhookSubscriptions { webhookSubscriptions(first: 100, topics: [ORDERS_PAID]) { nodes { id topic uri format filter includeFields apiVersion { handle } } pageInfo { hasNextPage } } }';
export const ORDER_MUTATION='mutation GravuruCreateOrderWebhook($subscription: WebhookSubscriptionInput!) { webhookSubscriptionCreate(topic: ORDERS_PAID, webhookSubscription: $subscription) { webhookSubscription { id topic uri format filter includeFields apiVersion { handle } } userErrors { field message } } }';
const identityQuery='query GravuruOrderWebhookIdentity { shop { myshopifyDomain } currentAppInstallation { app { id } accessScopes { handle } } }';
const fail=(code,issues)=>{throw Object.assign(Error('Bestellabonnement nicht bestätigt.'),{code,...(issues?{issues}:{} )});};
const shop='gravuru-design.myshopify.com',clientId='9640dd7a6907f0c73e7013ea8c24869b';
export function matchesOrderSubscription(v){return v?.topic==='ORDERS_PAID'&&v.uri===ORDER_WEBHOOK_URI&&v.format==='JSON'&&v.filter==='test:true'&&v.apiVersion?.handle==='2026-07'&&Array.isArray(v.includeFields)&&JSON.stringify([...v.includeFields].sort())===JSON.stringify([...ORDER_FIELDS].sort())&&/^gid:\/\/shopify\/WebhookSubscription\/[0-9]+$/.test(v.id);}
// Operator-only fixed action. Uses the owning app; cannot register arbitrary
// endpoints, access orders, edit products, or issue payments/fulfillments.
export async function ensureOrderSubscription({secret,priorAttempt=false,beforeCreate,fetchImpl=globalThis.fetch}){
 if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{16,256}$/.test(secret)||typeof beforeCreate!=='function')fail('registration_config');
 let token;
 async function request(url,options,{version=false}={}){
  let response;try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});}catch{fail('registration_network');}
  if(!response.ok||response.redirected||version&&response.headers.get('x-shopify-api-version')!=='2026-07')fail('registration_http');
  const reader=response.body.getReader();let size=0,chunks=[];
  try{for(;;){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>1024*1024)fail('registration_response');chunks.push(Buffer.from(v.value));}return JSON.parse(Buffer.concat(chunks).toString());}
  catch(e){if(e.code)throw e;fail('registration_response');}finally{await reader.cancel();reader.releaseLock();}
 }
 const credentials=await request('https://'+shop+'/admin/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:secret}).toString()});
 if(typeof credentials.access_token!=='string'||!/^[\x21-\x7e]{16,4096}$/.test(credentials.access_token))fail('registration_credentials');token=credentials.access_token;
 const graphql=async(query,variables={})=>{
  const v=await request('https://'+shop+'/admin/api/2026-07/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})},{version:true});
  if(!v.data||v.errors?.length)fail('registration_graphql');return v.data;
 };
 const identity=await graphql(identityQuery);
 if(identity.shop?.myshopifyDomain!==shop||identity.currentAppInstallation?.app?.id!=='gid://shopify/App/423276544001')fail('registration_identity');
 if(!identity.currentAppInstallation.accessScopes?.some(s=>s.handle==='read_orders'||s.handle==='write_orders'))fail('orders_scope_missing');
 const read=async()=>{const data=await graphql(ORDER_QUERY),list=data.webhookSubscriptions;if(!Array.isArray(list?.nodes)||list.pageInfo?.hasNextPage!==false)fail('subscription_inventory');return list.nodes.filter(v=>v.uri===ORDER_WEBHOOK_URI);};
 const existing=await read();
 if(existing.length){if(existing.length!==1||!matchesOrderSubscription(existing[0]))fail('subscription_conflict');return {registered:true,alreadyPresent:true,subscription:existing[0],testOnly:true};}
 if(priorAttempt)fail('subscription_outcome_unresolved');
 // An unsigned request must fail at the deployed signature gate before any
 // subscription mutation. No synthetic payment is sent to the real service.
 let probe;try{probe=await fetchImpl(ORDER_WEBHOOK_URI,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{fail('endpoint_unavailable');}
 if(probe.status!==401)fail('endpoint_not_verified');await probe.body?.cancel();
 const subscription={uri:ORDER_WEBHOOK_URI,format:'JSON',filter:'test:true',includeFields:[...ORDER_FIELDS]};
 await beforeCreate({schema:'gravuru-order-webhook-attempt/v1',uri:ORDER_WEBHOOK_URI,topic:'ORDERS_PAID',state:'sending'});
 const result=(await graphql(ORDER_MUTATION,{subscription})).webhookSubscriptionCreate;
 if(result?.userErrors?.length)fail('subscription_rejected',result.userErrors.map(e=>({field:e.field,message:String(e.message).replaceAll(secret,'[redacted]').replaceAll(token,'[redacted]').slice(0,500)})));
 if(!matchesOrderSubscription(result?.webhookSubscription))fail('subscription_result');
 const after=await read();if(after.length!==1||after[0].id!==result.webhookSubscription.id||!matchesOrderSubscription(after[0]))fail('subscription_readback');
 return {registered:true,alreadyPresent:false,subscription:after[0],testOnly:true};
}
