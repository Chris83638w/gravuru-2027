import {completePreviewMini} from './preview-feedback.mjs';
import {installDirectEditing} from './direct-editing.mjs';
import {installPhotoPosition} from './photo-position.mjs';
import {scaleObject} from './image-processing.mjs';
import {createPhotoEditor} from './photo-editor.mjs';
import {installUsability} from './usability.mjs';
import {installWorkflow} from './workflow.mjs';
import {installCustomerTools} from './customer-tools.mjs';
import {installMobileSteps} from './mobile-steps.mjs';

export async function installRefinements(api){
  const {el,r,files,selected,select,mutate,showTab,say,dialog,button,esc,dialogs}=api;
  const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
  const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/refinements.css').then(res=>{if(!res.ok)throw Error('Bedienoberfläche fehlt.');return res.text();});r.append(style);
  const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const expand=icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>');
  $('#ux-tab-options .ux-tab-icon').innerHTML=icon('<path d="m10 2-.6 2.1-2 .9-2-.7-2 3.4 1.5 1.6-.2 2.3L3 13l2 3.5 2.1-.5 1.8 1.3.6 2.2h4l.6-2.2 1.8-1.3 2.1.5 2-3.5-1.7-1.4-.2-2.3 1.5-1.6-2-3.4-2 .7-2-.9L14 2Z"/><circle cx="11.9" cy="10.8" r="3"/>');
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
  const tabbar=document.createElement('div');tabbar.className='ux-tabbar';$('.ux-tabs').before(tabbar);tabbar.append($('.ux-tabs'));
  const mini=document.createElement('button');mini.type='button';mini.className='ux-mini';mini.dataset.ux='enlarge';mini.setAttribute('aria-label','Aktuelle Produktminiatur – Vollbild öffnen');mini.innerHTML='<span data-mini-art></span><span>Dein Produkt<small>Zum Vergrößern tippen</small></span>'+expand;$('.ux-shell').append(mini);
  const stage=$('.stage'),holder=$('.plate-holder');
  // Keep controls in a sibling layer above product, glass and base occlusion.
  const handles=document.createElement('div');handles.className='ux-selection-handles';stage.append(handles);
  handles.innerHTML=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y],i)=>`<button type="button" data-ux-handle="scale" data-corner="${x},${y}" aria-label="Elementgröße ziehen – Ecke ${i+1}" title="Zum Vergrößern ziehen">${icon('<path d="M5 14V5h9M5 5l14 14"/>')}</button>`).join('')+`<span class="ux-rotate-stem"></span><button type="button" data-ux-handle="rotate" aria-label="Element drehen – ziehen" title="Zum Drehen ziehen">↻</button>`+button('delete',icon('<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>'),'class="ux-handle-delete" aria-label="Ausgewähltes Element löschen"');
  const editPhoto=createPhotoEditor(api);
  installPhotoPosition(api);
  function updateSelection(){
    const o=selected(),enabled=o&&!o.uxHidden&&!o.uxLocked&&(!o.acrylicFixed||el.uxCanPositionPhoto?.(o));
    handles.hidden=!enabled;
    if(enabled){const a=(o.rotation||0)*Math.PI/180,scene=$('.scene').getBoundingClientRect(),ph=stage.getBoundingClientRect();
      const point=(dx,dy)=>({x:(scene.left-ph.left)+(o.x+dx*Math.cos(a)-dy*Math.sin(a))*scene.width/el.state.width,y:(scene.top-ph.top)+(o.y+dx*Math.sin(a)+dy*Math.cos(a))*scene.height/el.state.height});
      // Ecken-Pfeile sitzen genau an den Ecken des Auswahlrahmens (Chris 20.10.2026).
      const margin=0;
      for(const h of handles.querySelectorAll('[data-corner]')){const [x,y]=h.dataset.corner.split(',').map(Number),p=point(x*(o.w/2+margin),y*(o.h/2+margin));h.style.left=p.x+'px';h.style.top=p.y+'px';}
      const gap=36*el.state.width/Math.max(1,scene.width),p=point(0,-o.h/2-gap);const h=handles.querySelector('[data-ux-handle=rotate]');h.style.left=p.x+'px';h.style.top=p.y+'px';
      const d=point(o.w/2+gap,0),remove=handles.querySelector('.ux-handle-delete');remove.style.left=d.x+'px';remove.style.top=d.y+'px';
    }
    // Reuse the displayed scene and existing image URLs; no profile loading.
    const scene=$('.scene');if(scene){const copy=scene.cloneNode(true);copy.removeAttribute('tabindex');copy.removeAttribute('role');copy.removeAttribute('data-ux-namespace');copy.setAttribute('aria-hidden','true');copy.querySelectorAll('[data-object]').forEach(n=>n.removeAttribute('data-object'));$('[data-mini-art]').replaceChildren(api.config?.acrylic&&!mini.hidden?completePreviewMini(stage,$('[data-mini-art]')):copy);}
    for(const row of all('.ux-upload-row')){const id=row.querySelector('[data-ux=replace-upload]')?.dataset.id;if(id&&!row.querySelector('[data-ux=edit-upload]'))row.querySelector('.ux-upload-actions').insertAdjacentHTML('afterbegin',button('edit-upload','Bild bearbeiten',`data-id="${esc(id)}"`));}
  }
  const render=el.render;el.render=function(...args){const result=render.apply(this,args);updateSelection();return result;};
  const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);updateSelection();return result;};
  let resize=null;
  r.addEventListener('pointerdown',e=>{
    const h=e.target.closest('[data-ux-handle]'),item=e.target.closest('.scene [data-object]');if((!h&&!item)||e.button!==0)return;
    const o=item?el.state.objects.find(o=>o.id===item.dataset.object):selected();if(!o||o.uxLocked||o.uxHidden||o.acrylicFixed)return;
    if(item&&el.uxToggleTextSelection?.(o.id)){e.preventDefault();e.stopImmediatePropagation();return;}
    e.preventDefault();e.stopImmediatePropagation();const old=structuredClone(el.state),point=el.point(e),target=h||holder;
    el.state.selected=o.id;el.uxGuideGesture?.(true);el.state.showHero=false;if(o.type==='text')showTab('text');el.sync();
    resize={id:e.pointerId,target,old,object:structuredClone(o),start:point,kind:h?.dataset.uxHandle||'move',moved:false};target.setPointerCapture(e.pointerId);
  },true);
  r.addEventListener('pointermove',e=>{if(!resize||resize.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const p=el.point(e),o=selected(),start=resize.object;if(!o)return;
    if(Math.hypot(p.x-resize.start.x,p.y-resize.start.y)<.3&&!resize.moved)return;resize.moved=true;
    if(resize.kind==='move'){o.x=start.x+p.x-resize.start.x;o.y=start.y+p.y-resize.start.y;
      if(window.GravuruGuided){const scene=$('.scene').getBoundingClientRect(),state={...el.state,objects:el.state.objects.filter(x=>!x.uxHidden)};const snapped=window.GravuruGuided.snap(state,o,7/Math.max(.1,scene.width/el.state.width),resize.locks);o.x=snapped.x;o.y=snapped.y;resize.locks=snapped.locks;}
    }
    else if(resize.kind==='rotate'){const from=Math.atan2(resize.start.y-start.y,resize.start.x-start.x),to=Math.atan2(p.y-start.y,p.x-start.x);o.rotation=Math.round((start.rotation||0)+(to-from)*180/Math.PI);}
    else{const factor=Math.hypot(p.x-start.x,p.y-start.y)/Math.max(.1,Math.hypot(resize.start.x-start.x,resize.start.y-start.y));Object.assign(o,scaleObject(start,factor,el.uxTextScale?.()||1,el.uxMinTextMm));}
    el.normalize();el.render();
  },true);
  function finish(e,cancel=false){if(!resize||resize.id!==e.pointerId)return;e.stopImmediatePropagation();const prior=resize;resize=null;if(prior.target.hasPointerCapture(e.pointerId))prior.target.releasePointerCapture(e.pointerId);if(cancel)el.state=prior.old;else if(prior.moved)el.record(prior.old);el.uxGuideGesture?.(false);el.sync();if(!cancel&&!prior.moved&&prior.kind==='move')el.uxTextTap?.(selected()?.id);if(!cancel&&prior.moved&&prior.kind==='move')el.uxSuggestCenter?.(selected());}
  r.addEventListener('pointerup',e=>finish(e),true);r.addEventListener('pointercancel',e=>finish(e,true),true);
  r.addEventListener('lostpointercapture',e=>{if(resize?.id===e.pointerId)finish(e,true);},true);
  r.addEventListener('keydown',e=>{const h=e.target.closest('[data-ux-handle]');if(!h||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();const direction=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;mutate(()=>{const o=selected();if(h.dataset.uxHandle==='rotate')o.rotation=(o.rotation||0)+direction;else Object.assign(o,scaleObject(o,1+direction*.03,el.uxTextScale?.()||1));});},true);
  function areaResize(field){field.style.height='auto';field.style.height=Math.min(200,Math.max(44,field.scrollHeight))+'px';}
  r.addEventListener('focusin',e=>{if(e.target.matches('[data-ux-text]'))areaResize(e.target);});
  r.addEventListener('input',e=>{if(e.target.matches('[data-ux-text]'))areaResize(e.target);},true);
  r.addEventListener('focusout',e=>{if(e.target.matches('[data-ux-text]')){e.target.style.height='40px';e.target.scrollTop=0;}});
  r.addEventListener('click',async e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;
    if(key==='edit-upload'){select(e.target.closest('[data-id]').dataset.id);await editPhoto(selected());}
    if(key==='edit-photo')await editPhoto(selected());
    if(key?.startsWith('object-')){const o=selected();if(!o||o.uxLocked||o.uxHidden)return;
      if(key==='object-copy'&&!o.uxUploadId)await el.action('duplicate');
      if(key==='object-delete')await el.action('delete');
      if(key==='object-center')mutate(()=>o.x=el.state.width/2);
      if(key==='object-turn')mutate(()=>o.rotation=(o.rotation||0)+15);
      if(key==='object-smaller'||key==='object-bigger')mutate(()=>Object.assign(o,scaleObject(o,key==='object-bigger'?1.1:1/1.1,el.uxTextScale?.()||1,el.uxMinTextMm)));
    }
  });
  function checkMini(){const before=mini.hidden;mini.hidden=!matchMedia('(max-width:900px)').matches||stage.getBoundingClientRect().bottom>72||$('.c-large-preview').open;$('.ux-shell').dataset.miniVisible=String(!mini.hidden);if(before&&!mini.hidden)updateSelection();}
  window.addEventListener('scroll',checkMini,{passive:true});window.addEventListener('resize',()=>{updateSelection();checkMini();});new ResizeObserver(()=>{updateSelection();checkMini();}).observe(stage);mini.hidden=true;
  $('.c-large-preview').addEventListener('close',checkMini);
  $('.c-large-preview').addEventListener('click',e=>{const d=e.currentTarget;if(e.target.closest('button,input,select,textarea,a,.fk-buy-dock,.stage'))return;const b=stage.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right)d.close();});
  // Keep the same exact option values and native change handlers.
  for(const s of all('.fk-options select'))s.classList.add('ux-readable-select');
  const category=$('[data-library-category]');
  if(category){
    const choices=()=>[...category.options],keys=()=>el.uxMotifChoiceIds??Object.keys(el.motifs).filter(k=>!k.startsWith('ux-line-'));
    const imageFor=name=>{const entry=window.GravuruMotifCategories?.find(m=>m.category===name),key=entry?.key||(name==='Grundmotive'&&keys().includes('branch')?'branch':keys().find(k=>(el.labels?.[k]||el.catalog.motif_labels?.[k]||k).toLocaleLowerCase('de').includes(name.toLocaleLowerCase('de').replace(/e[nr]?$/,''))));return key?el.motifs[key]:'';};
    const categoryDialog=dialog('categories','Motivkategorie wählen','<div class="ux-category-list"></div>');
    const selector=document.createElement('div');selector.className='ux-category-control';selector.innerHTML=button('categories','Kategorie wählen');category.after(selector);category.hidden=true;
    function setCategory(index){const options=choices(),i=(index+options.length)%options.length;category.value=options[i].value;category.dispatchEvent(new Event('change',{bubbles:true}));refreshCategory();}
    function refreshCategory(){const chosen=choices().find(o=>o.selected);$('[data-ux=categories]').innerHTML=`<span aria-hidden="true"><svg viewBox="0 0 100 100">${imageFor(chosen.textContent)||'<path d="M20 15h60v70H20Z" fill="none" stroke="currentColor" stroke-width="4"/>'}</svg></span>${esc(chosen.textContent)}<span aria-hidden="true">⌄</span>`;}
    r.addEventListener('click',e=>{const b=e.target.closest('[data-ux]');if(!b)return;const key=b.dataset.ux;if(key==='category-prev'||key==='category-next')setCategory(category.selectedIndex+(key==='category-next'?1:-1));
      if(key==='categories'){$('.ux-category-list').innerHTML=choices().map((o,i)=>button('category-pick',`<svg viewBox="0 0 100 100" aria-hidden="true">${imageFor(o.textContent)||'<path d="M20 15h60v70H20Z" fill="none" stroke="currentColor" stroke-width="4"/>'}</svg><span>${esc(o.textContent)}</span>`,`data-index="${i}" aria-pressed="${o.selected}"`)).join('');categoryDialog.showModal();}
      if(key==='category-pick'){setCategory(Number(b.dataset.index));categoryDialog.close();}
    });
    for(const surface of [selector,$('[data-library-grid]')].filter(Boolean)){
      let swipe,suppress=false;surface.style.touchAction='pan-y';
      surface.addEventListener('pointerdown',e=>{suppress=false;swipe={x:e.clientX,y:e.clientY};});
      surface.addEventListener('pointerup',e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5){suppress=true;setCategory(category.selectedIndex+(dx<0?1:-1));}swipe=null;});
      surface.addEventListener('pointercancel',()=>{swipe=null;suppress=false;});surface.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();e.stopImmediatePropagation();}},true);
    }refreshCategory();
  }
  await installUsability(api);
  await installCustomerTools(api);
  await installWorkflow(api);
  installDirectEditing({...api,editPhoto});
  $('#ux-panel-upload > p.ux-small').textContent='Dein Bild wird direkt übernommen. Über „Bild bearbeiten“ kannst du es zuschneiden oder anpassen.';
  // K11: geführte Schritte unter 768 px (eigenes Modul, Desktop-Reiter bleiben unverändert).
  await installMobileSteps(api);
  updateSelection();
}
