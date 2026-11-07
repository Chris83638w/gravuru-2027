import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyDesignBatchFiles,prepareDesignBatchReview} from './prepare-design-batch-review.mjs';
import {assertBatchManifest,supplierDesignBlockers,reusedBatchTarget,chunkNativeEntries,verifyDeliveredTextFit,batchVisualIssues,nativeBatchProductKey,batchFamilyMaterial,batchSourceMaterial,safeBatchOriginalId} from './lib/design-batch-plan.mjs';
import {parseDesignSvg} from '../app/workshop/katalog-convert.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const goal={familie:'steel-door-signs',groessen:['GR-ES-RE-50X20-T15'],groessenMm:{'GR-ES-RE-50X20-T15':[50,20]}};
const source={id:'TRE-V2A-8x3,5-D66',version:'a'.repeat(64),zustand:'vorbereitet',blocker:[],mitFoto:false,ziele:[goal]};
const batch='1-tuerschilder-edelstahl-acryl--andenkenschilder';
test('stock path identities stay exact; traversal and filesystem aliases are rejected',()=>{
 assert.equal(safeBatchOriginalId('adventskalender/Anlass/Weihnachten/AK-H-D1'),true);
 for(const id of ['../x','a/../x','a//x','/x','C:/x','a\\x','a./x','a /x'])assert.equal(safeBatchOriginalId(id),false,id);
 const stock={schema:'gravuru-gesamtuebergabe/v1',art:'stapel-bestand',stapel:{id:'B-adventskalender--anlass'},designs:[{id:'adventskalender/Anlass/Weihnachten/AK-H-D1',zustand:'offen',dateien:[]}],rohlinge:[],verweiseAufMaster:[]};
 assert.equal(assertBatchManifest(stock,stock.stapel.id),stock);assert.equal(stock.designs[0].id,'adventskalender/Anlass/Weihnachten/AK-H-D1');
});
test('source family variant and thickness determine new material identities',()=>{
 const material={kind:'acrylic',variant:'schwarz',thicknessMm:5};
 assert.equal(batchFamilyMaterial({id:'gedenktafel-ae-acryl-schwarz',material}).key,'acrylic-as-5mm');
 assert.equal(batchFamilyMaterial({id:'acryl-ss-abstandshalter',material:{...material,thicknessMm:3,variant:'satiniert'}}).key,'acrylic-ss-3mm');
 assert.throws(()=>batchFamilyMaterial({id:'acryl-ss-abstandshalter',material:{...material,variant:'satiniert'}}),/Unsupported/);
 assert.throws(()=>batchFamilyMaterial({id:'guessed',material:{...material,thicknessMm:7}}),/Unsupported/);
 assert.equal(batchSourceMaterial({material:'Acryl'}).key,'acrylic-unspecified');assert.equal(batchSourceMaterial({material:''}).key,'unknown');
});
test('lieferbar stock still requires an explicit product and keeps rebuild/process holds',()=>{
 const d={lieferart:'bestand',zustand:'vorbereitet (Lieferform-2-Prüfung: lieferbar)',ziele:[],verfahren:'Gravur'};
 assert.deepEqual(supplierDesignBlockers(d),['Keine ausdrückliche Zielfamilie im gelieferten Bestand; Produkt-/Familienzuordnung offen.']);
 assert.ok(supplierDesignBlockers({...d,lieferformPruefung:{klasse:'umbau'},verfahren:''}).some(s=>s.includes('Umbau gemeinsam')));
 const goal2={...goal,familie:'grabstecker-edelstahl'};const m={schema:'gravuru-gesamtuebergabe/v1',art:'stapel',stapel:{id:'3-grabstecker-edelstahl--andenkenschilder'},designs:[{...source,ziele:[goal2]}],rohlinge:[],verweiseAufMaster:[]};
 assert.equal(assertBatchManifest(m,m.stapel.id,{familyIds:['grabstecker-edelstahl']}),m);
});
test('supplier targets are per-family; unknown families, duplicate identities and missing mm fail',()=>{
 const m={schema:'gravuru-gesamtuebergabe/v1',art:'stapel',stapel:{id:batch},designs:[source],rohlinge:[],verweiseAufMaster:[]};
 assert.equal(assertBatchManifest(m,batch),m);
 const changed=structuredClone(m);changed.designs[0].ziele.push({...goal,familie:'guessed-family'});assert.throws(()=>assertBatchManifest(changed,batch),/Unsupported explicit family/);
 changed.designs[0].ziele=[goal,goal];assert.throws(()=>assertBatchManifest(changed,batch),/duplicate explicit target/);
 changed.designs[0].ziele=[{...goal,groessenMm:{}}];assert.throws(()=>assertBatchManifest(changed,batch),/Invalid or duplicate explicit target/);
});
test('blocked, process-open and unhandled photos never become prepared',()=>{
 assert.deepEqual(supplierDesignBlockers(source),[]);
 assert.ok(supplierDesignBlockers({...source,zustand:'vorbereitet als Gravurfassung, Verfahren klären'}).length);
 assert.ok(supplierDesignBlockers({...source,blocker:['Renderer passt nicht']}).includes('Renderer passt nicht'));
 assert.ok(supplierDesignBlockers({...source,mitFoto:true}).length);
});
test('pilot targets are reused with their original native IDs; source conflicts cannot overwrite them',()=>{
 const target={sizeKey:goal.groessen[0],mm:[50,20],productKey:'steel-door-signs:old',nativeDesignId:'katalog-original',status:'prepared'};
 const base={originals:[{id:source.id,sourceVersion:source.version,reviewMaterial:{key:'steel'},targets:[target]}]};
 const reused=reusedBatchTarget(source,goal,target.sizeKey,base);assert.equal(reused.productKey,target.productKey);assert.equal(reused.nativeDesignId,target.nativeDesignId);assert.equal(reused.reviewMaterial.kind,'steel');assert.equal(target.reviewMaterial,undefined);
 assert.equal(reusedBatchTarget(source,{...goal,familie:'acryl-3mm-tuerschilder-schwarz'},target.sizeKey,base),null);
 assert.throws(()=>reusedBatchTarget({...source,version:'b'.repeat(64)},goal,target.sizeKey,base),/conflicting source bytes/);
 base.originals[0].targets[0].mm=[51,20];assert.throws(()=>reusedBatchTarget(source,goal,target.sizeKey,base),/incompatible/);
});
test('native products are split by template and distinct-font limits without dropping entries',()=>{
 const entries=Array.from({length:125},(_,i)=>({template:{id:'d'+i,objects:[{type:'text',font:'Font'+i}]}}));
 const chunks=chunkNativeEntries(entries);assert.deepEqual(chunks.map(c=>c.length),[60,60,5]);assert.deepEqual(chunks.flat(),entries);
 assert.deepEqual(chunkNativeEntries(entries.slice(0,5),{maxFonts:2}).map(c=>c.length),[2,2,1]);
 assert.notEqual(nativeBatchProductKey(batch,'steel','size',1),nativeBatchProductKey(batch,'steel','size',2));
 assert.notEqual(nativeBatchProductKey(batch,'steel','size',1),nativeBatchProductKey(batch,'acrylic','size',1));
});
test('already-applied replacement retains exact source size, anchor, baseline and line spacing',()=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="20mm" viewBox="0 0 50 20"><text id="text-1" x="25" y="7" font-family="Replacement" font-size="4" text-anchor="middle"><tspan x="25" dy="0">One</tspan><tspan x="25" dy="6">Two</tspan></text></svg>';
 const parsed=parseDesignSvg(svg),master={json:{texts:[{text:'One\nTwo',font:'Replacement',sizePt:4*72/25.4,sizePtOriginal:5*72/25.4}]}};
 const record={textIndex:0,text:'One\nTwo',original:'Original',ersatz:'Replacement',faktor:.8,anker:'middle',hinweis:'Master: Faktor = bereits angewandte Größenänderung sizePt/sizePtOriginal'};
 const before=structuredClone(parsed),fit=verifyDeliveredTextFit({textEinpassung:[record]},master,parsed);
 assert.deepEqual(parsed,before);assert.equal(fit[0].sourceSizeMm,4);assert.deepEqual(fit[0].baselineMm,[25,7]);assert.equal(fit[0].nativeAnchor,'middle');assert.equal(parsed.layers[0].lineHeight,6);
 assert.throws(()=>verifyDeliveredTextFit({textEinpassung:[{...record,faktor:.6}]},master,parsed),/Einpassungsfaktor/);
 assert.throws(()=>verifyDeliveredTextFit({textEinpassung:[{...record,hinweis:'fit to box'}]},master,parsed),/nicht als bereits angewandt/);
});
test('uncertain font wording survives as a visible issue including the source font name',()=>{
 const text="Schrift 'ParmaPetit' → 'Replacement' – Ersatz unsicher, bitte ansehen";
 assert.deepEqual(batchVisualIssues({befunde:[{text,kategorie:'Ersatzschrift (Tabelle ersatz-alle.json)'}]})[0].message,text);
});
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-batch-test-'));
 t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'design-batch-test-'));fs.rmSync(root,{recursive:true,force:true});});
 const files=[['design.svg','design-svg',Buffer.from('<svg/>\n')],['design.json','design-json',Buffer.from('{"id":"one"}\n')]];
 files.forEach(([name,,bytes])=>fs.writeFileSync(path.join(root,name),bytes));
 const d={id:'one',version:sha(Buffer.concat(files.map(f=>f[2]))),dateien:files.map(([pfad,rolle,bytes])=>({pfad,rolle,bytes:bytes.length,sha256:sha(bytes)}))};
 return {root,manifest:{designs:[d],rohlinge:[]},index:Object.fromEntries(d.dateien.map(f=>[f.pfad,f.sha256]))};
}
test('hash verification detects source or version changes and refuses traversal',t=>{
 const f=fixture(t);assert.equal(verifyDesignBatchFiles(f.root,f.manifest,f.index).manifestFiles,2);
 const wrong=structuredClone(f.manifest);wrong.designs[0].version='0'.repeat(64);assert.throws(()=>verifyDesignBatchFiles(f.root,wrong,f.index),/Source version mismatch/);
 wrong.designs[0].dateien[0].pfad='../outside.svg';assert.throws(()=>verifyDesignBatchFiles(f.root,wrong,f.index),/Path leaves/);
 fs.appendFileSync(path.join(f.root,'design.svg'),' ');assert.throws(()=>verifyDesignBatchFiles(f.root,f.manifest,f.index),/Source checksum mismatch/);
});
test('preparation refuses source/code output and packages larger than the authorized batch',async t=>{
 const f=fixture(t);await assert.rejects(prepareDesignBatchReview({catalogueRoot:f.root,outRoot:path.join(f.root,'new'),batchId:batch}),/outside source and code/);
 await assert.rejects(prepareDesignBatchReview({catalogueRoot:f.root,outRoot:f.root,batchId:batch,maxProducts:101}),/At most 100/);
});

const real=process.env.GRAVURU_DESIGN_BATCH_PACKAGE;
test('real batch packages retain source bytes, exact target geometry, editable objects and unreleased native documents',{skip:!real},()=>{
 const index=JSON.parse(fs.readFileSync(path.join(real,'batch-index.json'))),seen=new Map();
 for(const part of index.parts){
  const root=path.join(real,part.path),read=file=>JSON.parse(fs.readFileSync(path.join(root,file))),pack=read('manifest.json');
  assert.ok(pack.products.length<=100);assert.equal(pack.reviewOnly,true);assert.equal(pack.released,false);
  for(const file of read('files-sha256.json'))assert.equal(sha(fs.readFileSync(path.join(root,file.file))),file.sha256,file.file);
  const docs=new Map();
  for(const p of pack.products){const payload=read(p.file);assert.equal(sha(JSON.stringify(payload.document)),p.documentHash);payload.document.config.localResources.fonts=Object.fromEntries(payload.fontRefs.map(n=>[n,read(pack.fontFiles[n])]));validateProductDocument(payload.document);assert.equal(payload.document.config.reviewOnly,true);assert.equal(payload.document.config.profile.features.orderEnabled,false);assert.equal(payload.document.config.profile.features.productionConfirmed,false);docs.set(p.key,payload.document);}
  for(const row of pack.originals){assert.equal(Number.isFinite(row.reviewOrder),true);assert.equal(row.released,false);for(const f of row.files){const bytes=fs.readFileSync(path.join(root,'originals',row.id,f.name));assert.equal(sha(bytes),f.sha256);const key=row.id+'/'+f.name;if(seen.has(key))assert.equal(seen.get(key),f.sha256);seen.set(key,f.sha256);}
   const textLayers=row.targets.some(t=>t.status==='prepared')?parseDesignSvg(fs.readFileSync(path.join(root,'originals',row.id,'design.svg'),'utf8')).layers.filter(l=>l.kind==='text'):[];
   for(const target of row.targets.filter(t=>t.status==='prepared')){const doc=docs.get(target.productKey),native=doc?.config.profile.designs.find(d=>d.id===target.nativeDesignId);assert.ok(native);assert.equal(native.katalog.originalId,row.id);assert.equal(native.katalog.target.familyId,target.familyId);assert.equal(doc.config.profile.material.kind,target.reviewMaterial.kind);assert.deepEqual([doc.config.profile.geometry.width,doc.config.profile.geometry.height],target.mm);assert.ok(native.objects.length);assert.equal(native.objects.some(o=>o.type==='artwork'),false);
    assert.equal(native.objects.filter(o=>o.type==='text'&&o.role!=='guide').length,textLayers.length);
    for(const layer of textLayers){const text=native.objects.find(o=>o.id===layer.id);assert.ok(text,layer.id);assert.equal(text.text,layer.text);assert.equal(text.font,layer.font);assert.equal(text.textAnchor,layer.anchor);assert.ok(Math.abs(text.size-layer.size*target.scale)<.01,'source font size retained: '+row.id+'/'+layer.id);assert.ok(Math.abs(text.lineHeight-layer.lineHeight*target.scale)<.01,'source line spacing retained');
     if(!layer.rotation){const baseline=text.y+.35*text.size-(layer.lines-1)/2*text.lineHeight;assert.ok(Math.abs(baseline-(layer.y*target.scale+target.offsetMm[1]))<.02,'source baseline retained: '+row.id+'/'+layer.id);}
    }
   }
  }
 }
});
