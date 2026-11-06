// Reset artwork through the original template loader, without transferring edits.
// Retain file objects so the existing Undo action can restore an uploaded photo.
export function resetOriginalDesign({el,choose,decorate}){
 el.uxCancelObjectGesture?.();el.uxCancelPhotoGesture?.();
 choose.call(el,el.state.designId,{carry:false});
 el.state.uxDecorationsFor=null;decorate();el.state.selected=null;el.sync();
}

export function installDesignReset({el,r,config,dialog,button,design,reset,say}){
 if(config?.workbench)return;
 const bar=document.createElement('div');bar.className='ux-design-reset';
 bar.innerHTML=button('reset-design','Zurücksetzen');
 r.querySelector('.stage').append(bar);
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
