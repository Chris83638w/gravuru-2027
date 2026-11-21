import {orderKey,orderApi,orderPage,selectedOrder,orderRequest,orderFileButtons,orderFilesNote,orderForConfiguration,ORDER_NOT_PAID_NOTE} from './order-store-context.mjs';
import {createOrderFileGrantsUI} from './order-file-grants-ui.mjs';
import {merchantRequest as fetch} from './merchant-request.mjs';
import {outputLabel,outputDate} from './output-summary.mjs';
import {createOrderProductDraftUI} from './order-product-ui.mjs';
import {createProductionReleaseUI} from './production-release-ui.mjs';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
const productDraftUI=createOrderProductDraftUI(),fileGrantsUI=createOrderFileGrantsUI(),productionUI=createProductionReleaseUI();
let outputSerial=0,fileBusy=false,fileView=null;
const query=new URLSearchParams(location.search);
let rows=[],statuses={},outputStates={},selected=query.get('position');
// #265, ENTSCHEIDUNGEN 3.53 (6) und 3.57: Aufruf über „Fertigungsdatei“ an der Shopify-Zeile (?config=…&rev=…) wählt die Position
// dieser Gestaltung; solange sie noch nicht bezahlt ist, steht ein Hinweis da. Eine ausdrücklich genannte Position geht vor.
let wanted=!selected&&query.has('config')?{config:query.get('config'),rev:query.get('rev')}:null;
// #265, ENTSCHEIDUNGEN 3.48/3.51/3.53: Kennzeichen der Fertigungsdatei je Position. Der Server leitet es aus den Ausgabeaufträgen ab;
// „Bitte prüfen“ steht immer mit Grund da. Positionen der älteren Laufzeit haben keines.
const OUTPUT_LABELS={'fertig':'Fertig','wird erstellt':'Wird erstellt','bitte prüfen':'Bitte prüfen'};
const outputNote=state=>state?'Fertigungsdatei: '+(OUTPUT_LABELS[state.state]||state.state)+(state.state==='bitte prüfen'&&state.reason?' – '+state.reason:''):'';
function renderOrders(){$('#orders').innerHTML=rows.map(o=>{const output=outputStates[orderKey(o)];return '<button data-order="'+esc(orderKey(o))+'">'+esc(o.product.name)+'<small>'+(o.test===false?'Bestellung ':'Testbestellung ')+esc(o.orderId)+' · '+esc(statuses[orderKey(o)]?.label||'Bezahlt')+' · '+esc(statuses[orderKey(o)]?.production?.label||'Eingegangen')+' · '+money(o.totalCents)+'</small>'+(output?'<small data-output-state="'+esc(output.state)+'">'+esc(outputNote(output))+'</small>':'')+'</button>';}).join('')||'<p>Noch keine bestätigten Testpositionen.</p>';}
function detail(){const row=selectedOrder(rows,selected);productDraftUI.select(row||null);fileGrantsUI.select(row||null);productionUI.select(row||null);$('#empty').hidden=Boolean(row);$('#detail').hidden=!row;if(!row)return;void loadOutputs(row);const status=statuses[orderKey(row)];renderLineRefunds(status?.refunds);$('#order-state').textContent=(status?.label||'Bezahlt')+(row.test===false?' · Bestellung':' · Testbestellung');$('#status-detail').textContent=(status?.requiresReview?'Vor weiterer Bearbeitung prüfen. ':'')+(status?.cancelled?'Zahlungsstand: '+status.financialLabel+'. ':'')+(status?.updatedAt?'Shop-Stand: '+new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(status.updatedAt))+'. ':'Noch keine spätere Statusmeldung. ')+(status?.conflict?'Widersprüchliche Meldungen mit gleicher Änderungszeit. ':'')+'Fertigung: '+(status?.production?.label||'Eingegangen')+(status?.productionReady?' · fertigungsbereit':' · nicht fertigungsbereit')+'. Keine Kunden-Downloadfreigabe ohne eigene Testfreigabe.';$('#title').textContent=row.product.name;$('#summary').textContent='Produktstand '+row.product.revision+' · Menge '+row.quantity+(row.selection?' · '+row.selection.labels.map(v=>v.label+': '+v.value).join(' · '):'');$('#price').textContent=(status?.requiresReview?'Ursprünglicher Positionswert: ':'')+money(row.totalCents)+' · '+money(row.unitCents)+' je Stück';$('#received').textContent='Bestellstand gesichert: '+new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(row.receivedAt));$('#snapshot').href=orderPage(row,'pruefstaende/?snapshot='+row.snapshotId+'&position='+row.id);$('#references').innerHTML=[['Position',row.id],['Shop',row.shopDomain],['Bestellung',row.orderId],['Shop-Position',row.lineId],['Prüfstand',row.snapshotId],['Paket SHA-256',row.sourcePackageSha256],['Profil',row.productionProfile?row.productionProfile.id+' · Stand '+row.productionProfile.revision:'Nicht zugeordnet']].map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('');selected=orderKey(row);history.replaceState(null,'','?position='+encodeURIComponent(selected));}
async function load(){try{const r=await fetch('/api/workshop/all-orders'),v=await r.json();if(!r.ok)throw Error(v.error?.message||'Bestellungen nicht erreichbar.');rows=v.orders;statuses=v.statuses||{};outputStates=v.outputStates||{};renderErrors(v.errors||[]);
  if(wanted){const row=orderForConfiguration(rows,wanted.config,wanted.rev);if(row){selected=orderKey(row);wanted=null;}else $('#empty').textContent=ORDER_NOT_PAID_NOTE;}$('#connection').textContent=v.integration.enabled?'Shopify-Bestelleingang aktiv. '+rows.length+' bestätigte Position'+(rows.length===1?'':'en')+' aus allen angebundenen Speichern. Fertigung bleibt gesondert freizugeben.':'Testempfang noch nicht eingerichtet. Hier werden keine Käufe simuliert oder als bezahlt markiert.';renderOrders();detail();}catch(e){$('#notice').textContent=e.message;}}
// E3: rejected single positions (status „fehler“) are listed with their reason; the valid positions of the same order stay admitted.
function renderErrors(errors){
 const node=$('#order-errors');if(!node)return;
 node.hidden=!errors.length;
 node.innerHTML=errors.length?'<h3>Fehlerhafte Positionen ('+errors.length+')</h3>'+errors.map(e=>{
  const status=e.overviewReadError?'Status: Fehler beim Laden der Position':'Status: Fehler · nicht übernommen';
  // #265, ENTSCHEIDUNGEN 3.51/3.53: abgelehnte Position = „Bitte prüfen“ mit dem Grund des Bestelleingangs, keine automatische Fertigung.
  // Kennt der Eingang den Prüfstand des Angebots, führt der Link zur gesicherten Gestaltung.
  const design=e.snapshotId?'<br><a href="'+esc(orderPage(e,'pruefstaende/?snapshot='+encodeURIComponent(e.snapshotId)))+'">Gesicherte Gestaltung öffnen →</a>':'';
  return '<p class="order-error"><strong>Bestellung '+esc(e.orderId)+' · Shop-Position '+esc(e.lineId)+
   '</strong><br>'+(e.outputState?'<strong data-output-state="'+esc(e.outputState.state)+'">Bitte prüfen:</strong> ':'')+esc(e.intakeError)+'<br><small>'+(e.variantId?'Variante '+esc(e.variantId)+' · ':'')+
   (e.quantity?'Menge '+esc(e.quantity)+' · ':'')+status+'</small>'+design+'</p>';
 }).join(''):'';
}
$('#orders').onclick=e=>{const id=e.target.closest('[data-order]')?.dataset.order;if(id){selected=id;wanted=null;detail();}};$('#reload').onclick=load;await load();

// `quiet`: stilles Nachladen, solange die Datei der gewählten Position noch erstellt wird (#265).
async function loadOutputs(row,quiet=false){
 const serial=++outputSerial;
 if(!quiet){$('#order-output-list').replaceChildren();$('#order-output-status').textContent='Ausgaben werden geladen …';showOutputState(null);showOrderFiles(null);}
 $('#order-output-link').href=orderPage(row,'ausgaben/?position='+encodeURIComponent(row.id));
 try{
  const response=await fetch(orderApi(row,'orders/'+row.id+'/outputs')),value=await response.json();
  if(!response.ok)throw Error(value.error?.message||'Ausgaben nicht erreichbar.');
  if(selected!==orderKey(row)||serial!==outputSerial)return;
  // #265: Das Öffnen der Ausgaben holt einen fehlenden Auftrag nach; das Kennzeichen der Antwort gilt daher auch für die Liste.
  if(value.outputState){const changed=JSON.stringify(outputStates[orderKey(row)])!==JSON.stringify(value.outputState);outputStates[orderKey(row)]=value.outputState;if(changed)renderOrders();showOutputState(value.outputState);showOrderFiles(row,value.outputState,value.downloads);
   // #265, ENTSCHEIDUNGEN 3.57: auch nachladen, solange die vier Dateien einer Ausgabe alter Art neu erstellt werden.
   if(value.outputState.state==='wird erstellt'||value.downloads?.pending)setTimeout(()=>{if(selected===orderKey(row)&&serial===outputSerial)void loadOutputs(row,true);},2000);}
  $('#order-output-status').textContent=value.total?value.total+' Ausgabe'+(value.total===1?'':'n')+' gespeichert.':'Noch keine Ausgabe gespeichert. Über die gesicherte Gestaltung eine Druck- oder Gravurausgabe erstellen.';
  $('#order-output-list').innerHTML=value.jobs.slice(0,3).map(job=>'<a href="'+orderPage(row,'ausgaben/?'+new URLSearchParams({job:job.id,position:row.id}))+'">'+esc(outputLabel(job))+'<small>'+esc(outputDate(job.createdAt))+' · '+esc(job.id.slice(-8))+'</small></a>').join('');
 }catch(error){if(selected===orderKey(row)&&serial===outputSerial)$('#order-output-status').textContent=error.message;}
}

function renderLineRefunds(refunds){
 const values=$('#line-refunds-values'),state=$('#line-refunds-state');
 values.replaceChildren();values.hidden=true;
 if(!refunds?.reported){state.textContent='Keine positionsbezogenen Erstattungsangaben gemeldet. Aus dem Bestellstatus lässt sich kein Betrag für diese Position ableiten.';return;}
 if(refunds.conflict){state.textContent='Erstattungszuordnung prüfen: Gemeldete Angaben widersprechen sich oder überschreiten die bestellte Menge. Kein verlässlicher Positionsbetrag verfügbar.';return;}
 const time=outputDate(refunds.updatedAt);
 state.textContent=(refunds.stale?'Ältere Zuordnung · '+time+'. Die neueste Bestellmeldung bestätigt diese Werte nicht. ': 'Gemeldete Zuordnung · '+time+'. ')+(refunds.refundCount?'':'Für diese Position enthält die Meldung keine Erstattungszeile.');
 values.hidden=false;
 for(const [label,value] of [['Zugeordnete Menge',String(refunds.quantity)],['Gemeldeter Warenwert',money(refunds.subtotalCents)],['Gemeldeter Steueranteil',money(refunds.taxCents)]]){
  const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value;values.append(term,description);
 }
}

function showOutputState(state){
 const node=$('#order-output-state');if(!node)return;
 node.hidden=!state;node.textContent=outputNote(state);node.classList.toggle('order-error',state?.state==='bitte prüfen');
}

// #265, ENTSCHEIDUNGEN 3.57: PDF, PDF mit Kontur, SVG, SVG mit Kontur je Position – ohne Exportauftrag von Hand. Der Abruf läuft wie
// jeder Ausgabe-Download über die angemeldete Sitzung mit CSRF (order-store-context.mjs `orderRequest`), nie über eine offene Adresse.
function showOrderFiles(row,state,downloads,message){
 const root=$('#order-files');if(!root)return;
 fileView=row?{row,state,downloads}:null;root.hidden=!row;if(!row)return;
 $('#order-file-rows').innerHTML=orderFileButtons(state,downloads).map(s=>'<p class="order-file-row">'+(s.label?'<strong>'+esc(s.label)+'</strong> ':'')+s.buttons.map(b=>'<button type="button" data-order-file="'+esc(b.format)+'" data-surface="'+esc(s.surface)+'"'+(b.enabled&&!fileBusy?'':' disabled')+'>'+esc(b.label)+'</button>').join(' ')+'</p>').join('');
 $('#order-files-note').textContent=message??orderFilesNote(state,downloads);
}
$('#order-file-rows')?.addEventListener('click',async e=>{
 const button=e.target.closest('[data-order-file]'),row=selectedOrder(rows,selected);if(!button||button.disabled||fileBusy||!row)return;
 fileBusy=true;for(const b of document.querySelectorAll('[data-order-file]'))b.disabled=true;
 const format=button.dataset.orderFile;let message;$('#order-files-note').textContent='Datei wird geladen …';
 try{
  const response=await orderRequest(row,'orders/'+row.id+'/download',{format,surface:button.dataset.surface},fetch);
  if(!response.ok)throw Error((await response.json()).error?.message||'Download fehlgeschlagen.');
  const link=URL.createObjectURL(await response.blob()),a=document.createElement('a'),name=response.headers.get('Content-Disposition')?.match(/filename="([^"\r\n]+)"/)?.[1];
  a.href=link;a.download=name&&!/[\\/\x00-\x1f]/.test(name)?name:row.id+(format.startsWith('svg')?'.svg':'.pdf');a.click();setTimeout(()=>URL.revokeObjectURL(link),60000);
  message='Datei heruntergeladen.';
 }catch(error){message=error.message;}
 // Knöpfe wieder freigeben; das Ergebnis des Abrufs bleibt als Hinweis stehen, bis sich der Stand der Position ändert.
 finally{fileBusy=false;if(fileView?.row===row)showOrderFiles(row,fileView.state,fileView.downloads,message);}
});
