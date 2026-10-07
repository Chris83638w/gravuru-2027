import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';
import {importEnvironment} from './design-assets.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {ACRYLIC_REVIEW} from './acrylic-review.mjs';
const run=promisify(execFile);

async function fixture(t,full){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-complete-print-'));
  build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
  const options={filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy};
  let workshop=createWorkshop(options),csrf;
  let server=createPreviewServer({outputDirectory:dir,workshop});server.address=()=>({port:8765});
  t.after(()=>{workshop.close();fs.rmSync(dir,{recursive:true,force:true});});
  async function request(url,{data,method=data===undefined?'GET':'POST',headers={}}={}){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('HTTP-Prüfung überschritt 135 Sekunden: '+url)),135000);
      const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);Object.assign(req,{url,method,headers:{host:'127.0.0.1:8765',origin:'http://127.0.0.1:8765','content-type':'application/json','x-gravuru-csrf':csrf,...headers}});
      const res=new EventEmitter();res.headersSent=false;res.headers={};res.setHeader=(k,v)=>res.headers[k.toLowerCase()]=v;
      res.writeHead=(status,headers={})=>{res.status=status;for(const [k,v]of Object.entries(headers))res.setHeader(k,v);res.headersSent=true;return res;};
      res.end=bytes=>{clearTimeout(timer);res.bytes=Buffer.from(bytes||'');resolve(res);};server.emit('request',req,res);
    });
  }
  async function json(url,options,status=200){const response=await request(url,options);assert.equal(response.status,status,response.bytes.toString().slice(0,500));return JSON.parse(response.bytes);}
  csrf=(await json('/api/workshop/session')).csrfToken;
  await run('python3',['-c',`import sys,pymupdf as f
from PIL import Image
from pathlib import Path
d=Path(sys.argv[1]);k=72/25.4;p=f.open();page=p.new_page(width=80*k,height=60*k)
page.draw_rect(f.Rect(0,0,80*k,60*k) if sys.argv[2]=='full' else f.Rect(5*k,5*k,15*k,12*k),color=None,fill=(0.9,0.1,0.05))
p.save(d/'source.pdf')
im=Image.new('RGB',(900,900),'#ff8800');im.paste('#0055cc',(450,0,900,900));im.save(d/'photo.png')`,dir,full?'full':'partial'],{env:importEnvironment(),timeout:20000});
  const source=fs.readFileSync(path.join(dir,'source.pdf')),photo=fs.readFileSync(path.join(dir,'photo.png'));
  const contour=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="60mm" viewBox="0 0 80 60"><path d="M0 0H80V45H65V60H0Z"/><circle cx="8" cy="30" r="2"/></svg>');
  return {dir,source,photo,contour,json,request,font:Object.keys(seed.universal.localResources.fonts)[0],get workshop(){return workshop;},async reopen(){workshop.close();workshop=createWorkshop(options);server=createPreviewServer({outputDirectory:dir,workshop});server.address=()=>({port:8765});csrf=(await json('/api/workshop/session')).csrfToken;}};
}

async function inspect(file){
  const {stdout}=await run('python3',['-c',`import sys,json,pymupdf as f
p=f.open(sys.argv[1]);page=p[0];layers=p.get_ocgs();drawings=page.get_drawings();objects=chr(10).join(p.xref_object(i) for i in range(1,p.xref_length()))
def paths(layer):return [repr(d['items']) for d in drawings if d.get('layer')==layer]
color=page.get_pixmap(matrix=f.Matrix(2,2),alpha=True);cmyk=page.get_pixmap(matrix=f.Matrix(2,2),colorspace=f.csCMYK,alpha=True)
white=[i for i,v in layers.items() if v['name']=='RDG_WHITE']
p.set_layer(-1,on=white,off=[i for i in layers if i not in white]);q=f.open(stream=p.tobytes(),filetype='pdf');pix=q[0].get_pixmap(matrix=f.Matrix(2,2),alpha=True);k=72/25.4
points=[[2,2],[10,8],[8,30],[35,15],[60,8],[75,55]] if page.rect.width/k<81 else [[0.5,20],[60,20],[73,31],[46,16],[3,55],[8,31]]
print(json.dumps({'repaired':p.is_repaired,'widthMm':page.rect.width/k,'heightMm':page.rect.height/k,'layers':[v['name'] for v in layers.values()],'whiteSpot':'/Separation /RDG_WHITE' in objects,'cutSpot':'/Separation /CutContour' in objects,'images':[i[5] for i in page.get_images()],'fonts':len(page.get_fonts()),'cutPaths':paths('CutContour'),'whitePaths':len(paths('RDG_WHITE')),'textPaths':sum(d.get('layer')=='Farbmotiv' for d in drawings),'samplePointsMm':points,'cmykSamples':[list(cmyk.pixel(round(x*k*2),round(y*k*2))) for x,y in points],'colorSamples':[list(color.pixel(round(x*k*2),round(y*k*2))) for x,y in points],'whiteAlpha':[pix.pixel(round(x*k*2),round(y*k*2))[-1] for x,y in points]}))`,file],{env:importEnvironment(),timeout:20000,maxBuffer:2*1024*1024});return JSON.parse(stdout);
}

for(const full of [false,true])test(`dashboard PDF-to-print flow: ${full?'edge-to-edge color with mirrored bleed':'transparent design with customer text and photo'}`,{timeout:180000},async t=>{
  const f=await fixture(t,full),{json,request}=f;
  const contour=await json('/api/workshop/contours',{data:{name:'Testkontur.svg',bytes:f.contour.toString('base64')}},201);
  const initial=await json('/api/workshop/form-products',{data:{name:'Synthetischer Durchlauf',contourId:contour.id}},201),url='/api/workshop/products/'+initial.id;
  const imported=await json(url+'/form-design-import',{data:{expectedRevision:1,document:initial.document,name:'Design.pdf',bytes:f.source.toString('base64'),designName:'PDF-Testdesign'}});
  const document=imported.document;document.processingMethod='print';document.material={id:'steel',thicknessMm:1.5,surfaceNotes:'Synthetische Prüfdaten'};document.basePriceCents=2999;
  const design=document.designs[0];design.sourcePrepared=true;design.fields=[{id:'title',type:'text',label:'Name',xMm:15,yMm:42,widthMm:45,heightMm:10,text:'BEISPIEL',font:f.font,sizeMm:4,color:'#222222',bold:false,italic:false,allowMove:false,allowScale:false,allowDelete:false,allowColor:false},{id:'photo',type:'photo',label:'Foto',xMm:30,yMm:10,widthMm:20,heightMm:20,shape:'rect',required:true,allowMove:true,allowScale:true,allowDelete:false}];
  const product=await json(url,{method:'PATCH',data:{expectedRevision:1,document}});
  assert.equal(product.revision,2);assert.equal((await request(url,{method:'PATCH',data:{expectedRevision:1,document}})).status,409);
  const created=await json('/api/workshop/customer-drafts',{data:{productId:product.id,productRevision:2}},201),draftUrl='/api/workshop/customer-drafts/'+created.draft.id,headers={'x-gravuru-draft':created.token};
  assert.equal((await request(draftUrl+'/review',{data:{expectedRevision:1},headers})).status,422);
  const upload=await json(draftUrl+'/photos',{data:{expectedRevision:1,fieldId:'photo',bytes:f.photo.toString('base64')},headers},201);
  const state=structuredClone(created.draft.state);state.fields[0].text='TEST MIKA';state.fields[1].mediaId=upload.mediaId;state.fields[1].tone='grayscale';state.fields[1].crop={zoom:1.2,x:.2,y:0,angle:0};
  const invalid=structuredClone(state);invalid.fields[0].xMm=1;assert.equal((await request(draftUrl,{method:'PATCH',data:{expectedRevision:1,state:invalid},headers})).status,422);
  await json(draftUrl,{method:'PATCH',data:{expectedRevision:1,state},headers});
  assert.equal((await request(draftUrl+'/review',{data:{expectedRevision:2}})).status,404);
  const snapshot=await json(draftUrl+'/review',{data:{expectedRevision:2},headers},201);
  assert.equal((await json(draftUrl+'/review',{data:{expectedRevision:2},headers})).id,snapshot.id);
  const reviewUrl='/api/workshop/review-snapshots/'+snapshot.id,detail=await json(reviewUrl);
  assert.equal(detail.manifest.product.basePriceCents,2999);assert.equal(detail.manifest.productionReady,false);
  const packageResponse=await request(reviewUrl+'/download',{data:{kind:'package'}});assert.equal(packageResponse.status,200);
  const archive=readReviewPackage(packageResponse.bytes,detail.manifest.packageSha256),saved=JSON.parse(archive.files.get('produkt-und-gestaltung.json'));
  assert.equal(saved.customer.fields[0].text,'TEST MIKA');assert.equal(saved.customer.fields[1].tone,'grayscale');
  assert.ok([...archive.files.values()].some(bytes=>bytes.equals(f.source)));assert.ok([...archive.files.values()].some(bytes=>bytes.equals(f.photo)));
  const outputs=[];
  for(const profile of ['roland','mimaki']){
    const settings={profile,bleedMm:1,mirror:full},job=await json('/api/workshop/export-jobs',{data:{snapshotId:snapshot.id,settings}},202);
    await f.workshop.exportWorker.wait(job.id);const done=await json('/api/workshop/export-jobs/'+job.id);assert.equal(done.status,'completed');
    assert.equal((await json('/api/workshop/export-jobs',{data:{snapshotId:snapshot.id,settings}})).id,job.id);
    const result=f.workshop.customerDrafts.printProof(snapshot.id,job.recipeKey);assert.equal(result.metadata.settings.dpi,300);assert.equal(result.metadata.settings.bleedMm,full?1:0);assert.ok(result.metadata.vectorGlyphs>0);
    assert.equal((await request('/api/workshop/export-jobs/'+job.id+'/download',{data:{format:'pdf'},headers:{'x-gravuru-csrf':'bad'}})).status,403);
    for(const format of profile==='mimaki'?['pdf','white-pdf']:['pdf']){
      const response=await request('/api/workshop/export-jobs/'+job.id+'/download',{data:{format}});assert.equal(response.status,200);assert.match(response.headers['content-type'],/application\/pdf/);
      const filename=`${full?'Vollflaeche':'Transparent'}-${profile}-${format}.pdf`,file=path.join(f.dir,filename);fs.writeFileSync(file,response.bytes);const report=await inspect(file);
      assert.equal(report.repaired,false);assert.equal(report.fonts,0);assert.ok(Math.abs(report.widthMm-(full?82:80))<.001);assert.ok(Math.abs(report.heightMm-(full?62:60))<.001);assert.equal(report.cutSpot,true);assert.ok(report.cutPaths.length>0);
      assert.equal(report.whiteSpot,profile==='roland'||format==='white-pdf');
      if(format==='white-pdf'){assert.deepEqual(report.images,[]);assert.ok(report.whitePaths>0);assert.equal(report.textPaths,0);}else{assert.ok(report.images.includes('DeviceCMYK'));assert.ok(report.textPaths>0);}
      if(!full&&report.whiteSpot){for(const index of [0,2,4,5])assert.equal(report.whiteAlpha[index],0);for(const index of [1,3])assert.equal(report.whiteAlpha[index],255);}
      if(full&&report.whiteSpot){for(const index of [0,2,4])assert.equal(report.whiteAlpha[index],0);for(const index of [1,3,5])assert.equal(report.whiteAlpha[index],255);}
      if(format==='pdf'){
        const gray=report.cmykSamples[3];assert.equal(gray[4],255);assert.ok(gray.slice(0,3).every(channel=>channel<=1)&&gray[3]>0,'Graustufenfoto verwendet nur die K-Separation: '+JSON.stringify(gray));
        if(full){assert.equal(report.colorSamples[0][3],255,'Farbüberdruck reicht über Außenkontur');assert.equal(report.colorSamples[2][3],0,'Loch wird genau einmal gespiegelt');assert.equal(report.colorSamples[4][3],0,'Ausschnitt bleibt frei');}
      }
      outputs.push({filename,format,jobId:job.id,bytes:response.bytes,report});
    }
  }
  const mimaki=outputs.filter(o=>o.filename.includes('mimaki'));assert.deepEqual(mimaki[0].report.cutPaths,mimaki[1].report.cutPaths);
  const next=structuredClone(document);next.name='Später geändert';next.basePriceCents=4999;await json(url,{method:'PATCH',data:{expectedRevision:2,document:next}});
  state.fields[0].text='SPÄTER';await json(draftUrl,{method:'PATCH',data:{expectedRevision:2,state},headers});
  f.workshop.exportWorker.close();
  const pendingInput={snapshotId:snapshot.id,settings:{profile:'mimaki',white:'none'}},pending=await json('/api/workshop/export-jobs',{data:pendingInput},202);assert.equal(pending.status,'queued');
  await f.reopen();assert.deepEqual((await request(reviewUrl+'/download',{data:{kind:'package'}})).bytes,packageResponse.bytes);
  for(const output of outputs)assert.deepEqual((await request('/api/workshop/export-jobs/'+output.jobId+'/download',{data:{format:output.format}})).bytes,output.bytes);
  await f.workshop.exportWorker.wait(pending.id);const resumed=await json('/api/workshop/export-jobs/'+pending.id);assert.equal(resumed.status,'completed');assert.equal(resumed.attempts,1);assert.ok(!resumed.downloadFormats.includes('white-pdf'));
  assert.equal((await json('/api/workshop/export-jobs',{data:pendingInput})).id,pending.id);
  assert.equal((await request('/api/workshop/export-jobs/'+pending.id+'/download',{data:{format:'white-pdf'}})).status,422);
  assert.equal(f.workshop.customerDrafts.printProof(snapshot.id,pending.recipeKey).metadata.sourcePackageSha256,detail.manifest.packageSha256);
  // Optional artifacts contain generated test graphics only, never source customer data or draft tokens.
  if(process.env.GRAVURU_FLOW_OUTPUT_DIR){const out=path.resolve(process.env.GRAVURU_FLOW_OUTPUT_DIR);fs.mkdirSync(out,{recursive:true});for(const output of outputs){fs.writeFileSync(path.join(out,output.filename),output.bytes);fs.writeFileSync(path.join(out,output.filename+'.json'),JSON.stringify({synthetic:true,sha256:digest(output.bytes),...output.report},null,2));}}
});

test('existing acrylic configurator keeps selected base, wall option, customer media and vector white through the same export queue',{timeout:180000},async t=>{
  const f=await fixture(t,false),{json,request}=f;
  let record=await json('/api/workshop/products/'+f.workshop.defaultId+'/copy',{data:{expectedRevision:1,name:'Synthetischer Acryl-Durchlauf',kind:'product'}},201);
  const production=await json('/api/workshop/production-profiles',{data:{document:{name:'Synthetisches Druckprofil',method:'print',materialId:'acrylic-clear',thicknessMm:3,machine:'',rip:'',notes:'Nur technischer Test',archived:false,output:{profile:'roland',dpi:300,white:'motif',bleedMm:0,whiteBleedMm:0,mirror:false}}}},201);
  record=await json('/api/workshop/products/'+record.id,{method:'PATCH',data:{expectedRevision:record.revision,document:{...record.document,productionProfile:{id:production.id,revision:production.revision}}}});
  const config=f.workshop.model(record.id,record.revision).universal,source=config.profile.designs[0],png=f.photo.toString('base64');
  const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:structuredClone(source.objects),options:{size:'small',base:'eiche',wall:'wall'},quantity:2,media:[{id:'synthetic-photo',original:png,edited:png}],preview:png};
  Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo',uxPhotoCrop:{zoom:1.2,x:.1,y:0,angle:0}});
  const text=input.objects.find(o=>o.type==='text'&&!o.acrylicFixed);assert.ok(text);text.text='TEST MIKA';
  const locked=structuredClone(input);locked.objects.find(o=>o.acrylicFixed).x+=1;
  assert.equal((await request('/api/workshop/acrylic-reviews',{data:locked})).status,422);
  const snapshot=await json('/api/workshop/acrylic-reviews',{data:input},201),detail=await json('/api/workshop/review-snapshots/'+snapshot.id);
  assert.equal(detail.manifest.schema,ACRYLIC_REVIEW);assert.equal(detail.manifest.selection.price.unitCents,3097);assert.equal(detail.manifest.selection.price.totalCents,6194);assert.equal(detail.manifest.selection.geometry.insertionMm,7);
  assert.equal((await json('/api/workshop/acrylic-reviews',{data:input})).id,snapshot.id);
  const original=await request('/api/workshop/review-snapshots/'+snapshot.id+'/download',{data:{kind:'package'}}),archive=readReviewPackage(original.bytes,detail.manifest.packageSha256,ACRYLIC_REVIEW);assert.deepEqual(archive.files.get('fotos/1-original.png'),f.photo);
  assert.deepEqual(detail.manifest.productionProfile,production);
  assert.deepEqual(JSON.parse(archive.files.get('fertigungsprofil.json')),production);
  await json('/api/workshop/production-profiles/'+production.id,{method:'PATCH',data:{expectedRevision:1,document:{...production.document,archived:true,output:{...production.document.output,dpi:600,white:'none',mirror:true}}}});
  assert.equal((await json('/api/workshop/production-profiles/'+production.id)).revision,2);
  const outputs=[];
  for(const profile of ['roland','mimaki']){
    const job=await json('/api/workshop/export-jobs',{data:{snapshotId:snapshot.id,settings:{profile}}},202);await f.workshop.exportWorker.wait(job.id);
    const result=f.workshop.customerDrafts.printProof(snapshot.id,job.recipeKey);assert.equal(result.metadata.settings.dpi,300);assert.equal(result.metadata.settings.bleedMm,0);assert.equal(result.metadata.settings.white,'motif');assert.ok(result.metadata.vectorGlyphs>0);
    for(const format of profile==='mimaki'?['pdf','white-pdf']:['pdf']){
      const response=await request('/api/workshop/export-jobs/'+job.id+'/download',{data:{format}});assert.equal(response.status,200);
      const filename=`Acryl-Test-${profile}-${format}.pdf`,file=path.join(f.dir,filename);fs.writeFileSync(file,response.bytes);const report=await inspect(file);
      assert.equal(report.repaired,false);assert.equal(report.fonts,0);assert.ok(Math.abs(report.widthMm-150)<.001);assert.ok(Math.abs(report.heightMm-200)<.001);assert.equal(report.cutSpot,true);assert.equal(report.whiteSpot,profile==='roland'||format==='white-pdf');
      if(format==='white-pdf'){assert.deepEqual(report.images,[]);assert.ok(report.whitePaths>0);}else assert.ok(report.images.includes('DeviceCMYK'));
      outputs.push({filename,format,jobId:job.id,bytes:response.bytes,report});
    }
  }
  const mimaki=outputs.filter(o=>o.filename.includes('mimaki'));assert.deepEqual(mimaki[0].report.cutPaths,mimaki[1].report.cutPaths);
  await json('/api/workshop/products/'+record.id,{method:'PATCH',data:{expectedRevision:record.revision,document:{...record.document,name:'Spätere Acrylfassung'}}});await f.reopen();
  for(const output of outputs)assert.deepEqual((await request('/api/workshop/export-jobs/'+output.jobId+'/download',{data:{format:output.format}})).bytes,output.bytes);
  if(process.env.GRAVURU_FLOW_OUTPUT_DIR){const out=path.resolve(process.env.GRAVURU_FLOW_OUTPUT_DIR);fs.mkdirSync(out,{recursive:true});for(const output of outputs){fs.writeFileSync(path.join(out,output.filename),output.bytes);fs.writeFileSync(path.join(out,output.filename+'.json'),JSON.stringify({synthetic:true,sha256:digest(output.bytes),...output.report},null,2));}}
});
