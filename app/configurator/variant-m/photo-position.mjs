import {photoCrop,panPhoto} from './photo-position-model.mjs';

export function installPhotoPosition({el,r,files,selected,select,mutate,showTab,button}){
  const usable=o=>o?.type==='photoSlot'&&files.has(o.uxUploadId)&&!o.uxHidden&&!o.uxLocked&&el.uxCanEdit?.(o,'replace')!==false;
  const panel=document.createElement('section');panel.className='ux-photo-position';panel.hidden=true;
  panel.innerHTML='<h3>Foto ausrichten</h3><p>Ziehe dein Foto direkt im Motiv. Die Form und das Design bleiben fest. Verschieben geht auch bei 100 %. Außerhalb deines Bildes bleibt die Fläche transparent.</p><label>Zoom <input data-photo-position="zoom" type="range" min=".25" max="4" step=".01"><output data-photo-percent></output></label><label>Links / rechts <input data-photo-position="x" type="range" min="-1" max="1" step=".01"></label><label>Oben / unten <input data-photo-position="y" type="range" min="-1" max="1" step=".01"></label>'+'<div class="ux-actions">'+button('photo-position-smaller','− Kleiner')+button('photo-position-bigger','+ Größer')+button('photo-position-turn','↻ Drehen')+button('photo-position-remove','Foto entfernen')+'</div>'+button('photo-position-reset','Ausschnitt zurücksetzen');
  r.querySelector('.ux-uploads').after(panel);
  const stage=r.querySelector('.stage');let drag=null,sliderStart=null;
  el.uxCanPositionPhoto=usable;
  function removePhoto(o=selected()){mutate(()=>{delete o.uxUploadId;delete o.uxUploadKind;delete o.uxPhotoCrop;delete o.uxPhotoBackground;});}
  const handle=e=>e.target.closest('[data-ux-handle]');
  const find=e=>el.state.objects.find(o=>o.id===e.target.closest('.scene [data-object]')?.dataset.object);
  function update(){
    const o=selected();panel.hidden=!usable(o);
    if(!panel.hidden){const v=photoCrop(o.uxPhotoCrop);for(const input of panel.querySelectorAll('input')){const k=input.dataset.photoPosition;input.value=v[k];input.disabled=false;}panel.querySelector('output').textContent=Math.round(v.zoom*100)+' %';}
    for(const o of el.state.objects.filter(usable)){const g=r.querySelector('.scene [data-object="'+CSS.escape(o.id)+'"]');if(g){g.style.cursor=drag?'grabbing':'grab';g.style.touchAction='none';g.setAttribute('tabindex','0');g.setAttribute('role','group');g.setAttribute('aria-label','Foto ausrichten: ziehen oder Pfeiltasten nutzen');}}
  }
  for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){const result=original.apply(this,args);update();return result;};}
  panel.addEventListener('input',e=>{const key=e.target.dataset.photoPosition,o=selected();if(!key||!usable(o))return;if(!sliderStart){sliderStart=structuredClone(el.state);el.record(sliderStart);}o.uxPhotoCrop=photoCrop({...photoCrop(o.uxPhotoCrop),[key]:Number(e.target.value)});el.render();});
  panel.addEventListener('change',()=>{sliderStart=null;el.sync();});
  panel.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(!usable(selected())||!key?.startsWith('photo-position-'))return;if(key==='photo-position-remove')return removePhoto();mutate(()=>{const o=selected(),v=photoCrop(o.uxPhotoCrop);if(key==='photo-position-reset')delete o.uxPhotoCrop;else o.uxPhotoCrop=photoCrop({...v,zoom:v.zoom*(key==='photo-position-bigger'?1.1:key==='photo-position-smaller'?1/1.1:1),angle:v.angle+(key==='photo-position-turn'?15:0)});});});
  r.addEventListener('pointerdown',e=>{
    const h=handle(e),o=h?selected():find(e);if(e.button!==0||!usable(o)||drag)return;
    e.preventDefault();e.stopImmediatePropagation();const old=structuredClone(el.state),start=el.point(e);select(o.id);showTab('upload');
    drag={id:e.pointerId,objectId:o.id,uploadId:o.uxUploadId,old,start,kind:h?.dataset.uxHandle||'move',crop:photoCrop(o.uxPhotoCrop),moved:false};stage.setPointerCapture(e.pointerId);
  },true);
  r.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
    const o=el.state.objects.find(o=>o.id===drag.objectId);if(!usable(o)||o.uxUploadId!==drag.uploadId)return;
    const p=el.point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<.3)return;
    drag.moved=true;
    if(drag.kind==='move')o.uxPhotoCrop=panPhoto(o,files.get(o.uxUploadId),drag.crop,dx,dy);
    else if(drag.kind==='rotate'){const angle=Math.atan2(p.y-o.y,p.x-o.x)-Math.atan2(drag.start.y-o.y,drag.start.x-o.x);o.uxPhotoCrop=photoCrop({...drag.crop,angle:drag.crop.angle+angle*180/Math.PI});}
    else {const factor=Math.hypot(p.x-o.x,p.y-o.y)/Math.max(.1,Math.hypot(drag.start.x-o.x,drag.start.y-o.y));o.uxPhotoCrop=photoCrop({...drag.crop,zoom:drag.crop.zoom*factor});}
    el.render();
  },true);
  function finish(e,cancel=false){if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const old=drag;drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(cancel)el.state=old.old;else if(old.moved)el.record(old.old);el.sync();if(!cancel&&!old.moved&&old.kind==='move')el.uxPhotoTap?.(old.objectId);}
  r.addEventListener('pointerup',e=>finish(e),true);r.addEventListener('pointercancel',e=>finish(e,true),true);stage.addEventListener('lostpointercapture',e=>finish(e,true));
  r.addEventListener('click',e=>{const b=e.target.closest('[data-ux]'),key=b?.dataset.ux,target=b?.dataset.id?el.state.objects.find(o=>o.id===b.dataset.id):selected();if(usable(target)&&['delete','remove-content','object-delete'].includes(key)){e.preventDefault();e.stopImmediatePropagation();removePhoto(target);return;}if(usable(find(e))){e.preventDefault();e.stopImmediatePropagation();select(find(e).id);showTab('upload');}},true);
  r.addEventListener('keydown',e=>{
    const h=handle(e),o=h?selected():find(e);if(!usable(o))return;
    if(['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();removePhoto();return;}
    if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();select(o.id);showTab('upload');panel.querySelector('input').focus();return;}
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;
    e.preventDefault();e.stopImmediatePropagation();if(h){const direction=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;mutate(()=>{const v=photoCrop(o.uxPhotoCrop);o.uxPhotoCrop=photoCrop({...v,zoom:v.zoom*(h.dataset.uxHandle==='scale'?1+direction*.03:1),angle:v.angle+(h.dataset.uxHandle==='rotate'?direction:0)});});return;}mutate(()=>{o.uxPhotoCrop=panPhoto(o,files.get(o.uxUploadId),o.uxPhotoCrop,delta[0]*(e.shiftKey?5:1),delta[1]*(e.shiftKey?5:1));});
  },true);
  update();
}
