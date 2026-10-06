import {merchantImageAttribute} from './merchant-media.mjs';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<img class="overview-icon" src="/workshop-ui/editor-icons/${name}.svg" alt="" aria-hidden="true">`;
const number=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n);
export function productCards(products,badge){
 return products.map(p=>{
  const info=p.overview||{},sizes=info.sizes||[{widthMm:info.widthMm,heightMm:info.heightMm}],id=escape(p.id),name=escape(p.name);
  const customerView=info.formProduct&&info.designCount>0&&p.status!=='archived';
  const formats=sizes.map(s=>number(s.widthMm/10)+' × '+number(s.heightMm/10)).join(' · ')+' cm';
  const row=(glyph,label,value)=>`<div>${icon(glyph)}<dt class="sr-only">${label}</dt><dd>${value}</dd></div>`;
  return `<article class="product-card" data-card-id="${id}">
   <div class="card-visual"><button class="card-image" data-product-id="${id}" aria-label="${name} bearbeiten"><img class="product-image" loading="lazy" ${merchantImageAttribute(`/api/workshop/products/${encodeURIComponent(p.id)}/preview.svg?revision=${p.revision}&layout=card`)} alt="${escape(info.defaultDesignName)}${info.previewLabel?' · '+escape(info.previewLabel):''}"><span class="image-error" hidden>Vorschau nicht verfügbar · Produkt öffnen</span></button>
   <label class="card-select"><input type="checkbox" data-select-product="${id}" aria-label="${name} auswählen"></label>
   <details class="card-menu"><summary aria-label="Aktionen für ${name}">${icon('dots')}</summary><div class="card-menu-items"><button data-product-id="${id}">Bearbeiten</button><button data-card-copy="${id}">Kopieren …</button><button data-card-archive="${id}">${icon('archive')}${p.status==='archived'?'Wieder aktivieren …':'Archivieren …'}</button></div></details>
   ${info.previewLabel?`<span class="card-scene-label">Abbildung: ${escape(info.previewLabel)}</span>`:''}</div>
   <div class="card-content"><div class="card-heading"><h3>${name}</h3><button data-product-id="${id}">${icon('pencil')}Bearbeiten</button></div>
   <div class="card-status">${badge(p)}<small>Stand ${p.revision} · ${info.designCount||0} ${(info.designCount||0)===1?'Design':'Designs'}</small></div>
   <dl>${row('tag','Konfigurations-ID',`<code title="${id}">${id}</code>`)}${row(info.method==='print'?'printer':'settings','Verfahren',info.method==='print'?'Druck':info.method==='engraving'?'Gravur':'Nicht hinterlegt')}${row('dimensions','Formate',escape(formats))}${row('link','Shopify','Shop-Anbindung ausstehend')}</dl>
   <a class="card-preview-link" href="${info.formProduct?(customerView?'/':'/werkstatt/formprodukt/'):'/'}?${new URLSearchParams({configuration:p.id,revision:p.revision})}" target="_blank" rel="noopener">${icon('eye')}${info.formProduct?(customerView?'Kundenentwurf prüfen':'Formprodukt öffnen'):'Kundenansicht'}</a></div></article>`;
 }).join('');
}
export function installOverview({state,api,setBusy,notify,loadList,loadRecord,openCreate}){
 const selected=new Map();let visible=[],pending=[];
 const dialog=$('#overview-archive-dialog');
 function sync(){
  const count=selected.size;$('#selection-bar').hidden=count===0;$('#selection-count').textContent=count+' ausgewählt';
  $('#archive-selection').textContent=state.filter==='archived'?'Auswahl wieder aktivieren':'Auswahl archivieren';
  for(const input of $$('[data-select-product]')){input.checked=selected.has(input.dataset.selectProduct);input.disabled=state.busy;input.closest('.product-card').classList.toggle('selected',input.checked);}
  const all=$('#select-visible');all.checked=visible.length>0&&count===visible.length;all.indeterminate=count>0&&count<visible.length;all.disabled=state.busy||!visible.length;
  for(const button of $$('#selection-bar button,[data-card-copy],[data-card-archive],#overview-archive-dialog button'))button.disabled=state.busy;
 }
 function rendered(products){
  visible=products;let changed=false;
  for(const [id,p] of selected){const current=visible.find(v=>v.id===id);if(!current||current.revision!==p.revision){selected.delete(id);if(current)changed=true;}}
  if(changed)notify('Zwischenzeitlich geänderte Produkte wurden aus der Auswahl genommen. Bitte den aktuellen Stand prüfen.','info');
  for(const img of $$('.product-image'))img.addEventListener('error',()=>{img.hidden=true;img.nextElementSibling.hidden=false;});
  sync();
 }
 function askArchive(products){
  pending=products.map(p=>({...p}));if(!pending.length)return;
  const restoring=pending[0].status==='archived';
  $('#overview-archive-title').textContent=restoring?'Wieder in die Produktübersicht?':'Ausgewählte Konfigurationen archivieren?';
  $('#overview-archive-description').textContent=restoring?'Die Konfigurationen werden wieder bearbeitbar. Ihr bisheriger Verlauf bleibt erhalten.':'Die Konfigurationen bleiben mit allen gespeicherten Ständen im Archiv. Du kannst sie jederzeit wieder aktivieren.';
  $('#overview-archive-list').replaceChildren(...pending.map(p=>{const li=document.createElement('li');li.textContent=p.name+' · Stand '+p.revision;return li;}));
  $('#confirm-overview-archive').textContent=restoring?'Wieder aktivieren':'Archivieren';dialog.showModal();$('#cancel-overview-archive').focus();
 }
 $('#product-list').addEventListener('change',e=>{
  const id=e.target.dataset.selectProduct;if(!id||state.busy)return;
  if(e.target.checked){const p=visible.find(p=>p.id===id);if(p)selected.set(id,{...p});}else selected.delete(id);sync();
 });
 $('#select-visible').addEventListener('change',e=>{if(state.busy)return;selected.clear();if(e.target.checked)for(const p of visible)selected.set(p.id,{...p});sync();});
 $('#clear-selection').addEventListener('click',()=>{if(state.busy)return;selected.clear();sync();});
 $('#archive-selection').addEventListener('click',()=>{if(!state.busy)askArchive([...selected.values()]);});
 $('#cancel-overview-archive').addEventListener('click',()=>{if(!state.busy)dialog.close();});
 dialog.addEventListener('cancel',e=>{if(state.busy)e.preventDefault();});
 $('#overview-archive-form').addEventListener('submit',async e=>{
  e.preventDefault();if(state.busy||!pending.length)return;setBusy(true);
  const failures=[];let completed=0;
  try{
   // Each product has its own expected revision. Conflicts never overwrite newer work.
   for(const p of pending){try{await api('/api/workshop/products/'+encodeURIComponent(p.id)+'/archive',{method:'POST',body:{expectedRevision:p.revision,archived:p.status!=='archived'}});selected.delete(p.id);completed++;}catch(error){failures.push(p.name+': '+(error.status===409?'inzwischen geändert; nicht übernommen':error.message));}}
   dialog.close();
   try{await loadList();}catch{failures.push('Übersicht konnte nicht neu geladen werden. Bitte aktualisieren.');}
   notify(completed+' Konfiguration'+(completed===1?'':'en')+' '+(pending[0].status==='archived'?'wieder aktiviert.':'archiviert.')+(failures.length?' Nicht übernommen: '+failures.join(' · '):' Verlauf und Designs bleiben erhalten.'),failures.length?'error':'success');
  }finally{pending=[];setBusy(false);}
 });
 $('#product-list').addEventListener('click',async e=>{
  const copy=e.target.closest('[data-card-copy]'),archive=e.target.closest('[data-card-archive]');if(!copy&&!archive)return;if(state.busy)return;
  e.target.closest('details')?.removeAttribute('open');
  if(archive){const p=visible.find(p=>p.id===archive.dataset.cardArchive);if(p)askArchive([p]);return;}
  const chosen=visible.find(p=>p.id===copy.dataset.cardCopy);
  if(chosen?.overview?.formProduct){copy.disabled=true;try{const r=await api('/api/workshop/products/'+encodeURIComponent(chosen.id)+'/copy',{method:'POST',body:{expectedRevision:chosen.revision,name:chosen.name+' · Kopie',kind:'product'}});await loadList();await loadRecord(r.id);}catch(error){copy.disabled=false;notify(error.message,'error');}return;}
  try{await loadRecord(copy.dataset.cardCopy);if(state.record?.id===copy.dataset.cardCopy)openCreate('copy');}catch(error){notify(error.message,'error');}
 });
 document.addEventListener('click',e=>{for(const menu of $$('.card-menu[open]'))if(!menu.contains(e.target))menu.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const menu of $$('.card-menu[open]')){menu.open=false;menu.querySelector('summary').focus();}});
 return {rendered,sync};
}
