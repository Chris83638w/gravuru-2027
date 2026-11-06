import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';
import {familyProductConfig} from './product-families.mjs';
import {makeProductDocument} from './product-model.mjs';
import {createSlateGalleryHandler} from '../../scripts/lib/slate-review-gallery.mjs';
import {createPrivateTestProxy} from '../../ops/plesk/runtime.mjs';
import {createSlateReviewComments} from '../../scripts/lib/slate-review-comments.mjs';
import http from 'node:http';
import {createSlateReviewPositions} from './slate-review-positions.mjs';

function document(ids,width=300,height=200){
  const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
  family.id='schiefer-tafeln-natur';family.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
  family.photo={includedCount:1,extraPriceCents:999};family.sizes=family.sizes.slice(0,1);
  Object.assign(family.sizes[0],{key:'TEST-'+width+'X'+height,widthMm:width,heightMm:height,baseCents:1999,photoDesignCents:2999});
  const config=familyProductConfig(family,family.sizes[0],1),seed=config.profile.designs[0];
  config.profile.designs=ids.map(id=>({...structuredClone(seed),id:'katalog-'+id,name:id,katalog:{designId:id,target:{familyId:family.id,released:false}},
    objects:[{...structuredClone(seed.objects[0]),text:'Hallo '+id,locked:true,acrylicFixed:true,uxLocked:true},
      {...structuredClone(seed.objects[0]),id:'technical',text:'Technik',y:height*.75,technicalLocked:true},
      {...structuredClone(seed.objects[0]),id:'guide',text:'Marke',y:height*.85,role:'guide'}]}));
  config.profile.defaultDesignId=config.profile.designs[0].id;
  return makeProductDocument(config,{name:'Schiefer '+width+' × '+height});
}

test('inline positions use native renderer/CAS through authenticated HTTPS proxy and preserve other designs, formats and comments',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'slate-inline-http-')),output=path.join(root,'build'),galleryRoot=path.join(root,'gallery'),data=path.join(root,'data');
  fs.mkdirSync(galleryRoot);fs.mkdirSync(data);build({outputDirectory:output});
  const seed=JSON.parse(fs.readFileSync(path.join(output,'models.json')))[0];
  const workshop=createWorkshop({filename:path.join(data,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
  const main=workshop.repository.create(document(['A','B','OPEN'])),small=workshop.repository.create(document(['A'],100,100));
  const products=[{key:'TEST-300X200:Hunde',productId:main.id,reviewOnly:true,designIds:['A','B','OPEN']},{key:'TEST-100X100:Hunde',productId:small.id,reviewOnly:true,designIds:['A']}];
  const originals=['A','B','OPEN'].map(id=>({id,group:'Hunde',subcategory:'Allgemein',process:'Gravur',targets:[{sizeKey:'TEST-300X200',mm:[300,200],status:id==='OPEN'?'open':'prepared'},...(id==='A'?[{sizeKey:'TEST-100X100',mm:[100,100],status:'prepared'}]:[])]}));
  fs.writeFileSync(path.join(galleryRoot,'manifest.json'),JSON.stringify({schema:'gravuru-slate-original-review/v1',reviewOnly:true,released:false,products,originals}));
  const mapping=path.join(data,'local-review-import.json');fs.writeFileSync(mapping,JSON.stringify({localOnly:true,published:false,shopifyWrites:0,products}));
  const notes=createSlateReviewComments(path.join(data,'review-comments.sqlite'),['A','B','OPEN']);notes.save('A','Bestehenden Hinweis erhalten',0);const beforeComments=JSON.parse(JSON.stringify(notes.all()));notes.close();
  const token='a'.repeat(64),gallery=createSlateGalleryHandler(galleryRoot,mapping,{workshop,csrfToken:token});
  const inner=createPreviewServer({outputDirectory:output,workshop}),handlers=inner.listeners('request');inner.removeAllListeners('request');
  inner.on('request',(req,res)=>{if(!gallery(req,res))for(const handler of handlers)handler.call(inner,req,res);});
  inner.listen(0,'127.0.0.1');await once(inner,'listening');
  const config={host:'slate.example',origin:'https://slate.example',username:'synthetic',password:'synthetic-only-password'};
  const proxy=createPrivateTestProxy(config,inner);proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  t.after(async()=>{proxy.closeAllConnections();inner.closeAllConnections();await Promise.all([new Promise(r=>proxy.close(r)),new Promise(r=>inner.close(r))]);gallery.close();workshop.close();fs.rmSync(root,{recursive:true,force:true});});
  const authorization='Basic '+Buffer.from(config.username+':'+config.password).toString('base64');
  const request=(route,{method='GET',body,headers={}}={})=>new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:proxy.address().port,path:route,method,agent:false,headers:{host:config.host,'x-forwarded-proto':'https',authorization,origin:config.origin,'x-slate-review-csrf':token,'content-type':'application/json',...headers}},res=>{let bytes='';res.on('data',chunk=>bytes+=chunk);res.once('end',()=>resolve({status:res.statusCode,text:bytes,data:res.headers['content-type']?.includes('application/json')?JSON.parse(bytes):null}));});
    req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
  const route=(id=main.id,designId='katalog-A')=>'/originale/design?'+new URLSearchParams({productId:id,designId});
  const payload=(positions,extra={})=>({productId:main.id,designId:'katalog-A',expectedRevision:1,positions,...extra});
  const patch=(body,headers)=>request('/originale/design',{method:'PATCH',body,headers});
  const opened=await request(route());assert.equal(opened.status,200);assert.equal(opened.data.revision,1);assert.deepEqual(opened.data.geometry,{width:300,height:200});
  assert.match(opened.data.svg,/data-object="text-1"/);assert.equal(opened.data.document,undefined);
  assert.equal(opened.data.objects.find(o=>o.id==='text-1').movable,true,'customer locks do not forbid operator movement');
  assert.equal(opened.data.objects.find(o=>o.id==='technical').movable,false);assert.equal(opened.data.objects.find(o=>o.id==='guide').movable,false);
  assert.equal((await request('/originale/inline.js')).status,200);
  assert.equal((await request('/originale/approvals.js')).status,200);
  const approvalList=await request('/originale/approvals');assert.equal(approvalList.status,200);
  const approval=Object.values(approvalList.data.approvals).find(s=>s.metadata.productId===main.id&&s.metadata.id==='A');
  assert.equal(approval.status,'unreviewed');assert.match(approval.fingerprint,/^[a-f0-9]{64}$/);
  assert.equal(approvalList.data.overview.expectedCoverageKnown,false);
  const approveBody={key:approval.key,approved:true,expectedRevision:0,expectedFingerprint:approval.fingerprint};
  const approve=(body,headers)=>request('/originale/approvals',{method:'POST',body,headers});
  assert.equal((await approve(approveBody,{'x-slate-review-csrf':''})).status,403);
  assert.equal((await approve(approveBody,{origin:'https://foreign.example'})).status,403);
  assert.equal((await approve(approveBody,{authorization:''})).status,401);
  const confirmed=await approve(approveBody);assert.equal(confirmed.status,200);assert.equal(confirmed.data.approvals[approval.key].status,'approved');
  const approvalB=Object.values(confirmed.data.approvals).find(s=>s.metadata.id==='B');
  assert.equal((await approve({key:approvalB.key,approved:true,expectedRevision:0,expectedFingerprint:approvalB.fingerprint})).status,200);
  assert.equal((await approve(approveBody)).status,409);
  const otherSize=Object.values(confirmed.data.approvals).find(s=>s.metadata.productId===small.id&&s.metadata.id==='A');assert.equal(otherSize.status,'unreviewed');
  const unprepared=Object.values(confirmed.data.approvals).find(s=>s.metadata.id==='OPEN');assert.equal(unprepared.status,'unavailable');
  assert.equal((await approve({key:unprepared.key,approved:true,expectedRevision:0,expectedFingerprint:null})).status,422);
  const move={objectId:'text-1',x:151,y:100};
  assert.equal((await patch(payload([move]),{'x-slate-review-csrf':''})).status,403);
  assert.equal((await patch(payload([move]),{origin:'https://foreign.example'})).status,403);
  assert.equal((await patch(payload([move]),{authorization:''})).status,401);
  for(const invalid of [[{...move,text:'cannot change text'}],[{...move,x:null}],[{...move,x:1e9}],[{...move,objectId:'technical'}],[{...move,objectId:'guide'}],[move,move]])assert.equal((await patch(payload(invalid))).status,422);
  assert.equal((await patch({...payload([move]),document:{}})).status,422);
  assert.equal((await patch({...payload([move]),document:main.document})).status,413);
  assert.equal((await request(route(main.id,'katalog-OPEN'))).status,404);
  assert.equal((await request(route(workshop.defaultId,'katalog-A'))).status,404);
  assert.equal((await request(route(small.id,'katalog-B'))).status,404);
  assert.equal((await patch(payload([move],{designId:'katalog-OPEN'}))).status,404);
  assert.deepEqual(workshop.repository.get(main.id),main);
  const saved=await patch(payload([move]));assert.equal(saved.status,200);assert.equal(saved.data.revision,2);assert.equal(saved.data.objects.find(o=>o.id==='text-1').x,151);
  assert.match(saved.data.previewUrl,/revision=2/);assert.match(saved.data.svg,/data-object="text-1"/);
  const expected=structuredClone(main.document);expected.config.profile.designs[0].objects[0].x=151;
  assert.deepEqual(workshop.repository.get(main.id).document,expected,'only the selected object x position changes');
  assert.deepEqual(workshop.repository.get(small.id),small,'other format is untouched');
  assert.equal(workshop.repository.history(main.id).length,2);
  const unchanged=await patch(payload([move],{expectedRevision:2}));assert.equal(unchanged.status,200);assert.equal(unchanged.data.revision,2,'no-op does not add a revision');
  const stale=await patch(payload([{...move,x:152}],{designId:'katalog-B'}));assert.equal(stale.status,409);assert.equal(stale.data.actualRevision,2);
  assert.deepEqual(workshop.repository.get(main.id).document,expected,'stale card from the same group cannot overwrite');
  const reopened=await request(route());assert.equal(reopened.data.objects.find(o=>o.id==='text-1').x,151);assert.equal(reopened.data.revision,2);
  const changedApprovals=(await request('/originale/approvals')).data;
  assert.equal(changedApprovals.approvals[approval.key].status,'changed','moving a confirmed design requires a new visual OK');
  assert.equal(changedApprovals.approvals[approvalB.key].status,'approved','another design in the same saved product group remains confirmed');
  assert.equal((await approve({...approveBody,expectedRevision:1})).status,409,'old preview cannot approve the edited design');
  const afterComments=await request('/originale/comments');assert.deepEqual(afterComments.data.comments,beforeComments);
  assert.deepEqual(JSON.parse(fs.readFileSync(mapping)).products,products,'import mapping is not rewritten');
});

test('explicit steel targets render and save native positions while material, source, format and revision gates remain closed', t => {
  const originalId='TRE-V2A-8x3,5-D1',nativeDesignId='katalog-TRE-V2A-8x3-5-D1';
  const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
  family.sizes=[structuredClone(family.sizes[0])];
  Object.assign(family.sizes[0],{key:'GR-ES-RE-80X35-T15',widthMm:80,heightMm:35});
  const config=familyProductConfig(family,family.sizes[0],1),seed=config.profile.designs[0];
  seed.id=nativeDesignId;seed.katalog={designId:originalId};
  Object.assign(seed.objects[0],{text:'Hallo',rotation:5,locked:true});
  const other=structuredClone(seed);other.id='katalog-other';other.katalog.designId='OTHER';
  config.profile.designs.push(other);config.profile.defaultDesignId=nativeDesignId;
  const workshop=createWorkshop({filename:':memory:',seedConfig:config,legacy:{}});t.after(()=>workshop.close());
  const record=workshop.repository.create(makeProductDocument(config));
  const product={key:'steel:'+family.sizes[0].key,productId:record.id,reviewOnly:true,designIds:[originalId]};
  const row={id:originalId,reviewMaterial:{key:'steel',label:'Edelstahl',kind:'steel'},targets:[{productKey:product.key,nativeDesignId,sizeKey:family.sizes[0].key,mm:[80,35],status:'prepared'}]};
  const pack={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,products:[product],originals:[row]};
  const imported={localOnly:true,published:false,shopifyWrites:0,products:[product]};
  const positions=createSlateReviewPositions({workshop,pack,imported});
  const opened=positions.open(record.id,nativeDesignId);
  assert.match(opened.svg,/data-object="text-1"/);assert.equal(opened.objects[0].movable,true);
  assert.deepEqual(opened.geometry,{width:80,height:35});assert.match(opened.svg,/data:image\//);
  assert.throws(()=>positions.open(record.id,'katalog-'+originalId),e=>e.status===404);
  assert.throws(()=>positions.open(record.id,'katalog-other'),e=>e.status===404);
  const expected=structuredClone(record.document),object=expected.config.profile.designs[0].objects[0];object.x+=0.5;
  const input={productId:record.id,designId:nativeDesignId,expectedRevision:1,positions:[{objectId:object.id,x:object.x,y:object.y}]};
  assert.throws(()=>positions.save({...input,positions:[{...input.positions[0],rotation:0}]}),e=>e.status===422);
  assert.throws(()=>positions.save({...input,positions:[{...input.positions[0],x:1000}]}),e=>e.status===422);
  const saved=positions.save(input);assert.equal(saved.revision,2);assert.match(saved.svg,/data-object="text-1"/);
  assert.deepEqual(workshop.repository.get(record.id).document,expected,'only the requested x/y may change, including rotated locked source text');
  assert.throws(()=>positions.save(input),e=>e.status===409);
  assert.equal(positions.save({...input,expectedRevision:2}).revision,2);
  for(const change of [r=>{r.reviewMaterial={key:'slate',label:'Schiefer',kind:'slate'};},r=>{r.targets[0].mm=[90,35];}]){
    const changed=structuredClone(pack);change(changed.originals[0]);
    assert.throws(()=>createSlateReviewPositions({workshop,pack:changed,imported}).open(record.id,nativeDesignId),e=>e.status===409);
  }
  const wrongSource=structuredClone(pack);wrongSource.originals[0].targets[0].nativeDesignId='katalog-other';
  assert.throws(()=>createSlateReviewPositions({workshop,pack:wrongSource,imported}).open(record.id,'katalog-other'),e=>e.status===409);
});

test('target-level acrylic binding distinguishes colour and thickness during native position editing',t=>{
  const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
  family.id='acryl-3mm-tuerschilder-schwarz';family.material={kind:'acrylic',variant:'schwarz',label:'Acrylglas schwarz',thicknessMm:3,processingProfileId:'acrylic-engraving',engravingSide:'back'};
  family.sizes=[structuredClone(family.sizes[0])];
  const config=familyProductConfig(family,family.sizes[0],1),design=config.profile.designs[0];
  design.katalog={designId:'SAME',target:{familyId:family.id,released:false}};
  const workshop=createWorkshop({filename:':memory:',seedConfig:config,legacy:{}});t.after(()=>workshop.close());
  const record=workshop.repository.create(makeProductDocument(config));
  const product={key:'acrylic:small',productId:record.id,reviewOnly:true,designIds:['SAME']};
  const target={status:'prepared',familyId:family.id,productKey:product.key,nativeDesignId:design.id,sizeKey:'ACRYLIC-SMALL',mm:[family.sizes[0].widthMm,family.sizes[0].heightMm],reviewMaterial:{key:'acrylic-schwarz-3mm',label:'Acrylglas Schwarz · 3 mm',kind:'acrylic'}};
  const pack={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,products:[product],originals:[{id:'SAME',reviewMaterial:{key:'steel',label:'Edelstahl',kind:'steel'},targets:[target]}]};
  const imported={localOnly:true,published:false,shopifyWrites:0,products:[product]};
  const opened=createSlateReviewPositions({workshop,pack,imported}).open(record.id,design.id);
  assert.equal(opened.revision,1);assert.match(opened.svg,/data-object=/);
  for(const material of [{key:'acrylic-anthrazit-3mm',label:'Acrylglas Anthrazit · 3 mm',kind:'acrylic'},{key:'acrylic-as-5mm',label:'Acrylglas Schwarz · 5 mm',kind:'acrylic'}]){
    const wrong=structuredClone(pack);wrong.originals[0].targets[0].reviewMaterial=material;
    assert.throws(()=>createSlateReviewPositions({workshop,pack:wrong,imported}).open(record.id,design.id),e=>e.status===409);
  }
  const wrongFamily=structuredClone(pack);wrongFamily.originals[0].targets[0].familyId='foreign-family';
  assert.throws(()=>createSlateReviewPositions({workshop,pack:wrongFamily,imported}).open(record.id,design.id),e=>e.status===409);
  assert.deepEqual(workshop.repository.get(record.id),record);
});
