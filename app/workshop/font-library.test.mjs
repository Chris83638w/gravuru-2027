import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createFontLibrary,convertFont,missingGlyphs,REQUIRED_GLYPHS} from './font-library.mjs';
import {importEnvironment} from './design-assets.mjs';

// Real font from the repository (Michroma covers umlauts, ß, € and digits); a subset without
// Ä/Ö/Ü/ä/ö/ü/ß/€ is built with fontTools for the negative case.
const michroma=fileURLToPath(new URL('../designs/aosu-labrador/assets/Michroma-Regular.ttf',import.meta.url));
const python=process.env.GRAVURU_PYTHON||'python3',env=importEnvironment();
const available=spawnSync(python,['-c','import fontTools.subset'],{env,windowsHide:true}).status===0;
const fontTest=(name,fn)=>test(name,{skip:!available?'Python 3 mit fontTools nicht verfügbar':false},fn);
function subsetWithoutUmlauts(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'font-subset-')),out=path.join(dir,'ascii-only.ttf');
 const r=spawnSync(python,['-c',"import sys;from fontTools import subset;subset.main([sys.argv[1],'--output-file='+sys.argv[2],'--unicodes=U+0020-007E','--no-layout-closure'])",michroma,out],{env,windowsHide:true,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 return {bytes:fs.readFileSync(out).toString('base64'),cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}

test('required characters are the agreed set and the resource fallback reports every gap',()=>{
 assert.equal(REQUIRED_GLYPHS.length,75);for(const c of 'ÄÖÜäöüß€0123456789AZaz.,-\' ')assert.ok(REQUIRED_GLYPHS.includes(c),c);
 assert.deepEqual(missingGlyphs({regular:{glyphs:Object.fromEntries([...REQUIRED_GLYPHS].filter(c=>!'Äß€'.includes(c)).map(c=>[c,{a:1,d:''}]))}}),['Ä','ß','€']);
 assert.equal(missingGlyphs(null).length,75);
});

fontTest('font-import.py reports missing glyphs from the cmap; a complete font has none',async()=>{
 const complete=await convertFont(fs.readFileSync(michroma).toString('base64'));
 assert.match(complete.name,/^Michroma/);assert.deepEqual(complete.missingGlyphs,[]);assert.ok(complete.glyphCount>400);
 const subset=subsetWithoutUmlauts();
 try{const partial=await convertFont(subset.bytes);assert.deepEqual(partial.missingGlyphs,['Ä','Ö','Ü','ä','ö','ü','ß','€']);assert.ok(Object.hasOwn(partial.font.regular.glyphs,'A'));assert.ok(!Object.hasOwn(partial.font.regular.glyphs,'Ä'));}
 finally{subset.cleanup();}
});

fontTest('E4: a font without Ä/Ö/Ü/ß/€ is refused with the list of missing characters; an explicit reason accepts it with glyphWarnings',async t=>{
 const library=createFontLibrary({filename:':memory:'});t.after(()=>library.close());
 const subset=subsetWithoutUmlauts();t.after(subset.cleanup);
 await assert.rejects(library.import({name:'ascii-only.ttf',bytes:subset.bytes}),/Schrift fehlt: Ä, Ö, Ü, ä, ö, ü, ß, €\./);
 await assert.rejects(library.import({name:'ascii-only.ttf',bytes:subset.bytes,allowMissing:true}),/begründen/);
 assert.equal(library.list().length,0,'refused fonts are not stored');
 const complete=await library.import({name:'Michroma-Regular.ttf',bytes:fs.readFileSync(michroma).toString('base64')});
 assert.deepEqual(complete.missingGlyphs,[]);assert.deepEqual(complete.glyphWarnings,[]);
 const partial=await library.import({name:'ascii-only.ttf',bytes:subset.bytes,allowMissing:true,reason:'Nur für Hausnummern (Ziffern)'});
 assert.deepEqual(partial.missingGlyphs,['Ä','Ö','Ü','ä','ö','ü','ß','€']);assert.equal(partial.glyphWarnings[0],'Schrift fehlt: Ä, Ö, Ü, ä, ö, ü, ß, € · Begründung: Nur für Hausnummern (Ziffern)');
 const listed=library.list().find(f=>f.sha256===partial.sha256);assert.deepEqual(listed,partial);
});

test('existing fonts stored before the glyph check are not locked – the listing only warns',()=>{
 // Simulate an older library (table without missing_glyphs/glyph_note); the stored resource lacks ß and €.
 const glyphs=Object.fromEntries([...REQUIRED_GLYPHS].filter(c=>!'ß€'.includes(c)).map(c=>[c,{a:500,d:'M0 0'}]));
 const filename=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'font-legacy-')),'fonts.sqlite');
 const raw=new DatabaseSync(filename);
 raw.exec("CREATE TABLE workshop_fonts (sha256 TEXT PRIMARY KEY,id TEXT UNIQUE NOT NULL,name TEXT NOT NULL,glyph_count INTEGER NOT NULL,original BLOB NOT NULL,resource TEXT NOT NULL)");
 raw.prepare('INSERT INTO workshop_fonts VALUES (?,?,?,?,?,?)').run('c'.repeat(64),'Alt · cccccccccccc','Alt',73,Buffer.from('x'),JSON.stringify({regular:{units:1000,glyphs}}));raw.close();
 const upgraded=createFontLibrary({filename});
 const [row]=upgraded.list();assert.equal(row.id,'Alt · cccccccccccc');assert.deepEqual(row.missingGlyphs,['ß','€']);assert.deepEqual(row.glyphWarnings,['Schrift fehlt: ß, €']);
 assert.equal(Object.keys(upgraded.resources()).length,1,'still listed and usable');upgraded.close();
 fs.rmSync(path.dirname(filename),{recursive:true,force:true});
});
