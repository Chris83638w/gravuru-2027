import test from 'node:test';import assert from 'node:assert/strict';
import {proposeOrderScope,verifyOrderScopeCandidate,ORDER_BASELINE} from './order-scope-version.mjs';
function fixture(){return {version:{name:'Gravuru Konfigurator'},appModuleVersions:['app_access','webhooks','app_home','theme_app_extension','function','privacy_compliance','app_proxy'].map((type,i)=>({type,registrationId:String(i),registrationUuid:'uuid-'+i,registrationTitle:type,target:'',config:type==='app_access'?{scopes:'read_products,write_products',optional_scopes:['write_cart_transforms'],access:{admin:{direct_api_mode:'online'}}}:type==='webhooks'?{api_version:'2026-07'}:type==='app_home'?{app_url:'https://app-2027.gravuru-designwerkstatt.de/werkstatt/',embedded:true}:{untouched:{value:i}}}))};}
test('only read_orders is appended and every existing module, optional scope, function and theme survives',()=>{
 const before=fixture(),saved=structuredClone(before),p=proposeOrderScope(before,ORDER_BASELINE);assert.deepEqual(before,saved);
 const expected=structuredClone(before.appModuleVersions);expected[0].config.scopes='read_orders,read_products,write_products';assert.deepEqual(p.proposed,expected);
 const verified=verifyOrderScopeCandidate(before,{versionTag:'test',appModuleVersions:p.proposed},ORDER_BASELINE);assert.deepEqual(verified.addedScopes,['read_orders']);assert.equal(verified.functionUnchanged,true);
});
test('changed baseline, extra scopes, missing modules or altered function cannot be published as the reviewed candidate',()=>{
 const before=fixture(),p=proposeOrderScope(before,ORDER_BASELINE);assert.throws(()=>proposeOrderScope(before,'other'));
 for(const change of [m=>m.pop(),m=>m[0].config.scopes+=',write_orders',m=>m[4].config.untouched.value++,m=>m[0].config.optional_scopes=[]]){
  const next=structuredClone(p.proposed);change(next);assert.throws(()=>verifyOrderScopeCandidate(before,{versionTag:'test',appModuleVersions:next},ORDER_BASELINE));
 }
 assert.throws(()=>proposeOrderScope({version:before.version,appModuleVersions:p.proposed},ORDER_BASELINE));
});

test('reuploaded function accepts only the already verified identical Wasm and preserved configuration',async()=>{
 const {verifyRebuiltOrderScopeCandidate}=await import('./order-scope-version.mjs');const before=fixture();Object.assign(before.appModuleVersions[4].config,{module_id:'11111111-1111-1111-1111-111111111111',module_metadata:{module_wasm_size_bytes:3294}});
 const candidate={versionTag:'rebuilt',appModuleVersions:proposeOrderScope(before,ORDER_BASELINE).proposed};candidate.appModuleVersions[4].config.module_id='22222222-2222-2222-2222-222222222222';
 const digest='f9360588df38eb108ec77ecd0276f46f4524841949c15a76d9789f332adb7890';assert.equal(verifyRebuiltOrderScopeCandidate(before,candidate,ORDER_BASELINE,digest).functionBinaryUnchanged,true);
 assert.throws(()=>verifyRebuiltOrderScopeCandidate(before,candidate,ORDER_BASELINE,'b'.repeat(64)));
 candidate.appModuleVersions[4].config.untouched.value++;assert.throws(()=>verifyRebuiltOrderScopeCandidate(before,candidate,ORDER_BASELINE,digest));
});
