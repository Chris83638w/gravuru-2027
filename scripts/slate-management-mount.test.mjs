import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {loadSlateManagementConfig} from './lib/slate-management-config.mjs';
import {createGalleryManagementFixture} from './fixtures/gallery-management.mjs';
import {createProductGroupTemplates} from '../app/workshop/product-group-templates.mjs';
import {createGalleryManagementHandler} from './lib/gallery-management-http.mjs';
import {createGallerySyncTestFixture} from '../app/workshop/gallery-shop-sync-test-fixture.mjs';
import {createGalleryShopSync} from '../app/workshop/gallery-shop-sync.mjs';

function temporary(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-gallery-mount-'));
 t.after(()=>{assert.ok(directory.startsWith(path.join(os.tmpdir(),'gravuru-gallery-mount-')));fs.rmSync(directory,{recursive:true,force:true});});
 return directory;
}

test('management configuration is an explicit local server factory; absence preserves default',async t=>{
 const directory=temporary(t),file=path.join(directory,'host.mjs');
 assert.deepEqual(await loadSlateManagementConfig(undefined,{}),{});
 for(const name of ['host.mjs','https://example.test/host.mjs',path.join(directory,'host.json')])await assert.rejects(loadSlateManagementConfig(name,{}),/absolute local/);
 fs.writeFileSync(file,'export function configureGalleryManagement(context){ if(!Object.isFrozen(context)||context.marker!=="server")throw Error("context");return {connect:()=>({handle(){return false},close(){}})}; }');
 const configured=await loadSlateManagementConfig(file,{marker:'server'});
 assert.equal(typeof configured.connect,'function');
 for(const [name,body,message] of [
  ['missing.mjs','export default {};','must export'],
  ['unknown.mjs','export const configureGalleryManagement=()=>({requestBody:{},connect(){}});','Invalid server'],
  ['ambiguous.mjs','export const configureGalleryManagement=()=>({connect(){},synchronizer(){}});','exactly one'],
  ['empty.mjs','export const configureGalleryManagement=()=>({});','exactly one']
 ]){const filename=path.join(directory,name);fs.writeFileSync(filename,body);await assert.rejects(loadSlateManagementConfig(filename,{}),new RegExp(message));}
});

test('PR194 real gallery mounts one supplied management service with current source registry and unchanged guards',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-gallery-mount-')),shop=await createGallerySyncTestFixture({directory:path.join(directory,'target')});
 let captured,created=0,closed=0,connection;
 const fixture=await createGalleryManagementFixture(path.join(directory,'gallery'),{
  extraDocument:shop.source.document,
  managementFactory:({workshop,extraSource})=>({connect:context=>{
   created++;captured=context;assert.equal(context.sourceWorkshop,workshop);
   const templates=createProductGroupTemplates({filename:context.filename,repository:workshop.repository,tenantId:workshop.tenantId,targets:context.sourceRegistry.targets,offeringFor:context.sourceRegistry.offeringFor});
   connection=createGalleryShopSync({...shop.args,sourceWorkshop:workshop,targets:[{...shop.mapping,source:{...shop.mapping.source,productId:extraSource.id}}],sourceApproval:context.sourceApproval});
   const handle=createGalleryManagementHandler({workshop,templates,synchronizer:connection,csrfToken:context.csrfToken});
   return {handle,close(){closed++;templates.close();}};
  }})
 }),base=await fixture.listen();
 t.after(async()=>{await fixture.close();shop.close();assert.equal(closed,1);assert.ok(directory.startsWith(path.join(os.tmpdir(),'gravuru-gallery-mount-')));fs.rmSync(directory,{recursive:true,force:true});});
 assert.equal(created,1);
 const response=await fetch(base+'/originale/verwaltung/api/context'),context=await response.json();
 assert.equal(response.status,200);assert.equal(context.sources.length,3);assert.equal(context.targets.targets.length,1);
 assert.deepEqual(captured.sourceRegistry.targets().map(x=>x.key),context.sources.map(x=>x.key));
 const scopes=captured.sourceRegistry.scopes(),scope=scopes.find(x=>x.lineId==='test-linie'&&x.subcategoryId==='namensschilder');
 assert.ok(scope);assert.equal(scope.sourceKeys.length,2);
 const post=async(action,input,headers={},prefix='/originale/verwaltung/api/')=>{
  const r=await fetch(base+prefix+action,{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Slate-Review-CSRF':context.csrfToken,...headers},body:JSON.stringify(input)});
  return {status:r.status,body:await r.json()};
 };
 assert.equal((await post('sync-plan',{targetIds:[shop.mapping.id]},{'X-Slate-Review-CSRF':'wrong'})).status,403);
 assert.equal((await post('sync-plan',{targetIds:[shop.mapping.id]},{Origin:'https://foreign.example'})).status,403);
 assert.equal((await fetch(base+'/originale/verwaltung/api/context',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 const badHost=await new Promise((resolve,reject)=>http.get(base+'/originale/verwaltung/api/context',{headers:{Host:'foreign.example'}},r=>{r.resume();r.on('end',()=>resolve(r.statusCode));}).on('error',reject));
 assert.equal(badHost,403);
 assert.equal((await fetch(base+'/api/workshop/products',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'})).status,428,'original product-creation gate remains before the workshop routes');
 assert.equal((await fetch(base+'/originale/')).status,200,'gallery route retains its existing handler');
 const unapproved=await post('sync-plan',{targetIds:[shop.mapping.id]});assert.equal(unapproved.status,200);assert.equal(unapproved.body.ready,false);
 const states=await(await fetch(base+'/originale/approvals')).json(),summary=Object.values(states.approvals).find(a=>a.metadata.id===shop.mapping.source.originalId);
 const read=await post('approvals?action=read',{originalIds:[summary.metadata.id],targetKeys:[summary.key]},{},'/originale/'),state=read.body.approvals[summary.key];
 assert.equal((await post('approvals',{key:state.key,approved:true,expectedRevision:state.revision,expectedFingerprint:state.fingerprint},{},'/originale/')).status,200);
 const approved=await post('sync-plan',{targetIds:[shop.mapping.id]});assert.equal(approved.status,200);assert.equal(approved.body.ready,true,JSON.stringify(approved.body));
 assert.match(approved.body.entries[0].beforeSvg,/<svg/);assert.match(approved.body.entries[0].afterSvg,/<svg/);
 assert.equal(shop.transport.writes.length,0,'mount and preview never activate the live shop');
 const before=captured.sourceRegistry.offeringFor(scope),catalogue=fixture.workshop.catalogStructure.read();
 fixture.workshop.catalogStructure.save({action:'materials',lineId:scope.lineId,subcategoryId:scope.subcategoryId,familyIdsOffered:[],sourceSha256:catalogue.sourceSha256});
 const after=captured.sourceRegistry.offeringFor(scope);
 assert.notEqual(after.fingerprint,before.fingerprint);assert.deepEqual(after.familyIds,[]);assert.deepEqual(captured.sourceRegistry.scopes().find(s=>s.lineId===scope.lineId&&s.subcategoryId===scope.subcategoryId).sourceKeys,[]);
});
