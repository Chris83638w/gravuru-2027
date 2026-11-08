import test from 'node:test';
import assert from 'node:assert/strict';
import {createSteelPricingRepair,planSteelPricingInput,sha,TARGET,EXPECTED_BEFORE_SHA} from './steel-pricing-input-cas.mjs';
function fixture(){
 const variants=Object.fromEntries(Array.from({length:404},(_,i)=>[String(58104613339516+i*32768),1748+i]));
 const old={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:TARGET,revision:1,currency:'EUR',variants,extraMotifCents:169,extraPhotoCents:0};
 return JSON.stringify({...old,schema:'gravuru-personalization-pricing/v2',revision:2,extraLogoCents:1299,history:[structuredClone(old)]});
}
function harness(change={}){
 const raw=fixture(),events=[],original={id:'gid://shopify/Metafield/1',namespace:'app--423276544001',key:'personalization',type:'json',value:raw,compareDigest:'a'.repeat(64)};
 let current=structuredClone(original),backup;
 const response=v=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json','x-shopify-api-version':'2026-07'}});
 const fetchImpl=async(url,options)=>{
  if(url.endsWith('/access_token')){events.push('auth');return response({access_token:'synthetic-token-123456789',expires_in:3600,scope:'write_products'});}
  const q=JSON.parse(options.body);
  if(q.query.startsWith('mutation')){
   events.push('mutation');assert.ok(backup);assert.equal(q.variables.metafields.length,1);
   const m=q.variables.metafields[0];assert.equal(m.ownerId,TARGET);assert.equal(m.namespace,'$app');assert.equal(m.key,'personalization');assert.equal(m.compareDigest,current.compareDigest);
   if(change.conflict)return response({data:{metafieldsSet:{metafields:[],userErrors:[{code:'INVALID_COMPARE_DIGEST'}]}}});
   current={...current,value:m.value,compareDigest:'b'.repeat(64)};return response({data:{metafieldsSet:{metafields:[current],userErrors:[]}}});
  }
  events.push('read');return response({data:{shop:{myshopifyDomain:'gravuru-design.myshopify.com',currencyCode:'EUR'},currentAppInstallation:{app:{id:change.wrongApp?'gid://shopify/App/9':'gid://shopify/App/423276544001'},accessScopes:[{handle:'write_products'}]},product:{id:TARGET,status:'ACTIVE',pricing:change.changed?{...current,value:current.value+' '}:current}}});
 };
 const client=createSteelPricingRepair({readSecret:()=> 'synthetic-secret-123456789'},{fetchImpl,fixtureSha:sha(raw)});
 const saveBackup=async value=>{events.push('backup');if(change.backupFailure)throw Error('backup_disk_failure');backup=structuredClone(value);return {sha256:sha(JSON.stringify(value))};};
 return {client,events,saveBackup,get current(){return current;},get backup(){return backup;},raw};
}
test('production planner pins observed SHA and refuses arbitrary metadata',()=>{
 assert.equal(EXPECTED_BEFORE_SHA,'76012d418f5c82b8f7c0c8339a0441f3fe41286aa903d287d84f00d169daf1ed');
 assert.throws(()=>planSteelPricingInput(fixture()),/previous_pricing_changed/);
 assert.throws(()=>createSteelPricingRepair({readSecret:()=>''},{fixtureSha:'a'.repeat(64)}),/test_transport/);
});
test('read-only preview reports size; apply backs up exact field before one CAS and verifies readback',async()=>{
 const h=harness(),p=await h.client.preview();assert.ok(p.beforeBytes>10000);assert.ok(p.afterBytes<10000);assert.equal(p.mutations,0);assert.ok(!h.events.includes('mutation'));
 h.events.length=0;const result=await h.client.apply({saveBackup:h.saveBackup,confirmedFunctionRelease:'gravuru-2027-steel-pricing-input-20261108-v1'});
 assert.deepEqual(h.events,['auth','read','backup','mutation','read']);assert.equal(result.mutations,1);assert.equal(h.backup.metafield.value,h.raw);assert.equal(result.afterSha,sha(h.current.value));
 assert.equal(JSON.parse(h.current.value).history[0].variantsFromRevision,2);
});
test('wrong app, concurrent change or failed backup never mutates',async()=>{
 for(const change of [{wrongApp:true},{changed:true},{backupFailure:true}]){
  const h=harness(change);await assert.rejects(h.client.apply({saveBackup:h.saveBackup,confirmedFunctionRelease:'gravuru-test'}));assert.ok(!h.events.includes('mutation'));assert.equal(h.current.value,h.raw);
 }
});
test('CAS conflict is not retried or considered success',async()=>{
 const h=harness({conflict:true});await assert.rejects(h.client.apply({saveBackup:h.saveBackup,confirmedFunctionRelease:'gravuru-test'}),/write_unconfirmed/);assert.equal(h.events.filter(e=>e==='mutation').length,1);assert.equal(h.current.value,h.raw);
});
test('rollback requires unchanged repaired value, new backup and exact original raw bytes',async()=>{
 const h=harness();await h.client.apply({saveBackup:h.saveBackup,confirmedFunctionRelease:'gravuru-test'});const backup=h.backup;h.events.length=0;
 const restored=await h.client.restore({backup,saveBackup:h.saveBackup});assert.equal(h.current.value,h.raw);assert.equal(restored.restoredSha,sha(h.raw));assert.deepEqual(h.events,['auth','read','backup','mutation','read']);
 await assert.rejects(h.client.restore({backup,saveBackup:h.saveBackup}),/current_changed/);
});
