import test from 'node:test';
import assert from 'node:assert/strict';
import {motifTileViewBox,transformedInkBounds,motifInkBounds,fitMotifTile,setMotifTilePending} from './motif-tile-fit.mjs';
const identity={a:1,b:0,c:0,d:1,e:0,f:0};
const paint={display:'inline',visibility:'visible',opacity:'1',fill:'#000',fillOpacity:'1',stroke:'none',strokeOpacity:'1',strokeWidth:'1'};
const node=(box,matrix=identity,style=paint,definition=false)=>({localName:'path',style,getBBox:()=>box,getScreenCTM:()=>matrix,closest:()=>definition?{}:null});
const svg=nodes=>({querySelectorAll:()=>nodes,getScreenCTM:()=>({inverse:()=>({multiply:matrix=>matrix})})});

test('off-centre and elongated ink is framed by its own bounds, with even padding',()=>{
 assert.deepEqual(motifTileViewBox({x:200,y:-100,width:300,height:15}),[176,-124,348,63]);
 assert.deepEqual(motifTileViewBox({x:15,y:50,width:0,height:200}),[-1,34,32,232]);
 assert.equal(motifTileViewBox({x:0,y:0,width:0,height:0}),null);
 assert.equal(motifTileViewBox({x:NaN,y:0,width:20,height:20}),null);
});
test('stroked straight lines keep their full thickness after nested transforms',()=>{
 assert.deepEqual(transformedInkBounds({x:0,y:10,width:200,height:0},{a:0,b:2,c:-2,d:0,e:30,f:40},4),{x:6,y:36,width:8,height:408});
});
test('ink union includes transformed line strokes but excludes definitions and invisible marks',()=>{
 const nodes=[node({x:10,y:20,width:20,height:40}),node({x:0,y:0,width:100,height:0},{...identity,e:-20,f:10},{...paint,fill:'none',stroke:'#000',strokeWidth:'4'}),node({x:-999,y:-999,width:999,height:999},identity,paint,true),node({x:-500,y:-500,width:50,height:50},identity,{...paint,opacity:'0'})];
 assert.deepEqual(motifInkBounds(svg(nodes),{style:n=>n.style}),{x:-22,y:8,width:104,height:52});
});

test('nested SVG thumbnails measure in a shared screen coordinate system',()=>{
 const child=node({x:0,y:20,width:200,height:160},{a:1,b:0,c:0,d:1,e:30,f:50});
 child.getCTM=()=>{throw new Error('nearest viewport coordinates are not comparable');};
 const picture={querySelectorAll:()=>[child],getCTM:child.getCTM,getScreenCTM:()=>({inverse:()=>({multiply:m=>({a:m.a/2,b:m.b/2,c:m.c/2,d:m.d/2,e:(m.e-30)/2,f:(m.f-50)/2})})})};
 assert.deepEqual(motifInkBounds(picture,{style:n=>n.style}),{x:0,y:10,width:100,height:80});
});
test('thumbnail fitting changes only the outer viewport, preserving path geometry and aspect ratio',()=>{
 const attrs=new Map(),picture={setAttribute:(k,v)=>attrs.set(k,v)},tile={querySelector:()=>picture,setAttribute:(k,v)=>attrs.set(k,v)};
 assert.equal(fitMotifTile(tile,{measure:()=>({x:-50,y:0,width:100,height:10})}),true);
 assert.equal(attrs.get('viewBox'),'-58 -8 116 26');assert.equal(attrs.get('preserveAspectRatio'),'xMidYMid meet');
 assert.equal(fitMotifTile(tile,{measure:()=>null}),false);
});
test('empty lazy cards are disabled until ready and preserve an existing disabled state',()=>{
 for(const disabled of [false,true]){
  const attrs=new Map(),tile={disabled,hasAttribute:k=>attrs.has(k),getAttribute:k=>attrs.get(k),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
  setMotifTilePending(tile,true);setMotifTilePending(tile,true);assert.equal(tile.disabled,true);assert.equal(attrs.get('aria-busy'),'true');
  setMotifTilePending(tile,false);assert.equal(tile.disabled,disabled);assert.equal(attrs.size,0);
 }
});
