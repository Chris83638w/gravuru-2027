import {PHOTO_UNSUPPORTED_MESSAGE} from './design-content-transfer.mjs';

// Chris 13.11.2026: Hat das gewählte Produkt keine Fotofunktion, erfährt der Kunde vor dem
// Designwechsel, dass sein Foto entfernt wird, und entscheidet selbst (Design übernehmen / Abbrechen).
export const isPhotoUnsupported=error=>error?.code==='photo-unsupported'||error?.message===PHOTO_UNSUPPORTED_MESSAGE;

export function createPhotoDropConfirm(dialog){
 let box=null,answer=null;
 const finish=value=>{const done=answer;answer=null;if(box?.open)box.close();done?.(value);};
 return function confirmPhotoDrop(){
  if(!box){
   box=dialog('photo-drop','Achtung: keine Fotofunktion','<p>'+PHOTO_UNSUPPORTED_MESSAGE+' Deine Texte werden übernommen.</p><div class="ux-actions"><button type="button" data-ux="photo-drop-cancel">Abbrechen</button><button type="button" class="ux-primary" data-ux="photo-drop-confirm">Design übernehmen</button></div>');
   box.addEventListener('click',event=>{
    if(event.target.closest('[data-ux=photo-drop-confirm]'))finish(true);
    else if(event.target.closest('[data-ux=photo-drop-cancel]'))finish(false);
   });
   box.addEventListener('close',()=>finish(false));
  }
  finish(false);
  return new Promise(resolve=>{answer=resolve;box.showModal();});
 };
}
