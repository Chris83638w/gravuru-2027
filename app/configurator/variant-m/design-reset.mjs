// Reset artwork through the original template loader, without transferring edits.
// Retain file objects so the existing Undo action can restore an uploaded photo.
export function resetOriginalDesign({el,choose,decorate}){
 el.uxCancelObjectGesture?.();el.uxCancelPhotoGesture?.();
 choose.call(el,el.state.designId,{carry:false});
 el.state.uxDecorationsFor=null;decorate();el.state.selected=null;el.sync();
}

export function installDesignReset({el,r,config,dialog,button,design,reset,say}){
 if(config?.workbench)return;
 const stage=r.querySelector('.stage'),preview=r.querySelector('.ux-preview'),full=r.querySelector('.c-large-preview');
 if(!stage||!preview)return;
 const bar=document.createElement('div');bar.className='ux-design-reset';
 bar.innerHTML=button('reset-design','Zurücksetzen');
 // The plate is fitted to the whole stage. A second flex item in that same
 // row pushes narrow products and their dimension labels outside the viewport.
 // Keep the original control in its separate row, also while the native
 // fullscreen dialog moves the stage out of the regular preview and back.
 const place=()=>{
  const expanded=!!full?.open&&full.contains(stage);
  // The existing sheet layout owns its normal control row and restores the
  // original stage parent in fullscreen (including its compact proxy rules).
  if(el.dataset?.mobileDemo){if(expanded&&bar.parentNode!==stage)stage.append(bar);return;}
  const home=expanded?stage.parentNode:preview,anchor=expanded?stage:r.querySelector('[data-ux-stage]');
  if(anchor?.parentNode===home){if(anchor.nextSibling!==bar)anchor.after(bar);}
  else if(bar.parentNode!==home)home.append(bar);
 };
 place();
 if(full){
  if(typeof MutationObserver==='function')new MutationObserver(place).observe(full,{attributes:true,attributeFilter:['open']});
  full.addEventListener('close',place);
 }
 const confirmation=dialog('reset-design','Gestaltung zurücksetzen?',
  '<p>Das gewählte Design <strong data-reset-design-name></strong> wird auf die Originalvorlage zurückgesetzt. Deine Textänderungen, Fotos und hinzugefügten Motive werden entfernt. Größe und Ausführung bleiben erhalten.</p><div class="ux-actions">'+button('reset-design-cancel','Abbrechen')+button('reset-design-confirm','Ja, zurücksetzen','class="ux-primary"')+'</div>');
 let pending=null;
 bar.querySelector('button').addEventListener('click',()=>{pending=el.state.designId;confirmation.querySelector('[data-reset-design-name]').textContent=design()?.name||'';confirmation.showModal();});
 confirmation.querySelector('[data-ux=reset-design-cancel]').addEventListener('click',()=>confirmation.close());
 confirmation.querySelector('[data-ux=reset-design-confirm]').addEventListener('click',()=>{
  if(!confirmation.open||pending!==el.state.designId)return;
  try{reset();confirmation.close();say('Originalvorlage wiederhergestellt.');}catch(error){say(error.message);}
 });
}
