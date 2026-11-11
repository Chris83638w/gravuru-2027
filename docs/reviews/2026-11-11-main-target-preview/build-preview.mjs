// Pure files/in-memory preview. No database, repository constructor, HTTP or mutation API.
// Usage: node build-preview.mjs WORKSPACE [OUTPUT_DIRECTORY]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const workspace=path.resolve(process.argv[2]||'.');
const out=path.resolve(process.argv[3]||path.join(workspace,'work/restabschluss/main-target-preview'));
const code=path.join(workspace,'work/issue230-integration-candidate');
const source=path.join(workspace,'work/product-plans-run-v9/Tuerschild-Acrylglas-3mm_v4');
const inventoryFile=path.join(workspace,'work/restabschluss/small-products-duplicate-review/candidate-details.json');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Product-group hashing sorts object construction, then JSON.stringify applies
// JavaScript's integer-key order. ID binding uses a DISTINCT string serializer.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const json=value=>JSON.stringify(canonical(value));
const digest=value=>sha(json(value));
const bindingJson=value=>Array.isArray(value)?'['+value.map(bindingJson).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+bindingJson(value[k])).join(',')+'}':JSON.stringify(value);
const bindingDigest=value=>sha(bindingJson(value));
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
fs.mkdirSync(out,{recursive:true});
const codeCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:code,encoding:'utf8'}).trim();
assert.equal(codeCommit,'af6fd986c735d97bddc974261398ab8c4e88e00b');
const protectedFiles=['plan.json','source-document.json','source-metadata.json','pair.json','template.json'].map(name=>({name,sha256:sha(fs.readFileSync(path.join(source,name)))}));
const plan=read(path.join(source,'plan.json')),pair=read(path.join(source,'pair.json'));
const original=plan.products[0].document;
assert.equal(digest(original),plan.products[0].fingerprint);
assert.equal(plan.products[0].combinationCount,778);
const target=structuredClone(original),changes=[];
const specs=[
 {key:'TS-Acryl-RE-70X23P3-T30-SW',before:'7 × 2 cm',after:'7 × 2,33 cm',widthMm:70,heightMm:23.3},
 {key:'TS-Acryl-RE-80X53P3-T30-SW',before:'8 × 5 cm',after:'8 × 5,33 cm',widthMm:80,heightMm:53.3},
 {key:'TS-Acryl-AB-80X53P3-T30-SW',before:'8 × 5 cm',after:'8 × 5,33 cm',widthMm:80,heightMm:53.3}
];
for(const spec of specs){
 const index=target.config.familyFormats.formats.findIndex(f=>f.key===spec.key),format=target.config.familyFormats.formats[index];
 assert.ok(index>=0);assert.equal(format.label,spec.before);assert.equal(format.geometry.width,spec.widthMm);assert.equal(format.geometry.height,spec.heightMm);
 format.label=spec.after;
 changes.push({path:['config','familyFormats','formats',index,'label'],before:spec.before,after:spec.after});
 const gi=target.config.profile.optionGroups.findIndex(g=>g.id==='size'),group=target.config.profile.optionGroups[gi],vi=group.values.findIndex(v=>v.id===spec.key),value=group.values[vi];
 assert.ok(vi>=0);assert.ok(value.label.endsWith(spec.before));
 const before=value.label;value.label=before.slice(0,-spec.before.length)+spec.after;
 changes.push({path:['config','profile','optionGroups',gi,'values',vi,'label'],before,after:value.label});
}
assert.equal(changes.length,6);
const reverted=structuredClone(target);
for(const change of changes){let parent=reverted;for(const key of change.path.slice(0,-1))parent=parent[key];assert.equal(parent[change.path.at(-1)],change.after);parent[change.path.at(-1)]=change.before;}
assert.equal(digest(reverted),digest(original));
console.log('Only six label fields changed; running native in-memory validation/preparation.');
const {validateProductDocument}=await import(pathToFileURL(path.join(code,'app/workshop/product-model.mjs')));
const {prepareShopProduct}=await import(pathToFileURL(path.join(code,'app/workshop/shop-preparation.mjs')));
const validated=validateProductDocument(target);
assert.equal(digest(validated),digest(target),'Native validation unexpectedly normalizes other fields.');
const actual={productId:'cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',expectedRevision:1,proposedRevision:2,storeId:'acryl',shopDomain:'gravuru-design.myshopify.com',tenantId:null,shopifyProductId:'gid://shopify/Product/16190784602492',documentSha256:'d2886e119ea9715af2b8905ebab8ecc1d199b07f8653476ce5e0fa26cd8cca79',status:'draft',publishedRevision:null,archived:false,assignmentRevision:1,documentHashMethod:'id-binding-string-canonical'};
const prepared=prepareShopProduct({id:actual.productId,revision:2,status:'draft',document:validated,metadata:{}});
assert.equal(prepared.variants.length,778);assert.equal(prepared.sourceReady,true);
console.log('Native preparation passed; matching 778 variants to the complete 808-variant Shopify snapshot.');
const inventory=read(inventoryFile),live=inventory.products.find(p=>p.id===actual.shopifyProductId);
assert.equal(live.variants.nodes.length,808);assert.equal(live.variantsCount.count,808);assert.equal(live.status,'DRAFT');
const bySku=new Map();for(const v of live.variants.nodes){assert.ok(v.sku);assert.equal(bySku.has(v.sku),false);bySku.set(v.sku,v);}
const key=options=>json(options),v9ByOptions=new Map(plan.products[0].variantReview.map(v=>[key(v.options),v]));
assert.equal(v9ByOptions.size,778);
const used=new Set(),mappings=[];
for(const variant of prepared.variants){
 const old=v9ByOptions.get(key(variant.options));assert.ok(old);assert.equal(variant.priceCents,old.unitCents);assert.equal(variant.widthMm,old.widthMm);assert.equal(variant.heightMm,old.heightMm);
 const format=validated.config.familyFormats.formats.find(f=>f.key===variant.options.size),color=format.variants.find(v=>v.color===variant.options.color);assert.ok(color);
 const expectedSku='156-'+color.sizeKey+'-'+variant.options.mounting,existing=bySku.get(expectedSku);assert.ok(existing,'No exact SKU: '+expectedSku);assert.equal(used.has(existing.id),false);used.add(existing.id);
 const expectedOptions=validated.config.profile.optionGroups.filter(g=>variant.options[g.id]!==undefined).map(g=>({name:g.name,value:g.values.find(v=>v.id===variant.options[g.id]).label}));
 const oldOptions=original.config.profile.optionGroups.filter(g=>variant.options[g.id]!==undefined).map(g=>({name:g.name,value:g.values.find(v=>v.id===variant.options[g.id]).label}));
 assert.deepEqual(existing.selectedOptions,oldOptions,'Existing options differ beyond the three known label corrections: '+expectedSku);
 const liveCents=Number(existing.price.replace('.',''));assert.ok(/^\d+\.\d{2}$/.test(existing.price));
 mappings.push({shopifyProductId:live.id,shopifyVariantId:existing.id,sku:expectedSku,nativeVariantKey:variant.key,nativeOptions:variant.options,physicalSizeKey:color.sizeKey,widthMm:variant.widthMm,heightMm:variant.heightMm,
  currentShopSelectedOptions:existing.selectedOptions,proposedSelectedOptions:expectedOptions,displayLabelChanges:expectedOptions.filter((o,i)=>o.value!==existing.selectedOptions[i].value),currentShopUnitCents:liveCents,v9UnitCents:old.unitCents,targetUnitCents:variant.priceCents,existingShopMinusV9Cents:liveCents-old.unitCents,
  observedBindingSummary:{productId:actual.productId,productRevision:1,assignmentRevision:1,documentSha256:actual.documentSha256,documentHashMethod:'id-binding-string-canonical'},bindingId:null,actualNativeOptionsCompared:false,proposedBindingTransition:{productId:actual.productId,productRevision:2,expectedAssignmentRevision:1,mode:'preview-only'}});
}
assert.equal(mappings.length,778);assert.equal(used.size,778);
const residual=live.variants.nodes.filter(v=>!used.has(v.id)).map(v=>({...v,action:'preserve-existing-shop-variant-and-revision-1-binding',proposedDeletion:false}));
assert.equal(residual.length,30);
for(const v of residual)assert.match(v.sku,/^156-TS-Acryl-RE-(50|60|80)X20-T30-(SW|AN)-(K00|KGL|KRA|B02|B02S)$/);
const labelRows=mappings.filter(v=>v.displayLabelChanges.length);assert.equal(labelRows.length,30);
const priceRows=mappings.filter(v=>v.existingShopMinusV9Cents!==0);
const sourceSha=digest(original),targetSha=digest(validated);
const targetText=json(validated),targetBytes=Buffer.from(targetText),gz=gzipSync(targetBytes,{level:9});
fs.writeFileSync(path.join(out,'target-document.preview.json.gz'),gz);
write('label-changes.json',{schema:'gravuru-main-target-label-preview/v1',changes,formats:specs,affectedVariants:labelRows.map(v=>({shopifyVariantId:v.shopifyVariantId,sku:v.sku,nativeOptions:v.nativeOptions,currentShopSelectedOptions:v.currentShopSelectedOptions,proposedSelectedOptions:v.proposedSelectedOptions,currentShopUnitCents:v.currentShopUnitCents,targetUnitCents:v.targetUnitCents})),sourceProductGroupDocumentSha256:sourceSha,targetProductGroupDocumentSha256:targetSha,sourceIdBindingDocumentSha256:bindingDigest(original),targetIdBindingDocumentSha256:bindingDigest(validated)});
write('variant-mapping.preview.json',{schema:'gravuru-main-target-variant-preview/v1',readOnly:true,sourceInventorySha256:sha(fs.readFileSync(inventoryFile)),shopifySnapshotPages:inventory.pages.filter(p=>p.id===live.id),operatorBindingEvidence:'https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6806442706',matches:mappings,residualVariants:residual,limit:'SKU + Shopify option mapping complete; per-row native binding IDs/options/contracts pending read-only operator comparison.'});
write('existing-price-differences.json',{schema:'gravuru-main-existing-price-comparison/v1',scope:'778 planned main-product combinations only',pricesChangedByPreview:0,matchingPriceCount:mappings.length-priceRows.length,differenceCount:priceRows.length,rows:priceRows.map(v=>({shopifyVariantId:v.shopifyVariantId,sku:v.sku,currentShopUnitCents:v.currentShopUnitCents,v9UnitCents:v.v9UnitCents,targetUnitCents:v.targetUnitCents,existingShopMinusV9Cents:v.existingShopMinusV9Cents}))});
write('update-intent.preview.json',{schema:'gravuru-main-target-update-intent-preview/v1',executable:false,confirmed:false,imported:false,executed:false,shopifyWrites:0,storeWrites:0,codeCommit,actual,proposedUpdate:{importAction:'update',productId:actual.productId,expectedRevision:1,proposedSuccessorRevision:2,documentProductGroupSha256:targetSha,documentIdBindingSha256:bindingDigest(validated),documentArtifactFile:'target-document.preview.json.gz',payloadStatus:'No import key, document entry, confirmation token or write callback; not an importBatch input.'},importContract:'Native repository.importBatch update, not product-group execute/new-product creation.',v9:{planId:plan.id,planHash:plan.planHash,compiledProductGroupDocumentSha256:sourceSha,compiledIdBindingDocumentSha256:bindingDigest(original),sourceAndTemplateHashMethod:'product-group-object-canonical',source:pair.source,template:pair.template,moduleProfile:plan.products[0].moduleProfile},pins:{moduleProfile:validated.config.moduleProfile,profileAssignments:validated.profileAssignments,localResolvedProfiles:pair.profileSelections,productionProfile:validated.productionProfile??null,targetResolutionVerified:false},counts:{shopifyBefore:808,plannedDocumentCombinations:778,matchedExistingVariantIds:778,preservedResidualVariantIds:30,newProducts:0,newShopifyVariants:0,deletions:0,labelAffectedVariants:labelRows.length,unchangedV9Prices:778,existingShopPriceDifferences:priceRows.length},preserve:{productId:actual.productId,shopifyProductId:live.id,all808VariantIds:true,all808Skus:true,featuredMediaId:'gid://shopify/MediaImage/70116579869052',otherExistingMediaId:'gid://shopify/MediaImage/70017733919100',shopifyStatus:'DRAFT',publication:false,titleDescriptionTagsMedia:'No Shopify mutation payload; preserve existing values.'},openEvidence:['Actual tenantId and exact live document/metadata comparison on operator backup','Native options/binding IDs/personalization contracts for all 808 active assignments','Real target module profile existence/equivalence and effective inherited profile pins','Fresh actual-head/assignment-head/Shopify evidence under native guards before any separately authorized write'],limits:['This is not a new persisted pgp plan and has no confirmation or execution token.','No ready-for-import claim: local cmp pin is unchanged, target profile mapping is unverified.','SQL revision 2 is the proposed successor of expected revision 1, not a revision created by this preview.','The 30 residual variants stay unchanged at revision 1; no implicit transfer or deletion.','Existing Shop price differences are separate from display-label correction.','Original imported config.profile identifiers remain source provenance; native HTTP model replaces profile.id/binding/revision with the real stored cfg identity.']});
for(const file of protectedFiles)assert.equal(sha(fs.readFileSync(path.join(source,file.name))),file.sha256,'Frozen v9 changed: '+file.name);
write('verification.json',{schema:'gravuru-main-target-preview-verification/v1',allPassed:true,codeCommit,checks:{frozenV9FilesUnchanged:true,onlySixLabelFieldsChanged:true,nativeProductValidationUnchanged:true,nativeShopPreparationSourceReady:true,v9Prices778Unchanged:true,optionsAndGeometry778Unchanged:true,exactSkuMatches778:true,actualShopOptionMapping778:true,preserveAll808Ids:true,residualOnlyKnownSmall30:true,labelsAffected30:true},sourceProductGroupDocumentSha256:sourceSha,targetProductGroupDocumentSha256:targetSha,sourceIdBindingDocumentSha256:bindingDigest(original),targetIdBindingDocumentSha256:bindingDigest(validated),targetTransportSerializedSha256:sha(targetBytes),targetDocumentGzipSha256:sha(gz),nativePreparationSha256:prepared.sha256,protectedFiles,localWrites:'Preview artifact files only; no database or API constructors called.',serverVerified:false,shopReady:prepared.shopReady,productionReady:prepared.productionReady});
write('native-preparation.preview.json',{...prepared,variants:prepared.variants,documentProductGroupSha256:targetSha,documentIdBindingSha256:bindingDigest(validated),notice:'In-memory preview; profile pins were NOT resolved against server registry.'});
console.log(JSON.stringify({allPassed:true,mapped:mappings.length,residual:residual.length,labelAffected:labelRows.length,v9PricesUnchanged:778,existingPriceDifferences:priceRows.length,sourceSha,targetSha,output:out}));
