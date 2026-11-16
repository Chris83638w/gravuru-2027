import {uiIcon} from './ui-icons.mjs';
import {selectionArrowMarkup,positionSelectionArrows,selectionScaleFactor} from './selection-arrows.mjs';
import {completePreviewMini} from './preview-feedback.mjs';
import {installDirectEditing} from './direct-editing.mjs';
import {installPhotoPosition} from './photo-position.mjs';
import {scaleObject} from './image-processing.mjs';
import {createPhotoEditor} from './photo-editor.mjs';
import {installUsability} from './usability.mjs';
import {installWorkflow} from './workflow.mjs';
import {installCustomerTools} from './customer-tools.mjs';
import {installModernMobileNavigation} from './modern-mobile-navigation.mjs';

export async function installRefinements(api){
  const {el,r,files,selected,select,mutate,showTab,say,dialog,button,esc,dialogs}=api;
  const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
  const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/refinements.css').then(res=>{if(!res.ok)throw Error('Bedienoberfläche fehlt.');return res.text();});r.append(style);
  const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const expand=icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>');
  $('#ux-tab-options .ux-tab-icon').innerHTML=uiIcon('sliders');
  const enlarge=$('[data-ux=enlarge]');enlarge.innerHTML=expand+'<span>Vollbild</span>';enlarge.className='ux-enlarge';$('[data-ux-stage]').append(enlarge);
  $('.ux-preview').dataset.dimensions='true';$('[data-ux-dimensions]').checked=true;$('[data-ux-dimensions]').closest('label').hidden=true;
  const guide=$('[data-ux-guides]').closest('label');guide.classList.add('ux-guides-row');$('.stage').append(guide);
  $('.stage').append($('.ux-preview-caption'));
  const caption=$('.ux-preview-caption span');caption.title=caption.textContent;caption.textContent=caption.textContent.split(' · Lieferung')[0];
  const closePreview=$('.c-large-preview>button');closePreview.textContent='← Zurück';closePreview.setAttribute('aria-label','Zurück zur Gestaltung');closePreview.classList.add('ux-preview-back');
  const contents=$('[data-ux=contents]');contents.classList.add('ux-contents-bottom');$('.ux-editor').append(contents);
  $('.ux-preview-help').textContent='Element antippen oder anklicken. Größe und Drehung direkt am Rahmen ändern.';
  const help=$('.ux-help-button');help.classList.add('ux-canvas-help');$('.ux-preview-tools').append(help);stageToolsToCanvas();
  function stageToolsToCanvas(){$('.stage').append($('.ux-preview-tools'));}
  // Chris 21.10.2026: Rückgängig, Wiederholen und Hilfe oben in einer Reihe mit „Vollbild“ (spart Platz).
  {const tools=$('.ux-preview-tools'),enlarge=$('.ux-enlarge');
   const align=()=>{if(!tools||!enlarge||!enlarge.offsetWidth)return;const preview=$('.ux-preview');if(preview){const pr=preview.getBoundingClientRect(),tr=tools.getBoundingClientRect();void pr;void tr;}tools.style.setProperty('--ux-tools-left',(enlarge.offsetLeft+enlarge.offsetWidth+8)+'px');tools.style.setProperty('--ux-tools-top',enlarge.offsetTop+'px');tools.style.setProperty('--ux-tools-h',enlarge.offsetHeight+'px');};
   // Warnhinweise direkt unter der Tafel (inkl. Bemaßung), nicht am unteren Rand des Vorschaufelds.
   const placeHints=()=>{const preview=$('.ux-preview'),scene=$('.ux-preview .scene');if(!preview||!scene)return;const pr=preview.getBoundingClientRect(),sr=scene.getBoundingClientRect();if(sr.height)preview.style.setProperty('--ux-hints-top',Math.round(sr.bottom-pr.top+6)+'px');};
   {const sync=el.sync;el.sync=function(...args){const v=sync.apply(this,args);requestAnimationFrame(placeHints);return v;};addEventListener('resize',placeHints);requestAnimationFrame(placeHints);}
   if(tools&&enlarge){align();requestAnimationFrame(align);if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(align);ro.observe(enlarge);ro.observe(tools);const pv=$('.ux-preview');if(pv)ro.observe(pv);}addEventListener('resize',align);}}
  const tabbar=document.createElement('div');tabbar.className='ux-tabbar';$('.ux-tabs').before(tabbar);tabbar.append($('.ux-tabs'));
  const mini=document.createElement('button');mini.type='button';mini.className='ux-mini';mini.dataset.ux='enlarge';mini.setAttribute('aria-label','Aktuelle Produktminiatur – Vollbild öffnen');mini.innerHTML='<span data-mini-art></span><span>Dein Produkt<small>Zum Vergrößern tippen</small></span>'+expand;$('.ux-shell').append(mini);
  const stage=$('.stage'),holder=$('.plate-holder');
  // Keep controls in a sibling layer above product, glass and base occlusion.
  const handles=document.createElement('div');handles.className='ux-selection-handles';stage.append(handles);
  handles.innerHTML=selectionArrowMarkup()+`<span class="ux-rotate-stem"></span><button type="button" data-ux-handle="rotate" aria-label="Element drehen – ziehen" title="Zum Drehen ziehen">↻</button>`+button('delete',icon('<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>'),'class="ux-handle-delete" aria-label="Ausgewähltes Element löschen"');
  const editPhoto=createPhotoEditor(api);
  installPhotoPosition(api);
  function updateSelection(){
    const o=selected(),enabled=o&&!o.uxHidden&&!o.uxLocked&&(!o.acrylicFixed||el.uxPhotoPositionActive?.(o));
    handles.hidden=!enabled;
    if(enabled){const a=(o.rotation||0)*Math.PI/180,scene=$('.scene').getBoundingClientRect(),ph=stage.getBoundingClientRect();
      const point=(dx,dy)=>({x:(scene.left-ph.left)+(o.x+dx*Math.cos(a)-dy*Math.sin(a))*scene.width/el.state.width,y:(scene.top-ph.top)+(o.y+dx*Math.sin(a)+dy*Math.cos(a))*scene.height/el.state.height});
      // Ecken-Pfeile sitzen an den Ecken des Auswahlrahmens (Chris 20.10.2026), diagonal nach außen: die innere
      // Ecke des sichtbaren 19-px-Knopfs berührt die Rahmenecke, so verdeckt der Pfeil den Text nicht.
      const margin=9.5*el.state.width/Math.max(1,scene.width);
      positionSelectionArrows(handles,o,point,margin);
      for(const h of handles.querySelectorAll('[data-ux-handle=scale]'))h.hidden=!el.uxPhotoPositionActive?.(o)&&el.uxCanEdit?.(o,'scale')===false;
      const gap=36*el.state.width/Math.max(1,scene.width),p=point(0,-o.h/2-gap);const h=handles.querySelector('[data-ux-handle=rotate]');h.style.left=p.x+'px';h.style.top=p.y+'px';
      const d=point(o.w/2+gap,0),remove=handles.querySelector('.ux-handle-delete');remove.style.left=Math.max(22,Math.min(ph.width-22,d.x))+'px';remove.style.top=Math.max(22,Math.min(ph.height-22,d.y))+'px';
    }
    // Reuse the displayed scene and existing image URLs; no profile loading.
    const scene=$('.scene');if(scene){const copy=scene.cloneNode(true);copy.removeAttribute('tabindex');copy.removeAttribute('role');copy.removeAttribute('data-ux-namespace');copy.setAttribute('aria-hidden','true');copy.querySelectorAll('[data-object]').forEach(n=>n.removeAttribute('data-object'));$('[data-mini-art]').replaceChildren(api.config?.acrylic&&!mini.hidden?completePreviewMini(stage,$('[data-mini-art]')):copy);}
    for(const row of all('.ux-upload-row')){const id=row.querySelector('[data-ux=replace-upload]')?.dataset.id;if(id&&!el.state.objects.find(o=>o.id===id)?.uxVectorLogo&&!row.querySelector('[data-ux=edit-upload]'))row.querySelector('.ux-upload-actions').insertAdjacentHTML('afterbegin',button('edit-upload','Bild bearbeiten',`data-id="${esc(id)}"`));}
  }
  el.uxRefreshSelectionHandles=updateSelection;
  const render=el.render;el.render=function(...args){const result=render.apply(this,args);updateSelection();return result;};
  const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);updateSelection();return result;};
  let resize=null;
  // Text keeps its generous hit rectangle. Only its unpainted area may yield
  // to a visible motif contour underneath; neither paint order nor SVG changes.
  function pointerObjectItem(event,item){
    const object=el.state.objects.find(o=>o.id===item?.dataset.object),node=event.target;
    const helper=(n,g)=>n?.localName==='rect'&&n.parentElement===g&&g.firstElementChild===n&&n.getAttribute('fill')==='transparent';
    if(object?.type!=='text'||!helper(node,item)||typeof r.elementsFromPoint!=='function'||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return item;
    const scene=item.closest('.scene'),view=scene?.ownerDocument?.defaultView;
    if(!scene||!view?.getComputedStyle)return item;
    const paint=value=>value&&value!=='none'&&value!=='transparent'&&!(/^(?:rgba|hsla)\(/.test(value)&&/,\s*0(?:\.0+)?\s*\)$/.test(value)||/\/\s*0(?:\.0+)?%?\s*\)$/.test(value));
    try{
      for(const hit of r.elementsFromPoint(event.clientX,event.clientY)){
        const group=hit.closest?.('[data-object]');
        if(!group||group.closest('.scene')!==scene||helper(hit,group)||['g','svg'].includes(hit.localName))continue;
        const style=view.getComputedStyle(hit);
        let visible=true;
        for(let parent=hit;parent&&parent!==scene;parent=parent.parentElement){const s=view.getComputedStyle(parent);if(s.visibility==='hidden'||s.visibility==='collapse'||s.display==='none'||Number(s.opacity)===0){visible=false;break;}}
        if(!visible)continue;
        if(typeof hit.isPointInFill!=='function'||typeof hit.isPointInStroke!=='function')return item;
        const matrix=hit.getScreenCTM();if(!matrix)continue;
        const p=scene.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
        const local=p.matrixTransform(matrix.inverse());
        if(!(paint(style.fill)&&Number(style.fillOpacity)>0&&hit.isPointInFill(local)||paint(style.stroke)&&Number(style.strokeOpacity)>0&&Number.parseFloat(style.strokeWidth)>0&&hit.isPointInStroke(local)))continue;
        const candidate=el.state.objects.find(o=>o.id===group.dataset.object);
        // The first actual painted object wins. Never tunnel through text,
        // a locked motif or another painted object to a lower motif.
        return candidate?.type==='motif'&&!candidate.uxLocked&&!candidate.uxHidden&&!candidate.locked&&!candidate.technicalLocked&&!candidate.acrylicFixed&&candidate.customerEditable!==false&&el.uxCanEdit?.(candidate,'move')!==false?group:item;
      }
    }catch{/* Unsupported SVG geometry/hit APIs keep the established text hit. */}
    return item;
  }
  const validPhotoGesture=prior=>prior.object.type!=='photoSlot'||el.state.designId===prior.old.designId&&selected()?.id===prior.object.id&&selected()?.uxUploadId===prior.object.uxUploadId&&!el.uxPhotoPositionActive?.(selected());
  function cancelPhotoGesture(prior){
    if(el.state.designId!==prior.old.designId)return;
    const object=el.state.objects.find(o=>o.id===prior.object.id);if(!object)return;
    // Cancel only this gesture's geometry, retaining a replacement upload,
    // its crop and a newly selected object.
    for(const key of ['x','y','w','h','rotation'])if(Object.hasOwn(prior.object,key))object[key]=prior.object[key];else delete object[key];
  }
  for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){if(resize?.object.type==='photoSlot'&&!validPhotoGesture(resize)){const prior=resize;resize=null;cancelPhotoGesture(prior);if(prior.target.hasPointerCapture(prior.id))prior.target.releasePointerCapture(prior.id);el.uxGuideGesture?.(false);}return original.apply(this,args);};}
  r.addEventListener('pointerdown',e=>{
    const h=e.target.closest('[data-ux-handle]'),nativeItem=e.target.closest('.scene [data-object]'),item=h?nativeItem:pointerObjectItem(e,nativeItem);if((!h&&!item)||e.button!==0)return;
    const o=item?el.state.objects.find(o=>o.id===item.dataset.object):selected();if(!o||o.uxLocked||o.uxHidden||o.acrylicFixed)return;
    if(o.type==='photoSlot'&&(o.locked||o.technicalLocked||o.customerEditable===false||el.uxCanEdit?.(o,h?.dataset.uxHandle==='scale'?'scale':'move')===false))return;
    if(h?.dataset.uxHandle==='rotate'&&el.uxCanRotate?.(o)===false)return;
    if(item&&el.uxToggleTextSelection?.(o.id)){e.preventDefault();e.stopImmediatePropagation();return;}
    e.preventDefault();e.stopImmediatePropagation();const old=structuredClone(el.state),point=el.point(e),target=h||holder;
    el.state.selected=o.id;el.uxGuideGesture?.(false);el.state.showHero=false;if(o.type==='text')showTab('text');el.sync();
    resize={id:e.pointerId,target,old,object:structuredClone(o),start:point,kind:h?.dataset.uxHandle||'move',moved:false};target.setPointerCapture(e.pointerId);
  },true);
  r.addEventListener('pointermove',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const p=el.point(e),o=selected(),start=resize.object;if(!o||start.type==='photoSlot'&&!validPhotoGesture(resize)){finish(e,true);return;}
    if(Math.hypot(p.x-resize.start.x,p.y-resize.start.y)<.3&&!resize.moved)return;resize.moved=true;if(start.type==='photoSlot')el.uxCancelPhotoTap?.();
    if(resize.kind==='move'){o.x=start.x+p.x-resize.start.x;o.y=start.y+p.y-resize.start.y;
      if(window.GravuruGuided){const state={...el.state,objects:el.state.objects.filter(x=>!x.uxHidden)},scale=el.uxTextScale?.()||1;const snapped=el.uxDragSnap?el.uxDragSnap(state,o,scale,resize.locks):window.GravuruGuided.snap(state,o,1.5/scale,resize.locks);o.x=snapped.x;o.y=snapped.y;resize.locks=snapped.locks;}
    }
    else if(resize.kind==='rotate'){const from=Math.atan2(resize.start.y-start.y,resize.start.x-start.x),to=Math.atan2(p.y-start.y,p.x-start.x);o.rotation=Math.round((start.rotation||0)+(to-from)*180/Math.PI);}
    else{const factor=selectionScaleFactor(start,resize.start,p);Object.assign(o,scaleObject(start,factor,el.uxTextScale?.()||1,el.uxMinTextMm));}
    el.uxGuideGesture?.(true,{kind:resize.kind,locks:resize.locks});el.normalize();el.render();
  },true);
  function finish(e,cancel=false){if(!resize||resize.id!==e.pointerId)return;e.stopImmediatePropagation();const prior=resize;resize=null;if(prior.target.hasPointerCapture(e.pointerId))prior.target.releasePointerCapture(e.pointerId);cancel=cancel||!validPhotoGesture(prior);if(cancel){if(prior.object.type==='photoSlot')cancelPhotoGesture(prior);else el.state=prior.old;}else if(prior.moved)el.record(prior.old);el.uxGuideGesture?.(false);el.sync();if(!cancel&&!prior.moved&&prior.kind==='move')el.uxTextTap?.(selected()?.id);if(!cancel&&prior.moved&&prior.kind==='move')el.uxSuggestCenter?.(selected());}
  el.uxCancelObjectGesture=()=>{if(resize)finish({pointerId:resize.id,stopImmediatePropagation(){}},true);};
  r.addEventListener('pointerup',e=>finish(e),true);r.addEventListener('pointercancel',e=>finish(e,true),true);
  r.addEventListener('lostpointercapture',e=>{if(resize?.id===e.pointerId)finish(e,true);},true);
  r.addEventListener('keydown',e=>{const h=e.target.closest('[data-ux-handle]');if(e.key==='Escape'&&resize?.object.type==='photoSlot'){e.preventDefault();finish({...e,pointerId:resize.id,stopImmediatePropagation:()=>e.stopImmediatePropagation()},true);return;}if(!h||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();const direction=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;mutate(()=>{const o=selected();if(h.dataset.uxHandle==='rotate'){if(el.uxCanRotate?.(o)===false)return;o.rotation=(o.rotation||0)+direction;}else Object.assign(o,scaleObject(o,1+direction*.03,el.uxTextScale?.()||1));});},true);
  r.addEventListener('click',async e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;
    if(key==='edit-upload'){select(e.target.closest('[data-id]').dataset.id);await editPhoto(selected());}
    if(key==='edit-photo')await editPhoto(selected());
    if(key?.startsWith('object-')){const o=selected();if(!o||o.uxLocked||o.uxHidden)return;
      if(key==='object-copy'&&!o.uxUploadId)await el.action('duplicate');
      if(key==='object-delete')await el.action('delete');
      if(key==='object-center')mutate(()=>o.x=el.state.width/2);
      if(key==='object-turn'&&el.uxCanRotate?.(o)!==false)mutate(()=>o.rotation=(o.rotation||0)+15);
      if((key==='object-smaller'||key==='object-bigger')&&o.uxUploadKind!=='photo')mutate(()=>Object.assign(o,scaleObject(o,key==='object-bigger'?1.1:1/1.1,el.uxTextScale?.()||1,el.uxMinTextMm)));
    }
  });
  function checkMini(){const before=mini.hidden;mini.hidden=!matchMedia('(max-width:900px)').matches||stage.getBoundingClientRect().bottom>72||$('.c-large-preview').open;$('.ux-shell').dataset.miniVisible=String(!mini.hidden);if(before&&!mini.hidden)updateSelection();}
  window.addEventListener('scroll',checkMini,{passive:true});window.addEventListener('resize',()=>{updateSelection();checkMini();});new ResizeObserver(()=>{updateSelection();checkMini();}).observe(stage);mini.hidden=true;
  $('.c-large-preview').addEventListener('close',checkMini);
  $('.c-large-preview').addEventListener('click',e=>{const d=e.currentTarget;if(e.target.closest('button,input,select,textarea,a,.fk-buy-dock,.stage'))return;const b=stage.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right)d.close();});
  // Keep the same exact option values and native change handlers.
  for(const s of all('.fk-options select'))s.classList.add('ux-readable-select');
  await installUsability(api);
  await installCustomerTools(api);
  await installWorkflow(api);
  installDirectEditing({...api,editPhoto});
  // Mikail 04.11.2026 / Astra #161: same tabs and guarded cart on mobile.
  await installModernMobileNavigation(api);
  updateSelection();
}
