import {assertSnapshotMembers} from './snapshot-members.mjs';
// Explicit maintenance-only planner/revision/pin. No Shopify mutation is present.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {parseStoredDocument} from '../../app/workshop/product-document-resources.mjs';
import {merchantConfig,verifyMerchantStorage} from './merchant-config.mjs';
import {readPrivateFile} from './shopify-preflight.mjs';
import {hashPrivateFile} from './private-file-digest.mjs';
import {lockTestData} from './lock.mjs';
import {TARGET,VARIANTS,fail,digest,same,nextDocument,nextPricing,assertPlan,assertBackupChain} from './tier-update-plan.mjs';
import {createShopifyAdminReadonly} from '../../app/workshop/shopify-admin-readonly.mjs';
import {preflightVariantBindings} from '../../app/workshop/shopify-variant-preflight.mjs';
import {createProductRepository} from '../../app/workshop/repository.mjs';
import {validateProductDocument} from '../../app/workshop/product-model.mjs';
import {createProfileLibrary} from '../../app/workshop/profile-library.mjs';
import {createProductionProfiles} from '../../app/workshop/production-profiles.mjs';
import {createDesignAssetStore} from '../../app/workshop/design-assets.mjs';
import {createFontLibrary} from '../../app/workshop/font-library.mjs';
import {createOrderIntake} from '../../app/workshop/order-intake.mjs';
import {workshopCatalog} from '../../app/workshop/catalog.mjs';
import {productOverview} from '../../app/workshop/product-preview.mjs';
import {isFormProduct,formOverview} from '../../app/workshop/form-product.mjs';
import {variantKey} from '../../app/configurator/variant-m/commerce-model.mjs';

const shaPattern=/^[a-f0-9]{64}$/;
export function privatePath(file,root){
 if(typeof file!=='string'||!path.isAbsolute(file)||path.resolve(file)!==file||!file.startsWith(root+path.sep)||fs.realpathSync(path.dirname(file))!==path.dirname(file))fail('private_path');
 const parent=fs.lstatSync(path.dirname(file));if(!parent.isDirectory()||parent.isSymbolicLink()||parent.uid!==process.getuid()||parent.mode&0o077)fail('private_parent');
 return file;
}
export function jsonFile(file,sha,root){
 privatePath(file,root);if(!shaPattern.test(sha||''))fail('expected_digest');
 const text=readPrivateFile(file,16*1024*1024);if(digest(text)!==sha)fail('input_digest');return JSON.parse(text);
}
export function writeNew(file,value,root){
 privatePath(file,root);const text=JSON.stringify(value,null,2)+'\n';
 const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
 try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 const parent=fs.openSync(path.dirname(file),fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}
 if(readPrivateFile(file,16*1024*1024)!==text)fail('output_readback');return {bytes:Buffer.byteLength(text),sha256:digest(text)};
}
export function verifyEvidence(evidence,root){
 if(evidence?.schema!=='gravuru-memorial-tier-evidence/v1')fail('evidence_schema');
 const records={};for(const key of ['snapshotManifest','restoreReport','sourceReceipt']){const entry=evidence[key];records[key]=jsonFile(entry?.path,entry?.sha256,root);}
 const source=evidence.sourceArchive;privatePath(source?.path,root);
 const archive=hashPrivateFile(source.path);if(source.sha256!==TARGET.sourceArchiveSha256||archive.sha256!==source.sha256||archive.bytes!==TARGET.sourceArchiveBytes)fail('source_archive_digest');
 assertBackupChain(records.snapshotManifest,records.restoreReport,records.sourceReceipt);
 const backup=path.dirname(evidence.snapshotManifest.path);
 if(path.basename(evidence.snapshotManifest.path)!=='SNAPSHOT.json')fail('snapshot_members');assertSnapshotMembers(backup);
 for(const db of records.snapshotManifest.databases){const actual=hashPrivateFile(path.join(backup,db.file));if(actual.bytes!==db.bytes||actual.sha256!==db.sha256)fail('snapshot_database_digest');}
 return {backup};
}
export function readState(filename){
 const db=new DatabaseSync(filename,{readOnly:true});try{
  const row=db.prepare('SELECT p.id,p.revision,p.archived,p.published_revision,r.document,r.metadata FROM products p JOIN product_revisions r ON p.id=r.product_id AND p.revision=r.revision WHERE p.id=?').get(TARGET.productId);
  if(!row||row.archived)fail('product_unavailable');
  const record={id:row.id,revision:row.revision,status:row.published_revision===row.revision?'active':'draft',document:parseStoredDocument(db,row.document,{tenantId:'gravuru'}),metadata:JSON.parse(row.metadata)};
  const mappings=db.prepare('SELECT b.variant_id,s.options FROM form_shop_bindings b JOIN form_shop_binding_selections s ON s.binding_id=b.id WHERE b.product_id=? AND b.product_revision=? AND b.shop=? ORDER BY b.variant_id').all(TARGET.productId,TARGET.fromRevision,TARGET.shopDomain).map(b=>({key:variantKey(JSON.parse(b.options)),variantId:b.variant_id}));
  if(mappings.length!==9||!same(mappings.map(b=>b.variantId).sort(),VARIANTS))fail('previous_bindings');
  return {record,mappings};
 }finally{db.close();}
}
function assertCurrent(plan,state,allowNew=false){
 const expected=state.record.revision===TARGET.fromRevision?plan.documentBefore:allowNew&&state.record.revision===TARGET.toRevision?plan.documentAfter:null;
 if(!expected||!same(state.record.document,expected)||!same(state.mappings,plan.mappings))fail('concurrent_product_change');
}
function repositoryFor(data,stores){
 const fonts=createFontLibrary({filename:path.join(data,'design-assets.sqlite')});stores.push(fonts);
 const profiles=createProfileLibrary({filename:path.join(data,'profiles.sqlite'),catalog:workshopCatalog()});stores.push(profiles);profiles.registerFonts(fonts.list());
 const production=createProductionProfiles({filename:path.join(data,'profiles.sqlite')});stores.push(production);
 const assets=createDesignAssetStore({filename:path.join(data,'design-assets.sqlite')});stores.push(assets);
 const repository=createProductRepository({filename:path.join(data,'workshop.sqlite'),catalogOverview:d=>isFormProduct(d)?formOverview(d):productOverview(d),validateDocument:value=>{const d=validateProductDocument(value);profiles.resolve(d);assets.validateDocument(d);production.resolve(d);return d;},snapshotMetadata:d=>({profiles:profiles.resolve(d),productionProfile:production.resolve(d)})});stores.push(repository);return repository;
}
export async function run(args){
 const [phase,input,inputSha,output]=args;
 if(args.length!==4||!['prepare','create-revision','pin'].includes(phase))fail('arguments');
 process.umask(0o077);const configFile=process.env.GRAVURU_SHOPIFY_CONFIG_FILE;
 if(!configFile||path.basename(configFile)!=='gravuru-2027-merchant-shopify.json')fail('config_target');
 const root=path.dirname(configFile),config=merchantConfig(process.env);
 if(path.basename(root)!=='private'||config.origin!=='https://app-2027.gravuru-designwerkstatt.de'||config.merchantTestCart?.productId!==TARGET.productId||![5,6].includes(config.merchantTestCart.productRevision))fail('runtime_target');
 privatePath(output,root);if(fs.existsSync(output)||output.startsWith(config.data+path.sep))fail('new_output_required');verifyMerchantStorage(config);
 const supplied=jsonFile(input,inputSha,root),plan=phase==='prepare'?null:assertPlan(supplied),evidence=plan?.evidence||supplied;
 const {backup}=verifyEvidence(evidence,root); // hashes all three finished backups, never live DB files
 const saved=readState(path.join(backup,'workshop.sqlite'));
 if(saved.record.revision!==TARGET.fromRevision)fail('backup_product_revision');
 if(plan&&(!same(saved.record.document,plan.documentBefore)||!same(saved.mappings,plan.mappings)))fail('backup_plan_mismatch');
 const lock=await lockTestData(config),released=once(lock,'exit'),stores=[];
 try{
  const before=readPrivateFile(configFile,16384),beforeConfig=JSON.parse(before),filename=path.join(config.data,'workshop.sqlite'),state=readState(filename);
  if(phase==='prepare'){
   if(config.merchantTestCart.productRevision!==5||state.record.revision!==5||!same(state,saved))fail('live_backup_mismatch');
   const documentAfter=nextDocument(state.record.document);if(!same(validateProductDocument(documentAfter),documentAfter))fail('document_normalization_changed');
   const client=createShopifyAdminReadonly({readSecret:()=>config.runtimeEnv.GRAVURU_SHOPIFY_CLIENT_SECRET});
   const remote=await client.inspectProductPricing(TARGET.shopifyProductId),pricingBefore=remote.product?.pricing,pricingAfter=nextPricing(pricingBefore,documentAfter);
   const checked=await preflightVariantBindings({record:state.record,shopifyProductId:TARGET.shopifyProductId,mappings:state.mappings},client);if(!checked.matches||!checked.complete)fail('variant_preflight');
   const prepared=assertPlan({schema:'gravuru-memorial-tier-plan/v1',target:TARGET,evidence,configBeforeSha256:digest(before),documentBefore:state.record.document,documentAfter,documentBeforeSha256:digest(state.record.document),documentAfterSha256:digest(documentAfter),pricingBefore,pricingAfter,pricingBeforeSha256:digest(pricingBefore),pricingAfterSha256:digest(pricingAfter),mappings:state.mappings,preparedAt:new Date().toISOString(),productionReady:false,shopifyChanged:false});
   const written=writeNew(output,prepared,root);return {ok:true,phase,...written,productRevision:6,pricingRevision:'31',variants:9,liveDataChanged:false,shopifyChanged:false};
  }
  assertCurrent(plan,state,true);
  // Equality is checked against the exact original bytes below unless already pinned.
  if(config.merchantTestCart.productRevision===5&&digest(before)!==plan.configBeforeSha256)fail('concurrent_config_change');
  if(phase==='create-revision'){
   if(config.merchantTestCart.productRevision!==5)fail('pin_must_remain_previous');
   const repository=repositoryFor(config.data,stores),unrelated=repository.list({includeArchived:true}).filter(r=>r.id!==TARGET.productId).map(r=>[r.id,r.revision,digest(r.document)]);
   const record=state.record.revision===6?repository.get(TARGET.productId):repository.save(TARGET.productId,plan.documentAfter,5);
   if(record.revision!==6||!same(record.document,plan.documentAfter)||!same(repository.get(TARGET.productId,{revision:5}).document,plan.documentBefore))fail('revision_readback');
   if(!same(unrelated,repository.list({includeArchived:true}).filter(r=>r.id!==TARGET.productId).map(r=>[r.id,r.revision,digest(r.document)])))fail('unrelated_product_changed');
   const result={schema:'gravuru-memorial-tier-revision/v1',ok:true,planSha256:inputSha,productId:TARGET.productId,previousRevision:5,productRevision:6,documentSha256:plan.documentAfterSha256,previousRevisionPreserved:true,unrelatedProductsUnchanged:unrelated.length,pinUnchanged:true,shopifyChanged:false,productionReady:false};
   return {ok:true,phase,...writeNew(output,result,root),created:state.record.revision===5,productRevision:6,pin:5};
  }
  if(state.record.revision!==6)fail('new_revision_missing');
  // Do not infer a rollback config from a changed file: the private plan binds all original bytes.
  const afterConfig=structuredClone(beforeConfig);afterConfig.values.GRAVURU_SHOPIFY_TEST_CART_REVISION='6';
  if(config.merchantTestCart.productRevision===6)fail('already_pinned_use_receipt');
  const client=createShopifyAdminReadonly({readSecret:()=>config.runtimeEnv.GRAVURU_SHOPIFY_CLIENT_SECRET});
  const remote=await client.inspectProductPricing(TARGET.shopifyProductId);if(!same(remote.product?.pricing,plan.pricingAfter))fail('shopify_pricing_not_applied');
  const checked=await preflightVariantBindings({record:state.record,shopifyProductId:TARGET.shopifyProductId,mappings:plan.mappings},client);if(!checked.matches||!checked.complete)fail('variant_preflight');
  const configBackup=writeNew(output+'.previous-config.json',{schema:'gravuru-memorial-config-backup/v1',originalSha256:plan.configBeforeSha256,originalText:before},root);
  const db=new DatabaseSync(filename);stores.push(db);const intake=createOrderIntake({database:db,snapshot:()=>{throw Error('maintenance_no_snapshot');}});
  const bound=intake.bindVariants({record:state.record,shopDomain:TARGET.shopDomain,mappings:plan.mappings,personalizationPricing:remote.product.pricing});if(bound.bindings.length!==9)fail('binding_count');
  const temporary=configFile+'.tier-revision-6.new';writeNew(temporary,afterConfig,root);
  if(readPrivateFile(configFile,16384)!==before)fail('concurrent_config_change');fs.renameSync(temporary,configFile);
  const parentFd=fs.openSync(root,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);try{fs.fsyncSync(parentFd);}finally{fs.closeSync(parentFd);}
  if(merchantConfig(process.env).merchantTestCart.productRevision!==6)fail('pin_readback');
  const result={schema:'gravuru-memorial-tier-pin/v1',ok:true,planSha256:inputSha,productRevision:6,pricingRevision:'31',bindings:9,bindingsCreated:bound.created,previousBindingsPreserved:true,configBackupSha256:configBackup.sha256,configSha256:digest(readPrivateFile(configFile,16384)),shopifyChanged:false,productionReady:false};
  return {ok:true,phase,...writeNew(output,result,root),productRevision:6,bindings:9};
 }finally{for(const store of stores.reverse())store.close();lock.stdin.end();await released;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await run(process.argv.slice(2))));}catch(error){console.log(JSON.stringify({ok:false,code:/^[a-z_]+$/.test(error?.code||'')?error.code:'tier_operation_failed'}));process.exitCode=1;}
}
