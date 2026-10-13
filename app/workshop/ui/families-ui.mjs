import {merchantRequest as fetch} from './merchant-request.mjs';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=c=>(c/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const state={csrf:null,families:[],bundled:[],record:null,busy:false,selected:new Set(),preview:null};
function notice(message,tone='success'){const n=$('#family-notice');n.textContent=message;n.dataset.tone=tone;n.hidden=!message;}
async function api(path,{method='GET',body,raw=false}={}){
 if(method!=='GET'&&!state.csrf)state.csrf=(await api('/api/workshop/session')).csrfToken;
 const r=await fetch(path,{method,credentials:'same-origin',headers:{Accept:raw?'*/*':'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(method==='GET'?{}:{'X-Gravuru-CSRF':state.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(raw&&r.ok)return r;
 let data;try{data=await r.json();}catch{throw Error('Die Werkstatt hat keine gültige Antwort gesendet.');}
 if(!r.ok)throw Object.assign(Error(data.error?.message||data.message||'Die Aktion konnte nicht abgeschlossen werden.'),{status:r.status});
 return data;
}
const busy=v=>{state.busy=v;for(const b of document.querySelectorAll('button,select,input'))b.disabled=v;};

function renderList(){
 $('#family-count').textContent=state.families.length;
 $('#family-list').innerHTML=state.families.length?state.families.map(f=>`<button type="button" class="family-row" data-family="${esc(f.id)}"><strong>${esc(f.name)}</strong><span>Stand ${f.revision} · ${f.groups} Formen · ${f.sizes} Größen · ${f.generated} Produkte erzeugt</span></button>`).join(''):'<p class="empty-state">Noch keine Produktfamilie angelegt.</p>';
 const missing=state.bundled.filter(b=>!state.families.some(f=>f.id===b.id));
 $('#family-bundled').innerHTML=missing.map(b=>`<button type="button" data-bundled="${esc(b.id)}">＋ ${esc(b.name)} übernehmen</button>`).join('');
}
function renderDetail(){
 const rec=state.record,f=rec.document,byId=new Map(f.mountingRules.map(r=>[r.id,r])),group=$('#family-group').value,made=new Map(rec.products.map(p=>[p.sizeKey,p.productId]));
 $('#family-detail').hidden=false;$('#family-title').textContent=f.name;$('#family-meta').textContent='FAMILIE · STAND '+rec.revision;
 $('#family-summary').textContent=`${f.material.label}, ${String(f.material.thicknessMm).replace('.',',')} mm · ${f.sizes.length} Größen · ${rec.products.filter(p=>p.productId).length} Produkte erzeugt`;
 $('#family-rules').textContent=`Gestaltungsrand ${f.designArea.marginMm} mm · Schutzzone um Bohrlöcher ${f.designArea.keepoutMm} mm · Motive dürfen über Bohrlöcher, Texte erhalten einen Hinweis · ${f.withoutMounting?'„Ohne Bohrung“ wird angeboten':'Bohrung immer enthalten'} · ${f.fonts.length} Schriften`;
 const options=['<option value="">Alle Formen</option>',...f.groups.map(g=>`<option value="${esc(g.key)}"${g.key===group?' selected':''}>${esc(g.name)}</option>`)];$('#family-group').innerHTML=options.join('');
 const sizes=f.sizes.filter(s=>!group||s.groupKey===group),groups=new Map(f.groups.map(g=>[g.key,g]));
 $('#family-sizes').innerHTML=sizes.map(s=>`<tr data-size="${esc(s.key)}"${state.preview===s.key?' aria-current="true" style="background:#eef5f1"':''}><td><input type="checkbox" data-pick="${esc(s.key)}" aria-label="${esc(s.label)} auswählen"${state.selected.has(s.key)?' checked':''}></td><td><button type="button" class="family-link" data-preview="${esc(s.key)}">${esc(s.label)}</button><br><small>${esc(s.key)}</small></td><td>${esc(groups.get(s.groupKey).name)}</td><td class="num">${euro(s.baseCents)}</td><td>${s.mounting.map(id=>esc(byId.get(id).label+' · '+byId.get(id).edgeMm+' mm'+(byId.get(id).priceCents?' · +'+euro(byId.get(id).priceCents):''))).join('<br>')||'ohne'}</td><td>${made.get(s.key)?`<a href="/werkstatt/?configuration=${encodeURIComponent(made.get(s.key))}">öffnen</a>`:'–'}</td></tr>`).join('');
 const n=state.selected.size;$('#family-generate').textContent=n?`${n} ausgewählte Produkte erzeugen`:'Alle Produkte erzeugen';
}
async function load(){busy(true);try{const d=await api('/api/workshop/families');state.families=d.families;state.bundled=d.bundled;renderList();}catch(e){notice(e.message,'error');}finally{busy(false);}}
async function open(id){busy(true);try{state.record=await api('/api/workshop/families/'+encodeURIComponent(id));state.selected.clear();state.preview=null;$('#family-template').innerHTML='';renderDetail();}catch(e){notice(e.message,'error');}finally{busy(false);}}
async function preview(key){
 state.preview=key;renderDetail();
 try{const r=await api(`/api/workshop/families/${encodeURIComponent(state.record.id)}/template/${encodeURIComponent(key)}`,{raw:true}),svg=await r.text();
  // Rendered as an image: the template never runs inside the page.
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));$('#family-template').innerHTML=`<img alt="Gestaltungsschablone ${esc(key)}" style="width:100%;height:auto" src="${url}">`;
 }catch(e){notice(e.message,'error');}
}
$('#family-list').addEventListener('click',e=>{const b=e.target.closest('[data-family]');if(b&&!state.busy)open(b.dataset.family);});
$('#family-bundled').addEventListener('click',async e=>{const b=e.target.closest('[data-bundled]');if(!b||state.busy)return;busy(true);try{const rec=await api('/api/workshop/families',{method:'POST',body:{bundled:b.dataset.bundled}});notice(`„${rec.name}“ übernommen: ${rec.document.sizes.length} Größen, ${rec.document.mountingRules.length} Bohrbild-Regeln. Noch keine Produkte erzeugt.`);busy(false);await load();await open(rec.id);}catch(err){notice(err.message,'error');busy(false);}});
$('#family-group').addEventListener('change',()=>renderDetail());
$('#family-sizes').addEventListener('click',e=>{const p=e.target.closest('[data-preview]');if(p)preview(p.dataset.preview);});
$('#family-sizes').addEventListener('change',e=>{const c=e.target.closest('[data-pick]');if(!c)return;c.checked?state.selected.add(c.dataset.pick):state.selected.delete(c.dataset.pick);renderDetail();});
$('#family-select-all').addEventListener('change',e=>{for(const row of document.querySelectorAll('#family-sizes [data-pick]'))e.target.checked?state.selected.add(row.dataset.pick):state.selected.delete(row.dataset.pick);renderDetail();});
$('#family-generate').addEventListener('click',async()=>{
 const rec=state.record,keys=[...state.selected],count=keys.length||rec.document.sizes.length;
 if(!confirm(`${count} Produktentwürfe aus „${rec.document.name}“ erzeugen? Bereits erzeugte Produkte bleiben unverändert. Nichts wird im Shop veröffentlicht.`))return;
 busy(true);try{const r=await api(`/api/workshop/families/${encodeURIComponent(rec.id)}/products`,{method:'POST',body:{expectedRevision:rec.revision,...(keys.length?{sizeKeys:keys}:{})}});notice(`${r.created} neue Produktentwürfe erzeugt, ${r.existing} waren bereits vorhanden.`);busy(false);await open(rec.id);await load();}
 catch(e){notice(e.status===409?'Die Familie wurde inzwischen geändert. Bitte neu laden.':e.message,'error');busy(false);}
});
$('#family-briefing').addEventListener('click',async()=>{
 busy(true);try{const r=await api(`/api/workshop/families/${encodeURIComponent(state.record.id)}/briefing`,{method:'POST',body:{},raw:true}),blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Briefing-${state.record.id}-Stand-${state.record.revision}.zip`;document.body.append(a);a.click();a.remove();notice('Briefing heruntergeladen. In das ChatGPT-Projekt der Familie legen und bei Änderungen ersetzen.');}
 catch(e){notice(e.message,'error');}finally{busy(false);}
});
void load();
