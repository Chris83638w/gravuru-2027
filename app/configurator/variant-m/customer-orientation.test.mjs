import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {customerHeading,customerSelectionHeading} from './customer-heading.mjs';
import {answerCustomerQuestion} from './customer-help.mjs';
import {captureDesignContent,carryDesignContent,capturePhotoFiles} from './design-content-transfer.mjs';
import {templateRightsIssue} from './element-rights.mjs';
import {screwPreview} from './option-media.mjs';
const text=(id,key,value)=>({id,type:'text',fieldKey:key,text:value,font:'catalogue-font',size:5,x:20,y:15,w:30,h:10,rotation:0,customerEditable:true});
const photo={id:'photo-old',type:'photoSlot',fieldKey:'portrait',x:10,y:20,w:12,h:15,rotation:0,photoShape:'rect',customerEditable:true};
const old={id:'old',objects:[text('name','name','Vorname'),text('motto','spruch','Vorlage'),photo,{id:'art',type:'motif',motif:'house'}]};
const next={id:'next',objects:[{...text('new-name','name','Beispiel'),x:70,font:'new-font'},text('new-motto','spruch','Anderer Spruch'),{...photo,id:'new-photo',x:60,photoShape:'ellipse'},{id:'new-art',type:'motif',motif:'anchor',customerEditable:true,x:10,y:40,w:10,h:10,rotation:0}]};
const config={profile:{designs:[old,next]},photo:{enabled:true}};
const edited=()=>old.objects.map(o=>o.id==='name'?{...o,text:'Anna Müller'}:o.id==='motto'?{...o,text:'Für immer\nbei uns'}:o.id===photo.id?{...o,uxUploadKind:'photo',uxUploadId:'upload-1',uxPhotoColor:'grayscale',uxPhotoCrop:{zoom:1.2,x:.1,y:.2,angle:0},uxPhotoBackground:'keep'}:o);

test('customer heading keeps physical traits and excludes internal product suffixes',()=>{
 const profile={name:'Türschild Abger. Ecken V2A · Bedienprüfung',material:{kind:'stainless-steel',thicknessMm:1.5},geometry:{width:120,height:80,shape:'rect',cornerRadiusMm:4}};
 const value=customerHeading(profile);assert.equal(value.title,'Dein Türschild gestalten');assert.match(value.features,/12 × 8 cm.*Abgerundete Ecken/);assert.doesNotMatch(JSON.stringify(value),/Bedienprüfung|Abger\./);
 assert.match(customerHeading(profile,{width:200,height:200,shape:'ellipse'}).features,/20 × 20 cm.*Rund/);
});
test('questions match related wording and honor photo/logo capabilities',()=>{
 for(const q of ['Wie lade ich ein Foto hoch?','Ein Bild einfügen','photo upload'])assert.equal(answerCustomerQuestion(q,{photo:true}).topic,'photo-upload');
 for(const q of ['Wie sollte das Foto sein?','Bild scharf genug?','Welche DPI Auflösung?','Foto kontrastreich?']){const a=answerCustomerQuestion(q,{photo:true});assert.equal(a.topic,'photo-quality');assert.match(a.text,/keine feste DPI/);assert.match(a.text,/nicht immer/);}
 const steel=answerCustomerQuestion('Bild hochladen',{photo:false,logo:true});assert.equal(steel.topic,'photo-unavailable');assert.equal(steel.tab,'upload');
 const logo=answerCustomerQuestion('SVG als Logo',{logo:true,vectorLogo:true,logoCents:1299});assert.match(logo.text,/12,99/);assert.match(logo.text,/schwarze Gravurfassung/);
 assert.equal(answerCustomerQuestion('Wie drehe ich etwas?').topic,'rotate');assert.equal(answerCustomerQuestion('Zwei Finger zoomen').topic,'zoom');assert.equal(answerCustomerQuestion('unbekannter Wunsch').tab,null);
 assert.match(answerCustomerQuestion('Motiv hinzufügen').text,/vorhandene Motive bleiben/);
});
test('new design carries all edited text including slogans and photos into its own layout',()=>{
 const objects=edited(),snapshot=structuredClone(objects),target=structuredClone(next),content=captureDesignContent(objects,old),result=carryDesignContent(content,next,config);
 assert.deepEqual(content.texts.map(o=>o.text),['Anna Müller','Für immer\nbei uns']);
 const name=result.objects.find(o=>o.id==='new-name');assert.equal(name.text,'Anna Müller');assert.equal(name.font,'new-font');assert.equal(name.x,70);
 const image=result.objects.find(o=>o.id==='new-photo');assert.equal(image.uxUploadId,'upload-1');assert.equal(image.photoShape,'ellipse');assert.equal(image.x,60);assert.deepEqual(image.uxPhotoCrop,objects[2].uxPhotoCrop);
 assert.equal(image.uxPhotoColor,'grayscale');assert.equal(image.uxPhotoBackground,'keep');assert.equal(result.objects.at(-1).motif,'anchor');
 assert.equal(templateRightsIssue(config,next,next,result.objects),null);
 assert.deepEqual(objects,snapshot);assert.deepEqual(next,target);
});
test('personal text without a matching field stays as a new editable text; locked fields and IDs are preserved',()=>{
 const objects=edited().concat(text('new-name','extra','Eigene Zeile')),locked={...config,workshopElementRights:{next:Object.fromEntries(next.objects.map(o=>[o.id,{content:o.id==='new-motto',replace:o.type==='photoSlot',move:true,scale:true,delete:true}]))}};
 const result=carryDesignContent(captureDesignContent(objects,old),next,locked,{id:(()=>{let i=0;return()=> 'added-'+(++i);})()});
 assert.equal(result.objects.find(o=>o.id==='new-name').text,'Beispiel');assert.ok(result.objects.some(o=>o.text==='Anna Müller'));assert.ok(result.objects.some(o=>o.text==='Eigene Zeile'));
 assert.equal(new Set(result.objects.map(o=>o.id)).size,result.objects.length);assert.equal(result.added.length,2);
 assert.throws(()=>carryDesignContent(captureDesignContent(objects,old),next,{...config,customerAdditions:{text:false,motifs:true,maxElements:19}}),/bisherige Gestaltung/);
});
test('photo incompatibility and character constraints reject the whole switch without losing the source',()=>{
 const objects=edited(),before=structuredClone(objects),content=captureDesignContent(objects,old);
 for(const c of [{...config,photo:{enabled:false}},{...config,workshopElementRights:{next:{}}}])assert.throws(()=>carryDesignContent(content,next,c),/bisherige Gestaltung/);
 assert.throws(()=>carryDesignContent({...content,photos:[...content.photos,...content.photos]},next,config),/Fotobereiche/);
 const tooLong={...content,texts:[{...content.texts[0],text:'x'.repeat(1000)}]};assert.throws(()=>carryDesignContent(tooLong,next,config),/bisherige Gestaltung/);
 assert.deepEqual(objects,before);
});
test('photo transfer carries original bytes and editing data, never ephemeral URLs',async()=>{
 const content=captureDesignContent(edited(),old),file=new Blob(['original-photo-bytes'],{type:'image/png'}),blob=new Blob(['preview'],{type:'image/png'}),files=new Map([['upload-1',{file,blob,url:'blob:old-frame',width:800,height:600}]]);
 const outgoing=capturePhotoFiles(content,files),copy=structuredClone(outgoing);assert.equal(await copy[0].asset.file.text(),'original-photo-bytes');assert.equal(await copy[0].asset.blob.text(),'preview');assert.equal(copy[0].asset.url,undefined);assert.equal(files.get('upload-1').url,'blob:old-frame');
 assert.throws(()=>capturePhotoFiles(content,new Map()),/Fotodatei/);
});
test('actual local design-switch handler retains all texts/photos and aborts before mutations on incompatibility',()=>{
 const code=fs.readFileSync(new URL('./workflow.mjs',import.meta.url),'utf8'),a=code.indexOf(' let changing=false;'),z=code.indexOf(' // Full motif browser',a);
 let records=0;const messages=[],el={state:{designId:'old',objects:edited()},id:()=> 'personal-new',chooseDesign(id){records++;this.state.designId=id;this.state.objects=structuredClone(next.objects);},normalize(){},sync(){}};
 const context={el,config,chosenProfile:()=>config.profile,captureDesignContent,carryDesignContent,place(){},say:s=>messages.push(s),known:new Set()};vm.createContext(context);vm.runInContext(code.slice(a,z),context);
 assert.equal(el.chooseDesign('next'),true);assert.equal(records,1);assert.equal(el.state.objects.find(o=>o.id==='new-photo').uxUploadId,'upload-1');assert.equal(el.state.objects.find(o=>o.id==='new-name').text,'Anna Müller');
 el.state={designId:'old',objects:edited()};const original=structuredClone(el.state);context.config={...config,photo:{enabled:false}};
 assert.equal(el.chooseDesign('next'),false);assert.equal(records,1);assert.deepEqual(el.state,original);assert.match(messages.at(-1),/Fotobereiche/);
});
test('screw preview uses 3.6-mm heads without changing drilling or adding engraving objects',()=>{
 const profile={geometry:{holes:[{x:12,y:20,diameter:4}]},mountingPreview:{screws:true}},before=structuredClone(profile);
 const svg=screwPreview('<svg><circle cx="12" cy="20" r="2"/></svg>',profile);assert.match(svg,/data-screw-head-mm="3.6"/);assert.match(svg,/r="1.8"/);assert.match(svg,/data-role="guide"/);assert.match(svg,/<circle cx="12" cy="20" r="2"/);assert.deepEqual(profile,before);
});

test('actual field UI moves its highlight and open font controls with selection and reveals it after resizing',()=>{
 const code=fs.readFileSync(new URL('./text-fields.mjs',import.meta.url),'utf8'),callbacks={},resizers=[];
 class Element{
  constructor(id){this.dataset={uxRow:id};this.attrs={};this.classes=new Set();this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};}
  append(node){node.parentNode=this;this.child=node;}
  setAttribute(key,value){this.attrs[key]=value;}removeAttribute(key){delete this.attrs[key];}
  querySelector(){return this.disclosure||null;}
 }
 const rows=['a','b'].map(id=>{const row=new Element(id);row.disclosure=new Element();row.disclosure.dataset={textOptions:id};return row;}),controls=new Element(),fieldNodes=rows.map((row,i)=>({dataset:{uxText:row.dataset.uxRow},getBoundingClientRect:()=>({top:100+i*120,bottom:140+i*120})}));
 const fields={querySelectorAll:s=>s==='.ux-text-row'?rows:fieldNodes},editor={scrollTop:0,getBoundingClientRect:()=>({top:100,bottom:200}),scrollTo(value){this.scrollTop=value.top;}},panel={hidden:false};
 const r={querySelector:s=>({'.ux-fields':fields,'.ux-controls':controls,'.ux-editor':editor,'#ux-panel-text':panel})[s],addEventListener:(type,fn)=>callbacks[type]=fn};
 const el={},env={el,r,object:{id:'a',type:'text'},requestAnimationFrame:fn=>fn(),ResizeObserver:class{constructor(fn){resizers.push(fn);}observe(){}disconnect(){}},window:{addEventListener(){}},document:{createElement:()=>new Element()}};
 env.selected=()=>env.object;env.select=id=>{env.object={id,type:'text'};el.uxUpdateTextUI();};vm.createContext(env);vm.runInContext(code.slice(code.indexOf('export function installTextFields')).replace('export ',''),env);vm.runInContext('installTextFields({el,r,selected,select})',env);
 assert.equal(rows[0].attrs['aria-current'],'true');assert.equal(rows[1].attrs['aria-current'],undefined);
 callbacks.click({target:{closest:()=>rows[0].disclosure}});assert.equal(controls.parentNode,rows[0]);assert.equal(controls.hidden,false);
 env.select('b');assert.equal(rows[0].attrs['aria-current'],undefined);assert.equal(rows[1].attrs['aria-current'],'true');assert.equal(controls.parentNode,rows[1]);assert.equal(rows[1].disclosure.attrs['aria-expanded'],'true');assert.ok(editor.scrollTop>0);
 editor.scrollTop=0;resizers[0]();assert.ok(editor.scrollTop>0,'same selected text is still revealed after a viewport resize');
 env.object={id:'motif',type:'motif'};el.uxUpdateTextUI();assert.equal(controls.hidden,true);assert.ok(rows.every(row=>!row.classes.has('is-selected')));
});

test('header follows actual acrylic dimensions after a size change, without modifying design coordinates',()=>{
 const config={profile:{name:'Acrylglasbild',material:{kind:'acrylic'},geometry:{width:150,height:200,shape:'rect'},optionGroups:[{id:'size',defaultValueId:'small',values:[{id:'small'},{id:'large'}]}]},acrylic:{}},state={mOptions:{size:'large'},objects:[{id:'photo',x:40}]},before=structuredClone(state);
 assert.match(customerSelectionHeading(config,state).features,/20 × 26,67 cm/);assert.deepEqual(state,before);
 assert.match(customerSelectionHeading(config,{mOptions:{size:'small'}}).features,/15 × 20 cm/);
});
