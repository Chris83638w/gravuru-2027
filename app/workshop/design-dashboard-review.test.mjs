import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseDesigns} from './ui/design-dashboard-review.mjs';
const rows=['A','B','C'].map(id=>({id,reihe:'test'}));
test('cancel waits for the current write and does not send later designs or duplicate targets',async()=>{
 const controller=new AbortController(),calls=[],progress=[];let done;
 const pending=new Promise(resolve=>{done=resolve;});
 const run=releaseDesigns([...rows,rows[0]],{signal:controller.signal,patch:async row=>{calls.push(row.id);return pending;},onProgress:p=>progress.push(p)});
 assert.deepEqual(calls,['A']);controller.abort();assert.deepEqual(calls,['A']);done({changed:true});
 const result=await run;assert.deepEqual(calls,['A']);assert.deepEqual(result.results.map(x=>[x.row.id,x.status]),[['A','ok'],['B','cancelled'],['C','cancelled']]);
 assert.equal(result.succeeded.length,1);assert.equal(result.failed.length,0);assert.equal(progress.at(-1).total,3);assert.equal(progress.at(-1).completed,1);
});
test('rejections are counted, explained and do not stop later approvals',async()=>{
 const progress=[];const result=await releaseDesigns(rows,{patch:async row=>{if(row.id==='B')throw Error('Quelle geändert');return {changed:true};},onProgress:p=>progress.push(p)});
 assert.deepEqual(result.results.map(x=>x.status),['ok','rejected','ok']);assert.equal(result.failed[0].error.message,'Quelle geändert');
 assert.equal(progress.at(-1).completed,3);assert.equal(progress.at(-1).rejected,1);assert.deepEqual(result.cancelled,[]);
});
test('a pre-cancelled batch sends no write at all',async()=>{
 const controller=new AbortController();controller.abort();const result=await releaseDesigns(rows,{signal:controller.signal,patch:()=>assert.fail('must not write')});
 assert.equal(result.cancelled.length,3);assert.equal(result.succeeded.length,0);
});
