import test from 'node:test';
import assert from 'node:assert/strict';
import {combineScalableSizes,validateScalableSizes,sizeConfiguration} from './scalable-sizes.mjs';
import {selectedProfile,quote,resolvedOptions,variantCombinations} from './contract.mjs';
import {scalableSizeState} from './scalable-size-state.mjs';
import {customerRightsTemplate} from './customer-rights.mjs';
import {artworkViewport} from './print-geometry.mjs';
const make=(width,height,basePriceCents,scale,offset)=>({basePriceCents,extraMotifCents:169,photo:{enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:1299},profile:{id:'p',revision:'1',binding:{kind:'local-review',productId:null},material:{kind:'slate'},geometry:{width,height,shape:'rect',holes:[]},defaultDesignId:'d',optionGroups:[{id:'mounting',name:'Befestigung',defaultValueId:'none',values:[{id:'none',priceCents:0,holes:[]},{id:'two',priceCents:299,holes:[{x:width===220?17:19,y:height/2,diameter:4}]}]}],designs:[{id:'d',katalog:{scale,offsetMm:offset},objects:[{id:'t',type:'text',text:'Bruno',x:40*scale+offset[0],y:30*scale+offset[1],w:20*scale,h:10*scale,size:8*scale,lineHeight:10*scale},{id:'m',type:'motif',motif:'dog',x:100*scale+offset[0],y:50*scale+offset[1],w:20*scale,h:20*scale}]}]}});
const entries=[{id:'22x14',label:'22 × 14 cm',config:make(220,140,1999,1.4,[5,0])},{id:'30x20',label:'30 × 20 cm',config:make(300,200,2499,2,[0,0])}];
const config=combineScalableSizes(entries,'22x14');
test('one size selection controls price, geometry, rights template and print scale',()=>{
 for(const [size,width,cents,x]of [['22x14',220,1999,17],['30x20',300,2499,19]]){
  const options={size,mounting:'two'},profile=selectedProfile(config,options),state={mOptions:options,designId:'d'};
  assert.equal(profile.geometry.width,width);assert.equal(profile.geometry.holes[0].x,x);assert.equal(profile.geometry.holes[0].diameter,4);
  assert.equal(quote(config,profile.designs[0].objects,'d',options).unitCents,cents+299);
  assert.deepEqual(customerRightsTemplate(config,state),profile.designs[0]);
  assert.deepEqual(artworkViewport(config,state),{geometry:profile.geometry,scale:1,x:0,y:0});
 }
 assert.equal(variantCombinations(config).length,4);
 assert.equal(config.profile.optionGroups.find(g=>g.id==='size').values.find(v=>v.id==='30x20').priceCents,500);
 assert.throws(()=>resolvedOptions(config,{size:'invented'}),/Größe/);
});
test('roundtrip preserves customer text, moved geometry, extra motif/photo and selection',()=>{
 const source=selectedProfile(config,{size:'22x14'}).designs[0];
 const state={designId:'d',selected:'t',mOptions:{size:'22x14',mounting:'none'},objects:structuredClone(source.objects)};
 state.objects[0].text='Alima';state.objects[0].x+=3;
 state.objects.push({id:'extra',type:'motif',motif:'flower',x:40,y:80,w:12,h:16},{id:'upload',type:'photoSlot',x:100,y:40,w:20,h:30,uxUploadId:'opaque',uxUploadKind:'photo'});
 const large=scalableSizeState(config,state,{size:'30x20',mounting:'none'}),back=scalableSizeState(config,large,{size:'22x14',mounting:'none'});
 assert.equal(large.width,300);assert.equal(large.objects[0].text,'Alima');assert.equal(large.objects[3].uxUploadId,'opaque');
 assert.equal(back.selected,'t');assert.equal(back.objects.length,state.objects.length);
 for(let i=0;i<state.objects.length;i++)for(const key of ['x','y','w','h','size','lineHeight'])if(Number.isFinite(state.objects[i][key]))assert.ok(Math.abs(back.objects[i][key]-state.objects[i][key])<1e-8,key);
 assert.equal(quote(config,large.objects,'d',large.mOptions).additionalMotifs,1);
});
test('unsupported or inconsistent size definitions fail closed',()=>{
 for(const mutate of [c=>c.scalableSizes.defaultSizeId='missing',c=>c.scalableSizes.sizes[1].basePriceCents=-1,c=>c.scalableSizes.sizes[1].id='22x14',c=>c.scalableSizes.sizes[1].profile.material.kind='steel',c=>c.scalableSizes.sizes[1].profile.designs=[]]){
  const invalid=structuredClone(config);mutate(invalid);assert.throws(()=>validateScalableSizes(invalid));
 }
 assert.equal(sizeConfiguration(config,{size:'30x20'}).profile.id,config.profile.id);
});

test('size-specific original artwork and mask references transfer exactly, while customer replacements and crop stay unchanged',()=>{
 const c=structuredClone(config),small=c.scalableSizes.sizes[0].profile.designs[0],large=c.scalableSizes.sizes[1].profile.designs[0];
 Object.assign(small.objects[1],{motif:'small-original',assetId:'small-asset',photoMaskAssetId:'small-mask'});
 Object.assign(large.objects[1],{motif:'large-original',assetId:'large-asset',photoMaskAssetId:'large-mask',w:28.571428571428577});
 const original={designId:'d',selected:'m',mOptions:{size:'22x14',mounting:'none'},objects:structuredClone(small.objects)};
 const moved=scalableSizeState(c,original,{size:'30x20',mounting:'none'}).objects[1];
 for(const key of ['motif','assetId','photoMaskAssetId','w'])assert.equal(moved[key],large.objects[1][key],key);
 const edited=structuredClone(original);Object.assign(edited.objects[1],{motif:'customer-motif',assetId:'customer-asset',photoMaskAssetId:'customer-mask',uxUploadId:'upload-1',uxPhotoCrop:{zoom:1.2,x:0.1,y:-0.1,angle:5}});
 const retained=scalableSizeState(c,edited,{size:'30x20',mounting:'none'}).objects[1];
 for(const key of ['motif','assetId','photoMaskAssetId','uxUploadId','uxPhotoCrop'])assert.deepEqual(retained[key],edited.objects[1][key],key);
 assert.deepEqual(original.objects,small.objects,'source composition remains unchanged');
});
