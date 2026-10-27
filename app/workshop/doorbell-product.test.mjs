import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {nativeDoorbellConfig} from './doorbell-product.mjs';
import {nativeSpecimenConfig} from './specimen-product.mjs';
import {makeProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';
import {resolvedOptions,selectedProfile,quote,variantCombinations,choiceOptions,saveDraft,readDraft,designFromState} from '../configurator/variant-m/contract.mjs';

test('generic doorbell enters native document path while AOSU specimen release lock remains',()=>{
 const raw=doorbellFixture(),before=structuredClone(raw),c=nativeDoorbellConfig(raw),doc=makeProductDocument(raw,{name:'Funkklingel Test'});
 assert.deepEqual(raw,before);assert.equal(doc.config.doorbell.schema,'gravuru-doorbell/v1');
 assert.equal(doc.config.profile.doorbellSchema,'gravuru-doorbell/v1');
 assert.throws(()=>nativeSpecimenConfig({...c,reviewOnly:false}),/ohne Shop- oder Fertigungsfreigabe/);
 assert.throws(()=>makeProductDocument({...raw,doorbell:{schema:'unknown'}}));
});
test('120 commercial combinations preserve cents; opposite stays a free serialized customer field',()=>{
 const c=nativeDoorbellConfig(doorbellFixture()),variants=variantCombinations(c);
 assert.equal(variants.length,120);assert.ok(variants.every(v=>!Object.hasOwn(v,'position')));
 for(const options of variants){
  const base=c.doorbell.formats.find(f=>f.key===options.format).basePriceCents;
  const surcharge=c.profile.mounting.options.find(m=>m.key===options.mounting).surchargeCents;
  for(const position of ['standard','opposite']){
   const p=selectedProfile(c,{...options,position}),q=quote(c,p.designs[0].objects,p.designs[0].id,{...options,position},2);
   assert.equal(q.unitCents,base+surcharge);assert.equal(q.totalCents,2*(base+surcharge));
   assert.equal(q.options.position,position);assert.deepEqual(choiceOptions(c,q.options),options);
  }
 }
 assert.equal(resolvedOptions(c).position,'standard');
});
test('landscape and opposite draft validates active geometry/template instead of root portrait',()=>{
 const doc=makeProductDocument(doorbellFixture()),c=doc.config,options={format:'35x18',position:'opposite',mounting:'B04S'};
 const resolved=resolveProduct(doc,{options}),design=structuredClone(resolved.design);
 assert.equal(resolved.physical.widthMm,350);assert.equal(resolved.physical.heightMm,180);
 assert.equal(resolved.price.unitCents,7368);assert.equal(resolved.designSpace.scaleX,1);assert.equal(resolved.designSpace.scaleY,1);
 design.objects[0].x-=1;
 assert.doesNotThrow(()=>validateProductDesign(doc,design,{options}));
 const state={designId:design.id,objects:design.objects,mOptions:options};
 assert.deepEqual(designFromState(c,state).marks,[]);
 const draft=saveDraft(c,state,options,c.localResources.fonts,c.localResources.motifs);
 const loaded=readDraft(c,draft,c.localResources.fonts,c.localResources.motifs);
 assert.equal(loaded.options.position,'opposite');assert.equal(loaded.options.format,'35x18');
 assert.deepEqual(loaded.design.objects,design.objects);
 const forged=structuredClone(draft);forged.options.position='standard';
 assert.throws(()=>readDraft(c,forged,c.localResources.fonts,c.localResources.motifs));
});
test('each main product may start in its own exact format and colour with all choices retained',()=>{
 const raw=doorbellFixture();raw.doorbell.defaultFormatKey='24x20';raw.basePriceCents=5999;
 raw.profile.optionGroups.find(g=>g.id==='format').defaultValueId='24x20';
 raw.profile.optionGroups.find(g=>g.id==='color').defaultValueId='anthrazit';
 const doc=makeProductDocument(raw),r=resolveProduct(doc);
 assert.equal(r.profile.geometry.width,240);assert.equal(r.resolvedOptions.color,'anthrazit');assert.equal(r.price.unitCents,5999);
 assert.equal(variantCombinations(doc.config).length,120);
});

test('a returning shop variant may override displayed defaults without changing main product identity',()=>{
 const raw=doorbellFixture();
 raw.profile.optionGroups.find(g=>g.id==='format').defaultValueId='35x18';
 const doc=makeProductDocument(raw),r=resolveProduct(doc);
 assert.equal(doc.config.doorbell.defaultFormatKey,'16x28');
 assert.equal(doc.config.basePriceCents,4999);
 assert.equal(r.profile.geometry.width,350);assert.equal(r.price.unitCents,6999);
 const state={designId:r.design.id,objects:r.design.objects};
 const draft=saveDraft(doc.config,state,r.resolvedOptions,doc.config.localResources.fonts,doc.config.localResources.motifs);
 assert.equal(draft.options.format,'35x18');
});

test('a format may add its original fixed decoration without acquiring customer edit rights',()=>{
 const raw=doorbellFixture();
 raw.doorbell.formats[0].profile.designs[0].objects.push({...raw.profile.designs[0].objects[1],id:'mark-1',x:80});
 raw.doorbell.defaultFormatKey='24x20';raw.basePriceCents=5999;
 raw.profile.optionGroups.find(g=>g.id==='format').defaultValueId='24x20';
 const doc=makeProductDocument(raw),options={format:'16x28'},design=resolveProduct(doc,{options}).design;
 assert.equal(Object.hasOwn(doc.elementRights.example,'mark-1'),false);
 assert.doesNotThrow(()=>validateProductDesign(doc,design,{options}));
 const moved=structuredClone(design);moved.objects.find(o=>o.id==='mark-1').x++;
 assert.throws(()=>validateProductDesign(doc,moved,{options}));
 const removed={...design,objects:design.objects.filter(o=>o.id!=='mark-1')};
 assert.throws(()=>validateProductDesign(doc,removed,{options}));
});

