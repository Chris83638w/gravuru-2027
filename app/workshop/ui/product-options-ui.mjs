// Edits the existing optionGroups in the product draft; prices stay in acrylic.pricing.
const $=s=>document.querySelector(s);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installProductOptions({state,api,markDirty,syncControls,previewOptions}){
 let catalog,request=0,rememberedId,remembered=new Map();
 function sync(){
  for(const n of document.querySelectorAll('[data-variant-value],[data-variant-default]')){
   const g=state.draft?.config.profile.optionGroups.find(g=>g.id===(n.dataset.variantGroup||n.dataset.variantDefault));
   n.disabled=state.busy||state.record?.status==='archived'||!!(n.dataset.variantValue&&n.checked&&g?.values.length===1);
  }
 }
 function content(message=''){
  const host=$('#product-options');if(!host||!catalog)return;
  const groups=state.draft.config.profile.optionGroups;
  if(rememberedId!==state.record.id+':'+state.record.revision){rememberedId=state.record.id+':'+state.record.revision;remembered=new Map();}
  for(const g of groups)for(const v of g.values)remembered.set(g.id+':'+v.id,structuredClone(v));
  host.innerHTML='<h3>Varianten im Konfigurator</h3><p>Lege fest, was Kunden wählen können und womit sie starten. Änderungen gelten nach dem Speichern.</p>'+catalog.map(source=>{
   const g=groups.find(g=>g.id===source.id);if(!g)return '';
   return `<fieldset class="variant-group"><legend>${escape(g.name)}</legend><div class="variant-choices">${source.values.map(v=>{const current=g.values.find(item=>item.id===v.id);return `<label class="variant-choice"><input type="checkbox" data-variant-group="${escape(g.id)}" data-variant-value="${escape(v.id)}" ${current?'checked':''}><span>${escape(current?.label||v.label)}</span></label>`;}).join('')}</div><label class="variant-default">Startauswahl<select data-variant-default="${escape(g.id)}" aria-label="Startauswahl ${escape(g.name)}">${g.values.map(v=>`<option value="${escape(v.id)}" ${v.id===g.defaultValueId?'selected':''}>${escape(v.label)}</option>`).join('')}</select></label></fieldset>`;
  }).join('')+'<p class="field-help">Mindestens eine Auswahl je Bereich bleibt erhalten. Ohne Sockel kostet keinen Aufpreis. Ist ausschließlich die Wandhalterung freigegeben, gehört sie fest zur Ausführung. Die Preise folgen dem Preisprofil unten.</p><p id="variant-status" role="status" aria-live="polite">'+escape(message)+'</p>';
  sync();
 }
 async function render(){
  const host=$('#product-options');if(!host)return;const serial=++request,id=state.record.id;
  host.innerHTML='<p>Verfügbare Varianten werden geladen …</p>';
  try{catalog??=(await api('/api/workshop/variant-catalog')).groups;if(serial!==request||state.record?.id!==id)return;content();syncControls();}
  catch(e){if(serial===request)host.innerHTML='<p role="alert">Varianten konnten nicht geladen werden: '+escape(e.message)+'. Produkt erneut öffnen, um es noch einmal zu versuchen.</p>';}
 }
 $('#panel-prices').addEventListener('change',e=>{
  const n=e.target,id=n.dataset.variantGroup||n.dataset.variantDefault;if(!id||state.busy||state.record?.status==='archived')return;
  const g=state.draft.config.profile.optionGroups.find(g=>g.id===id),source=catalog?.find(g=>g.id===id);if(!g||!source)return;
  let message='Startauswahl geändert. Vorschau aktualisiert; noch nicht gespeichert.';
  if(n.dataset.variantValue){
   const value=n.dataset.variantValue;
   if(!source.values.some(v=>v.id===value))return;
   if(n.checked&&!g.values.some(v=>v.id===value)){g.values.push(structuredClone(remembered.get(id+':'+value)||source.values.find(v=>v.id===value)));g.values.sort((a,b)=>source.values.findIndex(v=>v.id===a.id)-source.values.findIndex(v=>v.id===b.id));}
   else if(!n.checked){if(g.values.length===1){n.checked=true;sync();return;}g.values=g.values.filter(v=>v.id!==value);}
   message='Verfügbare Varianten geändert; noch nicht gespeichert.';
   if(!g.values.some(v=>v.id===g.defaultValueId)){g.defaultValueId=g.values[0].id;message='Startauswahl für '+g.name+' ist jetzt „'+g.values[0].label+'“, weil die bisherige Auswahl entfernt wurde. Noch nicht gespeichert.';}
  }else{if(!g.values.some(v=>v.id===n.value))return;g.defaultValueId=n.value;}
  if(id==='wall')g.required=!g.values.some(v=>v.id==='none');
  content(message);previewOptions();markDirty();syncControls();
  const selector=n.dataset.variantValue?'[data-variant-group="'+id+'"][data-variant-value="'+n.dataset.variantValue+'"]':'[data-variant-default="'+id+'"]';
  const focus=$('#product-options').querySelector(selector);if(focus&&!focus.disabled)focus.focus({preventScroll:true});
 });
 return {render,sync};
}
