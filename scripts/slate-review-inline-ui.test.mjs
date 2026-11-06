import test from 'node:test';
import assert from 'node:assert/strict';
import {changedPositions, translatedObjectMatrix, latestPreviewUrl, installInlineReview} from './lib/slate-review-inline-ui.js';

const original = [
  {id: 'text', type: 'text', x: 75.25, y: 33.125, w: 40, h: 10, movable: true},
  {id: 'photo', type: 'photoSlot', x: 100, y: 80, w: 50, h: 60, movable: true},
  {id: 'technical', x: 0, y: 0, movable: false},
];
test('movement sends only changed native positions and preserves exact millimetres', () => {
  const current = structuredClone(original); current[0].x += .875; current[1].y -= 4.125;
  assert.deepEqual(changedPositions(original, current), [{objectId: 'text', x: 76.125, y: 33.125}, {objectId: 'photo', x: 100, y: 75.875}]);
  assert.equal(original[0].x, 75.25); assert.equal(original[1].y, 80);
  assert.deepEqual(changedPositions(original, structuredClone(original)), []);
});
test('technical objects and objects absent from the server snapshot cannot enter a position patch', () => {
  const current = structuredClone(original); current[2].x = 50;
  current.push({id: 'new', x: 10, y: 10, movable: true});
  assert.deepEqual(changedPositions(original, current), []);
});
test('moving an already rotated and scaled native SVG retains its original linear transform', () => {
  const matrix = {a: 0, b: 2, c: -3, d: 0, e: 50.5, f: 70};
  const object = {x: 80, y: 60};
  assert.deepEqual(translatedObjectMatrix(matrix, object, {x: 84.125, y: 58.75}), {a: 0, b: 2, c: -3, d: 0, e: 54.625, f: 68.75});
  assert.deepEqual(matrix, {a: 0, b: 2, c: -3, d: 0, e: 50.5, f: 70});
});
test('repeated drags are based on the original SVG, without accumulating transform drift', () => {
  const matrix = {a: 1, b: 0, c: 0, d: 1, e: 75.25, f: 33.125}, before = original[0];
  const moved = {...before, x: before.x + 4, y: before.y - 2};
  assert.equal(translatedObjectMatrix(matrix, before, moved).e, 79.25);
  assert.deepEqual(translatedObjectMatrix(matrix, before, before), matrix);
  assert.deepEqual(changedPositions(original, original.map(object => ({...object}))), []);
});
test('saved gallery images keep the exact design but follow later workshop revisions', () => {
  assert.equal(latestPreviewUrl('/api/workshop/products/cfg_a/preview.svg?designId=katalog-D1&revision=2', 'https://review.example/originale/'),
    'https://review.example/api/workshop/products/cfg_a/preview.svg?designId=katalog-D1');
});

test('visible quick-start and nudge controls save exact native millimetres and retain dirty and busy guards',async t=>{
  const names=['document','window','location','fetch','ResizeObserver'];
  const previous=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  const eventNode=extra=>{const listeners=new Map();return {...extra,dataset:extra?.dataset||{},addEventListener(type,fn){listeners.set(type,fn);},emit(type,event={}){return listeners.get(type)?.(event);},replaceChildren(...children){this.children=children;},append(node){(this.children||=[]).push(node);}};};
  const nodes=Object.fromEntries(['open','start','save','reset','close','reload','element','controls','status'].map(name=>['[data-inline-'+name+']',eventNode({})]));
  nodes['[data-preview]']={};
  const nudges=['left','right','up','down'].map(inlineNudge=>eventNode({dataset:{inlineNudge}}));
  const svg={localName:'svg',getScreenCTM:()=>null};
  const objects=original.map(object=>({dataset:{object:object.id},transform:{baseVal:{consolidate:()=>({matrix:{a:1,b:0,c:0,d:1,e:0,f:0}})}},getScreenCTM:()=>null,setAttribute(name,value){(this.attributes||={})[name]=value;}}));
  const stage=eventNode({hidden:true,focusCalls:0,focus(){this.focusCalls++;},querySelectorAll:()=>objects,querySelector:selector=>selector==='svg'?svg:null});
  nodes['[data-inline-stage]']=stage;
  const classes=new Set(),card={dataset:{productId:'cfg_exact',designId:'katalog-exact'},
    querySelector:key=>nodes[key],querySelectorAll:key=>key==='[data-inline-nudge]'?nudges:[],
    classList:{add:key=>classes.add(key),remove:(...keys)=>keys.forEach(key=>classes.delete(key)),toggle:(key,value)=>value?classes.add(key):classes.delete(key)},
    setAttribute(key,value){this[key]=value;},removeAttribute(key){delete this[key];}};
  globalThis.document={querySelector:()=>({content:'synthetic-token'}),createElement:tag=>tag==='template'?{content:{firstElementChild:svg}}:{}};
  globalThis.window={addEventListener(){},confirm:()=>false};globalThis.location={href:'https://review.example/originale/'};
  globalThis.ResizeObserver=class{observe(){}};
  const record={productId:'cfg_exact',designId:'katalog-exact',revision:1,reviewFingerprint:'a'.repeat(64),svg:'<svg/>',objects:structuredClone(original)};
  const requests=[],saved=[];let completeSave;
  globalThis.fetch=async(url,options)=>{
    requests.push({url,...options});
    if(options.method==='PATCH')return new Promise(resolve=>{completeSave=resolve;});
    return {ok:true,json:async()=>record};
  };
  const api=installInlineReview({cards:[card],onSaved:(_card,result)=>saved.push(result.revision)});
  nodes['[data-inline-start]'].emit('click');assert.equal(nodes['[data-inline-start]'].disabled,true);
  await new Promise(setImmediate);
  assert.equal(new URL(requests[0].url,location.href).searchParams.get('productId'),'cfg_exact');
  assert.equal(new URL(requests[0].url,location.href).searchParams.get('designId'),'katalog-exact');
  assert.equal(classes.has('inline-active'),true);assert.equal(objects[0].dataset.inlineMovable,'true');
  assert.equal(objects[2].dataset.inlineMovable,undefined);
  nudges.find(button=>button.dataset.inlineNudge==='right').emit('click');
  nudges.find(button=>button.dataset.inlineNudge==='up').emit('click');
  assert.equal(stage.focusCalls,2);assert.equal(api.hasUnsavedChanges(),true);assert.equal(api.keepVisible(card),true);
  assert.equal(api.beforeFormatChange(card),false,'declined discard retains the exact active target');
  nodes['[data-inline-save]'].emit('click');
  assert.ok(nudges.every(button=>button.disabled));
  nudges.find(button=>button.dataset.inlineNudge==='right').emit('click');
  const patch=requests.find(request=>request.method==='PATCH');
  assert.deepEqual(JSON.parse(patch.body),{productId:'cfg_exact',designId:'katalog-exact',expectedRevision:1,positions:[{objectId:'text',x:76.25,y:32.125}]});
  assert.equal(api.beforeFormatChange(card),false,'in-flight save cannot discard the active session');
  const updated={...record,revision:2,objects:record.objects.map(object=>object.id==='text'?{...object,x:76.25,y:32.125}:object),previewUrl:'/api/workshop/products/cfg_exact/preview.svg?designId=katalog-exact&revision=2'};
  completeSave({ok:true,json:async()=>updated});await new Promise(setImmediate);
  assert.deepEqual(saved,[2]);assert.equal(api.hasUnsavedChanges(),false);assert.equal(api.keepVisible(card),false);
  assert.equal(card.dataset.inlineRevision,'2');assert.equal(nodes['[data-inline-save]'].disabled,true);
  assert.equal(nodes['[data-preview]'].src,'https://review.example/api/workshop/products/cfg_exact/preview.svg?designId=katalog-exact');
});
