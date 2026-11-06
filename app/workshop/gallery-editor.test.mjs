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

test('explicit original/native identity, source precision and operator/customer rights survive a no-op',t=>{
 const f=fixture(t),before=structuredClone(f.record),opened=f.service.open(f.target);
 assert.equal(opened.context.originalId,'TRE-V2A-8x3,5-D1');assert.equal(opened.context.designId,'source-a');
 assert.equal(opened.context.returnUrl,'/originale/#design-TRE-V2A-8x3%2C5-D1');
 assert.equal(opened.model.universal.workbench.gallery,true);assert.equal(opened.model.universal.profile.designs.length,1);
 assert.equal(opened.model.universal.profile.designs[0].objects[0].locked,false);
 const result=f.service.save(f.request(opened.model.universal.profile.designs[0].objects));
 assert.equal(result.changed,false);assert.equal(result.context.revision,1);assert.deepEqual(f.workshop.repository.get(f.record.id),before);
 assert.throws(()=>f.service.open({...f.target,originalId:'source-a'}),e=>e.status===404);
 assert.throws(()=>f.service.open({...f.target,designId:'katalog-'+f.target.originalId}),e=>e.status===404);
});

test('text, position, deletion and native resource changes save only the addressed design',t=>{
 const f=fixture(t),objects=f.service.open(f.target).model.universal.profile.designs[0].objects;
 objects[0].text='Neu';objects[0].x+=3;objects[0].rotation=4;
 const beforeB=fp(f.workshop,f.record,'source-b'),beforeA=fp(f.workshop,f.record,'source-a');
 const result=f.service.save(f.request(objects)),after=f.workshop.repository.get(f.record.id);
 assert.equal(result.context.revision,2);assert.equal(result.changed,true);
 assert.deepEqual(after.document.config.profile.designs[1],f.record.document.config.profile.designs[1]);
 assert.deepEqual(after.document.elementRights,f.record.document.elementRights);
 assert.deepEqual(after.document.config.profile.designs[0].katalog,f.record.document.config.profile.designs[0].katalog);
 assert.equal(after.document.config.profile.designs[0].objects[0].locked,true);
 assert.notEqual(fp(f.workshop,after,'source-a'),beforeA);assert.equal(fp(f.workshop,after,'source-b'),beforeB);
 const noOp=f.service.save(f.request(f.service.open(f.target).model.universal.profile.designs[0].objects));assert.equal(noOp.changed,false);
 const retained=f.service.open(f.target).model.universal.profile.designs[0].objects.filter(o=>o.id!=='name');
 f.service.save(f.request(retained));assert.equal(f.workshop.repository.get(f.record.id).document.config.profile.designs[0].objects.length,1);
});

test('whole-product concurrent change rejects stale save; technical and target constraints cannot be bypassed',t=>{
 const f=fixture(t),opened=f.service.open(f.target),document=structuredClone(f.record.document);
 document.config.profile.designs[1].objects[0].text='Parallel';f.workshop.repository.save(f.record.id,document,1);
 const objects=opened.model.universal.profile.designs[0].objects;objects[0].text='Veraltet';
 assert.throws(()=>f.service.save(f.request(objects,{expectedRevision:1})),e=>e.status===409&&e.actualRevision===2);
 assert.equal(f.workshop.repository.get(f.record.id).document.config.profile.designs[1].objects[0].text,'Parallel');
 assert.throws(()=>f.service.save(f.request(objects.filter(o=>o.id!=='technical'))),e=>e.code==='review_object_protected');
 assert.throws(()=>f.service.save(f.request([...objects,objects[0]])),e=>e.code==='review_object_invalid');
 assert.throws(()=>f.service.save({...f.request(objects),document}),e=>e.code==='review_payload_invalid');
});

test('steel and oval targets retain explicit comma source ID and 150 × 80 geometry',t=>{
 const f=fixture(t,{material:'steel',width:150,height:80,shape:'ellipse',sizeKey:'TO-V2A-15x8'});
 const opened=f.service.open(f.target);assert.deepEqual(opened.context.mm,[150,80]);assert.equal(opened.context.material,'Edelstahl');
 const objects=opened.model.universal.profile.designs[0].objects;objects[0].text='Oval';f.service.save(f.request(objects));
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
 const photo={objectId:'photo',original:galleryTestPng,processed:galleryTestPng,editSource:galleryTestPng,widthMm:40,heightMm:60,edited:true,color:'grayscale',editSourceColor:'original',
  photoEdit:{angle:90,flip:-1,zoom:1.2,x:.2,y:-.3,shape:'heart',color:'grayscale'},crop:{zoom:1.3,x:.1,y:.2,angle:7},photoShape:'template',photoMaskAssetId:mask.assetId};
 const media=await f.service.upload({...f.target,expectedRevision:2,photo});
 const objects=f.service.open(f.target).model.universal.profile.designs[0].objects;
 Object.assign(objects.find(o=>o.id==='photo'),{uxUploadId:'browser-only',uxUploadKind:'photo',uxPhotoCrop:photo.crop,uxPhotoColor:'grayscale'});
 const saved=f.service.save(f.request(objects,{photos:[{objectId:'photo',assetId:media.assetId}]}));
 const after=f.workshop.repository.get(f.record.id),stored=after.document.config.profile.designs[0].objects.find(o=>o.id==='photo');
 assert.equal(stored.photoMaskAssetId,mask.assetId);assert.equal(stored.uxUploadId,undefined);assert.equal(stored.uxPhotoCrop,undefined);
 assert.equal(saved.photos[0].assetId,media.assetId);assert.deepEqual(saved.photos[0].photoEdit,photo.photoEdit);assert.deepEqual(saved.photos[0].crop,photo.crop);
 for(const part of ['original','processed','editSource'])assert.deepEqual(f.service.media(f.target,media.assetId,part,after.revision),Buffer.from(galleryTestPng,'base64'));
 assert.throws(()=>f.service.media({...f.target,designId:'source-b',originalId:'OTHER-ORIGINAL'},media.assetId,'original',after.revision),e=>e.status===404);
 assert.match(saved.svg,/data-template-photo-mask/);assert.match(fp(f.workshop,after,'source-a'),/^[a-f0-9]{64}$/);
 const reused=f.service.save(f.request(objects,{photos:[{objectId:'photo',assetId:media.assetId}]}));assert.equal(reused.changed,false);
 const changedRecipe={...photo,photoEdit:{...photo.photoEdit,shape:'star'}};
 const other=await f.service.upload({...f.target,expectedRevision:after.revision,photo:changedRecipe});assert.notEqual(other.assetId,media.assetId,'same processed pixels with changed recipe/source history are a new native resource');
 objects.find(o=>o.id==='photo').photoMaskAssetId='b'.repeat(64);
 assert.throws(()=>f.service.save(f.request(objects,{photos:[{objectId:'photo',assetId:media.assetId}]})),e=>e.code==='review_photo_invalid');
});
