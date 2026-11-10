import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createModelResponseCache,modelResponseKey,MODEL_RESPONSE_CACHE_DEFAULTS} from './customer-model-response-cache.mjs';
import {databaseEpoch} from './customer-read-scope.mjs';
import {createProductRepository} from './repository.mjs';
import {customerIntegrationFromEnv} from './acryl-employee-host.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';

const entry=(json,held=null)=>({json,activeKind:null,modelKind:null,startDesignId:'d1',fontHashes:[],held});
const doc=(name='Prüfprodukt')=>({schema:'gravuru-product/v1',name,kind:'product',masterId:null,config:{widthMm:150,heightMm:200,priceCents:1499}});

test('defaults are 64 entries, 64 MiB and two held models; invalid limits are refused',()=>{
 assert.deepEqual({...MODEL_RESPONSE_CACHE_DEFAULTS},{maxEntries:64,maxBytes:64*1024*1024,maxModels:2});
 assert.deepEqual({...createModelResponseCache().limits},{...MODEL_RESPONSE_CACHE_DEFAULTS});
 for(const bad of [{maxEntries:0},{maxBytes:-1},{maxModels:1.5},{maxEntries:'3'}])assert.throws(()=>createModelResponseCache(bad),RangeError);
});

test('the key covers store, product, revision, assignment, price, canonical options, design and slimmer state',()=>{
 const base={storeId:'acryl',productId:'cfg_1',productRevision:3,bindingId:'binding_1',assignmentRevision:1,unitCents:1148,options:{size:'A',mounting:'K00'},designId:null,slimState:'none'};
 const key=modelResponseKey(base);
 assert.equal(modelResponseKey({...base,options:{mounting:'K00',size:'A'}}),key,'Reihenfolge der Optionen ist gleichgültig');
 assert.equal(modelResponseKey({...base,designId:undefined}),key,'kein Design = null');
 for(const change of [{storeId:'legacy'},{productId:'cfg_2'},{productRevision:4},{bindingId:'binding_2'},{assignmentRevision:2},{unitCents:1149},{options:{size:'B',mounting:'K00'}},{options:{size:'A'}},{designId:'d2'},{slimState:'ready'}])
  assert.notEqual(modelResponseKey({...base,...change}),key,JSON.stringify(change));
 assert.notEqual(modelResponseKey({...base,designId:'null'}),key);
});

test('a hit needs exactly the same database epoch; any other epoch drops every entry of that store',()=>{
 const cache=createModelResponseCache();
 cache.set('acryl','k1','e1',entry('{"a":1}'));cache.set('acryl','k2','e1',entry('{"b":2}'));cache.set('legacy','k1','x1',entry('{"c":3}'));
 assert.equal(cache.get('acryl','k1','e1').json,'{"a":1}');
 assert.equal(cache.get('acryl','k1','e2'),null,'anderer Stand: kein Treffer');
 assert.equal(cache.get('acryl','k2','e1'),null,'… und auch der Stand e1 ist damit verworfen (kein Zurück)');
 assert.equal(cache.get('legacy','k1','x1').json,'{"c":3}','anderer Store bleibt unberührt');
 assert.equal(cache.stats().entries,1);
 cache.set('acryl','k1','e3',entry('{"d":4}'));
 assert.equal(cache.get('acryl','k1','e3').json,'{"d":4}');
});

test('entry and byte limits evict the least recently used entry; oversized responses are refused',()=>{
 const cache=createModelResponseCache({maxEntries:3,maxBytes:20});
 cache.set('s','a','e',entry('1234567'));cache.set('s','b','e',entry('1234567'));
 assert.ok(cache.get('s','a','e'),'a benutzt → jüngster');
 cache.set('s','c','e',entry('1234567'));
 assert.equal(cache.get('s','b','e'),null,'b war der älteste (Byte-Grenze 20 bei 3 × 7)');
 assert.ok(cache.get('s','a','e'));assert.ok(cache.get('s','c','e'));
 assert.ok(cache.stats().bytes<=20);
 assert.equal(cache.set('s','big','e',entry('x'.repeat(21))),false);assert.equal(cache.get('s','big','e'),null);
 const counted=createModelResponseCache({maxEntries:2});
 counted.set('s','a','e',entry('1'));counted.set('s','b','e',entry('1'));counted.set('s','c','e',entry('1'));
 assert.equal(counted.get('s','a','e'),null);assert.equal(counted.stats().entries,2);
 const multi=createModelResponseCache();
 assert.equal(multi.set('s','é','e',entry('äöü')),true);assert.equal(multi.stats().bytes,Buffer.byteLength('äöü'),'Bytes, nicht Zeichen');
});

test('entries of one product state share one held model; the number of distinct held models is limited',()=>{
 const cache=createModelResponseCache({maxModels:2});
 const heldA={holderKey:'A',model:{},cardModel:{}},heldB={holderKey:'B',model:{},cardModel:{}},heldC={holderKey:'C',model:{},cardModel:{}};
 cache.set('s','a1','e',entry('1',heldA));cache.set('s','a2','e',entry('2',cache.heldFor('s','A','e')));
 assert.equal(cache.heldFor('s','A','e'),heldA);assert.equal(cache.stats().models,1);
 cache.set('s','b1','e',entry('3',heldB));assert.equal(cache.stats().models,2);assert.equal(cache.stats().entries,3);
 cache.set('s','c1','e',entry('4',heldC));
 assert.equal(cache.stats().models,2,'dritte Produktfassung verdrängt die älteste');
 assert.equal(cache.get('s','a1','e'),null);assert.equal(cache.get('s','a2','e'),null,'beide Einträge der verdrängten Fassung gehen mit');
 assert.ok(cache.get('s','c1','e'));
 assert.equal(cache.heldFor('s','A','e'),null);assert.equal(cache.heldFor('s','C','other'),null,'anderer Stand: nichts gehalten');
});

test('databaseEpoch changes on own writes, rolled-back writes, schema changes, foreign commits and TEMP schema; reads leave it alone',t=>{
 const dir=mkdtempSync(join(tmpdir(),'gravuru-epoch-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const file=join(dir,'p.sqlite'),db=new DatabaseSync(file),other=new DatabaseSync(file);t.after(()=>{db.close();other.close();});
 db.exec('CREATE TABLE value(n); INSERT INTO value VALUES(1)');
 const seen=new Set([databaseEpoch(db)]);
 const changed=(label,work)=>{const before=databaseEpoch(db);work();const after=databaseEpoch(db);assert.notEqual(after,before,label);assert.ok(!seen.has(after)||label.startsWith('Rückkehr'),label);seen.add(after);};
 assert.equal(databaseEpoch(db),databaseEpoch(db));
 db.prepare('SELECT n FROM value').all();assert.equal(databaseEpoch(db),[...seen][0],'Lesen ändert den Stand nicht');
 changed('eigener Schreibvorgang',()=>db.exec('UPDATE value SET n=2'));
 changed('Zurückgerollter eigener Schreibvorgang',()=>{db.exec('BEGIN');db.exec('UPDATE value SET n=3');db.exec('ROLLBACK');});
 changed('Schreibvorgang, der zum alten Wert zurückkehrt',()=>db.exec('UPDATE value SET n=2'));
 changed('Schemaänderung',()=>db.exec('CREATE TABLE extra(x)'));
 changed('TEMP-Schema',()=>db.exec('CREATE TEMP TABLE shadow(x)'));
 changed('Commit einer fremden Verbindung',()=>other.exec('INSERT INTO value VALUES(9)'));
 const before=databaseEpoch(db);other.exec('BEGIN');other.exec('INSERT INTO value VALUES(10)');other.exec('ROLLBACK');
 assert.equal(databaseEpoch(db),before,'fremder Versuch, der nie festgeschrieben wurde, ändert nichts');
});

test('repository.readEpoch follows every repository write, including a rolled-back save',t=>{
 const dir=mkdtempSync(join(tmpdir(),'gravuru-repo-epoch-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const file=join(dir,'products.sqlite');let failNext=false;
 const repository=createProductRepository({filename:file,snapshotMetadata:()=>{if(failNext)throw new Error('Metadaten fehlgeschlagen');return {};}});
 const foreign=createProductRepository({filename:file,snapshotMetadata:()=>({})});
 t.after(()=>{repository.close();foreign.close();});
 assert.equal(typeof repository.readEpoch(),'string');
 const step=(label,work)=>{const before=repository.readEpoch();work();assert.notEqual(repository.readEpoch(),before,label);};
 let created;
 step('anlegen',()=>{created=repository.create(doc());});
 const stable=repository.readEpoch();repository.get(created.id);repository.list();repository.history(created.id);
 assert.equal(repository.readEpoch(),stable,'Lesen ändert den Stand nicht');
 step('neue Revision',()=>repository.save(created.id,doc('Zwei'),1));
 step('veröffentlichen',()=>repository.publish(created.id,{expectedRevision:2}));
 const head=()=>repository.get(created.id).revision;
 step('archivieren',()=>repository.setArchived(created.id,{expectedRevision:head(),archived:true}));
 const revision=head();
 step('zurückgerollter Speicherversuch (UPDATE, dann Fehler)',()=>{failNext=true;assert.throws(()=>repository.save(created.id,doc('Drei'),revision),{code:'invalid_snapshot_metadata'});failNext=false;});
 assert.equal(head(),revision,'nichts wurde gespeichert');
 step('Schreibvorgang einer anderen Repository-Verbindung',()=>foreign.create(doc('Fremd')));
});

test('the environment switch accepts only "enabled", needs the customer integration and is off by default',()=>{
 const base={GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'};
 assert.equal(customerIntegrationFromEnv(base).shopEntry.modelResponseCache,undefined);
 assert.equal(customerIntegrationFromEnv({...base,GRAVURU_CUSTOMER_MODEL_CACHE:''}).shopEntry.modelResponseCache,undefined);
 assert.equal(customerIntegrationFromEnv({...base,GRAVURU_CUSTOMER_MODEL_CACHE:'enabled'}).shopEntry.modelResponseCache,true);
 assert.deepEqual(customerIntegrationFromEnv({...base,GRAVURU_CUSTOMER_MODEL_CACHE:'enabled'}).shopEntry,{proxyPath:'/apps/konfigurator',modelResponseCache:true});
 for(const value of ['true','on','1','Enabled','enabled ','disabled','yes'])
  for(const env of [base,{}])assert.throws(()=>customerIntegrationFromEnv({...env,GRAVURU_CUSTOMER_MODEL_CACHE:value}),{code:'customer_model_cache_env'},value);
 assert.throws(()=>customerIntegrationFromEnv({GRAVURU_CUSTOMER_MODEL_CACHE:'enabled'}),{code:'customer_model_cache_env'},'ohne Kundenanbindung');
 assert.equal(customerIntegrationFromEnv({}),null);
});

test('the integration accepts only modelResponseCache: true in the shop entry settings',()=>{
 const stub={orderIntake:{idBindings:()=>({resolve(){throw Error('nicht im Test');}})},repository:{},customerDrafts:{}};
 const attempt=value=>createConfiguratorIntegration({settings:{mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl',shopEntry:{proxyPath:'/apps/konfigurator',modelResponseCache:value}},legacy:{...stub,repository:{a:1},customerDrafts:{a:1}},acryl:{...stub,repository:{b:1},customerDrafts:{b:1}},origin:'https://app.example',shopifySessions:{shopDomain:'x.myshopify.com',secret:'s'.repeat(32),clientId:'c'}});
 for(const bad of [false,'enabled',1,{},null])assert.throws(()=>attempt(bad),/Kundeneinstieg ist nicht eindeutig eingerichtet/,String(bad));
});
