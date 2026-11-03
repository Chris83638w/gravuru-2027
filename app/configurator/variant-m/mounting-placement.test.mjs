import test from 'node:test';
import assert from 'node:assert/strict';
import {avoidMounting,touchesMounting,mountingPlacementState,signPlacementEnabled} from './mounting-placement.mjs';
import {overlaps} from './customer-tools-model.mjs';
import {surfaceObjectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
const p={id:'family-steel-door-signs-test',kind:'universal-product',material:{kind:'steel'},geometry:{width:100,height:60,shape:'rect',safeMarginMm:0,holes:[{x:6,y:30,diameter:4},{x:94,y:30,diameter:4}]}};
const none={...p,geometry:{...p.geometry,holes:[]}};
const motif=(props={})=>({id:'m',type:'motif',motif:'house',x:6,y:30,w:8,h:8,rotation:0,...props});
const state=objects=>({designId:'D1',objects,mOptions:{mounting:'K00'}});
test('choosing drilling moves an intersecting motif minimally inward without scaling or mutating the input',()=>{
 const objects=[motif()],before=structuredClone(objects),r=avoidMounting(objects,p);
 assert.deepEqual(objects,before);assert.equal(r.unresolved.length,0);assert.equal(r.objects[0].y,30);assert.equal(r.objects[0].w,8);assert(r.objects[0].x>12.5&&r.objects[0].x<12.501);assert(!touchesMounting(r.objects[0],p));
});
test('a clear design remains byte-for-byte identical',()=>{const objects=[motif({x:50})];assert.deepEqual(avoidMounting(objects,p).objects,objects);});
test('circle-to-rotated-box distance includes the 5 mm screw head',()=>{assert(touchesMounting(motif({x:10.2,w:4,h:4}),p));assert(touchesMounting(motif({x:10,w:6,h:2,rotation:45}),p));assert(!touchesMounting(motif({x:11,w:6,h:2,rotation:45}),p));assert(!touchesMounting(motif({x:20}),p));});
test('placement avoids neighbouring objects and preserves rotation',()=>{
 const a=motif({rotation:20}),b=motif({id:'b',x:19,w:6,h:16}),r=avoidMounting([a,b],p);
 assert.equal(r.unresolved.length,0);assert(!overlaps(...r.objects));assert.equal(r.objects[0].rotation,20);assert.equal(surfaceObjectIssue(r.objects[0],p),'');
});
test('multiple holes and the native contour are respected',()=>{
 const profile={...p,geometry:{width:100,height:60,shape:'contour',outlinePath:'M0 10L10 0H90L100 10V50L90 60H10L0 50Z',safeMarginMm:0,holes:p.geometry.holes}};
 const r=avoidMounting([motif(),motif({id:'right',x:94})],profile);assert.deepEqual(r.unresolved,[]);for(const o of r.objects){assert(!touchesMounting(o,profile));assert.equal(surfaceObjectIssue(o,profile),'');}
});
test('text shrinks only if translation cannot fit and retains all content',()=>{
 const text={id:'t',type:'text',text:'A long name',font:'Montserrat',size:8,x:50,y:30,w:90,h:50,rotation:0};
 const r=avoidMounting([text],p);assert.deepEqual(r.unresolved,[]);assert(r.objects[0].size<8&&r.objects[0].size>=3);assert.equal(r.objects[0].text,text.text);assert(!touchesMounting(r.objects[0],p));
});
test('returning to no fastening restores exact original objects',()=>{
 const s=state([motif()]),on=mountingPlacementState({},s,none,p),off=mountingPlacementState({},on,p,none);assert.deepEqual(off.objects,s.objects);assert.equal(off.uxHolePlacement,null);
});
test('changing between hole and screw options never accumulates a displacement',()=>{
 const s=state([motif()]),on=mountingPlacementState({},s,none,p),again=mountingPlacementState({},on,p,p);assert.deepEqual(again.objects,on.objects);assert.deepEqual(mountingPlacementState({},again,p,none).objects,s.objects);
});
test('manual movement and content changes after assistance survive return to no fastening',()=>{
 const s=state([motif()]),on=mountingPlacementState({},s,none,p);on.objects[0].x+=2;on.objects[0].rotation=15;on.objects[0].label='my logo';
 const off=mountingPlacementState({},on,p,none);assert.equal(off.objects[0].x,8);assert.equal(off.objects[0].rotation,15);assert.equal(off.objects[0].label,'my logo');
});
test('a new design or size cannot use a previous restoration cache',()=>{
 const on=mountingPlacementState({},state([motif()]),none,p);on.designId='D2';const off=mountingPlacementState({},on,p,none);assert.deepEqual(off.objects,on.objects);
 const resized={...none,geometry:{...none.geometry,width:200}};assert.deepEqual(mountingPlacementState({},on,p,resized).objects,on.objects);
});
test('hidden, fixed whole-artwork, empty text and photo objects are untouched',()=>{
 const objects=[motif({uxHidden:true}),motif({id:'fixed',customerEditable:false}),{...motif({id:'text'}),type:'text',text:''},{...motif({id:'photo'}),type:'photoSlot'}];assert.deepEqual(avoidMounting(objects,p).objects,objects);
});
test('scope is the three catalog sign families, not memorials or doorbells',()=>{
 assert(signPlacementEnabled({},p));assert(signPlacementEnabled({familyAcrylic:{familyId:'acryl-3mm-tuerschilder-anthrazit'}},{id:'copied'}));assert(signPlacementEnabled({}, {...p,familySelection:{familyId:'acryl-3mm-tuerschilder-schwarz'}}));
 const other={...p,id:'memorial'};assert(!signPlacementEnabled({},other));const s=state([motif()]);assert.equal(mountingPlacementState({},s,none,other),s);
 assert(signPlacementEnabled({}, {id:'katalog-tuerschilder-familie-120x80',revision:'family-steel-door-signs-r3'}));
});
test('back-surface holes are reflected once, and front neighbours do not block the back',()=>{
 const profile={...p,geometry:{...p.geometry,holes:[{x:6,y:30,diameter:4}]}},back=motif({x:94,surfaceId:'back'}),front=motif({id:'front',x:88});
 assert(touchesMounting(back,profile));assert(!touchesMounting({...back,surfaceId:'front'},profile));const r=avoidMounting([back,front],profile);assert.deepEqual(r.unresolved,[]);assert(!touchesMounting(r.objects[0],profile));assert.deepEqual(r.objects[1],front);
});
test('impossible minimum-size text is preserved, never silently removed or shrunk below 3 mm',()=>{
 const text={id:'t',type:'text',text:'Name',font:'Montserrat',size:3,x:50,y:30,w:100,h:60,rotation:0};const r=avoidMounting([text],p);assert.deepEqual(r.objects,[text]);assert.deepEqual(r.unresolved,['t']);
});

test('catalog safety margin is reserved outside the head, not just outside the hole',()=>{
 const profile={...p,mountingPreview:{keepoutMm:1}},r=avoidMounting([motif()],profile);
 assert.deepEqual(r.unresolved,[]);assert(r.objects[0].x>13.25);assert(!touchesMounting(r.objects[0],profile));
});
test('overlapping emblem and lettering move together without changing relative placement',()=>{
 const emblem=motif({w:20,h:20}),letter={...motif({id:'word',w:10,h:5}),type:'text',font:'unknown',text:'STOP',size:5};
 const r=avoidMounting([emblem,letter],p);assert.deepEqual(r.unresolved,[]);assert.equal(r.objects[1].x-r.objects[0].x,0);assert.equal(r.objects[1].y-r.objects[0].y,0);assert.equal(r.objects[1].w/r.objects[0].w,.5);for(const o of r.objects)assert(!touchesMounting(o,p));
});
test('painted descenders beyond the nominal text box avoid both screws and dividers',()=>{
 const fonts={Test:{regular:{units:1000,glyphs:{A:{a:1000,d:'M0 -600H1000V800H0Z'}}}}};
 const text={id:'descender',type:'text',text:'A',font:'Test',size:10,x:6,y:20,w:10,h:12,rotation:0};
 const line=motif({id:'divider',x:50,y:37,w:98,h:.2});
 assert.equal(touchesMounting(text,p),false);assert(touchesMounting(text,p,{fonts}));
 const r=avoidMounting([text,line],p,{fonts});assert.deepEqual(r.unresolved,[]);assert(!touchesMounting(r.objects[0],p,{fonts}));
 assert(r.objects[0].y+9.501<36.9);assert.equal(r.objects[0].text,'A');
});

test('placement cannot introduce even a very small new overlap at a neighbouring edge',()=>{
 const profile={...p,geometry:{width:80,height:35,shape:'rect',safeMarginMm:0,holes:[{x:6,y:17.5,diameter:4},{x:74,y:17.5,diameter:4}]},mountingPreview:{keepoutMm:1}};
 const objects=[motif({x:7.836,y:22.44,w:10.541,h:23.716}),motif({id:'name',x:44.69495,y:21.7213,w:46.3476,h:11.447}),motif({id:'greeting',x:44.983,y:9.432,w:56.707,h:4.585})];
 const r=avoidMounting(objects,profile);assert.deepEqual(r.unresolved,[]);
 for(let i=0;i<objects.length;i++){assert(!touchesMounting(r.objects[i],profile));for(let j=i+1;j<objects.length;j++)if(!overlaps(objects[i],objects[j]))assert(!overlaps(r.objects[i],r.objects[j]));}
});
