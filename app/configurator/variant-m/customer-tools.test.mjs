import test from 'node:test';
import assert from 'node:assert/strict';
import {customerLayoutIssue} from './contract.mjs';
import {showOverlapWarnings,centerTexts,motifScore,overlaps,overlapHints,mechanicalHints,hintKey} from './customer-tools-model.mjs';
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
