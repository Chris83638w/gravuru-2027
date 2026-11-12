import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {openScopedReadonlyTarget} from './readonly-target.mjs';
import {createMainProductionReadonlyAdapterFactory} from './adapter-factory.mjs';
const workspace=path.resolve(import.meta.dirname,'../../..');
const codeRoot=process.env.GRAVURU_NATIVE_ROOT||path.join(workspace,'work/issue230-integration-candidate');
const operatorRoot=process.env.GRAVURU_MAIN_OPERATOR||path.join(workspace,'work/restabschluss/main-shop-binding-operator-v2');
const load=(base,file)=>import(pathToFileURL(path.join(base,file)).href);
const [adapter,store,catalog,production,{POLICY,digest,loadPinnedMapping},{createMainReadOnlyGateway}]=await Promise.all([
 load(codeRoot,'app/workshop/shop-product-binding-adapter.mjs'),load(codeRoot,'app/workshop/shop-product-binding-store.mjs'),load(codeRoot,'app/workshop/catalog-live-orders.mjs'),load(codeRoot,'app/workshop/production-profiles.mjs'),load(operatorRoot,'main-operator.mjs'),load(operatorRoot,'gateways.mjs')]);
const native={...adapter,...store,...catalog,...production},mapping=loadPinnedMapping(path.join(operatorRoot,'variant-mapping.preview.json.gz'));
const variantIds=[...mapping.matches,...mapping.residual].map(v=>v.id),sha=b=>createHash('sha256').update(b).digest('hex');
const pair=id=>({shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:id});
function fixture(){
 const parent=path.join(import.meta.dirname,'.test-runs');fs.mkdirSync(parent,{recursive:true});const folder=fs.mkdtempSync(path.join(parent,'readonly-')),workshopFilename=path.join(folder,'workshop.sqlite'),profilesFilename=path.join(folder,'profiles.sqlite');
 const db=new DatabaseSync(workshopFilename),pd=new DatabaseSync(profilesFilename),tenant=POLICY.tenantId,cfg=POLICY.productId;
 db.exec(`PRAGMA user_version=4;
 CREATE TABLE products(id TEXT,revision INTEGER,kind TEXT,archived INTEGER,created_at TEXT,tenant_id TEXT);
 CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,status TEXT,document TEXT,metadata TEXT,published_revision INTEGER,created_at TEXT,tenant_id TEXT);
 CREATE TABLE form_shop_bindings(id TEXT,shop TEXT,variant_id TEXT,product_id TEXT,product_revision INTEGER,unit_cents INTEGER,created_at TEXT,tenant_id TEXT);
 CREATE TABLE form_shop_binding_selections(binding_id TEXT,options TEXT,tenant_id TEXT);
 CREATE TABLE form_shop_binding_personalization(binding_id TEXT,document TEXT,tenant_id TEXT);
 CREATE TABLE shop_product_binding_revisions(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER,product_gid TEXT,store_id TEXT,binding_id TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT,evidence_read_at TEXT,created_at TEXT);
 CREATE TABLE shop_product_binding_heads(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER);
 CREATE TABLE catalog_live_order_approvals(tenant_id TEXT,shop TEXT,product_gid TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT,variants_json TEXT,approval_id TEXT,approved_at TEXT);`);
 pd.exec('CREATE TABLE manufacturing_profiles(id TEXT,revision INTEGER,tenant_id TEXT); CREATE TABLE manufacturing_profile_revisions(profile_id TEXT,revision INTEGER,document TEXT,sha256 TEXT,created_at TEXT,tenant_id TEXT);');
 const mfg='mfg_00000000-0000-4000-8000-000000000001';
 // Minimal synthetic stored product documents exercise the native read shapes;
 // this is not a native product-validation or real Main-geometry test.
 const r1={schema:'gravuru-form-product/v1',kind:'product',name:'synthetic R1',material:{id:'steel',thicknessMm:1.5},processingMethod:'engraving',productionProfile:{id:mfg,revision:1}};
 const r2={...r1,name:'synthetic R2'};
 const profile={name:'fixture',method:'engraving',materialId:'steel',thicknessMm:1.5,machine:'fixture',rip:'',notes:'',output:{mode:'raster',dpi:300,mirror:false},archived:false};
 const profileJson=JSON.stringify(profile),profileSha=sha(profileJson),metadata={profiles:{selections:{fonts:['fixture-font'],motifs:['fixture-motif']},settingsRevision:17},productionProfile:{id:mfg,revision:1,sha256:profileSha,document:profile}};
 pd.prepare('INSERT INTO manufacturing_profiles VALUES(?,?,?)').run(mfg,1,tenant);pd.prepare('INSERT INTO manufacturing_profile_revisions VALUES(?,?,?,?,?,?)').run(mfg,1,profileJson,profileSha,'fixture',tenant);
 db.prepare('INSERT INTO products VALUES(?,?,?,?,?,?)').run(cfg,2,'product',0,'fixture',tenant);
 for(const [revision,document] of [[1,r1],[2,r2]])db.prepare('INSERT INTO product_revisions VALUES(?,?,?,?,?,?,?,?)').run(cfg,revision,'draft',JSON.stringify(document),JSON.stringify(metadata),null,'fixture',tenant);
 db.exec('BEGIN');
 for(let i=0;i<808;i++){
  const id=variantIds[i],num=id.split('/').at(-1),options={fixture:'yes'};
  for(const rev of i<778?[1,2]:[1]){const bid='binding_fixture_'+i+'_'+rev;db.prepare('INSERT INTO form_shop_bindings VALUES(?,?,?,?,?,?,?,?)').run(bid,POLICY.shopDomain,num,cfg,rev,799,'fixture',tenant);db.prepare('INSERT INTO form_shop_binding_selections VALUES(?,?,?)').run(bid,JSON.stringify(options),tenant);db.prepare('INSERT INTO form_shop_binding_personalization VALUES(?,?,?)').run(bid,JSON.stringify({revision:String(rev),baseCents:799}),tenant);}
  const rev=i<778?2:1;db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(tenant,POLICY.shopDomain,id,rev,POLICY.shopifyProductId,POLICY.storeId,'binding_fixture_'+i+'_'+rev,cfg,rev,digest(rev===1?r1:r2),'fixture','fixture');db.prepare('INSERT INTO shop_product_binding_heads VALUES(?,?,?,?)').run(tenant,POLICY.shopDomain,id,rev);
 }
 for(const [rev,doc,ids] of [[1,r1,variantIds],[2,r2,variantIds.slice(0,778)]])db.prepare('INSERT INTO catalog_live_order_approvals VALUES(?,?,?,?,?,?,?,?,?)').run(tenant,POLICY.shopDomain,POLICY.shopifyProductId,cfg,rev,sha(JSON.stringify(doc)),JSON.stringify(ids),'fixture-R'+rev,'fixture');
 db.exec('COMMIT');db.close();pd.close();
 const expected={...POLICY,shopifyVariantIds:variantIds,documentSha256:{1:digest(r1),2:digest(r2)},revision2MetadataSha256:digest(metadata)};
 return {workshopFilename,profilesFilename,expected,native,metadata,r1,r2,mfg};
}
test('native readonly bridge reads exact808 mixed heads, old contracts, metadata and approvals without changing either DB',()=>{
 const f=fixture(),files=[f.workshopFilename,f.profilesFilename],before=files.map(p=>sha(fs.readFileSync(p)));
 const probedNative={...native,createShopProductBindingStore(args){assert.equal(args.readOnly,true);assert.throws(()=>args.database.exec('CREATE TABLE forbidden_write_probe(x)'),/readonly|read-only/i);return native.createShopProductBindingStore(args);}};
 const t=openScopedReadonlyTarget({...f,native:probedNative});
 try{
  const g=createMainReadOnlyGateway(t),rows=g.resolveMany(variantIds.map(pair));assert.equal(rows.length,808);assert.equal(rows.filter(r=>r.productRevision===2).length,778);assert.equal(rows.filter(r=>r.productRevision===1).length,30);
  assert.deepEqual(t.workshop.repository.get(POLICY.productId).metadata,f.metadata);assert.equal(t.workshop.repository.get(POLICY.productId,{revision:1}).document.name,'synthetic R1');
  assert.equal(g.catalogApprovals(1,variantIds).filter(Boolean).length,808);assert.equal(g.catalogApprovals(2,variantIds).filter(Boolean).length,778);
  for(let i=0;i<808;i++)assert.equal(t.workshop.orderIntake.bindingPricing('binding_fixture_'+i+'_1').revision,'1');
  assert.equal(t.workshop.orderIntake.bindings().length,1586);
  const profile=t.workshop.productionProfiles.resolve(f.r2);assert.equal(profile.id,f.mfg);assert.equal(profile.revision,1);assert.equal(profile.sha256,f.metadata.productionProfile.sha256);assert.equal(profile.productionReady,false);
  assert.throws(()=>t.workshop.productionProfiles.resolve({...f.r2,name:'foreign document'}),{code:'main_readonly_profile_document_scope'});
  assert.deepEqual(Object.keys(g).sort(),['catalogApprovals','inspect','resolveMany']);assert.equal(t.registry.persist,undefined);assert.equal(t.workshop.orderIntake.idBindings,undefined);assert.equal(t.workshop.repository.save,undefined);assert.throws(()=>t.workshop.orderIntake.bindVariants(),{code:'main_readonly_write'});
  assert.throws(()=>g.resolveMany([pair('gid://shopify/ProductVariant/99')]),{code:'main_readonly_pairs'});assert.throws(()=>t.workshop.repository.get(POLICY.productId,{revision:3}),{code:'main_readonly_revision'});assert.throws(()=>t.workshop.orderIntake.bindingPricing('foreign'),{code:'main_readonly_binding'});
 }finally{t.close();}
 assert.deepEqual(files.map(p=>sha(fs.readFileSync(p))),before,'Both SQLite files byte-identical after native read scopes, profile read and catalog reads');
});
test('metadata/document pin drift and foreign manufacturing tenant are rejected',()=>{
 const f=fixture();assert.throws(()=>openScopedReadonlyTarget({...f,expected:{...f.expected,revision2MetadataSha256:'f'.repeat(64)}}),{code:'main_readonly_metadata_pin'});
 assert.throws(()=>openScopedReadonlyTarget({...f,expected:{...f.expected,documentSha256:{...f.expected.documentSha256,2:'f'.repeat(64)}}}),{code:'main_readonly_document_pin'});
 const p=new DatabaseSync(f.profilesFilename);p.prepare('UPDATE manufacturing_profile_revisions SET tenant_id=?').run('foreign');p.close();const t=openScopedReadonlyTarget(f);try{assert.throws(()=>t.workshop.productionProfiles.resolve(f.r2),{code:'main_readonly_profile_pin'});}finally{t.close();}
});
test('pinned production factory rejects writes before opening DBs and cannot accept synthetic document pins',async()=>{
 const f=fixture(),factory=await createMainProductionReadonlyAdapterFactory({codeRoot,operatorRoot,workshopFilename:f.workshopFilename,profilesFilename:f.profilesFilename});
 await assert.rejects(factory({readOnly:false,mode:'apply'}),{code:'main_readonly_mode'});
 await assert.rejects(factory({readOnly:true,mode:'plan'}),{code:'main_readonly_document_pin'});
});
