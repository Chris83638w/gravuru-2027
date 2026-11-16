import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createShopBindingReadAdapter} from '../../app/workshop/shop-product-binding-adapter.mjs';
import {createShopProductBindingStore} from '../../app/workshop/shop-product-binding-store.mjs';
import {createCatalogLiveOrders} from '../../app/workshop/catalog-live-orders.mjs';

const fail=code=>{throw Object.assign(Error('Die bestehende Zielwerkstatt kann nicht rein lesend geprüft werden.'),{code});};
const clone=structuredClone;
/** Same readonly bridge as the previously audited operator io.mjs, with
 * bindings limited to the explicitly pinned variant IDs and their histories.
 * All option/price/profile/head verification is the existing native adapter
 * and registry implementation. This object CANNOT activate a module plan. */
export function openProductionModuleReadonlyTarget({filename,expected,clock=Date.now}={}){
 if(!path.isAbsolute(filename||'')||fs.realpathSync(filename)!==filename||!fs.statSync(filename).isFile()||!expected?.tenantId||!expected.shopDomain||!expected.productId||!Array.isArray(expected.shopifyVariantIds)||expected.shopifyVariantIds.length!==404||new Set(expected.shopifyVariantIds).size!==404)fail('module_readonly_scope');
 const scope=clone(expected),db=new DatabaseSync(filename,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000');
  if(db.prepare('PRAGMA user_version').get().user_version!==4)fail('module_readonly_schema');
  const numeric=scope.shopifyVariantIds.map(id=>{if(!/^gid:\/\/shopify\/ProductVariant\/[1-9]\d{0,19}$/.test(id))fail('module_readonly_scope');return id.split('/').at(-1);});
  const repository={tenantId:scope.tenantId,get(id,{revision}={}){
   if(id!==scope.productId||revision!==undefined&&revision!==scope.revision)fail('module_readonly_product');
   const p=db.prepare('SELECT id,revision,kind,archived,created_at FROM products WHERE tenant_id=? AND id=?').get(scope.tenantId,id);
   if(!p||p.archived||p.kind!=='product')fail('module_readonly_product');
   const r=db.prepare('SELECT revision,status,document,metadata,published_revision,created_at FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get(scope.tenantId,id,revision??p.revision);
   if(!r)fail('module_readonly_revision');
   return{id,revision:r.revision,status:r.status,publishedRevision:r.published_revision,document:JSON.parse(r.document),metadata:JSON.parse(r.metadata),createdAt:p.created_at,updatedAt:r.created_at};
  }};
  const query=db.prepare(`SELECT b.id,b.shop,b.variant_id,b.product_id,b.product_revision,b.unit_cents,s.options FROM form_shop_bindings b LEFT JOIN form_shop_binding_selections s ON s.tenant_id=b.tenant_id AND s.binding_id=b.id WHERE b.tenant_id=? AND b.shop=? AND b.variant_id IN (${numeric.map(()=>'?').join(',')}) ORDER BY b.rowid DESC LIMIT 12001`);
  const orderIntake={tenantId:scope.tenantId,bindVariants(){fail('module_readonly_write');},bindings(){
   const rows=query.all(scope.tenantId,scope.shopDomain,...numeric);if(rows.length>12000)fail('module_readonly_history_bound');
   return rows.map(r=>({id:r.id,shopDomain:r.shop,variantId:r.variant_id,productId:r.product_id,productRevision:r.product_revision,unitCents:r.unit_cents,...(r.options===null?{}:{options:JSON.parse(r.options)})}));
  }};
  // Existing r4 has no productionProfile; never invent or discard one. If the
  // product gains a reference, its real profile reader must be connected first.
  const productionProfiles={resolve(document){if(document.productionProfile!=null)fail('module_readonly_profile_reader');return null;}};
  const workshop={tenantId:scope.tenantId,repository,orderIntake,productionProfiles,sessionContext:{shopDomain:scope.shopDomain}};
  const initial=repository.get(scope.productId);if(initial.document.productionProfile!=null)fail('module_readonly_profile_reader');
  const adapter=createShopBindingReadAdapter({tenantId:scope.tenantId,storeId:scope.storeId,shopDomain:scope.shopDomain,workshop,productionProfileScope:{tenantId:scope.tenantId,storeId:scope.storeId}});
  function scopedRegistry(native){
   const check=pairs=>{if(!Array.isArray(pairs)||!pairs.length||pairs.length>404||pairs.some(p=>p.shopifyProductId!==scope.shopifyProductId||!scope.shopifyVariantIds.includes(p.shopifyVariantId)))fail('module_readonly_scope');};
   return Object.freeze({resolveMany(pairs){check(pairs);return native.resolveMany(pairs);},resolve(pair){check([pair]);return native.resolve(pair);},withReadSnapshot:read=>native.withReadSnapshot(read),persist(){fail('module_readonly_write');}});
  }
  const registry=scopedRegistry(createShopProductBindingStore({database:db,orderIntake,tenantId:scope.tenantId,storeId:scope.storeId,shopDomain:scope.shopDomain,adapter,readOnly:true,clock}));
  const catalog=createCatalogLiveOrders({database:db,tenantId:scope.tenantId,clock});
  orderIntake.catalogLiveApprovals=inputs=>{
   if(!Array.isArray(inputs)||!inputs.length||inputs.length>404||inputs.some(i=>i.shopDomain!==scope.shopDomain||i.shopifyProductId!==scope.shopifyProductId||i.productId!==scope.productId||i.productRevision!==scope.revision||!scope.shopifyVariantIds.includes(i.shopifyVariantId)))fail('module_readonly_scope');
   return catalog.approvals(inputs);
  };
  orderIntake.withBindingTransaction=()=>fail('module_readonly_write');
  orderIntake.idBindings=({storeId,shopDomain,adapter:requested}={})=>{
   if(storeId!==scope.storeId||shopDomain!==scope.shopDomain)fail('module_readonly_scope');
   return scopedRegistry(createShopProductBindingStore({database:db,orderIntake,tenantId:scope.tenantId,storeId,shopDomain,adapter:requested,readOnly:true,clock}));
  };
  orderIntake.bindingPricing=bindingId=>{
   const row=db.prepare('SELECT b.shop,b.variant_id,b.product_id,p.document FROM form_shop_bindings b LEFT JOIN form_shop_binding_personalization p ON p.tenant_id=b.tenant_id AND p.binding_id=b.id WHERE b.tenant_id=? AND b.id=?').get(scope.tenantId,bindingId);
   if(!row||row.shop!==scope.shopDomain||row.product_id!==scope.productId||!numeric.includes(row.variant_id))fail('module_readonly_binding');
   return row.document===null?null:JSON.parse(row.document);
  };
  let closed=false;
  return Object.freeze({targetWorkshop:workshop,readBindings:pairs=>registry.resolveMany(pairs),readApprovals:inputs=>orderIntake.catalogLiveApprovals(inputs),canActivate:false,
   close(){if(!closed){closed=true;db.close();}}});
 }catch(error){db.close();throw error;}
}
