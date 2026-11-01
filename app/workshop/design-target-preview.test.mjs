import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {fileURLToPath} from 'node:url';
import {targetDesignPreview,patchDesignWithTargetReview} from './design-target-preview.mjs';
import {designDashboard,patchDesign,forgetKatalog} from './design-dashboard.mjs';
const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const FONT={regular:{units:1000,glyphs:Object.fromEntries([...new Set('Test ')].map(c=>[c,{a:400,d:'M0 0 L300 0 L300 600 L0 600 Z'}]))}},options={available:{Michroma:FONT}};
const write=(root,rel,value)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n');};
const read=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-target-preview-'));t.after(()=>{forgetKatalog();fs.rmSync(root,{recursive:true,force:true});});
 for(const part of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,part),path.join(root,part),{recursive:true});
 const first=read(root,'familien/edelstahl/test-schilder.json');first.sizes=first.sizes.filter(s=>s.groupKey==='RE');first.sizes.forEach(s=>{s.mounting=['KGL'];s.baseCents=null;});write(root,'familien/edelstahl/test-schilder.json',first);
 const families=[first];for(const [id,kind,process]of [['slate-test','slate','slate-engraving'],['print-test','steel','color-print'],['acrylic-test','acrylic','acrylic-engraving']]){const family=structuredClone(first);family.id=id;family.name=id;family.material.kind=kind;family.material.processingProfileId=process;family.material.label=id;family.sizes.forEach(s=>s.key=id+'-'+s.key);write(root,'familien/test/'+id+'.json',family);families.push(family);}
 for(const family of families)write(root,'linien/'+family.id+'.json',{schema:'gravuru-line/v2',id:family.id,name:family.name,families:[family.id],subcategories:[{id:'names',name:'Names',themeId:'namensschilder'}]});
 const base='designs/test/T-D1/',source={id:'T-D1',name:'Target test',material:'Edelstahl',process:'Gravur',form:'Rechteck',plateMm:[90,60],sizes:first.sizes.map(s=>s.key),themes:['namensschilder'],fonts:['Michroma'],texts:[{text:'Test',font:'Michroma',sizePt:14,color:'#000000'}],motifs:[],photos:[],ziele:[{familie:first.id,freigabe:null}]};
 write(root,base+'design.json',source);write(root,base+'design.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><text id="text-1" x="45" y="30" font-family="Michroma" font-size="5" text-anchor="middle"><tspan x="45" dy="0">Test</tspan></text></svg>\n');
 return {root,base,families,read:()=>read(root,base+'design.json'),preview:family=>targetDesignPreview(root,{reihe:'test',id:'T-D1',familie:family},options),approve:family=>patchDesignWithTargetReview(root,{reihe:'test',designId:'T-D1',familie:family,freigegeben:true},{...options,actor:'merchant:test',now:new Date('2026-10-24T12:00:00Z')})};
}
test('confirmed targets control line visibility; theme suggestions add real families without granting any release',async t=>{
 const f=fixture(t);assert.equal(designDashboard(f.root,{linie:'slate-test'}).rows.length,0);
 const row=designDashboard(f.root,{linie:'test-schilder'}).rows[0];assert.ok(row.zielVorschlaege.some(s=>s.familie==='slate-test'));assert.ok(row.zielVorschlaege.some(s=>s.missing&&s.familie===null));
 const added=patchDesign(f.root,{reihe:'test',designId:'T-D1',zieleHinzufuegen:['slate-test','print-test']},{actor:'merchant:test'});assert.equal(added.changed,true);assert.ok(f.read().ziele.every(t=>t.freigabe===null));assert.equal(f.read().freigabe,undefined);
 assert.equal(designDashboard(f.root,{linie:'slate-test'}).rows.length,1);assert.throws(()=>patchDesign(f.root,{reihe:'test',designId:'T-D1',zieleHinzufuegen:['invented']}),e=>e.status===422);
 assert.throws(()=>patchDesign(f.root,{reihe:'test',designId:'T-D1',zieleHinzufuegen:['acrylic-test'],freigegeben:true}),e=>e.status===422);
});
test('material target previews use native surfaces and glyph paths without changing files or neutral private prices',async t=>{
 const f=fixture(t);patchDesign(f.root,{reihe:'test',designId:'T-D1',zieleHinzufuegen:f.families.map(f=>f.id)});const before=fs.readFileSync(path.join(f.root,f.base+'design.json'),'utf8'),previews=[];
 for(const family of f.families){const result=await f.preview(family.id);assert.match(result.svg,/<path/);assert.doesNotMatch(result.svg,/<text|data-m-keepout|#d0453a/);assert.equal(result.reviewFit.sizes.length,3);assert.notEqual(result.reviewFit.status,'passt nicht');previews.push(result.svg);}
 assert.notEqual(previews[0],previews[1]);assert.notEqual(previews[0],previews[2]);assert.notEqual(previews[1],previews[3]);assert.equal(fs.readFileSync(path.join(f.root,f.base+'design.json'),'utf8'),before);
 assert.ok(f.families.every(family=>family.sizes.every(s=>s.baseCents===null)));await assert.rejects(targetDesignPreview(f.root,{reihe:'test',id:'T-D1',familie:'test-schilder',size:'foreign'},options),e=>e.status===422);
});
test('approval and withdrawal only change the addressed target, keep audit actor and preserve historical global approval',async t=>{
 const f=fixture(t),source=f.read();source.freigabe={status:'freigegeben',von:'historic',am:'2025-01-01'};write(f.root,f.base+'design.json',source);
 patchDesign(f.root,{reihe:'test',designId:'T-D1',zieleHinzufuegen:['slate-test']});await f.approve('test-schilder');assert.equal(f.read().ziele[0].freigabe.von,'merchant:test');assert.equal(f.read().ziele[1].freigabe,null);assert.deepEqual(f.read().freigabe,source.freigabe);
 await assert.rejects(patchDesignWithTargetReview(f.root,{reihe:'test',designId:'T-D1',freigegeben:true},options),e=>e.status===422);await f.approve('slate-test');patchDesign(f.root,{reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:false},{actor:'merchant:withdraw'});
 assert.equal(f.read().ziele[0].freigabe.status,'offen');assert.equal(f.read().ziele[1].freigabe.status,'freigegeben');const log=fs.readFileSync(path.join(f.root,'designs/test/_aenderungen.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(log.at(-1).actor,'merchant:withdraw');assert.ok(log.at(-1).changes.ziele);
});

test('explicit mounting affects only preview and cannot bypass the all-options review',async t=>{
 const f=fixture(t),file='familien/edelstahl/test-schilder.json',family=read(f.root,file);
 family.withoutMounting=true;const drilled=family.mountingRules.find(r=>r.id.startsWith('B'));
 assert.ok(drilled);family.sizes.forEach(s=>s.mounting.push(drilled.id));write(f.root,file,family);
 const input={reihe:'test',id:'T-D1',familie:'test-schilder'};
 const normal=await targetDesignPreview(f.root,input,options),plain=await targetDesignPreview(f.root,{...input,mounting:'K00'},options),holes=await targetDesignPreview(f.root,{...input,mounting:drilled.skuSuffix},options);
 assert.notEqual(plain.svg,holes.svg);assert.equal(normal.svg,plain.svg);
 assert.deepEqual(plain.reviewFit,holes.reviewFit);assert.equal(plain.checksum,holes.checksum);
 assert.equal(f.read().ziele[0].freigabe,null);
 await assert.rejects(targetDesignPreview(f.root,{...input,mounting:'invented'},options),e=>e.status===422);
 family.withoutMounting=false;write(f.root,file,family);
 const fallback=await targetDesignPreview(f.root,input,options),explicit=await targetDesignPreview(f.root,{...input,mounting:drilled.skuSuffix},options);
 assert.equal(fallback.svg,explicit.svg);
 await assert.rejects(targetDesignPreview(f.root,{...input,mounting:'K00'},options),e=>e.status===422);
});
test('server revalidates raw color, missing fonts and all target sizes; client fit cannot bypass approval',async t=>{
 const f=fixture(t),file=path.join(f.root,f.base+'design.svg'),original=fs.readFileSync(file,'utf8');fs.writeFileSync(file,original.replace('font-size="5"','font-size="5" fill="#ff0000"'));await assert.rejects(f.approve('test-schilder'),e=>e.status===422&&/Farbe|farbig/i.test(e.message));assert.equal(f.read().ziele[0].freigabe,null);
 fs.writeFileSync(file,original.replace('Michroma','Missing'));await assert.rejects(f.preview('test-schilder'),e=>e.status===422&&/Schrift fehlt/.test(e.message));
 fs.writeFileSync(file,original.replace('x="45"','x="89"'));await assert.rejects(f.approve('test-schilder'),e=>e.status===422);assert.equal(f.read().ziele[0].freigabe,null);
 fs.writeFileSync(file,original);assert.throws(()=>patchDesign(f.root,{reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true,fit:{status:'passt'}}),e=>e.status===422);assert.throws(()=>patchDesign(f.root,{reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true}),e=>e.status===422&&/serverseitig/.test(e.message));
});
test('changed source or family after fit rejects the atomic release with conflict',async t=>{
 const f=fixture(t),review=await f.preview('test-schilder');write(f.root,f.base+'design.svg',fs.readFileSync(path.join(f.root,f.base+'design.svg'),'utf8').replace('>Test<','>Tes<'));
 assert.throws(()=>patchDesign(f.root,{reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true},{targetReview:{familie:'test-schilder',checksum:review.checksum,fit:review.reviewFit}}),e=>e.status===409);assert.equal(f.read().ziele[0].freigabe,null);
 await assert.rejects(patchDesignWithTargetReview(f.root,{reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true,checksum:review.checksum},options),e=>e.status===409);
});

test('embedded target GET and PATCH use the real session, CSRF and tenant envelope and audit the authenticated actor',async t=>{
 const f=fixture(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-target-host-'));
 const registry=read(f.root,'schriften/schriften.json');registry.fonts.push({name:'Garamond Acryl',inPlatform:true});write(f.root,'schriften/schriften.json',registry);
 for(const filename of ['design.json','design.svg']){const file=path.join(f.root,f.base+filename);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('Michroma','Garamond Acryl'));}
 build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],config={mode:'embedded-test',origin:'https://workshop.example',shopDomain:'fixture.myshopify.com',clientId:'fixture-client'},sessions={mode:'test-only',shopDomain:config.shopDomain,clientId:config.clientId,secret:'test-only-secret'};
 const workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:f.root,shopifySessions:sessions});const server=createPreviewServer({outputDirectory:dir,workshop,embeddedApp:config});server.address=()=>({port:8765});
 t.after(()=>{workshop.close();fs.rmSync(dir,{recursive:true,force:true});});
 const request=(url,{method='GET',headers={},data}={})=>new Promise(resolve=>{const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);Object.assign(req,{url,method,headers:{host:'workshop.example',...headers}});const res=new EventEmitter();res.headersSent=false;res.headers={};res.setHeader=(k,v)=>res.headers[k.toLowerCase()]=v;res.writeHead=(status,h={})=>{res.status=status;for(const[k,v]of Object.entries(h))res.setHeader(k,v);res.headersSent=true;return res;};res.end=bytes=>{res.bytes=Buffer.from(bytes||'');resolve(res);};server.emit('request',req,res);});
 const now=Math.floor(Date.now()/1000),payload={aud:sessions.clientId,dest:'https://'+sessions.shopDomain,iss:'https://'+sessions.shopDomain+'/admin',sub:'123',iat:now,nbf:now,exp:now+60,jti:randomUUID()},unsigned=[{alg:'HS256'},payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.'),authorization='Bearer '+unsigned+'.'+createHmac('sha256',sessions.secret).update(unsigned).digest('base64url');
 const session=JSON.parse((await request('/api/workshop/session',{headers:{authorization}})).bytes),headers={authorization,origin:config.origin,'content-type':'application/json','x-gravuru-csrf':session.csrfToken,'sec-fetch-site':'same-origin'},route='/api/workshop/designs/target-preview?reihe=test&id=T-D1&familie=test-schilder';
 assert.equal((await request(route)).status,401);assert.equal((await request(route,{headers:{authorization:'Bearer invalid'}})).status,401);const opened=await request(route,{headers});assert.equal(opened.status,200,opened.bytes.toString());const review=JSON.parse(opened.bytes);assert.match(review.svg,/<path/);
 const data={reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true,checksum:review.checksum,onlyPassing:true};
 for(const patch of [{authorization:''},{'x-gravuru-csrf':'wrong'},{origin:'https://foreign.invalid'},{host:'foreign.invalid'},{'sec-fetch-site':'cross-site'}])assert.ok([401,403].includes((await request('/api/workshop/designs',{method:'PATCH',headers:{...headers,...patch},data})).status));
 const saved=await request('/api/workshop/designs',{method:'PATCH',headers,data});assert.equal(saved.status,200,saved.bytes.toString());assert.equal(f.read().ziele[0].freigabe.von,'123');assert.equal(workshop.repository.list().length,1);
 const variantInput={source:{reihe:'test',id:'T-D1'},target:{familyId:'test-schilder',sizeKey:'TS-RE-120X80',lineId:'test-schilder'}};
 for(const route of ['/api/workshop/designs/variant/prepare','/api/workshop/designs/variant'])for(const patch of [{authorization:''},{'x-gravuru-csrf':'wrong'},{origin:'https://foreign.invalid'}])assert.ok([401,403].includes((await request(route,{method:'POST',headers:{...headers,...patch},data:variantInput})).status));
 const preparedResponse=await request('/api/workshop/designs/variant/prepare',{method:'POST',headers,data:variantInput});assert.equal(preparedResponse.status,200,preparedResponse.bytes.toString());const prepared=JSON.parse(preparedResponse.bytes);assert.equal(prepared.action,'blocked');assert.equal(prepared.message,'Kennung offen – Die Quellkennung folgt keinem vorhandenen Bogenformat.');
 const denied=await request('/api/workshop/designs/variant',{method:'POST',headers,data:{...variantInput,source:{...variantInput.source,checksum:prepared.source.checksum},checksum:prepared.checksum}});assert.equal(denied.status,409);assert.equal(workshop.repository.list().length,1);

});

test('missing physical family data remains explicitly open and cannot acquire approval',async t=>{
 const f=fixture(t),file='familien/edelstahl/test-schilder.json',family=read(f.root,file);family.material.thicknessMm=null;write(f.root,file,family);
 const preview=await f.preview('test-schilder');assert.equal(preview.svg,null);assert.equal(preview.reviewFit.status,'passt nicht');assert.match(preview.reviewFit.issues.join(' '),/Vorschau offen/);assert.equal(f.read().ziele[0].freigabe,null);await assert.rejects(f.approve('test-schilder'),e=>e.status===422);
});
test('different shape remains previewable as contain but requires its own variant, while explicit sizes are binding',async t=>{
 const f=fixture(t),family=read(f.root,'familien/test/slate-test.json');family.groups.filter(g=>g.key==='RE').forEach(g=>{g.shape='ellipse';g.cornerRadiusMm=0;});write(f.root,'familien/test/slate-test.json',family);patchDesign(f.root,{reihe:'test',designId:'T-D1',zieleHinzufuegen:['slate-test']});
 const preview=await f.preview('slate-test');assert.match(preview.svg,/<svg/);assert.equal(preview.variantRequired,true);assert.equal(preview.reviewFit.status,'passt nicht');assert.match(preview.reviewFit.issues.join(' '),/Andere Form/);await assert.rejects(f.approve('slate-test'),e=>e.status===422);
 const source=f.read();source.sizes=['TS-RE-90X60'];write(f.root,f.base+'design.json',source);const own=await f.preview('test-schilder');assert.deepEqual(own.reviewFit.sizes.map(s=>s.size),['TS-RE-90X60']);
 const excluded=await targetDesignPreview(f.root,{reihe:'test',id:'T-D1',familie:'test-schilder',size:'TS-RE-120X80'},options);assert.equal(excluded.variantRequired,true);assert.equal(excluded.reviewFit.status,'passt nicht');
});


test('a changed font resource invalidates the viewed target both before review and under the write lock',async t=>{
 const f=fixture(t),old=await f.preview('test-schilder'),before=fs.readFileSync(path.join(f.root,f.base+'design.json'),'utf8');
 const changed=structuredClone(FONT);for(const glyph of Object.values(changed.regular.glyphs)){glyph.a=600;glyph.d='M0 0 L500 0 L500 600 L0 600 Z';}
 const nextOptions={available:{Michroma:changed}},next=await targetDesignPreview(f.root,{reihe:'test',id:'T-D1',familie:'test-schilder'},nextOptions);
 assert.notEqual(next.svg,old.svg);assert.notEqual(next.checksum,old.checksum);
 await assert.rejects(patchDesignWithTargetReview(f.root,{reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true,checksum:old.checksum},nextOptions),e=>e.status===409);
 assert.throws(()=>patchDesign(f.root,{reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true},{...nextOptions,targetReview:{familie:'test-schilder',checksum:old.checksum,fit:old.reviewFit}}),e=>e.status===409);
 assert.equal(fs.readFileSync(path.join(f.root,f.base+'design.json'),'utf8'),before);assert.equal(fs.existsSync(path.join(f.root,'designs/test/_aenderungen.jsonl')),false);
});

test('target size options name the actual family groups and default to the first compatible shape',async t=>{
 const f=fixture(t),file='familien/edelstahl/test-schilder.json',family=read(f.root,file);
 family.groups.push({key:'AB',name:'Abgerundete Ecken R7',shape:'rect',cornerRadiusMm:7},{key:'OV',name:'Oval aus Katalog',shape:'ellipse',cornerRadiusMm:0});
 const first=family.sizes[0],rounded={...structuredClone(first),key:'TS-AB-90X60',groupKey:'AB'},oval={...structuredClone(first),key:'TS-OV-90X60',groupKey:'OV'};
 family.sizes=[first,oval,rounded,...family.sizes.slice(1)];write(f.root,file,family);
 const source=f.read();source.form='Rechteck abgerundete Ecken';source.sizes=[first.key,rounded.key];write(f.root,f.base+'design.json',source);
 const result=await f.preview('test-schilder');
 assert.equal(result.size.key,rounded.key);assert.equal(result.size.compatible,true);assert.equal(result.variantRequired,false);
 assert.equal(result.size.groupName,'Abgerundete Ecken R7');assert.equal(result.size.label,'9 × 6 cm · Abgerundete Ecken R7');
 const sameLabels=result.sizes.filter(size=>size.sizeLabel==='9 × 6 cm');
 assert.equal(sameLabels.length,3);assert.equal(new Set(sameLabels.map(size=>size.label)).size,3);
 assert.deepEqual(sameLabels.map(size=>size.groupName),['Abgerundete Ecken R7','Rechteck','Oval aus Katalog']);
 assert.equal(result.sizes[0].key,rounded.key);assert.ok(result.sizes.slice(1).every(size=>!size.compatible));
 const wrong=await targetDesignPreview(f.root,{reihe:'test',id:'T-D1',familie:'test-schilder',size:first.key},options);
 assert.equal(wrong.size.compatible,false);assert.equal(wrong.reviewFit.status,'passt nicht');
});

test('passing-tile approval requires a checksum and rechecks the actual warning status',async t=>{
 const f=fixture(t),input={reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true,onlyPassing:true},first=await f.preview('test-schilder');
 assert.equal(first.reviewFit.status,'passt');
 await assert.rejects(patchDesignWithTargetReview(f.root,input,options),e=>e.status===422&&/Prüfsumme/.test(e.message));
 await assert.rejects(patchDesignWithTargetReview(f.root,{...input,onlyPassing:'true',checksum:first.checksum},options),e=>e.status===422);
 const file=path.join(f.root,f.base+'design.svg');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('font-size="5"','font-size="2"'));
 await assert.rejects(patchDesignWithTargetReview(f.root,{...input,checksum:first.checksum},options),e=>e.status===409);
 const warning=await f.preview('test-schilder');assert.equal(warning.reviewFit.status,'prüfen');
 await assert.rejects(patchDesignWithTargetReview(f.root,{...input,checksum:warning.checksum},options),e=>e.status===422&&/Sammelfreigabe/.test(e.message));
 assert.throws(()=>patchDesign(f.root,{...input,checksum:warning.checksum},{...options,targetReview:{familie:'test-schilder',checksum:warning.checksum,fit:warning.reviewFit}}),e=>e.status===422&&/Sammelfreigabe/.test(e.message));
 assert.equal(f.read().ziele[0].freigabe,null);assert.equal(fs.existsSync(path.join(f.root,'designs/test/_aenderungen.jsonl')),false);
 const approved=await patchDesignWithTargetReview(f.root,{...input,onlyPassing:false,checksum:warning.checksum},{...options,actor:'merchant:single-review'});
 assert.equal(approved.changed,true);assert.equal(f.read().ziele[0].freigabe.von,'merchant:single-review');
});

test('passing-tile approval preserves the individual write path and blocks missing fonts',async t=>{
 const f=fixture(t),input={reihe:'test',designId:'T-D1',familie:'test-schilder',freigegeben:true,onlyPassing:true},review=await f.preview('test-schilder');
 const result=await patchDesignWithTargetReview(f.root,{...input,checksum:review.checksum},{...options,actor:'merchant:tiles'});
 assert.equal(result.changed,true);assert.equal(f.read().ziele[0].freigabe.von,'merchant:tiles');
 const log=fs.readFileSync(path.join(f.root,'designs/test/_aenderungen.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(log.length,1);assert.equal(log[0].actor,'merchant:tiles');assert.ok(log[0].changes.ziele);
 const missing=fixture(t),file=path.join(missing.root,missing.base+'design.svg');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('Michroma','Missing'));
 await assert.rejects(patchDesignWithTargetReview(missing.root,{...input,checksum:review.checksum},options),e=>e.status===422&&/Schrift fehlt/.test(e.message));
 assert.equal(missing.read().ziele[0].freigabe,null);
});

test('dashboard target cache revisions match previews and change with design, family and font sources',async t=>{
 const f=fixture(t),current=()=>designDashboard(f.root,{linie:'test-schilder',available:options.available}).rows[0].ziele[0].sourceRevision;
 const first=current(),review=await f.preview('test-schilder');assert.match(first,/^[a-f0-9]{64}$/);assert.equal(first,review.checksum);assert.equal(current(),first);
 const source=f.read();source.name='New name';write(f.root,f.base+'design.json',source);forgetKatalog();const named=current();assert.notEqual(named,first);assert.equal(named,(await f.preview('test-schilder')).checksum);
 const family=read(f.root,'familien/edelstahl/test-schilder.json');family.name='New family';write(f.root,'familien/edelstahl/test-schilder.json',family);forgetKatalog();const familyChanged=current();assert.notEqual(familyChanged,named);assert.equal(familyChanged,(await f.preview('test-schilder')).checksum);
 const changed=structuredClone(FONT);changed.regular.glyphs.T.a+=5;
 const next=designDashboard(f.root,{linie:'test-schilder',available:{Michroma:changed}}).rows[0].ziele[0].sourceRevision;assert.notEqual(next,familyChanged);
 assert.equal(next,(await targetDesignPreview(f.root,{reihe:'test',id:'T-D1',familie:'test-schilder'},{available:{Michroma:changed}})).checksum);
});

test('dashboard exposes actual form groups including zero compatible designs, counting a master once per group',t=>{
 const f=fixture(t),file='familien/edelstahl/test-schilder.json',family=read(f.root,file),rect=family.sizes[0];
 family.groups.push({key:'RU',name:'Rund laut Familie',shape:'ellipse',cornerRadiusMm:0});
 family.sizes.push({...structuredClone(rect),key:'TS-RU-90',label:'Ø 9 cm',widthMm:90,heightMm:90,groupKey:'RU'});write(f.root,file,family);
 const groups=()=>designDashboard(f.root,{linie:'test-schilder',...options}).availableFormGroups;
 assert.deepEqual(groups().map(group=>[group.groupKey,group.groupName,group.count]),[['RE','Rechteck',1],['RU','Rund laut Familie',0]]);
 assert.ok(groups().every(group=>group.familyId==='test-schilder'&&group.familyName===family.name));
 const round={...f.read(),id:'T-D2',plateMm:[90,90],form:'Rund',sizes:['TS-RU-90'],ziele:[]};
 write(f.root,'designs/test/T-D2/design.json',round);write(f.root,'designs/test/T-D2/design.svg',fs.readFileSync(path.join(f.root,f.base+'design.svg'),'utf8'));forgetKatalog();
 assert.equal(groups().find(group=>group.groupKey==='RU').count,0,'a design without the confirmed family target does not count');
 round.ziele=[{familie:'test-schilder',freigabe:null}];write(f.root,'designs/test/T-D2/design.json',round);forgetKatalog();
 assert.equal(groups().find(group=>group.groupKey==='RU').count,1,'a confirmed compatible target counts without granting approval');
 assert.equal(read(f.root,'designs/test/T-D2/design.json').ziele[0].freigabe,null);
});
