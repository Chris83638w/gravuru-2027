// B1: Mandantenliste (Gerüst). „Mandant anlegen“ bleibt deaktiviert, bis das Abo-Modell steht.
import {merchantRequest as fetch} from './merchant-request.mjs';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notice(message,tone='error'){const n=$('#tenant-notice');n.textContent=message;n.dataset.tone=tone;n.hidden=!message;}
async function load(){
 try{
  const r=await fetch('/api/workshop/tenants',{headers:{Accept:'application/json'}});let d;try{d=await r.json();}catch{throw Error('Die Werkstatt hat keine gültige Antwort gesendet.');}
  if(!r.ok)throw Error(d.error?.message||'Mandanten konnten nicht geladen werden.');
  $('#tenant-create-hint').textContent=d.create.reason;
  $('#tenant-list').innerHTML=`<div class="tenant-table" role="table" aria-label="Mandanten"><div role="row" class="tenant-row tenant-header"><span role="columnheader">Mandant</span><span role="columnheader">Shop</span><span role="columnheader">Status</span><span role="columnheader">Konfis</span><span role="columnheader">Produkte</span></div>`+
   d.tenants.map(t=>`<div role="row" class="tenant-row"><span role="cell"><strong>${esc(t.name)}</strong><small>Mandant ${t.primary?'1 · ':''}${esc(t.id)}</small></span><span role="cell">${t.shopDomain?esc(t.shopDomain):'<span class="konfi-muted">kein Shop hinterlegt</span>'}</span><span role="cell">${t.status==='active'?'aktiv':'pausiert'}</span><span role="cell"><strong>${t.konfis}</strong><small>${t.released} freigegeben · ${t.paused} pausiert</small></span><span role="cell"><strong>${t.products}</strong><small>aktive Produkte</small></span></div>`).join('')+'</div>';
 }catch(e){notice(e.message);$('#tenant-list').innerHTML='';}
}
document.addEventListener('workshop-session-restored',()=>load());
load();
