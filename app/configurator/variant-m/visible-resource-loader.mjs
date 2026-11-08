// Only rows in the actual scrolling viewport are requested. Metadata stays complete;
// real contours still pass through the existing font/motif loaders before selection.
export function createVisibleResourceQueue({load,ready=()=>false,changed=()=>{},concurrency=2,maxPending=12}){
 const pending=new Map(),failed=new Set(),completed=new Set();let wanted=[],running=0,stopped=false;
 function pump(){
  if(stopped)return;
  while(running<concurrency){
   const key=wanted.find(k=>!ready(k)&&!pending.has(k)&&!failed.has(k)&&!completed.has(k));if(!key)break;
   running++;const task=Promise.resolve().then(()=>load(key));pending.set(key,task);
   task.then(()=>{completed.add(key);changed(key);}).catch(()=>failed.add(key)).finally(()=>{running--;pending.delete(key);pump();});
  }
 }
 return {request(keys,{retry=false}={}){if(retry){failed.clear();for(const key of completed)if(!ready(key))completed.delete(key);}wanted=[...new Set(keys)].filter(k=>typeof k==='string'&&k).slice(0,maxPending);pump();},stop(){stopped=true;wanted=[];},get pending(){return pending.size;}};
}

export function observeVisibleResources({root,selector,key,load,ready,changed,win=globalThis}){
 const rows=new Set(),visible=new Set();let scheduled=false,closed=false;
 const queue=createVisibleResourceQueue({load,ready,changed:()=>{if(closed||scheduled)return;scheduled=true;const callback=()=>{scheduled=false;if(!closed)changed?.();};if(win.requestAnimationFrame)win.requestAnimationFrame(callback);else win.setTimeout(callback,0);}});
 const flush=(retry=false)=>queue.request([...visible].filter(row=>row.isConnected!==false).map(key),{retry});
 const observer=typeof win.IntersectionObserver==='function'?new win.IntersectionObserver(records=>{
  for(const entry of records){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}flush();
 },{root:null,rootMargin:'48px',threshold:0}):null;
 function refresh({retry=false}={}){
  if(closed)return;
  const current=new Set(root.querySelectorAll(selector));
  for(const row of rows)if(!current.has(row)){observer?.unobserve(row);rows.delete(row);visible.delete(row);}
  for(const row of current){if(!rows.has(row)){rows.add(row);observer?.observe(row);}
   if(!observer){const box=row.getBoundingClientRect?.();if(box&&box.width>0&&box.height>0&&box.bottom>0&&box.top<(win.innerHeight||0))visible.add(row);else visible.delete(row);}}
  flush(retry);
 }
 const mutations=typeof win.MutationObserver==='function'?new win.MutationObserver(()=>refresh()):null;
 mutations?.observe(root,{childList:true,subtree:true});
 root.addEventListener?.('scroll',refresh,true);refresh();
 return {refresh,disconnect(){closed=true;queue.stop();observer?.disconnect();mutations?.disconnect();root.removeEventListener?.('scroll',refresh,true);}};
}
