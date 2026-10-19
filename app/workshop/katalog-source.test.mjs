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
 assert.match(k.files.get('familie:test-schilder'),/familien\/edelstahl\/test-schilder\.json$/);
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
