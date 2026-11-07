// Demo presentation only. Native controls stay in their original parents;
// delegated option, price, visibility and colour-dialog handlers keep ownership.
const installed=new WeakMap();
const kinds=['material','size','mounting'],sectionAttribute='data-demo-option-section';
const primaryKind=key=>['size','format','form'].includes(key)?'size':['material','color'].includes(key)?'material':'mounting';

export function installDemoOptionsNavigation(el) {
  if(el&&installed.has(el))return installed.get(el);
  const root=el?.shadowRoot,doc=el?.ownerDocument,panel=root?.querySelector('#ux-panel-options'),editor=panel?.closest('.ux-editor');
  if(!root||!doc||!panel||!editor)return null;
  const view=doc.defaultView,entries=new Map(),ownedAttributes=new Map();
  let disposed=false,refreshing=false,active='size',materialSummary=null,materialValue=null,materialParent=null;
  let currentSections=new Map(),currentKinds=new Set();
  const style=doc.createElement('style');
  const scope=':host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) #ux-panel-options';
  style.textContent=kinds.map(kind=>scope+'[data-demo-options-active="'+kind+'"]:not([data-demo-options-measuring]) ['+sectionAttribute+']:not(['+sectionAttribute+'="'+kind+'"]):not(dialog[open]){display:none!important}').join('')+`
    :host([data-mobile-demo]) #ux-panel-options .ux-info-links[data-demo-options-tabs]{position:sticky;top:var(--md-options-header-height,52px);z-index:4;align-items:stretch;gap:6px;flex-wrap:nowrap;margin:0 0 12px!important;padding:4px 0 8px;background:#fff;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin}
    :host([data-mobile-demo]) #ux-panel-options [data-demo-option-tab]{align-items:center;flex:1 0 auto;gap:0;min-width:0;border:1px solid #d6e0e3;border-radius:9px;background:#f6f8f9;overflow:hidden}
    :host([data-mobile-demo]) #ux-panel-options [data-demo-option-tab][data-demo-option-active]{border-color:#7aafb9;background:#e7f3f5}
    :host([data-mobile-demo]) #ux-panel-options .md-options-tab{flex:1;min-height:44px!important;min-width:0!important;margin:0!important;padding:8px 7px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#405762!important;font-size:13px!important;line-height:1.2!important;font-weight:600!important;text-decoration:none!important;white-space:nowrap}
    :host([data-mobile-demo]) #ux-panel-options .md-options-tab[aria-pressed="true"]{color:#21565f!important;font-weight:700!important}
    :host([data-mobile-demo]) #ux-panel-options .md-options-tab:disabled{opacity:.55!important;cursor:default}
    :host([data-mobile-demo]) #ux-panel-options [data-demo-option-tab]>.ux-info-button{flex:none;min-height:36px!important;min-width:28px!important;width:28px!important;margin:0 3px 0 0!important;padding:4px!important;border:0!important;background:transparent!important;color:#405762!important}
    :host([data-mobile-demo]) #ux-panel-options [data-demo-option-tab]>.ux-info-button svg{width:20px!important;height:20px!important}
    :host([data-mobile-demo]) #ux-panel-options .md-options-tab:focus-visible{outline:2px solid #29727f!important;outline-offset:-3px}
    :host([data-mobile-demo]) #ux-panel-options .md-options-material{margin:6px 0 12px;padding:0;font-size:14px;line-height:1.5}
    /* One native option body gets its own scrolling area. Tabs stay still;
       no native node is moved. Legacy layouts retain their native scroll area. */
    :host([data-mobile-demo][data-demo-sheet="panel"]) .ux-editor:has(>#ux-panel-options[data-demo-options-layout="stack"]:not([hidden])){display:flex!important;flex-direction:column;overflow:hidden!important}
    :host([data-mobile-demo][data-demo-sheet="panel"]) .ux-editor:has(>#ux-panel-options[data-demo-options-layout="stack"]:not([hidden]))>.md-sheet-header,
    :host([data-mobile-demo][data-demo-sheet="panel"]) .ux-editor:has(>#ux-panel-options[data-demo-options-layout="stack"]:not([hidden]))>.ux-status{flex:none}
    ${scope}[data-demo-options-layout="stack"]:not([hidden]){flex:1;box-sizing:border-box;min-height:0!important;overflow:hidden!important}
    ${scope}[data-demo-options-layout="stack"]:not([data-demo-options-measuring])>.fk-options:not([hidden]){display:flex!important;flex-direction:column;min-height:0!important;height:100%;overflow:hidden}
    ${scope}[data-demo-options-layout="stack"]>.fk-options>.ux-info-links{flex:none;position:relative;top:auto}
    ${scope}[data-demo-options-layout="stack"]>.fk-options>h2,${scope}[data-demo-options-layout="stack"]>.fk-options>.md-options-material{flex:none}
    ${scope}[data-demo-options-layout="stack"]>.fk-options>.m-options{flex:1;min-height:0!important;overflow:auto!important;overflow-anchor:none;overscroll-behavior:contain;padding-bottom:6px;-webkit-overflow-scrolling:touch}
  `;
  root.append(style);
  function attribute(node,name,value) {
    let old=ownedAttributes.get(node);if(!old){old=new Map();ownedAttributes.set(node,old);}
    if(!old.has(name))old.set(name,node.getAttribute(name));
    if(value===null){if(node.getAttribute(name)!==null)node.removeAttribute(name);}
    else if(node.getAttribute(name)!==String(value))node.setAttribute(name,String(value));
  }
  function restore(node,name) {
    const old=ownedAttributes.get(node);if(!old?.has(name))return;
    const value=old.get(name);value===null?node.removeAttribute(name):node.setAttribute(name,value);
    old.delete(name);if(!old.size)ownedAttributes.delete(node);
  }
  function available(node) {
    if(!node||!panel.contains(node))return false;
    for(let current=node;current&&current!==panel;current=current.parentElement){
      if(current.hidden||current.getAttribute('aria-hidden')==='true'||current.dataset?.visualOnly==='true'||current.tagName==='DIALOG'&&!current.open)return false;
      const computed=view?.getComputedStyle?.(current);
      if(computed?.display==='none'||['hidden','collapse'].includes(computed?.visibility))return false;
    }
    return true;
  }
  function unwrap(term,entry) {
    entry.button.removeEventListener('click',entry.click);
    if(entry.button.parentNode===term)entry.button.replaceWith(entry.text);
    restore(term,'data-demo-option-tab');restore(term,'data-demo-option-active');entries.delete(term);
  }
  function materialInformation(info) {
    const source=root.querySelector('.fk-material-note'),parent=source?.parentNode||root.querySelector('.c-design-section');
    if(parent!==materialParent){materialObserver.disconnect();materialParent=parent;if(parent)materialObserver.observe(parent,{childList:true,subtree:true,characterData:true});}
    const text=source?.textContent?.trim()||'',usable=text&&!/\b(?:undefined|null|NaN|Infinity)\b|\[object\s|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
    const selectable=[...panel.querySelectorAll('[data-picture-group="material"],[data-m-option="material"]')].some(available);
    if(!info||selectable||!usable){materialSummary?.remove();materialSummary=null;materialValue=null;return;}
    if(!materialSummary||!panel.contains(materialSummary)){
      materialSummary?.remove();materialSummary=doc.createElement('p');materialSummary.className='md-options-material';materialSummary.setAttribute('data-demo-options-material','');
      const title=doc.createElement('strong');title.textContent='Material: ';materialValue=doc.createElement('span');materialSummary.append(title,materialValue);info.closest('.ux-info-links').after(materialSummary);
    }
    if(materialValue.textContent!==text)materialValue.textContent=text;
  }
  function classify() {
    const next=new Map(),put=(node,kind)=>{if(node&&kinds.includes(kind))next.set(node,kind);};
    if(materialSummary)put(materialSummary,'material');
    for(const pictures of panel.querySelectorAll('.m-option-pictures')){
      let preceding=[];
      for(const child of pictures.children){
        if(child.matches('h3,legend,p')&&!child.matches('.family-fixed-size')){preceding.push(child);continue;}
        let kind;
        if(child.matches('.family-shapes,.family-sizes,.family-fixed-size'))kind='size';
        else if(child.matches('.family-colors'))kind='material';
        else if(child.matches('.family-mounting,dialog'))kind='mounting';
        else {
          const option=child.matches('[data-picture-group],[data-family-group],[data-stake-size]')?child:child.querySelector('[data-picture-group],[data-family-group],[data-stake-size]');
          kind=option?.getAttribute('data-stake-size')!=null?'size':primaryKind(option?.dataset.pictureGroup||option?.dataset.familyGroup||child.dataset.choiceGroup);
        }
        put(child,kind);for(const node of preceding)put(node,kind);preceding=[];
      }
      for(const node of preceding)put(node,'mounting');
    }
    for(const select of panel.querySelectorAll('[data-m-option]'))put(select.closest('label')||select,primaryKind(select.dataset.mOption));
    for(const box of panel.querySelectorAll('.m-option-fields'))put(box,'mounting');
    for(const node of panel.querySelectorAll('.completion-mount'))put(node,'mounting');
    for(const select of panel.querySelectorAll('[data-fk-mount]'))put(select.closest('label')||select,'mounting');
    for(const node of currentSections.keys())if(!next.has(node))restore(node,sectionAttribute);
    for(const [node,kind]of next)attribute(node,sectionAttribute,kind);currentSections=next;
  }
  function renderActive() {
    attribute(panel,'data-demo-options-active',active);
    for(const [term,entry]of entries){
      entry.button.disabled=!currentKinds.has(entry.kind);const selected=active===entry.kind&&currentKinds.has(entry.kind);
      entry.button.setAttribute('aria-pressed',String(selected));attribute(term,'data-demo-option-active',selected?'':null);
    }
  }
  function choose(kind) {
    if(disposed||panel.hidden||editor.inert||!currentKinds.has(kind)||kind===active)return;
    active=kind;renderActive();
    // Only the dedicated body's position resets, never the editor/page/canvas.
    if(panel.dataset.demoOptionsLayout==='stack'){const body=panel.querySelector('.m-options');if(body)body.scrollTop=0;}
  }
  const originalHeight=panel.style?.getPropertyValue('--md-options-header-height')||'',originalHeightPriority=panel.style?.getPropertyPriority('--md-options-header-height')||'';
  function headerHeight() {
    if(disposed)return;
    const header=editor.querySelector('.md-sheet-header'),height=header&&!header.hidden?header.getBoundingClientRect().height:0,value=height+'px';
    if(Number.isFinite(height)&&panel.style?.getPropertyValue('--md-options-header-height')!==value)panel.style?.setProperty('--md-options-header-height',value);
  }
  function refresh() {
    if(disposed||refreshing)return;refreshing=true;attribute(panel,'data-demo-options-measuring','');
    try{
      const infos=[...panel.querySelectorAll('.ux-info-links [data-ux-info]')].filter(info=>kinds.includes(info.dataset.uxInfo));
      materialInformation(infos.find(info=>info.dataset.uxInfo==='material'));classify();
      const present=new Set(infos.map(info=>info.closest('.ux-info-term')));
      for(const [term,entry]of entries)if(!present.has(term))unwrap(term,entry);
      for(const info of infos){
        const term=info.closest('.ux-info-term'),kind=info.dataset.uxInfo;if(!term||entries.has(term))continue;
        const text=[...term.childNodes].find(node=>node.nodeType===3&&node.textContent.trim());if(!text)continue;
        const button=doc.createElement('button');button.type='button';button.className='md-options-tab';button.dataset.demoOptionNav=kind;
        button.setAttribute('aria-label',text.textContent.trim()+' anzeigen');const click=()=>choose(kind);button.addEventListener('click',click);
        text.replaceWith(button);button.append(text);entries.set(term,{button,text,click,kind});attribute(term,'data-demo-option-tab',kind);attribute(info.closest('.ux-info-links'),'data-demo-options-tabs','');
      }
      const offered=new Set([...entries.values()].map(entry=>entry.kind));
      currentKinds=new Set([...currentSections].filter(([node,kind])=>offered.has(kind)&&available(node)&&(!node.matches('h3,legend')||node.nextElementSibling&&available(node.nextElementSibling))).map(([,kind])=>kind));
      if(!currentKinds.has(active))active=['size','material','mounting'].find(kind=>currentKinds.has(kind))||'size';
      const native=panel.querySelector('.fk-options'),body=native?.querySelector('.m-options');
      const stack=body?.parentNode===native&&available(native)&&available(body)&&[...currentSections.keys()].every(node=>!available(node)||node===materialSummary||body.contains(node));
      attribute(panel,'data-demo-options-layout',stack?'stack':null);headerHeight();renderActive();
    }finally{attribute(panel,'data-demo-options-measuring',null);refreshing=false;}
  }
  const Observer=view?.MutationObserver||globalThis.MutationObserver,observer=new Observer(refresh),materialObserver=new Observer(refresh);
  observer.observe(panel,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-hidden','data-visual-only','style']});
  const Resize=view?.ResizeObserver||globalThis.ResizeObserver,sizeObserver=typeof Resize==='function'?new Resize(headerHeight):null;
  const header=editor.querySelector('.md-sheet-header');if(header)sizeObserver?.observe(header);
  const api={refresh,dispose(){
    if(disposed)return;disposed=true;observer.disconnect();materialObserver.disconnect();sizeObserver?.disconnect();
    for(const [term,entry]of [...entries])unwrap(term,entry);
    for(const [node,attrs]of [...ownedAttributes])for(const name of [...attrs.keys()])restore(node,name);
    if(originalHeight)panel.style?.setProperty('--md-options-header-height',originalHeight,originalHeightPriority);else panel.style?.removeProperty('--md-options-header-height');
    materialSummary?.remove();style.remove();installed.delete(el);
  }};
  installed.set(el,api);refresh();return api;
}
