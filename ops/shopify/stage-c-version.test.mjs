import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {proposeStageC,verifyStageCCandidate,verifyStageCExtensionsCandidate,STAGE_C} from './stage-c-version.mjs';
// Synthetische Module in der Form der vorhandenen Tests (order-scope-version.test.mjs); keine echte Kennung.
const types=['app_access','webhooks','app_home','theme_app_extension','function','function','privacy_compliance','app_proxy'];
function fixture(){return {version:{name:'Synthetic'},appModuleVersions:types.map((type,i)=>({type,registrationId:String(i),registrationUuid:'uuid-'+i,registrationTitle:type+'-'+i,target:'',config:type==='app_access'?{scopes:'read_orders,read_products,write_products',optional_scopes:['write_cart_transforms']}:type==='function'?{module_id:'1111111'+i+'-1111-1111-1111-111111111111',module_metadata:{module_wasm_size_bytes:22036+i},untouched:{value:i}}:{untouched:{value:i}}}))};}
const extension=(handle,i)=>({type:'ui_extension',registrationId:'new-'+i,registrationUuid:'new-uuid-'+i,registrationTitle:handle,target:'',config:{api_version:'2026-10'}});
const candidate=(before,change=()=>{})=>{const modules=[...proposeStageC(before).proposed,...STAGE_C.extensions.map(extension)];change(modules);return {versionTag:'stufe-c-test',appModuleVersions:modules};};

test('only write_orders is appended; every existing module, optional scope, function and theme survives',()=>{
 const before=fixture(),saved=structuredClone(before),p=proposeStageC(before);assert.deepEqual(before,saved);
 const expected=structuredClone(before.appModuleVersions);expected[0].config.scopes='read_orders,read_products,write_orders,write_products';assert.deepEqual(p.proposed,expected);
 assert.deepEqual([p.addedScopes,p.removedScopes,p.addedExtensions,p.moduleCount,p.released],[['write_orders'],[],['gravuru-order-block','gravuru-thank-you-preview'],10,false]);
 const verified=verifyStageCCandidate(before,candidate(before));
 assert.deepEqual(verified,{addedScopes:['write_orders'],removedScopes:[],unchangedModules:7,changedModules:['app_access'],addedExtensions:[{handle:'gravuru-order-block',type:'ui_extension',target:null},{handle:'gravuru-thank-you-preview',type:'ui_extension',target:null}],released:false});
});
test('a baseline that already writes orders, lacks read_orders, already carries the extensions or is malformed is refused',()=>{
 for(const change of [m=>m[0].config.scopes+=',write_orders',m=>m[0].config.scopes='read_products,write_products',m=>m[0].config.scopes='read_orders, write_products',m=>m[0].config.scopes=7,m=>m[1].type='app_access',m=>m.shift(),m=>m[2].registrationId='1',m=>m[3].registrationTitle='gravuru-order-block',m=>m.length=0]){
  const before=fixture();change(before.appModuleVersions);assert.throws(()=>proposeStageC(before),/^Error: stage_c_/);
 }
 for(const value of [undefined,null,{},{appModuleVersions:'x'}])assert.throws(()=>proposeStageC(value),/stage_c_baseline/);
});
test('any other difference blocks the candidate: extra scope, removed or altered module, third or missing or foreign extension',()=>{
 const before=fixture();
 for(const change of [m=>m[0].config.scopes+=',write_customers',m=>m[0].config.scopes='read_orders,read_products,write_products',m=>m[0].config.optional_scopes=[],m=>m.splice(3,1),m=>m[3].config.untouched.value++,m=>m[4].config.untouched.value++,m=>m[4].config.module_id='22222222-2222-2222-2222-222222222222',m=>m[7].target='other',m=>m.push(extension('gravuru-third',9)),m=>m.pop(),m=>m[m.length-1].registrationTitle='fremde-extension',m=>m[m.length-1].registrationId=m[m.length-2].registrationId])
  assert.throws(()=>verifyStageCCandidate(before,candidate(before,change)),/^Error: stage_c_(?:candidate|candidate_changed|extensions)$/);
 assert.throws(()=>verifyStageCCandidate(before,{appModuleVersions:candidate(before).appModuleVersions}),/stage_c_candidate$/);
});
test('a re-uploaded function counts as unchanged only after the operator compared the binaries, and only at identical size',()=>{
 const before=fixture(),reuploaded=candidate(before,m=>m[4].config.module_id='22222222-2222-2222-2222-222222222222');
 assert.throws(()=>verifyStageCCandidate(before,reuploaded),/stage_c_candidate_changed/);
 assert.equal(verifyStageCCandidate(before,reuploaded,{sameFunctionBinaries:true}).unchangedModules,7);
 for(const change of [m=>m[4].config.module_metadata.module_wasm_size_bytes++,m=>m[4].config.untouched.value++,m=>m[4].config.module_id='kein-upload'])
  assert.throws(()=>verifyStageCCandidate(before,candidate(before,m=>{m[4].config.module_id='22222222-2222-2222-2222-222222222222';change(m);}),{sameFunctionBinaries:true}),/stage_c_candidate_changed/);
});
test('the two prepared extensions exist under exactly these handles; no identity is invented in the sources',()=>{
 const handles=['order-block','thank-you-preview'].map(dir=>fs.readFileSync(new URL('./'+dir+'/shopify.extension.toml',import.meta.url),'utf8').match(/^handle = "([^"]+)"$/m)[1]).sort();
 assert.deepEqual(handles,[...STAGE_C.extensions]);
 for(const file of ['stage-c-version.mjs','order-block/shopify.extension.toml','thank-you-preview/shopify.extension.toml'])assert.doesNotMatch(fs.readFileSync(new URL('./'+file,import.meta.url),'utf8'),/gid:\/\/shopify|\buid\s*=|client_id|[a-f0-9]{32}|myshopify\.com/,file);
});
// Folgeversion (Nachtrag 21.11.): `write_orders` ist schon aktiv, es kommen nur noch die beiden Extensions hinzu.
const scoped=()=>{const before=fixture();before.appModuleVersions[0].config.scopes='read_orders,read_products,write_orders,write_products';return before;};
const follow=(before,change=()=>{},handles=STAGE_C.extensions)=>{const modules=[...structuredClone(before.appModuleVersions),...handles.map(extension)];change(modules);return {versionTag:'stufe-c-bausteine-test',appModuleVersions:modules};};
test('follow-up version: with write_orders already active only the two extensions are added and nothing else changes',()=>{
 const before=scoped(),saved=structuredClone(before);
 assert.deepEqual(verifyStageCExtensionsCandidate(before,follow(before)),{addedScopes:[],removedScopes:[],unchangedModules:8,changedModules:[],addedExtensions:[{handle:'gravuru-order-block',type:'ui_extension',target:null},{handle:'gravuru-thank-you-preview',type:'ui_extension',target:null}],released:false});
 assert.deepEqual(before,saved);
 // Eine der beiden allein nur auf ausdrückliche Angabe; ohne sie gilt der Kandidat als unvollständig.
 assert.deepEqual(verifyStageCExtensionsCandidate(before,follow(before,()=>{},['gravuru-order-block']),{extensions:['gravuru-order-block']}).addedExtensions.map(e=>e.handle),['gravuru-order-block']);
 assert.throws(()=>verifyStageCExtensionsCandidate(before,follow(before,()=>{},['gravuru-order-block'])),/stage_c_extensions$/);
 for(const extensions of [[],['fremde-extension'],['gravuru-order-block','gravuru-order-block'],'gravuru-order-block'])assert.throws(()=>verifyStageCExtensionsCandidate(before,follow(before),{extensions}),/stage_c_extensions$/);
});
test('follow-up version: a baseline without write_orders or with an extension is refused, and any other difference blocks',()=>{
 assert.throws(()=>verifyStageCExtensionsCandidate(fixture(),follow(fixture())),/stage_c_scopes$/);
 for(const change of [m=>m[0].config.scopes='read_products,write_orders',m=>m[0].config.scopes=7,m=>m[1].type='app_access',m=>m[2].registrationId='1',m=>m[3].registrationTitle='gravuru-order-block',m=>m.length=0]){
  const before=scoped();change(before.appModuleVersions);assert.throws(()=>verifyStageCExtensionsCandidate(before,follow(scoped())),/^Error: stage_c_/);
 }
 const before=scoped();
 for(const change of [m=>m[0].config.scopes+=',write_customers',m=>m[0].config.scopes='read_orders,read_products,write_products',m=>m[0].config.optional_scopes=[],m=>m.splice(3,1),m=>m[3].config.untouched.value++,m=>m[4].config.module_id='22222222-2222-2222-2222-222222222222',m=>m[7].target='other',m=>m.push(extension('gravuru-third',9)),m=>m.pop(),m=>m[m.length-1].registrationTitle='fremde-extension'])
  assert.throws(()=>verifyStageCExtensionsCandidate(before,follow(before,change)),/^Error: stage_c_(?:candidate|candidate_changed|extensions)$/);
 assert.throws(()=>verifyStageCExtensionsCandidate(before,{appModuleVersions:follow(before).appModuleVersions}),/stage_c_candidate$/);
 const reuploaded=follow(before,m=>m[4].config.module_id='22222222-2222-2222-2222-222222222222');
 assert.equal(verifyStageCExtensionsCandidate(before,reuploaded,{sameFunctionBinaries:true}).unchangedModules,8);
 assert.throws(()=>verifyStageCExtensionsCandidate(before,follow(before,m=>{m[4].config.module_id='22222222-2222-2222-2222-222222222222';m[4].config.module_metadata.module_wasm_size_bytes++;}),{sameFunctionBinaries:true}),/stage_c_candidate_changed/);
});
