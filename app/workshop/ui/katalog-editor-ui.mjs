// Catalogue adapter for the existing product editor. No product is imported or saved.
import {merchantNavigation} from './merchant-navigation.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=selector=>document.querySelector(selector);
export function katalogEditorRequest(search){
 const params=new URLSearchParams(search),reihe=params.get('katalogReihe'),id=params.get('katalogDesign');
 return reihe||id?{reihe:reihe||'',id:id||'',...(params.get('katalogLinie')?{linie:params.get('katalogLinie')}:{})}:null;
}
export const katalogEditorBody=state=>({reihe:state.katalogEditor.reihe,id:state.katalogEditor.id,checksum:state.katalogEditor.checksum,document:state.draft});
export function katalogTextChange(object,key,value,fonts){
 const next={...object,[key]:value};
 if(next.type==='text'){
  const factor=anchor=>anchor==='start'?-.5:anchor==='end'?.5:0;
  const baselineX=object.x+factor(object.textAnchor)*object.w;
  if(key==='size'&&Number.isFinite(object.lineHeight))next.lineHeight=object.lineHeight*value/object.size;
  measureText(next,fonts);
  // Keep the explicit SVG anchor fixed while changing line length or alignment.
  if(['text','font','size','letterSpacing','textAnchor'].includes(key))next.x=baselineX-factor(next.textAnchor)*next.w;
 }else if(['w','h'].includes(key)){
  if(!Number.isFinite(value)||value<=0)throw Error('Die Motivgröße muss größer als null sein.');
  const other=key==='w'?'h':'w';next[other]=object[other]*value/object[key];
 }
 return next;
}
export function katalogTextAddition(result){
 const design=result.document.config.profile.designs.find(d=>d.id===result.designId),object=design.objects.find(o=>o.id===result.objectId);
 if(!object||object.type!=='text')throw Error('Neuer Text fehlt.');
 const previous=object.id,id=previous.startsWith('text-')?previous:'text-'+previous.replace(/^element-/,'');
 if(id!==previous&&design.objects.some(o=>o.id===id))throw Error('Textkennung ist bereits vorhanden.');
 object.id=id;object.fieldKey=id;object.textAnchor='middle';object.letterSpacing=0;
 const rights=result.document.elementRights[design.id];rights[id]=rights[previous];if(id!==previous)delete rights[previous];
 result.objectId=id;return result;
}
export function katalogFitMarkup(fit){
 if(!Array.isArray(fit?.sizes)||!fit.sizes.length)throw Error('Die Größenprüfung ist unvollständig. Bitte erneut prüfen.');
 const labels={ok:'passt',fits:'passt',pass:'passt',warning:'prüfen',review:'prüfen','prüfen':'prüfen',error:'passt nicht',fail:'passt nicht',blocked:'passt nicht','passt nicht':'passt nicht'};
 return fit.sizes.map(row=>'<li><strong>'+escape(row.label||row.key||row.size)+'</strong><span class="katalog-fit-result">'+escape(labels[row.status]||row.status)+'</span>'+(row.issues?.length?'<ul>'+row.issues.map(issue=>'<li>'+escape(typeof issue==='string'?issue:issue.message||issue.code)+'</li>').join('')+'</ul>':'')+'</li>').join('');
}
export function katalogFitNeedsConfirmation(fit){return fit.sizes.some(row=>!['ok','fits','pass','passt','prüfen','warning','review'].includes(row.status));}
export function installKatalogEditor({state,api,productEditor,canDiscard,setBusy,notify}){
 const dialog=document.createElement('dialog');dialog.id='katalog-fit-dialog';dialog.className='authoring-dialog';dialog.setAttribute('aria-labelledby','katalog-fit-title');document.body.append(dialog);
 const back=()=>merchantNavigation('/werkstatt/designs/?'+new URLSearchParams({reihe:state.katalogEditor.reihe,...(state.katalogEditor.linie?{linie:state.katalogEditor.linie}:{})}),location.href);
 let request=0;
 function sync(){
  $('#save-product').textContent=state.busy?'Wird geprüft …':'Im Katalog speichern';
  $('#katalog-discard').disabled=state.busy||!state.dirty;$('#katalog-fit').disabled=state.busy||!state.record;$('#katalog-reload').disabled=state.busy;
  $('#save-indicator').textContent=state.busy?'Bitte warten …':state.dirty?'Ungespeicherte Änderungen':state.record?'Katalogstand geladen':'Katalogdesign nicht geladen';
  for(const node of document.querySelectorAll('[data-action=overview]'))node.disabled=state.busy;
 }
 function render(){
  document.body.classList.add('editing-product','editing-katalog');
  $('#editor-section').hidden=false;$('.overview').hidden=true;$('.page-heading').hidden=true;
  $('#record-title').textContent=state.draft.name;$('#record-id').textContent=state.katalogEditor.id;
  const g=state.draft.config.profile.geometry;
  const master=state.katalogEditor.source?.plateMm||[g.width,g.height];
  $('#record-revision').textContent='Master · '+master[0]+' × '+master[1]+' mm · '+state.katalogEditor.id;
  let note=$('#katalog-master-note');if(!note){note=document.createElement('p');note.id='katalog-master-note';note.className='katalog-master-note';$('.stage-toolbar').after(note);}note.textContent=state.katalogEditor.source?.note||'';note.hidden=!note.textContent;
  $('.overview-back').textContent='← Designs';$('#customer-view').hidden=true;$('#copy-product').hidden=true;
  $('#conflict-banner p').textContent='Dieses Katalogdesign wurde zwischenzeitlich geändert. Deine Eingaben bleiben hier erhalten. Lade den aktuellen Stand erst, wenn du diese Änderungen verwerfen möchtest.';
  $('#conflict-banner [data-action=save-separate]').hidden=true;
  for(const node of document.querySelectorAll('.editor-tabs [data-tab],.rail-secondary [data-tab]'))node.hidden=node.dataset.tab!=='designs';
  for(const node of document.querySelectorAll('.editor-panel'))node.hidden=node.id!=='panel-designs';
  state.tab='designs';productEditor.render();sync();
 }
 function apply(data){
  if(!data.document?.config?.profile?.designs?.length||typeof data.checksum!=='string')throw Error('Das Katalogdesign ist unvollständig.');
  state.katalogEditor={...state.katalogEditor,...data,document:undefined};
  const revision=(state.record?.revision||0)+1;
  state.record={id:'katalog:'+state.katalogEditor.reihe+':'+state.katalogEditor.id,revision,status:'draft',document:data.document};
  state.draft=structuredClone(data.document);state.dirty=false;$('#conflict-banner').hidden=true;render();
 }
 async function load(){
  if(state.busy)return;setBusy(true);
  try{const data=await api('/api/workshop/designs/editor?'+new URLSearchParams({reihe:state.katalogEditor.reihe,id:state.katalogEditor.id}));apply(data);$('#katalog-reload').hidden=true;}
  catch(error){$('#katalog-reload').hidden=false;$('#stage-status').textContent=state.record?'Der aktuelle Stand konnte nicht geladen werden.':'Katalogdesign konnte nicht geladen werden.';throw error;}
  finally{setBusy(false);}
 }
 async function inspectFit({saving=false}={}){
  const fit=await api('/api/workshop/designs/editor/fit',{method:'POST',body:katalogEditorBody(state)}),markup=katalogFitMarkup(fit),warning=katalogFitNeedsConfirmation(fit);
  dialog.innerHTML='<h2 id="katalog-fit-title">'+(saving?'Vor dem Speichern: alle Größen prüfen':'Alle Designgrößen prüfen')+'</h2><p>Die Mastergestaltung wird unverändert übernommen. Es wird nichts automatisch eingepasst.</p><ul class="katalog-fit-list">'+markup+'</ul>'+(warning?'<p class="katalog-fit-warning" role="alert"><strong>Mindestens eine Größe passt nicht.</strong> Der Entwurf kann gespeichert werden, ist dadurch aber noch nicht verwendbar oder freigegeben.</p>':'')+(saving?'<p>Eine Inhaltsänderung setzt die bisherige Designfreigabe zurück. Danach ist eine neue Sichtprüfung erforderlich.</p>':'')+'<form method="dialog">'+(saving&&warning?'<label class="katalog-fit-ack"><input type="checkbox" id="katalog-fit-ack" required> Ich habe die nicht passenden Größen geprüft und möchte den Entwurf trotzdem speichern.</label>':'')+'<div class="dialog-actions"><button value="cancel" formnovalidate>'+(saving?'Zurück zum Bearbeiten':'Schließen')+'</button>'+(saving?'<button class="primary" value="save" '+(warning?'disabled':'')+'>'+(warning?'Trotzdem im Katalog speichern':'Im Katalog speichern')+'</button>':'')+'</div></form>';
  const ack=dialog.querySelector('#katalog-fit-ack'),save=dialog.querySelector('[value=save]');if(ack)ack.addEventListener('change',()=>{save.disabled=!ack.checked;});
  dialog.returnValue='cancel';dialog.showModal();
  return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(saving&&dialog.returnValue==='save'&&(!warning||ack.checked)),{once:true}));
 }
 async function save(){
  if(!state.record||state.busy||!state.dirty)return;
  const invalid=[...$('#panel-designs').querySelectorAll('input,textarea,select')].find(node=>!node.disabled&&!node.checkValidity());
  if(invalid){invalid.reportValidity();invalid.focus();return;}
  setBusy(true);const ticket=++request;
  try{
   if(!await inspectFit({saving:true})||ticket!==request)return;
   const data=await api('/api/workshop/designs/editor',{method:'PUT',body:katalogEditorBody(state)});apply(data);
   try{localStorage.setItem('gravuru-katalog-design-updated',JSON.stringify({reihe:state.katalogEditor.reihe,id:state.katalogEditor.id,checksum:data.checksum}));}catch{}
   notify(data.changed?'Im Katalog gespeichert. Die Designfreigabe wurde zurückgesetzt. Bitte die neue Vorschau im Dashboard prüfen.':'Der Katalogstand ist unverändert.');
  }catch(error){if(error.status===409)$('#conflict-banner').hidden=false;notify(error.message,'error');}
  finally{setBusy(false);}
 }
 const actions=$('.editor-heading .button-row');
 actions.insertAdjacentHTML('afterbegin','<button type="button" id="katalog-discard">Änderungen verwerfen</button><button type="button" id="katalog-fit">Größen prüfen</button><button type="button" id="katalog-reload" hidden>Erneut laden</button>');
 $('#katalog-reload').addEventListener('click',async()=>{if(state.busy||!await canDiscard())return;try{await load();notify('Katalogdesign geladen.');}catch(error){notify(error.message,'error');}});
 $('#katalog-discard').addEventListener('click',async()=>{if(state.busy||!await canDiscard())return;state.draft=structuredClone(state.record.document);state.dirty=false;productEditor.resetHistory?.();render();notify('Ungespeicherte Änderungen verworfen.');});
 $('#katalog-fit').addEventListener('click',async()=>{if(state.busy)return;setBusy(true);try{await inspectFit();}catch(error){notify(error.message,'error');}finally{setBusy(false);}});
 // Enter the catalogue shell before any asynchronous request can fail.
 document.body.classList.add('editing-product','editing-katalog');$('#editor-section').hidden=false;$('.overview').hidden=true;$('.page-heading').hidden=true;
 $('#record-title').textContent=state.katalogEditor.id;$('#record-revision').textContent='Katalogdesign wird geladen …';$('.overview-back').textContent='← Designs';$('#customer-view').hidden=true;$('#copy-product').hidden=true;
 for(const node of document.querySelectorAll('.editor-tabs [data-tab],.rail-secondary [data-tab]'))node.hidden=node.dataset.tab!=='designs';
 for(const node of document.querySelectorAll('.editor-panel'))node.hidden=node.id!=='panel-designs';
 sync();
 return {load,render,save,sync,async leave(){if(state.busy||!await canDiscard())return;state.dirty=false;location.href=back();}};
}
