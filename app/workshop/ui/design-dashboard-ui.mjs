// Design-Dashboard (/werkstatt/designs/): Designs einer Linie aus dem Katalog mit Ampel, Vorschau,
// Filtern und Inline-Umbenennung (PATCH → Katalog). Liest nur über /api/workshop/designs.
import {merchantRequest} from './merchant-request.mjs';
import {setMerchantImage,merchantImagesRequired} from './merchant-media.mjs';
import {designKey,releaseIssue,eligibleReleaseRows,retainVisibleSelection,releaseDesigns} from './design-dashboard-review.mjs';
const $=s=>document.querySelector(s),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
const natural=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
const params=new URLSearchParams(location.search);
const state={csrf:null,lines:[],linie:params.get('linie')||null,reihe:params.get('reihe')||null,material:null,status:params.get('status')||'',freigabe:params.get('freigabe')||'',selectable:params.get('startDesigns')!=='true',startDesigns:params.get('startDesigns')==='true',query:'',view:localStorage.getItem('gravuru-designs-view')==='tiles'?'tiles':'table',data:null,busy:false,editing:null,seen:new Set(),selected:new Set(),pendingRelease:null,previewToken:0,previewLoad:null};
const status=(text,error=false)=>{$('#status').textContent=text;$('#status').className=error?'error':'';$('#status').hidden=!text;};
async function request(url,options){const r=await merchantRequest(url,options);const v=await r.json().catch(()=>({}));if(!r.ok)throw Error(v.error?.message||'Die Designs konnten nicht geladen werden.');return v;}
const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;};
const mm=v=>Number.isFinite(v)?String(Math.round(v*10)/10).replace('.',','):'?';
const plateText=p=>Array.isArray(p)?mm(p[0])+' × '+mm(p[1])+' mm':'Maß offen';
const AMPEL={ok:'ok','prüfen':'prüfen',fehlt:'fehlt'};

function pushUrl(){const q=new URLSearchParams();if(state.linie)q.set('linie',state.linie);if(state.reihe)q.set('reihe',state.reihe);if(state.status)q.set('status',state.status);if(state.freigabe)q.set('freigabe',state.freigabe);if(state.startDesigns)q.set('startDesigns','true');history.replaceState(null,'',location.pathname+(q.size?'?'+q:''));}

async function loadLines(){
 const [session,data]=await Promise.all([request('/api/workshop/session'),request('/api/workshop/designs')]);
 state.csrf=session.csrfToken;state.lines=data.linien;
 if(!state.lines.some(l=>l.id===state.linie))state.linie=(state.lines.find(l=>l.designsLieferform2>0||l.bestand.length)||state.lines[0])?.id||null;
}
async function loadLine(){
 if(state.busy)return;
 state.selected.clear();state.editing=null;state.busy=true;render();status('Designs werden geladen …');
 try{state.data=state.linie?await request('/api/workshop/designs?'+new URLSearchParams({linie:state.linie})):null;status('');}
 catch(e){state.data=null;status(e.message,true);}
 finally{state.busy=false;render();}
}
async function load(){
 if(state.busy)return;
 state.seen.clear();state.selected.clear();state.busy=true;render();status('Katalog wird geladen …');
 try{await loadLines();state.selected.clear();state.editing=null;state.data=state.linie?await request('/api/workshop/designs?'+new URLSearchParams({linie:state.linie})):null;status('');}
 catch(e){state.data=null;status(e.message,true);}
 finally{state.busy=false;render();}
}

function visibleRows(){
 const d=state.data;if(!d)return [];
 const q=state.query.trim().toLocaleLowerCase('de');
 return d.rows.filter(r=>(!state.reihe||r.reihe===state.reihe||r.formatreihe===state.reihe)&&(!state.material||r.material===state.material)&&(!state.status||r.status===state.status)&&(!state.freigabe||r.released===(state.freigabe==='ja'))&&(!state.selectable||r.selectable)&&(!state.startDesigns||r.isStartDesign)&&(!q||[r.id,r.name,r.nameSheet||'',...(r.mainProducts??[]).flatMap(p=>[p.id,p.customizationId,p.name,p.sizeLabel]),...r.fonts.map(f=>f.name),...r.themes.map(t=>t.name),...(r.texts.sample||[])].some(v=>String(v).toLocaleLowerCase('de').includes(q)))).sort((a,b)=>natural.compare(a.id,b.id));
}
function renderPicker(host,items,current,onPick,{all=null}={}){
 host.replaceChildren();
 if(all){const b=button('',()=>onPick(null));b.append(el('span',all.label),el('small',all.count));b.setAttribute('aria-pressed',String(current===null));host.append(b);}
 for(const it of items){const b=button('',()=>onPick(it.key));b.append(el('span',it.label??it.key),el('small',it.count));b.setAttribute('aria-pressed',String(current===it.key));if(it.title)b.title=it.title;host.append(b);}
}
function ampel(row){const s=el('span',AMPEL[row.status],'ampel '+row.status);s.title=row.reasons.join(' ')||'Kein Befund.';return s;}
function fontList(row){
 const box=el('span',undefined,'fonts');
 for(const f of row.fonts){const s=el('span',f.name,'font '+f.status);s.title=f.status==='vorhanden'?'In der Schriftbibliothek'+(f.file?'':' (Datei fehlt)'):f.status==='ersatz'?'Ersatz laut '+(f.source||'ersatz-*.json')+': '+f.replacement:'Schrift fehlt (nicht in schriften.json, kein Ersatz)';box.append(s);}
 if(!row.fonts.length)box.append(el('span','–','muted'));
 return box;
}
// Store gate state separately: applying busy must never re-enable a blocked action.
function gate(control,issue){
 if(issue){
  if(control.dataset.blocked!=='true')control.dataset.gateTitle=control.getAttribute('title')??'';
  control.title=issue;
 }else if(control.dataset.blocked==='true'){
  if(control.dataset.gateTitle)control.title=control.dataset.gateTitle;else control.removeAttribute('title');
  delete control.dataset.gateTitle;
 }
 control.dataset.blocked=String(Boolean(issue));control.disabled=state.busy||Boolean(issue);return control;
}
function preview(row,cls){
 const img=el('img',undefined,cls);img.loading='lazy';img.alt=row.name;img.decoding='async';
 const src=row.files.png||row.files.svg;
 if(src){setMerchantImage(img,src);if(row.files.png&&row.files.svg)img.addEventListener('error',()=>setMerchantImage(img,row.files.svg),{once:true});}
 else img.classList.add('missing');
 const b=button('',()=>openPreview(row),'preview-button');b.dataset.previewKey=designKey(row);b.setAttribute('aria-label','Vorschau öffnen: '+row.id+' · '+row.name);b.title='Vorschau zum Prüfen öffnen';b.append(img,el('span','Vorschau öffnen','preview-label'));
 return gate(b,src?null:'Keine Vorschau vorhanden.');
}
// The dialog owns its request and Blob URL: the shared thumbnail loader deduplicates
// a repeated source, whereas each explicit review must receive a fresh load event.
function clearPreviewSource(){
 const previous=state.previewLoad;state.previewLoad=null;
 previous?.controller?.abort();
 const img=$('#preview-image');img.onload=null;img.onerror=null;img.removeAttribute('src');img.hidden=true;
 if(previous?.url)URL.revokeObjectURL(previous.url);
}
function releasePreview(){
 state.previewToken++;clearPreviewSource();
}
function openPreview(row){
 if(state.busy)return;
 const sources=[...new Set([row.files.png,row.files.svg].filter(Boolean))];if(!sources.length)return;
 releasePreview();
 const dialog=$('#preview-dialog'),img=$('#preview-image'),token=state.previewToken,key=designKey(row),authenticated=merchantImagesRequired();
 $('#preview-title').textContent=row.id+' · '+row.name;$('#preview-status').textContent='Vorschau wird geladen …';img.alt=row.name;
 // A failed re-open, including an expired session, must not retain an earlier approval gate.
 state.seen.delete(key);state.selected.delete(key);render();
 let next=0;
 const current=attempt=>token===state.previewToken&&dialog.open&&state.previewLoad===attempt&&!attempt.controller?.signal.aborted;
 function failed(attempt,error){
  if(!current(attempt))return;
  clearPreviewSource();state.seen.delete(key);state.selected.delete(key);render();
  const authError=error?.status===401||error?.status===403;
  if(!authError&&next<sources.length){void loadSource(sources[next++]);return;}
  $('#preview-status').textContent=authError?'Die Vorschau konnte nicht geladen werden. Bitte Anmeldung prüfen. Eine neue Freigabe bleibt gesperrt.':'Die Vorschau konnte nicht geladen werden. Eine neue Freigabe bleibt gesperrt.';
 }
 async function loadSource(source){
  clearPreviewSource();
  const attempt={controller:authenticated?new AbortController():null,url:null,src:null};state.previewLoad=attempt;
  img.onload=()=>{
   if(!current(attempt)||!attempt.src||img.getAttribute('src')!==attempt.src||(img.currentSrc&&img.currentSrc!==img.src)||!img.naturalWidth)return;
   img.hidden=false;state.seen.add(key);
   $('#preview-status').textContent='Vorschau geladen. Bitte Gestaltung, Texte und Schriften prüfen, bevor du freigibst.';
   render();
  };
  img.onerror=()=>failed(attempt);
  if(!authenticated){attempt.src=source;img.src=source;return;}
  try{
   const response=await merchantRequest(source,{signal:attempt.controller.signal});
   if(!current(attempt))return;
   if(!response.ok)throw Object.assign(Error('Vorschau nicht verfügbar.'),{status:response.status});
   if(!/^image\/(?:svg\+xml|png)(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('Unzulässiges Vorschauformat.');
   const blob=await response.blob();
   if(!current(attempt))return;
   attempt.url=URL.createObjectURL(blob);attempt.src=attempt.url;img.src=attempt.src;
  }catch(error){failed(attempt,error);}
 }
 if(!dialog.open)dialog.showModal();
 void loadSource(sources[next++]);
}

function selection(row){
 const label=el('label',undefined,'design-selection'),input=el('input');input.type='checkbox';input.dataset.designKey=designKey(row);input.checked=state.selected.has(designKey(row));
 input.setAttribute('aria-label',row.id+' zur Freigabe auswählen');
 gate(input,releaseIssue(row,state.seen));input.addEventListener('change',()=>{
  if(state.busy||releaseIssue(row,state.seen)){input.checked=state.selected.has(designKey(row));return;}
  if(input.checked)state.selected.add(designKey(row));else state.selected.delete(designKey(row));render();
 });
 label.append(input,el('span','Auswählen'));return label;
}
function mainProducts(row){
 const products=row.mainProducts??[],box=el('div',undefined,'main-products');
 const productCount=new Set(products.map(p=>JSON.stringify([p.lineId,p.id]))).size;
 if(!products.length)return box;
 box.append(el('strong','Startdesign für '+productCount+' Hauptprodukt'+(productCount===1?'':'e')+' · '+products.length+' Größenzuordnung'+(products.length===1?'':'en')));
 for(const p of products){
  const item=el('div',undefined,'main-product');
  item.append(el('span','ID '+p.id+' · '+(p.sizeLabel||p.sizeKey||'Größe offen'),'product-id'));
  if(p.customizationId&&String(p.customizationId)!==String(p.id))item.append(el('small','Customization-ID '+p.customizationId,'muted'));
  if(p.name)item.append(el('span',p.name,'muted'));
  const issues=[...new Set([...(p.blockers??[]).map(b=>b.message),...(p.fit?.issues??[]).map(i=>typeof i==='string'?i:i.message)].filter(Boolean))];
  if(issues.length){const list=el('ul',undefined,'reasons');for(const issue of issues)list.append(el('li',issue));item.append(list);}
  else if(p.fit?.status)item.append(el('small','Passung: '+p.fit.status,'muted'));
  box.append(item);
 }
 box.append(el('small','Produktbefunde bleiben auch nach der Designfreigabe bestehen.','muted'));return box;
}

function editorCell(row){
 const box=el('div',undefined,'actions');
 if(row.konfi?.products?.length){const p=row.konfi.products[0];const a=el('a','Im Editor öffnen','button');a.href=p.href;a.title='Konfi-Produkt '+p.importKey+' (Stand '+p.revision+')';box.append(a);if(row.konfi.products.length>1)box.append(el('small',row.konfi.products.length+' Produkte','muted'));}
 else box.append(el('span',row.lieferform2?'noch nicht importiert':'keine Lieferform 2','muted'));
 if(row.lieferform2){box.append(button('Name ändern',()=>{state.editing=designKey(row);render();}));box.append(button(row.hidden?'Einblenden':'Ausblenden',()=>save(row,{hidden:!row.hidden}),'quiet'));
  const issue=releaseIssue(row,state.seen),b=button(row.released?'Freigabe zurücknehmen':'Freigeben',()=>row.released?save(row,{freigegeben:false}):askRelease([row]),row.released?'quiet':'release');
  b.dataset.releaseKey=designKey(row);b.title=row.released?'Design wieder auf „offen“ setzen.':'Design nach der Sichtprüfung freigeben.';
  box.append(gate(b,row.released?null:issue));
  if(!row.released&&issue)box.append(el('small',issue,'muted'));
  if(state.seen.has(designKey(row)))box.append(el('small','Vorschau in dieser Sitzung geöffnet.','reviewed'));
 }

 return box;
}
function nameCell(row){
 const box=el('div',undefined,'name');
 if(state.editing===designKey(row)){
  const form=el('form',undefined,'rename'),input=el('input');input.type='text';input.value=row.name;input.maxLength=160;input.required=true;input.setAttribute('aria-label','Neuer Name für '+row.id);
  const ok=el('button','Speichern','primary');ok.type='submit';const cancel=button('Abbrechen',()=>{state.editing=null;render();});
  form.append(input,ok,cancel);form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())save(row,{name:input.value.trim()});});
  box.append(form);setTimeout(()=>input.focus(),0);
 }else{
  box.append(el('strong',row.name));
  if(row.nameSheet&&row.nameSheet!==row.name)box.append(el('small','Bogen: '+row.nameSheet,'muted'));
  if(row.hidden)box.append(el('span','ausgeblendet','flag'));
  if(row.released)box.append(el('span','freigegeben'+(row.freigabe?.am?' '+new Date(row.freigabe.am).toLocaleDateString('de-DE'):''),'flag released'));
  if(row.bestseller)box.append(el('span','Bestseller','flag'));
 }
 box.append(mainProducts(row));return box;
}
function flags(row){
 const box=el('div',undefined,'flags');
 if(row.labelColor)box.append(el('span',row.selectable?'grün · wählbar':'rot · nicht wählbar','flag '+(row.selectable?'green':'red')));
 if(row.production?.hasVersion)box.append(el('span','Produktionsfassung'+(row.production.of?' '+row.production.of:''),'flag'));
 if(row.duplicate)box.append(el('span',(row.duplicate.identical?'Doppelt: ':'Abweichend zu ')+row.duplicate.of,'flag warn'));
 if(row.bestand?.alteGroesse)box.append(el('span','alte Größe','flag warn'));
 if(row.bestand?.customizationIds?.length)box.append(el('span','ID '+row.bestand.customizationIds.join(', '),'flag'));
 return box;
}
function patchDesign(row,change){
 return request('/api/workshop/designs',{method:'PATCH',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':state.csrf},body:JSON.stringify({reihe:row.lieferform2.reihe,designId:row.id,...change})});
}
function applySaved(row,result,change){
 for(const key of ['name','hidden','released','freigabe'])if(result.design&&Object.hasOwn(result.design,key))row[key]=result.design[key];
 if(change.freigegeben!==undefined)row.released=change.freigegeben;
 if(state.data)state.data.counts.freigegeben=state.data.rows.filter(r=>r.released).length;
 state.selected.delete(designKey(row));
}
async function save(row,change){
 if(state.busy)return;
 if(change.freigegeben===true){askRelease([row]);return;}
 state.busy=true;render();status('Änderung wird in den Katalog geschrieben …');
 try{
  const result=await patchDesign(row,change);applySaved(row,result,change);state.editing=null;
  const message=result.changed?'Gespeichert: '+result.files.join(', ')+' – Commit im Katalog-Repo durch den Betreiber.':'Keine Änderung.';
  if(change.name!==undefined||change.hidden!==undefined){
   try{state.data=await request('/api/workshop/designs?'+new URLSearchParams({linie:state.linie}));}
   catch(e){status(message+' Die Ansicht konnte nicht aktualisiert werden: '+e.message,true);return;}
  }
  status(message);
 }catch(e){status(e.message,true);}
 finally{state.busy=false;render();}
}
function askRelease(rows){
 if(state.busy||$('#release-dialog').open)return;
 const eligible=eligibleReleaseRows(rows,state.seen);if(!eligible.length)return;
 state.pendingRelease=eligible.map(designKey);
 $('#release-count').textContent=eligible.length+' Design'+(eligible.length===1?'':'s')+' freigeben?';
 $('#release-list').replaceChildren(...eligible.map(row=>el('li',row.id+' · '+row.name)));
 $('#release-dialog').showModal();
}
async function confirmRelease(){
 if(state.busy||!state.pendingRelease)return;
 const keys=new Set(state.pendingRelease),rows=eligibleReleaseRows(visibleRows(),state.seen).filter(row=>keys.has(designKey(row)));
 state.pendingRelease=null;$('#release-dialog').close();
 if(rows.length!==keys.size){status('Die Auswahl hat sich geändert. Bitte erneut auswählen und bestätigen.',true);return;}
 state.busy=true;render();status(rows.length+' Design'+(rows.length===1?' wird':'s werden')+' freigegeben …');
 try{
  const result=await releaseDesigns(rows,{patch:row=>patchDesign(row,{freigegeben:true}),onSuccess:(row,response)=>applySaved(row,response,{freigegeben:true})});
  const errors=result.failed.map(({row,error})=>row.id+': '+error.message);
  status(result.succeeded.length+' freigegeben.'+(errors.length?' '+result.failed.length+' nicht freigegeben: '+errors.join(' · '):' Änderungen sind im Katalog gespeichert; den Commit macht der Betreiber.'),Boolean(errors.length));
 }finally{state.busy=false;render();}
}

function renderRows(rows){
 const host=$('#rows');host.replaceChildren();
 if(!rows.length){host.append(el('p',state.data?'Keine Designs für diese Auswahl.':'Keine Linie gewählt.','empty'));return;}
 if(state.view==='tiles'){
  const grid=el('div',undefined,'tiles');
  for(const r of rows){const card=el('article',undefined,'tile '+r.status);card.append(preview(r,'tile-img'));const head=el('div',undefined,'tile-head');head.append(ampel(r),el('code',r.id));card.append(head,selection(r),nameCell(r),el('p',plateText(r.plate)+' · '+(r.material||'?')+' · '+(r.process||'?'),'muted'),fontList(r),flags(r));if(r.reasons.length){const ul=el('ul',undefined,'reasons');for(const x of r.reasons)ul.append(el('li',x));card.append(ul);}card.append(editorCell(r));grid.append(card);}
  host.append(grid);return;
 }
 const table=el('table'),thead=el('thead'),tr=el('tr');
 for(const h of ['Vorschau','Kennung','Name','Reihe','Material · Verfahren · Form','Platte','Texte · Schriften','Themen','Status','Aktionen'])tr.append(el('th',h));
 thead.append(tr);table.append(thead);const tbody=el('tbody');
 for(const r of rows){
  const row=el('tr',undefined,r.status);
  const c1=el('td');c1.append(selection(r),preview(r,'thumb'));
  const c2=el('td');c2.append(el('code',r.id));if(r.lieferform2)c2.append(el('small',r.lieferform2.reihe,'muted'));else if(r.bestand)c2.append(el('small','Bogen '+r.bestand.base,'muted'));
  const c3=el('td');c3.append(nameCell(r),flags(r));
  const c4=el('td',r.formatreihe||'offen');if(r.bestand?.formatreihe&&r.bestand.formatreihe!==r.formatreihe)c4.append(el('small','Bogen: '+r.bestand.formatreihe,'muted'));
  const c5=el('td',[r.material,r.process,r.form].filter(Boolean).join(' · ')||'offen');
  const c6=el('td',plateText(r.plate));
  const c7=el('td');c7.append(el('div',r.texts.count+' Text'+(r.texts.count===1?'':'e')+(r.motifs?' · '+r.motifs+' Motiv'+(r.motifs===1?'':'e'):'')+(r.photos?' · '+r.photos+' Foto':'')),fontList(r));if(r.texts.sample?.length)c7.append(el('small',r.texts.sample.join(' / '),'muted'));
  const c8=el('td',r.themes.map(t=>t.name).join(', ')||'–');
  const c9=el('td');c9.append(ampel(r));if(r.reasons.length){const ul=el('ul',undefined,'reasons');for(const x of r.reasons)ul.append(el('li',x));c9.append(ul);}
  const c10=el('td');c10.append(editorCell(r));
  row.append(c1,c2,c3,c4,c5,c6,c7,c8,c9,c10);tbody.append(row);
 }
 table.append(tbody);host.append(table);
}
function render(){
 renderPicker($('#lines'),state.lines.map(l=>({key:l.id,label:l.name,count:l.designsLieferform2+(l.bestand.length?' + Bestand':''),title:l.status||''})),state.linie,key=>{if(state.busy)return;state.linie=key;state.reihe=null;state.material=null;pushUrl();loadLine();});
 const d=state.data;
 $('#metrics').hidden=!d;
 if(d){
  const c=d.counts;
  $('#metrics').replaceChildren(...[[c.total,'Designs'],[c.ok,'ok'],[c['prüfen'],'prüfen'],[c.fehlt,'fehlt'],[c.freigegeben,'freigegeben'],[c.lieferform2,'Lieferform 2'],[c.selectable,'wählbar']].map(([n,t])=>{const m=el('div',undefined,'metric '+t.replace(/\W/g,''));m.append(el('strong',n),el('span',t));return m;}));
  const reihen=[...d.reihen.map(r=>({key:r.key,label:r.key,count:r.counts.total,title:'ok '+r.counts.ok+' · prüfen '+r.counts['prüfen']+' · fehlt '+r.counts.fehlt}))];
  renderPicker($('#reihen'),reihen,state.reihe,key=>{state.reihe=key;pushUrl();render();},{all:{label:'Alle',count:d.counts.total}});
  renderPicker($('#materials'),d.materials.map(m=>({key:m.key,count:m.counts.total})),state.material,key=>{state.material=key;render();},{all:{label:'Alle',count:d.counts.total}});
  $('#notes').replaceChildren(...d.notes.map(n=>el('p',n,'notice')),...(d.bestand.overviews.length?[el('p','Bestand: '+d.bestand.overviews.map(o=>o.overview+' ('+o.grund+')').join(', ')+' – '+d.bestand.sheets.length+' Bögen','muted')]:[]));
 }else{$('#reihen').replaceChildren();$('#materials').replaceChildren();$('#notes').replaceChildren();}
 $('#filter-selectable').checked=state.selectable;gate($('#filter-selectable'),state.startDesigns?'Startdesigns zeigen auch fehlende oder nicht wählbare Designs.':null);
 const rows=visibleRows();state.selected=retainVisibleSelection(state.selected,rows,state.seen);
 $('#summary').textContent=d?rows.length+' von '+d.counts.total+' Designs'+(state.reihe?' · '+state.reihe:'')+(state.status?' · Status '+state.status:'')+(state.freigabe?(state.freigabe==='ja'?' · freigegeben':' · offen'):'')+(state.selectable?' · nur wählbare':'')+(state.startDesigns?' · nur Startdesigns von Hauptprodukten':'')+(state.startDesigns&&Number.isInteger(d.startDesignSummary?.references)?' · insgesamt '+d.startDesignSummary.references+' Hauptprodukt-Zuordnungen in dieser Linie':''):'';
 renderRows(rows);
 $('#selection-summary').textContent=state.selected.size+' ausgewählt · '+eligibleReleaseRows(rows,state.seen).length+' sichtbare Designs zur Freigabe bereit';
 gate($('#release-selected'),state.selected.size?null:'Erst Vorschauen öffnen und Designs auswählen.');
 gate($('#clear-selection'),state.selected.size?null:'Keine Designs ausgewählt.');
 for(const control of document.querySelectorAll('main button, main input, main select'))control.disabled=state.busy||control.dataset.blocked==='true';
 $('#main').setAttribute('aria-busy',String(state.busy));
}
$('#preview-close').addEventListener('click',()=>{releasePreview();$('#preview-dialog').close();});
$('#preview-dialog').addEventListener('cancel',releasePreview);
$('#preview-dialog').addEventListener('close',()=>{if(!$('#preview-dialog').open)releasePreview();});
$('#release-dialog').addEventListener('close',()=>{state.pendingRelease=null;});
$('#release-cancel').addEventListener('click',()=>$('#release-dialog').close());
$('#release-confirm').addEventListener('click',confirmRelease);
$('#release-selected').addEventListener('click',()=>askRelease(visibleRows().filter(row=>state.selected.has(designKey(row)))));
$('#clear-selection').addEventListener('click',()=>{if(state.busy)return;state.selected.clear();render();});
$('#filter-start-designs').checked=state.startDesigns;
$('#filter-start-designs').addEventListener('change',e=>{state.startDesigns=e.target.checked;if(state.startDesigns)state.selectable=false;pushUrl();render();});
$('#refresh').addEventListener('click',load);
$('#filter-status').value=state.status;$('#filter-status').addEventListener('change',e=>{state.status=e.target.value;pushUrl();render();});
$('#filter-freigabe').value=state.freigabe;$('#filter-freigabe').addEventListener('change',e=>{state.freigabe=e.target.value;pushUrl();render();});
$('#filter-selectable').addEventListener('change',e=>{state.selectable=e.target.checked;render();});
$('#search').addEventListener('input',e=>{state.query=e.target.value;render();});
$('#view').value=state.view;$('#view').addEventListener('change',e=>{state.view=e.target.value;try{localStorage.setItem('gravuru-designs-view',state.view);}catch{}render();});
await load();
