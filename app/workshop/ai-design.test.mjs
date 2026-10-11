import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';import {makeProductDocument,validateProductDocument,validateProductDesign} from './product-model.mjs';import {createProductRepository} from './repository.mjs';
import {aiRequest,aiContext,applyAiPlan,aiDigest} from './ai-design-plan.mjs';import {createAiDesignJobs} from './ai-design-jobs.mjs';import {createOpenAiDesignProvider,AI_RESERVE_CENTS,AI_MAX_INPUT,aiCost} from './openai-design-provider.mjs';
const seed=()=>makeProductDocument(syntheticSlate(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url))))));
const operation=(action,values={})=>({action,objectId:null,text:null,font:null,size:null,x:null,y:null,w:null,h:null,color:null,motifKey:null,...values});
const plan=()=>({summary:'Name weiter nach unten angeordnet.',operations:[operation('move',{objectId:'name',x:110,y:40})]});
const request=(extra={})=>aiRequest({requestId:'air_'+randomUUID(),expectedRevision:1,designId:'slate-test',instruction:'Name weiter nach unten.',preserveText:true,preservePhotos:true,...extra});
const config={enabled:true,monthlyLimitCents:10000,pricingValidUntil:'2026-11-01T00:00:00Z'};
const time=new Date('2026-10-11T12:00:00Z');
function setup(t,{provider=async()=>({plan:plan(),chargedCents:2,usage:{inputTokens:100,outputTokens:100}}),settings=config,filename=':memory:'}={}){
 const repository=createProductRepository({filename,validateDocument:d=>{d=validateProductDocument(d);for(const design of d.config.profile.designs)validateProductDesign(d,design);return d;}}),record=repository.create(seed());
 const jobs=createAiDesignJobs({filename,repository,provider,config:settings,clock:()=>time});t.after(()=>{jobs.close();repository.close();});return {repository,record,jobs};
}
async function finish(jobs,id){for(let i=0;i<100&&jobs.get(id).status==='running';i++)await new Promise(r=>setTimeout(r,5));return jobs.get(id);}

test('AI context contains editable metadata without image bytes, glyphs or prices',()=>{
 const context=aiContext({document:seed()},request());const text=JSON.stringify(context);assert(!text.includes('glyphs'));assert(!text.includes('basePrice'));assert(!text.includes('svgFragment'));assert.deepEqual(context.fonts,['Garamond Acryl','Freestyle Acryl']);assert.equal(context.design.objects[0].text,'Test');
});
test('validated edits preserve original, product geometry, price, rights and other elements',()=>{
 const d=seed(),before=structuredClone(d),result=applyAiPlan(d,request(),plan());assert.deepEqual(d,before);assert.equal(result.document.config.profile.designs[0].objects[0].y,40);assert.deepEqual(result.document.elementRights,d.elementRights);assert.deepEqual(result.document.config.profile.geometry,d.config.profile.geometry);assert.deepEqual(result.document.config.profile.optionGroups,d.config.profile.optionGroups);assert.deepEqual(result.document.config.profile.designs[0].objects[1],d.config.profile.designs[0].objects[1]);
});
test('text preservation, technical locks, invalid positions and unexpected fields reject whole plan',()=>{
 const d=seed();
 for(const op of [operation('text',{objectId:'name',text:'New'}),operation('move',{objectId:'name',x:-100,y:40}),{...operation('move',{objectId:'name',x:110,y:40}),price:1},operation('move',{objectId:'name',x:110,y:40,text:'Sneak'})])assert.throws(()=>applyAiPlan(d,request(),{summary:'x',operations:[op]}));
 d.config.profile.designs[0].objects[0].technicalLocked=true;assert.throws(()=>applyAiPlan(d,request(),plan()),/Konturen/);
});
test('native text remains editable, requires complete font and integer mm sizes',()=>{
 const d=seed();let result=applyAiPlan(d,request({preserveText:false}),{summary:'Text',operations:[operation('text',{objectId:'name',text:'Anna',size:6})]});assert.equal(result.document.config.profile.designs[0].objects[0].text,'Anna');validateProductDocument(result.document);
 for(const fields of [{size:6.5},{font:'missing'},{text:'🦄'}])assert.throws(()=>applyAiPlan(d,request({preserveText:false}),{summary:'x',operations:[operation('text',{objectId:'name',...fields})]}));
});
test('new native text uses existing authoring and safe customer rights',()=>{
 const d=seed(),r=applyAiPlan(d,request(),{summary:'Unterzeile',operations:[operation('add_text',{text:'Anna',font:'Garamond Acryl',size:4,x:110,y:110})]});const o=r.document.config.profile.designs[0].objects.at(-1);assert.equal(o.type,'text');assert.equal(o.text,'Anna');assert.equal(r.document.elementRights['slate-test'][o.id].move,false);validateProductDocument(r.document);
});
test('photo mask and original photo rights cannot be modified by a protected proposal',()=>{
 const d=seed();d.config.profile.designs[0].objects.push({id:'photo',type:'photoSlot',x:70,y:80,w:20,h:30,photoShape:'template',photoMaskAssetId:'a'.repeat(64)});
 assert.throws(()=>applyAiPlan(d,request(),{summary:'x',operations:[operation('move',{objectId:'photo',x:80,y:80})]}),/Fotofeld/);
 const r=applyAiPlan(d,request(),plan());assert.deepEqual(r.document.config.profile.designs[0].objects.at(-1),d.config.profile.designs[0].objects.at(-1));
});
test('no API connection means no paid job or reservation',t=>{let calls=0;const {jobs,record}=setup(t,{settings:null,provider:async()=>{calls++;}});assert.throws(()=>jobs.start(record.id,request()),{code:'ai_disabled'});assert.equal(calls,0);assert.equal(jobs.status().accountedCents,0);});
test('expiry stops new paid requests',t=>{const {jobs,record}=setup(t,{settings:{...config,pricingValidUntil:'2026-10-10'}});assert.throws(()=>jobs.start(record.id,request()),{code:'ai_disabled'});});
test('same request cannot bill twice; apply stores one version and retains original',async t=>{
 let calls=0;const {jobs,record,repository}=setup(t,{provider:async()=>{calls++;return {plan:plan(),chargedCents:3,usage:{}};}}),req=request();jobs.start(record.id,req);assert.equal(jobs.start(record.id,req).duplicate,true);assert.equal((await finish(jobs,req.requestId)).status,'review');assert.equal(repository.get(record.id).revision,1);assert.throws(()=>jobs.start(record.id,{...req,instruction:'other'}),{code:'ai_request_reused'});
 const applied=jobs.apply(req.requestId,1);assert.equal(applied.record.revision,2);assert.equal(jobs.apply(req.requestId,1).duplicate,true);assert.equal(repository.get(record.id).revision,2);assert.deepEqual(repository.get(record.id,{revision:1}).document,record.document);assert.equal(calls,1);assert.equal(jobs.status().accountedCents,3);
});
test('concurrent head change prevents applying a stale suggestion',async t=>{const {jobs,record,repository}=setup(t),req=request();jobs.start(record.id,req);await finish(jobs,req.requestId);repository.save(record.id,{...record.document,name:'Manual edit'},1);assert.throws(()=>jobs.apply(req.requestId,1),{code:'revision_conflict'});assert.equal(repository.get(record.id).document.name,'Manual edit');});
test('invalid proposals retain their cost without modifying a product',async t=>{const {jobs,record,repository}=setup(t,{provider:async()=>({chargedCents:4,usage:{},plan:{summary:'bad',operations:[operation('move',{objectId:'name',x:-999,y:1})]}})}),req=request();jobs.start(record.id,req);assert.equal((await finish(jobs,req.requestId)).status,'invalid');assert.equal(jobs.status().accountedCents,4);assert.equal(repository.get(record.id).revision,1);});
test('in-flight reservations prevent parallel budget overspend and cancelled requests are not refunded',async t=>{
 const {jobs,record}=setup(t,{settings:{...config,monthlyLimitCents:AI_RESERVE_CENTS},provider:async(c,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error()),{once:true}))}),req=request();jobs.start(record.id,req);assert.equal(jobs.status().accountedCents,AI_RESERVE_CENTS);assert.throws(()=>jobs.start(record.id,request()),{code:'ai_budget_exhausted'});assert.equal(jobs.cancel(req.requestId).status,'uncertain');await new Promise(r=>setTimeout(r,5));assert.equal(jobs.status().accountedCents,AI_RESERVE_CENTS);
});
test('unconfirmed usage blocks further generation',async t=>{const {jobs,record}=setup(t,{provider:async()=>({chargedCents:AI_RESERVE_CENTS+1})}),req=request();jobs.start(record.id,req);assert.equal((await finish(jobs,req.requestId)).status,'cost_review');assert.equal(jobs.status().enabled,false);});
test('journal recovers an apply interrupted between product save and job update',async t=>{
 const {jobs,record,repository}=setup(t),req=request();jobs.start(record.id,req);await finish(jobs,req.requestId);const document=jobs.candidate(req.requestId);repository.saveOnce(record.id,document,1,'ai:'+req.requestId,aiDigest({id:req.requestId,document}));assert.equal(jobs.apply(req.requestId,1).record.revision,2);assert.equal(repository.get(record.id).revision,2);
});
test('restart retains uncertain paid request and its reservation without resending',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-ai-')),filename=path.join(dir,'w.sqlite');let calls=0;const repo=createProductRepository({filename}),record=repo.create(seed());const opts={filename,repository:repo,config,clock:()=>time,provider:async(c,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error()),{once:true}));}};
 const first=createAiDesignJobs(opts),req=request();first.start(record.id,req);first.close();await new Promise(r=>setTimeout(r,5));const second=createAiDesignJobs(opts);assert.equal(second.get(req.requestId).status,'uncertain');assert.equal(second.start(record.id,req).duplicate,true);assert.equal(second.status().accountedCents,AI_RESERVE_CENTS);assert.equal(calls,1);second.close();repo.close();fs.rmSync(dir,{recursive:true});
});
test('provider sends one constrained non-stored request and accounts for full token usage',async()=>{
 let calls=0;const provider=createOpenAiDesignProvider({apiKey:'synthetic-key-never-real',fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.redirect,'error');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.tools,undefined);return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:500},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(plan())}]}]});}});
 const r=await provider(aiContext({document:seed()},request()),{signal:AbortSignal.timeout(1000)});assert.deepEqual(r.plan,plan());assert.equal(r.chargedCents,aiCost(1000,500));assert.equal(calls,1);
});
test('provider never refunds an incomplete response or retries a network error',async()=>{
 const provider=createOpenAiDesignProvider({apiKey:'synthetic-key-never-real',fetchImpl:async()=>Response.json({status:'incomplete',usage:{input_tokens:100,output_tokens:4096},output:[]})});const result=await provider({},{});assert.equal(result.plan,null);assert(result.chargedCents>0);
 let calls=0;const bad=createOpenAiDesignProvider({apiKey:'synthetic-key-never-real',fetchImpl:async()=>{calls++;throw Error('do not expose secret');}});await assert.rejects(bad({},{}),{code:'ai_response_uncertain'});assert.equal(calls,1);
 const usage=createOpenAiDesignProvider({apiKey:'synthetic-key-never-real',fetchImpl:async()=>Response.json({usage:{input_tokens:AI_MAX_INPUT+1,output_tokens:0}})});await assert.rejects(usage({},{}),{code:'ai_usage_unconfirmed'});
});
