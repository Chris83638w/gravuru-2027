import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from '../../workshop/test-fixtures/doorbell-config.mjs';
import {selectedDoorbellProfile,doorbellLayoutIssue} from './doorbell-selection.mjs';
import {doorbellTextSurface,updateDoorbellViewport} from './doorbell-ui.mjs';
import {fitText} from './workflow-model.mjs';
import {designArea,designAreaPreview} from './design-area.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {DOORBELL_STEEL_SURFACE} from '../../platform/sources/app/shared/models/doorbell-material-preview.mjs';
import {embedSurface} from './material-surface.mjs';

test('the personal doorbell picture embeds the displayed steel surface only on cart export',async t=>{
 const calls=[],data='data:image/webp;base64,UklGRg==';
 t.mock.method(globalThis,'fetch',async url=>{calls.push(url);return new Response(new Blob(['RIFF'],{type:'image/webp'}));});
 const reader=Object.getOwnPropertyDescriptor(globalThis,'FileReader');
 Object.defineProperty(globalThis,'FileReader',{configurable:true,value:class {readAsDataURL(){this.result=data;this.onload();}}});
 t.after(()=>{if(reader)Object.defineProperty(globalThis,'FileReader',reader);else delete globalThis.FileReader;});
 const svg='<svg><g data-doorbell-steel="textured"><image href="'+DOORBELL_STEEL_SURFACE+'"/></g><path id="glass"/></svg>';
 assert.equal(await embedSurface(svg),svg);
 const custom=svg.replace(DOORBELL_STEEL_SURFACE,'https://example.test/other.webp');
 assert.equal(await embedSurface(custom,undefined,undefined,true),custom);
 assert.deepEqual(calls,[]);
 assert.equal(await embedSurface(svg,undefined,undefined,true),svg.replace(DOORBELL_STEEL_SURFACE,data));
 assert.deepEqual(calls,[DOORBELL_STEEL_SURFACE]);
});
import {customerRightsTemplate} from './customer-rights.mjs';
import {restoreElementRights} from './element-rights.mjs';
import {clampToAcrylic,installEdgeClamp} from './edge-clamp.mjs';
import {fitsSurface} from './usability-model.mjs';

test('doorbell engraving stays on every acrylic frame before autofit, without shrinking or moving the device',()=>{
 const c=doorbellFixture();
 for(const f of c.doorbell.formats)for(const position of ['standard','opposite'])for(const frame of f.profile.frames)for(const rotation of [0,37,180]){
  const p=selectedDoorbellProfile(c,{format:f.key,position,frame:frame.key}),a=doorbellTextSurface(p),bell=structuredClone(p.geometry.bell);
  for(const point of [-200,1000]){
   const o={id:'number',type:'text',text:'12a',x:point,y:point,w:30,h:20,size:17,rotation};
   const bounds={x:-14,y:-9,width:28,height:18};
   assert.equal(clampToAcrylic(o,p,bounds),true);
   assert.equal(fitsSurface(o,bounds,a),true);assert.equal(fitText(o,bounds,a,3),17);
   assert.equal(clampToAcrylic(o,p,bounds),false);assert.deepEqual(p.geometry.bell,bell);
  }
  const motif={id:'line',type:'motif',uxDecoration:true,customerEditable:true,x:-50,y:-50,w:20,h:10,rotation};
  const el={state:{objects:[motif],width:p.geometry.width,height:p.geometry.height},uxSelectedProfile:()=>p,render(){return 'drawn';}};
  installEdgeClamp(el);assert.equal(el.render(),'drawn');
  assert.equal(fitsSurface(motif,{x:-10,y:-5,width:20,height:10},a),true);
 }
 const master={x:-20,y:-20,w:10,h:10};assert.equal(clampToAcrylic(master,{geometry:{width:100,height:80}}),false);assert.equal(master.x,-20);
});

test('12a beside the doorbell grows without the initial-placement box shrinking it; outer edge and device stay enforced',()=>{
 const c=doorbellFixture();
 for(const position of ['standard','opposite'])for(const frame of c.profile.frames){
  const p=selectedDoorbellProfile(c,{format:'16x28',position,frame:frame.key});
  const o={id:'house-number',type:'text',text:'12a',x:position==='standard'?130:30,y:position==='standard'?252:28,w:24,h:10,size:17,rotation:0};
  const bounds={x:-12,y:-5,width:24,height:10},a=designArea(c,p),old={x:a.left,y:a.top,width:a.right-a.left,height:a.bottom-a.top};
  assert.equal(fitText(o,bounds,old,3),null,'regression: the old placement box rejects this valid house number');
  assert.equal(fitText(o,bounds,doorbellTextSurface(p),3),17,'requested size retained');
  assert.equal(doorbellLayoutIssue(o,p),'');
  assert.match(doorbellLayoutIssue({...o,x:-20},p),/Gestaltungsfläche/);
  assert.match(doorbellLayoutIssue({...o,x:p.geometry.bell.x+25,y:p.geometry.bell.y+50},p),/Klingel/);
 }
});

test('only native doorbell placement outlines are omitted; Master guides and SVG artwork remain unchanged',()=>{
 const svg='<svg><path id="design-line" d="M10 20H80V150"/><g data-selection="true"/></svg>',c=doorbellFixture();
 assert.equal(designAreaPreview(svg,c,selectedDoorbellProfile(c)),svg);
 const other={profile:{geometry:{width:100,height:60,shape:'rect',safeMarginMm:2}}};
 assert.match(designAreaPreview(svg,other),/data-m-design-area="true"/);
 assert.equal(designAreaPreview(svg,other,other.profile,{show:false}),svg);
});

test('doorbell materials use the retained steel reference and acrylic thickness without changing geometry or Master text paint order',()=>{
 const c=doorbellFixture(),p=selectedDoorbellProfile(c),before=structuredClone(p);
 const font={Montserrat:{regular:{units:1000,glyphs:{A:{a:600,d:'M0 0H500V700H0Z'}}}}};
 const d={id:'proof',name:'Proof',textOnTop:true,objects:[{id:'text',type:'text',text:'A',font:'Montserrat',size:10,x:40,y:40,w:6,h:7,rotation:0},{id:'shape',type:'graphic',shape:'rect',x:40,y:40,w:8,h:8,rotation:0}],marks:[]};
 const svg=studioSvg(p,d,font,{color:'schwarz'});
 assert.match(svg,/data-doorbell-steel="textured"/);
 assert.ok(svg.includes('href="'+DOORBELL_STEEL_SURFACE+'"'));
 const overridden=studioSvg({...p,admin:{...p.admin,steelImageUrl:'/assets/custom-steel.png'}},d,font);
 assert.ok(overridden.includes('href="/assets/custom-steel.png"'));
 assert.match(svg,/data-doorbell-acrylic="polished"/);
 assert.ok(svg.indexOf('data-object="shape"')<svg.indexOf('data-object="text"'),'Master text-on-top retained');
 assert.deepEqual(p,before);
});

test('selected-format rights repair still rejects forbidden scale and restores non-removable technical elements',()=>{
 const c=doorbellFixture(),p=selectedDoorbellProfile(c,{format:'35x18',position:'opposite'}),d=p.designs[0];
 const state={designId:d.id,mOptions:{format:'35x18',position:'opposite'},objects:structuredClone(d.objects)};
 state.objects[1].w+=20;
 const source=customerRightsTemplate(c,state),rights=Object.fromEntries(source.objects.map(o=>[o.id,{move:false,scale:false,delete:false,content:false,replace:false,color:false}]));
 const restored=restoreElementRights(source.objects,state.objects,rights);
 assert.deepEqual(restored.objects,source.objects);assert.ok(restored.blockedIds.includes('mark-0'));
 assert.deepEqual(restoreElementRights(source.objects,[],rights).objects,source.objects);
 assert.equal(customerRightsTemplate({profile:{designs:[d]}},{designId:d.id}),d,'universal Master selection unchanged');
});

test('format switches refresh the actual stage sizing inputs alongside dimensions without modifying user data',()=>{
 const values=new Map(),style={setProperty:(key,value)=>values.set(key,value)},state={objects:[{text:'12a',size:17}]};
 const el={state,style:{setProperty(){}},shadowRoot:{querySelectorAll:s=>s==='.stage'?[{style}]:[]}},before=structuredClone(state);
 for(const [width,height]of [[160,280],[350,180],[240,200]]){
  updateDoorbellViewport(el,{width,height});
  assert.equal(values.get('--ux-preview-ratio'),width+'/'+height);
  assert.equal(values.get('--ux-product-width'),String(width));assert.equal(values.get('--ux-product-height'),String(height));
 }
 assert.deepEqual(state,before);
});
