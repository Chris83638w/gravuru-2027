import test from 'node:test';
import assert from 'node:assert/strict';
import {textToolbarPosition} from './text-toolbar-position.mjs';
test('plate toolbar stays eight pixels above the plate and follows selection within the stage',()=>{
 const input={stage:{left:20,top:80,width:800,height:600},plate:{left:60,top:190,width:720,height:480},selection:{left:650,top:350,width:100},width:520,height:48};
 const p=textToolbarPosition(input);assert.equal(p.top+input.height,190-80-8);assert.equal(p.left,800-520-8);
 const full=textToolbarPosition({...input,stage:{left:0,top:50,width:1440,height:770},plate:{left:210,top:130,width:1020,height:680}});
 assert.equal(full.top+input.height,130-50-8);
 assert.equal(textToolbarPosition({...input,zoomed:true}).top,8);
});
test('comparison variant stays above the visible corner grip; extreme selections cannot move toolbar outside stage',()=>{
 const input={stage:{left:0,top:50,width:600,height:500},plate:{left:40,top:150,width:520,height:340},selection:{left:-100,top:250,width:100},width:400,height:40,placement:'selection'};
 const p=textToolbarPosition(input);assert.equal(p.left,8);assert.equal(p.top+40,250-50-19-6);
 assert.equal(textToolbarPosition({...input,selection:{left:0,top:-80,width:20}}).top,8);
});
