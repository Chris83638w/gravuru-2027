import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,get} from 'node:http';
import {once} from 'node:events';
import {createGalleryModuleManagementDemo,createGalleryModuleManagementDemoServer} from '../fixtures/gallery-module-management.mjs';
import {vectorLogoAllowed} from '../../app/configurator/variant-m/contract.mjs';
import {createGalleryModuleManagementHost} from './gallery-module-management-host.mjs';

test('existing private management mounts module review → exact confirmation → same Shopify IDs, with no network',async t=>{
 const demo=await createGalleryModuleManagementDemo(),{host,fixture:f}=demo;
 const server=createServer((req,res)=>{if(!demo.handle(req,res))res.writeHead(404).end();});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));demo.close();});
 const base='http://127.0.0.1:'+server.address().port,api='/originale/verwaltung/api/';
 const send=async(action,input,{origin=base,token=demo.csrfToken,...headers}={})=>{
  const r=await fetch(api.startsWith('http')?api+action:base+api+action,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Slate-Review-CSRF':token,...headers},body:JSON.stringify(input)});
  return {status:r.status,value:await r.json()};
 };
 const ok=async(action,input)=>{const r=await send(action,input);assert.equal(r.status,200,JSON.stringify(r.value));return r.value;};
 const html=await(await fetch(base+'/originale/verwaltung')).text();assert.match(html,/accept-sync/);assert.match(html,/genau die angezeigten Änderungen/);
 const js=await(await fetch(base+'/originale/verwaltung.js')).text();assert.match(js,/sync-confirm/);assert.match(js,/designPreviews/);assert.match(js,/c.before\?'an':'aus'/);
 assert.equal((await fetch(base+'/originale/verwaltung.css')).status,200);
 const context=await(await fetch(base+api+'context')).json();assert.equal(context.sync.mode,'test');assert.equal(context.targets.targets.length,1);assert.equal(demo.counts().reads,0);
 assert.equal((await send('sync-plan',{targetIds:[f.mapping.id]},{token:'wrong'})).status,403);
 assert.equal((await send('sync-plan',{targetIds:[f.mapping.id]},{origin:'https://other.invalid'})).status,403);
 assert.equal((await send('sync-plan',{targetIds:[f.mapping.id]},{'Sec-Fetch-Site':'cross-site'})).status,403);
 const foreignHostStatus=await new Promise((resolve,reject)=>get(base+api+'context',{headers:{Host:'not-loopback.invalid'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));
 assert.equal(foreignHostStatus,403);
 const before=structuredClone(f.target),plan=await ok('sync-plan',{targetIds:[f.mapping.id]});assert.equal(plan.ready,true,JSON.stringify(plan.entries[0].issues));
 assert.ok(plan.entries[0].changes.some(c=>c.kind==='module'&&c.key==='logo'&&c.before===true&&c.after===false));
 assert.equal(f.targetWorkshop.repository.get(before.id).revision,1);assert.equal(demo.counts().writes,0);
 const exact={planId:plan.planId,planSha256:plan.planSha256};
 assert.equal((await send('sync-execute',exact)).status,409);
 assert.equal((await send('sync-confirm',{...exact,accepted:false})).status,422);
 const confirmed=await ok('sync-confirm',{...exact,accepted:true});
 assert.equal((await send('sync-execute',{...exact,confirmationId:'foreign-confirmation'})).status,409);
 assert.equal((await ok('sync-execute',{...exact,...confirmed})).operations[0].state,'completed');
 assert.equal(demo.counts().writes,1);assert.equal(f.targetWorkshop.repository.get(before.id).revision,2);
 assert.equal(vectorLogoAllowed(f.targetWorkshop.repository.get(before.id).document.config),false);
 assert.deepEqual(f.targetWorkshop.repository.get(before.id,{revision:1}),before);
 assert.deepEqual(f.activation.capture(f.mapping).heads.map(h=>h.shopifyVariantId),f.variants.map(v=>v.id));
 assert.equal((await ok('sync-execute',{...exact,...confirmed})).operations[0].state,'completed');assert.equal(demo.counts().writes,1);
 assert.throws(()=>createGalleryModuleManagementHost({sourceWorkshop:f.sourceWorkshop,targetWorkshop:f.targetWorkshop}),{code:'gallery_module_host_registry'});
 assert.equal((await fetch(base+'/not-management')).status,404);
});

test('mounted management rejects changed module revision after confirmation without touching the product',async t=>{
 const demo=await createGalleryModuleManagementDemo(),{host,fixture:f}=demo;
 t.after(()=>demo.close());
 const plan=await host.synchronizer.plan({targetIds:[f.mapping.id]}),confirmed=host.synchronizer.confirm({...plan,accepted:true});
 host.management.profiles.save(demo.profile.id,{name:'Neu geprüft',modules:{...demo.profile.profile.modules,logo:true}},1);
 const result=await host.synchronizer.execute({...plan,...confirmed});assert.equal(result.operations[0].state,'conflict');
 assert.equal(demo.counts().writes,0);assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);
});

test('same demo mounts the existing module editor and guarded API; saved profile becomes a new explicit sync review',async t=>{
 const demo=await createGalleryModuleManagementDemo(),server=createGalleryModuleManagementDemoServer(demo);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));demo.close();});
 const base='http://127.0.0.1:'+server.address().port;
 for(const route of ['/werkstatt/module/','/workshop-ui/module-profiles.mjs','/workshop-ui/module-profiles.css','/workshop-ui/merchant-request.mjs'])assert.equal((await fetch(base+route)).status,200,route);
 const api='/api/workshop/configurator-modules',initial=await(await fetch(base+api)).json();assert.ok(initial.profiles.some(p=>p.id===demo.profile.id));
 assert.deepEqual(initial.sources.map(s=>s.key),demo.host.management.groups.sources().map(s=>s.key));
 assert.equal(initial.scopes[0].lineId,'demo');
 assert.equal(initial.scopes[0].subcategoryId,'steel');
 const {csrfToken}=await(await fetch(base+'/api/workshop/session')).json();
 const input={action:'profile-save',id:demo.profile.id,expectedRevision:1,document:{name:'Demo mit Logo',modules:{...demo.profile.profile.modules,logo:true}}};
 const post=token=>fetch(base+api,{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(input)});
 assert.equal((await post('wrong')).status,403);const savedResponse=await post(csrfToken);assert.equal(savedResponse.status,200);
 const saved=await savedResponse.json();assert.equal(saved.revision,2);assert.equal(demo.counts().writes,0);
 const sync=demo.host.synchronizer,plan=await sync.plan({targetIds:[demo.fixture.mapping.id]});assert.equal(plan.ready,true,JSON.stringify(plan.entries[0].issues));
 assert.equal(plan.entries[0].source.module.revision,2);assert.equal(demo.fixture.targetWorkshop.repository.get(demo.fixture.target.id).revision,1);
 assert.throws(()=>sync.execute(plan),{code:'gallery_sync_confirmation'});
 const confirmation=sync.confirm({...plan,accepted:true});assert.equal((await sync.execute({...plan,...confirmation})).operations[0].state,'completed');
 assert.equal(demo.fixture.targetWorkshop.repository.get(demo.fixture.target.id).document.config.moduleProfile.modules.logo,true);
 assert.equal(demo.counts().writes,1);
});
