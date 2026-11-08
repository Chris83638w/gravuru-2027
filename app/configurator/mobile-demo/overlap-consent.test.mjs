import test from 'node:test';
import assert from 'node:assert/strict';
import {createOverlapConsentController} from './overlap-consent.mjs';

// A small native-dialog port exercises event ordering and async decisions. It
// does not substitute for the separate real browser/render/geometry checks.
class Node {
  constructor(doc, tag='div') { this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.dataset={};this.children=[];this.listeners=[];this.attrs=new Map();this.textContent=''; }
  append(...nodes) { for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);} }
  replaceChildren(...nodes) { for(const node of [...this.children])node.remove();this.append(...nodes); }
  remove() { if(this.parentNode){const siblings=this.parentNode.children;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;} }
  setAttribute(name,value) {this.attrs.set(name,String(value));}
  removeAttribute(name) {this.attrs.delete(name);}
  getAttribute(name) {return this.attrs.get(name)??null;}
  querySelector(selector) {return this.children.find(node=>selector==='[data-layout-problems]'&&node.dataset.layoutProblems!==undefined||selector==='[data-demo-overlap-accept]'&&node.dataset.demoOverlapAccept!==undefined)||null;}
  closest(selector) {for(let node=this;node;node=node.parentNode)if(selector==='[data-ux]'&&node.dataset.ux)return node;return null;}
  addEventListener(type,listener,capture=false) {this.listeners.push({type,listener,capture:capture===true});}
  removeEventListener(type,listener,capture=false) {this.listeners=this.listeners.filter(item=>item.type!==type||item.listener!==listener||item.capture!==(capture===true));}
}
function emit(target,type,extra={}) {
  const path=[];for(let node=target;node;node=node.parentNode)path.push(node);
  const event={type,target,...extra,composedPath:()=>path,preventDefault(){this.defaultPrevented=true;}};
  for(const node of path.toReversed())for(const item of [...node.listeners])if(item.type===type&&item.capture)item.listener(event);
  for(const node of path)for(const item of [...node.listeners])if(item.type===type&&!item.capture)item.listener(event);
  return event;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture() {
  const doc={createElement:tag=>new Node(doc,tag)},root=new Node(doc),dialog=new Node(doc,'dialog');root.append(dialog);
  const problems=new Node(doc);problems.dataset.layoutProblems='';dialog.append(problems);
  const fit=new Node(doc,'button'),edit=new Node(doc,'button');fit.dataset.ux='layout-fit';edit.dataset.ux='close';dialog.append(fit,edit);
  dialog.open=false;dialog.shows=0;dialog.closes=0;
  dialog.showModal=()=>{dialog.open=true;dialog.shows++;};
  dialog.close=()=>{dialog.open=false;dialog.closes++;queueMicrotask(()=>emit(dialog,'close'));};
  const f={doc,root,dialog,problems,fit,edit,failures:[],inspectCalls:0,fitCalls:0};
  // These callbacks represent the existing native handlers, not replacements.
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-ux]')?.dataset.ux==='close')dialog.close();});
  root.addEventListener('click',event=>{if(event.target.closest('[data-ux]')?.dataset.ux==='layout-fit')f.fitCalls++;});
  f.content={designId:'D1',geometry:{width:220,height:140},options:{size:'22x14',mounting:'none'},
    objects:[{id:'name',type:'text',text:'Bruno',font:'Cinzel',x:50,y:30,w:60,h:20},{id:'motif',type:'motif',motif:'dog',x:60,y:30,w:30,h:30}],
    media:[{id:'photo',sha:'original-photo',mask:'heart'}],resources:{fontRevision:'a',motifRevision:'a'}};
  f.issues=[{code:'overlap',ids:['name','motif'],message:'Text und Motiv überlagern sich.'}];
  f.snapshot=()=>({issues:f.issues,fingerprint:JSON.stringify(f.content)});
  f.inspect=async()=>f.snapshot();
  f.controller=createOverlapConsentController({dialog,inspect:()=>{f.inspectCalls++;return f.inspect();},onFailure:message=>f.failures.push(message)});
  f.accept=dialog.querySelector('[data-demo-overlap-accept]');
  f.clickAccept=()=>emit(f.accept,'click');
  return f;
}

test('explicit overlap consent closes before continuing and does not mutate design or native controls',async()=>{
  const f=fixture(),before=JSON.stringify(f.content),native=[f.problems,f.fit,f.edit];
  let continued=false;
  const result=f.controller.resolve(f.snapshot()).then(value=>{continued=true;assert.equal(f.dialog.open,false);return value;});
  assert.equal(continued,false);assert.equal(f.dialog.open,true);assert.equal(f.accept.hidden,false);assert.equal(f.accept.disabled,false);
  assert.equal(f.accept.textContent,'So übernehmen und weiter');assert.equal(f.problems.children[0].textContent,f.issues[0].message);
  f.clickAccept();assert.equal(await result,true);assert.equal(f.inspectCalls,1);assert.equal(f.dialog.closes,1);
  assert.equal(JSON.stringify(f.content),before);assert.deepEqual(f.dialog.children.slice(0,3),native);assert.equal(f.fitCalls,0);
});

test('the identical content is acknowledged in memory but re-inspected before the next native continuation',async()=>{
  const f=fixture(),first=f.controller.resolve(f.snapshot());f.clickAccept();assert.equal(await first,true);
  assert.equal(await f.controller.resolve(f.snapshot()),true);
  assert.equal(f.inspectCalls,2);assert.equal(f.dialog.shows,1);assert.equal(f.dialog.open,false);
});

test('every changed design, geometry, option, photo mask or resource requires a fresh explicit decision',async()=>{
  const changes=[f=>f.content.objects[0].text='Emma',f=>f.content.objects[1].x++,f=>f.content.geometry.width=300,
    f=>f.content.options.mounting='two',f=>f.content.media[0].mask='oval',f=>f.content.media[0].sha='replaced',
    f=>f.content.resources.fontRevision='b',f=>f.content.designId='D2'];
  for(const change of changes){
    const f=fixture(),first=f.controller.resolve(f.snapshot());f.clickAccept();assert.equal(await first,true);change(f);
    let done=false;const next=f.controller.resolve(f.snapshot()).then(value=>{done=true;return value;});
    await tick();assert.equal(done,false);assert.equal(f.dialog.open,true);assert.equal(f.dialog.shows,2);
    f.clickAccept();assert.equal(await next,true);f.controller.dispose();
  }
});

test('a changed current layout cannot be approved through an older displayed overlap',async()=>{
  const f=fixture(),result=f.controller.resolve(f.snapshot());f.content.objects[0].text='Changed while waiting';
  f.clickAccept();assert.equal(await result,false);assert.equal(f.dialog.open,false);assert.match(f.failures[0],/geändert/);
  const next=f.controller.resolve(f.snapshot());assert.equal(f.dialog.open,true);emit(f.edit,'click');assert.equal(await next,false);
});

test('issues are independently bound even if an inspector accidentally reuses a content fingerprint',async()=>{
  const f=fixture(),result=f.controller.resolve(f.snapshot());
  f.issues=[{code:'boundary',ids:['name'],message:'Außerhalb der Fläche.'},...f.issues];
  f.clickAccept();assert.equal(await result,false);assert.match(f.failures[0],/geändert/);
  assert.equal(await f.controller.resolve(f.snapshot()),false);assert.equal(f.accept.hidden,true);assert.equal(f.accept.disabled,true);
});

test('boundary, photo, required, mechanical and unknown issue codes never get an acceptance button',async()=>{
  for(const code of ['boundary','required-text','missing-photo','mounting-access','future-check']){
    const f=fixture();f.issues.push({code,ids:['name'],message:'Prüfung '+code});
    assert.equal(await f.controller.resolve(f.snapshot()),false);assert.equal(f.dialog.open,true);
    assert.equal(f.accept.hidden,true);assert.equal(f.accept.disabled,true);f.clickAccept();await tick();assert.equal(f.inspectCalls,0);
    emit(f.fit,'click');assert.equal(f.fitCalls,1);emit(f.edit,'click');assert.equal(f.dialog.open,false);f.controller.dispose();
  }
});

test('malformed overlap or missing evidence is fail closed; empty native issue list needs no consent',async()=>{
  const f=fixture();
  assert.equal(await f.controller.resolve({issues:f.issues,fingerprint:''}),false);
  assert.equal(await f.controller.resolve({issues:null,fingerprint:'x'}),false);
  for(const ids of [undefined,[],['name'],['name','name'],['name',null]]){
    f.issues=[{code:'overlap',ids,message:'Unvollständig'}];
    assert.equal(await f.controller.resolve(f.snapshot()),false);assert.equal(f.accept.hidden,true);
  }
  emit(f.edit,'click');f.issues=[];assert.equal(await f.controller.resolve(f.snapshot()),true);assert.equal(f.dialog.open,false);
});

test('inspection failure never grants consent and preserves the current design',async()=>{
  const f=fixture(),before=JSON.stringify(f.content);f.inspect=async()=>{throw Error('renderer unavailable');};
  const result=f.controller.resolve(f.snapshot());f.clickAccept();assert.equal(await result,false);
  assert.equal(JSON.stringify(f.content),before);assert.equal(f.dialog.open,false);assert.match(f.failures[0],/nicht geprüft/);
});

test('only one completion call owns a displayed decision, including rapid repeated acceptance clicks',async()=>{
  const f=fixture();let release;f.inspect=()=>new Promise(resolve=>{release=()=>resolve(f.snapshot());});
  const first=f.controller.resolve(f.snapshot());assert.equal(await f.controller.resolve(f.snapshot()),false);
  f.clickAccept();f.clickAccept();assert.equal(f.inspectCalls,1);assert.equal(f.accept.disabled,true);
  assert.equal(await f.controller.resolve(f.snapshot()),false);release();assert.equal(await first,true);
});

test('native edit and Escape reject the waiting continuation without consuming native events',async()=>{
  for(const action of ['edit','escape']){
    const f=fixture(),result=f.controller.resolve(f.snapshot());
    if(action==='edit')emit(f.edit,'click');
    if(action==='escape'){const event=emit(f.dialog,'cancel');assert.equal(event.defaultPrevented,undefined);f.dialog.close();}
    assert.equal(await result,false);assert.equal(f.inspectCalls,0);assert.equal(f.accept.disabled,true);f.controller.dispose();
  }
});

test('failed fitting leaves the original decision pending and permits explicit same-state consent afterward',async()=>{
  const f=fixture(),before=JSON.stringify(f.content);let settled=false;
  const result=f.controller.resolve(f.snapshot()).then(value=>{settled=true;return value;});
  const event=emit(f.fit,'click');assert.equal(event.defaultPrevented,undefined);assert.equal(f.fitCalls,1);
  f.clickAccept();assert.equal(f.inspectCalls,0,'busy fitting cannot be accepted');await tick();assert.equal(settled,false);
  // The separate native wrapper restores the button after a failed plan.
  f.accept.disabled=false;f.clickAccept();assert.equal(await result,true);
  assert.equal(f.inspectCalls,1);assert.equal(JSON.stringify(f.content),before);
});

test('successful fitting closes the original decision as false and never implies consent',async()=>{
  const f=fixture(),result=f.controller.resolve(f.snapshot());emit(f.fit,'click');
  f.content.objects[0].x+=5;f.dialog.close();assert.equal(await result,false);assert.equal(f.inspectCalls,0);
  const next=f.controller.resolve(f.snapshot());assert.equal(f.dialog.open,true);emit(f.edit,'click');assert.equal(await next,false);
});

test('Escape during fitting rejects the pending decision even if a failed-fit wrapper later reenables the button',async()=>{
  const f=fixture(),result=f.controller.resolve(f.snapshot());emit(f.fit,'click');
  emit(f.dialog,'cancel');f.dialog.close();assert.equal(await result,false);
  f.accept.disabled=false;f.clickAccept();await tick();assert.equal(f.inspectCalls,0);
});

test('starting fit invalidates an earlier asynchronous acceptance check without losing the pending decision',async()=>{
  for(const oldCheck of ['resolve','reject']){
    const f=fixture();let complete;f.inspect=()=>new Promise((resolve,reject)=>{complete=()=>oldCheck==='resolve'?resolve(f.snapshot()):reject(Error('stale check'));});
    let settled=false;const result=f.controller.resolve(f.snapshot()).then(value=>{settled=true;return value;});
    f.clickAccept();assert.equal(f.inspectCalls,1);emit(f.fit,'click');
    complete();await tick();assert.equal(settled,false);assert.equal(f.failures.length,0);assert.equal(f.dialog.open,true);
    f.inspect=async()=>f.snapshot();f.accept.disabled=false;f.clickAccept();assert.equal(await result,true);assert.equal(f.inspectCalls,2);
  }
});

test('a fit failure with changed source still requires a new review instead of accepting an older snapshot',async()=>{
  const f=fixture(),result=f.controller.resolve(f.snapshot());emit(f.fit,'click');f.content.objects[0].text='Emma';
  f.accept.disabled=false;f.clickAccept();assert.equal(await result,false);assert.match(f.failures[0],/geändert/);
});

test('a closed dialog cannot be approved by a late async inspection',async()=>{
  const f=fixture();let release;f.inspect=()=>new Promise(resolve=>{release=()=>resolve(f.snapshot());});
  const result=f.controller.resolve(f.snapshot());f.clickAccept();f.dialog.close();await tick();assert.equal(await result,false);
  release();await tick();const next=f.controller.resolve(f.snapshot());assert.equal(f.dialog.open,true);emit(f.edit,'click');assert.equal(await next,false);
});

test('queued close events from a previous review do not reject a newly opened decision',async()=>{
  const f=fixture(),first=f.controller.resolve(f.snapshot());f.clickAccept();assert.equal(await first,true);
  f.content.objects[0].x++;const second=f.controller.resolve(f.snapshot());emit(f.dialog,'close');
  assert.equal(f.dialog.open,true);assert.equal(f.accept.disabled,false);f.clickAccept();assert.equal(await second,true);
});

test('cached consent is rejected if fresh inspection reports a changed state or new issue',async()=>{
  const f=fixture(),first=f.controller.resolve(f.snapshot());f.clickAccept();assert.equal(await first,true);
  const stale=f.snapshot();f.content.objects[1].y++;
  assert.equal(await f.controller.resolve(stale),false);assert.equal(f.dialog.shows,1);assert.match(f.failures[0],/geändert/);
});

test('dispose removes only the injected control and resolves a waiting/inspecting continuation as false',async()=>{
  for(const duringInspect of [false,true]){
    const f=fixture();let release;f.inspect=()=>new Promise(resolve=>{release=()=>resolve(f.snapshot());});
    const native=[f.problems,f.fit,f.edit],result=f.controller.resolve(f.snapshot());if(duringInspect)f.clickAccept();
    f.controller.dispose();f.controller.dispose();assert.equal(await result,false);assert.deepEqual(f.dialog.children,native);
    assert.equal(f.dialog.open,false);assert.equal(await f.controller.resolve(f.snapshot()),false);
    release?.();await tick();assert.equal(f.failures.length,0);emit(f.fit,'click');assert.equal(f.fitCalls,1);
  }
});

test('dialog open/close failure never releases a pending native flow',async()=>{
  for(const method of ['showModal','close']){
    const f=fixture();f.dialog[method]=()=>{throw Error('dialog failure');};
    const result=f.controller.resolve(f.snapshot());if(method==='close')f.clickAccept();
    assert.equal(await result,false);assert.equal(f.failures.length,1);f.controller.dispose();
  }
});

test('issue messages are rendered as plain text and controllers do not share consent',async()=>{
  const a=fixture(),b=fixture();a.issues[0].message='<img src=x onerror=alert(1)>';
  const first=a.controller.resolve(a.snapshot());assert.equal(a.problems.children[0].textContent,a.issues[0].message);
  assert.equal(a.problems.children[0].children.length,0);a.clickAccept();assert.equal(await first,true);
  const second=b.controller.resolve(b.snapshot());assert.equal(b.dialog.open,true);emit(b.edit,'click');assert.equal(await second,false);
});

test('repeated warning copy is shown once while every underlying issue remains part of the decision',async()=>{
  const f=fixture();f.issues.push({code:'overlap',ids:['photo','motif'],message:f.issues[0].message});
  const result=f.controller.resolve(f.snapshot());assert.equal(f.problems.children.length,1);
  assert.equal(f.problems.children[0].textContent,f.issues[0].message);
  f.issues[1].ids=['photo','name'];f.clickAccept();assert.equal(await result,false);
  assert.match(f.failures[0],/geändert/);
});

test('distinct overlap and boundary explanations remain visible together',async()=>{
  const f=fixture();f.issues.push({code:'boundary',ids:['name'],message:'Dieses Element ragt über den Rand.'});
  assert.equal(await f.controller.resolve(f.snapshot()),false);
  assert.deepEqual(f.problems.children.map(node=>node.textContent),f.issues.map(issue=>issue.message));
  assert.equal(f.accept.hidden,true);
});

test('acceptance permits only layout continuation; following required/photo/checkout checks still reject',async()=>{
  for(const reason of ['Pflichtfeld fehlt','Foto noch nicht geladen','Warenkorb ist nicht verbunden']){
    const f=fixture(),steps=[];
    const nativeFlow=(async()=>{
      if(!await f.controller.resolve(f.snapshot()))return false;
      steps.push('native validation');throw Error(reason);
    })();
    f.clickAccept();await assert.rejects(nativeFlow,{message:reason});assert.deepEqual(steps,['native validation']);
  }
});
