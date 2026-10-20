// K13 (S1, S2): Mandantenauflösung, Seed, Spalten-Migration, Ablagepfade, Isolation zweier Mandanten
// (repository, order-intake, Entwürfe, Freigabeprozess, Ausgaben, HTTP) und Grep-Test für den Mandantenfilter.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {DEFAULT_TENANT,createTenantRegistry,tenantFromRequest,shopDomainCandidate,requireTenant,ensureTenantColumn,tenantKey,tenantDataPath} from './tenant.mjs';
import {createProductRepository} from './repository.mjs';
import {createProductFamilies} from './product-families.mjs';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {createDesignAssetStore} from './design-assets.mjs';
import {createProductionProfiles} from './production-profiles.mjs';
import {createAiDesignJobs} from './ai-design-jobs.mjs';
import {createAiBatchJobs} from './ai-batch-jobs.mjs';
import {createFormVariants} from './form-variants.mjs';
import {createBatchJobs} from './batch-jobs.mjs';
import {createVariantBatchJobs} from './variant-batch-report.mjs';
import {createFontLibrary} from './font-library.mjs';
import {createContourStore} from './contours.mjs';
import {createProfileLibrary} from './profile-library.mjs';
import {createKonfiStatus} from './konfi-status.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';

const OTHER='zweiter';
const sha=b=>createHash('sha256').update(b).digest('hex');
const tmp=(t,prefix)=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),prefix));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const jwt=(config,role='merchant',sub='123')=>{
  const now=Math.floor(Date.now()/1000),p={aud:config.clientId,dest:role==='merchant'?'https://'+config.shopDomain:config.shopDomain,sub:role==='merchant'?sub:'gid://shopify/Customer/456',...(role==='merchant'?{iss:'https://'+config.shopDomain+'/admin'}:{}),exp:now+60,nbf:now,iat:now,jti:randomUUID()};
  const input=[{alg:'HS256',typ:'JWT'},p].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return 'Bearer '+input+'.'+createHmac('sha256',config.secret).update(input).digest('base64url');
};

test('Seed: gravuru ist Mandant 1 mit Shop-Domain aus der Laufzeitkonfiguration; Einstellungen nennen nur Secret-Namen',()=>{
  const db=new DatabaseSync(':memory:'),tenants=createTenantRegistry({database:db,shopDomain:'seed-shop.myshopify.com'});
  assert.equal(DEFAULT_TENANT,'gravuru');
  assert.deepEqual({id:tenants.seed.id,shopDomain:tenants.seed.shopDomain,status:tenants.seed.status},{id:'gravuru',shopDomain:'seed-shop.myshopify.com',status:'active'});
  assert.equal(tenants.settings('gravuru').shopDomain,'seed-shop.myshopify.com');
  // Erneuter Start mit anderer Laufzeit-Domain übernimmt diese, ohne einen zweiten Seed anzulegen.
  createTenantRegistry({database:db,shopDomain:'neu-shop.myshopify.com'});
  assert.equal(tenants.list().length,1);assert.equal(tenants.get('gravuru').shopDomain,'neu-shop.myshopify.com');
  tenants.setSetting('gravuru','clientSecretRef','GRAVURU_SHOPIFY_CLIENT_SECRET');
  for(const value of ['shpss_0123456789abcdef','geheim wert','a'])assert.throws(()=>tenants.setSetting('gravuru','clientSecretRef',value),{code:'tenant_setting'});
  assert.throws(()=>tenants.setSetting('gravuru','accessToken','x'),{code:'tenant_setting'});
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM tenant_settings').all()).includes('shpss_'));
  tenants.ensure({id:OTHER,shopDomain:'zweiter-shop.myshopify.com',name:'Zweiter Händler'});
  assert.throws(()=>tenants.ensure({id:'dritter',shopDomain:'zweiter-shop.myshopify.com'}),{code:'tenant_shop_taken'});
  for(const id of ['','Gross','a/b','x'.repeat(41)])assert.throws(()=>tenants.ensure({id}),{code:'tenant_missing'});
  assert.throws(()=>requireTenant({}),{status:503});assert.equal(requireTenant({tenant:{id:OTHER}}),OTHER);
});

test('Auflösung: Webhook, Session (Händler und Kunde) und App-Proxy wählen den Mandanten; sonst Standardmandant',()=>{
  const tenants=createTenantRegistry({database:new DatabaseSync(':memory:'),shopDomain:'a-shop.myshopify.com'});
  tenants.ensure({id:OTHER,shopDomain:'b-shop.myshopify.com'});
  const b={shopDomain:'b-shop.myshopify.com',clientId:'c',secret:'x'.repeat(32)};
  const resolve=(headers={},query='')=>tenantFromRequest({headers},new URL('http://127.0.0.1/api/workshop/products'+query),{tenants});
  assert.equal(resolve().id,'gravuru');assert.equal(resolve().source,'default');
  assert.equal(resolve({'x-shopify-shop-domain':'b-shop.myshopify.com'}).id,OTHER);
  assert.equal(resolve({authorization:jwt(b,'merchant')}).source,'session');
  assert.equal(resolve({authorization:jwt(b,'merchant')}).id,OTHER);
  assert.equal(resolve({authorization:jwt(b,'customer')}).id,OTHER);
  assert.equal(resolve({},'?shop=b-shop.myshopify.com&signature=abc').id,OTHER);
  // Ohne Signatur ist ein shop-Parameter kein App-Proxy-Aufruf; unbekannte Domain → Standardmandant (dessen Prüfer lehnen sie ab).
  assert.equal(resolve({},'?shop=b-shop.myshopify.com').id,'gravuru');
  assert.equal(resolve({'x-shopify-shop-domain':'fremd.myshopify.com'}).id,'gravuru');
  assert.equal(resolve({'x-shopify-shop-domain':'fremd.myshopify.com'}).shopDomainCandidate,'fremd.myshopify.com');
  assert.equal(shopDomainCandidate({headers:{authorization:'Bearer kaputt'}},null),null);
  tenants.setStatus(OTHER,'paused');
  assert.throws(()=>resolve({'x-shopify-shop-domain':'b-shop.myshopify.com'}),{code:'tenant_paused'});
});

test('Migration: tenant_id wird idempotent angehängt, Altdaten gehören dem Standardmandanten',()=>{
  const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE alt(id TEXT PRIMARY KEY);INSERT INTO alt VALUES('x')");
  ensureTenantColumn(db,'alt');ensureTenantColumn(db,'alt');
  assert.deepEqual(db.prepare('SELECT id,tenant_id FROM alt').all().map(r=>({...r})),[{id:'x',tenant_id:'gravuru'}]);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='index' AND name='alt_tenant'").get().n,1);
  assert.throws(()=>ensureTenantColumn(db,'fehlt'));assert.throws(()=>ensureTenantColumn(db,'x;DROP'));
  assert.equal(tenantKey('gravuru','a'.repeat(64)),'a'.repeat(64));assert.notEqual(tenantKey(OTHER,'a'.repeat(64)),'a'.repeat(64));assert.match(tenantKey(OTHER,'a'),/^[a-f0-9]{64}$/);
});

test('Ablage: <data>/<mandant>/…; den Altpfad kennt der Resolver nur für gravuru',t=>{
  const data=tmp(t,'g27-tenant-path-');fs.mkdirSync(path.join(data,'uploads'));fs.writeFileSync(path.join(data,'uploads','alt.png'),'x');
  assert.equal(tenantDataPath(data,'gravuru','uploads/alt.png'),path.join(data,'uploads','alt.png'));
  assert.equal(tenantDataPath(data,'gravuru','uploads/neu.png'),path.join(data,'gravuru','uploads','neu.png'));
  assert.equal(tenantDataPath(data,OTHER,'uploads/alt.png'),path.join(data,OTHER,'uploads','alt.png'));
  fs.mkdirSync(path.join(data,'gravuru','uploads'),{recursive:true});fs.writeFileSync(path.join(data,'gravuru','uploads','alt.png'),'neu');
  assert.equal(tenantDataPath(data,'gravuru','uploads/alt.png'),path.join(data,'gravuru','uploads','alt.png'));
  for(const bad of ['../x','/etc/passwd','a/../../x'])assert.throws(()=>tenantDataPath(data,OTHER,bad),{code:'tenant_path'});
  assert.throws(()=>tenantDataPath(data,'../x','a'),{code:'tenant_missing'});
});

const doc=name=>({schema:'gravuru-product/v1',kind:'product',name,masterId:null,config:{}});
test('Isolation repository/Familien/Assets/Profile: Produkt, Importschlüssel, Familie und Datei des einen sind für den anderen 404',async t=>{
  const filename=path.join(tmp(t,'g27-tenant-repo-'),'workshop.sqlite');
  const a=createProductRepository({filename}),b=createProductRepository({filename,tenantId:OTHER});t.after(()=>{a.close();b.close();});
  const product=a.create(doc('Nur gravuru'));
  assert.equal(a.get(product.id).document.name,'Nur gravuru');
  assert.throws(()=>b.get(product.id),{status:404});assert.deepEqual(b.list(),[]);assert.equal(b.firstId(),null);
  assert.equal(b.catalog({}).total,0);assert.equal(a.catalog({}).total,1);
  assert.throws(()=>b.save(product.id,doc('Übernahme'),1),{status:404});assert.throws(()=>b.history(product.id),{status:404});
  const entry={key:'gleicher-schluessel',fingerprint:'a'.repeat(64),document:doc('Import')};
  const [ia]=a.importBatch([entry]),[ib]=b.importBatch([entry]);
  assert.notEqual(ia.id,ib.id);assert.equal(a.importItem(entry.key).id,ia.id);assert.equal(b.importItem(entry.key).id,ib.id);
  const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url),'utf8'));
  const fa=createProductFamilies({filename,repository:a}),fb=createProductFamilies({filename,repository:b});t.after(()=>{fa.close();fb.close();});
  fa.create(family);assert.throws(()=>fb.get(family.id),{status:404});assert.deepEqual(fb.list(),[]);
  assert.equal(fb.create(family).id,family.id); // gleiche, vom Händler gewählte Kennung je Mandant zulässig
  const converter=async()=>({svg:'<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm"/>',widthMm:10,heightMm:10,pageCount:1,page:1});
  const assetsA=createDesignAssetStore({filename,converter}),assetsB=createDesignAssetStore({filename,converter,tenantId:OTHER});t.after(()=>{assetsA.close();assetsB.close();});
  const bytes=Buffer.from('<svg/>').toString('base64'),asset=await assetsA.import({name:'motiv.svg',bytes});
  assert.throws(()=>assetsB.get(asset.assetId),{status:404});assert.throws(()=>assetsB.read(asset.assetId,true),{status:404});assert.deepEqual(assetsB.list(),[]);
  assert.notEqual((await assetsB.import({name:'motiv.svg',bytes})).assetId,asset.assetId);
  const pa=createProductionProfiles({filename}),pb=createProductionProfiles({filename,tenantId:OTHER});t.after(()=>{pa.close();pb.close();});
  const profile=pa.create({name:'Synthetisch',method:'engraving',materialId:'steel',thicknessMm:1,machine:'',rip:'',notes:'',output:{mode:'vector',dpi:600,mirror:false},archived:false});
  assert.throws(()=>pb.get(profile.id),{status:404});assert.deepEqual(pb.list(),[]);
});

// Synthetische bezahlte Position (Muster aus production-release.test.mjs).
const order={shopDomain:'a-shop.myshopify.com',clientId:'fixture-client',apiVersion:'2026-07',secret:randomBytes(32).toString('hex'),mode:'test-only'};
function populate(store){
  const record={id:'cfg_fixture',revision:1,status:'draft',document:{kind:'product',schema:'gravuru-form-product/v1',basePriceCents:2999,designs:[{}]}};
  const draft=store.create(record,'design_fixture',{}),bytes=Buffer.from('synthetic source archive');
  const manifest={schema:'gravuru-form-review/v1',id:'proof_'+randomUUID(),source:{draftId:draft.id,draftRevision:1},product:{id:record.id,revision:1,basePriceCents:2999,currency:'EUR'},packageSha256:sha(bytes),blockers:[],warnings:[],photos:[]};
  store.capture(draft.id,draft.token,1,{manifest,preview:Buffer.from('<svg/>'),contourPdf:bytes,package:bytes,photos:bytes});
  const binding=store.orderIntake.bind({record,shopDomain:order.shopDomain,variantId:'301'});
  const offer=store.orderIntake.offer({bindingId:binding.id,snapshotId:manifest.id,quantity:1});
  const raw=Buffer.from(JSON.stringify({id:'101',test:true,financial_status:'paid',currency:'EUR',customer:{id:'456'},updated_at:'2026-10-06T12:00:00Z',line_items:[{id:'201',variant_id:'301',quantity:1,price:'29.99',properties:[offer.property]}]}));
  const headers={'x-shopify-hmac-sha256':createHmac('sha256',order.secret).update(raw).digest('base64'),'x-shopify-shop-domain':order.shopDomain,'x-shopify-api-version':order.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':randomUUID()};
  const line=store.orderIntake.receive(raw,headers,order).lines[0];
  const job=store.exportJobs.enqueue({snapshotId:manifest.id,recipeKey:'fixture/v1',recipe:'fixture/v1',settings:{}});
  return {draft,manifest,binding,offer,line,job};
}
const principal={shopDomain:'a-shop.myshopify.com',customerId:'gid://shopify/Customer/456'};
test('Isolation order-intake/Entwürfe/Freigabe/Ausgaben: Bestellung, Prüfstand und Entwurf des einen sind für den anderen 404',t=>{
  const filename=path.join(tmp(t,'g27-tenant-orders-'),'workshop.sqlite');
  const a=createFormCustomerStore({filename}),b=createFormCustomerStore({filename,tenantId:OTHER});t.after(()=>{a.close();b.close();});
  const f=populate(a);
  assert.equal(a.orderIntake.get(f.line.id).id,f.line.id);
  assert.throws(()=>b.orderIntake.get(f.line.id),{status:404});assert.deepEqual(b.orderIntake.list(),[]);assert.deepEqual(b.orderIntake.bindings(),[]);
  assert.deepEqual(b.orderIntake.forSnapshot(f.manifest.id),[]);
  assert.throws(()=>b.orderIntake.offer({bindingId:f.binding.id,snapshotId:f.manifest.id,quantity:1}),{status:404});
  assert.throws(()=>b.orderIntake.resolveCartOffer({offerId:f.offer.id,offerToken:f.offer.property.value,snapshotId:f.manifest.id,shopDomain:order.shopDomain}),{status:404});
  // Freigabeprozess: kein Zustand, keine Übergänge und keine Liste über die Mandantengrenze.
  assert.equal(a.orderIntake.production.state(f.line.id).state,'eingegangen');
  assert.throws(()=>b.orderIntake.production.state(f.line.id),{status:404});
  assert.throws(()=>b.orderIntake.production.transition(f.line.id,'geprueft',{actor:'merchant:1'}),{status:404});
  assert.deepEqual(b.orderIntake.production.list(),[]);assert.equal(a.orderIntake.production.list().length,1);
  // Prüfstand, Token-Entwurf, Ausgaben.
  assert.throws(()=>b.review(f.manifest.id),{status:404});assert.throws(()=>b.downloadSnapshot(f.manifest.id,'package'),{status:404});assert.deepEqual(b.listSnapshots(),[]);
  assert.throws(()=>b.get(f.draft.id,f.draft.token),{status:404});
  assert.throws(()=>b.exportJobs.get(f.job.id),{status:404});assert.deepEqual(b.exportJobs.list(),[]);assert.equal(b.exportJobs.claim(),null);
  assert.throws(()=>b.exportJobs.enqueue({snapshotId:f.manifest.id,recipeKey:'x',recipe:'x',settings:{}}),{status:404});
  // Konto-Entwürfe (customer-draft-store): derselbe Shop-Kunde sieht beim anderen Mandanten nichts.
  const saved=a.accountDrafts.create(principal,{productId:'cfg_x',profileRevision:'cfg_x:1',title:'Mein Entwurf',draft:{productId:'cfg_x'}});
  assert.equal(a.accountDrafts.list(principal).length,1);assert.deepEqual(b.accountDrafts.list(principal),[]);
  assert.throws(()=>b.accountDrafts.get(principal,saved.id),{status:404});assert.throws(()=>b.accountDrafts.remove(principal,saved.id),{status:404});
  assert.equal(a.accountDrafts.get(principal,saved.id).title,'Mein Entwurf');
  // Warenkorb-Konfigurationen.
  const conf=a.cartConfigurations.assign({draftId:f.draft.id,draftRevision:1,snapshotId:f.manifest.id,offerId:f.offer.id,productId:'cfg_fixture'});
  assert.throws(()=>b.cartConfigurations.revision(conf.id,conf.rev),{status:404});assert.equal(b.cartConfigurations.byOffer(f.offer.id),null);
});

test('Datenbank: jede Tabelle der Werkstatt trägt tenant_id (Ausnahmen begründet)',async t=>{
  const dir=tmp(t,'g27-tenant-schema-'),w=path.join(dir,'workshop.sqlite'),p=path.join(dir,'profiles.sqlite'),a=path.join(dir,'design-assets.sqlite');
  const repo=createProductRepository({filename:w}),stores=[repo,createProductFamilies({filename:w,repository:repo})];
  const ai=createAiDesignJobs({filename:w,repository:repo});stores.push(ai,createAiBatchJobs({filename:w,repository:repo,aiJobs:ai}));
  const v=createFormVariants({filename:w,repository:repo});stores.push(v,createBatchJobs({filename:w,repository:repo,assets:null}),createVariantBatchJobs({filename:w,variants:v}),createFormCustomerStore({filename:w}));stores.push(createKonfiStatus({filename:w}));
  stores.push(createProductionProfiles({filename:p}),createProfileLibrary({filename:path.join(dir,'profile-library.sqlite'),catalog:{fonts:[],motifs:[]}}),createFontLibrary({filename:a}),createContourStore({filename:a}),createDesignAssetStore({filename:a}));
  stores.push({close:()=>registry.close()});const registry=new DatabaseSync(w);createTenantRegistry({database:registry});
  t.after(()=>{for(const s of stores)s.close();});
  // design_sources: inhaltsadressierter Byte-Speicher, erreichbar nur über mandantengefilterte Ressourcenzeilen.
  // tenants: die Mandanten-Tabelle selbst. sqlite_sequence: interne SQLite-Tabelle.
  const exceptions=new Set(['design_sources','tenants','sqlite_sequence']),missing=[];let count=0;
  for(const file of [w,p,a,path.join(dir,'profile-library.sqlite')]){
    const db=new DatabaseSync(file);
    for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()){if(exceptions.has(name))continue;count++;if(!db.prepare(`PRAGMA table_info(${name})`).all().some(c=>c.name==='tenant_id'))missing.push(name);}
    db.close();
  }
  assert.deepEqual(missing,[]);assert.ok(count>=55,'erwartet mindestens 55 Tabellen, gefunden '+count);
});

// Grep-Test: jede SELECT/INSERT/UPDATE/DELETE-Anweisung, die an prepare( geht, nennt tenant_id – oder steht hier mit Grund.
const FILTERED_MODULES=['konfi-status.mjs','repository.mjs','product-catalog.mjs','product-families.mjs','production-profiles.mjs','profile-library.mjs','form-variants.mjs','form-customer-store.mjs','export-jobs.mjs','output-checks.mjs','order-intake.mjs','order-status.mjs','production-release.mjs','customer-downloads.mjs','shop-draft-transfer.mjs','cart-handoff-journal.mjs','cart-configuration.mjs','acrylic-draft-store.mjs','customer-draft-store.mjs','font-library.mjs','design-assets.mjs','contours.mjs','ai-design-jobs.mjs','ai-batch-jobs.mjs','import-job-store.mjs'];
const FILTER_EXCEPTIONS=[
  {module:'product-catalog.mjs',match:/\$\{from\} WHERE \$\{(search|where)\}/,reason:'Filter steht in der Konstante `search` (p.tenant_id=? …), `where` baut auf `search` auf; `from` verbindet über c.tenant_id=p.tenant_id.'},
  {module:/./,match:/FROM sqlite_master/,reason:'Schema-Abfrage (Tabellen vorhanden?), keine Mandantendaten.'},
  {module:'design-assets.mjs',match:/design_sources/,reason:'Gemeinsamer inhaltsadressierter Byte-Speicher (SHA-256 der Originaldatei); nur über eine mandantengefilterte design_assets-/photo_example_sources-Zeile erreichbar.'},
];
test('Grep: keine Abfrage ohne Mandantenfilter in den mandantenfähigen Modulen',()=>{
  const literal=/prepare\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/gs,violations=[];let checked=0;
  for(const module of FILTERED_MODULES){
    const source=fs.readFileSync(new URL('./'+module,import.meta.url),'utf8');
    assert.match(source,/from '\.\/tenant\.mjs'/,module+' bindet tenant.mjs nicht ein.');
    for(const [,sql] of source.matchAll(literal)){
      if(!/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql))continue;checked++;
      if(/tenant_id/.test(sql))continue;
      if(FILTER_EXCEPTIONS.some(e=>(typeof e.module==='string'?e.module===module:e.module.test(module))&&e.match.test(sql)))continue;
      violations.push(module+': '+sql.replace(/\s+/g,' ').slice(0,140));
    }
  }
  assert.deepEqual(violations,[]);assert.ok(checked>=230,'erwartet mindestens 230 geprüfte Anweisungen, gefunden '+checked);
  for(const e of FILTER_EXCEPTIONS)assert.ok(e.reason.length>20);
});

test('HTTP: Mandant je Request; Produkt und Bestellung des Standardmandanten sind für den zweiten 404, unbestätigte Mandanten 503',async t=>{
  const directory=tmp(t,'g27-tenant-http-');build({outputDirectory:directory});
  const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
  const a={...order},b={shopDomain:'b-shop.myshopify.com',clientId:'fixture-client-b',secret:randomBytes(32).toString('hex'),mode:'test-only'};
  const w=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:a,orderWebhook:a,
    tenantSettings:{clientSecretRef:'GRAVURU_SHOPIFY_CLIENT_SECRET'},tenantOptions:tenant=>tenant.id===OTHER?{shopifySessions:b}:null});
  t.after(()=>w.close());
  w.tenants.ensure({id:OTHER,shopDomain:b.shopDomain,name:'Zweiter Händler'});w.tenants.ensure({id:'ohne-anbindung',shopDomain:'c-shop.myshopify.com'});
  assert.equal(w.tenants.get('gravuru').shopDomain,a.shopDomain);assert.equal(w.tenants.settings('gravuru').clientSecretRef,'GRAVURU_SHOPIFY_CLIENT_SECRET');
  const request=async(pathname,authorization)=>{
    const req=Readable.from([]);req.method='GET';req.headers={'content-type':'application/json',authorization};
    const res={headersSent:false,writeHead(status){this.status=status;this.headersSent=true;return this;},end(bytes){this.body=JSON.parse(Buffer.from(bytes).toString());}};
    await w.handle(req,res,new URL(pathname,'http://127.0.0.1'));return res;
  };
  const product=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Nur gravuru',kind:'product'}),f=populate(w.customerDrafts);
  assert.equal((await request('/api/workshop/products/'+product.id,jwt(a))).status,200);
  assert.equal((await request('/api/workshop/products/'+product.id,jwt(b))).status,404);
  assert.equal((await request('/api/workshop/orders/'+f.line.id,jwt(a))).status,200);
  assert.equal((await request('/api/workshop/orders/'+f.line.id,jwt(b))).status,404);
  assert.equal((await request('/api/workshop/orders/'+f.line.id+'/production',jwt(b))).status,404);
  assert.equal((await request('/api/workshop/review-snapshots/'+f.manifest.id,jwt(b))).status,404);
  const listB=await request('/api/workshop/orders',jwt(b));assert.equal(listB.status,200);assert.deepEqual(listB.body.orders,[]);
  const productsB=await request('/api/workshop/products',jwt(b));assert.deepEqual(productsB.body.products,[]);
  const familiesB=await request('/api/workshop/families',jwt(b));assert.deepEqual(familiesB.body.bundled,[]); // gravurus Stammdaten nur für gravuru
  assert.ok((await request('/api/workshop/families',jwt(a))).body.bundled.length>0);
  const session=await request('/api/workshop/session',jwt(b));assert.deepEqual(session.body.tenant,{id:OTHER,name:'Zweiter Händler'});
  // Eine mit dem Schlüssel von gravuru signierte Sitzung für den Shop des zweiten Mandanten wird dort abgelehnt.
  assert.equal((await request('/api/workshop/products',jwt({...b,secret:a.secret,clientId:b.clientId}))).status,401);
  // Bekannter Mandant ohne eigene Shop-Anbindung: nie erreichbar.
  const c={...b,shopDomain:'c-shop.myshopify.com'},unverified=await request('/api/workshop/products',jwt(c));
  assert.equal(unverified.status,503);assert.equal(unverified.body.error.code,'tenant_unverified');
  // Die Werkstatt des zweiten Mandanten sieht dieselbe Datenbank, aber keine Zeile des Standardmandanten.
  const second=w.forTenant(OTHER);assert.throws(()=>second.repository.get(product.id),{status:404});assert.throws(()=>second.orderIntake.get(f.line.id),{status:404});
});
