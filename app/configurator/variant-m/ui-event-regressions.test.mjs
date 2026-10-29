import {customerFieldLabel} from './text-fields.mjs';
import {alignmentContent,alignmentLabel} from './ui-icons.mjs';
import {selectionScaleFactor} from './selection-arrows.mjs';
import {previewResourceURL} from './preview-resource.mjs';
import test from 'node:test';
import {fontDisplayName} from './font-display.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {objectSurface} from './surfaces.mjs';
import {physicalTextSize,designTextSize,fittingTextSize} from './usability-model.mjs';
import {scaleObject} from './image-processing.mjs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {prepareConfig,validateDesign} from './contract.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {rightForProperty} from './element-rights.mjs';
import {emptyPhotoMarkup,decorateEmptyPhotoSlots,examplePhotoMarkup} from './photo-placeholder.mjs';
import {textLimits,textLimitIssue,textLength,textLimitCount,sameSampleText,clampText} from '../../workshop/theme-limits.mjs';

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
 // K10: colorTool/minTextMm sind die Closure-Werte des Verfahrensprofils in installUX (Druck: Farbwahl, 4 mm).
 const env={r,el:{state:{objects:[object]},sync(){},normalize(){},uxCanEdit:()=>true},config:{},isPrint:true,colorTool:true,minTextMm:4,rightForProperty,
  selected:()=>object,selectable:()=>true,mutate:fn=>fn(),say(){},
  textScale:()=>4/3,displayTextSize:o=>physicalTextSize(o,4/3),designTextSize,setTextSize,
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
  env.el.state.designId='test-design';env.chosenProfile=()=>env.profile;
  vm.runInContext(line('ux.mjs','const esc=value=>'),env);
  vm.runInContext(line('ux.mjs','const fieldLabel='),env);
  // K1: Limits und Feldhinweise aus dem echten Modul, Vorlage mit Pflichtfeld und Thema.
  Object.assign(env,{textLimits,textLimitIssue,textLength,textLimitCount,sameSampleText,fontDisplayName,customerFieldLabel,touchedText:new Set(),textValidationAttempted:false,textControls:{closest:()=>null},design:()=>env.profile.designs[0]});
  env.profile.designs[0].themes=['namensschilder'];env.profile.designs[0].objects=[{id:'name',type:'text',text:'Anna',required:true}];
  for(const marker of ['const templateText=','const limitsFor=','const textIndex='])vm.runInContext(line('ux.mjs',marker),env);
  vm.runInContext(block('ux.mjs','  function textFieldIssue(o){','\n  }'),env);
  vm.runInContext(block('ux.mjs','  function textIssues(){','\n  }'),env);
  const issues=()=>JSON.parse(JSON.stringify(vm.runInContext('textIssues()',env)));
  const fields=block('ux.mjs','  function updateFields(){','\n  }\n  function renderFontPage').replace('\n  function renderFontPage','');
  vm.runInContext(fields,env);input.value='stale';vm.runInContext('updateFields()',env);assert.equal(Number(input.value),12);
  assert.match(env.$('.ux-fields').innerHTML,/aria-label="Namen"/);
  assert.match(env.$('.ux-fields').innerHTML,/maxlength="32"/);assert.match(env.$('.ux-fields').innerHTML,/aria-required="true"/);assert.match(env.$('.ux-fields').innerHTML,/data-ux-text-count="name"/);
  assert.deepEqual(issues(),[{id:'name',message:'Namen: Pflichtfeld: Bitte den Beispieltext durch deinen eigenen ersetzen.'}]);
  object.text='Lena';assert.deepEqual(issues(),[]);
  object.text='L'.repeat(33);assert.deepEqual(issues(),[{id:'name',message:'Namen: Text zu lang: höchstens 32 Zeichen.'}]);
  object.text='Lena\nMax\nTom';assert.deepEqual(issues(),[{id:'name',message:'Namen: Höchstens 2 Zeilen.'}]);
  object.text='Lena';object.uxTextOverflow='length';assert.match(issues()[0].message,/Text zu lang: Passt auch in der Mindestgröße/);delete object.uxTextOverflow;
  object.uxHidden=true;assert.deepEqual(issues(),[{id:'name',message:'Pflichtfeld „Namen“ fehlt. Bitte einblenden und ausfüllen.'}]);delete object.uxHidden;
 Object.assign(env,{changing:false,known:new Set(['name']),rename(){},guides(){},arrangeGallery(){}});
 vm.runInContext(line('workflow.mjs','const sync=el.sync;el.sync=function'),env);
 input.value='stale';env.el.sync();assert.equal(Number(input.value),12);
});
test('K1: actual text input handler keeps 32 chars / 2 lines and the direct editor clamps alike',async()=>{
 const {env,object,r}=textEnvironment();
 Object.assign(env,{textLimits,textLimitIssue,textLength,sameSampleText,clampText,dirty:false,updatePrice(){},design:()=>env.profile.designs[0],profile:{designs:[{id:'d',themes:['namensschilder'],objects:[{id:'name',type:'text',text:'Anna'}]}]}});
 env.el.state.designId='d';env.el.record=()=>{};const said=[];env.say=m=>said.push(m);
 for(const marker of ['const templateText=','const limitsFor='])vm.runInContext(line('ux.mjs',marker),env);
 vm.runInContext(block('ux.mjs',"  r.addEventListener('input',e=>{const t=e.target;if(t.dataset.uxText){","updatePrice();});"),env);
 vm.runInContext(line('ux.mjs',"r.addEventListener('keydown',e=>{const t=e.target;if(!t.dataset?.uxText||e.key!=='Enter')return;"),env);
 const field={value:'A'.repeat(40),selectionStart:40,dataset:{uxText:'name'},matches(){return false;},setSelectionRange(a){this.selectionStart=a;}};
 await dispatch(r,'input',inertEvent(field));assert.equal(object.text.length,32);assert.equal(field.value.length,32);assert.equal(said.at(-1),'Höchstens 32 Zeichen.');
 field.value='A\nB\nC';await dispatch(r,'input',inertEvent(field));assert.equal(object.text,'A'.repeat(32));assert.equal(field.value,'A'.repeat(32));assert.equal(said.at(-1),'Höchstens 2 Zeilen.');
 field.value='Anna\nLena';await dispatch(r,'input',inertEvent(field));assert.equal(object.text,'Anna\nLena');
 let prevented=0;await dispatch(r,'keydown',{target:field,key:'Enter',preventDefault(){prevented++;}});assert.equal(prevented,1);
 field.value='Anna';await dispatch(r,'keydown',{target:field,key:'Enter',preventDefault(){prevented++;}});assert.equal(prevented,1);
 // Direkte Bearbeitung im Design nutzt dieselben Limits über el.uxTextLimits.
 assert.match(source('direct-editing.mjs'),/clampText\(field\.value,limits,o\.text\)/);assert.match(source('direct-editing.mjs'),/field\.maxLength=limits\.maxLength/);
 assert.match(source('commerce.mjs'),/el\.uxTextIssues/);assert.match(source('workflow.mjs'),/uxTextOverflow='length'/);
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
  const {env,object,r}=textEnvironment();object.size=3;Object.assign(env,{scaleObject,selectionScaleFactor,resize:null});
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
 let message='';Object.assign(env,{objectSurface,fittingTextSize,textBounds:()=>({x:-30,y:-5,width:60,height:10}),surface:()=>({x:0,y:0,width:45,height:20}),say:value=>{message=value;}});
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
 const env={productionImage:()=>({canvas:env.canvas,limited:false}),d,inputColor:'original',angle:0,flip:1,el:{uxCanEdit:()=>true},objectId:object.id,selected:()=>object,files,source:{file:{name:'test.png'},url:'blob:original'},canvas:{width:1200,height:1200,toBlob:callback=>callback({})},options:()=>({shape:'circle'}),mutate:fn=>fn(),say(){},crypto:{randomUUID:()=> 'new-image'},URL:{createObjectURL:()=> 'blob:edited'},$:()=>({textContent:''})};
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
 const env={el,config:{},files:new Map(),ROOT:'/acrylic-assets/',rawSVG:()=>undefined,previewResourceURL};
 vm.runInNewContext(block('acrylic-scene.mjs',' el.uxObjectSVG=function(o){','\n };'),env);
 const locked=el.uxObjectSVG(object);
 assert.match(locked,/reference\.webp/);assert.match(locked,/aria-hidden="true"/);assert.match(locked,/tabindex="-1"/);
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
 assert.match(markup,/data-preview-only="true"/);assert.match(markup.replace(/<[^>]*>/g,''),/eigenes Foto hochladen/);
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

test('photo apply rejects an oversized edited PNG before changing the object or media',async()=>{
 const object={id:'photo',type:'photoSlot',uxUploadId:'original',w:100,h:100},before=structuredClone(object),files=new Map(),d=eventTarget(),status={textContent:''};let closed=false;
 d.close=()=>{closed=true;};const env={d,objectId:object.id,selected:()=>object,el:{uxCanEdit:()=>true},files,productionImage:()=>({canvas:{toBlob:cb=>cb({size:15*1024*1024+1})}}),$:()=>status};
 vm.runInNewContext(block('photo-editor.mjs',"  d.addEventListener('click',async e=>{","\n  });"),env);
 const button={dataset:{ux:'photo-apply'},disabled:false};await dispatch(d,'click',inertEvent({closest:()=>button}));
 assert.deepEqual(object,before);assert.equal(files.size,0);assert.equal(closed,false);assert.equal(button.disabled,false);assert.match(status.textContent,/15 MB/);
});

test('K10 / Ü1.2: changeObject refuses colour when the process profile has no colour tool and clamps size to the profile minimum',async()=>{
 const {env,object,input,r}=textEnvironment();
 vm.runInContext(line('ux.mjs',"const t=e.target,key=t.id==='ux-size'"),env);
 vm.runInContext(block('ux.mjs',"  r.addEventListener('change',async e=>{const t=e.target;","\n  },true);"),env);
 const said=[];env.say=m=>said.push(m);
 // Druckprofil (colorTool): Farbe wird gesetzt (applyPrintColor nur für Druckprodukte, hier isPrint=true).
 env.applyPrintColor=(o,v)=>{o.color=v;};
 vm.runInContext("changeObject('color','#c93232')",env);assert.equal(object.color,'#c93232');
 // Gravurprofil: kein Farbwerkzeug – der Handler lehnt ab, das Objekt bleibt unverändert.
 env.colorTool=false;env.isPrint=false;vm.runInContext("changeObject('color','#123456')",env);
 assert.equal(object.color,'#c93232');assert.deepEqual(said,['Bei diesem Verfahren gibt es keine Farbwahl.']);
 const colorInput={value:'#000000',dataset:{},matches:s=>s==="[data-ux-color],[data-ux-content-color]"};
 await dispatch(r,'change',inertEvent(colorInput));assert.equal(object.color,'#c93232','change-Handler ohne Farbwerkzeug ändert nichts');
 // Mindestgröße aus dem Profil: Druck 3 mm wird angenommen, Gravur 4 mm hebt an.
 env.minTextMm=3;input.value='3';await dispatch(r,'input',inertEvent(input));assert.equal(Math.round(object.size*4/3*100)/100,3);
 env.minTextMm=4;input.value='3';await dispatch(r,'input',inertEvent(input));assert.equal(Math.round(object.size*4/3*100)/100,4);
});
test('K10 / Ü1.2: engraving products build the text panel without a colour picker, print without a free picker when the palette is fixed; photo tool follows tools.photo',()=>{
 // Die Markup-Zeilen aus ux.mjs, mit den Closure-Werten des Verfahrensprofils ausgewertet.
 const markup=block('ux.mjs',"  $('#ux-panel-text').innerHTML=","mitgefertigt.</p></div>`;");
 const render=(freeColor,minTextMm)=>{const env={freeColor,minTextMm,alignmentContent,alignmentLabel,icons:{},button:(k,l,extra='')=>`<button data-ux="${k}" ${extra}>${l}</button>`,config:null,out:''};vm.createContext(env);vm.runInContext(markup.replace("$('#ux-panel-text').innerHTML=",'out='),env);return env.out;};
 assert.doesNotMatch(render(false,4),/data-ux-color/);assert.match(render(true,3),/data-ux-color/);
 assert.match(render(false,4),/id="ux-size" type="number" min="4"/);assert.match(render(true,3),/min="3"/);
 const photoLine=line('ux.mjs','const photoEnabled=config?config.photo.enabled&&process.tools.photo!==false:true');
 const photo=(enabled,tool)=>{const env={config:{photo:{enabled},logo:{enabled:true}},process:{tools:{photo:tool}}};vm.createContext(env);vm.runInContext(photoLine,env);return vm.runInContext('photoEnabled',env);};
 assert.equal(photo(true,true),true);assert.equal(photo(true,false),false);assert.equal(photo(false,true),false);
});
// Chris 22./23.10.2026: Ein neues Element bekommt immer einen freien Platz. Die echte place()-Funktion aus workflow.mjs:
// Gestaltungsfläche innerhalb des Randes, Verkleinerung bis zur Mindestgröße (Text 3 mm, Motiv 10 mm), sonst mittig + Hinweis.
test('Neues Element: freier Platz in Originalgröße, sonst verkleinert bis zur Mindestgröße, sonst mittig mit Hinweis',async()=>{
 const {freePlacement,NO_FREE_SPACE_MESSAGE}=await import('./workflow-model.mjs');
 const {MOTIF_MIN_MM}=await import('./motif-placement.mjs');
 const {designArea}=await import('./design-area.mjs');
 const geometry={width:90,height:60,shape:'rect',cornerRadiusMm:0,safeMarginMm:2,holes:[]};
 const make=objects=>{
  const said=[],motifCalls=[];
  const env={config:{profile:{geometry}},profile:{geometry},el:{state:{objects,selected:null},uxMinTextMm:3,uxTextScale:()=>1},say:m=>said.push(m),designArea,freePlacement,NO_FREE_SPACE_MESSAGE,MOTIF_MIN_MM,setTextSize,
   surface:()=>({x:0,y:0,width:90,height:60,shape:'rect'}),obstacles:()=>[],api:{},placementJob:Promise.resolve(),placeNewMotif:(_api,o,opts)=>{motifCalls.push({id:o.id,...opts});return Promise.resolve();}};
  vm.createContext(env);
  for(const marker of ['const physicalScale=','function placementSurface(){','function shrinkTo(o,scale){'])vm.runInContext(line('workflow.mjs',marker),env);
  vm.runInContext(block('workflow.mjs',' function placementMinScale(o){','\n }'),env);
  vm.runInContext(block('workflow.mjs',' function place(o){','\n }'),env);
  return {env,said,motifCalls,place:o=>vm.runInContext('place',env)(o)};
 };
 // Gestaltungsfläche = Rand 2 mm: 86 × 56 mm.
 const {env:e0}=make([]);assert.deepEqual(structuredClone(vm.runInContext('placementSurface()',e0)),{x:2,y:2,width:86,height:56,shape:'rect'});
 // Fehlende Form fällt auf das Profil zurück; eine explizite aktuelle Form bleibt maßgeblich.
 const configuredSurface=e0.surface;e0.surface=()=>({x:0,y:0,width:90,height:60});
 assert.deepEqual(structuredClone(vm.runInContext('placementSurface()',e0)),{x:2,y:2,width:86,height:56,shape:'rect'});
 e0.surface=()=>({...configuredSurface(),shape:'ellipse'});assert.equal(vm.runInContext('placementSurface().shape',e0),'ellipse');e0.surface=configuredSurface;
 // Mindestmaßstab: Text 12 mm → 3/12; Text schon unter 3 mm → 1 (nicht weiter verkleinern); Motiv 40 mm → 10/40; Motiv 8 mm → 1.
 assert.equal(vm.runInContext("placementMinScale({type:'text',size:12,w:30,h:12})",e0),0.25);
 assert.equal(vm.runInContext("placementMinScale({type:'text',size:2.5,w:10,h:3})",e0),1);
 assert.equal(vm.runInContext("placementMinScale({type:'motif',w:40,h:20})",e0),0.25);
 assert.equal(vm.runInContext("placementMinScale({type:'photoSlot',w:8,h:6})",e0),1);
 // (a) Freie Fläche: Originalgröße, kein Hinweis.
 const a=make([]),ta={id:'t',type:'text',size:10,w:30,h:10,rotation:0};a.env.el.state.objects.push(ta);a.place(ta);
 assert.equal(ta.size,10);assert.deepEqual(a.said,[]);assert.ok(ta.x>=17&&ta.x<=73&&ta.y>=7&&ta.y<=53);
 // (b) Nur eine schmale Lücke unten (Rand 2 bis 58 mm, Wand bis 47,5 mm → 10,5 mm): Text 10 mm hoch passt mit 1 mm Abstand
 //     zum Nachbarn (Außenbox +2 mm) erst verkleinert (0,9 → 9 mm) – nie unter 3 mm; der Nachbar wird nicht verschoben.
 const wall={id:'w',type:'motif',x:45,y:24,w:86,h:47,rotation:0};
 const b=make([structuredClone(wall)]),tb={id:'t',type:'text',size:10,w:30,h:10,rotation:0};b.env.el.state.objects.push(tb);b.place(tb);
 assert.ok(Math.abs(tb.size-9)<1e-9,String(tb.size));assert.ok(Math.abs(tb.w/30-tb.size/10)<1e-9,'Breite skaliert mit der Größe');
 assert.ok(tb.y+tb.h/2<=58.001&&tb.y-tb.h/2>=48.5-1e-6,JSON.stringify(tb));assert.deepEqual(b.env.el.state.objects[0],wall);
 assert.deepEqual(b.said,['Text in einer freien Fläche platziert – dafür verkleinert.']);assert.equal(b.env.el.state.selected,null);
 // (c) Alles belegt: mittig, ausgewählt, kurzer Hinweis – auch bei Mindestgröße kein Platz.
 const c=make([{id:'w',type:'motif',x:45,y:30,w:90,h:60,rotation:0}]),tc={id:'t',type:'text',size:10,w:30,h:10,rotation:0};c.env.el.state.objects.push(tc);c.place(tc);
 assert.deepEqual([tc.x,tc.y,tc.size],[45,30,10]);assert.equal(c.env.el.state.selected,'t');assert.deepEqual(c.said,[NO_FREE_SPACE_MESSAGE]);
 // (d) Motive gehen über die Pixelsuche mit Mindestmaßstab aus MOTIF_MIN_MM.
 const d=make([]),m={id:'m',type:'motif',w:40,h:20,rotation:0};d.env.el.state.objects.push(m);d.place(m);await d.env.placementJob;
 assert.deepEqual(d.motifCalls,[{id:'m',minScale:0.25}]);assert.deepEqual(d.said,['Freie Fläche für das Motiv wird gesucht …']);
});
// Chris 22./23.10.2026: Beim Farbdruck bleiben Palette und runde Schnellfarbpunkte, zusätzlich ist der Farbwähler
// (freie Farbe) erlaubt; Gravurprofile unverändert ohne Farbwahl. Die echten Zeilen aus ux.mjs, direct-editing.mjs
// und usability.mjs, mit den Verfahrensprofilen ausgewertet.
test('Freie Farbe: Farbdruck zeigt Palette + Farbwähler, Gravur keine Farbwahl, Produktauswahl nur Palette',async()=>{
 const {processProfile,processPalette,processFreeColor}=await import('../../workshop/process-profiles.mjs');
 // Modulweite const-Deklarationen landen im Kontext, nicht am Objekt: Ergebnis per Ausdruck lesen.
 const evaluate=(file,markers,env,result)=>{vm.createContext(env);for(const m of markers)vm.runInContext(line(file,m),env);return structuredClone(vm.runInContext(result,env));};
 const run=(profileId,colors=null)=>{
  const process=processProfile(profileId),config={workshopProfiles:{selections:{colors}}},colorTool=!!process.tools.textColor;
  const ux=evaluate('ux.mjs',['const freeColor=colorTool&&processFreeColor('],{process,config,colorTool,processFreeColor,processPalette},'({palette:colorTool?processPalette(process,config.workshopProfiles.selections.colors):[],free:freeColor})');
  const direct=evaluate('direct-editing.mjs',['const colorSelection=config?.workshopProfiles','const paletteColors=colorTool?processPalette','const presetColors=paletteColors===null'],{process,config,colorTool,processPalette,processFreeColor},'({palette:paletteColors,free:freeColor,presets:presetColors.length})');
  const usability=evaluate('usability.mjs',['const freeChoice=processFreeColor(process,colorSelection);'],{process,colorSelection:colors,processFreeColor},'freeChoice');
  return {ux,direct,usability};
 };
 const print=run('color-print');
 assert.equal(print.ux.palette.length,20);assert.equal(print.ux.free,true);
 assert.equal(print.direct.palette.length,20,'runde Schnellfarbpunkte bleiben');assert.equal(print.direct.presets,20);assert.equal(print.direct.free,true,'Farbwähler in der Werkzeugleiste');
 assert.equal(print.usability,true,'Farbwähler im Farbbereich');
 for(const id of ['steel-engraving','slate-engraving','wood-engraving','acrylic-engraving']){const e=run(id);assert.deepEqual(e.ux.palette,[]);assert.equal(e.ux.free,false,id);assert.equal(e.direct.free,false,id);assert.equal(e.direct.presets,0);assert.equal(e.usability,false,id);}
 const narrowed=run('color-print',['#245cac','#c93232']);
 assert.deepEqual(narrowed.ux.palette,['#c93232','#245cac']);assert.equal(narrowed.ux.free,false,'Produktauswahl des Händlers: nur diese Farben');assert.equal(narrowed.direct.free,false);assert.equal(narrowed.usability,false);
 // Der Farbwähler der Werkzeugleiste wird bei freier Farbe eingeblendet (Text/Motiv), die Presets bleiben daneben sichtbar.
 assert.match(source('direct-editing.mjs'),/color\.parentElement\.hidden=!\(text\|\|motif\)\|\|!freeColor;/);
 assert.match(source('direct-editing.mjs'),/presets\.hidden=!colorTool\|\|!\(text\|\|motif\)\|\|\(paletteColors===null&&!motif\);/);
 assert.match(source('usability.mjs'),/\(freeChoice\?'<label>Ausgewählte Farbe <input type="color" data-free-color/);
});
// Chris 22./23.10.2026: Ohne Foto im Produkt/Verfahren und ohne Foto-/Logo-Ebene in einem Design verschwindet der
// Reiter „Foto / Logo“ vollständig – unabhängig von der Logo-Einstellung. Produkte mit Foto bleiben unverändert.
test('Foto-Reiter: ohne Foto und ohne Foto-/Logo-Ebene weg (auch bei erlaubten Logos), mit Foto wie bisher',async()=>{
 const {uploadTabVisible,designsHaveUploadLayer}=await import('./ux-model.mjs');
 const textOnly={photo:{enabled:false},logo:{enabled:true},profile:{designs:[{id:'a',objects:[{id:'t',type:'text'}]},{id:'b',objects:[{id:'m',type:'motif'}]}]}};
 const withSlot={photo:{enabled:true},logo:{enabled:true},profile:{designs:[{id:'a',objects:[{id:'p',type:'photoSlot'}]},{id:'b',importedSource:'x.pdf',objects:[{id:'t',type:'text'}]}]}};
 assert.equal(designsHaveUploadLayer(textOnly),false);assert.equal(designsHaveUploadLayer(withSlot),true);
 // Kein Foto (Produkt oder Verfahren), keine Ebene: weg – egal ob Logos erlaubt sind.
 assert.equal(uploadTabVisible(textOnly,'a',{photoEnabled:false,logoEnabled:true}),false);
 assert.equal(uploadTabVisible(textOnly,'a',{photoEnabled:false,logoEnabled:false}),false);
 // Verfahren ohne Foto (tools.photo false), aber ein Design hat eine Fotoebene: bisherige Regel (Logo entscheidet).
 assert.equal(uploadTabVisible(withSlot,'a',{photoEnabled:false,logoEnabled:true}),true);
 assert.equal(uploadTabVisible({...withSlot,photo:{enabled:false}},'a',{photoEnabled:false,logoEnabled:false}),false);
 // Produkt mit Foto: unverändert – Fotobereich im gewählten Design oder Logos erlaubt.
 assert.equal(uploadTabVisible(withSlot,'a',{photoEnabled:true,logoEnabled:false}),true);
 assert.equal(uploadTabVisible(withSlot,'b',{photoEnabled:true,logoEnabled:false}),false,'importierte Vorlage ohne Fotobereich, keine Logos');
 assert.equal(uploadTabVisible(withSlot,'b',{photoEnabled:true,logoEnabled:true}),true);
 assert.equal(uploadTabVisible(undefined,undefined,{photoEnabled:true,logoEnabled:true}),true,'Klingelschild-Altpfad ohne Produktkonfiguration');
 // Der echte updateUploads-Block aus ux.mjs setzt den Reiter samt Hilfe-Knopf nach dieser Regel.
 const {photoAvailableForDesign}=await import('./ux-model.mjs');
 const run=(config,photoEnabled,logoEnabled)=>{
  const tab={hidden:false,disabled:false},guide={hidden:false},shown=[];
  const nodes={'#ux-tab-upload':tab,'[data-ux=guide-upload]':guide,'.ux-tabs':{style:{setProperty(){}}},'.ux-uploads':{innerHTML:''}};
  const env={config,photoEnabled,logoEnabled,activeTab:'upload',showTab:k=>shown.push(k),photoAvailableForDesign,uploadTabVisible,files:new Map(),el:{state:{designId:config.profile.designs[0].id,objects:[]}},$:s=>nodes[s],all:()=>[],label:()=>'',esc:v=>String(v),money:()=>'',button:()=>''};
  vm.createContext(env);vm.runInContext(block('ux.mjs','  function updateUploads(){','\n  function updatePrice').replace('\n  function updatePrice',''),env);vm.runInContext('updateUploads()',env);
  return {tab,guide,shown};
 };
 const gone=run(textOnly,false,true);assert.equal(gone.tab.hidden,true);assert.equal(gone.tab.disabled,true);assert.equal(gone.guide.hidden,true);assert.deepEqual(gone.shown,['options']);
 const kept=run(withSlot,true,false);assert.equal(kept.tab.hidden,false);assert.equal(kept.guide.hidden,false);assert.deepEqual(kept.shown,[]);
 // Reiter und Hilfe-Knopf werden gar nicht erst erzeugt, wenn kein Upload angeboten wird (uploadOffered).
 const offered=line('ux.mjs','const uploadOffered=');
 const offers=(photoEnabled,logoEnabled,config)=>{const env={photoEnabled,logoEnabled,config,designsHaveUploadLayer};vm.createContext(env);vm.runInContext(offered,env);return vm.runInContext('uploadOffered',env);};
 assert.equal(offers(false,true,textOnly),false);assert.equal(offers(false,true,withSlot),true);assert.equal(offers(true,false,textOnly),true);assert.equal(offers(false,false,withSlot),false);
 assert.match(source('ux.mjs'),/\.filter\(\(\[id\]\)=>id!=='upload'\|\|uploadOffered\)\.map\(\(\[id,title,icon\]\)/,'Reiterleiste nutzt uploadOffered');
 assert.match(source('ux.mjs'),/\.filter\(\(\[id\]\)=>id!=='upload'\|\|uploadOffered\)\.map\(\(\[id,title\]\)=>button\('guide-'/,'Hilfe-Dialog nutzt uploadOffered');
});
// Chris 22./23.10.2026: Befestigung bei Universal-/Katalogprodukten als Kacheln mit Icon, Bezeichnung und Aufpreis
// („+2,99 €“ / „ohne Aufpreis“) wie die alte Auswahl [data-fk-mount]; Auswahlhaken einheitlich wie bei Designs.
test('Befestigungskacheln: jede Befestigung als Kachel mit Icon, Bezeichnung und Aufpreis; interne Auswahlliste bleibt verborgen, Haken wie Designs',async()=>{
 const {optionTileIcon,optionTilePrice,MOUNT_ICONS,optionThumbnail}=await import('./option-media.mjs');
 const {money}=await import('./contract.mjs');
 const {familyProductConfig}=await import('../../workshop/product-families.mjs');
 const {escapeXml}=await import('../../platform/sources/app/shared/models/design-content.mjs');
 const family=JSON.parse(fs.readFileSync(new URL('../../designs/steel-door-signs/family.json',import.meta.url)));
 const config=familyProductConfig(family,family.sizes.find(s=>s.key==='GR-ES-OV-90X60-T15'),1),p=config.profile;
 const mounting=p.optionGroups.find(g=>g.id==='mounting');
 assert.deepEqual(mounting.values.map(v=>v.id),['K00','KGL','KRA','B02','B02S']);
 // Icon: Standardbild (Bohrbild) als <img>, sonst Strichsymbol; KGL teilt das Klebesymbol mit KRA, Unbekanntes → „ohne Bohrung“.
 assert.match(optionTileIcon(mounting.values.find(v=>v.id==='B02')),/^<img src="data:image\/png;base64,[A-Za-z0-9+/=]+" alt="">$/);
 assert.equal(optionTileIcon({id:'B02',holes:[{},{}],thumbnailDisabled:true}),optionTileIcon({id:'FREMD'}),'Bild abgeschaltet → Symbol „ohne Bohrung“');
 assert.ok(optionTileIcon({id:'K00'}).includes(MOUNT_ICONS.K00)&&optionTileIcon({id:'K00'}).startsWith('<svg viewBox="0 0 32 32"'));
 assert.equal(optionTileIcon({id:'KGL'}),optionTileIcon({id:'KRA'}));assert.ok(optionTileIcon({id:'KRA'}).includes(MOUNT_ICONS.KRA));
 assert.equal(optionThumbnail({id:'K00'}),'','K00 hat kein Standardbild – daher das Symbol');
 // Preistext wie in der Auswahlliste; Größen mit Komplettpreis zeigen den Preis selbst.
 assert.equal(optionTilePrice({priceCents:0},money),'ohne Aufpreis');assert.equal(optionTilePrice({priceCents:299},money),'+'+money(299));assert.equal(optionTilePrice({priceCents:1990},money,{fullPrice:true}),money(1990));
 // Der echte Kachelaufbau aus adapter.mjs: alle fünf Befestigungen, Kennung/Gruppe für die Auswahl, Bezeichnung + Aufpreis, aria-pressed.
 const env={pictures:{innerHTML:''},p,config,dynamicDoorbell:false,esc:escapeXml,money,optionTileIcon,optionTilePrice};vm.createContext(env);
 vm.runInContext(line('adapter.mjs','const fullOptionPrice=g=>'),env);vm.runInContext(line('adapter.mjs','const tileValues=g=>'),env);vm.runInContext(line('adapter.mjs','pictures.innerHTML=(p.optionGroups||[])'),env);
 const html=env.pictures.innerHTML;
 assert.equal((html.match(/<button type="button" class="m-option-tile" data-picture-group="mounting" data-picture-option="/g)||[]).length,5);
 assert.match(html,/<div role="group" aria-label="Befestigung">/);
 assert.match(html,/data-picture-option="K00" aria-pressed="false"><svg [^>]*>.*?<\/svg><strong>Ohne Bohrung<\/strong><small>ohne Aufpreis<\/small><\/button>/);
 assert.match(html,new RegExp('data-picture-option="KGL" aria-pressed="false"><svg .*?<strong>Selbstklebend – glatte Flächen</strong><small>\\+'+money(299).replace(/\s/g,'\\s')+'</small>'));
 assert.match(html,new RegExp('data-picture-option="B02S" aria-pressed="false"><svg .*?</svg><strong>Mit 2 Schrauben</strong><small>\\+'+money(269).replace(/\s/g,'\\s')+'</small>'));
 // Andere Gruppen (z. B. ohne Optionsbild) bekommen weiterhin keine Kacheln; Werte mit Bild schon.
 env.p={optionGroups:[{id:'size',name:'Größe',values:[{id:'a',label:'A',priceCents:100},{id:'b',label:'B',priceCents:0,thumbnail:'data:image/png;base64,AAAA'}]}]};
 vm.runInContext(line('adapter.mjs','pictures.innerHTML=(p.optionGroups||[])'),env);
 assert.equal((env.pictures.innerHTML.match(/data-picture-option=/g)||[]).length,1);assert.match(env.pictures.innerHTML,/data-picture-option="b"[^>]*><img src="data:image\/png;base64,AAAA" alt=""><strong>B<\/strong><small>ohne Aufpreis<\/small>/);
 // Auswahlliste (select) bleibt als barrierefreie Alternative; Klick auf die Kachel setzt nur die Option (keine Preislogik hier).
 assert.match(source('adapter.mjs'),/picks\.innerHTML=\(p\.optionGroups\|\|\[\]\)\.map\(g=>'<label>'\+esc\(g\.name\)\+'<select data-m-option=/);
 const choices=[];env.changeOption=(group,value)=>choices.push([group,value]);env.pictures.addEventListener=(event,handler)=>{assert.equal(event,'click');env.selectPicture=handler;};
 vm.runInContext(line('adapter.mjs',"pictures.addEventListener('click'"),env);
 env.selectPicture({target:{closest:()=>({dataset:{pictureGroup:'mounting',pictureOption:'B02S'}})}});
 assert.deepEqual(choices,[['mounting','B02S']],'Kachel nutzt denselben Änderungsweg wie die Auswahlliste');
 // Einheitlicher Auswahlhaken: completion.mjs markiert die Kacheln wie Designs und nutzt dieselben Symbole.
 assert.match(line('completion.mjs',"const choices='"),/\[data-ux=mount-choice\],\[data-picture-option\]'/);
 assert.match(source('completion.mjs'),/import \{MOUNT_ICONS,mountIconSvg\} from '\.\/option-media\.mjs'/);
});

test('workflow glyph bounds and autofit caches distinguish catalogue typography',()=>{
 const object={id:'name',type:'text',text:'A\nA',font:'Source',size:5,bold:false,italic:false,w:10,letterSpacing:0,textAnchor:'middle',lineHeight:6};
 let renders=0,rendered;
 const env={el:{fontData:{},state:{fkFrame:'none'},uxTextScale:()=>1},r:{append(){}},
  textPaths:o=>{renders++;rendered={x:o.textAnchor==='start'?-o.w/2:o.textAnchor==='end'?o.w/2:0,y:0,width:o.w+o.letterSpacing,height:o.lineHeight};return '<path/>';},
  document:{createElementNS:()=>({style:{},firstElementChild:{getBBox:()=>rendered},remove(){}})},object};
 vm.createContext(env);
 vm.runInContext(line('workflow.mjs','const boundsCache=new Map();'),env);
 vm.runInContext(line('workflow.mjs','function bounds(o){'),env);
 vm.runInContext(line('workflow.mjs','const fitted=new Map(),signature='),env);
 const original=vm.runInContext('bounds(object)',env),signature=vm.runInContext('signature(object)',env);
 assert.equal(original.height,6);assert.equal(renders,1);
 assert.equal(vm.runInContext('bounds({...object,x:50,y:30})',env),original,'moving an unchanged shape can reuse its local bounds');
 assert.equal(renders,1);
 for(const change of [{lineHeight:20},{textAnchor:'start'},{letterSpacing:2},{w:30}]){
  env.changed={...object,...change};const before=renders;
  const measured=vm.runInContext('bounds(changed)',env);
  assert.equal(renders,before+1,'changed typography must render fresh bounds');
  assert.notEqual(vm.runInContext('signature(changed)',env),signature,'changed typography must rerun autofit');
  assert.equal(vm.runInContext('bounds({...changed})',env),measured,'identical typography must reuse its bounds');
  assert.equal(renders,before+1);
  if(change.lineHeight)assert.equal(measured.height,20,'the second two-line field must not inherit the first field spacing');
 }
});


test('LF2 customer size input and normalization preserve the source leading ratio',async()=>{
 const {env,object,input,r}=textEnvironment();object.lineHeight=6.81;object.text='A\nAA';
 vm.runInContext(line('ux.mjs',"const t=e.target,key=t.id==='ux-size'"),env);
 await dispatch(r,'input',inertEvent(input));assert.equal(object.size,9);assert.equal(object.lineHeight,10.215);
 env.measureText=()=>{};env.el.normalize=()=>{object.size=1;object.lineHeight=1;};
 vm.runInContext(line('ux.mjs','const originalNormalize=el.normalize;'),env);env.el.normalize();
 assert.equal(object.size,9);assert.equal(object.lineHeight,10.215,'normalizer restores requested size and its own leading together');
});

test('usability glyph cache distinguishes catalogue spacing and alignment for edge limits',()=>{
 let renders=0,rendered;const object={text:'A\nA',font:'Source',size:5,w:10,lineHeight:6,textAnchor:'middle',letterSpacing:0};
 const env={object,el:{fontData:{}},r:{append(){}},textPaths:o=>{renders++;rendered={x:0,y:0,width:o.w+o.letterSpacing,height:o.lineHeight};return '<path/>';},document:{createElementNS:()=>({style:{},firstElementChild:{getBBox:()=>rendered},remove(){}})}};
 vm.createContext(env);vm.runInContext(line('usability.mjs','const boundsCache=new Map();'),env);vm.runInContext(block('usability.mjs','  function textBounds(o){','\n  }'),env);
 const original=vm.runInContext('textBounds(object)',env);assert.equal(original.height,6);
 for(const change of [{lineHeight:20},{textAnchor:'start'},{letterSpacing:2},{w:30}]){env.changed={...object,...change};const before=renders,measured=vm.runInContext('textBounds(changed)',env);assert.equal(renders,before+1);assert.equal(vm.runInContext('textBounds({...changed})',env),measured);assert.equal(renders,before+1);if(change.lineHeight)assert.equal(measured.height,20);}
});

test('motif UI uses the real array allowlist and frozen replace rights before changing a template',async()=>{
 const {replacedMotif}=await import('./motif-choice.mjs');
 const original={id:'m',type:'motif',motif:'old',x:20,y:20,w:10,h:20},object={...original},messages=[];let allowed=false,added=0,records=0;
 const el={state:{objects:[object],selected:'m'},uxMotifChoiceIds:['allowed'],catalog:{motif_bounds:{allowed:[0,0,10,10]}},add(){added++;},record(){records++;},normalize(){},sync(){}};
 const env={el,motifMode:'replace',motifTarget:()=>object,may:()=>allowed,replacedMotif,say:s=>messages.push(s),place(){}};vm.createContext(env);
 vm.runInContext(block('workflow.mjs',' const add=el.add;',' // Gate progression').replace(' // Gate progression',''),env);
 el.add({type:'motif',motif:'foreign'});assert.deepEqual(object,original);assert.equal(records,0);
 el.add({type:'motif',motif:'allowed'});assert.deepEqual(object,original);assert.match(messages.at(-1),/nicht zum Ersetzen/);
 allowed=true;el.add({type:'motif',motif:'allowed'});assert.equal(object.motif,'allowed');assert.equal(el.state.objects.length,1);assert.equal(records,1);assert.equal(added,0);
});
