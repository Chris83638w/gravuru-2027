import test from 'node:test';
import assert from 'node:assert/strict';
import {customerMotifs} from './customer-motifs.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';

// Same steel product and imported vector artwork, rendered once with the
// merchant resource and once through the customer adapter mapping (P1-3).
const artwork={assetId:'a'.repeat(64),widthMm:90,heightMm:60};
const stored={key:'artwork-x',svgFragment:'<path d="M0 0H90V60Z" fill="#808080"/>',bounds:[0,0,90,60],embeddedOnly:true,vectorOnly:true,artwork};
const config={localResources:{motifs:[stored]}};
const profile={kind:'universal-product',name:'Stahl',geometry:{width:90,height:60,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]},material:{kind:'steel',color:'#bac2c4',thicknessMm:1.5},processing:{profileId:'steel-engraving'},mounting:{options:[],holes:[]}};
const design={id:'d',name:'D',marks:[],objects:[{id:'m',type:'motif',motif:'artwork-x',x:45,y:30,w:90,h:60,rotation:0,color:'#000000',templateOrigin:true}]};
const threshold='feFuncA type="discrete"';

test('customer view keeps the vector-only flag so steel engraving is black like in the workshop',()=>{
 const list=customerMotifs(config,{'artwork-x':stored.svgFragment},{motif_bounds:{'artwork-x':[0,0,90,60]}});
 assert.equal(list[0].vectorOnly,true);assert.deepEqual(list[0].artwork,artwork);
 const merchant=studioSvg(profile,design,{},{motifs:[stored]}),customer=studioSvg(profile,design,{},{motifs:list});
 assert.ok(merchant.includes(threshold));assert.ok(customer.includes(threshold),'customer preview must threshold steel vectors to solid ink');
});

test('raster or mixed artwork keeps tones for the customer as well',()=>{
 const raster={...stored,vectorOnly:false},list=customerMotifs({localResources:{motifs:[raster]}},{'artwork-x':stored.svgFragment},{});
 assert.equal(list[0].vectorOnly,undefined);assert.ok(!studioSvg(profile,design,{},{motifs:list}).includes(threshold));
});
