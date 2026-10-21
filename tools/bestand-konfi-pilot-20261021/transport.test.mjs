import test from 'node:test';
import assert from 'node:assert/strict';
import {createPilotTransport} from './transport.mjs';
import {createPilotServer} from './server.mjs';
import {prepareNativeReview} from './adapter/native-review-adapter.mjs';
const productId='cfg_11111111-1111-4111-8111-111111111111',productRevision=5,id='adraft_22222222-2222-4222-8222-222222222222';
const prepared=()=>({gates:{nativeSendAllowed:true},input:{productId,productRevision,designId:'synthetic',objects:[],options:{},quantity:1,media:[]}});
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const savedResult=data=>response({productId,productRevision,designId:'synthetic',...data});
function fixture(onWrite){
  const calls=[];
  const client=createPilotTransport({productId,productRevision,request:async(path,options)=>{
    calls.push({path,options});
    if(path.endsWith('/session'))return response({scope:'shopify-merchant-test',csrfToken:'test-only-csrf',merchantTestCart:{productId,productRevision}});
    if(path.includes('/customer-model/'))return response({configuration:{id:productId,revision:productRevision}});
    return onWrite(path,options);
  }});return {client,calls};
}
test('pinning and adapter gate prevent incompatible data from being sent',async()=>{
  const {client,calls}=fixture(()=>{throw Error('must not send');});await client.load();
  const p=prepared();p.gates.nativeSendAllowed=false;
  await assert.rejects(client.savePrepared(p),{code:'pilot_adapter_blocked'});
  p.gates.nativeSendAllowed=true;p.input.productRevision=4;
  await assert.rejects(client.savePrepared(p),{code:'pilot_binding'});
  assert.equal(calls.length,2);
});
test('one private draft is revised; token is in header, never return value or URL',async()=>{
  let n=0;const {client,calls}=fixture(()=>savedResult({id,revision:++n,token:'a'.repeat(64),snapshotId:`proof_${n}`}));
  await client.load();await client.savePrepared(prepared());const saved=await client.savePrepared(prepared());
  assert.equal(saved.revision,2);assert.equal(calls[3].path,`/api/workshop/acrylic-drafts/${id}`);
  assert.equal(JSON.parse(calls[3].options.body).expectedRevision,1);assert.equal(calls[3].options.headers['X-Gravuru-Draft'],'a'.repeat(64));
  assert.ok(!JSON.stringify(saved).includes('a'.repeat(64)));assert.equal(client.status().cartEnabled,false);
});
test('network ambiguity blocks repeat to avoid duplicate drafts',async()=>{
  const {client,calls}=fixture(()=>{throw Error('connection lost');});await client.load();
  await assert.rejects(client.savePrepared(prepared()),{code:'pilot_unknown'});
  await assert.rejects(client.savePrepared(prepared()),{code:'pilot_unknown'});
  assert.equal(calls.length,3);assert.equal(client.status().uncertain,true);
});
test('review_busy is an explicit non-writing refusal and allows a later manual attempt',async()=>{
  let n=0;const {client}=fixture(()=>++n===1?response({error:{code:'review_busy'}},409):savedResult({id,revision:1,token:'a'.repeat(64),snapshotId:'proof_1'}));
  await client.load();await assert.rejects(client.savePrepared(prepared()),{code:'review_busy'});
  assert.equal(client.status().uncertain,false);assert.equal((await client.savePrepared(prepared())).revision,1);
});
test('parallel double click makes one write',async()=>{
  let resolve;const {client,calls}=fixture(()=>new Promise(r=>{resolve=r;}));await client.load();
  const saving=client.savePrepared(prepared());await assert.rejects(client.savePrepared(prepared()),{code:'pilot_busy'});
  resolve(savedResult({id,revision:1,token:'a'.repeat(64),snapshotId:'proof_1'}));await saving;assert.equal(calls.length,3);
});
test('incorrect success revision remains unknown instead of pretending to save',async()=>{
  const {client}=fixture(()=>savedResult({id,revision:3,token:'a'.repeat(64),snapshotId:'proof_1'}));await client.load();
  await assert.rejects(client.savePrepared(prepared()),{code:'pilot_unknown'});assert.equal(client.status().saved,null);
});
test('merchant grant must pin the exact product revision; local operator is insufficient',async()=>{
  for(const scope of ['local-operator','shopify-merchant-test']){
    const client=createPilotTransport({productId,productRevision,request:async()=>response({scope,csrfToken:'synthetic',merchantTestCart:{productId,productRevision:4}})});
    await assert.rejects(client.load(),{code:'pilot_scope'});
  }
});
test('adapter-to-transport preserves the original photo and keep instruction in a synthetic save',async()=>{
  const photo='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0E8AAAAASUVORK5CYII=';
  const object={id:'synthetic-photo',type:'photoSlot',x:20,y:20,w:15,h:15,uxUploadId:'synthetic-upload',uxUploadKind:'photo',uxPhotoBackground:'keep'};
  const p={id:productId,revision:productId+':5',kind:'universal-product',binding:{productId},material:{kind:'slate'},processing:{profileId:'slate-engraving'},geometry:{shape:'rect',width:220,height:140,holes:[]},optionGroups:[],designs:[{id:'synthetic',objects:[object],marks:[]}]};
  const model={configuration:{id:productId,revision:5},universal:{profile:p}};
  const draft={schema:'gravuru-universal-customer-draft/v1',profileId:productId,profileRevision:p.revision,productId,design:{id:'synthetic',objects:[object],marks:[]},options:{}};
  const files=new Map([['synthetic-upload',{file:new Blob([Buffer.from(photo,'base64')],{type:'image/png'})}]]);
  const result=await prepareNativeReview({model,draft,files,quantity:2,preview:photo});
  let written;const {client}=fixture((path,options)=>{written=JSON.parse(options.body);return savedResult({id,revision:1,token:'a'.repeat(64),snapshotId:'proof_synthetic'});});
  await client.load();await client.savePrepared(result);
  assert.equal(written.input.media[0].original,photo);assert.equal(written.input.objects[0].uxPhotoBackground,'keep');assert.equal(written.input.quantity,2);
});
test('a success belonging to another product, revision or design cannot be accepted',async()=>{
  for(const wrong of [{productId:'cfg_33333333-3333-4333-8333-333333333333'},{productRevision:99},{designId:'wrong'},{productId:undefined}]){
    const {client}=fixture(()=>savedResult({id,revision:1,token:'a'.repeat(64),snapshotId:'proof_1',...wrong}));await client.load();
    await assert.rejects(client.savePrepared(prepared()),{code:'pilot_unknown'});assert.equal(client.status().saved,null);assert.equal(client.status().uncertain,true);
  }
});
test('local probe cannot accept writes or expose arbitrary paths',async t=>{
  const server=createPilotServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const health=await (await fetch(base+'/pilot/health')).json();assert.equal(health.externalNetwork,false);
  assert.equal((await fetch(base+'/pilot/model',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/private')).status,404);
  assert.equal((await fetch(base+'/pilot/model',{headers:{origin:'https://foreign.invalid'}})).status,403);
});
