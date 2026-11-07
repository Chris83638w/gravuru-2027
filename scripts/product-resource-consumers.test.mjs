import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {initializeProductDocumentResources,encodeStoredDocument} from '../app/workshop/product-document-resources.mjs';
import {createDesignCorrections} from '../app/workshop/design-corrections.mjs';
import {readCorrections} from '../app/workshop/katalog-writeback.mjs';
import {auditProductRevisionResources} from './lib/product-revision-resources-audit.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6QmcAAAAASUVORK5CYII=';
function fixture(t){
  const state=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-resource-consumers-')),filename=path.join(state,'workshop.sqlite');
  const db=new DatabaseSync(filename);
  db.exec('CREATE TABLE products(id TEXT,revision INTEGER,name TEXT,archived INTEGER);CREATE TABLE product_revisions(tenant_id TEXT,product_id TEXT,revision INTEGER,document TEXT);PRAGMA user_version=5;');
  initializeProductDocumentResources(db);
  const source=Buffer.from('synthetic original'),sourceSha=sha(source),preview=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),previewSha=sha(preview),assetId=sha(sourceSha+':'+previewSha+':1');
  const assets=new DatabaseSync(path.join(state,'design-assets.sqlite'));
  assets.exec('CREATE TABLE design_sources(sha256 TEXT,bytes BLOB);CREATE TABLE design_assets(id TEXT,source_sha256 TEXT,preview BLOB,metadata TEXT);');
  assets.prepare('INSERT INTO design_sources VALUES(?,?)').run(sourceSha,source);
  assets.prepare('INSERT INTO design_assets VALUES(?,?,?,?)').run(assetId,sourceSha,preview,JSON.stringify({page:1,previewSha256:previewSha,assetId}));assets.close();
  const profiles=new DatabaseSync(path.join(state,'profiles.sqlite'));profiles.exec('CREATE TABLE fixture(value TEXT)');profiles.close();
  const document={name:'Unchanged native layout',config:{materialSurface:image,localResources:{fonts:{Test:{name:'Test',regular:{units:1000,glyphs:{A:{a:600,d:'M0 0 L10 20 Z'}}},bold:{units:1000,glyphs:{A:{a:620,d:'M0 0 L12 20 Z'}}}}},photoExamples:[{assetId}]},profile:{designs:[{id:'original',objects:[{id:'text',type:'text',font:'Test',text:'A',x:12,y:34}]}]}}};
  const text=JSON.stringify(document),stored=encodeStoredDocument(db,text,{tenantId:'gravuru'});
  db.prepare('INSERT INTO products VALUES(?,?,?,?)').run('cfg_fixture',1,document.name,0);
  db.prepare('INSERT INTO product_revisions VALUES(?,?,?,?)').run('gravuru','cfg_fixture',1,stored);
  t.after(()=>{db.close();fs.rmSync(state,{recursive:true,force:true});});
  return {state,filename,db,document,text,stored,assetId};
}

test('catalog correction reads hydrate only the associated product and keep exact stored correction state',t=>{
  const f=fixture(t),corrections=createDesignCorrections({filename:f.filename,tenantId:'gravuru'});
  const state={objects:[{id:'text',type:'text',text:'Changed by merchant',font:'Test',x:20,y:40}]};
  try{corrections.save({productId:'cfg_fixture',productRevision:1,designId:'original',expectedRevision:0,state,actor:'synthetic'});}finally{corrections.close();}
  const before=f.db.prepare('SELECT * FROM design_corrections').get();
  const rows=readCorrections(f.filename);assert.equal(rows.length,1);
  assert.deepEqual(rows[0].document,f.document);assert.deepEqual(rows[0].state,state);
  assert.deepEqual(f.db.prepare('SELECT * FROM design_corrections').get(),before);
  assert.equal(f.db.prepare('SELECT document FROM product_revisions').get().document,f.stored);
  f.db.exec('DROP TRIGGER immutable_product_document_resource_delete');
  f.db.prepare("DELETE FROM product_document_resources WHERE kind='font'").run();
  assert.throws(()=>readCorrections(f.filename),{code:'product_resource_missing'},'a missing shared font is not silently treated as an absent product');
});

test('backup audit hydrates references, checks unused pool bytes and never modifies the database',t=>{
  const f=fixture(t),before=sha(fs.readFileSync(f.filename));
  assert.deepEqual(auditProductRevisionResources({filename:f.filename,assetIds:[f.assetId]}),{revisions:1,resources:2,verifiedAssetReferences:1});
  assert.equal(sha(fs.readFileSync(f.filename)),before);
  assert.throws(()=>auditProductRevisionResources({filename:f.filename,assetIds:[]}),/missing design asset/);
  f.db.prepare('INSERT INTO product_document_resources VALUES(?,?,?,?)').run('gravuru','font','f'.repeat(64),JSON.stringify({regular:{glyphs:{}}}));
  assert.throws(()=>auditProductRevisionResources({filename:f.filename,assetIds:[f.assetId]}),{code:'product_resource_corrupt'},'a backup must verify even an unreferenced pool row');
});

test('Python recovery verification uses the shared decoder and rejects damaged resources without changing saved state',t=>{
  const f=fixture(t),python=process.env.GRAVURU_PYTHON||'python3';
  const program="import importlib.util,json,pathlib,sys; spec=importlib.util.spec_from_file_location('handoff',sys.argv[1]); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); print(json.dumps(module.verify_state(pathlib.Path(sys.argv[2]),pathlib.Path(sys.argv[3]))))";
  const run=()=>spawnSync(python,['-c',program,path.join(root,'scripts/prepare-cloud-handoff.py'),f.state,root],{encoding:'utf8',windowsHide:true,env:{...process.env,GRAVURU_NODE:process.execPath}});
  const before=sha(fs.readFileSync(f.filename)),valid=run();assert.equal(valid.status,0,valid.error?.message||valid.stderr);
  const result=JSON.parse(valid.stdout);assert.equal(result.verifiedAssetReferences,1);assert.equal(result['workshop.sqlite'].version,5);
  assert.equal(result['workshop.sqlite'].tables.product_document_resources.rows,2);assert.equal(sha(fs.readFileSync(f.filename)),before);
  f.db.exec('DROP TRIGGER immutable_product_document_resource_delete');
  f.db.prepare("DELETE FROM product_document_resources WHERE kind='material-image'").run();
  assert.notEqual(run().status,0,'an incomplete backup cannot pass the restore gate');
});
