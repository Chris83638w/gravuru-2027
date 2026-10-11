import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';import {makeProductDocument} from './product-model.mjs';import {createProductRepository} from './repository.mjs';import {createAiDesignJobs} from './ai-design-jobs.mjs';import {createAiBatchJobs} from './ai-batch-jobs.mjs';import {AI_RESERVE_CENTS} from './openai-design-provider.mjs';
const seed=()=>makeProductDocument(syntheticSlate(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url))))));
const plan={summary:'Anordnung angepasst.',operations:[{action:'move',objectId:'name',text:null,font:null,size:null,x:110,y:40,w:null,h:null,color:null,motifKey:null}]};
const request=records=>({batchId:'aib_'+randomUUID(),kind:'layout',instruction:'Name weiter unten.',preserveText:true,preservePhotos:true,products:records.map(r=>({productId:r.id,expectedRevision:r.revision,designId:'slate-test'}))});
const wait=async(fn)=>{for(let i=0;i<1500;i++){const r=fn();if(r)return r;await new Promise(r=>setTimeout(r,5));}throw Error('Queue timeout');};
function setup(t,{count=3,provider=async()=>({plan,chargedCents:2,usage:{synthetic:true}}),limit=10000,durable=false}={}){
 const dir=durable?fs.mkdtempSync(path.join(os.tmpdir(),'g27-ai-batch-')):null,filename=dir?path.join(dir,'workshop.sqlite'):':memory:',repository=createProductRepository({filename}),records=Array.from({length:count},(_,i)=>repository.create({...seed(),name:'Produkt '+(i+1)}));
 const opts={filename,repository,config:{enabled:true,monthlyLimitCents:limit,pricingValidUntil:'2026-11-01T00:00:00Z'},provider:async(...args)=>({usage:{synthetic:true},...await provider(...args)}),clock:()=>new Date('2026-10-11T15:00:00Z')};let aiJobs=createAiDesignJobs(opts),batch=createAiBatchJobs({filename,repository,aiJobs,intervalMs:5});
 const result={repository,records,get jobs(){return aiJobs;},get batch(){return batch;},restart(){batch.close();aiJobs.close();aiJobs=createAiDesignJobs(opts);batch=createAiBatchJobs({filename,repository,aiJobs,intervalMs:5});}};
 t.after(()=>{batch.close();aiJobs.close();repository.close();if(dir)fs.rmSync(dir,{recursive:true});});return result;
}
test('one prompt yields separate drafts; apply and repeats preserve originals and prices',async t=>{
 let calls=0,active=0,max=0;const s=setup(t,{provider:async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,10));active--;return {plan,chargedCents:2};}}),req=request(s.records);
 s.batch.start(req);assert.equal(s.batch.start(req).duplicate,true);const b=await wait(()=>{const b=s.batch.get(req.batchId);return b.status==='completed'&&b;});assert.equal(calls,3);assert.equal(max,1);assert(b.items.every(i=>i.job.status==='review'));assert.equal(b.budget.accountedCents,6);assert(s.records.every(r=>s.repository.get(r.id).revision===1));
 const i=b.items[0],r=s.jobs.apply(i.jobId,1);assert.equal(r.record.revision,2);assert.equal(s.jobs.apply(i.jobId,1).duplicate,true);assert.deepEqual(r.record.document.config.profile.optionGroups,s.records[0].document.config.profile.optionGroups);assert.deepEqual(s.repository.get(i.productId,{revision:1}).document,s.records[0].document);
 assert.equal(s.batch.start(req).duplicate,true);assert.throws(()=>s.batch.start({...req,instruction:'anders'}),{code:'ai_batch_reused'});
});
test('preflight blocks mixed materials/geometries, archives, missing designs and duplicate selections before any call',t=>{
 let calls=0;const s=setup(t,{provider:async()=>{calls++;return {plan,chargedCents:1};}}),req=request(s.records);
 const bad=structuredClone(s.records[1].document);bad.config.profile.geometry.width=230;s.repository.save(s.records[1].id,bad,1);
 assert.throws(()=>s.batch.start(req),{code:'ai_stale'});req.products[1].expectedRevision=2;assert.throws(()=>s.batch.start(req),{code:'ai_batch_invalid'});
 const one=request([s.records[0]]);assert.throws(()=>s.batch.start({...one,products:[one.products[0],one.products[0]]}),{code:'ai_batch_invalid'});
 assert.throws(()=>s.batch.start({...one,products:[{...one.products[0],designId:'missing'}]}),{code:'ai_design_unsupported'});assert.equal(calls,0);assert.equal(s.batch.list().length,0);
});
test('100 products with 3 intervening edits yield 97 drafts and 3 explicit errors, no duplicates',async t=>{
 let calls=0;const s=setup(t,{count:100,provider:async()=>{calls++;return {plan,chargedCents:1};}}),req=request(s.records);s.batch.start(req);
 for(const r of s.records.slice(0,3))s.repository.save(r.id,{...r.document,name:'Manuelle Änderung'},1);
 const b=await wait(()=>{const b=s.batch.get(req.batchId);return b.status==='completed'&&b;});assert.equal(b.items.filter(i=>i.status==='error').length,3);assert.equal(b.items.filter(i=>i.job?.status==='review').length,97);assert.equal(calls,97);assert.equal(b.budget.accountedCents,97);s.batch.start(req);assert.equal(calls,97);assert(s.records.slice(0,3).every(r=>s.repository.get(r.id).document.name==='Manuelle Änderung'));
});
test('one invalid proposal does not lose other proposals',async t=>{
 let calls=0;const s=setup(t,{provider:async()=>({plan:++calls===2?null:plan,chargedCents:2})}),req=request(s.records);s.batch.start(req);const b=await wait(()=>{const b=s.batch.get(req.batchId);return b.status==='completed'&&b;});assert.deepEqual(b.items.map(i=>i.job.status),['review','invalid','review']);assert.equal(b.budget.accountedCents,6);
});
test('cancel retains ready draft, aborts only current request and never starts remaining product',async t=>{
 let calls=0;const s=setup(t,{provider:async(c,{signal})=>{calls++;if(calls===1)return {plan,chargedCents:2};return new Promise((r,j)=>signal.addEventListener('abort',()=>j(Error('abort')),{once:true}));}}),req=request(s.records);s.batch.start(req);await wait(()=>calls===2);const b=s.batch.cancel(req.batchId);assert.equal(b.status,'cancelled');assert.deepEqual(b.items.map(i=>i.job?.status||i.status),['review','uncertain','cancelled']);await new Promise(r=>setTimeout(r,20));assert.equal(calls,2);assert.equal(s.jobs.status().accountedCents,AI_RESERVE_CENTS+2);assert.equal(s.jobs.apply(b.items[0].jobId,1).record.revision,2);
});
test('shared budget pauses before next request without reserving the entire queue',async t=>{
 let calls=0;const s=setup(t,{limit:AI_RESERVE_CENTS,provider:async()=>{calls++;return {plan,chargedCents:2};}}),req=request(s.records);s.batch.start(req);const b=await wait(()=>{const b=s.batch.get(req.batchId);return b.status==='paused'&&b;});assert.equal(calls,1);assert.equal(b.items[1].status,'queued');assert.equal(b.budget.accountedCents,2);assert.throws(()=>s.batch.resume(req.batchId),{code:'ai_budget_exhausted'});
});
test('uncertain response pauses, explicit resume skips it and unconfirmed cost blocks resume',async t=>{
 let calls=0;const s=setup(t,{provider:async()=>{if(++calls===1)throw Error('network');return {plan,chargedCents:2};}}),req=request(s.records);s.batch.start(req);await wait(()=>s.batch.get(req.batchId).status==='paused');s.batch.resume(req.batchId);const b=await wait(()=>{const b=s.batch.get(req.batchId);return b.status==='completed'&&b;});assert.equal(calls,3);assert.equal(b.items[0].job.status,'uncertain');assert.equal(b.budget.accountedCents,AI_RESERVE_CENTS+4);
 const u=setup(t,{provider:async()=>({plan,chargedCents:AI_RESERVE_CENTS+1})}),r=request(u.records);u.batch.start(r);await wait(()=>u.batch.get(r.batchId).status==='paused');assert.throws(()=>u.batch.resume(r.batchId),{code:'ai_disabled'});
});
test('restart requires explicit resume and never repeats an already sent request',async t=>{
 let calls=0;const s=setup(t,{durable:true,provider:async(c,{signal})=>{if(++calls===1)return new Promise((r,j)=>signal.addEventListener('abort',()=>j(Error()),{once:true}));return {plan,chargedCents:2};}}),req=request(s.records);s.batch.start(req);await wait(()=>calls===1);s.restart();assert.equal(s.batch.get(req.batchId).status,'paused');await new Promise(r=>setTimeout(r,20));assert.equal(calls,1);s.batch.resume(req.batchId);await wait(()=>s.batch.get(req.batchId).status==='completed');assert.equal(calls,3);assert.equal(s.batch.get(req.batchId).items[0].job.status,'uncertain');
});
test('concurrent batch admission and stale apply never overwrite newer work',async t=>{
 const s=setup(t),req=request(s.records);s.batch.start(req);assert.throws(()=>s.batch.start(request(s.records)),{code:'ai_batch_busy'});const b=await wait(()=>{const b=s.batch.get(req.batchId);return b.status==='completed'&&b;});const r=s.records[0];s.repository.save(r.id,{...r.document,name:'Neuerer Stand'},1);assert.throws(()=>s.jobs.apply(b.items[0].jobId,1));assert.equal(s.repository.get(r.id).document.name,'Neuerer Stand');assert.equal(s.jobs.get(b.items[0].jobId).status,'review');
});
