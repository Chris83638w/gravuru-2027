import {photoCrop,panPhoto} from './photo-position-model.mjs';
import {photoSizeLimit,resizePhoto} from './photo-upload-geometry.mjs';

export function installPhotoPosition({el,r,config,files,selected,select,mutate,showTab,button}){
  const editable=o=>o?.type==='photoSlot'&&!o.uxHidden&&!o.uxLocked&&!o.locked&&!o.technicalLocked&&o.customerEditable!==false;
  const movable=o=>editable(o)&&!o.acrylicFixed&&el.uxCanEdit?.(o,'move')!==false;
  const usable=o=>editable(o)&&files.has(o.uxUploadId)&&el.uxCanEdit?.(o,'replace')!==false;
  const identity=o=>o?JSON.stringify([el.state.designId,o.id,o.uxUploadId??null]):null;
  let modeKey=null,selectionKey=null,drag=null,sliderStart=null,updating=false;
  const positioning=o=>usable(o)&&(!movable(o)||modeKey===identity(o));
  const panel=document.createElement('section');panel.className='ux-photo-position';panel.hidden=true;
  panel.innerHTML='<label class="ux-photo-size">Fotogröße <input type="range" data-photo-object-size min="5" max="220" step=".1"><output data-photo-size-value></output></label><h3 data-photo-position-title>Fotofeld bewegen</h3><p data-photo-position-help></p>'+button('photo-position-crop','Foto im Ausschnitt ausrichten')+button('photo-position-move','Fotofeld bewegen')+'<div data-photo-crop-controls><label>Zoom <input data-photo-position="zoom" type="range" min=".25" max="4" step=".01"><output data-photo-percent></output></label><label>Links / rechts <input data-photo-position="x" type="range" min="-1" max="1" step=".01"></label><label>Oben / unten <input data-photo-position="y" type="range" min="-1" max="1" step=".01"></label><div class="ux-actions">'+button('photo-position-turn','↻ Drehen')+button('photo-position-remove','Foto entfernen')+'</div>'+button('photo-position-reset','Ausschnitt zurücksetzen')+'</div>';
  r.querySelector('.ux-uploads').after(panel);
  const stage=r.querySelector('.stage');
  el.uxCanPositionPhoto=usable;
  el.uxPhotoPositionActive=positioning;
  function removePhoto(o=selected()){if(!usable(o))return;mutate(()=>{
    const templateSlot=config?.profile?.designs?.find(d=>d.id===el.state.designId)?.objects?.some(source=>source.id===o.id&&source.type==='photoSlot');
    if(!templateSlot&&!o.acrylicFixed){el.state.objects=el.state.objects.filter(item=>item.id!==o.id);if(el.state.selected===o.id)el.state.selected=null;return;}
    delete o.uxUploadId;delete o.uxUploadKind;delete o.uxPhotoCrop;delete o.uxPhotoBackground;delete o.uxPhotoColor;
  });}
  const handle=e=>e.target.closest('[data-ux-handle]');
  const find=e=>el.state.objects.find(o=>o.id===e.target.closest('.scene [data-object]')?.dataset.object);
  const snapshot=o=>({old:structuredClone(el.state),objectId:o.id,uploadId:o.uxUploadId,designId:el.state.designId,crop:photoCrop(o.uxPhotoCrop)});
  function restoreCrop(prior){
    if(!prior||prior.designId!==el.state.designId)return;
    const o=el.state.objects.find(o=>o.id===prior.objectId),old=prior.old.objects.find(o=>o.id===prior.objectId);
    if(!o||o.uxUploadId!==prior.uploadId)return;
    for(const key of ['x','y','w','h'])o[key]=old[key];
    if(old.uxPhotoCrop===undefined)delete o.uxPhotoCrop;else o.uxPhotoCrop=structuredClone(old.uxPhotoCrop);
  }
  function cancel(){const prior=drag;drag=null;if(prior){restoreCrop(prior);if(stage.hasPointerCapture(prior.id))stage.releasePointerCapture(prior.id);}if(sliderStart)restoreCrop(sliderStart);sliderStart=null;}
  el.uxCancelPhotoGesture=()=>{if(drag){cancel();el.sync();}};
  el.uxSetPhotoPositionMode=mode=>{const o=selected();if(!usable(o)||mode==='move'&&!movable(o))return false;cancel();modeKey=mode==='crop'?identity(o):null;el.sync();showTab('upload');return true;};
  function update(){
    if(updating)return;updating=true;
    try{
      const o=selected(),key=identity(o);if(key!==selectionKey){cancel();modeKey=null;selectionKey=key;}
      panel.hidden=!usable(o);
      if(!panel.hidden){const active=positioning(o),v=photoCrop(o.uxPhotoCrop);panel.querySelector('[data-photo-position-title]').textContent=active?'Foto im Ausschnitt ausrichten':'Fotofeld bewegen';panel.querySelector('[data-photo-position-help]').textContent=active?'Ziehe das Foto innerhalb seiner festen Form. Zoom und Drehung ändern nur den Bildausschnitt. Außerhalb des Fotos bleibt die Fläche transparent.':'Ziehe Foto und Form gemeinsam auf der Tafel. Die Pfeiltasten verschieben das gesamte Fotofeld. Der Bildausschnitt bleibt dabei erhalten.';panel.querySelector('[data-ux="photo-position-crop"]').hidden=active;panel.querySelector('[data-ux="photo-position-move"]').hidden=!active||!movable(o);panel.querySelector('[data-photo-crop-controls]').hidden=!active;for(const input of panel.querySelectorAll('[data-photo-position]')){input.value=v[input.dataset.photoPosition];input.disabled=!active;}panel.querySelector('[data-photo-percent]').textContent=Math.round(v.zoom*100)+' %';const size=panel.querySelector('[data-photo-object-size]'),canSize=movable(o)&&el.uxCanEdit?.(o,'scale')!==false;size.closest('label').hidden=!canSize;if(canSize){const max=photoSizeLimit(o,el.state.width,el.state.height);size.min=String(Math.min(5,max));size.max=String(max);size.value=String(o.w);panel.querySelector('[data-photo-size-value]').textContent=(Math.round(o.w*10)/10).toLocaleString('de')+' × '+(Math.round(o.h*10)/10).toLocaleString('de')+' mm';}}
      for(const object of el.state.objects.filter(o=>movable(o)||usable(o))){const g=r.querySelector('.scene [data-object="'+CSS.escape(object.id)+'"]');if(g){g.style.cursor=drag?'grabbing':'grab';g.style.touchAction='none';g.setAttribute('tabindex','0');g.setAttribute('role','group');g.setAttribute('aria-label',positioning(object)?'Foto im Ausschnitt ausrichten: ziehen oder Pfeiltasten nutzen':'Fotofeld mit Foto bewegen: ziehen oder Pfeiltasten nutzen');}}
    }finally{updating=false;}
  }
  for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){
    const focused=r.activeElement||document.activeElement,objectId=focused?.matches?.('.scene [data-object]')?focused.dataset.object:null;
    update();const result=original.apply(this,args);update();
    // SVG rendering replaces scene nodes. Preserve keyboard focus only if it
    // belonged to this photo; never steal focus from another control.
    if(objectId&&((r.activeElement||document.activeElement)===focused||!focused.isConnected&&!r.activeElement&&(document.activeElement===document.body||document.activeElement===r.host)))r.querySelector('.scene [data-object="'+CSS.escape(objectId)+'"]')?.focus({preventScroll:true});
    return result;
  };}
  panel.addEventListener('input',e=>{const key=e.target.dataset.photoPosition,o=selected();if(e.target.matches('[data-photo-object-size]')&&usable(o)&&movable(o)&&el.uxCanEdit?.(o,'scale')!==false){if(!sliderStart){sliderStart=snapshot(o);el.record(sliderStart.old);}resizePhoto(o,Number(e.target.value),el.state.width,el.state.height);el.render();return;}if(!['zoom','x','y'].includes(key)||!positioning(o))return;if(!sliderStart){sliderStart=snapshot(o);el.record(sliderStart.old);}o.uxPhotoCrop=photoCrop({...photoCrop(o.uxPhotoCrop),[key]:Number(e.target.value)});el.render();});
  panel.addEventListener('change',()=>{sliderStart=null;el.sync();});
  panel.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(key==='photo-position-crop')return el.uxSetPhotoPositionMode('crop');if(key==='photo-position-move')return el.uxSetPhotoPositionMode('move');if(!positioning(selected())||!key?.startsWith('photo-position-'))return;if(key==='photo-position-remove')return removePhoto();mutate(()=>{const o=selected(),v=photoCrop(o.uxPhotoCrop);if(key==='photo-position-reset')delete o.uxPhotoCrop;else o.uxPhotoCrop=photoCrop({...v,zoom:v.zoom*(key==='photo-position-bigger'?1.1:key==='photo-position-smaller'?1/1.1:1),angle:v.angle+(key==='photo-position-turn'?15:0)});});});
  r.addEventListener('pointerdown',e=>{
    const h=handle(e),o=h?selected():find(e);if(h?.dataset.uxHandle==='scale'&&o?.uxUploadKind==='photo'){e.preventDefault();e.stopImmediatePropagation();return;}if(e.button!==0||!positioning(o)||drag)return;
    e.preventDefault();e.stopImmediatePropagation();el.uxCancelPhotoTap?.();const prior=snapshot(o),start=el.point(e);select(o.id);showTab('upload');
    drag={...prior,id:e.pointerId,start,kind:h?.dataset.uxHandle||'move',moved:false};stage.setPointerCapture(e.pointerId);
  },true);
  r.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
    const o=el.state.objects.find(o=>o.id===drag.objectId);if(!positioning(o)||o.uxUploadId!==drag.uploadId||selected()?.id!==o.id){cancel();el.sync();return;}
    const p=el.point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<.3)return;
    drag.moved=true;
    if(drag.kind==='move')o.uxPhotoCrop=panPhoto(o,files.get(o.uxUploadId),drag.crop,dx,dy);
    else if(drag.kind==='rotate'){const angle=Math.atan2(p.y-o.y,p.x-o.x)-Math.atan2(drag.start.y-o.y,drag.start.x-o.x);o.uxPhotoCrop=photoCrop({...drag.crop,angle:drag.crop.angle+angle*180/Math.PI});}
    else {const factor=Math.hypot(p.x-o.x,p.y-o.y)/Math.max(.1,Math.hypot(drag.start.x-o.x,drag.start.y-o.y));o.uxPhotoCrop=photoCrop({...drag.crop,zoom:drag.crop.zoom*factor});}
    el.render();
  },true);
  function finish(e,cancelled=false){if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const prior=drag;drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(cancelled)restoreCrop(prior);else if(prior.moved)el.record(prior.old);el.sync();if(!cancelled&&!prior.moved&&prior.kind==='move')el.uxPhotoTap?.(prior.objectId);}
  r.addEventListener('pointerup',e=>finish(e),true);r.addEventListener('pointercancel',e=>finish(e,true),true);stage.addEventListener('lostpointercapture',e=>finish(e,true));
  r.addEventListener('click',e=>{const b=e.target.closest('[data-ux]'),key=b?.dataset.ux,target=b?.dataset.id?el.state.objects.find(o=>o.id===b.dataset.id):selected();if(usable(target)&&['delete','remove-content','object-delete'].includes(key)){e.preventDefault();e.stopImmediatePropagation();removePhoto(target);return;}const o=find(e);if(o&&(usable(o)||movable(o))){e.preventDefault();e.stopImmediatePropagation();select(o.id);showTab('upload');}},true);
  r.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&(drag||sliderStart)){e.preventDefault();e.stopImmediatePropagation();cancel();el.sync();return;}
    const h=handle(e),o=h?selected():find(e);if(!o)return;
    if(['Delete','Backspace'].includes(e.key)&&usable(o)){e.preventDefault();e.stopImmediatePropagation();removePhoto(o);return;}
    if(['Enter',' '].includes(e.key)&&usable(o)){e.preventDefault();e.stopImmediatePropagation();select(o.id);showTab('upload');panel.querySelector(positioning(o)?'input':'[data-ux="photo-position-crop"]').focus();return;}
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;
    if(h?.dataset.uxHandle==='scale'&&o.uxUploadKind==='photo')return;
    if(!positioning(o)){if(!h&&movable(o)){e.preventDefault();e.stopImmediatePropagation();select(o.id);mutate(()=>{o.x+=delta[0]*(e.shiftKey?5:1);o.y+=delta[1]*(e.shiftKey?5:1);});}return;}
    e.preventDefault();e.stopImmediatePropagation();if(h){const direction=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;mutate(()=>{const v=photoCrop(o.uxPhotoCrop);o.uxPhotoCrop=photoCrop({...v,zoom:v.zoom*(h.dataset.uxHandle==='scale'?1+direction*.03:1),angle:v.angle+(h.dataset.uxHandle==='rotate'?direction:0)});});return;}mutate(()=>{o.uxPhotoCrop=panPhoto(o,files.get(o.uxUploadId),o.uxPhotoCrop,delta[0]*(e.shiftKey?5:1),delta[1]*(e.shiftKey?5:1));});
  },true);
  update();
}
