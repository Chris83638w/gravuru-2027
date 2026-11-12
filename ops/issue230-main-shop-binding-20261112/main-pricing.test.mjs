import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {POLICY,loadPinnedMapping,digest,sha} from './main-operator.mjs';
import {loadPricingFunctions,buildMainPricingPlan,createMainPricingProviderGate,createMainPricingConnection,createMainFunctionProbe} from './main-pricing.mjs';
const root=import.meta.dirname,workspace=path.resolve(root,'../../..');
const codeRoot=path.resolve(process.env.GRAVURU_NATIVE_ROOT||path.join(workspace,'work/issue230-integration-candidate'));
const native=await loadPricingFunctions(codeRoot);
const {cartTransformRun}=await import(pathToFileURL(path.join(codeRoot,'ops/shopify/master-release/cart_transform_run.mjs')).href);
const mapping=loadPinnedMapping(path.join(root,'variant-mapping.preview.json.gz'));
const targetFile=process.env.GRAVURU_MAIN_TARGET||path.join(workspace,'work/restabschluss/main-target-preserved-metadata/target-document.preview.json.gz');
const targetDocument=JSON.parse(gunzipSync(fs.readFileSync(targetFile)));assert.equal(digest(targetDocument),POLICY.targetDocumentSha256);
const raw=fs.readFileSync(path.join(root,'fixtures/personalization.value.json'),'utf8');assert.equal(sha(raw),'7c997f49153d43a937a75501ed5bc016eda1003e129d1735528b801ee7962cf5');
const before=JSON.parse(raw),readback=JSON.parse(fs.readFileSync(path.join(root,'fixtures/app-personalization-lesebeleg.json'))),groups=JSON.parse(fs.readFileSync(path.join(root,'fixtures/r1-preisvertraege-gruppen.json')));
const observedField={...readback.metafeld,value:raw};
const rows=fs.readFileSync(path.join(root,'fixtures/varianten-808.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(line=>{const [id,group,sku,price,r1,base,target,changed]=line.split(',');return {id:'gid://shopify/ProductVariant/'+id,group,sku,price:+price,r1:+r1,base:+base,target:+target,changed:+changed};});
assert.equal(rows.length,808);
const baselineBindings=rows.map(row=>({shopifyVariantId:row.id,bindingId:'synthetic-binding-'+row.id,unitCents:row.r1}));
// IDs below are explicitly synthetic because the public export groups contracts.
const historicalContracts=rows.map(row=>({shopifyVariantId:row.id,bindingId:'synthetic-binding-'+row.id,contract:{...groups.vertragsform,baseCents:row.base}}));
for(const row of historicalContracts)assert.equal(digest(row.contract),groups.gruppen.find(g=>g.baseCents===row.contract.baseCents).normalisiertSha256);
// Minimal R1 CONFIG projection from the measured contract; NOT the full R1
// document. Production connection separately checks the real full R1 digest.
const revision1Document={config:{extraMotifCents:169,photo:{extraPriceCents:0},quantityTiers:before.quantityTiers,quantityTierScope:'complete-unit'}};
const functionEvidence={schema:'issue230-active-pricing-function-evidence/v1',observedAt:'2026-11-12T11:00:00Z',releaseId:'SYNTHETIC-TEST-ONLY',wasmSha256:'1'.repeat(64),buildSourceSha256:'2'.repeat(64),reviewEvidenceSha256:'3'.repeat(64),formats:['v2','history','variantSequence','variantsFromRevision','variantDeltas','valueInput']};
const input=()=>({mapping,baselineBindings,historicalContracts,observedField,functionEvidence,targetDocument,revision1Document,native});
let proof;
test('actual808 source prices -> bounded v2 with full immutable R1 history and only778 new contracts',()=>{
 const p=buildMainPricingPlan(input()),encoded=JSON.parse(p.afterValue),current=native.expandPricingVariants(encoded),old=native.resolvedPricingHistory(encoded);
 assert.equal(p.priceRevision,2);assert.equal(p.expectedContracts.length,778);assert.equal(p.historicalContracts.length,808);assert.equal(p.nullHistoricalContracts,0);assert.ok(Buffer.byteLength(p.afterValue)<=10000);assert.deepEqual(old,[before]);
 assert.equal(Object.keys(current.variants).length,808);
 for(const r of mapping.matches)assert.equal(current.variants[r.id.split('/').at(-1)],r.afterCents);
 for(const r of mapping.residual)assert.equal(current.variants[r.id.split('/').at(-1)],r.cents);
 for(const r of p.expectedContracts){assert.equal(r.contract.revision,'2');assert.equal(r.contract.extraPhotoCents,999);assert.equal(r.contract.extraLogoCents,1299);assert.equal(r.contract.moduleProfile.modules.photo,true);assert.equal(r.contract.moduleProfile.modules.logo,true);}
 proof={sourceBytes:Buffer.byteLength(raw),targetBytes:Buffer.byteLength(p.afterValue),targetSha256:p.afterSha256,syntheticFunctionEvidence:true,actualActiveFunctionVerified:false,currentRevision:p.priceRevision,topVariants:808,historicalR1Variants:Object.keys(old[0].variants).length,newBindingContracts:778,preservedActiveR1:30,requiredFormats:p.requiredFormats};
});
test('missing or insufficient Function evidence and changed actual R1 contract fail before a plan',()=>{
 assert.throws(()=>buildMainPricingPlan({...input(),functionEvidence:null}),{code:'pricing_function_evidence_required'});
 assert.throws(()=>buildMainPricingPlan({...input(),functionEvidence:{...functionEvidence,formats:['v2','history']}}),{code:'pricing_function_format_unproven'});
 const bad=structuredClone(historicalContracts);bad[0].contract.extraPhotoCents=1;assert.throws(()=>buildMainPricingPlan({...input(),historicalContracts:bad}),{code:'pricing_historical_contract_mismatch'});
 const missing=input();delete missing.observedField;assert.throws(()=>buildMainPricingPlan(missing),{code:'pricing_observation_required'});
});
test('explicitly observed absent contracts remain null; absence is not fabricated evidence',()=>{
 const nulls=historicalContracts.map(r=>({...r,contract:null}));const p=buildMainPricingPlan({...input(),observedField:null,historicalContracts:nulls});assert.equal(p.priceRevision,1);assert.equal(p.nullHistoricalContracts,808);assert.equal(p.retainedHistoricalContracts,0);assert.ok(p.historicalContracts.every(r=>r.contract===null));
 assert.throws(()=>buildMainPricingPlan({...input(),observedField:null}),{code:'pricing_historical_revision_missing'});
});
test('existing identical target contract is reused byte-for-byte without revision churn',()=>{
 const p=buildMainPricingPlan(input()),next=buildMainPricingPlan({...input(),observedField:{...observedField,value:p.afterValue}});assert.equal(next.priceRevision,2);assert.equal(next.changed,false);assert.equal(next.afterValue,p.afterValue);
});
test('synchronous provider refuses unarmed, wrong identity/base and R1 residue, then revokes',()=>{
 const p=buildMainPricingPlan(input()),gate=createMainPricingProviderGate(),r=mapping.matches[0],e={productId:POLICY.productId,productRevision:2,shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:r.id,baseUnitCents:r.afterCents};assert.throws(()=>gate.provider(e),{code:'pricing_provider_not_armed'});gate.arm(native.expandPricingVariants(JSON.parse(p.afterValue)),p.expectedContracts);assert.equal(gate.provider(e).variants[r.id.split('/').at(-1)],r.afterCents);for(const patch of [{productRevision:1},{productId:'cfg_other'},{shopifyProductId:'gid://shopify/Product/9'},{shopifyVariantId:mapping.residual[0].id}])assert.throws(()=>gate.provider({...e,...patch}),{code:'pricing_provider_not_armed'});assert.throws(()=>gate.provider({...e,baseUnitCents:1}),{code:'pricing_provider_base_changed'});gate.disarm();assert.throws(()=>gate.provider(e));
});
function line(id,revision,{quantity=1,motifs=0,uploads=0,logos}={}){return {id:'line-'+id,quantity,revision:{value:String(revision)},motifs:{value:String(motifs)},uploads:{value:String(uploads)},...(logos===undefined?{}:{logos:{value:String(logos)}}),designFile:{value:'synthetic-design'},merchandise:{__typename:'ProductVariant',id,product:{id:POLICY.shopifyProductId,pricing:{value:proofValue}}}};}
let proofValue;
test('existing real Function source prices all808 old and778 new lines plus uploads/tiers and rejects unknown revision',()=>{
 const p=buildMainPricingPlan(input());proofValue=p.afterValue;
 const run=lines=>cartTransformRun({presentmentCurrencyRate:'1',cart:{lines}}).operations.map(o=>Math.round(Number(o.lineUpdate.price.adjustment.fixedPricePerUnit.amount)*100));
 assert.deepEqual(run(rows.map(r=>line(r.id,1))),rows.map(r=>r.r1));
 assert.deepEqual(run(mapping.matches.map(r=>line(r.id,2,{logos:0}))),mapping.matches.map(r=>r.afterCents));
 const r=mapping.matches[0];for(const quantity of [1,3,5,10]){const unit=r.afterCents+169+999+1299,percent=quantity===1?0:quantity===3?5:quantity===5?10:15;assert.deepEqual(run([line(r.id,2,{quantity,motifs:1,uploads:1,logos:1})]),[Math.floor((2*unit*(100-percent)+100)/200)]);}
 assert.throws(()=>run([line(r.id,999,{logos:0})]));
});
test('production connection rejects a synthetic full R1 document rather than trusting the test projection',async()=>{
 const connection=createMainPricingConnection({native,repository:{tenantId:POLICY.tenantId,get(){return {id:POLICY.productId,revision:1,document:revision1Document};}},orders:{tenantId:POLICY.tenantId,bindingPricing(id){return historicalContracts.find(r=>r.bindingId===id).contract;}},shopify:{async readPricing(){return observedField;},async writePricingOnce(){throw Error('no writes');}},targetDocument,evidence:{observedField,historicalContracts,functionEvidence},verifyActiveFunction:async()=>functionEvidence,clock:()=>Date.parse(functionEvidence.observedAt)});await assert.rejects(connection.prepare({mapping,baselineBindings}),{code:'pricing_document_pin'});
});
test('connection rereads all808 immutable contracts before writes, guards provider, and rejects a changed residual',async()=>{
 // Only the POLICY dependency gets a synthetic R1-document hash because the
 // public operator export deliberately omits the full private R1 document.
 // All connection function bytes are unchanged; production has no override.
 const actualModule=pathToFileURL(path.join(root,'main-operator.mjs')).href;
 const policyModule='data:text/javascript;base64,'+Buffer.from(`export * from ${JSON.stringify(actualModule)};export const POLICY=${JSON.stringify({...POLICY,beforeDocumentSha256:digest(revision1Document)})};`).toString('base64');
 const source=fs.readFileSync(path.join(root,'main-pricing.mjs'),'utf8');assert.equal(source.split("'./main-operator.mjs'").length,2);
 const redirected=source.replace("'./main-operator.mjs'",JSON.stringify(policyModule));
 const {createMainPricingConnection:connectionFactory}=await import('data:text/javascript;base64,'+Buffer.from(redirected).toString('base64'));
 const db=new Map(historicalContracts.map(r=>[r.bindingId,structuredClone(r.contract)]));let reads=0,writes=0,current=structuredClone(observedField),head=1;
 const repository={tenantId:POLICY.tenantId,get(id,options){assert.equal(id,POLICY.productId);const rev=options?.revision??head;return {id,revision:rev,document:rev===1?revision1Document:targetDocument};}};
 const orders={tenantId:POLICY.tenantId,bindingPricing(id){reads++;assert.ok(db.has(id));return structuredClone(db.get(id));}};
 const shopify={async readPricing(){return structuredClone(current);},async writePricingOnce({before,value}){assert.equal(reads,808*2);assert.equal(before.compareDigest,current.compareDigest);writes++;current={...current,value,compareDigest:'4'.repeat(64)};}};
 const connection=connectionFactory({native,repository,orders,shopify,targetDocument,evidence:{observedField,historicalContracts,functionEvidence},verifyActiveFunction:async()=>functionEvidence,clock:()=>Date.parse(functionEvidence.observedAt)});
 const p=await connection.prepare({mapping,baselineBindings});assert.equal(reads,808);assert.equal(writes,0);
 const entry={productId:POLICY.productId,productRevision:2,shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:mapping.matches[0].id,baseUnitCents:mapping.matches[0].afterCents};
 assert.throws(()=>connection.provider(entry),{code:'pricing_provider_not_armed'});
 await connection.apply(p);assert.equal(writes,1);head=2;await connection.arm(p);assert.equal(reads,808*3);
 const contract=native.capturePersonalization(connection.provider(entry),{variantId:entry.shopifyVariantId.split('/').at(-1),baseCents:entry.baseUnitCents,document:targetDocument});db.set('new-synthetic-binding',contract);
 connection.verifyBindings(p,[{...entry,bindingId:'new-synthetic-binding'}]);db.set('new-synthetic-binding',null);assert.throws(()=>connection.verifyBindings(p,[{...entry,bindingId:'new-synthetic-binding'}]),{code:'pricing_new_binding_contract_changed'});
 const rest=historicalContracts.find(r=>r.shopifyVariantId===mapping.residual[0].id);db.get(rest.bindingId).baseCents++;
 await assert.rejects(connection.arm(p),{code:'pricing_historical_binding_changed'});assert.throws(()=>connection.provider(entry),{code:'pricing_provider_not_armed'});assert.equal(writes,1);
 db.set(rest.bindingId,structuredClone(rest.contract));const former=historicalContracts.find(r=>r.shopifyVariantId===mapping.matches[1].id);db.get(former.bindingId).extraPhotoCents++;
 await assert.rejects(connection.verifyHistorical(p),{code:'pricing_historical_binding_changed'});
});
test.after(()=>{if(proof){fs.writeFileSync(path.join(root,'pricing-proof-local.json'),JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(path.join(root,'pricing-value.preview.json'),proofValue);}});

test('Function probe accepts fresh timestamp/proof hash on identical release and caches only its bounded observation',async()=>{let now=Date.parse(functionEvidence.observedAt),calls=0;const probe=createMainFunctionProbe({clock:()=>now,maxAgeMs:1000,verifyActiveFunction:async()=>{calls++;return {...functionEvidence,observedAt:new Date(now).toISOString(),reviewEvidenceSha256:String(calls).repeat(64)};}});await probe(functionEvidence,['v2','history']);now+=500;await probe(functionEvidence,['v2','history']);assert.equal(calls,1);now+=501;const next=await probe(functionEvidence,['v2','history']);assert.equal(calls,2);assert.notEqual(next.observedAt,functionEvidence.observedAt);assert.equal(next.reviewEvidenceSha256,'2'.repeat(64));});
test('Function probe rejects real identity drift and stale observations',async()=>{const now=Date.parse(functionEvidence.observedAt);for(const field of ['releaseId','wasmSha256','buildSourceSha256']){const fresh={...functionEvidence,[field]:field==='releaseId'?'different':'9'.repeat(64)};const probe=createMainFunctionProbe({clock:()=>now,verifyActiveFunction:async()=>fresh});await assert.rejects(probe(functionEvidence,['v2']),{code:'pricing_active_function_changed'});}const stale=createMainFunctionProbe({clock:()=>now+60001,verifyActiveFunction:async()=>functionEvidence});await assert.rejects(stale(functionEvidence,['v2']),{code:'pricing_function_observation_stale'});});
