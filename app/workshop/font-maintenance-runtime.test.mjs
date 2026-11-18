import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createShopifyTestRuntime} from './shopify-admin-test-server.mjs';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from './gallery-shop-sync-test-fixture.mjs';
import {SHOPIFY_IDENTITY} from './shopify-runtime-config.mjs';
import {createFontConnectionHost} from '../../scripts/lib/font-connection-host.mjs';
import {syncHash} from './gallery-shop-sync-native.mjs';

async function setup(t){
 const parent=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'font-native-maint-'));
 const f=await createGallerySyncTestFixture({directory:root,shopDomain:SHOPIFY_IDENTITY.shopDomain});
 const dataDirectory=path.join(root,'target'),katalogRoot=path.join(root,'katalog'),fonts=['Michroma','Lato','Cinzel','Montserrat'];
 fs.cpSync(new URL('./fixtures/katalog/',import.meta.url),katalogRoot,{recursive:true});
 f.targetWorkshop.profiles.registerFonts(fonts);f.targetWorkshop.profiles.syncCatalogFontSet('tuerschilder',fonts);f.close();
 // The HTTP runtime requires a private directory on POSIX as it does in production.
 fs.chmodSync(dataDirectory,0o700);
 t.after(()=>{assert.equal(path.dirname(root),parent);fs.rmSync(root,{recursive:true,force:true});});
 if(process.platform==='win32'){
  // Only the POSIX permission flag is simulated on Windows; Linux must also run this test.
  const stat=fs.statSync;t.mock.method(fs,'statSync',(name,...args)=>{const s=stat(name,...args);if(String(name).startsWith(root+path.sep))Object.defineProperty(s,'mode',{value:s.mode&~0o077});return s;});
 }
 const env={GRAVURU_PRIVATE_DATA_DIR:dataDirectory,GRAVURU_SHOPIFY_APP_ORIGIN:'https://workshop.example',GRAVURU_SHOPIFY_CLIENT_SECRET:'synthetic-private-host-secret-32-bytes',GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN:'synthetic-private-host-token',GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only'};
 const options={tenantId:'gravuru',shopDomain:SHOPIFY_IDENTITY.shopDomain,dataDirectory,katalogRoot,planDirectory:path.join(root,'plans'),webRoots:[path.join(root,'public')],
  targets:[{id:'synthetic',setId:'tuerschilder',reviewedRevision:1,mapping:f.mapping}],approvedSets:[{id:'tuerschilder',fonts}],runtimeFonts:Object.fromEntries(fonts.map(n=>[n,{regular:{units:1000,glyphs:{}}}]))};
 return {...f,root,env,options,dataDirectory,katalogRoot,filename:path.join(dataDirectory,'workshop.sqlite')};
}

test('same native factory plans without server, timers or AI/export recovery and preserves queued jobs',async t=>{
 const f=await setup(t),db=new DatabaseSync(f.filename);
 db.prepare("INSERT INTO ai_design_jobs(id,product_id,base_revision,design_id,fingerprint,month,status,request,reserved_cents,created_at,updated_at,tenant_id) VALUES('synthetic-ai',?,1,'synthetic','fixed','2026-11','running','{}',0,'fixed','fixed','gravuru')").run(f.target.id);
 db.exec("INSERT INTO ai_design_batches(id,fingerprint,request,status,message,created_at,tenant_id) VALUES('synthetic-batch','fixed','{}','running','','fixed','gravuru'); INSERT INTO form_export_jobs(id,snapshot_id,recipe_key,recipe,settings,status,created_at,updated_at,tenant_id) VALUES('synthetic-export','synthetic','synthetic','synthetic','{}','queued',1,1,'gravuru');");
 const snapshot=()=>Object.fromEntries(['ai_design_jobs','ai_design_batches','form_export_jobs','form_export_events'].map(name=>[name,db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]));
 const before=syncHash(snapshot());
 t.mock.method(globalThis,'setInterval',()=>{throw Error('background interval in maintenance');});
 let networkCalls=0;
 t.mock.method(globalThis,'fetch',async(url,request)=>{networkCalls++;const payload=JSON.parse(request.body);assert.ok(payload.query.startsWith('query '));
  return new Response(JSON.stringify({data:{shop:{myshopifyDomain:SHOPIFY_IDENTITY.shopDomain,currencyCode:'EUR'},product:{id:PRODUCT,
   variants:{nodes:f.variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2)})),pageInfo:{hasNextPage:false}},media:{nodes:[],pageInfo:{hasNextPage:false}}}}}),{headers:{'content-type':'application/json','x-shopify-api-version':'2026-07'}});});
 const timersBefore=process.getActiveResourcesInfo().filter(x=>x==='Timeout').length;
 const mount=createFontConnectionHost(f.options),started=performance.now();
 // Match the explicitly synthetic available font catalogue used by this fixture;
 // actual TTF import/glyph coverage is covered by the separate font backend tests.
 const fontConnection={connect(context){context.workshop.profiles.registerFonts(Object.keys(f.options.runtimeFonts));return mount.connect(context);}};
 const runtime=createShopifyTestRuntime(f.env,{maintenanceOnly:true,katalogRoot:f.katalogRoot,fontConnection});
 try{
  assert.deepEqual(Object.keys(runtime).sort(),['close','workshop']);
  assert.deepEqual(Object.keys(runtime.workshop).sort(),['close','fonts','orderIntake','productionProfiles','profiles','repository','sessionContext','tenantId']);
  assert.equal(syncHash(snapshot()),before);assert.equal(networkCalls,0);
  const saved=await mount.operator().plan({targetId:'synthetic'});
  await assert.rejects(mount.operator().execute(saved.sha256),{code:'font_connection_execution_disabled'});
  assert.equal(runtime.workshop.repository.get(f.target.id).revision,1);assert.equal(syncHash(snapshot()),before);
  t.diagnostic(JSON.stringify({audit:'font-maintenance-native-plan',elapsedMs:Number((performance.now()-started).toFixed(2)),networkCalls,backgroundIntervals:0,jobRowsUnchanged:true,serverCreated:false}));
 }finally{runtime.close();runtime.close();}
 assert.equal(syncHash(snapshot()),before);db.close();assert.equal(process.getActiveResourcesInfo().filter(x=>x==='Timeout').length,timersBefore);
 assert.throws(()=>mount.operator(),{code:'font_connection_host_closed'});
});

test('failed private mount closes native stores; normal runtime remains the default',async t=>{
 const f=await setup(t);
 assert.throws(()=>createShopifyTestRuntime(f.env,{maintenanceOnly:true,katalogRoot:f.katalogRoot,fontConnection:{connect(){throw Object.assign(Error('synthetic'),{code:'synthetic_mount_failure'});}}}),{code:'synthetic_mount_failure'});
 // Reopening and closing through the original factory also proves its normal API remains available.
 const runtime=createShopifyTestRuntime({...f.env,GRAVURU_FONT_MAINTENANCE:'enabled'});
 assert.ok(runtime.server);assert.ok(runtime.workshop.handle);assert.ok(runtime.workshop.exportWorker);
 await new Promise(resolve=>{runtime.server.once('close',resolve);runtime.server.close();});
 const moved=f.filename+'.closed';fs.renameSync(f.filename,moved);fs.renameSync(moved,f.filename);
});
