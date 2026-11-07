import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {familyProductConfig} from './product-families.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import {assertNativeTargetIdentity,composeNativeTarget,nativeSource,syncHash} from './gallery-shop-sync-native.mjs';
import {createGalleryShopSync} from './gallery-shop-sync.mjs';
import {createGallerySyncTestFixture} from './gallery-shop-sync-test-fixture.mjs';
import {galleryTestPng} from '../../scripts/fixtures/gallery-editor.mjs';

const clone=structuredClone;
async function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-material-'));
 const f=await createGallerySyncTestFixture({directory});
 t.after(()=>{f.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'gallery-material-')));fs.rmSync(directory,{recursive:true,force:true});});
 return f;
}
function acrylicPair(){
 const family=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/schwarz.json',import.meta.url))),size=family.sizes.find(s=>s.widthMm===120&&s.heightMm===80);
 const config=familyProductConfig(family,size,1),design=config.profile.designs[0];
 design.katalog={originalId:'SYNTHETIC-ORIGINAL',designId:'SYNTHETIC-ORIGINAL',target:{familyId:family.id}};
 const document=makeProductDocument(config,{name:'Synthetische Materialprüfung'}),record={id:'cfg_'+randomUUID(),revision:1,publishedRevision:null,status:'draft',document};
 const changed=clone(record);changed.document.config.profile.designs[0].objects[0].text='Geändert';
 const d=changed.document.config.profile.designs[0],p=changed.document.config.profile;
 const source={record:changed,evidence:{originalId:'SYNTHETIC-ORIGINAL'},payload:{design:clone(d),rights:clone(changed.document.elementRights[d.id]),geometry:clone(p.geometry),material:clone(p.material),processing:clone(getProcessingProfile(p)),fonts:clone(config.localResources.fonts),motifs:[],rasters:[],photos:[],placeholders:[],hints:[]}};
 return {source,target:record,identity:{designId:d.id}};
}

test('exact native acrylic material and family copy only the design; preview labels/colour are not physical identity',()=>{
 const {source,target,identity}=acrylicPair(),before=clone(target),sourceBefore=clone(source);
 target.document.config.profile.material.label='Andere Anzeige';target.document.config.profile.material.color='#181a1c';
 const proposed=composeNativeTarget(source,target,identity),after=prepareShopProduct({...target,document:proposed}),old=prepareShopProduct(target);
 assert.equal(proposed.config.profile.designs[0].objects[0].text,'Geändert');
 assert.deepEqual(proposed.config.profile.material,target.document.config.profile.material);
 for(const key of ['variants','extras','seo','title'])assert.deepEqual(after[key],old[key]);
 assert.deepEqual(proposed.config.photo,before.document.config.photo);assert.deepEqual(proposed.elementRights,before.document.elementRights);
 assert.deepEqual(source,sourceBefore);assert.equal(target.revision,1);assert.deepEqual(target.document.config.profile.designs,before.document.config.profile.designs);
});

test('same material kind and geometry do not permit a different variant, thickness, engraving side or catalogue family',()=>{
 const original=acrylicPair();
 const cases=[
  ['variant',p=>p.material.variant='anthrazit','gallery_sync_material'],
  ['thickness',p=>p.material.thicknessMm=5,'gallery_sync_material'],
  ['engraving side',p=>p.material.engravingSide='front','gallery_sync_material'],
  ['family',p=>p.designs[0].katalog.target.familyId='another-explicit-family','gallery_sync_family_identity'],
  ['missing acrylic variant',p=>delete p.material.variant,'gallery_sync_material_identity'],
  ['unknown thickness',p=>p.material.thicknessMm=null,'gallery_sync_material_identity'],
 ];
 for(const [label,mutate,code]of cases){
  const pair=clone(original);mutate(pair.target.document.config.profile);const before=clone(pair);
  assert.throws(()=>composeNativeTarget(pair.source,pair.target,pair.identity),error=>error.code===code&&error.status===422,label);
  assert.deepEqual(pair,before,label+' must not mutate either side');
 }
 const other=clone(original);other.target.document.config.profile.designs[0].katalog.target.familyId='another-explicit-family';other.target.document.config.familyAcrylic.familyId='another-explicit-family';
 assert.throws(()=>assertNativeTargetIdentity(other.source,other.target,other.identity),error=>error.code==='gallery_sync_family_identity'&&/verschiedenen/.test(error.message));
});

test('legacy absent steel variant and familyFormats bank metadata remain valid only with explicit consistent family evidence',async t=>{
 const f=await fixture(t),source=nativeSource(f.sourceWorkshop,f.mapping.source),before=clone(f.target);
 assert.equal(source.payload.material.variant,undefined);assert.equal(source.payload.design.katalog.target,undefined);
 assert.doesNotThrow(()=>composeNativeTarget(source,f.target,f.mapping.target),'explicit selected familyFormats variant proves legacy family');
 for(const side of ['source','target']){
  const s=clone(source),target=clone(f.target),config=side==='source'?s.record.document.config:target.document.config;
  const design=side==='source'?s.payload.design:config.profile.designs[0];
  delete config.familyFormats;delete config.familyAcrylic;delete config.profile.familySelection;delete design.katalog.target;
  assert.throws(()=>assertNativeTargetIdentity(s,target,f.mapping.target),error=>error.code==='gallery_sync_family_identity'&&/fehlt/.test(error.message),side+' needs explicit family');
 }
 assert.deepEqual(f.targetWorkshop.repository.get(f.target.id),before);assert.equal(f.transport.writes.length,0);
});

test('profile, selected variant and format-bank family/material contradictions on either side are rejected',async t=>{
 const f=await fixture(t),base=nativeSource(f.sourceWorkshop,f.mapping.source);
 for(const side of ['source','target'])for(const change of ['bank-family','profile-family','variant-family','variant-material']){
  const source=clone(base),target=clone(f.target),config=side==='source'?source.record.document.config:target.document.config;
  const design=side==='source'?source.payload.design:config.profile.designs[0],bank=config.familyFormats.designs[0],variant=config.familyFormats.formats[0].variants[0];
  if(change==='bank-family')bank.katalog.target={familyId:'wrong-family'};
  if(change==='profile-family')design.katalog.target={familyId:'wrong-family'};
  if(change==='variant-family'){design.katalog.target={familyId:variant.familyId};variant.familyId='another-family';}
  if(change==='variant-material')variant.material.thicknessMm+=1;
  assert.throws(()=>assertNativeTargetIdentity(source,target,f.mapping.target),error=>error.code===(change==='variant-material'?'gallery_sync_material_identity':'gallery_sync_family_identity'),side+' '+change);
 }
});

test('incompatible source with a real photo/mask is rejected before asset imports, target revisions, bindings or remote requests',async t=>{
 const f=await fixture(t),source=f.sourceWorkshop,target=f.targetWorkshop,document=clone(f.source.document),designId=f.mapping.source.designId;
 const mask=await source.assets.import({name:'synthetic-mask.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="40mm" viewBox="0 0 30 40"><ellipse cx="15" cy="20" rx="15" ry="20"/></svg>').toString('base64')});
 const photo=await source.assets.galleryPhotos.import({original:galleryTestPng,processed:galleryTestPng,editSource:galleryTestPng,widthMm:30,heightMm:40,edited:true,color:'original',editSourceColor:'original',photoEdit:{angle:0,flip:1,zoom:1,x:0,y:0,shape:'heart',color:'original'},crop:{zoom:1,x:0,y:0,angle:0},photoShape:'template',photoMaskAssetId:mask.assetId});
 const slot={id:'synthetic-photo',type:'photoSlot',fieldKey:'photo-main',required:false,x:60,y:40,w:30,h:40,rotation:0,photoShape:'template',photoMaskAssetId:mask.assetId,customerEditable:true,templateOrigin:true};
 document.config.photo.enabled=true;document.config.logo={enabled:false,vectorUpload:false};
 for(const d of [document.config.profile.designs[0],document.config.familyFormats.designs[0]])d.objects.push(clone(slot));
 document.elementRights[designId][slot.id]={content:false,color:false,replace:true,move:true,scale:true,delete:true};
 document.config.localResources.photoExamples=[{designId,slotId:slot.id,assetId:photo.assetId}];
 const before=clone(f.target),bindings=clone(target.orderIntake.bindings());
 let imports=0,requests=0;const importAsset=target.assets.import,importPhoto=target.assets.galleryPhotos.import;
 target.assets.import=(...args)=>{imports++;return importAsset(...args);};target.assets.galleryPhotos.import=(...args)=>{imports++;return importPhoto(...args);};
 const service=createGalleryShopSync({...f.args,transport:{...f.transport,inspect:async(...args)=>{requests++;return f.transport.inspect(...args);}}});
 const cases=[
  ['variant',c=>{c.profile.material.variant='explicit-other-variant';c.familyFormats.formats[0].variants[0].material.variant='explicit-other-variant';},'gallery_sync_material'],
  ['thickness',c=>{c.profile.material.thicknessMm=2;c.familyFormats.formats[0].variants[0].material.thicknessMm=2;},'gallery_sync_material'],
  ['family',c=>{for(const d of [c.profile.designs[0],c.familyFormats.designs[0]])d.katalog.target={familyId:'grabstecker-edelstahl'};c.familyFormats.formats[0].variants[0].familyId='grabstecker-edelstahl';},'gallery_sync_family_identity'],
 ];
 for(const [label,change,code]of cases){
  const changed=clone(document);change(changed.config);source.repository.save(f.source.id,changed,source.repository.head(f.source.id).revision);const saved=source.repository.get(f.source.id);
  const plan=await service.plan({targetIds:[f.mapping.id]});assert.equal(plan.ready,false,label);assert.equal(plan.entries[0].issues[0].code,code,label);
  assert.equal(imports,0,label);assert.equal(requests,0,label);assert.equal(f.transport.writes.length,0,label);
  assert.deepEqual(target.repository.get(f.target.id),before,label);assert.deepEqual(target.orderIntake.bindings(),bindings,label);assert.deepEqual(source.repository.get(f.source.id),saved,label);
  for(const id of [mask.assetId,photo.assetId])assert.throws(()=>target.assets.get(id),error=>error.status===404,label);
 }
 assert.deepEqual(source.assets.galleryPhotos.read(photo.assetId,'original'),Buffer.from(galleryTestPng,'base64'));
});

test('a saved plan from before the material guard cannot bypass identity validation during execute',async t=>{
 const f=await fixture(t),plan=await f.service.plan({targetIds:[f.mapping.id]});assert.equal(plan.ready,true);
 const document=clone(f.source.document);for(const design of [document.config.profile.designs[0],document.config.familyFormats.designs[0]])design.katalog.target={familyId:'wrong-family'};f.sourceWorkshop.repository.save(f.source.id,document,1);
 // An isolated legacy journal fixture, never an edit of an existing plan.
 const old=JSON.parse(f.journal.prepare('SELECT document FROM gallery_shop_sync_plans WHERE id=?').get(plan.planId).document);
 old.id='gsp_'+randomUUID();old.entries[0].source=nativeSource(f.sourceWorkshop,f.mapping.source).evidence;
 const sha=syncHash(old);f.journal.prepare('INSERT INTO gallery_shop_sync_plans(scope,id,sha,document,created_at) VALUES(?,?,?,?,?)').run('gravuru|'+f.args.shopDomain,old.id,sha,JSON.stringify(old),old.createdAt);
 let requests=0;const service=createGalleryShopSync({...f.args,transport:{...f.transport,inspect:async(...args)=>{requests++;return f.transport.inspect(...args);}}}),before=clone(f.target);
 const result=await service.execute({planId:old.id,planSha256:sha});
 assert.equal(result.operations[0].state,'conflict');assert.equal(result.operations[0].error.code,'gallery_sync_family_identity');
 assert.equal(requests,0);assert.equal(f.transport.writes.length,0);assert.deepEqual(f.targetWorkshop.repository.get(f.target.id),before);assert.equal(f.activation.capture(f.mapping).boundRevision,1);
});
