// Presentation-only proxies. Original native actions retain validation/state.
export function freeFullscreenSurface(event,full) {
  const target=event.composedPath?.()[0]||event.target;
  if(!full?.open||!target||!full.contains(target))return false;
  if(target.closest?.('button,input,select,textarea,a,label,[role=button],[data-object],[data-ux-handle],.plate-holder,.scene,.ux-direct-edit,.fk-buy-dock,.md-compact-tools'))return false;
  if(target!==full&&!target.closest?.('.stage,.stage-wrap,.fk-live-preview'))return false;
  const bounds=full.querySelector('.plate-holder')?.getBoundingClientRect?.();
  if(bounds&&event.clientX>=bounds.left&&event.clientX<=bounds.right&&event.clientY>=bounds.top&&event.clientY<=bounds.bottom)return false;
  return true;
}

export function installDemoCompactControls({el,full,controls,returnButton}) {
  const r=el.shadowRoot,doc=el.ownerDocument||document,view=doc.defaultView||window;
  const sources={enlarge:r.querySelector('[data-ux=enlarge]'),reset:r.querySelector('.ux-design-reset button'),undo:r.querySelector('.md-history [data-ux=undo]'),redo:r.querySelector('.md-history [data-ux=redo]'),help:r.querySelector('.md-top [data-ux=help]'),contents:r.querySelector('.md-history [data-ux=contents]')};
  const cleanups=[],proxies=[];
  const on=(node,type,fn,options)=>{node.addEventListener(type,fn,options);cleanups.push(()=>node.removeEventListener(type,fn,options));};
  const makeBar=(parent,isFull)=>{
    const bar=doc.createElement('div');bar.className='md-compact-tools';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Vorschau steuern');
    const add=(key,label,content)=>{const source=sources[key];if(!source&&key!=='close')return;const b=doc.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.dataset.compactAction=key;if(content)b.innerHTML=content;else b.textContent=label;on(b,'click',()=>{if(key==='close'){full.close();return;}if(!source.disabled&&!source.hidden&&source.getAttribute('aria-disabled')!=='true')source.click();});bar.append(b);proxies.push({b,source});};
    add(isFull?'close':'enlarge',isFull?'Zurück zur Konfiguration':'Vollansicht');
    add('reset','Zurücksetzen');
    for(const [key,label,fallback] of [['undo','Rückgängig','↶'],['redo','Wiederholen','↷'],['help','Hilfe','?'],['contents','Ebenen','▱']])add(key,label,sources[key]?.querySelector('svg')?.outerHTML||fallback);
    parent.append(bar);return bar;
  };
  const normalBar=makeBar(controls,false),fullBar=makeBar(full,true);
  const style=doc.createElement('style');style.textContent=`
    :host([data-mobile-demo]) .md-compact-tools{display:none}
    :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .md-top [data-demo-product-return]{display:inline-flex!important;align-items:center;justify-content:center;gap:5px;min-height:40px!important;padding:5px 8px!important;border:1px solid #91aeb4!important;border-radius:9px!important;color:#125965!important;background:#fff!important;font-weight:650!important;line-height:1.15!important}
    :host([data-mobile-demo]) [data-demo-product-return]::before{content:'←';font-size:20px;line-height:1}
    :host([data-mobile-demo]) [data-demo-product-return]:disabled{opacity:.65!important}
    @media(min-width:1000px){
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .md-compact-tools{display:flex!important;align-items:center;gap:4px;flex:0 0 auto;padding:0!important;min-height:40px;box-sizing:border-box;background:#fff}
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .md-compact-tools button{position:static!important;display:inline-flex!important;align-items:center;justify-content:center;gap:4px;min-height:38px!important;height:38px!important;min-width:38px!important;width:auto!important;padding:6px!important;border:1px solid #d8e1e4!important;border-radius:8px!important;background:#fff!important;color:#125965!important;font-size:13px!important;line-height:1.15!important;margin:0!important}
      :host([data-mobile-demo]) .md-compact-tools button:disabled{opacity:.4!important}
      :host([data-mobile-demo]) .md-compact-tools button:focus-visible{outline:2px solid #125965!important;outline-offset:2px}
      :host([data-mobile-demo]) .md-compact-tools svg{width:21px;height:21px;pointer-events:none}
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .md-top :is([data-ux=undo],[data-ux=redo],[data-ux=contents],[data-ux=help]),
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .md-controls>.ux-design-reset{display:none!important}
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .md-controls{justify-content:flex-start!important;gap:6px!important;padding:6px 10px!important}
      :host([data-mobile-demo]) .md-controls>.md-compact-tools{order:-2}
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .md-controls>.ux-view-zoom{flex:1 1 130px!important;min-width:100px!important;max-width:220px!important;width:auto!important}
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview[open]{padding-top:4px!important;gap:3px!important}
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview>.ux-preview-back,
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview>.ux-fullscreen-hint,
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .ux-canvas-toolbar,
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .ux-workbench-toolbar,
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .stage>.ux-design-reset{display:none!important}
      :host([data-mobile-demo]) .c-large-preview>.stage-wrap,:host([data-mobile-demo]) .c-large-preview>.fk-live-preview{order:0}
      :host([data-mobile-demo]) .c-large-preview .md-compact-tools{align-self:flex-start;margin:0 0 0 6px!important;flex:none}
      :host([data-mobile-demo]) .c-large-preview>.fk-buy-dock{order:2}
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .stage:not(.acryl-scene){padding-top:max(12px,var(--ux-toolbar-space,0px))!important}
    }
  `;r.append(style);
  const sync=()=>{for(const {b,source}of proxies)if(source)b.disabled=source.disabled||source.hidden||source.getAttribute('aria-disabled')==='true';if(full.open){const dock=full.querySelector('.fk-buy-dock');if(dock)dock.before(fullBar);}};
  const observer=new MutationObserver(sync);for(const source of Object.values(sources))if(source)observer.observe(source,{attributes:true,attributeFilter:['disabled','hidden','aria-disabled']});observer.observe(full,{attributes:true,attributeFilter:['open']});sync();
  let down=null,last=null;const pointers=new Set();
  const clear=()=>{down=null;last=null;pointers.clear();};
  on(full,'dblclick',event=>{if(freeFullscreenSurface(event,full)){event.preventDefault();clear();full.close();}});
  on(full,'pointerdown',event=>{if(event.isPrimary===true&&pointers.size)clear();pointers.add(event.pointerId);if(pointers.size>1){down=null;last=null;return;}down=(event.pointerType==='touch'||event.pointerType==='pen')&&freeFullscreenSurface(event,full)?{id:event.pointerId,x:event.clientX,y:event.clientY}:null;});
  on(full,'pointermove',event=>{if(down?.id===event.pointerId&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>8){down=null;last=null;}});
  on(full,'pointerup',event=>{pointers.delete(event.pointerId);const start=down;down=null;if(!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>8||!freeFullscreenSurface(event,full)){last=null;return;}const now=event.timeStamp||Date.now();if(last&&now-last.time<420&&Math.hypot(last.x-event.clientX,last.y-event.clientY)<24){event.preventDefault();clear();full.close();}else last={time:now,x:event.clientX,y:event.clientY};});
  on(full,'pointercancel',clear);on(full,'close',clear);on(view,'blur',clear);
  on(view,'pointerup',event=>{pointers.delete(event.pointerId);if(down?.id===event.pointerId)down=null;});on(view,'pointercancel',clear);
  return{dispose(){observer.disconnect();cleanups.forEach(fn=>fn());normalBar.remove();fullBar.remove();style.remove();clear();}};
}
