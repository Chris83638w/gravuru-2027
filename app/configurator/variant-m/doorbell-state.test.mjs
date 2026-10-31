import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellPositionLabels,updateDoorbellViewport} from './doorbell-ui.mjs';
const design={id:'D1',name:'Formatvorschau',objects:[],marks:[]};
function profile(width,height,opposite=false){
 const bell={x:width>height?width-65:(width-50)/2,y:width>height?20:height-130,width:50,height:110};
 if(opposite){bell.x=width-bell.x-bell.width;bell.y=height-bell.y-bell.height;}
 return {kind:'layered-doorbell',geometry:{width,height,bell,bellImageBounds:{...bell},holes:[]},
  admin:{imageUrl:'https://example.test/doorbell.png',steelImageUrl:'https://example.test/steel.png'},
  frames:[{key:'R10',acrylic:{x:10,y:10,width:width-20,height:height-20}}],
  mounting:{options:[{key:'B04S',visibleScrews:true},{key:'K00',visibleScrews:false}],
   holes:[{x:8,y:8},{x:width-8,y:8},{x:width-8,y:height-8},{x:8,y:height-8}],screwHeadPreviewDiameterMm:7}};
}

const styled=()=>({values:new Map(),setProperty(key,value){this.values.set(key,value);}});
test('Viewport labels and CSS proportions refresh without touching design, undo or customer text',()=>{
 const rootStyle=styled(),previewStyle=styled(),x={},y={},standard={value:'standard'},opposite={value:'opposite'};
 const nodes={'.ux-preview':[{style:previewStyle}],'.dimension-x span':[x],'.dimension-y span':[y],'[data-m-field="position"] option':[standard,opposite]};
 const state={objects:[{text:'Müller',x:80,y:65}],mOptions:{format:'16x28'}},history=[structuredClone(state)];
 const el={style:rootStyle,shadowRoot:{querySelectorAll:s=>nodes[s]||[]},state,history};
 const before=structuredClone({state,history});
 for(const [width,height]of [[160,280],[240,200],[350,180],[160,280]]){
  updateDoorbellViewport(el,{width,height});
  assert.equal(rootStyle.values.get('--m-plate-width'),String(width));
  assert.equal(previewStyle.values.get('--ux-ratio'),width+'/'+height);
  assert.equal(x.textContent,width+' mm');assert.equal(y.textContent,height+' mm');
  assert.deepEqual({standard:standard.textContent,opposite:opposite.textContent},doorbellPositionLabels({width,height}));
 }
 assert.deepEqual({state,history},before);
});

import {doorbellOptionState} from './doorbell-ui.mjs';
function selectableConfig(){
 const formats=[[160,280,'16x28'],[240,200,'24x20'],[350,180,'35x18']].map(([w,h,key])=>{
  const p=profile(w,h);
  Object.assign(p.geometry,{cutPaths:[],cutBoundsMm:[]});
  p.mounting.holeDiameterMm=4;p.materials={};p.manufacturing={};
  p.designs=[{...design,objects:[{id:'name',type:'text',x:w>h?75:80,y:w>h?70:65,w:55,h:12,size:10,text:'Muster',font:'Arial',rotation:0},{id:'removed',type:'graphic',shape:'rect',x:40,y:40,w:5,h:5,rotation:0}]}];
  return {key,profile:p};
 });
 const groups={format:formats.map(f=>f.key),frame:['R10'],color:['schwarz','anthrazit'],mounting:['K00','B04S']};
 return {doorbell:{schema:'gravuru-doorbell/v1',formats},profile:{...structuredClone(formats[0].profile),optionGroups:Object.entries(groups).map(([id,values])=>({id,defaultValueId:values[0],values:values.map(id=>({id}))}))}};
}
test('Format and opposite choices preserve custom text, font, size, deletions and additions; serialized undo restores directly',()=>{
 const c=selectableConfig(),base={designId:'D1',objects:[{...c.profile.designs[0].objects[0],text:'Familie Müller',font:'Custom Font',size:14,x:83},{id:'custom',type:'graphic',shape:'ellipse',x:60,y:80,w:12,h:8,rotation:12}],mOptions:{format:'16x28',frame:'R10',color:'schwarz',mounting:'K00',position:'standard'}};
 const before=structuredClone(base),history=[structuredClone(base)];
 const landscape=doorbellOptionState(c,base,{format:'24x20'});
 assert.equal(landscape.width,240);assert.equal(landscape.height,200);
 assert.equal(landscape.objects[0].text,'Familie Müller');assert.equal(landscape.objects[0].font,'Custom Font');assert.equal(landscape.objects[0].size,14);assert.equal(landscape.objects[0].x,78);
 assert.equal(landscape.objects.length,2);assert.equal(landscape.objects[1].w,12);assert.equal(landscape.objects[1].rotation,12);
 const opposite=doorbellOptionState(c,landscape,{position:'opposite'});
 assert.equal(opposite.objects[0].x,240-78);assert.equal(opposite.objects[0].rotation,0);
 assert.deepEqual(doorbellOptionState(c,opposite,{position:'opposite'}),opposite);
 const restored=doorbellOptionState(c,doorbellOptionState(c,opposite,{position:'standard'}),{format:'16x28'});
 assert.deepEqual(restored.objects[0],before.objects[0]);
 assert.ok(Math.abs(restored.objects[1].x-before.objects[1].x)<1e-9);
 assert.ok(Math.abs(restored.objects[1].y-before.objects[1].y)<1e-9);
 assert.deepEqual(base,before);assert.deepEqual(history[0],before);
 // The editor history contains complete options+objects; merely refreshing its
 // viewport does not invoke the forward transition again.
 const undo=structuredClone(history.pop());assert.deepEqual(undo,before);
});


test('format roundtrip keeps photo crop, upload IDs, logo proof and additional motifs',()=>{
 const c=selectableConfig(),base={designId:'D1',objects:[
  {...c.profile.designs[0].objects[0],text:'Eigener Text'},
  {id:'photo',type:'photoSlot',x:70,y:80,w:20,h:25,rotation:7,uxUploadKind:'photo',uxUploadId:'photo-file',uxPhotoCrop:{zoom:1.5,x:.2,y:-.1,angle:0},uxPhotoColor:'grayscale',photoShape:'heart'},
  {id:'logo',type:'image',x:50,y:60,w:20,h:10,rotation:12,uxUploadKind:'logo',uxUploadId:'logo-file',uxVectorLogo:{version:'svg-black-v1',sourceSha256:'a'.repeat(64),outputSha256:'b'.repeat(64)}},
  {id:'motif',type:'motif',motif:'house',x:40,y:50,w:15,h:20,rotation:5}
 ],mOptions:{format:'16x28',frame:'R10',color:'schwarz',mounting:'K00',position:'standard'}};
 const before=structuredClone(base),landscape=doorbellOptionState(c,base,{format:'24x20'}),back=doorbellOptionState(c,landscape,{format:'16x28'});
 assert.equal(landscape.objects.length,4);assert.equal(landscape.objects[1].uxUploadId,'photo-file');assert.deepEqual(landscape.objects[2].uxVectorLogo,base.objects[2].uxVectorLogo);
 for(const source of base.objects){const object=back.objects.find(o=>o.id===source.id);assert.ok(Math.abs(object.x-source.x)<1e-8);assert.ok(Math.abs(object.y-source.y)<1e-8);assert.deepEqual({...object,x:source.x,y:source.y},source);}
 assert.deepEqual(base,before);
});
