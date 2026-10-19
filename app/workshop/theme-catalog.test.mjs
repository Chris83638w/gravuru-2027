import test from 'node:test';
import assert from 'node:assert/strict';
import {readThemeCatalog,parseThemeCatalog,findTheme} from './theme-catalog.mjs';

const fixture=new URL('../configurator/variant-m/fixtures/themen.json',import.meta.url);
test('themen.json: Datei wird gelesen und geprüft; fehlende Datei und ungültige Struktur melden deutsch',()=>{
 const themes=readThemeCatalog(fixture);
 assert.deepEqual(themes.map(t=>t.id),['tiergedenktafeln','namensschilder','firmenschilder']);
 assert.deepEqual(findTheme(themes,'Namensschilder').fontSet,['Michroma','Lato']);
 assert.throws(()=>readThemeCatalog('/gibt/es/nicht/themen.json'),/nicht lesbar/);
 assert.throws(()=>parseThemeCatalog({themes:[{id:'ok',name:''}]}),/Namen/);
 assert.throws(()=>parseThemeCatalog({themes:[{id:'Nicht gültig',name:'x'}]}),/Themen-ID/);
 assert.deepEqual(parseThemeCatalog([{id:'a',name:'A'}]),[{id:'a',name:'A',fontSet:[],motifCategories:[],designTags:[]}]);
});
