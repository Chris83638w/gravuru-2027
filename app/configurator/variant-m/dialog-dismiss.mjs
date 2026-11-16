// Delegate once: dialogs added later (photo, logo, design preview) behave alike.
export function installDialogDismissal(root){
 let pressed=null;
 const outside=(event,dialog)=>{
  if(event.target!==dialog)return false;
  const b=dialog.getBoundingClientRect();
  return event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom;
 };
 root.addEventListener('pointerdown',event=>{
  const dialog=event.target.closest?.('dialog[open]');
  pressed=event.button===0&&dialog&&outside(event,dialog)?dialog:null;
 },true);
 root.addEventListener('pointercancel',()=>{pressed=null;},true);
 root.addEventListener('click',event=>{
  const dialog=pressed;pressed=null;
  // A drag starting inside the dialog must never dismiss it on release.
  if(!dialog?.open||!outside(event,dialog))return;
  event.preventDefault();event.stopImmediatePropagation();dialog.close();
 },true);
}
