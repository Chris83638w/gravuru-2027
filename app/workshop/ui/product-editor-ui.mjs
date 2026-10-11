import {authorDesign,fitPosition} from './design-authoring.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {artworkFragment} from '../../configurator/variant-m/artwork-resource.mjs';
import {merchantImageAttribute} from './merchant-media.mjs';
import {drawSelection} from './editor-selection.mjs';
// M02 view adapter. The existing draft, revision API and rights remain authoritative.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const presets=['#202824','#731c19','#17614f','#ffffff','#c49a50'];
export function installProductEditor({state,api,markDirty,syncControls,showTab,objectLabel,availableRights}){
 let productId=null,designId=null,objectId=null,timer,serial=0,options={},libraryFonts=[],libraryMotifs=null,undo=[],drag=null,previewController,previewPending=false,wasBusy=false;
 const icon=name=>`<img class="editor-icon" src="/workshop-ui/editor-icons/${name}.svg" alt="" aria-hidden="true">`;
 const icons={details:'cube',designs:'photo',prices:'tag',profiles:'typography',scene:'photo',production:'settings',shopify:'link'};
 for(const tab of document.querySelectorAll('.editor-tabs [data-tab]'))tab.insertAdjacentHTML('afterbegin',icon(icons[tab.dataset.tab]));
 for(const [selector,name] of [['[data-view=products]','cube'],['[data-view=masters]','files'],['.sidebar a[href="/werkstatt/serien/"]','stack-2'],['.sidebar a[href="/werkstatt/bestellungen/"],.upcoming-orders','shopping-cart'],['#customer-view','eye'],['#save-product','device-floppy']])$(selector)?.insertAdjacentHTML('afterbegin',icon(name));
 for(const b of document.querySelectorAll('.record-aside button'))b.type='button';$('#copy-product').type='button';$('#record-id').after($('#copy-product'));
 const designs=()=>state.draft?.config.profile.designs||[];
 const design=()=>designs().find(d=>d.id===designId);
 const selected=()=>design()?.objects.find(o=>o.id===objectId);
 const label=(o,i)=>design()?.sourceElements?.find(f=>f.id===o.id)?.label||design()?.customerFields?.find(f=>f.id===o.id)?.label||objectLabel(o,i);
 const input=(title,key,value,{type='number',step='any',min,max}={})=>`<label>${title}<input data-editor-prop="${key}" type="${type}" ${type==='number'?`step="${step}"`:''} ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} value="${escape(value)}" required></label>`;
 function sync(){
  if(state.busy&&!wasBusy)stopPreview();
  if(!state.busy&&wasBusy&&previewPending)timer=setTimeout(preview,0);
  wasBusy=state.busy;
  const disabled=state.busy||state.record?.status==='archived';
  for(const n of document.querySelectorAll('[data-editor-prop],[data-editor-color],[data-editor-photo],[data-editor-hint],[data-editor-action],[data-authoring-undo],[data-new-design],[data-editor-name],[data-prepare-editable],[data-edit-pdf-text]'))n.disabled=disabled||(n.matches('[data-editor-prop],[data-editor-photo],[data-editor-color]')&&selected()?.technicalLocked===true);
  const undoButton=$('[data-authoring-undo]');if(undoButton)undoButton.disabled=disabled||!undo.length;
  for(const n of document.querySelectorAll('[data-editor-object],[data-editor-design]'))n.disabled=state.busy;
  if(!drag)highlight();
 }
 function elements(){
  $('#editor-elements').innerHTML=(design()?.objects||[]).map((o,i)=>`<button type="button" data-editor-object="${escape(o.id)}" aria-pressed="${o.id===objectId}">${icon(o.type==='text'?'typography':o.type==='photoSlot'?'photo':o.type==='graphic'?'rectangle':'heart')}<span>${escape(label(o,i))}</span>${o.technicalLocked?'<small>technisch</small>':''}</button>`).join('');
 }
 function properties(){
  const o=selected(),d=design(),geometry=state.draft.config.profile.geometry;elements();
  if(!o){$('#panel-designs').innerHTML='<h3>Designs & Elemente</h3><p>Wähle links ein Element aus.</p>';return;}
  const rights=state.draft.elementRights[d.id][o.id],allowed=availableRights(o);
  const check=(key,text)=>`<label class="element-check"><input type="checkbox" data-element-right="${key}" data-design-id="${escape(d.id)}" data-object-id="${escape(o.id)}" data-right-allowed="${allowed[key]}" ${rights[key]?'checked':''} ${!allowed[key]?'disabled':''}>${text}</label>`;
  let body=`<label>Designname<input data-editor-name value="${escape(d.name)}" maxlength="200" required></label>${d.importedSource?'<button type="button" data-prepare-editable>PDF / SVG in Elemente aufbereiten</button><p class="field-help">Texte, Bilder und Vektormotive getrennt bearbeiten. Das Original bleibt erhalten; die Aufbereitung wird zuerst als Entwurf angezeigt.</p>':''}<h3>${escape(label(o,d.objects.indexOf(o)))}</h3>`;
  if(o.type==='motif'&&d.sourceElements?.find(e=>e.id===o.id)?.kind==='text')body+='<button type="button" data-edit-pdf-text>Text bearbeiten</button><p class="field-help">Die Originalschrift liegt als Kontur vor. Zum Ändern eine vollständige Werkstatt-Schrift wählen.</p>';
  if(o.type==='text'){
   const fonts=[...new Set([...Object.keys(state.draft.config.localResources.fonts),...libraryFonts.map(f=>f.id)])];
   body+=`<label>Beispieltext<textarea data-editor-prop="text" rows="3" maxlength="180" required>${escape(o.text)}</textarea></label><label>Schriftart<select data-editor-prop="font">${fonts.map(f=>`<option value="${escape(f)}" ${f===o.font?'selected':''}>${escape(libraryFonts.find(row=>row.id===f)?.name||f.replace(/ · [a-f0-9]{12}$/,''))}</option>`).join('')}</select></label><div class="element-pair">${input('Schriftgröße · mm','size',Math.round(o.size),{step:1,min:1,max:100})}<div class="font-styles"><label><input type="checkbox" data-editor-prop="bold" ${o.bold?'checked':''}> Fett</label><label><input type="checkbox" data-editor-prop="italic" ${o.italic?'checked':''}> Kursiv</label></div></div>`;
  }
  if(['text','motif','graphic'].includes(o.type))body+=`<label class="element-color-label">Ausgewählte Farbe<input type="color" data-editor-prop="color" value="${escape(o.color||'#202824')}"></label><div class="element-colors" role="group" aria-label="Farbvorschläge">${presets.map(c=>`<button type="button" data-editor-color="${c}" style="background:${c}" aria-label="Farbe ${c}" aria-pressed="${c===o.color}"></button>`).join('')}</div>`;
  if(o.type==='motif')body+=`<button type="button" data-editor-action="replace">Motiv ersetzen</button>`;
  if(o.type==='photoSlot')body+=`<label>Fotoform<select data-editor-prop="photoShape">${[['rect','Rechteck'],['circle','Oval / Kreis'],['arch','Bogen']].map(([id,name])=>`<option value="${id}" ${o.photoShape===id?'selected':''}>${name}</option>`).join('')}</select></label><div class="photo-example-controls"><div id="selected-photo-preview"></div><button type="button" data-editor-photo>Bild ersetzen</button><input id="editor-photo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></div><p id="photo-upload-status" role="status"></p>`;
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
  drawSelection($('#editor-preview'),node,selected(),{editable:!state.busy&&state.record?.status!=='archived'&&!selected()?.technicalLocked});
 }
 async function preview(){
  if(!state.record||!design())return;
  if(state.busy||drag){previewPending=true;return;}
  previewPending=false;previewController?.abort();previewController=new AbortController();
  const request=++serial,id=state.record.id;
  $('#stage-status').textContent='Vorschau aktualisiert sich …';$('#stage-price').textContent='';
  try{
   const response=await api(`/api/workshop/products/${encodeURIComponent(id)}/editor-preview`,{method:'POST',signal:previewController.signal,body:{expectedRevision:state.record.revision,document:state.draft,designId,options}});
   if(request!==serial||id!==state.record?.id)return;
   $('#editor-preview').innerHTML=response.svg;highlight();photoThumbnail();
   const tile=[...$('#editor-designs').querySelectorAll('[data-editor-design]')].find(n=>n.dataset.editorDesign===designId),old=tile?.querySelector('img');
   if(old){const img=document.createElement('img');img.alt='';img.src='data:image/svg+xml;base64,'+btoa(Array.from(new TextEncoder().encode(response.svg),b=>String.fromCharCode(b)).join(''));old.replaceWith(img);}
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
  if(state.draft.config.profile.material.kind==='slate'){
   $('#stage-options').innerHTML=groups[0].values.map(v=>`<option value="${escape(v.id)}" ${options.mounting===v.id?'selected':''}>${escape(v.label)}</option>`).join('');return;
  }
  const [sizes,bases,walls]=['size','base','wall'].map(id=>groups.find(g=>g.id===id).values);
  $('#stage-options').innerHTML=sizes.flatMap(s=>bases.flatMap(b=>walls.map(w=>`<option value="${escape(s.id+'|'+b.id+'|'+w.id)}" ${options.size===s.id&&options.base===b.id&&options.wall===w.id?'selected':''}>${escape(s.label+' · '+b.label+(w.id==='wall'?' · '+w.label:''))}</option>`))).join('');
 }
 function render(){
  if(!state.record)return;
  if(productId!==state.record.id){productId=state.record.id;designId=state.draft.config.profile.defaultDesignId;objectId=null;options={};undo=[];}
  if(!design())designId=state.draft.config.profile.defaultDesignId;
  if(!selected())objectId=design()?.objects.find(o=>o.type==='photoSlot')?.id||design()?.objects[0]?.id;
  refreshOptions();
  $('#editor-designs').innerHTML=designs().map(d=>`<button type="button" data-editor-design="${escape(d.id)}" aria-pressed="${d.id===designId}"><img loading="lazy" ${merchantImageAttribute(`/api/workshop/products/${encodeURIComponent(state.record.id)}/preview.svg?revision=${state.record.revision}&designId=${encodeURIComponent(d.id)}`)} alt=""><span>${escape(d.name)}</span><small>${d.id===state.draft.config.profile.defaultDesignId?'Standarddesign':'Design'}</small></button>`).join('')+`<button type="button" class="import-design-tile" data-design-action="import" data-design-id="${escape(designId)}">PDF / SVG importieren</button><button type="button" data-new-design>Eigenes Design anlegen</button>`;
  // Preserve every existing operation, relocating its card rather than replacing its logic.
  const cards=[...document.querySelectorAll('.record-aside .record-card')];
  for(const card of cards){const target=card.querySelector('#print-export-link')?'#panel-production':'#panel-details';$(target).append(card);}
  const slate=state.draft.config.profile.material.kind==='slate',g=state.draft.config.profile.geometry;
  $('#panel-scene').innerHTML=slate?`<h3>Schieferplatte</h3><p>Rohling: ${escape(g.width)} × ${escape(g.height)} mm</p><label>Rohlingbild austauschen<input id="material-surface-file" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="field-help">Wähle ein Foto der ungestalteten Platte. Das Bild füllt die vorhandenen Produktmaße. Design, Bohrungen und Preise bleiben erhalten.</p><p id="material-surface-status" role="status"></p>`:'<h3>Hintergrund & Szene</h3><p>Wähle Acrylglasgröße und Sockel über dem Produkt.</p>';
  properties();clearTimeout(timer);preview();
 }
 api('/api/workshop/font-library').then(data=>{libraryFonts=data.fonts;if(selected())properties();}).catch(()=>{});
 const valid=()=>[...$('#panel-designs').querySelectorAll('input,textarea,select')].every(n=>n.disabled||n.reportValidity());
 function select(id){if(!valid())return;objectId=id;showTab('designs');properties();highlight();photoThumbnail();}
 $('#editor-elements').addEventListener('click',e=>{const b=e.target.closest('[data-editor-object]');if(b&&!state.busy)select(b.dataset.editorObject);});
 $('#editor-preview').addEventListener('click',e=>{const n=e.target.closest('[data-object]');if(n&&!state.busy&&!drag)select(n.dataset.object);});
 $('#editor-preview').addEventListener('keydown',e=>{const n=e.target.closest('[data-object]');if(n&&['Enter',' '].includes(e.key)&&!state.busy){e.preventDefault();select(n.dataset.object);}});
 $('#editor-designs').addEventListener('click',e=>{const b=e.target.closest('[data-editor-design]');if(!b||state.busy||!valid())return;designId=b.dataset.editorDesign;objectId=null;showTab('designs');render();});
 $('#stage-options').addEventListener('change',()=>{if(state.draft.config.profile.material.kind==='slate')options={mounting:$('#stage-options').value};else [options.size,options.base,options.wall]=$('#stage-options').value.split('|');changed();});
 $('#panel-scene').addEventListener('change',async e=>{
  if(e.target.id!=='material-surface-file'||state.busy||state.record.status==='archived')return;
  const file=e.target.files?.[0];if(!file)return;
  const status=$('#material-surface-status');state.busy=true;syncControls();
  try{
   if(file.size>15*1024*1024)throw Error('Bitte ein Bild bis 15 MB auswählen.');
   status.textContent='Rohlingbild wird geprüft …';
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});
   const surface=await api('/api/workshop/material-surfaces',{method:'POST',body:{bytes:data}});
   state.draft.config.materialSurface=surface.url;markDirty();status.textContent='Rohlingbild ausgetauscht. Bitte Produkt speichern.';
  }catch(error){status.textContent=error.message;}finally{state.busy=false;syncControls();e.target.value='';}
 });
 $('#panel-designs').addEventListener('input',async e=>{
  const n=e.target,key=n.dataset.editorProp,o=selected();
  if(n.hasAttribute('data-editor-name')&&!state.busy&&n.value.trim()){design().name=n.value;markDirty();return;}
  if(n.dataset.editorHint&&o&&!state.busy&&state.record.status!=='archived'){const d=design();state.draft.config.photo.hints??=[];let h=state.draft.config.photo.hints.find(h=>h.designId===d.id&&h.slotId===o.id);if(!h){h={designId:d.id,slotId:o.id,text:'Hier eigenes Foto hochladen',enabled:true};state.draft.config.photo.hints.push(h);}h[n.dataset.editorHint]=n.type==='checkbox'?n.checked:n.value;markDirty();return;}
  if(!key||!o||state.busy||state.record.status==='archived'||o.technicalLocked)return;
  n.setCustomValidity('');
  if(n.type==='number'&&(!Number.isFinite(n.valueAsNumber)||!n.checkValidity()))return;
  if(key==='font'&&!Object.hasOwn(state.draft.config.localResources.fonts,n.value)){
   state.busy=true;syncControls();
   try{const result=await api('/api/workshop/font-library?id='+encodeURIComponent(n.value));state.draft.config.localResources.fonts[result.id]=result.font;}
   catch(error){$('#stage-status').textContent=error.message;n.value=o.font;return;}
   finally{state.busy=false;syncControls();}
  }
  const previous=structuredClone(o);
  o[key]=n.type==='checkbox'?n.checked:n.type==='number'?n.valueAsNumber:n.value;
  try{if(o.type==='text')measureText(o,state.draft.config.localResources.fonts);fitPosition(o,state.draft.config.profile.geometry);n.setCustomValidity('');}
  catch(error){Object.assign(o,previous);n.setCustomValidity(error.message);n.reportValidity();return;}
  if(key==='color'&&o.type==='motif')o.preserveColors=false;
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
   const resources=state.draft.config.localResources;resources.photoExamples=(resources.photoExamples||[]).filter(v=>v.designId!==d.id||v.slotId!==o.id);
   resources.photoExamples.push({designId:d.id,slotId:o.id,assetId:asset.assetId});markDirty();status.textContent='Beispielfoto übernommen. Änderungen noch speichern.';
  }catch(err){status.textContent=err.message;}finally{state.busy=false;syncControls();e.target.value='';}
 });
 $('#panel-designs').addEventListener('click',e=>{if(e.target.closest('[data-editor-photo]')){if(!state.busy&&state.record.status!=='archived')$('#editor-photo-file').click();return;}const b=e.target.closest('[data-editor-color]');if(!b||b.disabled)return;const n=$('[data-editor-prop="color"]');n.value=b.dataset.editorColor;n.dispatchEvent(new Event('input',{bubbles:true}));for(const c of document.querySelectorAll('[data-editor-color]'))c.setAttribute('aria-pressed',String(c===b));});

 const toolbar=document.createElement('div');toolbar.className='authoring-tools';
 toolbar.innerHTML='<button type="button" data-editor-action="text">+ Text</button><button type="button" data-editor-action="motif">+ Motiv</button><button type="button" data-editor-action="photo">+ Fotofeld</button><button type="button" data-authoring-undo>Elementaktion zurücknehmen</button><p id="authoring-status" role="status"></p>';
 $('#editor-elements').before(toolbar);
 const modal=document.createElement('dialog');modal.className='authoring-dialog';document.body.append(modal);
 let motifMode='motif';
 const say=message=>{$('#authoring-status').textContent=message;};
 function remember(){undo.push({document:structuredClone(state.draft),designId,objectId});if(undo.length>12)undo.shift();}
 async function apply(action,value={}){
  if(state.busy||state.record.status==='archived')return;
  state.busy=true;syncControls();
  try{
   if(action==='new'||action==='text'||action==='textify'){
    const fonts=state.draft.config.localResources.fonts;
    value.font??=['Cormorant Garamond','Open Sans','Montserrat',...Object.keys(fonts)].find(id=>fonts[id]?.regular&&[...'Dein Text'].every(c=>fonts[id].regular.glyphs[c]));
    if(!value.font){const found=await api('/api/workshop/font-library?id='+encodeURIComponent('Open Sans'));fonts[found.id]=found.font;value.font=found.id;}
   }
   if(action==='photo')value.exampleAssetId=(state.draft.config.localResources.photoExamples||[])[0]?.assetId||(await api('/api/workshop/photo-examples/default',{method:'POST',body:{}})).assetId;
   if(value.motif&&!state.draft.config.localResources.motifs.some(m=>m.key===value.motif.key)&&!value.motif.artwork){
    const m=value.motif,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${m.bounds[2]}mm" height="${m.bounds[3]}mm" viewBox="${m.bounds.join(' ')}">${m.svgFragment}</svg>`;
    const a=await api('/api/workshop/design-assets/import',{method:'POST',body:{name:'Bibliotheksmotiv.svg',bytes:btoa(Array.from(new TextEncoder().encode(svg),b=>String.fromCharCode(b)).join('')),page:1}});value.motif=assetMotif(a,m.name);
   }
   const next=authorDesign(state.draft,designId,action,{objectId,...value});remember();state.draft=next.document;designId=next.designId;objectId=next.objectId;
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
  if(state.busy)return;motifMode=mode;
  modal.innerHTML=`<div class="authoring-heading"><h3>${mode==='replace'?'Motiv ersetzen':'Motiv hinzufügen'}</h3><button type="button" data-authoring-close aria-label="Schließen">×</button></div><label>Eigenes Motiv hochladen (SVG oder PDF, erste Seite)<input id="authoring-motif-file" type="file" accept=".svg,.pdf"></label><label>Motivbibliothek durchsuchen<input id="authoring-search" type="search" placeholder="Zum Beispiel Baum, Herz, Blume"></label><p id="authoring-count" role="status">Motivbibliothek wird geladen …</p><div id="authoring-motifs"></div>`;
  modal.showModal();
  try{if(!libraryMotifs)libraryMotifs=(await api('/api/workshop/form-motifs')).motifs;motifList();}catch(error){$('#authoring-count').textContent=error.message;}
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-prepare-editable]')){prepareEditable();return;}
  if(e.target.closest('[data-edit-pdf-text]')&&!state.busy){
   const source=design().sourceElements.find(e=>e.id===objectId),fonts=Object.keys(state.draft.config.localResources.fonts);
   modal.innerHTML=`<div class="authoring-heading"><h3>PDF-Text bearbeiten</h3><button type="button" data-authoring-close aria-label="Schließen">×</button></div><label>Text prüfen<textarea id="pdf-edit-text" rows="3" maxlength="180">${escape(source.text)}</textarea></label><label>Werkstatt-Schrift<select id="pdf-edit-font">${fonts.map(f=>`<option value="${escape(f)}">${escape(f)}</option>`).join('')}</select></label><p>Die gewählte Schrift ersetzt die PDF-Konturen nur in diesem Entwurf. Größe und Position kannst du anschließend ändern.</p><p role="status"></p><button type="button" data-pdf-text-apply>Als bearbeitbaren Text übernehmen</button>`;modal.showModal();return;
  }
  const action=e.target.closest('[data-editor-action]');
  if(action&&!state.busy){if(['motif','replace'].includes(action.dataset.editorAction))chooseMotif(action.dataset.editorAction);else apply(action.dataset.editorAction);}
  if(e.target.closest('[data-new-design]')&&!state.busy){modal.innerHTML='<div class="authoring-heading"><h3>Eigenes Design anlegen</h3><button type="button" data-authoring-close aria-label="Schließen">×</button></div><p>Die vorhandenen Designs bleiben erhalten. Dein neues Standarddesign beginnt mit einem bearbeitbaren Textfeld.</p><label>Designname<input id="authoring-name" maxlength="200" value="Eigenes Design" required></label><p role="status"></p><button type="button" data-authoring-create>Design anlegen</button>';modal.showModal();}
  if(e.target.closest('[data-authoring-undo]')&&!state.busy&&undo.length){const last=undo.pop();state.draft=last.document;designId=last.designId;objectId=last.objectId;markDirty();render();say('Elementaktion zurückgenommen.');}
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
 stage.tabIndex=0;stage.setAttribute('aria-label','Gestaltungsfläche. Element anklicken und ziehen. Eckgriffe ändern die Größe. Pfeiltasten verschieben die Auswahl um einen Millimeter.');
 new ResizeObserver(()=>highlight()).observe(stage);
 stage.addEventListener('pointerdown',e=>{
  if(e.button!==0||state.busy||state.record.status==='archived'||!valid())return;
  const handle=e.target.closest('[data-editor-resize]');
  const node=handle?[...stage.querySelectorAll('[data-object]')].find(n=>n.dataset.object===objectId):e.target.closest('[data-object]'),o=node&&design()?.objects.find(o=>o.id===node.dataset.object);if(!o||o.technicalLocked)return;
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
    const vx=drag.start.x-original.x,vy=drag.start.y-original.y,scale=Math.max(.01,((point.x-original.x)*vx+(point.y-original.y)*vy)/(vx*vx+vy*vy));
    if(next.type==='text'){next.size=Math.max(1,Math.round(original.size*scale));measureText(next,state.draft.config.localResources.fonts);}
    else {next.w=original.w*scale;next.h=original.h*scale;}
   }else {next.x=original.x+dx;next.y=original.y+dy;}
   fitPosition(next,state.draft.config.profile.geometry);
   if(!drag.moved){remember();drag.moved=true;}
   Object.assign(drag.object,next);
   drag.node.setAttribute('transform',`translate(${next.x} ${next.y}) rotate(${next.rotation||0}) scale(${next.w/original.w} ${next.h/original.h})`);
   // Overlay reads the original local bounds while the artwork is scaled.
   drawSelection(stage,drag.node,original);
   $('#stage-status').textContent=drag.resize?'Größe ändern · loslassen zum Übernehmen':'Verschieben · loslassen zum Übernehmen';
  }catch(error){$('#stage-status').textContent=error.message;}
 });
 function finishDrag(e){if(!drag||drag.pointer!==e.pointerId)return;const moved=drag.moved,cancelled=e.type==='pointercancel';if(cancelled){Object.assign(drag.object,drag.original);if(moved)undo.pop();}drag=null;if(moved&&!cancelled)markDirty();else changed();properties();}
 stage.addEventListener('pointerup',finishDrag);stage.addEventListener('pointercancel',finishDrag);stage.addEventListener('lostpointercapture',finishDrag);
 stage.addEventListener('keydown',e=>{
  if(e.target!==stage||state.busy)return;
  if(e.key==='Escape'&&drag){finishDrag({pointerId:drag.pointer,type:'pointercancel'});return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key],o=selected();
  if(!delta||!o||o.technicalLocked||state.record.status==='archived'||!valid())return;
  e.preventDefault();const next=structuredClone(o),step=e.shiftKey?10:1;
  try{next.x+=delta[0]*step;next.y+=delta[1]*step;fitPosition(next,state.draft.config.profile.geometry);remember();Object.assign(o,next);markDirty();properties();}catch(error){$('#stage-status').textContent=error.message;}
 });
 return {render,changed,sync,refreshOptions,inspect(){properties();photoThumbnail();},prepare(){for(const card of document.querySelectorAll("#product-form .record-card"))$(".record-aside").append(card);}};
}
