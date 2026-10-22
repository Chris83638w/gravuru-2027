import test from 'node:test';
import assert from 'node:assert/strict';
import {fitText,freePosition,freePlacement,transferTexts,alignGroup,placementGridStep,PLACEMENT_STEP,NO_FREE_SPACE_MESSAGE} from './workflow-model.mjs';
import {fitsSurface} from './usability-model.mjs';
import {overlaps} from './customer-tools-model.mjs';
const surface={x:10,y:10,width:140,height:260};
test('Autofit reaches usable edge at hundredth-mm precision without moving text',()=>{const o={x:80,y:60,size:20,rotation:0};const b={x:-100,y:-8,width:200,height:16};assert.equal(fitText(o,b,surface),14);assert.equal(o.size,20);assert.equal(o.x,80);});
test('Autofit preserves rotation and rejects an impossible readable minimum',()=>{const o={x:30,y:30,size:20,rotation:45};const b={x:-100,y:-10,width:200,height:20};const size=fitText(o,b,surface);assert.ok(size>=4&&size<20);assert.ok(fitsSurface(o,Object.fromEntries(Object.entries(b).map(([k,v])=>[k,v*size/20])),surface));assert.equal(fitText({...o,x:10,y:10},b,surface),null);});
test('Free placement avoids other elements and physical doorbell while preserving old objects',()=>{const o={id:'new',type:'motif',w:20,h:20,rotation:0};const existing=[{id:'a',type:'text',x:80,y:25,w:140,h:30}];const before=structuredClone(existing);const pos=freePosition(o,surface,existing,[{x:80,y:80,w:140,h:70}]);assert.ok(pos);assert.ok(pos.y>=126);assert.deepEqual(existing,before);assert.equal(freePosition({...o,w:200},surface,existing),null);});
// Chris 22./23.10.2026: Ein neues Element bekommt immer einen freien Platz – feines Raster über die ganze Fläche,
// danach schrittweise kleiner bis zur Mindestgröße; bestehende Elemente werden nie verschoben.
test('Platzsuche: feines Raster findet Lücken, die drei Spalten nicht treffen; Mitte zuerst; nichts wird verschoben',()=>{
 const small={x:0,y:0,width:60,height:40,shape:'rect'};
 // Drei breite Textzeilen lassen nur in der Mitte rechts eine Lücke von 14 × 12 mm frei (Spalten links/Mitte/rechts belegt).
 const existing=[{id:'a',type:'text',x:30,y:6,w:58,h:8},{id:'b',type:'text',x:30,y:34,w:58,h:8},{id:'c',type:'motif',x:18,y:20,w:34,h:14}];
 const before=structuredClone(existing),o={id:'n',type:'motif',w:10,h:8,rotation:0};
 const pos=freePosition(o,small,existing);
 assert.ok(pos,'Raster findet die Lücke rechts der Mitte');
 assert.ok(pos.x>=40&&pos.x<=55&&pos.y>=14&&pos.y<=26,JSON.stringify(pos));
 assert.ok(!existing.some(e=>overlaps({...o,...pos,w:o.w+2,h:o.h+2},e)),'2 mm Abstand zu Nachbarn');
 assert.deepEqual(existing,before,'bestehende Elemente unverändert');
 // Leere Fläche: Kandidaten der bisherigen Stufe (oben) kommen vor dem Raster – Verhalten für freie Flächen bleibt.
 assert.deepEqual(freePosition(o,small,[]),{x:30,y:4});
 assert.equal(placementGridStep({w:10,h:8}),2.6666666666666665);assert.equal(placementGridStep({w:3,h:3}),2);assert.equal(placementGridStep({w:40,h:40}),5);
 assert.equal(PLACEMENT_STEP,0.9);assert.equal(NO_FREE_SPACE_MESSAGE,'Kein freier Platz – Element liegt über anderen.');
});
test('Platzsuche mit Verkleinerung: erst Originalgröße, dann 0,9er-Schritte bis zur Mindestgröße; darunter null',()=>{
 const tiny={x:0,y:0,width:40,height:30,shape:'rect'};
 // Nur eine Lücke von 12 × 12 mm unten rechts bleibt frei; mit 2 mm Abstand passt höchstens ein 10-mm-Element.
 const existing=[{id:'a',type:'motif',x:20,y:8,w:40,h:16},{id:'b',type:'motif',x:13,y:23,w:26,h:14}];
 const o={id:'n',type:'motif',w:20,h:20,rotation:0};
 assert.equal(freePosition(o,tiny,existing),null,'in Originalgröße kein Platz');
 assert.equal(freePlacement(o,tiny,existing),null,'ohne Verkleinerung (minScale 1) bleibt es dabei');
 const hit=freePlacement(o,tiny,existing,[],{minScale:0.5});
 assert.ok(hit,'verkleinert passt es');assert.ok(hit.scale<1&&hit.scale>=0.5,String(hit.scale));
 assert.ok(Math.abs(hit.scale-0.9**Math.round(Math.log(hit.scale)/Math.log(0.9)))<1e-9||hit.scale===0.5,'Stufen 0,9^n oder genau die Mindestgröße');
 assert.ok(hit.x>=27&&hit.y>=17,JSON.stringify(hit));
 const placed={...o,x:hit.x,y:hit.y,w:o.w*hit.scale,h:o.h*hit.scale};
 assert.ok(fitsSurface(placed,{x:-placed.w/2,y:-placed.h/2,width:placed.w,height:placed.h},tiny));
 assert.ok(!existing.some(e=>overlaps({...placed,w:placed.w+2,h:placed.h+2},e)));
 // Mindestgröße zu groß für die Lücke: null – der Aufrufer setzt mittig und meldet NO_FREE_SPACE_MESSAGE.
 assert.equal(freePlacement(o,tiny,existing,[],{minScale:0.8}),null);
 // Ohne Lücke: selbst bei Mindestgröße nichts frei → null; die letzte Stufe ist genau minScale.
 const full=[{id:'f',type:'motif',x:20,y:15,w:40,h:30}];
 assert.equal(freePlacement(o,tiny,full,[],{minScale:0.1}),null);
 assert.deepEqual(freePlacement(o,tiny,[],[],{minScale:0.5}),{x:20,y:10,scale:1},'freie Fläche: Originalgröße, keine Verkleinerung');
});
test('Text transfer keeps new typography and returns every unmatched or ambiguous field',()=>{const source=[{id:'a',type:'text',fieldKey:'name',text:'Erdem',font:'old'},{id:'b',type:'text',fieldKey:'extra',text:'Willkommen'}];const target=[{id:'c',type:'text',fieldKey:'name',text:'Beispiel',font:'new',size:12,x:40}];assert.deepEqual(transferTexts(source,target).map(o=>o.id),['b']);assert.equal(target[0].text,'Erdem');assert.equal(target[0].font,'new');assert.equal(target[0].x,40);assert.equal(transferTexts([...source,{...source[0],id:'d'}],target).length,3);});
test('Group alignment shares edges while retaining vertical positions and locked text',()=>{const objects=[{id:'a',type:'text',x:50,y:20,w:20,h:10},{id:'b',type:'text',x:70,y:40,w:40,h:10},{id:'c',type:'text',x:90,y:60,w:20,h:10,uxLocked:true}];alignGroup(objects,['a','b','c'],'left',surface);assert.equal(objects[0].x-10,objects[1].x-20);assert.deepEqual(objects.map(o=>o.y),[20,40,60]);assert.equal(objects[2].x,90);});
// K9: Galerie je Thema und Direktlink (ausführlich in design-gallery.test.mjs).
import {galleryOrder,parseDirectLink,thumbnailDesign} from './design-gallery-model.mjs';
test('Tab Designs: Thema zuerst mit Bestseller vorn, Designs ohne Thema sichtbar, Direktlink ohne gültiges Design wird gemeldet',()=>{
 const designs=[{id:'a',themes:['gedenktafeln'],objects:[]},{id:'b',objects:[]},{id:'c',themes:['hausnummern'],bestseller:true,objects:[]},{id:'d',themes:['gedenktafeln'],bestseller:true,objects:[]}];
 assert.deepEqual(galleryOrder(designs,'gedenktafeln'),{theme:'gedenktafeln',primary:['d','a','b'],more:['c']});
 const link=parseDirectLink('?design=x&text=Anna',{designs});
 assert.equal(link.designId,null);assert.equal(link.text,'Anna');assert.equal(link.notes.length,1);
 const thumb=thumbnailDesign({id:'a',objects:[{id:'t',type:'text',fieldKey:'name',text:'Muster'}]},[{id:'s',type:'text',fieldKey:'name',text:'Anna'}]);
 assert.equal(thumb.objects[0].text,'Anna');
});
// Chris 21.10.2026: beim Designwechsel wandern nur geänderte Namen und Lebensdaten, keine Sprüche.
import {changedCustomerTexts} from './workflow-model.mjs';
test('Designwechsel: nur geänderte Namen/Daten, Vor-/Nachname und Datumsfelder werden zugeordnet',()=>{
 const tpl={objects:[{id:'n',type:'text',fieldKey:'name',text:'Elisabeth Meyer'},{id:'d',type:'text',fieldKey:'daten',text:'19.04.1951 - 16.06.2020'},{id:'s',type:'text',fieldKey:'spruch',text:'Muster'}]};
 const state=structuredClone(tpl.objects);
 assert.deepEqual(changedCustomerTexts(state,tpl),[]);
 state[2].text='Eigener Spruch';assert.deepEqual(changedCustomerTexts(state,tpl),[]);
 state[0].text='Anna Schmidt';state[1].text='01.02.1940 - 03.04.2021';
 const source=changedCustomerTexts(state,tpl);assert.deepEqual(source.map(o=>o.fieldKey),['name','daten']);
 const split=[{id:'a',type:'text',fieldKey:'name',text:'Klaus'},{id:'b',type:'text',fieldKey:'name-2',text:'Herrmann'},{id:'c',type:'text',fieldKey:'daten',text:'*19.07.1992'},{id:'e',type:'text',fieldKey:'daten-2',text:'† 20.09.2020'},{id:'f',type:'text',fieldKey:'spruch',text:'Bleibt'}];
 assert.deepEqual(transferTexts(source,split),[]);
 assert.deepEqual(split.map(o=>o.text),['Anna','Schmidt','*01.02.1940','† 03.04.2021','Bleibt']);
 const back=[{id:'x',type:'text',fieldKey:'name',text:'Muster'},{id:'y',type:'text',fieldKey:'daten',text:'1.1.2000 - 2.2.2020'}];
 transferTexts(changedCustomerTexts(split,{objects:[{id:'a',type:'text',fieldKey:'name',text:'Klaus'}]}),back);
 assert.equal(back[0].text,'Anna Schmidt');
});
