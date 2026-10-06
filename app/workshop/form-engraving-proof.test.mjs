import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {once} from 'node:events';
import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {createPreviewServer} from '../configurator/variant-m/server.mjs';import {makeFormProduct} from './form-product.mjs';import {addFormDesign} from './form-designs.mjs';import {initialFormCustomerState} from './form-customer-model.mjs';import {prepareFormReview} from './form-review-snapshot.mjs';import {prepareCustomerPhoto} from './customer-photo.mjs';import {importEnvironment} from './design-assets.mjs';import {createFormEngravingProof,formEngravingSettings} from './form-engraving-proof.mjs';import {readReviewPackage,digest} from './review-package.mjs';
async function fixture(t,photo=false,rasterSource=false,customize=()=>{}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-engrave-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],w=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const contour=await w.contours.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><path d="M0 0H60V30H40V40H0Z"/><circle cx="8" cy="20" r="2"/></svg>').toString('base64')});
 const embedded=rasterSource?execFileSync('python3',['-c',"from PIL import Image;import sys;Image.new('RGB',(10,10),'black').save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64'):null;
 const asset=await w.assets.import({name:'Design.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect x="3" y="3" width="14" height="20" fill="red"/><rect x="35" y="3" width="10" height="15" fill="blue"/>'+(embedded?'<image href="data:image/png;base64,'+embedded+'" x="20" y="25" width="8" height="8"/>':'')+'</svg>').toString('base64')});
 const d=addFormDesign(makeFormProduct(contour,'Gravurprüfung'),asset,{name:'Prüfdesign',designId:'design-engrave'});d.processingMethod='engraving';d.material={id:'steel',thicknessMm:1.5,surfaceNotes:''};d.basePriceCents=2999;d.designs[0].sourcePrepared=true;d.designs[0].fields=[{id:'text',type:'text',label:'Name',xMm:5,yMm:29,widthMm:30,heightMm:8,text:'Oa',font:Object.keys(seed.universal.localResources.fonts)[0],sizeMm:4,color:'#222222',bold:false,italic:false,allowMove:false,allowScale:false,allowDelete:false,allowColor:false},{id:'photo',type:'photo',label:'Foto',xMm:22,yMm:10,widthMm:10,heightMm:10,shape:'circle',required:false,allowMove:true,allowScale:true,allowDelete:true}];
 customize(d);const record=w.repository.create(d),created=w.customerDrafts.create(record,d.defaultDesignId,initialFormCustomerState(d.designs[0]));let draft=created;
 if(photo){const raw=execFileSync('python3',['-c',"from PIL import Image;import sys;im=Image.new('RGBA',(1200,1200),(0,0,0,255));im.paste((255,255,255,255),(600,0,1200,1200));im.save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()});const prepared=await prepareCustomerPhoto(raw.toString('base64')),media=w.customerDrafts.addPhoto(created.id,created.token,prepared),state=structuredClone(created.state);state.fields.find(f=>f.id==='photo').mediaId=media.mediaId;draft=w.customerDrafts.save(created.id,created.token,state,1);}
 const bundle=await prepareFormReview({record,draft,assets:w.assets,contours:w.contours,fonts:seed.universal.localResources.fonts,media:id=>w.customerDrafts.photo(created.id,created.token,id)});w.customerDrafts.capture(created.id,created.token,draft.revision,bundle);return {w,dir,bundle};
}
function inspect(pdf,points=[]){return JSON.parse(execFileSync('python3',['-c',`import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];pix=page.get_pixmap(matrix=f.Matrix(3,3));k=216/25.4;objs='\\n'.join(p.xref_object(i) for i in range(1,p.xref_length()))
print(json.dumps({'width':page.rect.width*25.4/72,'height':page.rect.height*25.4/72,'images':[(v[2],v[3],v[5]) for v in page.get_images()],'fonts':page.get_fonts(),'drawings':len(page.get_drawings()),'white':'RDG_WHITE' in objs,'cut':'CutContour' in objs,'points':[list(pix.pixel(round(x*k),round(y*k))) for x,y in ${JSON.stringify(points)}]}))`],{input:pdf,env:importEnvironment()}).toString());}
test('engraving raster uses original photos, grayscale, holes and single mirror without print white or cutting paths',async t=>{
 const {bundle}=await fixture(t,true),a=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256),m=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,{mirror:true});const points=[[2,2],[8,20],[6,6],[40,8],[24,15],[30,15],[50,35]],x=inspect(a.pdf,points),y=inspect(m.pdf,points.map(([x,y])=>[60-x,y]));
 assert.equal(a.metadata.settings.dpi,300);assert.equal(x.white,false);assert.equal(x.cut,false);assert.equal(x.images[0][2],'DeviceGray');assert.ok(Math.abs(x.width-60)<.001);assert.ok(Math.abs(x.height-40)<.001);assert.equal(x.drawings,0);for(const point of x.points)assert.equal(new Set(point).size,1);for(const i of [0,1,6])assert.deepEqual(x.points[i],[255,255,255]);assert.deepEqual(x.points,y.points);assert.deepEqual(x.points[4],[0,0,0]);assert.deepEqual(x.points[5],[255,255,255]);
 const zipped=readReviewPackage(m.archive,digest(m.archive));assert.ok(zipped.files.has('gravur-kontur-1zu1.pdf'));assert.equal(inspect(zipped.files.get('gravur-kontur-1zu1.pdf')).images.length,0);assert.ok(inspect(zipped.files.get('gravur-kontur-1zu1.pdf')).drawings>0);assert.ok(zipped.files.get('fotos/photo-original.png').equals(readReviewPackage(bundle.package,bundle.manifest.packageSha256).files.get('fotos/photo-original.png')));
 await assert.rejects(()=>createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'}),/Fotos benötigen Rastergravur/);
 for(const v of [{dpi:72},{mode:'laser'},{mirror:'yes'},{white:'full'}])assert.throws(()=>formEngravingSettings(v));
});
test('engraving vector preserves real source and text paths without images/fonts, grayscale and exact size',async t=>{
 const {bundle}=await fixture(t),result=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'}),d=inspect(result.pdf,[[6,6],[40,8],[8,20]]);assert.equal(d.images.length,0);assert.equal(d.fonts.length,0);assert.ok(d.drawings>=4);assert.equal(d.white,false);assert.equal(d.cut,false);assert.ok(Math.abs(d.width-60)<.001);for(const v of d.points)assert.ok(Math.max(...v)-Math.min(...v)<=1);assert.deepEqual(d.points[2],[255,255,255]);assert.equal(result.metadata.pixelWidth,null);await assert.rejects(()=>createFormEngravingProof(bundle.package,'0'.repeat(64)),/Paketprüfung/);
});
test('engraving uses persistent jobs, method-specific validation and byte-identical backend downloads',async t=>{
 const {w,dir,bundle}=await fixture(t),server=createPreviewServer({workshop:w,outputDirectory:dir});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,token=(await (await fetch(base+'/api/workshop/session')).json()).csrfToken,headers={'Content-Type':'application/json','X-Gravuru-CSRF':token};
 const submit=settings=>fetch(base+'/api/workshop/export-jobs',{method:'POST',headers,body:JSON.stringify({snapshotId:bundle.manifest.id,settings})});assert.equal((await submit({white:'motif'})).status,422);const job=await (await submit({mode:'vector'})).json();assert.match(job.recipe,/engraving/);await w.exportWorker.wait(job.id);const response=await fetch(base+'/api/workshop/export-jobs/'+job.id+'/download',{method:'POST',headers,body:JSON.stringify({format:'pdf'})});assert.equal(response.status,200);const pdf=Buffer.from(await response.arrayBuffer());assert.equal(inspect(pdf).images.length,0);assert.equal((await (await submit({mode:'vector'})).json()).id,job.id);assert.deepEqual(w.customerDrafts.printProof(job.snapshotId,job.recipeKey).pdf,pdf);
 const print=await fetch(base+'/api/workshop/review-snapshots/'+job.snapshotId+'/print',{method:'POST',headers,body:'{}'});assert.equal(print.status,422);
});

test('embedded raster design is refused as vector and remains usable as raster engraving',async t=>{
 const {bundle}=await fixture(t,false,true);await assert.rejects(()=>createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'}),/Rasterbilder|gerasterte Effekte/);const result=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256);assert.equal(result.metadata.settings.mode,'raster');assert.equal(inspect(result.pdf).images[0][2],'DeviceGray');
});

test('acrylic engraving appearance stays out of raster and vector output and preserves original photos',async t=>{
 const steel=await fixture(t,true),acrylic=await fixture(t,true,false,d=>{d.material={id:'acrylic-black',thicknessMm:3,surfaceNotes:''};});
 const files=readReviewPackage(acrylic.bundle.package,acrylic.bundle.manifest.packageSha256).files;
 assert.match(files.get('vorschau.svg').toString(),/data-preview-engraving="acrylic"/);assert.match(files.get('vorschau.svg').toString(),/material-acrylic-engraving/);
 assert.doesNotMatch(files.get('gestaltung-vorschau.svg').toString(),/material-acrylic-engraving|data-preview-engraving/);
 const samples=[[2,2],[8,20],[6,6],[40,8],[24,15],[30,15],[50,35]],results=[];
 for(const {bundle}of [steel,acrylic])results.push(inspect((await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256)).pdf,samples));
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1].points[4],[0,0,0]);assert.deepEqual(results[1].points[5],[255,255,255]);assert.equal(results[1].white,false);
 const vector=await fixture(t,false,false,d=>{d.material.id='acrylic-satin';});const proof=await createFormEngravingProof(vector.bundle.package,vector.bundle.manifest.packageSha256,{mode:'vector'}),v=inspect(proof.pdf,samples);
 assert.equal(v.images.length,0);assert.equal(v.white,false);assert.ok(v.drawings>=4);
});

test('wood and leather preview tones do not alter photo originals or actual grayscale engraving pixels',async t=>{
 let expected;
 for(const id of ['steel','oak','beech','cherry','leather-brown']){
  const {bundle}=await fixture(t,true,false,d=>{d.material.id=id;});const files=readReviewPackage(bundle.package,bundle.manifest.packageSha256).files;
  assert.match(files.get('vorschau.svg').toString(),/material-dark-engraving/);assert.doesNotMatch(files.get('gestaltung-vorschau.svg').toString(),/material-dark-engraving|data-preview-engraving/);
  const proof=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256),result=inspect(proof.pdf,[[2,2],[8,20],[6,6],[40,8],[24,15],[30,15]]);
  if(expected)assert.deepEqual(result,expected);else expected=result;
  assert.equal(result.white,false);assert.deepEqual(result.points[0],[255,255,255]);assert.deepEqual(result.points[1],[255,255,255]);
 }
});
