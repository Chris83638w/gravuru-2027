// Operator-owned, synchronous native update review. No DB/network constructors.
// The default policy is the one existing main product. Only tests inject another policy.
import {createHash} from 'node:crypto';
import fs from 'node:fs';

export const MAIN_POLICY=Object.freeze({tenantId:'gravuru',shopDomain:'gravuru-design.myshopify.com',storeId:'acryl',shopifyProductId:'gid://shopify/Product/16190784602492',productId:'cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',expectedRevision:1,importKey:'issue230.main-acryl.16190784602492.rev1-to2',expectedPreimageBindingSha256:'d2886e119ea9715af2b8905ebab8ecc1d199b07f8653476ce5e0fa26cd8cca79',targetProductGroupSha256:'ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407',targetBindingSha256:'f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285'});
const HEX=/^[a-f0-9]{64}$/;
const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
const need=(value,code,message=code)=>{if(!value)fail(code,message);};
const sync=v=>{need(!v||typeof v.then!=='function','async_context');return v;};
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
function data(v){
 if(v===null||typeof v==='boolean'||typeof v==='string')return;
 if(typeof v==='number'){need(Number.isFinite(v),'non_json_number');return;}
 if(Array.isArray(v)){for(const x of v)data(x);return;}
 need(plain(v),'non_json_object');for(const [k,x]of Object.entries(v)){need(!['__proto__','constructor','prototype'].includes(k),'unsafe_key');data(x);}
}
export const stringCanonical=v=>Array.isArray(v)?'['+v.map(stringCanonical).join(',')+']':plain(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stringCanonical(v[k])).join(',')+'}':JSON.stringify(v);
const objectCanonical=v=>Array.isArray(v)?v.map(objectCanonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,objectCanonical(v[k])])):v;
export const digest=v=>{data(v);return sha256(stringCanonical(v));};
export const documentPins=d=>({productGroupSha256:sha256(JSON.stringify(objectCanonical(d))),idBindingSha256:digest(d)});
const clone=v=>structuredClone(v);
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const same=(a,b,code)=>need(digest(a)===digest(b),code);
function hash(value,label){need(typeof value==='string'&&HEX.test(value),'invalid_hash',label);return value;}
function text(value,label){need(typeof value==='string'&&value.trim()&&value.length<=2000,'invalid_text',label);return value;}
function exact(o,keys,code){need(plain(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|'),code);}
function resourcePins(p){
 data(p);exact(p,['categoryIds','categoryAssignments','settings','profiles','resolutionSha256','productionProfile'],'resource_pin_fields');
 need(Array.isArray(p.categoryIds)&&p.categoryIds.every(x=>typeof x==='string')&&new Set(p.categoryIds).size===p.categoryIds.length,'category_pins');
 need(Array.isArray(p.categoryAssignments)&&p.categoryAssignments.length===p.categoryIds.length,'category_assignment_pins');
 for(let i=0;i<p.categoryAssignments.length;i++){const c=p.categoryAssignments[i];exact(c,['id','present','sha256'],'category_pin_fields');need(c.id===p.categoryIds[i]&&typeof c.present==='boolean','category_pin_order');if(c.present)hash(c.sha256,'category hash');else need(c.sha256===null,'absent_category_hash');}
 exact(p.settings,['revision','sha256'],'settings_pin_fields');need(Number.isSafeInteger(p.settings.revision)&&p.settings.revision>0,'settings_revision');hash(p.settings.sha256,'settings hash');
 need(Array.isArray(p.profiles)&&p.profiles.length<=32,'profile_pins');const ids=new Set();
 for(const x of p.profiles){exact(x,['type','id','revision','sha256'],'profile_pin_fields');need(['fonts','motifs','colors','bestsellers'].includes(x.type)&&typeof x.id==='string'&&x.id&&Number.isSafeInteger(x.revision)&&x.revision>0,'profile_pin');hash(x.sha256,'profile hash');const k=x.type+':'+x.id;need(!ids.has(k),'duplicate_profile_pin');ids.add(k);}
 hash(p.resolutionSha256,'native profile resolution hash');
 if(p.productionProfile!==null){exact(p.productionProfile,['id','revision','sha256'],'production_pin_fields');text(p.productionProfile.id,'production id');need(Number.isSafeInteger(p.productionProfile.revision)&&p.productionProfile.revision>0,'production_revision');hash(p.productionProfile.sha256,'production hash');}
 return p;
}
function targetPins(target,policy){const p=documentPins(target);need(p.productGroupSha256===policy.targetProductGroupSha256&&p.idBindingSha256===policy.targetBindingSha256,'target_changed');return p;}
function sourceEvidence(e){
 exact(e,['categoryComparisonSha256','categoryComparisonPassed','nativeValidatorContract','nativeValidatorSourceSha256'],'evidence_fields');
 hash(e.categoryComparisonSha256,'real category report');need(e.categoryComparisonPassed===true,'category_evidence_missing');
 need(e.nativeValidatorContract==='native-product+resources+assets+manufacturing','native_validator_contract');hash(e.nativeValidatorSourceSha256,'native validator source');return e;
}
function origin(o){
 exact(o,['excelFile','excelSha256','v9PlanId','v9PlanHash'],'origin_fields');text(o.excelFile,'origin Excel');hash(o.excelSha256,'origin Excel SHA');text(o.v9PlanId,'v9 plan ID');hash(o.v9PlanHash,'v9 plan hash');return o;
}
function observation(o,target,policy){
 exact(o,['observedAt','scope','preimage','targetMetadataSha256','resourcePins','evidence'],'observation_fields');same(o.scope,policy,'scope_changed');
 need(Number.isFinite(Date.parse(o.observedAt)),'observation_time');exact(o.preimage,['revision','status','publishedRevision','documentBindingSha256','metadataSha256'],'preimage_fields');
 need(o.preimage.revision===policy.expectedRevision&&o.preimage.status==='draft'&&o.preimage.publishedRevision===null,'preimage_state');
 need(o.preimage.documentBindingSha256===policy.expectedPreimageBindingSha256,'preimage_changed');hash(o.preimage.metadataSha256,'preimage metadata');hash(o.targetMetadataSha256,'target metadata');
 resourcePins(o.resourcePins);same(o.resourcePins.categoryIds,target.categoryIds,'category_list_changed');sourceEvidence(o.evidence);
}
export function prepareUpdateReview({target,observation:observed,origin:original},{policy=MAIN_POLICY}={}){
 data(target);targetPins(target,policy);observation(observed,target,policy);origin(original);
 const importFingerprint=digest({action:'update',productId:policy.productId,expectedRevision:policy.expectedRevision,preimage:observed.preimage,document:target,targetMetadataSha256:observed.targetMetadataSha256,resourcePins:observed.resourcePins});
 const body={schema:'gravuru-operator-product-update-review/v1',kind:'operator-update-review-not-product-group-plan',scope:clone(policy),origin:clone(original),observation:clone(observed),target:documentPins(target),importFingerprint,
  authorizationScope:{nativeProductUpdates:1,shopifyWrites:0,bindingWrites:0,catalogApprovals:0,publications:0,deletions:0},
  downstreamOnly:{plannedBindingRepoints:778,preservedOldBindings:30,knownShopPriceCorrections:158,labelAffectedVariants:30,requiresSeparateExplicitScope:true}};
 return freeze({...body,reviewHash:digest(body)});
}
export function verifyUpdateReview(review,target,{policy=MAIN_POLICY}={}){
 exact(review,['schema','kind','scope','origin','observation','target','importFingerprint','authorizationScope','downstreamOnly','reviewHash'],'review_fields');
 const rebuilt=prepareUpdateReview({target,observation:review.observation,origin:review.origin},{policy});same(review,rebuilt,'review_changed');return rebuilt;
}
export function makeApprovalEvidence({review,acceptedReviewHash,excelAddendum,decision},target,{policy=MAIN_POLICY}={}){
 verifyUpdateReview(review,target,{policy});need(acceptedReviewHash===review.reviewHash,'accept_exact_review');
 exact(excelAddendum,['file','sha256'],'excel_fields');text(excelAddendum.file,'final Excel filename');hash(excelAddendum.sha256,'final Excel SHA');
 exact(decision,['accepted','actor','quote','source','recordedAt'],'decision_fields');need(decision.accepted===true,'explicit_acceptance_required');text(decision.actor,'actor');text(decision.quote,'actual literal user response');text(decision.source,'actual response source');need(Number.isFinite(Date.parse(decision.recordedAt)),'decision_time');
 const body={schema:'gravuru-operator-product-update-approval/v1',reviewHash:review.reviewHash,excelAddendum:clone(excelAddendum),decision:clone(decision),authorizationScope:clone(review.authorizationScope)};
 return freeze({...body,approvalHash:digest(body)});
}
export function verifyApprovalEvidence(approval,review,target,excelBytes,{policy=MAIN_POLICY}={}){
 exact(approval,['schema','reviewHash','excelAddendum','decision','authorizationScope','approvalHash'],'approval_fields');
 const rebuilt=makeApprovalEvidence({review,acceptedReviewHash:approval.reviewHash,excelAddendum:approval.excelAddendum,decision:approval.decision},target,{policy});same(approval,rebuilt,'approval_changed');need(sha256(excelBytes)===approval.excelAddendum.sha256,'excel_changed');return rebuilt;
}
export function writeNewJson(filename,value){data(value);const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');const fd=fs.openSync(filename,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return {sha256:sha256(bytes),bytes:bytes.length};}

// This wraps the EXISTING native repository snapshotMetadata callback. It must
// be supplied when the operator constructs/injects a dedicated native repository.
// No app/SQL constructor is called here, and no cross-DB transaction is invented.
const guards=new WeakMap();
export function guardedMetadataSnapshot(nativeSnapshotMetadata,readResourcePins){
 need(typeof nativeSnapshotMetadata==='function'&&typeof readResourcePins==='function','metadata_callbacks');
 const state={calls:0,writeCalls:0,phase:'idle',review:null};
 const callback=document=>{
  state.calls++;
  const metadata=sync(nativeSnapshotMetadata(document));data(metadata);
  if(state.review){
   same(documentPins(document),state.review.target,'snapshot_document_changed');
   need(digest(metadata)===state.review.observation.targetMetadataSha256,'snapshot_metadata_changed');
   same(resourcePins(sync(readResourcePins(document))),state.review.observation.resourcePins,'snapshot_resources_changed');
   if(state.phase==='write')state.writeCalls++;
  }
  return clone(metadata);
 };
 guards.set(callback,state);return callback;
}
function nativeContext(context){
 const {repository,metadataSnapshot,readResourcePins}=context||{};
 need(repository&&['validate','previewMetadata','get','head','importItem','importBatch'].every(k=>typeof repository[k]==='function'),'native_repository_required');
 need(guards.has(metadataSnapshot)&&typeof readResourcePins==='function','guarded_metadata_required');return {repository,state:guards.get(metadataSnapshot)};
}
function metadata(repository,state,target){const calls=state.calls;const value=sync(repository.previewMetadata(target));need(state.calls===calls+1,'metadata_guard_not_wired');return value;}
function profileRead(context,target){return resourcePins(sync(context.readResourcePins(target)));}
export function captureUpdateObservation(context,target,{evidence,policy=MAIN_POLICY,clock=Date.now}={}){
 const {repository,state}=nativeContext(context);need(state.phase==='idle','guard_in_use');need(repository.tenantId===policy.tenantId,'repository_tenant');targetPins(target,policy);sourceEvidence(evidence);
 const head=repository.head(policy.productId),saved=repository.get(policy.productId,{revision:policy.expectedRevision});
 need(head.revision===policy.expectedRevision&&head.status==='draft'&&saved.publishedRevision===null,'capture_head_changed');
 const validated=sync(repository.validate(target));same(documentPins(validated),documentPins(target),'validation_changed_document');
 const pins=profileRead(context,target),meta=metadata(repository,state,target);
 same(profileRead(context,target),pins,'capture_resources_changed');
 const result={observedAt:new Date(clock()).toISOString(),scope:clone(policy),preimage:{revision:saved.revision,status:saved.status,publishedRevision:saved.publishedRevision,documentBindingSha256:documentPins(saved.document).idBindingSha256,metadataSha256:digest(saved.metadata)},targetMetadataSha256:digest(meta),resourcePins:pins,evidence:clone(evidence)};
 observation(result,target,policy);return freeze(result);
}
export function executeApprovedUpdate(context,{review,approval,target,excelAddendumBytes,execute=false},{policy=MAIN_POLICY,clock=Date.now}={}){
 need(execute===true,'execute_not_explicit');target=clone(target);review=clone(review);approval=clone(approval);
 verifyUpdateReview(review,target,{policy});verifyApprovalEvidence(approval,review,target,excelAddendumBytes,{policy});
 const {repository,state}=nativeContext(context);need(repository.tenantId===policy.tenantId,'repository_tenant');need(state.phase==='idle','guard_in_use');
 let replay=false,checkedAt=null;state.review=review;state.phase='verify';state.writeCalls=0;
 try{
  // Detect a missing metadata hook BEFORE any import. The native insert uses
  // that same callback again inside its transaction, so a drift rolls back.
  metadata(repository,state,target);
  const results=repository.importBatch([{key:policy.importKey,fingerprint:review.importFingerprint,action:'update',productId:policy.productId,expectedRevision:policy.expectedRevision,document:target}],{beforeWrite:()=>{
   state.phase='verify';
   const original=repository.get(policy.productId,{revision:policy.expectedRevision});
   need(documentPins(original.document).idBindingSha256===policy.expectedPreimageBindingSha256&&digest(original.metadata)===review.observation.preimage.metadataSha256,'preimage_changed');
   const prior=repository.importItem(policy.importKey),head=repository.head(policy.productId);replay=!!prior;
   if(prior){need(prior.id===policy.productId&&prior.fingerprint===review.importFingerprint,'journal_conflict');need(head.revision===policy.expectedRevision+1,'replay_head_changed');const saved=repository.get(policy.productId,{revision:head.revision});same(documentPins(saved.document),review.target,'replay_document_changed');need(digest(saved.metadata)===review.observation.targetMetadataSha256,'replay_metadata_changed');}
   else need(head.revision===policy.expectedRevision,'head_changed');
   need(head.status==='draft','head_state_changed');
   same(documentPins(sync(repository.validate(target))),review.target,'validation_changed_document');
   same(profileRead(context,target),review.observation.resourcePins,'resources_changed');
   need(digest(metadata(repository,state,target))===review.observation.targetMetadataSha256,'metadata_changed');
   checkedAt=new Date(clock()).toISOString();state.phase='write';
  }});
  need(checkedAt!==null,'native_before_write_missing');need(state.writeCalls===(replay?0:1),'native_snapshot_count');
  const saved=repository.get(policy.productId,{revision:policy.expectedRevision+1}),journal=repository.importItem(policy.importKey),head=repository.head(policy.productId);
  need(saved.id===policy.productId&&head.revision===policy.expectedRevision+1&&head.status==='draft','readback_identity');same(documentPins(saved.document),review.target,'readback_document');need(digest(saved.metadata)===review.observation.targetMetadataSha256,'readback_metadata');need(journal?.id===policy.productId&&journal.fingerprint===review.importFingerprint,'readback_journal');
  const body={schema:'gravuru-operator-product-update-receipt/v1',reviewHash:review.reviewHash,approvalHash:approval.approvalHash,excelSha256:approval.excelAddendum.sha256,importKey:policy.importKey,importFingerprint:review.importFingerprint,productId:saved.id,revision:saved.revision,replayed:replay,newRevisions:replay?0:1,createdProducts:0,document:documentPins(saved.document),metadataSha256:digest(saved.metadata),checkedUnderNativeWriteLockAt:checkedAt,nativeResult:results,shopifyWrites:0,bindingWrites:0,catalogApprovals:0,publications:0};
  return freeze({...body,receiptHash:digest(body)});
 }finally{state.review=null;state.phase='idle';state.writeCalls=0;}
}
