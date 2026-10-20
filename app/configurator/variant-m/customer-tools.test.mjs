import test from 'node:test';
import assert from 'node:assert/strict';
import {customerLayoutIssue} from './contract.mjs';
import {showOverlapWarnings,centerTexts,motifScore,overlaps,overlapHints,mechanicalHints,hintKey,templateOverlap} from './customer-tools-model.mjs';
test('Mehrfachzentrierung erhält Höhe, Abstand, Drehung und gesperrte Texte',()=>{const objects=[{id:'a',type:'text',x:4,y:20,w:10,h:5,rotation:25},{id:'b',type:'text',x:25,y:35,w:10,h:5},{id:'locked',type:'text',x:7,uxLocked:true}];centerTexts(objects,['a','b','locked'],80);assert.deepEqual(objects.map(o=>o.x),[80,80,7]);assert.deepEqual(objects.slice(0,2).map(o=>o.y),[20,35]);assert.equal(objects[0].rotation,25);});
test('Motivsuche berücksichtigt verwandte deutsche und englische Begriffe und bevorzugt genaue Treffer',()=>{assert(motifScore({name:'Labrador',category:'Tiere'},'Hund')>0);assert(motifScore({name:'Anker',category:'Motive'},'maritim')>0);assert(motifScore({name:'Herz',category:'Liebe'},'heart')>0);assert(motifScore({name:'Hund'},'Hund')>motifScore({name:'Labrador'},'Hund'));assert.equal(motifScore({name:'Anker'},'Katze'),0);assert(motifScore({name:'Baum'},'Bäume')>0);});
test('Überlagerung beachtet Rotation, ausgeblendete Objekte und reine Randberührung',()=>{const a={id:'a',x:0,y:0,w:10,h:10};assert(overlaps(a,{...a,x:9}));assert(!overlaps(a,{...a,x:10}));assert(!overlaps({x:0,y:0,w:20,h:1,rotation:45},{x:0,y:6,w:20,h:1,rotation:45}));assert.equal(overlapHints([a,{...a,id:'b',uxHidden:true}]).length,0);});
const profile={kind:'layered-doorbell',manufacturing:{mountingHoles:{acrylic:'only-where-full-hole-inside-acrylic'}},frames:[{key:'partial',acrylic:{x:6,y:0,width:90,height:100}},{key:'full',acrylic:{x:0,y:0,width:100,height:100}}],mounting:{options:[{key:'screws',visibleScrews:true},{key:'glue',visibleScrews:false}],holes:[{x:5,y:5}],holeDiameterMm:4,screwHeadPreviewDiameterMm:7}};
test('Bohrhinweise nur bei mechanischem Konflikt und aktivierten Schrauben',()=>{assert.equal(mechanicalHints(profile,{fkFrame:'partial',fkMounting:'screws'}).length,1);assert.equal(mechanicalHints(profile,{fkFrame:'full',fkMounting:'screws'}).length,0);assert.equal(mechanicalHints(profile,{fkFrame:'partial',fkMounting:'glue'}).length,0);assert.equal(mechanicalHints({...profile,kind:'single-plate'},{fkFrame:'partial',fkMounting:'screws'}).length,0);});
test('Vollacryl ohne ausdrückliche Bohrregel bleibt ein Montagekonflikt',()=>{assert.equal(mechanicalHints({...profile,manufacturing:undefined},{fkFrame:'full',fkMounting:'screws'}).length,1);});
test('Ignorierter Hinweis gilt nur für dieselbe Geometrie und Konfiguration',()=>{const a={id:'a',x:0,y:0,w:10,h:10},h={code:'overlap',ids:['a']};assert.notEqual(hintKey(h,[a],['design']),hintKey(h,[{...a,x:1}],['design']));assert.notEqual(hintKey(h,[a],['design']),hintKey(h,[a],['other']));});
test('Dekorative Gravur nahe Bohrloch löst keine mechanische Warnung aus, Kontur bleibt geprüft',()=>{const p={geometry:{width:100,height:100,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[{x:20,y:20,diameter:4}]}},o={x:20,y:20,w:8,h:5,rotation:0};assert(!customerLayoutIssue(o,p));assert(customerLayoutIssue({...o,x:-5},p));assert.equal(p.geometry.holes.length,1);});

test('Master overlap warnings are engraving-only, independent of design',()=>{
 for(const material of ['steel','wood','slate','acrylic'])assert.equal(showOverlapWarnings({material:{kind:material},processing:{profileId:material+'-engraving'}}),true);
 assert.equal(showOverlapWarnings({material:{kind:'acrylic'},processing:{profileId:'color-print'}}),false);
 assert.equal(showOverlapWarnings({material:{kind:'print'}}),false);
 assert.equal(showOverlapWarnings({kind:'layered-doorbell'}),true);
 assert.equal(showOverlapWarnings({}),false);
});
// K9/V4: Motivkategorien des Produktthemas zuerst (ausführlich in design-gallery.test.mjs).
test('Motivbibliothek: Kategorien des Themas liegen ohne Suchbegriff vorn, Suche bleibt maßgeblich',()=>{
 const theme={motifCategories:['Tiere']},entries=[{name:'Anker',category:'Maritim'},{name:'Pfote',category:'Tiere'}];
 const sorted=[...entries].sort((a,b)=>motifScore(b,'',theme)-motifScore(a,'',theme));
 assert.deepEqual(sorted.map(e=>e.name),['Pfote','Anker']);
 assert(motifScore({name:'Anker',category:'Maritim'},'Anker',theme)>motifScore({name:'Pfote',category:'Tiere'},'Anker',theme));
});

test('Überlagerung aus der unveränderten Vorlage ist gewollt; nach Verschieben, Drehen oder Skalieren wieder ein Hinweis',()=>{
 const design={objects:[{id:'motiv-1',type:'motif',x:50,y:40,w:20,h:10,rotation:0},{id:'text-1',type:'text',x:52,y:38,w:30,h:6,size:5,text:'*12.09.2015'}]};
 const objects=structuredClone(design.objects);
 assert.equal(templateOverlap(['motiv-1','text-1'],objects,design),true);
 objects[1].text='*01.01.2020 – 02.02.2024';objects[1].w=44;assert.equal(templateOverlap(['motiv-1','text-1'],objects,design),true);
 assert.equal(templateOverlap(['motiv-1','text-1'],[{...objects[0],x:51},objects[1]],design),false);
 assert.equal(templateOverlap(['motiv-1','text-1'],[{...objects[0],rotation:5},objects[1]],design),false);
 assert.equal(templateOverlap(['motiv-1','text-1'],[objects[0],{...objects[1],size:6}],design),false);
 assert.equal(templateOverlap(['motiv-1','neu'],[...objects,{id:'neu',type:'motif',x:50,y:40,w:5,h:5}],design),false);
 assert.equal(templateOverlap(['motiv-1','text-1'],objects,null),false);
});
