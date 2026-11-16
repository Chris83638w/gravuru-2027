import test from 'node:test';
import assert from 'node:assert/strict';
import {smallSignMotifMode,smallSignMotifPosition} from './motif-placement.mjs';
const heart='import-1abd6f06096e47c66b0b4e00',line='import-0f3193fd49e254bb5975e74d';
const config=(material='steel',width=50)=>({productExecution:{kind:'door-sign'},familyFormats:{schema:'gravuru-family-formats/v1',fixedSize:material==='steel'?`GR-ES-RE-${width}X20-T15`:`TS-Acryl-RE-${width}X20-T30-SW`,source:{lineId:material==='steel'?'edelstahl-tuerschilder':'acryl-tuerschilder',subcategoryId:'familienschilder'}}});
const motif=(key=heart,changes={})=>({id:'new',type:'motif',motif:key,x:25,y:10,w:20,h:20,rotation:0,...changes});
const text=(x,w,changes={})=>({id:'text',type:'text',text:'Name',x,y:10,w,h:5,rotation:0,...changes});
function raster(width,objects){const height=40,alpha=new Uint8ClampedArray(width*height*4);for(const o of objects)for(let y=Math.max(0,Math.floor((o.y-o.h/2)*2));y<Math.min(height,Math.ceil((o.y+o.h/2)*2));y++)for(let x=Math.max(0,Math.floor((o.x-o.w/2)*2));x<Math.min(width,Math.ceil((o.x+o.w/2)*2));x++)alpha[(y*width+x)*4+3]=255;return alpha;}
function find(objects,object=motif(),extra={}){return smallSignMotifPosition({mode:'side',object,objects,alpha:raster(100,objects),width:100,height:40,minScale:.5,...extra});}

test('scope is the six fixed catalogue products and known new motifs only',()=>{
 for(const material of ['steel','acrylic'])for(const width of [50,60,80])assert.equal(smallSignMotifMode(config(material,width),motif()),'side');
 assert.equal(smallSignMotifMode(config(),motif(line)),'center');
 assert.equal(smallSignMotifMode(config(),motif('import-9373218480c87a6ad167f3cb')),'center');
 for(const o of [motif('unknown'),motif(heart,{templateOrigin:true}),motif(heart,{uxUploadId:'svg-logo'}),motif(heart,{type:'image'}),motif(heart,{rotation:30})])assert.equal(smallSignMotifMode(config(),o),null);
 const all=config();delete all.familyFormats.fixedSize;assert.equal(smallSignMotifMode(all,motif()),null);
 assert.equal(smallSignMotifMode(config('steel',70),motif()),null);
 const other=config();other.familyFormats.source.subcategoryId='other';assert.equal(smallSignMotifMode(other,motif()),null);
});

test('large motif goes right of text, otherwise left, without touching the text or aspect',()=>{
 for(const [x,side] of [[15,'right'],[35,'left']]){
  const objects=[text(x,20)],object=motif(),before=JSON.stringify({objects,object}),p=find(objects,object);
  assert.ok(p);assert.ok(p.w>=17&&p.h>=17);assert.equal(p.w/p.h,object.w/object.h);
  assert.ok(side==='right'?p.x-p.w/2>25:p.x+p.w/2<25);
  assert.ok(p.y-p.h/2>=0&&p.y+p.h/2<=20);
  assert.equal(JSON.stringify({objects,object}),before);
 }
});

test('a larger left region wins before shrinking into a narrow right region',()=>{
 const objects=[text(32,16)],p=find(objects);assert.ok(p);assert.ok(p.x+p.w/2<24);assert.ok(p.w>=17);
});

test('same-size ties choose right and do not put ordinary motifs above the text',()=>{
 const objects=[text(25,6)],p=find(objects);assert.ok(p);assert.ok(p.x-p.w/2>28);assert.ok(Math.abs(p.y-10)<=.5);
});

test('horizontal and fine separator lines are large, centred and clear of text',()=>{
 const objects=[text(25,30,{y:6,h:4})],object=motif(line,{w:20,h:.32}),p=find(objects,object,{mode:'center'});
 assert.ok(p);assert.ok(p.w>40&&p.w<50);assert.ok(Math.abs(p.x-25)<=.5);assert.ok(p.y-p.h/2>8);assert.equal(p.w/p.h,object.w/object.h);
});

test('existing decoration, usable contour and minimum motif size remain respected',()=>{
 const objects=[text(15,20),{id:'old',type:'motif',x:38,y:10,w:20,h:20}];assert.equal(find(objects),null);
 assert.equal(find([text(25,44)]),null,'do not squeeze below 10 mm or move existing text');
 assert.equal(find([text(15,20)],motif(),{allowed:()=>false}),null);
 assert.equal(find([]),null,'no text does not invent a side-layout');
 const objects2=[text(15,20)],p=find(objects2,motif(heart,{w:20,h:10}));assert.ok(p);assert.equal(p.w/p.h,2,'motif never stretched');
});

test('real glyph bounds follow rotated text while every source property stays unchanged',()=>{
 const fonts={Demo:{regular:{units:1000,glyphs:{A:{a:1000,d:'M0 0H1000V800H0Z'}}}}},objects=[text(25,10,{text:'A',font:'Demo',size:10,h:12,rotation:90})],before=JSON.stringify(objects);
 const p=find(objects,motif(),{fonts});assert.ok(p);assert.ok(p.x-p.w/2>29);assert.equal(JSON.stringify(objects),before);
});
