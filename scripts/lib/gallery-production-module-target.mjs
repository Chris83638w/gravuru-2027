import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {isDeepStrictEqual} from 'node:util';
import {createProductRepository} from '../../app/workshop/repository.mjs';
import {createOrderIntake} from '../../app/workshop/order-intake.mjs';
import {createShopBindingReadAdapter} from '../../app/workshop/shop-product-binding-adapter.mjs';
import {createShopProductBindingStore} from '../../app/workshop/shop-product-binding-store.mjs';
import {createCatalogLiveOrders} from '../../app/workshop/catalog-live-orders.mjs';
import {validateProductDocument} from '../../app/workshop/product-model.mjs';
import {productOverview} from '../../app/workshop/product-preview.mjs';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
import {applyModuleProfile} from '../../app/configurator/variant-m/module-profile.mjs';

const fail=(code,status=409)=>{throw Object.assign(Error('Der Modulabgleich passt nicht zum ausdrücklich verbundenen Produktstand.'),{code,status});};
const copy=structuredClone;

/** Opens ONLY the existing target store. Default is a true SQLite reader. The
 * explicit write mode reuses native append/CAS, binding and approval functions;
 * it cannot create a product, edit artwork/prices or touch order snapshots. */
export function openProductionModuleTarget({filename,expected,moduleProfiles,allowedProfileIds,writeEnabled=false,clock=Date.now}={}){
 if(!path.isAbsolute(filename||'')||fs.realpathSync(filename)!==filename||!fs.statSync(filename).isFile()||typeof writeEnabled!=='boolean'||
  !expected?.tenantId||moduleProfiles?.tenantId!==expected.tenantId||typeof moduleProfiles.get!=='function'||!Array.isArray(allowedProfileIds)||!allowedProfileIds.length||new Set(allowedProfileIds).size!==allowedProfileIds.length||
  expected.storeId!=='acryl'||!Number.isSafeInteger(expected.revision)||expected.revision<1||!/^[a-f0-9]{64}$/.test(expected.documentSha256||'')||!Array.isArray(expected.shopifyVariantIds)||expected.shopifyVariantIds.length!==404||new Set(expected.shopifyVariantIds).size!==404)fail('module_target_scope',422);
 const scope=copy(expected),allowed=new Set(allowedProfileIds),db=new DatabaseSync(filename,{readOnly:!writeEnabled});let nativeRepository;
 try{
  db.exec('PRAGMA busy_timeout=5000;');if(!writeEnabled)db.exec('PRAGMA query_only=ON;');
  if(db.prepare('PRAGMA user_version').get().user_version!==4)fail('module_target_schema');
  const numeric=scope.shopifyVariantIds.map(id=>{if(!/^gid:\/\/shopify\/ProductVariant\/[1-9]\d{0,19}$/.test(id))fail('module_target_scope',422);return id.split('/').at(-1);});
  function get(id,{revision}={}){
   if(id!==scope.productId||revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1))fail('module_target_product',422);
   const p=db.prepare('SELECT revision,kind,archived,created_at FROM products WHERE tenant_id=? AND id=?').get(scope.tenantId,id);
   if(!p||p.archived||p.kind!=='product')fail('module_target_product');
   const row=db.prepare('SELECT * FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get(scope.tenantId,id,revision??p.revision);
   if(!row||row.status==='archived')fail('module_target_revision');
   return {id,revision:row.revision,status:row.status,publishedRevision:row.published_revision,document:JSON.parse(row.document),metadata:JSON.parse(row.metadata),createdAt:p.created_at,updatedAt:row.created_at};
  }
  const capability=get(scope.productId,{revision:scope.revision});
  if(syncHash(capability.document)!==scope.documentSha256||capability.document.config.moduleProfile||capability.document.productionProfile!=null)fail('module_target_capability');
  function assertDocument(document,{latest=false}={}){
   if(isDeepStrictEqual(document,capability.document))return document;
   const policy=document?.config?.moduleProfile;
   if(!policy||!allowed.has(policy.id))fail('module_target_profile');
   const saved=moduleProfiles.get(policy.id,latest?{}:{revision:policy.revision});
   if(!isDeepStrictEqual(saved.profile,policy))fail('module_target_profile_changed');
   const projected={...copy(capability.document),config:applyModuleProfile(capability.document.config,saved.profile)};
   if(!isDeepStrictEqual(document,validateProductDocument(projected)))fail('module_target_artwork_or_commerce');
   return document;
  }
  assertDocument(get(scope.productId).document);
  // All resources/metadata are identical to the pinned, already accepted r4.
  // New references cannot enter this writer; no asset/profile constructor runs.
  let saving=false;
  if(writeEnabled)nativeRepository=createProductRepository({filename,tenantId:scope.tenantId,catalogOverview:productOverview,
   validateDocument:document=>{if(!saving)fail('module_target_write_scope');return assertDocument(validateProductDocument(document),{latest:true});},snapshotMetadata:()=>copy(capability.metadata)});
  const repository={tenantId:scope.tenantId,get,save(id,document,expectedRevision){
   if(!writeEnabled)fail('module_target_write_disabled',403);
   const current=get(id);assertDocument(current.document);assertDocument(document,{latest:true});
   if(current.revision!==expectedRevision)fail('module_target_revision_conflict');
   saving=true;try{return nativeRepository.save(id,document,expectedRevision);}finally{saving=false;}
  }};
  const bindingsQuery=db.prepare(`SELECT b.id,b.shop,b.variant_id,b.product_id,b.product_revision,b.unit_cents,s.options FROM form_shop_bindings b LEFT JOIN form_shop_binding_selections s ON s.tenant_id=b.tenant_id AND s.binding_id=b.id WHERE b.tenant_id=? AND b.shop=? AND b.variant_id IN (${numeric.map(()=>'?').join(',')}) ORDER BY b.rowid DESC LIMIT 12001`);
  const nativeIntake=writeEnabled?createOrderIntake({database:db,tenantId:scope.tenantId,clock,snapshot(){fail('module_target_orders_disabled',403);}}):null;
  const catalog=createCatalogLiveOrders({database:db,tenantId:scope.tenantId,clock});
  const checkPairs=pairs=>{if(!Array.isArray(pairs)||!pairs.length||pairs.length>404||pairs.some(p=>p.shopifyProductId!==scope.shopifyProductId||!scope.shopifyVariantIds.includes(p.shopifyVariantId)))fail('module_target_binding_scope',422);};
  const checkApproval=input=>{if(input.shopDomain!==scope.shopDomain||input.shopifyProductId!==scope.shopifyProductId||input.productId!==scope.productId||!Number.isSafeInteger(input.productRevision)||input.productRevision<scope.revision)fail('module_target_approval_scope',422);};
  const orderIntake={tenantId:scope.tenantId,bindings(){
   const rows=bindingsQuery.all(scope.tenantId,scope.shopDomain,...numeric);if(rows.length>12000)fail('module_target_history_bound');
   return rows.map(r=>({id:r.id,shopDomain:r.shop,variantId:r.variant_id,productId:r.product_id,productRevision:r.product_revision,unitCents:r.unit_cents,...(r.options===null?{}:{options:JSON.parse(r.options)})}));
  },bindVariants(args){
   if(!writeEnabled)fail('module_target_write_disabled',403);
   if(args.shopDomain!==scope.shopDomain||args.record?.id!==scope.productId||!Array.isArray(args.mappings)||args.mappings.some(m=>!numeric.includes(String(m.variantId))))fail('module_target_binding_scope',422);
   return nativeIntake.bindVariants(args);
  },bindingPricing(bindingId){
   const row=db.prepare('SELECT b.shop,b.variant_id,b.product_id,p.document FROM form_shop_bindings b LEFT JOIN form_shop_binding_personalization p ON p.tenant_id=b.tenant_id AND p.binding_id=b.id WHERE b.tenant_id=? AND b.id=?').get(scope.tenantId,bindingId);
   if(!row||row.shop!==scope.shopDomain||row.product_id!==scope.productId||!numeric.includes(row.variant_id))fail('module_target_binding_scope',422);
   return row.document===null?null:JSON.parse(row.document);
  },catalogLiveApprovals(inputs){
   if(!Array.isArray(inputs)||!inputs.length||inputs.length>404)fail('module_target_approval_scope',422);
   for(const input of inputs){checkApproval(input);if(!scope.shopifyVariantIds.includes(input.shopifyVariantId))fail('module_target_approval_scope',422);}
   return catalog.approvals(inputs);
  },withBindingTransaction(write){if(!writeEnabled)fail('module_target_write_disabled',403);return nativeIntake.withBindingTransaction(write);},
  approveCatalogLiveProducts(args){
   if(!writeEnabled)fail('module_target_write_disabled',403);
   if(args.shopDomain!==scope.shopDomain||args.products?.length!==1)fail('module_target_approval_scope',422);
   checkApproval({...args.products[0],shopDomain:args.shopDomain});return nativeIntake.approveCatalogLiveProducts(args);
  }};
  const productionProfiles={resolve(document){if(document.productionProfile!=null)fail('module_target_capability');return null;}};
  const workshop={tenantId:scope.tenantId,repository,orderIntake,productionProfiles,sessionContext:{shopDomain:scope.shopDomain}};
  const adapter=createShopBindingReadAdapter({tenantId:scope.tenantId,storeId:scope.storeId,shopDomain:scope.shopDomain,workshop,productionProfileScope:{tenantId:scope.tenantId,storeId:scope.storeId}});
  orderIntake.idBindings=({storeId,shopDomain,adapter:requested,personalizationPricingFor}={})=>{
   if(storeId!==scope.storeId||shopDomain!==scope.shopDomain)fail('module_target_binding_scope',422);
   const native=createShopProductBindingStore({database:db,orderIntake,tenantId:scope.tenantId,storeId,shopDomain,adapter:requested,personalizationPricingFor,readOnly:!writeEnabled,clock});
   return Object.freeze({resolve(pair){checkPairs([pair]);return native.resolve(pair);},resolveMany(pairs){checkPairs(pairs);return native.resolveMany(pairs);},withReadSnapshot:read=>native.withReadSnapshot(read),persist(args){
    if(!writeEnabled)fail('module_target_write_disabled',403);
    if(args.plan?.entries?.some(e=>e.productId!==scope.productId))fail('module_target_binding_scope',422);
    checkPairs(args.plan?.entries);return native.persist(args);
   }});
  };
  const registry=orderIntake.idBindings({storeId:scope.storeId,shopDomain:scope.shopDomain,adapter});let closed=false;
  return Object.freeze({targetWorkshop:workshop,readBindings:pairs=>registry.resolveMany(pairs),readApprovals:inputs=>orderIntake.catalogLiveApprovals(inputs),assertDocument,
   get capability(){return copy(capability);},canActivate:writeEnabled,close(){if(!closed){closed=true;nativeRepository?.close();db.close();}}});
 }catch(error){nativeRepository?.close();db.close();throw error;}
}
