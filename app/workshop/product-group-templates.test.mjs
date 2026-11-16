import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {createProductGroupTemplates,productGroupVariantReview} from './product-group-templates.mjs';
import {planFamilyFormats,blankDesignId} from './katalog-family-formats.mjs';
import {variantCombinations,quote,selectedProfile} from '../configurator/variant-m/contract.mjs';
import {createConfiguratorModuleProfiles} from './configurator-module-profiles.mjs';
import {nativeModuleAvailability} from '../configurator/variant-m/module-profile.mjs';
import {familyProductConfig} from './product-families.mjs';
function galleryEditorDocument({material='slate',width=220,height=140,shape='rect'}={}){
 const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
 family.id=material==='slate'?'schiefer-tafeln-natur':'edelstahl-galerietest';
 family.material={kind:material,label:material==='slate'?'Schiefer':'Edelstahl',thicknessMm:material==='slate'?5:1.5,processingProfileId:material==='slate'?'slate-engraving':'steel-engraving'};
 family.photo={includedCount:material==='slate'?1:0,extraPriceCents:999};family.sizes=family.sizes.slice(0,1);
 Object.assign(family.sizes[0],{key:'TEST-'+width+'X'+height,widthMm:width,heightMm:height,baseCents:1999,photoDesignCents:2999});
 const config=familyProductConfig(family,family.sizes[0],1),seed=config.profile.designs[0];
 config.profile.geometry.shape=shape;
 config.profile.designs=['source-a','source-b'].map((id,index)=>({...structuredClone(seed),id,name:id,katalog:{designId:index?'OTHER-ORIGINAL':'TRE-V2A-8x3,5-D1',target:{familyId:family.id,released:false}},
  objects:[{...structuredClone(seed.objects[0]),id:'name',text:index?'Unverändert':'Hallo',x:width*.5+.00127,y:height*.3+.00317,size:4.125,locked:true,acrylicFixed:true,uxLocked:true},
   {...structuredClone(seed.objects[0]),id:'technical',text:'FIX',x:width*.5,y:height*.75,size:3,technicalLocked:true}],marks:[]}));
 config.profile.defaultDesignId='source-a';
 return makeProductDocument(config,{name:'Isolierte Galerieprüfung '+material});
}

import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';


const isCode=code=>e=>e.code===code;
function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'group-template-')),filename=path.join(directory,'workshop.sqlite'),connections=[];
 const repository=createProductRepository({filename,validateDocument:validateProductDocument});connections.push(repository);
 // Synthetic option names/prices only. No production option is created or enabled.
 function original(width,height){const d=galleryEditorDocument({width,height}),p=d.config.profile;
  p.optionGroups.push({id:'synthetic-a',name:'Testbereich A',required:true,defaultValueId:'none',values:[{id:'none',label:'Kein Testextra',priceCents:0,currency:'EUR'},{id:'plus',label:'Testextra',priceCents:250,currency:'EUR'}]},
   {id:'synthetic-b',name:'Testbereich B',required:true,defaultValueId:'plain',visibleIf:{groupId:'synthetic-a',valueIds:['plus']},values:[{id:'plain',label:'Testvariante eins',priceCents:0,currency:'EUR'},{id:'second',label:'Testvariante zwei',priceCents:100,currency:'EUR'}]});
  p.optionFields=[{id:'synthetic-note',kind:'text',label:'Testangabe',required:false,maxLength:80,priceCents:0}];return d;}
 const a=repository.create(original(220,140)),b=repository.create(original(300,200));
 let targets=[{key:'small',productId:a.id,familyId:'test-slate',sizeKey:'TEST-220X140'},{key:'large',productId:b.id,familyId:'test-slate',sizeKey:'TEST-300X200'}],offering={familyIds:['test-slate'],fingerprint:'catalogue-r1'};
 const open=(override={})=>{const service=createProductGroupTemplates({filename,repository,targets:()=>targets,offeringFor:()=>offering,...override});connections.push(service);return service;},service=open();
 t.after(()=>{for(const c of connections.reverse())try{c.close();}catch{}assert.ok(directory.startsWith(path.join(os.tmpdir(),'group-template-')));fs.rmSync(directory,{recursive:true,force:true});});
 const draft=()=>service.draft({name:'Testgruppe',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:['small','large']});
 const create=()=>service.create(draft(),{actor:'Mikail Test'});
 const plan=(template,extra={})=>service.plan({templateId:template.id,templateRevision:template.revision,creationKey:'test-creation',products:[{key:'first',targetKey:'small',name:'Kleines Testprodukt'},{key:'second',targetKey:'large',name:'Großes Testprodukt'}],...extra});
 const confirm=p=>service.confirm({planId:p.id,planHash:p.planHash,accepted:true},{actor:'Mikail Test'});
 const execute=(p,c)=>service.execute({planId:p.id,planHash:p.planHash,confirmationId:c.confirmationId});
 return {filename,repository,a,b,service,open,draft,create,plan,confirm,execute,track:connection=>connections.push(connection),setTargets:v=>targets=v,setOffering:v=>offering=v};
}

test('versioned templates retain all option groups/fields, source identities, prices and history after reopening',t=>{
 const f=fixture(t),sources=f.service.sources();assert.equal(sources.length,2);assert.equal(sources[0].optionGroups.length,3);assert.equal(sources[0].optionFields.length,1);
 assert.equal(sources[0].currentOptions['synthetic-a'],'none');assert.ok(!JSON.stringify(sources).includes('svgFragment'));
 const template=f.create();assert.equal(template.revision,1);const changed=structuredClone(template.document);changed.name='Überarbeitete Testgruppe';
 const g=changed.targets[0].optionGroups.find(g=>g.id==='synthetic-b');g.values=g.values.filter(v=>v.id==='second');g.defaultValueId='second';g.name='Testbereich umbenannt';
 const saved=f.service.save(template.id,changed,1);assert.equal(saved.revision,2);assert.equal(f.open().get(template.id).document.name,changed.name);
 assert.equal(f.service.history(template.id).length,2);assert.equal(f.service.get(template.id,{revision:1}).document.targets[0].optionGroups[2].values.length,2);
 assert.equal(f.service.save(template.id,changed,2).revision,2,'no-op keeps revision');
 assert.throws(()=>f.service.save(template.id,template.document,1),isCode('group_revision_conflict'));
 assert.equal(f.repository.list().length,2,'saving a reusable template creates no products');
});

test('concrete multi-product plan must be confirmed exactly; executes actual draft products with no duplicate retry',t=>{
 const f=fixture(t),template=f.create(),plan=f.plan(template);assert.equal(plan.valid,true,JSON.stringify(plan.issues));
 assert.equal(plan.products.length,2);assert.equal(plan.products[0].optionGroups.length,3);assert.deepEqual(plan.products[0].document.config.profile.geometry,f.a.document.config.profile.geometry);
 assert.throws(()=>f.execute(plan,{confirmationId:'missing'}),isCode('group_confirmation_required'));
 assert.throws(()=>f.service.confirm({planId:plan.id,planHash:plan.planHash,accepted:false}),isCode('group_confirmation_required'));
 assert.throws(()=>f.service.confirm({planId:plan.id,planHash:'0'.repeat(64),accepted:true}),isCode('group_plan_changed'));
 const confirmation=f.confirm(plan);assert.equal(confirmation.actor,'Mikail Test');assert.equal(confirmation.products,2);
 const result=f.execute(plan,confirmation);assert.equal(result.created,2);assert.equal(result.shopifyWrites,0);assert.equal(result.published,false);
 for(const p of result.products){const r=f.repository.get(p.productId);assert.equal(r.status,'draft');assert.equal(r.publishedRevision,null);assert.equal(r.revision,1);}
 assert.equal(f.execute(plan,confirmation).replayed,true);assert.equal(f.repository.list().length,4);
 const retryPlan=f.plan(template),retry=f.execute(retryPlan,f.confirm(retryPlan));assert.equal(retry.created,0);assert.equal(retry.existing,2);assert.deepEqual(retry.products.map(p=>p.productId),result.products.map(p=>p.productId));
 assert.equal(f.repository.list().length,4);assert.equal(f.open().getPlan(plan.id).planHash,plan.planHash);
});

test('template, source, offered families or catalogue revision changes invalidate confirmation',t=>{
 const f=fixture(t),template=f.create(),plan=f.plan(template),confirmation=f.confirm(plan);
 const changed=structuredClone(template.document);changed.targets[0].optionGroups[1].defaultValueId='plus';f.service.save(template.id,changed,1);
 assert.throws(()=>f.execute(plan,confirmation),isCode('group_confirmation_stale'));assert.equal(f.repository.list().length,2);
 const fresh=f.plan(f.service.get(template.id)),c=f.confirm(fresh);f.setOffering({familyIds:['test-slate'],fingerprint:'catalogue-r2'});
 assert.throws(()=>f.execute(fresh,c),isCode('group_offering_changed'));
 const next=f.plan(f.service.get(template.id)),nc=f.confirm(next),source=structuredClone(f.a.document);source.name='Parallel bearbeitete Quelle';f.repository.save(f.a.id,source,1);
 assert.throws(()=>f.execute(next,nc),isCode('group_source_changed'));assert.equal(f.repository.list().length,2);
});

test('no invented values/prices/rules, incomplete target or absent offered materials can become a confirmed creation',t=>{
 const f=fixture(t),draft=f.draft();draft.targets[0].optionGroups[1].values[1].priceCents=1;
 assert.throws(()=>f.service.create(draft),isCode('group_option_source'));
 const invented=f.draft();invented.targets[0].optionGroups.push({id:'new-rule',name:'Unbestätigt',required:true,defaultValueId:'a',values:[{id:'a',label:'A',priceCents:0,currency:'EUR'}]});
 assert.throws(()=>f.service.create(invented),isCode('group_option_source'));
 const open=f.draft();open.openQuestions=['Neue Ausführung noch nicht benannt.'];let p=f.plan(f.service.create(open));assert.equal(p.valid,false);assert.ok(p.issues.some(i=>i.code==='open_question'));assert.throws(()=>f.confirm(p),isCode('group_plan_open'));
 f.setOffering(null);p=f.plan(f.create());assert.ok(p.issues.some(i=>i.code==='offering_open'));assert.throws(()=>f.confirm(p),isCode('group_offering_changed'));
 f.setOffering({familyIds:[],fingerprint:'explicit-none'});p=f.plan(f.create());assert.ok(p.issues.some(i=>i.code==='family_not_offered'));assert.throws(()=>f.confirm(p),isCode('group_plan_open'));
 f.setOffering({familyIds:['test-slate'],fingerprint:'r3'});f.setTargets([{key:'small',productId:f.a.id,familyId:null,sizeKey:'TEST-220X140'},{key:'large',productId:f.b.id,familyId:'test-slate',sizeKey:'TEST-300X200'}]);p=f.plan(f.create());assert.ok(p.issues.some(i=>i.code==='target_open'));assert.equal(p.valid,false);
 assert.equal(f.repository.list().length,2);
});

test('missing option data and unsupported new field kinds are reported without silently inventing defaults',t=>{
 const f=fixture(t),missing=f.draft();delete missing.targets[0].optionGroups[0].values;
 assert.throws(()=>f.service.create(missing),isCode('group_option_source'));
 const empty=f.draft();empty.targets[0].optionGroups[0].values=[];
 assert.throws(()=>f.service.create(empty),isCode('group_option_selection'));
 const missingDefault=f.draft();delete missingDefault.targets[0].optionGroups[0].defaultValueId;
 assert.throws(()=>f.service.create(missingDefault),isCode('group_option_selection'));
 const inventedKind=f.draft();inventedKind.targets[0].optionFields[0].kind='unconfirmed-upload';
 assert.throws(()=>f.service.create(inventedKind),isCode('group_option_source'));
 assert.equal(f.repository.list().length,2);assert.deepEqual(f.service.list(),[]);
});

test('native dependent-option validation blocks an invalid restriction; valid restriction keeps authoritative prices',t=>{
 const f=fixture(t),d=f.draft();d.targets[0].optionGroups[1].values=d.targets[0].optionGroups[1].values.filter(v=>v.id==='none');
 let p=f.plan(f.service.create(d));assert.equal(p.valid,false);assert.ok(p.issues.some(i=>/Bedingung|Werte/.test(i.message)));
 const valid=f.draft(),target=valid.targets[0];target.optionGroups[1].values=target.optionGroups[1].values.filter(v=>v.id==='plus');target.optionGroups[1].defaultValueId='plus';target.optionGroups[2].values=target.optionGroups[2].values.filter(v=>v.id==='second');target.optionGroups[2].defaultValueId='second';
 p=f.plan(f.service.create(valid));assert.equal(p.valid,true,JSON.stringify(p.issues));const base=f.a.document.config.basePriceCents;
 assert.equal(p.products[0].price.unitCents,base+350);assert.equal(p.products[0].optionFields[0].id,'synthetic-note');
 const result=f.execute(p,f.confirm(p)),created=f.repository.get(result.products[0].productId);assert.equal(created.document.config.profile.optionGroups[2].values[0].priceCents,100);
});

test('legacy embedded format options cannot silently ignore a profile-only restriction',t=>{
 const f=fixture(t),source=f.repository.create(makeProductDocument(doorbellFixture(),{name:'Synthetischer Mehrformat-Prüffall'}));
 f.setTargets([{key:'dynamic',productId:source.id,familyId:'synthetic-doorbell',sizeKey:'synthetic-format'}]);f.setOffering({familyIds:['synthetic-doorbell'],fingerprint:'test-dynamic-r1'});
 const original=f.service.draft({name:'Mehrformat-Testgruppe',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:['dynamic']}),d=structuredClone(original),g=d.targets[0].optionGroups[0];
 g.values=g.values.filter(v=>v.id===g.defaultValueId);
 const template=f.service.create(d),plan=f.plan(template,{products:[{key:'dynamic-product',targetKey:'dynamic',name:'Test mit eingeschränkten Ausführungen'}]});
 assert.equal(plan.valid,false);assert.ok(plan.issues.some(i=>i.code==='group_options_adapter_required'));assert.throws(()=>f.confirm(plan),isCode('group_plan_open'));
 assert.equal(f.repository.list().length,3);assert.deepEqual(f.repository.get(source.id).document.config.profile.optionGroups,original.targets[0].optionGroups);
});

test('creation key conflicts and changed scope cannot reuse an earlier confirmation',t=>{
 const f=fixture(t),template=f.create(),first=f.plan(template),c=f.confirm(first);
 const other=f.plan(template,{products:[{key:'first',targetKey:'small',name:'Ein anderer Name'}]});assert.notEqual(first.planHash,other.planHash);
 assert.throws(()=>f.execute(other,c),isCode('group_confirmation_required'));
 assert.throws(()=>f.service.execute({planId:first.id,planHash:first.planHash,confirmationId:c.confirmationId,products:other.products}),isCode('group_fields'));
 f.execute(first,c);const conflict=f.plan(template,{products:[{key:'first',targetKey:'small',name:'Ein anderer Name'}]});assert.equal(conflict.valid,false);assert.ok(conflict.issues.some(i=>i.code==='creation_conflict'));
 assert.throws(()=>f.confirm(conflict),isCode('group_plan_open'));assert.equal(f.repository.list().length,4);
});

test('tenant isolation covers templates, plans, confirmations, targets and repository writes',t=>{
 const f=fixture(t),template=f.create(),p=f.plan(template),c=f.confirm(p),otherRepo=createProductRepository({filename:f.filename,tenantId:'another',validateDocument:validateProductDocument});
 f.track(otherRepo);const other=createProductGroupTemplates({filename:f.filename,repository:otherRepo,tenantId:'another',targets:[]});f.track(other);
 assert.deepEqual(other.list(),[]);assert.throws(()=>other.get(template.id),isCode('group_template_missing'));assert.throws(()=>other.getPlan(p.id),isCode('group_plan_missing'));
 assert.throws(()=>other.execute({planId:p.id,planHash:p.planHash,confirmationId:c.confirmationId}),isCode('group_plan_missing'));
 assert.throws(()=>createProductGroupTemplates({filename:f.filename,repository:f.repository,tenantId:'another'}),/Tenant-scoped/);
});

test('retry recovers atomic repository journal after interruption before the template result was recorded',t=>{
 const f=fixture(t),template=f.create(),p=f.plan(template),c=f.confirm(p);
 const entries=p.products.map(v=>({key:v.importKey,fingerprint:v.fingerprint,document:v.document}));const created=f.repository.importBatch(entries);
 const r=f.execute(p,c);assert.equal(r.created,0);assert.equal(r.existing,2);assert.deepEqual(r.products.map(v=>v.productId),created.map(v=>v.id));assert.equal(f.repository.list().length,4);
 const db=new DatabaseSync(f.filename);try{assert.throws(()=>db.prepare('UPDATE product_group_template_revisions SET sha256=? WHERE id=?').run('bad',template.id),/immutable/);}finally{db.close();}
});

test('transaction guard rechecks confirmation dependencies immediately before repository write',t=>{
 const f=fixture(t),template=f.create(),p=f.plan(template),c=f.confirm(p),real=f.repository.importBatch;
 f.repository.importBatch=function(entries,options){f.setOffering({familyIds:['test-slate'],fingerprint:'changed-between-check-and-write'});return real.call(this,entries,options);};
 assert.throws(()=>f.execute(p,c),isCode('group_offering_changed'));assert.equal(f.repository.list().length,2);
});

test('native document cache holds two records total, including historical revisions',t=>{
 const f=fixture(t),get=f.repository.get,reads=[],fontObjects=new WeakSet();let registryReads=0;
 const newer=structuredClone(f.a.document);newer.name='Große native Quelle Stand 2';f.repository.save(f.a.id,newer,1);
 const targets=[{key:'small',productId:f.a.id,familyId:'test-slate',sizeKey:'TEST-220X140'},{key:'large',productId:f.b.id,familyId:'test-slate',sizeKey:'TEST-300X200'},{key:'small-again',productId:f.a.id,familyId:'test-slate',sizeKey:'TEST-220X140'}];
 const service=f.open({targets:()=>{registryReads++;return targets;}}),draft=service.draft({name:'Begrenzter Dokumentcache',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:targets.map(t=>t.key)});
 for(const target of draft.targets)target.source.revision=1;
 f.repository.get=function(id,options){
  const record=get.call(this,id,options);assert.ok(JSON.stringify(record.document).length>500000);
  assert.ok(!fontObjects.has(record.document.config.localResources.fonts));fontObjects.add(record.document.config.localResources.fonts);
  reads.push([id,options?.revision??'head']);return record;
 };
 registryReads=0;service.validate(draft);assert.equal(registryReads,1);
 // A-head + A-old occupy both slots. B-head must evict A-head; reusing A-old
 // then requires both reads again. Separate unlimited head/revision maps fail.
 assert.deepEqual(reads,[[f.a.id,'head'],[f.a.id,1],[f.b.id,'head'],[f.a.id,'head'],[f.a.id,1]]);
 reads.length=0;service.validate(draft);assert.equal(registryReads,2);assert.equal(reads.length,5,'a new operation never reuses a previous native record');
});

test('source listing evicts old heads while retaining the two most recently used documents',t=>{
 const f=fixture(t),third=f.repository.create(galleryEditorDocument({width:250,height:150})),get=f.repository.get,reads=[];
 const sequence=[f.a.id,f.b.id,f.a.id,third.id,f.b.id,f.a.id];
 const service=f.open({targets:()=>sequence.map((productId,i)=>({key:'alias-'+i,productId,familyId:'test-slate',sizeKey:'TEST-'+i}))});
 f.repository.get=function(id,options){reads.push(id);return get.call(this,id,options);};
 const views=service.sources();assert.equal(views.length,6);assert.ok(views.every(v=>!v.unsupported));
 assert.deepEqual(reads,[f.a.id,f.b.id,third.id,f.b.id,f.a.id],'two slots reuse A after B, then evict old heads instead of retaining every product');
});

test('selected source aliases resolve together without requesting unrelated native documents',t=>{
 const f=fixture(t),get=f.repository.get,registryReads=[],reads=[];
 const targets=[{key:'small',productId:f.a.id,familyId:'test-slate',sizeKey:'TEST-220X140'},{key:'alias',productId:f.a.id,familyId:'test-slate',sizeKey:'TEST-220X140'},{key:'unrelated',productId:f.b.id,familyId:'test-slate',sizeKey:'TEST-300X200'}];
 const service=f.open({targets:({sourceKeys}={})=>{
  assert.deepEqual(sourceKeys,['small','alias'],'the adapter receives the entire selected scope, never an unbounded request');
  registryReads.push([...sourceKeys]);return targets.filter(t=>sourceKeys.includes(t.key));
 }});
 f.repository.get=function(id,options){assert.equal(id,f.a.id,'an unrelated product payload must not be opened');reads.push(id);return get.call(this,id,options);};
 assert.equal(service.sources({sourceKeys:['small','alias']}).length,2);assert.equal(registryReads.length,1);assert.equal(reads.length,1);
 const draft=service.draft({name:'Gezielte Alias-Auswahl',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:['small','alias']});
 assert.equal(registryReads.length,2);assert.equal(reads.length,2);
 service.validate(draft);assert.equal(registryReads.length,3);assert.equal(reads.length,3,'every operation reads a fresh source head');
});

test('draft, validation, planning and confirmation reuse source heads only within each operation',t=>{
 const f=fixture(t),get=f.repository.get;let registryReads=0;const reads=new Map();
 f.repository.get=function(id,options){const key=id+':'+(options?.revision??'head');reads.set(key,(reads.get(key)||0)+1);return get.call(this,id,options);};
 const service=f.open({targets:({sourceKeys}={})=>{assert.deepEqual(sourceKeys,['small','large']);registryReads++;return [{key:'small',productId:f.a.id,familyId:'test-slate',sizeKey:'TEST-220X140'},{key:'large',productId:f.b.id,familyId:'test-slate',sizeKey:'TEST-300X200'}];}});
 function measured(work,expectedIds=[f.a.id,f.b.id],expectedRegistry=1){reads.clear();registryReads=0;const result=work();assert.equal(registryReads,expectedRegistry);for(const id of expectedIds)assert.equal(reads.get(id+':head'),expectedRegistry);assert.ok([...reads.values()].every(n=>n<=expectedRegistry));return result;}
 const draft=measured(()=>service.draft({name:'Testgruppe',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:['small','large']}));
 measured(()=>service.validate(draft));const template=measured(()=>service.create(draft));
 const changed=structuredClone(draft);changed.name='Neue Bezeichnung';const saved=measured(()=>service.save(template.id,changed,1));
 const plan=measured(()=>service.plan({templateId:saved.id,templateRevision:saved.revision,creationKey:'bounded-source-reads',products:[{key:'one',targetKey:'small',name:'Erstes Produkt'},{key:'two',targetKey:'small',name:'Zweites Produkt aus derselben Quelle'},{key:'three',targetKey:'large',name:'Großes Produkt'}]}));assert.equal(plan.valid,true);
 const confirmation=measured(()=>service.confirm({planId:plan.id,planHash:plan.planHash,accepted:true}));
 const result=measured(()=>service.execute({planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.confirmationId}),[f.a.id,f.b.id],2);
 assert.equal(result.created,3);assert.equal(result.shopifyWrites,0);
});

test('historical revisions and failed aliases are each read once per operation and reread on the next',t=>{
 const f=fixture(t),get=f.repository.get,reads=new Map();let registryReads=0,missing=true;
 f.repository.get=function(id,options){const key=id+':'+(options?.revision??'head');reads.set(key,(reads.get(key)||0)+1);if(id==='missing'&&missing)throw Object.assign(Error('Quelle fehlt.'),{status:404});return get.call(this,id,options);};
 const targets=[{key:'small',productId:f.a.id,familyId:'test-slate',sizeKey:'TEST-220X140'},{key:'alias',productId:f.a.id,familyId:'test-slate',sizeKey:'TEST-220X140'}];
 const service=f.open({targets:()=>{registryReads++;return targets;}}),draft=service.draft({name:'Alias-Testgruppe',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:['small','alias']});
 const newer=structuredClone(f.a.document);newer.name='Quelle Revision 2';f.repository.save(f.a.id,newer,1);reads.clear();registryReads=0;
 service.validate(draft);assert.equal(registryReads,1);assert.deepEqual([...reads.entries()],[[f.a.id+':head',1],[f.a.id+':1',1]]);
 reads.clear();service.validate(draft);assert.equal(reads.get(f.a.id+':head'),1);assert.equal(reads.get(f.a.id+':1'),1);assert.equal(registryReads,2);
 targets.splice(0,targets.length,...['missing-one','missing-two'].map(key=>({key,productId:'missing',familyId:null,sizeKey:null})));reads.clear();registryReads=0;
 const errors=service.sources();assert.equal(errors.length,2);assert.ok(errors.every(s=>s.unsupported&&s.issues.includes('Quelle fehlt.')));assert.equal(reads.get('missing:head'),1);assert.equal(registryReads,1);
 service.sources();assert.equal(reads.get('missing:head'),2);assert.equal(registryReads,2);
});

test('fresh transaction guard detects source and target-material changes after the earlier execute preflight',t=>{
 for(const change of ['source','target']){
  const f=fixture(t),template=f.create(),plan=f.plan(template),confirmation=f.confirm(plan),real=f.repository.importBatch;
  f.repository.importBatch=function(entries,options){
   if(change==='source'){const newer=structuredClone(f.a.document);newer.name='Änderung direkt vor Schreibsperre';f.repository.save(f.a.id,newer,1);}
   else f.setTargets([{key:'small',productId:f.a.id,familyId:'different-material-family',sizeKey:'TEST-220X140'},{key:'large',productId:f.b.id,familyId:'test-slate',sizeKey:'TEST-300X200'}]);
   return real.call(this,entries,options);
  };
  assert.throws(()=>f.execute(plan,confirmation),isCode('group_source_changed'));assert.equal(f.repository.list().length,2,'no source snapshot from the preflight may bypass the guarded recheck');
 }
});

function moduleFixture(t){
 const f=fixture(t),native=galleryEditorDocument({material:'steel',width:120,height:80});
 // The approved steel upload rule: SVG only, 12.99 EUR, no photos.
 native.config.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 const original=f.repository.create(native),library=createConfiguratorModuleProfiles({filename:f.filename,tenantId:f.repository.tenantId});f.track(library);
 const withLogo=library.create({name:'Türschild mit Logo',modules:nativeModuleAvailability(original.document.config)}),withoutLogo=library.create({name:'Türschild ohne Logo',modules:{...withLogo.profile.modules,logo:false}});
 f.setTargets([{key:'with-logo',productId:original.id,familyId:'steel-test-source',sizeKey:'TEST-120X80'},{key:'without-logo',productId:original.id,familyId:'steel-test-source',sizeKey:'TEST-120X80'}]);f.setOffering({familyIds:['steel-test-source'],fingerprint:'steel-source-v1'});
 const service=f.open({moduleProfiles:library}),draft=service.draft({name:'Türschilder, ein Konfi',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:['with-logo','without-logo']});
 draft.targets[0].moduleProfile={id:withLogo.id,revision:1};draft.targets[1].moduleProfile={id:withoutLogo.id,revision:1};
 const template=service.create(draft),plan=()=>service.plan({templateId:template.id,templateRevision:1,creationKey:'steel-module-test',products:[{key:'steel-logo',targetKey:'with-logo',name:'Türschild mit Logo'},{key:'steel-no-logo',targetKey:'without-logo',name:'Türschild ohne Logo'}]});
 const confirm=p=>service.confirm({planId:p.id,planHash:p.planHash,accepted:true});
 const execute=(p,c)=>service.execute({planId:p.id,planHash:p.planHash,confirmationId:c.confirmationId});
 return {...f,service,original,library,withLogo,withoutLogo,template,plan,confirm,execute};
}

test('one native steel source creates logo and no-logo products from confirmed module profiles without changing designs or prices',t=>{
 const f=moduleFixture(t),p=f.plan();assert.equal(p.valid,true,JSON.stringify(p.issues));assert.equal(p.moduleProfiles.length,2);
 assert.equal(p.products[0].moduleProfile.modules.logo,true);assert.equal(p.products[1].moduleProfile.modules.logo,false);
 assert.throws(()=>f.execute(p,{confirmationId:'missing'}),isCode('group_confirmation_required'));
 const result=f.execute(p,f.confirm(p));assert.equal(result.created,2);assert.equal(result.shopifyWrites,0);
 const configs=result.products.map(product=>f.repository.get(product.productId).document.config);
 assert.equal(configs[0].logo.enabled,true);assert.equal(configs[0].logo.extraPriceCents,1299);assert.equal(configs[1].logo.enabled,false);assert.equal(configs[1].logo.vectorUpload,false);
 for(const config of configs){assert.equal(config.photo.enabled,false);assert.deepEqual(config.profile.designs,f.original.document.config.profile.designs);assert.deepEqual(config.profile.geometry,f.original.document.config.profile.geometry);assert.deepEqual(config.profile.optionGroups,f.original.document.config.profile.optionGroups);assert.equal(config.basePriceCents,f.original.document.config.basePriceCents);assert.equal(config.moduleProfile.schema,'gravuru-configurator-modules/v1');}
 assert.deepEqual(f.repository.get(f.original.id).document,f.original.document,'authoritative source stays unchanged');
 assert.equal(f.execute(p,f.confirm(p)).replayed,true);
});

test('changing a module profile invalidates a confirmed creation and retains the prior product snapshot',t=>{
 const f=moduleFixture(t),plan=f.plan(),confirmation=f.confirm(plan),before=f.repository.list().length;
 const newer=f.library.save(f.withLogo.id,{name:'Profil geändert',modules:{...f.withLogo.profile.modules,logo:false}},1);
 assert.equal(newer.revision,2);assert.throws(()=>f.execute(plan,confirmation),isCode('group_module_profile_changed'));assert.equal(f.repository.list().length,before);
 const stale=f.plan();assert.equal(stale.valid,false);assert.ok(stale.issues.some(i=>i.code==='module_profile_changed'));
 assert.equal(f.library.get(f.withLogo.id,{revision:1}).profile.modules.logo,true);
});

test('module changes immediately before native write are checked inside the product creation guard',t=>{
 const f=moduleFixture(t),plan=f.plan(),confirmation=f.confirm(plan),real=f.repository.importBatch,before=f.repository.list().length;
 f.repository.importBatch=function(entries,options){f.library.save(f.withLogo.id,{name:'Parallel geändert',modules:f.withLogo.profile.modules},1);return real.call(this,entries,options);};
 assert.throws(()=>f.execute(plan,confirmation),isCode('group_module_profile_changed'));assert.equal(f.repository.list().length,before);
});

test('module assignments cannot inject prices or substitute a client-supplied policy',t=>{
 const f=moduleFixture(t),d=structuredClone(f.template.document);d.targets[0].moduleProfile.modules={...f.withLogo.profile.modules,photo:true};
 assert.throws(()=>f.service.create(d),isCode('group_fields'));
 const photoProfile=f.library.create({name:'Nicht für Stahl',modules:{...f.withLogo.profile.modules,photo:true}});delete d.targets[0].moduleProfile.modules;d.targets[0].moduleProfile={id:photoProfile.id,revision:1};
 assert.throws(()=>f.service.create(d),isCode('module_profile_conflict'));
});

test('family-format confirmation shows every real steel form, size, allowed mounting and its exact native price',async t=>{
 const family=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),size=family.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
 const font=JSON.parse(fs.readFileSync(new URL('../designs/aosu-labrador/assets/michroma-vectors.json',import.meta.url))).Michroma;
 const catalog={families:new Map([[family.id,family]]),lines:new Map([['test',{id:'test',name:'Test',families:[family.id],subcategories:[{id:'doors',name:'Türschilder',themeId:'familie'}]}]]),designs:{masters:[]},theme:()=>null,fontResources:async()=>({fonts:{Michroma:font},missing:[]})};
 const result=await planFamilyFormats(catalog,'test','doors',{shopProduct:{sizeKey:size.key,themeId:'familie',defaultDesignId:blankDesignId(size),groessenWahl:'alle',vorlagen:'leer'}}),config=result.config;
 assert.ok(config,JSON.stringify(result.report.blocked));const combinations=variantCombinations(config),review=productGroupVariantReview(config,combinations);
 assert.equal(config.familyFormats.formats.length,80);assert.equal(review.length,404);assert.equal(new Set(review.map(v=>v.sizeKey)).size,80);
 assert.deepEqual([...new Set(review.map(v=>v.form.id))].sort(),[...new Set(family.sizes.map(s=>s.groupKey))].sort());
 for(const row of review){const selection=config.familyFormats.formats.find(f=>f.key===row.sizeKey),native=selectedProfile(config,row.options);
  assert.equal(row.widthMm,selection.geometry.width);assert.equal(row.heightMm,selection.geometry.height);assert.equal(row.unitCents,quote(config,[],native.defaultDesignId,row.options).unitCents);
  assert.ok(selection.variants.some(v=>v.mounting.some(m=>m.id===row.options.mounting)));assert.ok(row.choices.find(c=>c.id==='mounting')?.display);
 }
 const f=fixture(t),original=f.repository.create(makeProductDocument(JSON.parse(JSON.stringify(config)),{name:'Alle Edelstahlformen'}));f.setTargets([{key:'all-steel',productId:original.id,familyId:'test-steel',sizeKey:'all'}]);f.setOffering({familyIds:['test-steel'],fingerprint:'steel-all-v1'});
 const draft=f.service.draft({name:'Alle Formen, gleicher Konfi',scope:{lineId:'test-line',subcategoryId:'test-sub'},sourceKeys:['all-steel']}),template=f.service.create(draft),plan=f.plan(template,{products:[{key:'steel',targetKey:'all-steel',name:'Alle Edelstahlformen, geprüft'}]});
 assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.products[0].variantReview.length,404);assert.equal(f.service.sources()[0].optionsManagedByFormat,true);
 const saved=f.execute(plan,f.confirm(plan));assert.equal(saved.created,1);assert.deepEqual(f.repository.get(saved.products[0].productId).document.config.familyFormats,original.document.config.familyFormats);
});
