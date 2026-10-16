import {merchantRequest as fetch} from './merchant-request.mjs';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=c=>c===null||c===undefined?'offen':(c/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const ruleText=r=>r.label+' · '+(r.layout==='none'?'ohne Löcher':r.edgeMm===null?'Bohrbild offen':r.edgeMm+' mm')+(r.priceCents?' · +'+euro(r.priceCents):r.priceCents===null?' · Aufpreis offen':'');
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
const busy=v=>{state.busy=v;for(const b of document.querySelectorAll('button,select,input'))b.disabled=v||b.dataset.blocked==='true';};

function renderList(){
 $('#family-count').textContent=state.families.length;
 $('#family-list').innerHTML=state.families.length?state.families.map(f=>`<button type="button" class="family-row" data-family="${esc(f.id)}"><strong>${esc(f.name)}</strong><span>${esc(f.material||'')} · Stand ${f.revision} · ${f.sizes} Größen · ${f.generated} Produkte erzeugt${f.gaps?` · <strong>${f.gaps} Angaben offen</strong>`:''}</span></button>`).join(''):'<p class="empty-state">Noch keine Produktfamilie angelegt.</p>';
 const missing=state.bundled.filter(b=>!state.families.some(f=>f.id===b.id));
 $('#family-bundled').innerHTML=missing.map(b=>`<button type="button" data-bundled="${esc(b.id)}">＋ ${esc(b.name)} übernehmen</button>`).join('');
}
function renderDetail(){
 const rec=state.record,f=rec.document,byId=new Map(f.mountingRules.map(r=>[r.id,r])),group=$('#family-group').value,made=new Map(rec.products.map(p=>[p.sizeKey,p.productId]));
 $('#family-detail').hidden=false;$('#family-title').textContent=f.name;$('#family-meta').textContent='FAMILIE · STAND '+rec.revision;
 $('#family-summary').textContent=`${f.material.label}, ${f.material.thicknessMm===null?'Stärke offen':String(f.material.thicknessMm).replace('.',',')+' mm'} · ${f.sizes.length} Größen · ${rec.products.filter(p=>p.productId).length} Produkte erzeugt`;
 const ready=rec.readiness||{ready:true,gaps:[]};let gapBox=$('#family-gaps');if(!gapBox){gapBox=document.createElement('div');gapBox.id='family-gaps';gapBox.className='notice';gapBox.dataset.tone='error';$('#family-rules').after(gapBox);}
 gapBox.hidden=ready.ready;gapBox.innerHTML=ready.ready?'':`<strong>Noch keine Produkte erzeugbar.</strong> ${esc(ready.reason)}${ready.gaps.length&&!ready.reason.startsWith('Stammdaten')?'<br>Offen: '+ready.gaps.map(esc).join(' · '):''}<br><small>Probelauf mit Designs und Briefing funktionieren trotzdem. Offene Werte unter „Bearbeiten“ eintragen (leeres Preisfeld = offen).</small>`;
 $('#family-generate').dataset.blocked=ready.ready?'':'true';
 $('#family-rules').textContent=`Gestaltungsrand ${f.designArea.marginMm===null?'offen':f.designArea.marginMm+' mm'} · Schutzzone um Bohrlöcher ${f.designArea.keepoutMm} mm · Motive dürfen über Bohrlöcher, Texte erhalten einen Hinweis · ${f.withoutMounting?'„Ohne Bohrung“ wird angeboten':'Bohrung immer enthalten'} · ${f.fonts.length} Schriften`;
 const options=['<option value="">Alle Formen</option>',...f.groups.map(g=>`<option value="${esc(g.key)}"${g.key===group?' selected':''}>${esc(g.name)}</option>`)];$('#family-group').innerHTML=options.join('');
 const sizes=f.sizes.filter(s=>!group||s.groupKey===group),groups=new Map(f.groups.map(g=>[g.key,g]));
 $('#family-sizes').innerHTML=sizes.map(s=>`<tr data-size="${esc(s.key)}"${state.preview===s.key?' aria-current="true" style="background:#eef5f1"':''}><td><input type="checkbox" data-pick="${esc(s.key)}" aria-label="${esc(s.label)} auswählen"${state.selected.has(s.key)?' checked':''}></td><td><button type="button" class="family-link" data-preview="${esc(s.key)}">${esc(s.label)}</button><br><small>${esc(s.key)}</small></td><td>${esc(groups.get(s.groupKey).name)}</td><td class="num">${euro(s.baseCents)}</td><td>${s.mounting.map(id=>esc(ruleText(byId.get(id)))).join('<br>')||'ohne'}</td><td>${made.get(s.key)?`<a href="/werkstatt/?configuration=${encodeURIComponent(made.get(s.key))}">öffnen</a>`:'–'}</td></tr>`).join('');
 $('#family-generate').disabled=!ready.ready;const n=state.selected.size;$('#family-generate').textContent=n?`${n} ausgewählte Produkte erzeugen`:'Alle Produkte erzeugen';
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

// ---- Bearbeiten -----------------------------------------------------------
// The draft is a full copy of the family document. Saving sends it with the
// expected revision; the server validates everything and keeps every revision.
const LAYOUTS={'left-right':['mittig links/rechts',2],'top-bottom':['mittig oben/unten',2],'corners':['vier Ecken',4],'top-center':['oben mittig',1],'none':['ohne Löcher (Klebepads o. ä.)',0]};
const cents=v=>{if(String(v).trim()==='')return null;const n=Number(String(v).trim().replace(/\s|€/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100):NaN;};
const money=c=>c===null?'':(c/100).toFixed(2).replace('.',',');
const num=v=>String(v).trim()===''?null:Number(String(v).replace(',','.'));
const skuFor=(g,w,h)=>`${state.draft.sizeKeyPrefix??'GR-ES'}-${g}-${String(w).replace('.','P')}X${String(h).replace('.','P')}${state.draft.sizeKeySuffix??'-T15'}`;
let fontChoices=null;
async function editStart(){
 if(!state.record)return;
 if(!fontChoices){try{fontChoices=(await api('/api/workshop/font-library')).fonts.map(f=>f.id);}catch{fontChoices=[];}}
 state.draft=structuredClone(state.record.document);state.draftBase=state.record.revision;state.removed=new Set();state.editGroup='';
 renderEditor();$('#family-editor').hidden=false;$('#family-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function used(kind,id){const d=state.draft;return kind==='group'?d.sizes.some(s=>s.groupKey===id&&!state.removed.has(s.key)):d.sizes.some(s=>s.mounting.includes(id)&&!state.removed.has(s.key));}
function renderEditor(conflict=''){
 const d=state.draft,groupOptions=k=>d.groups.map(g=>`<option value="${esc(g.key)}"${g.key===k?' selected':''}>${esc(g.name)}</option>`).join('');
 const sizes=d.sizes.map((s,i)=>({s,i})).filter(({s})=>!state.editGroup||s.groupKey===state.editGroup);
 $('#family-editor').innerHTML=`<form class="family-edit" id="family-edit-form" novalidate>
 <div class="editor-heading"><div><p class="eyebrow">BEARBEITEN · AUSGANGSSTAND ${state.draftBase}</p><h2 id="family-editor-title">${esc(d.name)} bearbeiten</h2><small>Speichern legt einen neuen Familienstand an. Erzeugte Produkte ändern sich erst über „Auf Produkte übernehmen“.</small></div>
 <div class="button-row"><button type="button" id="family-edit-cancel">Verwerfen</button><button type="submit" class="primary">Als neuen Stand speichern</button></div></div>
 ${conflict?`<div class="conflict-banner" role="alert"><strong>${esc(conflict)}</strong><div class="button-row"><button type="button" id="family-edit-reload">Aktuellen Stand laden (eigene Änderungen verwerfen)</button></div></div>`:''}
 <fieldset><legend>Allgemein</legend><div class="grid">
  <label>Name<input type="text" data-f="name" value="${esc(d.name)}" maxlength="120" required></label>
  <label>Materialbezeichnung<input type="text" data-f="material.label" value="${esc(d.material.label)}" maxlength="80"></label>
  <label>Materialstärke (mm, leer = offen)<input type="number" step="0.1" min="0.3" max="50" data-f="material.thicknessMm" value="${d.material.thicknessMm??''}"${d.schema==='gravuru-product-family/v1'?' disabled':''}></label>
  <label>Gestaltungsrand (mm, leer = offen)<input type="number" step="0.5" min="0" max="30" data-f="designArea.marginMm" value="${d.designArea.marginMm??''}"></label>
  <label>Schutzzone um Bohrlöcher (mm)<input type="number" step="0.5" min="0" max="20" data-f="designArea.keepoutMm" value="${d.designArea.keepoutMm}"></label>
  <label style="align-self:end"><input type="checkbox" data-f="withoutMounting"${d.withoutMounting?' checked':''}> „Ohne Bohrung“ anbieten</label>
 </div>
 <p><strong>Zugelassene Schriften</strong></p><div class="fonts">${[...new Set([...d.fonts,...fontChoices])].map(f=>`<label><input type="checkbox" data-font="${esc(f)}"${d.fonts.includes(f)?' checked':''}> ${esc(f)}</label>`).join('')}</div>
 <label style="display:block;margin-top:12px">Stilnotizen für das Briefing<textarea data-f="briefingNotes" rows="3" maxlength="8000" style="width:100%">${esc(d.briefingNotes)}</textarea></label></fieldset>
 <fieldset><legend>Formgruppen</legend><table class="family-table"><thead><tr><th>Kürzel</th><th>Name</th><th>Form</th><th>Eckenradius (mm)</th><th></th></tr></thead><tbody>
 ${d.groups.map((g,i)=>`<tr><td>${g.isNew?`<input type="text" data-g="${i}" data-k="key" value="${esc(g.key)}" maxlength="10" placeholder="z. B. HE">`:esc(g.key)}</td><td><input type="text" data-g="${i}" data-k="name" value="${esc(g.name)}"></td><td><select data-g="${i}" data-k="shape"><option value="rect"${g.shape==='rect'?' selected':''}>eckig</option><option value="ellipse"${g.shape==='ellipse'?' selected':''}>oval</option></select></td><td><input type="number" step="0.5" min="0" data-g="${i}" data-k="cornerRadiusMm" value="${g.cornerRadiusMm}"${g.shape==='ellipse'?' disabled':''}></td><td><button type="button" data-remove-group="${i}"${used('group',g.key)?' disabled title="Wird von Größen verwendet"':''}>Entfernen</button></td></tr>`).join('')}
 </tbody></table><button type="button" id="add-group">＋ Formgruppe</button></fieldset>
 <fieldset><legend>Bohrbilder</legend><p class="field-help">Löcher werden für jede Größe aus der Regel berechnet. Randabstand = Rand bis Bohrlochmitte.</p><table class="family-table"><thead><tr><th>Bezeichnung</th><th>Lage</th><th>Ø mm</th><th>Randabstand mm</th><th>Zubehör</th><th>Aufpreis €</th><th>SKU-Endung</th><th></th></tr></thead><tbody>
 ${d.mountingRules.map((r,i)=>`<tr><td><input type="text" data-r="${i}" data-k="label" value="${esc(r.label)}"></td><td><select data-r="${i}" data-k="layout">${Object.entries(LAYOUTS).map(([k,[l]])=>`<option value="${k}"${k===r.layout?' selected':''}>${l}</option>`).join('')}</select></td><td><input type="number" step="0.5" min="1" max="12" data-r="${i}" data-k="diameterMm" value="${r.diameterMm??''}" placeholder="offen"${r.layout==='none'?' disabled':''}></td><td><input type="number" step="0.5" min="1" data-r="${i}" data-k="edgeMm" value="${r.edgeMm??''}" placeholder="offen"${r.layout==='none'?' disabled':''}></td><td><select data-r="${i}" data-k="accessory"><option value="">–</option><option value="screws"${r.accessory==='screws'?' selected':''}>Schrauben dabei</option></select></td><td><input type="text" inputmode="decimal" data-r="${i}" data-k="priceCents" value="${money(r.priceCents)}" placeholder="offen"></td><td><input type="text" data-r="${i}" data-k="skuSuffix" value="${esc(r.skuSuffix)}" maxlength="8"></td><td><button type="button" data-remove-rule="${i}"${used('rule',r.id)?' disabled title="Wird von Größen verwendet"':''}>Entfernen</button></td></tr>`).join('')}
 </tbody></table><button type="button" id="add-rule">＋ Bohrbild</button></fieldset>
 <fieldset><legend>Größen <span class="count">${d.sizes.length-state.removed.size}</span></legend>
 <div class="toolbar"><label>Formgruppe<select id="edit-group"><option value="">Alle Formen</option>${groupOptions(state.editGroup)}</select></label><button type="button" id="add-size">＋ Größe</button></div>
 <div style="overflow-x:auto"><table class="family-table"><thead><tr><th>Bezeichnung</th><th>Form</th><th>Breite mm</th><th>Höhe mm</th><th>Grundpreis €</th><th>Befestigung</th><th>SKU</th><th></th></tr></thead><tbody>
 ${sizes.map(({s,i})=>{const gone=state.removed.has(s.key);return `<tr class="${gone?'removed':''}"><td><input type="text" data-s="${i}" data-k="label" value="${esc(s.label)}"${gone?' disabled':''}></td><td><select data-s="${i}" data-k="groupKey"${gone?' disabled':''}>${groupOptions(s.groupKey)}</select></td><td><input type="number" step="0.1" min="10" data-s="${i}" data-k="widthMm" value="${s.widthMm}"${gone?' disabled':''}></td><td><input type="number" step="0.1" min="10" data-s="${i}" data-k="heightMm" value="${s.heightMm}"${gone?' disabled':''}></td><td><input type="text" inputmode="decimal" data-s="${i}" data-k="baseCents" value="${money(s.baseCents)}" placeholder="offen"${gone?' disabled':''}></td><td><div class="mounts">${d.mountingRules.map(r=>`<label><input type="checkbox" data-mount="${i}" value="${esc(r.id)}"${s.mounting.includes(r.id)?' checked':''}${gone?' disabled':''}> ${esc(r.skuSuffix)} · ${r.layout==='none'?'ohne Löcher':r.edgeMm===null?'offen':r.edgeMm+' mm'}</label>`).join('')}</div></td><td><small>${s.isNew?'neu: '+esc(skuFor(s.groupKey,s.widthMm,s.heightMm)):esc(s.key)}</small></td><td><button type="button" data-remove-size="${esc(s.key)}">${gone?'Behalten':'Entfernen'}</button></td></tr>`;}).join('')}
 </tbody></table></div><p class="field-help">Entfernte Größen verschwinden aus der Familie. Bereits erzeugte Produkte dazu bleiben bestehen.</p></fieldset></form>`;
}
function readEditor(){
 const d=state.draft,form=$('#family-edit-form');
 for(const n of form.querySelectorAll('[data-f]')){const path=n.dataset.f.split('.'),target=path.length>1?d[path[0]]:d,key=path.at(-1);target[key]=n.type==='checkbox'?n.checked:n.type==='number'?num(n.value):n.value;}
 d.fonts=[...form.querySelectorAll('[data-font]')].filter(n=>n.checked).map(n=>n.dataset.font);
 for(const n of form.querySelectorAll('[data-g]')){const g=d.groups[n.dataset.g];g[n.dataset.k]=n.type==='number'?num(n.value):n.value;if(g.shape==='ellipse')g.cornerRadiusMm=0;}
 for(const n of form.querySelectorAll('[data-r]')){const r=d.mountingRules[n.dataset.r],k=n.dataset.k;r[k]=k==='priceCents'?cents(n.value):n.type==='number'?num(n.value):n.value;if(k==='layout')r.count=LAYOUTS[r.layout][1];if(k==='accessory'&&!n.value)delete r.accessory;}
 for(const r of d.mountingRules)if(r.layout==='none'){r.count=0;r.diameterMm=null;r.edgeMm=null;}
 for(const n of form.querySelectorAll('[data-s]')){const s=d.sizes[n.dataset.s],k=n.dataset.k;s[k]=k==='baseCents'?cents(n.value):n.type==='number'?num(n.value):n.value;}
 for(const s of d.sizes.map((s,i)=>i))if(form.querySelector(`[data-mount="${s}"]`))d.sizes[s].mounting=[...form.querySelectorAll(`[data-mount="${s}"]`)].filter(n=>n.checked).map(n=>n.value);
}
function documentForSave(){
 const d=structuredClone(state.draft);
 d.sizes=d.sizes.filter(s=>!state.removed.has(s.key));
 for(const s of d.sizes)if(s.isNew){s.key=skuFor(s.groupKey,s.widthMm,s.heightMm);delete s.isNew;}
 for(const g of d.groups)delete g.isNew;
 for(const r of d.mountingRules){if(r.isNew){r.id=r.layout==='none'?r.skuSuffix:r.edgeMm===null?r.skuSuffix+'-OFFEN-'+Date.now().toString(36):r.skuSuffix+'-E'+String(r.edgeMm).replace('.','P')+'-D'+String(r.diameterMm).replace('.','P');delete r.isNew;}}
 const bad=[...d.sizes.filter(s=>!(s.baseCents===null||Number.isSafeInteger(s.baseCents))).map(s=>s.label),...d.mountingRules.filter(r=>!(r.priceCents===null||Number.isSafeInteger(r.priceCents))).map(r=>r.label)];
 if(bad.length)throw Error('Bitte gültige Eurobeträge eingeben: '+bad.join(', '));
 return d;
}
document.addEventListener('click',e=>{
 if(!state.draft||!e.target.closest('#family-editor'))return;
 const t=e.target;
 if(t.id==='family-edit-cancel'){state.draft=null;$('#family-editor').hidden=true;return;}
 if(t.id==='family-edit-reload'){editStart();return;}
 readEditor();
 if(t.id==='add-group')state.draft.groups.push({key:'',name:'Neue Form',shape:'rect',cornerRadiusMm:0,isNew:true});
 else if(t.id==='add-rule')state.draft.mountingRules.push({id:'neu-'+Date.now(),label:'2 Bohrlöcher Ø 4 mm',layout:'left-right',count:2,diameterMm:4,edgeMm:6,priceCents:0,skuSuffix:'B02',isNew:true});
 else if(t.id==='add-size'){const g=state.editGroup||state.draft.groups[0].key;state.draft.sizes.push({key:'neu-'+Date.now(),isNew:true,groupKey:g,label:'Neue Größe',widthMm:100,heightMm:50,baseCents:0,mounting:[]});}
 else if(t.dataset.removeGroup!==undefined)state.draft.groups.splice(Number(t.dataset.removeGroup),1);
 else if(t.dataset.removeRule!==undefined)state.draft.mountingRules.splice(Number(t.dataset.removeRule),1);
 else if(t.dataset.removeSize){const k=t.dataset.removeSize,s=state.draft.sizes.find(x=>x.key===k);if(s?.isNew)state.draft.sizes=state.draft.sizes.filter(x=>x!==s);else state.removed.has(k)?state.removed.delete(k):state.removed.add(k);}
 else return;
 renderEditor();
});
document.addEventListener('change',e=>{if(e.target.id==='edit-group'){readEditor();state.editGroup=e.target.value;renderEditor();}else if(e.target.closest('#family-editor')&&(e.target.dataset.k==='shape'||e.target.dataset.k==='layout')){readEditor();renderEditor();}});
document.addEventListener('submit',async e=>{
 if(e.target.id!=='family-edit-form')return;e.preventDefault();readEditor();
 let document_;try{document_=documentForSave();}catch(err){notice(err.message,'error');return;}
 busy(true);
 try{const rec=await api('/api/workshop/families/'+encodeURIComponent(state.record.id),{method:'PATCH',body:{expectedRevision:state.draftBase,document:document_}});
  state.draft=null;$('#family-editor').hidden=true;busy(false);await open(rec.id);await load();
  notice(rec.revision===state.draftBase?'Keine Änderungen gefunden.':`Gespeichert als Stand ${rec.revision}. Erzeugte Produkte sind unverändert. Über „Auf Produkte übernehmen …“ siehst du, was sich dort ändern würde.`);}
 catch(err){busy(false);if(err.status===409)renderEditor('Die Familie wurde inzwischen von jemand anderem geändert. Deine Eingaben wurden nicht gespeichert.');else notice(err.message,'error');}
});
$('#family-edit').addEventListener('click',()=>editStart());

// ---- Auf Produkte übernehmen ------------------------------------------------
async function syncPreview(){
 busy(true);try{const plan=await api(`/api/workshop/families/${encodeURIComponent(state.record.id)}/sync`);state.syncPlan=plan;renderSync();}catch(e){notice(e.message,'error');}finally{busy(false);}
}
function renderSync(result){
 const p=state.syncPlan,panel=$('#family-sync-panel');panel.hidden=false;
 const rows=p.items.filter(i=>i.status!=='same').map(i=>`<li><a href="/werkstatt/?configuration=${encodeURIComponent(i.productId)}">${esc(i.label)}</a> · ${i.status==='error'?`<strong>nicht übernehmbar:</strong> ${esc(i.message)}`:`<ul class="sync-change">${i.changes.map(c=>`<li>${esc(c.label)}: ${esc(c.before)} → <strong>${esc(c.after)}</strong></li>`).join('')}</ul>`}</li>`).join('');
 panel.innerHTML=`<div class="editor-heading"><div><p class="eyebrow">AUF PRODUKTE ÜBERNEHMEN · FAMILIENSTAND ${p.familyRevision}</p><h2>Vorschau der Änderungen</h2><small>${p.changed} Produkte mit Änderungen · ${p.unchanged} bereits aktuell · ${p.errors} nicht übernehmbar${p.orphaned.length?' · '+p.orphaned.length+' Produkte zu entfernten Größen bleiben unverändert':''}</small></div>
 <div class="button-row"><button type="button" id="sync-close">Schließen</button><button type="button" class="primary" id="sync-apply"${p.changed?'':' disabled'}>${p.changed} Produkte aktualisieren</button></div></div>
 ${result?`<div class="notice" data-tone="${result.failed?'error':'success'}">${result.updated} Produkte aktualisiert${result.failed?', '+result.failed+' nicht: '+esc(result.results.filter(r=>!r.ok).map(r=>r.sizeKey+' – '+r.message).join('; ')):''}. Jedes Produkt hat dafür einen neuen Stand; Designs und Kundenfreigaben bleiben erhalten.</div>`:''}
 ${rows?`<ul>${rows}</ul>`:'<p class="empty-state">Alle erzeugten Produkte entsprechen diesem Familienstand.</p>'}`;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
$('#family-sync').addEventListener('click',()=>syncPreview());
document.addEventListener('click',async e=>{
 if(e.target.id==='sync-close'){$('#family-sync-panel').hidden=true;return;}
 if(e.target.id!=='sync-apply')return;
 const p=state.syncPlan;if(!confirm(`${p.changed} Produkte auf Familienstand ${p.familyRevision} aktualisieren? Jedes Produkt erhält einen neuen Stand; der bisherige bleibt im Verlauf. Nichts wird im Shop veröffentlicht.`))return;
 busy(true);try{const r=await api(`/api/workshop/families/${encodeURIComponent(state.record.id)}/sync`,{method:'POST',body:{expectedRevision:p.familyRevision,token:p.token}});state.syncPlan=await api(`/api/workshop/families/${encodeURIComponent(state.record.id)}/sync`);renderSync(r);}
 catch(err){notice(err.status===409?'Seit der Vorschau hat sich etwas geändert. Die Vorschau wurde neu geladen.':err.message,'error');if(err.status===409)await syncPreview();}finally{busy(false);}
});
