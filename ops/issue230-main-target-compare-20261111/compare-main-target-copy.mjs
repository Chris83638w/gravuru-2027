// Private evidence only. No application constructors, migrations, HTTP, import,
// approval, activation or write API. Database handles are ALWAYS readOnly.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {copyPath,argumentsOf,isCLI,printResult} from './copy-guard.mjs';
import {MAIN_CATEGORIES,resolveMainCategoryProfilesReadOnly,summarizeResolution} from './resolve-main-category-profiles-readonly.mjs';

export const PIN=Object.freeze({productId:'cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',revision:1,assignmentRevision:1,storeId:'acryl',shopDomain:'gravuru-design.myshopify.com',shopifyProductId:'gid://shopify/Product/16190784602492',bindingDocumentSha256:'d2886e119ea9715af2b8905ebab8ecc1d199b07f8653476ce5e0fa26cd8cca79',targetProductGroupSha256:'ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407',targetBindingSha256:'f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285',rows:808,matched:778,residual:30,mappingSerializedSha256:'3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591',intentSerializedSha256:'fcfddddeae4a188ef980a67912e247d85bb42b46c1d4836de669207b01b2282b'});
export const sha=value=>createHash('sha256').update(value).digest('hex');
// Workshop copies can exceed 4 GiB. Never buffer a database file in memory.
export function hashFile(file){
 const hash=createHash('sha256'),buffer=Buffer.allocUnsafe(1024*1024),fd=fs.openSync(file,'r');
 try{let length;while((length=fs.readSync(fd,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,length));return hash.digest('hex');}
 finally{fs.closeSync(fd);}
}
const objectCanonical=v=>Array.isArray(v)?v.map(objectCanonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,objectCanonical(v[k])])):v;
export const productGroupHash=v=>sha(JSON.stringify(objectCanonical(v)));
const stringCanonical=v=>Array.isArray(v)?'['+v.map(stringCanonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stringCanonical(v[k])).join(',')+'}':JSON.stringify(v);
export const idBindingHash=v=>sha(stringCanonical(v));
const must=(ok,message)=>{if(!ok)throw Error(message);};
const parse=(value,label)=>{try{return JSON.parse(value);}catch{throw Error('Invalid JSON in '+label);}};
const readBytes=file=>{const bytes=fs.readFileSync(file);return file.endsWith('.gz')?gunzipSync(bytes):bytes;};
const readJSON=file=>parse(readBytes(file),'input artifact');
const TYPES=['fonts','motifs','colors','bestsellers'];
const MODULES=['colors','designs','logo','motifs','options','photo','text'];
const moduleSummary=p=>p==null?null:{id:p.id??null,revision:p.revision??null,schema:p.schema??null,modules:Object.fromEntries(MODULES.map(k=>[k,typeof p.modules?.[k]==='boolean'?p.modules[k]:null]))};
const itemsSummary=items=>items===null?{count:null,sha256:null}:Array.isArray(items)?{count:items.length,sha256:productGroupHash(items)}:{count:null,sha256:null,invalid:true};
const profileSnapshot=s=>s==null?null:{settingsRevision:s.settingsRevision??null,sources:Object.fromEntries(TYPES.map(type=>{const p=s.sources?.[type];return [type,{level:p?.level??null,categoryId:p?.categoryId??null,mode:p?.mode??null,profileId:p?.profileId??null,profileRevision:p?.profileRevision??null,...itemsSummary(s.selections?.[type])}];}))};

function openCopy(filename){
 const file=copyPath(filename);
 must(/\.copy\.sqlite$/i.test(file),'A private sealed .copy.sqlite file is required.');
 must(!/[\\/]private[\\/](?:acryl-employee-20261021-v1|mika-r15-resume-20261108-v1)[\\/]data[\\/]/i.test(file),'Known live data directories are excluded.');
 for(const suffix of ['-wal','-journal'])must(!fs.existsSync(file+suffix)||fs.statSync(file+suffix).size===0,'Uncheckpointed sidecar: create a consistent standalone backup first.');
 const before=hashFile(file),db=new DatabaseSync(file,{readOnly:true});
 try{db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000; BEGIN');}catch(error){db.close();throw error;}
 return {db,file,before,close(){if(db.isTransaction)db.exec('ROLLBACK');db.close();const after=hashFile(file);must(after===before,'The database copy changed during the read.');return {fileName:path.basename(file),sha256:before,unchanged:true};}};
}
function schema(db){
 const columns=table=>db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
 const need=(table,required)=>{const found=columns(table);must(required.every(c=>found.includes(c)),'Unsupported or missing schema: '+table);return found;};
 return {columns,need};
}
const unique=(rows,label)=>{must(rows.length===1,'Expected exactly one '+label);return rows[0];};

// Exported pure/readonly core permits explicit synthetic pins in tests only.
// The CLI below ALWAYS supplies PIN; it has no scope/hash/count override flags.
export function compareMainTargetCopy({copy,profilesCopy,mappingFile,targetFile,intentFile,tenantId,resolverSource,legacySingleStore=false,pins=PIN}){
 must(typeof tenantId==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(tenantId),'An explicit tenant ID is required.');
 const mappingBytes=readBytes(mappingFile),intentBytes=readBytes(intentFile);
 must(sha(mappingBytes)===pins.mappingSerializedSha256&&sha(intentBytes)===pins.intentSerializedSha256,'Preview mapping or intent file hash mismatch.');
 const mapping=parse(mappingBytes,'mapping'),target=readJSON(targetFile),intent=parse(intentBytes,'intent');
 must(productGroupHash(target)===pins.targetProductGroupSha256&&idBindingHash(target)===pins.targetBindingSha256,'Target document hash mismatch.');
 must(intent.executable===false&&intent.confirmed===false&&intent.imported===false&&intent.executed===false,'Only an unexecuted preview is accepted.');
 must(intent.proposedUpdate?.documentProductGroupSha256===pins.targetProductGroupSha256&&intent.proposedUpdate.documentIdBindingSha256===pins.targetBindingSha256&&isDeepStrictEqual(intent.pins.targetCategoryIds,MAIN_CATEGORIES)&&isDeepStrictEqual(intent.pins.profileAssignments,target.profileAssignments)&&intent.pins.targetResolutionVerified===false,'Intent must pin this exact preserved-category target and remain unverified.');
 must(intent.actual.productId===pins.productId&&intent.actual.shopifyProductId===pins.shopifyProductId&&intent.actual.expectedRevision===pins.revision,'Preview target identity mismatch.');
 must(mapping.matches?.length===pins.matched&&mapping.residualVariants?.length===pins.residual,'Incomplete preview mapping.');
 const wanted=new Map();
 for(const row of mapping.matches){must(row.shopifyProductId===pins.shopifyProductId&&!wanted.has(row.shopifyVariantId),'Wrong or duplicate preview identity.');wanted.set(row.shopifyVariantId,{kind:'v9',row});}
 for(const row of mapping.residualVariants){must(!wanted.has(row.id)&&row.proposedDeletion===false,'Duplicate or destructive residual mapping.');wanted.set(row.id,{kind:'preserve',row});}
 must(wanted.size===pins.rows,'Incomplete preview partition.');
 // Exact file pins bind the independently reviewed native price/option mapping.
 // This tool compares persisted rows; it never invents a price formula.
 const connections=[],evidence=[];let completed;
 const open=file=>{const value=openCopy(file);connections.push(value);return value.db;};
 try{
  const db=open(copy),s=schema(db),issues=[],pending=[],deltas={options:[],nativeVsTargetPrice:[],nativeVsShopSnapshotPrice:[],identity:[],missingVariantIds:[],unexpectedVariantIds:[]};
  const pcols=s.need('products',['id','revision','published_revision','archived','kind']);
  const rcols=s.need('product_revisions',['product_id','revision','status','document','metadata']);
  const bcols=s.need('form_shop_bindings',['id','shop','variant_id','product_id','product_revision','unit_cents']);
  const ocols=s.need('form_shop_binding_selections',['binding_id','options']);
  const modes=[pcols,rcols,bcols,ocols].map(c=>c.includes('tenant_id'));must(modes.every(v=>v===modes[0]),'Mixed native/legacy tenant schema.');const scoped=modes[0];
  must(typeof legacySingleStore==='boolean'&&(scoped?!legacySingleStore:legacySingleStore&&tenantId==='gravuru'),'Unscoped tables require explicit --legacy-single-store true and tenant gravuru; scoped tables require this flag absent.');
  s.need('shop_product_binding_heads',['tenant_id','shop','variant_gid','revision']);
  s.need('shop_product_binding_revisions',['tenant_id','shop','store_id','product_gid','variant_gid','revision','binding_id','cfg_id','cfg_revision','document_sha256']);
  const whereTenant=scoped?' AND tenant_id=?':'',args=scoped?[pins.productId,tenantId]:[pins.productId];
  const head=unique(db.prepare('SELECT id,revision,published_revision,archived,kind FROM products WHERE id=?'+whereTenant).all(...args),'actual product');
  if(head.revision!==pins.revision||head.archived||head.kind!=='product'||head.published_revision!==null)issues.push({code:'product_head_or_state_changed',actual:head});
  const saved=unique(db.prepare('SELECT revision,status,document,metadata FROM product_revisions WHERE product_id=? AND revision=?'+whereTenant).all(pins.productId,pins.revision,...(scoped?[tenantId]:[])),'actual revision');
  const document=parse(saved.document,'actual product'),metadata=parse(saved.metadata,'actual metadata');
  const hashes={productGroupDocumentSha256:productGroupHash(document),idBindingDocumentSha256:idBindingHash(document),storedJsonBytesSha256:sha(saved.document),metadataStoredBytesSha256:sha(saved.metadata)};
  if(hashes.idBindingDocumentSha256!==pins.bindingDocumentSha256)issues.push({code:'actual_document_binding_hash_changed',actual:hashes.idBindingDocumentSha256,expected:pins.bindingDocumentSha256});
  if(saved.status!=='draft')issues.push({code:'revision_status_changed',actual:saved.status});
  const hasPricing=s.columns('form_shop_binding_personalization').length>0;
  if(hasPricing){const c=s.need('form_shop_binding_personalization',['binding_id','document']);must(c.includes('tenant_id')===scoped,'Mixed pricing tenant schema.');}else pending.push('form_shop_binding_personalization table absent; existing pricing contracts not proven.');
  const rows=db.prepare(`SELECT r.tenant_id,r.shop,r.store_id,r.product_gid,r.variant_gid,r.revision AS assignment_revision,r.binding_id,r.cfg_id,r.cfg_revision,r.document_sha256,
   b.shop AS fixed_shop,b.variant_id AS fixed_variant_id,b.product_id AS fixed_product_id,b.product_revision AS fixed_revision,b.unit_cents,s.options
   ${hasPricing?',q.document AS pricing_document':''}
   FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision
   LEFT JOIN form_shop_bindings b ON b.id=r.binding_id ${scoped?'AND b.tenant_id=r.tenant_id':''}
   LEFT JOIN form_shop_binding_selections s ON s.binding_id=b.id ${scoped?'AND s.tenant_id=r.tenant_id':''}
   ${hasPricing?'LEFT JOIN form_shop_binding_personalization q ON q.binding_id=b.id '+(scoped?'AND q.tenant_id=r.tenant_id':''):''}
   WHERE h.tenant_id=? AND h.shop=? AND (r.product_gid=? OR r.cfg_id=?) ORDER BY r.variant_gid LIMIT 10001`).all(tenantId,pins.shopDomain,pins.shopifyProductId,pins.productId);
  must(rows.length<=10000,'Unexpectedly large target scope; no truncated success.');
  const seen=new Set(),table=[],groups=new Map(),pricingGroups=new Map();let optionMatches=0,residualOptionMatches=0,nativeTargetPriceMatches=0,nativeShopPriceMatches=0,pricingMissing=0;
  for(const row of rows){
   const wantedRow=wanted.get(row.variant_gid),bad=[];
   if(seen.has(row.variant_gid))bad.push('duplicate-active-variant');seen.add(row.variant_gid);
   for(const [field,expected]of Object.entries({store_id:pins.storeId,product_gid:pins.shopifyProductId,cfg_id:pins.productId,cfg_revision:pins.revision,assignment_revision:pins.assignmentRevision,document_sha256:pins.bindingDocumentSha256,fixed_shop:pins.shopDomain,fixed_variant_id:row.variant_gid.split('/').at(-1),fixed_product_id:pins.productId,fixed_revision:pins.revision}))if(row[field]!==expected)bad.push(field);
   if(!Number.isSafeInteger(row.unit_cents)||row.unit_cents<0)bad.push('unit_cents');
   if(bad.length)deltas.identity.push({shopifyVariantId:row.variant_gid,bindingId:row.binding_id,fields:bad});
   if(!wantedRow){deltas.unexpectedVariantIds.push(row.variant_gid);continue;}
   const options=row.options==null?null:parse(row.options,'fixed variant options');
   if(wantedRow.kind==='v9'){
    if(isDeepStrictEqual(options,wantedRow.row.nativeOptions))optionMatches++;else deltas.options.push({shopifyVariantId:row.variant_gid,bindingId:row.binding_id,actualOptions:options,expectedOptions:wantedRow.row.nativeOptions});
    if(row.unit_cents===wantedRow.row.targetUnitCents)nativeTargetPriceMatches++;else deltas.nativeVsTargetPrice.push({shopifyVariantId:row.variant_gid,sku:wantedRow.row.sku,actualNativeUnitCents:row.unit_cents,targetV9UnitCents:wantedRow.row.targetUnitCents,differenceCents:row.unit_cents-wantedRow.row.targetUnitCents});
   }else{
    // Residuals have no v9 target. Match their observed Shop labels against
    // this ACTUAL old document's groups, requiring unique exact IDs, then
    // compare the fixed binding. No geometry/price inference or migration.
    const expected={},groups=document.config?.profile?.optionGroups||[];let uniqueLabels=true;
    for(const observed of wantedRow.row.selectedOptions||[]){const gs=groups.filter(g=>g.name===observed.name);const vs=gs.length===1?gs[0].values.filter(v=>v.label===observed.value):[];if(gs.length!==1||vs.length!==1){uniqueLabels=false;break;}expected[gs[0].id]=vs[0].id;}
    if(uniqueLabels&&Object.keys(expected).length>0&&isDeepStrictEqual(expected,options))residualOptionMatches++;
    else deltas.options.push({shopifyVariantId:row.variant_gid,bindingId:row.binding_id,residual:true,actualOptions:options,expectedOptions:uniqueLabels?expected:null,reason:uniqueLabels?'Actual fixed options differ from the unchanged Shop-label/old-document match.':'Exact old-document option lookup missing or ambiguous; no guessed mapping.'});
   }
   const shopPrice=wantedRow.kind==='v9'?wantedRow.row.currentShopUnitCents:Number(wantedRow.row.price.replace('.',''));
   if(row.unit_cents===shopPrice)nativeShopPriceMatches++;else deltas.nativeVsShopSnapshotPrice.push({shopifyVariantId:row.variant_gid,actualNativeUnitCents:row.unit_cents,shopSnapshotUnitCents:shopPrice});
   const contract=hasPricing&&row.pricing_document!=null?parse(row.pricing_document,'personalization contract'):null;
   const contractHash=contract===null?null:productGroupHash(contract);
   if(!contract)pricingMissing++;
   else{
    const summary={revision:contract.revision??null,productId:contract.productId??null,extraMotifCents:contract.extraMotifCents??null,extraPhotoCents:contract.extraPhotoCents??null,extraLogoCents:contract.extraLogoCents??null,motifCharge:contract.motifCharge??null,quantityTierScope:contract.quantityTierScope??null,quantityTiers:contract.quantityTiers??null,moduleProfile:moduleSummary(contract.moduleProfile),optionPricesHash:contract.optionPrices==null?null:productGroupHash(contract.optionPrices)};
    const k=productGroupHash(summary);if(!pricingGroups.has(k))pricingGroups.set(k,{...summary,summarySha256:k,bindings:0,baseCentsMismatches:0});const g=pricingGroups.get(k);g.bindings++;if(contract.baseCents!==row.unit_cents)g.baseCentsMismatches++;
   }
   const group={storeId:row.store_id,shopifyProductId:row.product_gid,productId:row.cfg_id,productRevision:row.cfg_revision,assignmentRevision:row.assignment_revision,idBindingDocumentSha256:row.document_sha256},gk=productGroupHash(group);if(!groups.has(gk))groups.set(gk,{...group,variants:0});groups.get(gk).variants++;
   table.push({variantId:row.variant_gid,bindingId:row.binding_id,productId:row.cfg_id,productRevision:row.cfg_revision,assignmentRevision:row.assignment_revision,idBindingDocumentSha256:row.document_sha256,unitCents:row.unit_cents,options,personalizationProductGroupSha256:contractHash});
  }
  deltas.missingVariantIds=[...wanted.keys()].filter(id=>!seen.has(id));
  if(rows.length!==pins.rows||deltas.identity.length||deltas.missingVariantIds.length||deltas.unexpectedVariantIds.length)issues.push({code:'active_binding_coverage_or_identity_failed'});
  const fieldComparison=Object.fromEntries([...new Set([...Object.keys(document),...Object.keys(target)])].sort().map(k=>[k,{equal:isDeepStrictEqual(document[k],target[k]),actualProductGroupSha256:document[k]===undefined?null:productGroupHash(document[k]),targetProductGroupSha256:target[k]===undefined?null:productGroupHash(target[k])}]));
  const moduleRef=intent.pins.moduleProfile,mc=s.columns('configurator_module_profile_revisions');let moduleProfile={available:false,requested:moduleSummary(moduleRef)};
  if(mc.length){s.need('configurator_module_profiles',['tenant_id','id','revision']);s.need('configurator_module_profile_revisions',['tenant_id','id','revision','document','sha256']);const records=db.prepare('SELECT r.id,r.revision,r.sha256,r.document,h.revision AS head FROM configurator_module_profile_revisions r JOIN configurator_module_profiles h ON h.tenant_id=r.tenant_id AND h.id=r.id WHERE r.tenant_id=? AND r.id=? AND r.revision=?').all(tenantId,moduleRef.id,moduleRef.revision);if(records.length===1){const p=records[0],d=parse(p.document,'module profile');moduleProfile={available:true,id:p.id,revision:p.revision,headRevision:p.head,storedSha256:p.sha256,recomputedProductGroupSha256:productGroupHash(d),expectedSha256:intent.v9.moduleProfile.sha256,modules:moduleSummary({modules:d.modules}).modules,storedHashMatches:productGroupHash(d)===p.sha256,expectedHashMatches:p.sha256===intent.v9.moduleProfile.sha256,modulesMatch:isDeepStrictEqual(d.modules,moduleRef.modules)};}else pending.push('Requested module profile pin absent or ambiguous in target workshop.');}else pending.push('Module profile tables absent in target workshop; local cmp pin is not a server pin.');
  const storedProductionPin=metadata.productionProfile==null?null:{id:metadata.productionProfile.id??null,revision:metadata.productionProfile.revision??null,sha256:metadata.productionProfile.sha256??null};
  const storedProductionRef=storedProductionPin===null?null:{id:storedProductionPin.id,revision:storedProductionPin.revision};
  let resourceProfiles={compared:false},productionProfile={actualReference:document.productionProfile??null,targetReference:target.productionProfile??null,storedMetadataPin:storedProductionPin,metadataReferenceMatchesDocument:isDeepStrictEqual(storedProductionRef,document.productionProfile??null),referenceEqual:isDeepStrictEqual(document.productionProfile??null,target.productionProfile??null),runtimeCompatibilityChecked:false};
  must(isDeepStrictEqual(target.categoryIds,MAIN_CATEGORIES)&&TYPES.every(t=>target.profileAssignments?.[t]?.mode==='inherit'&&target.profileAssignments[t].profileId===null),'This narrow tool requires exactly the two ordered existing main categories and all four inherited assignments.');
  must(isDeepStrictEqual(document.categoryIds,target.categoryIds)&&isDeepStrictEqual(document.profileAssignments,target.profileAssignments),'Existing categories and inherited resource assignments must be preserved exactly.');
  if(profilesCopy){
   const pdb=open(profilesCopy),ps=schema(pdb);ps.need('profile_library_settings',['revision','document','tenant_id']);
   const projected=resolveMainCategoryProfilesReadOnly({db:pdb,tenantId,document:target,resolverSource});
   const actual=projected.withCategories.snapshot,expected=summarizeResolution(intent.pins.localResolvedProfiles);
   resourceProfiles={compared:true,scope:'Exactly the two ordered existing main categories; all four product assignments inherited; pinned native priority, no full catalogue validation.',actual,expectedLocalV9:expected,selectionAndSourceDifferences:TYPES.filter(t=>!isDeepStrictEqual(actual.sources[t],expected.sources[t])),settingsRevisionMatches:actual.settingsRevision===expected.settingsRevision,filteredBestsellers:projected.withCategories.filteredBestsellers,categoryEvidence:projected};
   if(document.productionProfile){const ref=document.productionProfile;ps.need('manufacturing_profile_revisions',['profile_id','revision','document','sha256','tenant_id']);const rows=pdb.prepare('SELECT profile_id,revision,document,sha256 FROM manufacturing_profile_revisions WHERE tenant_id=? AND profile_id=? AND revision=?').all(tenantId,ref.id,ref.revision);if(rows.length===1){const r=rows[0],d=parse(r.document,'manufacturing profile');productionProfile={...productionProfile,recordFound:true,id:r.profile_id,revision:r.revision,storedSha256:r.sha256,serializedDocumentSha256:sha(r.document),storedHashMatches:sha(r.document)===r.sha256,method:d.method,materialId:d.materialId,thicknessMm:d.thicknessMm,archived:d.archived};}else{productionProfile.recordFound=false;pending.push('Actual manufacturing profile revision absent or ambiguous.');}}
  }else pending.push('No profiles.copy.sqlite supplied; current inherited resource and manufacturing profile pins not compared.');
  if(!productionProfile.referenceEqual)pending.push('Existing actual manufacturing reference differs from target; must not be silently removed or replaced.');
  if(!productionProfile.metadataReferenceMatchesDocument)pending.push('Stored manufacturing metadata pin differs from the actual document reference.');
  const ac=s.columns('catalog_live_order_approvals');let approval=null;
  if(ac.length){s.need('catalog_live_order_approvals',['tenant_id','shop','product_gid','cfg_id','cfg_revision','document_sha256','variants_json','approval_id']);const a=db.prepare('SELECT approval_id,cfg_revision,document_sha256,variants_json FROM catalog_live_order_approvals WHERE tenant_id=? AND shop=? AND product_gid=? AND cfg_id=? AND cfg_revision=?').all(tenantId,pins.shopDomain,pins.shopifyProductId,pins.productId,pins.revision);if(a.length){const r=unique(a,'catalog approval'),ids=parse(r.variants_json,'catalog approval variants');must(Array.isArray(ids),'Invalid catalog approval variant list.');approval={id:r.approval_id,productRevision:r.cfg_revision,storedJsonBytesSha256:r.document_sha256,storedDocumentBytesMatch:r.document_sha256===hashes.storedJsonBytesSha256,variantCount:ids.length,sortedVariantIdsSha256:productGroupHash([...ids].sort()),matchesAllActiveTargetVariants:isDeepStrictEqual([...ids].sort(),rows.map(r=>r.variant_gid).sort())};}}
  completed={schema:'gravuru-main-target-copy-comparison/v1',readOnly:true,comparisonCompleted:true,identityAndCoveragePassed:issues.length===0,readyForImport:false,confirmed:false,executed:false,storeWrites:0,shopifyWrites:0,tenantId,productScope:scoped?'tenant-filtered':'explicit-single-store-gravuru-legacy',storeId:pins.storeId,shopDomain:pins.shopDomain,target:{productId:pins.productId,shopifyProductId:pins.shopifyProductId,actualHead:head,revisionStatus:saved.status,...hashes,proposedProductGroupDocumentSha256:productGroupHash(target),proposedIdBindingDocumentSha256:idBindingHash(target),fieldComparison,actualModuleSnapshot:moduleSummary(document.config?.moduleProfile),actualStoredProfiles:profileSnapshot(metadata.profiles),actualMetadataKeys:Object.keys(metadata).sort()},coverage:{expected:pins.rows,actual:rows.length,matchedV9:table.filter(r=>wanted.get(r.variantId)?.kind==='v9').length,preservedResidual:table.filter(r=>wanted.get(r.variantId)?.kind==='preserve').length,v9OptionsMatched:optionMatches,residualOptionsMatched:residualOptionMatches,totalOptionsMatched:optionMatches+residualOptionMatches,optionsDifferent:deltas.options.length,nativeTargetPricesMatched:nativeTargetPriceMatches,nativeTargetPricesDifferent:deltas.nativeVsTargetPrice.length,nativeShopSnapshotPricesMatched:nativeShopPriceMatches,nativeShopSnapshotPricesDifferent:deltas.nativeVsShopSnapshotPrice.length},activeGroups:[...groups.values()],technicalTableProductGroupSha256:productGroupHash(table),deltas,personalization:{bindingContractsMissing:pricingMissing,contractGroups:[...pricingGroups.values()],expectedTargetExtras:{motifCents:target.config?.extraMotifCents??null,photoCents:target.config?.photo?.extraPriceCents??null,logoCents:target.config?.logo?.extraPriceCents??null,motifCharge:target.config?.motifCharge??null,quantityTierScope:target.config?.quantityTierScope??null,quantityTiers:target.config?.quantityTiers??null},runtimeContractValidationPerformed:false},moduleProfile,resourceProfiles,productionProfile,catalogApproval:approval,issues,pending,limits:['Copy snapshot only; no live/current execution evidence.','No approval, import, bind or public-order capability is granted.','Document and arbitrary metadata bodies are never returned.','Native runtime validation, real asset resolution and production compatibility remain separate.','Shop prices are compared with the delivered complete 808-variant read snapshot, not a new Shopify request.','SQL active joins are evidence; no claim that native resolveMany was executed.']};
 }finally{for(const c of connections.reverse())evidence.push(c.close());}
 return {...completed,copyEvidence:evidence};
}
if(isCLI(import.meta.url))try{
 const a=argumentsOf(process.argv.slice(2),['--copy','--profiles-copy','--mapping','--target','--intent','--tenant','--legacy-single-store','--resolver-source']);
 for(const key of ['--copy','--mapping','--target','--intent','--tenant'])must(a[key],'Missing argument: '+key);
 must(a['--legacy-single-store']===undefined||a['--legacy-single-store']==='true','--legacy-single-store accepts only the explicit value true.');
 printResult(compareMainTargetCopy({copy:a['--copy'],profilesCopy:a['--profiles-copy'],mappingFile:a['--mapping'],targetFile:a['--target'],intentFile:a['--intent'],tenantId:a['--tenant'],resolverSource:a['--resolver-source'],legacySingleStore:a['--legacy-single-store']==='true',pins:PIN}));
}catch(error){console.error(JSON.stringify({readOnly:true,comparisonCompleted:false,error:error.message}));process.exitCode=1;}
