import test from 'node:test';
import assert from 'node:assert/strict';
import {photoCrop,photoPlacement,panPhoto} from './photo-position-model.mjs';
import {restoreElementRights} from './element-rights.mjs';
import {mapPersonalObjects} from './field-mapping.mjs';

test('portrait and landscape uploads start covered and preserve aspect ratio during free resizing',()=>{
  const slot={w:100,h:140,photoShape:'arch'};
  for(const asset of [{width:1600,height:900},{width:900,height:1600}])for(const zoom of [1,2,4])for(const x of [0])for(const y of [0]){
    const p=photoPlacement(slot,asset,{zoom,x,y});
    assert(p.x<=-slot.w/2+1e-8&&p.y<=-slot.h/2+1e-8);
    assert(p.x+p.w>=slot.w/2-1e-8&&p.y+p.h>=slot.h/2-1e-8);
    assert(Math.abs(p.w/p.h-asset.width/asset.height)<1e-8);
  }
});
test('pan works at 100% even without overhang and respects rotated slot coordinates',()=>{
  const slot={w:100,h:100,rotation:90},asset={width:100,height:100};
  const crop=panPhoto(slot,asset,{zoom:2,x:0,y:0},25,0);
  assert(Math.abs(crop.x)<1e-8);assert.equal(crop.y,-.5);
  assert.deepEqual(panPhoto(slot,asset,{zoom:1},25,25),{zoom:1,x:.5,y:-.5,angle:0});
  assert.deepEqual(slot,{w:100,h:100,rotation:90});
  assert.deepEqual(photoCrop({zoom:Infinity,x:80,y:-80}),{zoom:1,x:1,y:-1,angle:0});
});
test('photo replacement rights allow crop but preserve fixed mask, and deny crop when read-only',()=>{
  const slot={id:'photo',type:'photoSlot',fieldKey:'portrait',w:100,h:140,x:50,y:70,photoShape:'arch'};
  const changed={...slot,x:99,uxUploadId:'upload',uxPhotoCrop:{zoom:2,x:.4,y:0}};
  const allowed=restoreElementRights([slot],[changed],{photo:{replace:true}}).objects[0];
  assert.equal(allowed.x,50);assert.deepEqual(allowed.uxPhotoCrop,changed.uxPhotoCrop);
  assert.deepEqual(restoreElementRights([slot],[changed],{photo:{}}).objects,[slot]);
  const transferred=mapPersonalObjects([changed],[{...slot,id:'new-photo'}]).objects[0];
  assert.deepEqual(transferred.uxPhotoCrop,changed.uxPhotoCrop);assert.equal(transferred.x,50);
});
