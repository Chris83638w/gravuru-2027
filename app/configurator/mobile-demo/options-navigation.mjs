// Demo navigation only. Native option controls, values and information buttons
// stay authoritative; scrolling is confined to the existing inspector.
const installed = new WeakMap();
const kinds = new Set(['material','size','mounting']);
const selectors = {
  material:['[data-picture-group="material"]','[data-m-option="material"]'],
  size:['.family-sizes','[data-picture-group="size"]','[data-family-group="size"]','[data-stake-size]','[data-m-option="size"]','.family-fixed-size','[data-m-option="format"]'],
  mounting:['.family-mounting','[data-picture-group="mounting"]','.completion-mount','[data-m-option="mounting"]','[data-fk-mount]']
};

export function installDemoOptionsNavigation(el) {
  if (installed.has(el)) return installed.get(el);
  const root=el?.shadowRoot,doc=el?.ownerDocument;
  const panel=root?.querySelector('#ux-panel-options'),editor=panel?.closest('.ux-editor');
  if (!root || !doc || !panel || !editor) return null;
  const view=doc.defaultView,entries=new Map();
  let disposed=false,refreshing=false,materialSummary=null,materialValue=null,materialParent=null;
  const style=doc.createElement('style');
  style.textContent=':host([data-mobile-demo]) .ux-info-links .md-options-jump{font:inherit!important;color:inherit!important;background:transparent!important;border:0!important;margin:0!important;padding:0 2px!important;min-width:0!important;text-decoration:underline;text-underline-offset:3px;cursor:pointer}:host([data-mobile-demo]) .md-options-material{margin:6px 0 12px;padding:0;font-size:13px;line-height:1.45}';
  root.append(style);

  function available(node) {
    if (!node || !panel.contains(node)) return false;
    // Ignore the panel's own hidden state so its links are ready on entry.
    for (let current=node;current && current!==panel;current=current.parentElement) {
      if (current.hidden || current.getAttribute('aria-hidden')==='true' || current.dataset?.visualOnly==='true' ||
          (current.tagName==='DIALOG' && !current.open)) return false;
      const computed=view?.getComputedStyle?.(current);
      if (computed?.display==='none' || computed?.visibility==='hidden' || computed?.visibility==='collapse') return false;
    }
    return true;
  }
  function nativeTarget(kind) {
    for (const selector of selectors[kind] || []) for (const node of panel.querySelectorAll(selector)) {
      if (!available(node)) continue;
      const target=node.closest('[role="group"]') || node.closest('label') || node;
      if (!available(target)) continue;
      const heading=target.previousElementSibling;
      return heading?.matches('h3,legend') && available(heading) ? heading : target;
    }
    return null;
  }
  function targetFor(kind) { return nativeTarget(kind) || (kind==='material' && available(materialSummary) ? materialSummary : null); }
  function scrollTo(kind) {
    if (disposed || panel.hidden || editor.inert) return;
    const target=targetFor(kind);
    if (!target) return;
    const editorRect=editor.getBoundingClientRect(),targetRect=target.getBoundingClientRect();
    const header=editor.querySelector('.md-sheet-header');
    const headerHeight=header && !header.hidden ? header.getBoundingClientRect().height : 0;
    const top=editor.scrollTop+targetRect.top-editorRect.top-(editor.clientTop || 0)-headerHeight-8;
    const limit=Math.max(0,editor.scrollHeight-editor.clientHeight);
    const position={top:Math.max(0,Math.min(limit,top)),left:editor.scrollLeft || 0,behavior:view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'};
    // scrollIntoView/focus would also scroll outer ancestors and move the canvas.
    if (typeof editor.scrollTo==='function') editor.scrollTo(position); else editor.scrollTop=position.top;
  }
  function unwrap(term,entry) {
    entry.button.removeEventListener('click',entry.click);
    if (entry.button.parentNode===term) entry.button.replaceWith(entry.text);
    entries.delete(term);
  }
  function materialInformation(info) {
    const source=root.querySelector('.fk-material-note');
    const parent=source?.parentNode || root.querySelector('.c-design-section');
    if (parent!==materialParent) {
      materialObserver.disconnect();materialParent=parent;
      if (parent) materialObserver.observe(parent,{childList:true,subtree:true,characterData:true});
    }
    const text=source?.textContent?.trim() || '';
    // Copy only an existing readable native value; never fabricate a material,
    // thickness or selection when the product has none.
    const usable=text && !/\b(?:undefined|null|NaN|Infinity)\b|\[object\s|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
    if (!info || nativeTarget('material') || !usable) {
      materialSummary?.remove();materialSummary=null;materialValue=null;return;
    }
    if (!materialSummary || !panel.contains(materialSummary)) {
      materialSummary?.remove();materialSummary=doc.createElement('p');materialSummary.className='md-options-material';
      materialSummary.setAttribute('data-demo-options-material','');
      const title=doc.createElement('strong');title.textContent='Material: ';
      materialValue=doc.createElement('span');materialSummary.append(title,materialValue);
      info.closest('.ux-info-links').after(materialSummary);
    }
    if (materialValue.textContent!==text) materialValue.textContent=text;
  }
  function refresh() {
    if (disposed || refreshing) return;
    refreshing=true;
    try {
      const infos=[...panel.querySelectorAll('.ux-info-links [data-ux-info]')].filter(info=>kinds.has(info.dataset.uxInfo));
      materialInformation(infos.find(info=>info.dataset.uxInfo==='material'));
      const present=new Set(infos.map(info=>info.closest('.ux-info-term')));
      for (const [term,entry] of entries) if (!present.has(term) || !targetFor(entry.kind)) unwrap(term,entry);
      for (const info of infos) {
        const term=info.closest('.ux-info-term'),kind=info.dataset.uxInfo;
        if (!term || entries.has(term) || !targetFor(kind)) continue;
        const text=[...term.childNodes].find(node=>node.nodeType===3 && node.textContent.trim());
        if (!text) continue;
        const button=doc.createElement('button');button.type='button';button.className='md-options-jump';button.dataset.demoOptionNav=kind;
        button.setAttribute('aria-label',text.textContent.trim()+' anzeigen');
        const click=()=>scrollTo(kind);button.addEventListener('click',click);
        text.replaceWith(button);button.append(text);entries.set(term,{button,text,click,kind});
      }
    } finally { refreshing=false; }
  }
  const Observer=view?.MutationObserver || globalThis.MutationObserver;
  const observer=new Observer(refresh),materialObserver=new Observer(refresh);
  observer.observe(panel,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-hidden','data-visual-only','style']});
  const api={dispose() {
    if (disposed) return;
    disposed=true;observer.disconnect();materialObserver.disconnect();
    for (const [term,entry] of entries) unwrap(term,entry);
    materialSummary?.remove();style.remove();installed.delete(el);
  }};
  installed.set(el,api);refresh();return api;
}
