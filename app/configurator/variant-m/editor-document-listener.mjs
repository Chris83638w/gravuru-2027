// The document outlives an editor mounted in a product modal. Never retain a
// removed editor through its outside-click handler, including repeated installs.
const installed=new WeakMap();
export function installEditorOutsidePointer(el,onOutside){
 const doc=el.ownerDocument||document,win=doc.defaultView;
 installed.get(el)?.();
 let disposed=false;
 const dispose=()=>{
  if(disposed)return;disposed=true;
  doc.removeEventListener('pointerdown',pointer);
  win?.removeEventListener('pagehide',pagehide);
  observer.disconnect();
  if(installed.get(el)===dispose)installed.delete(el);
 };
 const pointer=e=>{if(!el.isConnected){dispose();return;}if(!e.composedPath().includes(el))onOutside(e);};
 const pagehide=e=>{if(!e.persisted)dispose();};
 const Observer=win?.MutationObserver||MutationObserver;
 const observer=new Observer(()=>{if(!el.isConnected)dispose();});
 installed.set(el,dispose);
 if(!el.isConnected){dispose();return dispose;}
 doc.addEventListener('pointerdown',pointer);
 win?.addEventListener('pagehide',pagehide);
 observer.observe(doc.documentElement,{childList:true,subtree:true});
 return dispose;
}
