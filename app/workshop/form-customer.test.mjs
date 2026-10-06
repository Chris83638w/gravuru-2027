import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {makeFormProduct} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {importEnvironment,sha256} from './design-assets.mjs';
const photo=()=>execFileSync('python3',['-c',"from PIL import Image;import sys; im=Image.new('RGB',(120,80),'#cc5522');im.save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()});
test('private photo decoding preserves original bytes, respects EXIF and rejects active or invalid files',async()=>{
 const bytes=execFileSync('python3',['-c',"from PIL import Image;import sys; im=Image.new('RGB',(120,80),'#cc5522');ex=Image.Exif();ex[274]=6;ex[315]='PRIVATE-CAMERA-METADATA';im.save(sys.stdout.buffer,format='JPEG',exif=ex)"],{env:importEnvironment()});
 const p=await prepareCustomerPhoto(bytes.toString('base64'));assert.equal(p.width,80);assert.equal(p.height,120);assert.deepEqual(p.original,bytes);assert.equal(p.preview.subarray(1,4).toString(),'PNG');assert.ok(!p.preview.includes(Buffer.from('eXIf')));assert.ok(!p.preview.includes(Buffer.from('PRIVATE-CAMERA-METADATA')));
 for(const invalid of ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>','not an image'])await assert.rejects(()=>prepareCustomerPhoto(Buffer.from(invalid).toString('base64')),/gültiges/);
});
test('customer drafts enforce field rights and private photos, pin revisions, save conflicts and survive SQLite reopen',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-customer-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],filename=path.join(dir,'workshop.sqlite');
 let w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});
 const contour=await w.contours.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80" rx="4"/><circle cx="8" cy="40" r="2"/><circle cx="112" cy="40" r="2"/></svg>').toString('base64')});
 const asset=await w.assets.import({name:'Design.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><path d="M20 10H100" stroke="#222222"/></svg>').toString('base64')});
 const d=addFormDesign(makeFormProduct(contour,'Kundenprüfung'),asset,{name:'Prüfdesign',designId:'design-test'});d.material.id='steel';d.processingMethod='print';d.basePriceCents=2999;d.designs[0].sourcePrepared=true;
 d.designs[0].fields=[{id:'name',type:'text',label:'Name',xMm:15,yMm:20,widthMm:90,heightMm:15,allowMove:false,allowScale:false,allowDelete:false,text:'Familie Sommer',font:Object.keys(seed.universal.localResources.fonts)[0],sizeMm:5,color:'#222222',bold:false,italic:false,allowColor:false},{id:'photo',type:'photo',label:'Foto',xMm:40,yMm:45,widthMm:40,heightMm:22,allowMove:true,allowScale:true,allowDelete:true,shape:'rect',required:true}];
 const product=w.repository.create(d),server=createPreviewServer({outputDirectory:dir,workshop:w});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const csrf=(await (await fetch(base+'/api/workshop/session')).json()).csrfToken;
 async function req(route,data,token,method='POST'){const r=await fetch(base+route,{method:data?method:'GET',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrf,...(token?{'X-Gravuru-Draft':token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};}
 const created=await req('/api/workshop/customer-drafts',{productId:product.id,productRevision:1});assert.equal(created.status,201);const token=created.data.token,id=created.data.draft.id,url='/api/workshop/customer-drafts/'+id;let state=structuredClone(created.data.draft.state);
 assert.equal(created.data.ready,false);assert.equal(created.data.product.basePriceCents,2999);assert.equal(created.data.product.surfaceNotes,undefined);
 assert.equal((await req(url,null)).status,404);assert.equal((await req(url,null,'a'.repeat(64))).status,404);
 const preview=s=>req(url+'/preview',{state:s,expectedRevision:1},token);
 for(const mutate of [s=>s.fields[0].xMm=16,s=>s.fields[0].sizeMm=6,s=>s.fields[0].widthMm=91,s=>s.fields[0].color='#ffffff',s=>s.fields[0].deleted=true,s=>s.fields[1].deleted=true,s=>s.fields[0].allowMove=true,s=>s.price=1,s=>s.fields.pop(),s=>s.fields[0]=null,s=>s.fields[1].crop.zoom=40,s=>s.fields[1].mediaId='photo_missing']){const forged=structuredClone(state);mutate(forged);assert.equal((await preview(forged)).status,422);}
 state.fields[0].text='Familie Winter';assert.equal((await preview(state)).status,200);
 const original=photo(),upload=await req(url+'/photos',{expectedRevision:1,fieldId:'photo',bytes:original.toString('base64')},token);assert.equal(upload.status,201);assert.equal(upload.data.sourceSha256,sha256(original));
 state.fields[1].mediaId=upload.data.mediaId;state.fields[1].crop={zoom:1.4,x:.4,y:-.2,angle:90};state.fields[1].tone='grayscale';let viewed=await preview(state);assert.equal(viewed.status,200);assert.equal(viewed.data.ready,true);assert.match(viewed.data.svg,/data-photo-pan="photo"/);assert.match(viewed.data.svg,/feColorMatrix type="saturate" values="0"/);
 const other=await req('/api/workshop/customer-drafts',{productId:product.id,productRevision:1}),foreign=structuredClone(other.data.draft.state);foreign.fields[1].mediaId=upload.data.mediaId;assert.equal((await req('/api/workshop/customer-drafts/'+other.data.draft.id+'/preview',{state:foreign,expectedRevision:1},other.data.token)).status,422);
 const overlapping=structuredClone(state);overlapping.fields[1].yMm=20;assert.equal((await preview(overlapping)).data.warnings.length,0); // Print permits overlaps.
 let saved=await req(url,{state,expectedRevision:1},token,'PATCH');assert.equal(saved.status,200);assert.equal(saved.data.draft.revision,2);assert.equal((await req(url,{state,expectedRevision:1},token,'PATCH')).status,409);
 const changed=structuredClone(d);changed.name='Geänderter Produktname';changed.processingMethod='engraving';w.repository.save(product.id,changed,1);assert.equal((await req(url,null,token)).data.product.name,'Kundenprüfung');
 const engrave=await req('/api/workshop/customer-drafts',{productId:product.id,productRevision:2}),engraveState=structuredClone(engrave.data.draft.state);engraveState.fields[1].yMm=20;assert.ok((await req('/api/workshop/customer-drafts/'+engrave.data.draft.id+'/preview',{state:engraveState,expectedRevision:1},engrave.data.token)).data.warnings.some(w=>w.startsWith('Gravur prüfen')));
 assert.deepEqual(w.customerDrafts.photo(id,token,upload.data.mediaId).original,original);assert.equal(w.assets.list().length,1); // Customer photos never enter the design library.
 assert.equal((await fetch(base+'/konfigurator/form/?configuration='+product.id+'&revision=1')).status,200);
 const entry=await fetch(base+'/models.json?configuration='+product.id+'&revision=1');assert.equal(entry.status,200);assert.deepEqual(await entry.json(),[{key:'form',name:'Kundenprüfung',configuration:{id:product.id,revision:1}}]);
 assert.equal((await fetch(base+'/form-editor.html?configuration='+product.id+'&revision=1')).status,200);
 assert.equal((await fetch(base+'/models.json?configuration='+product.id+'&revision=999')).status,404);
 assert.equal((await fetch(base+'/models.json?configuration='+product.id+'&revision=1',{headers:{Origin:'https://foreign.invalid'}})).status,403);

 w.close();w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});assert.equal(w.customerDrafts.get(id,token).state.fields[0].text,'Familie Winter');assert.equal(w.customerDrafts.get(id,token).productRevision,1);assert.deepEqual(w.customerDrafts.photo(id,token,upload.data.mediaId).original,original);
});
