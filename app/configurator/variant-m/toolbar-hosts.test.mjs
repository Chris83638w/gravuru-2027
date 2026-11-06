import test from 'node:test';
import assert from 'node:assert/strict';
import {placePreviewToolbar,placeDirectToolbar} from './toolbar-hosts.mjs';

// The real placement functions move live nodes. This small DOM port checks
// identity/listeners and host order through responsive and fullscreen changes.
class Node extends EventTarget{
  constructor(){super();this.children=[];this.parentNode=null;this.hidden=false;this.classes=new Set();this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};this.style={removeProperty(name){delete this[name];}};}
  insert(node,index){if(node.parentNode){const old=node.parentNode.children;old.splice(old.indexOf(node),1);}this.children.splice(index,0,node);node.parentNode=this;}
  append(node){this.insert(node,this.children.length);}
  prepend(node){this.insert(node,0);}
  insertBefore(node,before){this.insert(node,this.children.indexOf(before));}
  after(node){this.parentNode.insert(node,this.parentNode.children.indexOf(this)+1);}
  querySelector(selector){return selector==='.ux-preview-back'?this.close:selector==='[data-ux-stage]'?this.canvas:null;}
}
function fixture(){
  const toolbar=new Node(),panel=new Node(),workbench=new Node(),heading=new Node(),preview=new Node(),stage=new Node(),full=new Node();
  full.open=false;full.close=new Node();full.append(full.close);preview.append(toolbar);preview.canvas=new Node();preview.append(preview.canvas);stage.append(panel);
  const f={toolbar,panel,workbench,heading,preview,stage,full};
  f.place=(mobile,fullscreen)=>{full.open=fullscreen;placePreviewToolbar({...f,mobile});return placeDirectToolbar({...f,mobile,full:fullscreen});};
  return f;
}

test('opt-in tools reuse live controls through selection, responsive and fullscreen changes and return to default placement',()=>{
 const f=fixture(),fixedHost=new Node();let edits=0;f.panel.addEventListener('click',()=>edits++);
 for(const mobile of [false,true,false])for(const full of [false,true,false])for(const hidden of [false,true]){
  f.panel.hidden=hidden;
  assert.equal(placeDirectToolbar({...f,fixedHost,mobile,full}),true);
  assert.equal(f.panel.parentNode,fixedHost);assert.equal(f.panel.hidden,hidden);assert.deepEqual(fixedHost.children,[f.panel]);
 }
 f.panel.dispatchEvent(new Event('click'));assert.equal(edits,1);
 placeDirectToolbar({...f,mobile:false,full:false});assert.equal(f.panel.parentNode,f.preview);
 f.panel.dispatchEvent(new Event('click'));assert.equal(edits,2);
});

test('doorbell selection uses a persistent slot through deselection, mobile and fullscreen, retaining live controls',()=>{
 const f=fixture(),stableHost=new Node();f.preview.insertBefore(stableHost,f.preview.canvas);let edits=0;f.panel.addEventListener('click',()=>edits++);
 const original=[...f.preview.children];
 for(const mobile of [false,true,false]){
  for(const hidden of [true,false,true]){
   f.panel.hidden=hidden;placeDirectToolbar({...f,stableHost,mobile,full:false});
   assert.deepEqual(f.preview.children,original);assert.equal(f.panel.parentNode,stableHost);assert.equal(f.panel.hidden,hidden);
  }
  placeDirectToolbar({...f,stableHost,mobile,full:true});assert.equal(f.panel.parentNode,f.stage);
  placeDirectToolbar({...f,stableHost,mobile,full:false});assert.equal(f.panel.parentNode,stableHost);
 }
 f.panel.dispatchEvent(new Event('click'));assert.equal(edits,1);
});

test('desktop tools sit above the plate; repeated placement preserves the original controls and listeners',()=>{
  const f=fixture();let undo=0,edit=0;f.toolbar.addEventListener('click',()=>undo++);f.panel.addEventListener('click',()=>edit++);
  for(let i=0;i<3;i++)assert.equal(f.place(false,false),true);
  assert.deepEqual(f.heading.children,[f.toolbar]);assert.deepEqual(f.preview.children,[f.panel,f.preview.canvas]);assert.deepEqual(f.workbench.children,[]);assert.equal(f.workbench.hidden,true);assert.equal(f.panel.classes.has('is-workbench'),true);
  f.toolbar.dispatchEvent(new Event('click'));f.panel.dispatchEvent(new Event('click'));assert.equal(undo,1);assert.equal(edit,1);
});

test('mobile keeps general tools in the heading and the text dock before the plate',()=>{
  const f=fixture();f.place(false,false);assert.equal(f.place(true,false),false);
  assert.deepEqual(f.heading.children,[f.toolbar]);assert.deepEqual(f.preview.children,[f.panel,f.preview.canvas]);assert.equal(f.workbench.hidden,true);
  assert.equal(f.panel.classes.has('is-docked'),true);assert.equal(f.panel.classes.has('is-workbench'),false);assert.equal(f.panel.classes.has('is-fullscreen-dock'),false);
});

test('mobile selection retains its reserved slot and original listeners through fullscreen',()=>{
 const f=fixture(),stableHost=new Node();f.preview.insertBefore(stableHost,f.preview.canvas);let edits=0;f.panel.addEventListener('click',()=>edits++);
 const children=[...f.preview.children];
 for(const hidden of [true,false,true,false]){
  f.panel.hidden=hidden;placeDirectToolbar({...f,stableHost,mobile:true,full:false});
  assert.deepEqual(f.preview.children,children);assert.equal(f.panel.parentNode,stableHost);assert.equal(f.panel.hidden,hidden);
  placeDirectToolbar({...f,stableHost,mobile:true,full:true});assert.equal(f.panel.parentNode,f.stage);
  placeDirectToolbar({...f,stableHost,mobile:true,full:false});assert.equal(f.panel.parentNode,stableHost);
 }
 f.panel.dispatchEvent(new Event('click'));assert.equal(edits,1);
});

test('fullscreen and viewport changes return both original bars to the correct hosts',()=>{
  const f=fixture();
  for(const mobile of [false,true]){
    f.place(mobile,false);f.place(mobile,true);
    assert.deepEqual(f.full.children,[f.full.close,f.toolbar]);assert.equal(f.panel.parentNode,f.stage);assert.equal(f.workbench.hidden,true);
    assert.equal(f.panel.classes.has('is-workbench'),false);assert.equal(f.panel.classes.has('is-fullscreen-dock'),mobile);
    f.place(!mobile,true);assert.equal(f.panel.parentNode,f.stage);assert.equal(f.panel.classes.has('is-fullscreen-dock'),!mobile);
    f.place(!mobile,false);assert.equal(f.toolbar.parentNode,f.heading);assert.equal(f.panel.parentNode,f.preview);
  }
  f.place(false,false);assert.deepEqual(f.heading.children,[f.toolbar]);assert.deepEqual(f.preview.children,[f.panel,f.preview.canvas]);assert.equal(f.full.children.length,1);
});

test('returning from canvas placement removes absolute offsets and scale; hidden state stays hidden',()=>{
  const f=fixture();f.panel.hidden=true;f.panel.style.left='80px';f.panel.style.top='30px';f.panel.style.transform='scale(.78)';f.panel.style.transformOrigin='top left';f.panel.style['--ux-full-dock-top']='42px';
  f.place(false,false);
  for(const property of ['left','top','transform','transformOrigin'])assert.equal(f.panel.style[property],'');
  assert.equal(f.panel.style['--ux-full-dock-top'],undefined);assert.equal(f.panel.hidden,true);
  f.place(true,false);f.place(true,true);f.place(false,false);assert.equal(f.panel.hidden,true);
});

test('direct editing can initialise before the layout band has been installed',()=>{
  const f=fixture();assert.equal(placeDirectToolbar({...f,workbench:null,mobile:false,full:false}),false);
  assert.equal(f.panel.parentNode,f.stage);assert.equal(f.panel.classes.has('is-workbench'),false);
  f.place(false,false);assert.equal(f.panel.parentNode,f.preview);
});
