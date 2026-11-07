import test from 'node:test';
import assert from 'node:assert/strict';
import {installDemoOptionsNavigation} from './options-navigation.mjs';

// Native decision-help produces text-node labels beside independent info
// buttons. Memorial/family renderers replace option groups, not this navigation.
function fixture({material='Naturschiefer · 5 mm',materialChoice=false}={}) {
  const observers=new Set(),pending=new Set(),infoCalls=[],optionCalls=[];
  const notify=(target,type,attributeName)=>{
    for(const observer of observers)for(const [node,options]of observer.targets){
      if(target!==node && !(options.subtree && node.contains(target)))continue;
      if(!options[type] || (type==='attributes' && options.attributeFilter && !options.attributeFilter.includes(attributeName)))continue;
      pending.add(observer);
    }
  };
  class Node {
    constructor(tag,attrs={}) {
      this.tagName=tag.toUpperCase();this.nodeType=tag==='#text'?3:tag==='#shadow'?11:1;
      this.childNodes=[];this.attrs=new Map();this.listeners=new Map();this.ownerDocument=doc;
      this.dataset=new Proxy({}, {get:(_,key)=>this.getAttribute('data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))??undefined,set:(_,key,value)=>{this.setAttribute('data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value);return true;}});
      this.offsetY=0;this.computed={display:'block',visibility:'visible'};
      for(const [key,value]of Object.entries(attrs))this.setAttribute(key,value);
    }
    get children(){return this.childNodes.filter(node=>node.nodeType===1);}
    get parentElement(){return this.parentNode?.nodeType===1?this.parentNode:null;}
    get previousElementSibling(){const siblings=this.parentNode?.children||[];return siblings[siblings.indexOf(this)-1]||null;}
    get className(){return this.getAttribute('class')||'';}set className(value){this.setAttribute('class',value);}
    get hidden(){return this.attrs.has('hidden');}set hidden(value){value?this.setAttribute('hidden',''):this.removeAttribute('hidden');}
    get textContent(){return this.nodeType===3?this.data||'':this.childNodes.map(node=>node.textContent).join('');}
    set textContent(value){if(this.nodeType===3){this.data=String(value);notify(this,'characterData');return;}for(const child of [...this.childNodes])child.remove();if(value!=='')this.append(doc.createTextNode(value));}
    getAttribute(name){return this.attrs.get(name)??null;}
    setAttribute(name,value){value=String(value);if(this.attrs.get(name)===value)return;this.attrs.set(name,value);notify(this,'attributes',name);}
    removeAttribute(name){if(this.attrs.delete(name))notify(this,'attributes',name);}
    append(...nodes){for(const node of nodes){node.remove();this.childNodes.push(node);node.parentNode=this;notify(this,'childList');}}
    after(node){const parent=this.parentNode,index=parent.childNodes.indexOf(this);node.remove();parent.childNodes.splice(index+1,0,node);node.parentNode=parent;notify(parent,'childList');}
    replaceWith(node){const parent=this.parentNode,index=parent.childNodes.indexOf(this);node.remove();parent.childNodes.splice(index,1,node);node.parentNode=parent;this.parentNode=null;notify(parent,'childList');}
    remove(){const parent=this.parentNode;if(parent){parent.childNodes.splice(parent.childNodes.indexOf(this),1);this.parentNode=null;notify(parent,'childList');}}
    contains(node){return node===this||this.childNodes.some(child=>child.contains(node));}
    matches(selector){
      if(this.nodeType!==1)return false;
      return selector.split(',').some(part=>{
        const atoms=part.trim().split(/\s+/),match=(node,atom)=>{
          if(!node||node.nodeType!==1)return false;
          const tag=atom.match(/^[a-z][\w-]*/i)?.[0];if(tag&&node.tagName!==tag.toUpperCase())return false;
          for(const [,id]of atom.matchAll(/#([\w-]+)/g))if(node.getAttribute('id')!==id)return false;
          for(const [,cls]of atom.matchAll(/\.([\w-]+)/g))if(!node.className.split(/\s+/).includes(cls))return false;
          for(const [,name,value]of atom.matchAll(/\[([\w-]+)(?:="([^"]+)")?\]/g))if(!node.attrs.has(name)||(value!==undefined&&node.getAttribute(name)!==value))return false;
          return true;
        };
        if(!match(this,atoms.pop()))return false;
        let node=this.parentNode;
        while(atoms.length){const atom=atoms.pop();while(node&&!match(node,atom))node=node.parentNode;if(!node)return false;node=node.parentNode;}
        return true;
      });
    }
    querySelectorAll(selector){return this.childNodes.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    closest(selector){for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;return null;}
    addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
    removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(listener=>listener!==fn));}
    click(){this.dispatchEvent({type:'click',target:this});}
    dispatchEvent(event){for(const listener of [...this.listeners.get(event.type)||[]])listener(event);this.parentNode?.dispatchEvent(event);}
    getBoundingClientRect(){return {top:100+this.offsetY-editor.scrollTop,height:20};}
    scrollIntoView(){assert.fail('navigation must never scroll ancestors');}
    focus(){assert.fail('navigation must never move focus/scroll to an option');}
  }
  const doc={};doc.createElement=tag=>new Node(tag);doc.createTextNode=text=>{const node=new Node('#text');node.data=String(text);return node;};
  let reducedMotion=false;
  const view=doc.defaultView={getComputedStyle:node=>node.computed,matchMedia:()=>({matches:reducedMotion}),scrollTo:()=>assert.fail('page must not scroll')};
  view.MutationObserver=class{
    targets=[];constructor(callback){this.callback=callback;observers.add(this);}
    observe(node,options){this.targets.push([node,options]);observers.add(this);}
    disconnect(){this.targets=[];observers.delete(this);pending.delete(this);}
  };
  const make=(tag,attrs,parent,text)=>{const node=new Node(tag,attrs);if(text!==undefined)node.textContent=text;parent?.append(node);return node;};
  const root=new Node('#shadow'),el={shadowRoot:root,ownerDocument:doc,state:{width:220,height:140,mOptions:{size:'22x14',mounting:'K00'}},sync:()=>assert.fail('navigation must not sync product state')};
  const editor=make('section',{class:'ux-editor'},root);Object.assign(editor,{scrollTop:80,scrollLeft:7,clientTop:1,scrollHeight:1400,clientHeight:360,inert:false});
  editor.getBoundingClientRect=()=>({top:100,height:360});editor.scrollCalls=[];editor.scrollTo=position=>{editor.scrollCalls.push(position);editor.scrollTop=position.top;};
  const header=make('div',{class:'md-sheet-header'},editor);header.getBoundingClientRect=()=>({top:100,height:52});
  const panel=make('section',{id:'ux-panel-options'},editor),native=make('div',{class:'fk-options'},panel);
  make('h2',{},native,'Befestigung & Zubehör');const links=make('div',{class:'ux-info-links'},native),terms={},infos={},originalNodes=new Map();
  for(const [kind,label]of [['material','Material'],['size','Größe'],['mounting','Befestigung']]){
    const term=terms[kind]=make('span',{class:'ux-info-term'},links);term.append(doc.createTextNode(label));
    const info=infos[kind]=make('button',{'data-ux-info':kind,class:'ux-info-button'},term);make('svg',{},info);
    info.addEventListener('click',()=>infoCalls.push(kind));originalNodes.set(term,[...term.childNodes]);
  }
  const picks=make('div',{class:'m-options'},native),pictures=make('div',{class:'m-option-pictures'},picks);
  const group=(kind,offset,{family=false}={})=>{
    const section=family?make('section',{class:'family-'+(kind==='size'?'sizes':kind)},pictures):pictures;
    if(family)section.offsetY=offset;
    const heading=make('h3',{},section,kind);heading.offsetY=offset;
    const row=make('div',{role:'group'},section),button=make('button',{[family?'data-family-group':'data-picture-group']:kind},row,kind);
    button.addEventListener('click',()=>optionCalls.push(kind));row.offsetY=offset+25;return {section,heading,row,button};
  };
  const size=group('size',180),mounting=group('mounting',700);
  if(materialChoice)group('material',400);
  const design=make('section',{class:'c-design-section'},root),source=make('p',{class:'fk-material-note'},design,material);
  const state=structuredClone(el.state),canvas=make('div',{class:'stage'},root);canvas.scrollTop=11;
  const flush=()=>{let turns=0;while(pending.size){assert.ok(++turns<20,'observers settle without changing their own DOM repeatedly');const list=[...pending];pending.clear();for(const observer of list)if(observers.has(observer))observer.callback();}};
  const link=kind=>panel.querySelector('[data-demo-option-nav="'+kind+'"]');
  return {el,root,doc,view,editor,header,panel,native,links,terms,infos,originalNodes,picks,pictures,size,mounting,design,source,canvas,state,infoCalls,optionCalls,observers,make,group,flush,link,reduced:value=>{reducedMotion=value;}};
}

test('labels scroll only the inspector to native headings beneath its sticky header',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();
  f.link('size').click();assert.deepEqual(f.editor.scrollCalls.at(-1),{top:119,left:7,behavior:'smooth'});
  f.link('mounting').click();assert.equal(f.editor.scrollCalls.at(-1).top,639);
  assert.equal(f.canvas.scrollTop,11);assert.deepEqual(f.el.state,f.state);assert.deepEqual(f.optionCalls,[]);
  assert.equal(f.link('size').textContent,'Größe');assert.equal(f.link('size').type,'button');api.dispose();
});

test('native info icons and their nested SVG clicks keep their original callback and identity',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();
  for(const kind of ['material','size','mounting']){assert.equal(f.infos[kind].parentNode,f.terms[kind]);f.infos[kind].querySelector('svg').click();}
  assert.deepEqual(f.infoCalls,['material','size','mounting']);assert.deepEqual(f.editor.scrollCalls,[]);
  api.dispose();for(const [term,nodes]of f.originalNodes)assert.deepEqual(term.childNodes,nodes);
  f.infos.size.click();assert.equal(f.infoCalls.at(-1),'size');
});

test('fixed material mirrors only the existing native information and follows its updates',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();
  const summary=f.panel.querySelector('[data-demo-options-material]');assert.equal(summary.textContent,'Material: Naturschiefer · 5 mm');
  assert.equal(f.source.parentNode,f.design);summary.offsetY=300;f.link('material').click();assert.equal(f.editor.scrollCalls.at(-1).top,239);
  f.source.textContent='Acrylglas · 3 mm';f.flush();assert.equal(summary.textContent,'Material: Acrylglas · 3 mm');
  assert.deepEqual(f.el.state,f.state);assert.deepEqual(f.optionCalls,[]);api.dispose();assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);
});

test('missing or unsafe material text never creates a choice, summary or misleading link',()=>{
  for(const material of ['', '   ', 'Schiefer · undefined mm', 'Schiefer · NaN mm', '[object Object]']){
    const f=fixture({material}),api=installDemoOptionsNavigation(f.el);f.flush();
    assert.equal(f.link('material'),null);assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);
    assert.equal(f.terms.material.textContent,'Material');assert.equal(f.infos.material.parentNode,f.terms.material);api.dispose();
  }
});

test('an existing material option remains the target instead of a duplicated information block',()=>{
  const f=fixture({materialChoice:true}),api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);f.link('material').click();
  assert.equal(f.editor.scrollCalls.at(-1).top,339);assert.deepEqual(f.optionCalls,[]);api.dispose();
});

test('replacing a family/size group resolves the new native target without stale coordinates',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();const button=f.link('size');
  f.size.heading.remove();f.size.row.remove();const next=f.group('size',480,{family:true});f.flush();
  assert.equal(f.link('size'),button);button.click();assert.equal(f.editor.scrollCalls.at(-1).top,419);
  next.section.remove();const before=f.editor.scrollCalls.length;button.click();assert.equal(f.editor.scrollCalls.length,before,'missing target between render and observer never scrolls elsewhere');
  f.flush();assert.equal(f.link('size'),null);assert.equal(f.infos.size.parentNode,f.terms.size);api.dispose();
});

test('hidden and visual-only selectors are skipped and conditional options regain navigation when shown',()=>{
  const f=fixture();f.size.heading.remove();f.size.row.remove();
  const label=f.make('label',{'data-visual-only':'true'},f.picks),select=f.make('select',{'data-m-option':'size'},label);label.offsetY=400;
  const api=installDemoOptionsNavigation(f.el);f.flush();assert.equal(f.link('size'),null);
  label.removeAttribute('data-visual-only');f.flush();assert.ok(f.link('size'));f.link('size').click();assert.equal(f.editor.scrollCalls.at(-1).top,339);
  f.mounting.row.hidden=true;f.flush();assert.equal(f.link('mounting'),null);f.mounting.row.hidden=false;f.flush();assert.ok(f.link('mounting'));
  select.computed.display='none';select.setAttribute('style','display:none');f.flush();assert.equal(f.link('size'),null);api.dispose();
});

test('a fixed family size uses its actual information and never invents another size',()=>{
  const f=fixture();f.size.heading.remove();f.size.row.remove();
  const fixed=f.make('p',{class:'family-fixed-size'},f.pictures,'Rechteck · 30 × 20 cm');fixed.offsetY=250;
  const api=installDemoOptionsNavigation(f.el);f.flush();f.link('size').click();assert.equal(f.editor.scrollCalls.at(-1).top,189);
  assert.deepEqual(f.optionCalls,[]);assert.deepEqual(f.el.state,f.state);api.dispose();
});

test('hidden panels and inert inspectors do not navigate; reduced motion and scroll bounds are respected',()=>{
  const f=fixture();f.panel.hidden=true;const api=installDemoOptionsNavigation(f.el);f.flush();assert.ok(f.link('mounting'));
  f.link('mounting').click();assert.equal(f.editor.scrollCalls.length,0);f.panel.hidden=false;f.editor.inert=true;
  f.link('mounting').click();assert.equal(f.editor.scrollCalls.length,0);f.editor.inert=false;f.reduced(true);
  f.editor.scrollHeight=500;f.link('mounting').click();assert.deepEqual(f.editor.scrollCalls.at(-1),{top:140,left:7,behavior:'auto'});
  f.size.heading.offsetY=1;f.link('size').click();assert.equal(f.editor.scrollCalls.at(-1).top,0);api.dispose();
});

test('replaced material source stays current and becoming unavailable restores the original label',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();f.source.remove();
  f.make('p',{class:'fk-material-note'},f.design,'Edelstahl · 1,5 mm');f.flush();
  assert.equal(f.panel.querySelector('[data-demo-options-material]').textContent,'Material: Edelstahl · 1,5 mm');
  f.design.querySelector('.fk-material-note').textContent='';f.flush();
  assert.equal(f.link('material'),null);assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);api.dispose();
});

test('installation is idempotent and dispose restores native nodes and stops all observers',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();assert.equal(installDemoOptionsNavigation(f.el),api);
  const stale=f.link('size');api.dispose();api.dispose();f.flush();
  for(const [term,nodes]of f.originalNodes)assert.deepEqual(term.childNodes,nodes);
  assert.equal(f.observers.size,0);assert.equal(f.root.querySelector('style'),null);assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);
  stale.click();f.source.textContent='Holz';f.flush();assert.equal(f.editor.scrollCalls.length,0);assert.equal(f.link('material'),null);
  const next=installDemoOptionsNavigation(f.el);assert.notEqual(next,api);next.dispose();
});

test('unrelated editors or incomplete native shells are left alone',()=>{
  assert.equal(installDemoOptionsNavigation(null),null);assert.equal(installDemoOptionsNavigation({}),null);
  const f=fixture(),other=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(other.link('size'),null);assert.deepEqual(other.el.state,other.state);api.dispose();
});
