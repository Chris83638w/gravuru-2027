import test from 'node:test';
import assert from 'node:assert/strict';
import {designSourceSettings,resolveDesignSourcePath} from './design-source-path.mjs';

test('source folder defaults, per-row replacement and selection root have explicit precedence',()=>{
  const settings={schema_version:1,design_root:'Kollektion/Frühling'};
  assert.equal(resolveDesignSourcePath({design_file:'klein/Design.svg'},settings),'Kollektion/Frühling/klein/Design.svg');
  assert.equal(resolveDesignSourcePath({design_file:'Design.svg',design_folder:'Ausnahmen/groß'},settings),'Ausnahmen/groß/Design.svg');
  assert.equal(resolveDesignSourcePath({design_file:'Design.svg',design_folder:'.'},settings),'Design.svg');
  assert.equal(resolveDesignSourcePath({design_file:'Design.svg'}),'Design.svg');
  assert.equal(resolveDesignSourcePath({},settings),'');
  assert.deepEqual(designSourceSettings(),{schema_version:'1',design_root:''});
  assert.deepEqual(settings,{schema_version:1,design_root:'Kollektion/Frühling'});
});
test('source settings reject unsupported schemas, unknown fields and unsafe folder references',()=>{
  for(const settings of [null,[],{schema_version:2},{schema_version:''},{token:'not-a-credential'},{design_root:3}])assert.throws(()=>designSourceSettings(settings),/Einstellungen/);
  for(const folder of ['../a','/a','C:/a','https://example.org','a\\b','a/..','a//b','a/%2e',' a','a/','a\n','a?b','a#b']){
    assert.throws(()=>designSourceSettings({design_root:folder}),/Einstellungen/);
    assert.throws(()=>resolveDesignSourcePath({design_file:'Design.svg',design_folder:folder}),/design_folder/);
  }
  assert.throws(()=>resolveDesignSourcePath({design_file:'../Design.svg'},{design_root:'ok'}),/design_file/);
  assert.throws(()=>resolveDesignSourcePath({design_folder:'ok'}),/benötigt auch/);
});
test('composed source paths enforce total bounds even when folder and file are individually valid',()=>{
  assert.throws(()=>resolveDesignSourcePath({design_file:'a/'.repeat(8)+'Design.svg'},{design_root:'b/'.repeat(7)+'c'}),/zusammengesetzte/);
  assert.throws(()=>resolveDesignSourcePath({design_file:'c'.repeat(150)+'.svg'},{design_root:'a'.repeat(200)+'/'+'b'.repeat(200)}),/zusammengesetzte/);
  assert.equal(resolveDesignSourcePath({design_file:'Design.svg'},{design_root:'=literal'}),'=literal/Design.svg');
});
