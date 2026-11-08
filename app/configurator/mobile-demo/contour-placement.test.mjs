import test from 'node:test';
import assert from 'node:assert/strict';
import {planContourPlacement} from './contour-placement.mjs';

function item(id,pattern,x,y,extra={}) {
  const width=pattern[0].length,height=pattern.length;
  assert.ok(pattern.every(row=>row.length===width));
  return {object:{id,type:'motif',x:x+width/2,y:y+height/2,w:width,h:height,rotation:0,...extra},
    mask:{id,width,height,originX:x,originY:y,data:Uint8Array.from(pattern.join(''),cell=>cell==='#'?1:0)}};
}
const square=(id,x,y,size=4,extra={})=>item(id,Array(size).fill('#'.repeat(size)),x,y,extra);
const scene=(items,options={})=>({objects:items.map(value=>value.object),masks:items.map(value=>value.mask),width:32,height:24,
  scaleX:1,scaleY:1,movableIds:items.map(value=>value.object.id),canMove:()=>true,accepts:()=>true,yieldControl:async()=>{},...options});
const changed=(input,result)=>input.objects.map(object=>({...object,...result.moves.find(move=>move.id===object.id)}));
function pixels(mask,dx=0,dy=0) {
  const result=new Set();
  for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++)if(mask.data[y*mask.width+x])result.add((mask.originX+x+dx)+','+(mask.originY+y+dy));
  return result;
}
const overlap=(a,b,dx=0,dy=0)=>{const one=pixels(a,dx,dy),two=pixels(b);return [...one].filter(value=>two.has(value)).length;};

test('moves to touching ink by the nearest pixel translation, without a gap or any geometry/content edit',async()=>{
  const one=square('text',5,5,4,{type:'text',text:'Original\nZeilen',font:'Original',size:8,lineHeight:11,rotation:27});
  const two=square('motif',7,5),input=scene([one,two],{movableIds:['text']}),before=structuredClone(input.objects),maskBefore=input.masks.map(mask=>[...mask.data]);
  const result=await planContourPlacement(input);
  assert.equal(result.ok,true);assert.deepEqual(result.moves,[{id:'text',x:5,y:7}]);
  assert.deepEqual(input.objects,before);assert.deepEqual(input.masks.map(mask=>[...mask.data]),maskBefore);
  const moved=changed(input,result);assert.deepEqual({...moved[0],x:before[0].x,y:before[0].y},before[0]);assert.deepEqual(moved[1],before[1]);
  assert.equal(overlap(one.mask,two.mask,-2,0),0);assert.equal(overlap(one.mask,two.mask,-1,0),4);
});

test('optional clearance adds one small gap, not double padding, and verifies through the same readonly path',async()=>{
  const one=square('text',5,5,4,{type:'text',text:'Original',font:'Original',size:8,rotation:27}),two=square('motif',7,5);
  const input=scene([one,two],{movableIds:['text'],clearancePixels:2}),before=structuredClone(input.objects);
  const result=await planContourPlacement(input);
  assert.equal(result.ok,true);assert.deepEqual(result.moves,[{id:'text',x:3,y:7}]);
  assert.deepEqual(input.objects,before);
  const dx=result.moves[0].x-one.object.x,dy=result.moves[0].y-one.object.y;
  const moved={object:changed(input,result)[0],mask:{...one.mask,originX:one.mask.originX+dx,originY:one.mask.originY+dy}};
  const checked=await planContourPlacement(scene([moved,two],{movableIds:['text'],clearancePixels:2,canMove:()=>false}));
  assert.equal(checked.ok,true);assert.deepEqual(checked.moves,[]);
  moved.mask.originX++;moved.object.x++;
  assert.equal((await planContourPlacement(scene([moved,two],{movableIds:['text'],clearancePixels:2,canMove:()=>false}))).ok,false,'one less pixel no longer preserves the requested gap');
});

test('clearance does not invent an outer plate margin or move an unrelated unreported neighboring pair',async()=>{
  const one=square('a',0,0,2),two=square('b',0,0,2),edgeAccepts=object=>object.x===1&&object.y-object.h/2>=0;
  const result=await planContourPlacement(scene([one,two],{movableIds:['a'],clearancePixels:2,accepts:edgeAccepts}));
  assert.equal(result.ok,true);assert.deepEqual(result.moves,[{id:'a',x:1,y:5}]);
  assert.deepEqual((await planContourPlacement(scene([one],{clearancePixels:2,canMove:()=>false}))).moves,[]);
  const photo=square('photo',12,12,2,{type:'photoSlot'}),logo=square('logo',14,12,2,{type:'image',uxUploadKind:'logo'});
  assert.equal((await planContourPlacement(scene([photo,logo],{movableIds:[],clearancePixels:2}))).ok,true);
});

test('conservative clearance dilation matches a scalar distance oracle across packed word edges',async()=>{
  let seed=198234;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let n=0;n<36;n++){
    const w=[1,31,32,33,63,65][n%6],pattern=()=>Array.from({length:3},()=>Array.from({length:w},()=>random()<.08?'#':'.').join(''));
    const a=item('a',pattern(),Math.floor(random()*22)-8,3),b=item('b',pattern(),Math.floor(random()*22)-8,1),radius=n%4;
    a.mask.data[0]=1;b.mask.data[0]=1;
    const one=[...pixels(a.mask)].map(point=>point.split(',').map(Number)),two=[...pixels(b.mask)].map(point=>point.split(',').map(Number));
    const blocked=one.some(([x,y])=>two.some(([bx,by])=>Math.abs(x-bx)<=radius&&Math.abs(y-by)<=radius));
    const result=await planContourPlacement(scene([a,b],{width:160,height:20,clearancePixels:radius,canMove:()=>false}));
    assert.equal(result.ok,!blocked,`case ${n}, radius ${radius}, width ${w}`);
  }
});

test('clearance preserves true intentional overlaps but cannot waive a merely close new pair',async()=>{
  const a=square('ornament',5,5,2),b=square('text',6,5,2),extra=square('extra',6,6,2);
  const preserved=await planContourPlacement(scene([a,b,extra],{clearancePixels:1,movableIds:['text','extra'],ignorePair:(one,two)=>[one.id,two.id].includes('ornament')&&[one.id,two.id].includes('text')}));
  assert.equal(preserved.ok,true);assert.deepEqual(preserved.moves.map(move=>move.id),['extra']);
  const close=square('close',7,5,2);
  const rejected=await planContourPlacement(scene([a,close],{clearancePixels:1,canMove:()=>false,ignorePair:()=>true}));
  assert.equal(rejected.ok,false,'only a real source overlap can be waived');
});

test('clearance expansion remains budgeted and cooperatively cancellable',async()=>{
  const one=square('a',5,5),input=scene([one],{clearancePixels:150});
  const rejected=await planContourPlacement({...input,maxMaskPixels:100});
  assert.equal(rejected.reason,'mask-budget');assert.deepEqual(rejected.moves,[]);
  const controller=new AbortController();let yields=0;
  const cancelled=await planContourPlacement({...input,signal:controller.signal,yieldControl:async()=>{yields++;controller.abort();}});
  assert.equal(cancelled.reason,'cancelled');assert.equal(yields,1);assert.deepEqual(cancelled.moves,[]);
});

test('transparent inner areas and pre-rendered rotated contours do not collide just because boxes overlap',async()=>{
  const ring=item('ring',['#####','#...#','#...#','#...#','#####'],4,4,{rotation:35});
  const inside=item('text',['##','##'],5,5,{type:'text',text:'A',font:'Original',size:4});
  const result=await planContourPlacement(scene([ring,inside],{movableIds:['text']}));
  assert.equal(result.ok,true);assert.deepEqual(result.moves,[]);
  const diagonal=item('diagonal',['#....','.#...','..#..','...#.','....#'],4,4,{rotation:45});
  const offDiagonal=item('photo',['#'],5,4,{type:'photoSlot',photoShape:'heart',uxUploadId:'immutable-photo',uxPhotoCrop:{zoom:1.3,angle:18}});
  const second=await planContourPlacement(scene([diagonal,offDiagonal],{movableIds:['photo']}));
  assert.equal(second.ok,true);assert.deepEqual(second.moves,[]);
});

test('supports full shared rasters, local padded masks and negative origins without losing outside pixels',async()=>{
  const one=square('a',5,5),two=square('b',7,5),input=scene([one,two],{movableIds:['a']});
  const local=await planContourPlacement(input);
  input.masks=input.masks.map(mask=>{const data=new Uint8Array(input.width*input.height);for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++)data[(y+mask.originY)*input.width+x+mask.originX]=mask.data[y*mask.width+x];return {id:mask.id,data};});
  assert.deepEqual((await planContourPlacement(input)).moves,local.moves);
  const outside=item('a',['####'], -2,2),fixed=item('b',['#'],10,4);
  const boundary=await planContourPlacement(scene([outside,fixed],{movableIds:['a'],accepts:o=>o.x-o.w/2>=0}));
  assert.equal(boundary.ok,true);assert.deepEqual(boundary.moves,[{id:'a',x:2,y:2.5}]);
});

test('bit-packed intersection matches a scalar oracle across word boundaries and signed offsets',async()=>{
  let seed=918273;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let n=0;n<60;n++){
    const w=[1,31,32,33,63,65][n%6],h=3,pattern=()=>Array.from({length:h},()=>Array.from({length:w},()=>random()<.15?'#':'.').join(''));
    const a=item('a',pattern(),Math.floor(random()*34)-12,2),b=item('b',pattern(),Math.floor(random()*34)-12,1);
    a.mask.data[0]=1;b.mask.data[0]=1;
    const minimum=n%5+1,expected=overlap(a.mask,b.mask)>=minimum;
    const result=await planContourPlacement(scene([a,b],{width:160,height:20,canMove:()=>false,minimumOverlapPixels:minimum}));
    assert.equal(result.ok,!expected,`case ${n}, width ${w}, minimum ${minimum}`);
  }
});

test('native boundary callback, physical scale and surface identity remain authoritative',async()=>{
  const one=square('a',5,5),two=square('b',7,5);
  one.object.x/=2;one.object.y/=4;two.object.x/=2;two.object.y/=4;
  const calls=[],input=scene([one,two],{scaleX:2,scaleY:4,movableIds:['a'],accepts:object=>{calls.push(object);return object.y>=one.object.y&&object.x>=one.object.x;}});
  const result=await planContourPlacement(input);assert.equal(result.ok,true);assert.equal(result.moves[0].y,one.object.y+1,'four vertical pixels are one native unit');
  assert.ok(calls.length>0);assert.ok(calls.every(object=>object.w===one.object.w&&object.rotation===one.object.rotation));
  const back={...two,object:{...two.object,surfaceId:'back'}};
  assert.deepEqual((await planContourPlacement(scene([one,back]))).moves,[]);
  const rejected=await planContourPlacement(scene([one,two],{movableIds:['a'],accepts:()=>false,maxCandidates:100}));
  assert.equal(rejected.ok,false);assert.deepEqual(rejected.moves,[]);
});

test('locked requested elements stay in place while another permitted conflict partner may move',async()=>{
  const locked=square('locked',5,5,4,{technicalLocked:true}),free=square('free',7,5);
  const input=scene([locked,free],{canMove:object=>!object.technicalLocked});
  const result=await planContourPlacement(input);assert.equal(result.ok,true);assert.deepEqual(result.moves,[{id:'free',x:11,y:7}]);
  const rejected=await planContourPlacement({...input,movableIds:['locked']});
  assert.equal(rejected.ok,false);assert.deepEqual(rejected.moves,[]);assert.deepEqual(input.objects,[locked.object,free.object]);
});

test('existing permitted overlaps stay coupled and unchanged, yet block a third object',async()=>{
  const a=square('ornament',5,5),b=square('template-text',7,5),c=square('extra',6,6,2);
  const input=scene([a,b,c],{movableIds:['template-text','extra'],ignorePair:(a,b)=>[a.id,b.id].includes('ornament')&&[a.id,b.id].includes('template-text')});
  const result=await planContourPlacement(input);assert.equal(result.ok,true);assert.deepEqual(result.moves.map(move=>move.id),['extra']);
  const after=changed(input,result);assert.deepEqual(after.slice(0,2),input.objects.slice(0,2));
  assert.equal((await planContourPlacement({...input,movableIds:['template-text']})).ok,false);
});

test('a broad ignore-pair predicate cannot create a new overlap that was absent in the source',async()=>{
  const a=square('a',5,5,2),b=square('b',7,5,2),c=square('c',5,5,2);
  const input=scene([a,b,c],{movableIds:['a'],ignorePair:(a,b)=>[a.id,b.id].includes('b')});
  const result=await planContourPlacement(input);assert.equal(result.ok,true);
  const move=result.moves[0],dx=move.x-a.object.x,dy=move.y-a.object.y;
  assert.equal(overlap(a.mask,b.mask,dx,dy),0);assert.equal(overlap(a.mask,c.mask,dx,dy),0);
});

test('photo and logo blockers preserve their original fields and do not gain an independent validation rule',async()=>{
  const one=square('text',5,5,4,{type:'text',text:'A',size:7}),photo=square('photo',7,5,4,{type:'photoSlot',photoShape:'heart',photoMaskAssetId:'mask',uxPhotoCrop:{zoom:2},uxUploadId:'photo-original'});
  const logo=square('logo',20,12,4,{type:'image',uxUploadKind:'logo',uxVectorLogo:'immutable-vector',uxUploadId:'logo-original'});
  const input=scene([one,photo,logo],{movableIds:['text']}),before=structuredClone(input.objects);
  const result=await planContourPlacement(input);assert.equal(result.ok,true);assert.deepEqual(changed(input,result).slice(1),before.slice(1));
  const existing=square('photo-2',7,5,4,{type:'photoSlot'});
  const noGate=await planContourPlacement(scene([photo,existing],{movableIds:[]}));assert.equal(noGate.ok,true);assert.deepEqual(noGate.moves,[]);
});

test('invisible and guide objects are ignored, but missing/empty artwork is not accepted as free space',async()=>{
  const a=square('a',5,5),hidden=square('hidden',5,5,4,{uxHidden:true}),guide=square('guide',5,5,4,{role:'guide'});
  const input=scene([a,hidden,guide],{masks:[a.mask],movableIds:['a']});assert.equal((await planContourPlacement(input)).ok,true);
  assert.equal((await planContourPlacement({...input,masks:[]})).reason,'missing-mask');
  const empty={...a.mask,data:new Uint8Array(a.mask.data.length)};
  assert.equal((await planContourPlacement({...input,masks:[empty]})).reason,'empty-mask');
});

test('a failed second translation returns no partial plan and never mutates a successfully considered first object',async()=>{
  const a=square('a',5,5),b=square('b',7,5),c=square('c',20,5),d=square('d',20,5);
  const input=scene([a,b,c,d],{movableIds:['a','c'],canMove:object=>object.id!=='c'}),before=structuredClone(input.objects);
  const result=await planContourPlacement(input);assert.equal(result.ok,false);assert.equal(result.reason,'no-placement');assert.deepEqual(result.moves,[]);assert.deepEqual(input.objects,before);
});

test('coarse search is deterministic and refines its successful position to the nearest local pixel',async()=>{
  const a=square('a',24,24,12),b=square('b',24,24,12),input=scene([a,b],{width:80,height:80,movableIds:['a'],gridStepPixels:7});
  const one=await planContourPlacement(input),two=await planContourPlacement(input);
  assert.deepEqual(one,two);assert.equal(one.ok,true);assert.deepEqual(one.moves,[{id:'a',x:30,y:18}]);
  assert.equal(overlap(a.mask,b.mask,0,-12),0);assert.ok(overlap(a.mask,b.mask,0,-11)>0);
});

test('candidate/work/memory budgets and cancellation fail closed, with cooperative yielding during a long search',async()=>{
  const a=square('a',5,5),b=square('b',5,5),base=scene([a,b],{movableIds:['a'],accepts:()=>false});
  let yields=0;const capped=await planContourPlacement({...base,maxCandidates:20,yieldEvery:4,yieldControl:async()=>{yields++;}});
  assert.equal(capped.reason,'candidate-budget');assert.equal(capped.examined,20);assert.ok(yields>=5);assert.deepEqual(capped.moves,[]);
  assert.equal((await planContourPlacement({...base,maxMaskPixels:1})).reason,'mask-budget');
  assert.equal((await planContourPlacement({...base,maxObjects:1})).reason,'object-budget');
  assert.equal((await planContourPlacement({...base,accepts:()=>true,maxWordChecks:1})).reason,'work-budget');
  const controller=new AbortController();const stopped=await planContourPlacement({...base,yieldEvery:1,signal:controller.signal,yieldControl:async()=>controller.abort()});
  assert.equal(stopped.reason,'cancelled');assert.deepEqual(stopped.moves,[]);
});

test('invalid identity, raster and callback contracts reject explicitly',async()=>{
  const a=square('a',5,5),input=scene([a]);
  await assert.rejects(planContourPlacement({...input,objects:[a.object,a.object]}),/Elementkennung/);
  await assert.rejects(planContourPlacement({...input,masks:[{...a.mask,data:new Uint8Array(1)}]}),/Maskenraster/);
  await assert.rejects(planContourPlacement({...input,masks:[a.mask,a.mask]}),/Maske/);
  await assert.rejects(planContourPlacement({...input,scaleX:0}),/Maßstab/);
  await assert.rejects(planContourPlacement({...input,canMove:undefined}),/Rechte/);
  await assert.rejects(planContourPlacement({...input,clearancePixels:-1}),/Kontursuche/);
  await assert.rejects(planContourPlacement({...input,clearancePixels:1.5}),/Kontursuche/);
  await assert.rejects(planContourPlacement({...input,movableIds:['missing']}),/fehlt/);
});
