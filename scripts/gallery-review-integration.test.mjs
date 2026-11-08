import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {galleryReviewPage} from './lib/gallery-review-pagination.mjs';
import {createGalleryReviewRegistry} from './lib/gallery-review-registry.mjs';
import {galleryAssignmentCatalogue} from './lib/gallery-assignment-catalogue.mjs';
import {slateGalleryHtml} from './lib/slate-review-gallery-page.mjs';
import {createSlateGalleryHandler} from './lib/slate-review-gallery.mjs';
import {createSlateReviewComments} from './lib/slate-review-comments.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';

const steel={key:'steel',label:'Edelstahl',kind:'steel'},acrylic={key:'acrylic-schwarz-3mm',label:'Acrylglas Schwarz · 3 mm',kind:'acrylic'};
const category={key:'family-without',label:'Familie ohne Foto',rank:1,photo:'without',topic:'family'};
const openRow=id=>({id,reviewMaterial:steel,reviewCategory:category,reviewThemes:[{key:'family',label:'Familie'}],process:'Gravur',targets:[]});
function temp(t,prefix){const root=fs.mkdtempSync(path.join(os.tmpdir(),prefix));t.after(()=>{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert(path.basename(root).startsWith(prefix));fs.rmSync(root,{recursive:true,force:true});});return root;}

test('20,000 originals paginate at 60 while facets and searches span the whole catalogue',()=>{
  const originals=Array.from({length:20000},(_,i)=>openRow('D'+String(i).padStart(5,'0')));originals[19999].process='';originals[19998].process='gravur';
  const pack={originals,blanks:[]},page=galleryReviewPage(pack,new URLSearchParams('page=2'));
  assert.equal(page.pack.originals.length,60);assert.equal(page.pack.originals[0].id,'D00060');assert.equal(page.paging.totalOriginals,20000);assert.equal(page.paging.totalMatches,20000);
  assert.equal(page.paging.facets.materials[0].originals,20000);assert.equal(galleryReviewPage(pack,new URLSearchParams('search=D19999')).pack.originals[0].id,'D19999');
  assert.equal(galleryReviewPage(pack,new URLSearchParams({process:'Verfahren offen'})).paging.totalMatches,1);assert.equal(galleryReviewPage(pack,new URLSearchParams({process:'Gravur'})).paging.totalMatches,19999);
  const html=slateGalleryHtml(page.pack,{products:[]},{paging:page.paging});assert.equal((html.match(/ data-design-card /g)||[]).length,60);assert(html.length<250000);
  for(const query of ['page=0','page=1&page=2','random=x','view=unknown'])assert.throws(()=>galleryReviewPage(pack,new URLSearchParams(query)),e=>e.status===422);
});
test('originalId return resolves the right page even when current filters exclude that exact comma/slash ID',()=>{
  const id='source/Z-42,1',pack={originals:[...Array.from({length:70},(_,i)=>openRow('D'+i)),openRow(id)],blanks:[]};
  const page=galleryReviewPage(pack,new URLSearchParams({originalId:id,search:'never-matches',page:'9'}));
  assert.equal(page.paging.filters.search,'never-matches');assert.equal(page.paging.focusOriginalId,id);assert.equal(page.pack.originals[0].id,id);assert.equal(page.paging.page,1);
  assert.throws(()=>galleryReviewPage(pack,new URLSearchParams({originalId:'not-real'})),e=>e.status===422);
});
test('atomic journal registrations augment one original, preserve warnings and cannot replace prepared targets',()=>{
  const sourceId='cfg_00000000-0000-0000-0000-000000000001',newId='cfg_00000000-0000-0000-0000-000000000002';
  const row={...openRow('D1'),targets:[{status:'prepared',sizeKey:'s',mm:[50,20],productKey:'source',nativeDesignId:'native-D1',familyId:'steel-door-signs'},
    {status:'open',sizeKey:'a',mm:[50,20],reviewMaterial:acrylic,familyId:'acryl-3mm-tuerschilder-schwarz',reason:'Frühere offene Quelle'}]};
  const products=[{key:'source',productId:sourceId,reviewOnly:true,designIds:['D1']}],pack={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,originals:[row],products};
  const imported={localOnly:true,published:false,shopifyWrites:0,products},before=JSON.stringify(pack);let items=[];
  const registry=createGalleryReviewRegistry({pack,imported,repository:{importItems:()=>items}});assert.equal(registry.read().pack,pack);
  const registration={schema:'gravuru-gallery-design-assignment/v1',originalId:'D1',nativeDesignId:'native-D1',familyId:'acryl-3mm-tuerschilder-schwarz',sizeKey:'a',mm:[50,20],reviewMaterial:acrylic,visualReviewIssues:[{message:'Proportional eingepasst – prüfen'}]};
  items=[{key:'gallery-assignment:'+'a'.repeat(64),id:newId,fingerprint:'b'.repeat(64),registrations:[registration]}];
  const result=registry.read();assert.equal(result.pack.originals.length,1);assert.equal(result.pack.originals[0].targets.length,2);assert.equal(result.imported.products.length,2);
  const added=result.pack.originals[0].targets[1];assert.equal(added.sourceOpenReason,'Frühere offene Quelle');assert.deepEqual(added.visualReviewIssues,registration.visualReviewIssues);assert.equal(added.status,'prepared');assert.equal(JSON.stringify(pack),before);assert.equal(registry.read(),result);
  items.push({...items[0],key:'gallery-assignment:'+'c'.repeat(64),id:'cfg_00000000-0000-0000-0000-000000000003'});assert.throws(()=>registry.read(),e=>e.status===409);assert.equal(JSON.stringify(pack),before);
});
test('family catalogue is a pinned, detached read-only snapshot with an explicit absent-source state',t=>{
  const root=temp(t,'gallery-catalogue-');assert.deepEqual(galleryAssignmentCatalogue(root)().families,[]);
  const file=path.join(root,'assignment-catalogue.json'),source={schema:'gravuru-gallery-assignment-catalogue/v1',sourceCommit:'a'.repeat(40),families:[{id:'f'}],lines:[]};fs.writeFileSync(file,JSON.stringify(source));
  const read=galleryAssignmentCatalogue(root),a=read();assert.match(a.sourceSha256,/^[a-f0-9]{64}$/);a.families[0].id='changed';assert.equal(read().families[0].id,'f');
  fs.writeFileSync(file,JSON.stringify({...source,sourceCommit:'wrong'}));assert.throws(()=>galleryAssignmentCatalogue(root));assert.equal(read().families[0].id,'f','already pinned source is not silently replaced');
});

test('real local HTTP keeps page/comment/approval scope and exposes committed assignments to the editor immediately',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-paged-http-')),galleryRoot=path.join(root,'gallery'),data=path.join(root,'data');fs.mkdirSync(galleryRoot);fs.mkdirSync(data);
  const family=JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json',import.meta.url),'utf8'));family.groups=family.groups.filter(g=>g.key==='RE');family.sizes=[structuredClone(family.sizes.find(s=>s.key==='GR-ES-RE-50X20-T15'))];family.mountingRules=family.mountingRules.filter(r=>family.sizes[0].mounting.includes(r.id));
  const target=structuredClone(family);target.id='acryl-3mm-tuerschilder-schwarz';target.name='Acrylglas Schwarz 3 mm';target.material={kind:'acrylic',variant:'schwarz',label:'Acrylglas Schwarz',thicknessMm:3,processingProfileId:'acrylic-engraving'};target.sizes[0].key='ACRYLIC-50X20';
  const config=familyProductConfig(family,family.sizes[0],1),seed=structuredClone(config.profile.designs[0]);
  config.profile.designs=['A','B'].map(id=>({...structuredClone(seed),id:'native-'+id,name:id,katalog:{originalId:id,designId:id,target:{familyId:family.id,released:false}}}));config.profile.defaultDesignId='native-A';
  const workshop=createWorkshop({filename:path.join(data,'workshop.sqlite'),seedConfig:config,legacy:{}}),record=workshop.repository.create(makeProductDocument(config));
  const products=[{key:'source',productId:record.id,revision:1,reviewOnly:true,designIds:['A','B']}];
  const originals=['A','B',...Array.from({length:59},(_,i)=>'O'+String(i).padStart(3,'0')),'Z-ED-42,1'].map(id=>({...openRow(id),targets:['A','B'].includes(id)?[{status:'prepared',productKey:'source',nativeDesignId:'native-'+id,familyId:family.id,sizeKey:family.sizes[0].key,mm:[50,20]}]:[]}));
  const pack={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,products,originals};fs.writeFileSync(path.join(galleryRoot,'manifest.json'),JSON.stringify(pack));
  const mapping=path.join(data,'local-review-import.json');fs.writeFileSync(mapping,JSON.stringify({localOnly:true,published:false,shopifyWrites:0,products}));
  const comments=createSlateReviewComments(path.join(data,'review-comments.sqlite'),originals.map(r=>r.id));comments.save('A','First-page-comment',0);comments.save('Z-ED-42,1','Second-page-comment',0);comments.close();
  const token='fixture-private-csrf',catalogue=()=>({families:[family,target],lines:[{schema:'gravuru-line/v2',id:'door',name:'Türschilder',families:[family.id,target.id],subcategories:[{id:'memory',name:'Andenken',themeId:null}]}]});
  const handler=createSlateGalleryHandler(galleryRoot,mapping,{workshop,csrfToken:token,management:{assignmentCatalogue:catalogue}}),server=http.createServer((req,res)=>{if(!handler(req,res))res.writeHead(404).end();});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));handler.close();workshop.close();assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert(path.basename(root).startsWith('gallery-paged-http-'));fs.rmSync(root,{recursive:true,force:true});});
  const origin='http://127.0.0.1:'+server.address().port;
  const request=async(route,{method='GET',body,headers={}}={})=>{const response=await fetch(origin+route,{method,headers:{origin,'content-type':'application/json','X-Slate-Review-CSRF':token,...headers},...(body?{body:JSON.stringify(body)}:{})});const text=await response.text();return {status:response.status,text,data:response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):null};};
  const scoped=ids=>'/originale/approvals?'+new URLSearchParams({originalIds:JSON.stringify(ids)});
  const first=await request('/originale/?page=1');assert.equal(first.status,200,first.text);assert.equal((first.text.match(/ data-design-card /g)||[]).length,60);assert.match(first.text,/First-page-comment/);assert.doesNotMatch(first.text,/Second-page-comment/);
  const second=await request('/originale/?page=2');assert.equal((second.text.match(/ data-design-card /g)||[]).length,2);assert.match(second.text,/Second-page-comment/);assert.doesNotMatch(second.text,/First-page-comment/);
  const returned=await request('/originale/?'+new URLSearchParams({originalId:'Z-ED-42,1',search:'not-a-match'}));assert.equal(returned.status,200);assert.match(returned.text,/id="design-Z-ED-42,1"/);assert.match(returned.text,/"search":"not-a-match"/);
  assert.equal((await request('/originale/assignments.js')).status,200);
  const states=(await request(scoped(['A']))).data.approvals;assert.equal(Object.keys(states).length,1);const a=Object.values(states)[0];assert.equal(a.metadata.id,'A');
  assert.equal((await request(scoped([]))).status,200);assert.equal((await request(scoped(originals.slice(0,61).map(r=>r.id)))).status,422);assert.equal((await request(scoped(['unknown']))).status,422);
  const body={key:a.key,approved:true,expectedRevision:a.revision,expectedFingerprint:a.fingerprint};
  assert.equal((await request(scoped(['A']),{method:'POST',body,headers:{'X-Slate-Review-CSRF':''}})).status,403);
  assert.equal((await request(scoped(['A']),{method:'POST',body,headers:{origin:'https://foreign.invalid'}})).status,403);
  assert.equal((await request(scoped(['B']),{method:'POST',body})).status,422,'cannot write a target outside the explicit loaded page scope');
  assert.equal((await request(scoped(['A']),{method:'POST',body})).status,200);
  const context=await request('/originale/assignments?'+new URLSearchParams({action:'context',sourceKeys:JSON.stringify([a.key])}));assert.equal(context.status,200,context.text);assert.equal(context.data.sources[0].revision,1);
  const input={sources:[{key:a.key,expectedRevision:1}],targets:[{lineId:'door',subcategoryId:'memory',familyId:target.id,sizeKey:target.sizes[0].key}]};
  assert.equal((await request('/originale/assignments?action=plan',{method:'POST',body:input,headers:{'X-Slate-Review-CSRF':''}})).status,403);
  const planned=await request('/originale/assignments?action=plan',{method:'POST',body:input});assert.equal(planned.status,200,planned.text);assert.equal(planned.data.valid,true,JSON.stringify(planned.data.entries));
  const apply={planId:planned.data.id,planHash:planned.data.planHash},saved=await request('/originale/assignments?action=execute',{method:'POST',body:apply});assert.equal(saved.status,200,saved.text);assert.equal(saved.data.createdTargets,1);
  const after=Object.values((await request(scoped(['A']))).data.approvals);assert.equal(after.length,2);assert.equal(after.find(s=>s.key===a.key).status,'approved');assert.equal(after.find(s=>s.key!==a.key).status,'unreviewed');
  const registration=saved.data.targets[0],opened=await request('/originale/design?'+new URLSearchParams({productId:registration.productId,designId:registration.nativeDesignId}));assert.equal(opened.status,200,opened.text);assert.equal(opened.data.revision,1);assert.match(opened.data.svg,/<svg/);
  const replay=await request('/originale/assignments?action=execute',{method:'POST',body:apply});assert.equal(replay.status,200,replay.text);assert.equal(replay.data.created,0);assert.equal(workshop.repository.get(record.id).revision,1);
});
