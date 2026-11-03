import test from 'node:test';import assert from 'node:assert/strict';
import {pickStarts,duplicateReport,zielgruppe,slug,parseArgs,productSetInput} from './shop-schnitt-plan.mjs';
import {texts} from './shop-inhalte/tuerschilder.mjs';
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
test('door signs without target-group names still receive two different starters',()=>{
 const designs=[{id:'D1',name:'Leuchtturm'},{id:'D2',name:'Anker'}];
 assert.deepEqual(pickStarts(designs,{je:'anzahl',anzahl:2}).map(x=>x.design.id),['D1','D2']);
 assert.equal(pickStarts([designs[0],designs[0]],{je:'anzahl',anzahl:2}).length,1);
});
test('bounded batches are explicit and invalid CLI values fail before planning',()=>{
 const base=['--katalog=k','--linie=l','--unterkategorie=u','--output=o'];
 assert.equal(parseArgs(base).limit,100);assert.equal(parseArgs([...base,'--offset=100']).offset,100);
 for(const option of ['--limit=101','--limit=0','--offset=-1','--anzahl=0','--je=falsch'])assert.throws(()=>parseArgs([...base,option]),/Seriengrenzen/);
});
test('only available variants export, a one-value option is retained, inventory stays untracked and product remains draft',()=>{
 const variant=(size,available)=>({source:{sizeKey:size,mounting:'K00'},priceCents:1899,designAvailable:available,optionValues:[size,'Ohne Bohrung']});
 const plan={shopify:{options:['Größe','Befestigung'],plannedVariants:2,variants:[variant('S',true),variant('L',false)]}};
 const entry={handle:'test',productType:'Grabstecker',cut:{sizeKey:'S',themeId:'andenkenschilder',defaultDesignId:'D1'}};
 const out=productSetInput(entry,{title:'Test',tags:[]},plan);
 assert.equal(out.status,'DRAFT');assert.equal(out.variants.length,1);assert.equal(out.productOptions.length,1);
 assert.equal(out.variants[0].inventoryItem.tracked,false);assert.equal(out.variants[0].price,'18.99');
 assert.equal(out.variants[0].optionValues[0].name,'S');
});
test('door-sign identifiers include physical format, theme and exact starter without guessing source facts',()=>{
 const ctx={line:{id:'edelstahl-tuerschilder'},sub:{id:'namen',name:'Namensschilder'},family:{material:{kind:'steel',thicknessMm:1.5},groups:[{key:'AB',name:'Abgerundet'}]},size:{groupKey:'AB',widthMm:120,heightMm:80},design:{id:'D1',name:'Name <Haus>'}};
 const a=texts(ctx),b=texts({...ctx,design:{id:'D2',name:'Familie'}});
 assert.notEqual(a.handle,b.handle);assert.match(a.descriptionHtml,/1,?\.5 mm|1.5 mm/);assert.match(a.descriptionHtml,/&lt;Haus&gt;/);assert.doesNotMatch(a.descriptionHtml,/UV|Liefer|rostfrei/);
});
