import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {readDesignEditSource,planTemplateWriteback,saveTemplateWriteback} from './katalog-writeback.mjs';
import {katalogDesignToTemplate,parseDesignSvg,scaleTemplate,transformEmbeddedPath,pathBounds} from './katalog-convert.mjs';
import {openKatalog} from './katalog-source.mjs';
import {measureText,textPaths} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {withKatalogWriteLock,writeKatalogTransaction} from './katalog-transaction.mjs';
import {patchDesign,katalogFor} from './design-dashboard.mjs';
const family=openKatalog(fileURLToPath(new URL('./fixtures/katalog/',import.meta.url))).families.get('test-schilder');
const glyphs=Object.fromEntries([...new Set(' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789äöüß&<>')].map(c=>[c,{a:600,d:'M0 0L500 0L500 700L0 700Z'}]));
const fonts={Test:{regular:{units:1000,glyphs}},Other:{regular:{units:1000,glyphs:Object.fromEntries(Object.entries(glyphs).map(([c,g])=>[c,{...g,a:700}]))}}};
function fixture(t,{shape='rect',sourceMm=[90,60],targetMm=sourceMm}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-template-writeback-')),dir=path.join(root,'designs','test','D1');fs.mkdirSync(dir,{recursive:true});
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const attrs=shape==='oval'?'<ellipse id="platte" cx="45" cy="30" rx="45" ry="30"/>':shape==='contour'?'<path id="platte" d="M0 0L90 0L90 60L0 60Z"/>':'<rect id="platte" width="90" height="60"/>';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+sourceMm.join(' ')+'">'+attrs+'<g id="motiv-1"><path fill="#000000" fill-rule="evenodd" d="M10 10L20 10L20 15L10 15Z"/></g><text id="text-1" x="30" y="30" font-family="Test" font-size="4" text-anchor="start" letter-spacing="-0.1"><tspan x="30" dy="0">Alpha</tspan></text><text id="text-2" x="45" y="45" font-family="Test" font-size="3" text-anchor="middle"><tspan x="45" dy="0">Beta</tspan></text></svg>\n';
 const json={id:'D1',name:'Original',plateMm:sourceMm,themes:['namensschilder'],fonts:['Test'],texts:[{text:'Alpha',font:'Test',sizePt:4*72/25.4,anchorMm:[30,30],align:'left',letterSpacingMm:-.1},{text:'Beta',font:'Test',sizePt:3*72/25.4,anchorMm:[45,45],align:'center'}],motifs:[{box:[10,10,10,5],paths:[{d:'M10 10L20 10L20 15L10 15Z',fill:'#000000',evenodd:true}]}],freigabe:{status:'freigegeben',von:'earlier'}};
 fs.writeFileSync(path.join(dir,'design.json'),JSON.stringify(json,null,1)+'\n');fs.writeFileSync(path.join(dir,'design.svg'),svg);
 const source=readDesignEditSource(root,{reihe:'test',designId:'D1'}),converted=katalogDesignToTemplate(source.master,family,null,{fonts,svgText:source.master.svgText}),original=scaleTemplate(converted.template,sourceMm,targetMm,fonts,{contain:true});
 const args={reihe:'test',designId:'D1',checksum:source.checksum,template:structuredClone(original),originalTemplate:original,fonts,actor:'merchant:123',now:new Date('2026-10-24T12:00:00Z')};
 return {root,dir,source,original,args,plan:()=>planTemplateWriteback({master:source.master,...args}),save:()=>saveTemplateWriteback(root,args),read:()=>readDesignEditSource(root,{reihe:'test',designId:'D1'}),bytes:()=>['design.json','design.svg'].map(f=>fs.readFileSync(path.join(dir,f))),protocol:path.join(root,'designs/test/_aenderungen.jsonl')};
}
const object=(f,id)=>f.args.template.objects.find(o=>o.id===id);
test('unveränderter Rundlauf ist bytegleich, auch mit Contain-Rundung; keine Freigaberücksetzung oder Protokoll',t=>{
 const f=fixture(t,{sourceMm:[90.6,61.3],targetMm:[90,60]}),before=f.bytes();
 const p=f.plan();assert.equal(p.changed,false);assert.equal(p.svgText,f.source.master.svgText);assert.deepEqual(p.json,f.source.master.json);
 assert.deepEqual(f.save(),{changed:false,checksum:f.source.checksum,changes:[],files:[]});assert.deepEqual(f.bytes(),before);assert.equal(fs.existsSync(f.protocol),false);
});
test('Text, Schrift, Größe, Lage, Laufweite und Ausrichtung werden geometrisch identisch zurückgeschrieben',t=>{
 const f=fixture(t),o=object(f,'text-1');Object.assign(o,{text:'Alpha & Beta\nGamma',font:'Other',size:5,x:42,y:32,textAnchor:'end',letterSpacing:.2});
 const p=f.plan(),entry=p.json.texts[0],svg=parseDesignSvg(p.svgText).layers.find(l=>l.id==='text-1');
 assert.equal(entry.text,o.text);assert.equal(entry.font,'Other');assert.equal(entry.sizeMm,5);assert.equal(entry.letterSpacingMm,.2);assert.equal(entry.align,'right');assert.equal(svg.anchor,'end');assert.equal(svg.letterSpacing,.2);assert.deepEqual([svg.x,svg.y],entry.anchorMm);assert.equal(svg.size,5);assert.match(p.svgText,/Alpha &amp; Beta/);assert.equal(p.svgText.includes('data-preview-text-paths'),false);
 const again=katalogDesignToTemplate({...f.source.master,json:p.json},family,null,{fonts,svgText:p.svgText}).template.objects.find(x=>x.id===o.id);
 for(const k of ['x','y','size','letterSpacing'])assert.ok(Math.abs(again[k]-o[k])<.001,k+': '+again[k]+' / '+o[k]);assert.equal(again.textAnchor,'end');
});
test('Text hinzufügen/entfernen hält bestehende Ebenenkennungen stabil und kann erneut bearbeitet werden',t=>{
 const f=fixture(t);f.args.template.objects=f.args.template.objects.filter(o=>o.id!=='text-1');f.args.template.objects.push({id:'text-new-1',type:'text',text:'Neu',font:'Other',size:4,x:30,y:35,w:1,h:1,textAnchor:'start',letterSpacing:0,rotation:0,bold:false,color:'#000000'});
 f.save();const next=f.read();assert.deepEqual(next.master.json.texts.map(t=>t.layerId),['text-2','text-new-1']);assert.ok(!next.master.svgText.includes('id="text-1"'));assert.match(next.master.svgText,/id="text-new-1"/);
 const original=katalogDesignToTemplate(next.master,family,null,{fonts,svgText:next.master.svgText}).template,template=structuredClone(original);template.objects.find(o=>o.id==='text-2').text='Bleibt';
 saveTemplateWriteback(f.root,{...f.args,checksum:next.checksum,originalTemplate:original,template});const after=f.read();assert.equal(after.master.json.texts[0].text,'Bleibt');assert.equal(after.master.json.texts[1].text,'Neu');
});
for(const shape of ['rect','oval','contour'])test('Motiv verschieben, proportional skalieren und entfernen: '+shape,t=>{
 const f=fixture(t,{shape}),o=object(f,'motiv-1');o.x+=3;o.y-=2;o.w*=.5;o.h*=.5;
 const p=f.plan(),m=p.json.motifs[0],parsed=parseDesignSvg(p.svgText).layers.find(l=>l.id==='motiv-1');
 assert.deepEqual(parsed.bounds,m.box);assert.deepEqual(parsed.bounds,[15.5,9.25,5,2.5]);assert.equal(m.paths[0].d,parsed.paths[0]);assert.match(p.svgText,/fill-rule="evenodd"/);
 f.args.template.objects=f.args.template.objects.filter(x=>x.id!=='motiv-1');const deleted=f.plan();assert.equal(deleted.json.motifs.length,0);assert.equal(parseDesignSvg(deleted.svgText).layers.some(l=>l.id==='motiv-1'),false);
});
test('Retro-Contain-Deltas werden ohne Umdeutung der gerundeten Originalkoordinaten rückgerechnet',t=>{
 const f=fixture(t,{sourceMm:[90.6,61.3],targetMm:[90,60]}),o=object(f,'text-2');o.x+=1;o.y-=2;const p=f.plan(),scale=f.original.katalog.scale;
 assert.ok(Math.abs(p.json.texts[1].anchorMm[0]-(45+1/scale))<1e-7);assert.ok(Math.abs(p.json.texts[1].anchorMm[1]-(45-2/scale))<1e-7);
 assert.deepEqual(p.json.texts[0].anchorMm,[30,30]);assert.equal(p.json.texts[0].sizePt,f.source.master.json.texts[0].sizePt);
});
test('Pfade behalten relative/absolute Befehle, Kurven, Bogenwinkel und Flags',()=>{
 assert.equal(transformEmbeddedPath('m1 2 3 4 h2 v3 a5 6 30 0 1 7 8 z',2,10,20),'m 12 24 6 8 h 4 v 6 a 10 12 30 0 1 14 16 z');
 assert.equal(transformEmbeddedPath('M1 2 C3 4 5 6 7 8 A2 3 40 1 0 9 10Z',2,10,20),'M 12 24 C 16 28 20 32 24 36 A 4 6 40 1 0 28 40 Z');
 assert.throws(()=>transformEmbeddedPath('M1 2 C1',2),/Unvollständig/);assert.throws(()=>transformEmbeddedPath('M1 2A2 2 0 2 1 4 4',1),/Bogenflag/);
});
test('Unzulässige Motive, anisotrope Skalierung, Drehung, Font/Glyphen und Mehrfach-IDs blockieren ohne Schreiben',t=>{
 for(const change of [f=>f.args.template.objects.push({...object(f,'motiv-1'),id:'motiv-new'}),f=>{object(f,'motiv-1').w*=2;},f=>{object(f,'text-1').font='Missing';},f=>{object(f,'text-1').text='😀';},f=>{object(f,'text-1').rotation=30;},f=>f.args.template.objects.push({...object(f,'text-1')})]){
  const f=fixture(t),before=f.bytes();change(f);assert.throws(()=>f.save(),e=>e.status===422);assert.deepEqual(f.bytes(),before);assert.equal(fs.existsSync(f.protocol),false);
 }
});
test('Inhaltsänderung setzt Freigabe zurück und protokolliert Urheber, Zeitpunkt, alt und neu',t=>{
 const f=fixture(t);object(f,'text-1').text='Neu';const result=f.save(),after=f.read(),entry=JSON.parse(fs.readFileSync(f.protocol,'utf8'));
 assert.equal(result.changed,true);assert.notEqual(result.checksum,f.source.checksum);assert.deepEqual(after.master.json.freigabe,{status:'offen',am:'2026-10-24T12:00:00.000Z',von:'merchant:123'});assert.equal(entry.actor,'merchant:123');assert.equal(entry.changes[0].from.text,'Alpha');assert.equal(entry.changes[0].to.text,'Neu');assert.equal(entry.freigabe.from.status,'freigegeben');
});
for(const file of ['design.json','design.svg'])test('409 erkennt parallele Änderung in '+file,t=>{
 const f=fixture(t);object(f,'text-1').text='Neu';fs.appendFileSync(path.join(f.dir,file),' ');const before=f.bytes();assert.throws(()=>f.save(),e=>e.status===409);assert.deepEqual(f.bytes(),before);assert.equal(fs.existsSync(f.protocol),false);
});
for(const index of [1,2])test('Fehler vor Ersetzung '+index+' rollt JSON, SVG und Log auf dieselben Originalbytes zurück',t=>{
 const f=fixture(t);fs.writeFileSync(f.protocol,'{"earlier":true}\n');const before=f.bytes(),log=fs.readFileSync(f.protocol);object(f,'text-1').text='Neu';
 assert.throws(()=>saveTemplateWriteback(f.root,{...f.args,beforeReplace:(_relative,n)=>{if(n===index)throw Error('injected');}}),/injected/);
 assert.deepEqual(f.bytes(),before);assert.deepEqual(fs.readFileSync(f.protocol),log);assert.equal(fs.readdirSync(path.join(f.root,'designs')).some(n=>n.startsWith('.werkstatt')),false);
});
test('Gemeinsame Sperre verhindert konkurrierende Editor- und Metadatenänderungen',t=>{
 const f=fixture(t);withKatalogWriteLock(f.root,()=>{assert.throws(()=>f.save(),e=>e.status===409);assert.throws(()=>patchDesign(f.root,{reihe:'test',designId:'D1',name:'Geändert'}),e=>e.status===409);});
 assert.equal(f.save().changed,false);
});
test('Journal stellt nach Prozessabbruch zwischen JSON und SVG die ursprünglichen Bytes wieder her',t=>{
 const f=fixture(t),before=f.bytes(),url=pathToFileURL(fileURLToPath(new URL('./katalog-transaction.mjs',import.meta.url))).href;
 const code='import {withKatalogWriteLock,writeKatalogTransaction} from '+JSON.stringify(url)+';withKatalogWriteLock('+JSON.stringify(f.root)+',root=>writeKatalogTransaction(root,[{relative:"designs/test/D1/design.json",text:"{}"},{relative:"designs/test/D1/design.svg",text:"<svg/>"},{relative:"designs/test/_aenderungen.jsonl",text:"{}\\n"}],{beforeReplace:(p,i)=>{if(i===1)process.exit(7);}}));';
 const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});assert.equal(child.status,7,child.stderr);assert.notDeepEqual(f.bytes(),before);
 assert.equal(katalogFor(f.root,{maxAgeMs:0}).designs.masters.find(d=>d.id==='D1').json.texts[0].text,'Alpha');assert.deepEqual(f.bytes(),before);assert.equal(fs.existsSync(f.protocol),false);assert.equal(fs.readdirSync(path.join(f.root,'designs')).some(n=>n.startsWith('.werkstatt')),false);
});
test('Pfadausbruch, absolute Kennungen und Alternate-Stream-Namen sind gesperrt',t=>{
 const f=fixture(t);for(const value of ['..','../test','/test','C:\\test','D1:stream','D1.'])assert.throws(()=>readDesignEditSource(f.root,{reihe:'test',designId:value}),e=>e.status===422);
});
test('Symlink/Junction als Designordner ist gesperrt',t=>{
 const f=fixture(t),real=path.join(f.root,'real');fs.renameSync(f.dir,real);
 try{fs.symlinkSync(real,f.dir,process.platform==='win32'?'junction':'dir');}catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e.code)){t.skip('Dateisystem erlaubt hier keine Links.');return;}throw e;}
 assert.throws(()=>f.read(),e=>e.status===422);fs.unlinkSync(f.dir);fs.renameSync(real,f.dir);

});
test('Textmessung und Glyphen verwenden dieselbe negative Laufweite und Anker je Zeile',()=>{
 const o={text:'Alpha\nA',font:'Test',size:4,letterSpacing:-.1,textAnchor:'start'};measureText(o,fonts);assert.equal(o.w,11.6);const svg=textPaths(o,fonts);assert.equal([...svg.matchAll(/translate\(-1450 0\)/g)].length,2);
 o.textAnchor='end';assert.match(textPaths(o,fonts),/translate\(850 0\)/);assert.throws(()=>measureText({...o,letterSpacing:-11},fonts),/Zeichenabstand/);
});

test('Vorhandene Motivtranslation, Strich und Füllregel bleiben beim uniformen Skalieren erhalten',t=>{
 const f=fixture(t);let svg=f.source.master.svgText.replace('<g id="motiv-1">','<g id="motiv-1" transform="translate(2 3)">').replace('fill-rule="evenodd" d=','fill-rule="evenodd" stroke="#000000" stroke-width="0.4" d=');
 const master={...f.source.master,svgText:svg},original=katalogDesignToTemplate(master,family,null,{fonts,svgText:svg}).template,template=structuredClone(original),o=template.objects.find(o=>o.id==='motiv-1');o.w*=2;o.h*=2;o.x+=1;
 const p=planTemplateWriteback({master,originalTemplate:original,template,fonts}),m=p.json.motifs[0],layer=parseDesignSvg(p.svgText).layers.find(l=>l.id==='motiv-1');
 // #139: layer.bounds includes the visible stroke; source path coordinates do not.
 assert.deepEqual(pathBounds(layer.paths[0]),[8,10.5,20,10]);assert.equal(m.paths[0].strokeMm,.8);assert.equal(layer.pathAttributes[0].strokeMm,.8);assert.equal(layer.pathAttributes[0].evenodd,true);assert.deepEqual(m.box,pathBounds(layer.paths[0]));
 assert.deepEqual(layer.bounds,[6.4,8.9,23.2,13.2]);
 const round=katalogDesignToTemplate({...master,json:p.json},family,null,{fonts,svgText:p.svgText}).template.objects.find(v=>v.id===o.id);
 for(const key of ['x','y','w','h'])assert.ok(Math.abs(round[key]-o[key])<.001,key+' survives stroked roundtrip');
});
test('Mehrfach verknüpfte Quelldatei wird vor jedem Schreiben gesperrt',t=>{
 const f=fixture(t),extra=path.join(f.root,'extra.json');try{fs.linkSync(path.join(f.dir,'design.json'),extra);}catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e.code)){t.skip('Dateisystem erlaubt hier keine Hardlinks.');return;}throw e;}
 assert.throws(()=>f.read(),e=>e.status===422);fs.unlinkSync(extra);
});

test('139: round caps, joins and opacity survive stroked motif writeback',t=>{
 const f=fixture(t),svg=f.source.master.svgText.replace('fill-rule="evenodd" d=','fill-rule="evenodd" stroke="#000000" stroke-width="0.4" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" opacity="0.5" d=');
 const master={...f.source.master,svgText:svg},original=katalogDesignToTemplate(master,family,null,{fonts,svgText:svg}).template,template=structuredClone(original);
 template.objects.find(o=>o.id==='motiv-1').x+=2;
 const plan=planTemplateWriteback({master,originalTemplate:original,template,fonts}),paint=parseDesignSvg(plan.svgText).layers.find(l=>l.id==='motiv-1').pathAttributes[0];
 assert.equal(paint.linecap,'round');assert.equal(paint.linejoin,'round');assert.equal(paint.miterlimit,10);assert.equal(paint.opacity,.5);
});

test('Quell-Zeilenabstand 6,81 mm bleibt beim Textedit erhalten; leere Zeile und Leerzeichen überleben den Rundlauf',t=>{
 const f=fixture(t),svg=f.source.master.svgText.replace('font-size="4"','font-size="5.29"').replace('<tspan x="30" dy="0">Alpha</tspan>','<tspan x="30" dy="0">Alpha</tspan><tspan x="30" dy="6.81">Beta</tspan>'),master={...f.source.master,svgText:svg};
 const original=katalogDesignToTemplate(master,family,null,{fonts,svgText:svg}).template,template=structuredClone(original),o=template.objects.find(o=>o.id==='text-1');assert.ok(Math.abs(o.lineHeight-6.81)<1e-8);o.text='Gamma\nBeta';
 const p=planTemplateWriteback({master,template,originalTemplate:original,fonts}),layer=parseDesignSvg(p.svgText).layers.find(l=>l.id==='text-1');assert.equal(p.json.texts[0].lineHeightMm,6.81);assert.ok(Math.abs(layer.lineHeight-6.81)<1e-8);assert.equal(layer.y,30);assert.equal(layer.text,'Gamma\nBeta');
 o.text=' Gamma \n\nBeta';const empty=planTemplateWriteback({master,template,originalTemplate:original,fonts}),parsed=parseDesignSvg(empty.svgText).layers.find(l=>l.id==='text-1');assert.equal(parsed.text,o.text);assert.equal(parsed.lines,3);assert.ok(Math.abs(parsed.lineHeight-6.81)<1e-8);
 const again=katalogDesignToTemplate({...master,json:empty.json},family,null,{fonts,svgText:empty.svgText}).template.objects.find(o=>o.id==='text-1');assert.equal(again.text,o.text);assert.ok(Math.abs(again.y-o.y)<.001);assert.ok(Math.abs(again.h-(5.29*1.2+2*6.81))<1e-7);
});

function withTargets(f){
 const file=path.join(f.dir,'design.json'),json=JSON.parse(fs.readFileSync(file));json.ziele=[{familie:'steel-a',freigabe:{status:'freigegeben',am:'2026-10-23T10:00:00Z',von:'team:a'}},{familie:'acrylic-b',freigabe:{status:'freigegeben',am:'2026-10-23T11:00:00Z',von:'team:b'}},{familie:'slate-c',freigabe:null}];fs.writeFileSync(file,JSON.stringify(json,null,1)+'\n');f.args.checksum=f.read().checksum;return json.ziele;
}
test('M: unchanged content retains every independent target approval byte for byte',t=>{
 const f=fixture(t),targets=withTargets(f),before=f.bytes();assert.equal(f.save().changed,false);assert.deepEqual(f.bytes(),before);assert.deepEqual(f.read().master.json.ziele,targets);assert.equal(fs.existsSync(f.protocol),false);
});
test('M: content edit resets all targets and audits their previous independent actors',t=>{
 const f=fixture(t),before=withTargets(f);object(f,'text-1').text='Neu';f.save();const after=f.read().master.json.ziele,entry=JSON.parse(fs.readFileSync(f.protocol));assert.deepEqual(after.map(t=>t.familie),before.map(t=>t.familie));for(const t of after)assert.deepEqual(t.freigabe,{status:'offen',am:'2026-10-24T12:00:00.000Z',von:'merchant:123'});assert.deepEqual(entry.zielFreigaben,{from:before,to:after});
});
test('M: failed write restores content and every target approval together',t=>{
 const f=fixture(t);withTargets(f);const before=f.bytes();object(f,'text-1').text='Neu';assert.throws(()=>saveTemplateWriteback(f.root,{...f.args,beforeReplace:(_file,n)=>{if(n===2)throw Error('rollback-targets');}}),/rollback-targets/);assert.deepEqual(f.bytes(),before);assert.equal(fs.existsSync(f.protocol),false);
});
