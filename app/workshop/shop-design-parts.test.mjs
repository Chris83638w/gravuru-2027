// Auftrag #265, Stufe 2 (Chris 20.11.2026): Für ein weiteres Design schickt der Server nur die Design-Teile.
// Im Browser in das eigene Startmodell eingesetzt, muss genau das Modell entstehen, das `model?design=` liefert.
import test from 'node:test';
import assert from 'node:assert/strict';
import {shopStartModel,shopDesignParts,shopDesignBase} from './shop-start-model.mjs';
import {universalWithDesignParts} from './ui/shop-design-switch.mjs';
import {prepareConfig} from '../configurator/variant-m/contract.mjs';
import {adoptDesignModel} from '../configurator/variant-m/design-adoption.mjs';
import {doorSignModel} from './test-fixtures/door-sign-all-sizes.mjs';

function setup(change=()=>{}){
 const model=doorSignModel();change(model);
 const f=model.universal.familyFormats,start=f.defaultSize,first='ts-'+start+'-1',second='ts-'+start+'-2';
 return {model,first,second,a:shopStartModel(model,first).universal,b:shopStartModel(model,second).universal};
}
// Wie über die Leitung: die Teile kommen als JSON an.
const sent=universal=>JSON.parse(JSON.stringify(shopDesignParts(universal)));
// Wie die Trennlinie der Werkstattvorlage „Zwei Zeilen mit Trennlinie“ (siehe design-adoption.test.mjs).
const TEMPLATE_MOTIF={key:'vorlage-linie',embeddedOnly:true,bounds:[7,24.552,66,0.379],svgFragment:'<path d="M 7.000 24.552 L 73.000 24.552 L 73.000 24.931 L 7.000 24.931 Z" fill="currentColor" fill-rule="evenodd"/>'};
const withMotif=model=>{
 model.universal.localResources.motifs=[...(model.universal.localResources.motifs||[]),TEMPLATE_MOTIF];
 for(const d of model.universal.familyFormats.designs)if(d.id.endsWith('-2'))d.objects.push({id:'linie',type:'motif',motif:TEMPLATE_MOTIF.key,x:d.objects[0].x,y:d.objects[0].y,w:10,h:0.5,rotation:0});
};

test('Design-Teile, in das Startmodell eingesetzt, ergeben genau das Modell des anderen Designs (in beide Richtungen)',()=>{
 const s=setup();
 assert.deepEqual(universalWithDesignParts(structuredClone(s.a),sent(s.b),s.second),s.b);
 assert.deepEqual(universalWithDesignParts(structuredClone(s.b),sent(s.a),s.first),s.a);
 // Die Teile sind deutlich kleiner als das Modell und enthalten keine Preis-, Größen- oder Materialangaben.
 const parts=sent(s.b);
 assert.deepEqual(Object.keys(parts).sort(),['designId','designIds','familyDesigns','motifs','profileDesigns','rights','shopProduct','themeId']);
 assert.ok(JSON.stringify(parts).length*4<JSON.stringify(s.b).length);
 assert.equal(/basePriceCents|priceCents|quantityTiers|"material"|"mounting"/.test(JSON.stringify(parts)),false);
 assert.deepEqual(parts.designIds.length,s.b.familyFormats.formats.length);
});

test('eingebettete Vorlagenmotive wandern mit den Teilen; auch nach einer früheren Übernahme entsteht dasselbe Modell',()=>{
 const s=setup(withMotif);
 assert.equal(s.a.localResources.motifs.some(m=>m.key===TEMPLATE_MOTIF.key),false);
 assert.equal(sent(s.b).motifs.some(m=>m.key===TEMPLATE_MOTIF.key),true);
 assert.deepEqual(universalWithDesignParts(structuredClone(s.a),sent(s.b),s.second),s.b);
 // Der laufende Editor hat das zweite Design schon aufgenommen; das erste lässt sich daraus wieder exakt herstellen.
 const device=structuredClone(s.a);adoptDesignModel(device,structuredClone(s.b),s.second);
 assert.equal(device.localResources.motifs.some(m=>m.key===TEMPLATE_MOTIF.key),true);
 assert.deepEqual(universalWithDesignParts(device,sent(s.a),s.first),s.a);
 assert.deepEqual(universalWithDesignParts(device,sent(s.b),s.second),s.b);
});

test('die Übernahme im Editor endet mit Teilen im selben Zustand wie mit dem vollständigen Modell',()=>{
 const s=setup(withMotif);
 const full=prepareConfig(structuredClone(s.a)),slim=prepareConfig(structuredClone(s.a));
 const registered=[[],[]];
 assert.equal(adoptDesignModel(full,prepareConfig(structuredClone(s.b)),s.second,m=>registered[0].push(...m.map(x=>x.key))),true);
 assert.equal(adoptDesignModel(slim,prepareConfig(universalWithDesignParts(structuredClone(s.a),sent(s.b),s.second)),s.second,m=>registered[1].push(...m.map(x=>x.key))),true);
 assert.deepEqual(slim,full);assert.deepEqual(registered[1],registered[0]);assert.deepEqual(registered[0],[TEMPLATE_MOTIF.key]);
});

test('der Fingerabdruck ist für alle Designs desselben Produktstands gleich und ändert sich mit jeder anderen Angabe',()=>{
 const s=setup(),base=shopDesignBase(s.a);
 assert.match(base,/^[a-f0-9]{64}$/);assert.equal(shopDesignBase(s.b),base);
 // Reihenfolge des Aufbaus spielt keine Rolle: zweimal dasselbe Modell, derselbe Fingerabdruck.
 assert.equal(shopDesignBase(setup().b),base);
 const changes=[
  u=>{u.basePriceCents+=1;},
  u=>{u.quantityTiers=[...(u.quantityTiers||[]),{min:50,percent:5}];},
  u=>{u.familyFormats.formats[0].variants[0].basePriceCents+=1;},
  u=>{u.familyFormats.formats[0].variants[0].mounting=[];},
  u=>{u.familyFormats.formats[0].geometry={...u.familyFormats.formats[0].geometry,changed:true};},
  u=>{u.familyFormats.defaultSize='anders';},
  u=>{u.profile.optionGroups[0].values[0].priceCents=5;},
  u=>{u.profile.material={...u.profile.material,changed:true};},
  u=>{u.textRules={...u.textRules,changed:true};},
  u=>{u.localResources.fonts={...u.localResources.fonts,neu:{}};},
  u=>{u.localResources.motifs=[...(u.localResources.motifs||[]),{key:'frei',svgFragment:'<path d="M0 0h1v1z"/>',bounds:[0,0,1,1]}];}
 ];
 for(const change of changes){const u=structuredClone(s.b);change(u);assert.notEqual(shopDesignBase(u),base,String(change));}
 // Nur die Design-Teile dürfen sich unterscheiden.
 const only=structuredClone(s.b);only.profile.designs[0].name='anderer Name';only.familyFormats.designs[0].objects[0].text='x';only.workshopElementRights={};
 assert.equal(shopDesignBase(only),base);
});

test('unvollständige oder fremde Teile werden nicht eingesetzt',()=>{
 const s=setup(),good=sent(s.b);
 const broken=[
  null,{},{...good,designId:s.first},{...good,profileDesigns:[]},{...good,profileDesigns:'x'},{...good,familyDesigns:null},{...good,motifs:null},
  {...good,designIds:good.designIds.slice(1)},{...good,designIds:good.designIds.map((l,i)=>i?l:[...l,[]])},{...good,designIds:good.designIds.map((l,i)=>i?l:l.map(()=>[7]))},{...good,designIds:good.designIds.map((l,i)=>i?l:'x')}
 ];
 for(const parts of broken)assert.throws(()=>universalWithDesignParts(structuredClone(s.a),parts,s.second),/bisherigen Weg/);
 assert.throws(()=>universalWithDesignParts(structuredClone(s.a),good,s.first),/bisherigen Weg/);
 assert.throws(()=>universalWithDesignParts({profile:{}},good,s.second),/bisherigen Weg/);
 const noResources=structuredClone(s.a);delete noResources.localResources;
 assert.throws(()=>universalWithDesignParts(noResources,{...good,motifs:[TEMPLATE_MOTIF]},s.second),/bisherigen Weg/);
 // Das eigene Modell bleibt dabei unverändert.
 const own=structuredClone(s.a),before=JSON.stringify(own);universalWithDesignParts(own,good,s.second);assert.equal(JSON.stringify(own),before);
});
