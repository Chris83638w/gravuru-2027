import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createProductRepository} from './repository.mjs';
import {readStoredDocumentText} from './product-document-resources.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const font=()=>({regular:{units:1000,glyphs:{A:{a:620,d:'M0 0L20 40Z'}},kerning:{AA:-10}}});
const surface='data:image/png;base64,'+Buffer.from('original plate bytes').toString('base64');
const document=(name='Original',extra={})=>({schema:'gravuru-product/v1',name,kind:'product',masterId:null,
  config:{profile:{id:'source-native',geometry:{width:220,height:140},designs:[{id:'D1',objects:[{id:'name',type:'text',text:'Anna',font:'Original font',x:35.12345,y:60.54321}]}]},localResources:{fonts:{'Original font':font()},motifs:[]},materialSurface:surface,basePriceCents:1999},
  categoryIds:['tiere'],productionProfile:{id:'mfg_1234',revision:2},...extra});
function fixture(t,options={}){
  const directory=mkdtempSync(join(tmpdir(),'gravuru-shared-resources-')),filename=join(directory,'products.sqlite'),connections=[];
  const open=(overrides={})=>{const r=createProductRepository({filename,...options,...overrides});connections.push(r);return r;};
  const sql=()=>{const db=new DatabaseSync(filename);connections.push(db);return db;};
  t.after(()=>{for(const c of connections)try{c.close();}catch{}rmSync(directory,{recursive:true,force:true});});
  return {filename,open,sql,repository:open()};
}

test('every revision, clone, archive, publish and restore exposes unchanged complete data',t=>{
  const seen=[],{repository:r,sql,open}=fixture(t,{snapshotMetadata:d=>{seen.push(structuredClone(d));return {fontHash:sha(JSON.stringify(d.config.localResources.fonts)),proof:'unchanged'};}});
  const source=document('Master',{kind:'master'}),first=r.create(source),copy=r.copy(first.id,{expectedRevision:1,name:'Kopie'});
  assert.equal(copy.document.masterId,first.id);assert.deepEqual(copy.document.config,source.config);
  const publication=r.publish(first.id,{expectedRevision:1});
  const changed=structuredClone(source);changed.config.profile.designs[0].objects[0].text='Geändert';
  const saved=r.save(first.id,changed,publication.revision),archived=r.setArchived(first.id,{expectedRevision:saved.revision,archived:true});
  const restored=r.restore(first.id,{expectedRevision:archived.revision,revision:1});
  assert.deepEqual(restored.document,source);assert.equal(restored.status,'archived');assert.equal(restored.publishedRevision,publication.revision);
  assert.deepEqual(r.get(first.id,{revision:publication.revision}),publication);
  const db=sql();assert.equal(db.prepare('SELECT count(*) n FROM product_document_resources').get().n,2);
  for(const row of db.prepare('SELECT product_id,revision,document,tenant_id FROM product_revisions').all()){
    const logical=r.get(row.product_id,{revision:row.revision}).document;
    assert.equal(readStoredDocumentText(db,row.document,{tenantId:row.tenant_id}),JSON.stringify(logical));
    assert.equal(row.document.includes('M0 0L20 40Z'),false);
  }
  assert.ok(seen.every(d=>d.config.localResources.fonts['Original font'].regular.glyphs.A.d==='M0 0L20 40Z'));
  r.close();const restarted=open();assert.deepEqual(restarted.get(first.id),restored);
  const usage=restarted.productionProfileUsage('mfg_1234');
  assert.equal(usage.length,3); // Master head + its fixed publication + the copy.
  assert.deepEqual(usage.filter(row=>row.id===first.id).map(row=>row.revision).sort((a,b)=>a-b),[publication.revision,restored.revision]);
  assert.equal(usage.find(row=>row.id===copy.id).revision,copy.revision);
});

test('a failed multi-product import rolls back the resource pool with the products and journal',t=>{
  const {repository:r,sql}=fixture(t,{snapshotMetadata:d=>{if(d.name==='Reject')throw Error('metadata failure');return {};}});
  const entry=(key,name)=>({key,fingerprint:'a'.repeat(64),document:document(name)});
  assert.throws(()=>r.importBatch([entry('one','First'),entry('two','Reject')]),/metadata failure/);
  const db=sql();assert.equal(db.prepare('SELECT count(*) n FROM products').get().n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM product_revisions').get().n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM product_document_resources').get().n,0);
  assert.equal(r.importItem('one'),null);
});

test('catalog rebuild hydrates resources while listings keep only compact overview data',t=>{
  const overview=d=>({material:'slate',method:'engraving',glyphAdvance:d.config.localResources.fonts['Original font'].regular.glyphs.A.a});
  const {repository:r,sql,open}=fixture(t,{catalogOverview:overview}),first=r.create(document());
  const expected=r.catalog();r.close();const db=sql();db.exec('DELETE FROM product_catalog');
  const reopened=open();assert.deepEqual(reopened.catalog(),expected);
  assert.equal(reopened.catalog().products[0].overview.glyphAdvance,620);
  assert.equal(JSON.stringify(reopened.catalog()).includes('$gravuruResource'),false);
  assert.equal(JSON.stringify(reopened.catalog()).includes('glyphs'),false);
  assert.deepEqual(reopened.get(first.id).document,document());
});

test('opening a v4 store preserves every inline byte and only new revisions share payloads',t=>{
  const {repository:r,sql,open}=fixture(t),source=document(),first=r.create(source);r.close();
  const db=sql(),raw=JSON.stringify(source,null,2);
  // Recreate an old physical inline row in this isolated fixture only.
  db.exec('DROP TRIGGER immutable_revision_update');
  db.prepare('UPDATE product_revisions SET document=? WHERE product_id=?').run(raw,first.id);
  db.exec("CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON product_revisions BEGIN SELECT RAISE(ABORT,'Product revisions are immutable'); END; DROP TABLE product_document_resources; PRAGMA user_version=4");
  const oldRow=db.prepare('SELECT * FROM product_revisions').get(),reopened=open();
  assert.deepEqual(db.prepare('SELECT * FROM product_revisions WHERE revision=1').get(),oldRow);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version,5);
  assert.deepEqual(reopened.get(first.id).document,source);
  assert.equal(readStoredDocumentText(db,oldRow.document),raw);
  reopened.save(first.id,{...source,name:'Neu'},1);
  assert.equal(db.prepare('SELECT count(*) n FROM product_document_resources').get().n,2);
  assert.equal(db.prepare('SELECT document FROM product_revisions WHERE revision=1').get().document,raw);
});

test('same resource content across products is deduplicated; tenants remain separate',t=>{
  const {repository:r,sql,open}=fixture(t),names=Array.from({length:100},(_,i)=>'Schild '+i);
  let expectedFullBytes=0;
  for(const name of names){const source=document(name);source.config.localResources.fonts['Original font'].regular.glyphs.A.d='M0 0L20 40Z'.repeat(5000);source.config.materialSurface='data:image/png;base64,'+Buffer.alloc(50000,75).toString('base64');expectedFullBytes+=Buffer.byteLength(JSON.stringify(source));r.create(source);}
  const db=sql(),pool=db.prepare('SELECT count(*) n,sum(length(CAST(value_json AS BLOB))) bytes FROM product_document_resources').get();
  assert.equal(pool.n,2);
  const documents=db.prepare('SELECT sum(length(CAST(document AS BLOB))) bytes FROM product_revisions').get().bytes;
  assert.ok(documents+pool.bytes<expectedFullBytes/20);
  const other=open({tenantId:'other'}),source=document('Anderer Mandant');other.create(source);assert.equal(db.prepare('SELECT count(DISTINCT tenant_id) n FROM product_document_resources').get().n,2);
  assert.equal(other.catalog().total,1);assert.equal(r.catalog().total,100);
  assert.deepEqual(other.list()[0].document,source);
});
