import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createProductRepository} from './repository.mjs';
import {createProfileLibrary,PROFILE_TYPES} from './profile-library.mjs';
import {profileChangeImpact,saveReviewedProfile,assignmentChangeImpact,saveReviewedAssignment} from './profile-impact.mjs';

const inherit=()=>({mode:'inherit',profileId:null}),override=id=>({mode:'override',profileId:id});
const document=(name,categoryIds=[])=>({name,kind:'product',masterId:null,categoryIds,profileAssignments:Object.fromEntries(PROFILE_TYPES.map(type=>[type,inherit()]))});
function setup(t){
  const profiles=createProfileLibrary({filename:':memory:',catalog:{fonts:['serif','sans'],motifs:['heart','flower']}});
  const repository=createProductRepository({filename:':memory:',snapshotMetadata:doc=>doc.schema==='gravuru-form-product/v1'?{}:{profiles:profiles.resolve(doc)}});
  t.after(()=>{repository.close();profiles.close();});return {profiles,repository};
}
const update=(profile,items)=>({name:profile.name,type:profile.type,items});

test('impact follows effective default, ordered category and product choices and respects explicit empty',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Farben',type:'colors',items:['#ffffff']}),other=profiles.create({name:'Andere',type:'colors',items:['#333333']});
  profiles.setDefault('colors',override(target.id),1);
  profiles.setCategory('first','colors',override(target.id),2);profiles.setCategory('last','colors',override(other.id),3);
  repository.create(document('Standard'));repository.create(document('Letzte Kategorie',['last','first']));repository.create(document('Überschattet',['first','last']));
  const own=document('Explizit',['first','last']);own.profileAssignments.colors=override(target.id);repository.create(own);
  const empty=document('Bewusst leer');empty.profileAssignments.colors={mode:'empty',profileId:null};repository.create(empty);
  const before=repository.list(),settings=profiles.settings(),review=profileChangeImpact(repository,profiles,target.id,update(target,['#000000']),1);
  assert.deepEqual(review.products.map(p=>p.name).sort(),['Explizit','Letzte Kategorie','Standard']);assert.equal(review.changed,3);
  assert.equal(review.products.find(p=>p.name==='Letzte Kategorie').source.categoryId,'first');
  assert.deepEqual(profiles.get(target.id),target);assert.deepEqual(repository.list(),before);assert.deepEqual(profiles.settings(),settings);
});

test('motif changes include their consequences for filtered bestseller selections',t=>{
  const {profiles,repository}=setup(t),motifs=profiles.create({name:'Motive',type:'motifs',items:['heart','flower']}),best=profiles.create({name:'Bestseller',type:'bestsellers',items:['heart','flower']});
  profiles.setDefault('motifs',override(motifs.id),1);profiles.setDefault('bestsellers',override(best.id),2);repository.create(document('Produkt'));
  const review=profileChangeImpact(repository,profiles,motifs.id,update(motifs,['flower']),1);
  assert.deepEqual(review.products[0].changes.map(c=>c.type),['motifs','bestsellers']);assert.deepEqual(review.products[0].changes[1].after,['flower']);
});

test('rename-only and reordered selections are distinguished; archives and masters are identified, forms excluded',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Schriften',type:'fonts',items:['serif','sans']});profiles.setDefault('fonts',override(target.id),1);
  const master=repository.create({...document('Vorlage'),kind:'master'}),archived=repository.create(document('Archiv'));repository.setArchived(archived.id,{archived:true,expectedRevision:1});
  repository.create({name:'Freie Form',kind:'product',masterId:null,schema:'gravuru-form-product/v1'});
  const renamed={...update(target,target.items),name:'Neuer Name'},review=profileChangeImpact(repository,profiles,target.id,renamed,1);
  assert.equal(review.total,2);assert.equal(review.changed,0);assert.equal(review.products.find(p=>p.id===master.id).kind,'master');assert.equal(review.products.find(p=>p.id===archived.id).status,'archived');
  assert.equal(profileChangeImpact(repository,profiles,target.id,update(target,['sans','serif']),1).changed,2);
});

test('confirmed profile update preserves immutable product/profile snapshots and requires fresh preview after concurrent changes',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Schriften',type:'fonts',items:['serif']});profiles.setDefault('fonts',override(target.id),1);
  const product=repository.create(document('Produkt')),input=update(target,['sans']),before=repository.history(product.id);
  let review=profileChangeImpact(repository,profiles,target.id,input,1);
  repository.save(product.id,{...product.document,name:'Zwischenzeitlich geändert'},1);
  assert.throws(()=>saveReviewedProfile(repository,profiles,target.id,{document:input,expectedRevision:1,impactToken:review.token}),{code:'profile_impact_changed'});
  assert.equal(profiles.get(target.id).revision,1);
  review=profileChangeImpact(repository,profiles,target.id,input,1);
  const saved=saveReviewedProfile(repository,profiles,target.id,{document:input,expectedRevision:1,impactToken:review.token});assert.equal(saved.revision,2);
  assert.deepEqual(profiles.get(target.id,{revision:1}).items,['serif']);assert.deepEqual(repository.get(product.id,{revision:1}),before[0]);
  assert.deepEqual(repository.get(product.id).metadata.profiles.selections.fonts,['serif']);assert.deepEqual(profiles.resolve(product.document).selections.fonts,['sans']);
});

test('changed library assignment or a newly affected product invalidates the saved preview',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Farben',type:'colors',items:['#ffffff']}),input=update(target,['#000000']);
  let review=profileChangeImpact(repository,profiles,target.id,input,1);assert.equal(review.total,0);
  profiles.setDefault('colors',override(target.id),1);
  assert.throws(()=>saveReviewedProfile(repository,profiles,target.id,{document:input,expectedRevision:1,impactToken:review.token}),{code:'profile_impact_changed'});
  review=profileChangeImpact(repository,profiles,target.id,input,1);repository.create(document('Neu hinzugekommen'));
  assert.throws(()=>saveReviewedProfile(repository,profiles,target.id,{document:input,expectedRevision:1,impactToken:review.token}),{code:'profile_impact_changed'});
});

test('preview rejects invalid edits and stale revisions using the same validation as saving',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Schriften',type:'fonts',items:['serif']});
  for(const [doc,revision,code] of [[update(target,['unknown']),1,'unknown_catalog_item'],[{name:'Farben',type:'colors',items:[]},1,'profile_type_change'],[update(target,['serif']),2,'revision_conflict']])assert.throws(()=>profileChangeImpact(repository,profiles,target.id,doc,revision),{code});
  assert.throws(()=>saveReviewedProfile(repository,profiles,target.id,{document:update(target,[]),expectedRevision:1,impactToken:'wrong'}),{code:'invalid_impact_token'});
  assert.equal(profiles.get(target.id).revision,1);
});

test('a profile containing a removed font can be reviewed and repaired without allowing it in normal resolution',t=>{
  const directory=mkdtempSync(path.join(tmpdir(),'g27-profile-repair-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const filename=path.join(directory,'profiles.sqlite');let profiles=createProfileLibrary({filename,catalog:{fonts:['old','new'],motifs:[]}});
  const target=profiles.create({name:'Schriften',type:'fonts',items:['old']});profiles.setDefault('fonts',override(target.id),1);profiles.close();
  profiles=createProfileLibrary({filename,catalog:{fonts:['new'],motifs:[]}});t.after(()=>profiles.close());
  const repository=createProductRepository({filename:':memory:'});t.after(()=>repository.close());const product=repository.create(document('Vorhandenes Produkt'));
  assert.throws(()=>profiles.resolve(product.document),{code:'unknown_catalog_item'});
  const input=update(target,['new']),review=profileChangeImpact(repository,profiles,target.id,input,1);assert.deepEqual(review.products[0].changes[0].before,['old']);assert.deepEqual(review.products[0].changes[0].after,['new']);
  assert.throws(()=>profiles.resolve(product.document),{code:'unknown_catalog_item'});
  saveReviewedProfile(repository,profiles,target.id,{document:input,expectedRevision:1,impactToken:review.token});assert.deepEqual(profiles.resolve(product.document).selections.fonts,['new']);
});

test('assignment preview excludes overridden products and shows inherit versus deliberately empty',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Farben',type:'colors',items:['#ffffff']});
  repository.create(document('Standard'));const own=document('Eigene Auswahl');own.profileAssignments.colors=override(target.id);repository.create(own);repository.create(document('Kategorie',['gift']));
  const input={type:'colors',assignment:override(target.id),expectedRevision:1};
  let review=assignmentChangeImpact(repository,profiles,input);assert.equal(review.total,2);assert.equal(review.changed,2);assert.ok(!review.products.some(p=>p.name==='Eigene Auswahl'));
  assert.equal(profiles.settings().revision,1);saveReviewedAssignment(repository,profiles,{...input,impactToken:review.token});
  const emptyInput={type:'colors',categoryId:'gift',assignment:{mode:'empty',profileId:null},expectedRevision:2};
  review=assignmentChangeImpact(repository,profiles,emptyInput);assert.equal(review.total,1);assert.equal(review.products[0].name,'Kategorie');assert.deepEqual(review.products[0].changes[0].after,[]);
  saveReviewedAssignment(repository,profiles,{...emptyInput,impactToken:review.token});
  const inheritInput={...emptyInput,expectedRevision:3,assignment:inherit()};review=assignmentChangeImpact(repository,profiles,inheritInput);
  assert.deepEqual(review.products[0].changes[0].after,['#ffffff']);assert.equal(review.products[0].target.level,'default');
});

test('assignment confirmation detects a changed target profile and product, without modifying settings',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Schriften',type:'fonts',items:['serif']}),product=repository.create(document('Produkt'));
  const input={type:'fonts',assignment:override(target.id),expectedRevision:1};
  let review=assignmentChangeImpact(repository,profiles,input);profiles.save(target.id,update(target,['sans']),1);
  assert.throws(()=>saveReviewedAssignment(repository,profiles,{...input,impactToken:review.token}),{code:'profile_impact_changed'});
  review=assignmentChangeImpact(repository,profiles,input);repository.save(product.id,{...product.document,categoryIds:['other']},1);
  assert.throws(()=>saveReviewedAssignment(repository,profiles,{...input,impactToken:review.token}),{code:'profile_impact_changed'});
  assert.equal(profiles.settings().revision,1);
});

test('assignment preview reports source-only changes and validates malformed category and assignment input',t=>{
  const {profiles,repository}=setup(t),target=profiles.create({name:'Farben',type:'colors',items:['#ffffff']});profiles.setDefault('colors',override(target.id),1);repository.create(document('Kategorie',['gift']));
  const input={type:'colors',categoryId:'gift',assignment:override(target.id),expectedRevision:2},review=assignmentChangeImpact(repository,profiles,input);
  assert.equal(review.total,1);assert.equal(review.changed,0);assert.equal(review.products[0].source.level,'default');assert.equal(review.products[0].target.level,'category');
  for(const categoryId of [null,'',false])assert.throws(()=>assignmentChangeImpact(repository,profiles,{...input,categoryId}),{code:'category_required'});
  assert.throws(()=>assignmentChangeImpact(repository,profiles,{...input,type:'fonts'}),{code:'profile_type_mismatch'});
  assert.throws(()=>assignmentChangeImpact(repository,profiles,{...input,expectedRevision:1}),{code:'revision_conflict'});
});
