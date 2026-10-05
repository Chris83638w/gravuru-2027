import {installProductOptions} from './product-options-ui.mjs';
import {productCards,installOverview} from './product-overview-ui.mjs';
import {installProductEditor} from './product-editor-ui.mjs';
import {installCustomerFields} from './customer-fields-ui.mjs';
import {installDesignImport,importedDesignInfo} from './design-import-ui.mjs';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>structuredClone(value);
const state={record:null,draft:null,products:[],dirty:false,busy:false,csrf:null,tab:'designs',view:'products',filter:'all',listRequest:0,recordRequest:0,createMode:'seed',history:[],profiles:[],profileSettings:null};
let overview,productOptions;
const date=value=>{if(!value)return 'Datum nicht verfügbar';const d=new Date(value);return Number.isNaN(d.getTime())?'Datum nicht verfügbar':new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(d);};
const euro=cents=>(Number(cents)/100).toFixed(2).replace('.',',');
const pathValue=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
function writePath(object,path,value){const parts=path.split('.'),last=parts.pop();let target=object;for(const key of parts)target=target[key]??={};target[last]=value;}
function notify(message,tone='success'){const node=$('#notice');node.textContent=message;node.dataset.tone=tone;node.hidden=!message;}
function errorMessage(error){return error?.message||'Die Aktion konnte nicht abgeschlossen werden.';}
async function api(path,{method='GET',body}={}){
 if(method!=='GET'&&!state.csrf){const session=await api('/api/workshop/session');state.csrf=session.csrfToken;if(!state.csrf)throw Error('Die Werkstattsitzung konnte nicht gestartet werden. Bitte die Seite neu laden.');}
 const response=await fetch(path,{method,credentials:'same-origin',headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(method==='GET'?{}:{'X-Gravuru-CSRF':state.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let data;try{data=await response.json();}catch{throw Error('Die Werkstatt hat keine gültige Antwort gesendet. Bitte die Verbindung prüfen.');}
 if(!response.ok){const error=new Error(typeof data.error==='string'?data.error:data.error?.message||data.message||'Die Aktion konnte nicht abgeschlossen werden.');error.status=response.status;error.details=data;throw error;}
 return data;
}
function recordFrom(data){const record=data.record||data;if(!record?.id||!Number.isInteger(record.revision)||!record.document)throw Error('Die gespeicherte Konfiguration ist unvollständig.');return record;}
function syncControls(){
 const archived=state.record?.status==='archived';
 $('#save-product').disabled=state.busy||!state.dirty||archived;
 $('#copy-product').disabled=state.busy||!state.record||state.dirty;
 $('#publish-product').disabled=state.busy||!state.record||state.dirty||archived||state.record.publishedRevision===state.record.revision;
 $('#archive-product').disabled=state.busy||!state.record||state.dirty;
 $('#new-product').disabled=state.busy;
 $('#create-submit').disabled=state.busy;
 for(const button of $$('[data-product-id],[data-restore]'))button.disabled=state.busy||(button.dataset.restore!==undefined&&(state.dirty||archived||Number(button.dataset.restore)===state.record?.revision));
 for(const button of $$('[data-design-action]')){
  const designs=state.draft?.config?.profile?.designs||[],index=designs.findIndex(design=>design.id===button.dataset.designId),action=button.dataset.designAction;
  button.disabled=state.busy||archived||index<0||(action==='copy'&&designs.length>=60)||(action==='delete'&&designs.length<=1)||(action==='up'&&index===0)||(action==='down'&&index===designs.length-1)||(action==='default'&&designs[index]?.id===state.draft.config.profile.defaultDesignId);
 }
 for(const field of $$('#product-form input,#product-form select,#product-form textarea'))field.disabled=state.busy||archived||field.dataset.rightAllowed==='false'||(field.dataset.profileId!==undefined&&state.draft?.profileAssignments?.[field.dataset.profileId]?.mode!=='override');
 $('#save-indicator').textContent=state.busy?'Wird gespeichert …':state.dirty?'Ungespeicherte Änderungen':'Alle Änderungen gespeichert';
 $('#save-indicator').dataset.dirty=String(state.dirty);
 $('#save-product').textContent=state.busy?'Wird gespeichert …':'Änderungen speichern';
 $('#print-export-link').hidden=state.dirty||!state.record;
 productEditor.sync();overview?.sync();productOptions?.sync();
 $('#preview-note').textContent='Gespeicherte Produktdaten mit aktuellen Profilzuordnungen.'+(state.dirty?' Deine ungespeicherten Änderungen sind noch nicht enthalten.':'');
}
function setBusy(value){state.busy=value;syncControls();}
function markDirty(){state.dirty=true;syncControls();productEditor.changed();}
function badge(product){
 const badges=[];
 if(product.kind==='master')badges.push('<span class="badge master">Master</span>');
 if(product.status==='archived')badges.push('<span class="badge archived">Archiviert</span>');
 else if(product.publishedRevision)badges.push('<span class="badge published">Freigabe '+escape(product.publishedRevision)+'</span>');
 else badges.push('<span class="badge">Entwurf</span>');
 return '<span class="badges">'+badges.join('')+'</span>';
}
function renderList(){
 const scope=state.products.filter(p=>p.kind===(state.view==='masters'?'master':'product'));
 const active=scope.filter(p=>p.status!=='archived');
 const visible=scope.filter(p=>state.filter==='archived'?p.status==='archived':p.status!=='archived'&&(state.filter==='all'||p.overview?.method===state.filter));
 $('#product-count').textContent=visible.length;
 $('#overview-title').textContent=state.view==='masters'?'Deine Mastervorlagen':'Deine Konfi-Produkte';
 $('#overview-scope').textContent=state.view==='masters'?'· wiederverwendbare Vorlagen':'';
 for(const b of $$('[data-view]')){b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-pressed',String(b.dataset.view===state.view));}
 for(const b of $$('[data-filter]')){const key=b.dataset.filter;b.setAttribute('aria-pressed',String(key===state.filter));b.querySelector('span').textContent='('+ (key==='archived'?scope.length-active.length:key==='all'?active.length:active.filter(p=>p.overview?.method===key).length)+')';}
 if(!visible.length){$('#product-list').innerHTML='<div class="empty-state"><strong>'+($('#search').value?'Keine passende Konfiguration.':state.filter==='archived'?'Das Archiv ist leer.':'Hier ist Platz für deine nächste Idee.')+'</strong><p>'+($('#search').value?'Versuche einen anderen Namen oder eine Konfigurations-ID.':'Wähle einen anderen Filter oder lege eine Konfiguration an.')+'</p><button data-action="new">Konfiguration anlegen</button></div>';overview?.rendered([]);syncControls();return;}
 $('#product-list').innerHTML=productCards(visible,badge);
 overview?.rendered(visible);
 syncControls();
}
async function loadList(){
 const request=++state.listRequest,params=new URLSearchParams({query:$('#search').value.trim(),includeArchived:'1'});
 const data=await api('/api/workshop/products?'+params);if(request!==state.listRequest)return;
 state.products=data.products||[];renderList();
}
async function showOverview(view=state.view){
 if(state.busy)return false;
 if(!await canDiscard())return false;
 state.dirty=false;if(view!==state.view)state.filter='all';state.view=view;$('#editor-section').hidden=true;$('.overview').hidden=false;$('.page-heading').hidden=false;document.body.classList.remove('editing-product');renderList();history.replaceState(null,'','/werkstatt/?view='+view);return true;
}
async function canDiscard(){
 if(!state.dirty)return true;
 const dialog=$('#discard-dialog');dialog.returnValue='cancel';dialog.showModal();
 return await new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='discard'),{once:true}));
}
function applyRecord(record){
 if(record.document.schema==='gravuru-form-product/v1'){location.href='/werkstatt/formprodukt/?configuration='+encodeURIComponent(record.id);return false;}
 const switched=state.record?.id!==record.id;state.record=record;state.draft=clone(record.document);state.dirty=false;if(switched)state.tab='designs';document.body.classList.add('editing-product');
 $('#conflict-banner').hidden=true;$('#editor-section').hidden=false;$('.overview').hidden=true;$('.page-heading').hidden=true;
 renderEditor();renderList();syncControls();
 history.replaceState(null,'','/werkstatt/?configuration='+encodeURIComponent(record.id));
}
async function loadRecord(id,{checkDirty=true}={}){
 if(state.busy)return;if(checkDirty&&!await canDiscard())return;
 const request=++state.recordRequest;
 const record=recordFrom(await api('/api/workshop/products/'+encodeURIComponent(id)));if(request!==state.recordRequest)return;
 if(applyRecord(record)===false)return;await loadHistory();
}
const field=(label,path,value,{help='',type='text',max=200,full=false,required=false}={})=>'<label'+(full?' class="full"':'')+'>'+escape(label)+'<input type="'+type+'" data-path="'+escape(path)+'" value="'+escape(value)+'" maxlength="'+max+'" '+(required?'required':'')+'>'+ (help?'<p class="field-help">'+escape(help)+'</p>':'')+'</label>';
const textArea=(label,path,value,{help='',rows=3,max=500}={})=>'<label class="full">'+escape(label)+'<textarea data-path="'+escape(path)+'" rows="'+rows+'" maxlength="'+max+'">'+escape(value)+'</textarea>'+(help?'<p class="field-help">'+escape(help)+'</p>':'')+'</label>';
function moneyField(label,path){
 const cents=pathValue(state.draft,path);
 return '<label>'+escape(label)+'<span class="input-suffix"><input type="text" inputmode="decimal" data-money="'+escape(path)+'" value="'+escape(euro(cents))+'" pattern="[0-9]+([.,][0-9]{1,2})?" required aria-label="'+escape(label)+' in Euro"><span>€</span></span></label>';
}
function renderEditor(){
 productEditor.prepare();
 const {record,draft}=state;
 $('#record-title').textContent=draft.name;
 $('#record-eyebrow').textContent=draft.kind==='master'?'MASTERVORLAGE':'PRODUKTKONFIGURATION';
 $('#record-id').textContent=record.id;$('#record-revision').textContent='Stand '+record.revision+' · '+(record.status==='archived'?'Archiviert':'Bearbeitbar');
 $('#archive-product').textContent=record.status==='archived'?'Aus dem Archiv holen':'Konfiguration archivieren';
 $('#release-status').textContent=record.publishedRevision?'Freigegeben: Stand '+record.publishedRevision+(record.publishedRevision!==record.revision?' · weitere Änderungen vorhanden':''):'Noch kein Stand freigegeben.';
 $('#print-export-link').href='/?'+new URLSearchParams({configuration:record.id,revision:record.revision,druckexport:'1'});
 $('#preview-link').href='/?'+new URLSearchParams({configuration:record.id});$('#customer-view').href=$('#preview-link').href;
 $('#panel-details').innerHTML='<div class="form-section"><h3>Was ist das für eine Konfiguration?</h3><div class="form-grid">'+field('Name','name',draft.name,{full:true,required:true})+'<label>Verwendung<select data-path="kind"><option value="product" '+(draft.kind==='product'?'selected':'')+'>Produktkonfiguration</option><option value="master" '+(draft.kind==='master'?'selected':'')+'>Mastervorlage</option></select><p class="field-help">Master kannst du als Ausgangspunkt für weitere Produkte kopieren.</p></label><label>Kopiert aus<span class="static-value">'+escape(draft.masterId||'Eigenständige Konfiguration')+'</span></label>'+field('Kategorie-Zuordnungen','categoryIds',(draft.categoryIds||[]).join(', '),{full:true,help:'Mehrere Kategorie-IDs durch Komma trennen, zum Beispiel acrylglasbilder, geschenke.',max:1000})+'</div></div><div class="form-section"><h3>Für die spätere Produktseite</h3><p>Diese Angaben werden hier gespeichert. Die Übertragung zu Shopify folgt separat.</p><div class="form-grid">'+field('SEO-Titel','seo.title',draft.seo?.title||'',{full:true,max:70})+textArea('SEO-Beschreibung','seo.description',draft.seo?.description||'',{max:160,help:'Beschreibe das Produkt verständlich: Material, Personalisierung und Anlass.'})+'</div></div>';
 renderPrices();renderDesigns();renderProfiles();renderHistory();productEditor.render();showTab(state.tab);
}
function renderPrices(){
 if(!state.draft.config?.acrylic?.pricing){$('#panel-prices').innerHTML='<h3>Für dieses Produkt ist noch kein Preisprofil hinterlegt.</h3><p>Das vorliegende Preisformular verwaltet das Acrylglasprofil. Weitere Materialprofile werden gesondert ergänzt.</p>';return;}
 const root='config.acrylic.pricing.';
 $('#panel-prices').innerHTML='<section id="product-options" class="form-section" aria-label="Verfügbare Varianten"></section><div class="form-section"><h3>Grundpreise</h3><p>Alle Eingaben in Euro. Die Konfiguration speichert Preise centgenau.</p><div class="form-grid">'+moneyField('15 × 20 cm',root+'sizes.small')+moneyField('20 × 26,67 cm',root+'sizes.large')+'</div></div><div class="form-section"><h3>Sockel · Aufpreise für 15 × 20 cm</h3><div class="form-grid">'+[['Buche · massiv','buche'],['Eiche · massiv','eiche'],['Nussbaum · massiv','nussbaum'],['Acrylglas · klar','klar'],['Acrylglas · satiniert','satiniert'],['Holz · flach, Nussbaumoptik','holz-flach']].map(([label,id])=>moneyField(label,root+'bases.'+id)).join('')+'</div><p class="price-note">Ohne Sockel bleibt ohne Aufpreis. Beim größeren Format wird der folgende Zuschlag auf jeden gewählten Sockel addiert.</p></div><div class="form-section"><h3>Größenzuschlag & Zubehör</h3><div class="form-grid">'+moneyField('Sockelzuschlag · großes Format',root+'largeBaseExtraCents')+moneyField('Wandhalterung · beide Größen',root+'wallCents')+'</div><p class="field-help">Die Wandhalterung ist zusätzlich zu einem Sockel wählbar.</p></div>';
 productOptions?.render();
}
const rightsLabels={content:'Text ändern',color:'Farbe ändern',replace:'Ersetzen',move:'Verschieben',scale:'Skalieren',delete:'Nach Entsperren löschbar'};
function objectLabel(object,index){return ({heading:'Überschrift',names:'Namen',place:'Ort',date:'Datum',slogan:'Spruch','photo-main':'Foto','photo-frame':'Fotorahmen','location-pin':'Ortssymbol',heart:'Herz'})[object.fieldKey||object.id]||({text:'Text',photoSlot:'Foto',motif:'Motiv',graphic:'Grafik','motif-raster':'Bildmotiv'})[object.type]+' '+(index+1);}
// Only UI affordances: the shared server validator remains authoritative for rights.
function availableRights(object){
 const editable=object.customerEditable!==false&&!object.technicalLocked&&!object.locked,movable=editable&&!object.acrylicFixed;
 return {content:editable&&object.type==='text',color:editable&&['text','motif','graphic'].includes(object.type),replace:editable&&(object.type==='photoSlot'||movable&&object.type==='motif'),move:movable,scale:movable,delete:!object.technicalLocked};
}
function renderRights(design){
 return '<details class="design-rights"><summary>Was dürfen Kunden anpassen?</summary><p>Freigegebene Möglichkeiten lassen sich einzeln einschränken. Auch feste Designelemente können gezielt zum Löschen nach Entsperren freigegeben werden. Technische Bereiche bleiben geschützt.</p>'+design.objects.map((object,index)=>{
  const allowed=availableRights(object),rights=state.draft.elementRights?.[design.id]?.[object.id]||{};
  return '<fieldset class="rights-object"><legend>'+escape(design.customerFields?.find(f=>f.id===object.id)?.label||objectLabel(object,index))+(object.acrylicFixed?'<span class="locked-label">Feste Position und Größe</span>':'')+'</legend><div class="rights-options">'+Object.entries(rightsLabels).map(([key,label])=>'<label class="right-option'+(!allowed[key]?' unavailable':'')+'"'+(!allowed[key]?' title="Für diesen Vorlagenbereich nicht freigebbar"':'')+'><input type="checkbox" data-element-right="'+key+'" data-design-id="'+escape(design.id)+'" data-object-id="'+escape(object.id)+'" data-right-allowed="'+String(allowed[key])+'" '+(rights[key]?'checked ':'')+(!allowed[key]?'disabled':'')+'>'+label+'</label>').join('')+'</div></fieldset>';
 }).join('')+'</details>';
}
function designButton(design,action,label,extra=''){
 return '<button type="button" data-design-action="'+action+'" data-design-id="'+escape(design.id)+'" '+extra+'>'+label+'</button>';
}
function renderDesigns(){
 const profile=state.draft.config?.profile,designs=profile?.designs||[];
 $('#panel-design-library').innerHTML='<div class="design-heading"><h3>Designs und Beispieltexte <span class="count">'+designs.length+' / 60</span></h3><p>Die Reihenfolge hier entspricht der Auswahl im Konfigurator. Kopiere ein vorhandenes Design und passe Namen, Texte und Kundenrechte an. Änderungen werden mit der Konfiguration gespeichert.</p></div>'+designs.map((design,index)=>'<section class="design-block" data-design-card="'+escape(design.id)+'"><header><div><h3>Design '+(index+1)+(profile.defaultDesignId===design.id?' <span class="badge published">Standard</span>':'')+'</h3><span class="design-id">'+escape(design.id)+'</span></div><div class="design-order">'+designButton(design,'up','↑','aria-label="Design '+(index+1)+' nach oben" title="Nach oben"')+designButton(design,'down','↓','aria-label="Design '+(index+1)+' nach unten" title="Nach unten"')+'</div></header><div class="form-grid">'+field('Designname','config.profile.designs.'+index+'.name',design.name,{full:true,required:true})+(design.objects||[]).map((object,objectIndex)=>object.type==='text'?textArea(design.customerFields?.find(f=>f.id===object.id)?.label||objectLabel(object,objectIndex),'config.profile.designs.'+index+'.objects.'+objectIndex+'.text',object.text,{rows:2,max:180}):'').join('')+'</div><p class="field-help">Prüfe längere Texte anschließend in der Kundenansicht.</p>'+renderRights(design)+importedDesignInfo(design)+'<div class="design-actions">'+designButton(design,'import','Datei / Vorlagenpaket importieren …')+(design.importedSource?designButton(design,'fields','Kundenfelder bearbeiten …'):'')+designButton(design,'copy','Design kopieren')+designButton(design,'default','Als Standard verwenden')+designButton(design,'delete','Design entfernen','class="text-button design-delete" title="Mindestens ein Design muss erhalten bleiben"')+'</div></section>').join('');
 syncControls();
}
function changeDesign(action,id){
 if(!state.draft||state.busy||state.record?.status==='archived')return;
 if(action==='import'){designImporter.open(id);return;}
 if(action==='fields'){customerFields.open(id);return;}
 const config=state.draft.config,profile=config.profile,designs=profile.designs,index=designs.findIndex(design=>design.id===id);
 if(index<0)return;
 let focusId=id,message='';
 if(action==='copy'){
  if(designs.length>=60)return;
  const source=designs[index],copy=clone(source);copy.id='design-'+crypto.randomUUID();copy.name=source.name.slice(0,192)+' · Kopie';
  designs.splice(index+1,0,copy);state.draft.elementRights[copy.id]=clone(state.draft.elementRights[id]);
  const placeholders=config.localResources?.photoPlaceholders;
  if(placeholders)placeholders.push(...placeholders.filter(asset=>asset.designId===id).map(asset=>({...clone(asset),designId:copy.id})));
  if(config.photo.hints)config.photo.hints.push(...config.photo.hints.filter(h=>h.designId===id).map(h=>({...clone(h),designId:copy.id})));
  if(config.localResources?.photoExamples)config.localResources.photoExamples.push(...config.localResources.photoExamples.filter(e=>e.designId===id).map(e=>({...clone(e),designId:copy.id})));
  focusId=copy.id;message='Design kopiert. Passe die Kopie an und speichere deine Änderungen.';
 }else if(action==='delete'){
  if(designs.length<=1)return;
  const removed=designs.splice(index,1)[0];delete state.draft.elementRights[id];
  if(config.localResources?.photoPlaceholders)config.localResources.photoPlaceholders=config.localResources.photoPlaceholders.filter(asset=>asset.designId!==id);
  if(config.photo.hints)config.photo.hints=config.photo.hints.filter(h=>h.designId!==id);
  if(config.localResources?.photoExamples)config.localResources.photoExamples=config.localResources.photoExamples.filter(e=>e.designId!==id);
  focusId=designs[Math.min(index,designs.length-1)].id;
  if(profile.defaultDesignId===id)profile.defaultDesignId=focusId;
  message='„'+removed.name+'“ aus dem Entwurf entfernt. Erst Speichern übernimmt die Änderung.';
 }else if(action==='up'||action==='down'){
  const next=index+(action==='up'?-1:1);if(next<0||next>=designs.length)return;
  [designs[index],designs[next]]=[designs[next],designs[index]];message='Designreihenfolge geändert. Änderungen noch speichern.';
 }else if(action==='default'){
  if(profile.defaultDesignId===id)return;profile.defaultDesignId=id;message='Dieses Design wird zuerst angezeigt. Änderungen noch speichern.';
 }else return;
 renderDesigns();productEditor.render();markDirty();notify(message,'info');
 const card=$$('[data-design-card]').find(node=>node.dataset.designCard===focusId);
 card?.querySelector(action==='copy'?'[data-path]':'[data-design-action]')?.focus({preventScroll:true});card?.scrollIntoView({block:'nearest'});
}
async function loadProfiles(){const data=await api('/api/workshop/profiles');state.profiles=data.profiles||[];state.profileSettings=data.settings;if(state.draft){renderProfiles();syncControls();}}
function inheritedProfileLabel(type){
 if(!state.profileSettings)return 'Bibliothek noch nicht geladen';
 let assignment=state.profileSettings.defaults[type],source='Standard';
 for(const category of state.draft.categoryIds||[]){const value=state.profileSettings.categories[category]?.[type];if(value&&value.mode!=='inherit'){assignment=value;source='Kategorie '+category;}}
 if(!assignment||assignment.mode==='inherit')return 'Vorhandene Produktauswahl';
 return source+' · '+(assignment.mode==='empty'?'Keine':state.profiles.find(profile=>profile.id===assignment.profileId)?.name||'Profil nicht verfügbar');
}
function renderProfiles(){
 const labels={fonts:'Schriften',motifs:'Motive',colors:'Farben',bestsellers:'Bestseller'};
 $('#panel-profiles').innerHTML='<h3>Profile gezielt zuordnen</h3><p class="profile-info">Vererben übernimmt die Auswahl aus Standard und Kategorien. Bei mehreren Kategorien gewinnt die letzte abweichende Zuordnung in der Kategorienliste. Eine eigene Auswahl hier hat Vorrang. „Keine“ bietet bewusst keine Auswahl an; bestehende Designinhalte bleiben erhalten.</p><div class="button-row profile-library-links"><a href="/werkstatt/profile/" target="_blank" rel="noopener">Profilbibliothek öffnen ↗</a><button type="button" data-action="refresh-profiles">Profile aktualisieren</button></div>'+Object.entries(labels).map(([key,label])=>{
  const assignment=state.draft.profileAssignments?.[key]||{mode:'inherit',profileId:null},rows=state.profiles.filter(profile=>profile.type===key),missing=assignment.profileId&&!rows.some(profile=>profile.id===assignment.profileId);
  return '<section class="profile-row"><h3>'+label+'</h3><label>Auswahl<select data-profile-mode="'+key+'">'+[['inherit','Vererben'],['empty','Keine · leere Auswahl'],['override','Eigenes Profil']].map(([mode,name])=>'<option value="'+mode+'" '+(assignment.mode===mode?'selected':'')+'>'+name+'</option>').join('')+'</select></label><label>Profil<select data-profile-id="'+key+'" '+(assignment.mode==='override'?'required':'disabled')+'><option value="">Profil auswählen</option>'+(missing?'<option value="" selected>Profil nicht verfügbar · bitte auswählen</option>':'')+rows.map(profile=>'<option value="'+escape(profile.id)+'" '+(assignment.profileId===profile.id?'selected':'')+'>'+escape(profile.name)+' · '+profile.items.length+' Einträge</option>').join('')+'</select></label><p class="profile-inheritance">Geerbte Auswahl: '+escape(inheritedProfileLabel(key))+'</p></section>';
 }).join('');
}
function renderHistory(){
 $('#panel-history').innerHTML='<h3>Gespeicherte Stände</h3><p>Die historische Vorschau öffnet genau den gespeicherten Stand mit seinen damaligen Profilzuordnungen. Die Wiederherstellung erzeugt einen neuen Stand; der Verlauf bleibt erhalten.</p>'+(!state.history.length?'<p class="empty-state">Verlauf wird geladen …</p>':state.history.map(item=>'<div class="revision-row"><span class="revision-number">'+escape(item.revision)+'</span><div><strong>'+escape(item.name||'Konfiguration')+(item.revision===state.record.revision?' · Aktuell':'')+'</strong><small>'+escape(date(item.createdAt))+'</small><a class="historical-preview" data-preview-revision="'+escape(item.revision)+'" href="/?'+escape(new URLSearchParams({configuration:state.record.id,revision:String(item.revision)}))+'" target="_blank" rel="noopener">Historische Vorschau ↗</a></div><button type="button" data-restore="'+escape(item.revision)+'" '+(item.revision===state.record.revision?'disabled':'')+'>Stand wiederherstellen</button></div>').join(''));
}
async function loadHistory(){
 if(!state.record)return;const id=state.record.id;
 const data=await api('/api/workshop/products/'+encodeURIComponent(id)+'/revisions');if(state.record?.id!==id)return;
 state.history=data.revisions||[];renderHistory();syncControls();
}
function showTab(key,focus=false){
 if(!$('#tab-'+key))key='designs';state.tab=key;
 if(key==='design-library')renderDesigns();if(key==='designs')productEditor.inspect();
 for(const tab of $$('[data-tab]')){const active=tab.dataset.tab===key;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}
 for(const panel of $$('.editor-panel'))panel.hidden=panel.id!=='panel-'+key;
}
function validateEditor(){
 const invalid=$$('#product-form input,#product-form select,#product-form textarea').find(input=>!input.disabled&&!input.checkValidity());
 if(invalid){showTab(invalid.closest('.editor-panel').id.replace('panel-',''));invalid.reportValidity();invalid.focus();return false;}
 return true;
}
function mutationError(error){
 if(error.status===409){$('#conflict-banner').hidden=false;notify('Der gespeicherte Stand wurde geändert. Deine Eingaben bleiben erhalten.','error');}
 else notify(errorMessage(error),'error');
}
async function mutateRecord(action,body){
 if(!state.record||state.busy)return;
 if(state.dirty){notify('Speichere deine Änderungen zuerst, bevor du diesen Stand kopierst, freigibst oder archivierst.','info');return;}
 setBusy(true);
 try{
  const record=recordFrom(await api('/api/workshop/products/'+encodeURIComponent(state.record.id)+'/'+action,{method:'POST',body:{expectedRevision:state.record.revision,...body}}));
  applyRecord(record);await Promise.all([loadList(),loadHistory()]);
  notify(action==='publish'?'Der Stand wurde lokal freigegeben. Es wurde kein Shopify-Produkt veröffentlicht.':action==='restore'?'Der frühere Stand wurde als neue Version übernommen.':record.status==='archived'?'Die Konfiguration wurde archiviert.':'Die Konfiguration ist wieder aktiv.');
 }catch(error){mutationError(error);}finally{setBusy(false);}
}
async function save(){
 if(!state.record||state.busy||!state.dirty||!validateEditor())return;setBusy(true);
 try{const record=recordFrom(await api('/api/workshop/products/'+encodeURIComponent(state.record.id),{method:'PATCH',body:{expectedRevision:state.record.revision,document:state.draft}}));applyRecord(record);await Promise.all([loadList(),loadHistory()]);notify('Gespeichert. Stand '+record.revision+' ist jetzt in der Vorschau verfügbar.');}
 catch(error){mutationError(error);}finally{setBusy(false);}
}
function openCreate(mode='seed'){
 if(state.busy)return;
 if(mode==='copy'&&state.dirty){notify('Speichere deine Änderungen zuerst. Die Kopie verwendet den gespeicherten Stand.','info');return;}
 state.createMode=mode;$('#create-error').hidden=true;$('#master-choice-label').hidden=mode!=='master';
 $('#create-title').textContent=mode==='copy'?'Aus diesem Produkt entsteht Neues.':mode==='separate'?'Deine Änderungen separat sichern.':'Eine neue Konfiguration.';
 $('#create-description').textContent=mode==='copy'?'Die Kopie übernimmt die gespeicherte Konfiguration und erhält eine eigene ID.':mode==='separate'?'Deine aktuellen Formulareingaben werden unter einer neuen ID gesichert. Die zwischenzeitlich geänderte Konfiguration bleibt bestehen.':'Starte mit der geprüften Acrylglasvorlage. Alle Werte lassen sich anschließend bearbeiten.';
 $('#create-name').value=['seed','master'].includes(mode)?'':state.draft.name+' · Kopie';$('#create-kind').value=['seed','master'].includes(mode)?(state.view==='masters'?'master':'product'):state.draft.kind;
 $('#create-submit').textContent=mode==='copy'?'Kopie anlegen':'Konfiguration anlegen';$('#create-dialog').showModal();$('#create-name').focus();
}
$('#create-form').addEventListener('submit',async event=>{
 event.preventDefault();if(state.busy||!event.currentTarget.reportValidity())return;
 if(state.createMode==='separate'&&!validateEditor()){$('#create-dialog').close();return;}
 setBusy(true);$('#create-error').hidden=true;
 try{
  const name=$('#create-name').value.trim(),kind=$('#create-kind').value;if(!name)throw Error('Bitte gib der Konfiguration einen Namen.');
  let result;
  if(state.createMode==='master'){const id=$('#master-choice').value;const source=recordFrom(await api('/api/workshop/products/'+encodeURIComponent(id)));result=await api('/api/workshop/products/'+encodeURIComponent(id)+'/copy',{method:'POST',body:{expectedRevision:source.revision,name,kind}});}
  else if(state.createMode==='copy')result=await api('/api/workshop/products/'+encodeURIComponent(state.record.id)+'/copy',{method:'POST',body:{expectedRevision:state.record.revision,name,kind}});
  else{
   const document=state.createMode==='separate'?clone(state.draft):clone((await api('/api/workshop/seed')).document);
   document.name=name;document.kind=kind;if(kind==='master')document.masterId=null;if(document.config?.profile)document.config.profile.name=name;
   result=await api('/api/workshop/products',{method:'POST',body:{document}});
  }
  $('#create-dialog').close();if(applyRecord(recordFrom(result))===false)return;await Promise.all([loadList(),loadHistory()]);notify('Konfiguration angelegt. Deine neue ID: '+state.record.id);window.scrollTo({top:0,behavior:'instant'});
 }catch(error){$('#create-error').textContent=errorMessage(error);$('#create-error').hidden=false;if(error.status===409)mutationError(error);}
 finally{setBusy(false);}
});
$('#product-form').addEventListener('submit',event=>{event.preventDefault();save();});
$('#product-form').addEventListener('input',event=>{
 if(!state.draft||state.busy)return;const input=event.target;
 if(input.dataset.path==='kind'&&input.value==='master'){state.draft.masterId=null;$('#panel-details .static-value').textContent='Eigenständige Konfiguration';}
 if(input.dataset.path){const path=input.dataset.path;writePath(state.draft,path,path==='categoryIds'?[...new Set(input.value.split(',').map(v=>v.trim()).filter(Boolean))]:input.value);if(path==='name'){state.draft.config.profile.name=input.value;$('#record-title').textContent=input.value;}if(path==='kind')$('#record-eyebrow').textContent=input.value==='master'?'MASTERVORLAGE':'PRODUKTKONFIGURATION';markDirty();}
 if(input.dataset.money){const raw=input.value.trim(),match=/^(\d+)(?:[.,](\d{1,2}))?$/.exec(raw),cents=match?Number(match[1])*100+Number((match[2]||'').padEnd(2,'0')):NaN;const valid=Number.isSafeInteger(cents)&&cents>=0;input.setCustomValidity(valid?'':'Bitte einen positiven Eurobetrag mit höchstens zwei Nachkommastellen eingeben.');if(valid)writePath(state.draft,input.dataset.money,cents);markDirty();}
});
$('#product-form').addEventListener('change',event=>{
 const input=event.target;if(!state.draft||state.busy)return;
 if(input.dataset.elementRight){
  if(state.record?.status==='archived')return;
  const design=state.draft.config.profile.designs.find(item=>item.id===input.dataset.designId),object=design?.objects.find(item=>item.id===input.dataset.objectId),key=input.dataset.elementRight;
  if(!object||!Object.hasOwn(rightsLabels,key)||!availableRights(object)[key])return;
  state.draft.elementRights[design.id][object.id][key]=input.checked;markDirty();return;
 }
 if(input.dataset.path&&input.tagName==='SELECT')input.dispatchEvent(new Event('input',{bubbles:true}));
 if(input.dataset.path==='categoryIds'){renderProfiles();syncControls();}
 if(input.dataset.profileId){state.draft.profileAssignments??={};state.draft.profileAssignments[input.dataset.profileId]={mode:'override',profileId:input.value||null};markDirty();}
 if(input.dataset.profileMode){const key=input.dataset.profileMode;state.draft.profileAssignments??={};state.draft.profileAssignments[key]={mode:input.value,profileId:input.value==='override'?state.draft.profileAssignments[key]?.profileId||null:null};const field=$('[data-profile-id="'+key+'"]');field.required=input.value==='override';field.value=state.draft.profileAssignments[key].profileId||'';markDirty();}
});
document.addEventListener('click',async event=>{
 const view=event.target.closest('[data-view]');if(view){await showOverview(view.dataset.view);return;}
 const filter=event.target.closest('[data-filter]');if(filter){if(state.busy)return;state.filter=filter.dataset.filter;renderList();return;}
 const tab=event.target.closest('[data-tab]');if(tab){showTab(tab.dataset.tab);return;}
 const designAction=event.target.closest('[data-design-action]');if(designAction){if(!designAction.disabled)changeDesign(designAction.dataset.designAction,designAction.dataset.designId);return;}
 const product=event.target.closest('[data-product-id]');
 if(product){try{await loadRecord(product.dataset.productId);window.scrollTo({top:0,behavior:'instant'});}catch(error){notify(errorMessage(error),'error');}return;}
 const restore=event.target.closest('[data-restore]');if(restore){await mutateRecord('restore',{revision:Number(restore.dataset.restore)});return;}
 const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
 try{
  const action=button.dataset.action;
  if(action==='overview'){await showOverview();return;}
  if(action==='from-master'){if(!await canDiscard())return;const all=await api('/api/workshop/products');const masters=all.products.filter(p=>p.kind==='master');if(!masters.length){notify('Lege zuerst eine Mastervorlage an.','info');await showOverview('masters');return;}$('#master-choice').innerHTML=masters.map(p=>'<option value="'+escape(p.id)+'">'+escape(p.name)+' · Stand '+p.revision+'</option>').join('');openCreate('master');$('#create-description').textContent='Wähle eine gespeicherte Mastervorlage. Das neue Produkt erhält eine eigene ID; die Vorlage bleibt erhalten.';return;}
  if(action==='new'){if(await canDiscard())openCreate('seed');}
  if(action==='copy')openCreate('copy');
  if(action==='save-separate')openCreate('separate');
  if(action==='close-dialog')button.closest('dialog')?.close();
  if(action==='save')await save();
  if(action==='refresh')await loadList();
  if(action==='refresh-profiles'){await loadProfiles();notify('Profilbibliothek aktualisiert. Deine Produktänderungen bleiben erhalten.');}
  if(action==='reload-record'){if(await canDiscard()){await loadRecord(state.record.id,{checkDirty:false});notify('Aktueller gespeicherter Stand geladen.');}}
  if(action==='publish')await mutateRecord('publish',{});
  if(action==='archive')await mutateRecord('archive',{archived:state.record.status!=='archived'});
  if(action==='copy-id'){await navigator.clipboard.writeText(state.record.id);notify('Konfigurations-ID kopiert.');}
 }catch(error){notify(errorMessage(error),'error');}
});
$('.editor-tabs').addEventListener('keydown',event=>{
 if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
 const tabs=$$('.editor-tabs [data-tab]'),index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+tabs.length)%tabs.length;showTab(tabs[next].dataset.tab,true);
});
const productEditor=installProductEditor({state,api,markDirty,syncControls,showTab,objectLabel,availableRights});
productOptions=installProductOptions({state,api,markDirty,syncControls,previewOptions:()=>productEditor.refreshOptions(true)});
overview=installOverview({state,api,setBusy,notify,loadList,loadRecord,openCreate});
const customerFields=installCustomerFields({state,api,setBusy,notify,onSaved:async record=>{applyRecord(record);await Promise.all([loadList(),loadHistory()]);showTab('designs');}});
const designImporter=installDesignImport({state,api,setBusy,notify,onSaved:async record=>{applyRecord(record);await Promise.all([loadList(),loadHistory()]);showTab('designs');}});
let searchTimer;
$('#search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadList().catch(error=>notify(errorMessage(error),'error')),180);});
state.view=new URL(location.href).searchParams.get('view')==='masters'?'masters':'products';
window.addEventListener('beforeunload',event=>{if(!state.dirty)return;event.preventDefault();event.returnValue='';});
(async()=>{try{const [session]=await Promise.all([api('/api/workshop/session'),loadList(),loadProfiles().catch(error=>notify('Profilbibliothek noch nicht geladen: '+errorMessage(error),'info'))]);state.csrf=session.csrfToken;const id=new URL(location.href).searchParams.get('configuration');if(id)await loadRecord(id,{checkDirty:false});}catch(error){notify(errorMessage(error),'error');$('#product-list').innerHTML='<p class="empty-state">Die Werkstatt konnte noch nicht geladen werden. Über „Aktualisieren“ kannst du es erneut versuchen.</p>';}})();
