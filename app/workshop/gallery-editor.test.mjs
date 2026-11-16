import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build,OUTPUT} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {createGalleryEditor} from './gallery-editor.mjs';
import {galleryEditorDocument,galleryEditorTargets,galleryTestPng} from '../../scripts/fixtures/gallery-editor.mjs';
import {nativeDesignReviewFingerprint} from '../../scripts/lib/design-review-approvals.mjs';
import {formMotif} from './form-additions.mjs';

if(!fs.existsSync(path.join(OUTPUT,'models.json')))build();
const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
function fixture(t,options){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-saveback-'));
 const workshop=createWorkshop({filename:path.join(root,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 t.after(()=>{workshop.close();assert.ok(root.startsWith(path.join(os.tmpdir(),'gallery-saveback-')));fs.rmSync(root,{recursive:true,force:true});});
 const record=workshop.repository.create(galleryEditorDocument(options)),targets=galleryEditorTargets(record,options),service=createGalleryEditor({workshop,targets});
 const target={productId:record.id,designId:'source-a',originalId:'TRE-V2A-8x3,5-D1'};
 const request=(objects,extra={})=>({...target,expectedRevision:workshop.repository.get(record.id).revision,objects,photos:[],...extra});
 return {root,workshop,record,service,target,request};
}
const fp=(workshop,record,designId)=>nativeDesignReviewFingerprint({document:record.document,designId,rendererVersion:'gallery-editor-test-v1',resourceResolvers:{asset:id=>workshop.assets.read(id)}});

test('explicit original/native identity, source precision and operator/customer rights survive a no-op',async t=>{
 const f=fixture(t),before=structuredClone(f.record),opened=f.service.open(f.target);
 assert.equal(opened.context.originalId,'TRE-V2A-8x3,5-D1');assert.equal(opened.context.designId,'source-a');
 assert.equal(opened.context.returnUrl,'/originale/#design-TRE-V2A-8x3%2C5-D1');
 assert.equal(opened.model.universal.workbench.gallery,true);assert.equal(opened.model.universal.profile.designs.length,1);
 assert.equal(opened.model.universal.profile.designs[0].objects[0].locked,false);
 const result=await f.service.save(f.request(opened.model.universal.profile.designs[0].objects));
 assert.equal(result.changed,false);assert.equal(result.context.revision,1);assert.deepEqual(f.workshop.repository.get(f.record.id),before);
 assert.throws(()=>f.service.open({...f.target,originalId:'source-a'}),e=>e.status===404);
 assert.throws(()=>f.service.open({...f.target,designId:'katalog-'+f.target.originalId}),e=>e.status===404);
});

test('text, position, deletion and native resource changes save only the addressed design',async t=>{
 const f=fixture(t),objects=f.service.open(f.target).model.universal.profile.designs[0].objects;
 objects[0].text='Neu';objects[0].x+=3;objects[0].rotation=4;
 const beforeB=fp(f.workshop,f.record,'source-b'),beforeA=fp(f.workshop,f.record,'source-a');
 const result=await f.service.save(f.request(objects)),after=f.workshop.repository.get(f.record.id);
 assert.equal(result.context.revision,2);assert.equal(result.changed,true);
 assert.deepEqual(after.document.config.profile.designs[1],f.record.document.config.profile.designs[1]);
 assert.deepEqual(after.document.elementRights,f.record.document.elementRights);
 assert.deepEqual(after.document.config.profile.designs[0].katalog,f.record.document.config.profile.designs[0].katalog);
 assert.equal(after.document.config.profile.designs[0].objects[0].locked,true);
 assert.notEqual(fp(f.workshop,after,'source-a'),beforeA);assert.equal(fp(f.workshop,after,'source-b'),beforeB);
 const noOp=await f.service.save(f.request(f.service.open(f.target).model.universal.profile.designs[0].objects));assert.equal(noOp.changed,false);
 const retained=f.service.open(f.target).model.universal.profile.designs[0].objects.filter(o=>o.id!=='name');
 await f.service.save(f.request(retained));assert.equal(f.workshop.repository.get(f.record.id).document.config.profile.designs[0].objects.length,1);
});

test('whole-product concurrent change rejects stale save; technical and target constraints cannot be bypassed',async t=>{
 const f=fixture(t),opened=f.service.open(f.target),document=structuredClone(f.record.document);
 document.config.profile.designs[1].objects[0].text='Parallel';f.workshop.repository.save(f.record.id,document,1);
 const objects=opened.model.universal.profile.designs[0].objects;objects[0].text='Veraltet';
 await assert.rejects(()=>f.service.save(f.request(objects,{expectedRevision:1})),e=>e.status===409&&e.actualRevision===2);
 assert.equal(f.workshop.repository.get(f.record.id).document.config.profile.designs[1].objects[0].text,'Parallel');
 await assert.rejects(()=>f.service.save(f.request(objects.filter(o=>o.id!=='technical'))),e=>e.code==='review_object_protected');
 await assert.rejects(()=>f.service.save(f.request([...objects,objects[0]])),e=>e.code==='review_object_invalid');
 await assert.rejects(()=>f.service.save({...f.request(objects),document}),e=>e.code==='review_payload_invalid');
});

test('steel and oval targets retain explicit comma source ID and 150 × 80 geometry',async t=>{
 const f=fixture(t,{material:'steel',width:150,height:80,shape:'ellipse',sizeKey:'TO-V2A-15x8'});
 const opened=f.service.open(f.target);assert.deepEqual(opened.context.mm,[150,80]);assert.equal(opened.context.material,'Edelstahl');
 const objects=opened.model.universal.profile.designs[0].objects;objects[0].text='Oval';await f.service.save(f.request(objects));
 assert.equal(f.workshop.repository.get(f.record.id).document.config.profile.geometry.shape,'ellipse');
 const wrong=createGalleryEditor({workshop:f.workshop,targets:galleryEditorTargets(f.record).map(t=>({...t,materialKind:'slate'}))});
 assert.throws(()=>wrong.open(f.target),e=>e.status===409);
});

test('photo/mask roundtrip retains original, processed, edit source, recipe, native fingerprint and immutable references',async t=>{
 const f=fixture(t),document=structuredClone(f.record.document);
 const mask=await f.workshop.assets.import({name:'Maske.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="60mm" viewBox="0 0 40 60"><ellipse cx="20" cy="30" rx="20" ry="30" fill="white"/></svg>').toString('base64')});
 const slot={id:'photo',type:'photoSlot',fieldKey:'photo-main',required:false,x:60,y:75,w:40,h:60,rotation:12,photoShape:'template',photoMaskAssetId:mask.assetId,customerEditable:true,templateOrigin:true};
 document.config.profile.designs[0].objects.push(slot);document.elementRights['source-a'].photo={content:false,color:false,replace:true,move:true,scale:true,delete:true};
 f.workshop.repository.save(f.record.id,document,1);
 const processed='iVBORw0KGgoAAAANSUhEUgAAACQAAAAwCAIAAAD2JU9CAAAAWUlEQVR4nO3NMRHAMADDQEf8OTcUPOiy1A9AOsmXV3h2ymYSrFBjMwVOprOZAifT2UyBk+lspsDJdDZT4GQ6mylwMp3NFDiZzmYKnExnMwVOprOZAieTn88uQ2sBX/gAE+0AAAAASUVORK5CYII=',editSource='iVBORw0KGgoAAAANSUhEUgAAACwAAAA6CAIAAABEaSzQAAAAc0lEQVR4nM3OAREAMAiAQCT5ou9MIV8Ahsc5CZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAACZAArwe2/wEDIAD0h9kwyQAAAABJRU5ErkJggg==';
 const photo={objectId:'photo',original:galleryTestPng,processed,editSource,widthMm:40,heightMm:60,edited:true,color:'grayscale',editSourceColor:'original',
  photoEdit:{angle:90,flip:-1,zoom:1.2,x:.2,y:-.3,shape:'heart',color:'grayscale'},crop:{zoom:1.3,x:.1,y:.2,angle:7},photoShape:'template',photoMaskAssetId:mask.assetId};
 const media=await f.service.upload({...f.target,expectedRevision:2,photo});
 const objects=f.service.open(f.target).model.universal.profile.designs[0].objects;
 Object.assign(objects.find(o=>o.id==='photo'),{uxUploadId:'browser-only',uxUploadKind:'photo',uxPhotoCrop:photo.crop,uxPhotoColor:'grayscale'});
 const saved=await f.service.save(f.request(objects,{photos:[{objectId:'photo',assetId:media.assetId}]}));
 const after=f.workshop.repository.get(f.record.id),stored=after.document.config.profile.designs[0].objects.find(o=>o.id==='photo');
 assert.equal(stored.photoMaskAssetId,mask.assetId);assert.equal(stored.uxUploadId,undefined);assert.equal(stored.uxPhotoCrop,undefined);
 assert.equal(saved.photos[0].assetId,media.assetId);assert.deepEqual(saved.photos[0].photoEdit,photo.photoEdit);assert.deepEqual(saved.photos[0].crop,photo.crop);
 for(const part of ['original','processed','editSource'])assert.deepEqual(f.service.media(f.target,media.assetId,part,after.revision),Buffer.from(photo[part],'base64'));
 assert.deepEqual(f.workshop.assets.photoExampleImage(media.assetId),Buffer.from(photo.original,'base64'),'existing photo/AI source accessor keeps the original');
 assert.throws(()=>f.service.media({...f.target,designId:'source-b',originalId:'OTHER-ORIGINAL'},media.assetId,'original',after.revision),e=>e.status===404);
 assert.match(saved.svg,/data-template-photo-mask/);assert.match(fp(f.workshop,after,'source-a'),/^[a-f0-9]{64}$/);
 const reused=await f.service.save(f.request(objects,{photos:[{objectId:'photo',assetId:media.assetId}]}));assert.equal(reused.changed,false);
 const changedRecipe={...photo,photoEdit:{...photo.photoEdit,shape:'star'}};
 const other=await f.service.upload({...f.target,expectedRevision:after.revision,photo:changedRecipe});assert.notEqual(other.assetId,media.assetId,'same processed pixels with changed recipe/source history are a new native resource');
 objects.find(o=>o.id==='photo').photoMaskAssetId='b'.repeat(64);
 await assert.rejects(()=>f.service.save(f.request(objects,{photos:[{objectId:'photo',assetId:media.assetId}]})),e=>e.code==='review_photo_invalid');
});

test('both current Haus library entries become passive native assets without weakening local SVG validation',async t=>{
 const f=fixture(t,{material:'steel',width:150,height:80,shape:'ellipse'}),objects=f.service.open(f.target).model.universal.profile.designs[0].objects;
 const keys=['import-b56d5711a75f34c1fa8d9c30','import-41fb65efd1d8996ac305f6ab'];
 for(const [index,key]of keys.entries()){assert.equal(formMotif(key).name,'Haus');objects.push({id:'added-house-'+index,type:'motif',motif:key,x:55+index*40,y:40,w:20,h:20,rotation:0,color:'#000000'});}
 const result=await f.service.save(f.request(objects)),after=f.workshop.repository.get(f.record.id),design=after.document.config.profile.designs[0];
 assert.equal(result.context.revision,2);
 for(const o of design.objects.filter(o=>o.id.startsWith('added-house'))){assert.match(o.motif,/^artwork-[a-f0-9]{64}$/);const resource=after.document.config.localResources.motifs.find(m=>m.key===o.motif);assert.equal(resource.name,'Haus');assert.match(f.workshop.assets.read(resource.artwork.assetId).toString(),/<path/);}
 assert.deepEqual(after.document.config.profile.designs[1],f.record.document.config.profile.designs[1]);
 assert.equal((await f.service.save(f.request(objects))).changed,false,'same open editor may save the original library keys again');
 const reopened=f.service.open(f.target).model.universal.profile.designs[0].objects;assert.equal((await f.service.save(f.request(reopened))).changed,false);
});

test('new and replaced unedited slate photos use the same effective default grayscale as the editor',async t=>{
 const f=fixture(t),objects=f.service.open(f.target).model.universal.profile.designs[0].objects;
 const object={id:'new-photo',type:'photoSlot',fieldKey:'photo-new',required:false,x:55,y:80,w:30,h:45,rotation:0,photoShape:'rect',uxUploadId:'upload-one',uxUploadKind:'photo'};objects.push(object);
 const photo={objectId:object.id,original:galleryTestPng,processed:galleryTestPng,editSource:galleryTestPng,widthMm:30,heightMm:45,edited:false,color:'grayscale',editSourceColor:'original',photoEdit:null,crop:null,photoShape:'rect',photoMaskAssetId:null};
 let media=await f.service.upload({...f.target,expectedRevision:1,photo});
 await f.service.save(f.request(objects,{photos:[{objectId:object.id,assetId:media.assetId}]}));
 assert.equal(f.service.open(f.target).photos[0].color,'grayscale');assert.equal(f.workshop.repository.get(f.record.id).document.config.profile.designs[0].objects.find(o=>o.id===object.id).uxPhotoColor,undefined);
 const reopened=f.service.open(f.target).model.universal.profile.designs[0].objects;Object.assign(reopened.find(o=>o.id===object.id),{uxUploadId:'replacement',uxUploadKind:'photo',w:40,h:60});
 media=await f.service.upload({...f.target,expectedRevision:2,photo:{...photo,widthMm:40,heightMm:60}});
 const replaced=await f.service.save(f.request(reopened,{photos:[{objectId:object.id,assetId:media.assetId}]}));assert.equal(replaced.context.revision,3);
});

test('full editor keeps a proportionally resized native photo without changing its immutable image or crop',async t=>{
 const f=fixture(t),objects=f.service.open(f.target).model.universal.profile.designs[0].objects;
 const slot={id:'resize-photo',type:'photoSlot',fieldKey:'photo-resize',required:false,x:55,y:80,w:30,h:45,rotation:7,photoShape:'rect',uxUploadId:'source',uxUploadKind:'photo'};
 objects.push(slot);
 const photo={objectId:slot.id,original:galleryTestPng,processed:galleryTestPng,editSource:galleryTestPng,widthMm:30,heightMm:45,edited:false,color:'grayscale',editSourceColor:'original',photoEdit:null,crop:{zoom:1.2,x:.1,y:0,angle:5},photoShape:'rect',photoMaskAssetId:null};
 slot.uxPhotoCrop=photo.crop;
 const media=await f.service.upload({...f.target,expectedRevision:1,photo});
 const photos=[{objectId:slot.id,assetId:media.assetId}];
 await f.service.save(f.request(objects,{photos}));
 const current=f.workshop.repository.get(f.record.id),document=structuredClone(current.document);
 const otherSlot={...document.config.profile.designs[0].objects.find(o=>o.id===slot.id),id:'other-photo'};
 document.config.profile.designs[1].objects.push(otherSlot);
 document.elementRights['source-b'][otherSlot.id]={content:false,color:false,replace:true,move:true,scale:true,delete:true};
 document.config.localResources.photoExamples.push({designId:'source-b',slotId:otherSlot.id,assetId:media.assetId});
 const resized=document.config.profile.designs[0].objects.find(o=>o.id===slot.id);
 resized.w*=.8;resized.h*=.8;
 const stored=f.workshop.repository.save(f.record.id,document,current.revision);
 const reopened=f.service.open(f.target).model.universal.profile.designs[0].objects,edited=reopened.find(o=>o.id===slot.id);
 Object.assign(edited,{uxUploadId:'reopened',uxUploadKind:'photo',uxPhotoColor:'grayscale',uxPhotoCrop:photo.crop});
 const result=await f.service.save(f.request(reopened,{photos}));
 assert.equal(result.changed,false);assert.deepEqual(f.workshop.repository.get(f.record.id),stored);
 assert.equal(result.photos[0].assetId,media.assetId);assert.deepEqual(result.photos[0].crop,photo.crop);
 edited.w+=1;
 await assert.rejects(()=>f.service.save(f.request(reopened,{photos})),e=>e.code==='review_photo_invalid');
 edited.w=resized.w;edited.uxPhotoCrop={...photo.crop,zoom:1.3};
 await assert.rejects(()=>f.service.save(f.request(reopened,{photos})),e=>e.code==='review_photo_invalid');
});
