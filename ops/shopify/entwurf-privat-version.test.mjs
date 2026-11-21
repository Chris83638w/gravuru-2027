import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {verifyPrivateReferenceCandidate,expectedQueries,PRIVATE_REFERENCE} from './entwurf-privat-version.mjs';
// Synthetische Module in der Form der vorhandenen Tests (stage-c-version.test.mjs); keine echte Kennung.
const queries=expectedQueries(),PRICE='gravuru-personalization-price',GUARD='gravuru-checkout-guard';
const types=['app_access','webhooks','app_home','theme_app_extension','function','function','privacy_compliance','app_proxy','ui_extension','ui_extension'];
const titles={4:PRICE,5:GUARD};
function fixture(){return {version:{name:'Synthetic'},appModuleVersions:types.map((type,i)=>({type,registrationId:String(i),registrationUuid:'uuid-'+i,registrationTitle:titles[i]||type+'-'+i,target:'',
 config:type==='app_access'?{scopes:'read_orders,read_products,write_orders,write_products',optional_scopes:['write_cart_transforms']}
  :type==='function'?{module_id:'1111111'+i+'-1111-1111-1111-111111111111',module_metadata:{module_wasm_size_bytes:22036+i},api_version:'2026-07',targets:[{target:i===4?'cart.transform.run':'cart.validations.generate.run',input_query:queries[titles[i]].before,export:'run'}],untouched:{value:i}}
  :{untouched:{value:i}}}))};}
function candidate(before,change=()=>{}){
 const modules=structuredClone(before.appModuleVersions);
 for(const [index,handle] of Object.entries(titles)){const m=modules[index];m.config.targets[0].input_query=queries[handle].after;m.config.module_id='2222222'+index+'-2222-2222-2222-222222222222';m.config.module_metadata={module_wasm_size_bytes:22400+Number(index)};}
 change(modules);return {versionTag:'entwurf-privat-test',appModuleVersions:modules};
}

test('only the two functions change: new input query and new binary, every other module and every scope survives',()=>{
 const before=fixture(),saved=structuredClone(before),verified=verifyPrivateReferenceCandidate(before,candidate(before));
 assert.deepEqual(before,saved);
 assert.deepEqual(verified,{changedModules:[GUARD,PRICE],unchangedModules:8,addedModules:[],removedModules:[],scopesUnchanged:true,released:false,functions:[
  {handle:GUARD,previousModuleId:'11111115-1111-1111-1111-111111111111',moduleId:'22222225-2222-2222-2222-222222222222',wasmBytesBefore:22041,wasmBytesAfter:22405},
  {handle:PRICE,previousModuleId:'11111114-1111-1111-1111-111111111111',moduleId:'22222224-2222-2222-2222-222222222222',wasmBytesBefore:22040,wasmBytesAfter:22404}]});
 // Mit der Größe der selbst gebauten Dateien: nur genau diese Größen gelten.
 assert.equal(verifyPrivateReferenceCandidate(before,candidate(before),{wasmBytes:{[PRICE]:22404,[GUARD]:22405}}).released,false);
 assert.throws(()=>verifyPrivateReferenceCandidate(before,candidate(before),{wasmBytes:{[PRICE]:22403}}),/private_reference_binary_size$/);
 // Zeilenenden und Leerraum am Rand der Abfrage zählen nicht als Unterschied (so vergleicht auch release.mjs).
 assert.equal(verifyPrivateReferenceCandidate(before,candidate(before,m=>m[4].config.targets[0].input_query='\n'+queries[PRICE].after+'  \n')).changedModules.length,2);
});
test('any other difference blocks the candidate',()=>{
 const before=fixture();
 for(const change of [
  m=>m[0].config.scopes+=',write_customers',m=>m[0].config.optional_scopes=[],m=>m[3].config.untouched.value++,m=>m[7].target='other',m=>m[8].config.untouched.value++,
  // an einer der beiden Funktionen mehr als Abfrage und Datei
  m=>m[4].config.untouched.value++,m=>m[5].config.api_version='2026-10',m=>m[4].config.targets[0].export='other',m=>m[4].target='x',m=>m[5].registrationUuid='y',
  // falsche, alte oder vertauschte Abfrage
  m=>m[4].config.targets[0].input_query=queries[PRICE].before,m=>m[5].config.targets[0].input_query=queries[PRICE].after,m=>m[4].config.targets[0].input_query+='\n# extra',m=>m[4].config.targets.push(structuredClone(m[4].config.targets[0])),
  // keine neue Datei, kaputte Kennung oder unplausible Größe
  m=>m[4].config.module_id='11111114-1111-1111-1111-111111111111',m=>m[5].config.module_id='kein-upload',m=>m[5].config.module_metadata={module_wasm_size_bytes:0},m=>delete m[4].config.module_metadata,m=>m[4].config.module_metadata.module_wasm_size_bytes=300000,
  // Modul fehlt, kommt hinzu oder wird ersetzt
  m=>m.pop(),m=>m.push({...structuredClone(m[8]),registrationId:'neu'}),m=>m[8].registrationId='neu',m=>m[9].registrationId=m[8].registrationId])
  assert.throws(()=>verifyPrivateReferenceCandidate(before,candidate(before,change)),/^Error: private_reference_(?:candidate|modules|query|binary|candidate_changed)$/,String(change));
 assert.throws(()=>verifyPrivateReferenceCandidate(before,{appModuleVersions:candidate(before).appModuleVersions}),/private_reference_candidate$/);
});
test('a baseline that is not the active state is refused: missing or doubled function, other query, malformed list',()=>{
 for(const change of [m=>m[4].registrationTitle='other',m=>m[5].type='ui_extension',m=>m[8].registrationTitle=PRICE,m=>m[2].registrationId='1',m=>m.length=0]){
  const before=fixture();change(before.appModuleVersions);assert.throws(()=>verifyPrivateReferenceCandidate(before,candidate(fixture())),/^Error: private_reference_(?:baseline|functions)$/);
 }
 // Trägt die aktive Version schon die neue Abfrage (oder eine fremde), ist sie nicht die Grundlage dieser Änderung.
 for(const change of [m=>m[4].config.targets[0].input_query=queries[PRICE].after,m=>m[5].config.targets[0].input_query='query X { cart { lines { id } } }',m=>m[4].config.targets=[]]){
  const before=fixture();change(before.appModuleVersions);assert.throws(()=>verifyPrivateReferenceCandidate(before,candidate(fixture())),/private_reference_baseline_query$/);
 }
 for(const value of [undefined,null,{},{appModuleVersions:'x'}])assert.throws(()=>verifyPrivateReferenceCandidate(value,candidate(fixture())),/private_reference_baseline$/);
});
test('the compared queries are the repository files of the active and the follow-up function sources; no identity in the helper',()=>{
 assert.deepEqual(Object.keys(PRIVATE_REFERENCE.functions).sort(),[GUARD,PRICE]);
 for(const [handle,files] of Object.entries(PRIVATE_REFERENCE.functions)){
  assert.equal(queries[handle].before,fs.readFileSync(new URL('./'+files.before,import.meta.url),'utf8'));
  assert.equal(queries[handle].after,fs.readFileSync(new URL('./'+files.after,import.meta.url),'utf8'));
  // Einziger Unterschied der Abfrage ist die eine zusätzliche Zeile für den privaten Schlüssel.
  const added=queries[handle].after.split('\n').filter(line=>!queries[handle].before.split('\n').includes(line));
  assert.deepEqual(added,['      designPrivate: attribute(key: "_gravuru_entwurf") { value }'],handle);
  assert.deepEqual(queries[handle].before.split('\n').filter(line=>!queries[handle].after.split('\n').includes(line)),[],handle);
 }
 assert.doesNotMatch(fs.readFileSync(new URL('./entwurf-privat-version.mjs',import.meta.url),'utf8'),/gid:\/\/shopify|\buid\s*=|client_id|[a-f0-9]{32}|myshopify\.com/);
});
