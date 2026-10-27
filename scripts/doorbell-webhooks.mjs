// Fixed Gravuru-only deployment helper. Default is read-only; no token/secret is logged.
// Schema discovered with Shopify MCP on 2026-10-27; see the companion handoff.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readCredentials,createShopifyClient,SHOP_DOMAIN,CLIENT_ID,API_VERSION} from './shop-export.mjs';
import {validateDoorbellManifest} from './doorbell-shop-bind.mjs';
export const APP_ID='gid://shopify/App/423276544001';
export const PAID_URI='https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/orders-paid';
export const STATUS_URI='https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/doorbell-orders-status';
export const PAID_FIELDS=Object.freeze(['id','test','financial_status','cancelled_at','currency','updated_at','line_items.id','line_items.product_id','line_items.variant_id','line_items.quantity','line_items.price','line_items.properties','customer.id']);
export const STATUS_FIELDS=Object.freeze(['id','test','financial_status','cancelled_at','currency','updated_at','line_items.id','line_items.product_id','line_items.variant_id','refunds.id','refunds.order_id','refunds.refund_line_items.line_item_id','refunds.refund_line_items.quantity','refunds.refund_line_items.subtotal','refunds.refund_line_items.total_tax','refunds.refund_line_items.subtotal_set','refunds.refund_line_items.total_tax_set']);
export const TARGETS=Object.freeze([{topic:'ORDERS_PAID',uri:PAID_URI,fields:PAID_FIELDS},{topic:'ORDERS_UPDATED',uri:STATUS_URI,fields:STATUS_FIELDS},{topic:'ORDERS_CANCELLED',uri:STATUS_URI,fields:STATUS_FIELDS}]);
export const IDENTITY_QUERY="query GravuruDoorbellWebhookIdentity { shop { myshopifyDomain } currentAppInstallation { app { id apiKey webhookApiVersion } accessScopes { handle } } publicApiVersions { handle supported } }";
export const INVENTORY_QUERY="query GravuruDoorbellWebhookInventory($after:String) { webhookSubscriptions(first:100,after:$after,topics:[ORDERS_PAID,ORDERS_UPDATED,ORDERS_CANCELLED]) { nodes { id topic uri format filter includeFields apiVersion { handle supported } } pageInfo { hasNextPage endCursor } } }";
export const CREATE_MUTATION="mutation GravuruDoorbellWebhookCreate($topic:WebhookSubscriptionTopic!,$subscription:WebhookSubscriptionInput!) { webhookSubscriptionCreate(topic:$topic,webhookSubscription:$subscription) { webhookSubscription { id topic uri format filter includeFields apiVersion { handle supported } } userErrors { field message } } }";
const fail=code=>{throw Object.assign(Error('Funkklingel-Webhooks nicht bestÃ¤tigt: '+code),{code});};
const same=(a,b)=>Array.isArray(a)&&JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
const matches=(v,t,filter='test:false')=>/^gid:\/\/shopify\/WebhookSubscription\/[0-9]+$/.test(v?.id||'')&&v.topic===t.topic&&v.uri===t.uri&&v.format==='JSON'&&v.filter===filter&&v.apiVersion?.handle===API_VERSION&&v.apiVersion.supported===true&&same(v.includeFields,t.fields);
export function assertDoorbellRelease({filename,manifest,env=process.env}){
 if(env.GRAVURU_CUSTOMER_INTEGRATION!=='merchant-test-only'||env.GRAVURU_DOORBELL_LIVE_ORDERS!=='approved-20261027')fail('live_host_flags_missing');
 const selections=validateDoorbellManifest(manifest);
 if(!fs.existsSync(filename))fail('acryl_database_missing');
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  if(db.prepare('PRAGMA user_version').get().user_version!==4)fail('wrong_database_schema');
  for(const p of manifest.products){
   const r=db.prepare('SELECT a.*,r.document,p.revision AS head,p.archived FROM doorbell_live_order_approvals a JOIN products p ON p.tenant_id=a.tenant_id AND p.id=a.cfg_id JOIN product_revisions r ON r.tenant_id=a.tenant_id AND r.product_id=a.cfg_id AND r.revision=a.cfg_revision WHERE a.tenant_id=? AND a.shop=? AND a.product_gid=? AND a.cfg_id=? AND a.cfg_revision=?').get('gravuru',SHOP_DOMAIN,p.shopifyProductId,p.productId,p.productRevision);
   if(!r||r.approval_id!=='user-20261027-funkklingeln'||r.archived||r.head!==p.productRevision||createHash('sha256').update(r.document).digest('hex')!==r.document_sha256||!same(JSON.parse(r.variants_json),p.variants.map(v=>v.shopifyVariantId.split('/').at(-1))))fail('persisted_release_missing');
   const current=db.prepare('SELECT r.variant_gid FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE r.tenant_id=? AND r.shop=? AND r.store_id=? AND r.product_gid=? AND r.cfg_id=? AND r.cfg_revision=?').all('gravuru',SHOP_DOMAIN,'acryl',p.shopifyProductId,p.productId,p.productRevision);
   if(!same(current.map(v=>v.variant_gid),p.variants.map(v=>v.shopifyVariantId)))fail('active_bindings_changed');
  }
  return {products:126,variants:selections.length,approvalId:'user-20261027-funkklingeln'};
 }finally{db.close();}
}
async function inventory(client){
 let after=null,list=[];const cursors=new Set();
 for(let page=0;page<100;page++){
  const data=(await client.graphql(INVENTORY_QUERY,{after})).data.webhookSubscriptions;
  if(!Array.isArray(data?.nodes)||typeof data.pageInfo?.hasNextPage!=='boolean')fail('inventory_incomplete');
  list.push(...data.nodes);if(!data.pageInfo.hasNextPage)return list;
  const next=data.pageInfo.endCursor;if(typeof next!=='string'||!next||cursors.has(next))fail('inventory_cursor');cursors.add(next);after=next;
 }
 fail('inventory_limit');
}
function plan(list){
 const paid=list.filter(v=>v.topic==='ORDERS_PAID'&&v.uri===PAID_URI&&v.filter==='test:true');
 if(paid.length!==1||!matches(paid[0],TARGETS[0],'test:true'))fail('existing_paid_test_subscription_mismatch');
 const entries=TARGETS.map(t=>{
  const at=list.filter(v=>v.topic===t.topic&&v.uri===t.uri&&!(t.topic==='ORDERS_PAID'&&v.filter==='test:true'));
  if(at.length>1||at.length===1&&!matches(at[0],t))fail('existing_subscription_conflict');
  return {topic:t.topic,uri:t.uri,action:at.length?'keep':'create',id:at[0]?.id??null};
 });
 return {existingTestSubscriptionId:paid[0].id,entries};
}
export async function ensureDoorbellWebhooks({client,apply=false,release=null,previousAttempts=[],beforeCreate=async()=>{},probe=async()=>false}){
 if(client?.shopDomain!==SHOP_DOMAIN||client.apiVersion!==API_VERSION)fail('fixed_client_required');
 const id=(await client.graphql(IDENTITY_QUERY)).data,app=id.currentAppInstallation?.app;
 if(id.shop?.myshopifyDomain!==SHOP_DOMAIN||app?.id!==APP_ID||app.apiKey!==CLIENT_ID)fail('wrong_owning_app');
 if(app.webhookApiVersion!==API_VERSION||!id.publicApiVersions?.some(v=>v.handle===API_VERSION&&v.supported===true))fail('webhook_api_version_mismatch');
 if(!id.currentAppInstallation.accessScopes?.some(v=>['read_orders','write_orders'].includes(v.handle)))fail('existing_order_scope_missing');
 let current=plan(await inventory(client));
 const report={schema:'gravuru-doorbell-webhooks/v1',shopDomain:SHOP_DOMAIN,appId:APP_ID,apiVersion:API_VERSION,mode:apply?'apply':'dry-run',...current,created:[],confirmed:false};
 if(!apply)return report;
 if(release?.products!==126||release.variants!==15120||release.approvalId!=='user-20261027-funkklingeln')fail('complete_live_release_required');
 for(const uri of new Set(TARGETS.map(t=>t.uri)))if(await probe(uri)!==true)fail('deployed_hmac_gate_missing');
 for(const t of TARGETS){
  current=plan(await inventory(client));const e=current.entries.find(e=>e.topic===t.topic);if(e.action==='keep')continue;
  if(previousAttempts.includes(t.topic))fail('uncertain_previous_creation');
  await beforeCreate({topic:t.topic,uri:t.uri,filter:'test:false',state:'sending'});
  // Client is configured with maxRetries:0. Never blindly repeat a creation.
  const result=(await client.graphql(CREATE_MUTATION,{topic:t.topic,subscription:{uri:t.uri,format:'JSON',filter:'test:false',includeFields:[...t.fields]}})).data.webhookSubscriptionCreate;
  if(result?.userErrors?.length)fail('subscription_rejected');
  if(!matches(result?.webhookSubscription,t))fail('creation_unconfirmed');
  const after=plan(await inventory(client)).entries.find(e=>e.topic===t.topic);
  if(after.action!=='keep'||after.id!==result.webhookSubscription.id)fail('readback_unconfirmed');
  report.created.push({topic:t.topic,id:after.id});
 }
 const final=plan(await inventory(client));if(final.entries.some(e=>e.action!=='keep'))fail('final_inventory_incomplete');
 return {...report,...final,confirmed:true};
}
export async function probeHmacGate(uri){
 if(!TARGETS.some(t=>t.uri===uri))fail('unexpected_probe_target');
 const {request}=await import('node:https');
 return new Promise(resolve=>{
  const req=request(uri,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'2'},agent:false,signal:AbortSignal.timeout(10000)},res=>{const ok=res.statusCode===401;res.destroy();resolve(ok);});
  req.on('error',()=>resolve(false));req.end('{}');
 });
}
export async function run(argv,{env=process.env,stdout=process.stdout}={}){
 const allowed=new Set(['--out','--manifest','--db']),args={};let apply=false,dryRun=false;
 for(let i=0;i<argv.length;i++){const k=argv[i];if(k==='--apply'){apply=true;continue;}if(k==='--dry-run'){dryRun=true;continue;}if(!allowed.has(k)||!argv[i+1]||argv[i+1].startsWith('--'))fail('usage');args[k.slice(2)]=argv[++i];}
 if(apply&&dryRun||!args.out||apply&&(!args.manifest||!args.db))fail('usage');
 const output=path.resolve(args.out),old=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):null;
 if(old&&(old.schema!=='gravuru-doorbell-webhook-attempts/v1'||old.shopDomain!==SHOP_DOMAIN))fail('journal_mismatch');
 const journal=old||{schema:'gravuru-doorbell-webhook-attempts/v1',shopDomain:SHOP_DOMAIN,attempts:[]};
 const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(journal,null,2)+'\n',{mode:0o600});};
 const release=apply?assertDoorbellRelease({filename:path.resolve(args.db),manifest:JSON.parse(fs.readFileSync(args.manifest,'utf8')),env}):null;
 const client=createShopifyClient({credentials:readCredentials(env),maxRetries:0});
 try{
  const report=await ensureDoorbellWebhooks({client,apply,release,previousAttempts:journal.attempts.map(v=>v.topic),probe:probeHmacGate,beforeCreate:async event=>{journal.attempts.push({...event,at:new Date().toISOString()});save();}});
  journal.report=report;save();stdout.write(JSON.stringify(report)+'\n');return report;
 }catch(e){journal.error={code:/^[a-z_]+$/.test(e.code||'')?e.code:'registration_stopped'};save();throw Object.assign(Error('Funkklingel-Webhooks nicht bestÃ¤tigt.'),journal.error);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(e=>{process.stderr.write(JSON.stringify({confirmed:false,code:/^[a-z_]+$/.test(e.code||'')?e.code:'registration_stopped'})+'\n');process.exitCode=1;});
