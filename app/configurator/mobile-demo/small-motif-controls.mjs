const installed = new WeakMap();
const ns = 'http://www.w3.org/2000/svg';

// Screen pixels only: the touch target never becomes product geometry. The
// 34 px clearance also separates the 44 px square handles at a 45° rotation.
export function smallMotifLayout(object, pixelsPerMm) {
  if (!object || object.type !== 'motif' || object.uxUploadId || object.uxUploadKind ||
      object.uxVectorLogo || object.role === 'guide' || object.uxLocked || object.locked || object.technicalLocked || object.acrylicFixed ||
      object.uxHidden || object.customerEditable === false ||
      ![object.w,object.h,pixelsPerMm].every(n => Number.isFinite(n) && n > 0)) return null;
  const width = object.w*pixelsPerMm, height = object.h*pixelsPerMm;
  if (Math.min(width,height) >= 44) return null;
  const halfWidth = Math.max(width,44)/2, halfHeight = Math.max(height,44)/2;
  return {width:halfWidth*2/pixelsPerMm,height:halfHeight*2/pixelsPerMm,
    cornerX:(halfWidth+34)/pixelsPerMm,cornerY:(halfHeight+34)/pixelsPerMm,
    rotateY:-(halfHeight+38)/pixelsPerMm,deleteX:(halfWidth+38)/pixelsPerMm};
}

export function visibleMotifAction(candidates, width, height) {
  const inside=p=>p.x>=22&&p.x<=width-22&&p.y>=22&&p.y<=height-22;
  return candidates.find(inside) || {x:Math.max(22,Math.min(width-22,candidates[0].x)),y:Math.max(22,Math.min(height-22,candidates[0].y))};
}

export function installDemoSmallMotifControls(el) {
  if (installed.has(el)) return installed.get(el);
  const root=el?.shadowRoot, doc=el?.ownerDocument, win=doc?.defaultView;
  if (!root || !doc || !win) return null;
  let grip=null, disposed=false, frame=0;
  const wrappers=[], cleanups=[];
  const clear = () => { grip?.remove(); grip=null; };
  const update = () => {
    clear();
    if (disposed) return;
    const object=el.state?.objects?.find(o=>o.id===el.state.selected);
    const scene=root.querySelector('.stage .scene'), stage=root.querySelector('.stage');
    const handles=root.querySelector('.ux-selection-handles');
    if (!scene || !stage || !handles || handles.hidden || el.uxCanEdit?.(object,'move')===false) return;
    const sr=scene.getBoundingClientRect(), pr=stage.getBoundingClientRect();
    const scale=sr.width/el.state.width, layout=smallMotifLayout(object,scale);
    if (!layout) return;
    const original=[...scene.querySelectorAll('[data-object]')].find(n=>n.dataset.object===object.id);
    if (!original) return;
    // Under every actual object, so nearby text, photos and motifs retain their
    // normal hit priority. It has no data-object attribute outside pointerdown:
    // selection geometry, exports and other object queries see the real object.
    const first=scene.querySelector('[data-object]');
    let anchor=first;
    while (anchor?.parentNode && anchor.parentNode!==scene) anchor=anchor.parentNode;
    if (!anchor || anchor.parentNode!==scene) return;
    grip=doc.createElementNS(ns,'g');
    grip.setAttribute('data-demo-motif-grab',object.id);
    grip.setAttribute('transform',original.getAttribute('transform')||'');
    grip.setAttribute('aria-hidden','true');
    const rect=doc.createElementNS(ns,'rect');
    for (const [key,value] of Object.entries({x:-layout.width/2,y:-layout.height/2,width:layout.width,height:layout.height,fill:'transparent','pointer-events':'all'})) rect.setAttribute(key,String(value));
    grip.append(rect); scene.insertBefore(grip,anchor);
    const angle=(object.rotation||0)*Math.PI/180, c=Math.cos(angle),s=Math.sin(angle);
    const point=(x,y)=>({x:sr.left-pr.left+(object.x+x*c-y*s)*scale,
      y:sr.top-pr.top+(object.y+x*s+y*c)*sr.height/el.state.height});
    const place=(node,x,y)=>{
      if (!node) return;
      const p=point(x,y);node.style.left=p.x+'px';node.style.top=p.y+'px';
    };
    for (const node of handles.querySelectorAll('[data-corner]')) {
      const [x,y]=node.dataset.corner.split(',').map(Number);
      place(node,x*layout.cornerX,y*layout.cornerY);
    }
    place(handles.querySelector('[data-ux-handle=rotate]'),0,layout.rotateY);
    // At a product edge put Delete on the inward side rather than clipping it
    // or clamping it on top of the central drag area.
    const remove=handles.querySelector('.ux-handle-delete');
    if (remove) {
      const p=visibleMotifAction([point(layout.deleteX,0),point(-layout.deleteX,0),
        point(0,-layout.rotateY),point(0,layout.rotateY)],pr.width,pr.height);
      remove.style.left=p.x+'px';remove.style.top=p.y+'px';
    }
  };
  // Let the unchanged native pointer handler own movement, capture and undo.
  // Expose the selected ID only for this event, before shadow-root capture.
  const down=event=>{
    const target=(event.composedPath?.()[0]||event.target)?.closest?.('[data-demo-motif-grab]');
    if (!target || target!==grip || event.button!==0 || target.getAttribute('data-demo-motif-grab')!==el.state?.selected) return;
    target.setAttribute('data-object',el.state.selected);
    // A microtask can run between capture listeners in a native event. Keep
    // the ID until shadow capture has finished, then remove it for DOM queries.
    win.setTimeout(()=>target.removeAttribute('data-object'),0);
  };
  el.addEventListener('pointerdown',down,true);
  cleanups.push(()=>el.removeEventListener('pointerdown',down,true));
  for (const name of ['render','sync','uxRefreshSelectionHandles']) {
    const original=el[name]; if (typeof original!=='function') continue;
    const wrapped=function(...args){clear();const result=original.apply(this,args);update();return result;};
    el[name]=wrapped; wrappers.push([name,original,wrapped]);
  }
  const later=()=>{if (!disposed && !frame) frame=win.requestAnimationFrame(()=>{frame=0;update();});};
  const stage=root.querySelector('.stage');
  const observer=win.ResizeObserver&&stage?new win.ResizeObserver(later):null;
  observer?.observe(stage);
  win.addEventListener('resize',later);
  cleanups.push(()=>{observer?.disconnect();win.removeEventListener('resize',later);if(frame)win.cancelAnimationFrame(frame);});
  update();
  const api={dispose(){
    if (disposed) return; disposed=true;clear();cleanups.forEach(fn=>fn());
    for(const [name,original,wrapped] of wrappers.reverse())if(el[name]===wrapped)el[name]=original;
    el.uxRefreshSelectionHandles?.();installed.delete(el);
  }};
  installed.set(el,api);return api;
}
