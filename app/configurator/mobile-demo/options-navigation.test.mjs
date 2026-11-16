import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {installDemoOptionsNavigation} from './options-navigation.mjs';
import {familyFormatChoices} from '../variant-m/family-formats.mjs';

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
      const values=new Map();this.style={getPropertyValue:key=>values.get(key)?.value||'',getPropertyPriority:key=>values.get(key)?.priority||'',
        setProperty:(key,value,priority='')=>{if(values.get(key)?.value===value&&values.get(key)?.priority===priority)return;values.set(key,{value,priority});notify(this,'attributes','style');},
        removeProperty:key=>{if(values.delete(key))notify(this,'attributes','style');}};
      for(const [key,value]of Object.entries(attrs))this.setAttribute(key,value);
    }
    get children(){return this.childNodes.filter(node=>node.nodeType===1);}
    get parentElement(){return this.parentNode?.nodeType===1?this.parentNode:null;}
    get previousElementSibling(){const siblings=this.parentNode?.children||[];return siblings[siblings.indexOf(this)-1]||null;}
    get nextElementSibling(){const siblings=this.parentNode?.children||[];return siblings[siblings.indexOf(this)+1]||null;}
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
    click(){if(!this.disabled)this.dispatchEvent({type:'click',target:this});}
    dispatchEvent(event){for(const listener of [...this.listeners.get(event.type)||[]])listener(event);this.parentNode?.dispatchEvent(event);}
    getBoundingClientRect(){return {top:100+this.offsetY-editor.scrollTop,height:20};}
    scrollIntoView(){assert.fail('navigation must never scroll ancestors');}
    focus(){assert.fail('navigation must never move focus/scroll to an option');}
  }
  const doc={};doc.createElement=tag=>new Node(tag);doc.createTextNode=text=>{const node=new Node('#text');node.data=String(text);return node;};
  let reducedMotion=false;
  const view=doc.defaultView={getComputedStyle:node=>{
    const panel=node.closest('#ux-panel-options'),kind=node.getAttribute('data-demo-option-section');
    const demoHidden=panel&&!panel.attrs.has('data-demo-options-measuring')&&kind&&kind!==panel.dataset.demoOptionsActive&&!(node.tagName==='DIALOG'&&node.open);
    return {...node.computed,...(node.hidden||demoHidden?{display:'none'}:{})};
  },matchMedia:()=>({matches:reducedMotion}),scrollTo:()=>assert.fail('page must not scroll')};
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
  const picks=make('div',{class:'m-options'},native),pictures=make('div',{class:'m-option-pictures'},picks);picks.scrollTop=90;
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

const section=node=>node.getAttribute('data-demo-option-section');
const active=f=>f.panel.dataset.demoOptionsActive;
const visible=(f,node)=>{
  for(let current=node;current&&current!==f.panel;current=current.parentElement)
    if(current.hidden||f.view.getComputedStyle(current).display==='none')return false;
  return true;
};

test('starts on size; real section tabs change only the inner option body without page/canvas/editor scrolling',()=>{
  const f=fixture(),parents=new Map([f.size.row,f.mounting.row,f.size.button,f.mounting.button].map(node=>[node,node.parentNode]));
  const api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(active(f),'size');assert.equal(f.link('size').getAttribute('aria-pressed'),'true');
  assert.equal(f.panel.dataset.demoOptionsLayout,'stack');assert.equal(visible(f,f.size.row),true);assert.equal(visible(f,f.mounting.row),false);
  f.link('mounting').click();f.flush();
  assert.equal(active(f),'mounting');assert.equal(visible(f,f.size.row),false);assert.equal(visible(f,f.mounting.row),true);
  assert.equal(f.picks.scrollTop,0);assert.equal(f.editor.scrollTop,80);assert.equal(f.canvas.scrollTop,11);assert.deepEqual(f.editor.scrollCalls,[]);
  for(const [node,parent]of parents)assert.equal(node.parentNode,parent);
  assert.deepEqual(f.el.state,f.state);assert.deepEqual(f.optionCalls,[]);api.dispose();
});

test('all mounting, alternative accessories, conditional groups and multiple accessory checks stay together',()=>{
  const f=fixture();
  const alternativeHeading=f.make('h3',{},f.pictures,'Zubehör'),note=f.make('p',{},f.pictures,'Alternativ zur Befestigung auswählen.');
  const alternatives=f.make('div',{role:'group'},f.pictures),stand=f.make('button',{'data-picture-group':'mounting','data-picture-option':'stand'},alternatives,'Ständer');
  const colour=f.group('ah-farbe-2',0),extra=f.group('silikon',0);
  const accessoryHeading=f.make('h3',{},f.pictures,'Zubehör'),checks=f.make('div',{role:'group'},f.pictures);
  const tile=f.make('button',{'data-slate-accessory':'extra-pad'},checks,'Klebepad');
  const fields=f.make('div',{class:'m-option-fields'},f.picks),row=f.make('label',{'data-m-field-row':'extra-pad'},fields);
  const input=f.make('input',{'data-m-field':'extra-pad',type:'checkbox'},row);row.computed.display='none';
  let changes=0;fields.addEventListener('change',()=>changes++);
  tile.addEventListener('click',()=>{input.checked=!input.checked;input.dispatchEvent({type:'change',target:input});});
  f.pictures.addEventListener('click',event=>{if(event.target===stand)f.optionCalls.push('stand');});
  const before=new Map([fields,row,input,alternatives,colour.row,checks,tile].map(node=>[node,node.parentNode]));
  const api=installDemoOptionsNavigation(f.el);f.flush();f.link('mounting').click();f.flush();
  for(const node of [f.mounting.row,alternativeHeading,note,alternatives,colour.heading,colour.row,extra.row,accessoryHeading,checks,fields])assert.equal(section(node),'mounting');
  stand.click();tile.click();assert.deepEqual(f.optionCalls,['stand']);assert.equal(changes,1);assert.equal(input.checked,true);
  for(const [node,parent]of before)assert.equal(node.parentNode,parent);
  assert.equal(row.computed.display,'none');api.dispose();
});

test('native conditional hidden, visual-only and CSS visibility are never overwritten or exposed by a tab',()=>{
  const f=fixture(),conditional=f.group('ah-farbe-4',0);
  conditional.row.hidden=true;conditional.heading.hidden=true;
  const fieldBox=f.make('div',{class:'m-option-fields'},f.picks),field=f.make('label',{'data-m-field-row':'secret'},fieldBox);field.hidden=true;
  const label=f.make('label',{'data-visual-only':'true'},f.picks),select=f.make('select',{'data-m-option':'size'},label);
  const api=installDemoOptionsNavigation(f.el);f.flush();f.link('mounting').click();f.flush();
  assert.equal(conditional.row.hidden,true);assert.equal(visible(f,conditional.row),false);assert.equal(field.hidden,true);
  assert.equal(label.dataset.visualOnly,'true');assert.equal(visible(f,label),false);
  conditional.row.hidden=false;conditional.heading.hidden=false;f.flush();assert.equal(visible(f,conditional.row),true);
  conditional.row.computed.display='none';conditional.row.setAttribute('style','display:none');f.flush();assert.equal(visible(f,conditional.row),false);
  assert.equal(select.parentNode,label);api.dispose();assert.equal(conditional.row.computed.display,'none');assert.equal(field.hidden,true);
});

test('spacer colour dialog and delegated selection stay native and are not hidden when already open',()=>{
  const f=fixture(),dialog=f.make('dialog',{class:'ux-spacer-colours'},f.pictures);dialog.open=false;
  const colors=f.make('div',{role:'group'},dialog),silver=f.make('button',{'data-picture-group':'ah-farbe-2','data-picture-option':'silver'},colors,'Silber');
  let selections=0;f.pictures.addEventListener('click',event=>{if(event.target===f.mounting.button)dialog.open=true;if(event.target===silver){selections++;dialog.open=false;}});
  const api=installDemoOptionsNavigation(f.el);f.flush();f.link('mounting').click();f.mounting.button.click();
  assert.equal(dialog.open,true);assert.equal(dialog.parentNode,f.pictures);assert.equal(colors.parentNode,dialog);
  f.link('size').click();assert.equal(visible(f,dialog),true,'a native top-layer dialog remains open until its own action');
  silver.click();assert.equal(selections,1);assert.equal(dialog.open,false);api.dispose();
});

test('info buttons keep identity, callbacks and independent behavior beside the tab label',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();
  for(const kind of ['material','size','mounting']){assert.equal(f.infos[kind].parentNode,f.terms[kind]);f.infos[kind].querySelector('svg').click();assert.equal(active(f),'size');}
  assert.deepEqual(f.infoCalls,['material','size','mounting']);assert.deepEqual(f.editor.scrollCalls,[]);
  api.dispose();for(const [term,nodes]of f.originalNodes)assert.deepEqual(term.childNodes,nodes);
  f.infos.size.click();assert.equal(f.infoCalls.at(-1),'size');
});

test('fixed material copies only native text and follows replaced and emptied information sources',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();
  const summary=f.panel.querySelector('[data-demo-options-material]');assert.equal(summary.textContent,'Material: Naturschiefer · 5 mm');
  assert.equal(section(summary),'material');assert.equal(f.source.parentNode,f.design);f.link('material').click();assert.equal(active(f),'material');
  assert.equal(visible(f,summary),true);assert.equal(visible(f,f.size.row),false);
  f.source.remove();f.make('p',{class:'fk-material-note'},f.design,'Edelstahl · 1,5 mm');f.flush();
  assert.equal(summary.textContent,'Material: Edelstahl · 1,5 mm');
  f.design.querySelector('.fk-material-note').textContent='';f.flush();assert.equal(f.link('material').disabled,true);
  assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);assert.equal(active(f),'size');
  assert.deepEqual(f.el.state,f.state);api.dispose();
});

test('unknown material values remain unavailable and never become an invented choice',()=>{
  for(const material of ['', '   ', 'Schiefer · undefined mm', 'Schiefer · NaN mm', '[object Object]']){
    const f=fixture({material}),api=installDemoOptionsNavigation(f.el);f.flush();
    assert.equal(f.link('material').disabled,true);assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);
    f.link('material').click();assert.equal(active(f),'size');f.infos.material.click();assert.deepEqual(f.infoCalls,['material']);api.dispose();
  }
});

test('a real material selector remains native and does not gain a duplicated summary',()=>{
  const f=fixture({materialChoice:true}),api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);f.link('material').click();f.flush();
  const group=f.panel.querySelector('[data-picture-group="material"]').closest('[role="group"]');
  assert.equal(section(group),'material');assert.equal(visible(f,group),true);assert.deepEqual(f.optionCalls,[]);
  group.querySelector('button').click();assert.deepEqual(f.optionCalls,['material']);api.dispose();
});

test('all family forms/sizes remain on size, family colour on material, with complete native rerenders',()=>{
  const f=fixture();f.pictures.replaceWith(f.make('div',{class:'m-option-pictures'}));f.pictures=f.picks.querySelector('.m-option-pictures');
  const shapes=f.make('section',{class:'family-shapes'},f.pictures);f.make('button',{'data-family-group':'form','data-family-value':'oval'},shapes,'Oval');
  const sizes=f.make('section',{class:'family-sizes'},f.pictures);const size=f.make('button',{'data-family-group':'size','data-family-value':'small'},sizes,'Klein');
  const mounts=f.make('section',{class:'family-mounting'},f.pictures);f.make('button',{'data-family-group':'mounting','data-family-value':'K00'},mounts,'Ohne');
  const colors=f.make('section',{class:'family-colors'},f.pictures);f.make('button',{'data-family-group':'color','data-family-value':'black'},colors,'Schwarz');
  let sizeChanges=0;f.pictures.addEventListener('click',event=>{if(event.target.dataset.familyGroup==='size')sizeChanges++;});
  const api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(section(shapes),'size');assert.equal(section(sizes),'size');assert.equal(section(colors),'material');assert.equal(section(mounts),'mounting');
  const button=f.link('size');size.click();assert.equal(sizeChanges,1);
  for(const child of [...f.pictures.children])child.remove();
  const fixed=f.make('p',{class:'family-fixed-size'},f.pictures,'Rechteck · 30 × 20 cm');f.flush();
  assert.equal(f.link('size'),button);assert.equal(section(fixed),'size');assert.equal(active(f),'size');assert.equal(f.link('mounting').disabled,true);
  assert.deepEqual(f.el.state,f.state);api.dispose();assert.equal(fixed.textContent,'Rechteck · 30 × 20 cm');
});

test('stake and native format selectors remain size controls; all other native fields remain reachable',()=>{
  const f=fixture();f.size.heading.remove();f.size.row.remove();
  const stakeGroup=f.make('div',{role:'group'},f.pictures),stake=f.make('button',{'data-stake-size':'s1'},stakeGroup,'22 cm');
  const formatLabel=f.make('label',{},f.picks),format=f.make('select',{'data-m-option':'format'},formatLabel);
  const colorLabel=f.make('label',{},f.picks);f.make('select',{'data-m-option':'color'},colorLabel);
  const frameLabel=f.make('label',{},f.picks);f.make('select',{'data-m-option':'frame'},frameLabel);
  const fields=f.make('div',{class:'m-option-fields'},f.picks),position=f.make('label',{'data-m-field-row':'position'},fields);f.make('select',{'data-m-field':'position'},position);
  const api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(section(stakeGroup),'size');assert.equal(section(formatLabel),'size');assert.equal(section(colorLabel),'material');assert.equal(section(frameLabel),'mounting');assert.equal(section(fields),'mounting');
  assert.equal(stake.parentNode,stakeGroup);assert.equal(format.parentNode,formatLabel);assert.equal(position.parentNode,fields);api.dispose();
});

test('legacy mounting controls outside the native options body keep the original scroll container',()=>{
  const f=fixture(),legacy=f.make('fieldset',{class:'completion-mount'},f.native);f.make('button',{'data-mount':'K00'},legacy,'Ohne');
  const api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(section(legacy),'mounting');assert.equal(f.panel.dataset.demoOptionsLayout,undefined);
  f.link('mounting').click();assert.equal(visible(f,legacy),true);assert.equal(f.editor.scrollTop,80);assert.deepEqual(f.editor.scrollCalls,[]);api.dispose();
});

test('a natively hidden options container is not made visible by the demo layout',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();assert.equal(f.panel.dataset.demoOptionsLayout,'stack');
  f.native.hidden=true;f.flush();assert.equal(f.panel.dataset.demoOptionsLayout,undefined);assert.equal(f.native.hidden,true);
  f.native.hidden=false;f.flush();assert.equal(f.panel.dataset.demoOptionsLayout,'stack');
  f.picks.computed.display='none';f.picks.setAttribute('style','display:none');f.flush();
  assert.equal(f.panel.dataset.demoOptionsLayout,undefined);assert.equal(f.picks.computed.display,'none');api.dispose();
});

test('hidden panels and inert inspectors do not switch; native changes keep the chosen tab and inner scroll',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();f.panel.hidden=true;f.flush();
  f.link('mounting').click();assert.equal(active(f),'size');f.panel.hidden=false;f.editor.inert=true;f.flush();
  f.link('mounting').click();assert.equal(active(f),'size');f.editor.inert=false;f.link('mounting').click();
  f.picks.scrollTop=75;f.mounting.button.setAttribute('style','color:black');f.flush();
  assert.equal(active(f),'mounting');assert.equal(f.picks.scrollTop,75);assert.equal(f.editor.scrollTop,80);api.dispose();
});

test('replaced navigation is rebuilt once and observers settle without rewriting native controls',()=>{
  const f=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();const old=f.link('size'),oldTerm=f.terms.size;
  oldTerm.remove();const term=f.make('span',{class:'ux-info-term'},f.links);term.append(f.doc.createTextNode('Größe'));
  const info=f.make('button',{'data-ux-info':'size',class:'ux-info-button'},term);f.flush();
  assert.notEqual(f.link('size'),old);assert.equal(info.parentNode,term);assert.equal(oldTerm.querySelector('button'),f.infos.size);
  api.refresh();f.flush();assert.equal(f.panel.dataset.demoOptionsMeasuring,undefined);api.dispose();
});

test('installation is idempotent; dispose restores every owned attribute, text node, style and listener',()=>{
  const f=fixture();f.size.row.setAttribute('data-demo-option-section','prior');f.panel.style.setProperty('--md-options-header-height','17px','important');
  const api=installDemoOptionsNavigation(f.el);f.flush();assert.equal(installDemoOptionsNavigation(f.el),api);
  const stale=f.link('mounting');api.dispose();api.dispose();f.flush();
  for(const [term,nodes]of f.originalNodes)assert.deepEqual(term.childNodes,nodes);
  assert.equal(f.observers.size,0);assert.equal(f.root.querySelector('style'),null);assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);
  assert.equal(f.size.row.dataset.demoOptionSection,'prior');assert.equal(f.mounting.row.dataset.demoOptionSection,undefined);
  assert.equal(f.panel.dataset.demoOptionsActive,undefined);assert.equal(f.panel.style.getPropertyValue('--md-options-header-height'),'17px');
  assert.equal(f.panel.style.getPropertyPriority('--md-options-header-height'),'important');
  stale.click();f.source.textContent='Holz';f.flush();assert.deepEqual(f.editor.scrollCalls,[]);assert.equal(f.link('size'),null);
  const next=installDemoOptionsNavigation(f.el);assert.notEqual(next,api);next.dispose();
});

test('unrelated editors and incomplete native shells remain unchanged',()=>{
  assert.equal(installDemoOptionsNavigation(null),null);assert.equal(installDemoOptionsNavigation({}),null);
  const f=fixture(),other=fixture(),api=installDemoOptionsNavigation(f.el);f.flush();
  assert.equal(other.link('size'),null);assert.deepEqual(other.el.state,other.state);api.dispose();
});

const steelConfig=()=>({
  profile:{material:{kind:'steel'}},
  productExecution:{schema:'gravuru-product-execution/v1',kind:'door-sign',sourceFamilyId:'steel-door-signs'},
  familyFormats:{schema:'gravuru-family-formats/v1'}
});

test('confirmed steel door signs separate Form / Größe / Befestigung and retain all 80 native sizes in eight catalogue forms',()=>{
  const family=JSON.parse(fs.readFileSync(new URL('../../../scripts/fixtures/steel-shopify-options/family.json',import.meta.url),'utf8'));
  const config=steelConfig();config.familyFormats.defaultColor='edelstahl';
  config.familyFormats.formats=family.sizes.map(s=>({key:s.key,form:s.groupKey,geometry:{width:s.widthMm,height:s.heightMm},
    variants:[{color:'edelstahl',basePriceCents:s.baseCents,designIds:['synthetic-layout']}]}));
  const choices=familyFormatChoices(config),f=fixture({material:'Edelstahl · 1,5 mm'}),seen=new Set();
  const render=form=>{
    for(const child of [...f.pictures.childNodes])child.remove();
    const shapes=f.make('section',{class:'family-shapes'},f.pictures);f.make('h3',{},shapes,'Form');
    for(const choice of choices)f.make('button',{'data-family-group':'form','data-family-value':choice.id},shapes,choice.label);
    const sizes=f.make('section',{class:'family-sizes'},f.pictures);f.make('h3',{},sizes,'Größe');
    for(const size of choices.find(c=>c.id===form).sizes)f.make('button',{'data-family-group':'size','data-family-value':size.key},sizes,size.key);
    const mounting=f.make('section',{class:'family-mounting'},f.pictures);f.make('button',{'data-family-group':'mounting','data-family-value':'K00'},mounting,'Ohne');
  };
  render(choices[0].id);
  f.pictures.addEventListener('click',event=>{
    const {familyGroup:group,familyValue:value}=event.target.dataset;
    if(group==='form')render(value);
    if(group==='size')seen.add(value);
  });
  const api=installDemoOptionsNavigation(f.el,{config});f.flush();
  assert.equal(active(f),'form');assert.equal(f.link('form').textContent,'Form');assert.equal(f.link('material'),null);
  assert.equal(f.link('form').getAttribute('aria-label'),'Form anzeigen');assert.equal(f.panel.querySelector('[data-demo-options-material]'),null);
  assert.equal(f.panel.dataset.demoOptionsLayout,'stack');assert.equal(f.editor.scrollTop,80);assert.equal(f.canvas.scrollTop,11);
  assert.deepEqual(f.el.state,f.state);assert.equal(f.infos.material.parentNode,f.terms.material);
  f.infos.material.click();assert.deepEqual(f.infoCalls,['material']);
  for(const choice of choices){
    f.link('form').click();f.flush();
    assert.equal(visible(f,f.pictures.querySelector('.family-shapes')),true);
    assert.equal(visible(f,f.pictures.querySelector('.family-sizes')),false);
    f.pictures.querySelector('[data-family-group="form"][data-family-value="'+choice.id+'"]').click();f.flush();
    assert.equal(active(f),'form');assert.equal(section(f.pictures.querySelector('.family-shapes')),'form');
    f.link('size').click();f.flush();
    assert.equal(visible(f,f.pictures.querySelector('.family-shapes')),false);
    assert.equal(visible(f,f.pictures.querySelector('.family-sizes')),true);
    for(const button of f.pictures.querySelectorAll('[data-family-group="size"]'))button.click();
  }
  assert.equal(seen.size,80);assert.deepEqual([...seen].sort(),family.sizes.map(s=>s.key).sort());
  assert.deepEqual([...new Set(config.familyFormats.formats.filter(s=>seen.has(s.key)).map(s=>s.form))].sort(),['AB','EL','OV','QU','R','RE','RT1','RT2']);
  f.link('mounting').click();f.flush();assert.equal(visible(f,f.pictures.querySelector('.family-mounting')),true);
  assert.equal(visible(f,f.pictures.querySelector('.family-sizes')),false);assert.deepEqual(f.editor.scrollCalls,[]);
  api.dispose();f.flush();
  for(const [term,nodes]of f.originalNodes)assert.deepEqual(term.childNodes,nodes);
  assert.equal(f.terms.material.textContent,'Material');assert.equal(f.observers.size,0);
});

test('form-first navigation is confined to the confirmed variable steel door-sign family',()=>{
  for(const change of [c=>c.profile.material.kind='slate',c=>c.productExecution.sourceFamilyId='another-family',
    c=>c.productExecution.kind='stake',c=>c.familyFormats.fixedSize='one',c=>delete c.productExecution]){
    const config=steelConfig();change(config);const f=fixture();
    const shapes=f.make('section',{class:'family-shapes'},f.pictures);f.make('button',{'data-family-group':'form'},shapes,'Form');
    const api=installDemoOptionsNavigation(f.el,{config});f.flush();
    assert.equal(f.link('form'),null);assert.equal(f.link('material').textContent,'Material');
    assert.equal(section(shapes),'size');assert.equal(active(f),'size');api.dispose();
  }
});
