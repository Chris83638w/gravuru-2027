// Main-only operator connection. No DB constructor, credentials or live defaults.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {POLICY,digest,sha} from './main-operator.mjs';
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
const clone=v=>structuredClone(v),hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const numeric=id=>id.split('/').at(-1);
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const sorted=rows=>[...rows].sort((a,b)=>a.shopifyVariantId.localeCompare(b.shopifyVariantId));
export async function loadPricingFunctions(codeRoot){
 const pins=JSON.parse(fs.readFileSync(new URL('./pricing-pins.json',import.meta.url)));const result={};
 for(const [file,pin] of Object.entries(pins)){const resolved=path.resolve(codeRoot,file);need(sha(fs.readFileSync(resolved))===pin,'pricing_native_source_changed');Object.assign(result,await import(pathToFileURL(resolved).href));}return result;
}
function field(value){
 // null is an explicitly observed absence, never missing evidence.
 if(value===null)return null;
 need(value&&typeof value.value==='string'&&value.type==='json'&&value.namespace==='app--423276544001'&&value.key==='personalization'&&/^gid:\/\/shopify\/Metafield\/[1-9][0-9]*$/.test(value.id)&&hex(value.compareDigest),'pricing_field_evidence');
 return {id:value.id,namespace:value.namespace,key:value.key,type:value.type,value:value.value,compareDigest:value.compareDigest};
}
function functionGuard(evidence,required){
 need(evidence?.schema==='issue230-active-pricing-function-evidence/v1'&&typeof evidence.releaseId==='string'&&evidence.releaseId&&Number.isFinite(Date.parse(evidence.observedAt))&&hex(evidence.wasmSha256)&&hex(evidence.buildSourceSha256)&&hex(evidence.reviewEvidenceSha256)&&Array.isArray(evidence.formats),'pricing_function_evidence_required');
 need(required.every(format=>evidence.formats.includes(format)),'pricing_function_format_unproven');
}
export function createMainFunctionProbe({verifyActiveFunction,clock=Date.now,maxAgeMs=60000}){
 need(typeof verifyActiveFunction==='function'&&typeof clock==='function'&&Number.isSafeInteger(maxAgeMs)&&maxAgeMs>=1&&maxAgeMs<=60000,'pricing_function_probe_configuration');let cached=null;
 const identity=e=>({releaseId:e.releaseId,wasmSha256:e.wasmSha256,buildSourceSha256:e.buildSourceSha256});
 return async(expected,required)=>{
  functionGuard(expected,required);let now=clock();need(Number.isSafeInteger(now),'pricing_function_clock');
  if(!cached||now<Date.parse(cached.observedAt)||now-Date.parse(cached.observedAt)>maxAgeMs){cached=null;const fresh=await verifyActiveFunction();now=clock();functionGuard(fresh,required);const age=now-Date.parse(fresh.observedAt);need(Number.isSafeInteger(now)&&age>=0&&age<=maxAgeMs,'pricing_function_observation_stale');cached=clone(fresh);}
  functionGuard(cached,required);need(equal(identity(cached),identity(expected)),'pricing_active_function_changed');
  // Timestamp and raw-probe hash are observation evidence, not release identity.
  return {observedAt:cached.observedAt,reviewEvidenceSha256:cached.reviewEvidenceSha256};
 };
}
function formats(pricing){
 const required=new Set(['v2']);
 if(pricing.history?.length)required.add('history');
 for(const p of [pricing,...pricing.history??[]]){if(p.schema.endsWith('/v3'))required.add('v3');for(const key of ['variantSequence','variantsFromRevision','variantDeltas'])if(p[key]!==undefined)required.add(key);}
 if([...required].some(v=>['variantSequence','variantsFromRevision','variantDeltas'].includes(v)))required.add('valueInput');
 return [...required].sort();
}
function expanded(pricing,native){
 if(pricing===null)return [];
 const {history,...current}=native.expandPricingVariants(pricing);
 return [current,...native.resolvedPricingHistory(pricing)];
}
function parse(value,native){
 if(value===null)return {pricing:null,contracts:[]};let pricing;try{pricing=JSON.parse(value.value);}catch{need(false,'pricing_json_invalid');}
 need(pricing?.enabled===true&&pricing.productId===POLICY.shopifyProductId&&pricing.currency==='EUR'&&Number.isSafeInteger(pricing.revision)&&pricing.revision>0,'pricing_product_contract');
 const contracts=expanded(pricing,native);need(contracts.every(c=>['gravuru-personalization-pricing/v1','gravuru-personalization-pricing/v2','gravuru-personalization-pricing/v3'].includes(c.schema)&&c.enabled===true&&c.productId===POLICY.shopifyProductId&&c.currency==='EUR'&&Number.isSafeInteger(c.revision)&&c.revision>0&&c.variants&&typeof c.variants==='object'),'pricing_history_invalid');return {pricing,contracts};
}
function contractsGuard(rows,baseline){
 need(Array.isArray(rows)&&rows.length===808&&new Set(rows.map(r=>r.bindingId)).size===808,'pricing_historical_scope');
 const by=new Map(baseline.map(b=>[b.bindingId,b]));
 for(const row of rows){const b=by.get(row.bindingId);need(b&&row.shopifyVariantId===b.shopifyVariantId&&Object.hasOwn(row,'contract')&&(row.contract===null||typeof row.contract==='object'&&!Array.isArray(row.contract)),'pricing_historical_identity');}
 return sorted(clone(rows));
}
export function buildMainPricingPlan({mapping,baselineBindings,observedField,historicalContracts,functionEvidence,targetDocument,revision1Document,native}){
 need(Object.hasOwn(arguments[0],'observedField'),'pricing_observation_required');
 // Pure planner; the authenticated connection pins both full native documents
 // before calling this function. A serialized plan alone grants no authority.
 const before=field(observedField),{pricing:current,contracts:old}=parse(before,native),historical=contractsGuard(historicalContracts,baselineBindings);
 const baseline=new Map(baselineBindings.map(b=>[b.bindingId,b]));
 for(const row of historical){if(row.contract===null)continue;const b=baseline.get(row.bindingId),contract=old.find(c=>String(c.revision)===String(row.contract.revision));need(contract,'pricing_historical_revision_missing');need(equal(native.capturePersonalization(contract,{variantId:numeric(b.shopifyVariantId),baseCents:b.unitCents,document:revision1Document}),row.contract),'pricing_historical_contract_mismatch');}
 const c=targetDocument.config;
 need(c.extraMotifCents===169&&c.photo?.extraPriceCents===999&&c.moduleProfile?.modules.photo===true&&c.moduleProfile.modules.logo===true,'pricing_target_upload_contract');
 const variants=Object.fromEntries([...mapping.matches.map(v=>[numeric(v.id),v.afterCents]),...mapping.residual.map(v=>[numeric(v.id),v.cents])]);
 const newBody={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:POLICY.shopifyProductId,currency:'EUR',variants,extraMotifCents:c.extraMotifCents,extraPhotoCents:c.photo.extraPriceCents,extraLogoCents:1299,...(Object.hasOwn(c,'quantityTiers')?{quantityTiers:clone(c.quantityTiers),quantityTierScope:c.quantityTierScope}:{})};
 // Reuse only an already exact current semantic contract. Otherwise retain ALL
 // current/history contracts (including null historical native bindings as null).
 const {revision:oldRevision,...oldBody}=old[0]??{};
 const reuse=current!==null&&equal(oldBody,newBody);
 const revision=reuse?oldRevision:Math.max(0,...old.map(p=>p.revision))+1;
 need(Number.isSafeInteger(revision)&&revision<10000000000,'pricing_revision_exhausted');
 const target={...newBody,revision,...(reuse?(old.length>1?{history:old.slice(1)}:{}):old.length?{history:old}: {})};
 const encoded=native.encodeFunctionPricing(target),required=formats(encoded.pricing);functionGuard(functionEvidence,required);
 need(equal(expanded(encoded.pricing,native),expanded(target,native)),'pricing_compaction_changed_content');
 for(const prior of old){const retained=expanded(encoded.pricing,native).find(p=>p.revision===prior.revision);need(equal(retained,prior),'pricing_history_lost');}
 const selected=native.expandPricingVariants(encoded.pricing),expectedContracts=mapping.matches.map(v=>({shopifyVariantId:v.id,contract:native.capturePersonalization(selected,{variantId:numeric(v.id),baseCents:v.afterCents,document:targetDocument})}));
 // An exact semantic reuse preserves the original field bytes and compareDigest.
 const afterValue=reuse&&Buffer.byteLength(before.value,'utf8')<=10000?before.value:encoded.value;
 const value={schema:'issue230-main-pricing-plan/v1',before,afterValue,afterSha256:sha(afterValue),changed:before===null||before.value!==afterValue,priceRevision:revision,requiredFormats:required,functionEvidence:clone(functionEvidence),historicalContracts:historical,expectedContracts,oldContractsSha256:digest(old),nullHistoricalContracts:historical.filter(r=>r.contract===null).length,retainedHistoricalContracts:old.length,variants:808,newBindings:778,preservedActiveR1:30};
 return freeze({...value,pricingPlanHash:digest(value)});
}
export function verifyPricingPlan(plan){
 const {pricingPlanHash,...body}=plan??{};need(body.schema==='issue230-main-pricing-plan/v1'&&digest(body)===pricingPlanHash&&hex(body.afterSha256)&&sha(body.afterValue)===body.afterSha256&&body.variants===808&&body.newBindings===778&&body.preservedActiveR1===30&&body.historicalContracts?.length===808&&body.expectedContracts?.length===778,'pricing_plan_changed');functionGuard(body.functionEvidence,body.requiredFormats);
}
// This synchronous gate is only armed by the connection after authenticated
// readback. Exported separately to exercise the pre-bind boundary without a DB.
export function createMainPricingProviderGate(){
 let armed=null;
 return Object.freeze({arm(pricing,expectedContracts){armed={pricing:freeze(clone(pricing)),expected:new Map(expectedContracts.map(r=>[r.shopifyVariantId,clone(r.contract)]))};},disarm(){armed=null;},provider(entry){need(armed&&entry.productId===POLICY.productId&&entry.productRevision===2&&entry.shopifyProductId===POLICY.shopifyProductId&&armed.expected.has(entry.shopifyVariantId),'pricing_provider_not_armed');const wanted=armed.expected.get(entry.shopifyVariantId);need(entry.baseUnitCents===wanted.baseCents,'pricing_provider_base_changed');return armed.pricing;}});
}
export function createMainPricingConnection({native,repository,orders,shopify,targetDocument,evidence,verifyActiveFunction,clock=Date.now,functionEvidenceMaxAgeMs=60000}){
 need(repository?.tenantId===POLICY.tenantId&&orders?.tenantId===POLICY.tenantId&&typeof orders.bindingPricing==='function'&&typeof shopify?.readPricing==='function'&&typeof shopify?.writePricingOnce==='function'&&typeof verifyActiveFunction==='function','pricing_connection_required');
 need(evidence&&Object.hasOwn(evidence,'observedField')&&Array.isArray(evidence.historicalContracts),'pricing_observation_required');
 need(digest(targetDocument)===POLICY.targetDocumentSha256,'pricing_document_pin');
 function revision1Document(){const r=repository.get(POLICY.productId,{revision:1});need(r.id===POLICY.productId&&r.revision===1&&digest(r.document)===POLICY.beforeDocumentSha256,'pricing_document_pin');return r.document;}
 const gate=createMainPricingProviderGate();let trustedPlanHash=null;
 const probe=createMainFunctionProbe({verifyActiveFunction,clock,maxAgeMs:functionEvidenceMaxAgeMs});
 const readHistorical=rows=>sorted(rows.map(row=>({bindingId:row.bindingId,shopifyVariantId:row.shopifyVariantId,contract:orders.bindingPricing(row.bindingId)})));
 async function active(plan){return probe(plan?.functionEvidence??evidence.functionEvidence,plan?.requiredFormats??['v2']);}
 function trusted(plan){verifyPricingPlan(plan);need(trustedPlanHash===plan.pricingPlanHash,'pricing_plan_not_reconstructed');}
 function validate(plan,{mapping,baselineBindings}){const rebuilt=buildMainPricingPlan({mapping,baselineBindings,observedField:evidence.observedField,historicalContracts:evidence.historicalContracts,functionEvidence:evidence.functionEvidence,targetDocument,revision1Document:revision1Document(),native});need(equal(rebuilt,plan),'pricing_plan_evidence_changed');trustedPlanHash=plan.pricingPlanHash;}
 async function state(plan){trusted(plan);const actual=field(await shopify.readPricing());return {before:equal(actual,plan.before),after:actual!==null&&actual.value===plan.afterValue&&(plan.before===null||actual.id===plan.before.id),actual};}
 async function verifyHistorical(plan){verifyPricingPlan(plan);need(equal(readHistorical(plan.historicalContracts),plan.historicalContracts),'pricing_historical_binding_changed');}
 async function prepare({mapping,baselineBindings}){
  await active();const actual=field(await shopify.readPricing());need(equal(actual,field(evidence.observedField)),'pricing_observed_field_changed');
  need(equal(readHistorical(baselineBindings),contractsGuard(evidence.historicalContracts,baselineBindings)),'pricing_observed_bindings_changed');
  const plan=buildMainPricingPlan({mapping,baselineBindings,observedField:actual,historicalContracts:evidence.historicalContracts,functionEvidence:evidence.functionEvidence,targetDocument,revision1Document:revision1Document(),native});trustedPlanHash=plan.pricingPlanHash;return plan;
 }
 async function check(plan){await active(plan);await verifyHistorical(plan);return state(plan);}
 async function apply(plan){gate.disarm();await active(plan);await verifyHistorical(plan);const s=await state(plan);need(s.before,'pricing_cas_preimage_changed');if(plan.changed)await shopify.writePricingOnce({before:plan.before,value:plan.afterValue});const after=await state(plan);need(after.after,'pricing_cas_readback_failed');}
 async function arm(plan){gate.disarm();await active(plan);await verifyHistorical(plan);need((await state(plan)).after,'pricing_readback_required');const current=repository.get(POLICY.productId);need(current.revision===2&&digest(current.document)===POLICY.targetDocumentSha256,'pricing_target_changed');gate.arm(native.expandPricingVariants(JSON.parse(plan.afterValue)),plan.expectedContracts);}
 function verifyBindings(plan,rows){verifyPricingPlan(plan);const expected=new Map(plan.expectedContracts.map(r=>[r.shopifyVariantId,r.contract]));for(const row of rows){need(row.productId===POLICY.productId&&row.productRevision===2&&expected.has(row.shopifyVariantId)&&equal(orders.bindingPricing(row.bindingId),expected.get(row.shopifyVariantId)),'pricing_new_binding_contract_changed');}}
 return Object.freeze({prepare,validate,check,apply,arm,provider:gate.provider,verifyHistorical,verifyBindings,disarm:gate.disarm});
}
