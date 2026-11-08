import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fitText} from './workflow-model.mjs';
import {clampToAcrylic} from './edge-clamp.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/text-paths.mjs';
import {textOutlineBounds} from '../../platform/sources/app/shared/models/text-outline-fit.mjs';

// Run the native normalization wrapper. Only the status node and SVG bounds
// port are supplied; fitting and font outlines use the production functions.
const source=fs.readFileSync(new URL('./workflow.mjs',import.meta.url),'utf8');
const normalization=source.slice(source.indexOf(' const fitted=new Map()'),source.indexOf(" r.addEventListener('input',e=>"));
const retry='Text konnte noch nicht automatisch eingepasst werden. Bitte Position prüfen.';
const makeFace=()=>({units:1000,glyphs:{A:{a:500,d:'M0 0L500 0L500 700L0 700Z'}}});
const text=(id='name',extra={})=>({id,type:'text',text:'AAAA',font:id,size:10,w:20,h:12,x:50,y:50,rotation:0,...extra});
function fixture(objects=[text()]) {
  const status={textContent:''},messages=[],failMeasurements=new Set();
  const el={fontData:{},state:{designId:'original',objects},uxCanEdit:()=>true,uxTextScale:()=>1,uxMinTextMm:4,
    normalize(){for(const object of this.state.objects)try{measureText(object,this.fontData);}catch{}}};
  const bounds=object=>{
    if(failMeasurements.has(object.id))throw Error('Temporary empty SVG bounds');
    if(!el.fontData[object.font]?.regular)throw Error('Font not available');
    const box=textOutlineBounds(object,el.fontData);
    if(!box)throw Error('Font not available');
    return {x:box.left,y:box.top,width:box.right-box.left,height:box.bottom-box.top};
  };
  const env={el,config:{},bounds,textSurface:()=>({shape:'rect',width:220,height:140}),chosenProfile:()=>({}),
    fitText,clampToAcrylic,measureText,setTextSize,say:message=>{messages.push(message);status.textContent=message;},
    $:selector=>selector==='[data-ux-status]'?status:null};
  vm.runInNewContext(normalization,env);
  return {el,status,messages,failMeasurements,load:id=>el.fontData[id]={regular:makeFace()}};
}

test('a transient font warning disappears after successful native retry, without editing the design',()=>{
  const f=fixture(),before=structuredClone(f.el.state);
  f.el.normalize();assert.equal(f.status.textContent,retry);
  f.load('name');f.el.normalize();
  assert.equal(f.status.textContent,'');assert.deepEqual(f.el.state,before);
});

test('an empty SVG measurement also recovers without a text or size edit',()=>{
  const f=fixture();f.load('name');f.failMeasurements.add('name');
  f.el.normalize();assert.equal(f.status.textContent,retry);
  f.failMeasurements.clear();f.el.normalize();assert.equal(f.status.textContent,'');
});

test('all affected texts must recover before the own warning is cleared',()=>{
  const f=fixture([text('name'),text('dates',{y:75})]);f.el.normalize();
  f.load('dates');f.el.normalize();assert.equal(f.status.textContent,retry);
  f.load('name');f.el.normalize();assert.equal(f.status.textContent,'');
});

test('recovery never removes a newer warning from another feature',()=>{
  const f=fixture();f.el.normalize();f.status.textContent='Dieses Foto konnte nicht geladen werden.';
  f.load('name');f.el.normalize();assert.equal(f.status.textContent,'Dieses Foto konnte nicht geladen werden.');
});

test('a matching message not emitted by this normalization is not owned or cleared',()=>{
  const f=fixture();f.load('name');f.status.textContent=retry;
  f.el.normalize();assert.equal(f.status.textContent,retry);
});

test('real fit failure remains visible and retains its native overflow marker',()=>{
  const f=fixture([text('name',{x:-100})]);f.el.normalize();f.load('name');f.el.normalize();
  assert.match(f.status.textContent,/Text zu lang:/);assert.equal(f.el.state.objects[0].uxTextOverflow,'length');
  f.el.normalize();assert.match(f.status.textContent,/Text zu lang:/);
});

test('a second text recovering cannot hide a simultaneous real overflow',()=>{
  const f=fixture([text('name',{x:-100}),text('dates')]);f.load('name');f.el.normalize();
  assert.equal(f.status.textContent,retry);assert.equal(f.el.state.objects[0].uxTextOverflow,'length');
  f.load('dates');f.el.normalize();assert.equal(f.status.textContent,retry);
  assert.equal(f.el.state.objects[0].uxTextOverflow,'length');
});

test('a legitimate successful autofit message is preserved',()=>{
  const f=fixture([text('name',{x:5})]);f.el.normalize();f.load('name');f.el.normalize();
  assert.match(f.status.textContent,/Text automatisch auf/);assert.ok(f.el.state.objects[0].size<10);
});

test('removing a failed text resolves only its own pending warning',()=>{
  const f=fixture();f.el.normalize();f.el.state.objects=[];f.el.normalize();assert.equal(f.status.textContent,'');
});

test('a restored already-fitted font can clear the retry warning through the native fit cache',()=>{
  const f=fixture();f.load('name');const family=f.el.fontData.name;f.el.normalize();
  delete f.el.fontData.name;f.el.normalize();assert.equal(f.status.textContent,retry);
  f.el.fontData.name=family;f.el.normalize();assert.equal(f.status.textContent,'');
});
