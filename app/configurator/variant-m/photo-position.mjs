import {photoCrop,photoPlacement,panPhoto} from './photo-position-model.mjs';

export function installPhotoPosition({el,r,files,selected,select,mutate,showTab,button}){
  const usable=o=>o?.type==='photoSlot'&&files.has(o.uxUploadId)&&!o.uxHidden&&!o.uxLocked&&el.uxCanEdit?.(o,'replace')!==false;
  const panel=document.createElement('section');panel.className='ux-photo-position';panel.hidden=true;
  panel.innerHTML='<h3>Foto ausrichten</h3><p>Ziehe dein Foto direkt im Motiv. Die Form und das Design bleiben fest. Für mehr Spielraum kannst du das Foto vergrößern.</p><label>Zoom <input data-photo-position="zoom" type="range" min="1" max="4" step=".01"><output data-photo-percent></output></label><label>Links / rechts <input data-photo-position="x" type="range" min="-1" max="1" step=".01"></label><label>Oben / unten <input data-photo-position="y" type="range" min="-1" max="1" step=".01"></label>'+button('photo-position-reset','Ausschnitt zurücksetzen');
  r.querySelector('.ux-uploads').after(panel);
  const stage=r.querySelector('.stage');let drag=null,sliderStart=null;
  const find=e=>el.state.objects.find(o=>o.id===e.target.closest('.scene [data-object]')?.dataset.object);
  function update(){
    const o=selected();panel.hidden=!usable(o);
    if(!panel.hidden){const v=photoCrop(o.uxPhotoCrop),p=photoPlacement(o,files.get(o.uxUploadId));for(const input of panel.querySelectorAll('input')){const k=input.dataset.photoPosition;input.value=v[k];input.disabled=k==='x'?p.dx<.001:k==='y'?p.dy<.001:false;}panel.querySelector('output').textContent=Math.round(v.zoom*100)+' %';}
    for(const o of el.state.objects.filter(usable)){const g=r.querySelector('.scene [data-object="'+CSS.escape(o.id)+'"]');if(g){g.style.cursor=drag?'grabbing':'grab';g.style.touchAction='none';g.setAttribute('tabindex','0');g.setAttribute('role','group');g.setAttribute('aria-label','Foto ausrichten: ziehen oder Pfeiltasten nutzen');}}
  }
  for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){const result=original.apply(this,args);update();return result;};}
  panel.addEventListener('input',e=>{const key=e.target.dataset.photoPosition,o=selected();if(!key||!usable(o))return;if(!sliderStart){sliderStart=structuredClone(el.state);el.record(sliderStart);}o.uxPhotoCrop=photoCrop({...photoCrop(o.uxPhotoCrop),[key]:Number(e.target.value)});el.render();});
  panel.addEventListener('change',()=>{sliderStart=null;el.sync();});
  panel.addEventListener('click',e=>{if(e.target.closest('[data-ux=photo-position-reset]')&&usable(selected()))mutate(()=>delete selected().uxPhotoCrop);});
  r.addEventListener('pointerdown',e=>{
    const o=find(e);if(e.button!==0||!usable(o)||drag)return;
    e.preventDefault();e.stopImmediatePropagation();const old=structuredClone(el.state),start=el.point(e);select(o.id);showTab('upload');
    drag={id:e.pointerId,objectId:o.id,uploadId:o.uxUploadId,old,start,crop:photoCrop(o.uxPhotoCrop),moved:false};stage.setPointerCapture(e.pointerId);
  },true);
  r.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
    const o=el.state.objects.find(o=>o.id===drag.objectId);if(!usable(o)||o.uxUploadId!==drag.uploadId)return;
    const p=el.point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<.3)return;
    drag.moved=true;o.uxPhotoCrop=panPhoto(o,files.get(o.uxUploadId),drag.crop,dx,dy);el.render();
  },true);
  function finish(e,cancel=false){if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const old=drag;drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(cancel)el.state=old.old;else if(old.moved)el.record(old.old);el.sync();}
  r.addEventListener('pointerup',e=>finish(e),true);r.addEventListener('pointercancel',e=>finish(e,true),true);stage.addEventListener('lostpointercapture',e=>finish(e,true));
  r.addEventListener('click',e=>{if(usable(find(e))){e.preventDefault();e.stopImmediatePropagation();select(find(e).id);showTab('upload');}},true);
  r.addEventListener('keydown',e=>{
    const o=find(e);if(!usable(o))return;
    if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();select(o.id);showTab('upload');panel.querySelector('input').focus();return;}
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;
    e.preventDefault();e.stopImmediatePropagation();mutate(()=>{o.uxPhotoCrop=panPhoto(o,files.get(o.uxUploadId),o.uxPhotoCrop,delta[0]*(e.shiftKey?5:1),delta[1]*(e.shiftKey?5:1));});
  },true);
  update();
}
