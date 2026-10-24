import test from 'node:test';
import assert from 'node:assert/strict';
import {measureText,textPaths,setTextSize} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {transformedObject} from '../../platform/sources/app/shared/models/design-content.mjs';
import {scaleObject} from './image-processing.mjs';
import {resizeSteelDocument} from './steel-formats.mjs';
import {fitObject} from './design-edit.mjs';
import {containAcrylicObject} from './acrylic-product.mjs';
const fonts={Source:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0L500 0L500 700Z'}}}}};
const text=()=>measureText({id:'t',type:'text',text:'A\nAA',font:'Source',size:4,lineHeight:6.81,textAnchor:'start',letterSpacing:0,x:45,y:30,rotation:0,color:'#000000'},fonts);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
const baselines=o=>[...textPaths(o,fonts).matchAll(/<g transform="translate\(0 ([^ )]+)/g)].map(m=>Number(m[1]));
function proportional(before,after){const ratio=after.size/before.size;near(after.lineHeight,before.lineHeight*ratio);const oldY=baselines(before),newY=baselines(after);near(newY[1]-newY[0],(oldY[1]-oldY[0])*ratio);assert.equal(after.textAnchor,before.textAnchor);}
test('LF2 leading follows customer scale handles and the actual clamped font size',()=>{
 const before=text(),large=scaleObject(before,2);measureText(large,fonts);proportional(before,large);near(large.h,before.h*2);
 const clamped=scaleObject(before,.1);proportional(before,clamped);assert.equal(clamped.size,4);assert.deepEqual(before,text(),'source is not changed');
 const implicit={type:'text',size:4};setTextSize(implicit,8);assert.equal(Object.hasOwn(implicit,'lineHeight'),false,'legacy implicit 1.2 leading stays implicit');
});
test('LF2 steel form resizing scales real glyph baselines on front and back uniformly',()=>{
 const objects=[{...text(),id:'front',surfaceId:'front'},{...text(),id:'back',surfaceId:'back'}];
 const doc={config:{basePriceCents:100,profile:{material:{kind:'steel'},geometry:{width:90,height:60,cornerRadiusMm:0,safeMarginMm:2,shape:'rect',holes:[]},optionGroups:[],designs:[{id:'d',objects,marks:[]}]},localResources:{fonts}}};
 const changed=resizeSteelDocument(doc,{width:180,height:120,safeMarginMm:4});
 for(let i=0;i<objects.length;i++){const after=changed.config.profile.designs[0].objects[i];proportional(objects[i],after);near(after.lineHeight,13.62);near(after.h,23.22);assert.equal(after.surfaceId,objects[i].surfaceId);}
 assert.equal(doc.config.profile.geometry.width,90);
});
test('LF2 shared pointer gesture and containment preserve proportional line spacing',()=>{
 const before=text(),start={x:before.x+before.w/2,y:before.y+before.h/2};
 const after=transformedObject(before,{kind:'resize',start},{x:before.x+before.w,y:before.y+before.h},fonts,measureText);proportional(before,after);near(after.h,before.h*2);
 const fitted=fitObject(before,{width:3,height:20});proportional(before,fitted);assert.ok(fitted.size<before.size);
 const acrylic={...before,w:200,h:200};containAcrylicObject(acrylic);proportional(before,acrylic);assert.ok(acrylic.size<before.size);
});
