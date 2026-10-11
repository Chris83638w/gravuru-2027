import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {spawnSync} from 'node:child_process';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';
import {makeProductDocument,validateProductDocument,validateProductDesign} from './product-model.mjs';import {createProductRepository} from './repository.mjs';import {createDesignAssetStore} from './design-assets.mjs';import {createAiDesignJobs} from './ai-design-jobs.mjs';
import {authorDesign} from './ui/design-authoring.mjs';import {aiRequest} from './ai-design-plan.mjs';import {AI_RESERVE_CENTS} from './openai-design-provider.mjs';import {createOpenAiImageProvider,AI_IMAGE_MODEL,imageCost} from './openai-image-provider.mjs';
const png=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image; import io,base64; b=io.BytesIO(); Image.new('RGBA',(512,512),(40,130,70,180)).save(b,format='PNG'); print(base64.b64encode(b.getvalue()).decode())"],{encoding:'utf8'}).stdout.trim();
const settings={enabled:true,imagesEnabled:true,monthlyLimitCents:10000,pricingValidUntil:'2026-11-01T00:00:00Z'};
const req=(v={})=>({requestId:'air_'+randomUUID(),expectedRevision:1,designId:'slate-test',instruction:'Ein einzelner Baum',preserveText:true,preservePhotos:true,kind:'image_generate',...v});
const fixture=()=>makeProductDocument(syntheticSlate(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url))))));
async function setup(t,{photo=false,config=settings,imageProvider=async()=>({image:png,chargedCents:9,usage:{model:AI_IMAGE_MODEL}}),provider=async()=>new Promise(()=>{})}={}){
 const assets=createDesignAssetStore({filename:':memory:'});let doc=fixture(),slot;
 if(photo){const asset=await assets.importPhotoExample({bytes:png,widthMm:20,heightMm:30});const r=authorDesign(doc,'slate-test','photo',{exampleAssetId:asset.assetId});doc=r.document;slot=r.objectId;const mask=await assets.import({name:'mask.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20mm" height="30mm" viewBox="0 0 20 30"><path d="M0 0H20V30H0Z"/></svg>').toString('base64')});Object.assign(doc.config.profile.designs[0].objects.at(-1),{photoShape:'template',photoMaskAssetId:mask.assetId});}
 const repository=createProductRepository({filename:':memory:',validateDocument:d=>{d=validateProductDocument(d);for(const design of d.config.profile.designs)validateProductDesign(d,design);assets.validateDocument(d);return d;}}),record=repository.create(doc);
 const jobs=createAiDesignJobs({filename:':memory:',repository,assets,config,provider,imageProvider,clock:()=>new Date('2026-10-11T12:00:00Z')});
 t.after(()=>{jobs.close();repository.close();assets.close();});return {jobs,record,repository,assets,slot};
}
async function finish(jobs,id){for(let i=0;i<300&&jobs.get(id).status==='running';i++)await new Promise(r=>setTimeout(r,10));return jobs.get(id);}
test('new image is one editable element, with original PNG and old product retained',async t=>{
 let calls=0;const {jobs,record,repository,assets}=await setup(t,{imageProvider:async context=>{calls++;assert.deepEqual(Object.keys(context).sort(),['instruction','kind']);return {image:png,chargedCents:9,usage:{}};}}),r=req();
 jobs.start(record.id,r);assert.equal(jobs.start(record.id,r).duplicate,true);assert.equal((await finish(jobs,r.requestId)).status,'review');assert.equal(calls,1);assert.equal(repository.get(record.id).revision,1);
 const next=jobs.candidate(r.requestId),oldObjects=record.document.config.profile.designs[0].objects,newObjects=next.config.profile.designs[0].objects;
 assert.deepEqual(newObjects.slice(0,-1),oldObjects);assert.equal(newObjects.at(-1).type,'motif');assert.equal(newObjects.at(-1).preserveColors,true);assert.equal(newObjects.at(-1).technicalLocked,undefined);
 assert.deepEqual(next.config.profile.geometry,record.document.config.profile.geometry);assert.deepEqual(next.config.profile.optionGroups,record.document.config.profile.optionGroups);
 const assetId=jobs.get(r.requestId).changes[0].assetId;assert.equal(assets.photoExampleImage(assetId).toString('base64'),png);
 assert.equal(jobs.apply(r.requestId,1).record.revision,2);assert.equal(jobs.apply(r.requestId,1).duplicate,true);assert.deepEqual(repository.get(record.id,{revision:1}).document,record.document);
});
test('photo edit sends only selected sample and preserves mask, geometry, rights, text and hints',async t=>{
 let calls=0;const {jobs,record,assets,slot}=await setup(t,{photo:true,imageProvider:async c=>{calls++;assert(Buffer.isBuffer(c.image));assert.equal(c.size,'1024x1024');assert(!Object.hasOwn(c,'design'));return {image:png,chargedCents:11,usage:{}};}});
 const locked=req({kind:'photo_edit',targetObjectId:slot});assert.throws(()=>jobs.start(record.id,locked),{code:'ai_photo_locked'});
 const r={...locked,preservePhotos:false};jobs.start(record.id,r);assert.equal((await finish(jobs,r.requestId)).status,'review');assert.equal(calls,1);
 const next=jobs.candidate(r.requestId),before=structuredClone(record.document),after=structuredClone(next);
 const oldAsset=before.config.localResources.photoExamples.at(-1).assetId,newAsset=after.config.localResources.photoExamples.at(-1).assetId;
 assert(assets.read(oldAsset).length);assert(assets.read(newAsset).length);delete before.config.localResources.photoExamples.at(-1).assetId;delete after.config.localResources.photoExamples.at(-1).assetId;assert.deepEqual(after,before);
});
test('image permissions and photo target checked before paid requests or reservations',async t=>{
 const {jobs,record}=await setup(t,{config:{...settings,imagesEnabled:false}});assert.throws(()=>jobs.start(record.id,req()),{code:'ai_images_disabled'});assert.equal(jobs.status().accountedCents,0);
 assert.throws(()=>aiRequest(req({targetObjectId:'unrelated'})),{code:'ai_request_invalid'});assert.throws(()=>aiRequest(req({kind:'unknown'})),{code:'ai_request_invalid'});
});
test('image and native design jobs share reservations; cancelled image never adds an element',async t=>{
 let release;const {jobs,record,repository}=await setup(t,{config:{...settings,monthlyLimitCents:AI_RESERVE_CENTS},imageProvider:async()=>new Promise(r=>{release=r;})});const r=req();jobs.start(record.id,r);
 assert.throws(()=>jobs.start(record.id,req({kind:'layout'})),{code:'ai_budget_exhausted'});await new Promise(r=>setTimeout(r,20));jobs.cancel(r.requestId);release({image:png,chargedCents:9,usage:{}});await new Promise(r=>setTimeout(r,30));
 assert.equal(jobs.get(r.requestId).status,'uncertain');assert.equal(jobs.status().accountedCents,AI_RESERVE_CENTS);assert.equal(repository.get(record.id).revision,1);
});
test('malformed image with confirmed cost cannot overwrite product; stale candidate cannot overwrite manual edit',async t=>{
 const {jobs,record,repository}=await setup(t,{imageProvider:async()=>({image:'bm90IGEgcGhvdG8=',chargedCents:9,usage:{}})}),r=req();jobs.start(record.id,r);assert.equal((await finish(jobs,r.requestId)).status,'invalid');assert.equal(jobs.status().accountedCents,9);assert.equal(repository.get(record.id).revision,1);
 const second=await setup(t),r2=req();second.jobs.start(second.record.id,r2);await finish(second.jobs,r2.requestId);second.repository.save(second.record.id,{...second.record.document,name:'Neu'},1);assert.throws(()=>second.jobs.apply(r2.requestId,1),{code:'revision_conflict'});
});
test('provider fixes endpoint, model, image count, quality and privacy boundary; confirms token breakdown',async()=>{
 for(const editing of [false,true]){let calls=0;const provider=createOpenAiImageProvider({apiKey:'synthetic-key-never-real',fetchImpl:async(url,o)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/images/'+(editing?'edits':'generations'));assert.equal(o.redirect,'error');
  const b=editing?Object.fromEntries(o.body):JSON.parse(o.body);assert.equal(b.model,AI_IMAGE_MODEL);assert.equal(String(b.n),'1');assert.equal(b.quality,'medium');assert.equal(b.output_format,'png');assert.equal(b.background,editing?'auto':'transparent');if(editing){assert.equal(b.input_fidelity,'high');assert.equal(b['image[]'].name,'musterfoto.png');}
  return Response.json({usage:{input_tokens:130,input_tokens_details:{text_tokens:100,image_tokens:30},output_tokens:1056,total_tokens:1186},data:[{b64_json:png}]});
 }});const r=await provider({kind:editing?'photo_edit':'image_generate',instruction:'Test',...(editing?{image:Buffer.from(png,'base64')}:{})},{});assert.equal(r.image,png);assert.equal(r.chargedCents,imageCost(100,30,1056));assert.equal(calls,1);}
});
test('inconsistent usage, arbitrary URLs and network errors never produce an applied image or a retry',async()=>{
 let calls=0;const fail=createOpenAiImageProvider({apiKey:'synthetic-key-never-real',fetchImpl:async()=>{calls++;throw Error('private upstream message');}});await assert.rejects(fail({kind:'image_generate',instruction:'x'},{}),{code:'ai_response_uncertain'});assert.equal(calls,1);
 const bad=createOpenAiImageProvider({apiKey:'synthetic-key-never-real',fetchImpl:async()=>Response.json({usage:{input_tokens:10,input_tokens_details:{text_tokens:1,image_tokens:1},output_tokens:1,total_tokens:11}})});await assert.rejects(bad({kind:'image_generate',instruction:'x'},{}),{code:'ai_usage_unconfirmed'});
 const url=createOpenAiImageProvider({apiKey:'synthetic-key-never-real',fetchImpl:async()=>Response.json({usage:{input_tokens:0,input_tokens_details:{text_tokens:0,image_tokens:0},output_tokens:1056,total_tokens:1056},data:[{url:'https://untrusted.example/image.png'}]})});assert.equal((await url({kind:'image_generate',instruction:'x'},{})).image,null);
});
