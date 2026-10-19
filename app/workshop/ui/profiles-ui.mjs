import {merchantRequest as fetch} from './merchant-request.mjs';
import {confirmProfileImpact} from './profile-impact-ui.mjs';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={fonts:'Schriften',motifs:'Motive',colors:'Farben',bestsellers:'Bestseller'};
const state={profiles:[],catalog:{fonts:[],motifs:[]},settings:null,record:null,draft:null,dirty:false,busy:false,csrf:null,assignmentDirty:false,assignmentRevision:null,selection:{scope:'default',categoryId:'',type:'fonts'}};
function notice(message,tone='success'){const node=$('#profile-notice');node.textContent=message;node.dataset.tone=tone;node.hidden=!message;}
async function api(path,{method='GET',body}={}){
 if(method!=='GET'&&!state.csrf)state.csrf=(await api('/api/workshop/session')).csrfToken;
 const response=await fetch(path,{method,credentials:'same-origin',headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(method==='GET'?{}:{'X-Gravuru-CSRF':state.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let data;try{data=await response.json();}catch{throw Error('Die Werkstatt hat keine gültige Antwort gesendet. Bitte erneut versuchen.');}
 if(!response.ok){const error=new Error(data.error?.message||data.message||(typeof data.error==='string'?data.error:'Die Aktion konnte nicht abgeschlossen werden.'));error.status=response.status;error.code=data.error?.code;throw error;}return data;
}
function controls(){
 for(const node of $$('button,input,select'))node.disabled=state.busy||(!state.settings&&node.id!=='refresh-profiles');
 $('#profile-type').disabled=state.busy||!!state.record;
 $('#save-profile').disabled=state.busy||!state.draft||(!!state.record&&!state.dirty);
 $('#save-assignment').disabled=state.busy||!state.settings||!state.assignmentDirty;
 $('#assignment-profile').disabled=state.busy||$('#assignment-mode').value!=='override';
 $('#assignment-category').disabled=state.busy||$('#assignment-scope').value!=='category';
 $('#assignment-category').required=$('#assignment-scope').value==='category';$('#category-field').hidden=$('#assignment-scope').value!=='category';
 for(const button of $$('[data-item-move]')){const index=Number(button.dataset.index);button.disabled=state.busy||(button.dataset.itemMove==='up'?index===0:index===(state.draft?.items.length||0)-1);}
 $('#profile-save-state').textContent=state.busy?'Wird bearbeitet …':state.dirty?'Ungespeicherte Änderungen':state.record?'Stand '+state.record.revision+' · gespeichert':'Noch nicht gespeichert';
 $('#assignment-state').textContent=state.assignmentDirty?'Ungespeichert · '+assignmentTarget(readAssignmentSelection()):state.settings?'Zuordnungen · Stand '+state.settings.revision:'';
}
function busy(value){state.busy=value;controls();}
function dirty(){state.dirty=true;controls();}
async function discard(kind='profile'){
 if(!(kind==='assignment'?state.assignmentDirty:state.dirty))return true;
 const dialog=$('#profile-discard-dialog');dialog.querySelector('p').textContent=kind==='assignment'?'Wenn du fortfährst, werden die ungespeicherten Änderungen dieser Zuordnung verworfen.':'Wenn du fortfährst, werden die Änderungen im geöffneten Profil verworfen.';dialog.returnValue='cancel';dialog.showModal();
 return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='discard'),{once:true}));
}
function renderList(){
 const term=$('#profile-search').value.trim().toLocaleLowerCase('de'),type=$('#profile-filter').value,rows=state.profiles.filter(row=>(!type||row.type===type)&&[row.name,row.id].join(' ').toLocaleLowerCase('de').includes(term));
 $('#profile-count').textContent=state.settings?rows.length:'–';
 $('#profile-list').innerHTML=rows.length?rows.map(row=>'<button type="button" class="product-row" data-profile-open="'+esc(row.id)+'" aria-pressed="'+String(row.id===state.record?.id)+'"><span class="product-symbol" aria-hidden="true">'+({fonts:'Aa',motifs:'◇',colors:'●',bestsellers:'☆'})[row.type]+'</span><span><span class="product-name">'+esc(row.name)+'</span><span class="product-meta">'+labels[row.type]+' · '+row.items.length+' Einträge · Stand '+row.revision+'</span></span><span class="badge">Öffnen ↗</span></button>').join(''):'<p class="empty-state">'+(term||type?'Keine passenden Profile gefunden.':'Noch keine Profile angelegt. Beginne mit einer Auswahl für deine Produkte.')+'</p>';
 controls();
}
async function loadLibrary({resetAssignment=false}={}){
 const data=await api('/api/workshop/profiles');state.profiles=data.profiles||[];state.catalog=data.catalog;state.settings=data.settings;renderList();renderAssignmentOverview();
 $('#known-categories').innerHTML=Object.keys(state.settings.categories).map(id=>'<option value="'+esc(id)+'"></option>').join('');
 if(resetAssignment||!state.assignmentDirty)loadAssignment();else assignmentOptions($('#assignment-profile').value);
 if(state.draft){renderCatalog();renderSelected();}
}
function openEditor(record=null){
 state.record=record;state.draft=record?{name:record.name,type:record.type,items:[...record.items]}:{name:'',type:$('#profile-filter').value||'fonts',items:[]};state.dirty=false;
 $('#profile-editor').hidden=false;$('#profile-conflict').hidden=true;$('#profile-title').textContent=record?.name||'Neues Profil zusammenstellen';$('#profile-record-id').textContent=record?.id||'NEUES PROFIL';$('#profile-name').value=state.draft.name;$('#profile-type').value=state.draft.type;$('#catalog-search').value='';renderCatalog();renderSelected();renderList();controls();
}
async function openProfile(id){if(state.busy||!await discard())return;busy(true);try{openEditor(await api('/api/workshop/profiles/'+encodeURIComponent(id)));$('#profile-editor').scrollIntoView({block:'start'});}catch(error){notice(error.message,'error');}finally{busy(false);}}
const catalogRows=()=>state.catalog[state.draft?.type==='fonts'?'fonts':'motifs']||[];
function itemName(id){return state.draft?.type==='colors'?id:catalogRows().find(row=>row.id===id)?.name||id;}
function renderCatalog(){
 if(!state.draft)return;const color=state.draft.type==='colors';$('#catalog-controls').hidden=color;$('#color-controls').hidden=!color;$('#catalog-title').textContent=color?'Farben zusammenstellen':state.draft.type==='fonts'?'Verfügbare Schriften':'Verfügbare Motive';
 if(color)return;const term=$('#catalog-search').value.trim().toLocaleLowerCase('de'),rows=catalogRows().filter(row=>[row.name,row.id].join(' ').toLocaleLowerCase('de').includes(term)),chosen=new Set(state.draft.items);
 $('#catalog-list').innerHTML=rows.length?rows.map(row=>'<label class="catalog-option"><input type="checkbox" data-catalog-id="'+esc(row.id)+'" '+(chosen.has(row.id)?'checked':'')+'><span>'+esc(row.name)+'</span></label>').join(''):'<p class="empty-state">Kein Eintrag gefunden.</p>';controls();
}
function renderSelected(){
 if(!state.draft)return;$('#selected-count').textContent=state.draft.items.length;
 $('#selected-items').innerHTML=state.draft.items.length?state.draft.items.map((id,index)=>'<li><span class="selected-name">'+(state.draft.type==='colors'?'<span class="profile-color-dot" style="background:'+esc(id)+'"></span>':'')+esc(itemName(id))+'</span><span class="selected-actions"><button type="button" data-item-move="up" data-index="'+index+'" aria-label="'+esc(itemName(id))+' nach oben">↑</button><button type="button" data-item-move="down" data-index="'+index+'" aria-label="'+esc(itemName(id))+' nach unten">↓</button><button type="button" data-item-remove="'+index+'" aria-label="'+esc(itemName(id))+' entfernen">×</button></span></li>').join(''):'<li class="empty-state">Noch keine Einträge ausgewählt.</li>';controls();
}
function assignmentOptions(selected=''){
 const type=$('#assignment-type').value,rows=state.profiles.filter(profile=>profile.type===type);
 $('#assignment-profile').innerHTML='<option value="">Profil auswählen</option>'+rows.map(profile=>'<option value="'+esc(profile.id)+'">'+esc(profile.name)+' · '+profile.items.length+' Einträge</option>').join('');$('#assignment-profile').value=selected;
 $('#assignment-profile').required=$('#assignment-mode').value==='override';controls();
}
function assignmentHelp(){
 const category=$('#assignment-scope').value==='category',mode=$('#assignment-mode').value;
 $('#assignment-help').textContent=mode==='empty'?'Bewusst leer: Für diese Profilart wird keine Auswahl angeboten.':mode==='override'?'Das gewählte Profil gilt hier. Produktzuordnungen können es gezielt überschreiben.':category?'Vererben: Diese Kategorie verändert die geerbte Auswahl nicht.':'Vererben: Ohne Bibliotheksstandard bleibt die vorhandene Auswahl des Produkts erhalten.';
}
function readAssignmentSelection(){return {scope:$('#assignment-scope').value,categoryId:$('#assignment-category').value.trim(),type:$('#assignment-type').value};}
function assignmentTarget(selection){return (selection.scope==='category'?'Kategorie „'+(selection.categoryId||'noch nicht angegeben')+'“':'Standard')+' · '+(labels[selection.type]||'Profilart fehlt');}
function loadAssignment(){
 if(!state.settings)return;const s=state.selection,category=s.scope==='category',assignment=(category?state.settings.categories[s.categoryId]?.[s.type]:state.settings.defaults[s.type])||{mode:'inherit',profileId:null};
 $('#assignment-scope').value=s.scope;$('#assignment-category').value=s.categoryId;$('#assignment-type').value=s.type;$('#category-field').hidden=!category;$('#assignment-category').required=category;$('#assignment-mode').value=assignment.mode;state.assignmentRevision=state.settings.revision;state.assignmentDirty=false;assignmentOptions(assignment.profileId||'');assignmentHelp();controls();
}
function assignmentLabel(assignment){return assignment.mode==='empty'?'Keine':assignment.mode==='inherit'?'Vererben':state.profiles.find(profile=>profile.id===assignment.profileId)?.name||'Profil nicht verfügbar';}
function renderAssignmentOverview(){
 $('#assignment-list').innerHTML=[['Standard',state.settings.defaults],...Object.entries(state.settings.categories)].map(([name,assignments])=>'<section class="assignment-summary"><h3>'+esc(name)+'</h3><dl>'+Object.entries(labels).map(([type,label])=>'<div><dt>'+label+'</dt><dd>'+esc(assignmentLabel(assignments[type]))+'</dd></div>').join('')+'</dl></section>').join('');
}
async function saveProfile(asCopy=false){
 if(state.busy||!state.draft||!$('#profile-form').reportValidity())return;busy(true);
 try{
  const document={...state.draft,name:state.draft.name.trim()},existing=state.record&&!asCopy;
  let impactToken;
  if(existing){
    const review=await api('/api/workshop/profiles/'+encodeURIComponent(state.record.id)+'/impact',{method:'POST',body:{expectedRevision:state.record.revision,document}});
    if(!await confirmProfileImpact(review,state.catalog)){busy(false);$('#save-profile').focus();return;}
    impactToken=review.token;
  }
  const record=await api('/api/workshop/profiles'+(existing?'/'+encodeURIComponent(state.record.id):''),{method:existing?'PATCH':'POST',body:existing?{expectedRevision:state.record.revision,document,impactToken}:document});
  openEditor(record);await loadLibrary();notice('Profil „'+record.name+'“ gespeichert. Stand '+record.revision+'.');
 }catch(error){if(error.status===409&&error.code!=='profile_impact_changed')$('#profile-conflict').hidden=false;notice(error.code==='profile_impact_changed'?error.message:error.status===409?'Das Profil wurde inzwischen geändert. Deine Auswahl bleibt erhalten.':error.message,'error');}finally{busy(false);}
}
$('#new-profile').addEventListener('click',async()=>{if(!state.busy&&await discard()){openEditor();$('#profile-editor').scrollIntoView({block:'start'});$('#profile-name').focus();}});
$('#profile-search').addEventListener('input',renderList);$('#profile-filter').addEventListener('change',renderList);
$('#refresh-profiles').addEventListener('click',async()=>{if(state.busy)return;busy(true);try{await loadLibrary();notice('Bibliothek aktualisiert. Offene Profileingaben wurden beibehalten.');}catch(error){notice(error.message,'error');}finally{busy(false);}});
$('#profile-name').addEventListener('input',event=>{state.draft.name=event.target.value;$('#profile-title').textContent=event.target.value||'Neues Profil';dirty();});
$('#profile-type').addEventListener('change',event=>{if(state.record||state.busy)return;state.draft.type=event.target.value;state.draft.items=[];$('#catalog-search').value='';dirty();renderCatalog();renderSelected();});
$('#catalog-search').addEventListener('input',renderCatalog);$('#catalog-search').addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();});
$('#catalog-list').addEventListener('change',event=>{const id=event.target.dataset.catalogId;if(!id||state.busy)return;if(event.target.checked&&!state.draft.items.includes(id))state.draft.items.push(id);else if(!event.target.checked)state.draft.items=state.draft.items.filter(item=>item!==id);dirty();renderSelected();});
$('#profile-color-picker').addEventListener('input',event=>{$('#profile-color-hex').value=event.target.value;});
$('#profile-color-hex').addEventListener('input',event=>{if(/^#[0-9a-f]{6}$/i.test(event.target.value))$('#profile-color-picker').value=event.target.value;});
$('#add-profile-color').addEventListener('click',()=>{if(state.busy||state.draft?.type!=='colors')return;const value=$('#profile-color-hex').value.trim().toLowerCase();if(!/^#[0-9a-f]{6}$/.test(value)){notice('Bitte einen Farbwert wie #1e5747 angeben.','error');return;}if(state.draft.items.includes(value)){notice('Diese Farbe ist bereits in deiner Auswahl.','info');return;}state.draft.items.push(value);dirty();renderSelected();});
$('#profile-form').addEventListener('submit',event=>{event.preventDefault();saveProfile();});$('#save-profile-copy').addEventListener('click',()=>saveProfile(true));$('#reload-profile').addEventListener('click',()=>openProfile(state.record.id));
document.addEventListener('click',event=>{
 const row=event.target.closest('[data-profile-open]');if(row){openProfile(row.dataset.profileOpen);return;}if(state.busy)return;
 const remove=event.target.closest('[data-item-remove]'),move=event.target.closest('[data-item-move]');if(!remove&&!move)return;
 if(remove)state.draft.items.splice(Number(remove.dataset.itemRemove),1);else{const index=Number(move.dataset.index),next=index+(move.dataset.itemMove==='up'?-1:1);if(next<0||next>=state.draft.items.length)return;[state.draft.items[index],state.draft.items[next]]=[state.draft.items[next],state.draft.items[index]];}
 dirty();renderCatalog();renderSelected();
});
for(const selector of ['#assignment-scope','#assignment-category','#assignment-type'])$(selector).addEventListener('change',()=>{
 if(state.busy)return;state.selection=readAssignmentSelection();
 // No async discard between blur/change/submit: it could overwrite a newer target.
 if(!state.assignmentDirty)loadAssignment();else{assignmentOptions($('#assignment-profile').value);assignmentHelp();controls();}
});
$('#assignment-category').addEventListener('input',()=>{if(!state.busy){state.selection=readAssignmentSelection();controls();}});
$('#assignment-mode').addEventListener('change',()=>{state.assignmentDirty=true;assignmentOptions($('#assignment-profile').value);assignmentHelp();controls();});$('#assignment-profile').addEventListener('change',()=>{state.assignmentDirty=true;controls();});
$('#reload-assignment').addEventListener('click',async()=>{if(state.busy||!await discard('assignment'))return;busy(true);try{await loadLibrary({resetAssignment:true});notice('Gespeicherte Zuordnung geladen.');}catch(error){notice(error.message,'error');}finally{busy(false);}});
$('#assignment-form').addEventListener('submit',async event=>{
 event.preventDefault();if(state.busy||!state.assignmentDirty)return;
 const s=readAssignmentSelection(),mode=$('#assignment-mode').value;controls();
 if(!['default','category'].includes(s.scope)||!Object.hasOwn(labels,s.type)){notice('Bitte Ziel und Profilart auswählen.','error');return;}
 if(s.scope==='category'&&!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s.categoryId)){notice('Bitte eine gültige Kategorie-ID angeben. Die Zuordnung wurde nicht gespeichert.','error');$('#assignment-category').focus();return;}
 if(!event.currentTarget.reportValidity())return;
  const body={expectedRevision:state.assignmentRevision,type:s.type,assignment:{mode,profileId:mode==='override'?$('#assignment-profile').value:null},...(s.scope==='category'?{categoryId:s.categoryId}:{})};state.selection=s;busy(true);
  try{
  const review=await api('/api/workshop/profile-settings/impact',{method:'POST',body});
  if(!await confirmProfileImpact(review,state.catalog)){busy(false);$('#save-assignment').focus();return;}
  const settings=await api('/api/workshop/profile-settings',{method:'POST',body:{...body,impactToken:review.token}}),saved=s.scope==='category'?settings.categories?.[s.categoryId]?.[s.type]:settings.defaults?.[s.type];
  if(!saved||saved.mode!==body.assignment.mode||saved.profileId!==body.assignment.profileId)throw Error('Die Antwort bestätigt die gewählte Zuordnung nicht. Bitte den gespeicherten Stand prüfen.');
  state.settings=settings;loadAssignment();renderAssignmentOverview();$('#known-categories').innerHTML=Object.keys(state.settings.categories).map(id=>'<option value="'+esc(id)+'"></option>').join('');notice(assignmentTarget(s)+' gespeichert.');
 }
 catch(error){notice(error.code==='profile_impact_changed'?error.message:error.status===409?'Die Zuordnungen wurden inzwischen geändert. Deine Eingaben bleiben erhalten. Lade den gespeicherten Stand, bevor du erneut speicherst.':error.message,'error');}finally{busy(false);}
});
window.addEventListener('beforeunload',event=>{if(state.dirty||state.assignmentDirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('pageshow',event=>{if(!event.persisted&&state.settings&&!state.assignmentDirty)loadAssignment();});
(async()=>{busy(true);try{const [session]=await Promise.all([api('/api/workshop/session'),loadLibrary()]);state.csrf=session.csrfToken;}catch(error){notice(error.message,'error');$('#profile-list').innerHTML='<p class="empty-state">Bibliothek konnte nicht geladen werden. Bitte „Aktualisieren“ versuchen.</p>';}finally{busy(false);}})();

$('#font-upload-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file||state.busy)return;busy(true);
 const status=$('#font-upload-status');
 try{
  if(file.size>8*1024*1024)throw Error('Bitte eine TTF- oder OTF-Schrift bis 8 MB auswählen.');
  status.textContent='Schrift und Zeichen werden geprüft …';
  const bytes=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});
  let font;
  try{font=await api('/api/workshop/font-library',{method:'POST',body:{name:file.name,bytes}});}
  catch(error){
   // E4: missing Ä/Ö/Ü/ß/€/digits reject the font. Only an explicit exception with a reason (digits-only, capitals-only) is accepted.
   if(!/^Schrift fehlt:/.test(error.message||''))throw error;
   const reason=window.prompt(error.message+'\n\nAusnahme nur für Sonderfälle (z. B. reine Zahlen- oder Großbuchstabenschrift). Begründung eingeben, um die Schrift trotzdem freizugeben – oder abbrechen:','');
   if(reason===null||!reason.trim())throw error;
   font=await api('/api/workshop/font-library',{method:'POST',body:{name:file.name,bytes,allowMissing:true,reason:reason.trim()}});
  }
  await loadLibrary();status.textContent='„'+font.name+'“ hochgeladen · '+font.glyphCount+' Zeichen.'+(font.glyphWarnings?.length?' Hinweis: '+font.glyphWarnings.join(' '):'')+' Du kannst die Schrift jetzt in einem Schriftprofil auswählen.';
 }catch(error){status.textContent=error.message;}finally{busy(false);event.target.value='';}
});
