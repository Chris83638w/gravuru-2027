// First entry into each text field selects the example. Later clicks keep normal caret editing.
export function installFirstTextFocus({el,r}){
 const visited=new Set();let pendingPointer=null;
 const field=e=>e.target.closest?.('[data-ux-text]');
 const key=f=>el.state.designId+'\0'+f.dataset.uxText;
 const select=f=>{if(f.isConnected&&r.activeElement===f&&!f.disabled&&!f.readOnly)f.setSelectionRange(0,f.value.length);};
 r.addEventListener('pointerdown',e=>{const f=field(e);pendingPointer=f&&e.button===0&&!visited.has(key(f))?f:null;},true);
 r.addEventListener('focusin',e=>{const f=field(e);if(!f||f.disabled||f.readOnly||visited.has(key(f)))return;visited.add(key(f));queueMicrotask(()=>select(f));requestAnimationFrame(()=>select(f));});
 r.addEventListener('pointerup',e=>{const f=field(e);if(f&&f===pendingPointer){e.preventDefault();select(f);}},true);
 r.addEventListener('click',e=>{if(pendingPointer&&field(e)===pendingPointer)select(pendingPointer);pendingPointer=null;},true);
 r.addEventListener('pointercancel',()=>pendingPointer=null,true);
}
