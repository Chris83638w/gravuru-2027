import test from 'node:test';
import assert from 'node:assert/strict';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {designArea,designAreaOutline} from './design-area.mjs';

const design={id:'D1',name:'Formatvorschau',objects:[],marks:[]};
test('native layered previews retain the original black and anthracite material gradients',()=>{
 const p=profile(240,200);p.doorbellSchema='gravuru-doorbell/v1';
 const black=studioSvg(p,design,{}, {color:'schwarz'}),anthracite=studioSvg(p,design,{}, {color:'anthrazit'});
 assert.match(black,/<stop stop-color="#222426"\/><stop offset=".7" stop-color="#111214"\/><stop offset="1" stop-color="#1a1c1e"\/>/);
 assert.match(anthracite,/<stop stop-color="#474b50"\/><stop offset=".7" stop-color="#33383e"\/><stop offset="1" stop-color="#3e444a"\/>/);
 assert.match(black,/<stop stop-color="#f1f2f2"\/><stop offset=".25" stop-color="#b6bcc0"\/>/);
});
function profile(width,height,opposite=false){
 const bell={x:width>height?width-65:(width-50)/2,y:width>height?20:height-130,width:50,height:110};
 if(opposite){bell.x=width-bell.x-bell.width;bell.y=height-bell.y-bell.height;}
 return {kind:'layered-doorbell',geometry:{width,height,bell,bellImageBounds:{...bell},holes:[]},
  admin:{imageUrl:'https://example.test/doorbell.png',steelImageUrl:'https://example.test/steel.png'},
  frames:[{key:'R10',acrylic:{x:10,y:10,width:width-20,height:height-20}}],
  mounting:{options:[{key:'B04S',visibleScrews:true},{key:'K00',visibleScrews:false}],
   holes:[{x:8,y:8},{x:width-8,y:8},{x:width-8,y:height-8},{x:8,y:height-8}],screwHeadPreviewDiameterMm:7}};
}
for(const [width,height]of [[160,280],[240,200],[350,180]]){
 for(const opposite of [false,true])test('Layered preview '+width+'×'+height+' '+(opposite?'opposite':'standard')+' is dimensionally correct and keeps the device upright',()=>{
  const p=profile(width,height,opposite),before=structuredClone(p),b=p.geometry.bell;
  const svg=studioSvg(p,design,{}, {color:'anthrazit',mountingKey:'B04S'});
  assert.match(svg,new RegExp('viewBox="-8 -8 '+(width+16)+' '+(height+16)+'"'));
  assert.ok(svg.includes('width="'+width+'" height="'+height+'" fill="url(#studio-steel)"'));
  assert.ok(svg.includes('href="https://example.test/doorbell.png" x="'+b.x+'" y="'+b.y+'" width="50" height="110" pointer-events="none"'));
  assert.equal((svg.match(/data-mounting-screw="true"/g)||[]).length,4);
  assert.match(svg,/stop-color="#454a50"/);
  assert.doesNotMatch(svg,/rotate\(180/);
  assert.deepEqual(p,before);
  const black=studioSvg(p,design,{}, {color:'schwarz',mountingKey:'K00'});
  assert.match(black,/stop-color="#242629"/);assert.doesNotMatch(black,/data-mounting-screw/);
 });
}
test('Free graphics are visible and their selected handles scale to the current width',()=>{
 const graphic={id:'custom',type:'graphic',shape:'ellipse',x:70,y:60,w:20,h:10,rotation:0};
 const svg=studioSvg(profile(350,180),{...design,objects:[graphic]}, {},{selected:'custom'});
 assert.match(svg,/<ellipse rx="9.75" ry="4.75"/);
 assert.equal((svg.match(/data-resize="custom"/g)||[]).length,4);
 assert.match(svg,/transform="translate\(70 60\) rotate\(0\)"/);
});
test('New doorbell design bounds can be below or beside the device; legacy specimen retains its rule',()=>{
 const g={width:240,height:200,bell:{x:15,y:20,width:50,height:110},designArea:{left:75,top:10,right:230,bottom:190},safeMarginMm:0};
 const config={doorbell:{schema:'gravuru-doorbell/v1'},profile:{geometry:g}};
 assert.deepEqual(designArea(config),g.designArea);
 assert.equal(designAreaOutline(config),'<rect x="75" y="10" width="155" height="180"/>');
 const old={doorbell:{schema:'gravuru-aosu-specimen/v1'},profile:{geometry:{width:160,height:280,bell:{y:145},safeMarginMm:2}}};
 assert.deepEqual(designArea(old),{left:2,top:2,right:158,bottom:143});
});

