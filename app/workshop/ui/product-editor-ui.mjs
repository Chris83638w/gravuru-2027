// M02 view adapter. The existing draft, revision API and rights remain authoritative.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const presets=['#202824','#731c19','#17614f','#ffffff','#c49a50'];
export function installProductEditor({state,api,markDirty,syncControls,showTab,objectLabel,availableRights}){
 let productId=null,designId=null,objectId=null,timer,serial=0,options={};
 const icon=name=>`<img class="editor-icon" src="/workshop-ui/editor-icons/${name}.svg" alt="" aria-hidden="true">`;
 const icons={details:'cube',designs:'photo',prices:'tag',profiles:'typography',scene:'photo',production:'settings',shopify:'link'};
 for(const tab of document.querySelectorAll('.editor-tabs [data-tab]'))tab.insertAdjacentHTML('afterbegin',icon(icons[tab.dataset.tab]));
 for(const [selector,name] of [['[data-view=products]','cube'],['[data-view=masters]','files'],['.sidebar a[href="/werkstatt/serien/"]','stack-2'],['.sidebar a[href="/werkstatt/bestellungen/"],.upcoming-orders','shopping-cart'],['#customer-view','eye'],['#save-product','device-floppy']])$(selector)?.insertAdjacentHTML('afterbegin',icon(name));
 for(const b of document.querySelectorAll('.record-aside button'))b.type='button';$('#copy-product').type='button';$('#record-id').after($('#copy-product'));
 const designs=()=>state.draft?.config.profile.designs||[];
 const design=()=>designs().find(d=>d.id===designId);
 const selected=()=>design()?.objects.find(o=>o.id===objectId);
 const label=(o,i)=>design()?.customerFields?.find(f=>f.id===o.id)?.label||objectLabel(o,i);
 const input=(title,key,value,{type='number',step='any',min,max}={})=>`<label>${title}<input data-editor-prop="${key}" type="${type}" ${type==='number'?`step="${step}"`:''} ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} value="${escape(value)}" required></label>`;
 function sync(){
  const disabled=state.busy||state.record?.status==='archived';
  for(const n of document.querySelectorAll('[data-editor-prop],[data-editor-color],[data-editor-photo],[data-editor-hint]'))n.disabled=disabled||selected()?.technicalLocked===true;
  for(const n of document.querySelectorAll('[data-editor-object],[data-editor-design]'))n.disabled=state.busy;
 }
 function elements(){
  $('#editor-elements').innerHTML=(design()?.objects||[]).map((o,i)=>`<button type="button" data-editor-object="${escape(o.id)}" aria-pressed="${o.id===objectId}">${icon(o.type==='text'?'typography':o.type==='photoSlot'?'photo':o.type==='graphic'?'rectangle':'heart')}<span>${escape(label(o,i))}</span>${o.acrylicFixed||o.locked?'<small>fest</small>':''}</button>`).join('');
 }
 function properties(){
  const o=selected(),d=design();elements();
  if(!o){$('#panel-designs').innerHTML='<h3>Designs & Elemente</h3><p>Wähle links ein Element aus.</p>';return;}
  const rights=state.draft.elementRights[d.id][o.id],allowed=availableRights(o);
  const check=(key,text)=>`<label class="element-check"><input type="checkbox" data-element-right="${key}" data-design-id="${escape(d.id)}" data-object-id="${escape(o.id)}" data-right-allowed="${allowed[key]}" ${rights[key]?'checked':''} ${!allowed[key]?'disabled':''}>${text}</label>`;
  let body=`<h3>${escape(label(o,d.objects.indexOf(o)))}</h3>`;
  if(o.type==='text'){
   const fonts=Object.keys(state.draft.config.localResources.fonts);
   body+=`<label>Beispieltext<textarea data-editor-prop="text" rows="3" maxlength="180" required>${escape(o.text)}</textarea></label><label>Schriftart<select data-editor-prop="font">${fonts.map(f=>`<option ${f===o.font?'selected':''}>${escape(f)}</option>`).join('')}</select></label><div class="element-pair">${input('Schriftgröße · mm','size',Math.round(o.size),{step:1,min:1,max:100})}<div class="font-styles"><label><input type="checkbox" data-editor-prop="bold" ${o.bold?'checked':''}> Fett</label><label><input type="checkbox" data-editor-prop="italic" ${o.italic?'checked':''}> Kursiv</label></div></div>`;
  }
  if(['text','motif','graphic'].includes(o.type))body+=`<label class="element-color-label">Ausgewählte Farbe<input type="color" data-editor-prop="color" value="${escape(o.color||'#202824')}"></label><div class="element-colors" role="group" aria-label="Farbvorschläge">${presets.map(c=>`<button type="button" data-editor-color="${c}" style="background:${c}" aria-label="Farbe ${c}" aria-pressed="${c===o.color}"></button>`).join('')}</div>`;
  if(o.type==='photoSlot')body+=`<div class="photo-example-controls"><div id="selected-photo-preview"></div><button type="button" data-editor-photo>Bild ersetzen</button><input id="editor-photo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></div><p id="photo-upload-status" role="status"></p>`;
  body+=`<div class="element-permissions"><h4>Im Konfigurator</h4>${o.type==='text'?check('content','Kunde darf Text ändern'):''}${o.type==='photoSlot'?check('replace','Kunde darf Foto ersetzen'):''}${allowed.color?check('color','Kunde darf Farbe ändern'):''}${check('move','Frei verschiebbar')}${check('scale','Größe veränderbar')}${check('delete','Nach Entsperren löschbar')}${o.acrylicFixed||o.locked?'<p class="field-help">Die Vorlagenfläche bleibt fest. Freigaben für Inhalt und Löschen gelten getrennt.</p>':'<p class="field-help">Für ein festes Textfeld „Frei verschiebbar“ und „Größe veränderbar“ ausschalten. Der Inhalt bleibt nach Freigabe bearbeitbar.</p>'}</div>`;
  if(o.type==='photoSlot'){
   const hint=state.draft.config.photo.hints?.find(h=>h.designId===d.id&&h.slotId===o.id)||{text:'Hier tippen & eigenes Foto hochladen',enabled:true};
   body+=`<div class="photo-hint-settings"><label>Hinweis im Konfigurator<textarea data-editor-hint="text" maxlength="100" rows="2" required>${escape(hint.text)}</textarea></label><label class="element-check"><input type="checkbox" data-editor-hint="enabled" ${hint.enabled?'checked':''}>Beim Beispielfoto anzeigen</label></div>`;
  }
  body+=`<details class="element-geometry"><summary>Position im Design · mm</summary><div class="element-pair">${input('Mitte X','x',o.x,{min:0,max:150})}${input('Mitte Y','y',o.y,{min:0,max:200})}</div>${o.type!=='text'?`<div class="element-pair">${input('Breite','w',o.w,{min:.1,max:150})}${input('Höhe','h',o.h,{min:.1,max:200})}</div>`:''}<p class="field-help">Backend-Vorgabe für die Vorlage. Kundenrechte werden oben getrennt eingestellt.</p></details><div class="source-preserved"><strong>Original und Verlauf erhalten</strong><p>Änderungen gelten für dieses Produkt. Speichern legt einen neuen Stand an; die Mastervorlage bleibt erhalten.</p></div>`;
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
   n.style.cursor='pointer';n.setAttribute('role','button');n.setAttribute('tabindex','0');
   const o=design()?.objects.find(o=>o.id===n.dataset.object);if(o)n.setAttribute('aria-label',label(o,design().objects.indexOf(o))+' auswählen');
   n.setAttribute('aria-pressed',String(chosen));
  }
 }
 async function preview(){
  if(!state.record||!design())return;
  const request=++serial,id=state.record.id;
  $('#stage-status').textContent='Vorschau aktualisiert sich …';$('#stage-price').textContent='';
  try{
   const response=await api(`/api/workshop/products/${encodeURIComponent(id)}/editor-preview`,{method:'POST',body:{expectedRevision:state.record.revision,document:state.draft,designId,options}});
   if(request!==serial||id!==state.record?.id)return;
   $('#editor-preview').innerHTML=response.svg;highlight();photoThumbnail();
   $('#stage-price').textContent=response.price?'Ausführung: '+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(response.price.unitCents/100):'';
   $('#stage-status').textContent=state.dirty?'Entwurf · noch nicht gespeichert':'Gespeicherter Stand';
   $('#editor-preview').classList.remove('preview-updated');void $('#editor-preview').offsetWidth;
   if(state.dirty)$('#editor-preview').classList.add('preview-updated');
  }catch(e){if(request!==serial)return;$('#stage-status').textContent='Vorschau nicht aktuell: '+e.message;}
 }
 function changed(){clearTimeout(timer);++serial;$('#stage-status').textContent='Vorschau aktualisiert sich …';$('#stage-price').textContent='';timer=setTimeout(preview,250);}
 function refreshOptions(useDefaults=false){
  if(!state.draft)return;
  const groups=state.draft.config.profile.optionGroups;
  for(const g of groups)if(useDefaults||!g.values.some(v=>v.id===options[g.id]))options[g.id]=g.defaultValueId;
  const [sizes,bases,walls]=['size','base','wall'].map(id=>groups.find(g=>g.id===id).values);
  $('#stage-options').innerHTML=sizes.flatMap(s=>bases.flatMap(b=>walls.map(w=>`<option value="${escape(s.id+'|'+b.id+'|'+w.id)}" ${options.size===s.id&&options.base===b.id&&options.wall===w.id?'selected':''}>${escape(s.label+' · '+b.label+(w.id==='wall'?' · '+w.label:''))}</option>`))).join('');
 }
 function render(){
  if(!state.record)return;
  if(productId!==state.record.id){productId=state.record.id;designId=state.draft.config.profile.defaultDesignId;objectId=null;options={};}
  if(!design())designId=state.draft.config.profile.defaultDesignId;
  if(!selected())objectId=design()?.objects.find(o=>o.type==='photoSlot')?.id||design()?.objects[0]?.id;
  refreshOptions();
  $('#editor-designs').innerHTML=designs().map(d=>`<button type="button" data-editor-design="${escape(d.id)}" aria-pressed="${d.id===designId}"><img loading="lazy" src="/api/workshop/products/${encodeURIComponent(state.record.id)}/preview.svg?revision=${state.record.revision}&amp;designId=${encodeURIComponent(d.id)}" alt=""><span>${escape(d.name)}</span><small>${d.id===state.draft.config.profile.defaultDesignId?'Standarddesign':'Design'}</small></button>`).join('')+`<button type="button" class="import-design-tile" data-design-action="import" data-design-id="${escape(designId)}">PDF / SVG importieren</button>`;
  // Preserve every existing operation, relocating its card rather than replacing its logic.
  const cards=[...document.querySelectorAll('.record-aside .record-card')];
  for(const card of cards){const target=card.querySelector('#print-export-link')?'#panel-production':'#panel-details';$(target).append(card);}
  properties();clearTimeout(timer);preview();
 }
 const valid=()=>[...$('#panel-designs').querySelectorAll('input,textarea,select')].every(n=>n.disabled||n.reportValidity());
 function select(id){if(!valid())return;objectId=id;showTab('designs');properties();highlight();photoThumbnail();}
 $('#editor-elements').addEventListener('click',e=>{const b=e.target.closest('[data-editor-object]');if(b&&!state.busy)select(b.dataset.editorObject);});
 $('#editor-preview').addEventListener('click',e=>{const n=e.target.closest('[data-object]');if(n&&!state.busy)select(n.dataset.object);});
 $('#editor-preview').addEventListener('keydown',e=>{const n=e.target.closest('[data-object]');if(n&&['Enter',' '].includes(e.key)&&!state.busy){e.preventDefault();select(n.dataset.object);}});
 $('#editor-designs').addEventListener('click',e=>{const b=e.target.closest('[data-editor-design]');if(!b||state.busy||!valid())return;designId=b.dataset.editorDesign;objectId=null;showTab('designs');render();});
 $('#stage-options').addEventListener('change',()=>{[options.size,options.base,options.wall]=$('#stage-options').value.split('|');changed();});
 $('#panel-designs').addEventListener('input',e=>{
  const n=e.target,key=n.dataset.editorProp,o=selected();
  if(n.dataset.editorHint&&o&&!state.busy&&state.record.status!=='archived'){const d=design();state.draft.config.photo.hints??=[];let h=state.draft.config.photo.hints.find(h=>h.designId===d.id&&h.slotId===o.id);if(!h){h={designId:d.id,slotId:o.id,text:'Hier tippen & eigenes Foto hochladen',enabled:true};state.draft.config.photo.hints.push(h);}h[n.dataset.editorHint]=n.type==='checkbox'?n.checked:n.value;markDirty();return;}
  if(!key||!o||state.busy||state.record.status==='archived'||o.technicalLocked)return;
  if(n.type==='number'&&(!Number.isFinite(n.valueAsNumber)||!n.checkValidity()))return;
  o[key]=n.type==='checkbox'?n.checked:n.type==='number'?n.valueAsNumber:n.value;
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
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${o.w}mm" height="${o.h}mm" viewBox="0 0 ${o.w} ${o.h}"><image href="${data}" width="${o.w}" height="${o.h}" preserveAspectRatio="xMidYMid slice"/></svg>`;
   const asset=await api('/api/workshop/design-assets/import',{method:'POST',body:{name:'Beispielfoto.svg',bytes:btoa(svg),page:1}});
   const resources=state.draft.config.localResources;resources.photoExamples=(resources.photoExamples||[]).filter(v=>v.designId!==d.id||v.slotId!==o.id);
   resources.photoExamples.push({designId:d.id,slotId:o.id,assetId:asset.assetId});markDirty();status.textContent='Beispielfoto übernommen. Änderungen noch speichern.';
  }catch(err){status.textContent=err.message;}finally{state.busy=false;syncControls();e.target.value='';}
 });
 $('#panel-designs').addEventListener('click',e=>{if(e.target.closest('[data-editor-photo]')){if(!state.busy&&state.record.status!=='archived')$('#editor-photo-file').click();return;}const b=e.target.closest('[data-editor-color]');if(!b||b.disabled)return;const n=$('[data-editor-prop="color"]');n.value=b.dataset.editorColor;n.dispatchEvent(new Event('input',{bubbles:true}));for(const c of document.querySelectorAll('[data-editor-color]'))c.setAttribute('aria-pressed',String(c===b));});
 return {render,changed,sync,refreshOptions,inspect(){properties();photoThumbnail();},prepare(){for(const card of document.querySelectorAll("#product-form .record-card"))$(".record-aside").append(card);}};
}
