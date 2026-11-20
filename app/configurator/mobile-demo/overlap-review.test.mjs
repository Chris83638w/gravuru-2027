import test from 'node:test';
import assert from 'node:assert/strict';
import {installDemoOverlapReview,layoutFingerprint,masksTouch,refineOverlapIssues} from './overlap-review.mjs';

// The real wrapper/controller/placement planner run here. DOM, renderer and
// raster ports are injected; these are not claims of a real canvas/browser QA.
class Node {
  constructor(doc,tag='div') {this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners=[];this.attrs=new Map();this.textContent='';}
  append(...nodes) {for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
  replaceChildren(...nodes) {for(const node of [...this.children])node.remove();this.append(...nodes);}
  remove() {if(this.parentNode){const list=this.parentNode.children;list.splice(list.indexOf(this),1);this.parentNode=null;}}
  setAttribute(key,value) {this.attrs.set(key,String(value));}
  getAttribute(key) {return this.attrs.get(key)??null;}
  removeAttribute(key) {this.attrs.delete(key);}
  closest(selector) {for(let node=this;node;node=node.parentNode)if(selector==='[data-ux]'&&node.dataset.ux)return node;return null;}
  querySelector(selector) {
    const matches=node=>selector==='.ux-layout-check-dialog'&&node.className==='ux-layout-check-dialog'||
      selector==='[data-layout-problems]'&&node.dataset.layoutProblems!==undefined||
      selector==='[data-demo-overlap-accept]'&&node.dataset.demoOverlapAccept!==undefined||
      selector==='[data-demo-fit-feedback]'&&node.dataset.demoFitFeedback!==undefined||
      selector==='[data-ux=layout-fit]'&&node.dataset.ux==='layout-fit';
    for(const child of this.children){if(matches(child))return child;const found=child.querySelector(selector);if(found)return found;}
    return null;
  }
  addEventListener(type,fn,capture=false) {this.listeners.push({type,fn,capture:capture===true});}
  removeEventListener(type,fn,capture=false) {this.listeners=this.listeners.filter(item=>item.type!==type||item.fn!==fn||item.capture!==(capture===true));}
}
function emit(target,type,extra={}) {
  const path=[];for(let node=target;node;node=node.parentNode)path.push(node);
  const event={target,type,...extra,composedPath:()=>path,preventDefault(){this.defaultPrevented=true;}};
  for(const node of path.toReversed())for(const item of [...node.listeners])if(item.type===type&&item.capture)item.fn(event);
  for(const node of path)for(const item of [...node.listeners])if(item.type===type&&!item.capture)item.fn(event);
  return event;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const overlap=(...ids)=>({code:'overlap',ids,message:'Die markierten Elemente überlagern sich.'});

function fixture({nativeIssues,plan,oldResolve,oldFit}={}) {
  const doc={createElement:tag=>new Node(doc,tag)},root=new Node(doc),dialog=new Node(doc,'dialog');dialog.className='ux-layout-check-dialog';root.append(dialog);
  const problems=new Node(doc);problems.dataset.layoutProblems='';dialog.append(problems);
  const fit=new Node(doc,'button'),edit=new Node(doc,'button');fit.dataset.ux='layout-fit';edit.dataset.ux='close';dialog.append(fit,edit);
  dialog.open=false;dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;queueMicrotask(()=>emit(dialog,'close'));};
  const profile={id:'slate',revision:2,geometry:{width:10,height:10,shape:'rectangle'}};
  const el={shadowRoot:root,state:{designId:'D1',width:10,height:10,fkFrame:'rect',mOptions:{size:'22x14',mounting:'none'},selected:'name',
    objects:[{id:'name',type:'text',text:'Bruno',font:'Cinzel',size:6,w:2,h:2,x:3,y:3,rotation:15},
      {id:'motif',type:'motif',motif:'dog',w:2,h:2,x:3,y:3,rotation:0},
      {id:'photo',type:'photoSlot',x:8,y:8,w:2,h:2,uxUploadId:'photo-original',uxPhotoCrop:{zoom:1,x:0,y:0},photoShape:'heart'}]},
    uxSelectedProfile:()=>profile};
  if(oldResolve)el.uxResolveLayoutReview=oldResolve;if(oldFit)el.uxFitLayoutReview=oldFit;
  const f={doc,root,dialog,problems,fit,edit,el,profile,messages:[],undos:[],mutations:0,legacyFits:0,renderCalls:[],rasterCalls:[],planCalls:[],nativeInspections:0};
  f.nativeIssues=nativeIssues??(()=>[overlap('name','motif')]);
  f.renderRevision='font-a';
  el.uxCollisionSVG=object=>{f.renderCalls.push(structuredClone(object));return JSON.stringify({object,resource:f.renderRevision});};
  // The raster port represents the visible ink, rather than the object's box.
  f.makeMasks=async input=>input.rendered.map(([id,rendered])=>{
    const {object}=JSON.parse(rendered),data=new Uint8Array(input.pixelWidth*input.pixelHeight);
    const x=Math.round(object.x*input.pixelWidth/input.width),y=Math.round(object.y*input.pixelHeight/input.height);
    if(x>=0&&x<input.pixelWidth&&y>=0&&y<input.pixelHeight)data[y*input.pixelWidth+x]=1;
    return {id,data};
  });
  f.rasterize=async input=>f.makeMasks(input);
  f.plan=plan??(async input=>({ok:true,moves:input.canMove(input.objects[0])?[{id:'name',x:5,y:3}]:[]}));
  f.context={inspect:async()=>{f.nativeInspections++;return typeof f.nativeIssues==='function'?f.nativeIssues():f.nativeIssues;},
    say:message=>f.messages.push(message),
    mutate:fn=>{f.undos.push(structuredClone(el.state));f.mutations++;fn();},
    canMove:object=>object.uxLocked!==true,
    boundaryIssue:object=>object.x-object.w/2<0||object.y-object.h/2<0||object.x+object.w/2>10||object.y+object.h/2>10?'outside':null,
    fitOriginal:()=>{f.legacyFits++;}};
  const options={rasterize:async input=>{f.rasterCalls.push(input);return f.rasterize(input);}};
  if(plan!=='real')options.plan=async input=>{f.planCalls.push(input);return f.plan(input);};
  f.api=installDemoOverlapReview(el,options);f.accept=dialog.querySelector('[data-demo-overlap-accept]');
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-ux]')?.dataset.ux==='close')dialog.close();});
  root.addEventListener('click',event=>{if(event.target.closest('[data-ux]')?.dataset.ux==='layout-fit')f.lastFit=el.uxFitLayoutReview(f.context);});
  f.start=()=>el.uxResolveLayoutReview(f.context);
  f.show=async()=>{const decision=f.start();await tick();assert.equal(dialog.open,true);return {decision};};
  f.fitNow=async()=>{emit(f.fit,'click');await f.lastFit;};
  return f;
}

test('fingerprint ignores selection/presentation while binding all design/render/profile facts',()=>{
  const state={designId:'D',width:220,height:140,fkFrame:'a',mOptions:{size:'a'},objects:[{id:'name',text:'Bruno',x:1}]};
  const profile={id:'p',revision:1,geometry:{width:220,height:140}},rendered=[['name','<path id="original" d="M0 0L1 1"/>']];
  const original=layoutFingerprint(state,rendered,profile);
  assert.equal(layoutFingerprint({...state,selected:'name',ui:{zoom:2,tab:'text'}},rendered,profile),original);
  for(const changed of [{...state,designId:'other'},{...state,width:300},{...state,fkFrame:'b'},{...state,mOptions:{size:'b'}},
    {...state,objects:[{...state.objects[0],text:'Emma'}]}])assert.notEqual(layoutFingerprint(changed,rendered,profile),original);
  assert.notEqual(layoutFingerprint(state,[['name','<path id="new-font" d="M0 0L2 2"/>']],profile),original);
  assert.notEqual(layoutFingerprint(state,rendered,{...profile,revision:2}),original);
  assert.notEqual(layoutFingerprint(state,rendered,{...profile,geometry:{width:300,height:200}}),original);
});

test('native per-render SVG identifiers and their internal references are canonical, real paths/crops remain bound',()=>{
  const state={designId:'D',objects:[]},profile={id:'slate',geometry:{width:220,height:140}};
  const svg=prefix=>`<defs><filter id="${prefix}-ink"><feColorMatrix values="1 0 0 0 0"/></filter><clipPath id="${prefix}-mask"><path d="M0 0L10 0L5 8Z"/></clipPath><path id="${prefix}-glyph" d="M1 1L2 3"/></defs><g filter="url(#${prefix}-ink)" clip-path="url(#${prefix}-mask)"><use href="#${prefix}-glyph"/><use xlink:href="#${prefix}-glyph"/></g>`;
  const before=layoutFingerprint(state,[['name',svg('studio-customer-86-element-0')]],profile);
  assert.equal(layoutFingerprint(state,[['name',svg('studio-customer-90-element-0')]],profile),before);
  assert.notEqual(layoutFingerprint(state,[['name',svg('studio-customer-90-element-0').replace('M1 1L2 3','M1 1L3 3')]],profile),before);
  assert.notEqual(layoutFingerprint(state,[['name',svg('studio-customer-90-element-0').replace('L5 8Z','L5 9Z')]],profile),before);
  assert.notEqual(layoutFingerprint(state,[['other',svg('studio-customer-90-element-0')]],profile),before);
});

test('an acrylic rear-engraving fragment keeps its identity when the outer plate is rendered again',()=>{
  const state={designId:'D10',objects:[]},profile={id:'acrylic',geometry:{width:120,height:80}};
  const fragment=(n,path,marked=true)=>`<g ${marked?'data-preview-rear-engraving="true" ':''}filter="url(#studio-customer-${n}-rear-frost)"><path d="${path}"/></g>`;
  const id=svg=>layoutFingerprint(state,[['motiv-1',svg]],profile);
  assert.equal(id(fragment(35,'M0 0L1 1')),id(fragment(40,'M0 0L1 1')));
  assert.notEqual(id(fragment(35,'M0 0L1 1')),id(fragment(40,'M0 0L2 1')));
  assert.notEqual(id(fragment(35,'M0 0L1 1',false)),id(fragment(40,'M0 0L1 1',false)));
});

test('transparent rectangle intersections are removed only for complete disjoint ink; boundary stays',()=>{
  const a={id:'a',data:Uint8Array.of(1,0,0)},b={id:'b',data:Uint8Array.of(0,0,1)},boundary={code:'boundary',ids:['a']};
  assert.equal(masksTouch(a.data,b.data),false);
  assert.deepEqual(refineOverlapIssues([overlap('a','b'),boundary],[a,b]),[boundary]);
  b.data[0]=1;assert.equal(masksTouch(a.data,b.data),true);assert.equal(refineOverlapIssues([overlap('a','b')],[a,b]).length,1);
});

test('unknown, absent, wrongly sized and empty raster data cannot silently clear an overlap',()=>{
  const issue=overlap('a','b'),valid={id:'a',data:Uint8Array.of(1,0)};
  for(const data of [undefined,null,[],new Uint8Array(),Uint8Array.of(0),[0,1]]){
    assert.equal(refineOverlapIssues([issue],[valid,{id:'b',data}]).length,1);
  }
  assert.equal(refineOverlapIssues([issue],[valid]).length,1);
});

test('same-state consent reuses exact renderer masks but still runs native inspection, with no model mutation',async()=>{
  const f=fixture(),before=structuredClone(f.el.state),{decision}=await f.show();
  assert.equal(f.rasterCalls.length,1);emit(f.accept,'click');assert.equal(await decision,true);
  f.el.state.selected=null;assert.equal(await f.start(),true);
  assert.equal(f.rasterCalls.length,1);assert.ok(f.nativeInspections>=3);assert.equal(f.mutations,0);
  assert.deepEqual({...f.el.state,selected:before.selected},before);assert.equal(f.dialog.open,false);
});

test('a rendered font/resource change invalidates both cached masks and previous consent',async()=>{
  const f=fixture(),{decision}=await f.show();emit(f.accept,'click');assert.equal(await decision,true);
  f.renderRevision='font-b';const again=f.start();await tick();assert.equal(f.dialog.open,true);assert.equal(f.rasterCalls.length,2);
  emit(f.edit,'click');assert.equal(await again,false);assert.equal(f.mutations,0);
});

test('boundary and other native validators are never consented to, even with disjoint visible masks',async()=>{
  const f=fixture({nativeIssues:[{code:'boundary',ids:['name'],message:'Rand prüfen.'},overlap('name','motif')]});
  f.el.state.objects[1].x=6;
  assert.equal(await f.start(),false);assert.equal(f.accept.hidden,true);assert.equal(f.dialog.open,true);
  assert.equal(f.problems.children.length,1);emit(f.accept,'click');await tick();assert.equal(f.mutations,0);
  await f.fitNow();assert.equal(f.legacyFits,1);assert.equal(f.planCalls.length,0);
});

test('contour fitting applies positions only once through native undo and verifies native rendering again',async()=>{
  const f=fixture(),before=structuredClone(f.el.state),{decision}=await f.show();
  await f.fitNow();assert.equal(await decision,false);assert.equal(f.mutations,1);assert.equal(f.undos.length,1);
  assert.deepEqual(f.undos[0],before);assert.equal(f.rasterCalls.length,2);assert.equal(f.dialog.open,false);
  const expected=structuredClone(before);expected.objects[0].x=5;assert.deepEqual(f.el.state,expected);
  const input=f.planCalls[0];assert.deepEqual(input.movableIds,['name','motif']);assert.equal(input.canMove,f.context.canMove);
  assert.equal(input.accepts({...before.objects[0],x:-1}),false);
  assert.equal(f.planCalls.length,2);const verification=f.planCalls[1];
  assert.equal(input.clearancePixels,Math.ceil(.5*Math.max(input.scaleX,input.scaleY)));
  assert.equal(verification.clearancePixels,input.clearancePixels);
  assert.equal(verification.canMove(verification.objects[0]),false);
  assert.notEqual(verification.masks,input.masks,'spacing is verified from the fresh native renderer raster');
  const photoRendered=f.rasterCalls[1].rendered.find(([id])=>id==='photo')[1];
  assert.deepEqual(JSON.parse(photoRendered).object,before.objects[2]);
  assert.deepEqual(f.rasterCalls[1].rendered.map(([id])=>id),['name','motif','photo']);
});

test('the real placement planner uses the native rights/boundary callbacks and one undoable translation',async()=>{
  const f=fixture({plan:'real'}),before=structuredClone(f.el.state),{decision}=await f.show();
  f.el.state.objects[1].uxLocked=true;
  // This is a new inspected state; the old decision is cancelled by native Fit.
  await f.fitNow();assert.equal(await decision,false);assert.equal(f.mutations,1);
  assert.notEqual(f.el.state.objects[0].x+':'+f.el.state.objects[0].y,before.objects[0].x+':'+before.objects[0].y);
  assert.ok(Math.max(Math.abs(f.el.state.objects[0].x-before.objects[0].x),Math.abs(f.el.state.objects[0].y-before.objects[0].y))>.5,
    'the approved small gap remains between the synthetic one-pixel ink contours');
  assert.deepEqual(f.el.state.objects[1],{...before.objects[1],uxLocked:true});
  for(const key of ['w','h','rotation','size','font','text'])assert.equal(f.el.state.objects[0][key],before.objects[0][key]);
  assert.equal(f.context.boundaryIssue(f.el.state.objects[0]),null);
});

test('a failed plan or raster error keeps all content and never creates an undo entry',async()=>{
  for(const failure of ['plan-reject','plan-no-fit','raster']){
    const f=fixture(),before=structuredClone(f.el.state);
    if(failure==='plan-reject')f.plan=async()=>{throw Error('planning failed');};
    if(failure==='plan-no-fit')f.plan=async()=>({ok:false,moves:[]});
    if(failure==='raster')f.rasterize=async()=>{throw Error('image failed');};
    const {decision}=await f.show();await f.fitNow();emit(f.edit,'click');assert.equal(await decision,false);
    assert.deepEqual(f.el.state,before);assert.equal(f.mutations,0);assert.equal(f.fit.disabled,false);
    assert.ok(f.messages.some(message=>message.includes('nicht sicher')));f.api.dispose();
  }
});

test('incomplete initial masks retain native warning and cannot be used for automatic placement',async()=>{
  for(const damage of ['missing','duplicate','size','empty']){
    const f=fixture(),before=structuredClone(f.el.state);
    f.rasterize=async input=>{const masks=await f.makeMasks(input);
      if(damage==='missing')masks.pop();
      if(damage==='duplicate')masks[1].id=masks[0].id;
      if(damage==='size')masks[1].data=Uint8Array.of(1);
      if(damage==='empty')masks[1].data.fill(0);
      return masks;
    };
    const {decision}=await f.show();assert.equal(f.accept.hidden,false);await f.fitNow();emit(f.edit,'click');assert.equal(await decision,false);
    assert.equal(f.planCalls.length,0);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,before);f.api.dispose();
  }
});

test('incomplete verification masks reject an otherwise successful plan before any native write',async()=>{
  for(const damage of ['missing','duplicate','size','empty']){
    const f=fixture(),before=structuredClone(f.el.state);let rasterCount=0;
    f.rasterize=async input=>{const masks=await f.makeMasks(input);if(++rasterCount===2){
      if(damage==='missing')masks.pop();
      if(damage==='duplicate')masks[1].id=masks[0].id;
      if(damage==='size')masks[1].data=Uint8Array.of(1);
      if(damage==='empty')masks[1].data.fill(0);
    }return masks;};
    const {decision}=await f.show();await f.fitNow();emit(f.edit,'click');assert.equal(await decision,false);
    assert.equal(f.mutations,0);assert.deepEqual(f.el.state,before);assert.ok(f.messages.at(-1).includes('nicht sicher'));f.api.dispose();
  }
});

test('fresh native renderer verification rejects remaining collision or out-of-bounds proposal',async()=>{
  for(const x of [3,10]){
    const f=fixture({plan:async()=>({ok:true,moves:[{id:'name',x,y:3}]})}),before=structuredClone(f.el.state),{decision}=await f.show();
    await f.fitNow();emit(f.edit,'click');assert.equal(await decision,false);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,before);f.api.dispose();
  }
});

test('state changed while planning is preserved and invalidates the old plan',async()=>{
  const wait=deferred(),f=fixture({plan:()=>wait.promise}),{decision}=await f.show();
  emit(f.fit,'click');await tick();f.el.state.objects[0].text='Emma';const changed=structuredClone(f.el.state);
  wait.resolve({ok:true,moves:[{id:'name',x:5,y:3}]});await f.lastFit;
  emit(f.accept,'click');
  assert.equal(await decision,false);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,changed);
});

test('changing source content during initial rasterization never grants a stale decision',async()=>{
  const wait=deferred(),f=fixture();f.rasterize=async input=>{await wait.promise;return f.makeMasks(input);};
  const decision=f.start();await tick();f.el.state.objects[0].text='Emma';const changed=structuredClone(f.el.state);wait.resolve();
  assert.equal(await decision,false);assert.equal(f.dialog.open,false);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,changed);
});

test('source changes after native inspection cannot combine old issues with the new rendered fingerprint',async()=>{
  const f=fixture(),oldIssues=[overlap('name','motif')];
  f.context.inspect=async()=>{
    queueMicrotask(()=>{f.el.state.objects[0].x=.5;f.nativeIssues=[{code:'boundary',ids:['name'],message:'Rand prüfen.'}];});
    return oldIssues;
  };
  assert.equal(await f.start(),false);assert.equal(f.mutations,0);assert.equal(f.accept.hidden,true);
});

test('cancel/close while planning stops the pending operation without changing source',async()=>{
  for(const action of ['cancel','close']){
    const wait=deferred(),f=fixture({plan:()=>wait.promise}),before=structuredClone(f.el.state),{decision}=await f.show();
    emit(f.fit,'click');await tick();if(action==='cancel')emit(f.dialog,'cancel');f.dialog.close();await tick();
    wait.resolve({ok:true,moves:[{id:'name',x:5,y:3}]});await f.lastFit;
    assert.equal(await decision,false);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,before);f.api.dispose();
  }
});

test('cancel and stale source during verification raster both prevent the final native mutation',async()=>{
  for(const action of ['cancel','change']){
    const wait=deferred(),f=fixture();let count=0;f.rasterize=async input=>{if(++count===2)await wait.promise;return f.makeMasks(input);};
    const {decision}=await f.show();emit(f.fit,'click');await tick();
    if(action==='cancel'){emit(f.dialog,'cancel');f.dialog.close();}else f.el.state.objects[2].photoShape='oval';
    const expected=structuredClone(f.el.state);wait.resolve();await f.lastFit;if(f.dialog.open)emit(f.edit,'click');assert.equal(await decision,false);
    assert.equal(f.mutations,0);assert.deepEqual(f.el.state,expected);f.api.dispose();
  }
});

test('a failed native fit keeps the consent flow usable and displays its feedback inside the open dialog',async()=>{
  const f=fixture({plan:async()=>({ok:false,moves:[]})}),before=structuredClone(f.el.state);let settled=false;
  const decision=f.start().then(value=>{settled=true;return value;});await tick();await f.fitNow();
  assert.equal(settled,false);assert.equal(f.dialog.open,true);assert.equal(f.accept.disabled,false);
  assert.ok(f.dialog.querySelector('[data-demo-fit-feedback]').textContent.includes('nicht sicher'));
  emit(f.accept,'click');assert.equal(await decision,true);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,before);
});

test('a translation failing the second no-move gap verification is rejected before an undo entry',async()=>{
  let calls=0;const f=fixture({plan:async input=>{
    if(++calls===1)return {ok:true,moves:[{id:'name',x:5,y:3}]};
    assert.equal(input.canMove(input.objects[0]),false);assert.ok(input.clearancePixels>0);
    return {ok:false,moves:[]};
  }}),before=structuredClone(f.el.state),{decision}=await f.show();
  await f.fitNow();assert.equal(calls,2);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,before);
  assert.equal(f.accept.disabled,false);emit(f.edit,'click');assert.equal(await decision,false);
});

test('dispose resolves a waiting decision and restores only owned native hooks; pending fit cannot mutate',async()=>{
  const oldResolve=()=>true,oldFit=()=>{},wait=deferred(),f=fixture({oldResolve,oldFit,plan:()=>wait.promise});
  const before=structuredClone(f.el.state),{decision}=await f.show();emit(f.fit,'click');await tick();
  f.api.dispose();f.api.dispose();wait.resolve({ok:true,moves:[{id:'name',x:5,y:3}]});await f.lastFit;
  assert.equal(await decision,false);assert.equal(f.el.uxResolveLayoutReview,oldResolve);assert.equal(f.el.uxFitLayoutReview,oldFit);
  assert.equal(f.dialog.querySelector('[data-demo-overlap-accept]'),null);assert.equal(f.mutations,0);assert.deepEqual(f.el.state,before);
  const other=fixture(),replacement=()=>{};other.el.uxResolveLayoutReview=replacement;other.api.dispose();assert.equal(other.el.uxResolveLayoutReview,replacement);
  assert.equal(other.el.uxFitLayoutReview,undefined);
});

test('non-rendered decorative/hidden/guide objects stay untouched and outside the raster/plan',async()=>{
  const f=fixture();f.el.state.objects.push({id:'hidden',type:'text',uxHidden:true,x:3,y:3},{id:'decor',type:'motif',uxDecoration:true,x:3,y:3},{id:'guide',role:'guide',x:3,y:3});
  const extras=structuredClone(f.el.state.objects.slice(3)),{decision}=await f.show();await f.fitNow();assert.equal(await decision,false);
  assert.equal(f.mutations,1);assert.deepEqual(f.el.state.objects.slice(3),extras);
  assert.deepEqual(f.rasterCalls[0].rendered.map(([id])=>id),['name','motif','photo']);
});
