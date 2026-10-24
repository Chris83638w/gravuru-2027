import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {once} from 'node:events';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {makeProductDocument,validateProductDocument,resolveProduct} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {createDesignAssetStore,importEnvironment,sha256} from './design-assets.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {planBatch,commitBatch} from './batch.mjs';
import {createWorkshop} from './http.mjs';
import {createBatchJobs} from './batch-jobs.mjs';
import {batchReportData} from './batch-report.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
function native(){
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  for(const object of config.profile.designs[0].objects.filter(o=>o.type==='text')){
    measureText(object,resources.fonts);if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}
  }
  const second=structuredClone(config.profile.designs[0]);second.id+='-second';second.name='Zweite Gestaltung';config.profile.designs.push(second);
  return config;
}
const svg=(color='#ed2030',width=100,height=80)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><path d="M0 0H${width}V${height}H0Z" fill="${color}" fill-opacity=".7"/></svg>`);
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-batch-assets-')),filename=path.join(dir,'products.sqlite');
  let assets,repository;const closers=[];
  t.after(()=>{for(const close of [...closers].reverse())close();repository?.close();assets?.close();fs.rmSync(dir,{recursive:true,force:true});});
  const open=()=>{assets=createDesignAssetStore({filename:path.join(dir,'assets.sqlite')});repository=createProductRepository({filename,validateDocument:document=>assets.validateDocument(validateProductDocument(document))});};
  open();const master=repository.create(makeProductDocument(native(),{kind:'master',name:'Master mit zwei Designs'}));
  return {dir,filename,master,onClose(close){closers.push(close);},get assets(){return assets;},get repository(){return repository;},restart(){repository.close();repository=null;assets.close();assets=null;open();}};
}
async function upload(f,name,bytes=svg(),page=1){return f.assets.import({name,bytes:bytes.toString('base64'),page});}
const file=(name,asset)=>({name,page:asset.page,assetId:asset.assetId});
const batch=(f,rows,designFiles=[])=>({masterId:f.master.id,masterRevision:1,rows,designFiles});
const statuses=plan=>plan.report.map(row=>row.status);

test('source folder settings bind exact originals, isolate bad rows and invalidate changed review tokens',async t=>{
  const f=fixture(t),red=await upload(f,'Design.svg',svg('#ff0000')),blue=await upload(f,'Design.svg',svg('#0000ff'));
  const input={...batch(f,[{import_key:'default',name:'Vorgabe',design_file:'klein/Design.svg'},
    {import_key:'override',name:'Abweichung',design_file:'Design.svg',design_folder:'Andere'},
    {import_key:'root',name:'Wurzel',design_file:'Design.svg',design_folder:'.'},
    {import_key:'bad',name:'Ungültig',design_file:'Design.svg',design_folder:'../Andere'}],
    [file('Kollektion/klein/Design.svg',red),file('Andere/Design.svg',blue),file('Design.svg',red)]),settings:{schema_version:'1',design_root:'Kollektion'}};
  const plan=planBatch(f.repository,input,f.assets);assert.deepEqual(statuses(plan),['ready','ready','ready','error']);
  assert.deepEqual(plan.report.slice(0,3).map(r=>r.artwork.name),['Kollektion/klein/Design.svg','Andere/Design.svg','Design.svg']);
  assert.match(plan.report[3].message,/design_folder/);
  // A changed global default must require review even when explicit rows keep the same originals.
  const explicit={...input,rows:[input.rows[1]]},checked=planBatch(f.repository,explicit,f.assets);
  assert.throws(()=>commitBatch(f.repository,{...explicit,settings:{design_root:'Changed'},token:checked.token},f.assets),e=>e.code==='batch_changed');
  const saved=commitBatch(f.repository,{...input,token:plan.token,skipErrors:true},f.assets);assert.equal(saved.products.length,3);
  for(const [i,asset] of [[0,red],[1,blue],[2,red]])assert.equal(f.repository.get(saved.products[i].id).document.config.profile.designs[0].importedSource.assetId,asset.assetId);
  f.restart();assert.deepEqual(statuses(planBatch(f.repository,input,f.assets)),['existing','existing','existing','error']);
  const wrong=structuredClone(input);wrong.rows=[{import_key:'no-fallback',name:'Kein Ersatz',design_file:'Design.svg'}];
  assert.match(planBatch(f.repository,wrong,f.assets).report[0].message,/Kollektion\/Design.svg.*fehlt/);
  assert.deepEqual(f.repository.get(f.master.id),f.master);
});

test('source settings survive private snapshots and correction reports without duplicating legacy snapshots',async t=>{
  const f=fixture(t),asset=await upload(f,'Design.svg'),input={...batch(f,[{import_key:'source-job',name:'Gesichert',design_file:'Design.svg'}],[file('Kollektion/Design.svg',asset)]),settings:{schema_version:'1',design_root:'Kollektion'}};
  let jobs=createBatchJobs({filename:f.filename,repository:f.repository,assets:f.assets});
  f.onClose(()=>jobs?.close());
  const job=jobs.create({name:'Ordner',input});
  const legacy=batch(f,[{import_key:'legacy',name:'Ohne Einstellungen'}]);
  const old=jobs.create({name:'Alt',input:legacy});
  assert.equal(Object.hasOwn(jobs.review(old.id).input,'settings'),false);
  assert.equal(jobs.create({name:'Gleich',input:{...legacy,settings:{schema_version:'1',design_root:''}}}).id,old.id);
  jobs.close();jobs=null;f.restart();jobs=createBatchJobs({filename:f.filename,repository:f.repository,assets:f.assets});
  const opened=jobs.review(job.id);assert.deepEqual(opened.input.settings,input.settings);assert.equal(opened.plan.report[0].artwork.assetId,asset.assetId);
  commitBatch(f.repository,{...opened.input,token:opened.plan.token},f.assets);
  assert.equal(jobs.review(job.id).plan.report[0].status,'existing');
  const failed={...input,rows:[{import_key:'correct',name:'Offen',design_file:'Design.svg',design_folder:'Fehlt'}]};
  const correction=batchReportData(f.repository,{...failed,mode:'errors'},f.assets);
  assert.deepEqual(correction.settings,input.settings);assert.equal(correction.rows[0].design_folder,'Fehlt');assert.equal(correction.rows[0].master_revision,1);
  assert.throws(()=>jobs.create({name:'Falsch',input:{...input,settings:{design_root:'../secret'}}}),/Einstellungen/);
});

test('relative folder references resolve identical basenames to distinct immutable sources in acrylic imports',async t=>{
  const f=fixture(t),redBytes=svg('#cc2211'),blueBytes=svg('#2244cc');
  const red=await upload(f,'Design.svg',redBytes),blue=await upload(f,'Design.svg',blueBytes);
  const input=batch(f,[{import_key:'folder-red',name:'Rot',design_file:'klein/Design.svg'},
    {import_key:'folder-blue',name:'Blau',design_file:'gross/Design.svg'},
    {import_key:'folder-ambiguous',name:'Unklar',design_file:'Design.svg'}],
    [file('klein/Design.svg',red),file('gross/Design.svg',blue)]);
  const plan=planBatch(f.repository,input,f.assets);assert.deepEqual(statuses(plan),['ready','ready','error']);assert.match(plan.report[2].message,/fehlt/);
  assert.deepEqual(plan.report.slice(0,2).map(r=>r.artwork.name),['klein/Design.svg','gross/Design.svg']);
  const result=commitBatch(f.repository,{...input,token:plan.token,skipErrors:true},f.assets);
  for(const [i,asset] of [[0,red],[1,blue]]){const d=f.repository.get(result.products[i].id).document.config.profile.designs[0];assert.equal(d.importedSource.assetId,asset.assetId);assert.equal(d.importedSource.originalName,'Design.svg');}
  f.restart();assert.deepEqual(f.assets.read(red.assetId,true),redBytes);assert.deepEqual(f.assets.read(blue.assetId,true),blueBytes);
  const again=planBatch(f.repository,input,f.assets);assert.deepEqual(statuses(again),['existing','existing','error']);
  assert.ok(commitBatch(f.repository,{...input,token:again.token,skipErrors:true},f.assets).products.every(p=>!p.created));
  assert.deepEqual(f.repository.get(f.master.id),f.master);
});

test('folder aliases cannot use external, absolute or traversal references in mappings or table rows',async t=>{
  const f=fixture(t),asset=await upload(f,'Design.svg');
  for(const name of ['../Design.svg','/Design.svg','file:///Design.svg','https://host/Design.svg','C:/Design.svg','folder\\Design.svg','a//Design.svg']){
    assert.throws(()=>planBatch(f.repository,batch(f,[{import_key:'bad',name:'Ungültig',design_file:name}],[file(name,asset)]),f.assets),/Ungültige Design-Dateizuordnung/);
    const plan=planBatch(f.repository,batch(f,[{import_key:'bad',name:'Ungültig',design_file:name}],[file('Design.svg',asset)]),f.assets);assert.equal(plan.report[0].status,'error');assert.equal(plan.token,null);
  }
  assert.equal(f.repository.list().length,1);
});

test('linked SVG rows retain originals across restart, replace only chosen designs and remain idempotent',async t=>{
  const f=fixture(t),aBytes=svg(),bBytes=svg('#143ad0',40,120),a=await upload(f,'Rot.svg',aBytes),b=await upload(f,'Blau.svg',bBytes);
  const [first,second]=f.master.document.config.profile.designs;
  const input=batch(f,[{import_key:'linked-red',name:'Rotes Produkt',design_file:'Rot.svg'},{import_key:'linked-blue',name:'Blaues Produkt',design_file:'Blau.svg',design_id:second.id,design_fit:'original'}],[file('Rot.svg',a),file('Blau.svg',b)]);
  const plan=planBatch(f.repository,input,f.assets);assert.equal(plan.valid,true,JSON.stringify(plan.report));
  assert.deepEqual(statuses(plan),['ready','ready']);assert.equal(f.repository.list().length,1);
  const committed=commitBatch(f.repository,{...input,token:plan.token},f.assets);assert.equal(committed.products.length,2);
  const products=committed.products.map(item=>f.repository.get(item.id));
  for(const [index,target,untouched,asset] of [[0,first.id,second,a],[1,second.id,first,b]]){
    const document=products[index].document,design=document.config.profile.designs.find(d=>d.id===target);
    assert.equal(document.masterId,f.master.id);assert.equal(design.importedSource.assetId,asset.assetId);
    assert.deepEqual(document.config.profile.designs.find(d=>d.id===untouched.id),untouched);
    assert.deepEqual(document.config.acrylic,f.master.document.config.acrylic);
    assert.deepEqual(document.config.profile.optionGroups,f.master.document.config.profile.optionGroups);
    assert.equal(document.config.profile.defaultDesignId,first.id);
    const resolved=resolveProduct(document,{designId:target,options:{size:'large',base:'eiche',wall:'wall'}});
    assert.equal(resolved.price.totalCents,3697);assert.equal(resolved.price.additionalMotifs,0);
    assert.equal(design.objects[0].locked,true);assert.equal(design.objects[0].preserveColors,true);
  }
  assert.equal(products[1].document.config.profile.designs[1].objects[0].w,40);
  assert.equal(products[1].document.config.profile.designs[1].objects[0].h,120);
  assert.deepEqual(f.repository.get(f.master.id),f.master);
  f.restart();
  assert.deepEqual(f.assets.read(a.assetId,true),aBytes);assert.deepEqual(f.assets.read(b.assetId,true),bBytes);
  assert.equal(f.assets.get(a.assetId).sourceSha256,sha256(aBytes));
  const repeated=planBatch(f.repository,input,f.assets);assert.deepEqual(statuses(repeated),['existing','existing']);
  const again=commitBatch(f.repository,{...input,token:repeated.token},f.assets);
  assert.deepEqual(again.products.map(p=>p.id),committed.products.map(p=>p.id));assert.ok(again.products.every(p=>p.created===false));assert.equal(f.repository.list().length,3);
});

test('missing files, invalid pages, invalid targets and unsupported personalization are per-row errors',async t=>{
  const f=fixture(t),asset=await upload(f,'Design.svg'),huge=await upload(f,'Gross.svg',svg('#334455',500,500));
  const input=batch(f,[
    {import_key:'good',name:'Gültig',design_file:'Design.svg'},
    {import_key:'missing',name:'Fehlt',design_file:'Nicht-da.svg'},
    {import_key:'wrong-case',name:'Dateiname anders',design_file:'design.svg'},
    {import_key:'zero-page',name:'Seite null',design_file:'Design.svg',design_page:0},
    {import_key:'fraction-page',name:'Bruchseite',design_file:'Design.svg',design_page:'1.5'},
    {import_key:'missing-page',name:'Seite fehlt',design_file:'Design.svg',design_page:2},
    {import_key:'page-without-file',name:'Datei nicht ausgewählt',design_page:2},
    {import_key:'path',name:'Pfad',design_file:'folder/Design.svg'},
    {import_key:'url',name:'URL',design_file:'https://example.org/Design.svg'},
    {import_key:'unknown-design',name:'Falsches Design',design_file:'Design.svg',design_id:'not-in-master'},
    {import_key:'huge',name:'Zu groß',design_file:'Gross.svg',design_fit:'original'},
    ...['heading','names','place','date','slogan'].map(field=>({import_key:'text-'+field,name:'Text '+field,design_file:'Design.svg',[field]:'Neuer Text'}))
  ],[file('Design.svg',asset),file('Gross.svg',huge)]);
  const plan=planBatch(f.repository,input,f.assets);assert.equal(plan.valid,false);assert.equal(plan.entries.length,1);
  assert.equal(plan.report[0].status,'ready');assert.ok(plan.report.slice(1).every(row=>row.status==='error'&&row.message));
  assert.throws(()=>commitBatch(f.repository,{...input,token:plan.token},f.assets),error=>error.code==='batch_invalid');assert.equal(f.repository.list().length,1);
  const partial=commitBatch(f.repository,{...input,token:plan.token,skipErrors:true},f.assets);
  assert.equal(partial.products.length,1);assert.equal(partial.errors.length,input.rows.length-1);assert.equal(f.repository.list().length,2);
  assert.equal(f.repository.get(partial.products[0].id).document.config.profile.designs[0].importedSource.assetId,asset.assetId);
});

test('changed effective file mapping invalidates review tokens without creating products',async t=>{
  const f=fixture(t),a=await upload(f,'Design.svg'),b=await upload(f,'Andere.svg',svg('#001122'));
  const input=batch(f,[{import_key:'bound-file',name:'Dateigebunden',design_file:'Design.svg'}],[file('Design.svg',a)]),plan=planBatch(f.repository,input,f.assets);
  assert.equal(plan.valid,true,JSON.stringify(plan.report));
  const changed={...input,designFiles:[file('Design.svg',b)]},changedPlan=planBatch(f.repository,changed,f.assets);
  assert.equal(changedPlan.valid,true,JSON.stringify(changedPlan.report));assert.notEqual(changedPlan.token,plan.token);
  assert.notEqual(changedPlan.entries[0].fingerprint,plan.entries[0].fingerprint);
  assert.throws(()=>commitBatch(f.repository,{...changed,token:plan.token},f.assets),error=>error.code==='batch_changed');
  assert.equal(f.repository.list().length,1);assert.equal(f.repository.importItem('bound-file'),null);
});

test('ambiguous or excessive global file maps are rejected before writes',async t=>{
  const f=fixture(t),a=await upload(f,'Design.svg'),b=await upload(f,'Andere.svg',svg('#335577'));
  const rows=[{import_key:'ambiguous',name:'Mehrdeutig',design_file:'Design.svg'}];
  for(const designFiles of [[file('Design.svg',a),file('Design.svg',b)],Array.from({length:101},(_,i)=>file('Design-'+i+'.svg',a))]){
    assert.throws(()=>planBatch(f.repository,batch(f,rows,designFiles),f.assets));assert.equal(f.repository.list().length,1);
  }
});

test('masters with existing imports validate original assets even when rows select no new file',async t=>{
  const f=fixture(t),asset=await upload(f,'Master.svg');
  const input={expectedRevision:1,designId:f.master.document.config.profile.defaultDesignId,assetId:asset.assetId,fit:'visible',originalName:'Master.svg'};
  const preview=planDesignImport(f.repository,f.assets,f.master.id,input),master=applyDesignImport(f.repository,f.assets,f.master.id,{...input,token:preview.token});
  const batchInput={masterId:master.id,masterRevision:2,rows:[{import_key:'copied-import',name:'Mit Original'}]};
  const plan=planBatch(f.repository,batchInput,f.assets);assert.equal(plan.valid,true,JSON.stringify(plan.report));
  const copied=commitBatch(f.repository,{...batchInput,token:plan.token},f.assets);
  assert.equal(f.repository.get(copied.products[0].id).document.config.profile.designs[0].importedSource.assetId,asset.assetId);
  const emptyAssets=createDesignAssetStore({filename:':memory:'});f.onClose(()=>emptyAssets.close());
  const missing=planBatch(f.repository,{...batchInput,rows:[{import_key:'lost-original',name:'Fehlendes Original'}]},emptyAssets);
  assert.equal(missing.valid,false);assert.equal(missing.report[0].status,'error');assert.equal(missing.entries.length,0);
});

test('batch asset import rolls back products and import keys together on database failure',async t=>{
  const f=fixture(t),asset=await upload(f,'Design.svg');
  const input=batch(f,[{import_key:'atomic-first',name:'Erstes',design_file:'Design.svg'},{import_key:'atomic-second',name:'Zweites',design_file:'Design.svg'}],[file('Design.svg',asset)]);
  const plan=planBatch(f.repository,input,f.assets);assert.equal(plan.valid,true,JSON.stringify(plan.report));
  const raw=new DatabaseSync(f.filename);try{raw.exec("CREATE TRIGGER fail_asset_batch BEFORE INSERT ON import_items WHEN NEW.import_key='atomic-second' BEGIN SELECT RAISE(ABORT,'test rollback'); END");}finally{raw.close();}
  assert.throws(()=>commitBatch(f.repository,{...input,token:plan.token},f.assets));
  assert.equal(f.repository.list().length,1);assert.equal(f.repository.importItem('atomic-first'),null);assert.equal(f.repository.importItem('atomic-second'),null);
  assert.deepEqual(f.assets.read(asset.assetId,true),svg(),'uploaded source remains available for retry');
});

test('legacy batches without an asset store retain text personalization and prices',t=>{
  const f=fixture(t),input={masterId:f.master.id,masterRevision:1,rows:[{import_key:'legacy',name:'Bisheriger Import',names:'Mia & Jörg',price_small_eur:'17,99'}]};
  const plan=planBatch(f.repository,input);assert.equal(plan.valid,true,JSON.stringify(plan.report));
  const result=commitBatch(f.repository,{...input,token:plan.token}),document=f.repository.get(result.products[0].id).document;
  assert.equal(document.config.acrylic.pricing.sizes.small,1799);assert.equal(document.config.acrylic.pricing.sizes.large,1999);
  assert.ok(document.config.profile.designs.every(design=>design.objects.find(object=>object.fieldKey==='names').text==='Mia & Jörg'));
  assert.ok(document.config.profile.designs.every(design=>!design.importedSource));
});

test('HTTP uploads require CSRF and feed reviewed batch creation without changing the master',async t=>{
  const workshop=createWorkshop({filename:':memory:',seedConfig:native(),legacy:{purchasing:{},features:{}}});
  const server=createPreviewServer({workshop});
  t.after(async()=>{if(server.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));workshop.close();});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`,master=workshop.repository.get(workshop.defaultId);
  const {csrfToken}=await (await fetch(base+'/api/workshop/session')).json();
  const post=async(route,body,token=csrfToken)=>{
    const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(body)});
    return {status:response.status,data:await response.json()};
  };
  const bytes=svg(),uploadInput={name:'Tabelle.svg',bytes:bytes.toString('base64'),page:1};
  assert.equal((await post('/api/workshop/design-assets/import',uploadInput,'invalid')).status,403);
  const uploaded=await post('/api/workshop/design-assets/import',uploadInput);assert.ok([200,201].includes(uploaded.status),JSON.stringify(uploaded));
  const asset=uploaded.data.asset??uploaded.data;assert.match(asset.assetId,/^[a-f0-9]{64}$/);assert.equal(asset.sourceSha256,sha256(bytes));
  assert.deepEqual(workshop.repository.get(master.id),master);
  const input={masterId:master.id,masterRevision:1,designFiles:[file(uploadInput.name,asset)],rows:[{import_key:'http-file',name:'Datei aus Tabelle',design_file:uploadInput.name}]};
  const planned=await post('/api/workshop/batch/plan',input);assert.equal(planned.status,200,JSON.stringify(planned.data));assert.equal(planned.data.valid,true,JSON.stringify(planned.data.report));
  assert.equal(workshop.repository.list().length,1);
  const committed=await post('/api/workshop/batch/commit',{...input,token:planned.data.token});assert.equal(committed.status,200,JSON.stringify(committed.data));
  const product=workshop.repository.get(committed.data.products[0].id);assert.equal(product.document.config.profile.designs[0].importedSource.assetId,asset.assetId);
  const original=await fetch(base+`/api/workshop/design-assets/${asset.assetId}/original`);assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),bytes);
  assert.deepEqual(workshop.repository.get(master.id),master);
});

function twoPagePdf(){
  const streams=['1 0 0 rg 2 2 40 80 re f','0 0 1 rg 2 2 80 40 re f'];
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 144] /Resources << >> /Contents 4 0 R >>',`<< /Length ${streams[0].length} >>\nstream\n${streams[0]}\nendstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 144 72] /Resources << >> /Contents 6 0 R >>',`<< /Length ${streams[1].length} >>\nstream\n${streams[1]}\nendstream`];
  let text='%PDF-1.4\n';const offsets=[0];
  for(const [index,object] of objects.entries()){offsets.push(Buffer.byteLength(text));text+=`${index+1} 0 obj\n${object}\nendobj\n`;}
  const xref=Buffer.byteLength(text);text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text);
}
const bundled=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python',process.platform==='win32'?'python.exe':'bin/python3');
const python=process.env.GRAVURU_PYTHON||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const pdfAvailable=spawnSync(python,['-c','import pymupdf; assert callable(pymupdf.open)'],{windowsHide:true,env:importEnvironment()}).status===0;
test('same PDF filename maps separate selected pages to separate rows and retains one exact original',{skip:pdfAvailable?false:'PyMuPDF optional dependency unavailable'},async t=>{
  const f=fixture(t),bytes=twoPagePdf(),first=await upload(f,'Seiten.pdf',bytes,1),second=await upload(f,'Seiten.pdf',bytes,2);
  assert.notEqual(first.assetId,second.assetId);assert.equal(first.sourceSha256,second.sourceSha256);
  const input=batch(f,[{import_key:'pdf-page-1',name:'Erste Seite',design_file:'Seiten.pdf',design_page:1},{import_key:'pdf-page-2',name:'Zweite Seite',design_file:'Seiten.pdf',design_page:2}],[file('Seiten.pdf',first),file('Seiten.pdf',second)]);
  const plan=planBatch(f.repository,input,f.assets);assert.equal(plan.valid,true,JSON.stringify(plan.report));
  const result=commitBatch(f.repository,{...input,token:plan.token},f.assets);
  for(const [i,asset] of [first,second].entries()){
    const product=f.repository.get(result.products[i].id),imported=product.document.config.profile.designs[0];
    assert.equal(imported.importedSource.assetId,asset.assetId);assert.equal(f.assets.get(asset.assetId).page,i+1);
    assert.deepEqual(f.assets.read(asset.assetId,true),bytes);
  }
});
