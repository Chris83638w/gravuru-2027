import test from 'node:test';import assert from 'node:assert/strict';
import {pickStarts,duplicateReport,zielgruppe,slug,parseArgs} from './shop-schnitt-plan.mjs';
test('Startdesigns: je Zielgruppe die kleinste Nummer, --anzahl begrenzt',()=>{
 const d=(id,g)=>({id,name:'Grabstecker Herz M · '+g+' · Klein'});
 const list=[d('X-D1','Mama'),d('X-D2','Mama'),d('X-D11','Hund')];
 assert.deepEqual(pickStarts(list).map(p=>[p.group,p.design.id]),[['Mama','X-D1'],['Hund','X-D11']]);
 assert.equal(pickStarts(list,{je:'anzahl',anzahl:1}).length,1);
 assert.equal(zielgruppe({name:'ohne Gliederung'}),null);assert.equal(slug('Oma/Opa für Grüße'),'oma-opa-fuer-gruesse');
});
test('Duplicate Content: gemeinsame Fünfwortfolgen und gleiche Felder werden gemeldet',()=>{
 const a={handle:'a',title:'A',seoTitle:'S',seoDescription:'x',descriptionHtml:'<p>eins zwei drei vier fünf sechs</p>'};
 const b={handle:'b',title:'B',seoTitle:'S',seoDescription:'y',descriptionHtml:'<p>eins zwei drei vier fünf anders</p>'};
 const r=duplicateReport([a,b]);assert.deepEqual(r.pairs,[{a:'a',b:'b',shared:1}]);assert.deepEqual(r.sameFields,[{field:'seoTitle:S',handles:['a','b']}]);
});
test('Aufruf: Pflichtangaben und keine unbekannten Schalter',()=>{
 assert.throws(()=>parseArgs(['--katalog=k']),/Pflicht/);assert.throws(()=>parseArgs(['--x']),/Unbekannt/);
 assert.equal(parseArgs(['--katalog=k','--linie=l','--unterkategorie=u','--output=o','--form']).form,true);
});
