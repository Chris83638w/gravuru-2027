// Issue230 main ONLY. No DB constructor, credentials, productSet, create or publish.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';

export const POLICY=Object.freeze({tenantId:'gravuru',storeId:'acryl',shopDomain:'gravuru-design.myshopify.com',productId:'cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',shopifyProductId:'gid://shopify/Product/16190784602492',beforeRevision:1,targetRevision:2,beforeDocumentSha256:'d2886e119ea9715af2b8905ebab8ecc1d199b07f8653476ce5e0fa26cd8cca79',targetDocumentSha256:'f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285',targetMetadataSha256:'52476368aa083eebf168c30f1f2ea54415b18f1d6c02b53e41173fa58a2ef075',mappingGzipSha256:'3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf',mappingJsonSha256:'3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591'});
export const EXECUTION_SCOPE=Object.freeze({shopifyProductUpdates:1,newProducts:0,newVariants:0,priceCorrections:158,labelCorrections:30,mutatedVariants:182,bindingUpdates:778,preservedRevision1:30,historicalPriceContractsPreserved:808,priceMetafieldUpdatesMax:1,catalogApprovals:1,publications:0,deletions:0});
export const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const sha=v=>createHash('sha256').update(v).digest('hex');
export const digest=v=>sha(canonical(v));
const clone=v=>structuredClone(v),need=(v,code)=>{if(!v)throw Object.assign(Error(code),{code});};
const ids=rows=>rows.map(x=>x.id??x.shopifyVariantId).sort();
const paired=id=>({shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:id});
const byId=rows=>new Map(rows.map(x=>[x.id??x.shopifyVariantId,x]));
const ordered=rows=>[...rows].sort((a,b)=>(a.id??a.shopifyVariantId).localeCompare(b.id??b.shopifyVariantId));
const money=v=>{need(/^\d+\.\d{2}$/.test(v),'money_format');return Number(v.replace('.',''));};
const maps=new WeakSet();
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function loadPinnedMapping(filename){
 const bytes=fs.readFileSync(filename);need(sha(bytes)===POLICY.mappingGzipSha256,'mapping_gzip_changed');
 const raw=gunzipSync(bytes,{maxOutputLength:4*1024*1024});need(sha(raw)===POLICY.mappingJsonSha256,'mapping_json_changed');
 const data=JSON.parse(raw);need(data.matches.length===778&&data.residualVariants.length===30,'mapping_count');
 const matches=data.matches.map(r=>({id:r.shopifyVariantId,options:r.nativeOptions,sku:r.sku,beforeCents:r.currentShopUnitCents,afterCents:r.targetUnitCents,beforeOptions:r.currentShopSelectedOptions,afterOptions:r.proposedSelectedOptions}));
 const residual=data.residualVariants.map(r=>({id:r.id,sku:r.sku,cents:money(r.price),options:r.selectedOptions}));
 need(data.matches.every(r=>r.shopifyProductId===POLICY.shopifyProductId)&&new Set([...matches,...residual].map(x=>x.id)).size===808,'mapping_identity');
 need(matches.filter(r=>r.beforeCents!==r.afterCents).length===158&&matches.filter(r=>!equal(r.beforeOptions,r.afterOptions)).length===30,'mapping_delta_count');
 const value=freeze({matches,residual});maps.add(value);return value;
}
function mappingGuard(mapping){need(maps.has(mapping),'pinned_mapping_required');}
function snapshotGuard(snapshot){
 need(snapshot?.shopDomain===POLICY.shopDomain&&snapshot.currency==='EUR'&&snapshot.productId===POLICY.shopifyProductId&&snapshot.status==='DRAFT'&&snapshot.complete===true,'shop_identity');
 need(Array.isArray(snapshot.variants)&&snapshot.variants.length===808&&new Set(snapshot.variants.map(v=>v.id)).size===808,'shop_808_required');
 need(snapshot.protectedProduct&&Array.isArray(snapshot.optionDefinitions),'shop_protection_fields');
 for(const v of snapshot.variants)need(/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/.test(v.id)&&Number.isSafeInteger(v.priceCents)&&v.priceCents>=0&&Array.isArray(v.selectedOptions)&&v.protectedVariant,'shop_variant_fields');
 return {...clone(snapshot),variants:ordered(snapshot.variants)};
}
// updatedAt/readAt are observation metadata, not protected commerce contents.
export function commerce(snapshot){const {updatedAt,readAt,...body}=snapshotGuard(snapshot);return body;}
function recordGuard(record,targetOnly=false){
 need(record?.tenantId===POLICY.tenantId&&record.storeId===POLICY.storeId&&record.productId===POLICY.productId&&record.status==='draft','native_identity');
 const before=record.revision===1&&record.documentSha256===POLICY.beforeDocumentSha256;
 const after=record.revision===2&&record.documentSha256===POLICY.targetDocumentSha256&&record.metadataSha256===POLICY.targetMetadataSha256;
 need(targetOnly?after:before||after,'native_revision_or_document_changed');
}
export function bindingView(row){
 need(row?.tenantId===POLICY.tenantId&&row.storeId===POLICY.storeId&&row.shopDomain===POLICY.shopDomain&&row.shopifyProductId===POLICY.shopifyProductId&&row.productId===POLICY.productId,'binding_identity');
 need(Number.isSafeInteger(row.assignmentRevision)&&row.assignmentRevision>0&&Number.isSafeInteger(row.unitCents)&&typeof row.bindingId==='string'&&row.options&&typeof row.documentSha256==='string','binding_fields');
 return Object.fromEntries(['tenantId','storeId','shopDomain','shopifyProductId','shopifyVariantId','productId','productRevision','documentSha256','bindingId','assignmentRevision','options','unitCents'].map(k=>[k,clone(row[k])]));
}
async function bindings(native,variantIds){const rows=(await native.resolveMany(variantIds.map(paired))).map(bindingView);need(equal(ids(rows),[...variantIds].sort()),'binding_readback_scope');return ordered(rows);}
function mutations(mapping){return mapping.matches.filter(r=>r.beforeCents!==r.afterCents||!equal(r.beforeOptions,r.afterOptions)).map(r=>({id:r.id,...(r.beforeCents!==r.afterCents?{price:(r.afterCents/100).toFixed(2)}:{}),...(!equal(r.beforeOptions,r.afterOptions)?{optionValues:r.afterOptions.map(o=>({optionName:o.name,name:o.value}))}:{})}));}
function targetCommerce(baseline,mapping){const result=clone(baseline),map=new Map(mapping.matches.map(r=>[r.id,r]));for(const row of result.variants){const target=map.get(row.id);if(target){row.priceCents=target.afterCents;row.selectedOptions=clone(target.afterOptions);}}return result;}
function pricedCommerce(intermediate,pricing){const result=clone(intermediate);result.protectedProduct.personalization={value:pricing.afterValue};return result;}
function pricingConnection(context,plan,mapping){need(context.pricing&&['validate','check','apply','arm','verifyHistorical','verifyBindings'].every(k=>typeof context.pricing[k]==='function'),'pricing_connection_required');context.pricing.validate(plan.pricing,{mapping,baselineBindings:plan.baselineBindings});}
function verifyPlan(plan,mapping){
 mappingGuard(mapping);const {planHash,...body}=plan;need(digest(body)===planHash,'plan_hash_changed');need(plan.schema==='gravuru-issue230-main-shop-bind-plan/v2'&&equal(plan.policy,POLICY)&&equal(plan.scope,EXECUTION_SCOPE),'plan_scope');
 need(equal(plan.mutations,mutations(mapping))&&equal(plan.targetCommerce,targetCommerce(plan.baselineCommerce,mapping)),'plan_payload_changed');
 need(plan.pricing&&equal(plan.targetPricingCommerce,pricedCommerce(plan.targetCommerce,plan.pricing))&&equal(plan.baselineCommerce.protectedProduct.personalization,plan.pricing.before===null?null:{value:plan.pricing.before.value}),'plan_pricing_commerce_changed');
 need(equal(ids(plan.baselineCommerce.variants),ids([...mapping.matches,...mapping.residual]))&&plan.baselineBindings.length===808&&new Set(plan.baselineBindings.map(b=>b.shopifyVariantId)).size===808,'plan_baseline_scope');
 need(plan.bindingBlocks.length===8&&equal(plan.bindingBlocks.map(b=>b.length),[100,100,100,100,100,100,100,78]),'binding_block_count');
 need(equal(plan.bindingBlocks.flat(),mapping.matches.map(m=>m.id)),'binding_block_scope');
 const initial=byId(plan.baselineCommerce.variants),bound=byId(plan.baselineBindings);
 for(const b of plan.baselineBindings){bindingView(b);need(b.productRevision===1&&b.documentSha256===POLICY.beforeDocumentSha256,'plan_binding_preimage');}
 for(const r of mapping.matches){const v=initial.get(r.id),b=bound.get(r.id);need(v.priceCents===r.beforeCents&&equal(v.selectedOptions,r.beforeOptions)&&v.protectedVariant.sku===r.sku&&equal(b.options,r.options)&&b.unitCents===r.beforeCents,'plan_mapping_preimage');}
 for(const r of mapping.residual){const v=initial.get(r.id),b=bound.get(r.id);need(v.priceCents===r.cents&&equal(v.selectedOptions,r.options)&&v.protectedVariant.sku===r.sku&&b.unitCents===r.cents,'plan_residual_preimage');}
 need(plan.baselineR1Approval?.kind==='catalog'&&typeof plan.baselineR1Approval.id==='string'&&typeof plan.baselineR1Approval.approvedAt==='string','plan_r1_approval');
}
async function catalogProbe(native,revision,variantIds){const rows=await native.catalogApprovals(revision,variantIds);need(Array.isArray(rows)&&rows.length===variantIds.length,'catalog_probe_scope');return rows;}
async function preserveR1Approval(native,plan){const rows=await catalogProbe(native,1,ids(plan.baselineBindings));need(rows.every(row=>equal(row,plan.baselineR1Approval)),'r1_approval_changed');}
export async function prepareMainExecution({mapping,shopify,native,pricing,clock=Date.now}){
 mappingGuard(mapping);const snapshot=snapshotGuard(await shopify.inspect()),record=await native.inspect();recordGuard(record);
 const baseline=commerce(snapshot),shop=byId(baseline.variants);
 need(equal(ids(baseline.variants),ids([...mapping.matches,...mapping.residual])),'shop_variant_ids_changed');
 for(const r of mapping.matches){const v=shop.get(r.id);need(v.priceCents===r.beforeCents&&equal(v.selectedOptions,r.beforeOptions)&&v.protectedVariant.sku===r.sku,'shop_mapping_preimage_changed');}
 for(const r of mapping.residual){const v=shop.get(r.id);need(v.priceCents===r.cents&&equal(v.selectedOptions,r.options)&&v.protectedVariant.sku===r.sku,'residual_shop_changed');}
 const baselineBindings=await bindings(native,ids(baseline.variants)),bound=byId(baselineBindings);
 for(const b of baselineBindings)need(b.productRevision===1&&b.documentSha256===POLICY.beforeDocumentSha256,'binding_preimage_changed');
 for(const r of mapping.matches){const b=bound.get(r.id);need(equal(b.options,r.options)&&b.unitCents===r.beforeCents,'binding_options_or_price_changed');}
 for(const r of mapping.residual)need(bound.get(r.id).unitCents===r.cents,'residual_binding_price_changed');
 const r1=await catalogProbe(native,1,ids(baselineBindings));need(r1[0]?.kind==='catalog'&&r1.every(row=>equal(row,r1[0])),'r1_approval_incomplete');
 need(typeof pricing?.prepare==='function','pricing_connection_required');const pricePlan=await pricing.prepare({mapping,baselineBindings});
 need(equal(baseline.protectedProduct.personalization,pricePlan.before===null?null:{value:pricePlan.before.value}),'pricing_commerce_preimage_changed');
 const bindingBlocks=[];for(let i=0;i<778;i+=100)bindingBlocks.push(mapping.matches.slice(i,i+100).map(r=>r.id));
 const intermediate=targetCommerce(baseline,mapping);
 const body={schema:'gravuru-issue230-main-shop-bind-plan/v2',preparedAt:new Date(clock()).toISOString(),policy:clone(POLICY),scope:clone(EXECUTION_SCOPE),baselineCommerce:baseline,targetCommerce:intermediate,targetPricingCommerce:pricedCommerce(intermediate,pricePlan),pricing:pricePlan,baselineBindings,baselineR1Approval:clone(r1[0]),mutations:mutations(mapping),bindingBlocks};
 need(body.mutations.length===182,'mutation_count');return {...body,planHash:digest(body)};
}
export function makeExecutionApproval(plan,decision){
 need(decision?.accepted===true&&typeof decision.actor==='string'&&decision.actor.trim()&&typeof decision.reference==='string'&&decision.reference.trim()&&Number.isFinite(Date.parse(decision.acceptedAt))&&/^[A-Za-z0-9_.:-]{1,160}$/.test(decision.catalogApprovalId??''),'explicit_approval_required');
 const body={schema:'gravuru-issue230-main-shop-bind-approval/v1',planHash:plan.planHash,scope:clone(EXECUTION_SCOPE),decision:clone(decision)};return {...body,approvalHash:digest(body)};
}
function approvalGuard(plan,approval){const {approvalHash,...body}=approval??{};need(approvalHash===digest(body)&&equal(approval,makeExecutionApproval(plan,approval.decision)),'approval_changed');}
function state(events,key){return events.filter(e=>e.key===key).at(-1)??null;}
function doneState(events,key){return state(events,key)?.state==='done';}
function targetBinding(row,old,wanted){return row.productRevision===2&&row.documentSha256===POLICY.targetDocumentSha256&&row.assignmentRevision===old.assignmentRevision+1&&row.unitCents===wanted.afterCents&&equal(row.options,wanted.options);}
async function preserveResidual(native,plan,mapping){const before=plan.baselineBindings.filter(b=>mapping.residual.some(r=>r.id===b.shopifyVariantId));need(equal(await bindings(native,mapping.residual.map(r=>r.id)),ordered(before)),'residual_binding_changed');}
async function inspectStep(context,plan,mapping,key,approval){
 if(key==='shop-variants'){const current=commerce(await context.shopify.inspect());return {before:equal(current,plan.baselineCommerce),after:equal(current,plan.targetCommerce)||equal(current,plan.targetPricingCommerce),receipt:{commerceSha256:digest(current)}};}
 if(key==='shop-pricing'){const current=commerce(await context.shopify.inspect()),p=await context.pricing.check(plan.pricing);return {before:p.before&&equal(current,plan.targetCommerce),after:p.after&&equal(current,plan.targetPricingCommerce),receipt:{pricingPlanHash:plan.pricing.pricingPlanHash,priceRevision:plan.pricing.priceRevision,metafieldSha256:plan.pricing.afterSha256}};}
 if(key==='catalog-main-r2'){
  const variantIds=ids(plan.baselineBindings),rows=await catalogProbe(context.native,2,variantIds),wanted=new Set(mapping.matches.map(r=>r.id));
  const after=rows.every((row,i)=>wanted.has(variantIds[i])?row?.kind==='catalog'&&row.id===approval.decision.catalogApprovalId:row===null);
  return {before:rows.every(row=>row===null),after,receipt:{approvalId:approval.decision.catalogApprovalId,coveredRevision2:rows.filter(Boolean).length,coverageSha256:digest(variantIds.map((id,i)=>({id,approval:rows[i]})))}};
 }
 const index=Number(key.split(':')[1]);need(Number.isInteger(index)&&index>=0&&index<8,'journal_step');const block=plan.bindingBlocks[index],current=await bindings(context.native,block),old=byId(plan.baselineBindings),wanted=byId(mapping.matches);
 const after=current.every(r=>targetBinding(r,old.get(r.shopifyVariantId),wanted.get(r.shopifyVariantId)));if(after)context.pricing.verifyBindings(plan.pricing,current);
 return {before:current.every(r=>equal(r,old.get(r.shopifyVariantId))),after,receipt:{assignments:current}};
}
function journalGuard(journal,plan){need(journal?.planHash===plan.planHash&&typeof journal.events==='function'&&typeof journal.append==='function','execution_journal_required');}
// Reconcile writes only operator journal, never Shopify/bindings. It never retries a mutation.
export async function reconcileMainExecution(context,{mapping,plan,approval,journal,key}){
 verifyPlan(plan,mapping);approvalGuard(plan,approval);journalGuard(journal,plan);recordGuard(await context.native.inspect(),true);await preserveResidual(context.native,plan,mapping);await preserveR1Approval(context.native,plan);
 pricingConnection(context,plan,mapping);await context.pricing.verifyHistorical(plan.pricing);
 const prior=state(journal.events(),key);need(prior?.state==='started','reconcile_started_required');const result=await inspectStep(context,plan,mapping,key,approval);
 need(result.before||result.after,'reconcile_mixed_or_drifted');const outcome=result.after?'done':'not-applied';journal.append({key,state:outcome,reconciled:true,receipt:result.receipt});return {key,state:outcome,shopifyWrites:0,bindingWrites:0};
}
export async function applyMainExecution(context,{mapping,plan,approval,journal,execute=false}){
 verifyPlan(plan,mapping);need(execute===true,'explicit_execute_required');approvalGuard(plan,approval);journalGuard(journal,plan);
 pricingConnection(context,plan,mapping);await context.pricing.verifyHistorical(plan.pricing);
 const initialPricing=await context.pricing.check(plan.pricing);need(initialPricing.before||initialPricing.after,'pricing_preimage_changed');
 recordGuard(await context.native.inspect(),true);await preserveResidual(context.native,plan,mapping);await preserveR1Approval(context.native,plan);
 // Catch baseline drift before the Shopify write, not first at a later native block.
 const currentBindings=byId(await bindings(context.native,ids(plan.baselineBindings))),oldBindings=byId(plan.baselineBindings),expectedRows=byId(mapping.matches);
 for(let i=0;i<8;i++){const step=state(journal.events(),'bindings:'+i);need(step?.state!=='started','reconcile_required');for(const id of plan.bindingBlocks[i])need(step?.state==='done'?targetBinding(currentBindings.get(id),oldBindings.get(id),expectedRows.get(id)):equal(currentBindings.get(id),oldBindings.get(id)),'binding_preimage_changed');}
 const priorShop=state(journal.events(),'shop-variants');need(priorShop?.state!=='started','reconcile_required');
 const shopState=await inspectStep(context,plan,mapping,'shop-variants');
 if(doneState(journal.events(),'shop-variants'))need(shopState.after,'completed_shop_changed');
 else{
  need(shopState.before,'shop_preimage_changed');journal.append({key:'shop-variants',state:'started',payloadSha256:digest(plan.mutations),approvalHash:approval.approvalHash});
  // Exactly one write attempt. A throw or lost response leaves started; next call requires reconcile.
  await context.shopify.updateVariants({productId:POLICY.shopifyProductId,variants:clone(plan.mutations),allowPartialUpdates:false});
  const after=await inspectStep(context,plan,mapping,'shop-variants');need(after.after,'shop_write_readback_failed');journal.append({key:'shop-variants',state:'done',receipt:after.receipt});
 }
 const pricingKey='shop-pricing';need(state(journal.events(),pricingKey)?.state!=='started','reconcile_required');
 const pricingState=await inspectStep(context,plan,mapping,pricingKey);
 if(doneState(journal.events(),pricingKey))need(pricingState.after,'completed_pricing_changed');
 else{need(pricingState.before,'pricing_preimage_changed');journal.append({key:pricingKey,state:'started',pricingPlanHash:plan.pricing.pricingPlanHash,approvalHash:approval.approvalHash});await context.pricing.apply(plan.pricing);const after=await inspectStep(context,plan,mapping,pricingKey);need(after.after,'pricing_write_readback_failed');journal.append({key:pricingKey,state:'done',receipt:after.receipt});}
 const wanted=byId(mapping.matches),old=byId(plan.baselineBindings);
 for(let index=0;index<plan.bindingBlocks.length;index++){
  const key='bindings:'+index,block=plan.bindingBlocks[index];need(state(journal.events(),key)?.state!=='started','reconcile_required');recordGuard(await context.native.inspect(),true);await preserveResidual(context.native,plan,mapping);
  const current=await inspectStep(context,plan,mapping,key);
  if(doneState(journal.events(),key)){need(current.after,'completed_binding_changed');continue;}
  need(current.before,'binding_preimage_changed');
  await context.pricing.arm(plan.pricing);
  const selections=block.map(id=>({shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:id,productId:POLICY.productId,productRevision:2,options:clone(wanted.get(id).options)}));
  // check -> persist immediately for THIS block; no prechecking of subsequent blocks.
  const checked=await context.native.check({selections});need(checked?.status==='id-plan-ready'&&checked.plan&&equal(checked.plan.entries.map(e=>e.shopifyVariantId),block),'native_check_not_ready');
  for(const e of checked.plan.entries){const r=wanted.get(e.shopifyVariantId);need(e.productId===POLICY.productId&&e.productRevision===2&&e.documentSha256===POLICY.targetDocumentSha256&&e.baseUnitCents===r.afterCents&&equal(e.options,r.options),'native_plan_changed');}
  const expectedHeads=block.map(id=>({shopifyVariantId:id,revision:old.get(id).assignmentRevision}));
  journal.append({key,state:'started',count:block.length,approvalHash:approval.approvalHash});
  const persisted=context.native.persist({plan:checked.plan,expectedHeads});need(!persisted?.then,'synchronous_native_persist_required');
  const after=await inspectStep(context,plan,mapping,key);need(after.after,'binding_write_readback_failed');journal.append({key,state:'done',receipt:after.receipt});
 }
 recordGuard(await context.native.inspect(),true);await preserveResidual(context.native,plan,mapping);await context.pricing.verifyHistorical(plan.pricing);need((await context.pricing.check(plan.pricing)).after,'final_pricing_changed');need(equal(commerce(await context.shopify.inspect()),plan.targetPricingCommerce),'final_shop_changed');
 const finalBindings=await bindings(context.native,ids(plan.baselineBindings));for(const row of finalBindings){const r=wanted.get(row.shopifyVariantId);if(r)need(targetBinding(row,old.get(row.shopifyVariantId),r),'final_binding_changed');}
 return {schema:'gravuru-issue230-main-shop-bind-receipt/v2',planHash:plan.planHash,approvalHash:approval.approvalHash,scope:clone(EXECUTION_SCOPE),shopifyVariantIdsPreserved:808,revision2Bindings:778,revision1BindingsPreserved:30,historicalPriceContractsPreserved:808,priceRevision:plan.pricing.priceRevision,pricingPlanHash:plan.pricing.pricingPlanHash,commerceSha256:digest(plan.targetPricingCommerce),bindingReadbackSha256:digest(finalBindings),catalogApprovalPerformed:false,published:false};
}

// Deliberately separate final phase. Calls the existing native approval exactly for main R2.
export async function completeMainCatalogApproval(context,{mapping,plan,approval,journal,execute=false}){
 verifyPlan(plan,mapping);need(execute===true,'explicit_execute_required');approvalGuard(plan,approval);journalGuard(journal,plan);
 need(['shop-variants','shop-pricing',...plan.bindingBlocks.map((_,i)=>'bindings:'+i)].every(key=>doneState(journal.events(),key)),'main_readback_not_complete');
 pricingConnection(context,plan,mapping);await context.pricing.verifyHistorical(plan.pricing);need((await context.pricing.check(plan.pricing)).after,'final_pricing_changed');
 recordGuard(await context.native.inspect(),true);await preserveResidual(context.native,plan,mapping);await preserveR1Approval(context.native,plan);
 need(equal(commerce(await context.shopify.inspect()),plan.targetPricingCommerce),'final_shop_changed');
 for(let i=0;i<8;i++)need((await inspectStep(context,plan,mapping,'bindings:'+i)).after,'final_binding_changed');
 const key='catalog-main-r2';need(state(journal.events(),key)?.state!=='started','reconcile_required');const before=await inspectStep(context,plan,mapping,key,approval);
 if(doneState(journal.events(),key))need(before.after,'completed_catalog_changed');
 else{
  need(before.before,'catalog_preimage_changed');journal.append({key,state:'started',approvalHash:approval.approvalHash,approvalId:approval.decision.catalogApprovalId});
  const result=context.native.approveCatalog({approvalId:approval.decision.catalogApprovalId});need(!result?.then,'synchronous_catalog_approval_required');
  const after=await inspectStep(context,plan,mapping,key,approval);need(after.after&&after.receipt.coveredRevision2===778,'catalog_readback_failed');await preserveR1Approval(context.native,plan);await preserveResidual(context.native,plan,mapping);
  journal.append({key,state:'done',receipt:after.receipt});
 }
 return {schema:'gravuru-issue230-main-catalog-receipt/v1',planHash:plan.planHash,approvalHash:approval.approvalHash,approvalId:approval.decision.catalogApprovalId,revision2Coverage:778,revision1CoveragePreserved:808,revision1ActiveBindingsPreserved:30,published:false,shopifyWrites:0};
}
