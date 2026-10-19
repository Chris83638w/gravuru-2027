// K14 / Ü12.1: bedingte Optionsgruppen (visibleIf) und Zusatzfelder ohne Vorschau.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prepareConfig,resolvedOptions,quote,validateDesign,saveDraft,readDraft,selectedProfile,missingRequiredFields,optionFieldEntries,choiceOptions,variantCombinations,visibleGroups} from './contract.mjs';
import {commercePrice,validateCommerce,variantKey} from './commerce-model.mjs';
import {summaryRows} from './mobile-steps.mjs';
import {fieldAttributes,prepareCartRequest} from '../../workshop/storefront-cart.mjs';

const native=JSON.parse(fs.readFileSync(new URL('./fixtures/native-profile.json',import.meta.url),'utf8'));
const SPACERS=['B02-AH02','B04-AH04'];
function setup(){
 const profile=structuredClone(native);profile.defaultDesignId=profile.designs[0].id;
 // Abstandshalter-Farbe nur, wenn eine Befestigung mit Abstandshaltern gewählt ist.
 profile.optionGroups.push({id:'spacer-color',name:'Abstandshalter-Farbe',required:true,defaultValueId:'silber',visibleIf:{groupId:'mounting',valueIds:SPACERS},
  values:[{id:'silber',label:'Silber',priceCents:0,currency:'EUR'},{id:'schwarz',label:'Schwarz',priceCents:150,currency:'EUR'}]});
 profile.optionFields=[
  {id:'kordel',kind:'select',label:'Kordel',choices:[{id:'rot',label:'Rot',priceCents:200},{id:'natur',label:'Natur'}],visibleIf:{groupId:'mounting',valueIds:['OHNE']}},
  {id:'kordel-laenge',kind:'text',label:'Kordellänge',maxLength:12,visibleIf:{groupId:'kordel',valueIds:['rot']}},
  {id:'montage',kind:'date',label:'Wunschtermin Montage',required:true,visibleIf:{groupId:'mounting',valueIds:SPACERS},note:'Nur für Abstandshalter.'},
  {id:'hinweis',kind:'text',label:'Hinweis an die Werkstatt',priceCents:0},
  {id:'geschenk',kind:'checkbox',label:'Als Geschenk verpacken',priceCents:390},
  {id:'freigabe',kind:'checkbox',label:'Schreibweise geprüft',required:true}];
 return prepareConfig({profile,basePriceCents:2999,extraMotifCents:169,photo:{enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:999}});
}
const config=setup(),design=config.profile.designs[0];
const unpack=(prefix,count)=>{
 const joined=Array.from({length:count},(_,i)=>fs.readFileSync(new URL('../../designs/aosu-labrador/runtime/'+prefix+String(i).padStart(2,'0')+'.txt',import.meta.url),'utf8')).join('');
 return JSON.parse(joined.startsWith('{')?joined:gunzipSync(Buffer.from(joined,'base64')).toString());
};
const catalog=unpack('gravuru-catalog-51fa7e857d52-part-',14);
const fonts={...catalog.fonts,...unpack('gravuru-entwurf-fonts-',16)};
const motifs=[...Object.entries(catalog.motifs).map(([key,svgFragment])=>({key,svgFragment,bounds:[0,0,100,100]})),...unpack('gravuru-entwurf-motive-',21)];
const state=options=>({designId:design.id,objects:structuredClone(design.objects),mOptions:options});

test('Sichtbarkeit: bedingte Gruppe und Felder nur bei passender Wahl; Werte unsichtbarer werden verworfen',()=>{
 const off=resolvedOptions(config,{mounting:'B02','spacer-color':'schwarz',montage:'2026-11-02',kordel:'rot'});
 assert.deepEqual(off,{mounting:'B02'},'Abstandshalter-Farbe, Termin und Kordel unsichtbar → verworfen');
 const on=resolvedOptions(config,{mounting:'B02-AH02','spacer-color':'schwarz',montage:'2026-11-02'});
 assert.deepEqual(on,{mounting:'B02-AH02','spacer-color':'schwarz',montage:'2026-11-02'});
 assert.equal(resolvedOptions(config,{mounting:'B04-AH04'})['spacer-color'],'silber','sichtbar → Standardwert');
 // Ungültige Werte zählen nur, wenn sichtbar.
 assert.throws(()=>resolvedOptions(config,{mounting:'B02-AH02','spacer-color':'gold'}),/Ungültige Auswahl: Abstandshalter-Farbe/);
 assert.deepEqual(resolvedOptions(config,{mounting:'B02','spacer-color':'gold'}),{mounting:'B02'});
 // Kette: Kordellänge hängt an der Kordel, die an „Ohne Befestigung“ hängt.
 assert.deepEqual(resolvedOptions(config,{mounting:'OHNE',kordel:'rot','kordel-laenge':' 30 cm '}),{mounting:'OHNE',kordel:'rot','kordel-laenge':'30 cm'});
 assert.deepEqual(resolvedOptions(config,{mounting:'OHNE',kordel:'natur','kordel-laenge':'30 cm'}),{mounting:'OHNE',kordel:'natur'});
 assert.deepEqual(visibleGroups(config,{mounting:'B02'}).map(g=>g.id),['mounting']);
 assert.deepEqual(visibleGroups(config,{mounting:'B02-AH02'}).map(g=>g.id),['mounting','spacer-color']);
 assert.throws(()=>resolvedOptions(config,{fremd:'x'}),/Unbekannte Optionsgruppe/);
 // Bohrbild bleibt aus der sichtbaren Befestigung.
 assert.equal(selectedProfile(config,{mounting:'B02-AH02','spacer-color':'schwarz'}).geometry.holes.length,2);
});

test('Feldformate: Datum JJJJ-MM-TT, Zeichenlimit, eine Zeile, Ankreuzfeld ja/nein, leer = kein Wert',()=>{
 assert.throws(()=>resolvedOptions(config,{mounting:'B02-AH02',montage:'02.11.2026'}),/Datum im Format JJJJ-MM-TT/);
 assert.throws(()=>resolvedOptions(config,{mounting:'B02-AH02',montage:'2026-02-30'}),/Datum/);
 assert.throws(()=>resolvedOptions(config,{mounting:'OHNE',kordel:'rot','kordel-laenge':'1234567890123'}),/höchstens 12 Zeichen/);
 assert.throws(()=>resolvedOptions(config,{hinweis:'Zeile 1\nZeile 2'}),/eine Zeile/);
 assert.throws(()=>resolvedOptions(config,{geschenk:'ja'}),/ja oder nein/);
 assert.deepEqual(resolvedOptions(config,{hinweis:'   ',geschenk:false}),{mounting:'OHNE'});
 assert.equal(resolvedOptions(config,{geschenk:true}).geschenk,true);
});

test('Pflicht nur bei sichtbar; Entwurf darf unfertig sein',()=>{
 const base={mounting:'B02',freigabe:true};
 // Sichtbar und leer → Fehler mit Feldname; unsichtbar → keine Pflicht.
 assert.throws(()=>validateDesign(config,design,{...base,mounting:'B02-AH02'},fonts,motifs),/Bitte „Wunschtermin Montage“ angeben/);
 assert.deepEqual(missingRequiredFields(config,{...base,mounting:'B02-AH02'}).map(f=>f.id),['montage']);
 assert.deepEqual(missingRequiredFields(config,base),[]);
 assert.throws(()=>validateDesign(config,design,{mounting:'B02'},fonts,motifs),/Bitte „Schreibweise geprüft“ bestätigen/);
 // Entwurf (K7) und Vorlage dürfen offen sein; der Entwurf trägt die Feldwerte mit.
 const s=state({mounting:'B02-AH02',hinweis:'Bitte vorsichtig'});
 const draft=saveDraft(config,s,s.mOptions,fonts,motifs,{draft:true});
 assert.deepEqual(draft.options,{mounting:'B02-AH02','spacer-color':'silber',hinweis:'Bitte vorsichtig'});
 assert.deepEqual(readDraft(config,draft,fonts,motifs,{draft:true}).options,draft.options);
 assert.throws(()=>saveDraft(config,s,s.mOptions,fonts,motifs),/Wunschtermin Montage/);
 validateDesign(config,design,{mounting:'B02'},fonts,motifs,{template:true});
});

test('Preis nur bei sichtbar: Gruppe, Auswahlliste und Ankreuzfeld',()=>{
 const unit=o=>quote(config,[],design.id,o).unitCents;
 assert.equal(unit({mounting:'B02'}),2999+299);
 assert.equal(unit({mounting:'B02','spacer-color':'schwarz'}),2999+299,'unsichtbar → kein Aufpreis');
 assert.equal(unit({mounting:'B02-AH02','spacer-color':'schwarz'}),2999+898+150);
 assert.equal(unit({mounting:'OHNE',kordel:'rot'}),2999+200);
 assert.equal(unit({mounting:'B02',kordel:'rot'}),2999+299,'Kordel nur ohne Befestigung');
 assert.equal(unit({mounting:'B02',geschenk:true}),2999+299+390);
 const q=quote(config,[],design.id,{mounting:'OHNE',kordel:'rot',geschenk:true},2);
 assert.equal(q.fieldCents,590);assert.equal(q.totalCents,2*(2999+590));
 // Zusatzfelder sind keine Ausführung: Variantenschlüssel nur aus sichtbaren Gruppen.
 assert.equal(commercePrice(config,state({mounting:'B02',hinweis:'x',geschenk:true})).key,variantKey({mounting:'B02'}));
 const combos=variantCombinations(config);
 assert.equal(combos.length,6+2*2,'sechs Befestigungen ohne, zwei mit je zwei Farben – ohne Dubletten');
 assert.deepEqual(combos.filter(o=>o.mounting==='B02-AH02'),[{mounting:'B02-AH02','spacer-color':'silber'},{mounting:'B02-AH02','spacer-color':'schwarz'}]);
 assert.deepEqual(combos.find(o=>o.mounting==='B02'),{mounting:'B02'});
 assert.deepEqual(choiceOptions(config,{mounting:'B02',hinweis:'x'}),{mounting:'B02'});
});

test('Weitergabe: sichtbare Felder als Einträge für Warenkorb, Bestellung und Zusammenfassung',()=>{
 const options={mounting:'B02-AH02','spacer-color':'schwarz',montage:'2026-11-02',hinweis:'Hintereingang',geschenk:true,freigabe:true,kordel:'rot'};
 const entries=optionFieldEntries(config,options);
 assert.deepEqual(entries.map(e=>[e.label,e.display,e.priceCents]),[['Wunschtermin Montage','02.11.2026',0],['Hinweis an die Werkstatt','Hintereingang',0],['Als Geschenk verpacken','ja',390],['Schreibweise geprüft','ja',0]]);
 // Warenkorb-Eigenschaften: sichtbar unter der Bezeichnung, nie mit Unterstrich oder reserviertem Schlüssel.
 const attributes=fieldAttributes(entries.map(e=>({label:e.label,value:e.display})));
 assert.deepEqual(attributes[0],{key:'Wunschtermin Montage',value:'02.11.2026'});
 for(const bad of [[{label:'_intern',value:'x'}],[{label:'Bearbeiten',value:'x'}],[{label:'A',value:''}],[{label:'A',value:'x'},{label:'A',value:'y'}],[{label:'A',value:'x',extra:1}]])assert.throws(()=>fieldAttributes(bad),/Ungültige Zusatzangaben/);
 const offer={scope:'test-checkout-only',variantId:'1',quantity:1,unitCents:100,currency:'EUR',property:{name:'_gravuru_offer',value:'a'.repeat(64)},fields:[{label:'Wunschtermin Montage',value:'02.11.2026'}]};
 assert.deepEqual(prepareCartRequest(offer).variables.input.lines[0].attributes.at(-1),{key:'Wunschtermin Montage',value:'02.11.2026'});
 // Mobile-Zusammenfassung („Prüfen“): unsichtbare Gruppe fehlt, Felder erscheinen.
 const rows=Object.fromEntries(summaryRows({profile:config.profile,state:{mOptions:{mounting:'B02','spacer-color':'schwarz',hinweis:'Hintereingang'},objects:[]}}));
 assert.equal(rows.Optionen,'2 Bohrlöcher Ø 5 mm');assert.equal(rows['Hinweis an die Werkstatt'],'Hintereingang');
});

test('Schema: Bedingung zeigt nach oben auf vorhandene Werte, Feld-Kennungen eindeutig, Aufpreise in Cent',()=>{
 const broken=mutate=>{const profile=structuredClone(config.profile);mutate(profile);return ()=>prepareConfig({profile,basePriceCents:2999,extraMotifCents:169,photo:{enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:999}});};
 assert.throws(broken(p=>{p.optionFields[0].visibleIf={groupId:'kordel-laenge',valueIds:['x']};}),/weiter oben/);
 assert.throws(broken(p=>{p.optionFields[0].visibleIf={groupId:'mounting',valueIds:['FREMD']};}),/unbekannte Werte/);
 assert.throws(broken(p=>{p.optionGroups[1].visibleIf={groupId:'spacer-color',valueIds:['silber']};}),/weiter oben/);
 assert.throws(broken(p=>{p.optionFields[3].id='mounting';}),/eindeutige Kennung/);
 assert.throws(broken(p=>{p.optionFields[4].priceCents=null;}),/Aufpreis in ganzen Cent/);
 assert.throws(broken(p=>{p.optionFields[3].maxLength=0;}),/Zeichenlimit/);
 assert.throws(broken(p=>{p.optionFields[0].kind='farbe';}),/Art Text, Datum/);
 assert.throws(broken(p=>{p.optionFields[2].maxLength=10;}),/nur bei Textfeldern/);
 // Shop-Varianten: nur sichtbare Kombinationen; die Prüfung erwartet genau diese.
 const variants=variantCombinations(config).map((o,i)=>({id:String(i+1),key:variantKey(o),priceCents:quote(config,[],design.id,o).unitCents}));
 validateCommerce(config,{schema:'gravuru-shopify-commerce/v2',productId:'gid://shopify/Product/1',profileId:config.profile.id,revision:config.profile.revision,currency:'EUR',priceMode:'base-only',designIds:config.profile.designs.map(d=>d.id),variants});
});
