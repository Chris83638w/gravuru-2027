import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {physicalTextSize,designTextSize,fittingTextSize} from './usability-model.mjs';
import {scaleObject} from './image-processing.mjs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {prepareConfig,validateDesign} from './contract.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {rightForProperty} from './element-rights.mjs';
import {emptyPhotoMarkup,decorateEmptyPhotoSlots,examplePhotoMarkup} from './photo-placeholder.mjs';

// Execute the actual registered handlers from the presentation modules with
// deterministic DOM ports. This covers event routing without claiming browser QA.
const source=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8').replaceAll('\r\n','\n');
const line=(name,marker)=>{const rows=source(name).split('\n').filter(s=>s.includes(marker));assert.equal(rows.length,1,marker+' must identify one UI handler');return rows[0];};
function block(name,start,end){const text=source(name),i=text.indexOf(start);assert(i>=0,start);const j=text.indexOf(end,i);assert(j>=0,end);return text.slice(i,j+end.length);}
const eventTarget=()=>({listeners:{},addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}});
const dispatch=async(target,type,event)=>{for(const fn of target.listeners[type]||[])await fn(event);};
const inertEvent=target=>({target,preventDefault(){},stopImmediatePropagation(){}});
function textEnvironment(){
 const object={id:'name',type:'text',text:'Anna',size:6,x:30,y:20,w:40,h:7},input={id:'ux-size',value:'12',dataset:{},matches(){return false;}},r=eventTarget();
 const noopNode={textContent:'',hidden:false,setAttribute(){},classList:{toggle(){}}};
 const env={r,el:{state:{objects:[object]},sync(){},normalize(){},uxCanEdit:()=>true},config:{},isPrint:true,rightForProperty,
  selected:()=>object,selectable:()=>true,mutate:fn=>fn(),say(){},
  textScale:()=>4/3,displayTextSize:o=>physicalTextSize(o,4/3),designTextSize,
  $:selector=>selector==='#ux-size'?input:selector==='[data-ux-color]'?null:noopNode,
  all:()=>[],fieldSignature:'name'};
 env.el.uxTextScale=env.textScale;env.el.uxDisplayTextSize=env.displayTextSize;
 vm.createContext(env);
 vm.runInContext(line('ux.mjs','function changeObject(key,value)'),env);
 return {env,object,input,r};
}
test('large text: real input, focusout, field refresh and workflow sync all retain 12 mm',async()=>{
 const {env,object,input,r}=textEnvironment();
 vm.runInContext(line('ux.mjs',"const t=e.target,key=t.id==='ux-size'"),env);
 await dispatch(r,'input',inertEvent(input));assert.equal(object.size,9);
 env.el.uxCanEdit=(_object,right)=>right!=='scale';input.value='18';
 await dispatch(r,'input',inertEvent(input));assert.equal(object.size,9,'denied scale right must reject the actual input handler');
 env.el.uxCanEdit=()=>true;
 vm.runInContext(line('ux.mjs',"if(e.target.dataset.uxText)delete"),env);
  input.value='stale';await dispatch(r,'focusout',inertEvent(input));assert.equal(Number(input.value),12);
  env.profile={designs:[{id:'test-design',customerFields:[{id:'name',label:'Namen'}]}]};
  env.el.state.designId='test-design';
  vm.runInContext(line('ux.mjs','const esc=value=>'),env);
  vm.runInContext(line('ux.mjs','const fieldLabel='),env);
  const fields=block('ux.mjs','  function updateFields(){','\n  }\n  function renderFontPage').replace('\n  function renderFontPage','');
  vm.runInContext(fields,env);input.value='stale';vm.runInContext('updateFields()',env);assert.equal(Number(input.value),12);
  assert.match(env.$('.ux-fields').innerHTML,/aria-label="Namen"/);
 Object.assign(env,{changing:false,known:new Set(['name']),rename(){},guides(){}});
 vm.runInContext(line('workflow.mjs','const sync=el.sync;el.sync=function'),env);
 input.value='stale';env.el.sync();assert.equal(Number(input.value),12);
});
test('large text: actual +/- click handlers operate in physical mm',async()=>{
 const {env,object,r}=textEnvironment();object.size=9;
 const clicks=block('ux.mjs',"  r.addEventListener('click',async e=>{","\n  });");
 vm.runInContext(clicks,env);
 for(const [action,expected] of [['smaller',11],['bigger',12]]){
  const button={dataset:{ux:action},disabled:false},target={closest:selector=>selector==='[data-ux]'?button:null};
  await dispatch(r,'click',inertEvent(target));assert.equal(physicalTextSize(object,4/3),expected);
 }
});
test('large text: layer size input uses the same mm conversion and size changes invalidate fit cache',async()=>{
 const {env,object,r}=textEnvironment();
 vm.runInContext(line('ux.mjs',"const t=e.target,key=t.id==='ux-size'"),env);
 await dispatch(r,'input',inertEvent({id:'layer-size',dataset:{uxContentProp:'size'},value:'12'}));assert.equal(object.size,9);
 vm.runInContext(line('workflow.mjs','const fitted=new Map(),signature='),env);
 const before=vm.runInContext('signature(selected())',env);env.el.uxTextScale=()=>1;
 assert.notEqual(vm.runInContext('signature(selected())',env),before);
});
test('large text: pointer, handle keyboard and toolbar shrink never enlarge a 4-mm text',async()=>{
 for(const route of ['pointer','keyboard','toolbar']){
  const {env,object,r}=textEnvironment();object.size=3;Object.assign(env,{scaleObject,resize:null});
  if(route==='pointer'){
   env.resize={id:1,start:{x:object.x+2,y:object.y},object:{...object},kind:'scale',moved:false};env.el.point=()=>({x:object.x+1,y:object.y});env.el.render=()=>{};
   vm.runInContext(block('refinements.mjs',"  r.addEventListener('pointermove',","\n  },true);"),env);
   await dispatch(r,'pointermove',{...inertEvent({}),pointerId:1});
  }else if(route==='keyboard'){
   vm.runInContext(line('refinements.mjs',"r.addEventListener('keydown',e=>{const h="),env);
   await dispatch(r,'keydown',{...inertEvent({closest:()=>({dataset:{uxHandle:'scale'}})}),key:'ArrowDown'});
  }else{
   vm.runInContext(block('refinements.mjs',"  r.addEventListener('click',async e=>{const key=","\n  });"),env);
   await dispatch(r,'click',inertEvent({closest:()=>({dataset:{ux:'object-smaller'}})}));
  }
  assert.equal(object.size,3,route);assert.equal(physicalTextSize(object,4/3),4,route);
 }
});
test('large text: actual fit action reaches physical 4 mm and reports that value',async()=>{
 const {env,object,r}=textEnvironment();object.size=4;object.x=22.5;object.y=10;
 let message='';Object.assign(env,{fittingTextSize,textBounds:()=>({x:-30,y:-5,width:60,height:10}),surface:()=>({x:0,y:0,width:45,height:20}),say:value=>{message=value;}});
 vm.runInContext(block('usability.mjs',"  r.addEventListener('click',e=>{const b=e.target.closest('[data-ux=fit-text]')","\n  });"),env);
 await dispatch(r,'click',inertEvent({closest:()=>({dataset:{id:object.id}})}));
 assert.equal(object.size,3);assert.equal(message,'Text auf 4 mm angepasst.');
});
test('fixed acrylic photo: actual editor apply keeps shape/geometry and remains contract-valid',async()=>{
 const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
 for(const o of config.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
 prepareConfig(config);
 const design=structuredClone(config.profile.designs[0]),object=design.objects.find(o=>o.id==='photo-main'),before=structuredClone(object),d=eventTarget(),files=new Map();
 let closed=false;d.close=()=>{closed=true;};
 const env={d,angle:0,flip:1,el:{uxCanEdit:()=>true},objectId:object.id,selected:()=>object,files,source:{file:{name:'test.png'},url:'blob:original'},canvas:{width:1200,height:1200,toBlob:callback=>callback({})},options:()=>({shape:'circle'}),mutate:fn=>fn(),say(){},crypto:{randomUUID:()=> 'new-image'},URL:{createObjectURL:()=> 'blob:edited'},$:()=>({textContent:''})};
 vm.runInNewContext(block('photo-editor.mjs',"  d.addEventListener('click',async e=>{","\n  });"),env);
 const button={dataset:{ux:'photo-apply'},disabled:false};
 await dispatch(d,'click',inertEvent({closest:()=>button}));
 assert(closed);assert.equal(object.uxUploadId,'new-image');
 for(const key of ['x','y','w','h','photoShape','rotation'])assert.equal(object[key],before[key],key);
 assert.doesNotThrow(()=>validateDesign(config,design,{},resources.fonts,resources.motifs));
 const accepted=structuredClone(object),assetCount=files.size;closed=false;env.el.uxCanEdit=(_object,right)=>right!=='replace';
 env.canvas.toBlob=()=>assert.fail('denied replacement must not generate an edited image');
 await dispatch(d,'click',inertEvent({closest:()=>button}));
 assert.equal(closed,false);assert.deepEqual(object,accepted);assert.equal(files.size,assetCount);
});
test('non-replaceable photo retains its artwork and is not redecorated as an unnamed upload button',()=>{
 const object={id:'photo-main',type:'photoSlot',x:75,y:60,w:100,h:90},el={uxCanEdit:()=>false};
 const env={el,config:{},files:new Map(),ROOT:'/acrylic-assets/',rawSVG:()=>undefined};
 vm.runInNewContext(block('acrylic-scene.mjs',' el.uxObjectSVG=function(o){','\n };'),env);
 const locked=el.uxObjectSVG(object);
 assert.match(locked,/reference\.png/);assert.match(locked,/aria-hidden="true"/);assert.match(locked,/tabindex="-1"/);
 assert.doesNotMatch(locked,/role="button"|data-preview-only|eigenes Foto hochladen/);
 const group={querySelector:()=>({}),hasAttribute:name=>name==='data-ux-static-photo',get children(){assert.fail('static artwork must never be removed by the placeholder decorator');}};
 vm.runInNewContext('('+decorateEmptyPhotoSlots.toString()+')(root,[object],"#000000","#ffffff")',{root:{querySelector:()=>group},object,CSS:{escape:value=>value},emptyPhotoMarkup});
 el.state={designId:'example-design'};env.config.localResources={photoExamples:[{designId:'example-design',slotId:'photo-main',assetId:'a'.repeat(64)}]};
 const replaced=el.uxObjectSVG(object);assert.match(replaced,/design-assets\/a{64}\/preview\.svg/);assert.match(replaced,/data-ux-static-photo/);assert.doesNotMatch(replaced,/role="button"/);
 el.uxCanEdit=()=>true;const editable=el.uxObjectSVG(object);
 assert.match(editable,/role="button"/);assert.match(editable,/aria-label="Eigenes Foto hochladen"/);assert.match(editable,/data-preview-only/);
 env.config.photo={hints:[{designId:'example-design',slotId:'photo-main',text:'Foto <hier> & jetzt',enabled:true}]};
 assert.match(el.uxObjectSVG(object),/Foto &lt;hier&gt; &amp; jetzt/);
 env.config.photo.hints[0].enabled=false;assert.doesNotMatch(el.uxObjectSVG(object),/Beispielfoto ersetzen|Foto &lt;/);
});

test('imported acrylic photo: actual upload handler replaces semantic slot twice without appending an object',async()=>{
 const {uploadTarget}=await import('./ux-model.mjs');
 const slot={id:'customer-photo-main',fieldKey:'photo-main',type:'photoSlot',photoShape:'arch',w:120,h:140,acrylicFixed:true};
 const objects=[slot],files=new Map();let count=0;
 const env={config:{acrylic:{},photo:{enabled:true}},el:{state:{objects,selected:null},uxCanEdit:()=>true,normalize(){},sync(){}},uploadTarget,
 uploadAllowed:()=>true,photoAvailableForDesign:()=>true,validateUpload(){},files,mutate:fn=>fn(),say(){},showTab(){},requestAnimationFrame(){},uploadKind:'photo',replacing:null,uploadPending:false,
 URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},crypto:{randomUUID:()=>String(++count)},Image:class{naturalWidth=900;naturalHeight=1200;async decode(){}},all:()=>[]};
 vm.createContext(env);vm.runInContext(block('ux.mjs','  async function acceptFiles(','\n  }\n  r.addEventListener').replace('\n  r.addEventListener',''),env);
 await vm.runInContext('acceptFiles([{}],"photo",null)',env);const first=slot.uxUploadId;
 await vm.runInContext('acceptFiles([{}],"photo","customer-photo-main")',env);
 assert.equal(objects.length,1);assert.notEqual(slot.uxUploadId,first);assert.equal(slot.photoShape,'arch');assert.equal(slot.w,120);
});

test('example photo shows upload hint only in preview markup with the original arch mask',()=>{
 const markup=examplePhotoMarkup({id:'customer-photo',w:129,h:139,photoShape:'arch'},'a'.repeat(64));
 assert.match(markup,/data-preview-only="true"/);assert.match(markup,/eigenes Foto hochladen/);
 assert.match(markup,/<clipPath[^>]*><path d="M/);assert.match(markup,/\/api\/workshop\/design-assets\/[a-f0-9]{64}\/preview.svg/);
 assert.equal(examplePhotoMarkup({w:10,h:10},'https://foreign.invalid/photo'),'');
});

test('customer size entry rounds mm without changing the plate or other text properties',async()=>{
 const {env,object,input,r}=textEnvironment();env.el.state.width=150;env.el.state.height=200;
 vm.runInContext(line('ux.mjs',"const t=e.target,key=t.id==='ux-size'"),env);
 input.value='8.7';await dispatch(r,'input',inertEvent(input));
 assert.equal(object.size,9/(4/3));assert.equal(physicalTextSize(object,4/3),9);
 assert.deepEqual([env.el.state.width,env.el.state.height,object.text,object.x,object.y],[150,200,'Anna',30,20]);
});
