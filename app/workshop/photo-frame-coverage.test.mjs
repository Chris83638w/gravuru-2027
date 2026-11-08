import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {photoFrameCovered as covered} from './photo-frame-coverage.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {photoShape} from '../platform/sources/app/shared/models/photo-shape.mjs';
import {importEnvironment} from './design-assets.mjs';

const photo={width:1200,height:1200},slot={type:'photoSlot',w:100,h:100,photoShape:'rect'};
test('photo coverage detects pan, shrink and rotation without changing free placement',()=>{
 assert.equal(covered(slot,photo),true);
 for(const uxPhotoCrop of [{zoom:.5},{x:.2},{angle:45}])assert.equal(covered({...slot,uxPhotoCrop},photo),false);
 assert.equal(covered({...slot,uxPhotoCrop:{zoom:2,x:.2,angle:45}},photo),true);
 assert.equal(covered({...slot,rotation:45},photo),true);
 assert.equal(covered({...slot,type:'image'},photo),null);
 assert.equal(slot.uxPhotoCrop,undefined);
});
test('circle, ellipse and arch coverage use their masks instead of rectangular corners',()=>{
 assert.equal(covered({...slot,photoShape:'circle',uxPhotoCrop:{angle:45}},photo),true);
 assert.equal(covered({...slot,photoShape:'ellipse',w:80,uxPhotoCrop:{angle:30}},photo),true);
 const arch={...slot,h:150,photoShape:'arch',uxPhotoCrop:{zoom:1.1,y:20/75,angle:45}};
 assert.equal(covered(arch,photo),true);
 assert.equal(covered({...arch,photoShape:'rect'},photo),false);
 assert.equal(covered({...arch,uxPhotoCrop:{...arch.uxPhotoCrop,zoom:.9}},photo),false);
});
test('coverage agrees with independently rasterized real mask and photo transforms',()=>{
 for(const item of [slot,{...slot,uxPhotoCrop:{x:.3,angle:25}},{...slot,photoShape:'circle',uxPhotoCrop:{angle:45}},{...slot,h:150,photoShape:'arch',uxPhotoCrop:{zoom:1.1,y:20/75,angle:45}}]){
  const p=photoPlacement(item,photo),shape=photoShape(item)+'/>';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="-100 -150 200 300"><defs><clipPath id="mask">${shape}</clipPath></defs><g fill="black">${shape}</g><g clip-path="url(#mask)"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="white" transform="rotate(${p.angle} ${p.cx} ${p.cy})"/></g></svg>`;
  const dark=Number(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"import sys,io,cairosvg;from PIL import Image;im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=sys.stdin.buffer.read()))).convert('RGBA');print(sum(1 for r,g,b,a in im.getdata() if a==255 and r<10 and g<10 and b<10))"],{input:svg,env:importEnvironment()}).toString());
  assert.equal(covered(item,photo),dark===0,JSON.stringify({item,dark}));
 }
});
