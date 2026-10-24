// Design-Dashboard (/werkstatt/designs/): Designs einer Linie aus dem Katalog mit Ampel, Vorschau,
// Filtern und Inline-Umbenennung (PATCH → Katalog). Liest nur über /api/workshop/designs.
import {merchantRequest} from './merchant-request.mjs';
import {setMerchantImage,merchantImagesRequired} from './merchant-media.mjs';
const $=s=>document.querySelector(s),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
const natural=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
const params=new URLSearchParams(location.search);
const state={csrf:null,lines:[],linie:params.get('linie')||null,reihe:params.get('reihe')||null,material:null,status:params.get('status')||'',freigabe:params.get('freigabe')||'',selectable:true,query:'',view:localStorage.getItem('gravuru-designs-view')==='tiles'?'tiles':'table',data:null,busy:false,editing:null};
const status=(text,error=false)=>{$('#status').textContent=text;$('#status').className=error?'error':'';$('#status').hidden=!text;};
async function request(url,options){const r=await merchantRequest(url,options);const v=await r.json().catch(()=>({}));if(!r.ok)throw Error(v.error?.message||'Die Designs konnten nicht geladen werden.');return v;}
const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;};
const mm=v=>Number.isFinite(v)?String(Math.round(v*10)/10).replace('.',','):'?';
const plateText=p=>Array.isArray(p)?mm(p[0])+' × '+mm(p[1])+' mm':'Maß offen';
const AMPEL={ok:'ok','prüfen':'prüfen',fehlt:'fehlt'};

function pushUrl(){const q=new URLSearchParams();if(state.linie)q.set('linie',state.linie);if(state.reihe)q.set('reihe',state.reihe);if(state.status)q.set('status',state.status);if(state.freigabe)q.set('freigabe',state.freigabe);history.replaceState(null,'',location.pathname+(q.size?'?'+q:''));}

async function loadLines(){
 const [session,data]=await Promise.all([request('/api/workshop/session'),request('/api/workshop/designs')]);
 state.csrf=session.csrfToken;state.lines=data.linien;
 if(!state.lines.some(l=>l.id===state.linie))state.linie=(state.lines.find(l=>l.designsLieferform2>0||l.bestand.length)||state.lines[0])?.id||null;
}
async function loadLine(){
 if(!state.linie){state.data=null;render();return;}
 state.busy=true;status('Designs werden geladen …');
 try{const q=new URLSearchParams({linie:state.linie});state.data=await request('/api/workshop/designs?'+q);status('');}
 catch(e){state.data=null;status(e.message,true);}
 finally{state.busy=false;render();}
}
async function load(){state.busy=true;$('#refresh').disabled=true;status('Katalog wird geladen …');try{await loadLines();await loadLine();}catch(e){status(e.message,true);}finally{state.busy=false;$('#refresh').disabled=false;}}

function visibleRows(){
 const d=state.data;if(!d)return [];
 const q=state.query.trim().toLocaleLowerCase('de');
 return d.rows.filter(r=>(!state.reihe||r.reihe===state.reihe||r.formatreihe===state.reihe)&&(!state.material||r.material===state.material)&&(!state.status||r.status===state.status)&&(!state.freigabe||r.released===(state.freigabe==='ja'))&&(!state.selectable||r.selectable)&&(!q||[r.id,r.name,r.nameSheet||'',...r.fonts.map(f=>f.name),...r.themes.map(t=>t.name),...(r.texts.sample||[])].some(v=>String(v).toLocaleLowerCase('de').includes(q)))).sort((a,b)=>natural.compare(a.id,b.id));
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
// Im Shopify-Admin (eingebettet) brauchen /api/workshop/-Bilder das Sitzungstoken: setMerchantImage lädt sie über
// merchant-media (Blob-URL) statt über ein anonymes src; außerhalb bleibt es ein normales src.
function preview(row,cls){
 const img=el('img',undefined,cls);img.loading='lazy';img.alt=row.name;img.decoding='async';
 const src=row.files.png||row.files.svg;if(src){setMerchantImage(img,src);if(row.files.png&&row.files.svg)img.addEventListener('error',()=>setMerchantImage(img,row.files.svg),{once:true});}else img.classList.add('missing');
 const a=el('a'),href=row.files.svg||row.files.png;a.title='Vorschau in neuem Tab öffnen';
 if(href&&merchantImagesRequired()){a.href='#';a.addEventListener('click',e=>{e.preventDefault();openPrivate(href);});}
 else{a.href=href||'#';a.target='_blank';a.rel='noopener';}
 a.append(img);return a;
}
async function openPrivate(href){
 const win=window.open('','_blank');if(!win)return status('Neues Fenster blockiert – bitte Pop-ups für die Werkstatt erlauben.',true);
 try{const r=await merchantRequest(href);if(!r.ok)throw Error();const url=URL.createObjectURL(await r.blob());win.opener=null;win.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000);}
 catch{win.close();status('Vorschau konnte nicht geöffnet werden. Bitte Anmeldung prüfen.',true);}
}
function editorCell(row){
 const box=el('div',undefined,'actions');
 if(row.konfi?.products?.length){const p=row.konfi.products[0];const a=el('a','Im Editor öffnen','button');a.href=p.href;a.title='Konfi-Produkt '+p.importKey+' (Stand '+p.revision+')';box.append(a);if(row.konfi.products.length>1)box.append(el('small',row.konfi.products.length+' Produkte','muted'));}
 else box.append(el('span',row.lieferform2?'noch nicht importiert':'keine Lieferform 2','muted'));
 if(row.lieferform2){box.append(button('Name ändern',()=>{state.editing=row.id;render();}));box.append(button(row.hidden?'Einblenden':'Ausblenden',()=>save(row,{hidden:!row.hidden}),'quiet'));
  // Freigabe (Chris 23.10.2026): manuell geprüft → freigeben; erst dann Konfi-Import und Shop. Zurücknehmen jederzeit.
  if(row.status!=='fehlt'||row.released){const b=button(row.released?'Freigabe zurücknehmen':'Freigeben',()=>save(row,{freigegeben:!row.released}),row.released?'quiet':'release');b.title=row.released?'Design wieder auf „offen“ setzen – kommt beim nächsten Import nicht mehr ins Produkt':'Design als geprüft freigeben – kommt beim nächsten Import ins Konfi-Produkt und in den Shop-Abgleich';box.append(b);}}
 return box;
}
function nameCell(row){
 const box=el('div',undefined,'name');
 if(state.editing===row.id){
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
 return box;
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
async function save(row,change){
 if(state.busy)return;state.busy=true;status('Änderung wird in den Katalog geschrieben …');
 try{
  const result=await request('/api/workshop/designs',{method:'PATCH',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':state.csrf},body:JSON.stringify({reihe:row.lieferform2.reihe,designId:row.id,...change})});
  state.editing=null;
  status(result.changed?'Gespeichert: '+result.files.join(', ')+' – Commit im Katalog-Repo durch den Betreiber.':'Keine Änderung.');
  await loadLine();
 }catch(e){status(e.message,true);state.busy=false;render();}
 finally{state.busy=false;}
}
function renderRows(rows){
 const host=$('#rows');host.replaceChildren();
 if(!rows.length){host.append(el('p',state.data?'Keine Designs für diese Auswahl.':'Keine Linie gewählt.','empty'));return;}
 if(state.view==='tiles'){
  const grid=el('div',undefined,'tiles');
  for(const r of rows){const card=el('article',undefined,'tile '+r.status);card.append(preview(r,'tile-img'));const head=el('div',undefined,'tile-head');head.append(ampel(r),el('code',r.id));card.append(head,nameCell(r),el('p',plateText(r.plate)+' · '+(r.material||'?')+' · '+(r.process||'?'),'muted'),fontList(r),flags(r));if(r.reasons.length){const ul=el('ul',undefined,'reasons');for(const x of r.reasons)ul.append(el('li',x));card.append(ul);}card.append(editorCell(r));grid.append(card);}
  host.append(grid);return;
 }
 const table=el('table'),thead=el('thead'),tr=el('tr');
 for(const h of ['Vorschau','Kennung','Name','Reihe','Material · Verfahren · Form','Platte','Texte · Schriften','Themen','Status','Aktionen'])tr.append(el('th',h));
 thead.append(tr);table.append(thead);const tbody=el('tbody');
 for(const r of rows){
  const row=el('tr',undefined,r.status);
  const c1=el('td');c1.append(preview(r,'thumb'));
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
 renderPicker($('#lines'),state.lines.map(l=>({key:l.id,label:l.name,count:l.designsLieferform2+(l.bestand.length?' + Bestand':''),title:l.status||''})),state.linie,key=>{state.linie=key;state.reihe=null;state.material=null;pushUrl();loadLine();});
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
 const rows=visibleRows();
 $('#summary').textContent=d?rows.length+' von '+d.counts.total+' Designs'+(state.reihe?' · '+state.reihe:'')+(state.status?' · Status '+state.status:'')+(state.freigabe?(state.freigabe==='ja'?' · freigegeben':' · offen'):'')+(state.selectable?' · nur wählbare':''):'';
 renderRows(rows);
 for(const b of document.querySelectorAll('button'))if(b.id!=='refresh')b.disabled=state.busy;
}
$('#refresh').addEventListener('click',load);
$('#filter-status').value=state.status;$('#filter-status').addEventListener('change',e=>{state.status=e.target.value;pushUrl();render();});
$('#filter-freigabe').value=state.freigabe;$('#filter-freigabe').addEventListener('change',e=>{state.freigabe=e.target.value;pushUrl();render();});
$('#filter-selectable').addEventListener('change',e=>{state.selectable=e.target.checked;render();});
$('#search').addEventListener('input',e=>{state.query=e.target.value;render();});
$('#view').value=state.view;$('#view').addEventListener('change',e=>{state.view=e.target.value;try{localStorage.setItem('gravuru-designs-view',state.view);}catch{}render();});
await load();
