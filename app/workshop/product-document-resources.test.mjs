import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {initializeProductDocumentResources,encodeStoredDocument,readStoredDocumentText,parseStoredDocument} from './product-document-resources.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const font=()=>({regular:{units:1000,glyphs:{A:{a:560,d:'M0 0L10 20Z'},'ä':{a:510,d:'M0 0L20 10Z'}}},source:{name:'Unveränderte Originalschrift'}});
const surface='data:image/webp;base64,'+Buffer.from('byte-identical plate test bytes').toString('base64');
const document=()=>({name:'Tafel – unverändert',kind:'product',masterId:null,config:{profile:{id:'native-source',geometry:{width:220,height:140},designs:[{id:'original-1',objects:[{id:'name',type:'text',text:'Änne',font:'A',x:31.12345,y:24.87654}]}]},materialSurface:surface,sceneBackground:surface,localResources:{fonts:{A:font(),Alias:font()},motifs:[{key:'kept',svgFragment:'<path d="M0 0Z"/>'}],photoExamples:[{assetId:'private-photo'}]}},productionProfile:{id:'mfg_1234',revision:3}});
function fixture(t){const db=new DatabaseSync(':memory:');initializeProductDocumentResources(db);t.after(()=>db.close());return db;}
const rows=db=>db.prepare('SELECT * FROM product_document_resources ORDER BY tenant_id,kind,sha256').all();

test('shared payloads round-trip the exact document text, hashes and names without exposing storage references',t=>{
  const db=fixture(t),source=document(),text=JSON.stringify(source),stored=encodeStoredDocument(db,text,{tenantId:'gravuru'});
  assert.notEqual(stored,text);assert.equal(rows(db).length,2);
  const raw=JSON.parse(stored);
  assert.deepEqual(raw.config.localResources.fonts.A,raw.config.localResources.fonts.Alias);
  assert.equal(raw.config.sceneBackground,surface);assert.deepEqual(raw.config.profile,source.config.profile);
  assert.deepEqual(raw.config.localResources.motifs,source.config.localResources.motifs);
  assert.deepEqual(raw.config.localResources.photoExamples,source.config.localResources.photoExamples);
  assert.equal(readStoredDocumentText(db,stored,{tenantId:'gravuru'}),text);
  assert.equal(sha(readStoredDocumentText(db,stored)),sha(text));
  assert.deepEqual(parseStoredDocument(db,stored),source);
  for(const row of rows(db))assert.equal(row.sha256,sha(row.value_json));
  const next={...source,name:'Anderer Produktname'};
  assert.deepEqual(parseStoredDocument(db,encodeStoredDocument(db,JSON.stringify(next))),next);
  assert.equal(rows(db).length,2);
});

test('a payload change or property-order difference never replaces an existing immutable font',t=>{
  const db=fixture(t),source=document(),first=encodeStoredDocument(db,JSON.stringify(source));
  source.config.localResources.fonts.A.regular.glyphs.A.a=600;
  const changed=encodeStoredDocument(db,JSON.stringify(source));assert.equal(rows(db).length,3);
  assert.equal(parseStoredDocument(db,first).config.localResources.fonts.A.regular.glyphs.A.a,560);
  assert.equal(parseStoredDocument(db,changed).config.localResources.fonts.A.regular.glyphs.A.a,600);
  const old=source.config.localResources.fonts.A;
  source.config.localResources.fonts.A={source:old.source,regular:old.regular};
  const reordered=JSON.stringify(source);
  assert.equal(readStoredDocumentText(db,encodeStoredDocument(db,reordered)),reordered);
  assert.equal(rows(db).length,4);
});

test('read objects do not alias another font name, revision or subsequent read',t=>{
  const db=fixture(t),stored=encodeStoredDocument(db,JSON.stringify(document()));
  const a=parseStoredDocument(db,stored),b=parseStoredDocument(db,stored);
  a.config.localResources.fonts.A.regular.glyphs.A.d='M99 99Z';
  assert.equal(a.config.localResources.fonts.Alias.regular.glyphs.A.d,'M0 0L10 20Z');
  assert.equal(b.config.localResources.fonts.A.regular.glyphs.A.d,'M0 0L10 20Z');
  assert.equal(parseStoredDocument(db,stored).config.localResources.fonts.A.regular.glyphs.A.d,'M0 0L10 20Z');
});

test('noncanonical legacy text and references outside the whitelist remain exactly inline',t=>{
  const db=fixture(t),whitespace=JSON.stringify(document(),null,2),escaped=JSON.stringify(document()).replace('Änne','\\u00c4nne');
  for(const original of [whitespace,escaped,' { "legacy": [ 1, 2 ], "text":"\\u0041" } ']){
    assert.equal(encodeStoredDocument(db,original),original);
    assert.equal(readStoredDocumentText(db,original),original);
    assert.deepEqual(parseStoredDocument(db,original),JSON.parse(original));
  }
  const other=JSON.stringify({unknown:{$gravuruResource:1,kind:'font',sha256:'0'.repeat(64)}});
  assert.equal(readStoredDocumentText(db,other),other);assert.equal(rows(db).length,0);
});

test('material URLs and unrelated resources are never converted or copied into the pool',t=>{
  const db=fixture(t),source=document();delete source.config.localResources.fonts;
  source.config.materialSurface='/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png';
  const text=JSON.stringify(source);assert.equal(encodeStoredDocument(db,text),text);assert.equal(rows(db).length,0);
});

test('resource lookup is tenant-bound even when a foreign tenant owns identical payloads',t=>{
  const db=fixture(t),text=JSON.stringify(document()),stored=encodeStoredDocument(db,text,{tenantId:'alpha'});
  assert.throws(()=>readStoredDocumentText(db,stored,{tenantId:'beta'}),e=>e.code==='product_resource_missing');
  assert.equal(readStoredDocumentText(db,stored,{tenantId:'alpha'}),text);
  const beta=encodeStoredDocument(db,text,{tenantId:'beta'});assert.equal(beta,stored);assert.equal(rows(db).length,4);
  assert.equal(readStoredDocumentText(db,beta,{tenantId:'beta'}),text);
});

test('internal, malformed, wrong-kind and unsupported-version references fail closed',t=>{
  const db=fixture(t),stored=encodeStoredDocument(db,JSON.stringify(document()));
  assert.throws(()=>encodeStoredDocument(db,stored),e=>e.code==='product_resource_reference_forbidden');
  for(const patch of [{kind:'material-image'},{sha256:'unknown'},{$gravuruResource:2},{extra:true}]){
    const value=JSON.parse(stored);Object.assign(value.config.localResources.fonts.A,patch);
    assert.throws(()=>readStoredDocumentText(db,JSON.stringify(value)),e=>e.code==='product_resource_reference');
  }
  const missing=new DatabaseSync(':memory:');t.after(()=>missing.close());
  assert.throws(()=>readStoredDocumentText(missing,stored),e=>e.code==='product_resource_missing');
});

test('resource rows are immutable and corrupt or absent payloads never silently fall back',t=>{
  const db=fixture(t),stored=encodeStoredDocument(db,JSON.stringify(document()));
  assert.throws(()=>db.prepare('UPDATE product_document_resources SET value_json=?').run('{}'),/immutable/);
  assert.throws(()=>db.exec('DELETE FROM product_document_resources'),/immutable/);
  const existing=rows(db)[0];
  assert.throws(()=>db.prepare('INSERT OR REPLACE INTO product_document_resources VALUES(?,?,?,?)').run(existing.tenant_id,existing.kind,existing.sha256,'{}'),/immutable/);
  db.exec('DROP TRIGGER immutable_product_document_resource_update');
  db.prepare("UPDATE product_document_resources SET value_json=? WHERE kind='font'").run('{}');
  assert.throws(()=>parseStoredDocument(db,stored),e=>e.code==='product_resource_corrupt');
  assert.throws(()=>encodeStoredDocument(db,JSON.stringify(document())),e=>e.code==='product_resource_corrupt');
  db.exec('DROP TRIGGER immutable_product_document_resource_delete; DELETE FROM product_document_resources');
  assert.throws(()=>parseStoredDocument(db,stored),e=>e.code==='product_resource_missing');
});

test('failed encoding rolls back its own writes and joins an existing caller transaction',t=>{
  const db=fixture(t);
  db.exec("CREATE TRIGGER reject_test_surface BEFORE INSERT ON product_document_resources WHEN NEW.kind='material-image' BEGIN SELECT RAISE(ABORT,'test surface failure'); END");
  assert.throws(()=>encodeStoredDocument(db,JSON.stringify(document())),/test surface failure/);
  assert.equal(rows(db).length,0);assert.equal(db.isTransaction,false);
  db.exec('DROP TRIGGER reject_test_surface; BEGIN IMMEDIATE');
  encodeStoredDocument(db,JSON.stringify(document()));assert.equal(db.isTransaction,true);assert.equal(rows(db).length,2);
  db.exec('ROLLBACK');assert.equal(rows(db).length,0);
});

test('special font names stay own JSON properties and initialization is idempotent',t=>{
  const db=fixture(t),source=document();source.config.localResources.fonts=JSON.parse('{"__proto__":'+JSON.stringify(font())+'}');
  const text=JSON.stringify(source),stored=encodeStoredDocument(db,text),loaded=parseStoredDocument(db,stored);
  assert.equal(readStoredDocumentText(db,stored),text);assert.equal(Object.hasOwn(loaded.config.localResources.fonts,'__proto__'),true);
  assert.equal(Object.getPrototypeOf(loaded.config.localResources.fonts),Object.prototype);
  initializeProductDocumentResources(db);assert.equal(rows(db).length,2);
});
