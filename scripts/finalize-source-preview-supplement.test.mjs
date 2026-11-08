import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {finalizeSourcePreviewSupplement} from './finalize-source-preview-supplement.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const put=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,Buffer.isBuffer(v)?v:JSON.stringify(v));};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA2sAAAAASUVORK5CYII=','base64');
function fixture(t){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'source-preview-final-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const out=path.join(temp,'supplement'),baseRoot=path.join(temp,'base'),archiveOut=path.join(temp,'archive'),gapAudit=path.join(temp,'gap.json'),legacyProof=path.join(temp,'legacy.json');
 const records=['A','B'].map(id=>({id,preview:'originals/'+id+'/preview.png',hasSvg:true,sha256:hash(png),bytes:png.length}));
 const originals=records.map(r=>({id:r.id,source:'designs/test/'+r.id,targets:[],files:[{name:'preview.png',sha256:r.sha256,bytes:r.bytes}]}));
 put(path.join(baseRoot,'manifest.json'),{originals});for(const r of records)put(path.join(baseRoot,r.preview),png);put(path.join(baseRoot,'files-sha256.json'),records.map(r=>({file:r.preview,sha256:r.sha256,bytes:r.bytes})));
 const old=Buffer.concat([png,Buffer.from('derived')]),preview='originals/_source-previews/'+hash('A').slice(0,24)+'.png';put(path.join(out,preview),old);
 put(path.join(out,'supplement-manifest.json'),{schema:'gravuru-source-preview-supplement/v1',complete:true,counts:{pending:0},rows:[{originalId:'A',preview,sha256:hash(old),bytes:old.length}],blocked:[{originalId:'B',reason:'Unresolved glyph'}]});put(path.join(out,'preparation-proof.json'),{});
 const files=[preview,'supplement-manifest.json','preparation-proof.json'].map(file=>{const b=fs.readFileSync(path.join(out,file));return{file,sha256:hash(b),bytes:b.length};});put(path.join(out,'files-sha256.json'),files);put(gapAudit,{rows:records.map(r=>({id:r.id}))});put(legacyProof,{rows:records});return{out,baseRoot,archiveOut,gapAudit,legacyProof,png,old,preview};
}
test('existing PNG bytes win, superseded derivative is archived and covered font blocker remains explicit',t=>{
 const f=fixture(t),before=fs.readFileSync(path.join(f.baseRoot,'originals/A/preview.png'));const result=finalizeSourcePreviewSupplement(f),m=JSON.parse(fs.readFileSync(path.join(f.out,'supplement-manifest.json'))),proof=JSON.parse(fs.readFileSync(path.join(f.out,'preparation-proof.json')));
 assert.deepEqual(result.counts,{requested:2,rendered:0,existingOriginalPreviews:2,available:2,blocked:0,pending:0,renderingBlockers:1});assert.equal(result.archivedDerivativeCount,1);
 assert.deepEqual(fs.readFileSync(path.join(f.out,f.preview)),f.png);assert.deepEqual(fs.readFileSync(path.join(f.archiveOut,path.basename(f.preview))),f.old);assert.deepEqual(fs.readFileSync(path.join(f.baseRoot,'originals/A/preview.png')),before);
 assert.equal(m.rows.every(r=>r.provenanceKind==='existing-source-image'&&r.sha256===r.source.sha256),true);assert.equal(m.renderingBlockers[0].coveredByExistingOriginalPreview,true);assert.deepEqual(proof.renderingBlockers,m.renderingBlockers);
});
test('wrong existing original hash fails before supplement writes',t=>{
 const f=fixture(t),file=path.join(f.out,'supplement-manifest.json'),before=fs.readFileSync(file);fs.appendFileSync(path.join(f.baseRoot,'originals/B/preview.png'),'changed');assert.throws(()=>finalizeSourcePreviewSupplement(f),/source bytes differ/);assert.deepEqual(fs.readFileSync(file),before);assert.equal(fs.existsSync(f.archiveOut),false);
});
