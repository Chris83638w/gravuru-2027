import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createProfileLibrary,PROFILE_TYPES} from './profile-library.mjs';
import {createCatalogFontSets} from './catalog-fontsets.mjs';
import {openKatalog} from './katalog-source.mjs';
import {ensureFontSet} from './katalog-import.mjs';
import {DatabaseSync,backup} from 'node:sqlite';
import {inspectFontSetOrigins} from '../../scripts/inspect-fontset-origins.mjs';
const fixture=new URL('./fixtures/katalog/',import.meta.url),names=['Michroma','Lato','Cinzel','Montserrat'];
function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-fontsets-'));fs.cpSync(fixture,root,{recursive:true});
 const profiles=createProfileLibrary({filename:path.join(root,'profiles.sqlite'),catalog:{fonts:names,motifs:[]}});
 const runtimeFonts=Object.fromEntries(names.map(n=>[n,{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0'}}}}]));
 const fontLibrary={list:()=>[],import:async()=>{throw Error('synthetic invalid font');}},products=[],repository={list:()=>products};
 const service=createCatalogFontSets({root,profiles,fontLibrary,repository,runtimeFonts});
 t.after(()=>{profiles.close();assert.equal(path.dirname(root),path.resolve(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});});
 const input=(fonts=['Montserrat','Lato','Michroma'])=>({setId:'tuerschilder',fonts,sourceSha256:service.list().sourceSha256});
 const save=async value=>service.save({...value,impactToken:service.impact(value).token});
 const audit=()=>fs.existsSync(path.join(root,'schriften/_aenderungen.jsonl'))?fs.readFileSync(path.join(root,'schriften/_aenderungen.jsonl'),'utf8').trim().split('\n').map(JSON.parse):[];
 return {root,profiles,runtimeFonts,fontLibrary,products,repository,service,input,save,audit};
}
const product=(id,profileId)=>({id,revision:1,status:'draft',document:{name:id,categoryIds:['unterkategorie-test-linie-namensschilder'],profileAssignments:Object.fromEntries(PROFILE_TYPES.map(type=>[type,type==='fonts'&&profileId?{mode:'override',profileId}:{mode:'inherit',profileId:null}]))}});
test('canonical save preserves order, one audit/revision, repeat and importer do not overwrite it',async t=>{
 const f=setup(t),original=f.profiles.syncCatalogFontSet('tuerschilder',names),value=f.input();
 const result=await f.save(value);assert.equal(result.synchronized,true);assert.equal(result.profile.id,original.id);assert.equal(result.profile.revision,2);
 assert.deepEqual(result.profile.items,value.fonts);assert.equal(f.audit().length,1);
 const k=openKatalog(f.root),group=k.fontSet({fontSet:'tuerschilder'});assert.deepEqual(group.fonts,value.fonts);
 const imported=await ensureFontSet(k,group,f);assert.equal(imported.profileRevision,2);assert.equal(f.profiles.list().length,1);
 assert.equal((await f.save(f.input())).changed,false);assert.equal(f.audit().length,1);assert.equal(f.service.list().sets[0].synchronized,true);
 assert.deepEqual(f.profiles.get(original.id,{revision:1}).items,names);
});
test('provenance survives a previously renamed profile; free name lookalike is never overwritten or silently adopted',t=>{
 const f=setup(t),p=f.profiles.create({name:'Umbenannte Gruppe',type:'fonts',items:names});
 f.profiles.adoptCatalogFontSet('tuerschilder',p.id,1);
 const updated=f.profiles.syncCatalogFontSet('tuerschilder',['Michroma','Lato']);assert.equal(updated.name,p.name);assert.equal(updated.id,p.id);
 const free=f.profiles.create({name:'Schrift-Set hundeschilder (Katalog)',type:'fonts',items:names});
 assert.throws(()=>f.profiles.syncCatalogFontSet('hundeschilder',['Michroma','Lato']),e=>e.code==='catalog_source_unresolved');
 assert.equal(f.profiles.get(free.id).revision,1);assert.equal(f.profiles.get(free.id).source,undefined);
 assert.throws(()=>f.profiles.save(p.id,{name:'Andere',type:'fonts',items:names},2),e=>e.code==='catalog_profile_managed');
 assert.throws(()=>f.profiles.previewSave(p.id,{name:'Andere',type:'fonts',items:names},2,[]),e=>e.code==='catalog_profile_managed');
});
test('migration is a read-only proposal; explicit verified adoption preserves the old selection/revision',t=>{
 const f=setup(t),p=f.profiles.create({name:'Schrift-Set tuerschilder (Katalog)',type:'fonts',items:['Cinzel']});
 const listing=f.service.list(),candidate=listing.migration[0];assert.equal(candidate.setId,'tuerschilder');assert.equal(candidate.eligible,true);
 assert.equal(f.profiles.get(p.id).source,undefined);
 const input={setId:'tuerschilder',profileId:p.id,expectedRevision:1,sourceSha256:listing.sourceSha256};
 assert.throws(()=>f.service.adopt(input),e=>e.code==='catalog_origin_confirmation');
 const adopted=f.service.adopt({...input,confirmOrigin:true});assert.equal(adopted.revision,1);assert.deepEqual(adopted.items,['Cinzel']);
 assert.deepEqual(adopted.source,{kind:'katalog-fontset',setId:'tuerschilder'});
});
test('ambiguous origins remain unresolved',t=>{
 const f=setup(t);for(let i=0;i<2;i++)f.profiles.create({name:'Schrift-Set tuerschilder (Katalog)',type:'fonts',items:names});
 assert.ok(f.service.list().migration.every(p=>!p.eligible));assert.throws(()=>f.service.impact(f.input()),e=>e.code==='catalog_source_unresolved');
});
test('impact includes theme and explicit/inherited subcategories, effective profile products and preserved exceptions',t=>{
 const f=setup(t),p=f.profiles.syncCatalogFontSet('tuerschilder',names),free=f.profiles.create({name:'Ausnahme',type:'fonts',items:['Cinzel']});
 f.profiles.setDefault('fonts',{mode:'override',profileId:p.id},1);
 f.products.push(product('direkt',p.id),product('geerbt',null),product('ausnahme',free.id));
 const result=f.service.impact(f.input());assert.deepEqual(result.products.map(p=>p.id),['direkt','geerbt']);assert.equal(result.exceptions[0].id,'ausnahme');
 assert.ok(result.themes.some(t=>t.id==='namensschilder'));assert.equal(result.subcategories[0].explicit,true);
 const other=f.service.impact({...f.input(),setId:'hundeschilder'});assert.equal(other.subcategories[0].explicit,false);
});
test('stale catalogue, changed impact and invalid selection do not write source, audit or profile',async t=>{
 const f=setup(t),value=f.input(),preview=f.service.impact(value),bytes=fs.readFileSync(path.join(f.root,'schriften/sets.json'),'utf8');
 for(const fonts of [['Michroma'],['Michroma','Lato','alien'],['Michroma','Lato','Lato']])assert.throws(()=>f.service.impact({...value,fonts}));
 f.products.push(product('neu',null));
 await assert.rejects(()=>f.service.save({...value,impactToken:preview.token}),e=>e.code==='catalog_fontset_impact');
 fs.appendFileSync(path.join(f.root,'schriften/sets.json'),' ');
 await assert.rejects(()=>f.save(value),e=>e.code==='catalog_fontset_stale');
 assert.equal(fs.readFileSync(path.join(f.root,'schriften/sets.json'),'utf8'),bytes+' ');assert.equal(f.audit().length,0);assert.equal(f.profiles.list().length,0);
});
test('missing/unimportable font cannot cause half a set or profile change',async t=>{
 const f=setup(t);delete f.runtimeFonts.Cinzel;
 assert.throws(()=>f.service.impact(f.input(names)),e=>e.code==='catalog_font_missing');
 const metadata=path.join(f.root,'schriften/schriften.json'),doc=JSON.parse(fs.readFileSync(metadata));const font=doc.fonts.find(v=>v.name==='Cinzel');
 fs.writeFileSync(path.join(f.root,'invalid.ttf'),'not a font');font.file='invalid.ttf';fs.writeFileSync(metadata,JSON.stringify(doc));
 await assert.rejects(()=>f.save(f.input(names)),e=>e.code==='catalog_font_import');assert.equal(f.audit().length,0);assert.equal(f.profiles.list().length,0);
});
test('a failed projection stays visibly pending and retries without a second audit record',async t=>{
 const f=setup(t),sync=f.profiles.syncCatalogFontSet;f.profiles.syncCatalogFontSet=()=>{throw Error('synthetic IO failure');};
 const result=await f.save(f.input());assert.equal(result.synchronized,false);assert.match(result.warning,/Profilübernahme steht noch aus/);
 assert.equal(f.service.list().sets[0].synchronized,false);assert.equal(f.audit().length,1);assert.equal(f.profiles.list().length,0);
 f.profiles.syncCatalogFontSet=sync;const retried=await f.save(f.input());assert.equal(retried.changed,false);assert.equal(retried.synchronized,true);
 assert.equal(retried.profile.revision,1);assert.equal(f.audit().length,1);
});
test('tenant origins and profile writes remain isolated in the same database',t=>{
 const f=setup(t),other=createProfileLibrary({filename:path.join(f.root,'profiles.sqlite'),tenantId:'anderer',catalog:{fonts:names,motifs:[]}});
 try{
 const p=f.profiles.syncCatalogFontSet('tuerschilder',names),q=other.syncCatalogFontSet('tuerschilder',['Michroma','Lato']);
 assert.notEqual(p.id,q.id);assert.equal(other.catalogFontSet('tuerschilder').id,q.id);assert.throws(()=>other.adoptCatalogFontSet('fremd',p.id,1),e=>e.status===404);
 assert.equal(f.profiles.catalogFontSet('tuerschilder').revision,1);
 }finally{other.close();}
});
test('origin dry-run reads a schema-v2 COPY without migration or data changes',async t=>{
 const f=setup(t);f.profiles.create({name:'Schrift-Set tuerschilder (Katalog)',type:'fonts',items:names});
 const filename=path.join(f.root,'copy.sqlite'),source=new DatabaseSync(path.join(f.root,'profiles.sqlite'),{readOnly:true});
 try{await backup(source,filename);}finally{source.close();}
 const copy=new DatabaseSync(filename);copy.exec('DROP TABLE profile_catalog_sources; PRAGMA user_version=2; PRAGMA wal_checkpoint(TRUNCATE)');copy.close();
 const bytes=fs.readFileSync(filename),report=inspectFontSetOrigins({filename,katalogDir:f.root});
 assert.equal(report.schemaVersion,2);assert.equal(report.candidates.length,1);assert.equal(report.candidates[0].eligible,true);assert.deepEqual(fs.readFileSync(filename),bytes);
});
test('font replacement during conversion invalidates the reviewed source before any canonical/profile write',async t=>{
 const f=setup(t);delete f.runtimeFonts.Cinzel;
 const metadata=path.join(f.root,'schriften/schriften.json'),doc=JSON.parse(fs.readFileSync(metadata)),fontFile=path.join(f.root,'test-font.ttf');
 fs.writeFileSync(fontFile,'version one');doc.fonts.find(v=>v.name==='Cinzel').file='test-font.ttf';fs.writeFileSync(metadata,JSON.stringify(doc));
 f.fontLibrary.list=()=>[{id:'converted-cinzel',name:'Cinzel'}];
 f.fontLibrary.import=async()=>{fs.writeFileSync(fontFile,'version two');return {id:'converted-cinzel'};};
 await assert.rejects(()=>f.save(f.input(names)),e=>e.code==='catalog_fontset_impact');assert.equal(f.audit().length,0);assert.equal(f.profiles.list().length,0);
});
