// Design-Dashboard (/werkstatt/designs/): Designs einer Linie aus dem Katalog mit Ampel, Vorschau,
// Filtern und Inline-Umbenennung (PATCH → Katalog). Liest nur über /api/workshop/designs.
import {merchantRequest} from './merchant-request.mjs';
import {merchantNavigation} from './merchant-navigation.mjs';
import {createTargetPreviewCache,reviewPage} from './design-target-preview-cache.mjs';
import {installDashboardEditor} from './design-dashboard-editor.mjs';
import {installDesignAssignments} from './design-dashboard-assignments.mjs';
import {installDesignMainProducts} from './design-dashboard-main-products.mjs';
import {setMerchantImage,merchantImagesRequired} from './merchant-media.mjs';
import {designKey,releaseKey,targetReviewRows,releaseIssue,bulkReleaseIssue,eligibleReleaseRows,retainVisibleSelection,releaseDesigns} from './design-dashboard-review.mjs';
const $=s=>document.querySelector(s),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
const natural=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
const params=new URLSearchParams(location.search);
const compactLayout=window.matchMedia('(max-width:1099px)'),phoneLayout=window.matchMedia('(max-width:639px)');
const viewStorageKey=()=>phoneLayout.matches?'gravuru-designs-mobile-view':'gravuru-designs-view';
function preferredView(){try{const saved=localStorage.getItem(viewStorageKey());if(saved==='table'||saved==='tiles'||saved==='targets')return saved;}catch{}return phoneLayout.matches?'tiles':'table';}
const state={csrf:null,lines:[],linie:params.get('linie')||null,reihe:params.get('reihe')||null,material:null,status:params.get('status')||'',freigabe:params.get('freigabe')||'',selectable:params.get('startDesigns')!=='true',startDesigns:params.get('startDesigns')==='true',query:'',view:preferredView(),data:null,busy:false,editing:null,seen:new Set(),selected:new Set(),pendingRelease:null,previewToken:0,previewLoad:null,targetFamily:params.get('familie')||null,theme:params.get('thema')||'',page:1,reviewChecksums:new Map(),pendingOnlyPassing:false};
const status=(text,error=false)=>{$('#status').textContent=text;$('#status').className=error?'error':'';$('#status').hidden=!text;};
async function request(url,options){const r=await merchantRequest(url,options);const v=await r.json().catch(()=>({}));if(!r.ok)throw Error(v.error?.message||'Die Designs konnten nicht geladen werden.');return v;}
const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;};
const mm=v=>Number.isFinite(v)?String(Math.round(v*10)/10).replace('.',','):'?';
const plateText=p=>Array.isArray(p)?mm(p[0])+' × '+mm(p[1])+' mm':'Maß offen';
const AMPEL={ok:'ok','prüfen':'prüfen',fehlt:'fehlt'};

function pushUrl(){const q=new URLSearchParams();if(state.linie)q.set('linie',state.linie);if(state.reihe)q.set('reihe',state.reihe);if(state.status)q.set('status',state.status);if(state.freigabe)q.set('freigabe',state.freigabe);if(state.startDesigns)q.set('startDesigns','true');if(state.targetFamily)q.set('familie',state.targetFamily);if(state.theme)q.set('thema',state.theme);history.replaceState(null,'',merchantNavigation(location.pathname+(q.size?'?'+q:''),location.href));}

function setFiltersOpen(open){
 const active=document.activeElement,toggle=$('#filter-toggle');
 const leavingHiddenFilter=!open&&compactLayout.matches&&active?.closest('#filter-pickers, #filter-controls');
 const leavingHiddenToggle=!compactLayout.matches&&active===toggle;
 $('#main').classList.toggle('filters-open',open);toggle.setAttribute('aria-expanded',String(open));
 if(leavingHiddenFilter)toggle.focus({preventScroll:true});
 else if(leavingHiddenToggle)$('#summary').focus({preventScroll:true});
}
function applyResponsiveView(){
 const view=preferredView();if(view===state.view)return;
 state.view=view;$('#view').value=view;renderPreservingRename();
}
function renderPreservingRename(){
 // Rerendering must keep an unfinished name, caret and keyboard focus.
 const previous=$('#rows .rename'),input=previous?.querySelector('input');
 const draft=input?{value:input.value,start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection,focusIndex:[...previous.querySelectorAll('input, button')].indexOf(document.activeElement)}:null;
 render({focusEditor:false});
 if(!draft)return;
 const form=$('#rows .rename'),replacement=form?.querySelector('input');if(!replacement)return;
 replacement.value=draft.value;
 if(draft.focusIndex>=0)form.querySelectorAll('input, button')[draft.focusIndex]?.focus({preventScroll:true});
 if(Number.isInteger(draft.start)&&Number.isInteger(draft.end))replacement.setSelectionRange(draft.start,draft.end,draft.direction);
}
function showFilteredDesigns(){
 if(!compactLayout.matches)return;
 setFiltersOpen(false);
 // Closing the picker must not leave keyboard focus in a hidden filter.
 $('#summary').focus({preventScroll:true});$('#summary').scrollIntoView({block:'start',behavior:'instant'});
}

async function loadLines(){
 const [session,data]=await Promise.all([request('/api/workshop/session'),request('/api/workshop/designs')]);
 state.csrf=session.csrfToken;state.lines=data.linien;state.themes=data.themes??[];
 if(!state.lines.some(l=>l.id===state.linie))state.linie=(state.lines.find(l=>l.designsLieferform2>0||l.bestand.length)||state.lines[0])?.id||null;
}
async function loadLine(){
 if(state.busy)return;
 assignments.reset();state.selected.clear();state.editing=null;state.page=1;state.targetFamily=null;state.busy=true;render();status('Designs werden geladen …');
 try{state.data=state.linie?await request('/api/workshop/designs?'+new URLSearchParams({linie:state.linie})):null;status('');}
 catch(e){state.data=null;status(e.message,true);}
 finally{state.busy=false;render();}
}
async function load(){
 if(state.busy)return;
 assignments.reset();state.seen.clear();state.reviewChecksums.clear();targetPreviewCache.invalidate();state.selected.clear();state.page=1;state.busy=true;render();status('Katalog wird geladen …');
 try{await loadLines();state.selected.clear();state.editing=null;state.data=state.linie?await request('/api/workshop/designs?'+new URLSearchParams({linie:state.linie})):null;status('');}
 catch(e){state.data=null;status(e.message,true);}
 finally{state.busy=false;render();}
}

function visibleRows(){
 const d=state.data;if(!d)return [];
 const q=state.query.trim().toLocaleLowerCase('de');
 return d.rows.filter(r=>(!state.reihe||r.reihe===state.reihe||r.formatreihe===state.reihe)&&(!state.material||r.material===state.material)&&(!state.status||r.status===state.status)&&(!state.freigabe||r.released===(state.freigabe==='ja'))&&(!state.selectable||r.selectable)&&(!state.startDesigns||r.isStartDesign)&&(!state.theme||r.themes.some(t=>t.id===state.theme))&&(!q||[r.id,r.name,r.nameSheet||'',...(r.mainProducts??[]).flatMap(p=>[p.id,p.customizationId,p.name,p.sizeLabel]),...r.fonts.map(f=>f.name),...r.themes.map(t=>t.name),...(r.texts.sample||[])].some(v=>String(v).toLocaleLowerCase('de').includes(q)))).sort((a,b)=>natural.compare(a.id,b.id));
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
// Review data survives pagination and editor overlays, but never a changed source checksum.
const targetPreviewCache=createTargetPreviewCache({limit:3,maxEntries:120});
const tileViews=new Map(),tileUrls=new Set();let tileObserver=null;
const targetView=()=>state.view==='tiles'||state.view==='targets';
const operationContext=()=>({rows:visibleRows(),families:state.data?.familien??[],themes:state.themes??[],lineId:state.linie,familyId:state.targetFamily,csrf:state.csrf,busy:state.busy});
const assignments=installDesignAssignments({request,getContext:operationContext,onChanged:refreshDashboardRows,onBusy:setOperationBusy});
const mainProductEditor=installDesignMainProducts({request,getContext:operationContext,onChanged:refreshDashboardRows,onBusy:setOperationBusy});
function setOperationBusy(value){state.busy=value;syncReleaseControls();assignments.sync();for(const control of document.querySelectorAll('main button, main input, main select'))control.disabled=value||control.dataset.blocked==='true';$('#main').setAttribute('aria-busy',String(value));}
const tileCacheKey=row=>JSON.stringify([releaseKey(row),'default']);
const targetRow=row=>targetReviewRows([row]).find(item=>item.targetFamily&&item.targetFamily===(state.targetFamily||row.ziele?.find(target=>target.inLine!==false)?.familie));
const dashboardEditor=installDashboardEditor({request:merchantRequest,onSaved:refreshChangedDesign,onClosed:identity=>{const key=JSON.stringify([identity.reihe,identity.id]),link=[...document.querySelectorAll('[data-catalog-edit]')].find(node=>node.dataset.catalogEdit===key);link?.focus({preventScroll:true});for(const view of tileViews.values())markTileSeen(view);}});
function appendTargetSizes(select,sizes){
 const groups=new Map();
 for(const item of sizes){const key=item.seriesKey??item.groupKey??'unknown';let group=groups.get(key);if(!group){group=el('optgroup');group.label=(item.groupName||'Form offen')+(item.ratioLabel?' · Reihe '+item.ratioLabel:'')+(item.compatible===false?' · Variante nötig':'');groups.set(key,group);select.append(group);}const option=el('option',item.label);option.value=item.key;group.append(option);}
}
function renderTargetFilters(){
 const families=new Map();for(const row of state.data?.rows??[])for(const target of row.ziele??[])if(target.inLine!==false)families.set(target.familie,target);
 if(!families.has(state.targetFamily))state.targetFamily=families.keys().next().value||null;
 const family=$('#target-family');family.replaceChildren();
 if(!families.size){const option=el('option','Keine Familie dieser Linie verfügbar');option.value='';family.append(option);}
 for(const target of families.values()){const option=el('option',target.name+(target.missing?' · Familie fehlt':''));option.value=target.familie;family.append(option);}
 family.value=state.targetFamily||'';gate(family,families.size?null:'Kein Familienziel verfügbar.');
 const theme=$('#filter-theme');theme.replaceChildren();const all=el('option','Alle Themen');all.value='';theme.append(all);
 for(const item of state.themes??[]){const option=el('option',item.name);option.value=item.id;theme.append(option);}theme.value=state.theme;
 $('#target-review-controls').hidden=!targetView();
 const groups=(state.data?.availableFormGroups??[]).filter(group=>group.familyId===state.targetFamily),summary=$('#target-form-summary');summary.hidden=!targetView()||!groups.length;summary.replaceChildren();
 if(groups.length){summary.append(el('strong','Kompatible Designs im Gesamtbestand der Familie: '));for(const group of groups)summary.append(el('span',group.groupName+': '+group.count+' Design'+(group.count===1?'':'s')+(group.count===0?' – keine kompatible Designreihe vorhanden':''),group.count===0?'empty-target-group':''));}
}
function invalidateDesignReview(design){
 for(const row of targetReviewRows([design])){const key=releaseKey(row);targetPreviewCache.invalidate(tileCacheKey(row));state.seen.delete(key);state.selected.delete(key);state.reviewChecksums.delete(key);if(row.target){row.target.sourceRevision=null;delete row.target.openedChecksum;}}
}
function adoptTargetReview(row,result){
 const key=releaseKey(row),previous=state.reviewChecksums.get(key);
 if(previous&&previous!==result.checksum){state.seen.delete(key);state.selected.delete(key);state.reviewChecksums.delete(key);delete row.target.openedChecksum;}
 row.target.fit=result.reviewFit??result.fit;row.target.checksum=result.checksum;row.target.sourceRevision=result.checksum;
}
function retireTargetCard(card){
 for(const [surface,view]of tileViews)if(surface.closest('.target-tile')===card){tileObserver?.unobserve(surface);tileViews.delete(surface);if(view.url){URL.revokeObjectURL(view.url);tileUrls.delete(view.url);}}
}
function clearTargetTiles(){
 targetPreviewCache.cancelPending();tileObserver?.disconnect();tileObserver=null;tileViews.clear();
 for(const url of tileUrls)URL.revokeObjectURL(url);tileUrls.clear();
}
function tileCanBeSeen(view){return view.visible&&view.loaded&&view.img.isConnected&&!view.img.hidden&&document.visibilityState!=='hidden'&&!dashboardEditor.isOpen&&!assignments.isOpen&&!mainProductEditor.isOpen&&!$('#preview-dialog').open&&!$('#release-dialog').open&&!$('#variant-dialog').open&&view.row.target.checksum===view.checksum;}
function markTileSeen(view){
 if(!tileCanBeSeen(view))return;
 const key=releaseKey(view.row);state.seen.add(key);state.reviewChecksums.set(key,view.checksum);
 syncReleaseControls();
}
function targetTilePreview(row,cls){
 const img=el('img',undefined,cls);img.alt=row.id+' · '+row.target.name+' · Zielvorschau mit Plattenkontur';img.decoding='async';img.hidden=true;
 const caption=el('span','Zielvorschau wird geladen …','target-preview-status');
 const control=button('',()=>void openTargetPreview(row),'preview-button');control.dataset.previewKey=designKey(row);control.setAttribute('aria-label','Zielvorschau öffnen: '+row.id);control.append(img,caption);
 // Observe the image-sized surface even before its image is loaded. A hidden img has no box.
 const surface=el('span',undefined,'target-preview-surface');surface.append(img);control.replaceChildren(surface,caption);
 const view={row,img,surface,caption,visible:false,loaded:false,started:false,checksum:null};tileViews.set(surface,view);
 if(!tileObserver&&typeof IntersectionObserver!=='undefined')tileObserver=new IntersectionObserver(entries=>{for(const entry of entries){const item=tileViews.get(entry.target);if(!item)continue;item.visible=entry.isIntersecting&&(entry.intersectionRatio===undefined||entry.intersectionRatio>=.5);if(item.visible&&!item.started)void loadTargetTile(item);markTileSeen(item);}},{threshold:[0,.5,1]});
 if(tileObserver)tileObserver.observe(surface);else{caption.textContent='Zielvorschau zum Prüfen öffnen.';gate(control,row.target.missing?'Familie fehlt.':null);}
 return control;
}
async function loadTargetTile(view){
 if(view.started||!view.surface.isConnected)return;view.started=true;
 const row=view.row,key=releaseKey(row),revision=row.target.sourceRevision;
 if(row.target.missing||!row.target.previewUrl){view.caption.textContent='Familie fehlt. Keine Zielvorschau.';return;}
 if(state.reviewChecksums.has(key)&&state.reviewChecksums.get(key)!==revision){state.seen.delete(key);state.selected.delete(key);state.reviewChecksums.delete(key);delete row.target.openedChecksum;}
 try{
  const result=await targetPreviewCache.get(tileCacheKey(row),revision,signal=>request(row.target.previewUrl,{signal}));
  if(!view.surface.isConnected||tileViews.get(view.surface)!==view)return;
  adoptTargetReview(row,result);view.checksum=result.checksum;view.caption.textContent='Passung: '+row.target.fit.status+'. '+(row.target.fit.issues??[]).join(' ');
  updateTargetCard(view.surface.closest('.target-tile'),row);
  if(!result.svg){syncReleaseControls();return;}
  const url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));tileUrls.add(url);view.url=url;
  view.img.onload=()=>{if(!view.img.isConnected||view.img.getAttribute('src')!==url||!view.img.naturalWidth)return;view.loaded=true;view.img.hidden=false;markTileSeen(view);};
  view.img.onerror=()=>{if(!view.img.isConnected)return;view.loaded=false;state.seen.delete(key);state.selected.delete(key);view.caption.textContent='Zielvorschau konnte nicht geladen werden. Bitte einzeln öffnen.';syncReleaseControls();};view.img.src=url;
 }catch(error){if(!view.surface.isConnected)return;view.caption.textContent=error.name==='AbortError'?'Zielvorschau neu öffnen.':error.message;syncReleaseControls();}
}
function updateTargetCard(card,row){
 if(!card)return;const fit=row.target?.fit;
 const badge=card.querySelector('.target-fit');if(badge){badge.textContent=fit?.status||'Noch nicht geprüft';badge.className='ampel target-fit '+(fit?.status==='passt'?'ok':fit?.status==='passt nicht'?'fehlt':'prüfen');}
 const reason=card.querySelector('.target-issues');if(reason)reason.textContent=(fit?.issues??[]).join(' ');
}
function renderTargetCard(row,{focusEditor=true}={}){
 const review=targetRow(row),card=el('article',undefined,'tile target-tile '+row.status);card.dataset.designRow=designKey(row);
 if(!Array.isArray(row.ziele)){card.append(preview(row,'tile-img'));const head=el('div',undefined,'tile-head');head.append(ampel(row),el('code',row.id));card.append(head,selection(row),nameCell(row,{focusEditor}),fontList(row),flags(row),editorCell(row));return card;}
 if(review){card.dataset.targetReviewKey=releaseKey(review);card.append(targetTilePreview(review,'tile-img'));}
 else card.append(el('p','Kein bestätigtes Ziel dieser Familie. Ziel zuerst zuordnen.','notice'));
 const head=el('div',undefined,'tile-head');head.append(el('span',review?'Noch nicht geprüft':'Ziel fehlt','ampel target-fit'),el('code',row.id));
 card.append(head,nameCell(row,{focusEditor}));if(assignments.active)card.append(assignments.selection(row));
 if(review){card.append(el('p',review.target.name,'muted'),el('p',(review.target.fit?.issues??[]).join(' '),'target-issues'));if(!assignments.active)card.append(selection(review));
  const action=button(review.released?'Zielfreigabe zurücknehmen':'Ziel freigeben',()=>review.released?save(review,{freigegeben:false}):askRelease([review]),review.released?'quiet':'release');action.dataset.releaseKey=releaseKey(review);action.hidden=assignments.active;card.append(gate(action,review.released?null:releaseIssue(review,state.seen)));updateTargetCard(card,review);
 }
 card.append(fontList(row),flags(row),editorCell(row,{compactTarget:true}));return card;
}
function renderPagination(host,page){
 const nav=el('nav',undefined,'target-pagination');nav.setAttribute('aria-label','Zielvorschauen seitenweise');
 const move=number=>{state.page=number;render();$('#summary').focus({preventScroll:true});$('#summary').scrollIntoView({block:'start',behavior:'instant'});};
 const previous=button('Vorherige Seite',()=>move(page.page-1)),next=button('Nächste Seite',()=>move(page.page+1));previous.id='target-page-previous';next.id='target-page-next';gate(previous,page.page===1?'Erste Seite.':null);gate(next,page.page===page.pages?'Letzte Seite.':null);
 const label=el('span','Seite '+page.page+' von '+page.pages+' · '+page.total+' Designs');label.id='target-page-summary';nav.append(previous,label,next);host.append(nav);
}
function activeReviewRows(){const rows=targetReviewRows(visibleRows());return targetView()?rows.filter(row=>row.targetFamily===state.targetFamily):rows;}
function passingSeenRows(){return eligibleReleaseRows(activeReviewRows(),state.seen).filter(row=>row.targetFamily&&row.target.fit?.status==='passt'&&state.reviewChecksums.get(releaseKey(row))===row.target.checksum);}
function syncReleaseControls(){
 const rows=activeReviewRows(),byKey=new Map(rows.map(row=>[releaseKey(row),row]));
 for(const control of document.querySelectorAll('[data-design-key], [data-release-key]')){
  const key=control.dataset.designKey??control.dataset.releaseKey,row=byKey.get(key);if(!row)continue;
  const issue=releaseIssue(row,state.seen);if(control.dataset.designKey){gate(control,bulkReleaseIssue(row,state.seen));control.checked=state.selected.has(key);}else gate(control,row.released?null:issue);
 }
 const passing=passingSeenRows();$('.selection-bar').hidden=assignments.active;$('.review-help').hidden=assignments.active;$('.selection-bar').classList.toggle('has-selection',state.selected.size>0||targetView());
 $('#selection-summary').textContent=state.selected.size+' ausgewählt · '+passing.length+' geprüfte Ziele mit „passt“';
 gate($('#release-selected'),state.selected.size?null:'Erst Vorschauen öffnen und Designs auswählen.');gate($('#clear-selection'),state.selected.size?null:'Keine Designs ausgewählt.');
 $('#release-seen').hidden=!targetView();gate($('#release-seen'),passing.length?null:'Noch keine sichtbaren, geladenen Zielkacheln mit „passt“.');
}
// Batch operations refresh once and preserve unaffected target cards and their review state.
async function refreshDashboardRows({designs,invalidatePreview=true}){
 const line=state.linie;if(!line||!state.data)return;const keys=new Set(designs.map(item=>JSON.stringify([item.reihe,item.id]))),oldRows=new Map(state.data.rows.map(row=>[designKey(row),row]));
 if(invalidatePreview)for(const key of keys)if(oldRows.has(key))invalidateDesignReview(oldRows.get(key));
 const fresh=await request('/api/workshop/designs?'+new URLSearchParams({linie:line}));if(state.linie!==line)return;
 for(let index=0;index<fresh.rows.length;index++){
  const row=fresh.rows[index],key=designKey(row),previous=oldRows.get(key);if(!previous)continue;
  if(JSON.stringify((previous.ziele??[]).map(target=>target.familie))!==JSON.stringify((row.ziele??[]).map(target=>target.familie))){keys.add(key);invalidateDesignReview(previous);}
  for(let targetIndex=0;targetIndex<(row.ziele??[]).length;targetIndex++){
   const target=row.ziele[targetIndex],old=previous.ziele?.find(item=>item.familie===target.familie);
   if(old&&target.sourceRevision&&old.sourceRevision===target.sourceRevision){
    // The unchanged DOM and in-flight previews still reference this object.
    // Preserve identity, not just a snapshot of fields from before the request.
    const runtime={};for(const field of ['fit','checksum','openedChecksum'])if(old[field]!==undefined)runtime[field]=old[field];Object.assign(old,target,runtime);row.ziele[targetIndex]=old;
   }else if(old){const review=targetReviewRows([previous]).find(item=>item.targetFamily===target.familie);state.seen.delete(releaseKey(review));state.selected.delete(releaseKey(review));state.reviewChecksums.delete(releaseKey(review));targetPreviewCache.invalidate(tileCacheKey(review));keys.add(key);}
  }
  if(!keys.has(key)){Object.assign(previous,row);fresh.rows[index]=previous;}
 }
 state.data=fresh;const cards=[...$('#rows').querySelectorAll('.target-tile')],next=reviewPage(visibleRows(),state.page).rows;
 if(targetView()&&cards.length===next.length&&cards.every((card,index)=>card.dataset.designRow===designKey(next[index]))){for(let index=0;index<cards.length;index++)if(keys.has(cards[index].dataset.designRow)){retireTargetCard(cards[index]);cards[index].replaceWith(renderTargetCard(next[index],{focusEditor:false}));}render({focusEditor:false,preserveRows:true});}
 else render({focusEditor:false});
}
const pendingRowRefresh=new Map();
async function refreshChangedDesign(changed){
 const key=JSON.stringify([changed.reihe,changed.id]);if(!state.data?.rows.some(row=>designKey(row)===key))return;
 if(pendingRowRefresh.has(key))return pendingRowRefresh.get(key);
 const work=(async()=>{
  const old=state.data.rows.find(row=>designKey(row)===key),line=state.linie;
  invalidateDesignReview(old);
  state.seen.delete(key);state.selected.delete(key);
  if(state.editing||state.busy){renderPreservingRename();status('Das Design wurde in einem anderen Fenster geändert. Bitte nach deiner aktuellen Bearbeitung neu laden.',true);return;}
  try{const fresh=await request('/api/workshop/designs?'+new URLSearchParams({linie:line}));if(state.linie!==line)return;
   const replacement=fresh.rows.find(row=>designKey(row)===key),index=state.data.rows.indexOf(old);if(index<0)return;
   if(replacement)state.data.rows[index]=replacement;else state.data.rows.splice(index,1);
   state.data.counts=fresh.counts;
   // Keep other cards, decoded previews and their scroll positions in place.
   const current=[...$('#rows').querySelectorAll('[data-design-row]')].find(node=>node.dataset.designRow===key);
   if(targetView()&&current&&replacement&&visibleRows().includes(replacement)){retireTargetCard(current);const next=renderTargetCard(replacement,{focusEditor:false});current.replaceWith(next);syncReleaseControls();}
   else render({focusEditor:false});
   status('Gespeichertes Design aktualisiert: '+changed.id+'. Andere Vorschauen bleiben erhalten.');
  }catch(error){status('Das geänderte Design konnte nicht aktualisiert werden: '+error.message,true);}
 })();pendingRowRefresh.set(key,work);try{await work;}finally{pendingRowRefresh.delete(key);}
}

function preview(row,cls){
 if(targetView()){const target=targetRow(row);if(target)return targetTilePreview(target,cls);}
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
 $('#target-size-control')?.remove();
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

async function openTargetPreview(row,size=null){
 if(state.busy)return;
 releasePreview();$('#target-size-control')?.remove();
 const dialog=$('#preview-dialog'),img=$('#preview-image'),token=state.previewToken,key=releaseKey(row),attempt={controller:new AbortController(),src:null,url:null};state.previewLoad=attempt;
 const current=()=>token===state.previewToken&&state.previewLoad===attempt&&dialog.open&&!attempt.controller.signal.aborted;
 state.seen.delete(key);state.selected.delete(key);row.target.fit=null;render();
 $('#preview-title').textContent=row.id+' · '+row.target.name;$('#preview-status').textContent='Zielvorschau wird geladen …';img.alt=row.id+' auf '+row.target.name;
 if(!dialog.open)dialog.showModal();
 try{
  const url=new URL(row.target.previewUrl,location.href);if(size)url.searchParams.set('size',size);
  const result=await request(url.pathname+url.search,{signal:attempt.controller.signal});if(!current())return;
  adoptTargetReview(row,result);
  const control=el('label',undefined,'target-size-control');control.id='target-size-control';control.append(el('span','Zielgröße '));const select=el('select');select.setAttribute('aria-label','Zielgröße');
  appendTargetSizes(select,result.sizes??[]);select.value=result.size?.key;select.addEventListener('change',()=>void openTargetPreview(row,select.value));control.append(select);$('#preview-status').parentElement.append(control);
  if(!result.svg){$('#preview-status').textContent=(row.target.fit.issues??[]).join(' ')||'Vorschau offen. Freigabe bleibt gesperrt.';render();return;}
  img.onload=()=>{if(!current()||img.getAttribute('src')!==attempt.src||!img.naturalWidth)return;img.hidden=false;state.seen.add(key);state.reviewChecksums.set(key,result.checksum);row.target.openedChecksum=result.checksum;$('#preview-status').textContent='Passung: '+row.target.fit.status+'. '+(row.target.fit.issues??[]).join(' ');render();};
  img.onerror=()=>{if(!current())return;state.seen.delete(key);clearPreviewSource();$('#preview-status').textContent='Zielvorschau nicht verfügbar. Freigabe bleibt gesperrt.';render();};
  attempt.url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));attempt.src=attempt.url;img.src=attempt.src;
 }catch(error){if(!current())return;state.seen.delete(key);clearPreviewSource();$('#preview-status').textContent=error.message+' Freigabe bleibt gesperrt.';render();}
}
function targetCards(row){
 const box=el('div',undefined,'design-targets');box.append(el('strong','Familienziele'));
 for(const issue of row.zielHinweise??[])box.append(el('p',issue,'notice'));
 if(!row.ziele.length)box.append(el('p','Noch kein Familienziel bestätigt.','muted'));
 for(const review of targetReviewRows([row])){
  const target=review.target,card=el('section',undefined,'design-target');card.dataset.targetFamily=target.familie;
  card.append(el('strong',target.name),el('small',[target.material,target.process].filter(Boolean).join(' · '),'muted'),el('small','Für außen: '+(target.outdoorSuitable===true?'Ja':target.outdoorSuitable===false?'Nein':'Unbekannt'),'muted'));
  card.append(el('span',target.released?'freigegeben':'offen','flag '+(target.released?'released':'')));
  const view=button('Zielvorschau öffnen',()=>void openTargetPreview(review));view.dataset.targetPreview=releaseKey(review);card.append(gate(view,target.missing?'Familie fehlt.':null),selection(review));
  const issue=releaseIssue(review,state.seen),action=button(target.released?'Zielfreigabe zurücknehmen':'Ziel freigeben',()=>target.released?save(review,{freigegeben:false}):askRelease([review]),target.released?'quiet':'release');action.dataset.releaseKey=releaseKey(review);card.append(gate(action,target.released?null:issue));
  if(!target.released&&issue)card.append(el('small',issue,'muted'));if(state.seen.has(releaseKey(review)))card.append(el('small','Zielvorschau in dieser Sitzung geöffnet.','reviewed'));box.append(card);
 }
 return box;
}
function targetSuggestions(row){
 const box=el('details',undefined,'target-suggestions');box.append(el('summary','Ziele vorschlagen und bestätigen'));const selected=new Set();
 for(const suggestion of row.zielVorschlaege??[]){
  const label=el('label',undefined,'target-suggestion'),text=[suggestion.name,suggestion.material,suggestion.process].filter(Boolean).join(' · ');
  if(suggestion.missing){label.append(el('span',text+' – Familie fehlt','notice'));}
  else{const input=el('input');input.type='checkbox';input.dataset.suggestedFamily=suggestion.familie;input.addEventListener('change',()=>{if(input.checked)selected.add(suggestion.familie);else selected.delete(suggestion.familie);confirm.hidden=true;});label.append(input,el('span',text));}
  label.append(el('small','Themen: '+(suggestion.reason??[]).join(', '),'muted'));box.append(label);
 }
 const confirm=el('div',undefined,'target-confirm');confirm.hidden=true;const count=el('p');confirm.append(count,button('Ziele bestätigen – noch nicht freigeben',()=>{if(selected.size)void save(row,{zieleHinzufuegen:[...selected]});}));
 box.append(button('Ausgewählte Ziele übernehmen',()=>{if(!selected.size)return;count.textContent=selected.size+' Ziel'+(selected.size===1?'':'e')+' hinzufügen? Jedes Ziel muss anschließend separat geprüft und freigegeben werden.';confirm.hidden=false;}),confirm);return box;
}
function themeEditor(row){
 const box=el('details',undefined,'design-themes');box.append(el('summary','Themen bearbeiten'));const selected=new Set(row.themes.map(t=>t.id));
 for(const theme of state.themes??[]){const label=el('label'),input=el('input');input.type='checkbox';input.checked=selected.has(theme.id);input.dataset.theme=theme.id;input.addEventListener('change',()=>{if(input.checked)selected.add(theme.id);else selected.delete(theme.id);});label.append(input,el('span',theme.name));box.append(label);}
 box.append(button('Themen speichern',()=>save(row,{themes:[...selected]})));return box;
}

const variantState={row:null,plan:null,input:null,token:0,url:null,comparisonUrls:[],busy:false,writing:false};
function clearVariant(){variantState.token++;variantState.plan=null;variantState.input=null;if(variantState.url)URL.revokeObjectURL(variantState.url);variantState.url=null;for(const url of variantState.comparisonUrls)URL.revokeObjectURL(url);variantState.comparisonUrls=[];$('#variant-image').removeAttribute('src');$('#variant-image').hidden=true;$('#variant-confirm').disabled=true;$('#variant-result').replaceChildren();}
function variantOptions(select,items,preferred){select.replaceChildren(...items.map(item=>{const option=el('option',item.name??item.label);option.value=item.id??item.key;return option;}));select.value=items.some(item=>(item.id??item.key)===preferred)?preferred:(items[0]?.id??items[0]?.key??'');}
function variantFamily(){return state.data?.familien?.find(f=>f.id===$('#variant-family').value);}
function variantFields(){clearVariant();const family=variantFamily();variantOptions($('#variant-size'),family?.sizes??[]);variantOptions($('#variant-line'),family?.linien??[],state.linie);$('#variant-status').textContent=family?'Einpassung zuerst prüfen.':'Keine vorhandene Familie verfügbar.';}
function openVariant(row){if(state.busy)return;clearVariant();variantState.row=row;$('#variant-title').textContent=row.id+' · Für ein anderes Ziel einpassen';variantOptions($('#variant-family'),state.data?.familien??[],row.ziele?.[0]?.familie??row.familyId);variantFields();$('#variant-dialog').showModal();}
async function prepareVariant(resolution=null){
 if(resolution!=='add-target-to-existing')resolution=null;
 if(variantState.busy)return;clearVariant();const token=variantState.token,row=variantState.row,family=variantFamily();if(!family||!$('#variant-size').value)return;
 const input={source:{reihe:row.lieferform2.reihe,id:row.id},target:{familyId:family.id,sizeKey:$('#variant-size').value,...($('#variant-line').value?{lineId:$('#variant-line').value}:{})},...(resolution?{resolution}:{})};
 variantState.busy=true;$('#variant-prepare').disabled=true;$('#variant-status').textContent='Einpassung wird geprüft …';
 try{
  const plan=await request('/api/workshop/designs/variant/prepare',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':state.csrf},body:JSON.stringify(input)});if(token!==variantState.token||!$('#variant-dialog').open)return;
  variantState.plan=plan;variantState.input=input;$('#variant-status').textContent=plan.message??plan.status??'';
  const result=$('#variant-result');if(plan.reason)result.append(el('p',plan.reason,'notice'));if(plan.identity)result.append(el('p','Kennung: '+plan.identity.id));if(Number.isFinite(plan.transform?.deviationPercent))result.append(el('p','Abweichung des Seitenverhältnisses: '+mm(plan.transform.deviationPercent)+' %. Proportional eingepasst.'));
  if(resolution&&plan.existing)result.append(el('p','Vorhandenes Design: '+plan.existing.id+'. Nur dieses Ziel wird ergänzt; die Gestaltung bleibt erhalten.'));
  if(plan.fit){result.append(el('p','Passung: '+plan.fit.status));for(const issue of plan.fit.issues??[])result.append(el('p',typeof issue==='string'?issue:issue.message,'notice'));}
  if(plan.svg){variantState.url=URL.createObjectURL(new Blob([plan.svg],{type:'image/svg+xml'}));$('#variant-image').src=variantState.url;$('#variant-image').hidden=false;}else if(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(plan.previewUrl??'')){$('#variant-image').src=plan.previewUrl;$('#variant-image').hidden=false;}
  if(plan.action==='blocked'&&plan.allowAddTarget===true&&plan.existing?.id){
   for(const [key,label]of [['source','Quelle '+row.id],['existing','Vorhandenes Design '+plan.existing.id]]){
    const figure=el('figure');figure.append(el('figcaption',label));
    if(plan[key+'Svg']){const img=el('img');img.alt=label;img.setAttribute('style','display:block;width:100%;height:auto');const url=URL.createObjectURL(new Blob([plan[key+'Svg']],{type:'image/svg+xml'}));variantState.comparisonUrls.push(url);img.src=url;figure.append(img);}
    else figure.append(el('p',plan[key+'PreviewError']??'Vorschau nicht verfügbar.','notice'));
    const fit=plan[key+'Fit'];if(fit){figure.append(el('p','Passung: '+fit.status));for(const issue of fit.issues??[])figure.append(el('p',typeof issue==='string'?issue:issue.message,'notice'));}result.append(figure);
   }
   result.append(el('p','Die Kennung ist bereits belegt. Die vorhandene Gestaltung kann nach erneuter Prüfung ein zusätzliches Ziel erhalten; sie wird nicht überschrieben.','notice'),button('Ziel zu '+plan.existing.id+' hinzufügen',()=>prepareVariant('add-target-to-existing')));
  }
  $('#variant-confirm').textContent=plan.action==='add-target'?'Ziel bestätigen – noch nicht freigeben':plan.action==='already-exists'?'Vorhandene Variante öffnen':'Variante anlegen – offen';$('#variant-confirm').disabled=plan.action==='blocked'||!['create-variant','add-target','already-exists'].includes(plan.action);
 }catch(error){if(token===variantState.token)$('#variant-status').textContent=error.message;}
 finally{variantState.busy=false;$('#variant-prepare').disabled=false;}
}
function variantEditorLink(editor){const query=new URLSearchParams({katalogReihe:editor.reihe,katalogDesign:editor.id,katalogLinie:$('#variant-line').value||state.linie}),link=el('a','Im Editor öffnen','button');link.href=merchantNavigation('/werkstatt/designs/bearbeiten/?'+query,location.href);$('#variant-result').append(link);}
async function confirmVariant(){
 if(variantState.busy||!variantState.plan||$('#variant-confirm').disabled)return;const plan=variantState.plan;
 if(plan.action==='already-exists'){if(plan.editor)variantEditorLink(plan.editor);$('#variant-confirm').disabled=true;return;}
 const token=variantState.token;variantState.busy=true;variantState.writing=true;$('#variant-close').disabled=true;for(const id of ['variant-family','variant-size','variant-line'])$('#'+id).disabled=true;$('#variant-confirm').disabled=true;$('#variant-prepare').disabled=true;
 try{
  const result=await request('/api/workshop/designs/variant',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':state.csrf},body:JSON.stringify({...variantState.input,source:{...variantState.input.source,checksum:plan.source.checksum},checksum:plan.checksum})});if(token!==variantState.token)return;
  $('#variant-status').textContent=result.message??'Gespeichert. Das Ziel bleibt offen und muss separat geprüft werden.';if(result.editor)variantEditorLink(result.editor);variantState.plan=null;
  state.seen.clear();state.selected.clear();void load();
 }catch(error){if(token===variantState.token)$('#variant-status').textContent=error.message+' Bitte Einpassung erneut prüfen.';}
 finally{variantState.busy=false;variantState.writing=false;$('#variant-close').disabled=false;for(const id of ['variant-family','variant-size','variant-line'])$('#'+id).disabled=false;$('#variant-prepare').disabled=false;}
}

function selection(row){
 if(assignments.active)return row.targetFamily?el('span'):assignments.selection(row);
 if(Array.isArray(row.ziele)&&!row.targetFamily)return el('span');
 const label=el('label',undefined,'design-selection'),input=el('input');input.type='checkbox';input.dataset.designKey=releaseKey(row);input.checked=state.selected.has(releaseKey(row));
 input.setAttribute('aria-label',row.id+' zur Freigabe auswählen');
 gate(input,bulkReleaseIssue(row,state.seen));input.addEventListener('change',()=>{
  if(state.busy||bulkReleaseIssue(row,state.seen)){input.checked=state.selected.has(releaseKey(row));return;}
  if(input.checked)state.selected.add(releaseKey(row));else state.selected.delete(releaseKey(row));render();
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

function editorCell(row,{compactTarget=false}={}){
 const box=el('div',undefined,'actions');
 const mainAction=mainProductEditor.button(row);if(mainAction)box.append(mainAction);
 if(row.lieferform2){
  const query=new URLSearchParams({katalogReihe:row.lieferform2.reihe,katalogDesign:row.id,katalogLinie:state.linie});
  const a=el('a','Bearbeiten','button');a.href=merchantNavigation('/werkstatt/designs/bearbeiten/?'+query,location.href);a.dataset.catalogEdit=designKey(row);
  a.title='Katalogdesign bearbeiten: '+row.id;a.setAttribute('aria-disabled',String(state.busy));if(state.busy)a.tabIndex=-1;
  a.addEventListener('click',event=>{if(event.button&&event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();if(!state.busy)void dashboardEditor.open({reihe:row.lieferform2.reihe,id:row.id,linie:state.linie,trigger:a});});box.append(a);
 }
 if(row.konfi?.products?.length){const p=row.konfi.products[0];const a=el('a','Im Editor öffnen','button');a.href=p.href;a.title='Konfi-Produkt '+p.importKey+' (Stand '+p.revision+')';box.append(a);if(row.konfi.products.length>1)box.append(el('small',row.konfi.products.length+' Produkte','muted'));}
 else if(!row.lieferform2)box.append(el('span','keine Lieferform 2','muted'));
 if(row.lieferform2){box.append(button('Für anderes Ziel einpassen',()=>openVariant(row)));box.append(button('Name ändern',()=>{state.editing=designKey(row);render();}));box.append(button(row.hidden?'Einblenden':'Ausblenden',()=>save(row,{hidden:!row.hidden}),'quiet'));
  if(Array.isArray(row.ziele)){if(!compactTarget)box.append(targetCards(row));box.append(targetSuggestions(row),themeEditor(row));return box;}
  const issue=releaseIssue(row,state.seen),b=button(row.released?'Freigabe zurücknehmen':'Freigeben',()=>row.released?save(row,{freigegeben:false}):askRelease([row]),row.released?'quiet':'release');
  b.dataset.releaseKey=designKey(row);b.hidden=assignments.active;b.title=row.released?'Design wieder auf „offen“ setzen.':'Design nach der Sichtprüfung freigeben.';
  box.append(gate(b,row.released?null:issue));
  if(!row.released&&issue)box.append(el('small',issue,'muted'));
  if(state.seen.has(designKey(row)))box.append(el('small','Vorschau in dieser Sitzung geöffnet.','reviewed'));
 }

 return box;
}
function nameCell(row,{focusEditor=true}={}){
 const box=el('div',undefined,'name');
 if(state.editing===designKey(row)){
  const form=el('form',undefined,'rename'),input=el('input');input.type='text';input.value=row.name;input.maxLength=160;input.required=true;input.setAttribute('aria-label','Neuer Name für '+row.id);
  const ok=el('button','Speichern','primary');ok.type='submit';const cancel=button('Abbrechen',()=>{state.editing=null;render();});
  form.append(input,ok,cancel);form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())save(row,{name:input.value.trim()});});
  box.append(form);if(focusEditor)setTimeout(()=>{if(input.isConnected)input.focus();},0);
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
 return request('/api/workshop/designs',{method:'PATCH',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':state.csrf},body:JSON.stringify({reihe:row.lieferform2.reihe,designId:row.id,...(row.targetFamily?{familie:row.targetFamily,...(change.freigegeben===true?{checksum:row.target.checksum}:{})}:{}),...change})});
}
function applySaved(row,result,change){
 if(result.changed)invalidateDesignReview(row._design??row);
 if(row.targetFamily){
  const parent=row._design,target=parent.ziele.find(t=>t.familie===row.targetFamily),saved=result.design?.ziele?.find(t=>t.familie===row.targetFamily);
  if(saved)target.freigabe=saved.freigabe;target.released=change.freigegeben??target.released;
  parent.released=parent.ziele.filter(t=>t.inLine!==false).length>0&&parent.ziele.filter(t=>t.inLine!==false).every(t=>t.released);
  state.selected.delete(releaseKey(row));if(state.data)state.data.counts.freigegeben=state.data.rows.filter(r=>r.released).length;return;
 }
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
  if(change.name!==undefined||change.hidden!==undefined||change.themes!==undefined||change.zieleHinzufuegen!==undefined){
   try{state.data=await request('/api/workshop/designs?'+new URLSearchParams({linie:state.linie}));}
   catch(e){status(message+' Die Ansicht konnte nicht aktualisiert werden: '+e.message,true);return;}
  }
  status(message);
 }catch(e){status(e.message,true);}
 finally{state.busy=false;render();}
}
function askRelease(rows,{onlyPassing=false}={}){
 if(state.busy||$('#release-dialog').open)return;
 const eligible=eligibleReleaseRows(rows,state.seen).filter(row=>!onlyPassing||!row.targetFamily||row.target?.fit?.status==='passt');if(!eligible.length)return;
 state.pendingRelease=eligible.map(releaseKey);state.pendingOnlyPassing=onlyPassing;
 $('#release-count').textContent=eligible.length+(eligible.some(r=>r.targetFamily)?' Ziel'+(eligible.length===1?'':'e'):' Design'+(eligible.length===1?'':'s'))+' freigeben?';
 $('#release-list').replaceChildren(...eligible.map(row=>el('li',row.id+' · '+row.name+(row.target?' · '+row.target.name:''))));
 $('#release-dialog').showModal();
}
let releaseController=null;
function releaseProgress(progress){
 $('#release-progress').textContent='Freigabe '+(progress.completed+(progress.active?1:0))+' von '+progress.total+' · '+progress.rejected+' abgelehnt'+(releaseController?.signal.aborted?' · Abbruch angefordert, laufende Freigabe wird noch abgeschlossen':'');
}
function releaseResults(results){
 $('#release-results').replaceChildren(...results.map(item=>el('li',item.row.id+(item.row.target?' · '+item.row.target.name:'')+' · '+(item.status==='ok'?'ok':item.status==='cancelled'?'abgebrochen: nicht begonnen':'abgelehnt: '+item.error.message))));
}
async function confirmRelease(){
 if(state.busy||!state.pendingRelease)return;
 const keys=new Set(state.pendingRelease),onlyPassing=state.pendingOnlyPassing,rows=eligibleReleaseRows(targetReviewRows(visibleRows()),state.seen).filter(row=>keys.has(releaseKey(row))&&(!onlyPassing||!row.targetFamily||row.target?.fit?.status==='passt'));
 state.pendingRelease=null;$('#release-dialog').close();
 if(rows.length!==keys.size){status('Die Auswahl hat sich geändert. Bitte erneut auswählen und bestätigen.',true);return;}
 releaseController=new AbortController();state.busy=true;render();
 $('#release-progress-panel').hidden=false;$('#release-results').replaceChildren();$('#release-stop').hidden=false;$('#release-stop').disabled=false;$('#release-progress-panel').scrollIntoView({block:'nearest'});
 status(rows.length+' Design'+(rows.length===1?' wird':'s werden')+' freigegeben …');
 try{
  const result=await releaseDesigns(rows,{patch:row=>patchDesign(row,{freigegeben:true,...(onlyPassing&&row.targetFamily?{onlyPassing:true}:{})}),onSuccess:(row,response)=>applySaved(row,response,{freigegeben:true}),signal:releaseController.signal,onProgress:releaseProgress});
  releaseResults(result.results);$('#release-progress').textContent='Freigabe '+(result.succeeded.length+result.failed.length)+' von '+rows.length+' · '+result.failed.length+' abgelehnt'+(result.cancelled.length?' · '+result.cancelled.length+' abgebrochen':' · abgeschlossen');
  const errors=result.failed.map(({row,error})=>row.id+': '+error.message);
  status(result.succeeded.length+' freigegeben.'+(result.cancelled.length?' '+result.cancelled.length+' abgebrochen.':'')+(errors.length?' '+result.failed.length+' nicht freigegeben: '+errors.join(' · '):' Änderungen sind im Katalog gespeichert; den Commit macht der Betreiber.'),Boolean(errors.length));
 }finally{releaseController=null;$('#release-stop').hidden=true;state.busy=false;render();}
}

function renderRows(rows,{focusEditor=true}={}){
 clearTargetTiles();const host=$('#rows');host.replaceChildren();
 if(!rows.length){host.append(el('p',state.data?'Keine kompatiblen Designs für diese Auswahl (0 Designs).'+(state.reihe?' Reihe: '+state.reihe+'.':''):'Keine Linie gewählt.','empty'));return;}
 if(targetView()){
  const page=reviewPage(rows,state.page);state.page=page.page;const grid=el('div',undefined,'tiles');
  for(const r of page.rows)grid.append(renderTargetCard(r,{focusEditor}));
  host.append(grid);renderPagination(host,page);return;
 }
 const table=el('table'),thead=el('thead'),tr=el('tr');
 const labels=['Vorschau','Kennung','Name','Reihe','Material · Verfahren · Form','Platte','Texte · Schriften','Themen','Status','Aktionen'];
 for(const h of labels)tr.append(el('th',h));
 thead.append(tr);table.append(thead);const tbody=el('tbody');
 for(const r of rows){
  const row=el('tr',undefined,r.status);row.dataset.designRow=designKey(r);
  const c1=el('td');c1.append(selection(r),preview(r,'thumb'));
  const c2=el('td');c2.append(el('code',r.id));if(r.lieferform2)c2.append(el('small',r.lieferform2.reihe,'muted'));else if(r.bestand)c2.append(el('small','Bogen '+r.bestand.base,'muted'));
  const c3=el('td');c3.append(nameCell(r,{focusEditor}),flags(r));
  const c4=el('td',r.formatreihe||'offen');if(r.bestand?.formatreihe&&r.bestand.formatreihe!==r.formatreihe)c4.append(el('small','Bogen: '+r.bestand.formatreihe,'muted'));
  const c5=el('td',[r.material,r.process,r.form].filter(Boolean).join(' · ')||'offen');
  const c6=el('td',plateText(r.plate));
  const c7=el('td');c7.append(el('div',r.texts.count+' Text'+(r.texts.count===1?'':'e')+(r.motifs?' · '+r.motifs+' Motiv'+(r.motifs===1?'':'e'):'')+(r.photos?' · '+r.photos+' Foto':'')),fontList(r));if(r.texts.sample?.length)c7.append(el('small',r.texts.sample.join(' / '),'muted'));
  const c8=el('td',r.themes.map(t=>t.name).join(', ')||'–');
  const c9=el('td');c9.append(ampel(r));if(r.reasons.length){const ul=el('ul',undefined,'reasons');for(const x of r.reasons)ul.append(el('li',x));c9.append(ul);}
  const c10=el('td');c10.append(editorCell(r));
  const cells=[c1,c2,c3,c4,c5,c6,c7,c8,c9,c10];cells.forEach((cell,index)=>{cell.dataset.label=labels[index];});
  row.append(...cells);tbody.append(row);
 }
 table.append(tbody);host.append(table);
}
function render({focusEditor=true,preserveRows=false}={}){
 renderTargetFilters();
 renderPicker($('#lines'),state.lines.map(l=>({key:l.id,label:l.name,count:l.designsLieferform2+(l.bestand.length?' + Bestand':''),title:l.status||''})),state.linie,key=>{if(state.busy)return;state.linie=key;state.reihe=null;state.material=null;pushUrl();void loadLine().then(showFilteredDesigns);});
 const d=state.data;
 $('#metrics').hidden=!d;
 if(d){
  const c=d.counts;
  $('#metrics').replaceChildren(...[[c.total,'Designs'],[c.ok,'ok'],[c['prüfen'],'prüfen'],[c.fehlt,'fehlt'],[c.freigegeben,'freigegeben'],[c.lieferform2,'Lieferform 2'],[c.selectable,'wählbar']].map(([n,t])=>{const m=el('div',undefined,'metric '+t.replace(/\W/g,''));m.append(el('strong',n),el('span',t));return m;}));
  const reihen=[...d.reihen.map(r=>({key:r.key,label:r.key,count:r.counts.total,title:'ok '+r.counts.ok+' · prüfen '+r.counts['prüfen']+' · fehlt '+r.counts.fehlt}))];
  renderPicker($('#reihen'),reihen,state.reihe,key=>{state.reihe=key;state.page=1;pushUrl();render();showFilteredDesigns();},{all:{label:'Alle',count:d.counts.total}});
  renderPicker($('#materials'),d.materials.map(m=>({key:m.key,count:m.counts.total})),state.material,key=>{state.material=key;state.page=1;render();showFilteredDesigns();},{all:{label:'Alle',count:d.counts.total}});
  $('#notes').replaceChildren(el('p','Ausführungen dieser Linie: '+(d.linie?.ausfuehrungen?.modus==='produkte'?'Separate Produkte':d.linie?.ausfuehrungen?.modus==='varianten'?'Varianten':'Unbekannt'),'muted'),...d.notes.map(n=>el('p',n,'notice')),...(d.bestand.overviews.length?[el('p','Bestand: '+d.bestand.overviews.map(o=>o.overview+' ('+o.grund+')').join(', ')+' – '+d.bestand.sheets.length+' Bögen','muted')]:[]));
 }else{$('#reihen').replaceChildren();$('#materials').replaceChildren();$('#notes').replaceChildren();}
 $('#filter-selectable').checked=state.selectable;gate($('#filter-selectable'),state.startDesigns?'Startdesigns zeigen auch fehlende oder nicht wählbare Designs.':null);
 const rows=visibleRows();state.selected=retainVisibleSelection(state.selected,targetReviewRows(rows),state.seen);
 $('#summary').textContent=d?rows.length+' von '+d.counts.total+' Designs'+(state.reihe?' · '+state.reihe:'')+(state.status?' · Status '+state.status:'')+(state.freigabe?(state.freigabe==='ja'?' · freigegeben':' · offen'):'')+(state.selectable?' · nur wählbare':'')+(state.startDesigns?' · nur Startdesigns von Hauptprodukten':'')+(state.startDesigns&&Number.isInteger(d.startDesignSummary?.references)?' · insgesamt '+d.startDesignSummary.references+' Hauptprodukt-Zuordnungen in dieser Linie':''):'';
 if(!preserveRows)renderRows(rows,{focusEditor});
 syncReleaseControls();assignments.sync();
 for(const control of document.querySelectorAll('main button, main input, main select'))control.disabled=(state.busy&&control.id!=='release-stop')||control.dataset.blocked==='true';
 $('#main').setAttribute('aria-busy',String(state.busy));
}
$('#variant-family').addEventListener('change',variantFields);
for(const id of ['variant-size','variant-line'])$('#'+id).addEventListener('change',()=>{clearVariant();$('#variant-status').textContent='Einpassung zuerst prüfen.';});
$('#variant-close').addEventListener('click',()=>{if(variantState.writing)return;clearVariant();$('#variant-dialog').close();});
$('#variant-dialog').addEventListener('cancel',event=>{if(variantState.writing)event.preventDefault();else clearVariant();});$('#variant-dialog').addEventListener('close',clearVariant);
$('#variant-prepare').addEventListener('click',prepareVariant);$('#variant-confirm').addEventListener('click',confirmVariant);
$('#preview-close').addEventListener('click',()=>{releasePreview();$('#preview-dialog').close();});
$('#preview-dialog').addEventListener('cancel',releasePreview);
$('#preview-dialog').addEventListener('close',()=>{if(!$('#preview-dialog').open)releasePreview();});
$('#release-dialog').addEventListener('close',()=>{state.pendingRelease=null;});
$('#release-cancel').addEventListener('click',()=>$('#release-dialog').close());
$('#release-confirm').addEventListener('click',confirmRelease);
$('#release-stop').addEventListener('click',()=>{if(!releaseController)return;releaseController.abort();$('#release-stop').disabled=true;$('#release-progress').textContent+=' · Abbruch angefordert, laufende Freigabe wird noch abgeschlossen';});
$('#release-selected').addEventListener('click',()=>askRelease(targetReviewRows(visibleRows()).filter(row=>state.selected.has(releaseKey(row))),{onlyPassing:true}));
$('#release-seen').addEventListener('click',()=>askRelease(passingSeenRows(),{onlyPassing:true}));
$('#clear-selection').addEventListener('click',()=>{if(state.busy)return;state.selected.clear();render();});
$('#filter-toggle').addEventListener('click',()=>setFiltersOpen($('#filter-toggle').getAttribute('aria-expanded')!=='true'));
compactLayout.addEventListener('change',()=>setFiltersOpen(false));
phoneLayout.addEventListener('change',applyResponsiveView);
$('#filter-start-designs').checked=state.startDesigns;
$('#filter-start-designs').addEventListener('change',e=>{state.startDesigns=e.target.checked;state.page=1;if(state.startDesigns)state.selectable=false;pushUrl();render();showFilteredDesigns();});
$('#refresh').addEventListener('click',load);
$('#filter-status').value=state.status;$('#filter-status').addEventListener('change',e=>{state.status=e.target.value;state.page=1;pushUrl();render();showFilteredDesigns();});
$('#filter-freigabe').value=state.freigabe;$('#filter-freigabe').addEventListener('change',e=>{state.freigabe=e.target.value;state.page=1;pushUrl();render();showFilteredDesigns();});
$('#filter-selectable').addEventListener('change',e=>{state.selectable=e.target.checked;state.page=1;render();showFilteredDesigns();});
$('#search').addEventListener('input',e=>{state.query=e.target.value;state.page=1;render();});
$('#search').addEventListener('change',showFilteredDesigns);
$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();showFilteredDesigns();}});
$('#view').value=state.view;$('#view').addEventListener('change',e=>{state.view=e.target.value;state.page=1;try{localStorage.setItem(viewStorageKey(),state.view);}catch{}render();showFilteredDesigns();});
// Same-tab editing stays in an overlay; another window refreshes only the edited row.
window.addEventListener('storage',event=>{
 if(event.key!=='gravuru-katalog-design-updated'||!event.newValue||dashboardEditor.isOpen)return;
 let changed;try{changed=JSON.parse(event.newValue);}catch{return;}
 void refreshChangedDesign(changed);
});
window.addEventListener('pageshow',event=>{if(event.persisted){releasePreview();$('#preview-dialog').close();$('#release-dialog').close();void load();}});
window.addEventListener('pagehide',()=>{clearTargetTiles();targetPreviewCache.invalidate();});
$('#target-family').addEventListener('change',event=>{state.targetFamily=event.target.value||null;state.page=1;state.selected.clear();pushUrl();render();showFilteredDesigns();});
$('#filter-theme').addEventListener('change',event=>{state.theme=event.target.value;state.page=1;pushUrl();render();showFilteredDesigns();});
$('#assignment-mode').value='review';$('#assignment-mode').addEventListener('change',event=>{if(state.busy)return;assignments.setMode(event.target.value==='assign');render();});
await load();
