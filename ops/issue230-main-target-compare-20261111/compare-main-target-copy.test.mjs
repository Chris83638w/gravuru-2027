import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {gzipSync} from 'node:zlib';
import {PIN,sha,hashFile,productGroupHash,idBindingHash,compareMainTargetCopy} from './compare-main-target-copy.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const resolverSource=path.join(process.env.GRAVURU_COMPARE_CODE_ROOT||path.resolve(here,'../..'),'app/workshop/profile-library.mjs');
const assignments=()=>Object.fromEntries(['fonts','motifs','colors','bestsellers'].map(t=>[t,{mode:'inherit',profileId:null}]));
const snapshot=()=>({settingsRevision:1,selections:Object.fromEntries(Object.keys(assignments()).map(t=>[t,null])),sources:Object.fromEntries(Object.keys(assignments()).map(t=>[t,{level:'unbound',mode:'inherit',profileId:null,profileRevision:null}]))});
const modules={colors:false,designs:true,logo:true,motifs:true,options:true,photo:true,text:true};
function fixture(t){
 const dir=fs.mkdtempSync(path.join(here,'.copy-test-'));
 t.after(()=>{const resolved=fs.realpathSync(dir);assert.ok(resolved.startsWith(here+path.sep+'.copy-test-'));fs.rmSync(resolved,{recursive:true,force:true});});
 const copy=path.join(dir,'workshop.copy.sqlite'),profilesCopy=path.join(dir,'profiles.copy.sqlite'),mappingFile=path.join(dir,'mapping.json.gz'),targetFile=path.join(dir,'target.json'),intentFile=path.join(dir,'intent.json');
 const cfg=PIN.productId,shop=PIN.shopDomain,product=PIN.shopifyProductId,tenant='gravuru';
 const groups=[{id:'size',name:'Form & Größe',values:Array.from({length:808},(_,i)=>({id:'s'+i,label:'Size '+i}))},{id:'color',name:'Farbe',values:[{id:'schwarz',label:'Schwarz'}]},{id:'mounting',name:'Befestigung',values:[{id:'K00',label:'Ohne Bohrung'}]}];
 const moduleProfile={id:'cmp_11111111-1111-4111-8111-111111111111',revision:1,schema:'gravuru-configurator-modules/v1',modules};
 const original={schema:'gravuru-product/v1',kind:'product',name:'DO-NOT-EXPORT-MODEL',masterId:null,categoryIds:['extern-shopifyproductid-16190784602492','linie-acryl-tuerschilder'],profileAssignments:assignments(),config:{profile:{optionGroups:groups},moduleProfile,localResources:{fonts:{glyphs:{'2':'DO-NOT-EXPORT-GLYPHS','10':'NO-GLYPHS'}}},extraMotifCents:169,photo:{extraPriceCents:999},logo:{extraPriceCents:1299},quantityTiers:[{minQuantity:3,percentOff:5}],quantityTierScope:'complete-unit'}};
 const target=structuredClone(original);target.config.profile.optionGroups[0].values=groups[0].values.slice(0,778);target.name='Target preview';
 const originalBytes=JSON.stringify(original),bindingHash=idBindingHash(original),moduleDocument={name:'Fixture modules',modules};
 const intent={executable:false,confirmed:false,imported:false,executed:false,actual:{productId:cfg,shopifyProductId:product,expectedRevision:1},proposedUpdate:{documentProductGroupSha256:productGroupHash(target),documentIdBindingSha256:idBindingHash(target)},pins:{moduleProfile,localResolvedProfiles:snapshot(),targetCategoryIds:[...target.categoryIds],profileAssignments:target.profileAssignments,targetResolutionVerified:false},v9:{moduleProfile:{sha256:productGroupHash(moduleDocument)}}};
 const mapping={matches:[],residualVariants:[]},rows=[];
 for(let i=0;i<808;i++){
  const id='gid://shopify/ProductVariant/'+(900000+i),options={size:'s'+i,color:'schwarz',mounting:'K00'},price=1000+(i<138?30:i<158?10:0);
  const selectedOptions=groups.map(g=>({name:g.name,value:g.values.find(v=>v.id===options[g.id]).label}));
  if(i<778)mapping.matches.push({shopifyProductId:product,shopifyVariantId:id,sku:'fixture-'+i,nativeOptions:options,targetUnitCents:1000,currentShopUnitCents:price});
  else mapping.residualVariants.push({id,sku:'fixture-'+i,price:'10.00',selectedOptions,proposedDeletion:false});
  rows.push({id,options,price});
 }
 const mappingBytes=Buffer.from(JSON.stringify(mapping)),intentBytes=Buffer.from(JSON.stringify(intent));
 fs.writeFileSync(mappingFile,gzipSync(mappingBytes));fs.writeFileSync(targetFile,JSON.stringify(target));fs.writeFileSync(intentFile,intentBytes);
 const db=new DatabaseSync(copy);db.exec(`PRAGMA journal_mode=DELETE;
 CREATE TABLE products(id TEXT,revision INTEGER,published_revision INTEGER,archived INTEGER,kind TEXT,tenant_id TEXT);
 CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,status TEXT,document TEXT,metadata TEXT,tenant_id TEXT);
 CREATE TABLE form_shop_bindings(id TEXT,shop TEXT,variant_id TEXT,product_id TEXT,product_revision INTEGER,unit_cents INTEGER,tenant_id TEXT);
 CREATE TABLE form_shop_binding_selections(binding_id TEXT,options TEXT,tenant_id TEXT);
 CREATE TABLE form_shop_binding_personalization(binding_id TEXT,document TEXT,tenant_id TEXT);
 CREATE TABLE shop_product_binding_heads(tenant_id TEXT,shop TEXT,variant_gid TEXT,revision INTEGER);
 CREATE TABLE shop_product_binding_revisions(tenant_id TEXT,shop TEXT,store_id TEXT,product_gid TEXT,variant_gid TEXT,revision INTEGER,binding_id TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT);
 CREATE TABLE configurator_module_profiles(tenant_id TEXT,id TEXT,revision INTEGER);
 CREATE TABLE configurator_module_profile_revisions(tenant_id TEXT,id TEXT,revision INTEGER,document TEXT,sha256 TEXT);
 CREATE TABLE catalog_live_order_approvals(tenant_id TEXT,shop TEXT,product_gid TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT,variants_json TEXT,approval_id TEXT);
 CREATE TABLE orders(secret TEXT); INSERT INTO orders VALUES('DO-NOT-READ-ORDERS');`);
 db.prepare('INSERT INTO products VALUES(?,1,NULL,0,\'product\',?)').run(cfg,tenant);
 db.prepare('INSERT INTO product_revisions VALUES(?,1,\'draft\',?,?,?)').run(cfg,originalBytes,JSON.stringify({profiles:snapshot(),secret:'DO-NOT-EXPORT-METADATA'}),tenant);
 db.exec('BEGIN');for(const [i,row]of rows.entries()){
  const binding='binding-'+i;
  db.prepare('INSERT INTO form_shop_bindings VALUES(?,?,?,?,1,?,?)').run(binding,shop,row.id.split('/').at(-1),cfg,row.price,tenant);
  db.prepare('INSERT INTO form_shop_binding_selections VALUES(?,?,?)').run(binding,JSON.stringify(row.options),tenant);
  db.prepare('INSERT INTO form_shop_binding_personalization VALUES(?,?,?)').run(binding,JSON.stringify({productId:product,revision:'1',baseCents:row.price,extraMotifCents:169,extraPhotoCents:999,extraLogoCents:1299,moduleProfile,quantityTiers:original.config.quantityTiers,quantityTierScope:'complete-unit',private:'DO-NOT-EXPORT-CONTRACT'}),tenant);
  db.prepare('INSERT INTO shop_product_binding_heads VALUES(?,?,?,1)').run(tenant,shop,row.id);
  db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,?,?,1,?,?,1,?)').run(tenant,shop,'acryl',product,row.id,binding,cfg,bindingHash);
 }db.exec('COMMIT');
 db.prepare('INSERT INTO configurator_module_profiles VALUES(?,?,1)').run(tenant,moduleProfile.id);
 db.prepare('INSERT INTO configurator_module_profile_revisions VALUES(?,?,1,?,?)').run(tenant,moduleProfile.id,JSON.stringify(moduleDocument),productGroupHash(moduleDocument));
 db.prepare('INSERT INTO catalog_live_order_approvals VALUES(?,?,?,?,1,?,?,?)').run(tenant,shop,product,cfg,sha(originalBytes),JSON.stringify(rows.map(r=>r.id)),'fixture-approval');db.close();
 const pdb=new DatabaseSync(profilesCopy);pdb.exec('PRAGMA journal_mode=DELETE; CREATE TABLE profile_library_settings(tenant_id TEXT,revision INTEGER,document TEXT);');pdb.prepare('INSERT INTO profile_library_settings VALUES(?,1,?)').run(tenant,JSON.stringify({defaults:assignments(),categories:{}}));pdb.close();
 const pins={...PIN,bindingDocumentSha256:bindingHash,targetProductGroupSha256:productGroupHash(target),targetBindingSha256:idBindingHash(target),mappingSerializedSha256:sha(mappingBytes),intentSerializedSha256:sha(intentBytes)};
 return {input:{copy,profilesCopy,mappingFile,targetFile,intentFile,tenantId:tenant,resolverSource,pins},rows,dir};
}
test('complete 808-row read compares 778 target plus 30 preserved options and all prices without writes or private output',t=>{
 const f=fixture(t),before=sha(fs.readFileSync(f.input.copy)),result=compareMainTargetCopy(f.input);
 assert.equal(result.identityAndCoveragePassed,true);assert.deepEqual(result.issues,[]);assert.equal(result.coverage.actual,808);assert.equal(result.coverage.matchedV9,778);assert.equal(result.coverage.preservedResidual,30);assert.equal(result.coverage.totalOptionsMatched,808);
 assert.equal(result.coverage.nativeTargetPricesMatched,620);assert.equal(result.deltas.nativeVsTargetPrice.length,158);assert.equal(result.deltas.nativeVsTargetPrice.filter(r=>r.differenceCents===30).length,138);assert.equal(result.deltas.nativeVsTargetPrice.filter(r=>r.differenceCents===10).length,20);assert.equal(result.coverage.nativeShopSnapshotPricesMatched,808);
 assert.equal(result.moduleProfile.modulesMatch,true);assert.equal(result.moduleProfile.expectedHashMatches,true);assert.deepEqual(result.resourceProfiles.selectionAndSourceDifferences,[]);assert.equal(result.catalogApproval.storedDocumentBytesMatch,true);assert.equal(result.catalogApproval.matchesAllActiveTargetVariants,true);assert.equal(result.personalization.bindingContractsMissing,0);
 assert.equal(result.readyForImport,false);assert.equal(result.storeWrites,0);assert.equal(result.copyEvidence.every(r=>r.unchanged),true);assert.equal(sha(fs.readFileSync(f.input.copy)),before);assert.doesNotMatch(JSON.stringify(result),/DO-NOT-|NO-GLYPHS/);
 assert.equal(result.productScope,'tenant-filtered');assert.equal(result.productionProfile.storedMetadataPin,null);assert.equal(result.productionProfile.metadataReferenceMatchesDocument,true);assert.equal(result.personalization.contractGroups[0].motifCharge,null);assert.equal(result.personalization.expectedTargetExtras.motifCharge,null);
 assert.notEqual(result.target.productGroupDocumentSha256,result.target.idBindingDocumentSha256);
});
test('missing, extra, wrong-head and changed native options remain explicit, not a partial green result',t=>{
 const f=fixture(t),db=new DatabaseSync(f.input.copy);db.prepare('DELETE FROM shop_product_binding_heads WHERE variant_gid=?').run(f.rows[0].id);db.prepare('UPDATE shop_product_binding_revisions SET cfg_revision=2 WHERE variant_gid=?').run(f.rows[1].id);db.prepare('UPDATE form_shop_binding_selections SET options=? WHERE binding_id=?').run(JSON.stringify({size:'wrong',color:'schwarz',mounting:'K00'}),'binding-2');db.prepare('UPDATE shop_product_binding_heads SET variant_gid=? WHERE variant_gid=?').run('gid://shopify/ProductVariant/999999',f.rows[3].id);db.prepare('UPDATE shop_product_binding_revisions SET variant_gid=? WHERE variant_gid=?').run('gid://shopify/ProductVariant/999999',f.rows[3].id);db.close();
 const r=compareMainTargetCopy(f.input);assert.equal(r.identityAndCoveragePassed,false);assert.equal(r.deltas.missingVariantIds.length,2);assert.deepEqual(r.deltas.unexpectedVariantIds,['gid://shopify/ProductVariant/999999']);assert.ok(r.deltas.identity.some(x=>x.fields.includes('cfg_revision')));assert.equal(r.deltas.options.length,1);assert.equal(r.readyForImport,false);
});
test('missing profiles copy is a precise unresolved check and altered artifact pins stop before reading a DB',t=>{
 const f=fixture(t),r=compareMainTargetCopy({...f.input,profilesCopy:undefined});assert.equal(r.resourceProfiles.compared,false);assert.ok(r.pending.some(x=>x.includes('No profiles.copy.sqlite')));
 const before=sha(fs.readFileSync(f.input.copy));fs.appendFileSync(f.input.intentFile,' ');assert.throws(()=>compareMainTargetCopy(f.input),/file hash mismatch/);assert.equal(sha(fs.readFileSync(f.input.copy)),before);
});
test('unknown schema, live-style filename and dependent WAL copy are rejected without migration',t=>{
 const f=fixture(t),plain=path.join(f.dir,'workshop.sqlite');fs.copyFileSync(f.input.copy,plain);assert.throws(()=>compareMainTargetCopy({...f.input,copy:plain}),/copy.sqlite/);
 fs.writeFileSync(f.input.copy+'-wal','not-a-sealed-copy');assert.throws(()=>compareMainTargetCopy(f.input),/sidecar/);fs.unlinkSync(f.input.copy+'-wal');
 const db=new DatabaseSync(f.input.copy);db.exec('ALTER TABLE form_shop_binding_selections RENAME TO removed_selections');db.close();const before=sha(fs.readFileSync(f.input.copy));assert.throws(()=>compareMainTargetCopy(f.input),/schema/);assert.equal(sha(fs.readFileSync(f.input.copy)),before);
});
test('native numeric-key hash methods deliberately differ and are stable across property insertion order',()=>{
 const a={font:{'2':'two','10':'ten',z:0}},b={font:{z:0,'10':'ten','2':'two'}};
 assert.equal(productGroupHash(a),productGroupHash(b));assert.equal(idBindingHash(a),idBindingHash(b));assert.notEqual(productGroupHash(a),idBindingHash(a));
});
test('large-copy hashing uses bounded chunks and matches byte SHA across several chunk boundaries',t=>{
 const dir=fs.mkdtempSync(path.join(here,'.copy-test-'));t.after(()=>{const resolved=fs.realpathSync(dir);assert.ok(resolved.startsWith(here+path.sep+'.copy-test-'));fs.rmSync(resolved,{recursive:true,force:true});});
 const file=path.join(dir,'bytes.copy.sqlite'),bytes=Buffer.alloc(3*1024*1024+71);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;fs.writeFileSync(file,bytes);assert.equal(hashFile(file),sha(bytes));assert.equal(hashFile(file),sha(bytes));
});
test('legacy tables require explicit single-store gravuru scope, never arbitrary tenant inference',t=>{
 const f=fixture(t),db=new DatabaseSync(f.input.copy);for(const table of ['products','product_revisions','form_shop_bindings','form_shop_binding_selections','form_shop_binding_personalization'])db.exec('ALTER TABLE '+table+' DROP COLUMN tenant_id');db.close();
 assert.throws(()=>compareMainTargetCopy(f.input),/explicit --legacy-single-store/);
 assert.throws(()=>compareMainTargetCopy({...f.input,tenantId:'other',legacySingleStore:true}),/tenant gravuru/);
 const r=compareMainTargetCopy({...f.input,legacySingleStore:true});assert.equal(r.identityAndCoveragePassed,true);assert.equal(r.productScope,'explicit-single-store-gravuru-legacy');assert.equal(r.coverage.totalOptionsMatched,808);
});
test('manufacturing metadata exposes only the stored pin and motifCharge retains its actual value',t=>{
 const f=fixture(t),db=new DatabaseSync(f.input.copy),pin={id:'mfg_11111111-1111-4111-8111-111111111111',revision:2,sha256:'f'.repeat(64)};
 db.prepare('UPDATE product_revisions SET metadata=?').run(JSON.stringify({profiles:snapshot(),productionProfile:{...pin,document:{notes:'DO-NOT-EXPORT-MANUFACTURING'},machine:'DO-NOT-EXPORT-MACHINE'}}));
 db.exec("UPDATE form_shop_binding_personalization SET document=json_set(document,'$.motifCharge','all')");db.close();
 const r=compareMainTargetCopy(f.input);assert.deepEqual(r.productionProfile.storedMetadataPin,pin);assert.equal(r.productionProfile.metadataReferenceMatchesDocument,false);assert.equal(r.personalization.contractGroups[0].motifCharge,'all');assert.equal(r.personalization.expectedTargetExtras.motifCharge,null);assert.doesNotMatch(JSON.stringify(r),/DO-NOT-EXPORT/);
});
test('target defaults are projected by IDs/counts/hashes and native bestseller filtering without exporting items',t=>{
 const f=fixture(t),db=new DatabaseSync(f.input.profilesCopy);db.exec('CREATE TABLE profiles(id TEXT,revision INTEGER,type TEXT,tenant_id TEXT); CREATE TABLE profile_revisions(profile_id TEXT,revision INTEGER,document TEXT,tenant_id TEXT);');
 const defaults=assignments();for(const [type,items]of [['motifs',['DO-NOT-EXPORT-MOTIF']],['bestsellers',['DO-NOT-EXPORT-MOTIF','DO-NOT-EXPORT-EXCLUDED']]]){const id='profile-'+type;defaults[type]={mode:'override',profileId:id};db.prepare('INSERT INTO profiles VALUES(?,2,?,\'gravuru\')').run(id,type);db.prepare('INSERT INTO profile_revisions VALUES(?,2,?,\'gravuru\')').run(id,JSON.stringify({name:'Private profile',type,items}));}db.prepare('UPDATE profile_library_settings SET revision=2,document=?').run(JSON.stringify({defaults,categories:{}}));db.close();
 const r=compareMainTargetCopy(f.input);assert.deepEqual(r.resourceProfiles.selectionAndSourceDifferences,['motifs','bestsellers']);assert.equal(r.resourceProfiles.filteredBestsellers,1);assert.equal(r.resourceProfiles.actual.sources.bestsellers.count,1);assert.equal(r.resourceProfiles.actual.sources.motifs.profileRevision,2);assert.doesNotMatch(JSON.stringify(r),/DO-NOT-EXPORT/);
});
