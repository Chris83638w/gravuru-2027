import test from 'node:test';
import assert from 'node:assert/strict';
import {mountingTileIcon,optionTileIcon} from './option-media.mjs';

test('mounting cards keep two horizontal holes and distinguish screws without a photo',()=>{
 const option={id:'custom',holes:[{x:6,y:40},{x:114,y:40}],thumbnail:'data:image/png;base64,AAAA'};
 const plain=mountingTileIcon(option),screws=mountingTileIcon({...option,mountingRule:{accessory:'screws'}});
 assert.equal((plain.match(/<circle /g)||[]).length,2);
 assert.match(plain,/<circle cx="8" cy="16" r="1.7"\/>/);
 assert.match(plain,/<circle cx="24" cy="16" r="1.7"\/>/);
 assert.equal((screws.match(/<circle /g)||[]).length,2);
 assert.equal((screws.match(/l2.8-2.8/g)||[]).length,2);
 assert.doesNotMatch(plain+screws,/<img|<image/);
 assert.equal(optionTileIcon(option,{mounting:true}),plain);
 assert.match(optionTileIcon(option),/^<img /,'Other option groups keep their supplied image');
});
test('vertical and four-corner drilling stay distinct; unknown mounting invents no holes',()=>{
 const vertical=mountingTileIcon({holes:[{x:30,y:5},{x:30,y:75}]}),four=mountingTileIcon({holes:[{x:5,y:5},{x:75,y:5},{x:5,y:75},{x:75,y:75}]}),unknown=mountingTileIcon({id:'unknown'});
 assert.match(vertical,/<circle cx="16" cy="8"/);assert.match(vertical,/<circle cx="16" cy="24"/);
 assert.equal((four.match(/<circle /g)||[]).length,4);
 assert.doesNotMatch(unknown,/<circle|m10 22 12-12/);
});
