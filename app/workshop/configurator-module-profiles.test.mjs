import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createConfiguratorModuleProfiles} from './configurator-module-profiles.mjs';
const modules=()=>({options:true,designs:true,text:true,motifs:true,photo:false,logo:true,colors:false});
const code=value=>error=>error.code===value;
function fixture(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-modules-')),filename=path.join(directory,'workshop.sqlite'),connections=[];const open=(tenantId='gravuru')=>{const library=createConfiguratorModuleProfiles({filename,tenantId});connections.push(library);return library;};t.after(()=>{connections.reverse().forEach(c=>c.close());fs.rmSync(directory,{recursive:true,force:true});});return {filename,open,library:open()};}
test('module profiles save reusable snapshots, reopen and retain immutable revisions',t=>{
 const f=fixture(t),first=f.library.create({name:'Türschild mit Logo',modules:modules()},{actor:'Mikail'});
 assert.equal(first.revision,1);assert.equal(first.profile.id,first.id);assert.equal(first.profile.modules.logo,true);
 const second=f.library.save(first.id,{name:'Türschild ohne Logo',modules:{...modules(),logo:false}},1);
 assert.equal(second.revision,2);assert.equal(f.open().get(first.id).profile.modules.logo,false);
 assert.equal(f.library.get(first.id,{revision:1}).profile.modules.logo,true);assert.equal(f.library.history(first.id).length,2);
 assert.equal(f.library.save(first.id,second.document,2).revision,2,'no-op does not invalidate product plans');
 const db=new DatabaseSync(f.filename);try{assert.throws(()=>db.prepare('UPDATE configurator_module_profile_revisions SET document=? WHERE id=?').run('{}',first.id),/immutable/);assert.throws(()=>db.prepare('DELETE FROM configurator_module_profile_revisions WHERE id=?').run(first.id),/immutable/);}finally{db.close();}
});
test('concurrent edits and incomplete or invented module switches are rejected',t=>{
 const {library}=fixture(t),first=library.create({name:'Test',modules:modules()});library.save(first.id,{name:'Neue Fassung',modules:modules()},1);
 assert.throws(()=>library.save(first.id,first.document,1),code('module_profile_conflict'));
 assert.throws(()=>library.create({name:'Test',modules:{photo:false}}),code('module_profile_invalid'));
 assert.throws(()=>library.create({name:'Test',modules:{...modules(),unapproved:true}}),code('module_profile_invalid'));
 assert.throws(()=>library.create({name:'Test',modules:modules(),extraPriceCents:1}),code('module_profile_fields'));
 assert.equal(library.list().length,1);
});
test('module profile IDs and all historical reads are tenant scoped',t=>{
 const f=fixture(t),one=f.library.create({name:'Privates Profil',modules:modules()}),other=f.open('another');
 assert.deepEqual(other.list(),[]);assert.throws(()=>other.get(one.id),code('module_profile_missing'));assert.throws(()=>other.get(one.id,{revision:1}),code('module_profile_missing'));
 assert.throws(()=>other.save(one.id,one.document,1),code('module_profile_missing'));assert.equal(f.library.list().length,1);
});
