import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHmac,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createDesignEditor} from './design-editor.mjs';
import {forgetKatalog} from './design-dashboard.mjs';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const FONT={regular:{units:1000,glyphs:Object.fromEntries([...new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 0123456789äöüßÄÖÜ.,-')].map(c=>[c,{a:400,d:'M0 0 L300 0 L300 600 L0 600 Z'}]))}};
const write=(root,rel,value)=>{const f=path.join(root,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n');};
const json=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
function fixture(t,{shape='rect',master=[90,60],price=null}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-design-editor-'));
 t.after(()=>{forgetKatalog();fs.rmSync(root,{recursive:true,force:true});});
 for(const rel of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,rel),path.join(root,rel),{recursive:true});
 const family=json(root,'familien/edelstahl/test-schilder.json');family.groups=[{key:'RE',name:'Testform',shape,cornerRadiusMm:shape==='rect'?3:0}];family.sizes=family.sizes.filter(s=>s.groupKey==='RE');
 for(const size of family.sizes){size.baseCents=price;size.mounting=['B02-E6-D4'];if(shape==='contour'){size.outlinePath=`M0 10 L10 0 L${size.widthMm-10} 0 L${size.widthMm} 10 L${size.widthMm} ${size.heightMm-10} L${size.widthMm-10} ${size.heightMm} L10 ${size.heightMm} L0 ${size.heightMm-10} Z`;size.holesMm=[{x:6,y:size.heightMm/2,diameterMm:4},{x:size.widthMm-6,y:size.heightMm/2,diameterMm:4}];}}
 write(root,'familien/edelstahl/test-schilder.json',family);
 const [w,h]=master,reihe='test-editor',id='T-D1',base=`designs/${reihe}/${id}/`;
 const texts=[{text:'Test',font:'Michroma',sizePt:5/(25.4/72),align:'center',anchorMm:[w/2,h/2],lineHeightMm:6,letterSpacingMm:0}];
 const source={id,name:'Editorprobe',material:'Edelstahl',process:'Gravur',plateMm:master,plate:{widthMm:w,heightMm:h},themes:['namensschilder'],fonts:['Michroma'],texts,motifs:[{box:[20,10,10,5],paths:['M20 10 H30 V15 H20 Z']}],sizes:family.sizes.map(s=>s.key),masterSheet:{familySize:family.sizes[0].key},freigabe:{status:'freigegeben',von:'fixture',am:'2026-10-24T00:00:00Z'}};
 write(root,base+'design.json',source);write(root,base+'design.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><g id="motiv-1"><path d="M20 10 H30 V15 H20 Z"/></g><text id="text-1" x="${w/2}" y="${h/2}" font-family="Michroma" font-size="5" text-anchor="middle"><tspan x="${w/2}" dy="0">Test</tspan></text></svg>\n`);
 return {root,reihe,id,base,family,read:()=>json(root,base+'design.json'),bytes:()=>[fs.readFileSync(path.join(root,base+'design.json')),fs.readFileSync(path.join(root,base+'design.svg'))]};
}
const service=()=>createDesignEditor({available:{Michroma:FONT,Lato:FONT}});
const input=(f,opened)=>({reihe:f.reihe,id:f.id,checksum:opened.checksum,document:structuredClone(opened.document)});
const objects=d=>d.document.config.profile.designs[0].objects;
const text=d=>objects(d).find(o=>o.type==='text');
const motif=d=>objects(d).find(o=>o.type==='motif');

test('opens catalogue master without product import, all catalogue fonts, real material and neutral private pricing',async t=>{
 const f=fixture(t),s=service(),before=f.bytes(),opened=await s.open(f.root,f);
 assert.deepEqual(opened.source.plateMm,[90,60]);assert.equal(opened.source.shape,'rect');assert.equal(opened.source.priceOpen,true);
 assert.match(opened.document.config.materialSurface,/^data:image\/png;base64,/);assert.equal(opened.document.config.profile.material.kind,'steel');assert.equal(opened.document.config.profile.geometry.cornerRadiusMm,3);
 assert.ok(opened.fonts.some(font=>font.id==='Lato'));assert.equal(opened.fonts.find(font=>font.id==='Michroma').available,true);assert.deepEqual(f.bytes(),before);
 assert.equal(opened.fit.sizes.length,3);assert.deepEqual(opened.document.config.profile.designs[0].katalog.targetMm,[90,60]);
});
for(const shape of ['rect','ellipse','contour'])test(`${shape}: no-op leaves exact JSON/SVG and approval untouched, including proportional-contain rounding`,async t=>{
 const f=fixture(t,{shape,master:shape==='contour'?[90.6,61.3]:[90,60]}),s=service(),opened=await s.open(f.root,f),before=f.bytes();
 const saved=await s.save(f.root,input(f,opened),{actor:'123'});
 assert.equal(saved.changed,false);assert.equal(saved.freigabeReset,false);assert.equal(saved.checksum,opened.checksum);assert.deepEqual(f.bytes(),before);assert.equal(f.read().freigabe.status,'freigegeben');
 assert.equal(fs.existsSync(path.join(f.root,'designs',f.reihe,'_aenderungen.jsonl')),false);
 if(shape==='contour'){assert.deepEqual(opened.source.editorMm,[90,60]);assert.match(opened.source.note,/90.6 × 61.3/);assert.equal(opened.document.config.profile.geometry.outlinePath,f.family.sizes[0].outlinePath);assert.equal(opened.document.config.profile.optionGroups[0].values.find(v=>v.id==='B02').holes.length,2);}
});
test('content, catalogue font, spacing, alignment, addition/removal persist and reset approval with session audit',async t=>{
 const f=fixture(t),s=service(),opened=await s.open(f.root,f),data=input(f,opened),o=text(data);
 Object.assign(o,{text:'Neu',font:'Lato',size:6,letterSpacing:.2,textAnchor:'end',x:o.x+2});
 objects(data).push({...structuredClone(o),id:'text-added',fieldKey:'text-added',text:'Zusatz',y:40});
 const saved=await s.save(f.root,data,{actor:'123'});assert.equal(saved.changed,true);assert.equal(saved.freigabeReset,true);assert.equal(f.read().freigabe.status,'offen');assert.equal(f.read().freigabe.von,'123');
 assert.ok(f.read().texts.some(t=>t.text==='Neu'&&t.font==='Lato'));assert.ok(f.read().texts.some(t=>t.text==='Zusatz'));assert.match(fs.readFileSync(path.join(f.root,f.base+'design.svg'),'utf8'),/text-anchor="end"/);
 const log=fs.readFileSync(path.join(f.root,'designs',f.reihe,'_aenderungen.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(log.length,1);assert.equal(log[0].actor,'123');assert.ok(log[0].changes.length>=2);
 const next=input(f,saved);next.document.config.profile.designs[0].objects=objects(next).filter(o=>o.id!=='text-added');await s.save(f.root,next,{actor:'123'});assert.equal(f.read().texts.length,1);
});
for(const shape of ['rect','ellipse','contour'])test(`${shape}: motif move/scale and overflowing fit are previewable and explicitly savable`,async t=>{
 const f=fixture(t,{shape}),s=service(),opened=await s.open(f.root,f),data=input(f,opened),o=motif(data);Object.assign(o,{x:95,y:30,w:o.w*1.5,h:o.h*1.5});
 const fit=await s.fit(f.root,data);assert.ok(fit.sizes.every(size=>size.status==='passt nicht'));
 const preview=await s.preview(f.root,data);assert.match(preview.svg,/data-object="motiv-1"/);assert.match(preview.svg,/data:image\/png;base64,/);
 const saved=await s.save(f.root,data,{actor:'123'});assert.equal(saved.changed,true);assert.equal(saved.fit.sizes[0].status,'passt nicht');assert.match(fs.readFileSync(path.join(f.root,f.base+'design.svg'),'utf8'),/<path/);
});
test('contour drilling keepout uses shared physical fit and cannot be replaced from the client',async t=>{
 const f=fixture(t,{shape:'contour'}),s=service(),opened=await s.open(f.root,f),data=input(f,opened);
 Object.assign(text(data),{x:6,y:30,size:2});
 const fit=await s.fit(f.root,data);assert.equal(fit.sizes[0].status,'passt nicht');assert.match(fit.sizes[0].issues.join(' '),/Bohrloch/);
 data.document.config.profile.geometry={width:999,height:999,shape:'rect',holes:[]};data.document.config.localResources.fonts.Michroma={regular:{units:1,glyphs:{}}};
 assert.deepEqual(await s.fit(f.root,data),fit,'client geometry and glyph data never become authoritative');
});
test('conflicts, unknown fonts, motif replacement/distortion, authority fields and traversal fail before writing',async t=>{
 const f=fixture(t),s=service(),opened=await s.open(f.root,f),before=f.bytes();
 for(const change of [d=>d.actor='forged',d=>d.freigabe={status:'freigegeben'},d=>text(d).font='NotInCatalogue',d=>motif(d).motif='other',d=>motif(d).w*=2,d=>objects(d).push({...motif(d),id:'new-motif'}),d=>text(d).x=Infinity]){
  const data=input(f,opened);change(data);await assert.rejects(s.save(f.root,data,{actor:'123'}),e=>e.status===422);assert.deepEqual(f.bytes(),before);
 }
 for(const reihe of ['../outside','/absolute','test/../editor','test\\..\\escape'])await assert.rejects(s.open(f.root,{reihe,id:f.id}),e=>[403,422].includes(e.status));
 const changed=input(f,opened);text(changed).text='Geaendert';await s.save(f.root,changed,{actor:'123'});await assert.rejects(s.save(f.root,input(f,opened),{actor:'123'}),e=>e.status===409);
});
test('font resources are selected only from the catalogue index and lazy load without a write',async t=>{
 const f=fixture(t),s=service(),before=f.bytes();assert.deepEqual(await s.font(f.root,{...f,font:'Lato'}),{id:'Lato',font:FONT});await assert.rejects(s.font(f.root,{...f,font:'../../../secret'}),e=>e.status===422);assert.deepEqual(f.bytes(),before);
});

test('actual embedded token route protects editor GET/preview/fit/PUT and logs the session actor without database products',async t=>{
 const f=fixture(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-editor-host-'));
 const registry=json(f.root,'schriften/schriften.json');registry.fonts.push({name:'Garamond Acryl',inPlatform:true});write(f.root,'schriften/schriften.json',registry);
 for(const filename of ['design.json','design.svg']){const file=path.join(f.root,f.base+filename);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('Michroma','Garamond Acryl'));}
 build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],config={mode:'embedded-test',origin:'https://workshop.example',shopDomain:'fixture.myshopify.com',clientId:'fixture-client'},sessions={mode:'test-only',shopDomain:config.shopDomain,clientId:config.clientId,secret:'test-only-secret'};
 const workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:f.root,shopifySessions:sessions});
 const server=createPreviewServer({outputDirectory:dir,workshop,embeddedApp:config});server.address=()=>({port:8765});
 t.after(()=>{workshop.close();fs.rmSync(dir,{recursive:true,force:true});});
 const request=(url,{method='GET',headers={},data}={})=>new Promise(resolve=>{
  const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);Object.assign(req,{url,method,headers:{host:'workshop.example',...headers}});
  const res=new EventEmitter();res.headersSent=false;res.headers={};res.setHeader=(k,v)=>res.headers[k.toLowerCase()]=v;res.writeHead=(status,h={})=>{res.status=status;for(const[k,v]of Object.entries(h))res.setHeader(k,v);res.headersSent=true;return res;};res.end=bytes=>{res.bytes=Buffer.from(bytes||'');resolve(res);};server.emit('request',req,res);
 });
 const now=Math.floor(Date.now()/1000),payload={aud:sessions.clientId,dest:'https://'+sessions.shopDomain,iss:'https://'+sessions.shopDomain+'/admin',sub:'123',iat:now,nbf:now,exp:now+60,jti:randomUUID()},unsigned=[{alg:'HS256'},payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.'),authorization='Bearer '+unsigned+'.'+createHmac('sha256',sessions.secret).update(unsigned).digest('base64url');
 const session=JSON.parse((await request('/api/workshop/session',{headers:{authorization}})).bytes),headers={authorization,origin:config.origin,'content-type':'application/json','x-gravuru-csrf':session.csrfToken,'sec-fetch-site':'same-origin'};
 const route='/api/workshop/designs/editor',query='?reihe='+f.reihe+'&id='+f.id,before=workshop.repository.list();
 for(const asset of ['/workshop-ui/app.mjs','/workshop-ui/katalog-editor-ui.mjs']){const response=await request(asset);assert.equal(response.status,200,asset);assert.match(response.headers['content-type'],/javascript/);}
 assert.equal((await request('/workshop-ui/katalog-editor-ui.mjs/extra')).status,404);
 assert.equal((await request(route+query)).status,401);assert.equal((await request(route+query,{headers:{authorization:'Bearer invalid'}})).status,401);
 const openedResponse=await request(route+query,{headers});assert.equal(openedResponse.status,200,openedResponse.bytes.toString());assert.match(openedResponse.headers['content-security-policy'],/frame-ancestors/);
 const opened=JSON.parse(openedResponse.bytes),data=input(f,opened);text(data).text='Neu';
 for(const [suffix,method]of [['/preview','POST'],['/fit','POST'],['','PUT']]){
  for(const patch of [{authorization:''},{'x-gravuru-csrf':'wrong'},{origin:'https://foreign.invalid'},{host:'foreign.invalid'},{'sec-fetch-site':'cross-site'}])assert.ok([401,403].includes((await request(route+suffix,{method,headers:{...headers,...patch},data})).status));
 }
 for(const suffix of ['/preview','/fit']){const result=await request(route+suffix,{method:'POST',headers,data});assert.equal(result.status,200,result.bytes.toString());}
 const saved=await request(route,{method:'PUT',headers,data});assert.equal(saved.status,200,saved.bytes.toString());assert.equal(JSON.parse(saved.bytes).changed,true);assert.equal(f.read().freigabe.von,'123');
 assert.equal((await request(route,{method:'PUT',headers,data})).status,409);assert.equal((await request('/api/workshop/products',{method:'PUT',headers,data})).status,405);
 assert.deepEqual(workshop.repository.list(),before,'catalogue save never imports or revises a product');
});

test('a missing catalogue font fails explicitly without substitute paths or writes',async t=>{
 const f=fixture(t),s=service();for(const filename of ['design.json','design.svg']){const file=path.join(f.root,f.base+filename);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('Michroma','Missing Font'));}
 const before=f.bytes();await assert.rejects(s.open(f.root,f),e=>e.status===422&&e.code==='design_editor_font_missing'&&e.message.includes('Missing Font'));assert.deepEqual(f.bytes(),before);
});

test('a source change is always a 409 before validating the now-obsolete object list',async t=>{
 const f=fixture(t),s=service(),opened=await s.open(f.root,f),file=path.join(f.root,f.base+'design.svg');
 fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/<g id="motiv-1">[\s\S]*?<\/g>/,''));
 for(const action of ['preview','fit','save'])await assert.rejects(s[action](f.root,input(f,opened),{actor:'123'}),e=>e.status===409);
});

test('font replacement uses server glyphs and cannot replace master metadata, resources or geometry',async t=>{
 const f=fixture(t),wide={regular:{units:1000,glyphs:Object.fromEntries(Object.entries(FONT.regular.glyphs).map(([ch,g])=>[ch,{...g,a:650}]))}},s=createDesignEditor({available:{Michroma:FONT,Lato:wide}});
 const opened=await s.open(f.root,f),data=input(f,opened),before=f.read(),o=text(data);o.font='Lato';o.text='Neu';o.x=40;
 data.document.name='Forged';data.document.config.profile.geometry={width:999,height:999,shape:'rect',holes:[]};data.document.config.profile.material={kind:'wood'};data.document.config.profile.features={orderEnabled:true,productionConfirmed:true};
 data.document.config.profile.designs[0].katalog={designId:'forged',plateMm:[999,999],scale:999,offsetMm:[999,999]};
 data.document.config.localResources.fonts.Lato={regular:{units:1,glyphs:{N:{a:999999,d:'malicious'}}}};data.document.config.localResources.motifs=[{key:'forged',svgFragment:'<script>alert(1)</script>'}];
 const saved=await s.save(f.root,data,{actor:'123'}),after=f.read(),reopenedText=text(saved);
 assert.equal(after.id,before.id);assert.equal(after.name,before.name);assert.deepEqual(after.plateMm,before.plateMm);assert.equal(after.material,before.material);assert.deepEqual(after.sizes,before.sizes);
 assert.equal(after.texts[0].font,'Lato');assert.equal(after.texts[0].text,'Neu');assert.equal(reopenedText.x,40);assert.equal(reopenedText.w,9.75);
 assert.equal(saved.document.config.profile.features.orderEnabled,false);assert.equal(saved.document.config.profile.features.productionConfirmed,false);assert.equal(saved.document.config.profile.material.kind,'steel');
 assert.deepEqual(saved.document.config.localResources.fonts.Lato,wide);assert.ok(!JSON.stringify(after).includes('forged'));assert.ok(!fs.readFileSync(path.join(f.root,f.base+'design.svg'),'utf8').includes('malicious'));
});

test('server retains source line spacing, scales it with font size and rejects client authority over spacing',async t=>{
 const f=fixture(t),s=service(),file=path.join(f.root,f.base+'design.svg'),source=f.read();source.texts[0].text='Test\nName';source.texts[0].lineHeightMm=8.73;write(f.root,f.base+'design.json',source);
 fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('<tspan x="45" dy="0">Test</tspan>','<tspan x="45" dy="0">Test</tspan><tspan x="45" dy="8.73">Name</tspan>'));
 const opened=await s.open(f.root,f);assert.ok(Math.abs(text(opened).lineHeight-8.73)<1e-9);const before=f.bytes(),ignored=input(f,opened);text(ignored).lineHeight=999;
 const noChange=await s.save(f.root,ignored,{actor:'123'});assert.equal(noChange.changed,false);assert.deepEqual(f.bytes(),before);
 const changed=input(f,opened);Object.assign(text(changed),{font:'Lato',size:10,lineHeight:999});objects(changed).push({...structuredClone(text(changed)),id:'text-new-spacing',fieldKey:'text-new-spacing',text:'Neue\nZeile',x:60,y:40});
 const saved=await s.save(f.root,changed,{actor:'123'}),texts=f.read().texts;assert.equal(texts.find(t=>t.layerId==='text-1').lineHeightMm,17.46);assert.equal(texts.find(t=>t.layerId==='text-new-spacing').lineHeightMm,12);
 assert.ok(Math.abs(text(saved).lineHeight-17.46)<1e-9);assert.match(fs.readFileSync(file,'utf8'),/dy="17.46"/);assert.ok(!fs.readFileSync(file,'utf8').includes('999'));
});


test('ambiguous family dimensions use only explicit matching catalogue lines and their real drilling',async t=>{
 const f=fixture(t),s=service(),other=structuredClone(f.family);other.id='alternative-family';other.name='Other drilling';other.mountingRules.find(r=>r.count===2).edgeMm=19;
 write(f.root,'familien/edelstahl/alternative-family.json',other);
 await assert.rejects(s.open(f.root,f),e=>e.status===422);
 const line={schema:'gravuru-line/v2',id:'authoritative-line',name:'Confirmed line',families:[other.id],subcategories:[{id:'names',name:'Names',themeId:'namensschilder'}]};
 write(f.root,'linien/authoritative-line.json',line);
 const opened=await s.open(f.root,f);assert.equal(opened.source.familyId,other.id);assert.deepEqual(opened.source.familySource,{type:'line',lineIds:[line.id]});assert.match(opened.source.note,/authoritative-line/);
 const holes=opened.document.config.profile.optionGroups.find(g=>g.id==='mounting').values.find(v=>v.holes?.length).holes;
 assert.equal(holes[0].x,19);assert.equal(holes[1].x,71);
 line.subcategories[0].themeId=null;line.subcategories[0].mainProducts=[{id:'123',startDesign:f.id}];write(f.root,'linien/authoritative-line.json',line);
 assert.equal((await s.open(f.root,f)).source.familyId,other.id,'explicit start design also establishes source relation');
 line.subcategories[0].mainProducts=[];write(f.root,'linien/authoritative-line.json',line);
 await assert.rejects(s.open(f.root,f),e=>e.status===422,'unrelated lines never authorize a family');
 line.subcategories[0].themeId='namensschilder';line.families.push(f.family.id);write(f.root,'linien/authoritative-line.json',line);
 await assert.rejects(s.open(f.root,f),e=>e.status===422,'a line containing both alternatives remains ambiguous');
});
