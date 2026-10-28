import {fitView,constrainView,zoomViewAt,autoZoomView,interpolateView,createViewGesture} from './view-zoom-model.mjs';

// The visual layers share one transform. Controls stay as unscaled stage siblings.
export async function installViewZoom({el,r,selected}){
 const stage=r.querySelector('.stage'),holder=r.querySelector('.plate-holder');if(!stage||!holder)return null;
 const response=await fetch('/configurator/variant-m/view-zoom.css');if(!response.ok)throw Error('Ansichtszoom konnte nicht geladen werden.');
 const style=document.createElement('style');style.textContent=await response.text();r.append(style);
 const controls=document.createElement('div');controls.className='ux-view-zoom';controls.setAttribute('aria-label','Produktansicht vergrößern');
 controls.innerHTML='<button type="button" data-view-action="minus" aria-label="Ansicht verkleinern">−</button><button type="button" data-view-action="level" aria-label="Zoomstufe ändern" title="Zoomstufe ändern">100 %</button><button type="button" data-view-action="plus" aria-label="Ansicht vergrößern">+</button><button type="button" data-view-action="fit" aria-label="Ganzes Schild" title="Ganzes Schild">⤢</button>';
 const map=document.createElement('div');map.className='ux-view-map';map.hidden=true;map.setAttribute('aria-hidden','true');
 const hint=document.createElement('p');hint.className='ux-view-hint';hint.hidden=true;hint.setAttribute('role','status');
 stage.append(map,hint,controls);stage.dataset.viewZoom='1';
 let view=fitView(),bounds=null,layers=[],pending=0,hintTimer=null,miniScene=null,miniRect=null,suppressUntil=0,refreshing=false;
 let animationFrame=0,focusFrame=0,animationEpoch=0;
 function cancelAnimation(){animationEpoch++;if(animationFrame)cancelAnimationFrame(animationFrame);if(focusFrame)cancelAnimationFrame(focusFrame);animationFrame=focusFrame=0;}
 function animate(next){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){change(next);return;}
  const from={...view},epoch=animationEpoch;let began=null;
  const step=now=>{if(epoch!==animationEpoch)return;if(began===null)began=now;const progress=Math.min(1,(now-began)/180);change(interpolateView(from,next,progress));animationFrame=progress<1?requestAnimationFrame(step):0;};
  animationFrame=requestAnimationFrame(step);
 }
 const identity=()=>JSON.stringify([el.state.designId,el.state.width,el.state.height]);let product=identity();
 const photoActive=()=>!!el.uxPhotoPositionActive?.(selected());
 const center=()=>({x:bounds.viewport.width/2,y:bounds.viewport.height/2});
 function paint(){
  if(!bounds)return;
  const origin={x:bounds.plate.x+bounds.plate.width/2,y:bounds.plate.y+bounds.plate.height/2};
  for(const {node,box} of layers){node.style.setProperty('transform-origin',(origin.x-box.x)+'px '+(origin.y-box.y)+'px','important');node.style.setProperty('transform','translate('+view.x+'px,'+view.y+'px) scale('+view.scale+')','important');}
  stage.dataset.viewZoom=String(view.scale);
  const level=controls.querySelector('[data-view-action=level]');level.textContent=Math.round(view.scale*100)+' %';level.setAttribute('aria-label','Ansicht '+Math.round(view.scale*100)+' Prozent – Zoomstufe ändern');controls.querySelector('[data-view-action=minus]').disabled=view.scale<=1;controls.querySelector('[data-view-action=plus]').disabled=view.scale>=4;
  map.hidden=view.scale<=1;updateMiniRect();el.uxRefreshSelectionHandles?.();el.uxRefreshTextToolbar?.();
 }
 function change(next){const previous=view.scale;view=constrainView(next,bounds);paint();if(previous===1&&view.scale>1){hint.textContent=matchMedia('(max-width:767px), (pointer:coarse)').matches?'Zwei Finger zum Zoomen · freie Fläche zum Verschieben':'Mausrad zum Zoomen · freie Fläche zum Verschieben';hint.hidden=false;clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hint.hidden=true;},3500);}if(view.scale===1){clearTimeout(hintTimer);hint.hidden=true;}}
 function rebuildMini(){
  const scene=r.querySelector('.scene');if(!scene)return;const copy=scene.cloneNode(true);copy.removeAttribute('class');copy.removeAttribute('style');copy.removeAttribute('tabindex');copy.removeAttribute('role');copy.setAttribute('aria-hidden','true');
  copy.querySelectorAll('[data-resize],rect[stroke="#16845d"],.ux-alignment-guides,[data-multi-outlines]').forEach(n=>n.remove());
  const ids=new Map();for(const node of copy.querySelectorAll('[id]')){const id=node.id;ids.set(id,id+'-view-map');node.id=id+'-view-map';}
  for(const node of [copy,...copy.querySelectorAll('*')]){for(const attribute of [...node.attributes]){let value=attribute.value;for(const [id,next] of ids){value=value.replaceAll('url(#'+id+')','url(#'+next+')');if(value==='#'+id)value='#'+next;}if(value!==attribute.value)node.setAttribute(attribute.name,value);}for(const key of ['data-object','data-direct-active','data-ux-namespace'])node.removeAttribute(key);if(node.style?.visibility==='hidden')node.style.visibility='';}
  miniRect=document.createElementNS('http://www.w3.org/2000/svg','rect');miniRect.setAttribute('fill','#2f34371a');miniRect.setAttribute('stroke','#2f3437');miniRect.setAttribute('vector-effect','non-scaling-stroke');miniRect.setAttribute('stroke-width','1.5');copy.append(miniRect);map.replaceChildren(copy);miniScene=scene;
 }
 function updateMiniRect(){
  if(map.hidden||!miniRect||!miniScene?.isConnected)return;
  const matrix=miniScene.getScreenCTM();if(!matrix)return;const inverse=matrix.inverse(),s=stage.getBoundingClientRect(),point=(x,y)=>{const p=miniScene.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(inverse);},a=point(s.left,s.top),b=point(s.right,s.bottom),box=miniScene.viewBox.baseVal;
  const left=Math.max(box.x,a.x),top=Math.max(box.y,a.y),right=Math.min(box.x+box.width,b.x),bottom=Math.min(box.y+box.height,b.y);
  for(const [key,value]of Object.entries({x:left,y:top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)}))miniRect.setAttribute(key,String(value));
 }
 function refresh(){
  pending=0;if(refreshing)return;refreshing=true;
  try{
   const nodes=[...stage.querySelectorAll(':scope > .plate-holder,:scope > .acryl-backdrop,:scope > .acryl-base')];if(!nodes.includes(holder))nodes.push(holder);
   for(const node of nodes)node.style.setProperty('transform','none','important');
   const sr=stage.getBoundingClientRect(),box=node=>{const b=node.getBoundingClientRect();return {x:b.left-sr.left,y:b.top-sr.top,width:b.width,height:b.height};};
   bounds={plate:box(holder),viewport:{x:0,y:0,width:sr.width,height:sr.height}};layers=nodes.map(node=>({node,box:box(node)}));
   if(product!==identity()){cancelAnimation();product=identity();view=fitView();resetGestures();}view=constrainView(view,bounds);rebuildMini();paint();
  }finally{refreshing=false;}
 }
 const schedule=()=>{if(!pending)pending=requestAnimationFrame(refresh);};
 function autoFocus(id){cancelAnimation();const epoch=animationEpoch;focusFrame=requestAnimationFrame(()=>{focusFrame=0;if(epoch!==animationEpoch)return;const o=selected();if(!o||o.id!==id||!['text','motif','graphic'].includes(o.type)||photoActive()||!bounds)return;const scene=r.querySelector('.scene'),g=scene?.querySelector('[data-object="'+CSS.escape(id)+'"]');if(!g)return;const rect=g.getBoundingClientRect(),s=stage.getBoundingClientRect(),origin={x:bounds.plate.x+bounds.plate.width/2,y:bounds.plate.y+bounds.plate.height/2};const box={x:origin.x+(rect.left-s.left-origin.x-view.x)/view.scale,y:origin.y+(rect.top-s.top-origin.y-view.y)/view.scale,width:rect.width/view.scale,height:rect.height/view.scale};const next=autoZoomView(view,box,bounds);if(next!==view)animate(next);});}
 const cancelObject=()=>{el.uxCancelObjectGesture?.();el.uxCancelPhotoGesture?.();el.uxCancelPhotoTap?.();};
 const gesture=createViewGesture({getView:()=>view,setView:change,getBounds:()=>bounds,photoActive,cancelObject,onTap:autoFocus});
 // TouchEvent batches are authoritative for simultaneous contacts (Safari/iOS).
 // Keep their gesture separate so the compatibility PointerEvents cannot also
 // resize an object or apply the same zoom twice.
 const touchGesture=createViewGesture({getView:()=>view,setView:change,getBounds:()=>bounds,cancelObject});
 let touchView=false;const touchTargets=new Set();
 const resetGestures=()=>{gesture.reset();touchGesture.reset();touchView=false;for(const node of touchTargets){node.removeEventListener('touchmove',touchMove,true);node.removeEventListener('touchend',touchFinished,true);node.removeEventListener('touchcancel',touchCancelled,true);}touchTargets.clear();};
 const path=e=>e.composedPath?.()||[e.target],target=e=>path(e).find(n=>n?.closest)||e.target;
 const onStage=e=>path(e).includes(stage)||stage.contains?.(target(e));
 const control=node=>!!node?.closest?.('button,input,textarea,select,label,a,summary,[data-ux-handle],.ux-direct-edit,.ux-direct-input,.ux-view-zoom');
 function point(e){const node=target(e),object=node?.closest?.('.scene [data-object]'),handle=node?.closest?.('[data-ux-handle]'),s=stage.getBoundingClientRect();return {id:e.pointerId,x:e.clientX-s.left,y:e.clientY-s.top,button:e.button,pointerType:e.pointerType,kind:handle?'handle':control(node)?'control':object?'object':'blank',objectId:object?.dataset.object};}
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
 el.addEventListener('pointerdown',e=>{if(touchView&&e.pointerType==='touch'){stop(e);return;}cancelAnimation();if(!onStage(e)||!bounds)return;const used=gesture.down(point(e));if(used){stop(e);for(const id of gesture.ids())try{el.setPointerCapture(id);}catch{}}},true);
 el.addEventListener('pointermove',e=>{if(touchView&&e.pointerType==='touch'){stop(e);return;}if(gesture.has(e.pointerId)&&gesture.move(point(e)))stop(e);},true);
 const end=(e,cancelled)=>{if(touchView&&e.pointerType==='touch'){stop(e);return;}if(!gesture.has(e.pointerId))return;const used=gesture.up(point(e),{cancelled});if(used){stop(e);suppressUntil=performance.now()+500;}if(el.hasPointerCapture?.(e.pointerId))el.releasePointerCapture(e.pointerId);};
 el.addEventListener('pointerup',e=>end(e,false),true);el.addEventListener('pointercancel',e=>end(e,true),true);
 el.addEventListener('lostpointercapture',e=>{if(path(e)[0]===el)end(e,true);},true);
 el.addEventListener('click',e=>{if(performance.now()<suppressUntil&&onStage(e)&&!control(target(e))){stop(e);suppressUntil=0;}},true);
 el.addEventListener('wheel',e=>{if(!bounds||!onStage(e)||control(target(e))||photoActive())return;cancelAnimation();stop(e);const p=point(e),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?bounds.viewport.height:1);change(zoomViewAt(view,view.scale*Math.exp(-Math.max(-300,Math.min(300,delta))*.002),p,bounds));},{capture:true,passive:false});
 controls.addEventListener('click',e=>{const action=e.target.closest('[data-view-action]')?.dataset.viewAction;if(!action||!bounds)return;cancelAnimation();e.preventDefault();if(action==='fit'){resetGestures();change(fitView());return;}const next=action==='plus'?view.scale+.25:action==='minus'?view.scale-.25:([1,1.5,2,3,4].find(n=>n>view.scale+.01)||1);change(zoomViewAt(view,next,center(),bounds));});
 for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){if(animationFrame)cancelAnimation();const result=original.apply(this,args);schedule();return result;};}
 el.uxViewZoom=()=>view.scale;el.uxRefreshViewZoom=schedule;el.uxFitView=()=>{cancelAnimation();resetGestures();change(fitView());};el.uxSetViewZoom=(value,anchor)=>{cancelAnimation();change(zoomViewAt(view,value,anchor||center(),bounds));};
 if(typeof ResizeObserver==='function')new ResizeObserver(schedule).observe(stage);window.addEventListener('resize',()=>{cancelAnimation();schedule();});window.addEventListener('pagehide',()=>{cancelAnimation();resetGestures();clearTimeout(hintTimer);if(pending)cancelAnimationFrame(pending);},{once:true});
 refresh();return {fit:el.uxFitView,zoom:el.uxSetViewZoom,refresh:schedule,view:()=>({...view}),gesture};
}
