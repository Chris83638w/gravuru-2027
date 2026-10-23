import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {makeFormProduct} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';
import {sha256,importEnvironment} from './design-assets.mjs';

test('review snapshots retain private originals and exact downloads across edits, retries, source removal and SQLite reopen',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-review-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],filename=path.join(dir,'workshop.sqlite');
 let w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});
 const contourOriginal=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80" rx="4"/><circle cx="8" cy="40" r="2"/><circle cx="112" cy="40" r="2"/></svg>');
 const c=await w.contours.import({name:'Form.svg',bytes:contourOriginal.toString('base64')});
 const designOriginal=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><path d="M15 10H105" stroke="#222222"/></svg>');
 const a=await w.assets.import({name:'Design.svg',bytes:designOriginal.toString('base64')});
 const d=addFormDesign(makeFormProduct(c,'Unveränderliches Prüfschild'),a,{name:'Prüfdesign',designId:'design-proof'});d.material={id:'steel',thicknessMm:1.5,surfaceNotes:'Synthetischer Test'};d.processingMethod='print';d.basePriceCents=2999;d.designs[0].sourcePrepared=true;d.designs[0].fields=[{id:'name',label:'Name',type:'text',xMm:15,yMm:20,widthMm:90,heightMm:15,text:'Familie Sommer',font:Object.keys(seed.universal.localResources.fonts)[0],sizeMm:5,color:'#222222',bold:false,italic:false,allowMove:false,allowScale:false,allowDelete:false,allowColor:false},{id:'photo',label:'Foto',type:'photo',xMm:40,yMm:45,widthMm:40,heightMm:22,shape:'rect',required:true,allowMove:true,allowScale:true,allowDelete:false}];
 d.designs[0].fields.push({id:'hidden-photo',label:'Später wieder einblenden',type:'photo',xMm:15,yMm:48,widthMm:20,heightMm:20,shape:'rect',required:false,allowMove:true,allowScale:true,allowDelete:true});
 const product=w.repository.create(d),server=createPreviewServer({outputDirectory:dir,workshop:w});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const csrf=(await (await fetch(base+'/api/workshop/session')).json()).csrfToken;
 const request=async(route,data,{token,method='POST',csrfValue=csrf,headers={}}={})=>fetch(base+route,{method:data?method:'GET',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfValue,...(token?{'X-Gravuru-Draft':token}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
 const created=await (await request('/api/workshop/customer-drafts',{productId:product.id,productRevision:1})).json(),token=created.token,url='/api/workshop/customer-drafts/'+created.draft.id;let state=structuredClone(created.draft.state);
 assert.equal((await request(url+'/review',{expectedRevision:1})).status,404);
 assert.equal((await request(url+'/review',{expectedRevision:1},{token,csrfValue:'bad'})).status,403);
 assert.equal((await request(url+'/review',{expectedRevision:1},{token})).status,422); // Required photo missing.
 const original=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;im=Image.new('RGB',(600,400),'#cc5522');im.save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()});
 const upload=await (await request(url+'/photos',{expectedRevision:1,fieldId:'photo',bytes:original.toString('base64')},{token})).json();state.fields[1].mediaId=upload.mediaId;state.fields[1].tone='grayscale';state.fields[1].crop={zoom:1.4,x:.25,y:0,angle:90};
 const hiddenUpload=await (await request(url+'/photos',{expectedRevision:1,fieldId:'hidden-photo',bytes:original.toString('base64')},{token})).json();state.fields[2].mediaId=hiddenUpload.mediaId;state.fields[2].deleted=true;
 assert.equal((await request(url,{expectedRevision:1,state},{token,method:'PATCH'})).status,200);
 assert.equal((await request(url+'/review',{expectedRevision:2,state},{token})).status,422); // No unvalidated client replacement.
 const frozen=await request(url+'/review',{expectedRevision:2},{token});assert.equal(frozen.status,201);const proof=await frozen.json(),reviewUrl='/api/workshop/review-snapshots/'+proof.id;
 const again=await request(url+'/review',{expectedRevision:2},{token});assert.equal(again.status,200);assert.equal((await again.json()).id,proof.id);
 const detail=await (await request(reviewUrl)).json(),m=detail.manifest;assert.equal(m.productionReady,false);assert.equal(m.order,null);assert.equal(m.payment,null);assert.equal(m.product.basePriceCents,2999);assert.equal(m.photos[0].sha256,sha256(original));assert.ok(m.blockers.length>=2);assert.match(detail.preview,/feColorMatrix/);assert.match(detail.preview,/data:image\/png;base64,/);assert.doesNotMatch(JSON.stringify(detail),new RegExp(token));
 assert.equal((await request(reviewUrl+'/download',{kind:'production'},{token})).status,422);
 assert.equal((await request(reviewUrl+'/download',{kind:'package'},{csrfValue:'bad'})).status,403);
 assert.equal((await request(reviewUrl+'/download')).status,405);
 assert.equal((await request(reviewUrl,{}, {method:'PATCH'})).status,405);
 for(const headers of [{Origin:'https://example.com'},{Host:'example.com'},{'Sec-Fetch-Site':'cross-site'}]){const status=await new Promise((resolve,reject)=>{const req=http.get(base+reviewUrl,{headers},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);});assert.equal(status,403);}
 const download=async kind=>{const r=await request(reviewUrl+'/download',{kind});assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer());};
 const archive=await download('package'),pdf=await download('contour'),photos=await download('photos');assert.equal(sha256(archive),m.packageSha256);
 const hidden=m.photos.find(p=>p.fieldId==='hidden-photo');assert.equal(hidden.hidden,true);assert.equal(hidden.mediaId,hiddenUpload.mediaId);assert.equal(hidden.sha256,sha256(original));assert.doesNotMatch(detail.preview,/data-field-id="hidden-photo"/);
 const archiveCheck=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"import sys,io,zipfile,json,hashlib,pymupdf as f;z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()));m=json.loads(z.read('manifest.json'));assert all(hashlib.sha256(z.read(x['path'])).hexdigest()==x['sha256'] and len(z.read(x['path']))==x['bytes'] for x in m['files']);p=f.open(stream=z.read('kontur-1zu1.pdf'),filetype='pdf')[0];print(json.dumps({'files':z.namelist(),'paths':len(p.get_drawings()),'images':len(p.get_image_info()),'w':p.rect.width*25.4/72,'h':p.rect.height*25.4/72,'photo':hashlib.sha256(z.read('fotos/photo-original.png')).hexdigest(),'design':hashlib.sha256(z.read('quellen/design-original.svg')).hexdigest(),'contour':hashlib.sha256(z.read('quellen/kontur-original.svg')).hexdigest(),'fonts':list(json.loads(z.read('schriften.json')))}))"],{input:archive,maxBuffer:1024*1024,env:importEnvironment()}).toString());
 assert.equal(archiveCheck.paths,3);assert.equal(archiveCheck.images,0);assert.ok(Math.abs(archiveCheck.w-120)<.001);assert.ok(Math.abs(archiveCheck.h-80)<.001);assert.equal(archiveCheck.photo,sha256(original));assert.equal(archiveCheck.design,sha256(designOriginal));assert.equal(archiveCheck.contour,sha256(contourOriginal));assert.deepEqual(archiveCheck.fonts,[d.designs[0].fields[0].font]);
 assert.ok(pdf.subarray(0,5).equals(Buffer.from('%PDF-')));assert.ok(photos.length>original.length);
 state.fields[0].text='Familie Winter';assert.equal((await request(url,{state,expectedRevision:2},{token,method:'PATCH'})).status,200);
 const nextProduct=structuredClone(d);nextProduct.name='Neuer Produktstand';nextProduct.basePriceCents=4999;w.repository.save(product.id,nextProduct,1);
 assert.equal((await request(url+'/review',{expectedRevision:2},{token})).status,409);assert.throws(()=>w.customerDrafts.capture(created.draft.id,token,2,{manifest:m}),e=>e.status===409); // Recheck inside the write transaction after asynchronous preparation.
 assert.deepEqual(await download('package'),archive);assert.deepEqual(await download('contour'),pdf);assert.deepEqual(await (await request(reviewUrl)).json(),detail);
 const second=await (await request(url+'/review',{expectedRevision:3},{token})).json();assert.notEqual(second.id,proof.id);assert.equal(second.product.basePriceCents,2999);assert.equal((await (await request('/api/workshop/review-snapshots')).json()).snapshots.length,2);
 const db=new DatabaseSync(filename);assert.throws(()=>db.prepare('UPDATE form_review_snapshots SET manifest=? WHERE id=?').run('{}',proof.id),/immutable/);assert.throws(()=>db.prepare('DELETE FROM form_review_snapshots WHERE id=?').run(proof.id),/retention/);db.close();
 w.close();fs.renameSync(path.join(dir,'design-assets.sqlite'),path.join(dir,'original-assets.sqlite'));w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});assert.equal(w.assets.list().length,0);assert.deepEqual(w.customerDrafts.downloadSnapshot(proof.id,'package'),archive);assert.deepEqual(w.customerDrafts.downloadSnapshot(proof.id,'contour'),pdf);assert.deepEqual(w.customerDrafts.review(proof.id),{manifest:m,preview:detail.preview});
});
