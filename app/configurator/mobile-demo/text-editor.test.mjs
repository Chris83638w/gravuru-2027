import test from 'node:test';
import assert from 'node:assert/strict';
import {installDemoTextEditor} from './text-editor.mjs';
import {installTextFields} from '../variant-m/text-fields.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/text-paths.mjs';

// Execute the real text-fields presentation adapter and shared text geometry.
// This port supplies DOM events; native editor event endpoints are observable
// fixture callbacks, not a replacement text/size implementation in the demo.
function runtime(t) {
  const saved = new Map(), observers = new Set(), pending = new Set(), frames = new Map(); let nextFrame = 0;
  const mutation = (target,type,key) => { for (const observer of observers) for (const [node,options] of observer.targets) if ((target === node || options.subtree && node.contains(target)) && options[type] && (type !== 'attributes' || !options.attributeFilter || options.attributeFilter.includes(key))) pending.add(observer); };
  class TestEvent {
    constructor(type,options = {}) { Object.assign(this,{type,bubbles:false,detail:0},options); }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
    stopImmediatePropagation() { this.stopped = true; this.immediate = true; }
    composedPath() { return this.path || []; }
  }
  class Events {
    listeners = new Map();
    addEventListener(type,fn,options) { const list = this.listeners.get(type) || []; list.push({fn,capture:options === true || options?.capture === true}); this.listeners.set(type,list); }
    removeEventListener(type,fn) { this.listeners.set(type,(this.listeners.get(type) || []).filter(v => v.fn !== fn)); }
    dispatchEvent(event) {
      event.target = this; event.path = []; for (let n = this; n; n = n.parentNode || n.host) event.path.push(n);
      const run = (node,capture) => { for (const item of [...node.listeners.get(event.type) || []]) if (item.capture === capture) { item.fn.call(node,event); if (event.immediate) break; } };
      for (const node of [...event.path].reverse()) { run(node,true); if (event.stopped) return !event.defaultPrevented; }
      for (const node of event.path) { run(node,false); if (event.stopped || !event.bubbles) break; }
      return !event.defaultPrevented;
    }
  }
  const dataKey = key => 'data-' + String(key).replace(/[A-Z]/g,c => '-' + c.toLowerCase());
  class Node extends Events {
    constructor(tag) {
      super(); this.tagName = tag; this.childNodes = []; this.attrs = new Map(); this.style = {}; this.scrollTop = 0; this.value = ''; this.clientWidth = 200; this.focusCalls = 0;
      this.dataset = new Proxy({}, {get:(_,key) => this.getAttribute(dataKey(key)) ?? undefined,set:(_,key,value) => { this.setAttribute(dataKey(key),value); return true; },deleteProperty:(_,key) => { this.removeAttribute(dataKey(key)); return true; }});
      this.classList = {contains:name => this.className.split(/\s+/).includes(name),toggle:(name,force) => { const current = new Set(this.className.split(/\s+/).filter(Boolean)), on = force === undefined ? !current.has(name) : force; on ? current.add(name) : current.delete(name); this.className = [...current].join(' '); return on; }};
    }
    get ownerDocument() { return document; }
    get children() { return this.childNodes; }
    get parentElement() { return this.parentNode; }
    get nextSibling() { return this.parentNode?.childNodes[this.parentNode.childNodes.indexOf(this) + 1] || null; }
    get id() { return this.getAttribute('id') || ''; } set id(value) { this.setAttribute('id',value); }
    get className() { return this.getAttribute('class') || ''; } set className(value) { this.setAttribute('class',value); }
    get hidden() { return this.hasAttribute('hidden'); } set hidden(value) { this.toggleAttribute('hidden',value); }
    get disabled() { return this.hasAttribute('disabled'); } set disabled(value) { this.toggleAttribute('disabled',value); }
    get readOnly() { return this.hasAttribute('readonly'); } set readOnly(value) { this.toggleAttribute('readonly',value); }
    get textContent() { return (this.text || '') + this.childNodes.map(n => n.textContent).join(''); }
    set textContent(value) { for (const node of [...this.childNodes]) node.remove(); this.text = String(value); mutation(this,'childList'); }
    set innerHTML(value) { this.textContent = value; }
    get isConnected() { let node = this; while (node.parentNode || node.host) node = node.parentNode || node.host; return node === document; }
    get scrollHeight() { return 16 + String(this.value).split('\n').length * 20; }
    hasAttribute(key) { return this.attrs.has(key); }
    getAttribute(key) { return this.attrs.get(key) ?? null; }
    setAttribute(key,value) { value = String(value); if (this.attrs.get(key) !== value) { this.attrs.set(key,value); mutation(this,'attributes',key); } }
    removeAttribute(key) { if (this.attrs.delete(key)) mutation(this,'attributes',key); }
    toggleAttribute(key,force = !this.hasAttribute(key)) { force ? this.setAttribute(key,'') : this.removeAttribute(key); }
    insertBefore(node,before) { if (node === before) return node; node.remove(); this.childNodes.splice(before ? this.childNodes.indexOf(before) : this.childNodes.length,0,node); node.parentNode = this; mutation(this,'childList'); return node; }
    append(...nodes) { for (const node of nodes) this.insertBefore(node,null); }
    before(node) { this.parentNode.insertBefore(node,this); }
    remove() { const parent = this.parentNode; if (parent) { parent.childNodes.splice(parent.childNodes.indexOf(this),1); this.parentNode = null; mutation(parent,'childList'); } }
    contains(node) { return this === node || this.childNodes.some(child => child.contains(node)); }
    matches(selector) {
      return selector.split(',').some(part => {
        const chain = part.trim().split(/\s+/), atom = (node,value) => {
          if (!node) return false;
          const tag = value.match(/^[a-z][\w-]*/i)?.[0]; if (tag && node.tagName !== tag) return false;
          for (const [,id] of value.matchAll(/#([\w-]+)/g)) if (node.id !== id) return false;
          for (const [,name] of value.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(name)) return false;
          for (const [,key,expected] of value.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) if (!node.hasAttribute(key) || expected !== undefined && node.getAttribute(key) !== expected) return false;
          return true;
        };
        if (!atom(this,chain.pop())) return false; let node = this.parentNode;
        while (chain.length) { const value = chain.pop(); while (node && !atom(node,value)) node = node.parentNode; if (!node) return false; node = node.parentNode; }
        return true;
      });
    }
    querySelectorAll(selector) { return this.childNodes.flatMap(node => [...(node.matches(selector) ? [node] : []),...node.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { for (let node = this; node; node = node.parentNode) if (node.matches(selector)) return node; return null; }
    getBoundingClientRect() { return {top:80,bottom:300}; }
    scrollTo({top}) { this.scrollTop = top; }
    scrollIntoView() {}
    click() { if (!this.disabled) this.dispatchEvent(new TestEvent('click',{bubbles:true})); }
    focus() {
      if (this.disabled || this.readOnly) return;
      let root = this; while (root.parentNode) root = root.parentNode;
      const old = root.activeElement; root.activeElement = this; this.focusCalls++;
      if (old && old !== this) old.dispatchEvent(new TestEvent('focusout',{bubbles:true}));
      this.activeWhenFocused = !!this.closest('.md-text-active');
      this.dispatchEvent(new TestEvent('focusin',{bubbles:true}));
    }
    blur() { let root = this; while (root.parentNode) root = root.parentNode; if (root.activeElement === this) { root.activeElement = null; this.dispatchEvent(new TestEvent('focusout',{bubbles:true})); } }
    setSelectionRange(start,end) { this.selectionStart = start; this.selectionEnd = end; }
  }
  const document = new Node('#document'), window = new Events(); document.createElement = tag => new Node(tag); window.scrollBy = () => {};
  const set = (key,value) => { saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{configurable:true,writable:true,value}); };
  set('document',document); set('window',window); set('Event',TestEvent);
  set('requestAnimationFrame',fn => { frames.set(++nextFrame,fn); return nextFrame; }); set('cancelAnimationFrame',id => frames.delete(id));
  set('ResizeObserver',class { constructor(fn) { this.fn = fn; } observe() {} disconnect() {} });
  set('MutationObserver',class { targets = []; constructor(fn) { this.fn = fn; observers.add(this); } observe(node,options) { this.targets.push([node,options]); } disconnect() { this.targets = []; observers.delete(this); pending.delete(this); } });
  const flush = () => { let count = 0; while (pending.size || frames.size) { assert.ok(++count < 30,'native update and demo refresh must settle'); const list = [...pending]; pending.clear(); for (const item of list) if (observers.has(item)) item.fn(); const queued = [...frames.values()]; frames.clear(); for (const fn of queued) fn(); } };
  const cleanups = [];
  t.after(() => { for (const fn of cleanups.reverse()) fn(); window.dispatchEvent(new TestEvent('pagehide')); for (const [key,descriptor] of saved) descriptor ? Object.defineProperty(globalThis,key,descriptor) : delete globalThis[key]; });
  return {Node,document,window,Event:TestEvent,flush,cleanups,observers};
}

function fixture(t,{selected = null,empty = false} = {}) {
  const env = runtime(t), {Node,document,Event} = env, calls = [], focus = [];
  const node = (tag,cls,parent,attrs = {}) => { const n = new Node(tag); if (cls) n.className = cls; for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); parent?.append(n); return n; };
  const el = node('gravuru-configurator','',document), root = new Node('#shadow'); root.host = el; el.shadowRoot = root; el.dataset.uxMobileTabs = 'true';
  const editor = node('section','ux-editor',root), panel = node('section','',editor,{id:'ux-panel-text'}); panel.hidden = true;
  const fields = node('div','ux-fields',panel), controls = node('div','ux-controls',panel); controls.hidden = true;
  const fonts = node('div','ux-font-row',controls), font = node('button','',fonts,{'data-ux':'fonts'}); font.textContent = 'Schrift ändern';
  const align = node('div','ux-size-align',controls), sizeGroup = node('div','',align), stepper = node('div','ux-stepper',sizeGroup);
  const minus = node('button','',stepper,{'data-ux':'smaller'}), numberGroup = node('span','ux-size-value',stepper);
  const size = node('input','',numberGroup,{id:'ux-size',min:'1',max:'100',step:'1'}); size.type = 'number'; node('span','',numberGroup).textContent = 'mm';
  const plus = node('button','',stepper,{'data-ux':'bigger'});
  const original = empty ? [] : [
    {id:'name',type:'text',label:'Name',text:'Bruno',size:10,lineHeight:12,font:'Test',x:45,y:30},
    {id:'date',type:'text',label:'Lebensdaten',text:'2010 - 2026',size:5,font:'Test',x:70,y:60},
    {id:'quote',type:'text',label:'Spruch',text:'Immer\nin Erinnerung',size:8,lineHeight:10,font:'Test',x:60,y:80},
    {id:'extra',type:'text',label:'Text 4',text:'',size:7,font:'Test',x:45,y:90}
  ];
  const face = {units:1000,glyphs:Object.fromEntries(Array.from({length:95},(_,i) => [String.fromCharCode(32+i),{a:600,d:'M0 0L1 1'}]))};
  const resources = {Test:{regular:face}}; for (const object of original) measureText(object,resources);
  el.state = {designId:'D1',objects:structuredClone(original),selected}; el.history = []; el.future = [];
  const permissions = new Map(), selectedObject = () => el.state.objects.find(object => object.id === el.state.selected);
  el.uxCanEdit = (object,right) => permissions.get(object.id)?.[right] !== false;
  const record = () => { el.history.push(structuredClone(el.state)); el.future = []; calls.push(['record']); };
  const byId = id => [...fields.querySelectorAll('[data-ux-text]')].find(field => field.dataset.uxText === id);
  function buildRows() {
    if (fields.contains(controls)) panel.append(controls);
    for (const row of [...fields.children]) row.remove();
    for (const [index,object] of el.state.objects.filter(o => o.type === 'text').entries()) {
      const row = node('div','ux-text-row',fields,{'data-ux-row':object.id}), label = node('label','',row); label.textContent = object.label;
      const field = node('textarea','',row,{'data-ux-text':object.id,'aria-label':object.label,id:'native-field-' + index,rows:'1'}); field.value = object.text;
    }
  }
  buildRows();
  function update() {
    for (const field of fields.querySelectorAll('[data-ux-text]')) {
      const object = el.state.objects.find(o => o.id === field.dataset.uxText);
      if (root.activeElement !== field) field.value = object.text;
      field.disabled = !!object.uxLocked || !!object.uxHidden || !el.uxCanEdit(object,'content');
    }
    const object = selectedObject(); size.value = object?.type === 'text' ? String(object.size) : '';
    size.disabled = !object || object.type !== 'text' || !!object.uxLocked || !!object.uxHidden || !el.uxCanEdit(object,'scale');
    el.uxUpdateTextUI?.();
  }
  el.sync = () => { calls.push(['sync']); update(); };
  const select = id => { calls.push(['native-select',id]); el.state.selected = id; el.sync(); };
  function nativeSize(value,type) { const object = selectedObject(); calls.push(['native-size',type,value]); record(); setTextSize(object,Number(value)); measureText(object,resources); el.sync(); }
  root.addEventListener('click',event => {
    const action = event.target.closest('[data-ux]')?.dataset.ux;
    if (action === 'select-content') select(event.target.closest('[data-ux]').dataset.id);
    if (action === 'fonts') calls.push(['native-font',el.state.selected]);
    if (action === 'bigger' || action === 'smaller') nativeSize(selectedObject().size + (action === 'bigger' ? 1 : -1),action);
  });
  for (const type of ['input','change']) root.addEventListener(type,event => {
    if (event.target !== size) return;
    if (size.disabled || !el.uxCanEdit(selectedObject(),'scale')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    nativeSize(size.value,event.type); event.stopImmediatePropagation();
  },true);
  root.addEventListener('input',event => {
    const field = event.target.closest('[data-ux-text]'); if (!field || field.disabled) return;
    if (!field.dataset.editStarted) { record(); field.dataset.editStarted = 'true'; }
    el.state.objects.find(o => o.id === field.dataset.uxText).text = field.value; calls.push(['native-text',field.dataset.uxText,field.value]); el.sync();
  });
  root.addEventListener('focusout',event => { if (event.target.dataset.uxText) delete event.target.dataset.editStarted; });
  installTextFields({el,r:root,selected:selectedObject,select});
  const nativeUI = el.uxUpdateTextUI;
  const nativeEdit = el.uxEditText = id => { calls.push(['native-direct-edit',id]); byId(id)?.focus(); };
  el.uxShowSection = key => { calls.push(['native-section',key]); panel.hidden = key !== 'text'; el.uxUpdateTextUI(); };
  let tapped = null;
  const nativeTap = el.uxTextTap = id => { if (tapped === id) { tapped = null; el.uxEditText(id); } else tapped = id; };
  const full = node('dialog','c-large-preview',root); full.open = false; full.close = () => { calls.push(['native-fullscreen-close']); full.open = false; };
  el.uxRevealTextIssue = id => { panel.hidden = false; select(id); byId(id).focus(); };
  update();
  const api = installDemoTextEditor(el,{onFocusChange:(focused,detail) => focus.push([focused,detail])});
  env.cleanups.push(() => api.dispose()); env.flush();
  const open = () => { panel.hidden = false; el.uxUpdateTextUI(); env.flush(); };
  const choice = id => [...panel.querySelectorAll('.md-text-choice')].find(button => button.dataset.id === id);
  const emit = (target,type) => target.dispatchEvent(new Event(type,{bubbles:true}));
  const undo = () => { el.future.push(structuredClone(el.state)); el.state = el.history.pop(); el.sync(); env.flush(); };
  const range = panel.querySelector('.md-text-size-range');
  return {...env,el,root,editor,panel,fields,controls,size,sizeGroup,font,minus,plus,api,range,focus,calls,permissions,nativeUI,nativeEdit,nativeTap,full,original,open,choice,byId,buildRows,emit,undo,selectedObject};
}

test('opening and switching uses native selection without focusing a text field',t => {
  const f = fixture(t); assert.equal(f.el.state.selected,null); assert.equal(f.el.history.length,0);
  f.open(); assert.equal(f.el.state.selected,'name'); assert.equal(f.byId('name').focusCalls,0);
  const picker = f.panel.querySelector('.md-text-picker'); assert.deepEqual(picker.children.map(n => n.textContent),['Name','Lebensdaten','Spruch','Text 4']);
  f.choice('quote').click(); f.flush();
  assert.equal(f.el.state.selected,'quote'); assert.equal(f.byId('quote').focusCalls,0); assert.equal(f.root.activeElement,undefined);
  assert.equal(f.controls.parentNode,f.byId('quote').closest('.ux-text-row')); assert.equal(f.controls.hidden,false);
  assert.equal(f.fields.querySelectorAll('.md-text-active').length,1); assert.equal(f.el.history.length,0);
  assert.equal(f.choice('quote').getAttribute('aria-pressed'),'true');
});

test('typing preserves the actual textarea, multiline value, cursor and native undo grouping',t => {
  const f = fixture(t); f.open(); f.choice('quote').click(); f.flush();
  const field = f.byId('quote'), choice = f.choice('quote'), before = f.selectedObject().text;
  field.focus(); field.value = 'Noch\nein Text'; field.setSelectionRange(8,8); f.emit(field,'input'); f.flush();
  field.value += '!'; f.emit(field,'input'); f.flush();
  assert.equal(f.byId('quote'),field); assert.equal(f.choice('quote'),choice); assert.equal(f.root.activeElement,field);
  assert.equal(field.focusCalls,1); assert.equal(field.selectionStart,8); assert.equal(f.selectedObject().text,'Noch\nein Text!'); assert.equal(f.el.history.length,1);
  assert.equal(f.calls.filter(c => c[0] === 'native-text').length,2);
  field.blur(); f.undo(); assert.equal(f.selectedObject().text,before); assert.equal(f.byId('quote').value,before);
});

test('the height slider forwards both native events and uses proportional text geometry',t => {
  const f = fixture(t); f.open(); const before = structuredClone(f.selectedObject());
  assert.equal(f.range.getAttribute('min'),'1'); assert.equal(f.range.getAttribute('max'),'100'); assert.equal(f.range.getAttribute('step'),'1');
  f.range.value = '20'; f.emit(f.range,'input'); f.flush();
  assert.deepEqual(f.calls.find(c => c[0] === 'native-size'),['native-size','input','20']);
  assert.equal(f.selectedObject().size,20); assert.equal(f.selectedObject().lineHeight,before.lineHeight * 2);
  assert.equal(f.selectedObject().w,before.w * 2); assert.equal(f.selectedObject().h,before.h * 2);
  assert.equal(f.selectedObject().x,before.x); assert.equal(f.selectedObject().y,before.y); assert.equal(f.el.history.length,1);
  f.range.value = '21'; f.emit(f.range,'change'); f.flush(); assert.ok(f.calls.some(c => c[0] === 'native-size' && c[1] === 'change' && c[2] === '21'));
  f.undo(); assert.equal(f.selectedObject().size,20); assert.equal(f.range.value,'20');
  f.undo(); assert.deepEqual(f.selectedObject(),before); assert.equal(f.range.value,'10');
});

test('original font and plus/minus controls remain native; numeric changes update the slider',t => {
  const f = fixture(t); f.open(); const originalFont = f.font, originalSize = f.size;
  f.font.click(); f.plus.click(); f.flush(); assert.equal(f.range.value,'11');
  f.minus.click(); f.flush(); assert.equal(f.range.value,'10');
  f.size.value = '15'; f.emit(f.size,'input'); f.flush(); assert.equal(f.range.value,'15');
  assert.equal(f.controls.querySelector('[data-ux=fonts]'),originalFont); assert.equal(f.controls.querySelector('#ux-size'),originalSize);
  assert.ok(f.calls.some(c => c[0] === 'native-font' && c[1] === 'name'));
});

test('native locked/read-only rights cannot be bypassed and a read-only text can still be selected',t => {
  const f = fixture(t); f.open(); f.permissions.set('quote',{content:false,scale:false}); f.choice('quote').click(); f.flush();
  assert.equal(f.el.state.selected,'quote'); assert.equal(f.byId('quote').disabled,true); assert.equal(f.range.disabled,true);
  const before = structuredClone(f.el.state), count = f.el.history.length; f.range.value = '99'; f.emit(f.range,'input'); f.emit(f.range,'change');
  assert.deepEqual(f.el.state,before); assert.equal(f.el.history.length,count);
  f.permissions.set('quote',{content:false,scale:true}); f.el.sync(); f.flush(); assert.equal(f.range.disabled,false); assert.equal(f.byId('quote').disabled,true);
  f.selectedObject().uxLocked = true; f.el.sync(); f.flush(); assert.equal(f.range.disabled,true);
  delete f.selectedObject().uxLocked; f.el.sync(); f.size.readOnly = true; f.flush(); assert.equal(f.range.disabled,true);
});

test('validation reveals the correct native field before focus and reports actual keyboard focus',async t => {
  const f = fixture(t); f.open(); f.el.uxRevealTextIssue('date'); f.flush();
  const field = f.byId('date'); assert.equal(field.activeWhenFocused,true); assert.equal(f.root.activeElement,field); assert.equal(f.el.state.selected,'date');
  assert.equal(f.focus.at(-1)[0],true); assert.equal(f.focus.at(-1)[1].field,field); assert.equal(f.focus.at(-1)[1].id,'date');
  field.blur(); await Promise.resolve(); assert.equal(f.focus.at(-1)[0],false);
  f.size.focus(); assert.equal(f.focus.at(-1)[0],true); assert.equal(f.focus.at(-1)[1].field,f.size);
  f.range.focus(); await Promise.resolve(); assert.equal(f.focus.at(-1)[0],false,'a range control is not a text keyboard field');
});

test('empty text and a later design rebuild stay reachable without stale DOM or new text state',t => {
  const f = fixture(t); f.open(); f.choice('extra').click(); f.flush(); assert.equal(f.byId('extra').value,''); assert.equal(f.controls.hidden,false);
  const oldField = f.byId('extra');
  f.el.state = {designId:'D2',selected:null,objects:[{id:'second',type:'text',label:'Neue Überschrift',text:'Neu',size:12,font:'Test',x:10,y:20}]};
  f.buildRows(); f.el.sync(); f.flush();
  assert.equal(f.panel.querySelectorAll('.md-text-choice').length,1); assert.equal(f.choice('second').textContent,'Neue Überschrift'); assert.equal(oldField.isConnected,false);
  f.choice('second').click(); f.flush(); assert.equal(f.controls.parentNode,f.byId('second').closest('.ux-text-row')); assert.equal(f.range.value,'12');
  f.el.state.objects = []; f.el.state.selected = null; f.buildRows(); f.el.sync(); f.flush();
  assert.equal(f.panel.querySelector('.md-text-picker').hidden,true); assert.equal(f.controls.hidden,true); assert.equal(f.range.disabled,true);
});

test('an empty design does not invent a text or record history',t => {
  const f = fixture(t,{empty:true}); f.open(); assert.deepEqual(f.el.state.objects,[]); assert.equal(f.el.state.selected,null); assert.equal(f.el.history.length,0);
  assert.equal(f.panel.querySelector('.md-text-picker').hidden,true); assert.equal(f.range.disabled,true);
});

test('a later canvas selection is not overwritten by refresh and does not focus the old text',t => {
  const f = fixture(t); f.open(); f.el.state.objects.push({id:'motif',type:'motif'}); f.el.state.selected = 'motif'; f.el.sync(); f.flush();
  assert.equal(f.el.state.selected,'motif'); assert.equal(f.controls.hidden,true); assert.equal(f.range.disabled,true); assert.equal(f.byId('name').focusCalls,0);
});

test('the existing double-tap hook opens the lower text panel without its upper input or keyboard',t => {
  const f = fixture(t); assert.equal(f.el.uxTextTap,f.nativeTap); f.full.open = true;
  f.el.uxTextTap('quote'); assert.equal(f.panel.hidden,true);
  f.el.uxTextTap('quote'); f.flush();
  assert.equal(f.full.open,false); assert.ok(f.calls.some(c => c[0] === 'native-fullscreen-close'));
  assert.ok(f.calls.some(c => c[0] === 'native-section' && c[1] === 'text')); assert.equal(f.el.state.selected,'quote'); assert.equal(f.panel.hidden,false);
  assert.equal(f.controls.parentNode,f.byId('quote').closest('.ux-text-row')); assert.equal(f.byId('quote').focusCalls,0); assert.equal(f.root.activeElement,undefined);
  assert.equal(f.calls.some(c => c[0] === 'native-direct-edit'),false); assert.equal(f.el.history.length,0);
  f.byId('quote').focus(); assert.equal(f.focus.at(-1)[0],true,'only explicit field focus starts text entry');
});

test('the lower text entry preserves native content-rights, hidden and locked gates',t => {
  const f = fixture(t), object = f.el.state.objects.find(item => item.id === 'quote');
  f.permissions.set('quote',{content:false}); f.el.uxEditText('quote');
  f.permissions.delete('quote'); object.uxLocked = true; f.el.uxEditText('quote');
  delete object.uxLocked; object.uxHidden = true; f.el.uxEditText('quote'); delete object.uxHidden;
  f.el.state.objects.push({id:'motif',type:'motif'}); f.el.uxEditText('motif'); f.el.uxEditText('missing');
  assert.equal(f.el.state.selected,null); assert.equal(f.panel.hidden,true); assert.equal(f.el.history.length,0);
  assert.equal(f.calls.some(c => c[0] === 'native-section'),false); assert.equal(f.byId('quote').focusCalls,0);
});

test('dispose restores native inline behaviour and leaves text edits intact',t => {
  const f = fixture(t); f.open(); f.choice('quote').click(); f.byId('quote').focus();
  const field = f.byId('quote'); field.value = 'Bearbeitet'; f.emit(field,'input'); f.flush();
  assert.equal(installDemoTextEditor(f.el),f.api);
  f.api.dispose(); f.flush();
  assert.equal(f.el.uxUpdateTextUI,f.nativeUI); assert.equal(f.el.uxEditText,f.nativeEdit); assert.equal(f.el.uxTextTap,f.nativeTap); assert.equal(f.panel.hasAttribute('data-md-text-editor'),false);
  assert.equal(f.panel.querySelector('.md-text-picker'),null); assert.equal(f.panel.querySelector('.md-text-size-range'),null); assert.equal(f.fields.querySelectorAll('.md-text-active').length,0);
  assert.equal(f.byId('quote'),field); assert.equal(f.selectedObject().text,'Bearbeitet'); assert.equal(f.focus.at(-1)[0],false);
  assert.equal(f.observers.size,0); const before = f.el.history.length; f.range.value = '50'; f.emit(f.range,'input'); assert.equal(f.el.history.length,before);
  f.api.dispose(); f.el.uxUpdateTextUI(); assert.equal(f.controls.hidden,false,'native expanded field is restored');
});
