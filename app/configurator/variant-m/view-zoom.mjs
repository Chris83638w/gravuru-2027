import {fitView,constrainView,zoomViewAt,fitViewFrame,viewLayerStyle,interpolateView,createViewGesture} from './view-zoom-model.mjs';

// View state belongs only to this UI, never to saved objects, production or undo.
export async function installViewZoom({el,r,selected}){
 const stage=r.querySelector('.stage'),holder=r.querySelector('.plate-holder');if(!stage||!holder)return null;
 const response=await fetch('/configurator/variant-m/view-zoom.css');if(!response.ok)throw Error('Ansichtszoom konnte nicht geladen werden.');
 const style=document.createElement('style');style.textContent=await response.text();r.append(style);
 // Mikail 05.11.2026: zoom only through this slider, on every device.
 stage.dataset.viewZoom='1';
 const controlBar=document.createElement('label');controlBar.className='ux-view-zoom';controlBar.innerHTML='<span>Ansicht</span><input type="range" min="1" max="4" step=".01" value="1" aria-label="Ansicht vergrößern"><output>100 %</output>';stage.append(controlBar);
 const zoomSlider=controlBar.querySelector('input'),zoomValue=controlBar.querySelector('output');
 zoomSlider.addEventListener('input',()=>{cancelAnimation();manual(zoomViewAt(view,Number(zoomSlider.value),center(),bounds));});
 let view=fitView(),bounds=null,layers=[],pending=0,suppressUntil=0,refreshing=false;
 let animationFrame=0,animationEpoch=0;
 const mobile=()=>matchMedia('(max-width:767px)').matches;
 function cancelAnimation(){animationEpoch++;if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;}
 function animate(next){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){change(next);return;}
  const from={...view},epoch=animationEpoch;let began=null;
  const step=now=>{if(epoch!==animationEpoch)return;if(began===null)began=now;const progress=Math.min(1,(now-began)/250);change(interpolateView(from,next,progress));animationFrame=progress<1?requestAnimationFrame(step):0;};
  animationFrame=requestAnimationFrame(step);
 }
 const identity=()=>JSON.stringify([el.state.designId,el.state.width,el.state.height]);let product=identity();
 const photoActive=()=>!!el.uxPhotoPositionActive?.(selected());
 const center=()=>({x:bounds.viewport.x+bounds.viewport.width/2,y:bounds.viewport.y+bounds.viewport.height/2});
 function paint(){
  if(!bounds)return;
  for(const {node,box} of layers){const style=viewLayerStyle(view,bounds,box);node.style.setProperty('transform-origin','0 0','important');node.style.setProperty('transform',style.transform,'important');node.style.setProperty('clip-path',style.clipPath,'important');}
  stage.dataset.viewZoom=String(view.scale);zoomSlider.value=String(view.scale);zoomValue.textContent=Math.round(view.scale*100)+' %';
  el.uxRefreshSelectionHandles?.();el.uxRefreshTextToolbar?.();el.uxRefreshOverlapNote?.();
 }
 function change(next){view=constrainView(next,bounds);paint();}
 function manual(next){change(next);}
 function fit(smooth=false){cancelAnimation();resetGestures();smooth?animate(fitView()):change(fitView());}
 function refresh(){
  pending=0;if(refreshing)return;refreshing=true;
  try{
   const nodes=[...stage.querySelectorAll(':scope > .plate-holder,:scope > .acryl-backdrop,:scope > .acryl-base')];if(!nodes.includes(holder))nodes.push(holder);
   for(const node of nodes)node.style.setProperty('transform','none','important');
   const sr=stage.getBoundingClientRect(),box=node=>{const b=node.getBoundingClientRect();return {x:b.left-sr.left,y:b.top-sr.top,width:b.width,height:b.height};};
   const heading=r.querySelector('.ux-heading')?.getBoundingClientRect(),covered=mobile()&&!stage.closest?.('.c-large-preview')&&heading?Math.max(0,Math.min(sr.height,heading.bottom-sr.top)):0;stage.style.setProperty('--ux-view-safe-top',covered+'px');
   bounds=fitViewFrame(box(holder),{width:sr.width,height:sr.height});layers=nodes.map(node=>({node,box:box(node)}));
   if(product!==identity()){cancelAnimation();product=identity();view=fitView();resetGestures();}
   view=constrainView(view,bounds);paint();
  }finally{refreshing=false;}
 }
 const schedule=()=>{if(!pending)pending=requestAnimationFrame(refresh);};
 const cancelObject=()=>{el.uxCancelObjectGesture?.();el.uxCancelPhotoGesture?.();el.uxCancelPhotoTap?.();};
 const gesture=createViewGesture({getView:()=>view,setView:manual,getBounds:()=>bounds,photoActive,cancelObject,allowZoom:false});
 // TouchEvent batches are authoritative for simultaneous contacts (Safari/iOS).
 // Keep their gesture separate so the compatibility PointerEvents cannot also
 // resize an object or apply the same zoom twice.
 const touchGesture=createViewGesture({getView:()=>view,setView:manual,getBounds:()=>bounds,cancelObject,allowZoom:false});
 let touchView=false;const touchTargets=new Set();
 const resetGestures=()=>{gesture.reset();touchGesture.reset();touchView=false;for(const node of touchTargets){node.removeEventListener('touchmove',touchMove,true);node.removeEventListener('touchend',touchFinished,true);node.removeEventListener('touchcancel',touchCancelled,true);}touchTargets.clear();};
 const path=e=>e.composedPath?.()||[e.target],target=e=>path(e).find(n=>n?.closest)||e.target;
 const onStage=e=>path(e).includes(stage)||stage.contains?.(target(e));
 const control=node=>!!node?.closest?.('button,input,textarea,select,label,a,summary,[data-ux-handle],.ux-direct-edit,.ux-direct-input');
 function point(e){const node=target(e),object=node?.closest?.('.scene [data-object]'),handle=node?.closest?.('[data-ux-handle]'),s=stage.getBoundingClientRect();return {id:e.pointerId,x:e.clientX-s.left,y:e.clientY-s.top,button:e.button,pointerType:e.pointerType,kind:handle?'handle':control(node)?'control':object?'object':'blank',objectId:object?.dataset.object};}
 // Wheel zoom belongs to the plate even over SVG artwork links and selection
 // handles. Pointer drag and actual form/toolbar controls keep their own rules.
 const wheelControl=node=>control(node)&&!node?.closest?.('.scene [data-object],[data-ux-handle]');
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const touchPoint=t=>point({target:t.target,pointerId:t.identifier,pointerType:'touch',button:0,clientX:t.clientX,clientY:t.clientY});
 el.addEventListener('touchstart',e=>{
  if(!bounds)return;
  const rect=stage.getBoundingClientRect();
  const contacts=[...e.touches].filter(t=>(stage.contains(t.target)||onStage(e))&&t.clientX>=rect.left&&t.clientX<=rect.right&&t.clientY>=rect.top&&t.clientY<=rect.bottom);
  if(!touchView&&contacts.length<2)return;
  // Rendering replaces SVG nodes. Touch Events retain their original target,
  // so retain a direct listener for the detached origin until the gesture ends.
  const origin=path(e)[0];if(origin&&origin!==el&&!touchTargets.has(origin)){
   touchTargets.add(origin);origin.addEventListener('touchmove',touchMove,{capture:true,passive:false});origin.addEventListener('touchend',touchFinished,{capture:true,passive:false});origin.addEventListener('touchcancel',touchCancelled,{capture:true,passive:false});
  }
  if(!touchView){
   // One atomic handover before either contact can continue an object gesture.
   touchView=true;cancelAnimation();cancelObject();gesture.reset();touchGesture.reset();
   for(const t of contacts.slice(0,2))touchGesture.down({...touchPoint(t),kind:'object'});
  }
  stop(e);
 },{capture:true,passive:false});
 const touchMove=e=>{if(!touchView)return;stop(e);for(const t of e.touches)touchGesture.move(touchPoint(t));};
 el.addEventListener('touchmove',touchMove,{capture:true,passive:false});
 const touchEnd=(e,cancelled)=>{
  if(!touchView)return;stop(e);for(const t of e.changedTouches)touchGesture.up(touchPoint(t),{cancelled});
  suppressUntil=performance.now()+500;
  // Swallow the remaining finger until all contacts end: never turn a pinch
  // into a late text drag, tap, upload dialog or an undo entry.
  if(!touchGesture.ids().length)resetGestures();
 };
 const touchFinished=e=>touchEnd(e,false),touchCancelled=e=>touchEnd(e,true);
 el.addEventListener('touchend',touchFinished,{capture:true,passive:false});
 el.addEventListener('touchcancel',touchCancelled,{capture:true,passive:false});
 el.addEventListener('pointerdown',e=>{
  // Chromium can drop every end event when blank deselection replaces the
  // implicitly captured SVG. A fresh primary touch proves the old contact is
  // over; a genuine second finger is non-primary and still uses the blocker.
  if(e.pointerType==='touch'&&e.isPrimary===true&&(gesture.ids().length||touchView)){
   cancelObject();resetGestures();
  }
  if(touchView&&e.pointerType==='touch'){stop(e);return;}cancelAnimation();if(!onStage(e)||!bounds)return;const used=gesture.down(point(e));if(used){stop(e);for(const id of gesture.ids())try{el.setPointerCapture(id);}catch{}}
 },true);
 el.addEventListener('pointermove',e=>{if(touchView&&e.pointerType==='touch'){stop(e);return;}if(gesture.has(e.pointerId)&&gesture.move(point(e)))stop(e);},true);
 const end=(e,cancelled)=>{if(touchView&&e.pointerType==='touch'){stop(e);return;}if(!gesture.has(e.pointerId))return;const used=gesture.up(point(e),{cancelled});if(used){stop(e);suppressUntil=performance.now()+500;}if(el.hasPointerCapture?.(e.pointerId))el.releasePointerCapture(e.pointerId);};
 el.addEventListener('pointerup',e=>end(e,false),true);el.addEventListener('pointercancel',e=>end(e,true),true);
 el.addEventListener('lostpointercapture',e=>{if(path(e)[0]===el)end(e,true);},true);
 // A blank tap deselects and redraws the SVG before release. Touch capture may
 // then end on the document instead of this host. Retire only our tracked ID:
 // leaving it alive turns the next single touch into a phantom two-finger wait.
 const pointerDocument=el.ownerDocument||document;
 const endOutside=e=>{
  if(path(e).includes(el)||!gesture.has(e.pointerId))return;
  // An SVG replacement can transfer implicit capture to the native drag layer.
  // That is still the same live gesture, not an outside cancellation.
  if(e.type==='lostpointercapture'&&[el,holder,stage].some(node=>node.hasPointerCapture?.(e.pointerId)))return;
  gesture.up(point(e),{cancelled:true});
  if(el.hasPointerCapture?.(e.pointerId))el.releasePointerCapture(e.pointerId);
 };
 const outsideEnds=['pointerup','pointercancel','lostpointercapture'];
 let outsideAttached=false;
 const attachOutsideEnds=()=>{if(outsideAttached)return;outsideAttached=true;for(const type of outsideEnds)pointerDocument.addEventListener(type,endOutside,true);};
 const detachOutsideEnds=()=>{if(!outsideAttached)return;outsideAttached=false;for(const type of outsideEnds)pointerDocument.removeEventListener(type,endOutside,true);};
 attachOutsideEnds();
 window.addEventListener('pageshow',event=>{if(event.persisted)attachOutsideEnds();});
 el.addEventListener('click',e=>{if(performance.now()<suppressUntil&&onStage(e)&&!control(target(e))){stop(e);suppressUntil=0;}},true);
 // Navigation resets the view; selecting or editing never zooms.
 r.addEventListener('click',e=>{const node=e.target.closest?.('[data-ux],[data-ux-tab]');if(node?.dataset.uxTab||['mobile-prev','mobile-next','mobile-step'].includes(node?.dataset.ux))fit(true);},true);
 for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){const result=original.apply(this,args);schedule();return result;};}
 el.uxViewZoom=()=>view.scale;el.uxRefreshViewZoom=schedule;el.uxFitView=()=>fit();el.uxViewViewport=()=>({...bounds.viewport});el.uxSetViewZoom=(value,anchor)=>{cancelAnimation();manual(zoomViewAt(view,value,anchor||center(),bounds));};
 if(typeof ResizeObserver==='function')new ResizeObserver(schedule).observe(stage);
 window.addEventListener('resize',()=>{cancelAnimation();schedule();});
 window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
 window.addEventListener('pagehide',()=>{cancelAnimation();resetGestures();detachOutsideEnds();if(pending)cancelAnimationFrame(pending);});
 refresh();return {fit:el.uxFitView,zoom:el.uxSetViewZoom,refresh:schedule,view:()=>({...view}),gesture};
}
