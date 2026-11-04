import test from 'node:test';
import assert from 'node:assert/strict';
import {slateFormatSizes,assignedSlateSizes,slateDesignGroup} from './slate-design-targets.mjs';
import {designTargetCompatibility,assignTargetSeries,approvedForFamily} from './design-targets.mjs';
const family={id:'schiefer-tafeln-natur',material:{kind:'slate'},groups:[{key:'RE',shape:'rect'},{key:'QU',shape:'rect'},{key:'HR',shape:'contour'}],sizes:[{key:'long',groupKey:'RE',widthMm:300,heightMm:100},{key:'long2',groupKey:'RE',widthMm:380,heightMm:130},{key:'long3',groupKey:'RE',widthMm:560,heightMm:180},{key:'square',groupKey:'QU',widthMm:200,heightMm:200},{key:'heart',groupKey:'HR',widthMm:200,heightMm:200}]};
const master=(patch={})=>({id:'D1',plateMm:[300,100],json:{material:'Schiefer',form:'Rechteck',formatreihe:'rechteck-3-1',plateMm:[300,100],ziele:[{familie:family.id,freigabe:null}],sizes:['long','long2','long3'],...patch}});
test('explicit slate long formats use proportional contain only for the named source targets, without approval',()=>{
 const d=master(),k={families:new Map([[family.id,family]])};
 assert.deepEqual(assignTargetSeries(family,[d],k)[0].sizes,['long','long2','long3']);
 assert.equal(designTargetCompatibility(d,family,family.sizes[1],{katalog:k}).status,'passt');
 assert.equal(designTargetCompatibility(d,family,family.sizes[3],{katalog:k}).status,'passt nicht');
 assert.equal(approvedForFamily(d,family.id,k),false);
});
test('wrong source forms, arbitrary ratios, foreign materials and unassigned keys cannot activate slate fitting',()=>{
 for(const patch of [{form:'Rund'},{plateMm:[10,500]},{material:'Edelstahl'},{ziele:[]},{sizes:['square']}])assert.deepEqual(assignedSlateSizes(master(patch).json,family),[]);
 assert.deepEqual(slateFormatSizes(master().json,{...family,id:'other'}),[]);
 assert.deepEqual(slateFormatSizes(master({formatreihe:'kordel-rechteck-15x9'}).json,{...family,id:'schiefer-tafeln-kordel'}),[]);
});
test('slate source heart is matched to its actual catalogue contour, never to a square',()=>{
 const d=master({form:'Herz',formatreihe:'herz',plateMm:[102,102],sizes:['heart']});d.plateMm=[102,102];
 assert.equal(designTargetCompatibility(d,family,family.sizes[4]).status,'passt');
 assert.equal(designTargetCompatibility(d,family,family.sizes[3]).status,'passt nicht');
});
test('source photo designs stay excluded where the target plate does not offer photos',()=>{
 const d=master({withPhoto:true,photos:[{file:'original.jpg'}]});
 assert.match(designTargetCompatibility(d,family,family.sizes[0]).issues.join(' '),/ohne Foto/);
 assert.equal(designTargetCompatibility(d,family,{...family.sizes[0],photoDesignCents:2899}).status,'passt');
});
test('a source cross maps to KR contour only; the same bounds never authorize HR',()=>{
 const cross={...family,id:'schiefer-tafeln-geschnitten',groups:[{key:'KR',shape:'contour'},{key:'HR',shape:'contour'}],sizes:[{key:'cross',groupKey:'KR',widthMm:215,heightMm:300},{key:'heart',groupKey:'HR',widthMm:240,heightMm:192}]};
 const d=master({form:'Kreuz',formatreihe:'kreuz',plateMm:[215,300],sizes:['cross'],ziele:[{familie:cross.id,freigabe:null}]});d.plateMm=[215,300];
 assert.equal(designTargetCompatibility(d,cross,cross.sizes[0]).status,'passt');
 assert.equal(designTargetCompatibility(d,cross,cross.sizes[1]).status,'passt nicht');
});
test('requested design groups preserve animals as one group and leave unknown groups open',()=>{
 for(const s of ['Hunde','Katzen','Tiere'])assert.equal(slateDesignGroup({katalog:{zielgruppe:s}}),'Tiere');
 for(const s of ['Menschen','Sternenkinder','Familie','Monogramme'])assert.equal(slateDesignGroup({targetGroup:s}),s);
 assert.equal(slateDesignGroup({targetGroup:'unbekannt'}),null);
});
