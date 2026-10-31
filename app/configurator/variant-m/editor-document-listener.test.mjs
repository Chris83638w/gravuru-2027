import test from 'node:test';
import assert from 'node:assert/strict';
import {installEditorOutsidePointer} from './editor-document-listener.mjs';

function environment(){
 const observers=[],doc=new EventTarget(),win=new EventTarget();
 win.MutationObserver=class{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}observe(target){assert.equal(target,doc.documentElement);}disconnect(){this.disconnected=true;}};
 doc.defaultView=win;doc.documentElement={};
 const el={ownerDocument:doc,isConnected:true};let calls=0;
 const install=()=>installEditorOutsidePointer(el,()=>calls++);
 const pointer=(path=[])=>{const e=new Event('pointerdown');e.composedPath=()=>path;doc.dispatchEvent(e);};
 const pagehide=persisted=>{const e=new Event('pagehide');e.persisted=persisted;win.dispatchEvent(e);};
 return {el,observers,install,pointer,pagehide,calls:()=>calls};
}
test('outside pointer is unique, ignores the editor and is disposed on unmount',()=>{
 const e=environment(),first=e.install(),second=e.install();
 assert.equal(e.observers[0].disconnected,true);
 first();e.pointer([e.el]);assert.equal(e.calls(),0);
 e.pointer();assert.equal(e.calls(),1);
 e.el.isConnected=false;e.observers[1].callback();
 assert.equal(e.observers[1].disconnected,true);
 e.pointer();assert.equal(e.calls(),1);
 second();second();
 e.el.isConnected=true;e.install();e.pointer();assert.equal(e.calls(),2);
});
test('a pointer before observer delivery cannot touch a detached editor; pagehide respects BFCache',()=>{
 const e=environment();e.install();e.el.isConnected=false;e.pointer();
 assert.equal(e.calls(),0);assert.equal(e.observers[0].disconnected,true);
 e.el.isConnected=true;e.install();e.pagehide(true);e.pointer();assert.equal(e.calls(),1);
 e.pagehide(false);e.pointer();assert.equal(e.calls(),1);assert.equal(e.observers[1].disconnected,true);
 e.el.isConnected=false;e.install();e.pointer();assert.equal(e.calls(),1);assert.equal(e.observers[2].disconnected,true);
});
