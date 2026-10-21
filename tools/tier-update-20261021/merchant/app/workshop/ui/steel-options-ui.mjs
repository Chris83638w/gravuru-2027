import {enableSteelFormats,steelSizeGroup,resizeSteelDocument,validateSteelFormats} from '../../configurator/variant-m/steel-formats.mjs';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installSteelOptions({state,api,markDirty,renderEditor,notify}){
 let owner='',pendingGeometry=null,pendingSizes=null;
 const available=()=>state.draft?.config.profile.material.kind==='steel'&&!state.draft.config.doorbell;
 const input=(label,key,value,min=0,max=2000)=>`<label>${label}<input data-steel-geometry="${key}" type="number" min="${min}" max="${max}" step="any" value="${value}" required></label>`;
 function render(){
  if(!available())return;
  const identity=state.record.id+':'+state.record.revision;if(owner!==identity){owner=identity;pendingGeometry=null;pendingSizes=null;}
  const c=state.draft.config,g=c.profile.geometry,formats=steelSizeGroup(c),rows=pendingSizes?.values||formats?.values||[{id:'size-original',widthMm:g.width,heightMm:g.height,priceCents:c.basePriceCents}],defaultId=pendingSizes?.defaultValueId||formats?.defaultValueId||'size-original';
  $('#panel-details').insertAdjacentHTML('afterbegin',`<section id="steel-geometry" class="form-section"><h3>Schildgröße & Form</h3><p>Grundform der Gestaltung. Alle Designs werden proportional eingepasst; Texte, Motive und Fotoformen bleiben einzeln bearbeitbar.</p><label>Form<select data-steel-geometry="shape"><option value="rect" ${g.shape==='rect'&&!g.cornerRadiusMm?'selected':''}>Rechteck</option><option value="rounded" ${g.shape==='rect'&&g.cornerRadiusMm?'selected':''}>Abgerundetes Rechteck</option><option value="ellipse" ${g.shape==='ellipse'?'selected':''}>Oval / Kreis</option></select></label><div class="form-grid">${input('Breite · mm','width',g.width,10)}${input('Höhe · mm','height',g.height,10)}${input('Eckenradius · mm','cornerRadiusMm',g.cornerRadiusMm||0)}${input('Gewünschter Randabstand · mm','safeMarginMm',g.safeMarginMm??2)}</div><p class="field-help">Für einen Kreis gleiche Breite und Höhe wählen. Der Preis wird nicht automatisch aus der Fläche berechnet.</p><button type="button" data-steel-refit>Form übernehmen & Designs einpassen</button><button type="button" data-steel-no-margin>Ohne Rand neu einpassen</button><p data-steel-status role="status"></p></section>`);
  $('#panel-prices').insertAdjacentHTML('afterbegin',`<section id="steel-sizes" class="form-section"><h3>Verfügbare Schildgrößen</h3><p>Jede Größe hat einen eigenen Grundpreis. Das Design und die Form behalten ihre Proportionen. Breite ändern – die Höhe folgt automatisch. Andere Proportionen unter „Produkt → Schildgröße & Form“ festlegen.</p>${rows.map(v=>`<div class="steel-size-row" data-steel-row="${esc(v.id)}"><label>Breite · mm<input data-steel-width type="number" min="10" max="2000" step="any" value="${v.widthMm}" required></label><span data-steel-height>Höhe: ${Number(v.heightMm.toFixed(3))} mm</span><label>Preis · €<input data-steel-price type="text" inputmode="decimal" value="${esc(v.priceText??(v.priceCents/100).toFixed(2).replace('.',','))}" required pattern="[0-9]+([.,][0-9]{1,2})?"></label><label><input type="radio" name="steel-default" data-steel-default ${v.id===defaultId?'checked':''}> Startauswahl</label><button type="button" data-steel-remove ${rows.length===1?'disabled':''}>Entfernen</button></div>`).join('')}<button type="button" data-steel-add>+ Größe hinzufügen</button><button type="button" data-steel-save>Größen übernehmen</button><p data-steel-size-status role="status"></p></section>`);
  if(pendingGeometry)for(const n of $('#steel-geometry').querySelectorAll('[data-steel-geometry]'))n.value=pendingGeometry[n.dataset.steelGeometry];
 }
 function captureSizes(){
  const g=state.draft.config.profile.geometry,rows=[...$('#steel-sizes').querySelectorAll('[data-steel-row]')];
  return {values:rows.map(row=>({id:row.dataset.steelRow,widthMm:Number(row.querySelector('[data-steel-width]').value),heightMm:Number(row.querySelector('[data-steel-width]').value)*g.height/g.width,priceText:row.querySelector('[data-steel-price]').value})),defaultValueId:rows.find(row=>row.querySelector('[data-steel-default]').checked)?.dataset.steelRow};
 }
 function captureGeometry(){return Object.fromEntries([...$('#steel-geometry').querySelectorAll('[data-steel-geometry]')].map(n=>[n.dataset.steelGeometry,n.tagName==='SELECT'?n.value:Number(n.value)]));}
 function rowsToConfig(){
  const next=structuredClone(state.draft);enableSteelFormats(next.config);const group=steelSizeGroup(next.config),g=next.config.profile.geometry;
  const rows=[...$('#steel-sizes').querySelectorAll('[data-steel-row]')];
  if(rows.length>40)throw Error('Höchstens 40 Größen pro Schild.');
  group.values=rows.map(row=>{const width=Number(row.querySelector('[data-steel-width]').value),price=row.querySelector('[data-steel-price]').value.trim();
   if(!/^[0-9]+([.,][0-9]{1,2})?$/.test(price))throw Error('Bitte für jede Größe einen Preis mit höchstens zwei Nachkommastellen eintragen.');
   const height=width*g.height/g.width;
   return {id:row.dataset.steelRow,label:`${Number(width.toFixed(3))} × ${Number(height.toFixed(3))} mm`,widthMm:width,heightMm:height,priceCents:Math.round(Number(price.replace(',','.'))*100),currency:'EUR'};
  });
  group.defaultValueId=rows.find(row=>row.querySelector('[data-steel-default]').checked)?.dataset.steelRow||group.values[0]?.id;
  next.config.basePriceCents=group.values.find(v=>v.id===group.defaultValueId)?.priceCents;
  validateSteelFormats(next.config);return next;
 }
 function changed(e){
  if(!available())return;
  if(e.target.matches('[data-steel-geometry]'))pendingGeometry=captureGeometry();
  else if(e.target.closest('#steel-sizes')){
   if(e.target.matches('[data-steel-width]'))e.target.closest('[data-steel-row]').querySelector('[data-steel-height]').textContent=`Höhe: ${Number((Number(e.target.value)*state.draft.config.profile.geometry.height/state.draft.config.profile.geometry.width).toFixed(3))} mm`;
   pendingSizes=captureSizes();
  }else return;
  markDirty();
 }
 document.addEventListener('input',changed);document.addEventListener('change',changed);
 async function applyPending(){
  if(!available()||!pendingGeometry&&!pendingSizes)return;
  let next=pendingSizes?rowsToConfig():structuredClone(state.draft);
  if(pendingGeometry){const fields={...pendingGeometry};if(fields.shape!=='rounded')fields.cornerRadiusMm=0;else{fields.shape='rect';if(!fields.cornerRadiusMm)fields.cornerRadiusMm=Math.min(fields.width,fields.height)*.08;}next=resizeSteelDocument(next,fields);}
  await api(`/api/workshop/products/${state.record.id}/editor-preview`,{method:'POST',body:{expectedRevision:state.record.revision,document:next,designId:next.config.profile.defaultDesignId,options:{}}});
  state.draft=next;pendingGeometry=null;pendingSizes=null;markDirty();renderEditor();
 }
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-steel-refit],[data-steel-save],[data-steel-add],[data-steel-remove],[data-steel-no-margin]');if(!b||state.busy||!available()||state.record.status==='archived')return;
  const sizePanel=!!b.closest('#steel-sizes'),status=$(sizePanel?'[data-steel-size-status]':'[data-steel-status]');
  if(b.hasAttribute('data-steel-add')){
   const rows=$('#steel-sizes').querySelectorAll('[data-steel-row]');if(rows.length>=40){status.textContent='Höchstens 40 Größen.';return;}
   const row=rows[rows.length-1].cloneNode(true);row.dataset.steelRow='size-'+crypto.randomUUID();row.querySelector('[data-steel-price]').value='';row.querySelector('[data-steel-default]').checked=false;row.querySelector('[data-steel-remove]').disabled=false;b.before(row);row.querySelector('input').focus();pendingSizes=captureSizes();markDirty();return;
  }
  if(b.hasAttribute('data-steel-remove')){if($('#steel-sizes').querySelectorAll('[data-steel-row]').length>1)b.closest('[data-steel-row]').remove();pendingSizes=captureSizes();markDirty();return;}
  state.busy=true;b.disabled=true;status.textContent='Maße und Gestaltung werden geprüft …';
  try{
   if(sizePanel)pendingSizes=captureSizes();else {if(b.hasAttribute('data-steel-no-margin'))$('#steel-geometry [data-steel-geometry="safeMarginMm"]').value='0';pendingGeometry=captureGeometry();}
   await applyPending();state.busy=false;renderEditor();notify('Übernommen. Bitte Änderungen speichern; vorhandene Stände bleiben erhalten.');
  }catch(error){state.busy=false;b.disabled=false;status.textContent=error.message;}
 });
 return {render,applyPending,reset(){owner="";pendingGeometry=null;pendingSizes=null;}};
}
