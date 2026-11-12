// Readonly native bridge. No Workshop/Repository/Profile constructor, checker,
// Shopify transport, approval writer or mutation API is exposed.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
const fail=code=>{throw Object.assign(Error(code),{code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const sha=v=>createHash('sha256').update(v).digest('hex');
const canon=v=>Array.isArray(v)?'['+v.map(canon).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}':JSON.stringify(v);
const digest=v=>sha(canon(v));
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function file(value){need(typeof value==='string'&&path.isAbsolute(value)&&fs.realpathSync(value)===value&&fs.statSync(value).isFile(),'main_readonly_file');return value;}
// Low-level fixed-scope reader used by the pinned adapterFactory below. Its
// explicit expected argument also permits small synthetic SQLite fixtures.
export function openScopedReadonlyTarget({workshopFilename,profilesFilename,expected,native,clock=Date.now}){
 const scope=structuredClone(expected);
 need(scope&&typeof scope.tenantId==='string'&&typeof scope.storeId==='string'&&typeof scope.shopDomain==='string'&&/^cfg_[a-f0-9-]{36}$/.test(scope.productId)&&/^gid:\/\/shopify\/Product\/[1-9]\d*$/.test(scope.shopifyProductId),'main_readonly_scope');
 need(Array.isArray(scope.shopifyVariantIds)&&scope.shopifyVariantIds.length===808&&new Set(scope.shopifyVariantIds).size===808&&scope.shopifyVariantIds.every(id=>/^gid:\/\/shopify\/ProductVariant\/[1-9]\d{0,19}$/.test(id))&&hex(scope.documentSha256?.[1])&&hex(scope.documentSha256?.[2])&&hex(scope.revision2MetadataSha256),'main_readonly_scope');
 for(const key of ['createShopBindingReadAdapter','createShopProductBindingStore','createCatalogLiveOrders','productionSubject','profileBlockers'])need(typeof native?.[key]==='function','main_readonly_native_api');
 const wPath=file(workshopFilename),pPath=file(profilesFilename);need(wPath!==pPath,'main_readonly_files_distinct');
 const db=new DatabaseSync(wPath,{readOnly:true});let profilesDb;
 try{
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000');
  need(db.prepare('PRAGMA user_version').get().user_version===4,'main_readonly_schema');
  profilesDb=new DatabaseSync(pPath,{readOnly:true});profilesDb.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000');
  for(const [database,table] of [[db,'products'],[db,'product_revisions'],[db,'form_shop_bindings'],[db,'form_shop_binding_selections'],[db,'form_shop_binding_personalization'],[profilesDb,'manufacturing_profiles'],[profilesDb,'manufacturing_profile_revisions']])need(database.prepare('PRAGMA table_info('+table+')').all().some(c=>c.name==='tenant_id'),'main_readonly_tenant_schema');
  const allowed=new Set(scope.shopifyVariantIds),numeric=scope.shopifyVariantIds.map(id=>id.split('/').at(-1)),numbers=new Set(numeric);
  const revision=rev=>need(rev===1||rev===2,'main_readonly_revision');
  const repository=Object.freeze({tenantId:scope.tenantId,get(id,{revision:rev}={}){
   need(id===scope.productId,'main_readonly_product');if(rev!==undefined)revision(rev);
   const p=db.prepare('SELECT id,revision,kind,archived,created_at FROM products WHERE tenant_id=? AND id=?').get(scope.tenantId,id);
   need(p&&!p.archived&&p.kind==='product','main_readonly_product');revision(p.revision);
   const r=db.prepare('SELECT revision,status,document,metadata,published_revision,created_at FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get(scope.tenantId,id,rev??p.revision);
   need(r&&r.status!=='archived','main_readonly_revision');
   const document=JSON.parse(r.document),metadata=JSON.parse(r.metadata);
   need(digest(document)===scope.documentSha256[r.revision],'main_readonly_document_pin');
   if(r.revision===2)need(digest(metadata)===scope.revision2MetadataSha256,'main_readonly_metadata_pin');
   return {id,revision:r.revision,status:r.status,publishedRevision:r.published_revision,document,metadata,createdAt:p.created_at,updatedAt:r.created_at};
  }});
  // Same explicit revision getter and compatibility predicates as native
  // production-profiles.mjs, without its schema-initializing constructor.
  const productionProfiles=Object.freeze({tenantId:scope.tenantId,resolve(document){
   need(Object.values(scope.documentSha256).includes(digest(document)),'main_readonly_profile_document_scope');
   const ref=document.productionProfile;if(ref==null)return null;
   need(ref&&Object.keys(ref).sort().join(',')==='id,revision'&&/^mfg_[a-f0-9-]{36}$/.test(ref.id)&&Number.isSafeInteger(ref.revision)&&ref.revision>0,'main_readonly_profile_reference');
   const row=profilesDb.prepare('SELECT r.* FROM manufacturing_profile_revisions r JOIN manufacturing_profiles p ON p.id=r.profile_id WHERE p.id=? AND p.tenant_id=? AND r.tenant_id=p.tenant_id AND r.revision=?').get(ref.id,scope.tenantId,ref.revision);
   need(row&&sha(row.document)===row.sha256,'main_readonly_profile_pin');
   const d=JSON.parse(row.document),subject=native.productionSubject(document);
   need(!d.archived&&d.method===subject.method&&d.materialId===subject.materialId&&d.thicknessMm===subject.thicknessMm,'main_readonly_profile_incompatible');
   const result={id:row.profile_id,revision:row.revision,document:d,sha256:row.sha256,createdAt:row.created_at,productionReady:false};return {...result,blockers:native.profileBlockers(result)};
  }});
  const query=db.prepare(`SELECT b.id,b.shop,b.variant_id,b.product_id,b.product_revision,b.unit_cents,s.options FROM form_shop_bindings b LEFT JOIN form_shop_binding_selections s ON s.tenant_id=b.tenant_id AND s.binding_id=b.id WHERE b.tenant_id=? AND b.shop=? AND b.variant_id IN (${numeric.map(()=>'?').join(',')}) ORDER BY b.rowid DESC`);
  const pairGuard=pairs=>need(Array.isArray(pairs)&&pairs.length>0&&pairs.length<=808&&new Set(pairs.map(p=>p.shopifyVariantId)).size===pairs.length&&pairs.every(p=>p.shopifyProductId===scope.shopifyProductId&&allowed.has(p.shopifyVariantId)),'main_readonly_pairs');
  const catalog=native.createCatalogLiveOrders({database:db,tenantId:scope.tenantId,clock});
  const orderIntake=Object.freeze({tenantId:scope.tenantId,
   bindVariants(){fail('main_readonly_write');}, // Required native constructor shape only.
   bindings(){return query.all(scope.tenantId,scope.shopDomain,...numeric).map(r=>{need(r.product_id===scope.productId&&(r.product_revision===1||r.product_revision===2),'main_readonly_binding_history_scope');return {id:r.id,shopDomain:r.shop,variantId:r.variant_id,productId:r.product_id,productRevision:r.product_revision,unitCents:r.unit_cents,...(r.options===null?{}:{options:JSON.parse(r.options)})};});},
   bindingPricing(bindingId){
    const r=db.prepare('SELECT b.shop,b.variant_id,b.product_id,b.product_revision,p.document FROM form_shop_bindings b LEFT JOIN form_shop_binding_personalization p ON p.tenant_id=b.tenant_id AND p.binding_id=b.id WHERE b.tenant_id=? AND b.id=?').get(scope.tenantId,bindingId);
    need(r&&r.shop===scope.shopDomain&&r.product_id===scope.productId&&numbers.has(r.variant_id),'main_readonly_binding');revision(r.product_revision);return r.document===null?null:JSON.parse(r.document);
   },
   catalogLiveApprovals(inputs){pairGuard(inputs);need(inputs.every(i=>i.shopDomain===scope.shopDomain&&i.productId===scope.productId&&(i.productRevision===1||i.productRevision===2)),'main_readonly_approval_scope');return catalog.approvals(inputs);}
  });
  const workshop=Object.freeze({tenantId:scope.tenantId,repository,orderIntake,productionProfiles,sessionContext:Object.freeze({shopDomain:scope.shopDomain})});
  repository.get(scope.productId);
  const adapter=native.createShopBindingReadAdapter({tenantId:scope.tenantId,storeId:scope.storeId,shopDomain:scope.shopDomain,productionProfileScope:{tenantId:scope.tenantId,storeId:scope.storeId},workshop});
  const store=native.createShopProductBindingStore({database:db,orderIntake,tenantId:scope.tenantId,storeId:scope.storeId,shopDomain:scope.shopDomain,adapter,readOnly:true,clock});
  const registry=Object.freeze({tenantId:scope.tenantId,storeId:scope.storeId,shopDomain:scope.shopDomain,
   resolveMany(pairs){pairGuard(pairs);return store.withReadSnapshot(()=>{
    const rows=store.resolveMany(pairs),seen=new Set();for(const r of rows){need(r.productId===scope.productId&&(r.productRevision===1||r.productRevision===2)&&r.documentSha256===scope.documentSha256[r.productRevision],'main_readonly_binding_pin');if(!seen.has(r.productRevision)){repository.get(scope.productId,{revision:r.productRevision});seen.add(r.productRevision);}}return rows;
   });}
  });
  let closed=false;return Object.freeze({workshop,registry,canWrite:false,close(){if(!closed){closed=true;try{db.close();}finally{profilesDb.close();}}}});
 }catch(error){try{db.close();}finally{profilesDb?.close();}throw error;}
}
