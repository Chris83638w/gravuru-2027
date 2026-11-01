import test from 'node:test';
import assert from 'node:assert/strict';
import {assignTargetSeries,designTargetCompatibility,approvedForFamily} from './design-targets.mjs';

const shape=(key,w,h)=>({key,groupKey:'RT1',widthMm:w,heightMm:h,outlinePath:`M0 0H${w}V${h}H0Z`,holesMm:[{x:4,y:h/2,diameterMm:4},{x:w-4,y:h/2,diameterMm:4}]});
const steel={id:'steel',material:{kind:'steel',processingProfileId:'steel-engraving'},designArea:{marginMm:0,keepoutMm:1},groups:[{key:'RT1',shape:'contour'}],sizes:[shape('steel-9x6',90,60),shape('steel-12x8',120,80),shape('steel-30x20',300,200)]};
const acrylic={...structuredClone(steel),id:'acrylic',material:{kind:'acrylic',processingProfileId:'acrylic-engraving'},source:{path:'familien/edelstahl/steel.json'},sizes:steel.sizes.map(s=>({...structuredClone(s),key:s.key.replace('steel','acrylic')}))};
const master={id:'TR1-D14',plate:{widthMm:92,heightMm:64},material:'Edelstahl',process:'Gravur',form:'Retro1',sizes:[],sizesOpen:['TR1-V2A-9x6','TR1-V2A-30x20'],ziele:[{familie:'steel',freigabe:{status:'freigegeben'}},{familie:'acrylic',freigabe:null}]};
const catalog=(target=acrylic)=>({root:'/catalog',files:new Map([['familie:steel','/catalog/familien/edelstahl/steel.json']]),families:new Map([[steel.id,steel],[target.id,target]])});

test('shared Retro target uses only source-authorized identical contours across materials, without changing the master or copying approval',()=>{
 const before=structuredClone(master),k=catalog();
 assert.deepEqual(assignTargetSeries(acrylic,[master],k)[0].sizes,['acrylic-9x6','acrylic-30x20']);
 assert.deepEqual(assignTargetSeries(steel,[master],k)[0].sizes,['steel-9x6','steel-30x20']);
 assert.equal(designTargetCompatibility(master,acrylic,acrylic.sizes[0],{katalog:k}).status,'passt');
 assert.equal(designTargetCompatibility(master,acrylic,acrylic.sizes[1],{katalog:k}).status,'passt nicht');
 assert.equal(approvedForFamily(master,'acrylic',k),false);
 assert.deepEqual(master,before);
});
for(const change of ['contour','holes','dimensions','form'])test(`a different ${change} never inherits the Retro source authorization`,()=>{
 const other=structuredClone(acrylic),s=other.sizes[0];
 if(change==='contour')s.outlinePath='M1 0H90V60H0Z';
 if(change==='holes')s.holesMm[0].x=5;
 if(change==='dimensions')s.widthMm=91;
 if(change==='form'){other.groups[0].key='RT2';for(const size of other.sizes)size.groupKey='RT2';}
 assert(!assignTargetSeries(other,[master],catalog(other))[0].sizes.includes(s.key));
 assert.equal(designTargetCompatibility(master,other,s,{katalog:catalog(other)}).status,'passt nicht');
});
test('empty explicit list stays closed without a known source family and sheet mapping',()=>{
 assert.deepEqual(assignTargetSeries(acrylic,[master],{families:new Map([[acrylic.id,acrylic]])})[0].sizes,[]);
 assert.deepEqual(assignTargetSeries(acrylic,[{...master,sizesOpen:[]}],catalog())[0].sizes,[]);
});

test('an explicitly derived family preserves the source size list for ordinary plates as well as contours',()=>{
 const source={...structuredClone(steel),groups:[{key:'RE',shape:'rect',cornerRadiusMm:0}],designArea:{marginMm:0,keepoutMm:1},sizes:steel.sizes.map(({outlinePath,holesMm,...s})=>({...s,groupKey:'RE'}))};
 const target={...structuredClone(source),id:'acrylic',material:acrylic.material,source:{path:'familien/edelstahl/steel.json'},sizes:source.sizes.map(s=>({...s,key:s.key.replace('steel','acrylic')}))};
 const k={root:'/catalog',files:new Map([['familie:steel','/catalog/familien/edelstahl/steel.json']]),families:new Map([['steel',source],['acrylic',target]])};
 const d={...master,plate:{widthMm:90,heightMm:60},form:'Rechteck',sizes:['steel-9x6'],sizesOpen:[]};
 assert.deepEqual(assignTargetSeries(target,[d],k)[0].sizes,['acrylic-9x6']);
 assert.equal(designTargetCompatibility(d,target,target.sizes[1],{katalog:k}).status,'passt nicht','must not silently open other same-ratio source sizes');
 target.sizes[0].cornerRadiusMm=3;
 assert.deepEqual(assignTargetSeries(target,[d],k)[0].sizes,[],'a provenance link does not authorize changed geometry');
});
