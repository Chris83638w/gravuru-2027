import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifySteelPilotFiles,prepareSteelReviewPilot} from './prepare-steel-review-pilot.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'steel-review-test-'));
 t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'steel-review-test-'));fs.rmSync(root,{recursive:true,force:true});});
 const files=[['design.svg','design-svg',Buffer.from('<svg><text id="text-1">Original</text></svg>\n')],['design.json','design-json',Buffer.from('{"id":"ID-1"}\n')]];
 for(const [name,,bytes]of files)fs.writeFileSync(path.join(root,name),bytes);
 const entry={id:'ID-1',version:sha(Buffer.concat(files.map(f=>f[2]))),dateien:files.map(([pfad,rolle,b])=>({pfad,rolle,bytes:b.length,sha256:sha(b)}))};
 return {root,manifest:{designs:[entry],rohlinge:[]},index:Object.fromEntries(entry.dateien.map(f=>[f.pfad,f.sha256]))};
}
test('immutable source bytes, file index and concatenated source versions are checked together',t=>{
 const f=fixture(t),result=verifySteelPilotFiles(f.root,f.manifest,f.index);
 assert.equal(result.manifestFiles,2);assert.deepEqual(result.warnings,[]);
 fs.appendFileSync(path.join(f.root,'design.svg'),' ');
 assert.throws(()=>verifySteelPilotFiles(f.root,f.manifest,f.index),/Manifest checksum mismatch/);
});
test('a valid file hash does not authorize a changed source version',t=>{
 const f=fixture(t);f.manifest.designs[0].version='0'.repeat(64);
 assert.throws(()=>verifySteelPilotFiles(f.root,f.manifest,f.index),/Source version mismatch/);
});
test('unknown checksum defects remain fatal including arbitrary README changes',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.root,'README.md'),'not approved');f.index['README.md']='0'.repeat(64);
 assert.throws(()=>verifySteelPilotFiles(f.root,f.manifest,f.index),/Delivery checksum mismatch/);
});
test('references cannot escape their catalogue root',t=>{
 const f=fixture(t);f.manifest.designs[0].dateien[0].pfad='../escaped.svg';
 assert.throws(()=>verifySteelPilotFiles(f.root,f.manifest,f.index),/Path leaves package/);
});
test('preparation never writes into catalogue or overwrites a nonempty output',async t=>{
 const f=fixture(t);
 await assert.rejects(prepareSteelReviewPilot({catalogueRoot:f.root,outRoot:path.join(f.root,'output')}),/outside source and code/);
 await assert.rejects(prepareSteelReviewPilot({catalogueRoot:f.root,outRoot:f.root}),/new or empty/);
 assert.equal(fs.existsSync(path.join(f.root,'output')),false);
});

const packageRoot=process.env.GRAVURU_STEEL_REVIEW_PACKAGE;
test('real pilot: all 28 originals and 146 targets resolve to 73 editable unreleased native documents', {skip:!packageRoot},()=>{
 const read=file=>JSON.parse(fs.readFileSync(path.join(packageRoot,file),'utf8'));
 const manifest=read('manifest.json'),checks=read('files-sha256.json'),report=read('preparation-report.json');
 assert.equal(manifest.schema,'gravuru-design-original-review/v1');assert.equal(manifest.originals.length,28);assert.equal(manifest.products.length,73);assert.equal(manifest.blanks.length,73);assert.equal(Object.keys(manifest.fontFiles).length,3);
 for(const f of checks)assert.equal(sha(fs.readFileSync(path.join(packageRoot,f.file))),f.sha256,f.file);
 const products=new Map();
 for(const p of manifest.products){
  const {document,fontRefs}=read(p.file);assert.equal(sha(JSON.stringify(document)),p.documentHash);assert.deepEqual(document.config.localResources.fonts,{});
  document.config.localResources.fonts=Object.fromEntries(fontRefs.map(n=>[n,read(manifest.fontFiles[n])]));
  validateProductDocument(document);assert.equal(document.config.reviewOnly,true);assert.equal(document.config.profile.features.orderEnabled,false);assert.equal(document.config.profile.features.productionConfirmed,false);
  assert.match(document.config.materialSurface,/^data:image\/png;base64,/);
  assert.equal(document.config.profile.designs.some(d=>d.id==='start'),false);
  for(const d of document.config.profile.designs){assert.equal(d.katalog.target.released,false);for(const o of d.objects.filter(o=>o.type==='motif')){assert.equal(o.customerEditable,true);assert.equal(document.elementRights[d.id][o.id].move,true);}}
  products.set(p.key,document);
 }
 let targets=0;
 for(const row of manifest.originals){
  assert.equal(row.reviewMaterial.kind,'steel');assert.equal(row.released,false);assert.equal(row.photoSlots,0);assert.equal(row.sourceApproval.length>0,true);
  for(const file of row.files)assert.equal(sha(fs.readFileSync(path.join(packageRoot,'originals',row.id,file.name))),file.sha256);
  const source=read('originals/'+row.id+'/design.json');
  for(const target of row.targets){targets++;assert.equal(target.released,false);const document=products.get(target.productKey);assert.ok(document);const native=document.config.profile.designs.find(d=>d.id===target.nativeDesignId);assert.equal(native.katalog.originalId,row.id);assert.equal(native.objects.filter(o=>o.type==='text').length,source.texts.length);assert.equal(native.objects.filter(o=>o.type==='motif').length,(source.motifs||[]).length);}
 }
 assert.equal(targets,146);assert.equal(report.validation.manifestFiles,500);assert.equal(report.deliveryWarnings.length,1);assert.equal(report.deliveryWarnings[0].code,'delivery-readme-checksum-stale');
 assert.equal(manifest.originals.filter(r=>r.visualReviewIssues.some(i=>i.code==='smallest-b02s-evidence-missing')).length,2);
 assert.equal(checks.some(f=>/\.sqlite$/.test(f.file)),false);
});
