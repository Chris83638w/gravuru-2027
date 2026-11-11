import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {readScope,inspectSmallTargetsCopy,bindingHash,hashFile} from './inspect-small-targets-copy.mjs';
const root=process.env.GRAVURU_SMALL_CODE_ROOT||path.resolve(import.meta.dirname,'../..');
const groupsFile=path.join(root,'docs/reviews/2026-11-11-small-products-duplicate-review/six-groups.json'),aliasesFile=path.join(import.meta.dirname,'v9-source-aliases.json');
const scope=readScope(groupsFile,aliasesFile),variants=[...scope.variants.values()],shop='gravuru-design.myshopify.com';
const cfg=i=>'cfg_00000000-0000-4000-8000-'+String(i).padStart(12,'0');
function fixture(t,{legacy=false}={}){
 const dir=fs.mkdtempSync(path.join(import.meta.dirname,'.small-copy-test-')),copy=path.join(dir,'workshop.copy.sqlite');
 t.after(()=>{const real=fs.realpathSync(dir);assert.ok(real.startsWith(import.meta.dirname+path.sep+'.small-copy-test-'));fs.rmSync(real,{recursive:true,force:true});});
 const db=new DatabaseSync(copy),tenant=legacy?'':',tenant_id TEXT';
 db.exec(`CREATE TABLE products(id TEXT,revision INTEGER,published_revision INTEGER,archived INTEGER,kind TEXT${tenant});
 CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,status TEXT,document TEXT${tenant});
 CREATE TABLE form_shop_bindings(id TEXT,shop TEXT,variant_id TEXT,product_id TEXT,product_revision INTEGER${tenant});
 CREATE TABLE shop_product_binding_heads(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER);
 CREATE TABLE shop_product_binding_revisions(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER,product_gid TEXT,store_id TEXT,binding_id TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT);
 CREATE TABLE orders(secret TEXT);INSERT INTO orders VALUES('DO-NOT-READ-ORDERS');CREATE TABLE tokens(secret TEXT);INSERT INTO tokens VALUES('DO-NOT-READ-TOKENS');`);
 const tenantArgs=legacy?[]:['gravuru'],params=n=>Array.from({length:n},()=>'?').join(',');
 const doc=(alias,secret='DO-NOT-EXPORT-FULL-DOCUMENT')=>({schema:'gravuru-product/v1',kind:'product',config:{profile:{id:alias},private:secret}});
 const add=(id,alias,{archived=0,headRevision=1,status='draft',value=doc(alias)}={})=>{db.prepare('INSERT INTO products VALUES('+params(5+tenantArgs.length)+')').run(id,headRevision,null,archived,'product',...tenantArgs);db.prepare('INSERT INTO product_revisions VALUES('+params(4+tenantArgs.length)+')').run(id,headRevision,status,typeof value==='string'?value:JSON.stringify(value),...tenantArgs);return value;};
 const docs=new Map();for(const [i,a] of scope.aliases.entries())docs.set(a.group,add(cfg(i+1),a.profileId));
 for(const [i,v] of variants.entries()){
  const id=cfg(scope.aliases.findIndex(x=>x.group===v.group)+1),fixed='fixed-'+i;
  db.prepare('INSERT INTO form_shop_bindings VALUES('+params(5+tenantArgs.length)+')').run(fixed,shop,v.variantId.split('/').at(-1),id,1,...tenantArgs);
  db.prepare('INSERT INTO shop_product_binding_heads VALUES(?,?,?,2)').run('gravuru',shop,v.variantId);
  db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,2,?,?,?,?,1,?)').run('gravuru',shop,v.variantId,v.shopProductId,'acryl',fixed,id,bindingHash(docs.get(v.group)));
 }
 // A real historical fixed mapping/revision is distinct from current heads.
 const old=add(cfg(90),'historic-other',{archived:1,status:'archived'}),v=variants[0];
 db.prepare('INSERT INTO form_shop_bindings VALUES('+params(5+tenantArgs.length)+')').run('historic-fixed',shop,v.variantId.split('/').at(-1),cfg(90),1,...tenantArgs);
 db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,1,?,?,?,?,1,?)').run('gravuru',shop,v.variantId,v.shopProductId,'acryl','historic-fixed',cfg(90),bindingHash(old));
 // Unbound duplicate alias and exact local-source UUID remain candidates.
 add(cfg(91),scope.aliases[0].profileId);add(scope.aliases[0].sourceId,scope.aliases[0].profileId);
 // A historical-only alias must not be considered a current match.
 add(cfg(92),'current-not-in-scope',{headRevision:2});db.prepare('INSERT INTO product_revisions VALUES('+params(4+tenantArgs.length)+')').run(cfg(92),1,'draft',JSON.stringify(doc(scope.aliases[1].profileId)),...tenantArgs);
 add(cfg(93),'ignored',{value:'{invalid-json'});
 if(!legacy){
  db.prepare('INSERT INTO products VALUES(?,1,NULL,0,?,?)').run(cfg(94),'product','other');db.prepare('INSERT INTO product_revisions VALUES(?,1,?,?,?)').run(cfg(94),'draft',JSON.stringify(doc(scope.aliases[0].profileId,'FOREIGN-TENANT-PRIVATE')),'other');
  db.prepare('INSERT INTO form_shop_bindings VALUES(?,?,?,?,1,?)').run('foreign-tenant-binding',shop,v.variantId.split('/').at(-1),cfg(94),'other');
 }
 // Wrong shop and unknown variant must never leak into the positive scope.
 db.prepare('INSERT INTO shop_product_binding_heads VALUES(?,?,?,1)').run('gravuru','other.myshopify.com',v.variantId);
 db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,1,?,?,?,?,1,?)').run('gravuru','other.myshopify.com',v.variantId,v.shopProductId,'acryl','FOREIGN-SHOP-BINDING',cfg(90),bindingHash(old));
 db.prepare('INSERT INTO form_shop_bindings VALUES('+params(5+tenantArgs.length)+')').run('OUTSIDE-126',shop,'999999999999',cfg(90),1,...tenantArgs);
 db.close();return {copy,dir,input:{copy,groupsFile,aliasesFile,tenantId:'gravuru',storeId:'acryl',legacySingleStore:legacy}};
}
test('all126 active rows plus history and exact unbound native aliases are bounded, distinct, read-only and private',t=>{
 const f=fixture(t),before=hashFile(f.copy),r=inspectSmallTargetsCopy(f.input);
 assert.equal(r.activeBindings.length,126);assert.equal(r.activeBindings.every(x=>x.identityAndHashConsistent),true);assert.equal(r.bindingRevisionHistory.length,127);assert.equal(r.bindingRevisionHistory.filter(x=>!x.isCurrentHead).length,1);assert.equal(r.historicalFixedBindings.length,127);assert.equal(r.historicalFixedBindings.every(x=>x.shopProductOwnershipProvenByThisRow===false),true);
 assert.equal(r.nativeAliasCandidates.filter(x=>x.groups.includes('acrylic-5x2')).length,3);assert.equal(r.nativeSourceIdCandidates.length,1);assert.equal(r.nativeAliasCandidates.some(x=>x.cfgId===cfg(92)||x.cfgId===cfg(94)),false);
 assert.deepEqual(r.variantsWithoutCurrentHead,[]);assert.deepEqual(r.issues,[]);assert.equal(r.copyEvidence.unchanged,true);assert.equal(hashFile(f.copy),before);assert.equal(r.readyForImport,false);assert.equal(r.scope.otherProductVariantsInspected,false);
 assert.doesNotMatch(JSON.stringify(r),/DO-NOT-|FOREIGN-TENANT|FOREIGN-SHOP|OUTSIDE-126/);assert.deepEqual(r.perGroup.map(g=>g.relevantVariants),[22,22,22,24,18,18]);
});
test('missing head tables never erase historical fixed evidence or existing native candidates; one missing table fails closed',t=>{
 const f=fixture(t),db=new DatabaseSync(f.copy);db.exec('DROP TABLE shop_product_binding_heads;DROP TABLE shop_product_binding_revisions');db.close();const before=hashFile(f.copy),r=inspectSmallTargetsCopy(f.input);assert.equal(r.activeBindingSchemaAvailable,false);assert.equal(r.activeBindings.length,0);assert.equal(r.historicalFixedBindings.length,127);assert.equal(r.variantsWithoutCurrentHead.length,126);assert.equal(r.nativeAliasCandidates.length,8);assert.equal(hashFile(f.copy),before);
 const broken=new DatabaseSync(f.copy);broken.exec('CREATE TABLE shop_product_binding_heads(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER)');broken.close();assert.throws(()=>inspectSmallTargetsCopy(f.input),/Incomplete active-binding schema/);
});
test('orphan heads, wrong product/store/hash and missing native revisions stay explicit instead of hidden by inner joins',t=>{
 const f=fixture(t),db=new DatabaseSync(f.copy);
 db.prepare('UPDATE shop_product_binding_heads SET revision=99 WHERE variant_gid=? AND shop=?').run(variants[0].variantId,shop);
 db.prepare('UPDATE shop_product_binding_revisions SET product_gid=?,store_id=?,document_sha256=? WHERE variant_gid=? AND revision=2').run('gid://shopify/Product/999999','legacy','0'.repeat(64),variants[1].variantId);
 db.prepare('UPDATE shop_product_binding_revisions SET cfg_revision=99 WHERE variant_gid=? AND revision=2').run(variants[2].variantId);db.close();
 const r=inspectSmallTargetsCopy(f.input);assert.equal(r.activeBindings.length,126);assert.ok(r.activeBindings.find(x=>x.variantId===variants[0].variantId).problems.includes('head_revision_missing'));const bad=r.activeBindings.find(x=>x.variantId===variants[1].variantId);assert.deepEqual(bad.problems,['shop_product_identity_mismatch','store_mismatch','native_document_hash_mismatch']);assert.ok(r.issues.some(x=>x.code==='native_identity_missing_or_ambiguous'));assert.equal(r.readyForImport,false);
});
test('explicit legacy/tenant, source pins and copy/WAL guards cannot silently widen scope or initialize schemas',t=>{
 const f=fixture(t,{legacy:true});assert.throws(()=>inspectSmallTargetsCopy({...f.input,legacySingleStore:false}),/single-store/);const r=inspectSmallTargetsCopy(f.input);assert.equal(r.productScope,'explicit-single-store-gravuru-legacy');assert.equal(r.activeBindings.length,126);
 assert.throws(()=>inspectSmallTargetsCopy({...f.input,tenantId:'other'}),/gravuru/);assert.throws(()=>inspectSmallTargetsCopy({...f.input,storeId:'guessed-store'}),/store-id/);
 const wrongGroups=path.join(f.dir,'changed-groups.json');fs.writeFileSync(wrongGroups,fs.readFileSync(groupsFile,'utf8')+' ');assert.throws(()=>inspectSmallTargetsCopy({...f.input,groupsFile:wrongGroups}),/audit bytes/);
 const wrongAliases=path.join(f.dir,'changed-aliases.json');fs.writeFileSync(wrongAliases,fs.readFileSync(aliasesFile,'utf8')+' ');assert.throws(()=>inspectSmallTargetsCopy({...f.input,aliasesFile:wrongAliases}),/alias evidence bytes/);
 const wrongFile=path.join(f.dir,'workshop.sqlite');fs.copyFileSync(f.copy,wrongFile);assert.throws(()=>inspectSmallTargetsCopy({...f.input,copy:wrongFile}),/copy.sqlite/);
 fs.writeFileSync(f.copy+'-wal','not-checkpointed');assert.throws(()=>inspectSmallTargetsCopy(f.input),/sidecar/);
});
