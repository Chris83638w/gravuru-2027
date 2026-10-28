import test from 'node:test';
import assert from 'node:assert/strict';
import {STEPS,MOBILE_QUERY,availableSteps,stepForTab,neighbourStep,progress,previewHeight,summaryRows,materialLabel,moveMobileCheckout} from './mobile-steps.mjs';

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
  assert.equal(previewHeight({viewportHeight:690}),345,'kleiner Bildschirm nutzt die halbe sichtbare Höhe');
  assert.equal(previewHeight({viewportHeight:664}),332,'iPhone Safari');
  assert.equal(previewHeight({viewportHeight:548}),274,'iPhone SE Safari');
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

// Minimaler DOM für die echte Verschiebung: Identität, Listener und laufender Status
// müssen beim Wechsel der Bildschirmbreite erhalten bleiben.
class CheckoutNode extends EventTarget{
  constructor(){super();this.children=[];this.parentNode=null;this.hidden=false;this.disabled=false;this.textContent='';}
  get nextSibling(){const i=this.parentNode?.children.indexOf(this);return this.parentNode?.children[i+1]||null;}
  append(node){this.insertBefore(node,null);}
  insertBefore(node,next){if(node.parentNode){const list=node.parentNode.children;list.splice(list.indexOf(node),1);}const i=next?this.children.indexOf(next):this.children.length;this.children.splice(i,0,node);node.parentNode=this;}
}
function checkoutFixture(connected=true){
 const footer=new CheckoutNode(),oldParent=new CheckoutNode(),cart=new CheckoutNode(),statusSlot=new CheckoutNode();
 const legacy=new CheckoutNode(),legacyStatus=new CheckoutNode(),button=new CheckoutNode(),status=new CheckoutNode(),after=new CheckoutNode();
 legacy.hidden=true;legacy.disabled=true;legacyStatus.textContent='Lokaler Prüfstand · Bestellung noch nicht verbunden';status.hidden=true;
 oldParent.append(legacy);oldParent.append(legacyStatus);footer.append(button);footer.append(status);footer.append(after);
 const nodes={'.fk-buy-button':legacy,'.fk-order-status':legacyStatus,...(connected?{'[data-shop-cart]':button,'[data-shop-cart-status]':status}:{})};
 return {root:{querySelector:s=>nodes[s]||null},footer,oldParent,cart,statusSlot,legacy,legacyStatus,button,status,after};
}

test('Mobile nutzt den verbundenen Warenkorb statt des deaktivierten lokalen Knopfs; Listener bleibt einmalig',()=>{
 const f=checkoutFixture();let calls=0;f.button.addEventListener('click',()=>calls++);
 const restore=moveMobileCheckout(f.root,f.cart,f.statusSlot);
 assert.deepEqual(f.cart.children,[f.button]);assert.deepEqual(f.statusSlot.children,[f.status]);
 assert.equal(f.legacy.parentNode,f.oldParent);assert.equal(f.legacy.hidden,true);assert.equal(f.legacy.disabled,true);
 assert.equal(f.button.hidden,false);assert.equal(f.button.disabled,false);f.button.dispatchEvent(new Event('click'));assert.equal(calls,1);
 restore();assert.deepEqual(f.footer.children,[f.button,f.status,f.after]);assert.deepEqual(f.cart.children,[]);
 const restoreAgain=moveMobileCheckout(f.root,f.cart,f.statusSlot);f.button.dispatchEvent(new Event('click'));assert.equal(calls,2);restoreAgain();
});

test('Speicherfortschritt und Fehler bleiben ohne sync sichtbar und überstehen den Wechsel zu Desktop',()=>{
 const f=checkoutFixture();const restore=moveMobileCheckout(f.root,f.cart,f.statusSlot);
 f.button.disabled=true;f.button.textContent='Wird vorbereitet …';f.status.hidden=false;f.status.textContent='Deine Gestaltung wird gesichert …';
 assert.equal(f.statusSlot.children[0].textContent,'Deine Gestaltung wird gesichert …');assert.equal(f.statusSlot.children[0].hidden,false);
 restore();assert.equal(f.button.disabled,true);assert.equal(f.status.hidden,false);assert.equal(f.status.parentNode,f.footer);
 const restoreAgain=moveMobileCheckout(f.root,f.cart,f.statusSlot);
 f.status.textContent='Bitte das erforderliche eigene Foto hochladen.';f.button.disabled=false;
 assert.equal(f.statusSlot.children[0].textContent,'Bitte das erforderliche eigene Foto hochladen.');restoreAgain();
 assert.equal(f.status.textContent,'Bitte das erforderliche eigene Foto hochladen.');assert.equal(f.status.hidden,false);
});

test('Nicht verbundene Vorschau bleibt gesperrt; bestehender Commerce-Knopf behält seinen eigenen Handler',()=>{
 for(const connected of [false,true]){
 const f=checkoutFixture(false);f.legacy.disabled=!connected;let calls=0;f.legacy.addEventListener('click',()=>calls++);
 const restore=moveMobileCheckout(f.root,f.cart,f.statusSlot);
 assert.deepEqual(f.cart.children,[f.legacy]);assert.equal(f.legacy.disabled,!connected);assert.equal(f.legacy.hidden,false);
 assert.deepEqual(f.statusSlot.children,[f.legacyStatus]);if(connected){f.legacy.dispatchEvent(new Event('click'));assert.equal(calls,1);}
 restore();assert.deepEqual(f.oldParent.children,[f.legacy,f.legacyStatus]);assert.equal(f.legacy.hidden,true);
 }
});

import {revealEditorField} from './mobile-steps.mjs';
test('keyboard field reveal scrolls only the editor and never the plate shell',()=>{
 let scrolled;const field={getBoundingClientRect:()=>({top:400,height:44}),scrollIntoView:()=>assert.fail('must not scroll parent preview')},editor={getBoundingClientRect:()=>({top:200}),clientHeight:100,scrollTop:80,scrollTo:value=>{scrolled=value;}};
 revealEditorField(field,editor);assert.deepEqual(scrolled,{top:252,behavior:'smooth'});
 field.getBoundingClientRect=()=>({top:0,height:44});revealEditorField(field,editor);assert.equal(scrolled.top,0);
});
