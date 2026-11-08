// Opt-in presentation adapter. The existing editor owns geometry, prices and actions.
import {installDemoTextEditor} from './text-editor.mjs';
import {installDemoEdgeResize} from './edge-resize.mjs';
import {installDemoMotifSizeLimit} from './motif-size-limit.mjs';
import {installDemoSmallMotifControls} from './small-motif-controls.mjs';
import {installDemoTextSelectionDismiss} from './text-selection-dismiss.mjs';
import {installDemoDesktopSelection} from './desktop-selection.mjs';
import {installDemoOptionsNavigation} from './options-navigation.mjs';
import {installDemoOverlapReview} from './overlap-review.mjs';
import {installDemoProductReturn} from './product-return.mjs';

// Keep the pre-keyboard height even on Android where innerHeight also shrinks.
export function keyboardViewport(previous, {width, height, innerHeight, focused}) {
  const baseline = !previous || Math.abs(previous.width - width) > 60
    ? Math.max(height, innerHeight) : Math.max(previous.baseline, height, innerHeight);
  return {width, baseline, keyboard:!!focused && baseline - height > Math.max(120, baseline * .18)};
}

export async function installMobileDemo(el, config = window.UniversalConfig, context = null) {
  if ((!window.GravuruMobileDemo && context?.mode !== 'shop') || el.mobileDemo) return el.mobileDemo;
  const r = el.shadowRoot, $ = s => r.querySelector(s);
  if (!r || !el.uxLayoutReady || !el.uxShowSection) return null;
  const css = await fetch(new URL('./demo.css', import.meta.url));
  if (!css.ok) throw new Error('Die mobile Demo-Oberfläche konnte nicht geladen werden.');
  const style = document.createElement('style'); style.textContent = await css.text(); r.append(style);
  const shell = $('.ux-shell'), editor = $('.ux-editor');
  const priorEditor = { id:editor.getAttribute('id'), labelledBy:editor.getAttribute('aria-labelledby'), inert:editor.inert };
  const priorPageDemo = document.documentElement.getAttribute('data-mobile-demo');
  const priorViewport = new Map(['--md-height','--md-offset'].map(key => [key,el.style.getPropertyValue(key)]));
  const moved = [], cleanups = [];
  const move = (node, target) => { if (!node) return; const anchor = document.createComment('Demo: original position'); node.before(anchor); moved.push([node, anchor, target]); target.append(node); };
  const make = (tag, cls, text) => { const node = document.createElement(tag); node.className = cls; if (text) node.textContent = text; return node; };
  const button = (label, cls, action) => { const b = make('button', cls, label); b.type = 'button'; b.setAttribute('aria-label', label); b.addEventListener('click', action); return b; };
  const on = (node, event, fn, options) => { node.addEventListener(event, fn, options); cleanups.push(() => node.removeEventListener(event, fn, options)); };
  const top = make('div', 'md-top');
  const returnButton = $('.ux-heading [data-ux=back]');
  const priorReturn = returnButton ? {nodes:[...returnButton.childNodes],text:returnButton.textContent,label:returnButton.getAttribute('aria-label'),marker:returnButton.getAttribute('data-demo-product-return')} : null;
  move(returnButton,top);
  if(returnButton){returnButton.textContent='Zurück zum Produkt';returnButton.setAttribute('aria-label','Zurück zum Produkt');returnButton.setAttribute('data-demo-product-return','');}
  const identity = make('div','md-identity');
  identity.append(make('span', 'md-brand', 'gravuru'), make('span', 'md-badge', context?.badge || 'Mobile Demo')); top.append(identity);
  top.querySelector('.md-badge').title = context?.badgeTitle || 'Getrennte Testversion. Kundenkonto und Bestellung sind nicht verbunden.';
  const history = make('div','md-history'); top.append(history);
  for (const selector of ['[data-ux=undo]', '[data-ux=redo]', '[data-ux=contents]', '[data-ux=account]']) move($(selector), history);
  const accountNote = make('p','md-service-note',context?.accountNote ?? 'Mobile Demo: Kundenkonto und Bestellung sind hier nicht verbunden. Du kannst die Bedienung testen; ein dauerhaftes Speichern im Kundenkonto ist in dieser Testversion nicht möglich.');
  accountNote.setAttribute('role','note');
  if(accountNote.textContent) $('.ux-account-dialog')?.querySelector('header')?.after(accountNote);
  const help=$('[data-ux=help]'), priorHelp=help ? {nodes:[...help.childNodes],text:help.textContent,label:help.getAttribute('aria-label')} : null;
  move(help, top);
  if(help){help.textContent='?';help.setAttribute('aria-label','Hilfe');}
  const plus = button('Gestalten +', 'md-plus', () => open('menu')); plus.setAttribute('aria-label', 'Werkzeuge öffnen'); plus.setAttribute('aria-controls', 'md-tool-sheet');
  const header = make('div', 'md-sheet-header'), heading = make('h2', '', 'Werkzeuge'); heading.id = 'md-sheet-title';
  const back = button('Zurück', 'md-sheet-back', () => open('menu'));
  const close = button('Fertig', 'md-sheet-close', () => {
    if (desktop() && current === 'menu') {
      // Forward to the one native review/checkout action; never bypass its
      // validation, demo restriction or pending-request guard.
      if (finish && !finish.hidden && !finish.disabled && finish.getAttribute('aria-disabled') !== 'true') finish.click();
    } else shut();
  });
  header.append(back, heading, close);
  editor.id = 'md-tool-sheet'; editor.setAttribute('aria-labelledby', heading.id);
  editor.prepend(header);
  const menu = make('div', 'md-tools'); header.after(menu);
  const sections = [['options','Ausführung & Größe'],['design','Designs'],['text','Text'],['motif','Motive'],['upload',context?.logoOnly?'Logo':'Fotos & Logos']];
  const toolButtons = new Map();
  for (const [key, label] of sections) {
    const native = $('#ux-tab-' + key); if (!native) continue;
    const b = button(label, 'md-tool', () => open(key)); b.dataset.demoTool = key;
    b.hidden = native.hidden; b.disabled = native.disabled;
    const icon = native.querySelector('svg'); if (icon) b.prepend(icon.cloneNode(true));
    menu.append(b); toolButtons.set(key, {native,button:b});
  }
  const controls = make('div', 'md-controls');
  // The object-size slider is separate from .ux-photo-position's crop controls.
  const photoSize = $('[data-photo-object-size]')?.closest('label');
  for (const node of [$('.ux-view-zoom'), photoSize, $('.ux-design-reset')]) move(node, controls);
  const resetButton = controls.querySelector('.ux-design-reset button');
  const priorReset = resetButton ? {nodes:[...resetButton.childNodes],text:resetButton.textContent} : null;
  const summary = make('div', 'md-summary'), title = make('span', 'md-product', context?.summary?.(el.state) || 'Schiefer-Gedenktafel');
  const productButton = button('', 'md-product-button', () => open('options'));
  const optionsIcon=toolButtons.get('options')?.native.querySelector('svg'); if(optionsIcon)productButton.append(optionsIcon.cloneNode(true));
  productButton.setAttribute('aria-label','Ausführung und Größe auswählen'); productButton.append(title);
  summary.append(productButton); move($('[data-fk-total]'), summary);
  const bar = make('nav', 'md-bar'); bar.setAttribute('aria-label', 'Gestaltung verwalten');
  const desktopTabs = make('nav', 'md-desktop-tabs'); desktopTabs.setAttribute('aria-label', 'Gestaltungsbereiche');
  const navButtons = new Map();
  for (const [key,label] of [['options','Ausführung'],['design','Designs'],['text','Text'],['motif','Motive'],['upload',context?.logoOnly?'Logo':'Foto']]) {
    if (!toolButtons.has(key)) continue;
    const b = button('', 'md-nav', () => open(key)); b.dataset.demoSection = key;
    b.setAttribute('aria-label',label); const icon = toolButtons.get(key)?.native.querySelector('svg');
    if (icon) b.append(icon.cloneNode(true)); b.append(make('span','',label)); bar.append(b); navButtons.set(key,b);
  }
  const nativeUpload = $('#ux-panel-upload [data-ux=photo-upload]');
  const finish = $('.completion-finish'); move(finish, bar);
  const priorFinish = finish ? {nodes:[...finish.childNodes],text:finish.textContent,label:finish.getAttribute('aria-label')} : null;
  if (finish) {
    finish.textContent = ''; const cartIcon = make('img','md-cart-icon'); cartIcon.src = new URL('./shopping-cart.svg',import.meta.url).href; cartIcon.alt = '';
    finish.append(cartIcon,make('span','','Warenkorb')); finish.setAttribute('aria-label', 'Warenkorb');
  }
  const extra = make('div', 'md-extra');
  // Keep the real quantity control and full-screen action reachable in the tools menu.
  move($('.ux-quantity-stepper'), extra); move($('[data-ux=enlarge]'), extra);
  move($('[data-ux=price]'), extra); menu.append(extra);
  shell.append(top, plus, controls, summary, bar, desktopTabs);
  el.dataset.mobileDemo = 'sheet'; el.dataset.demoSheet = 'closed';
  document.documentElement.dataset.mobileDemo = 'sheet';
  const pageStyle = make('style', ''); pageStyle.textContent = 'html[data-mobile-demo],html[data-mobile-demo] body{margin:0!important;padding:0!important;overflow:hidden!important;height:100%;background:#eef0f2}html[data-mobile-demo] main,html[data-mobile-demo] .c-main{margin:0!important;padding:0!important;max-width:none!important}html[data-mobile-demo] body>header,html[data-mobile-demo] body>footer{display:none!important}'; document.head.append(pageStyle);
  let current = 'closed', priorFocus = plus, resizeFrame = 0, disposed = false, viewportState, suppressPanel = false;
  let textEditor, textSelection;
  const desktop = () => window.innerWidth >= 1000;
  function refreshCloseAction() {
    const cart = desktop() && current === 'menu';
    const label = cart ? 'In den Warenkorb' : 'Fertig';
    if (close.textContent !== label) close.textContent = label;
    close.setAttribute('aria-label',label);
    close.toggleAttribute('data-demo-cart-action',cart);
    close.disabled = cart && (!finish || finish.hidden || finish.disabled || finish.getAttribute('aria-disabled') === 'true');
  }
  function resize() {
    if (disposed) return;
    refreshCloseAction();
    // Reuse the same navigation buttons at the breakpoint, including their
    // native availability and active state. No duplicate mobile/desktop actions.
    const destination = desktop() ? desktopTabs : bar;
    for (const nav of navButtons.values()) if (nav.parentNode !== destination) destination.append(nav);
    // The native fullscreen dialog owns checkout until its close handler restores it.
    if (!nativeFullscreen && !desktop() && finish && bar.children[bar.children.length - 1] !== finish) bar.append(finish);
    desktopTabs.hidden = !desktop();
    bar.setAttribute('aria-label',desktop() ? 'Warenkorb' : 'Gestaltung verwalten');
    if (resetButton) {
      const label = desktop() ? priorReset.text : 'Gestaltung zurücksetzen';
      if (resetButton.textContent !== label) {
        resetButton.textContent = '';
        if (desktop() && priorReset.nodes.length) resetButton.append(...priorReset.nodes);
        else resetButton.textContent = label;
      }
    }
    const viewport = window.visualViewport;
    const focused = !!r.activeElement?.matches?.('[data-ux-text]') || r.activeElement?.id === 'ux-size';
    viewportState = keyboardViewport(viewportState,{width:window.innerWidth || 390,height:viewport?.height || window.innerHeight,innerHeight:window.innerHeight,focused});
    el.toggleAttribute('data-demo-keyboard',viewportState.keyboard && !desktop());
    el.style.setProperty('--md-height', (viewport?.height || window.innerHeight) + 'px');
    el.style.setProperty('--md-offset', (viewport?.offsetTop || 0) + 'px');
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; if (!disposed) { el.uxRefreshViewZoom?.(); el.uxRefreshSelectionHandles?.(); el.uxRefreshTextToolbar?.(); el.uxRefreshOverlapNote?.(); } });
  }
  function open(key, focus = true, nativeAlreadyShown = false) {
    if (disposed) return false;
    const native = toolButtons.get(key)?.native;
    if (key !== 'menu' && (!native || native.hidden || native.disabled)) return false;
    if (current === 'closed') priorFocus = r.activeElement || plus;
    current = key; editor.inert = false; el.dataset.demoSheet = key === 'menu' ? 'menu' : 'panel';
    heading.textContent = sections.find(([k]) => k === key)?.[1] || 'Werkzeuge';
    back.hidden = key === 'menu'; menu.hidden = key !== 'menu';
    for (const [id,b] of navButtons) b.setAttribute('aria-pressed',String(id === key));
    if (key !== 'menu') { if (!nativeAlreadyShown) el.uxShowSection(key); editor.scrollTop = 0; }
    plus.setAttribute('aria-expanded', 'true');
    if (focus) close.focus({ preventScroll: true });
    if(key === 'text') textEditor?.activate(); else textEditor?.refresh();
    resize();
    return true;
  }
  function shut(focus = true) {
    if (disposed) return;
    if (!desktop()) textSelection?.dismiss();
    if (editor.contains(r.activeElement)) r.activeElement?.blur?.();
    if (desktop()) { open('menu',false); return; }
    current = 'closed'; el.dataset.demoSheet = 'closed';
    if (focus) (priorFocus?.isConnected ? priorFocus : plus).focus({ preventScroll: true });
    editor.inert = true; plus.setAttribute('aria-expanded', 'false'); resize();
    for (const b of navButtons.values()) b.setAttribute('aria-pressed','false');
  }
  // Native fullscreen moves the original stage and checkout into its modal.
  // Temporarily restore our moved nodes before that happens, so none of their
  // controls remain inert behind the top layer. Their existing handlers stay.
  const full = $('.c-large-preview'), oldFullscreenShow = full.showModal;
  let nativeFullscreen = false;
  const restoreDemoNodes = () => {
    if (!nativeFullscreen) return;
    nativeFullscreen = false;
    for (const [node, , target] of moved) target.append(node);
    resize();
  };
  full.showModal = function(...args) {
    if (this.open) return oldFullscreenShow.apply(this, args);
    shut(false);
    for (const [node, anchor] of moved) anchor.after(node);
    nativeFullscreen = true;
    try { return oldFullscreenShow.apply(this, args); }
    catch (error) { restoreDemoNodes(); throw error; }
  };
  on(full, 'close', restoreDemoNodes);
  // Validation calls this public hook but changes tabs through a private native
  // closure. Open/remove inert before its existing field focus is attempted.
  const oldRevealTextIssue = el.uxRevealTextIssue;
  if (typeof oldRevealTextIssue === 'function') el.uxRevealTextIssue = function(...args) {
    if (full.open) full.close();
    open('text', false);
    return oldRevealTextIssue.apply(this, args);
  };
  on(r, 'keydown', event => { if (event.key === 'Escape' && current !== 'closed' && !$('dialog[open]')) { event.preventDefault(); shut(); } });
  // Selection toolbar actions may intentionally request a native panel.
  on(r, 'click', event => {
    const action = event.target.closest?.('[data-ux]')?.dataset.ux;
    if (['edit-upload','photo-upload','logo-upload'].includes(action) && current === 'closed') open('upload', false);
    // Desktop keeps the inspector available for any native validation redirect.
    if (!desktop() && event.target.closest?.('.md-bar .completion-finish')) shut(false);
  });
  on(editor, 'focusin', event => { if (!suppressPanel && current === 'closed' && event.target.closest?.('.ux-panel')) { const key = event.target.closest('.ux-panel').id.replace('ux-panel-', ''); open(key, false); } resize(); });
  on(editor,'focusout',() => queueMicrotask(resize));
  // Host capture runs before shadow-root native gesture handlers: a tap closes the sheet, a drag does
  // not. Never consume the native selection or resize event itself.
  let tap = null;
  const innerTarget = e => e.composedPath?.()[0] || e.target;
  on(el,'pointerdown',e => {
    const target=innerTarget(e), surface = target.closest?.('.ux-preview');
    tap = !desktop() && current !== 'closed' && surface && !target.closest?.('button') && !target.closest?.('input') && !target.closest?.('[data-ux-handle]')
      ? {x:e.clientX,y:e.clientY,moved:false} : null;
  },true);
  on(el,'pointermove',e => { if (tap && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8) tap.moved=true; },true);
  on(el,'pointercancel',() => {tap=null;},true);
  on(el,'pointerup',e => {
    const closeSheet = tap && !tap.moved; tap=null;
    if (!closeSheet) return;
    // Native pointerdown prevents a synthetic click on touch. Finish the native
    // pointerup first, then close without moving geometry during the gesture.
    suppressPanel=true; queueMicrotask(() => {shut(false);suppressPanel=false;});
  },true);
  let pullStart = null;
  on(header, 'pointerdown', e => { if (e.target.closest('button')) return; pullStart = e.clientY; header.setPointerCapture?.(e.pointerId); });
  on(header, 'pointerup', e => { if (pullStart !== null && e.clientY - pullStart > 55) shut(); pullStart = null; });
  on(header, 'pointercancel', () => { pullStart = null; });
  on(window, 'resize', resize); if (window.visualViewport) { on(window.visualViewport, 'resize', resize); on(window.visualViewport, 'scroll', resize); }
  // Native panel validation remains authoritative; show its requested section if needed.
  const oldShow = el.uxShowSection;
  el.uxShowSection = function(section) {
    const result = oldShow.call(this, section);
    const key = ({font:'text',arrangement:'text',form:'options',start:'design',logo:'upload'})[section] || section;
    if (!suppressPanel && current !== key && sections.some(([k]) => k === key)) open(key, false, true);
    return result;
  };
  // The native updater addresses the first undo control. Moving its toolbar can
  // put the inline deletion notice first; keep both footer controls in sync with
  // the same native history, without introducing a second undo implementation.
  const historyButtons = {undo:history.querySelector('[data-ux=undo]'),redo:history.querySelector('[data-ux=redo]')};
  const refreshHistory = () => {
    if (historyButtons.undo) historyButtons.undo.disabled = !el.history?.length;
    if (historyButtons.redo) historyButtons.redo.disabled = !el.future?.length;
    el.dataset.demoSelectedType = el.state?.objects?.find(o => o.id === el.state.selected)?.type || '';
  };
  const oldSync = el.sync;
  if (typeof oldSync === 'function') el.sync = function(...args) { const result = oldSync.apply(this,args); refreshHistory(); if(context?.summary)title.textContent=context.summary(this.state); return result; };
  refreshHistory();
  const syncTools = () => {
    refreshCloseAction();
    for (const [key,{native,button}] of toolButtons) {
      button.hidden = native.hidden; button.disabled = native.disabled;
      const nav=navButtons.get(key); if(nav){nav.hidden=native.hidden;nav.disabled=native.disabled;}
    }
    productButton.hidden = !!toolButtons.get('options')?.native.hidden;
    const active = toolButtons.get(current)?.native;
    if (active && (active.hidden || active.disabled)) open('menu', false);
  };
  const tabObserver = new MutationObserver(syncTools);
  for (const {native} of toolButtons.values()) tabObserver.observe(native, {attributes:true,attributeFilter:['hidden','disabled']});
  if(nativeUpload) tabObserver.observe(nativeUpload,{attributes:true,attributeFilter:['hidden','disabled']});
  if(finish) tabObserver.observe(finish,{attributes:true,attributeFilter:['hidden','disabled','aria-disabled']});
  syncTools();
  const observer = new MutationObserver(() => {
    el.toggleAttribute('data-demo-fullscreen', !!full.open);
    controls.dataset.photo = photoSize && !photoSize.hidden ? 'true' : 'false';
    title.textContent = context?.summary?.(el.state) || (el.state?.width && el.state?.height ? `Schiefer · ${Math.round(el.state.width / 10)} × ${Math.round(el.state.height / 10)} cm` : 'Schiefer-Gedenktafel');
  });
  observer.observe(full, { attributes:true, attributeFilter:['open'] });
  observer.observe($('[data-fk-total]'), { childList:true, subtree:true, characterData:true });
  if (photoSize) observer.observe(photoSize, { attributes:true, attributeFilter:['hidden'] });
  textEditor = installDemoTextEditor(el,{onFocusChange:resize});
  textSelection = installDemoTextSelectionDismiss(el,{enabled:()=>!desktop()});
  const desktopSelection = installDemoDesktopSelection(el,{enabled:desktop,onSelect:key=>open(key,false)});
  const optionsNavigation = installDemoOptionsNavigation(el,{config});
  const edgeResize = installDemoEdgeResize(el);
  const motifSizeLimit = installDemoMotifSizeLimit(el);
  const smallMotifControls = installDemoSmallMotifControls(el);
  const overlapReview = installDemoOverlapReview(el);
  const productReturn = installDemoProductReturn(el,{button:returnButton});
  shut(false);
  const api = { open, close:shut, dispose() {
    if (disposed) return;
    disposed = true;
    textEditor?.dispose();
    textSelection?.dispose();
    desktopSelection?.dispose();
    optionsNavigation?.dispose();
    smallMotifControls?.dispose();
    motifSizeLimit?.dispose();
    edgeResize?.dispose();
    overlapReview?.dispose();
    productReturn?.dispose();
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    observer.disconnect(); tabObserver.disconnect(); cleanups.forEach(fn => fn()); el.uxShowSection = oldShow;
    if (typeof oldSync === 'function') el.sync = oldSync;
    full.showModal = oldFullscreenShow;
    if (typeof oldRevealTextIssue === 'function') el.uxRevealTextIssue = oldRevealTextIssue;
    for (const [node, anchor] of moved.reverse()) { anchor.replaceWith(node); }
    for (const node of [top,plus,controls,summary,bar,desktopTabs,header,menu,style,pageStyle,accountNote]) node.remove();
    const restoreAttribute = (node, name, value) => value === null ? node.removeAttribute(name) : node.setAttribute(name, value);
    restoreAttribute(editor, 'id', priorEditor.id); restoreAttribute(editor, 'aria-labelledby', priorEditor.labelledBy);
    restoreAttribute(document.documentElement, 'data-mobile-demo', priorPageDemo);
    if (finish) { finish.textContent = ''; if(priorFinish.nodes.length)finish.append(...priorFinish.nodes);else finish.textContent=priorFinish.text; restoreAttribute(finish, 'aria-label', priorFinish.label); }
    if (help) { help.textContent=''; if(priorHelp.nodes.length)help.append(...priorHelp.nodes);else help.textContent=priorHelp.text; restoreAttribute(help,'aria-label',priorHelp.label); }
    if (returnButton) { returnButton.textContent=''; if(priorReturn.nodes.length)returnButton.append(...priorReturn.nodes);else returnButton.textContent=priorReturn.text; restoreAttribute(returnButton,'aria-label',priorReturn.label); restoreAttribute(returnButton,'data-demo-product-return',priorReturn.marker); }
    if (resetButton) { resetButton.textContent=''; if(priorReset.nodes.length)resetButton.append(...priorReset.nodes);else resetButton.textContent=priorReset.text; }
    for (const [key,value] of priorViewport) value ? el.style.setProperty(key,value) : el.style.removeProperty(key);
    editor.inert = priorEditor.inert; delete el.dataset.mobileDemo; delete el.dataset.demoSheet; delete el.dataset.demoFullscreen; delete el.dataset.demoKeyboard; delete el.dataset.demoSelectedType; delete el.mobileDemo;
  }};
  el.mobileDemo = api;
  window.dispatchEvent(new CustomEvent('gravuru-mobile-demo-ready'));
  return api;
}

if (typeof window !== 'undefined' && window.GravuruMobileDemo) {
  let installing = false;
  const tryInstall = async () => {
    const el = document.querySelector('gravuru-configurator');
    if (installing || !window.GravuruMobileDemo.ready || !el?.uxLayoutReady || !el?.uxShowSection) return;
    installing = true;
    try { await installMobileDemo(el); } catch (error) { console.error(error); installing = false; }
  };
  window.addEventListener('message', event => { if (event.source === window && event.data?.type === 'gravuru-ux-ready') { window.GravuruMobileDemo.ready = true; tryInstall(); } });
  const timer = setInterval(() => { tryInstall(); if (document.querySelector('gravuru-configurator')?.mobileDemo) clearInterval(timer); }, 100);
  window.addEventListener('pagehide', () => clearInterval(timer), { once:true }); tryInstall();
}
