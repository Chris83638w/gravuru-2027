import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createProfileLibrary,PROFILE_TYPES} from './profile-library.mjs';

const catalog={fonts:['Garamond Acryl','Freestyle Acryl',{id:'Open Sans',name:'Open Sans'}],motifs:['house','heart','flower','dog']};
const inherit=()=>({mode:'inherit',profileId:null});
const override=profile=>({mode:'override',profileId:profile.id});
const empty=()=>({mode:'empty',profileId:null});
const document=(categoryIds=[])=>({categoryIds,profileAssignments:Object.fromEntries(PROFILE_TYPES.map(type=>[type,inherit()])),config:{localResources:{fonts:{'Garamond Acryl':{glyphs:'unchanged-vector-resources'}}}}});
function memory(t){const library=createProfileLibrary({filename:':memory:',catalog});t.after(()=>library.close());return library;}
function disk(t){
  const parent=path.resolve(tmpdir()),directory=mkdtempSync(path.join(parent,'g27-profiles-'));
  t.after(()=>{
    // Only the unique temporary directory created by this test may be removed.
    if(path.dirname(path.resolve(directory))!==parent||!path.basename(directory).startsWith('g27-profiles-'))throw Error('Ungültiger Testordner.');
    rmSync(directory,{recursive:true,force:true});
  });
  return path.join(directory,'profiles.sqlite');
}

test('profile IDs are unique and all four types keep explicit ordered item selections',t=>{
  const library=memory(t),font=library.create({name:'Acrylglas',type:'fonts',items:['Freestyle Acryl','Garamond Acryl']});
  const motif=library.create({name:'Acrylglas',type:'motifs',items:['heart','flower']});
  const colors=library.create({name:'Warmes Rot',type:'colors',items:['#FF8800','#731C19']});
  const bestseller=library.create({name:'Geschenke',type:'bestsellers',items:['heart']});
  assert.equal(new Set([font.id,motif.id,colors.id,bestseller.id]).size,4);
  assert.match(font.id,/^prf_[a-f0-9-]+$/);assert.equal(font.revision,1);
  assert.deepEqual(library.get(font.id).items,['Freestyle Acryl','Garamond Acryl']);
  assert.deepEqual(colors.items,['#ff8800','#731c19']);
  assert.deepEqual(library.list({type:'fonts'}).map(row=>row.id),[font.id]);
  assert.equal(library.list({query:'Acrylglas'}).length,2);
  font.items.push('Open Sans');assert.equal(library.get(font.id).items.length,2);
});
test('unknown item IDs, duplicate items, invalid colours and wrong profile types are rejected',t=>{
  const library=memory(t);
  for(const input of [
    {name:'Wrong',type:'fonts',items:['Unknown Font']},
    {name:'Wrong',type:'bestsellers',items:['Unknown Motif']},
    {name:'Wrong',type:'motifs',items:['heart','heart']},
    {name:'Wrong',type:'colors',items:['#ffffff','#FFFFFF']},
    {name:'Wrong',type:'colors',items:['red']},
    {name:'Wrong',type:'colors',items:['#fff']},
    {name:'Wrong',type:'colors',items:['#12345678']},
    {name:'Wrong',type:'unknown',items:[]},
    {name:' ',type:'fonts',items:[]},
    {name:'Wrong',type:'fonts',items:[],id:'injected'}
  ])assert.throws(()=>library.create(input),error=>error.status===422);
  assert.deepEqual(library.list(),[]);
  assert.throws(()=>createProfileLibrary({filename:':memory:',catalog:{fonts:['same','same'],motifs:[]}}),error=>error.code==='invalid_catalog');
});
test('profiles and settings survive restart, old profile and settings revisions remain readable',t=>{
  const filename=disk(t);
  let library=createProfileLibrary({filename,catalog});
  const created=library.create({name:'Schriften',type:'fonts',items:['Garamond Acryl']});
  const originalSettings=library.settings();
  const assigned=library.setDefault('fonts',override(created),originalSettings.revision);
  const saved=library.save(created.id,{name:'Neue Schriftauswahl',type:'fonts',items:['Open Sans','Freestyle Acryl']},created.revision);
  library.close();
  library=createProfileLibrary({filename,catalog});
  try{
    assert.equal(library.get(created.id).revision,saved.revision);
    assert.deepEqual(library.get(created.id).items,['Open Sans','Freestyle Acryl']);
    assert.deepEqual(library.get(created.id,{revision:1}).items,['Garamond Acryl']);
    assert.deepEqual(library.settings({revision:1}),originalSettings);
    assert.deepEqual(library.settings().defaults.fonts,assigned.defaults.fonts);
    const resolved=library.resolve(document());
    assert.deepEqual(resolved.selections.fonts,['Open Sans','Freestyle Acryl']);
    assert.equal(resolved.sources.fonts.profileRevision,2);
    assert.equal(resolved.settingsRevision,assigned.revision);
  }finally{library.close();}
});
test('concurrent profile and settings updates reject stale revisions without losing either committed change',t=>{
  const filename=disk(t),first=createProfileLibrary({filename,catalog}),second=createProfileLibrary({filename,catalog});
  try{
    const profile=first.create({name:'Schriften',type:'fonts',items:['Garamond Acryl']});
    const stale=second.get(profile.id);
    first.save(profile.id,{name:'Aktuell',type:'fonts',items:['Open Sans']},profile.revision);
    assert.throws(()=>second.save(profile.id,{name:'Veraltet',type:'fonts',items:['Freestyle Acryl']},stale.revision),error=>error.status===409&&error.actualRevision===2);
    assert.deepEqual(second.get(profile.id).items,['Open Sans']);
    const settings=second.settings();
    first.setDefault('fonts',override(profile),settings.revision);
    assert.throws(()=>second.setCategory('gifts','fonts',empty(),settings.revision),error=>error.status===409&&error.actualRevision===2);
    assert.deepEqual(second.settings().categories,{});
    assert.equal(second.settings().defaults.fonts.profileId,profile.id);
  }finally{first.close();second.close();}
});
test('default then ordered categories then product is deterministic; inherit and empty are different',t=>{
  const library=memory(t);
  const standard=library.create({name:'Standard',type:'fonts',items:['Open Sans']});
  const gifts=library.create({name:'Geschenke',type:'fonts',items:['Freestyle Acryl']});
  const acrylic=library.create({name:'Acryl',type:'fonts',items:['Garamond Acryl']});
  library.setDefault('fonts',override(standard),library.settings().revision);
  library.setCategory('gifts','fonts',override(gifts),library.settings().revision);
  library.setCategory('acrylic','fonts',override(acrylic),library.settings().revision);
  const product=document(['gifts','acrylic']),before=structuredClone(product);
  const resolved=library.resolve(product);
  assert.deepEqual(resolved.selections.fonts,['Garamond Acryl']);
  assert.equal(resolved.sources.fonts.level,'category');assert.equal(resolved.sources.fonts.categoryId,'acrylic');
  assert.deepEqual(library.resolve(document(['acrylic','gifts'])).selections.fonts,['Freestyle Acryl']);
  assert.deepEqual(library.resolve(document()).selections.fonts,['Open Sans']);
  product.profileAssignments.fonts=empty();
  assert.deepEqual(library.resolve(product).selections.fonts,[]);
  product.profileAssignments.fonts=override(standard);
  assert.deepEqual(library.resolve(product).selections.fonts,['Open Sans']);
  library.setCategory('acrylic','fonts',inherit(),library.settings().revision);
  assert.deepEqual(library.resolve(document(['gifts','acrylic'])).selections.fonts,['Freestyle Acryl']);
  assert.deepEqual(product.config,before.config);
  assert.equal(resolved.categoryPriority,'last-non-inherit-wins');
});
test('unbound null keeps current global selection; explicit empty remains empty including bestseller filtering',t=>{
  const library=memory(t),product=document();
  assert.deepEqual(library.resolve(product).selections,{fonts:null,motifs:null,colors:null,bestsellers:null});
  product.profileAssignments.motifs=empty();
  const favorites=library.create({name:'Beliebt',type:'bestsellers',items:['house','heart']});
  product.profileAssignments.bestsellers=override(favorites);
  const result=library.resolve(product);
  assert.deepEqual(result.selections.motifs,[]);assert.deepEqual(result.selections.bestsellers,[]);
  assert.deepEqual(result.warnings[0].items,['house','heart']);
  assert.equal(result.sources.bestsellers.profileId,favorites.id);
});
test('door signs and gift categories resolve independent bestsellers with a common permitted motif set',t=>{
  const library=memory(t);
  const all=library.create({name:'Auswahl',type:'motifs',items:['house','heart','flower']});
  const doors=library.create({name:'Türschild Favoriten',type:'bestsellers',items:['house']});
  const gifts=library.create({name:'Geschenk Favoriten',type:'bestsellers',items:['heart','flower','dog']});
  library.setDefault('motifs',override(all),library.settings().revision);
  library.setCategory('door-signs','bestsellers',override(doors),library.settings().revision);
  library.setCategory('gifts','bestsellers',override(gifts),library.settings().revision);
  assert.deepEqual(library.resolve(document(['door-signs'])).selections.bestsellers,['house']);
  const resolved=library.resolve(document(['gifts']));
  assert.deepEqual(resolved.selections.bestsellers,['heart','flower']);
  assert.deepEqual(resolved.warnings[0].items,['dog']);
  assert.equal(resolved.sources.bestsellers.categoryId,'gifts');
});
test('missing, mistyped and dangling assignments fail instead of silently inheriting',t=>{
  const library=memory(t),font=library.create({name:'Schrift',type:'fonts',items:['Open Sans']});
  const initial=library.settings();
  for(const input of [override({id:'prf_missing'}),{mode:'override',profileId:null},{mode:'empty',profileId:font.id},{mode:'automatic',profileId:null}])assert.throws(()=>library.setDefault('fonts',input,initial.revision));
  assert.throws(()=>library.setDefault('motifs',override(font),initial.revision),error=>error.code==='profile_type_mismatch');
  assert.deepEqual(library.settings(),initial);
  for(const change of [p=>{delete p.profileAssignments.fonts;},p=>{p.profileAssignments.fonts={};},p=>{p.categoryIds=['gifts','gifts'];},p=>{p.profileAssignments.fonts=override({id:'prf_missing'});}]){
    const product=document();change(product);assert.throws(()=>library.resolve(product));
  }
});
test('profile type cannot change and invalid saves preserve the last good revision',t=>{
  const library=memory(t),profile=library.create({name:'Auswahl',type:'fonts',items:['Open Sans']});
  assert.throws(()=>library.save(profile.id,{name:'Motiv',type:'motifs',items:['heart']},1),error=>error.code==='profile_type_change');
  assert.throws(()=>library.save(profile.id,{name:'Unbekannt',type:'fonts',items:['Missing']},1),error=>error.code==='unknown_catalog_item');
  assert.deepEqual(library.get(profile.id),profile);
  for(const invalid of [undefined,0,-1,1.5,'1'])assert.throws(()=>library.save(profile.id,{name:'Neu',type:'fonts',items:[]},invalid),error=>error.code==='invalid_revision');
});
test('a removed catalog item remains inspectable but cannot resolve as a supposedly available font',t=>{
  const filename=disk(t);let library=createProfileLibrary({filename,catalog});
  const profile=library.create({name:'Alte Schrift',type:'fonts',items:['Open Sans']});
  library.setDefault('fonts',override(profile),1);library.close();
  library=createProfileLibrary({filename,catalog:{...catalog,fonts:['Garamond Acryl']}});
  try{
    assert.deepEqual(library.get(profile.id).items,['Open Sans']);
    assert.throws(()=>library.resolve(document()),error=>error.code==='unknown_catalog_item');
  }finally{library.close();}
});
