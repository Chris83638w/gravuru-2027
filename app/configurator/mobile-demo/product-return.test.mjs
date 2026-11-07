import test from 'node:test';
import assert from 'node:assert/strict';
import {installDemoProductReturn} from './product-return.mjs';

class Node {
  constructor(parent=null) {this.parentNode=parent;this.listeners=[];this.attrs=new Map();this.disabled=false;this.textContent='Zurück zum Produkt';this.childNodes=[{icon:'native-back'}];}
  addEventListener(type,fn,capture=false){this.listeners.push({type,fn,capture:capture===true});}
  removeEventListener(type,fn,capture=false){this.listeners=this.listeners.filter(item=>item.type!==type||item.fn!==fn||item.capture!==(capture===true));}
  getAttribute(name){return this.attrs.get(name)??null;}
  setAttribute(name,value){this.attrs.set(name,String(value));}
  removeAttribute(name){this.attrs.delete(name);}
  contains(node){for(;node;node=node.parentNode)if(node===this)return true;return false;}
  click(){if(!this.disabled)return emit(this);}
}
function emit(target) {
  const path=[];for(let node=target;node;node=node.parentNode)path.push(node);
  const event={target,type:'click',defaultPrevented:false,stopped:false,
    preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};
  for(const node of path.toReversed())for(const listener of [...node.listeners])if(listener.type==='click'&&listener.capture&&!event.stopped)listener.fn(event);
  for(const node of path)for(const listener of [...node.listeners])if(listener.type==='click'&&!listener.capture&&!event.stopped)listener.fn(event);
  return event;
}
function fixture({frame=false,disabled=false,title,marker,nativeAvailable,connected=false}={}) {
  const messages=[],navigation=[];
  const location={origin:'https://konfi.example',assign(){navigation.push('assign');throw Error('Navigation is forbidden in this adapter');}};
  const view={location,GravuruMobileDemo:{id:'r10'},postMessage:(...args)=>messages.push(args),
    history:{back(){navigation.push('back');throw Error('History is forbidden in this adapter');}}};
  view.parent=frame?{location:{origin:location.origin},postMessage:(...args)=>messages.push(args)}:view;
  if(connected)view.GravuruShopEntry={backUrl:'https://shop.example/products/verified'};
  const doc={defaultView:view};Object.defineProperty(doc,'referrer',{get(){throw Error('No referrer guessing');}});
  const root=new Node(),button=new Node(root);button.disabled=disabled;
  if(title!==undefined)button.setAttribute('title',title);if(marker!==undefined)button.setAttribute('data-demo-return-unavailable',marker);
  const el={shadowRoot:root,ownerDocument:doc,state:{designId:'bruno',objects:[{id:'photo',uxUploadId:'original',photoShape:'heart',x:30,y:20,w:22,h:14}],selected:'photo',mOptions:{size:'30x20'},width:300,height:200}};
  const nativeHandler=()=>view.parent.postMessage({type:'gravuru-fk-close'},view.location.origin);
  root.addEventListener('click',nativeHandler);
  const before=structuredClone(el.state),text=button.textContent,nodes=[...button.childNodes];
  const api=installDemoProductReturn(el,{button,nativeAvailable});
  return {el,doc,root,button,view,api,messages,navigation,before,text,nodes,nativeHandler};
}

test('standalone demo has a visible disabled native button with an explanation and no invented product screen',()=>{
  const f=fixture();assert.ok(f.api);assert.equal(f.button.disabled,true);
  assert.match(f.button.getAttribute('title'),/keine Produktseite verknüpft/);
  assert.equal(f.button.getAttribute('data-demo-return-unavailable'),'');
  assert.equal(f.button.textContent,f.text);assert.deepEqual(f.button.childNodes,f.nodes);
  assert.equal(f.button.getAttribute('hidden'),null);f.button.click();assert.deepEqual(f.messages,[]);
  const event=emit(f.button);assert.equal(event.defaultPrevented,true);assert.equal(event.stopped,true);
  assert.deepEqual(f.messages,[]);assert.deepEqual(f.navigation,[]);assert.deepEqual(f.el.state,f.before);
});

test('the existing same-origin iframe return handler receives exactly the original click and native message',()=>{
  const f=fixture({frame:true,title:'Zurück zur Produktseite'});assert.equal(f.button.disabled,false);
  assert.equal(f.button.getAttribute('title'),'Zurück zur Produktseite');
  const event=f.button.click();assert.equal(event.defaultPrevented,false);assert.equal(event.stopped,false);
  assert.deepEqual(f.messages,[[{type:'gravuru-fk-close'},'https://konfi.example']]);
  assert.deepEqual(f.el.state,f.before);assert.deepEqual(f.navigation,[]);
  assert.equal(f.root.listeners[0].fn,f.nativeHandler);
});

test('a standalone shop-entry value without a receiving parent is not mistaken for a working return route',()=>{
  const f=fixture({connected:true});assert.equal(f.button.disabled,true);emit(f.button);
  assert.deepEqual(f.messages,[]);assert.deepEqual(f.navigation,[]);
});

test('a different-origin or unreadable parent cannot receive the native origin-bound close message',()=>{
  for(const mode of ['other-origin','unreadable']){
    const f=fixture({frame:true});
    if(mode==='other-origin')f.view.parent.location.origin='https://unrelated.example';
    else Object.defineProperty(f.view.parent,'location',{get(){throw Error('Cross-origin access');}});
    f.api.refresh();assert.equal(f.button.disabled,true);emit(f.button);assert.deepEqual(f.messages,[]);
    assert.deepEqual(f.navigation,[]);f.api.dispose();
  }
});

test('a verified host callback can explicitly declare its native route without replacing any handler',()=>{
  const f=fixture({nativeAvailable:()=>true});assert.equal(f.button.disabled,false);f.button.click();
  assert.deepEqual(f.messages,[[{type:'gravuru-fk-close'},'https://konfi.example']]);
  assert.deepEqual(f.navigation,[]);assert.deepEqual(f.el.state,f.before);
});

test('an explicit unavailable or failing native context remains disabled',()=>{
  for(const nativeAvailable of [()=>false,()=>{throw Error('Host context not ready');}]){
    const f=fixture({frame:true,nativeAvailable});assert.equal(f.button.disabled,true);emit(f.button);
    assert.deepEqual(f.messages,[]);f.api.dispose();
  }
});

test('refresh permits a subsequently verified parent and revokes a lost parent without guessing a URL',()=>{
  const f=fixture({title:'Original title'});assert.equal(f.button.disabled,true);
  f.view.parent={location:{origin:f.view.location.origin},postMessage:(...args)=>f.messages.push(args)};
  f.api.refresh();assert.equal(f.button.disabled,false);assert.equal(f.button.getAttribute('title'),'Original title');
  assert.equal(f.button.getAttribute('data-demo-return-unavailable'),null);f.button.click();assert.equal(f.messages.length,1);
  f.view.parent=f.view;
  const event=emit(f.button);assert.equal(event.stopped,true);assert.equal(f.button.disabled,true);assert.equal(f.messages.length,1);
  assert.deepEqual(f.el.state,f.before);assert.deepEqual(f.navigation,[]);
});

test('an original native disabled flag is retained in a connected context and after disposal',()=>{
  const f=fixture({frame:true,disabled:true,title:'Native reason'});assert.equal(f.button.disabled,true);
  emit(f.button);assert.deepEqual(f.messages,[]);assert.equal(f.button.disabled,true);
  f.api.dispose();assert.equal(f.button.disabled,true);assert.equal(f.button.getAttribute('title'),'Native reason');
});

test('the click guard does not reenable a later native disabled state',()=>{
  const f=fixture({frame:true});f.button.disabled=true;emit(f.button);
  assert.equal(f.button.disabled,true);assert.deepEqual(f.messages,[]);
});

test('dispose removes only its own capture guard and restores original attributes and native behavior',()=>{
  for(const original of [{},{title:'',marker:'original'},{title:'Original return',marker:'previous'}]){
    const f=fixture(original),ownListenerCount=f.button.listeners.length;assert.equal(ownListenerCount,1);
    f.api.dispose();f.api.dispose();assert.equal(f.button.listeners.length,0);
    assert.equal(f.button.disabled,false);assert.equal(f.button.getAttribute('title'),original.title??null);
    assert.equal(f.button.getAttribute('data-demo-return-unavailable'),original.marker??null);
    assert.equal(f.button.textContent,f.text);assert.deepEqual(f.button.childNodes,f.nodes);
    f.button.click();assert.equal(f.messages.length,1);assert.equal(f.root.listeners[0].fn,f.nativeHandler);
    f.api.refresh();assert.equal(f.button.disabled,false);assert.deepEqual(f.el.state,f.before);
  }
});

test('installation is idempotent per actual button and can be installed again after cleanup',()=>{
  const f=fixture();assert.equal(installDemoProductReturn(f.el,{button:f.button}),f.api);assert.equal(f.button.listeners.length,1);
  f.api.dispose();const next=installDemoProductReturn(f.el,{button:f.button});assert.notEqual(next,f.api);
  assert.equal(f.button.listeners.length,1);next.dispose();assert.equal(f.button.listeners.length,0);
});

test('missing or unrelated controls leave the editor untouched',()=>{
  assert.equal(installDemoProductReturn(null),null);
  const f=fixture(),outside=new Node();const before=f.button.listeners.length;
  assert.equal(installDemoProductReturn(f.el,{button:outside}),null);assert.equal(outside.listeners.length,0);
  assert.equal(f.button.listeners.length,before);assert.deepEqual(f.el.state,f.before);
});
