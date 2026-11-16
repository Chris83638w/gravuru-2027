// Befunde Chris/Tester 13.11.2026 (Live-Konfi Türschild): Designwechsel, Randabstand, Formwechsel, Menge.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureDesignContent,carryDesignContent} from './design-content-transfer.mjs';
import {transferTexts} from './workflow-model.mjs';
import {nearestFamilySize} from './family-formats.mjs';
import {insetTextSurface,ellipseInset,TEXT_EDGE_MM} from './text-edge-margin.mjs';
import {quantityIssue,correctedQuantity} from './quantity-guard.mjs';
import {fitsSurface} from './usability-model.mjs';

const text=(id,fieldKey,value,x,y,size)=>({id,type:'text',fieldKey,text:value,x,y,size,w:30,h:size,customerEditable:true});
// Feldnummern wie im Live-Katalog (katalog-TAE-V2A-8x5-D1 / -D56): beim Startdesign ist „name“ der
// Nachname und „name-2“ das Wort „Familie“, beim Schnörkel-Design genau umgekehrt.
const d1={id:'d1',objects:[text('text-1','name','Rosenberg',60,52,18),text('text-2','name-2','Familie',60,30,12)]};
const d56={id:'d56',objects:[text('text-1','name','Familie',59,34,18.78),text('text-2','name-2','Lachtermann',61,54,21.96)]};
const config={profile:{geometry:{width:120,height:80}},photo:{enabled:false}};

test('Designwechsel: „Familie“ bleibt im Familie-Feld, der Name kommt ins Namensfeld – trotz vertauschter Nummern',()=>{
 const state=structuredClone(d1.objects);state[0].text='Müllermann';state[0].uxCustomerText=true;
 const result=carryDesignContent(captureDesignContent(state,d1),d56,config);
 const shown=result.objects.filter(o=>o.type==='text').sort((a,b)=>a.y-b.y).map(o=>o.text);
 assert.deepEqual(shown,['Familie','Müllermann']);assert.deepEqual(result.added,[]);
 // Und zurück: keine zusätzlichen Zeilen, nichts doppelt.
 const back=carryDesignContent(captureDesignContent(result.objects,d56),d1,config);
 assert.deepEqual(back.objects.sort((a,b)=>a.y-b.y).map(o=>o.text),['Familie','Müllermann']);assert.deepEqual(back.added,[]);
});

test('Designwechsel: „Familie Müllermann“ aus einem Feld verteilt sich ohne doppeltes „Familie“',()=>{
 const empty={id:'leer',objects:[text('text-1','name','Dein Text',40,10,4)]},state=structuredClone(empty.objects);state[0].text='Familie Müllermann';
 for(const target of [d1,d56]){
  const result=carryDesignContent(captureDesignContent(state,empty),target,config);
  assert.deepEqual(result.objects.sort((a,b)=>a.y-b.y).map(o=>o.text),['Familie','Müllermann'],target.id);assert.deepEqual(result.added,[]);
 }
});

test('Designwechsel: unverändertes Musterwort ohne passendes Feld erzeugt keine zusätzliche Zeile',()=>{
 const two={id:'two',objects:[text('a','name','Thorsten & Marion',60,25,10),text('b','name-2','Altmann',60,45,20)]};
 const state=structuredClone(d1.objects);state[0].text='Müllermann';
 const result=carryDesignContent(captureDesignContent(state,d1),two,config);
 assert.equal(result.objects.find(o=>o.id==='b').text,'Müllermann');assert.equal(result.objects.find(o=>o.id==='a').text,'Thorsten & Marion');
 assert.equal(result.objects.length,2);assert.ok(!result.objects.some(o=>o.text==='Familie'));
});

test('Gedenktafel-Zuordnung ohne Vorlagentext bleibt wie bisher (Vor-/Nachname aufteilen)',()=>{
 const target=[{id:'a',type:'text',fieldKey:'name',text:'Klaus'},{id:'b',type:'text',fieldKey:'name-2',text:'Herrmann'}];
 assert.deepEqual(transferTexts([{id:'n',type:'text',fieldKey:'name',text:'Anna Schmidt'}],target),[]);assert.deepEqual(target.map(o=>o.text),['Anna','Schmidt']);
});

test('Formwechsel nimmt die nächstliegende Größe statt der kleinsten',()=>{
 const size=(key,width,height,available=true)=>({key,available,geometry:{width,height}});
 const squares=[size('80',80,80),size('100',100,100),size('120',120,120)],rounds=[size('65',65,65),size('85',85,85),size('120',120,120)];
 const ovals=[size('120x40',120,40),size('150x50',150,50),size('90x60',90,60),size('120x80',120,80)];
 assert.equal(nearestFamilySize(squares,{width:120,height:80}).key,'100');
 assert.equal(nearestFamilySize(rounds,{width:120,height:80}).key,'85');
 assert.equal(nearestFamilySize(squares,{width:80,height:20}).key,'80');
 assert.equal(nearestFamilySize(ovals,{width:85,height:85}).key,'120x80','rund wird nicht zum schmalen Oval');
 assert.equal(nearestFamilySize([size('100',100,100,false),...squares.slice(2)],{width:100,height:100}).key,'120','nur verfügbare Größen');
});

test(`Text hält beim Einpassen ${TEXT_EDGE_MM} mm Abstand zum Rand – Rechteck, abgerundet, rund, oval`,()=>{
 assert.deepEqual(insetTextSurface({x:0,y:0,width:80,height:20,shape:'rect'}),{x:2,y:2,width:76,height:16,shape:'rect'});
 assert.equal(insetTextSurface({x:0,y:0,width:120,height:80,shape:'rect',cornerRadiusMm:5}).cornerRadiusMm,3);
 assert.equal(insetTextSurface({x:0,y:0,width:65,height:65,shape:'ellipse'}).width,61);
 // Langes Oval: die verkleinerte Ellipse hält überall mindestens 2 mm (an den Enden mehr Einzug nötig).
 const a=60,b=20,d=ellipseInset(a,b,2);assert.ok(d>2.2&&d<2.6);
 const line={x:60,y:20,w:118,h:6,rotation:0};
 const oval={x:0,y:0,width:120,height:40,shape:'ellipse'},box={x:-59,y:-3,width:118,height:6};
 assert.equal(fitsSurface(line,box,oval),true,'bisher: bis an den Rand');assert.equal(fitsSurface(line,box,insetTextSurface(oval)),false,'jetzt: 2 mm Abstand');
 const wide={x:2,y:2,width:116,height:36,shape:'rect'};assert.equal(fitsSurface({x:60,y:20,w:116,h:4,rotation:0},{x:-58,y:-2,width:116,height:4},wide),true);
 const contour=insetTextSurface({shape:'contour',geometry:{shape:'contour',safeMarginMm:0}});assert.equal(contour.geometry.safeMarginMm,2);
});

test('Menge: nur ganze Zahlen 1–99; 0, -3, 2.5 und leer werden sofort gemeldet und beim Verlassen korrigiert',()=>{
 for(const bad of ['0','-3','2.5','2,5','','abc','100'])assert.notEqual(quantityIssue(bad),'',bad);
 for(const good of ['1','3','99'])assert.equal(quantityIssue(good),'',good);
 assert.equal(correctedQuantity('0'),1);assert.equal(correctedQuantity('-3'),1);assert.equal(correctedQuantity('2.5'),3);assert.equal(correctedQuantity('2,4'),2);assert.equal(correctedQuantity('150'),99);assert.equal(correctedQuantity(''),1);
});

import {missingNameField} from './workflow-model.mjs';
test('Pflicht-Name: Nachname leeren oder löschen sperrt, auch wenn das Pflichtkennzeichen auf „Familie“ sitzt',()=>{
 const design={objects:[{...text('text-1','name','Familie',59,34,18),required:true},{...text('text-2','name-2','Lachtermann',61,54,22),required:false}]};
 const state=structuredClone(design.objects);state[1].text='Müllermann';assert.equal(missingNameField(state,design),null);
 state[1].text='  ';assert.equal(missingNameField(state,design)?.id,'text-2');
 assert.equal(missingNameField(state.filter(o=>o.id!=='text-2'),design)?.id,'text-2','gelöschtes Namensfeld');
 assert.equal(missingNameField([state[0],{...text('extra','name-3','Müllermann',60,60,10)}],design),null,'eigener Namenstext zählt');
 assert.equal(missingNameField(state,{objects:design.objects.map(o=>({...o,required:false}))}),null,'ohne Pflichtfeld keine Sperre');
});
