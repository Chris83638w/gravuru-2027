import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openKatalog,katalogPath,validateLine,readDesignFolder,FONT_SET_ALWAYS} from './katalog-source.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const copyFixture=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-'));fs.cpSync(FIXTURE,dir,{recursive:true});t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};

test('katalogPath: Argument vor Umgebung, sonst null',()=>{
 assert.equal(katalogPath({argv:['node','x','--katalog=/tmp/k'],env:{GRAVURU_KATALOG:'/env'}}),path.resolve('/tmp/k'));
 assert.equal(katalogPath({argv:[],env:{GRAVURU_KATALOG:'/env'}}),path.resolve('/env'));
 assert.equal(katalogPath({argv:[],env:{}}),null);
});

test('openKatalog liest Familien, Linien, Themen, Schriften, Sets, Motive und Designs aus dem Fixture',()=>{
 const k=openKatalog(FIXTURE);
 assert.deepEqual([...k.families.keys()],['test-schilder']);
 assert.equal(k.families.get('test-schilder').sizes.length,4);
 assert.ok(!('_file' in k.families.get('test-schilder')),'Familiendokument bleibt schemarein');
 assert.match(k.files.get('familie:test-schilder'),/familien[\\/]edelstahl[\\/]test-schilder\.json$/);
 assert.deepEqual([...k.lines.keys()],['test-linie']);
 assert.equal(k.lines.get('test-linie').subcategories.length,2);
 assert.deepEqual(k.themes.map(t=>t.id),['namensschilder','hundeschilder','gedenktafeln']);
 assert.equal(k.theme('hundeschilder').fontSet,'hundeschilder','fontSet im Katalog ist die Set-Kennung');
 assert.equal(k.fonts.list.size,4);assert.equal(k.fonts.list.get('Michroma').file,null,'Schriftdatei nicht im Fixture → null, nie erfunden');
 assert.deepEqual([...k.fonts.sets.keys()],['tuerschilder','hundeschilder','andenken']);
 assert.deepEqual(k.fontSet(k.lines.get('test-linie').subcategories[0]),{id:'tuerschilder',fonts:['Michroma','Lato','Cinzel','Montserrat']});
 assert.deepEqual(k.fontSet({fontSet:null},k.theme('hundeschilder')),{id:'hundeschilder',fonts:['Michroma','Lato','Montserrat']},'ohne eigenes Set gilt das Set des Themas');
 assert.deepEqual(k.fontSet({fontSet:null},null).fonts,[...FONT_SET_ALWAYS]);
 assert.equal(k.motifs.list.length,1);assert.match(k.motifs.svg('test-herz'),/<path/);
 assert.deepEqual(k.designs.masters.map(d=>d.id).sort(),['test-alt','test-foto','test-herz']);
 const herz=k.designs.masters.find(d=>d.id==='test-herz');
 assert.deepEqual(herz.plateMm,[90,60]);assert.deepEqual(herz.themes,['namensschilder','hundeschilder']);assert.equal(herz.bestseller,true);assert.deepEqual(herz.fields,{'text-2':{required:false,maxLength:24,maxLines:2}});
 assert.match(herz.svg(),/id="text-1"/);
 assert.deepEqual(k.designs.bestandLines,['test-bestand']);
 const bestand=k.designs.bestand('test-bestand');
 assert.equal(bestand.length,2);assert.equal(bestand[0].source,'bestand');assert.deepEqual(bestand[0].plateMm,[100,100]);assert.equal(bestand[0].themes,null,'Bestand ohne Thema');
 assert.equal(bestand[1].svgFile,null,'fehlender Designordner wird nicht erfunden');
});

test('Schriftressourcen: vorhandene Werkstattschriften zuerst, Katalogdatei über den Importer, sonst fehlend',async()=>{
 const k=openKatalog(FIXTURE),calls=[];
 const converter=async bytes=>{calls.push(bytes.length);return {font:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0'}}}},glyphCount:1};};
 const available={Montserrat:{regular:{units:1,glyphs:{}}}};
 const r=await k.fontResources(['Montserrat','Michroma','Cinzel'],{available,converter});
 assert.deepEqual(Object.keys(r.fonts),['Montserrat']);assert.deepEqual(r.missing,['Michroma','Cinzel']);assert.equal(calls.length,0,'ohne Datei kein Importaufruf');
 const r2=await k.fontResources(['Michroma'],{available:{},converter:null});assert.deepEqual(r2.missing,['Michroma']);
});

test('Fehler nennen die Datei und sind deutsch',t=>{
 const dir=copyFixture(t);
 const line=path.join(dir,'linien/test-linie.json'),doc=JSON.parse(fs.readFileSync(line,'utf8'));
 doc.subcategories[0].themeId='gibt-es-nicht';fs.writeFileSync(line,JSON.stringify(doc));
 assert.throws(()=>openKatalog(dir),e=>e.code==='katalog_invalid'&&e.file===line&&/unbekannte Thema „gibt-es-nicht“/.test(e.message));
 doc.subcategories[0].themeId='namensschilder';doc.subcategories[0].fontSet='fremd';fs.writeFileSync(line,JSON.stringify(doc));
 assert.throws(()=>openKatalog(dir),/unbekannte Schrift-Set „fremd“/);
 doc.subcategories[0].fontSet='tuerschilder';doc.subcategories[0].priceOverrides={sizes:{'TS-RE-90X60':12.5}};fs.writeFileSync(line,JSON.stringify(doc));
 assert.throws(()=>openKatalog(dir),/ganzen Cent oder null/);
 doc.subcategories[0].priceOverrides={};doc.families=['fehlt'];fs.writeFileSync(line,JSON.stringify(doc));
 assert.throws(()=>openKatalog(dir),/unbekannte Familie „fehlt“/);
 fs.writeFileSync(line,'{');
 assert.throws(()=>openKatalog(dir),/test-linie\.json: kein gültiges JSON/);
 fs.copyFileSync(path.join(FIXTURE,'linien/test-linie.json'),line);
 const family=path.join(dir,'familien/edelstahl/test-schilder.json'),fam=JSON.parse(fs.readFileSync(family,'utf8'));
 fam.sizes[0].baseCents=-1;fs.writeFileSync(family,JSON.stringify(fam));
 assert.throws(()=>openKatalog(dir),e=>e.file===family&&/Größe TS-RE-90X60 unvollständig/.test(e.message));
 fs.copyFileSync(path.join(FIXTURE,'familien/edelstahl/test-schilder.json'),family);
 const sets=path.join(dir,'schriften/sets.json');fs.writeFileSync(sets,JSON.stringify({sets:[{id:'ohne',name:'Ohne Lato',fonts:['Michroma']}]}));
 assert.throws(()=>openKatalog(dir),/Schrift-Set „ohne“ ohne „Lato“ \(Katalogregel 11\)/);
 fs.copyFileSync(path.join(FIXTURE,'schriften/sets.json'),sets);
 fs.writeFileSync(path.join(dir,'designs/3-2/test-herz/design.json'),JSON.stringify({id:'test-herz',themes:'namensschilder'}));
 assert.throws(()=>openKatalog(dir),/design\.json: themes ist eine Liste/);
 assert.throws(()=>openKatalog(path.join(dir,'gibt-es-nicht')),/Katalog-Ordner nicht gefunden/);
 assert.throws(()=>openKatalog(''),{code:'katalog_missing'});
 // Leere Familienliste ist zulässig (Status „Familie offen“), fremde Felder in priceOverrides nicht.
 validateLine({schema:'gravuru-line/v2',id:'offen',name:'Offen',families:[],subcategories:[]});
 assert.throws(()=>validateLine({schema:'gravuru-line/v2',id:'x',name:'X',families:[],subcategories:[{id:'a',name:'A',priceOverrides:{rabatt:{}}}]}),/kennt nur sizes, mounting, options/);
});

test('readDesignFolder nimmt das Plattenmaß aus design.json oder dem SVG-viewBox',t=>{
 const dir=copyFixture(t),folder=path.join(dir,'designs/3-2/test-foto');
 fs.writeFileSync(path.join(folder,'design.json'),JSON.stringify({id:'test-foto'}));
 assert.deepEqual(readDesignFolder(folder).plateMm,[90,60]);
 fs.rmSync(path.join(folder,'design.json'));
 const d=readDesignFolder(folder);assert.equal(d.id,'test-foto');assert.equal(d.themes,null);assert.deepEqual(d.plateMm,[90,60]);
 fs.writeFileSync(path.join(folder,'design.svg'),'<svg xmlns="http://www.w3.org/2000/svg"><text>x</text></svg>');
 assert.throws(()=>readDesignFolder(folder),/Plattenmaß fehlt/);
});


test('font cache uses file checksums across catalogues and refreshes metadata without reopening the catalogue',async t=>{
 const dir=copyFixture(t),other=copyFixture(t),filename=path.join(dir,'schriften/dateien/Michroma/Michroma-Regular.ttf'),otherFile=path.join(other,'schriften/dateien/Michroma/Michroma-Regular.ttf');
 for(const file of [filename,otherFile])fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(filename,'A');fs.writeFileSync(otherFile,'B');
 const a=openKatalog(dir),b=openKatalog(other);let calls=0;const converter=async bytes=>{calls++;const n=Buffer.from(bytes,'base64')[0];return {font:{regular:{units:1000,glyphs:{A:{a:n,d:'M0 0'}}}}};};
 const one=await a.fontResources(['Michroma'],{converter}),two=await b.fontResources(['Michroma'],{converter});assert.equal(one.fonts.Michroma.regular.glyphs.A.a,65);assert.equal(two.fonts.Michroma.regular.glyphs.A.a,66);assert.notEqual(one.versions.Michroma,two.versions.Michroma);assert.equal(calls,2);
 const stat=fs.statSync(filename);fs.writeFileSync(filename,'C');fs.utimesSync(filename,stat.atime,stat.mtime);const replaced=await a.fontResources(['Michroma'],{converter});assert.equal(replaced.fonts.Michroma.regular.glyphs.A.a,67,'same size and mtime never reuse stale glyphs');assert.equal(calls,3);
 const registry=path.join(dir,'schriften/schriften.json'),json=JSON.parse(fs.readFileSync(registry,'utf8'));json.fonts.find(f=>f.name==='Michroma').file='schriften/renamed.ttf';fs.writeFileSync(path.join(dir,'schriften/renamed.ttf'),'D');fs.writeFileSync(registry,JSON.stringify(json));
 assert.equal((await a.fontResources(['Michroma'],{converter})).fonts.Michroma.regular.glyphs.A.a,68,'same open catalogue observes new file mapping');assert.equal(calls,4);
 fs.rmSync(path.join(dir,'schriften/renamed.ttf'));assert.deepEqual((await a.fontResources(['Michroma'],{converter})).missing,['Michroma'],'removed font never served from warm cache');
});

test('font conversion coalesces concurrent requests, retries failures, and has bounded LRU retention',async t=>{
 const dir=copyFixture(t),file=path.join(dir,'schriften/dateien/Michroma/Michroma-Regular.ttf');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'first');const k=openKatalog(dir);let calls=0,failOnce=true;
 const converter=async bytes=>{calls++;await Promise.resolve();if(failOnce){failOnce=false;throw Error('temporary conversion failure');}return {font:{regular:{units:1000,glyphs:{A:{a:Buffer.from(bytes,'base64').length,d:'M0 0'}}}}};};
 await assert.rejects(k.fontResources(['Michroma'],{converter}),/temporary conversion failure/);
 const parallel=await Promise.all(Array.from({length:8},()=>k.fontResources(['Michroma'],{converter})));assert.equal(calls,2);assert.ok(parallel.every(r=>r.fonts.Michroma.regular.glyphs.A.a===5));
 for(let i=0;i<34;i++){fs.writeFileSync(file,'font-'+i);await k.fontResources(['Michroma'],{converter});}const prior=calls;fs.writeFileSync(file,'first');await k.fontResources(['Michroma'],{converter});assert.equal(calls,prior+1,'old font version evicted rather than retained forever');
});


test('a catalog font absent at open time becomes available without metadata change',async t=>{
 const dir=copyFixture(t),k=openKatalog(dir),file=path.join(dir,'schriften/dateien/Michroma/Michroma-Regular.ttf');let calls=0;const converter=async()=>{calls++;return {font:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0'}}}}};};
 assert.deepEqual((await k.fontResources(['Michroma'],{converter})).missing,['Michroma']);assert.equal(calls,0);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'now available');const added=await k.fontResources(['Michroma'],{converter});assert.deepEqual(added.missing,[]);assert.equal(added.fonts.Michroma.regular.glyphs.A.a,500);assert.equal(calls,1);
});


test('family targets are validated and explicit empty targets never inherit historical approval',t=>{
 const root=copyFixture(t),file=path.join(root,'designs/3-2/test-herz/design.json'),original=JSON.parse(fs.readFileSync(file,'utf8'));
 const write=ziele=>fs.writeFileSync(file,JSON.stringify({...original,freigabe:{status:'freigegeben',am:'2026-10-24',von:'123'},ziele}));
 write([]);let master=openKatalog(root).designs.masters.find(d=>d.id==='test-herz');assert.equal(master.released,false);assert.deepEqual(master.targets,[]);assert.equal(master.targetSource,'explicit');assert.equal(master.freigabe.status,'freigegeben','historical data is preserved without authority');
 write([{familie:'test-schilder',freigabe:{status:'freigegeben',am:'2026-10-24',von:'123'}}]);master=openKatalog(root).designs.masters.find(d=>d.id==='test-herz');assert.equal(master.released,true);assert.equal(master.targets[0].familie,'test-schilder');
 write([{familie:'missing',freigabe:null}]);assert.throws(()=>openKatalog(root),e=>e.file===file&&/Familie fehlt/.test(e.message));
 write([{familie:'test-schilder',freigabe:null},{familie:'test-schilder',freigabe:null}]);assert.throws(()=>readDesignFolder(path.dirname(file)),/doppelt/);
});
test('line execution choice is optional and validates only the existing product-or-variant declaration',()=>{
 const line={schema:'gravuru-line/v2',id:'line',name:'Linie',families:[],subcategories:[]};
 assert.equal(Object.hasOwn(validateLine(line),'ausfuehrungen'),false);
 for(const modus of ['produkte','varianten'])assert.deepEqual(validateLine({...line,ausfuehrungen:{modus}}).ausfuehrungen,{modus});
 for(const value of [null,[],{},'varianten',{modus:'automatic'},{modus:'produkte',material:'wood'}])assert.throws(()=>validateLine({...line,ausfuehrungen:value}),/ausfuehrungen/);
});
