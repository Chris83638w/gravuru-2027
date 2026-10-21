// Display-only, brief feedback after content changes. Never part of the design or its export.
export function installPreviewFeedback({el,r}){
 const stage=r.querySelector('.stage'),mini=r.querySelector('[data-mini-art]');
 const css=document.createElement('style');css.textContent='.stage.ux-preview-changed::after,[data-mini-art].ux-preview-changed::after{content:"";position:absolute;inset:0;border:3px solid #388467;border-radius:inherit;box-sizing:border-box;z-index:200;pointer-events:none}.ux-mini [data-mini-art]{position:relative;overflow:hidden;border-radius:5px}.ux-mini .ux-mini-scene svg svg{width:revert!important;height:revert!important;max-height:none!important;min-height:0!important}@media(max-width:900px){.ux-shell .ux-mini:not([hidden]){height:176px!important}.ux-mini [data-mini-art]{width:142px!important;height:164px!important}.ux-shell[data-mini-visible=true] .ux-tabbar{top:176px!important}.ux-shell[data-mini-visible=true] .ux-panel{scroll-margin-top:242px}}';r.append(css);
 let ready=false,pending=null,clear=null,lastEvent=0;
 const key=()=>JSON.stringify([el.state.designId,el.state.objects,el.state.mOptions]);let previous=key();
 const live=document.createElement('span');live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';r.append(live);
 function pulse(){pending=null;stage.classList.add('ux-preview-changed');mini?.classList.add('ux-preview-changed');live.textContent='Designvorschau aktualisiert.';clearTimeout(clear);clear=setTimeout(()=>{stage.classList.remove('ux-preview-changed');mini?.classList.remove('ux-preview-changed');live.textContent='';},1600);}
 function check(){if(!ready)return;const next=key();if(next===previous)return;previous=next;clearTimeout(pending);pending=setTimeout(pulse,250);}
 // Run after existing handlers too: some legacy capture listeners update state
 // before later capture listeners receive the same input event.
 for(const type of ['input','change','click','pointerdown','pointerup','keydown','drop'])r.addEventListener(type,e=>{if(e.isTrusted){lastEvent=performance.now();queueMicrotask(check);}},true);
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);if(lastEvent>0&&performance.now()-lastEvent<2500)check();return result;};
 requestAnimationFrame(()=>{previous=key();ready=true;});
 window.addEventListener('pagehide',()=>{clearTimeout(pending);clearTimeout(clear);},{once:true});
}
// Same complete acrylic scene in the existing upper-left thumbnail, including base.
export function completePreviewMini(stage,holder){
 const rect=stage.getBoundingClientRect(),W=142,H=164,scale=Math.min(W/rect.width,H/rect.height),copy=document.createElement('div');
 copy.className='ux-mini-scene';copy.setAttribute('aria-hidden','true');copy.inert=true;
 for(const source of stage.children){
  if(!source.matches('.acryl-backdrop,.plate-holder,.acryl-base')||source.hidden)continue;
  const node=source.cloneNode(true),bounds=source.getBoundingClientRect(),css=source.ownerDocument.defaultView.getComputedStyle(source);
  node.className=source.matches('.plate-holder')?'ux-mini-plate':'ux-mini-image';
  node.querySelectorAll('.object-controls,.dimension-x,.dimension-y,[data-resize]').forEach(n=>n.remove());
  // The example photo itself is preview-only too: keep it, omit its upload label.
  for(const n of node.querySelectorAll('[data-preview-only]')){if(n.querySelector('image'))n.querySelectorAll('g[transform]').forEach(h=>h.remove());else n.remove();}
  for(const n of node.querySelectorAll('[data-direct-active]')){n.style.visibility='';delete n.dataset.directActive;}
  for(const n of node.querySelectorAll('[data-object],[tabindex],[data-ux]'))for(const a of ['data-object','tabindex','data-ux'])n.removeAttribute(a);
  const svg=node.querySelector('svg.scene');if(svg){svg.removeAttribute('data-ux-namespace');svg.classList.remove('scene');svg.classList.add('ux-mini-artwork');svg.style.cssText='display:block;width:100%!important;height:100%!important;max-height:none!important;background:transparent;overflow:visible';}
  node.style.cssText='position:absolute;left:'+(bounds.left-rect.left)+'px;top:'+(bounds.top-rect.top)+'px;width:'+bounds.width+'px;height:'+bounds.height+'px;margin:0;padding:0;max-width:none;z-index:'+css.zIndex+';pointer-events:none';copy.append(node);
 }
 holder.style.setProperty('width',rect.width*scale+'px','important');holder.style.setProperty('height',rect.height*scale+'px','important');
 copy.style.cssText='position:absolute;width:'+rect.width+'px;height:'+rect.height+'px;top:0;left:0;transform:scale('+scale+');transform-origin:top left;pointer-events:none;overflow:hidden;border-radius:12px';
 return copy;
}
