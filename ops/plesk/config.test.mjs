import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTestEnvironment,testConfig,verifyStorage,DATA_MARKER,markerValue} from './config.mjs';

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

test('optional Schiefer gallery key is accepted without expanding other configuration keys',t=>{
  const f=fixture(t);
  const values={...f.values,GRAVURU_SLATE_REVIEW_PACKAGE:path.join(f.root,'gallery')};
  f.write({...f.record,values});
  assert.equal(testConfig(privateTestEnvironment(f.env)).slateReviewPackage,values.GRAVURU_SLATE_REVIEW_PACKAGE);
  f.write({...f.record,values:{...values,GRAVURU_UNRELATED_PATH:'/unexpected'}});
  assert.throws(()=>privateTestEnvironment(f.env),/Private Testkonfiguration/);
});

test('review comments and mapping are allowed only in explicit review mode',t=>{
  const f=fixture(t),config=testConfig(f.values);
  fs.mkdirSync(config.data,{mode:0o700});
  fs.writeFileSync(path.join(config.data,DATA_MARKER),JSON.stringify(markerValue(config,'private-test-data')),{mode:0o600});
  for(const file of ['workshop.sqlite','review-comments.sqlite','local-review-import.json'])fs.writeFileSync(path.join(config.data,file),'synthetic',{mode:0o600});
  assert.throws(()=>verifyStorage(config),/Unerwarteter Inhalt/);
  const review={...config,slateReviewPackage:path.join(f.root,'gallery')};
  assert.doesNotThrow(()=>verifyStorage(review));
  fs.writeFileSync(path.join(config.data,'other.sqlite'),'synthetic',{mode:0o600});
  assert.throws(()=>verifyStorage(review),/Unerwarteter Inhalt/);
});
