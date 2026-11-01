import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDesignVariants} from './design-variants.mjs';
import {createDesignEditor} from './design-editor.mjs';
import {forgetKatalog} from './design-dashboard.mjs';
import {parseDesignSvg,transformEmbeddedPath} from './katalog-convert.mjs';
const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const FONT={regular:{units:1000,glyphs:Object.fromEntries([...new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 0123456789äöüßÄÖÜ.,-')].map(c=>[c,{a:400,d:'M0 0 L300 0 L300 600 L0 600 Z'}]))}};
const available={Michroma:FONT,Lato:FONT};
const read=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(root,rel,value)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,1)+'\n');};
const snapshots=root=>{const rows=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else rows.push([path.relative(root,f),fs.readFileSync(f).toString('base64')]);}}walk(root);return rows.sort((a,b)=>a[0].localeCompare(b[0]));};
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-variants-'));t.after(()=>{forgetKatalog();fs.rmSync(root,{recursive:true,force:true});});
 for(const rel of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,rel),path.join(root,rel),{recursive:true});
 const reihe='test-90x60',id='TRE-V2A-9x6-D9000',base='designs/'+reihe+'/'+id,paths=['M20 10 C21 9 29 9 30 10 L30 15 H20 Z'];
 const json={id,name:'Variante',material:'Edelstahl',process:'Gravur',form:'Rechteck',plateMm:[90,60],plate:{widthMm:90,heightMm:60,source:'Zeichnung'},themes:['namensschilder'],fonts:['Michroma'],texts:[{text:'Test',font:'Michroma',sizePt:5/(25.4/72),anchorMm:[45,30],align:'center',lineHeightMm:6,source:{origin:'keep'}}],motifs:[{box:[20,9,10,6],paths:paths.map(d=>({d,fill:'#000000',evenodd:true})),source:{origin:'original-mm'}}],sizes:['TS-RE-90X60'],masterSheet:{familySize:'TS-RE-90X60'},katalog:{key:reihe+'-D9000',series:reihe},freigabe:{status:'freigegeben',von:'fixture',am:'2026-10-24T00:00:00Z'}};
 write(root,base+'/design.json',json);write(root,base+'/design.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect id="platte" width="90" height="60"/><g id="motiv-1"><path d="'+paths[0]+'" fill-rule="evenodd"/></g><text id="text-1" x="45" y="30" font-family="Michroma" font-size="5" text-anchor="middle"><tspan x="45" dy="0">Test</tspan></text></svg>\n');write(root,'designs/'+reihe+'/index.json',[{key:id,pfad:id}]);
 return {root,reihe,id,base,paths,json,data:{source:{reihe,id},target:{familyId:'test-schilder',sizeKey:'TS-QU-80X80'}}};
}
const service=()=>createDesignVariants({available});
const request=(f,p)=>({...f.data,source:{...f.data.source,checksum:p.source.checksum},checksum:p.checksum});
test('prepare is read-only; contain preserves text, exact path commands, provenance and actual target; editor reopens',async t=>{
 const f=fixture(t),s=service(),before=snapshots(f.root),p=await s.prepare(f.root,f.data);
 assert.equal(p.action,'create-variant');assert.equal(p.identity.id,'TRE-V2A-8x8-D9000');assert.equal(p.identity.reihe,'test-80x80');assert.deepEqual(snapshots(f.root),before);
 assert.equal(p.transform.scale,8/9);assert.deepEqual(p.transform.offsetMm,[0,13.333]);assert.ok(Math.abs(p.transform.deviationPercent-33.33333333)<.00001);assert.match(p.svg,/data:image\/png;base64,/);
 const out=await s.create(f.root,request(f,p),{actor:'123',now:new Date('2026-10-24T00:00:00Z')}),base='designs/'+out.editor.reihe+'/'+out.editor.id,json=read(f.root,base+'/design.json'),svg=fs.readFileSync(path.join(f.root,base+'/design.svg'),'utf8'),parsed=parseDesignSvg(svg);
 assert.equal(out.changed,true);assert.equal(out.message,'Variante angelegt. Ziel bleibt offen.');assert.deepEqual(json.ziele,[{familie:'test-schilder',freigabe:null}]);assert.equal(json.freigabe,null);assert.equal(json.varianteVon,f.id);assert.equal(json.transfer.from,f.id);assert.equal(json.transfer.fromKey,f.json.katalog.key);assert.equal(json.transfer.by,'123');
 assert.equal(json.id,p.identity.id);assert.deepEqual(json.plateMm,[80,80]);assert.equal(json.katalog.key,'test-80x80-D9000');assert.equal(json.texts[0].text,'Test');assert.equal(parsed.layers.find(l=>l.kind==='text').font,'Michroma');
 assert.equal(json.motifs[0].paths[0].d,transformEmbeddedPath(f.paths[0],8/9,0,13.333));assert.equal(json.motifs[0].paths[0].evenodd,true);assert.deepEqual(json.motifs[0].source,f.json.motifs[0].source);assert.deepEqual(json.texts[0].source,f.json.texts[0].source);
 assert.deepEqual(read(f.root,f.base+'/design.json'),f.json);for(const file of out.files)assert.equal(fs.readFileSync(path.join(f.root,file)).includes(13),false,'LF '+file);
 const editor=await createDesignEditor({available}).open(f.root,out.editor);assert.deepEqual(editor.source.editorMm,[80,80]);assert.equal(editor.source.sizeKey,'TS-QU-80X80');
 assert.equal(read(f.root,'designs/test-80x80/index.json')[0].key,p.identity.id);
 const audit=fs.readFileSync(path.join(f.root,'designs/test-80x80/_aenderungen.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(audit[0].actor,'123');assert.equal(audit[0].freigabe,null);
});
test('same-format material/process only adds a family target, preserving all source geometry and old approval',async t=>{
 const f=fixture(t),family=read(f.root,'familien/edelstahl/test-schilder.json');family.id='test-print';family.material.processingProfileId='color-print';family.sizes=family.sizes.map(s=>({...s,key:s.key+'-PRINT'}));write(f.root,'familien/edelstahl/test-print.json',family);
 f.data.target={familyId:'test-print',sizeKey:'TS-RE-90X60-PRINT'};const svg=fs.readFileSync(path.join(f.root,f.base+'/design.svg')),s=service(),p=await s.prepare(f.root,f.data);assert.equal(p.action,'add-target');assert.equal(p.identity.id,f.id);
 const out=await s.create(f.root,request(f,p),{actor:'123'}),j=read(f.root,f.base+'/design.json');assert.equal(out.editor.id,f.id);assert.deepEqual(j.texts,f.json.texts);assert.deepEqual(j.freigabe,f.json.freigabe);assert.deepEqual(j.ziele,[{familie:'test-schilder',freigabe:f.json.freigabe},{familie:'test-print',freigabe:null}]);assert.deepEqual(fs.readFileSync(path.join(f.root,f.base+'/design.svg')),svg);
 const again=await s.prepare(f.root,f.data),before=snapshots(f.root);assert.equal(again.action,'already-exists');assert.equal((await s.create(f.root,request(f,again),{actor:'123'})).changed,false);assert.deepEqual(snapshots(f.root),before);
});
test('contour uses authoritative path/holes and an existing form-prefix/folder',async t=>{
 const f=fixture(t),family=read(f.root,'familien/edelstahl/test-schilder.json');family.groups.push({key:'RT',name:'Kontur',shape:'contour',cornerRadiusMm:0});
 family.sizes.push({key:'TS-RT-120X80',groupKey:'RT',label:'12 x 8 cm',widthMm:120,heightMm:80,baseCents:null,mounting:['B02-E6-D4'],outlinePath:'M0 10 L10 0 H110 L120 10 V70 L110 80 H10 L0 70 Z',holesMm:[{x:6,y:40,diameterMm:4},{x:114,y:40,diameterMm:4}]});write(f.root,'familien/edelstahl/test-schilder.json',family);
 const seed={...f.json,id:'TO-V2A-12x8-D1',plateMm:[120,80],form:'Kontur',sizes:['TS-RT-120X80'],masterSheet:{familySize:'TS-RT-120X80'},ziele:[{familie:family.id,freigabe:null}]};write(f.root,'designs/retro-120x80/'+seed.id+'/design.json',seed);write(f.root,'designs/retro-120x80/'+seed.id+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 120 80'));
 f.data.target.sizeKey='TS-RT-120X80';const s=service(),p=await s.prepare(f.root,f.data);assert.equal(p.action,'create-variant');assert.equal(p.identity.id,'TO-V2A-12x8-D9000');assert.equal(p.identity.reihe,'retro-120x80');
 const out=await s.create(f.root,request(f,p),{actor:'123'}),svg=fs.readFileSync(path.join(f.root,'designs',out.editor.reihe,out.editor.id,'design.svg'),'utf8');assert.ok(svg.includes(family.sizes.at(-1).outlinePath));assert.match(svg,/<circle cx="6" cy="40" r="2"/);const editor=await createDesignEditor({available}).open(f.root,out.editor);assert.equal(editor.document.config.profile.geometry.outlinePath,family.sizes.at(-1).outlinePath);
});
test('missing family and missing form prefix stay explicit without any write',async t=>{
 const f=fixture(t),s=service(),before=snapshots(f.root);await assert.rejects(s.prepare(f.root,{...f.data,target:{familyId:'missing',sizeKey:'missing'}}),e=>e.status===422&&e.message==='Familie fehlt.');
 const family=read(f.root,'familien/edelstahl/test-schilder.json');family.groups.find(g=>g.key==='QU').shape='ellipse';write(f.root,'familien/edelstahl/test-schilder.json',family);const p=await s.prepare(f.root,f.data);assert.equal(p.action,'blocked');assert.match(p.message,/Kennung offen/);await assert.rejects(s.create(f.root,request(f,p),{actor:'123'}),e=>e.status===409);assert.equal(fs.existsSync(path.join(f.root,'designs/test-80x80')),false);assert.equal(before.length,snapshots(f.root).length);
});
for(const kind of ['master','index','bestand'])test(kind+' collision never overwrites or silently renames',async t=>{
 const f=fixture(t),s=service(),id='TRE-V2A-8x8-D9000';if(kind==='master'){write(f.root,'designs/occupied/'+id+'/design.json',{...f.json,id,plateMm:[80,80],sizes:['TS-QU-80X80']});write(f.root,'designs/occupied/'+id+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 80 80'));}else if(kind==='index')write(f.root,'designs/occupied/index.json',[{key:id,pfad:id}]);else write(f.root,'designs/bestand/line/nested/original/design.json',{id});
 const before=snapshots(f.root),p=await s.prepare(f.root,f.data);assert.equal(p.action,'blocked');assert.equal(p.status,kind==='bestand'?'Bestandsfassung vorhanden':'Kennung belegt');await assert.rejects(s.create(f.root,request(f,p),{actor:'123'}),e=>e.status===409);assert.deepEqual(snapshots(f.root),before);
});
test('existing variant of same root adds target there, preserving its content and sibling approvals',async t=>{
 const f=fixture(t),s=service(),id='TRE-V2A-8x8-D9000',j={...f.json,id,varianteVon:f.id,plateMm:[80,80],sizes:['TS-QU-80X80'],ziele:[]};write(f.root,'designs/occupied/'+id+'/design.json',j);write(f.root,'designs/occupied/'+id+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 80 80'));
 const p=await s.prepare(f.root,f.data);assert.equal(p.action,'add-target');assert.deepEqual(p.editor,{reihe:'occupied',id});await s.create(f.root,request(f,p),{actor:'123'});const next=read(f.root,'designs/occupied/'+id+'/design.json');assert.deepEqual(next.texts,j.texts);assert.deepEqual(next.ziele,[{familie:'test-schilder',freigabe:null}]);assert.deepEqual(read(f.root,f.base+'/design.json'),f.json);
});
for(const changed of ['source','family','index'])test('stale '+changed+' rejects before any variant write',async t=>{
 const f=fixture(t),s=service(),p=await s.prepare(f.root,f.data);
 if(changed==='source')write(f.root,f.base+'/design.json',{...f.json,name:'Other'});if(changed==='family'){const family=read(f.root,'familien/edelstahl/test-schilder.json');family.sizes[0].baseCents=999;write(f.root,'familien/edelstahl/test-schilder.json',family);}if(changed==='index')write(f.root,'designs/other/index.json',[{key:'TRE-V2A-8x8-D9000'}]);
 const before=snapshots(f.root);await assert.rejects(s.create(f.root,request(f,p),{actor:'123'}),e=>e.status===409);assert.deepEqual(snapshots(f.root),before);
});
test('transaction failure restores all files, index, audit and new directories',async t=>{
 const f=fixture(t),s=service(),p=await s.prepare(f.root,f.data),before=snapshots(f.root);
 await assert.rejects(s.create(f.root,request(f,p),{actor:'123',beforeReplace:(_,i)=>{if(i===2)throw Error('injected');}}),/injected/);assert.deepEqual(snapshots(f.root),before);assert.equal(fs.existsSync(path.join(f.root,'designs/test-80x80')),false);
 const out=await s.create(f.root,request(f,p),{actor:'123'});assert.equal(out.changed,true);
});
test('unsafe paths, client identities, unknown fonts and absent actor never write',async t=>{
 const f=fixture(t),s=service(),before=snapshots(f.root);
 for(const reihe of ['../outside','/absolute','test\\..\\escape','CON'])await assert.rejects(s.prepare(f.root,{...f.data,source:{...f.data.source,reihe}}),e=>e.status===422);
 await assert.rejects(s.prepare(f.root,{...f.data,identity:{id:'arbitrary'}}),e=>e.status===422);
 const p=await s.prepare(f.root,f.data);await assert.rejects(s.create(f.root,request(f,p)),e=>e.status===422);assert.deepEqual(snapshots(f.root),before);
 write(f.root,f.base+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('Michroma','Missing Font'));const later=snapshots(f.root);await assert.rejects(s.prepare(f.root,f.data),/Schrift fehlt/);assert.deepEqual(snapshots(f.root),later);
});

test('legacy collision displays only a verified local PNG and remains read-only',async t=>{
 const f=fixture(t),base='designs/bestand/line/deep/legacy';
 write(f.root,base+'/design.json',{id:'TRE-V2A-8x8-D9000'});const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');write(f.root,base+'/preview.png',png);
 const before=snapshots(f.root),p=await service().prepare(f.root,f.data);assert.equal(p.status,'Bestandsfassung vorhanden');assert.equal(p.previewUrl,'data:image/png;base64,'+png.toString('base64'));assert.deepEqual(snapshots(f.root),before);
});
test('actual existing Corel spelling wins over rounded centimetres',async t=>{
 const f=fixture(t),family=read(f.root,'familien/edelstahl/test-schilder.json');family.sizes.push({...family.sizes[0],key:'TS-RE-80X53',widthMm:80,heightMm:53.3});write(f.root,'familien/edelstahl/test-schilder.json',family);
 const id='TRE-V2A-8x5-D1',j={...f.json,id,plateMm:[80,53.3],sizes:['TS-RE-80X53'],masterSheet:{familySize:'TS-RE-80X53'}};write(f.root,'designs/steel-80x53/'+id+'/design.json',j);write(f.root,'designs/steel-80x53/'+id+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 80 53.3'));
 f.data.target.sizeKey='TS-RE-80X53';const p=await service().prepare(f.root,f.data);assert.equal(p.identity.id,'TRE-V2A-8x5-D9000');assert.equal(p.identity.reihe,'steel-80x53');
});
test('photo placeholder stays local, binary-identical and participates in the same transaction',async t=>{
 const f=fixture(t),family=read(f.root,'familien/edelstahl/test-schilder.json');family.material.processingProfileId='color-print';write(f.root,'familien/edelstahl/test-schilder.json',family);f.json.process='Druck';f.json.photos=[{box:[60,10,10,10],file:'foto-1.png',placeholder:true,engrave:false}];write(f.root,f.base+'/design.json',f.json);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');write(f.root,f.base+'/foto-1.png',png);
 write(f.root,f.base+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('</svg>','<g id="foto-1"><rect x="60" y="10" width="10" height="10"/><image x="60" y="10" width="10" height="10" href="foto-1.png"/></g></svg>'));
 const s=service(),p=await s.prepare(f.root,f.data),out=await s.create(f.root,request(f,p),{actor:'123'}),base='designs/'+out.editor.reihe+'/'+out.editor.id;
 assert.deepEqual(fs.readFileSync(path.join(f.root,base+'/foto-1.png')),png);assert.equal(read(f.root,base+'/design.json').photos[0].engrave,false);assert.ok(out.files.includes(base+'/foto-1.png'));
});
test('case-folded identifier collisions are blocked, including index-only reservations',async t=>{
 const f=fixture(t);write(f.root,'designs/occupied/index.json',[{key:'tre-v2a-8x8-d9000'}]);const p=await service().prepare(f.root,f.data);assert.equal(p.action,'blocked');assert.equal(p.status,'Kennung belegt');
});
test('changed existing-variant SVG is a conflict and its own content supplies the preview',async t=>{
 const f=fixture(t),id='TRE-V2A-8x8-D9000',base='designs/occupied/'+id,j={...f.json,id,varianteVon:f.id,plateMm:[80,80],sizes:['TS-QU-80X80'],ziele:[]};
 write(f.root,base+'/design.json',j);write(f.root,base+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 80 80').replace('>Test<','>Own<'));
 const s=service(),p=await s.prepare(f.root,f.data);assert.equal(p.action,'add-target');assert.equal(p.transform.scale,1);
 write(f.root,base+'/design.svg',fs.readFileSync(path.join(f.root,base+'/design.svg'),'utf8').replace('>Own<','>Other<'));const before=snapshots(f.root);await assert.rejects(s.create(f.root,request(f,p),{actor:'123'}),e=>e.status===409);assert.deepEqual(snapshots(f.root),before);
});

test('foreign LF2 collision shows both previews and requires a fresh explicit target-add decision',async t=>{
 const f=fixture(t),id='TRE-V2A-8x8-D9000',base='designs/occupied/'+id,j={...f.json,id,plateMm:[80,80],sizes:['TS-QU-80X80'],ziele:[]};
 write(f.root,base+'/design.json',j);write(f.root,base+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 80 80').replace('>Test<','>Own<'));
 const s=service(),blocked=await s.prepare(f.root,f.data);assert.equal(blocked.action,'blocked');assert.equal(blocked.allowAddTarget,true);assert.match(blocked.sourceSvg,/<svg/);assert.match(blocked.existingSvg,/<svg/);assert.notEqual(blocked.sourceSvg,blocked.existingSvg);assert.equal(blocked.editor,null);
 const data={...f.data,resolution:'add-target-to-existing'};await assert.rejects(s.create(f.root,{...request(f,blocked),resolution:data.resolution},{actor:'123'}),e=>e.status===409);
 const p=await s.prepare(f.root,data),svg=fs.readFileSync(path.join(f.root,base+'/design.svg'));assert.equal(p.action,'add-target');
 const out=await s.create(f.root,{...data,checksum:p.checksum,source:p.source},{actor:'123'});assert.equal(out.editor.id,id);assert.deepEqual(read(f.root,base+'/design.json'),{...j,ziele:[{familie:'test-schilder',freigabe:null}]});assert.deepEqual(fs.readFileSync(path.join(f.root,base+'/design.svg')),svg);assert.deepEqual(read(f.root,f.base+'/design.json'),f.json);
});
test('existing decimal comma format is retained verbatim',async t=>{
 const f=fixture(t),family=read(f.root,'familien/edelstahl/test-schilder.json');family.sizes.push({...family.sizes[0],key:'TS-RE-80X35',widthMm:80,heightMm:35});write(f.root,'familien/edelstahl/test-schilder.json',family);
 const id='TRE-V2A-8x3,5-D1',j={...f.json,id,plateMm:[80,35],sizes:['TS-RE-80X35'],masterSheet:{familySize:'TS-RE-80X35'}};write(f.root,'designs/steel-80x35/'+id+'/design.json',j);write(f.root,'designs/steel-80x35/'+id+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 80 35'));
 f.data.target.sizeKey='TS-RE-80X35';const p=await service().prepare(f.root,f.data);assert.equal(p.identity.id,'TRE-V2A-8x3,5-D9000');assert.equal(p.identity.reihe,'steel-80x35');
});
test('line changes take the established line code but preserve the original material code',async t=>{
 const f=fixture(t),old=f.id;f.id='GT-S-9x6-D9000';f.json.id=f.id;f.data.source.id=f.id;
 fs.renameSync(path.join(f.root,f.base),path.join(f.root,'designs',f.reihe,f.id));f.base='designs/'+f.reihe+'/'+f.id;write(f.root,f.base+'/design.json',f.json);write(f.root,'designs/'+f.reihe+'/index.json',[{key:f.id}]);
 const seed='TO-V2A-8x8-D1';write(f.root,'designs/oval-80x80/'+seed+'/design.json',{...f.json,id:seed,plateMm:[80,80],sizes:['TS-QU-80X80'],masterSheet:{familySize:'TS-QU-80X80'}});write(f.root,'designs/oval-80x80/'+seed+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 80 80'));
 write(f.root,'linien/other.json',{schema:'gravuru-line/v2',id:'other',name:'Other',families:['test-schilder'],subcategories:[{id:'name',name:'Name',themeId:'namensschilder',fontSet:null,startDesign:seed}]});
 f.data.target.lineId='other';const p=await service().prepare(f.root,f.data);assert.equal(p.identity.id,'TO-S-8x8-D9000');assert.equal(p.identity.reihe,'test-80x80');assert.notEqual(p.identity.id,'TO-V2A-8x8-D9000');assert.equal(old,'TRE-V2A-9x6-D9000');
});
test('filesystem link metadata is rejected without following or modifying its target',async t=>{
 // Creating junctions is denied in the Windows sandbox. Inject only the OS metadata;
 // the real source readers, inventory and write refusal still run unchanged.
 const f=fixture(t),s=service(),before=snapshots(f.root),originalReadDir=fs.readdirSync;
 const dir=path.join(f.root,'designs');
 const entry={name:'linked',isSymbolicLink:()=>true,isDirectory:()=>false,isFile:()=>false};
 const mock=t.mock.method(fs,'readdirSync',function(file,options){const rows=originalReadDir.call(this,file,options);return path.resolve(file)===dir&&options?.withFileTypes?[...rows,entry]:rows;});
 await assert.rejects(s.prepare(f.root,f.data),e=>e.status===422&&/Verknüpfung/.test(e.message));mock.mock.restore();assert.deepEqual(snapshots(f.root),before);
 const file=path.join(f.root,f.base,'design.json'),originalLstat=fs.lstatSync;
 const hard=t.mock.method(fs,'lstatSync',function(target,...args){const stat=originalLstat.call(this,target,...args);if(path.resolve(target)===file){const altered=Object.create(stat);altered.nlink=2;return altered;}return stat;});
 await assert.rejects(s.prepare(f.root,f.data),e=>e.status===422&&/Mehrfach/.test(e.message));hard.mock.restore();assert.deepEqual(snapshots(f.root),before);
});

test('external photo links cannot disappear silently during variant conversion',async t=>{
 const f=fixture(t),family=read(f.root,'familien/edelstahl/test-schilder.json');family.material.processingProfileId='color-print';write(f.root,'familien/edelstahl/test-schilder.json',family);write(f.root,f.base+'/design.json',{...f.json,process:'Druck'});
 write(f.root,f.base+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('</svg>','<g id="foto-1"><rect x="60" y="10" width="10" height="10"/><image x="60" y="10" width="10" height="10" href="https://invalid.example/photo.png"/></g></svg>'));
 const before=snapshots(f.root),oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Network must not be used');};t.after(()=>{globalThis.fetch=oldFetch;});await assert.rejects(service().prepare(f.root,f.data),e=>e.status===422&&/Bildverweis/.test(e.message));assert.deepEqual(snapshots(f.root),before);
});

for(const material of ['S','V2A'])test('explicit same-size target line takes priority over unrelated size matches ('+material+')',async t=>{
 const f=fixture(t),id='GT-'+material+'-9x6-D1',base='designs/other-90x60/'+id,j={...f.json,id,ziele:[]};
 write(f.root,base+'/design.json',j);write(f.root,base+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8'));
 write(f.root,'linien/other.json',{schema:'gravuru-line/v2',id:'other',name:'Other',families:['test-schilder'],subcategories:[{id:'one',name:'One',themeId:'namensschilder',fontSet:null,startDesign:id}]});
 f.data.target={familyId:'test-schilder',sizeKey:'TS-RE-90X60',lineId:'other'};
 const p=await service().prepare(f.root,f.data);assert.notEqual(p.action,'add-target');assert.notEqual(p.action,'already-exists');
 if(material==='V2A'){assert.equal(p.action,'create-variant');assert.equal(p.identity.id,'GT-V2A-9x6-D9000');assert.equal(p.identity.reihe,'other-90x60');}
 else{assert.equal(p.action,'blocked');assert.match(p.message,/Kennung offen/);}
});


test('explicit target keeps source sheet prefix when another sheet owns the new size',async t=>{
 const f=fixture(t),family=read(f.root,'familien/edelstahl/test-schilder.json');
 assert.ok(family.sizes.some(s=>s.key==='TS-RE-120X80'));
 f.json.ziele=[{familie:'test-schilder',freigabe:null}];write(f.root,f.base+'/design.json',f.json);
 const foreign={...f.json,id:'OTHER-V2A-12x8-D1',plateMm:[120,80],sizes:['TS-RE-120X80'],masterSheet:{familySize:'TS-RE-120X80'}};
 write(f.root,'designs/other-120x80/'+foreign.id+'/design.json',foreign);
 write(f.root,'designs/other-120x80/'+foreign.id+'/design.svg',fs.readFileSync(path.join(f.root,f.base+'/design.svg'),'utf8').replace('0 0 90 60','0 0 120 80'));
 f.data.target.sizeKey='TS-RE-120X80';const before=snapshots(f.root),p=await service().prepare(f.root,f.data);
 assert.equal(p.action,'create-variant');assert.equal(p.identity.id,'TRE-V2A-12x8-D9000');assert.equal(p.identity.reihe,'test-120x80');assert.deepEqual(snapshots(f.root),before);
});
