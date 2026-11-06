import test from 'node:test';
import assert from 'node:assert/strict';
import {correctSlateProcesses} from './lib/slate-process-corrections.mjs';
const row = {id:'D2',process:'Gravur',normalized:true,files:[{name:'preview.png',sha256:'exact-original'}],targets:[]};
const plan = {approval:'User confirmed yellow stars',designs:{D2:{from:'Gravur',to:'UV',previewSha256:'exact-original',reason:'Farbige Sterne bleiben Druck'}}};
test('confirmed colour correction preserves original files and is repeatable without mutating input',()=>{
 const other={...row,id:'D3'},corrected=correctSlateProcesses([row,other],plan);
 assert.equal(row.process,'Gravur');assert.equal(corrected[0].process,'UV');assert.equal(corrected[0].normalized,false);
 assert.deepEqual(corrected[0].files,row.files);assert.equal(corrected[1],other);
 assert.deepEqual(correctSlateProcesses(corrected,plan),corrected);
});
test('changed evidence and prepared/imported designs cannot be silently relabelled',()=>{
 assert.throws(()=>correctSlateProcesses([{...row,files:[]}],plan),/evidence changed/);
 assert.throws(()=>correctSlateProcesses([{...row,targets:[{status:'prepared'}]}],plan),/explicit migration/);
 assert.throws(()=>correctSlateProcesses([row],plan,[{designIds:['D2']}]),/explicit migration/);
});
