import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {copyPath} from './copy-guard.mjs';
import {inspectNativeTarget,TARGET_CFG,TARGET_SHOP_PRODUCT} from './inspect-native-target.mjs';
import {migrateSearchStatsCopy} from './migrate-search-stats-copy.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const codeRoot=path.resolve(process.env.GRAVURU_OPERATOR_TEST_CODE_ROOT||path.join(here,'../../issue230-integration-candidate'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const moduleSha256=sha(fs.readFileSync(path.join(codeRoot,'app/workshop/motif-search-stats.mjs')));
function fixture(t){const dir=fs.mkdtempSync(path.join(here,'.test-')),file=path.join(dir,'workshop.copy.sqlite');t.after(()=>{assert.ok(fs.realpathSync(dir).startsWith(here+path.sep+'.test-'));fs.rmSync(dir,{recursive:true,force:true});});return file;}
function legacy(file){const db=new DatabaseSync(file);db.exec('CREATE TABLE motif_search_daily(tenant TEXT NOT NULL,day TEXT NOT NULL,product_group TEXT NOT NULL,term TEXT NOT NULL,source TEXT NOT NULL,searches INTEGER NOT NULL,without_results INTEGER NOT NULL,PRIMARY KEY(tenant,day,product_group,term,source)); CREATE TABLE untouched(value TEXT); INSERT INTO untouched VALUES(\'retained\');');const add=db.prepare('INSERT INTO motif_search_daily VALUES(?,?,?,?,?,?,?)');for(let i=0;i<8;i++)add.run(i%2?'gravuru':'second','2026-11-11','test','private-term-'+i,i%3?'shop':'preview',i+1,i%2);db.close();}

test('real application migration preserves exactly eight aggregate rows, hides terms and is idempotent',async t=>{
 const copy=fixture(t);legacy(copy);const input={copy,confirmation:copy,codeRoot,moduleSha256,expectedRows:8};
 const result=await migrateSearchStatsCopy(input);assert.equal(result.before.rows,8);assert.equal(result.after.motifRows,8);assert.equal(result.after.designRows,0);assert.equal(result.after.searches,'36');assert.equal(result.after.withoutResults,'4');assert.equal(result.exactHistoricalRowsPreserved,true);assert.equal(result.eventsWritten,0);assert.doesNotMatch(JSON.stringify(result),/private-term/);
 const again=await migrateSearchStatsCopy(input);assert.equal(again.alreadyMigrated,true);assert.equal(again.before.normalizedRowsSha256,result.before.normalizedRowsSha256);
 const db=new DatabaseSync(copy,{readOnly:true});assert.equal(db.prepare('SELECT value FROM untouched').get().value,'retained');db.close();
});
test('copy acknowledgement, path, module hash, count and unknown schema guards abort before mutation',async t=>{
 const copy=fixture(t);legacy(copy);const before=sha(fs.readFileSync(copy)),input={copy,confirmation:copy,codeRoot,moduleSha256,expectedRows:8};
 await assert.rejects(migrateSearchStatsCopy({...input,confirmation:path.join(path.dirname(copy),'other.copy.sqlite')}),/confirm-copy/);
 await assert.rejects(migrateSearchStatsCopy({...input,moduleSha256:'0'.repeat(64)}),/Codehash/);
 await assert.rejects(migrateSearchStatsCopy({...input,expectedRows:9}),/Zeilenzahl/);
 assert.equal(sha(fs.readFileSync(copy)),before);
 const wrong=path.join(path.dirname(copy),'workshop.sqlite');fs.copyFileSync(copy,wrong);assert.throws(()=>copyPath(wrong,{write:true,confirmation:wrong}),/copy.sqlite/);
 const hard=path.join(path.dirname(copy),'linked.copy.sqlite');fs.linkSync(copy,hard);assert.throws(()=>copyPath(hard,{write:true,confirmation:hard}),/verlinkte/);fs.unlinkSync(hard);
 const db=new DatabaseSync(copy);db.exec('ALTER TABLE motif_search_daily ADD COLUMN unknown TEXT');db.close();const bad=sha(fs.readFileSync(copy));
 await assert.rejects(migrateSearchStatsCopy(input),/unbekanntes Schema/);assert.equal(sha(fs.readFileSync(copy)),bad);
});
test('read-only native inventory uses explicit active heads, target filters and metadata columns only',t=>{
 const file=fixture(t),db=new DatabaseSync(file);
 db.exec(`CREATE TABLE products(id TEXT,revision INTEGER,published_revision INTEGER,archived INTEGER,kind TEXT,tenant_id TEXT);
 CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,status TEXT,tenant_id TEXT,document TEXT,metadata TEXT);
 CREATE TABLE shop_product_binding_heads(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER);
 CREATE TABLE shop_product_binding_revisions(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER,product_gid TEXT,store_id TEXT,binding_id TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT);
 CREATE TABLE orders(secret TEXT); INSERT INTO orders VALUES('DO-NOT-READ-ORDERS');`);
 db.prepare('INSERT INTO products VALUES(?,2,NULL,0,\'product\',\'gravuru\')').run(TARGET_CFG);
 for(const revision of [1,2])db.prepare('INSERT INTO product_revisions VALUES(?,?,\'draft\',\'gravuru\',?,?)').run(TARGET_CFG,revision,'DO-NOT-OUTPUT-DOCUMENT','DO-NOT-OUTPUT-METADATA');
 const add=db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,?,?,?,?,?,?,?)');
 for(const revision of [1,2])add.run('gravuru','test.myshopify.com','gid://shopify/ProductVariant/1',revision,TARGET_SHOP_PRODUCT,'acryl','binding-'+revision,TARGET_CFG,revision,'a'.repeat(64));
 db.exec("INSERT INTO shop_product_binding_heads VALUES('gravuru','test.myshopify.com','gid://shopify/ProductVariant/1',2)");
 add.run('other','test.myshopify.com','gid://shopify/ProductVariant/2',1,TARGET_SHOP_PRODUCT,'acryl','private-other',TARGET_CFG,1,'b'.repeat(64));
 db.exec("INSERT INTO shop_product_binding_heads VALUES('other','test.myshopify.com','gid://shopify/ProductVariant/2',1)");db.close();
 const before=sha(fs.readFileSync(file)),result=inspectNativeTarget(file);
 assert.equal(result.products[0].revision,2);assert.equal(result.revisions.length,2);assert.equal(result.activeBindingCount,1);assert.equal(result.activeBindings[0].assignment_revision,2);assert.equal(result.activeBindingGroups[0].variants,1);
 assert.doesNotMatch(JSON.stringify(result),/DO-NOT-|private-other/);assert.equal(sha(fs.readFileSync(file)),before);
});

test('alias lookup finds actual cfg identities only in valid current product JSON and keeps ambiguity explicit',t=>{
 const file=fixture(t),db=new DatabaseSync(file);
 db.exec(`CREATE TABLE products(id TEXT,revision INTEGER,published_revision INTEGER,archived INTEGER,kind TEXT,tenant_id TEXT);
 CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,status TEXT,tenant_id TEXT,document TEXT);
 CREATE TABLE form_shop_bindings(id TEXT,shop TEXT,variant_id TEXT,product_id TEXT,product_revision INTEGER,unit_cents INTEGER,tenant_id TEXT);`);
 const cfg='cfg_11111111-1111-4111-8111-111111111111',other='cfg_22222222-2222-4222-8222-222222222222';
 const add=(id,tenant,revision,document)=>db.prepare('INSERT INTO product_revisions VALUES(?,?,\'draft\',?,?)').run(id,revision,tenant,document);
 const document=JSON.stringify({schema:'gravuru-product/v1',config:{profile:{id:TARGET_CFG}},privateText:'MUST-NOT-BE-RETURNED'});
 for(const [id,tenant,revision]of [[cfg,'gravuru',2],[other,'gravuru',1],['old-only','gravuru',2],['bad-json','gravuru',1],['another-tenant','other',1]])db.prepare('INSERT INTO products VALUES(?,?,NULL,0,\'product\',?)').run(id,revision,tenant);
 add(cfg,'gravuru',1,document);add(cfg,'gravuru',2,document);add(other,'gravuru',1,document);
 add('old-only','gravuru',1,document);add('old-only','gravuru',2,JSON.stringify({schema:'gravuru-product/v1',config:{profile:{id:'other-profile'}}}));
 add('bad-json','gravuru',1,'malformed');add('another-tenant','other',1,document);
 db.prepare('INSERT INTO form_shop_bindings VALUES(\'kept-binding\',\'test.myshopify.com\',\'123\',?,2,1000,\'gravuru\')').run(cfg);db.close();
 const before=sha(fs.readFileSync(file)),result=inspectNativeTarget(file);
 assert.equal(result.directProductIdMatches.length,0);assert.deepEqual(result.nativeIdentityCandidates,[{id:cfg,revision:2},{id:other,revision:1}]);
 assert.equal(result.profileAliasLookup.matches.length,2);assert.equal(result.revisions.length,3);assert.equal(result.legacyFixedBindings[0].product_id,cfg);assert.equal(result.activeBindingCount,0);
 assert.doesNotMatch(JSON.stringify(result),/MUST-NOT|old-only|bad-json|another-tenant/);assert.equal(sha(fs.readFileSync(file)),before);
});
