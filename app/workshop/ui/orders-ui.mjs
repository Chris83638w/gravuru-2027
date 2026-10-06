import {createOrderFileGrantsUI} from './order-file-grants-ui.mjs';
import {merchantRequest as fetch} from './merchant-request.mjs';
import {outputLabel,outputDate,jobLink} from './output-summary.mjs';
import {createOrderProductDraftUI} from './order-product-ui.mjs';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
const productDraftUI=createOrderProductDraftUI(),fileGrantsUI=createOrderFileGrantsUI();
let outputSerial=0;
let rows=[],statuses={},selected=new URLSearchParams(location.search).get('position');
function detail(){const row=rows.find(r=>r.id===selected);productDraftUI.select(row||null);fileGrantsUI.select(row||null);$('#empty').hidden=Boolean(row);$('#detail').hidden=!row;if(!row)return;void loadOutputs(row);const status=statuses[row.id];$('#order-state').textContent=(status?.label||'Bezahlt')+' · Testbestellung';$('#status-detail').textContent=(status?.requiresReview?'Vor weiterer Bearbeitung prüfen. ':'')+(status?.cancelled?'Zahlungsstand: '+status.financialLabel+'. ':'')+(status?.updatedAt?'Shop-Stand: '+new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(status.updatedAt))+'. ':'Noch keine spätere Statusmeldung. ')+(status?.conflict?'Widersprüchliche Meldungen mit gleicher Änderungszeit. ':'')+'Keine automatische Fertigungs- oder Kunden-Downloadfreigabe.';$('#title').textContent=row.product.name;$('#summary').textContent='Produktstand '+row.product.revision+' · Menge '+row.quantity+(row.selection?' · '+row.selection.labels.map(v=>v.label+': '+v.value).join(' · '):'');$('#price').textContent=(status?.requiresReview?'Ursprünglicher Positionswert: ':'')+money(row.totalCents)+' · '+money(row.unitCents)+' je Stück';$('#received').textContent='Testnachricht gesichert: '+new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(row.receivedAt));$('#snapshot').href='/werkstatt/pruefstaende/?snapshot='+row.snapshotId+'&position='+row.id;$('#references').innerHTML=[['Position',row.id],['Shop',row.shopDomain],['Bestellung',row.orderId],['Shop-Position',row.lineId],['Prüfstand',row.snapshotId],['Paket SHA-256',row.sourcePackageSha256],['Profil',row.productionProfile?row.productionProfile.id+' · Stand '+row.productionProfile.revision:'Nicht zugeordnet']].map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('');history.replaceState(null,'','?position='+row.id);}
async function load(){try{const r=await fetch('/api/workshop/orders'),v=await r.json();if(!r.ok)throw Error(v.error?.message||'Bestellungen nicht erreichbar.');rows=v.orders;statuses=v.statuses||{};$('#connection').textContent=v.integration.enabled?'Testempfang konfiguriert. Noch kein Nachweis einer echten Shopify-Testbestellung.':'Testempfang noch nicht eingerichtet. Hier werden keine Käufe simuliert oder als bezahlt markiert.';$('#orders').innerHTML=rows.map(o=>'<button data-order="'+o.id+'">'+esc(o.product.name)+'<small>Testbestellung '+esc(o.orderId)+' · '+esc(statuses[o.id]?.label||'Bezahlt')+' · '+money(o.totalCents)+'</small></button>').join('')||'<p>Noch keine bestätigten Testpositionen.</p>';detail();}catch(e){$('#notice').textContent=e.message;}}
$('#orders').onclick=e=>{const id=e.target.closest('[data-order]')?.dataset.order;if(id){selected=id;detail();}};$('#reload').onclick=load;await load();

async function loadOutputs(row){
 const serial=++outputSerial;
 $('#order-output-list').replaceChildren();$('#order-output-status').textContent='Ausgaben werden geladen …';
 $('#order-output-link').href='/werkstatt/ausgaben/?position='+encodeURIComponent(row.id);
 try{
  const response=await fetch('/api/workshop/orders/'+row.id+'/outputs'),value=await response.json();
  if(!response.ok)throw Error(value.error?.message||'Ausgaben nicht erreichbar.');
  if(selected!==row.id||serial!==outputSerial)return;
  $('#order-output-status').textContent=value.total?value.total+' Ausgabe'+(value.total===1?'':'n')+' gespeichert.':'Noch keine Ausgabe gespeichert. Über die gesicherte Gestaltung eine Druck- oder Gravurausgabe erstellen.';
  $('#order-output-list').innerHTML=value.jobs.slice(0,3).map(job=>'<a href="'+jobLink(job.id,row.id)+'">'+esc(outputLabel(job))+'<small>'+esc(outputDate(job.createdAt))+' · '+esc(job.id.slice(-8))+'</small></a>').join('');
 }catch(error){if(selected===row.id&&serial===outputSerial)$('#order-output-status').textContent=error.message;}
}
