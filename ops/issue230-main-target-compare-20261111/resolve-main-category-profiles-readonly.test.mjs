import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {MAIN_CATEGORIES,RESOLVER_SOURCE,resolveMainCategoryProfilesReadOnly,summarizeResolution} from './resolve-main-category-profiles-readonly.mjs';
const source=path.join(process.env.GRAVURU_COMPARE_CODE_ROOT||path.resolve(import.meta.dirname,'../..'),'app/workshop/profile-library.mjs');
const {createProfileLibrary}=await import(pathToFileURL(source));
const types=['fonts','motifs','colors','bestsellers'],inherit=()=>({mode:'inherit',profileId:null}),assignments=()=>Object.fromEntries(types.map(t=>[t,inherit()]));
const doc=()=>({categoryIds:[...MAIN_CATEGORIES],profileAssignments:assignments()});
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(import.meta.dirname,'.category-copy-test-')),file=path.join(dir,'profiles.copy.sqlite');
 t.after(()=>{const real=fs.realpathSync(dir);assert.ok(real.startsWith(import.meta.dirname+path.sep+'.category-copy-test-'));fs.rmSync(real,{recursive:true,force:true});});
 const library=createProfileLibrary({filename:file,tenantId:'gravuru',catalog:{fonts:['font-default','font-first','font-second'],motifs:['motif-one','motif-two','motif-extra']}});
 const profile=(type,items)=>library.create({name:'private-profile-label',type,items});
 const set=(category,type,p)=>category===null?library.setDefault(type,p,library.settings().revision):library.setCategory(category,type,p,library.settings().revision);
 const override=p=>({mode:'override',profileId:p.id});
 return {dir,file,library,profile,set,override,read(document=doc()){
  const before=hash(file),db=new DatabaseSync(file,{readOnly:true});let result;
  try{db.exec('PRAGMA query_only=ON; BEGIN');result=resolveMainCategoryProfilesReadOnly({db,tenantId:'gravuru',document,resolverSource:source});db.exec('ROLLBACK');}finally{db.close();}
  assert.equal(hash(file),before);return result;
 },close:()=>library.close()};
}
test('two exact categories match native resolver: ordered overrides, inherit/empty, filtered favorites, pinned sources without item output',t=>{
 const f=fixture(t),d=doc();
 const base=f.profile('fonts',['font-default']),first=f.profile('fonts',['font-first']),last=f.profile('fonts',['font-second']);
 f.set(null,'fonts',f.override(base));f.set(MAIN_CATEGORIES[0],'fonts',f.override(first));f.set(MAIN_CATEGORIES[1],'fonts',f.override(last));
 const motifs=f.profile('motifs',['motif-one','motif-two']),favorites=f.profile('bestsellers',['motif-one','motif-extra']);
 f.set(null,'motifs',f.override(motifs));f.set(MAIN_CATEGORIES[0],'bestsellers',f.override(favorites));f.set(MAIN_CATEGORIES[1],'colors',{mode:'empty',profileId:null});
 const expected=summarizeResolution(f.library.resolve(d));f.close();
 const result=f.read(d);assert.deepEqual(result.withCategories.snapshot,expected);assert.equal(result.withCategories.snapshot.sources.fonts.categoryId,MAIN_CATEGORIES[1]);assert.equal(result.withCategories.filteredBestsellers,1);assert.deepEqual(result.withCategories.snapshot.sources.colors.count,0);
 assert.deepEqual(result.categoryChangesSelections,['fonts','colors','bestsellers']);assert.equal(result.resolverSource.normalizedLfSha256,RESOLVER_SOURCE.normalizedLfSha256);assert.ok(result.profilePins.every(p=>p.storedDocumentSha256.length===64&&p.canonicalDocumentSha256.length===64));assert.equal(result.settingsPin.storedDocumentSha256.length,64);
 assert.doesNotMatch(JSON.stringify(result),/font-default|font-first|font-second|motif-one|motif-extra|private-profile-label/);
});
test('absent category and explicit inherit preserve earlier source; equal selections can still change source pin',t=>{
 const f=fixture(t),base=f.profile('fonts',['font-default']),first=f.profile('fonts',['font-default']);
 f.set(null,'fonts',f.override(base));f.set(MAIN_CATEGORIES[0],'fonts',f.override(first));f.set(MAIN_CATEGORIES[1],'fonts',inherit());
 const expected=summarizeResolution(f.library.resolve(doc()));f.close();const r=f.read();assert.deepEqual(r.withCategories.snapshot,expected);assert.deepEqual(r.categoryChangesSelections,[]);assert.deepEqual(r.categoryChangesSources,['fonts']);assert.equal(r.withCategories.snapshot.sources.fonts.categoryId,MAIN_CATEGORIES[0]);
});
test('no assignments to either category is proven separately from merely keeping the categories',t=>{
 const f=fixture(t),expected=summarizeResolution(f.library.resolve(doc()));f.close();const r=f.read();assert.deepEqual(r.withCategories.snapshot,expected);assert.ok(r.categoryAssignments.every(x=>x.present===false&&x.assignmentSha256===null));assert.deepEqual(r.categoryChangesSources,[]);
});
test('wrong category order, changed resolver bytes and non-query-only handle fail closed without writes',t=>{
 const f=fixture(t);f.close();const before=hash(f.file),db=new DatabaseSync(f.file,{readOnly:true});
 const input={db,tenantId:'gravuru',document:doc(),resolverSource:source};
 try{
  assert.throws(()=>resolveMainCategoryProfilesReadOnly(input),/query_only/);db.exec('PRAGMA query_only=ON; BEGIN');
  assert.throws(()=>resolveMainCategoryProfilesReadOnly({...input,document:{...doc(),categoryIds:[...MAIN_CATEGORIES].reverse()}}),/ordered/);
  const changed=path.join(f.dir,'changed-source.mjs');fs.writeFileSync(changed,fs.readFileSync(source,'utf8')+'\n// drift\n');assert.throws(()=>resolveMainCategoryProfilesReadOnly({...input,resolverSource:changed}),/source hash/);
  assert.throws(()=>resolveMainCategoryProfilesReadOnly({...input,tenantId:'unrelated'}),/scoped profile settings/);
  db.exec('ROLLBACK');
 }finally{db.close();}assert.equal(hash(f.file),before);
});
test('dangling or wrongly typed later category override cannot silently fall back to defaults',t=>{
 const f=fixture(t),font=f.profile('fonts',['font-default']);f.set(null,'fonts',f.override(font));f.close();
 const db=new DatabaseSync(f.file);const row=db.prepare('SELECT document FROM profile_library_settings WHERE tenant_id=?').get('gravuru'),s=JSON.parse(row.document);s.categories[MAIN_CATEGORIES[1]]=assignments();s.categories[MAIN_CATEGORIES[1]].motifs={mode:'override',profileId:font.id};db.prepare('UPDATE profile_library_settings SET document=? WHERE tenant_id=?').run(JSON.stringify(s),'gravuru');db.close();assert.throws(()=>f.read(),/type\/revision\/items/);
});
