import test from 'node:test';
import assert from 'node:assert/strict';
import {installMobileDemo,keyboardViewport} from './demo.mjs';

// The real opt-in adapter runs against a small DOM port. Rendering and native
// editor behaviour are verified separately in the browser; these tests cover
// node identity, existing callbacks, focus, capabilities and clean removal.
function runtime(t) {
  const observers = new Set(), pending = new Set(), frames = new Map(), saved = new Map();
  let frameId = 0, requests = 0;
  const notify = (target, type, attributeName) => {
    for (const observer of observers) for (const [node, options] of observer.targets) {
      if (target !== node && !(options.subtree && node.contains(target))) continue;
      if (!options[type] || (type === 'attributes' && options.attributeFilter && !options.attributeFilter.includes(attributeName))) continue;
      pending.add(observer);
    }
  };
  class EventPort {
    listeners = new Map();
    addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
    removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(v => v !== fn)); }
    dispatchEvent(event) {
      event.target ??= this; event.preventDefault ??= function() { this.defaultPrevented = true; };
      event.stopPropagation ??= function() { this.stopped = true; };
      for (const fn of [...this.listeners.get(event.type) || []]) fn.call(this, event);
      if (event.bubbles && !event.stopped) this.parentNode?.dispatchEvent(event);
      return !event.defaultPrevented;
    }
  }
  const dataName = key => 'data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  class NodePort extends EventPort {
    constructor(tag) {
      super(); this.tagName = tag; this.childNodes = []; this.attrs = new Map(); this.inert = false; this.scrollTop = 0;
      const properties = new Map(); this.style = {setProperty:(k,v) => properties.set(k,String(v)), getPropertyValue:k => properties.get(k) || '', removeProperty:k => properties.delete(k)};
      this.dataset = new Proxy({}, {get:(_,k) => this.getAttribute(dataName(k)) ?? undefined, set:(_,k,v) => { this.setAttribute(dataName(k),v); return true; }, deleteProperty:(_,k) => { this.removeAttribute(dataName(k)); return true; }});
    }
    get children() { return this.childNodes.filter(n => n.tagName !== '#comment'); }
    get parentElement() { return this.parentNode?.tagName?.startsWith('#') ? null : this.parentNode; }
    get id() { return this.getAttribute('id') || ''; } set id(v) { this.setAttribute('id',v); }
    get className() { return this.getAttribute('class') || ''; } set className(v) { this.setAttribute('class',v); }
    get hidden() { return this.attrs.has('hidden'); } set hidden(v) { this.toggleAttribute('hidden',v); }
    get disabled() { return this.attrs.has('disabled'); } set disabled(v) { this.toggleAttribute('disabled',v); }
    get open() { return this.attrs.has('open'); } set open(v) { this.toggleAttribute('open',v); }
    get textContent() { return (this.text || '') + this.childNodes.map(n => n.textContent).join(''); }
    set textContent(v) { for (const n of [...this.childNodes]) n.remove(); this.text = String(v); notify(this,'childList'); }
    get isConnected() { const root = this.getRootNode(); return root.tagName === '#document' || !!root.host?.isConnected; }
    getRootNode() { let node = this; while (node.parentNode) node = node.parentNode; return node; }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    setAttribute(k,v) { v = String(v); if (this.attrs.get(k) === v) return; this.attrs.set(k,v); notify(this,'attributes',k); }
    removeAttribute(k) { if (this.attrs.delete(k)) notify(this,'attributes',k); }
    toggleAttribute(k,enabled = !this.attrs.has(k)) { enabled ? this.setAttribute(k,'') : this.removeAttribute(k); return enabled; }
    insert(node, index) { node.remove(); this.childNodes.splice(index,0,node); node.parentNode = this; notify(this,'childList'); }
    append(...nodes) { for (const node of nodes) this.insert(node,this.childNodes.length); }
    prepend(...nodes) { for (const node of nodes.reverse()) this.insert(node,0); }
    before(node) { this.parentNode.insert(node,this.parentNode.childNodes.indexOf(this)); }
    after(node) { this.parentNode.insert(node,this.parentNode.childNodes.indexOf(this) + 1); }
    replaceWith(node) { this.before(node); this.remove(); }
    remove() { const p = this.parentNode; if (p) { p.childNodes.splice(p.childNodes.indexOf(this),1); this.parentNode = null; notify(p,'childList'); } }
    contains(node) { return node === this || this.childNodes.some(n => n.contains(node)); }
    matches(selector) {
      const parts = selector.trim().split(/\s+/), atom = (node, part) => {
        if (!node) return false;
        const tag = part.match(/^[a-z][\w-]*/i)?.[0]; if (tag && node.tagName !== tag) return false;
        for (const [,id] of part.matchAll(/#([\w-]+)/g)) if (node.id !== id) return false;
        for (const [,cls] of part.matchAll(/\.([\w-]+)/g)) if (!node.className.split(/\s+/).includes(cls)) return false;
        for (const [,key,value] of part.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) if (!node.attrs.has(key) || (value !== undefined && node.getAttribute(key) !== value)) return false;
        return true;
      };
      if (!atom(this,parts.pop())) return false;
      let node = this.parentNode;
      while (parts.length) { const part = parts.pop(); while (node && !atom(node,part)) node = node.parentNode; if (!node) return false; node = node.parentNode; }
      return true;
    }
    querySelectorAll(selector) { return this.childNodes.flatMap(n => [...(n.matches(selector) ? [n] : []), ...n.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { for (let n = this; n; n = n.parentNode) if (n.matches(selector)) return n; return null; }
    cloneNode(deep) { const node = new NodePort(this.tagName); node.attrs = new Map(this.attrs); node.text = this.text; if (deep) for (const child of this.childNodes) node.append(child.cloneNode(true)); return node; }
    focus() {
      for (let n = this; n; n = n.parentNode) if (n.inert || n.hidden || n.disabled) return;
      const root = this.getRootNode(); root.activeElement = this; doc.activeElement = root.host || this;
      this.dispatchEvent({type:'focusin',bubbles:true});
    }
    click() { if (!this.disabled) this.dispatchEvent({type:'click',bubbles:true}); }
  }
  const doc = new NodePort('#document'); doc.documentElement = new NodePort('html'); doc.head = new NodePort('head'); doc.body = new NodePort('body');
  doc.append(doc.documentElement); doc.documentElement.append(doc.head,doc.body);
  doc.createElement = tag => new NodePort(tag); doc.createComment = text => { const n = new NodePort('#comment'); n.text = text; return n; };
  const win = new EventPort(); win.GravuruMobileDemo = {ready:true}; win.UniversalConfig = {}; win.innerHeight = 844;
  win.visualViewport = Object.assign(new EventPort(),{height:844,offsetTop:0});
  const set = (key,value) => { saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{configurable:true,writable:true,value}); };
  set('document',doc); set('window',win); set('fetch',async () => { requests++; return {ok:true,text:async () => ':host([data-mobile-demo]){}'}; });
  set('CustomEvent',class { constructor(type) { this.type = type; } });
  set('requestAnimationFrame',fn => { frames.set(++frameId,fn); return frameId; }); set('cancelAnimationFrame',id => frames.delete(id));
  set('MutationObserver',class {
    targets = [];
    constructor(fn) { this.fn = fn; observers.add(this); }
    observe(node,options) { assert.ok(node,'observed target must exist'); this.targets.push([node,options]); }
    disconnect() { this.targets = []; observers.delete(this); pending.delete(this); }
  });
  const flush = () => { let count = 0; while (pending.size) { assert.ok(++count < 30,'observers must settle'); const list = [...pending]; pending.clear(); for (const o of list) if (observers.has(o)) o.fn(); } const list = [...frames.values()]; frames.clear(); for (const fn of list) fn(); };
  const cleanups = [];
  t.after(() => { for (const fn of cleanups.reverse()) fn(); for (const [key,descriptor] of saved) descriptor ? Object.defineProperty(globalThis,key,descriptor) : delete globalThis[key]; });
  return {doc,win,NodePort,flush,frames,observers,cleanups,get requests() { return requests; }};
}

function editorFixture(env, {uploadHidden = false} = {}) {
  const {doc,NodePort} = env, calls = [], nodes = {};
  const make = (tag, cls, parent, attrs = {}) => { const node = new NodePort(tag); if (cls) node.className = cls; for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v); parent?.append(node); return node; };
  const el = make('gravuru-configurator','',doc.body), r = new NodePort('#shadow'); r.host = el; el.shadowRoot = r;
  el.uxLayoutReady = true; el.state = {designId:'D1',width:220,height:140,objects:[{id:'name',text:'Bruno',x:44.125}],options:{mounting:'none'}}; el.history = []; el.future = [];
  const shell = make('section','ux-shell',r), heading = make('header','ux-heading',shell), toolbar = make('nav','ux-workbench-toolbar',shell);
  const layout = make('main','ux-layout',shell), preview = make('section','ux-preview',layout), stage = make('div','stage',preview), editor = make('section','ux-editor',layout);
  editor.id = 'native-editor'; editor.setAttribute('aria-labelledby','native-label');
  const tabs = make('nav','ux-tabs',editor), panels = new Map(), nativeTabs = new Map();
  for (const key of ['options','design','text','motif','upload']) {
    const tab = make('button','',tabs,{'id':'ux-tab-' + key,'data-ux-tab':key}); make('svg','',tab); nativeTabs.set(key,tab);
    panels.set(key,make('section','ux-panel',editor,{id:'ux-panel-' + key}));
  }
  nativeTabs.get('upload').hidden = uploadHidden; nativeTabs.get('upload').disabled = uploadHidden;
  const field = make('input','',panels.get('text'));
  const photoPosition = make('section','ux-photo-position',panels.get('upload')); make('button','crop',photoPosition);
  const photoSize = make('label','ux-photo-size',stage); photoSize.hidden = true;
  const photoSlider = make('input','',photoSize,{'data-photo-object-size':''}); photoSlider.addEventListener('input',() => calls.push(['photo-size',photoSlider.value]));
  const zoom = make('label','ux-view-zoom',stage), zoomSlider = make('input','',zoom); zoomSlider.addEventListener('input',() => calls.push(['view-zoom',zoomSlider.value]));
  const reset = make('div','ux-design-reset',stage); make('button','',reset).addEventListener('click',() => calls.push(['reset-confirmation']));
  const action = (key,parent,cls = '') => { const b = make('button',cls,parent,{'data-ux':key}); b.addEventListener('click',() => calls.push([key])); nodes[key] = b; return b; };
  action('help',heading,'ux-large-help'); action('account',heading);
  for (const key of ['undo','redo','contents','enlarge']) action(key,toolbar);
  nodes.undo.disabled = true; nodes.redo.disabled = true;
  const feedback = make('div','ux-delete-feedback',editor); feedback.hidden = true;
  const feedbackUndo = make('button','',feedback,{'data-ux':'undo'}); feedbackUndo.disabled = true;
  const dock = make('div','fk-buy-dock',r), price = make('strong','',dock,{'data-fk-total':''}); price.textContent = '19,99 €';
  action('price',dock);
  const quantity = make('span','ux-quantity-stepper',dock); make('input','',quantity,{'data-fk-quantity':''}).value = '1';
  const finish = make('button','completion-finish',dock); finish.textContent = 'In den Warenkorb'; finish.setAttribute('aria-label','Kauf prüfen'); finish.addEventListener('click',() => calls.push(['native-review']));
  const full = make('dialog','c-large-preview',r), fullMoves = [];
  const accountDialog = make('dialog','ux-account-dialog',r); make('header','',accountDialog);
  const accountBody = make('div','',accountDialog,{'data-ux-account':''}); accountBody.textContent = 'Native account content';
  const fullShow = full.showModal = function(...args) {
    calls.push(['fullscreen',...args]);
    assert.equal(zoom.parentNode,stage,'native fullscreen receives original zoom');
    assert.equal(photoSize.parentNode,stage,'native fullscreen receives original photo-size');
    assert.equal(finish.parentNode,dock,'native fullscreen receives original checkout');
    if (full.fail) throw new Error('native fullscreen failed');
    for (const n of [stage,dock,toolbar]) { const anchor = doc.createComment('native-fullscreen'); n.before(anchor); fullMoves.push([n,anchor]); full.append(n); }
    this.open = true; return 'native-fullscreen-result';
  };
  full.close = function() { if (!this.open) return; for (const [node,anchor] of fullMoves.splice(0)) anchor.replaceWith(node); this.open = false; this.dispatchEvent({type:'close'}); };
  nodes.enlarge.addEventListener('click',() => full.showModal());
  const show = el.uxShowSection = function(key) {
    calls.push(['section',key]); const real = ({font:'text',arrangement:'text',form:'options',start:'design',logo:'upload'})[key] || key;
    for (const [id,panel] of panels) panel.hidden = id !== real;
    return 'native-section-result';
  };
  show('options'); calls.length = 0;
  const reveal = el.uxRevealTextIssue = function(id) { calls.push(['reveal',id,editor.inert]); show('text'); field.focus(); return 'native-reveal-result'; };
  const sync = el.sync = function(value) { calls.push(['sync',value]); r.querySelector('[data-ux=undo]').disabled = !el.history.length; r.querySelector('[data-ux=redo]').disabled = !el.future.length; return value; };
  for (const key of ['uxRefreshViewZoom','uxRefreshSelectionHandles','uxRefreshTextToolbar','uxRefreshOverlapNote']) el[key] = () => calls.push([key]);
  const original = structuredClone(el.state), originalParents = new Map([nodes.help,nodes.account,nodes.undo,nodes.redo,nodes.contents,nodes.enlarge,nodes.price,zoom,photoSize,reset,price,quantity,finish].map(n => [n,n.parentNode]));
  const originalChildren = new Map([...new Set(originalParents.values())].map(n => [n,[...n.childNodes]]));
  env.cleanups.push(() => el.mobileDemo?.dispose());
  return {el,r,shell,editor,stage,toolbar,heading,panels,nativeTabs,field,photoPosition,photoSize,photoSlider,zoom,zoomSlider,reset,dock,price,finish,quantity,full,accountDialog,accountBody,fullShow,show,reveal,sync,feedbackUndo,originalParents,originalChildren,original,calls,nodes};
}

test('opt-in and native readiness are required; installation does not touch another editor',async t => {
  const env = runtime(t), f = editorFixture(env), other = editorFixture(env);
  delete env.win.GravuruMobileDemo;
  assert.equal(await installMobileDemo(f.el),undefined); assert.equal(env.requests,0);
  env.win.GravuruMobileDemo = {}; f.el.uxLayoutReady = false;
  assert.equal(await installMobileDemo(f.el),null); assert.equal(env.requests,0);
  f.el.uxLayoutReady = true; const api = await installMobileDemo(f.el);
  assert.equal(await installMobileDemo(f.el),api); assert.equal(env.requests,1);
  assert.equal(other.el.mobileDemo,undefined); assert.equal(other.nodes.undo.parentNode,other.toolbar);
  assert.deepEqual(other.el.state,other.original); assert.deepEqual(f.el.state,f.original);
});

test('the actual native controls and callbacks move; crop tools stay in the photo panel',async t => {
  const env = runtime(t), f = editorFixture(env); await installMobileDemo(f.el);
  assert.equal(f.r.querySelector('.md-history [data-ux=undo]'),f.nodes.undo);
  assert.equal(f.r.querySelector('.md-summary [data-fk-total]'),f.price);
  assert.equal(f.r.querySelector('.md-controls [data-photo-object-size]'),f.photoSlider);
  assert.equal(f.photoPosition.parentNode,f.panels.get('upload'));
  f.nodes.account.click(); f.nodes.contents.click(); f.nodes.help.click(); f.nodes.price.click();
  f.zoomSlider.value = '150'; f.zoomSlider.dispatchEvent({type:'input'});
  f.photoSlider.value = '60'; f.photoSlider.dispatchEvent({type:'input'});
  f.reset.querySelector('button').click(); f.finish.click();
  for (const expected of [['account'],['contents'],['help'],['price'],['view-zoom','150'],['photo-size','60'],['reset-confirmation'],['native-review']]) assert.ok(f.calls.some(c => JSON.stringify(c) === JSON.stringify(expected)),JSON.stringify(expected));
  assert.equal(f.price.textContent,'19,99 €'); assert.deepEqual(f.el.state,f.original);
});

test('native validation reveals the text sheet before focusing its field',async t => {
  const env = runtime(t), f = editorFixture(env), api = await installMobileDemo(f.el);
  assert.equal(f.editor.inert,true);
  assert.equal(f.el.uxRevealTextIssue('name'),'native-reveal-result');
  assert.deepEqual(f.calls.find(c => c[0] === 'reveal'),['reveal','name',false]);
  assert.equal(f.el.dataset.demoSheet,'panel'); assert.equal(f.r.activeElement,f.field);
  assert.equal(f.panels.get('text').hidden,false);
  api.close(false); f.calls.length = 0;
  assert.equal(f.el.uxShowSection('font'),'native-section-result');
  assert.equal(f.calls.filter(c => c[0] === 'section').length,1,'the presentation adapter must not replay native work');
  assert.equal(f.editor.inert,false); assert.equal(f.el.dataset.demoSheet,'panel');
});

test('native hidden and disabled capabilities remain authoritative across design changes',async t => {
  const env = runtime(t), f = editorFixture(env,{uploadHidden:true}), api = await installMobileDemo(f.el);
  const card = f.r.querySelector('[data-demo-tool=upload]'), tab = f.nativeTabs.get('upload');
  assert.ok(card); assert.equal(card.hidden,true); assert.equal(card.disabled,true); assert.equal(api.open('upload'),false);
  tab.hidden = false; tab.disabled = false; env.flush();
  assert.equal(card.hidden,false); assert.equal(card.disabled,false); card.click();
  assert.equal(f.panels.get('upload').hidden,false); assert.equal(f.el.dataset.demoSheet,'panel');
  tab.disabled = true; env.flush();
  assert.equal(card.disabled,true); assert.equal(f.el.dataset.demoSheet,'menu'); assert.equal(api.open('upload'),false);
  tab.disabled = false; tab.hidden = true; env.flush(); assert.equal(card.hidden,true);
  const calls = f.calls.length; card.click(); assert.equal(f.calls.length,calls,'a hidden capability cannot be invoked through its demo callback');
});

test('undo and redo stay enabled from native history even when a feedback control becomes first',async t => {
  const env = runtime(t), f = editorFixture(env); await installMobileDemo(f.el);
  assert.equal(f.r.querySelector('[data-ux=undo]'),f.feedbackUndo);
  assert.equal(f.nodes.undo.disabled,true); assert.equal(f.nodes.redo.disabled,true);
  f.el.history.push({nativeSnapshot:true});
  assert.equal(f.el.sync('native-result'),'native-result'); assert.equal(f.nodes.undo.disabled,false); assert.equal(f.feedbackUndo.disabled,false);
  f.nodes.undo.click(); assert.ok(f.calls.some(c => c[0] === 'undo'));
  f.el.future.push(f.el.history.pop()); f.el.sync();
  assert.equal(f.nodes.undo.disabled,true); assert.equal(f.nodes.redo.disabled,false);
  f.nodes.redo.click(); assert.ok(f.calls.some(c => c[0] === 'redo'));
  assert.deepEqual(f.el.state,f.original);
});

test('native fullscreen receives its real controls, and closing restores their demo homes',async t => {
  const env = runtime(t), f = editorFixture(env), api = await installMobileDemo(f.el);
  const demoParents = new Map([...f.originalParents.keys()].map(n => [n,n.parentNode]));
  api.open('menu');
  for (let i = 0; i < 2; i++) {
    assert.equal(f.full.showModal('native-argument'),'native-fullscreen-result');
    assert.equal(f.full.contains(f.zoom),true); assert.equal(f.full.contains(f.photoSize),true); assert.equal(f.full.contains(f.finish),true);
    assert.equal(f.el.dataset.demoSheet,'closed'); env.flush(); assert.equal(f.el.getAttribute('data-demo-fullscreen'),'');
    f.zoomSlider.dispatchEvent({type:'input'});
    f.full.close(); env.flush(); assert.equal(f.el.getAttribute('data-demo-fullscreen'),null);
    for (const [node,parent] of demoParents) assert.equal(node.parentNode,parent,'same native node returns to its demo home');
  }
  assert.equal(f.r.querySelectorAll('[data-photo-object-size]').length,1);
  assert.deepEqual(f.el.state,f.original);
});

test('a rejected native fullscreen call is not swallowed and leaves demo controls reachable',async t => {
  const env = runtime(t), f = editorFixture(env); await installMobileDemo(f.el); f.full.fail = true;
  assert.throws(() => f.full.showModal(),/native fullscreen failed/);
  assert.equal(f.zoom.parentNode.className,'md-controls'); assert.equal(f.finish.parentNode.className,'md-bar'); assert.equal(f.nodes.enlarge.parentNode.className,'md-extra');
  assert.equal(f.full.open,false); assert.equal(f.r.querySelectorAll('.completion-finish').length,1);
});

test('Escape leaves a native dialog alone; validation can return safely from fullscreen',async t => {
  const env = runtime(t), f = editorFixture(env), api = await installMobileDemo(f.el);
  api.open('menu'); const dialog = env.doc.createElement('dialog'); dialog.open = true; f.r.append(dialog);
  const first = {type:'keydown',key:'Escape'}; f.r.dispatchEvent(first);
  assert.equal(f.el.dataset.demoSheet,'menu'); assert.equal(first.defaultPrevented,undefined);
  dialog.open = false; const second = {type:'keydown',key:'Escape'}; f.r.dispatchEvent(second);
  assert.equal(f.el.dataset.demoSheet,'closed'); assert.equal(second.defaultPrevented,true);
  f.full.showModal(); f.el.uxRevealTextIssue('name');
  assert.equal(f.full.open,false); assert.equal(f.editor.inert,false); assert.equal(f.r.activeElement,f.field);
  assert.equal(f.zoom.parentNode.className,'md-controls');
});

test('dispose restores original nodes, ordering, labels, attributes and hooks without queued work',async t => {
  const env = runtime(t), f = editorFixture(env); env.doc.documentElement.dataset.mobileDemo = 'prior-marker';
  f.el.style.setProperty('--md-height','777px'); const api = await installMobileDemo(f.el);
  api.open('text'); assert.ok(env.frames.size); assert.ok(env.observers.size);
  const calls = f.calls.length; api.dispose(); env.flush();
  assert.equal(f.calls.length,calls,'pending refresh was cancelled'); assert.equal(env.frames.size,0); assert.equal(env.observers.size,0);
  assert.equal(f.el.uxShowSection,f.show); assert.equal(f.el.uxRevealTextIssue,f.reveal); assert.equal(f.el.sync,f.sync); assert.equal(f.full.showModal,f.fullShow);
  for (const [node,parent] of f.originalParents) assert.equal(node.parentNode,parent);
  for (const [parent,children] of f.originalChildren) assert.deepEqual(parent.childNodes,children,'original order is preserved');
  assert.equal(f.editor.id,'native-editor'); assert.equal(f.editor.getAttribute('aria-labelledby'),'native-label'); assert.equal(f.editor.inert,false);
  assert.equal(f.finish.textContent,'In den Warenkorb'); assert.equal(f.finish.getAttribute('aria-label'),'Kauf prüfen');
  assert.equal(env.doc.documentElement.dataset.mobileDemo,'prior-marker'); assert.equal(f.el.style.getPropertyValue('--md-height'),'777px'); assert.equal(f.el.style.getPropertyValue('--md-offset'),'');
  assert.equal(f.el.mobileDemo,undefined); assert.equal(f.el.getAttribute('data-mobile-demo'),null); assert.equal(f.r.querySelector('.md-top'),null); assert.equal(env.doc.head.children.length,0);
  assert.equal((env.win.listeners.get('resize') || []).length,0); assert.equal((env.win.visualViewport.listeners.get('scroll') || []).length,0);
  api.dispose(); assert.equal(api.open('menu'),false); api.close(); assert.equal(f.el.getAttribute('data-demo-sheet'),null);
  assert.deepEqual(f.el.state,f.original);
});

test('the disconnected demo is labelled without replacing the native account content or callback',async t => {
  const env = runtime(t), f = editorFixture(env), api = await installMobileDemo(f.el);
  assert.match(f.r.querySelector('.md-badge').title,/Kundenkonto und Bestellung sind nicht verbunden/);
  const note = f.accountDialog.querySelector('.md-service-note'); assert.ok(note);
  assert.equal(note.parentNode,f.accountDialog); assert.match(note.textContent,/dauerhaftes Speichern.*nicht möglich/);
  assert.equal(f.accountBody.textContent,'Native account content'); f.nodes.account.click(); assert.ok(f.calls.some(c => c[0] === 'account'));
  f.accountBody.textContent = 'Native unavailable status'; assert.equal(note.isConnected,true,'native rerender cannot swallow the demo explanation');
  api.dispose(); assert.equal(f.accountDialog.querySelector('.md-service-note'),null); assert.equal(f.accountBody.textContent,'Native unavailable status');
});

test('keyboard detection keeps Android pre-keyboard height and ignores rotation',() => {
  const normal = keyboardViewport(null,{width:390,height:844,innerHeight:844,focused:false});
  const reduced = keyboardViewport(normal,{width:390,height:400,innerHeight:400,focused:true});
  assert.equal(reduced.keyboard,true); assert.equal(reduced.baseline,844);
  assert.equal(keyboardViewport(reduced,{width:390,height:400,innerHeight:400,focused:false}).keyboard,false);
  assert.equal(keyboardViewport(reduced,{width:844,height:390,innerHeight:390,focused:true}).keyboard,false);
  assert.equal(keyboardViewport(normal,{width:390,height:790,innerHeight:844,focused:true}).keyboard,false);
});

test('footer opens native sections; a canvas tap closes but drag and buttons do not',async t => {
  const env=runtime(t),f=editorFixture(env),api=await installMobileDemo(f.el);
  const options=f.r.querySelector('[data-demo-section=options]'); options.click();
  assert.equal(f.panels.get('options').hidden,false); assert.equal(options.getAttribute('aria-pressed'),'true');
  const text=f.r.querySelector('[data-demo-section=text]'); text.click();
  assert.equal(f.panels.get('text').hidden,false); assert.equal(text.getAttribute('aria-pressed'),'true');
  f.el.dispatchEvent({type:'pointerdown',target:f.stage,clientX:10,clientY:10});
  f.el.dispatchEvent({type:'pointermove',target:f.stage,clientX:55,clientY:10}); f.el.dispatchEvent({type:'pointerup',target:f.stage}); await Promise.resolve();
  assert.equal(f.el.dataset.demoSheet,'panel');
  f.el.dispatchEvent({type:'pointerdown',target:f.stage,clientX:10,clientY:10}); f.el.dispatchEvent({type:'pointerup',target:f.stage}); await Promise.resolve();
  assert.equal(f.el.dataset.demoSheet,'closed');
  await Promise.resolve(); api.open('text');
  const control=env.doc.createElement('button'); f.stage.append(control);
  f.el.dispatchEvent({type:'pointerdown',target:control,clientX:10,clientY:10});f.el.dispatchEvent({type:'pointerup',target:control}); await Promise.resolve();
  assert.equal(f.el.dataset.demoSheet,'panel'); assert.equal(f.finish.getAttribute('aria-label'),'Warenkorb');
  f.finish.click(); assert.ok(f.calls.some(c=>c[0]==='native-review'));
});

test('both photo icons open the original chooser synchronously and respect upload limits',async t => {
  const env=runtime(t),f=editorFixture(env),upload=env.doc.createElement('button');
  upload.dataset.ux='photo-upload'; f.panels.get('upload').append(upload);
  let called=0; upload.addEventListener('click',()=>called++);
  const api=await installMobileDemo(f.el); const shortcut=f.r.querySelector('.md-photo-shortcut'),footer=f.r.querySelector('[data-demo-section=upload]');
  shortcut.click(); assert.equal(called,1); assert.equal(f.panels.get('upload').hidden,false);
  api.close(); footer.click(); assert.equal(called,2); assert.equal(f.panels.get('upload').hidden,false);
  upload.disabled=true;env.flush();assert.equal(shortcut.disabled,true);shortcut.click();assert.equal(called,2);
  api.close();footer.click();assert.equal(called,2);assert.equal(f.panels.get('upload').hidden,false,'existing photos remain reachable at upload limit');
  upload.disabled=false;upload.hidden=true;env.flush();assert.equal(shortcut.hidden,true);shortcut.click();assert.equal(called,2);
  f.nativeTabs.get('upload').hidden=true;env.flush();footer.click();assert.equal(called,2);
});
