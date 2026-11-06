import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {createProductGroupTemplates} from './product-group-templates.mjs';
import {galleryEditorDocument} from '../../scripts/fixtures/gallery-editor.mjs';
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
