import test from 'node:test';
import assert from 'node:assert/strict';
import {STEPS,MOBILE_QUERY,availableSteps,stepForTab,neighbourStep,progress,previewHeight,summaryRows,materialLabel} from './mobile-steps.mjs';

test('Reihenfolge der geführten Schritte folgt Entscheidung A6; Grenze liegt unter 768 px',()=>{
  assert.deepEqual(STEPS.map(s=>s.id),['options','design','text','media','motif','review']);
  assert.deepEqual(STEPS.map(s=>s.label),['Optionen','Design','Text','Foto','Motive','Prüfen']);
  assert.equal(MOBILE_QUERY,'(max-width:767px)');
});
test('Versteckte Reiter lassen ihren Schritt weg; Foto/Motiv folgt den vorhandenen Reitern',()=>{
  const full=availableSteps({options:true,design:true,text:true,motif:true,upload:true},{upload:'Foto / Logo'});
  assert.deepEqual(full.map(s=>s.id),['options','design','text','media','motif','review']);
  assert.equal(full[3].label,'Foto / Logo');
  assert.deepEqual(full[3].tabs,['upload']);assert.deepEqual(full[4].tabs,['motif']);
  const pilot=availableSteps({options:true,design:false,text:true,motif:true,upload:true});
  assert.deepEqual(pilot.map(s=>s.id),['options','text','media','motif','review']);
  assert.equal(pilot[2].label,'Foto');assert.equal(pilot[3].label,'Motive');
  assert.equal(availableSteps({options:true,text:true,motif:true}).find(s=>s.id==='motif').label,'Motive');assert.equal(availableSteps({options:true,text:true,motif:true}).find(s=>s.id==='media'),undefined);
  assert.equal(availableSteps({options:true,text:true,upload:true},{upload:'Logo'}).find(s=>s.id==='media').label,'Logo');
  // „Prüfen“ bleibt immer, auch ohne jeden Reiter.
  assert.deepEqual(availableSteps({}).map(s=>s.id),['review']);
});
test('Reiterwechsel aus ux.mjs landet im passenden Schritt; Weiter/Zurück sind begrenzt',()=>{
  const steps=availableSteps({options:true,text:true,motif:true,upload:true});
  assert.equal(stepForTab(steps,'upload'),'media');
  assert.equal(stepForTab(steps,'motif'),'motif');
  assert.equal(stepForTab(steps,'text'),'text');
  assert.equal(stepForTab(steps,'design'),null);
  assert.equal(neighbourStep(steps,'options',1),'text');
  assert.equal(neighbourStep(steps,'media',1),'motif');assert.equal(neighbourStep(steps,'motif',1),'review');
  assert.equal(neighbourStep(steps,'review',1),null);
  assert.equal(neighbourStep(steps,'options',-1),null);
  assert.equal(neighbourStep(steps,'unbekannt',1),'options');
  assert.deepEqual(progress(steps,'media'),{index:2,count:5,percent:60});
  assert.deepEqual(progress(steps,'review'),{index:4,count:5,percent:100});
});
test('Platte oben: 40 % des sichtbaren Bereichs, bei Tastatur mindestens 25 %, nie unter 120 px',()=>{
  assert.equal(previewHeight({viewportHeight:844}),338);
  assert.equal(previewHeight({viewportHeight:690}),235,'kleiner Bildschirm (App-Webansicht)');
  assert.equal(previewHeight({viewportHeight:844,keyboardOpen:true}),211);
  assert.equal(previewHeight({viewportHeight:500,keyboardOpen:true}),125);
  assert.equal(previewHeight({viewportHeight:300,keyboardOpen:true}),120);
  assert.equal(previewHeight({viewportHeight:0}),120);
});
test('Zusammenfassung für „Prüfen“: Größe, Material, Optionen, Preis aus dem Produktstand',()=>{
  const profile={geometry:{width:150,height:200},material:{kind:'acrylic',thicknessMm:3},optionGroups:[
    {id:'size',name:'Größe',defaultValueId:'small',values:[{id:'small',label:'15 × 20 cm'},{id:'large',label:'20 × 26,67 cm'}]},
    {id:'base',name:'Sockel',defaultValueId:'none',values:[{id:'none',label:'Ohne Sockel'},{id:'eiche',label:'Massiver Holzsockel · Eiche'}]}]};
  const state={mOptions:{size:'large',base:'eiche'},objects:[{type:'text',text:'Anna & Lukas'},{type:'text',text:'Ort',uxHidden:true},{type:'photoSlot',uxUploadId:'u1'}]};
  const rows=Object.fromEntries(summaryRows({profile,state,quantity:'2',totalText:'29,98 €',designName:'Unser Anfang'}));
  assert.equal(rows['Größe'],'20 × 26,67 cm');
  assert.equal(rows.Material,'Acrylglas · 3 mm');
  assert.equal(rows.Optionen,'Massiver Holzsockel · Eiche');
  assert.equal(rows.Design,'Unser Anfang');
  assert.equal(rows.Texte,'Anna & Lukas');
  assert.equal(rows['Fotos / Logos'],'1');
  assert.equal(rows.Menge,'2');
  assert.equal(rows.Preis,'29,98 €');
  // Ohne Größenoption kommt die Geometrie in mm; ohne Material keine Zeile; leere Texte sichtbar als „Keine“.
  const plain=Object.fromEntries(summaryRows({profile:{geometry:{width:120,height:80},optionGroups:[]},state:{objects:[]},totalText:''}));
  assert.equal(plain['Größe'],'120 × 80 mm');
  assert.equal(plain.Material,undefined);
  assert.equal(plain.Texte,'Keine');
  assert.equal(plain.Menge,'1');
  assert.equal(plain.Preis,undefined);
  assert.equal(materialLabel({kind:'steel'}),'Edelstahl');
  assert.equal(materialLabel('slate'),'Schiefer');
  assert.equal(materialLabel(null),'');
});
