import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('many overlaps produce only the single canvas note and do not expand the warning list',()=>{
 const source=fs.readFileSync(new URL('./customer-tools.mjs',import.meta.url),'utf8'),begin=source.indexOf(' function updateHints(){'),end=source.indexOf(" r.addEventListener('click',e=>{const b=",begin);
 assert(begin>=0&&end>begin);
 const note={hidden:true},panel={querySelector:()=>null},state={width:220,height:140,objects:[]};
 let hints=[1,2,3].map(i=>({code:'overlap',ids:[],key:String(i)}));
 const env={el:{state},hints:[],shown:null,ignored:new Set(),currentHints:()=>hints,overlapNote:note,placeOverlapNote(){},hintsPanel:panel,checkError:'',esc:x=>x,button:()=>'',draw(){},uiIcon:()=>''};
 vm.createContext(env);vm.runInContext(source.slice(begin,end),env);vm.runInContext('updateHints()',env);
 assert.equal(note.hidden,false);assert.equal(panel.hidden,true);assert(!panel.innerHTML.includes('ux-conflict-compact'));
 hints=[];vm.runInContext('updateHints()',env);assert.equal(note.hidden,true);
});
