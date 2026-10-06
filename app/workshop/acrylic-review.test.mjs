import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {once} from 'node:events';import {execFileSync} from 'node:child_process';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {importEnvironment} from './design-assets.mjs';
import {ACRYLIC_REVIEW,validateAcrylicReview} from './acrylic-review.mjs';
import {readReviewPackage} from './review-package.mjs';

test('native acrylic handoff pins rights, all 28 prices, originals and immutable snapshots; rejects forged requests',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-acrylic-review-'));build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],filename=path.join(dir,'workshop.sqlite');
 let w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});
 const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Acryl Prüfmuster',kind:'product'}),config=w.model(record.id,1).universal,source=config.profile.designs[0];
 const png=execFileSync('python3',['-c',"from PIL import Image;import io,sys;f=io.BytesIO();Image.new('RGBA',(40,60),(210,80,40,255)).save(f,format='PNG');sys.stdout.buffer.write(f.getvalue())"],{env:importEnvironment()}).toString('base64');
 const input={productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:{size:'large',base:'eiche',wall:'yes'},quantity:2,media:[{id:'test-photo',original:png,edited:png}],preview:png};
 const photo=input.objects.find(o=>o.type==='photoSlot');Object.assign(photo,{uxUploadId:'test-photo',uxUploadKind:'photo',uxPhotoCrop:{zoom:1.4,x:.1,y:-.1,angle:0}});
 // Use the real catalogue IDs, and exercise every commercial combination.
 const groups=config.profile.optionGroups;input.options=Object.fromEntries(groups.map(g=>[g.id,g.values.at(-1).id]));
 for(const size of groups.find(g=>g.id==='size').values)for(const base of groups.find(g=>g.id==='base').values)for(const wall of groups.find(g=>g.id==='wall').values){const result=validateAcrylicReview(record,config,{...input,options:{size:size.id,base:base.id,wall:wall.id}});assert.equal(result.price.totalCents,result.price.unitCents*2);assert.ok(result.geometry.widthMm>=150);}
 const known=validateAcrylicReview(record,config,{...input,options:{size:'large',base:'eiche',wall:'wall'}});assert.equal(known.price.unitCents,3697);assert.equal(known.price.totalCents,7394);assert.equal(known.geometry.insertionMm,7);
 const server=createPreviewServer({workshop:w,outputDirectory:dir});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const {csrfToken}=await (await fetch(base+'/api/workshop/session')).json();
 const post=(data,headers={})=>fetch(base+'/api/workshop/acrylic-reviews',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfToken,...headers},body:JSON.stringify(data)});
 assert.equal((await post(input,{'X-Gravuru-CSRF':''})).status,403);
 assert.equal((await post(input,{Origin:'https://foreign.example'})).status,403);
 for(const bad of [{...input,totalCents:1},{...input,quantity:undefined},{...input,productRevision:undefined},{...input,options:{size:'invented'}},{...input,media:[]},{...input,media:[{id:'other',original:png}]},{...input,preview:Buffer.from('<svg onload="alert(1)"/>').toString('base64')}])assert.equal((await post(bad)).status,422);
 const locked=structuredClone(input);locked.objects.find(o=>o.acrylicFixed).x+=1;assert.equal((await post(locked)).status,422);
 const response=await post(input);const saved=await response.json();assert.equal(response.status,201,JSON.stringify(saved));
 const repeat=await (await post(input)).json();assert.equal(repeat.id,saved.id);assert.equal(w.customerDrafts.listSnapshots().length,1);
 const original=w.customerDrafts.downloadSnapshot(saved.id,'package'),manifest=w.customerDrafts.review(saved.id).manifest;
 assert.equal(manifest.schema,ACRYLIC_REVIEW);assert.equal(manifest.selection.price.quantity,2);assert.equal(manifest.productionReady,false);
 const archive=readReviewPackage(original,manifest.packageSha256,ACRYLIC_REVIEW);assert.deepEqual(archive.files.get('fotos/1-original.png'),Buffer.from(png,'base64'));assert.deepEqual(archive.files.get('fotos/1-bearbeitet.png'),Buffer.from(png,'base64'));assert.throws(()=>readReviewPackage(original,manifest.packageSha256));
 assert.equal((await fetch(base+'/api/workshop/export-jobs',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfToken},body:JSON.stringify({snapshotId:saved.id,settings:{}})})).status,422);
 const changed=structuredClone(record.document);changed.config.acrylic.pricing.sizes.small+=100;w.repository.save(record.id,changed,1);
 assert.deepEqual(w.customerDrafts.downloadSnapshot(saved.id,'package'),original);assert.equal((await (await post(input)).json()).id,saved.id);
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="80mm" viewBox="0 0 100 80"><path d="M10 10H90V70H10Z" fill="#334455"/></svg>');
 const asset=await w.assets.import({name:'Design.svg',bytes:svg.toString('base64')});const importInput={expectedRevision:2,designId:source.id,assetId:asset.assetId,fit:'visible',originalName:'Design.svg'};const plan=planDesignImport(w.repository,w.assets,record.id,importInput);const imported=applyDesignImport(w.repository,w.assets,record.id,{...importInput,token:plan.token});
 const native=w.model(record.id,imported.revision).universal,importedInput={...input,productRevision:imported.revision,objects:native.profile.designs[0].objects,quantity:1,media:[]};const importedResponse=await post(importedInput),importedSnapshot=await importedResponse.json();assert.equal(importedResponse.status,201,JSON.stringify(importedSnapshot));
 const importedManifest=w.customerDrafts.review(importedSnapshot.id).manifest,importedArchive=readReviewPackage(w.customerDrafts.downloadSnapshot(importedSnapshot.id,'package'),importedManifest.packageSha256,ACRYLIC_REVIEW);assert.deepEqual(importedArchive.files.get('quellen/'+asset.assetId+'-original.svg'),svg);assert.ok(importedArchive.files.has('quellen/'+asset.assetId+'-vorschau.svg'));
 const db=new DatabaseSync(filename);assert.throws(()=>db.prepare('UPDATE form_review_snapshots SET preview=? WHERE id=?').run('changed',saved.id),/immutable/);db.close();
 w.close();w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});assert.deepEqual(w.customerDrafts.downloadSnapshot(saved.id,'package'),original);
});
