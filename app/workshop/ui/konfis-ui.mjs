// B1 Konfis: kundenfähige Konfiguratoren je Mandant mit Status, Shop-Verknüpfung, Kundenansicht und Einbettung.
import {merchantRequest as fetch} from './merchant-request.mjs';
import {customerPreviewLink} from './customer-preview-link.mjs';
import {merchantNavigation} from './merchant-navigation.mjs';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const merchant=()=>document.querySelector('meta[name=gravuru-merchant-auth]')?.content==='required';
const state={csrf:null,status:'all',page:1,busy:false,data:null,timer:null};
const STATUS_TEXT={draft:'Entwurf',released:'Freigegeben',paused:'Pausiert'};
const date=v=>v?new Date(v).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'}):'';
function notice(message,tone='success'){const n=$('#konfi-notice');n.textContent=message;n.dataset.tone=tone;n.hidden=!message;}
async function api(path,{method='GET',body}={}){
 if(method!=='GET'&&!state.csrf)state.csrf=(await api('/api/workshop/session')).csrfToken;
 const r=await fetch(path,{method,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(method==='GET'?{}:{'X-Gravuru-CSRF':state.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let data;try{data=await r.json();}catch{throw Error('Die Werkstatt hat keine gültige Antwort gesendet.');}
 if(!r.ok)throw Object.assign(Error(data.error?.message||'Die Aktion konnte nicht abgeschlossen werden.'),{status:r.status,code:data.error?.code});
 return data;
}
function shopText(shop){
 if(shop.state==='product'){const numeric=/^gid:\/\/shopify\/Product\/(\d+)$/.exec(shop.shopifyProductId||'')?.[1];
  return `<strong>Shopify-Produkt${shop.shopStatus==='DRAFT'?' (Entwurf)':''}</strong><span>${esc(shop.handle||shop.shopifyProductId)}</span>${numeric&&shop.shopDomain?`<a href="https://${esc(shop.shopDomain)}/admin/products/${numeric}" target="_blank" rel="noopener">In Shopify ansehen ↗</a>`:''}`;}
 if(shop.state==='variants')return `<strong>Shop-Varianten zugeordnet</strong><span>${shop.variantCount} ${shop.variantCount===1?'Variante':'Varianten'} · ${esc(shop.shopDomain)}</span>`;
 return '<strong class="konfi-muted">nicht verknüpft</strong><span>Zuordnung unter „Shop vorbereiten“.</span>';
}
function chips(k,labels){
 return (k.categoryIds||[]).map(id=>{const l=labels[id]||{label:id.replaceAll('-',' '),known:false};return l.known?`<span>${esc(l.label)}</span>`:`<span class="category-unknown" title="${esc(l.hint||'Kürzel ohne Klarnamen')}">${esc(l.label)} · Kürzel</span>`;}).join('');
}
function card(k,labels){
 const status=k.status.status,edit=merchantNavigation((k.formProduct?'/werkstatt/formprodukt/':'/werkstatt/')+'?configuration='+encodeURIComponent(k.id),location.href);
 const customer=merchant()?customerPreviewLink(k.id,k.revision):{href:k.customerPath,target:'_blank'};
 const snippet=`<iframe src="${location.origin}${k.customerPath}" title="${k.name} gestalten" loading="lazy" style="width:100%;min-height:820px;border:0"></iframe>`;
 const actions=[status!=='released'?`<button type="button" class="primary" data-konfi-action="released" data-id="${esc(k.id)}" data-expected="${status}">Freigeben</button>`:'',status!=='paused'?`<button type="button" data-konfi-action="paused" data-id="${esc(k.id)}" data-expected="${status}">Pausieren</button>`:''].join('');
 return `<article class="konfi-card" data-konfi="${esc(k.id)}">
  <div class="konfi-main"><h2><a href="${esc(edit)}">${esc(k.name)}</a></h2><p class="konfi-meta"><code>${esc(k.id)}</code> · Stand ${k.revision}${k.status.changedAt?' · Status seit '+esc(date(k.status.changedAt)):''}</p><div class="card-categories">${chips(k,labels)}</div></div>
  <div class="konfi-info"><p class="konfi-shop"><span class="konfi-label">Shop</span>${shopText(k.shop)}</p><p class="konfi-shop"><span class="konfi-label">Kundenansicht</span>${status==='paused'?'<span>Kunden sehen einen Hinweis statt des Editors.</span>':''}<a href="${esc(customer.href)}" target="${customer.target}" rel="noopener">Kundenansicht öffnen ↗</a></p></div>
  <div class="konfi-side"><span class="konfi-status" data-status="${status}">${STATUS_TEXT[status]}</span><div class="konfi-actions">${actions}</div></div>
  <div class="konfi-foot"><details class="konfi-embed"><summary>Einbetten</summary><label class="sr-only" for="embed-${esc(k.id)}">Einbettungs-Schnipsel für ${esc(k.name)}</label><textarea id="embed-${esc(k.id)}" readonly rows="3" spellcheck="false">${esc(snippet)}</textarea><div class="konfi-embed-row"><button type="button" data-copy="embed-${esc(k.id)}">Schnipsel kopieren</button><small>Nur zum Kopieren – es wird nichts an Shopify gesendet. Die Adresse ist die dieser Werkstatt.</small></div></details><details class="konfi-history" data-id="${esc(k.id)}"><summary>Verlauf</summary><div class="konfi-events">Wird geladen …</div></details></div>
 </article>`;
}
function render(){
 const d=state.data;if(!d)return;
 for(const b of document.querySelectorAll('[data-status]'))if(b.tagName==='BUTTON'){b.setAttribute('aria-pressed',String(b.dataset.status===state.status));b.querySelector('span').textContent='('+(d.counts[b.dataset.status]??0)+')';}
 $('#konfi-list').innerHTML=d.konfis.length?d.konfis.map(k=>card(k,d.categoryLabels)).join(''):`<p class="empty-state">${d.counts.all?'Kein Konfi mit diesem Status.':'Noch keine kundenfähigen Konfis. Lege ein Produkt an oder erzeuge Produkte aus einer Produktfamilie.'}</p>`;
 $('#konfi-excluded').hidden=!d.excluded;$('#konfi-excluded').textContent=d.excluded?d.excluded+(d.excluded===1?' Produkt ist':' Produkte sind')+' noch nicht kundenfähig (zum Beispiel ein Formprodukt ohne Design) und erscheint hier erst danach.':'';
 $('#konfi-page-status').textContent=`Seite ${d.page} von ${d.pages} · ${d.total} ${d.total===1?'Konfi':'Konfis'}`;$('#konfi-previous').disabled=d.page<=1||state.busy;$('#konfi-next').disabled=d.page>=d.pages||state.busy;
}
async function load(){
 const params=new URLSearchParams({status:state.status,page:String(state.page),pageSize:'24'}),query=$('#konfi-search').value.trim();if(query)params.set('query',query);
 try{state.data=await api('/api/workshop/konfis?'+params);state.page=state.data.page;render();}catch(e){notice(e.message,'error');$('#konfi-list').innerHTML='<p class="empty-state">Konfis konnten nicht geladen werden.</p>';}
}
async function history(details){
 const box=details.querySelector('.konfi-events');
 try{const d=await api('/api/workshop/konfis/'+encodeURIComponent(details.dataset.id)+'/events');
  box.innerHTML=d.events.length?'<ol>'+d.events.map(e=>`<li><strong>${esc(e.fromLabel)} → ${esc(e.toLabel)}</strong> · ${esc(date(e.at))} · Stand ${e.productRevision} · ${esc(e.actor.startsWith('merchant:')?'Shopify-Benutzer':'Lokale Werkstatt')}</li>`).join('')+'</ol>':'<p>Noch keine Statusänderung. Der Konfi ist ein Entwurf.</p>';}
 catch(e){box.textContent=e.message;}
}
document.addEventListener('click',async e=>{
 const filter=e.target.closest('button[data-status]');if(filter&&!state.busy){state.status=filter.dataset.status;state.page=1;await load();return;}
 const copy=e.target.closest('[data-copy]');
 if(copy){const area=document.getElementById(copy.dataset.copy);try{await navigator.clipboard.writeText(area.value);notice('Einbettungs-Schnipsel kopiert. Es wurde nichts an Shopify gesendet.');}catch{area.focus();area.select();notice('Schnipsel markiert – mit Strg+C oder Cmd+C kopieren.','info');}return;}
 const action=e.target.closest('[data-konfi-action]');if(!action||state.busy)return;
 state.busy=true;for(const b of document.querySelectorAll('[data-konfi-action]'))b.disabled=true;
 try{const d=await api('/api/workshop/konfis/'+encodeURIComponent(action.dataset.id)+'/status',{method:'POST',body:{status:action.dataset.konfiAction,expectedStatus:action.dataset.expected}});
  notice(d.status.status==='paused'?'Pausiert. Die Kundenansicht zeigt jetzt einen Hinweis statt des Editors.':'Freigegeben. Kunden können diesen Konfi gestalten.');}
 catch(error){notice(error.message,'error');}
 finally{state.busy=false;await load();}
});
document.addEventListener('toggle',e=>{if(e.target.matches?.('.konfi-history')&&e.target.open)history(e.target);},true);
$('#konfi-search').addEventListener('input',()=>{clearTimeout(state.timer);state.timer=setTimeout(()=>{state.page=1;load();},250);});
$('#konfi-previous').onclick=()=>{if(state.page>1){state.page--;load();}};
$('#konfi-next').onclick=()=>{if(state.data&&state.page<state.data.pages){state.page++;load();}};
document.addEventListener('workshop-session-restored',()=>load());
load();
