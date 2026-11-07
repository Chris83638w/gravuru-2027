import test from 'node:test';import assert from 'node:assert/strict';
import {originalCorrespondence} from './audit-review-original-correspondence.mjs';
const files=[{name:'design.svg',sha256:'a'},{name:'design.json',sha256:'b'}];
const source=(id,pfad,same=true)=>({id,pfad,batchId:'B-test',dateien:files.map(f=>({pfad:pfad+'/'+f.name,rolle:f.name==='design.svg'?'design-svg':'design-json',sha256:same?f.sha256:'different'}))});
test('path alias preserves existing identity even when source revision differs; no write authorization',()=>{
 const base={originals:[{id:'legacy',source:'designs/bestand/a/design.json',files}]};
 const r=originalCorrespondence(base,[source('bestand/a','designs/bestand/a',false)],[]).rows[0];
 assert.equal(r.canonicalOriginalId,'legacy');assert.equal(r.sourceStandConflict,true);assert.equal(r.overwriteExistingAssets,false);assert.equal(r.action,'alias-incoming-id-to-existing-id');
});
test('different master reusing a legacy ID receives a deterministic source identity, never a number heuristic',()=>{
 const base={originals:[{id:'D50',source:'designs/bestand/a/design.json',files}]};
 const r=originalCorrespondence(base,[source('D50','designs/master/a',false)],[]).rows[0];
 assert.equal(r.action,'register-separate-source-original');assert.match(r.canonicalOriginalId,/^D50--source-[a-f0-9]{12}$/);assert.notEqual(r.canonicalOriginalId,'D50');
 const again=originalCorrespondence(base,[source('D50','designs/master/a',false)],[]).rows[0];assert.equal(again.canonicalOriginalId,r.canonicalOriginalId);
});
test('one stock reference to several masters remains a relationship, not duplicate cards or forced aliases',()=>{
 const base={originals:[{id:'legacy',source:'designs/bestand/a/design.json',files}]};const r=originalCorrespondence(base,[],[{id:'bestand/a',pfad:'designs/bestand/a',verweisAufMaster:['one','two'],batchId:'B-test'}]);
 assert.equal(r.rows.length,0);assert.equal(r.unmatched.length,0);assert.deepEqual(r.masterReferenceRelationships[0].masterIds,['one','two']);
});
