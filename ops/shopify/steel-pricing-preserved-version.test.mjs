import test from 'node:test';import assert from 'node:assert/strict';
import {proposeSteelPricingVersion,verifySteelPricingVersion,stageSteelPricingVersion,APP_KEY,BASELINE_VERSION,BASELINE_TAG,ARTIFACT_TAG,RELEASE_TAG,WASM} from './steel-pricing-preserved-version.mjs';
function fixture(){
 const module=(registrationTitle,type,registrationId,config={},target='')=>({registrationId,registrationUuid:registrationId+'-uuid',registrationTitle,type,config,target});
 const fn=module('gravuru-personalization-price','function','3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef',{app_key:APP_KEY,module_id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',module_metadata:{module_wasm_size_bytes:1234},targets:[{handle:'cart.transform.run',input_query:'same query'}]},'cart.transform.run');
 const before={version:{name:'Gravuru Konfigurator'},appModuleVersions:[fn,module('gravuru-storefront','theme_app_extension','a4d6506c-8e89-ca7d-f5b1-1a0d1e00a1f9bb93e76a',{theme_extension:{files:{'blocks/real.liquid':'preservedHash','assets/existing.js':'anotherHash'}}}),module('app_home','app_home','home',{app_url:'https://app-2027.gravuru-designwerkstatt.de/werkstatt/'}),module('app_access','app_access','access',{scopes:'unchanged'}),module('webhooks','webhooks','webhooks',{api_version:'2026-07'}),module('proxy','app_proxy','proxy',{prefix:'apps',subpath:'konfigurator'})]};
 const artifact={versionTag:ARTIFACT_TAG,appModuleVersions:[structuredClone(fn)]};artifact.appModuleVersions[0].config.module_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';artifact.appModuleVersions[0].config.module_metadata.module_wasm_size_bytes=WASM.bytes;
 return {before,artifact};
}
test('complete remote inventory survives; only compiled Function identity/metadata changes',()=>{
 const {before,artifact}=fixture(),copy=structuredClone(before),p=proposeSteelPricingVersion(before,artifact,BASELINE_VERSION);
 assert.equal(p.proposed.length,before.appModuleVersions.length);assert.deepEqual(p.proposed.slice(1),before.appModuleVersions.slice(1));assert.deepEqual(before,copy);
 const candidate={...before,versionTag:RELEASE_TAG,appModuleVersions:p.proposed};assert.equal(verifySteelPricingVersion(before,artifact,candidate,BASELINE_VERSION).themeFilesUnchanged,true);
 for(const mutate of [c=>c.appModuleVersions.pop(),c=>c.appModuleVersions[1].config.theme_extension.files['blocks/real.liquid']='changed',c=>c.appModuleVersions[3].config.scopes='new',c=>c.appModuleVersions[0].config.targets[0].input_query='changed']){const c=structuredClone(candidate);mutate(c);assert.throws(()=>verifySteelPricingVersion(before,artifact,c,BASELINE_VERSION));}
});
test('wrong baseline, binary size, target, query and artifact identity reject before staging',()=>{
 for(const mutate of [a=>a.versionTag='wrong',a=>a.appModuleVersions[0].config.module_metadata.module_wasm_size_bytes=1,a=>a.appModuleVersions[0].target='wrong',a=>a.appModuleVersions[0].config.targets[0].input_query='new',a=>a.appModuleVersions[0].registrationId='new']){const {before,artifact}=fixture();mutate(artifact);assert.throws(()=>proposeSteelPricingVersion(before,artifact,BASELINE_VERSION));}
 assert.throws(()=>proposeSteelPricingVersion(fixture().before,fixture().artifact,'other'));
});
test('empty compiler localization never replaces the exact active translations',()=>{
 const {before,artifact}=fixture();before.appModuleVersions[0].config.localization={default_locale:'en',translations:{en:{name:'existing',description:'existing'}}};artifact.appModuleVersions[0].config.localization={};
 const p=proposeSteelPricingVersion(before,artifact,BASELINE_VERSION);assert.deepEqual(p.proposed[0].config.localization,before.appModuleVersions[0].config.localization);
 artifact.appModuleVersions[0].config.localization={default_locale:'de'};assert.throws(()=>proposeSteelPricingVersion(before,artifact,BASELINE_VERSION));
});
test('staging saves baseline/proposal before a single unpublished deploy and verifies unchanged active version',async()=>{
 const {before,artifact}=fixture(),events=[],p=proposeSteelPricingVersion(before,artifact,BASELINE_VERSION),candidate={...before,uuid:'candidate',versionTag:RELEASE_TAG,appModuleVersions:p.proposed};
 const client={appVersions:async()=>({app:{appVersions:{nodes:[{status:'active',versionId:BASELINE_VERSION,versionTag:BASELINE_TAG}]}}}),activeAppVersion:async()=>before,appVersionByTag:async(_app,tag)=>tag===ARTIFACT_TAG?artifact:candidate,deploy:async args=>{events.push('deploy');assert.equal(args.skipPublish,true);assert.equal(args.appManifest.modules.length,6);return {appDeploy:{appVersion:{uuid:'candidate'},userErrors:[]}};}};
 const r=await stageSteelPricingVersion(client,{commit:'a'.repeat(40),save:async name=>events.push(name)});
 assert.deepEqual(events,['before.json','artifact.json','expected.json','deploy','creation.json','candidate.json']);assert.equal(r.released,false);assert.equal(r.themeFilesUnchanged,true);
});
