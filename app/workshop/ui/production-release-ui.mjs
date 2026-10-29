import {orderRequest} from './order-store-context.mjs';
import {outputDate} from './output-summary.mjs';
// Fertigungsfreigabe je Bestellposition (K5): Statusanzeige, Verlauf und Übergangsknöpfe.
const ACTIONS=[['geprueft','Geprüft'],['freigegeben','Freigeben'],['in_fertigung','In Fertigung'],['fertig','Fertig'],['fehler','Fehler (Grund)']];
export function createProductionReleaseUI(){
 const section=document.createElement('section');section.id='production-release-section';
 section.innerHTML='<h3>Fertigungsfreigabe</h3><p><span class="badge" id="production-state"></span> <span id="production-ready"></span></p><p role="status" aria-live="polite"></p><div class="downloads" id="production-actions"></div><p class="help">Übergänge werden nur angehängt, nie geändert. „Freigegeben“ setzt eine Person oder – bei Profil mit automatischer Freigabe – ein bestandener Prüfvermerk. Fertigungsbereit ist eine Position erst ab „Freigegeben“ und nur mit fehlerfreien Prüfvermerken. Storno oder Erstattung im Shop sperrt die Freigabe.</p><ol id="production-events"></ol>';
 document.querySelector('#order-output-section').before(section);
 const status=section.querySelector('[role=status]'),actions=section.querySelector('#production-actions'),events=section.querySelector('#production-events'),badge=section.querySelector('#production-state'),ready=section.querySelector('#production-ready');
 let row=null,serial=0,busy=false;
 async function api(path,data){
  const response=await orderRequest(row,path,data);
  const value=await response.json();if(!response.ok)throw Error(value.error?.message||'Freigabestand nicht erreichbar.');return value;
 }
 function render(p){
  badge.textContent=p.label;
  ready.textContent=(p.productionReady?'Fertigungsbereit.':'Nicht fertigungsbereit.')+' Prüfvermerke: '+(p.checks.total?p.checks.passed+' bestanden, '+p.checks.failed+' fehlgeschlagen':'keine')+(p.autoRelease?' · automatische Freigabe aktiv':'')+(p.shopBlocked?' · im Shop storniert/erstattet':'');
  actions.replaceChildren(...ACTIONS.filter(([to])=>p.allowed.includes(to)).map(([to,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=busy;b.onclick=()=>void change(to);return b;}));
  events.replaceChildren(...p.events.map(e=>{const li=document.createElement('li');li.textContent=outputDate(e.at)+' · '+e.to.replace('_',' ')+' · '+e.actor+(e.reason?' · '+e.reason:'');return li;}));
 }
 async function change(to){
  if(busy||!row)return;
  let reason='';
  if(to==='fehler'){reason=prompt('Grund für den Fehler (Pflicht):','')||'';if(!reason.trim()){status.textContent='Ein Fehler braucht einen Grund.';return;}}
  const ticket=serial,id=row.id;busy=true;status.textContent='Übergang wird gespeichert …';
  try{const p=await api('orders/'+id+'/production/transition',{to,reason});if(ticket!==serial)return;render(p);status.textContent='Gespeichert.';}
  catch(error){if(ticket===serial)status.textContent=error.message;}
  finally{busy=false;if(ticket===serial)for(const b of actions.querySelectorAll('button'))b.disabled=false;}
 }
 return {async select(value){
  row=value;const ticket=++serial;actions.replaceChildren();events.replaceChildren();badge.textContent='';ready.textContent='';status.textContent='';if(!row)return;
  try{const session=await api('session');if(ticket!==serial)return;const p=await api('orders/'+row.id+'/production');if(ticket!==serial)return;render(p);}
  catch(error){if(ticket===serial)status.textContent=error.message;}
 }};
}
