import {selectionScaleFactor} from '../../configurator/variant-m/selection-arrows.mjs';
import {authorDesign,fitPosition} from './design-authoring.mjs';
import {katalogEditorBody,katalogTextChange,katalogTextAddition} from './katalog-editor-ui.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {artworkFragment} from '../../configurator/variant-m/artwork-resource.mjs';
import {merchantImageAttribute} from './merchant-media.mjs';
import {drawSelection,replaceEditorPreview} from './editor-selection.mjs';
import {alignedPosition,drawGuides,clearGuides} from './editor-guides.mjs';
import {linkedEditorDesign,editorDesignPath} from './editor-design-link.mjs';
import {merchantNavigation} from './merchant-navigation.mjs';
// M02 view adapter. The existing draft, revision API and rights remain authoritative.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const presets=['#202824','#731c19','#17614f','#ffffff','#c49a50'];
export function installProductEditor({state,api,markDirty,syncControls,showTab,objectLabel,availableRights}){
 let workspace='designs',productId=null,recordRevision=null,designId=null,objectId=null,timer,serial=0,options={},libraryFonts=[],libraryMotifs=null,undo=[],redo=[],editControl=null,drag=null,previewController,previewPending=false,wasBusy=false;
 const icon=name=>`<img class="editor-icon" src="/workshop-ui/editor-icons/${name}.svg" alt="" aria-hidden="true">`;
 if(new URLSearchParams(location.search).get('reviewGallery')==='1'){
  const back=document.createElement('a');back.className='button';back.href='/originale/';back.textContent='Zur Vorlagengalerie';$('#customer-view')?.before(back);
 }
 const icons={details:'cube',designs:'photo',prices:'tag',profiles:'typography',scene:'photo',production:'settings',shopify:'link'};
 for(const tab of document.querySelectorAll('.editor-tabs [data-tab]'))tab.insertAdjacentHTML('afterbegin',icon(icons[tab.dataset.tab]));
 // Navigationssymbole kommen aus der gemeinsamen Kopfzeile (workshop-shell-markup.mjs).
 for(const [selector,name] of [['#customer-view','eye'],['#save-product','device-floppy']])$(selector)?.insertAdjacentHTML('afterbegin',icon(name));
 for(const b of document.querySelectorAll('.record-aside button'))b.type='button';$('#copy-product').type='button';$('#record-id').after($('#copy-product'));
 function workspaceTab(key,focus=false){
  workspace=['designs','design-library','profiles'].includes(key)?'designs':'product';
  for(const n of document.querySelectorAll('[data-workspace]')){const active=n.dataset.workspace===workspace;n.setAttribute('aria-selected',String(active));n.tabIndex=active?0:-1;if(active&&focus)n.focus();}
  $('#workspace-product').hidden=workspace!=='product';$('#workspace-designs').hidden=workspace!=='designs';
 }
 document.querySelector('.workspace-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-workspace]');if(b)showTab(b.dataset.workspace==='product'?'details':'designs');});
 document.querySelector('.workspace-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const key=e.key==='Home'?'product':e.key==='End'?'designs':workspace==='product'?'designs':'product';showTab(key==='product'?'details':'designs');workspaceTab(key==='product'?'details':'designs',true);});
 $('#workspace-product').addEventListener('click',e=>{const b=e.target.closest('[data-product-area]');if(b)showTab(b.dataset.productArea);});
 function filterDesigns(){const q=$('#editor-design-search').value.trim().toLocaleLowerCase('de');let visible=0;for(const b of $('#editor-designs').querySelectorAll('[data-editor-design]')){b.hidden=!b.textContent.toLocaleLowerCase('de').includes(q);if(!b.hidden)visible++;}$('#editor-design-empty').hidden=visible>0;}
 $('#editor-design-search').addEventListener('input',filterDesigns);
 const designs=()=>state.draft?.config.profile.designs||[];
 const design=()=>designs().find(d=>d.id===designId);
 const selected=()=>design()?.objects.find(o=>o.id===objectId);
 const katalogProtected=o=>state.katalogEditor&&(o?.role==='guide'||o?.type==='photoSlot');
 const label=(o,i)=>design()?.sourceElements?.find(f=>f.id===o.id)?.label||design()?.customerFields?.find(f=>f.id===o.id)?.label||objectLabel(o,i);
 const input=(title,key,value,{type='number',step='any',min,max}={})=>`<label>${title}<input data-editor-prop="${key}" type="${type}" ${type==='number'?`step="${step}"`:''} ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} value="${escape(type==='number'&&Number.isFinite(value)?Number(value.toFixed(2)):value)}" required></label>`;
 function sync(){
  if(state.busy&&!wasBusy)stopPreview();
  if(!state.busy&&wasBusy&&previewPending)timer=setTimeout(preview,0);
  wasBusy=state.busy;
  const disabled=state.busy||!state.record||state.record.status==='archived';
  for(const n of document.querySelectorAll('[data-editor-prop],[data-editor-color],[data-editor-photo],[data-editor-hint],[data-editor-action],[data-authoring-undo],[data-new-design],[data-ai-design],[data-editor-name],[data-element-label],[data-prepare-editable],[data-edit-pdf-text]'))n.disabled=disabled||(n.matches('[data-editor-prop],[data-editor-photo],[data-editor-color]')&&selected()?.technicalLocked===true);
  const undoButton=$('[data-authoring-undo]');if(undoButton)undoButton.disabled=disabled||!undo.length;
  const redoButton=$('[data-authoring-redo]');if(redoButton)redoButton.disabled=disabled||!redo.length;
  for(const n of document.querySelectorAll('[data-editor-object],[data-editor-design]'))n.disabled=state.busy;
  if(!drag)highlight();
 }
 function elements(){
  $('#editor-elements').innerHTML=(design()?.objects||[]).map((o,i)=>`<button type="button" data-editor-object="${escape(o.id)}" aria-pressed="${o.id===objectId}">${icon(o.type==='text'?'typography':o.type==='photoSlot'?'photo':o.type==='graphic'?'rectangle':'heart')}<span>${escape(label(o,i))}</span>${o.technicalLocked?'<small>technisch</small>':''}</button>`).join('');
 }
 function fontResource(id){
  return api(state.katalogEditor?'/api/workshop/designs/editor/font?'+new URLSearchParams({reihe:state.katalogEditor.reihe,id:state.katalogEditor.id,font:id}):'/api/workshop/font-library?id='+encodeURIComponent(id));
 }
 function katalogProperties(o,d,geometry){
  if(katalogProtected(o)){$('#panel-designs').innerHTML='<h3>Geschütztes Vorlagenelement</h3><p>Hilfslinien und bestehende Fotofelder bleiben unverändert. Wähle einen Text oder ein Motiv zum Bearbeiten.</p>';syncControls();return;}
  let body='<h3>'+escape(label(o,d.objects.indexOf(o)))+'</h3><p class="field-help">Katalogdesign · Editorwerte in mm. Lage und Größe werden nicht automatisch korrigiert.</p>';
  if(o.type==='text'){
   const fonts=[...new Set([...Object.keys(state.draft.config.localResources.fonts),...libraryFonts.map(f=>f.id)])];
   body+='<label>Textinhalt<textarea data-editor-prop="text" rows="3" maxlength="180" required>'+escape(o.text)+'</textarea></label><label>Katalogschrift<select data-editor-prop="font">'+fonts.map(f=>'<option value="'+escape(f)+'" '+(f===o.font?'selected':'')+' '+(libraryFonts.find(row=>row.id===f)?.available===false?'disabled':'')+'>'+escape(libraryFonts.find(row=>row.id===f)?.name||f)+'</option>').join('')+'</select></label>'+input('Schriftgröße · mm','size',o.size,{min:1,max:100,step:'any'})+'<label>Ausrichtung<select data-editor-prop="textAnchor">'+[['start','Links'],['middle','Mitte'],['end','Rechts']].map(([value,name])=>'<option value="'+value+'" '+((o.textAnchor||'middle')===value?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+input('Laufweite · mm','letterSpacing',o.letterSpacing||0,{min:-10,max:10,step:'any'});
  }
  body+='<p class="field-help">Vorschau mit Material und Verfahren der Produktfamilie.</p><details class="element-geometry" open><summary>Position und Größe · mm</summary><div class="element-pair">'+input('Mitte X','x',o.x)+input('Mitte Y','y',o.y)+'</div>';
  if(o.type!=='text')body+='<div class="element-pair">'+input('Breite','w',o.w,{min:.01})+input('Höhe','h',o.h,{min:.01})+'</div><p class="field-help">Das Seitenverhältnis des Motivs bleibt erhalten.</p>';
  body+='<p class="field-help">Direkt am Element ziehen. Pfeile ändern die Größe. Hilfslinien und Einrasten lassen sich links umschalten.</p></details><div class="element-actions"><button type="button" data-editor-action="remove">Element entfernen</button></div><p id="element-action-status" role="status"></p><div class="source-preserved"><strong>Neue Sichtprüfung nach Änderungen</strong><p>Speichern aktualisiert dieses Katalogdesign und setzt seine Freigabe zurück. Vorher werden alle zugeordneten Größen geprüft.</p></div>';
  $('#panel-designs').innerHTML=body;syncControls();
 }
 function properties(){
  const o=selected(),d=design(),geometry=state.draft.config.profile.geometry;elements();
  if(!o){$('#panel-designs').innerHTML='<h3>Designs & Elemente</h3><p>Wähle links ein Element aus.</p>';return;}
  if(state.katalogEditor){katalogProperties(o,d,geometry);return;}
  const rights=state.draft.elementRights[d.id][o.id],allowed=availableRights(o);
  const check=(key,text)=>`<label class="element-check"><input type="checkbox" data-element-right="${key}" data-design-id="${escape(d.id)}" data-object-id="${escape(o.id)}" data-right-allowed="${allowed[key]}" ${rights[key]?'checked':''} ${!allowed[key]?'disabled':''}>${text}</label>`;
  let body=`<label>Designname<input data-editor-name value="${escape(d.name)}" maxlength="200" required></label>${d.importedSource?'<button type="button" data-prepare-editable>PDF / SVG in Elemente aufbereiten</button><p class="field-help">Texte, Bilder und Vektormotive getrennt bearbeiten. Das Original bleibt erhalten; die Aufbereitung wird zuerst als Entwurf angezeigt.</p>':''}<h3>${escape(label(o,d.objects.indexOf(o)))}</h3>`;
  body+=`<label>Elementname<input data-element-label maxlength="80" value="${escape(label(o,d.objects.indexOf(o)))}" required></label>`;
  if(o.type==='motif'&&d.sourceElements?.find(e=>e.id===o.id)?.kind==='text')body+='<button type="button" data-edit-pdf-text>Text bearbeiten</button><p class="field-help">Die Originalschrift liegt als Kontur vor. Zum Ändern eine vollständige Werkstatt-Schrift wählen.</p>';
  if(o.type==='text'){
   const fonts=[...new Set([...Object.keys(state.draft.config.localResources.fonts),...libraryFonts.map(f=>f.id)])];
   body+=`<label>Beispieltext<textarea data-editor-prop="text" rows="3" maxlength="180" required>${escape(o.text)}</textarea></label><label>Schriftart<select data-editor-prop="font">${fonts.map(f=>`<option value="${escape(f)}" ${f===o.font?'selected':''}>${escape(libraryFonts.find(row=>row.id===f)?.name||f.replace(/ · [a-f0-9]{12}$/,''))}</option>`).join('')}</select></label><div class="element-pair">${input('Schriftgröße · mm','size',Math.round(o.size),{step:1,min:1,max:100})}<div class="font-styles"><label><input type="checkbox" data-editor-prop="bold" ${o.bold?'checked':''}> Fett</label><label><input type="checkbox" data-editor-prop="italic" ${o.italic?'checked':''}> Kursiv</label></div></div>`;
  }
  if(state.draft.config.profile.processing?.profileId==='steel-engraving'&&['text','motif','graphic'].includes(o.type))body+='<p class="field-help"><strong>Gravurfarbe: Schwarz</strong><br>Texte und Vektormotive werden schwarz dargestellt. Fotos behalten ihre Graustufen.</p>';
  else if(['text','motif','graphic'].includes(o.type))body+=`<label class="element-color-label">Ausgewählte Farbe<input type="color" data-editor-prop="color" value="${escape(o.color||'#202824')}"></label><div class="element-colors" role="group" aria-label="Farbvorschläge">${presets.map(c=>`<button type="button" data-editor-color="${c}" style="background:${c}" aria-label="Farbe ${c}" aria-pressed="${c===o.color}"></button>`).join('')}</div>`;
  if(o.type==='motif')body+=`<button type="button" data-editor-action="replace">Motiv ersetzen</button>`;
  if(o.type==='photoSlot')body+=`<label>Fotoform<select data-editor-prop="photoShape">${[...(o.photoMaskAssetId?[['template','Originalform aus Vorlage']]:[]),['rect','Rechteck'],['circle','Oval / Kreis'],['arch','Bogen']].map(([id,name])=>`<option value="${id}" ${o.photoShape===id?'selected':''}>${name}</option>`).join('')}</select></label><div class="photo-example-controls"><div id="selected-photo-preview"></div><button type="button" data-editor-photo>Bild ersetzen</button><input id="editor-photo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></div><p id="photo-upload-status" role="status"></p>`;
  body+=`<div class="element-permissions"><h4>Freigaben für Kunden</h4><p class="field-help">Hier in der Werkstatt kannst du Position und Größe unabhängig davon bearbeiten.</p>${o.type==='text'?check('content','Kunde darf Text ändern'):''}${o.type==='photoSlot'?check('replace','Kunde darf Foto ersetzen'):''}${allowed.color?check('color','Kunde darf Farbe ändern'):''}${check('move','Frei verschiebbar')}${check('scale','Größe veränderbar')}${check('delete','Nach Entsperren löschbar')}${o.acrylicFixed||o.locked?'<p class="field-help">Dieses Vorlagenelement bleibt für Kunden fest. Du kannst es hier bearbeiten oder entfernen.</p>':'<p class="field-help">Für ein festes Textfeld „Frei verschiebbar“ und „Größe veränderbar“ ausschalten. Der Inhalt bleibt nach Freigabe bearbeitbar.</p>'}</div>`;
  if(o.type==='photoSlot'){
   const hint=state.draft.config.photo.hints?.find(h=>h.designId===d.id&&h.slotId===o.id)||{text:'Hier eigenes Foto hochladen',enabled:true};
   body+=`<div class="photo-hint-settings"><label>Hinweis im Konfigurator<textarea data-editor-hint="text" maxlength="100" rows="2" required>${escape(hint.text)}</textarea></label><label class="element-check"><input type="checkbox" data-editor-hint="enabled" ${hint.enabled?'checked':''}>Beim Beispielfoto anzeigen</label></div>`;
  }
  body+=`<details class="element-geometry" open><summary>Position und Größe · mm</summary><div class="element-pair">${input('Mitte X','x',o.x,{min:0,max:geometry.width})}${input('Mitte Y','y',o.y,{min:0,max:geometry.height})}</div>${o.type!=='text'?`<div class="element-pair">${input('Breite','w',o.w,{min:.1,max:geometry.width})}${input('Höhe','h',o.h,{min:.1,max:geometry.height})}</div>`:''}<p class="field-help">Zum Verschieben direkt am Element ziehen. Maße gelten für dieses Design; Kundenrechte bleiben getrennt.</p></details><div class="element-actions"><button type="button" data-editor-action="back">Ganz nach hinten</button><button type="button" data-editor-action="front">Ganz nach vorne</button><button type="button" data-editor-action="remove">Element entfernen</button></div><p id="element-action-status" role="status"></p><div class="source-preserved"><strong>Original und Verlauf erhalten</strong><p>Änderungen gelten für dieses Produkt. Speichern legt einen neuen Stand an; die Mastervorlage bleibt erhalten.</p></div>`;
  $('#panel-designs').innerHTML=body;syncControls();
 }
 function photoThumbnail(){
  const host=$('#selected-photo-preview'),o=selected();if(!host||o?.type!=='photoSlot')return;
  const source=[...$('#editor-preview').querySelectorAll('[data-object]')].find(n=>n.dataset.object===o.id);if(!source)return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',[-o.w/2,-o.h/2,o.w,o.h].join(' '));
  const copy=source.cloneNode(true);copy.removeAttribute('transform');copy.removeAttribute('tabindex');copy.removeAttribute('role');copy.classList.remove('selected-element');svg.append(copy);svg.setAttribute('aria-label','Beispielfoto');svg.setAttribute('role','img');host.replaceChildren(svg);
 }
 function highlight(){
  for(const n of $('#editor-preview').querySelectorAll('[data-object]')){
   const chosen=n.dataset.object===objectId;n.classList.toggle('selected-element',chosen);
   n.style.cursor='move';n.removeAttribute('tabindex');n.removeAttribute('role');
   const o=design()?.objects.find(o=>o.id===n.dataset.object);if(o)n.setAttribute('aria-label',label(o,design().objects.indexOf(o))+' auswählen');
   n.removeAttribute('aria-pressed');
  }
  const node=[...$('#editor-preview').querySelectorAll('[data-object]')].find(n=>n.dataset.object===objectId);
  drawSelection($('#editor-preview'),node,selected(),{arrows:!!state.katalogEditor,editable:!state.busy&&state.record?.status!=='archived'&&!selected()?.technicalLocked&&!katalogProtected(selected())});
 }
 async function preview(){
  if(!state.record||!design())return;
  if(state.busy||drag){previewPending=true;return;}
  previewPending=false;previewController?.abort();previewController=new AbortController();
  const request=++serial,id=state.record.id;
  $('#stage-status').textContent='Vorschau aktualisiert sich …';$('#stage-price').textContent='';
  try{
   const response=await api(state.katalogEditor?'/api/workshop/designs/editor/preview':`/api/workshop/products/${encodeURIComponent(id)}/editor-preview`,{method:'POST',signal:previewController.signal,body:state.katalogEditor?katalogEditorBody(state):{expectedRevision:state.record.revision,document:state.draft,designId,options}});
   if(request!==serial||id!==state.record?.id)return;
   replaceEditorPreview($('#editor-preview'),response.svg,{arrows:!!state.katalogEditor});highlight();photoThumbnail();
   let hint=$('#editor-hole-hint');if(!hint){hint=document.createElement('p');hint.id='editor-hole-hint';hint.setAttribute('role','status');hint.style.cssText='background:#fff4e5;border:1px solid #f0c27b;border-radius:10px;padding:10px 12px;font-size:14px;margin:10px 16px';$('#editor-preview').after(hint);}hint.textContent=response.holeHint||'';hint.hidden=!response.holeHint;
   const tile=[...$('#editor-designs').querySelectorAll('[data-editor-design]')].find(n=>n.dataset.editorDesign===designId),old=tile?.querySelector('img');
   if(old){const img=document.createElement('img');img.alt='';img.src='data:image/svg+xml;base64,'+btoa(Array.from(new TextEncoder().encode(response.svg.replace(/<g data-m-keepout="true"[\s\S]*?<\/g>/,'')),b=>String.fromCharCode(b)).join(''));old.replaceWith(img);}
   $('#stage-price').textContent=response.price?'Ausführung: '+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(response.price.unitCents/100):'';
   $('#stage-status').textContent=state.dirty?'Entwurf · noch nicht gespeichert':'Gespeicherter Stand';
   $('#editor-preview').classList.remove('preview-updated');void $('#editor-preview').offsetWidth;
   if(state.dirty)$('#editor-preview').classList.add('preview-updated');
  }catch(e){if(request!==serial)return;$('#stage-status').textContent='Vorschau nicht aktuell: '+e.message;}
 }
 function stopPreview(){clearTimeout(timer);previewController?.abort();++serial;previewPending=true;}
 function changed(){stopPreview();$('#stage-status').textContent='Vorschau aktualisiert sich …';$('#stage-price').textContent='';if(!state.busy&&!drag)timer=setTimeout(preview,250);}
 function refreshOptions(useDefaults=false){
  if(!state.draft)return;
  const groups=state.draft.config.profile.optionGroups;
  for(const g of groups)if(useDefaults||!g.values.some(v=>v.id===options[g.id]))options[g.id]=g.defaultValueId;
  if(!state.draft.config.acrylic){
   const combinations=groups.reduce((rows,g)=>rows.flatMap(row=>g.values.map(v=>[...row,v])),[[]]);
   $('#stage-options').innerHTML=combinations.map(row=>`<option value="${escape(row.map(v=>v.id).join('|'))}" ${row.every((v,i)=>options[groups[i].id]===v.id)?'selected':''}>${escape(row.map(v=>v.label).join(' · '))}</option>`).join('');return;
  }
  const [sizes,bases,walls]=['size','base','wall'].map(id=>groups.find(g=>g.id===id).values);
  $('#stage-options').innerHTML=sizes.flatMap(s=>bases.flatMap(b=>walls.map(w=>`<option value="${escape(s.id+'|'+b.id+'|'+w.id)}" ${options.size===s.id&&options.base===b.id&&options.wall===w.id?'selected':''}>${escape(s.label+' · '+b.label+(w.id==='wall'?' · '+w.label:''))}</option>`))).join('');
 }
 function render(){
  if(!state.record)return;
  if(productId!==state.record.id){productId=state.record.id;designId=linkedEditorDesign(location.search,productId,designs(),state.draft.config.profile.defaultDesignId);objectId=null;options={};resetHistory();}
  if(recordRevision!==state.record.revision){recordRevision=state.record.revision;resetHistory();}
  if(!design())designId=state.draft.config.profile.defaultDesignId;
  if(!selected())objectId=design()?.objects.find(o=>o.type==='photoSlot')?.id||design()?.objects[0]?.id;
  if(state.katalogEditor){
   libraryFonts=state.katalogEditor.fonts||[];options={};$('#editor-designs').replaceChildren();$('#editor-design-actions').replaceChildren();properties();clearTimeout(timer);preview();return;
  }
  state.editorDesignId=designId;
  history.replaceState(null,'',merchantNavigation(editorDesignPath(location.search,productId,designId),location.href)+location.hash);
  refreshOptions();
  $('#editor-designs').innerHTML=designs().map(d=>`<button type="button" data-editor-design="${escape(d.id)}" aria-pressed="${d.id===designId}"><img loading="lazy" ${merchantImageAttribute(`/api/workshop/products/${encodeURIComponent(state.record.id)}/preview.svg?revision=${state.record.revision}&designId=${encodeURIComponent(d.id)}`)} alt=""><span>${escape(d.name)}</span><small>${d.id===state.draft.config.profile.defaultDesignId?'Standarddesign':'Design'}</small></button>`).join('');
  $('#editor-design-actions').innerHTML=`<button type="button" class="import-design-tile" data-design-action="import" data-design-id="${escape(designId)}">PDF / SVG importieren</button><button type="button" data-new-design>Eigenes Design anlegen</button><button type="button" data-ai-design="${escape(designId)}">Mit KI gestalten</button>`;
  $('#workspace-design-count').textContent='('+designs().length+')';filterDesigns();
  const gSummary=state.draft.config.profile.geometry;
  $('#workspace-product').innerHTML=`<h3>${escape(state.draft.name)}</h3><p>Gemeinsames Hauptprodukt für ${designs().length} Designs · ${escape(gSummary.width)} × ${escape(gSummary.height)} mm</p><div class="design-gallery-actions"><button type="button" data-product-area="details">Schildgröße & Form</button><button type="button" data-product-area="prices">Optionen & Preise</button><button type="button" data-product-area="scene">Rohling & Hintergrund</button><button type="button" data-product-area="shopify">Shopify</button></div><p class="field-help">Die Vorschau zeigt das ausgewählte Design auf diesem Produkt. Alle Designs verwenden dieselbe Produktbasis.</p>`;
  // Preserve every existing operation, relocating its card rather than replacing its logic.
  const cards=[...document.querySelectorAll('.record-aside .record-card')];
  for(const card of cards){const target=card.querySelector('#print-export-link')?'#panel-production':'#panel-details';$(target).append(card);}
  const c=state.draft.config,slate=c.profile.material.kind==='slate',steel=c.profile.material.kind==='steel',g=c.profile.geometry;
  $('#panel-scene').innerHTML=slate||steel?`<h3>${slate?'Schieferplatte':'Edelstahlplatte'}</h3><p>Rohling: ${escape(g.width)} × ${escape(g.height)} mm</p><label>Rohlingbild austauschen<input id="material-surface-file" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="field-help">Wähle ein Foto der ungestalteten Platte. Das Bild füllt die vorhandenen Produktmaße. Design, Bohrungen und Preise bleiben erhalten.</p><p id="material-surface-status" role="status"></p>`:c.doorbell?'<h3>AOSU-Klingelschild</h3><p>Edelstahl 1,5 mm mit Acrylglasauflage 3 mm. Rahmen, Farbe und Befestigung wählst du über dem Produkt. Die Ausschnitte für die Klingel bleiben erhalten.</p>':'<h3>Hintergrund & Szene</h3><p>Wähle Acrylglasgröße und Sockel über dem Produkt.</p>';
  if(steel)$('#panel-scene').insertAdjacentHTML('beforeend','<details><summary>Frühere Edelstahl-Materialreferenz</summary><p>Erhaltenes Musterbild „Charlotte Groner“, Originalfassung v4. Dieses Foto ist eine Referenz. Die beiden bearbeitbaren Heimathafen-Designs stammen aus dem früheren Vorlagenkatalog.</p><img src="/workshop-ui/material-surfaces/steel-reference-v4.png" alt="Früheres Edelstahlmuster mit Leuchtturm und Charlotte Groner" style="width:100%;height:auto"></details>');
  $('#panel-scene').insertAdjacentHTML('beforeend','<section class="form-section"><h3>Hintergrund der Vorschau</h3><label>Szenenbild austauschen<input id="scene-background-file" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" id="scene-background-reset">Standardhintergrund verwenden</button><p class="field-help">Dieses Bild liegt hinter dem Schild. Es gehört nur zur Vorschau und wird nicht graviert oder gedruckt.</p><p id="scene-background-status" role="status"></p></section>');
  properties();clearTimeout(timer);preview();
 }
 const loadFonts=()=>state.katalogEditor?Promise.resolve():api('/api/workshop/font-library').then(data=>{libraryFonts=data.fonts;if(selected())properties();}).catch(()=>{});
 document.addEventListener('workshop-session-restored',loadFonts);void loadFonts();
 const valid=()=>[...$('#panel-designs').querySelectorAll('input,textarea,select')].every(n=>n.disabled||n.reportValidity());
 function select(id){if(!valid())return;objectId=id;showTab('designs');properties();highlight();photoThumbnail();}
 $('#editor-elements').addEventListener('click',e=>{const b=e.target.closest('[data-editor-object]');if(b&&!state.busy)select(b.dataset.editorObject);});
 // Selection happens on pointerdown (see candidatesAt). A repeated click on the
 // same spot without dragging selects the next element underneath.
 $('#editor-preview').addEventListener('click',e=>{if(state.busy||drag||!pick?.repeat||pick.ids.length<2)return;const i=pick.ids.indexOf(objectId);if(i>=0)select(pick.ids[(i+1)%pick.ids.length]);});
 $('#editor-preview').addEventListener('keydown',e=>{const n=e.target.closest('[data-object]');if(n&&['Enter',' '].includes(e.key)&&!state.busy){e.preventDefault();select(n.dataset.object);}});
 $('#editor-designs').addEventListener('click',e=>{const b=e.target.closest('[data-editor-design]');if(!b||state.busy||!valid())return;designId=b.dataset.editorDesign;objectId=null;showTab('designs');render();});
 $('#stage-options').addEventListener('change',()=>{if(!state.draft.config.acrylic){const values=$('#stage-options').value.split('|');options=Object.fromEntries(state.draft.config.profile.optionGroups.map((g,i)=>[g.id,values[i]]));}else [options.size,options.base,options.wall]=$('#stage-options').value.split('|');changed();});
 $('#panel-scene').addEventListener('click',e=>{if(e.target.id==='scene-background-reset'&&!state.busy&&state.record.status!=='archived'){remember();delete state.draft.config.sceneBackground;markDirty();$('#scene-background-status').textContent='Standardhintergrund wiederhergestellt. Bitte speichern.';}});
 $('#panel-scene').addEventListener('change',async e=>{
  if(!['material-surface-file','scene-background-file'].includes(e.target.id)||state.busy||state.record.status==='archived')return;
  const file=e.target.files?.[0];if(!file)return;
  const scene=e.target.id==='scene-background-file',status=$(scene?'#scene-background-status':'#material-surface-status');state.busy=true;syncControls();
  try{
   if(file.size>15*1024*1024)throw Error('Bitte ein Bild bis 15 MB auswählen.');
   status.textContent='Bild wird geprüft …';
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});
   const surface=await api('/api/workshop/material-surfaces',{method:'POST',body:{bytes:data}});
   remember();state.draft.config[scene?'sceneBackground':'materialSurface']=surface.url;markDirty();status.textContent=(scene?'Szenenbild':'Rohlingbild')+' ausgetauscht. Bitte Produkt speichern.';
  }catch(error){status.textContent=error.message;}finally{state.busy=false;syncControls();e.target.value='';}
 });
 $('#panel-designs').addEventListener('input',async e=>{
  const n=e.target,key=n.dataset.editorProp,o=selected();
  if(n.hasAttribute('data-editor-name')&&!state.busy&&state.record.status!=='archived'&&n.value.trim()){rememberInput(n);design().name=n.value;markDirty();return;}
  if(n.hasAttribute('data-element-label')&&o&&!state.busy&&state.record.status!=='archived'&&n.value.trim()){rememberInput(n);const d=design();d.sourceElements??=[];let entry=d.sourceElements.find(e=>e.id===o.id);if(!entry){entry={id:o.id,kind:o.type==='photoSlot'?'photo':o.type};d.sourceElements.push(entry);}entry.label=n.value.trim();elements();markDirty();return;}
  if(n.dataset.editorHint&&o&&!state.busy&&state.record.status!=='archived'){rememberInput(n);const d=design();state.draft.config.photo.hints??=[];let h=state.draft.config.photo.hints.find(h=>h.designId===d.id&&h.slotId===o.id);if(!h){h={designId:d.id,slotId:o.id,text:'Hier eigenes Foto hochladen',enabled:true};state.draft.config.photo.hints.push(h);}h[n.dataset.editorHint]=n.type==='checkbox'?n.checked:n.value;markDirty();return;}
  if(!key||!o||state.busy||state.record.status==='archived'||o.technicalLocked)return;
  n.setCustomValidity('');
  if(n.type==='number'&&(!Number.isFinite(n.valueAsNumber)||!n.checkValidity()))return;
  if(key==='font'&&!Object.hasOwn(state.draft.config.localResources.fonts,n.value)){
   state.busy=true;syncControls();
   try{const result=await fontResource(n.value);state.draft.config.localResources.fonts[result.id]=result.font;}
   catch(error){$('#stage-status').textContent=error.message;n.value=o.font;return;}
   finally{state.busy=false;syncControls();}
  }
  const value=n.type==='checkbox'?n.checked:n.type==='number'?n.valueAsNumber:n.value;
  if(state.katalogEditor&&!['text','font','size','x','y','w','h','textAnchor','letterSpacing'].includes(key))return;
  let next;
  try{next=state.katalogEditor?katalogTextChange(o,key,value,state.draft.config.localResources.fonts):key==='size'&&o.type==='text'?setTextSize({...o},value):{...o,[key]:value};if(!state.katalogEditor){if(next.type==='text')measureText(next,state.draft.config.localResources.fonts);fitPosition(next,state.draft.config.profile.geometry);}n.setCustomValidity('');}
  catch(error){n.setCustomValidity(error.message);n.reportValidity();return;}
  if(key==='color'&&next.type==='motif')next.preserveColors=false;
  rememberInput(n);Object.assign(o,next);
  if(state.katalogEditor)for(const prop of ['x','w','h']){const field=$('[data-editor-prop='+prop+']');if(field&&field!==n)field.value=Number(o[prop].toFixed(4));}
  markDirty();
 });
 $('#panel-designs').addEventListener('change',async e=>{
  if(e.target.id!=='editor-photo-file')return;
  const file=e.target.files?.[0],o=selected(),d=design();if(!file||!o||state.busy||state.record.status==='archived')return;
  const status=$('#photo-upload-status');state.busy=true;syncControls();status.textContent='Beispielfoto wird geprüft …';
  try{
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Bitte JPG, PNG oder WebP bis 10 MB auswählen.');
   const bitmap=await createImageBitmap(file),width=bitmap.width,height=bitmap.height;bitmap.close();
   if(width<1||height<1||width*height>80000000)throw Error('Die Bildabmessungen sind zu groß.');
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
   const asset=await api('/api/workshop/photo-examples',{method:'POST',body:{bytes:data.split(',')[1],widthMm:o.w,heightMm:o.h}});
   remember();const resources=state.draft.config.localResources;resources.photoExamples=(resources.photoExamples||[]).filter(v=>v.designId!==d.id||v.slotId!==o.id);
   resources.photoExamples.push({designId:d.id,slotId:o.id,assetId:asset.assetId});markDirty();status.textContent='Beispielfoto übernommen. Änderungen noch speichern.';
  }catch(err){status.textContent=err.message;}finally{state.busy=false;syncControls();e.target.value='';}
 });
 $('#panel-designs').addEventListener('click',e=>{if(e.target.closest('[data-editor-photo]')){if(!state.busy&&state.record.status!=='archived')$('#editor-photo-file').click();return;}const b=e.target.closest('[data-editor-color]');if(!b||b.disabled)return;const n=$('[data-editor-prop="color"]');n.value=b.dataset.editorColor;n.dispatchEvent(new Event('input',{bubbles:true}));for(const c of document.querySelectorAll('[data-editor-color]'))c.setAttribute('aria-pressed',String(c===b));});

 const toolbar=document.createElement('div');toolbar.className='authoring-tools';
 toolbar.innerHTML='<button type="button" data-editor-action="text">+ Text</button><button type="button" data-editor-action="motif">+ Motiv</button><button type="button" data-editor-action="photo">+ Fotofeld</button><button type="button" data-authoring-undo title="Strg/⌘ Z außerhalb eines Textfelds">Rückgängig</button><button type="button" data-authoring-redo title="Strg/⌘ Umschalt Z">Wiederholen</button><p id="authoring-status" role="status"></p>';
 $('#editor-elements').before(toolbar);
 toolbar.insertAdjacentHTML('beforeend','<label class="editor-guide-toggle"><input type="checkbox" id="editor-guides-enabled" checked> Hilfslinien</label><label class="editor-guide-toggle"><input type="checkbox" id="editor-snap-enabled" checked> Einrasten</label>');
 const modal=document.createElement('dialog');modal.className='authoring-dialog';document.body.append(modal);
 let motifMode='motif';
 const say=message=>{$('#authoring-status').textContent=message;};
 const snapshot=()=>({document:structuredClone(state.draft),designId,objectId});
 function resetHistory(){undo=[];redo=[];editControl=null;}
 function remember(){undo.push(snapshot());if(undo.length>20)undo.shift();redo=[];editControl=null;}
 function rememberInput(control){if(editControl!==control)remember();editControl=control.type==='checkbox'||control.tagName==='SELECT'?null:control;}
 function restoreEdit(repeat=false){
  const from=repeat?redo:undo,to=repeat?undo:redo;
  if(state.busy||drag||state.record?.status==='archived'||!from.length)return;
  to.push(snapshot());const last=from.pop();state.draft=last.document;designId=last.designId;objectId=last.objectId;editControl=null;
  markDirty();render();say(repeat?'Gestaltung wiederholt.':'Gestaltung zurückgenommen.');
 }
 $('#panel-designs').addEventListener('focusout',()=>{editControl=null;});
 $('#product-form').addEventListener('change',event=>{
  const n=event.target;if(state.busy||!state.draft||state.record?.status==='archived')return;
  if(n.dataset.elementRight&&n.dataset.rightAllowed==='true')rememberInput(n);
 },true);
 // An unrelated product/profile edit must never be silently overwritten by an
 // older composition snapshot. Saved revisions have their own durable history.
 $('#product-form').addEventListener('input',event=>{const n=event.target;if(!state.busy&&(n.dataset.path||n.dataset.money))resetHistory();},true);
 $('#product-form').addEventListener('change',event=>{const n=event.target;if(!state.busy&&(n.dataset.profileId||n.dataset.profileMode))resetHistory();},true);
 document.addEventListener('keydown',event=>{
  if(!state.record||$('#editor-section').hidden||document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if((event.ctrlKey||event.metaKey)&&!event.altKey&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();restoreEdit(event.shiftKey||event.key.toLowerCase()==='y');}
 });
 async function apply(action,value={}){
  if(state.busy||!state.record||state.record.status==='archived'||state.katalogEditor&&!['text','remove'].includes(action)||action==='remove'&&katalogProtected(selected()))return;
  state.busy=true;syncControls();
  try{
   if(action==='new'||action==='text'||action==='textify'){
    const fonts=state.draft.config.localResources.fonts;
    value.font??=(state.katalogEditor?Object.keys(fonts):['Cormorant Garamond','Open Sans','Montserrat',...Object.keys(fonts)]).find(id=>fonts[id]?.regular&&[...'Dein Text'].every(c=>fonts[id].regular.glyphs[c]));
    if(state.katalogEditor&&!value.font)throw Error('Bitte zuerst eine Katalogschrift mit allen Zeichen für „Dein Text“ auswählen.');
    if(!value.font){const found=await api('/api/workshop/font-library?id='+encodeURIComponent('Open Sans'));fonts[found.id]=found.font;value.font=found.id;}
    if(!Object.hasOwn(fonts,value.font)){const found=await fontResource(value.font);fonts[found.id]=found.font;}
   }
   if(action==='photo')value.exampleAssetId=(state.draft.config.localResources.photoExamples||[])[0]?.assetId||(await api('/api/workshop/photo-examples/default',{method:'POST',body:{}})).assetId;
   if(value.motif&&!state.draft.config.localResources.motifs.some(m=>m.key===value.motif.key)&&!value.motif.artwork){
    const m=value.motif,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${m.bounds[2]}mm" height="${m.bounds[3]}mm" viewBox="${m.bounds.join(' ')}">${m.svgFragment}</svg>`;
    const a=await api('/api/workshop/design-assets/import',{method:'POST',body:{name:'Bibliotheksmotiv.svg',bytes:btoa(Array.from(new TextEncoder().encode(svg),b=>String.fromCharCode(b)).join('')),page:1}});value.motif=assetMotif(a,m.name);
   }
   const next=authorDesign(state.draft,designId,action,{objectId,...value});
   if(state.katalogEditor&&action==='text')katalogTextAddition(next);
   remember();state.draft=next.document;designId=next.designId;objectId=next.objectId;
   markDirty();showTab('designs');render();say('Entwurf geändert. Bitte speichern.');modal.close();
  }catch(error){say(error.message);const status=modal.querySelector('[role=status]');if(status)status.textContent=error.message;}
  finally{state.busy=false;syncControls();}
 }
 function assetMotif(a,name){const {originalName,...artwork}=a;return {key:'artwork-'+a.assetId,name,category:'Eigene Motive',bounds:[0,0,a.widthMm,a.heightMm],embeddedOnly:true,svgFragment:artworkFragment(a.assetId,a.widthMm,a.heightMm),artwork};}
 const thumbnail=m=>{const [x,y,w,h]=m.bounds;const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">${m.svgFragment}</svg>`;return 'data:image/svg+xml;base64,'+btoa(Array.from(new TextEncoder().encode(svg),b=>String.fromCharCode(b)).join(''));};
 function motifList(){
  const q=$('#authoring-search').value.toLocaleLowerCase('de'),all=[...(state.draft.config.localResources.motifs||[]),...(libraryMotifs||[])],seen=new Set();
  const filtered=all.filter(m=>{if(seen.has(m.key))return false;seen.add(m.key);return [m.name,m.category,m.key].join(' ').toLocaleLowerCase('de').includes(q);});
  $('#authoring-motifs').innerHTML=filtered.slice(0,60).map(m=>`<button type="button" data-authoring-motif="${escape(m.key)}"><img ${m.artwork?merchantImageAttribute(`/api/workshop/design-assets/${m.artwork.assetId}/preview.svg`):`src="${escape(thumbnail(m))}"`} alt=""><span>${escape(m.name||m.key)}</span></button>`).join('');
  $('#authoring-count').textContent=filtered.length>60?`${filtered.length} Motive gefunden. Bitte Suche eingrenzen (erste 60 sichtbar).`:`${filtered.length} Motive gefunden.`;
 }
 async function chooseMotif(mode){
  if(state.busy||state.katalogEditor)return;motifMode=mode;
  modal.innerHTML=`<div class="authoring-heading"><h3>${mode==='replace'?'Motiv ersetzen':'Motiv hinzufügen'}</h3><button type="button" data-authoring-close aria-label="Schließen">×</button></div><label>Eigenes Motiv hochladen (SVG oder PDF, erste Seite)<input id="authoring-motif-file" type="file" accept=".svg,.pdf"></label><label>Motivbibliothek durchsuchen<input id="authoring-search" type="search" placeholder="Zum Beispiel Baum, Herz, Blume"></label><p id="authoring-count" role="status">Motivbibliothek wird geladen …</p><div id="authoring-motifs"></div>`;
  modal.showModal();
  try{if(!libraryMotifs)libraryMotifs=(await api('/api/workshop/form-motifs')).motifs;motifList();}catch(error){$('#authoring-count').textContent=error.message;}
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-prepare-editable]')){prepareEditable();return;}
  if(e.target.closest('[data-edit-pdf-text]')&&!state.busy){
   const source=design().sourceElements.find(e=>e.id===objectId),fonts=[...new Set([...Object.keys(state.draft.config.localResources.fonts),...libraryFonts.map(f=>f.id)])];
   const unrecognized=/[\uE000-\uF8FF\uFFFD]/u.test(source.text||'');
   modal.innerHTML=`<div class="authoring-heading"><h3>PDF-Text bearbeiten</h3><button type="button" data-authoring-close aria-label="Schließen">×</button></div><label>Text prüfen<textarea id="pdf-edit-text" rows="3" maxlength="180">${escape(source.text)}</textarea></label>${unrecognized?'<p role="note">Diese PDF verwendet besondere Schriftzeichen oder Ligaturen. Bitte den Text anhand der Originalvorschau vollständig prüfen und unlesbare Zeichen durch die richtigen Buchstaben ersetzen.</p>':''}<label>Werkstatt-Schrift<select id="pdf-edit-font">${fonts.map(f=>`<option value="${escape(f)}">${escape(libraryFonts.find(row=>row.id===f)?.name||f)}</option>`).join('')}</select></label><p>Die gewählte Schrift ersetzt die PDF-Konturen nur in diesem Entwurf. Größe und Position kannst du anschließend ändern.</p><p role="status"></p><button type="button" data-pdf-text-apply>Als bearbeitbaren Text übernehmen</button>`;modal.showModal();return;
  }
  const action=e.target.closest('[data-editor-action]');
  if(action&&!state.busy){if(['motif','replace'].includes(action.dataset.editorAction))chooseMotif(action.dataset.editorAction);else apply(action.dataset.editorAction);}
  if(e.target.closest('[data-new-design]')&&!state.busy){modal.innerHTML='<div class="authoring-heading"><h3>Eigenes Design anlegen</h3><button type="button" data-authoring-close aria-label="Schließen">×</button></div><p>Die vorhandenen Designs bleiben erhalten. Dein neues Standarddesign beginnt mit einem bearbeitbaren Textfeld.</p><label>Designname<input id="authoring-name" maxlength="200" value="Eigenes Design" required></label><p role="status"></p><button type="button" data-authoring-create>Design anlegen</button>';modal.showModal();}
  if(e.target.closest('[data-authoring-undo]'))restoreEdit();
  if(e.target.closest('[data-authoring-redo]'))restoreEdit(true);
 });
 async function prepareEditable(){
  if(state.busy)return;
  if(state.dirty){say('Bitte den aktuellen Entwurf zuerst speichern. Danach kannst du die PDF aufbereiten.');return;}
  state.busy=true;syncControls();say('PDF-Bestandteile werden aufbereitet …');
  try{const result=await api(`/api/workshop/products/${state.record.id}/editable-design`,{method:'POST',body:{expectedRevision:state.record.revision,designId}});remember();state.draft=result.document;objectId=design().objects[0]?.id;markDirty();render();say(`${result.parts.length} Bestandteile aufbereitet. Texte über „Text bearbeiten“ ändern, Fotoform prüfen, dann speichern. Das Original bleibt im Verlauf.`);}catch(error){say(error.message);}finally{state.busy=false;syncControls();}
 }
 modal.addEventListener('input',e=>{if(e.target.id==='authoring-search')motifList();});
 modal.addEventListener('click',e=>{
  if(e.target.closest('[data-authoring-close]'))modal.close();
  if(e.target.closest('[data-authoring-create]'))apply('new',{name:$('#authoring-name').value});
  if(e.target.closest('[data-pdf-text-apply]'))apply('textify',{text:$('#pdf-edit-text').value,font:$('#pdf-edit-font').value});
  const button=e.target.closest('[data-authoring-motif]');if(button){const motif=[...state.draft.config.localResources.motifs,...(libraryMotifs||[])].find(m=>m.key===button.dataset.authoringMotif);apply(motifMode,{motif});}
 });
 modal.addEventListener('change',async e=>{
  if(e.target.id!=='authoring-motif-file'||state.busy)return;
  const file=e.target.files?.[0];if(!file)return;
  state.busy=true;syncControls();
  let motif;
  try{
   if(file.size>15*1024*1024)throw Error('Bitte SVG oder PDF bis 15 MB auswählen.');
   $('#authoring-count').textContent='Eigenes Motiv wird geprüft …';
   const bytes=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));r.readAsDataURL(file);});
   const a=await api('/api/workshop/design-assets/import',{method:'POST',body:{name:file.name,bytes,page:1}});
   motif=assetMotif(a,file.name);
  }catch(error){$('#authoring-count').textContent=error.message;}
  finally{state.busy=false;syncControls();}
  if(motif)await apply(motifMode,{motif});
 });
 const stage=$('#editor-preview');
 let pick=null;
 function candidatesAt(x,y){const d=design();if(!d)return [];const ids=[...new Set(document.elementsFromPoint(x,y).map(n=>n.closest?.('[data-object]')).filter(n=>n&&stage.contains(n)).map(n=>n.dataset.object))];return ids.map(id=>d.objects.find(o=>o.id===id)).filter(o=>o&&!o.technicalLocked).sort((a,b)=>a.w*a.h-b.w*b.h);}
 stage.tabIndex=0;stage.setAttribute('aria-label','Gestaltungsfläche. Element anklicken und ziehen. '+(state.katalogEditor?'Die Pfeile ändern die Größe.':'Eckgriffe ändern die Größe.')+' Pfeiltasten verschieben die Auswahl um einen Millimeter. Liegen Elemente übereinander, wählt ein weiterer Klick an derselben Stelle das darunterliegende.');
 new ResizeObserver(()=>highlight()).observe(stage);
 stage.addEventListener('pointerdown',e=>{
  if(e.button!==0||state.busy||!state.record||state.record.status==='archived'||!valid())return;
  const handle=e.target.closest('[data-editor-resize]');
  // Every element under the pointer is a candidate, not only the topmost one.
  // The smallest wins (a text above a full-size frame); a repeated click on the
  // same spot moves on to the next larger one, so the frame stays reachable.
  // Pressing again on the same spot keeps the current element (to drag it);
  // only a click without dragging moves on (see the click handler).
  const list=handle?[]:candidatesAt(e.clientX,e.clientY),repeat=Boolean(pick&&Math.hypot(e.clientX-pick.x,e.clientY-pick.y)<4&&list.some(o=>o.id===objectId));
  const chosen=handle?objectId:repeat?objectId:list[0]?.id;
  pick=handle?null:{x:e.clientX,y:e.clientY,ids:list.map(o=>o.id),repeat};
  const node=chosen&&[...stage.querySelectorAll('[data-object]')].find(n=>n.dataset.object===chosen),o=node&&design()?.objects.find(o=>o.id===chosen);if(!o||o.technicalLocked||katalogProtected(o))return;
  select(o.id);const matrix=node.parentNode.getScreenCTM()?.inverse();if(!matrix)return;
  const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix);
  // Invalidate pending preview responses immediately: replacing the SVG during
  // a held pointer disconnects the node and makes dragging appear unresponsive.
  stopPreview();
  drag={node,object:o,start:point,matrix,original:structuredClone(o),resize:!!handle,pointer:e.pointerId,moved:false};stage.setPointerCapture(e.pointerId);stage.focus({preventScroll:true});e.preventDefault();
 });
 stage.addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(drag.matrix),dx=point.x-drag.start.x,dy=point.y-drag.start.y;
  if(!drag.moved&&Math.hypot(dx,dy)<.5)return;
  const original=drag.original,next=structuredClone(original);
  try{
   if(drag.resize){
    const vx=drag.start.x-original.x,vy=drag.start.y-original.y,scale=Math.max(.01,state.katalogEditor?selectionScaleFactor(original,drag.start,point):((point.x-original.x)*vx+(point.y-original.y)*vy)/(vx*vx+vy*vy));
    if(next.type==='text'){setTextSize(next,state.katalogEditor?Math.min(100,Math.max(1,original.size*scale)):Math.max(1,Math.round(original.size*scale)));measureText(next,state.draft.config.localResources.fonts);}
    else {next.w=original.w*scale;next.h=original.h*scale;}
   }else {next.x=original.x+dx;next.y=original.y+dy;}
   if(!state.katalogEditor)fitPosition(next,state.draft.config.profile.geometry);
   if(!drag.resize&&$('#editor-guides-enabled').checked){
    const matrix=drag.node.parentNode.getScreenCTM(),threshold=4/Math.max(.01,Math.hypot(matrix.a,matrix.b));
    const aligned=alignedPosition(next,state.draft.config.profile.geometry,design().objects,{threshold,snap:$('#editor-snap-enabled').checked&&!e.altKey});
    Object.assign(next,aligned.object);if(!state.katalogEditor)fitPosition(next,state.draft.config.profile.geometry);
    drawGuides(stage,drag.node.parentNode,state.draft.config.profile.geometry,aligned.lines);
   }else clearGuides(stage);
   if(!drag.moved){remember();drag.moved=true;}
   Object.assign(drag.object,next);
   drag.node.setAttribute('transform',`translate(${next.x} ${next.y}) rotate(${next.rotation||0}) scale(${next.w/original.w} ${next.h/original.h})`);
   // Overlay reads the original local bounds while the artwork is scaled.
   drawSelection(stage,drag.node,original,{arrows:!!state.katalogEditor});
   $('#stage-status').textContent=drag.resize?'Größe ändern · loslassen zum Übernehmen':'Verschieben · loslassen zum Übernehmen';
  }catch(error){$('#stage-status').textContent=error.message;}
 });
 function finishDrag(e){if(!drag||drag.pointer!==e.pointerId)return;clearGuides(stage);const moved=drag.moved,cancelled=e.type==='pointercancel';if(cancelled){Object.assign(drag.object,drag.original);if(moved)undo.pop();}drag=null;if(moved)pick=null;if(moved&&!cancelled)markDirty();else changed();properties();}
 stage.addEventListener('pointerup',finishDrag);stage.addEventListener('pointercancel',finishDrag);stage.addEventListener('lostpointercapture',finishDrag);
 stage.addEventListener('keydown',e=>{
  const arrow=state.katalogEditor&&e.target.closest('[data-editor-resize]');
  if(e.target!==stage&&!arrow||state.busy)return;
  if(e.key==='Escape'&&drag){finishDrag({pointerId:drag.pointer,type:'pointercancel'});return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key],o=selected();
  if(!delta||!o||o.technicalLocked||katalogProtected(o)||state.record.status==='archived'||!valid())return;
  e.preventDefault();const next=structuredClone(o),step=e.shiftKey?10:1;
  try{if(arrow){const scale=1+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1)*.03;if(next.type==='text'){setTextSize(next,Math.min(100,Math.max(1,next.size*scale)));measureText(next,state.draft.config.localResources.fonts);}else{next.w*=scale;next.h*=scale;}}else{next.x+=delta[0]*step;next.y+=delta[1]*step;}if(!state.katalogEditor)fitPosition(next,state.draft.config.profile.geometry);remember();Object.assign(o,next);markDirty();properties();}catch(error){$('#stage-status').textContent=error.message;}
 });
 return {render,changed,sync,refreshOptions,workspaceTab,resetHistory,inspect(){properties();photoThumbnail();},prepare(){for(const card of document.querySelectorAll("#product-form .record-card"))$(".record-aside").append(card);}};
}
