import test from 'node:test';
import assert from 'node:assert/strict';
import {smallMotifLayout,visibleMotifAction} from './small-motif-controls.mjs';

test('small motif target is 44 screen pixels at every product zoom without changing artwork',()=>{
  for (const scale of [.5,1,2,4]) {
    const object={type:'motif',x:4,y:4,w:3,h:6,rotation:0},before=structuredClone(object);
    const layout=smallMotifLayout(object,scale);
    assert.equal(layout.width*scale,44);assert.equal(layout.height*scale,44);
    assert.deepEqual(object,before);
  }
});
test('delete stays visible at the product edge without covering the central grab target',()=>{
  assert.deepEqual(visibleMotifAction([{x:415,y:180},{x:295,y:180}],390,600),{x:295,y:180});
  assert.deepEqual(visibleMotifAction([{x:25,y:180},{x:-95,y:180}],390,600),{x:25,y:180});
  assert.deepEqual(visibleMotifAction([{x:415,y:180},{x:-25,y:180},{x:195,y:240}],390,600),{x:195,y:240});
});
test('44 pixel resize hit squares never enter the central grab area, including rotated motifs',()=>{
  for (const [w,h] of [[3,6],[1,90],[90,1],[43,43]])for(let deg=0;deg<360;deg+=5){
    const layout=smallMotifLayout({type:'motif',w,h,rotation:deg},1);
    const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    // Test every corner of the central rotated rectangle against all handle
    // squares by the separating axis theorem, including the rectangle axes.
    for(const x of [-1,1])for(const y of [-1,1]){
      const dx=x*layout.cornerX*c-y*layout.cornerY*s,dy=x*layout.cornerX*s+y*layout.cornerY*c;
      const separated=Math.abs(dx*c+dy*s)>layout.width/2+22*(Math.abs(c)+Math.abs(s)) ||
        Math.abs(-dx*s+dy*c)>layout.height/2+22*(Math.abs(c)+Math.abs(s));
      assert.ok(separated,`${w}x${h} at ${deg}°`);
    }
  }
});
test('normal motifs and non-motif, uploaded, hidden or locked elements keep their existing controls',()=>{
  assert.equal(smallMotifLayout({type:'motif',w:44,h:44},1),null);
  for(const extra of [{type:'text'},{type:'photoSlot'},{uxUploadId:'u'},{uxUploadKind:'logo'},{uxVectorLogo:true},{role:'guide'},{uxLocked:true},{locked:true},{technicalLocked:true},{uxHidden:true},{acrylicFixed:true},{customerEditable:false}])
    assert.equal(smallMotifLayout({type:'motif',w:4,h:5,...extra},1),null);
  for(const scale of [0,-1,NaN,Infinity])assert.equal(smallMotifLayout({type:'motif',w:4,h:5},scale),null);
});
