import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {APP,readActiveVersion,validateCliRoot} from './active-version-readonly.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const active={versionId:'gid://shopify/Version/1199363391489',versionTag:'gravuru-2027-steel-pricing-input-20261108-v2',status:'active'};
const versions=()=>({app:{id:APP.id,appVersions:{nodes:[{versionId:'gid://shopify/Version/1',status:'inactive'},structuredClone(active)]}},privateDiagnostic:'DO_NOT_OUTPUT'});
const snapshot=()=>({id:'gid://shopify/Release/1137137745921',privateDiagnostic:'DO_NOT_OUTPUT',appModuleVersions:[{
 registrationId:'3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef',registrationUuid:'01a0e45d-c47f-70b9-9d5a-a2c72120ae01',registrationTitle:'gravuru-personalization-price',type:'function',target:'cart.transform.run',
 config:{app_key:'9640dd7a6907f0c73e7013ea8c24869b',module_id:'e9c44f49-9a32-4548-a11b-87e89d798757',module_metadata:{module_wasm_size_bytes:20977},targets:[{handle:'cart.transform.run',input_query:'query { cart { lines { value } } }'}],privateDiagnostic:'DO_NOT_OUTPUT'}
},{registrationTitle:'unrelated',privateDiagnostic:'DO_NOT_OUTPUT'}]});
function client({first=versions(),last=versions(),detail=snapshot()}={}){let reads=0;const calls=[];return {calls,appVersions:async arg=>{calls.push(['appVersions',arg]);return ++reads===1?first:last;},activeAppVersion:async arg=>{calls.push(['activeAppVersion',arg]);return detail;},deploy(){throw Error('MUTATION');}};}

test('actual method shapes; bracketed version identity, honest time and exact sanitized projection',async()=>{
 const c=client();let time=Date.parse('2026-11-12T10:56:49.000Z');const report=await readActiveVersion(c,{clock:()=>{const now=time;time+=1000;return now;}});
 assert.deepEqual(c.calls,[['appVersions',APP],['activeAppVersion',{apiKey:'9640dd7a6907f0c73e7013ea8c24869b'}],['appVersions',APP]]);
 assert.deepEqual(report.activeVersion,active);assert.equal(report.readStartedAt,'2026-11-12T10:56:49.000Z');assert.equal(report.observedAt,'2026-11-12T10:56:50.000Z');assert.equal(report.readCompletedAt,'2026-11-12T10:56:51.000Z');
 assert.equal(report.releaseId,'gid://shopify/Release/1137137745921');assert.notEqual(report.releaseId,report.activeVersion.versionId);assert.equal(report.wasmDigestRead,false);assert.equal(report.mutations,0);
 assert.equal(report.function.wasmBytes,20977);assert.equal(report.function.containsValue,true);assert.equal(report.function.containsJsonValue,false);assert.equal(report.function.inputQuerySha256,sha(snapshot().appModuleVersions[0].config.targets[0].input_query));
 const serialized=JSON.stringify(report);assert.equal(serialized.includes('DO_NOT_OUTPUT'),false);assert.equal(serialized.includes('query {'),false);assert.equal(serialized.includes('unrelated'),false);assert.equal('wasmSha256' in report.function,false);
});
test('changed, absent or duplicate active version and wrong app stop the read',async()=>{
 const changed=versions();changed.app.appVersions.nodes[1].versionId='gid://shopify/Version/2';await assert.rejects(readActiveVersion(client({last:changed})),{code:'version_reader_active_changed'});
 const duplicate=versions();duplicate.app.appVersions.nodes.push({...active});await assert.rejects(readActiveVersion(client({first:duplicate})),{code:'version_reader_active_not_unique'});
 const absent=versions();absent.app.appVersions.nodes=[];await assert.rejects(readActiveVersion(client({first:absent})),{code:'version_reader_versions_schema'});
 const wrong=versions();wrong.app.id='gid://shopify/App/999';await assert.rejects(readActiveVersion(client({first:wrong})),{code:'version_reader_versions_schema'});
});
test('function identity/schema and clock drift fail closed without raw remote errors',async()=>{
 const bad=snapshot();bad.appModuleVersions[0].config.app_key='other-app';await assert.rejects(readActiveVersion(client({detail:bad})),{code:'version_reader_function_schema'});
 const badTarget=snapshot();badTarget.appModuleVersions[0].config.targets[0].handle='other.target';await assert.rejects(readActiveVersion(client({detail:badTarget})),{code:'version_reader_function_schema'});
 const duplicated=snapshot();duplicated.appModuleVersions.push(duplicated.appModuleVersions[0]);await assert.rejects(readActiveVersion(client({detail:duplicated})),{code:'version_reader_function_not_unique'});
 let now=10000;await assert.rejects(readActiveVersion(client(),{clock:()=>now--}),{code:'version_reader_clock_changed'});
 const failed=client();failed.activeAppVersion=async()=>{throw Error('DO_NOT_OUTPUT credential-like diagnostic');};await assert.rejects(readActiveVersion(failed),e=>e.code==='version_reader_remote_failed'&&!String(e).includes('DO_NOT_OUTPUT'));
});
test('exact CLI version/export path is inspected without importing or executing SDK code',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'version-reader-test-'));try{
  fs.mkdirSync(path.join(dir,'dist'));const packageFile=path.join(dir,'package.json'),chunk=path.join(dir,'dist/chunk-Q45XAEG2.js');
  fs.writeFileSync(packageFile,JSON.stringify({name:'@shopify/cli',version:'4.9.0'}));fs.writeFileSync(chunk,"throw Error('MUST_NOT_IMPORT');\n");
  const checked=validateCliRoot(dir);assert.equal(checked.cliVersion,'4.9.0');assert.equal(checked.clientFile,chunk);assert.equal(checked.clientChunkSha256,sha(fs.readFileSync(chunk)));
  fs.writeFileSync(packageFile,JSON.stringify({name:'@shopify/cli',version:'4.9.3'}));fs.unlinkSync(chunk);assert.throws(()=>validateCliRoot(dir),{code:'version_reader_cli_version'});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
