import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWorkshop} from './http.mjs';
import {familyProductConfig} from './product-families.mjs';
import {makeProductDocument} from './product-model.mjs';
import {createGalleryDesignAssignments,GALLERY_ASSIGNMENT_SCHEMA,GALLERY_ASSIGNMENT_PREFIX} from './gallery-design-assignments.mjs';
import {galleryTestPng} from '../../scripts/fixtures/gallery-editor.mjs';

const clone=structuredClone,steel={key:'steel',label:'Edelstahl',kind:'steel'};
const originals=['TRE-V2A-5x2-D401','TRE-V2A-8x3,5-D406'];
const errorIs=status=>error=>error.status===status;
function family(kind='steel',variant='schwarz'){
 const f=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
 f.groups=f.groups.filter(g=>g.key==='RE');f.sizes=[clone(f.sizes.find(s=>s.groupKey==='RE'))];
 f.id=kind==='steel'?'steel-door-signs':'acryl-3mm-tuerschilder-'+variant;
 f.name=kind==='steel'?'Edelstahl':variant;
 f.material=kind==='steel'?f.material:{kind:'acrylic',variant,label:variant,thicknessMm:3,processingProfileId:'acrylic-engraving'};
 f.sizes[0]={...f.sizes[0],key:kind==='steel'?'GR-ES-RE-50X20-T15':'GR-'+variant+'-RE-50X20-T3',widthMm:50,heightMm:20,baseCents:1299};
 f.mountingRules=f.mountingRules.filter(r=>f.sizes[0].mounting.includes(r.id));
 f.sizes.push({...clone(f.sizes[0]),key:f.sizes[0].key.replace('50X20','100X40'),widthMm:100,heightMm:40,baseCents:2099});
 return f;
}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-assignments-'));
 const sourceFamily=family(),config=familyProductConfig(sourceFamily,sourceFamily.sizes[0],1),seed=clone(config.profile.designs[0]);
 config.profile.designs=originals.map((id,i)=>({...clone(seed),id:'katalog-'+id.replaceAll(',','-'),name:'Original '+i,katalog:{originalId:id,designId:id,target:{familyId:sourceFamily.id,released:false}},objects:[{...clone(seed.objects[0]),text:i?'Mia':'Helga',size:3,x:25.123456789,y:10.012345678}]}));
 config.profile.defaultDesignId=config.profile.designs[0].id;
 const document=makeProductDocument(config,{name:'Private native Quelle'});
 const open=()=>createWorkshop({filename:path.join(root,'workshop.sqlite'),seedConfig:config,legacy:{},katalogDir:null});
 let workshop=open();
 t.after(()=>{workshop.close();fs.rmSync(root,{recursive:true,force:true});});
 const record=workshop.repository.create(document);
 const data={families:[sourceFamily,family('acrylic','schwarz'),family('acrylic','anthrazit')],lines:[{schema:'gravuru-line/v2',id:'tuerschilder',name:'Türschilder',families:['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit'],subcategories:[{id:'andenken',name:'Andenken',themeId:null}]}]};
 const targets=originals.map((originalId,i)=>({key:JSON.stringify(['steel',originalId,sourceFamily.sizes[0].key]),originalId,productId:record.id,designId:config.profile.designs[i].id,familyId:sourceFamily.id,sizeKey:sourceFamily.sizes[0].key,mm:[50,20],material:steel}));
 const originalFor=id=>({id,name:id,reviewCategory:{key:'andenken',label:'Andenken',rank:1,photo:'without'},reviewThemes:[{id:'andenken',label:'Andenken'}]});
 const serviceFor=(overrides={})=>createGalleryDesignAssignments({workshop,catalogue:()=>data,listTargets:()=>targets,originalFor,...overrides});
 const f={root,record,data,targets,sourceFamily,originalFor,serviceFor,get workshop(){return workshop;},restart(){workshop.close();workshop=open();return serviceFor();}};
 f.service=serviceFor();f.spec=(index=1,size=0)=>({lineId:'tuerschilder',subcategoryId:'andenken',familyId:data.families[index].id,sizeKey:data.families[index].sizes[size].key});
 f.input=(keys=targets,selected=[f.spec()])=>({sources:keys.map(v=>({key:v.key,expectedRevision:workshop.repository.get(v.productId).revision})),targets:selected});
 return f;
}

test('same-size native assignments preserve exact edited layers and rights, group selections, render and register atomically',t=>{
 const f=fixture(t),before=f.workshop.repository.get(f.record.id);
 const context=f.service.context({sourceKeys:f.targets.map(v=>v.key)});
 assert.equal(context.sources[0].revision,1);assert.deepEqual(context.sources[0].mm,[50,20]);assert.equal(context.sources[0].existingTargets[0].familyId,'steel-door-signs');
 const plan=f.service.plan(f.input(f.targets,[f.spec(1),f.spec(2)]));
 assert.equal(plan.valid,true,JSON.stringify(plan.entries.map(e=>e.reason)));assert.deepEqual(plan.counts,{create:4,existing:0,blocked:0});
 for(const e of plan.entries){assert.match(e.previewSvg,/<svg/);assert.match(e.previewSvg,/<path/);}
 assert.equal(f.workshop.repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}).length,0,'planning is read-only');
 const saved=f.service.execute({planId:plan.id,planHash:plan.planHash});
 assert.equal(saved.created,2);assert.equal(saved.createdTargets,4);assert.equal(saved.approved,false);assert.equal(saved.published,false);
 assert.deepEqual(f.workshop.repository.get(f.record.id),before);
 for(const registration of saved.targets){
  const doc=f.workshop.repository.get(registration.productId).document,source=before.document.config.profile.designs.find(d=>d.id===registration.nativeDesignId),target=doc.config.profile.designs.find(d=>d.id===registration.nativeDesignId);
  assert.equal(doc.config.profile.material.kind,'acrylic');assert.equal(doc.config.profile.material.thicknessMm,3);
  assert.equal(doc.config.reviewOnly,true);assert.equal(doc.config.profile.features.orderEnabled,false);assert.equal(doc.config.profile.features.productionConfirmed,false);
  assert.deepEqual(target.objects,source.objects);assert.deepEqual(target.marks,source.marks);assert.deepEqual(doc.elementRights[target.id],before.document.elementRights[source.id]);
  assert.equal(target.objects[0].x,25.123456789);assert.deepEqual(doc.config.localResources.fonts[source.objects[0].font],before.document.config.localResources.fonts[source.objects[0].font]);
  assert.equal(registration.schema,GALLERY_ASSIGNMENT_SCHEMA);assert.deepEqual(registration.mm,[50,20]);assert.equal(registration.source.revision,1);assert.equal(registration.source.productId,before.id);
  const family=f.data.families.find(v=>v.id===registration.familyId),expected=familyProductConfig(family,family.sizes[0],1);
  assert.deepEqual(doc.config.profile.optionGroups,expected.profile.optionGroups);assert.equal(doc.config.basePriceCents,1299);
 }
 const journal=f.workshop.repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX});assert.equal(journal.length,2);assert.equal(journal[0].registrations.length,2);assert.equal(JSON.stringify(journal).includes('glyphs'),false);
 const replay=f.service.execute({planId:plan.id,planHash:plan.planHash});assert.equal(replay.replayed,true);assert.equal(replay.created,0);assert.equal(replay.createdTargets,0);
 const first=saved.targets[0],edited=f.workshop.repository.get(first.productId);edited.document.config.profile.designs[0].objects[0].text='Bearbeitet';f.workshop.repository.save(first.productId,edited.document,edited.revision);
 const restarted=f.restart(),repeat=restarted.plan(f.input(f.targets,[f.spec(1),f.spec(2)]));assert.deepEqual(repeat.counts,{create:0,existing:4,blocked:0});
 assert.equal(restarted.execute({planId:repeat.id,planHash:repeat.planHash}).created,0);assert.equal(f.workshop.repository.get(first.productId).revision,2);assert.equal(restarted.registrations().length,4);
 assert.deepEqual(f.workshop.repository.importItems({prefix:'unrelated:'}),[]);
});

test('stale source, catalogue prices and offerings invalidate plans without native writes',t=>{
 const f=fixture(t),input=f.input([f.targets[0]]),plan=f.service.plan(input);
 assert.equal(plan.valid,true,JSON.stringify(plan.entries));
 f.data.families[1].sizes[0].baseCents++;
 assert.throws(()=>f.service.execute({planId:plan.id,planHash:plan.planHash}),errorIs(409));
 assert.equal(f.workshop.repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}).length,0);
 const fresh=f.service.plan(input),doc=f.workshop.repository.get(f.record.id).document;doc.config.profile.designs[0].objects[0].text='Neu';f.workshop.repository.save(f.record.id,doc,1);
 assert.throws(()=>f.service.execute({planId:fresh.id,planHash:fresh.planHash}),errorIs(409));
 assert.throws(()=>f.service.plan(input),errorIs(409));assert.equal(f.workshop.repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}).length,0);
 const offer=f.service.plan(f.input([f.targets[0]]));f.data.lines[0].subcategories[0].familyIdsOffered=['steel-door-signs'];
 assert.throws(()=>f.service.execute({planId:offer.id,planHash:offer.planHash}),e=>[409,422].includes(e.status));
 assert.equal(f.workshop.repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}).length,0);
});

test('transaction guard failure rolls back products and registrations; retry remains possible',t=>{
 const f=fixture(t),repo=f.workshop.repository;let failOnce=true;
 const service=f.serviceFor({workshop:{...f.workshop,repository:{...repo,importBatch(entries,{beforeWrite}){return repo.importBatch(entries,{beforeWrite(){beforeWrite();if(failOnce){failOnce=false;throw Object.assign(Error('Simulierter Abbruch'),{status:409});}}});}}}});
 const plan=service.plan(f.input(f.targets,[f.spec(1),f.spec(2)])),heads=repo.list().map(v=>[v.id,v.revision]);
 assert.throws(()=>service.execute({planId:plan.id,planHash:plan.planHash}),/Simulierter Abbruch/);assert.deepEqual(repo.list().map(v=>[v.id,v.revision]),heads);assert.deepEqual(repo.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}),[]);
 assert.equal(service.execute({planId:plan.id,planHash:plan.planHash}).created,2);
});

test('a concurrently committed assignment invalidates a different pending plan and preserves the first native target',t=>{
 const f=fixture(t),other=f.serviceFor();
 const pending=f.service.plan(f.input([f.targets[0]])),winner=other.plan(f.input(f.targets));
 const saved=other.execute({planId:winner.id,planHash:winner.planHash}),before=f.workshop.repository.get(saved.targets[0].productId);
 assert.throws(()=>f.service.execute({planId:pending.id,planHash:pending.planHash}),errorIs(409));
 assert.deepEqual(f.workshop.repository.get(before.id),before);assert.equal(f.workshop.repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}).length,1);
 const fresh=f.service.plan(f.input([f.targets[0]]));assert.deepEqual(fresh.counts,{create:0,existing:1,blocked:0});
});

test('proportional alternate size uses native geometry, while invalid fit and out-of-offer sizes stay blocked',t=>{
 const f=fixture(t),plan=f.service.plan(f.input([f.targets[0]],[f.spec(1,1)]));assert.equal(plan.valid,true,JSON.stringify(plan.entries));assert.match(plan.entries[0].warnings.join(' '),/Proportional/);
 const saved=f.service.execute({planId:plan.id,planHash:plan.planHash}),d=f.workshop.repository.get(saved.targets[0].productId).document.config.profile.designs[0];assert.equal(d.objects[0].size,6);assert.deepEqual(saved.targets[0].mm,[100,40]);
 f.data.families[2].groups[0].shape='ellipse';const doc=f.workshop.repository.get(f.record.id).document;Object.assign(doc.config.profile.designs[0].objects[0],{text:'X',x:2,y:2,size:3});f.workshop.repository.save(f.record.id,doc,1);
 const blocked=f.service.plan(f.input([f.targets[0]],[f.spec(2)]));assert.equal(blocked.valid,false);assert.equal(blocked.counts.blocked,1);assert.match(blocked.entries[0].reason,/außerhalb|Rand|Kontur|hinaus/i);assert.throws(()=>f.service.execute({planId:blocked.id,planHash:blocked.planHash}),errorIs(422));
 assert.throws(()=>f.service.plan(f.input([f.targets[0]],[{...f.spec(),sizeKey:'invented'}])),errorIs(422));
});

test('unavailable gallery targets neither block valid sources nor masquerade as existing native copies',t=>{
 const f=fixture(t),target=f.spec(),key=JSON.stringify(['acrylic-schwarz-3mm',originals[0],target.sizeKey]);
 f.targets.push({key,originalId:originals[0],productId:null,designId:'unprepared',familyId:target.familyId,sizeKey:target.sizeKey,mm:[50,20],material:{key:'acrylic-schwarz-3mm',label:'Schwarz',kind:'acrylic'}});
 const context=f.service.context({sourceKeys:[f.targets[0].key]});assert.equal(context.sources[0].existingTargets.length,1);
 assert.throws(()=>f.service.context({sourceKeys:[key]}),errorIs(404));
 const plan=f.service.plan(f.input([f.targets[0]],[target]));assert.deepEqual(plan.counts,{create:1,existing:0,blocked:0});
 assert.equal(f.service.execute({planId:plan.id,planHash:plan.planHash}).createdTargets,1);
});

test('the satin family remains the explicit 3 mm material with its native backing and mounting configuration',t=>{
 const f=fixture(t),satin=family('acrylic','satiniert');satin.id='acryl-ss-abstandshalter';satin.backing={label:'Schwarze Rückplatte',offsetMm:2,thicknessMm:3};
 f.data.families.push(satin);f.data.lines[0].families.push(satin.id);
 const context=f.service.context({sourceKeys:[f.targets[0].key]});assert.deepEqual(context.families.find(v=>v.id===satin.id).material,{key:'acrylic-ss-3mm',label:'Acrylglas Satiniert · 3 mm',kind:'acrylic'});
 const plan=f.service.plan(f.input([f.targets[0]],[f.spec(3)]));assert.equal(plan.valid,true,JSON.stringify(plan.entries.map(e=>e.reason)));
 const saved=f.service.execute({planId:plan.id,planHash:plan.planHash}),native=f.workshop.repository.get(saved.targets[0].productId).document.config,expected=familyProductConfig(satin,satin.sizes[0],1);
 assert.equal(native.profile.material.thicknessMm,3);assert.equal(native.profile.material.variant,'satiniert');assert.deepEqual(native.profile.backingPreview,expected.profile.backingPreview);assert.deepEqual(native.profile.optionGroups,expected.profile.optionGroups);
});

test('resource name collisions never replace fonts, and request bounds reject oversized plans',t=>{
 const f=fixture(t),second=clone(f.record.document);second.config.profile.designs=second.config.profile.designs.slice(1);second.config.profile.defaultDesignId=second.config.profile.designs[0].id;delete second.elementRights[f.record.document.config.profile.designs[0].id];
 const font=second.config.profile.designs[0].objects[0].font;second.config.localResources.fonts[font].label='Changed source metadata';const other=f.workshop.repository.create(second);f.targets[1].productId=other.id;
 const plan=f.service.plan(f.input());assert.equal(plan.valid,false);assert.match(plan.entries[1].reason,/Schrift/);assert.throws(()=>f.service.execute({planId:plan.id,planHash:plan.planHash}),errorIs(422));
 assert.throws(()=>f.service.context({sourceKeys:['unregistered']}),errorIs(404));assert.throws(()=>f.service.context({sourceKeys:Array(61).fill(f.targets[0].key)}),errorIs(422));
 assert.throws(()=>f.service.plan({sources:Array(60).fill(f.input().sources[0]),targets:[f.spec(1),f.spec(2),f.spec(1,1)]}),/120/);
 assert.deepEqual(f.workshop.repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}),[]);
});

test('native photo originals, edited pixels, recipe and mask survive assignment without asset duplication',async t=>{
 const f=fixture(t),doc=clone(f.record.document);
 const mask=await f.workshop.assets.import({name:'Maske.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4mm" height="6mm" viewBox="0 0 4 6"><ellipse cx="2" cy="3" rx="2" ry="3" fill="white"/></svg>').toString('base64')});
 const recipe={angle:0,flip:1,zoom:1,x:0,y:0,shape:'original',color:'grayscale'},crop={zoom:1.1,x:.1,y:.2,angle:0};
 const photo=await f.workshop.assets.galleryPhotos.import({original:galleryTestPng,processed:galleryTestPng,editSource:galleryTestPng,widthMm:4,heightMm:6,edited:true,color:'grayscale',editSourceColor:'original',photoEdit:recipe,crop,photoShape:'template',photoMaskAssetId:mask.assetId});
 const design=doc.config.profile.designs[0],slot={id:'photo',type:'photoSlot',fieldKey:'photo-main',required:false,x:8,y:10,w:4,h:6,rotation:12,photoShape:'template',photoMaskAssetId:mask.assetId,customerEditable:true,templateOrigin:true};design.objects.push(slot);
 doc.elementRights[design.id].photo={content:false,color:false,replace:true,move:true,scale:true,delete:true};doc.config.photo.enabled=true;doc.config.localResources.photoExamples=[{designId:design.id,slotId:'photo',assetId:photo.assetId}];
 f.workshop.repository.save(f.record.id,doc,1);const before=f.workshop.assets.galleryPhotos.metadata(photo.assetId);
 const plan=f.service.plan(f.input([f.targets[0]]));assert.equal(plan.valid,true,JSON.stringify(plan.entries.map(e=>e.reason)));assert.match(plan.entries[0].previewSvg,/data-template-photo-mask/);
 const saved=f.service.execute({planId:plan.id,planHash:plan.planHash}),target=f.workshop.repository.get(saved.targets[0].productId).document;
 assert.deepEqual(target.config.profile.designs[0].objects.find(o=>o.id==='photo'),slot);assert.deepEqual(target.config.localResources.photoExamples,doc.config.localResources.photoExamples);
 assert.deepEqual(f.workshop.assets.galleryPhotos.metadata(photo.assetId),before);for(const part of ['original','processed','editSource'])assert.deepEqual(f.workshop.assets.galleryPhotos.read(photo.assetId,part),Buffer.from(galleryTestPng,'base64'));
 assert.deepEqual(f.workshop.repository.get(f.record.id).document,doc);
});
