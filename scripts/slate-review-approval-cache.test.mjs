import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlateApprovalTargetSource,rendererSignature} from './lib/slate-review-approval-targets.mjs';
import {nativeDesignReviewFingerprint} from './lib/design-review-approvals.mjs';

function fixture({products=5,designs=3,externalFont=false}={}) {
  const records=new Map(),originals=[],descriptors=[],calls={get:0,head:0,font:0};
  const font={regular:{units:1000,glyphs:{A:{a:600,d:'M0 0L1 1'}}}};
  const material={key:'steel',label:'Edelstahl',kind:'steel'};
  for(let p=0;p<products;p++) {
    const id='cfg_test'+p,key='group:'+p,ds=[];
    for(let d=0;d<designs;d++) {
      const originalId='D'+p+'-'+d,nativeId='katalog-'+originalId;
      ds.push({id:nativeId,name:originalId,katalog:{designId:originalId,target:{familyId:'steel-door-signs'}},objects:[{id:'text-1',type:'text',text:'A',font:'Full font',size:4,x:20,y:12,w:4,h:5}]});
      originals.push({id:originalId,reviewMaterial:material,reviewCategory:{key:'family',label:'Familie',rank:1,photo:'without',topic:'family'},targets:[{familyId:'steel-door-signs',sizeKey:'size',productKey:key,nativeDesignId:nativeId,mm:[80,35],status:'prepared'}]});
    }
    const document={schema:'gravuru-product/v1',name:key,config:{reviewOnly:true,profile:{id:key,revision:'1',kind:'universal-product',geometry:{shape:'rect',width:80,height:35,holes:[]},material:{kind:'steel',thicknessMm:1.5},processing:{profileId:'steel-engraving'},defaultDesignId:ds[0].id,designs:ds,optionGroups:[]},localResources:{fonts:externalFont?{}:{'Full font':font},motifs:[]}}};
    records.set(id,{id,revision:1,status:'draft',document});
    descriptors.push({key,productId:id,reviewOnly:true,designIds:ds.map(d=>d.katalog.designId)});
  }
  // Real catalogue order interleaves products. The source must group reads itself.
  originals.sort((a,b)=>a.id.split('-')[1].localeCompare(b.id.split('-')[1])||a.id.localeCompare(b.id));
  const pack={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,products:descriptors,originals};
  const imported={localOnly:true,published:false,shopifyWrites:0,products:structuredClone(descriptors)};
  const read=id=>{const r=records.get(id);if(!r)throw Object.assign(Error('not found'),{status:404});return r;};
  const workshop={repository:{head:id=>{calls.head++;const r=read(id);return {id:r.id,revision:r.revision,status:r.status};},get:id=>{calls.get++;return structuredClone(read(id));}},assets:{read:()=>{throw Error('unexpected asset');}},fonts:{resources:()=>{calls.font++;return {'Full font':font};}}};
  const source=createSlateApprovalTargetSource({pack,imported,workshop});
  const all=()=>{source.beginRead();return source.listTargets().map(key=>source.resolveTarget(key));};
  return {records,source,calls,all,font,workshop};
}

test('cold overview reads one document per product; warm overview checks heads without loading glyphs',()=>{
  const f=fixture(),cold=f.all();
  assert.ok(cold.every(r=>r.available));assert.equal(f.calls.get,5);assert.equal(f.calls.head,5);
  const warm=f.all();assert.equal(f.calls.get,5);assert.equal(f.calls.head,10);
  assert.deepEqual(warm,cold);
  const rendererVersion=rendererSignature();
  for(const r of cold){const doc=f.records.get(r.metadata.productId).document;assert.equal(r.fingerprint,nativeDesignReviewFingerprint({document:doc,designId:r.metadata.designId,rendererVersion}));}
});

test('document cache retains at most two products, even when fingerprints cannot be reused',()=>{
  const f=fixture({products:3,designs:1,externalFont:true}),keys=f.source.listTargets();
  f.source.beginRead();for(const key of keys)assert.equal(f.source.resolveTarget(key).available,true);
  assert.equal(f.calls.get,3);
  assert.equal(f.source.resolveTarget(keys[0]).available,true);assert.equal(f.calls.get,4,'first product was evicted');
  assert.equal(f.source.resolveTarget(keys[2]).available,true);assert.equal(f.calls.get,4,'recent product is retained');
  const before=f.source.resolveTarget(keys[2]).fingerprint;f.font.regular.glyphs.A.d='M3 3';
  f.source.beginRead();assert.notEqual(f.source.resolveTarget(keys[2]).fingerprint,before,'external fonts never use the immutable-local-font cache');
});

test('new heads force content/geometry/material/family checks and preserve unaffected-design fingerprints',()=>{
  const f=fixture({products:1,designs:2}),first=f.all(),record=f.records.get('cfg_test0'),saved=structuredClone(record.document);
  record.document.config.profile.designs[0].objects[0].x++;record.revision++;
  const changed=f.all();assert.notEqual(changed[0].fingerprint,first[0].fingerprint);assert.equal(changed[1].fingerprint,first[1].fingerprint);assert.equal(f.calls.get,2);
  for(const mutate of [d=>d.config.profile.material.kind='slate',d=>d.config.profile.geometry.width=81,d=>d.config.profile.designs[0].katalog.designId='foreign',d=>d.config.profile.designs[0].katalog.target.familyId='foreign',d=>d.config.reviewOnly=false]) {
    record.document=structuredClone(saved);mutate(record.document);record.revision++;assert.equal(f.all()[0].available,false);
  }
});

test('archived/missing heads cannot return warm cached approval fingerprints',()=>{
  const f=fixture({products:1,designs:1});assert.equal(f.all()[0].available,true);
  const record=f.records.get('cfg_test0');record.status='archived';record.revision++;
  assert.equal(f.all()[0].available,false);assert.equal(f.calls.get,1,'archive needs no payload');
  f.records.delete('cfg_test0');assert.equal(f.all()[0].available,false);assert.equal(f.calls.get,1);
});

test('a head/document race fails closed instead of binding approval to a different revision',()=>{
  const f=fixture({products:1,designs:1});const original=f.source.listTargets()[0];
  const readHead=f.workshop.repository.head;
  f.workshop.repository.head=id=>{const head=readHead(id);f.records.get(id).revision++;return head;};
  f.source.beginRead();assert.equal(f.source.resolveTarget(original).available,false);assert.equal(f.calls.get,1);
});

test('tenant-denied head lookup fails closed even after a valid fingerprint was cached',()=>{
  const f=fixture({products:1,designs:1});assert.equal(f.all()[0].available,true);
  f.workshop.repository.head=()=>{throw Object.assign(Error('not found in this tenant'),{status:404});};
  assert.equal(f.all()[0].available,false);assert.equal(f.calls.get,1);
});
