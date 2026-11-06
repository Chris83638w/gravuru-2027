import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createProductRepository} from './repository.mjs';

const document = name => ({schema:'gravuru-product/v1',name,kind:'product',masterId:null,config:{resource:'payload-marker'}});
test('head reads only tenant-scoped identity/revision/state without parsing document JSON', t => {
  const dir=mkdtempSync(path.join(tmpdir(),'review-head-')), filename=path.join(dir,'test.sqlite');
  const a=createProductRepository({filename,tenantId:'tenant-a'}), b=createProductRepository({filename,tenantId:'tenant-b'});
  t.after(()=>{a.close();b.close();assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep+'review-head-'));rmSync(dir,{recursive:true,force:true});});
  const first=a.create(document('A')), second=b.create(document('B'));
  const originalParse=JSON.parse;
  try {
    JSON.parse=()=>{throw Error('head must not parse a document or metadata');};
    assert.deepEqual(a.head(first.id),{id:first.id,revision:1,status:'draft'});
    assert.deepEqual(b.head(second.id),{id:second.id,revision:1,status:'draft'});
    assert.throws(()=>a.head(second.id),e=>e.status===404&&e.code==='not_found');
    assert.throws(()=>b.head(first.id),e=>e.status===404&&e.code==='not_found');
    assert.throws(()=>a.head('missing'),e=>e.status===404);
  } finally {JSON.parse=originalParse;}
  const saved=a.save(first.id,document('Changed'),1);
  assert.deepEqual(a.head(first.id),{id:first.id,revision:saved.revision,status:'draft'});
  a.publish(first.id,{expectedRevision:2});assert.deepEqual(a.head(first.id),{id:first.id,revision:3,status:'active'});
  a.setArchived(first.id,{expectedRevision:3,archived:true});assert.deepEqual(a.head(first.id),{id:first.id,revision:4,status:'archived'});
  assert.equal(a.get(first.id,{revision:1}).document.name,'A');
});
