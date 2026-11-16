import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createGalleryManagementFixture} from '../fixtures/gallery-management.mjs';
import {createGalleryManagementHandler} from './gallery-management-http.mjs';
import {steelModuleSwitches} from '../../app/workshop/test-fixtures/module-profile-source.mjs';

// Exercise the real gallery registry, both HTTP routes and native source reader.
// The timing assertion is structural (zero full-document reads), not machine speed.
test('private management starts with compact metadata and reads only selected native sources',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-lazy-management-'));let management,targetLists=0;
 const f=await createGalleryManagementFixture(root,{managementFactory:({filename})=>({connect:({sourceWorkshop,sourceRegistry,csrfToken})=>{
  management=sourceWorkshop.configureModuleManagement({filename,sourceRegistry});
  management.profiles.create({name:'Saved profile',modules:steelModuleSwitches});
  const synchronizer={status:()=>({executionEnabled:false,mode:'shopify',operations:[]}),listTargets:()=>{targetLists++;return {targets:[]};}};
  const handle=createGalleryManagementHandler({workshop:sourceWorkshop,templates:management.groups,synchronizer,csrfToken});
  return {handle,close(){}};
 }})});
 const base=await f.listen();
 t.after(async()=>{await f.close();assert.equal(path.dirname(root),os.tmpdir());fs.rmSync(root,{recursive:true,force:true});});
 const get=f.workshop.repository.get.bind(f.workshop.repository),reads=[];
 f.workshop.repository.get=(id,options)=>{reads.push(id);return get(id,options);};
 const read=async route=>{const r=await fetch(base+route);return {status:r.status,data:await r.json()};};
 const api='/originale/verwaltung/api/',modules='/api/workshop/configurator-modules';
 const context=await read(api+'context');assert.equal(context.status,200);assert.equal(context.data.sources.length,2);assert.equal(context.data.sync.executionEnabled,false);assert.equal(context.data.targetsDeferred,true);
 assert.deepEqual(reads,[]);assert.equal(targetLists,0);
 const overview=await read(modules);assert.equal(overview.status,200);assert.equal(overview.data.profiles.length,1);assert.equal(overview.data.sources.length,2);assert.ok(overview.data.scopes.length>0);assert.equal(overview.data.localOnly,true);assert.equal(overview.data.shopifyWrites,0);assert.deepEqual(reads,[]);
 assert.ok(context.data.sources.every(s=>s.detailsLoaded===false&&!s.optionGroups&&!s.moduleAvailability));
 const key=context.data.sources[0].key,productId=context.data.sources[0].productId,otherId=context.data.sources[1].productId;
 for(const route of [api+'sources?',modules+'/sources?']){
  reads.length=0;const details=await read(route+new URLSearchParams({key}));assert.equal(details.status,200,JSON.stringify(details));
  assert.equal(details.data.sources[0].detailsLoaded,true);assert.equal(details.data.sources[0].familyId,'test-schilder');assert.equal(details.data.sources[0].source.revision,1);assert.ok(details.data.sources[0].optionGroups.length);assert.ok(details.data.sources[0].moduleAvailability);
  assert.ok(reads.length>0);assert.ok(reads.every(id=>id===productId));assert.ok(!reads.includes(otherId));
  reads.length=0;assert.equal((await read(route+'key=unknown')).status,404);assert.deepEqual(reads,[]);
  for(const query of ['',new URLSearchParams([['key',key],['key',key]]).toString(),'key='+key+'&bad=1'])assert.equal((await read(route+query)).status,422);
 }
 reads.length=0;const sync=await read(api+'sync');assert.equal(sync.status,200);assert.equal(sync.data.status.executionEnabled,false);assert.equal(targetLists,1);assert.deepEqual(reads,[]);
 assert.equal((await fetch(base+api+'sources?key='+key,{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 const csrf=context.data.csrfToken;
 const post=async(action,data)=>{const r=await fetch(base+api+action,{method:'POST',headers:{Origin:base,'X-Slate-Review-CSRF':csrf,'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
 reads.length=0;
 const draft=await post('template-draft',{name:'Chosen only',scope:{lineId:'test-linie',subcategoryId:'namensschilder'},sourceKeys:[key]});
 assert.equal(draft.status,200,JSON.stringify(draft));assert.ok(reads.every(id=>id===productId));
 const saved=await post('template-create',draft.data);assert.equal(saved.status,200);
 const plan=await post('creation-plan',{templateId:saved.data.id,templateRevision:1,creationKey:'lazy-01',products:[{key:'new',targetKey:key,name:'Chosen'}]});assert.equal(plan.status,200);assert.equal(plan.data.valid,true);
 const before=f.workshop.repository.list().length,record=get(productId),changed=structuredClone(record.document);changed.name+=' updated';
 f.workshop.repository.save(productId,changed,record.revision);
 const fresh=await read(api+'sources?key='+key);assert.equal(fresh.data.sources[0].source.revision,2);assert.match(fresh.data.sources[0].name,/updated/);
 const confirmation=await post('creation-confirm',{planId:plan.data.id,planHash:plan.data.planHash,accepted:true});assert.equal(confirmation.status,409);assert.equal(f.workshop.repository.list().length,before);
});
