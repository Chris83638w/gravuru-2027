import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';import {execFileSync} from 'node:child_process';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {makeFormProduct} from './form-product.mjs';import {addFormDesign} from './form-designs.mjs';
import {initialFormCustomerState,resolveFormCustomer} from './form-customer-model.mjs';
import {formMotif} from './form-additions.mjs';import {prepareFormReview} from './form-review-snapshot.mjs';
import {createFormPrintProof} from './form-print-proof.mjs';import {readReviewPackage,digest} from './review-package.mjs';
import {planOrderProductDraft} from './order-product-draft.mjs';import {importEnvironment} from './design-assets.mjs';
async function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-additions-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],filename=path.join(dir,'workshop.sqlite');let w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const c=await w.contours.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80" rx="3"/><circle cx="8" cy="40" r="2"/></svg>').toString('base64')}),a=await w.assets.import({name:'Design.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><path d="M10 8H110" stroke="#333333"/></svg>').toString('base64')});
 const d=addFormDesign(makeFormProduct(c,'Ergänzungen'),a,{name:'Vorlage',designId:'original'});d.basePriceCents=2999;d.processingMethod='print';d.material={id:'steel',thicknessMm:1.5,surfaceNotes:''};d.designs[0].sourcePrepared=true;
 const font=Object.keys(seed.universal.localResources.fonts)[0];d.designs[0].fields=[{id:'fixed',type:'text',label:'Fest',xMm:15,yMm:10,widthMm:90,heightMm:15,allowMove:false,allowScale:false,allowDelete:false,allowColor:false,text:'Original',font,sizeMm:3,color:'#222222',bold:false,italic:false}];
 const record=w.repository.create(d),draft=w.customerDrafts.create(record,'original',initialFormCustomerState(d.designs[0])),m=formMotif('heart');
 const state={...draft.state,additions:[{id:'extra-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',type:'text',deleted:false,xMm:20,yMm:30,widthMm:70,heightMm:12,text:'AB',font,sizeMm:5,color:'#2244bb',bold:false,italic:false},{id:'extra-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',type:'motif',deleted:false,xMm:50,yMm:50,widthMm:18,heightMm:18,motifKey:m.key,motifSha256:m.sha256,color:'#bb4422',rotation:15}]};
 return {get w(){return w;},dir,seed,record,draft,state,options:()=>({assets:w.assets,fonts:seed.universal.localResources.fonts,media:()=>{throw Error('Unexpected private photo');}}),reopen(){w.close();w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});}};
}
test('added text/motifs cannot override fixed fields, permissions, limits, resources or geometry; historical policies stay pinned',async t=>{
 const f=await fixture(t),resolve=(state,document=f.record.document)=>resolveFormCustomer(document,'original',state,f.options()),before=structuredClone(f.record.document);
 assert.match(formMotif('rainbow').svgFragment,/fill="none" stroke="currentColor" stroke-width="2.2"/);
 const resolved=resolve(f.state);assert.equal(resolved.document.designs[0].fields.length,3);assert.equal(resolved.addedFields[1].type,'motif');assert.deepEqual(f.record.document,before);
 for(const mutate of [s=>s.additions[0].allowDelete=false,s=>s.additions[0].id='fixed',s=>s.additions.push(s.additions[0]),s=>s.additions[0].sizeMm=3.5,s=>s.additions[0].xMm=-1,s=>s.additions[1].motifSha256='0'.repeat(64),s=>s.additions[1].motifKey='<script>',s=>s.additions[1].rotation=361,s=>s.fields[0].deleted=true,s=>s.fields[0].xMm=19,s=>s.price=1]){const s=structuredClone(f.state);mutate(s);assert.throws(()=>resolve(s));}
 const locked=structuredClone(before);locked.designs[0].additions={text:false,motifs:false,maxElements:8};assert.throws(()=>resolve(f.state,locked),/freigegeben/);
 const legacy=structuredClone(before);delete legacy.designs[0].additions;assert.throws(()=>resolve(f.state,legacy),/viele/);assert.doesNotThrow(()=>resolve({fields:f.state.fields},legacy));
 const limit=structuredClone(before);limit.designs[0].additions.maxElements=1;assert.throws(()=>resolve(f.state,limit),/viele/);
 const saved=f.w.customerDrafts.save(f.draft.id,f.draft.token,f.state,1);f.w.repository.save(f.record.id,locked,1);f.reopen();assert.deepEqual(f.w.customerDrafts.get(f.draft.id,f.draft.token).state,f.state);assert.equal(saved.productRevision,1);assert.doesNotThrow(()=>resolve(f.state,f.w.repository.get(f.record.id,{revision:1}).document));
});
test('added elements survive frozen proof and CMYK/PDF white export; order reuse never leaks new private texts by default',async t=>{
 const f=await fixture(t),draft=f.w.customerDrafts.save(f.draft.id,f.draft.token,f.state,1);
 const b=await prepareFormReview({record:f.record,draft,assets:f.w.assets,contours:f.w.contours,fonts:f.seed.universal.localResources.fonts,media:()=>{throw Error('Unexpected media');}});
 const {files}=readReviewPackage(b.package,b.manifest.packageSha256);assert.ok(files.has('motive.json'));assert.match(files.get('gestaltung-vorschau.svg').toString(),/data-field="extra-bbbbbbbb/);assert.ok(JSON.parse(files.get('schriften.json'))[f.state.additions[0].font]);
 const out=await createFormPrintProof(b.package,b.manifest.packageSha256);assert.ok(out.metadata.vectorGlyphs>=2);assert.equal(out.metadata.settings.dpi,300);assert.equal(out.metadata.settings.white,'motif');assert.equal(out.metadata.settings.bleedMm,0);
 const pdf=JSON.parse(execFileSync('python3',['-c',`import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');layers=p.get_ocgs();white=[i for i,v in layers.items() if v['name']=='RDG_WHITE'];p.set_layer(-1,on=white,off=[i for i in layers if i not in white]);q=f.open(stream=p.tobytes(),filetype='pdf');pix=q[0].get_pixmap(matrix=f.Matrix(2,2),alpha=True);k=144/25.4
print(json.dumps({'width':q[0].rect.width*25.4/72,'clear':pix.pixel(round(110*k),round(70*k))[-1],'motif':max(pix.pixel(x,y)[-1] for y in range(round(50*k),round(68*k)) for x in range(round(50*k),round(68*k))),'hole':pix.pixel(round(8*k),round(40*k))[-1]}))`],{input:out.pdf,env:importEnvironment()}));assert.ok(Math.abs(pdf.width-120)<.001);assert.equal(pdf.clear,0);assert.equal(pdf.hole,0);assert.ok(pdf.motif>200);
 const line={id:'synthetic',snapshotId:b.manifest.id,sourcePackageSha256:b.manifest.packageSha256,product:{id:f.record.id,revision:f.record.revision}},args={line,archive:b.package,assets:f.w.assets,contours:f.w.contours,fonts:f.seed.universal.localResources.fonts};
 const plan=planOrderProductDraft({...args,input:{name:'Neue Vorlage',textMode:'template'}}),fields=plan.document.designs[0].fields;assert.equal(fields.length,3);assert.equal(fields[1].text,'Dein Text');assert.equal(fields[2].motifKey,'heart');assert.equal(plan.removedFields,0);assert.equal(planOrderProductDraft({...args,input:{name:'Neue Vorlage',textMode:'customer'}}).document.designs[0].fields[1].text,'AB');assert.doesNotThrow(()=>f.w.repository.create(plan.document));
});
test('HTTP preview/save rejects forged additions and CSRF; original product stays unchanged',async t=>{
 const f=await fixture(t),server=createPreviewServer({workshop:f.w,outputDirectory:f.dir});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,csrf=(await(await fetch(base+'/api/workshop/session')).json()).csrfToken;
 const request=(state,token=csrf,method='POST',suffix='/preview')=>fetch(base+'/api/workshop/customer-drafts/'+f.draft.id+suffix,{method,headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token,'X-Gravuru-Draft':f.draft.token},body:JSON.stringify({state,expectedRevision:1})});
 assert.equal((await request(f.state,'bad')).status,403);const viewed=await request(f.state);assert.equal(viewed.status,200);const body=await viewed.json();assert.equal(body.product.sourceFields.filter(s=>s.customerAdded).length,2);assert.match(body.artworkSvg,/data:image\/svg\+xml;base64/);assert.ok(body.contourPath.includes('Z'));
 const bad=structuredClone(f.state);bad.additions[0].allowMove=true;assert.equal((await request(bad)).status,422);assert.equal((await request(f.state,csrf,'PATCH','')).status,200);assert.equal((await request(f.state,csrf,'PATCH','')).status,409);assert.deepEqual(f.w.repository.get(f.record.id),f.record);
});
