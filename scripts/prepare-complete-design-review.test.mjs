import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {planCompleteDesignReview,verifyPreparedBatch} from './prepare-complete-design-review.mjs';
import {DESIGN_BATCH_FOLDER,DESIGN_BATCH_DELIVERY_COMMIT,DESIGN_BATCH_SOURCE_COMMIT} from './prepare-design-batch-review.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(root,file,v)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v));};
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'complete-review-test-'));t.after(()=>{assert.ok(root.startsWith(path.join(os.tmpdir(),'complete-review-test-')));fs.rmSync(root,{recursive:true,force:true});});return root;}
test('all supplier batches preserve order and exact stock IDs, but references do not create cards',t=>{
 const root=fixture(t),id='3-grabstecker-edelstahl--andenkenschilder',stock='B-test--allgemein';
 write(root,DESIGN_BATCH_FOLDER+'/stapel.json',{stapel:[{id}]});
 const manifest=(id,designs,refs=[])=>({stapel:{id},quelle:{commit:DESIGN_BATCH_SOURCE_COMMIT},designs,verweiseAufMaster:refs,rohlinge:[]});
 write(root,DESIGN_BATCH_FOLDER+'/stapel/'+id+'/manifest.json',manifest(id,[{id:'M1',ziele:[]}]));
 write(root,DESIGN_BATCH_FOLDER+'/stapel/'+stock+'/manifest.json',manifest(stock,[{id:'produkt/Tiere/Hund/D1',ziele:[]}],[{id:'produkt/Tiere/Hund/D2',verweisAufMaster:['M1']}]));
 const plan=planCompleteDesignReview({catalogueRoot:root});
 assert.deepEqual(plan.batches.map(b=>b.id),[id,stock]);assert.equal(plan.counts.originals,2);assert.equal(plan.counts.masterReferences,1);assert.equal(plan.counts.registerEntries,3);assert.equal(plan.counts.missingMasterReferences,0);
 write(root,DESIGN_BATCH_FOLDER+'/stapel/'+stock+'/manifest.json',manifest(stock,[{id:'M1'}]));assert.throws(()=>planCompleteDesignReview({catalogueRoot:root}),/Duplicate source original/);
});
test('reuse verifies package bytes and exact source manifest, never just an old success flag',async t=>{
 const root=fixture(t),id='1-tuerschilder-edelstahl-acryl--test',part='part-001',source=DESIGN_BATCH_FOLDER+'/stapel/'+id+'/manifest.json';
 write(root,'batch-index.json',{batchId:id,reviewOnly:true,released:false,parts:[{path:part}]});
 const report={batchId:id,deliveryCommit:DESIGN_BATCH_DELIVERY_COMMIT,counts:{originals:1}};write(root,'preparation-report.json',report);
 write(root,part+'/manifest.json',{batchId:id,reviewOnly:true,released:false,products:[],fontFiles:{}});write(root,part+'/preparation-report.json',report);write(root,part+'/evidence/'+source,{original:'unmodified'});
 const files=['manifest.json','preparation-report.json','evidence/'+source],entries=files.map(file=>{const b=fs.readFileSync(path.join(root,part,file));return {file,bytes:b.length,sha256:sha(b)};});write(root,part+'/files-sha256.json',entries);
 const identity={id,manifestSha256:entries[2].sha256};assert.equal((await verifyPreparedBatch(root,identity)).verified,true);
 await assert.rejects(verifyPreparedBatch(root,{...identity,manifestSha256:'0'.repeat(64)}),/different source manifest/);
 fs.appendFileSync(path.join(root,part,'manifest.json'),' ');await assert.rejects(verifyPreparedBatch(root,identity),/checksum mismatch/);
});
