// Private Issue230 operator composition. No host construction, credentials, network
// client, CLI side effects, native creation/confirmation, publication or media upload.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const SHA=/^[a-f0-9]{64}$/,CFG=/^cfg_[a-f0-9-]{36}$/;
export const SHOP='gravuru-design.myshopify.com',TENANT='gravuru',STORE='acryl';
const fail=(code,message)=>{throw Object.assign(Error(message),{code:'six_drafts_'+code});};
const need=(ok,code,message)=>{if(!ok)fail(code,message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const equal=(a,b)=>isDeepStrictEqual(a,b),clone=v=>structuredClone(v);
const normalized=d=>({...d,profileAssignments:{...d.profileAssignments,motifs:{...d.profileAssignments.motifs,profileId:null}},config:{...d.config,moduleProfile:{...d.config.moduleProfile,id:null}}});
const stamp=r=>digest({id:r.id,revision:r.revision,status:r.status,publishedRevision:r.publishedRevision,document:r.document,metadata:r.metadata??{}});
const sync=(fn,...args)=>{const v=fn(...args);need(!v?.then,'async','Dieser native Callback muss synchron bleiben.');return v;};

/** Source-pinned functions only; never opens a database or constructs a host. */
export async function loadNativeFunctions(root){
 const pins=JSON.parse(fs.readFileSync(new URL('./native-pins.json',import.meta.url),'utf8'));
 const result={};
 for(const [relative,pin] of Object.entries(pins)){
  const file=path.resolve(root,relative),bytes=fs.readFileSync(file);
  need(createHash('sha256').update(bytes).digest('hex')===pin,'native_pin','Geprüfte native Quelldatei weicht ab: '+relative);
  Object.assign(result,await import(pathToFileURL(file).href));
 }
 return result;
}
export function loadReferences(){return JSON.parse(fs.readFileSync(new URL('./references.json',import.meta.url),'utf8'));}

/** Called AFTER native groups.execute. Entries contain its actual result + getPlan + get record. */
export function prepareSixDrafts(entries,{native}={}){
 const references=loadReferences();
 need(Array.isArray(entries)&&entries.length===6,'scope','Genau sechs tatsächliche Zielrecords erforderlich.');
 const seen=new Set(),rows=entries.map(entry=>{
  const ref=references.groups.find(r=>r.group===entry.group),{plan,execution,record}=entry;
  need(ref&&!seen.has(entry.group),'scope','Unbekannte oder doppelte Kleinproduktgruppe.');seen.add(entry.group);
  need(plan&&execution&&record,'native_result','Nativer Plan, execute-Ergebnis und aktueller Zielrecord fehlen.');
  const {id,planHash,createdAt,...body}=plan,p=body.products?.[0];
  need(SHA.test(planHash)&&digest(body)===planHash&&body.valid===true&&body.issues?.length===0&&body.products?.length===1&&body.localOnly===true&&body.published===false&&body.shopifyWrites===0,'plan','Gespeicherter nativer Zielplan ist nicht vollständig gültig.');
  need(body.creationKey==='issue230-'+ref.excelSha256&&p.key===ref.productKey&&digest(normalized(p.document))===ref.compiledNormalizedSha256,'content','Der Plan entspricht nicht dem bestätigten v9-Inhalt.');
  need(execution.planId===id&&execution.planHash===planHash&&/^pgc_[a-f0-9-]{36}$/.test(execution.confirmationId||'')&&execution.localOnly===true&&execution.published===false&&execution.shopifyWrites===0&&execution.products?.length===1,'execution','Tatsächlicher nativer execute-Beleg fehlt oder gehört zu einem anderen Plan.');
  const target=execution.products[0];
  need(CFG.test(record.id)&&target.productId===record.id&&target.key===p.key&&target.revision===record.revision&&record.revision===1&&record.status==='draft'&&record.publishedRevision===null&&!body.sources.some(s=>s.productId===record.id),'target','Ausführungsziel ist keine neue eigene Produktkopie.');
  need(digest(record.document)===p.fingerprint&&digest(p.document)===p.fingerprint,'readback','Zielrecord und vollständig bestätigtes Plandokument weichen ab.');
  const prepared=native.prepareShopProduct(record),request=native.shopDraftRequest(record,SHOP);
  need(prepared.sourceReady&&prepared.variants.length===ref.variants&&digest(p.variantReview)===ref.variantReviewSha256,'variants','Variantenvertrag ist nicht der bestätigte Kleinproduktstand.');
  need(prepared.variants.every(v=>p.variantReview.some(r=>equal(r.options,v.options)&&r.unitCents===v.priceCents)),'prices','Native Shopvorbereitung weicht von den Planpreisen ab.');
  need(request.input.status==='DRAFT'&&!('id' in request.input)&&!('files' in request.input),'draft','Nur neue DRAFT-Produkte ohne Medienmutation sind vorgesehen.');
  return {group:entry.group,originalExcelSha256:ref.excelSha256,planId:id,planHash,confirmationId:execution.confirmationId,
   productId:record.id,revision:record.revision,recordStamp:stamp(record),documentSha256:p.fingerprint,
   request,variants:prepared.variants.map(v=>({key:v.key,options:v.options,priceCents:v.priceCents})),
   entry:{templateSuffix:'konfi',customizationId:record.id},media:{transferred:false,reason:'Keine konkrete freigegebene Zuordnung für diese sechs neuen Shopbilder belegt.'}};
 });
 need(new Set(rows.map(r=>r.productId)).size===6&&rows.reduce((n,r)=>n+r.variants.length,0)===45,'scope','Sechs eindeutige Ziele mit zusammen 45 Varianten erforderlich.');
 const value={schema:'issue230-six-draft-execution/v1',shopDomain:SHOP,tenantId:TENANT,storeId:STORE,published:false,existingProductsTouched:0,rows};
 return {...value,reviewHash:digest(value)};
}

function verifyReview(review){const {reviewHash,...value}=review??{};need(value.schema==='issue230-six-draft-execution/v1'&&value.shopDomain===SHOP&&value.tenantId===TENANT&&value.storeId===STORE&&digest(value)===reviewHash&&value.rows?.length===6&&new Set(value.rows.map(r=>r.productId)).size===6&&value.rows.reduce((n,r)=>n+r.variants.length,0)===45,'review','Konkreter Sechsprodukt-Requeststand wurde verändert.');}

/** Existing v1 contract, derived from saved native fields; native validator checks EVERY variant. */
function priceContract(row,result,record,native){
 const c=record.document.config;
 const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:result.shopifyProductId,revision:1,currency:'EUR',
  variants:Object.fromEntries(result.mappings.map(m=>{const v=row.variants.find(v=>v.key===m.key);need(v,'mapping','Unbekannte native Variante.');return [m.variantId,v.priceCents];})),
  extraMotifCents:c.extraMotifCents,extraPhotoCents:c.photo.extraPriceCents,
  ...(Object.hasOwn(c,'quantityTiers')?{quantityTiers:clone(c.quantityTiers),quantityTierScope:c.quantityTierScope}:{})};
 for(const [variantId,baseCents] of Object.entries(pricing.variants))native.capturePersonalization(pricing,{variantId,baseCents,document:record.document});
 return pricing;
}

/** Host injects its EXISTING native objects and authenticated readers/transports.
 * The native synchronous bind callback receives an already remotely verified contract;
 * it never starts async I/O. No fake merchant identity is manufactured here. */
export async function executeSixDrafts(review,{native,repository,orders,transferJournal,draftTransport,shop,adapter,principal,approval,checkpoint,action='create'}={}){
 verifyReview(review);
 review=clone(review);approval=clone(approval);principal=clone(principal);
 need(approval?.reviewHash===review.reviewHash&&typeof approval.id==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(approval.id),'approval','Der tatsächliche Ausführungsbeleg muss diesen konkreten Requeststand nennen.');
 need(principal?.role==='merchant'&&principal.shopDomain===SHOP,'principal','Bestehender authentifizierter Händlerkontext fehlt.');
 need(repository?.tenantId===TENANT&&orders?.tenantId===TENANT&&adapter?.storeId===STORE&&adapter.tenantId===TENANT&&adapter.shopDomain===SHOP,'host','Native Hostinstanzen müssen zum belegten Acryl-Store/Shop gehören.');
 need(['create','reconcile'].includes(action)&&typeof checkpoint==='function','mode','Expliziter create/reconcile-Modus und privates persistentes Fortschrittsjournal erforderlich.');
 const done=[];
 function current(row){const record=repository.get(row.productId);need(stamp(record)===row.recordStamp,'drift','Nativer Zielstand oder Metadaten haben sich geändert.');return record;}
 // No remote or local writes until every row passes the exact current-record check.
 for(const row of review.rows)need(equal(native.shopDraftRequest(current(row),SHOP),row.request),'request','Nativer Shoprequest hat sich geändert.');
 for(const row of review.rows){
  let verifiedPricing=null,verifiedResult=null;
  async function pricingBeforeBindings(result){
   const record=current(row),remote=await shop.readProduct(result.shopifyProductId);
   need(equal(native.verifyShopDraftProduct(remote,row.request),result),'remote','Frischer vollständiger DRAFT-Readback widerspricht dem Transfer.');
   need(remote.publishedAt===null,'published','Shopprodukt ist nicht ausdrücklich unveröffentlicht.');
   const pricing=priceContract(row,result,record,native);
   await shop.ensurePricing({productId:result.shopifyProductId,pricing,request:row.request,check:()=>current(row),checkpoint});
   current(row);verifiedPricing=pricing;verifiedResult=result;return result;
  }
  const old=transferJournal.get(row.request.identity);
  if(old?.state==='completed')await pricingBeforeBindings(old.result);
  const transport={async lookup(request,options){need(equal(request,row.request),'request','Transferrequest drift.');const result=await draftTransport.lookup(request,options);return result?pricingBeforeBindings(result):null;},
   async create(request,options){current(row);need(equal(request,row.request),'request','Transferrequest drift.');return pricingBeforeBindings(await draftTransport.create(request,options));}};
  const guardedOrders={bindings:()=>orders.bindings(),bindVariants(input){
   current(row);need(verifiedPricing&&verifiedResult&&input.record.id===row.productId&&equal(input.mappings,verifiedResult.mappings),'pricing','Bestätigter Preisvertrag muss vor der ersten unveränderlichen Formbindung vorliegen.');
   return sync(orders.bindVariants.bind(orders),{...input,personalizationPricing:verifiedPricing});
  }};
  const transfer=native.createShopDraftTransfer({repository,orders:guardedOrders,journal:transferJournal,config:{mode:'draft-only',shopDomain:SHOP},transport});
  sync(checkpoint,{phase:'draft-transfer-intent',group:row.group,reviewHash:review.reviewHash,requestSha256:row.request.requestSha256});
  const saved=await transfer({productId:row.productId,expectedRevision:row.revision,sourceSha256:row.request.sourceSha256,action:old?action:'create'},principal);
  need(saved.state==='completed'&&verifiedResult,'transfer','Vollständiger DRAFT-Transfer fehlt.');
  const remote=await shop.readProduct(verifiedResult.shopifyProductId);
  need(equal(native.verifyShopDraftProduct(remote,row.request),verifiedResult),'remote','DRAFT vor ID-Zuordnung geändert.');
  const selections=verifiedResult.mappings.map(m=>({shopifyProductId:verifiedResult.shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+m.variantId,productId:row.productId,productRevision:row.revision,options:row.variants.find(v=>v.key===m.key).options}));
  const registry=orders.idBindings({storeId:STORE,shopDomain:SHOP,adapter,personalizationPricingFor:()=>verifiedPricing});
  const expectedHeads=selections.map(s=>{const history=registry.history({shopifyProductId:s.shopifyProductId,shopifyVariantId:s.shopifyVariantId});
   if(history.length){const h=registry.resolve({shopifyProductId:s.shopifyProductId,shopifyVariantId:s.shopifyVariantId});need(h.productId===row.productId&&h.productRevision===row.revision,'head','Fremde oder veränderte ID-Zuordnung.');return {shopifyVariantId:s.shopifyVariantId,revision:h.assignmentRevision};}
   return {shopifyVariantId:s.shopifyVariantId,revision:null};});
  const checked=await native.createShopProductBindingCheck({adapter,reader:shop}).check({selections});
  need(checked.status==='id-plan-ready'&&checked.plan,'binding','Nativer frischer ID-Plan ist blockiert.');current(row);
  const bindingResult=registry.persist({plan:checked.plan,expectedHeads});
  const resolved=registry.resolveMany(selections.map(s=>({shopifyProductId:s.shopifyProductId,shopifyVariantId:s.shopifyVariantId})));
  need(resolved.length===row.variants.length&&resolved.every((b,i)=>b.productId===row.productId&&b.productRevision===row.revision&&equal(b.options,selections[i].options)&&b.unitCents===row.variants.find(v=>equal(v.options,b.options)).priceCents),'readback','ID-Readback unvollständig.');
  for(const b of resolved){const contract=orders.bindingPricing(b.bindingId);need(equal(contract,native.capturePersonalization(verifiedPricing,{variantId:b.shopifyVariantId.split('/').at(-1),baseCents:b.unitCents,document:current(row).document})),'pricing_binding','Persistierter Preisvertrag fehlt oder weicht ab.');}
  const release=orders.approveCatalogLiveProducts({shopDomain:SHOP,products:[{shopifyProductId:verifiedResult.shopifyProductId,productId:row.productId,productRevision:row.revision}],approvalId:approval.id,registry});
  need(orders.catalogLiveApprovals(selections.map(s=>({...s,shopDomain:SHOP}))).every(a=>a?.id===approval.id),'approval_readback','Versionsgebundene native Freigabe nicht vollständig zurückgelesen.');
  await shop.ensureEntry({productId:verifiedResult.shopifyProductId,entry:row.entry,pricing:verifiedPricing,request:row.request,check:()=>current(row),checkpoint});
  const final=await shop.readProduct(verifiedResult.shopifyProductId);
  need(equal(native.verifyShopDraftProduct(final,row.request),verifiedResult)&&final.templateSuffix==='konfi'&&final.customizationId?.value===row.productId&&equal(final.pricing?.jsonValue,verifiedPricing)&&final.publishedAt===null,'final','Abschließender vollständiger Shop-Einstieg-/Preis-Readback fehlt.');
  const proof={group:row.group,productId:row.productId,revision:row.revision,shopifyProductId:verifiedResult.shopifyProductId,requestSha256:row.request.requestSha256,variants:selections.length,selections,pricingSha256:digest(verifiedPricing),bindingsCreated:bindingResult.createdBindings,assignmentsChanged:bindingResult.changedAssignments,approvalId:release.approvalId,status:'DRAFT',published:false,mediaTransferred:false};
  sync(checkpoint,{phase:'group-complete',...proof});done.push(proof);
 }
 return {schema:'issue230-six-draft-result/v1',reviewHash:review.reviewHash,products:done,variants:45,published:false,existingProductsTouched:0,productionReady:false};
}
