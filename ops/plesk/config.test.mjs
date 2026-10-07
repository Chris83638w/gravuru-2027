import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTestEnvironment,testConfig} from './config.mjs';

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-private-config-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const folder=path.join(root,'private');fs.mkdirSync(folder,{mode:0o700});
  const file=path.join(folder,'test-config.json');
  const values={GRAVURU_TEST_ORIGIN:'https://private.example',GRAVURU_PRIVATE_DATA_DIR:path.join(root,'data'),GRAVURU_TEST_PYTHON_DIR:path.join(root,'python'),GRAVURU_BOOTSTRAP_PYTHON:'/usr/bin/python3.12',GRAVURU_TEST_USERNAME:'synthetic',GRAVURU_TEST_PASSWORD:'synthetic-test-only-password'};
  const write=record=>fs.writeFileSync(file,typeof record==='string'?record:JSON.stringify(record),{mode:0o600});
  const record={schema:1,purpose:'private-test-runtime',values};write(record);
  return {root,folder,file,values,record,write,env:{GRAVURU_TEST_CONFIG_FILE:file}};
}
test('private file supplies npm runner and app without exposing values',t=>{
  const f=fixture(t),env=privateTestEnvironment({...f.env,PATH:'/existing'});
  assert.equal(testConfig(env).host,'private.example');assert.equal(env.PATH,'/existing');
  assert.equal(privateTestEnvironment({...f.env,...f.values}).GRAVURU_TEST_USERNAME,'synthetic');
});
test('unsafe file and parent permissions are rejected',t=>{
  const f=fixture(t);
  fs.chmodSync(f.file,0o644);assert.throws(()=>privateTestEnvironment(f.env),/Private Testkonfiguration/);
  fs.chmodSync(f.file,0o600);fs.chmodSync(f.folder,0o755);assert.throws(()=>privateTestEnvironment(f.env),/Private Testkonfiguration/);
});
test('symlink and absent explicitly configured file are rejected',t=>{
  const f=fixture(t),link=path.join(f.folder,'link.json');fs.symlinkSync(f.file,link);
  assert.throws(()=>privateTestEnvironment({GRAVURU_TEST_CONFIG_FILE:link}),/symbolische|Private Testkonfiguration/);
  assert.throws(()=>privateTestEnvironment({GRAVURU_TEST_CONFIG_FILE:path.join(f.folder,'absent.json')}),/Private Testkonfiguration/);
});
test('invalid, oversized and unexpected content fails without logging content',t=>{
  const f=fixture(t);
  for(const record of ['invalid '+f.values.GRAVURU_TEST_PASSWORD,'x'.repeat(17000),{...f.record,schema:2},{...f.record,values:{...f.values,NODE_OPTIONS:'unexpected'}}]){
    f.write(record);
    assert.throws(()=>privateTestEnvironment(f.env),error=>error.message.includes('Private Testkonfiguration')&&!error.message.includes(f.values.GRAVURU_TEST_PASSWORD));
  }
});
test('conflicting Plesk and file configuration fails closed',t=>{
  const f=fixture(t);
  assert.throws(()=>privateTestEnvironment({...f.env,GRAVURU_TEST_ORIGIN:'https://different.example'}),/Private Testkonfiguration/);
});
