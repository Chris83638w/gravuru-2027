import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureDoorbellWebhooks,APP_ID,PAID_URI,STATUS_URI,PAID_FIELDS,TARGETS,IDENTITY_QUERY,INVENTORY_QUERY,CREATE_MUTATION,assertDoorbellRelease,run} from './doorbell-webhooks.mjs';
import {SHOP_DOMAIN,CLIENT_ID,API_VERSION} from './shop-export.mjs';
const release={products:126,variants:15120,approvalId:'user-20261027-funkklingeln'};
const subscription=(t,id,filter='test:false')=>({id:'gid://shopify/WebhookSubscription/'+id,topic:t.topic,uri:t.uri,format:'JSON',filter,includeFields:[...t.fields],apiVersion:{handle:API_VERSION,supported:true}});
function fixture(){
 const testPaid=subscription(TARGETS[0],100,'test:true'),foreign={...subscription(TARGETS[1],101),uri:'https://other.example.invalid/status'},rows=[testPaid,foreign],created=[];
 const identity={shop:{myshopifyDomain:SHOP_DOMAIN},currentAppInstallation:{app:{id:APP_ID,apiKey:CLIENT_ID,webhookApiVersion:API_VERSION},accessScopes:[{handle:'read_orders'}]},publicApiVersions:[{handle:API_VERSION,supported:true}]};
 const client={shopDomain:SHOP_DOMAIN,apiVersion:API_VERSION,async graphql(q,v){
  if(q===IDENTITY_QUERY)return {data:identity};
  if(q===INVENTORY_QUERY)return {data:{webhookSubscriptions:{nodes:structuredClone(rows),pageInfo:{hasNextPage:false,endCursor:null}}}};
  assert.equal(q,CREATE_MUTATION);created.push(structuredClone(v));
  const row=subscription(TARGETS.find(t=>t.topic===v.topic),200+created.length);assert.deepEqual(v.subscription,{uri:row.uri,format:'JSON',filter:'test:false',includeFields:row.includeFields});rows.push(row);
  return {data:{webhookSubscriptionCreate:{webhookSubscription:structuredClone(row),userErrors:[]}}};
 }};
 return {client,rows,created,identity,testPaid,foreign};
}
test('default dry-run preserves existing paid test and foreign subscriptions and plans only three fixed live subscriptions',async()=>{
 const f=fixture(),before=structuredClone(f.rows),r=await ensureDoorbellWebhooks({client:f.client});
 assert.equal(r.mode,'dry-run');assert.equal(r.confirmed,false);assert.equal(r.entries.length,3);assert.ok(r.entries.every(e=>e.action==='create'));assert.equal(f.created.length,0);assert.deepEqual(f.rows,before);
});
test('wrong owning app, API version, supported status and missing order scope stop before mutations',async()=>{
 for(const alter of [f=>f.identity.currentAppInstallation.app.id='gid://shopify/App/99',f=>f.identity.currentAppInstallation.app.apiKey='foreign',f=>f.identity.currentAppInstallation.app.webhookApiVersion='2026-10',f=>f.identity.publicApiVersions[0].supported=false,f=>f.identity.currentAppInstallation.accessScopes=[]]){
  const f=fixture();alter(f);await assert.rejects(()=>ensureDoorbellWebhooks({client:f.client,apply:true,release,probe:async()=>true}));assert.equal(f.created.length,0);
 }
});
test('apply requires all126 release evidence and both deployed HMAC gates',async()=>{
 const f=fixture();await assert.rejects(()=>ensureDoorbellWebhooks({client:f.client,apply:true,probe:async()=>true}),{code:'complete_live_release_required'});
 await assert.rejects(()=>ensureDoorbellWebhooks({client:f.client,apply:true,release,probe:async uri=>uri===PAID_URI}),{code:'deployed_hmac_gate_missing'});assert.equal(f.created.length,0);
 assert.throws(()=>assertDoorbellRelease({filename:'unused.sqlite',manifest:{},env:{}}),{code:'live_host_flags_missing'});
});
test('three creations use same owning app, retain test subscription, verify each readback and repeat idempotently',async()=>{
 const f=fixture(),before=structuredClone(f.rows),journal=[],probes=[];
 const args={client:f.client,apply:true,release,probe:async uri=>{probes.push(uri);return true;},beforeCreate:async row=>journal.push(row)};
 const r=await ensureDoorbellWebhooks(args);assert.equal(r.confirmed,true);assert.equal(r.created.length,3);assert.deepEqual(f.rows.slice(0,2),before);assert.deepEqual(probes,[PAID_URI,STATUS_URI]);assert.equal(journal.length,3);
 const again=await ensureDoorbellWebhooks({...args,previousAttempts:journal.map(v=>v.topic)});assert.equal(again.confirmed,true);assert.equal(again.created.length,0);assert.equal(f.created.length,3);
});
test('ambiguous prior outcomes are read back but never repeated blindly',async()=>{
 const f=fixture();await assert.rejects(()=>ensureDoorbellWebhooks({client:f.client,apply:true,release,previousAttempts:['ORDERS_PAID'],probe:async()=>true}),{code:'uncertain_previous_creation'});assert.equal(f.created.length,0);
 f.rows.push(subscription(TARGETS[0],300));
 const r=await ensureDoorbellWebhooks({client:f.client,apply:true,release,previousAttempts:['ORDERS_PAID'],probe:async()=>true});assert.equal(r.created.length,2);
});
test('same endpoint conflicts or a drifted test subscription stop without updating or deleting anything',async()=>{
 for(const alter of [f=>f.testPaid.includeFields.pop(),f=>f.testPaid.apiVersion.handle='2026-10',f=>f.rows.push({...subscription(TARGETS[1],301),filter:null}),f=>f.rows.push(subscription(TARGETS[1],301),subscription(TARGETS[1],302))]){
  const f=fixture();alter(f);const before=structuredClone(f.rows);await assert.rejects(()=>ensureDoorbellWebhooks({client:f.client,apply:true,release,probe:async()=>true}));assert.equal(f.created.length,0);assert.deepEqual(f.rows,before);
 }
});
test('owner inventory pagination is complete before planning and missing cursors are refused',async()=>{
 const f=fixture(),orig=f.client.graphql;
 f.client.graphql=async(q,v)=>q===INVENTORY_QUERY?{data:{webhookSubscriptions:{nodes:[],pageInfo:{hasNextPage:true,endCursor:null}}}}:orig(q,v);
 await assert.rejects(()=>ensureDoorbellWebhooks({client:f.client}),{code:'inventory_cursor'});assert.equal(f.created.length,0);
});

test('apply checks all126 persisted source hashes, approval variants and current binding heads before connecting',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),{DatabaseSync}=await import('node:sqlite'),{createHash}=await import('node:crypto');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-webhook-release-')),filename=path.join(dir,'workshop.sqlite'),db=new DatabaseSync(filename);t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
 db.exec(`PRAGMA user_version=4;
 CREATE TABLE products(tenant_id TEXT,id TEXT,revision INTEGER,archived INTEGER);
 CREATE TABLE product_revisions(tenant_id TEXT,product_id TEXT,revision INTEGER,document TEXT);
 CREATE TABLE doorbell_live_order_approvals(tenant_id TEXT,shop TEXT,product_gid TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT,variants_json TEXT,approval_id TEXT);
 CREATE TABLE shop_product_binding_heads(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER);
 CREATE TABLE shop_product_binding_revisions(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER,store_id TEXT,product_gid TEXT,cfg_id TEXT,cfg_revision INTEGER);
 BEGIN;`);
 const manifest={schema:'gravuru-doorbell-shop-bind/v1',shopDomain:SHOP_DOMAIN,products:[]},formats=['16x28','24x20','35x18'];
 for(let index=0;index<126;index++){
  const id='cfg_00000000-0000-4000-8000-'+String(index).padStart(12,'0'),shopifyProductId='gid://shopify/Product/'+(16000000000000+index),p={modelKey:'synthetic-'+Math.floor(index/3),formatKey:formats[index%3],productId:id,productRevision:1,shopifyProductId,variants:[]};
  for(const format of formats)for(const color of ['black','anthracite'])for(const frame of ['a','b','c','d'])for(const mounting of ['K00','GWS','KRA','SIL','B04S']){
   const n=57000000000000+index*120+p.variants.length,gid='gid://shopify/ProductVariant/'+n;
   p.variants.push({shopifyVariantId:gid,sku:'SYNTH-GUARD-'+n,priceCents:4999,options:{format,color,frame,mounting},selectedOptions:[{name:'Acrylfarbe',value:color},{name:'Edelstahlrahmen',value:format+' '+frame},{name:'Befestigung',value:mounting}]});
   db.prepare('INSERT INTO shop_product_binding_heads VALUES(?,?,?,?)').run('gravuru',SHOP_DOMAIN,gid,1);
   db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,?,?,?,?,?)').run('gravuru',SHOP_DOMAIN,gid,1,'acryl',shopifyProductId,id,1);
  }
  const doc=JSON.stringify({kind:'product',config:{profile:{kind:'layered-doorbell'},doorbell:{schema:'gravuru-doorbell/v1',modelKey:p.modelKey,defaultFormatKey:p.formatKey}}});
  db.prepare('INSERT INTO products VALUES(?,?,?,?)').run('gravuru',id,1,0);db.prepare('INSERT INTO product_revisions VALUES(?,?,?,?)').run('gravuru',id,1,doc);
  db.prepare('INSERT INTO doorbell_live_order_approvals VALUES(?,?,?,?,?,?,?,?)').run('gravuru',SHOP_DOMAIN,shopifyProductId,id,1,createHash('sha256').update(doc).digest('hex'),JSON.stringify(p.variants.map(v=>v.shopifyVariantId.split('/').at(-1))),release.approvalId);
  manifest.products.push(p);
 }
 db.exec('COMMIT;');
 const env={GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only',GRAVURU_DOORBELL_LIVE_ORDERS:'approved-20261027'},check=()=>assertDoorbellRelease({filename,manifest,env});
 assert.deepEqual(check(),release);
 db.prepare('UPDATE product_revisions SET document=? WHERE product_id=?').run('{}',manifest.products[0].productId);
 assert.throws(check,{code:'persisted_release_missing'});
});

test('contradictory CLI modes are refused before reading credentials or contacting Shopify',async()=>{
 for(const modes of [['--dry-run','--apply'],['--apply','--dry-run']])await assert.rejects(()=>run([...modes,'--out','unused.json','--manifest','unused.json','--db','unused.sqlite'],{env:{},stdout:{write(){assert.fail('must not emit success');}}}),{code:'usage'});
});
