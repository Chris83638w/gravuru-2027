import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as turn} from 'node:timers/promises';
import {createPreviewQueue} from './shop-gallery-preview-queue.mjs';

test('all preview callers share two slots, bounded waiting and FIFO recovery after failure',async()=>{
 const queue=createPreviewQueue({concurrency:2,maxPending:2}),release=[],started=[];let active=0,peak=0;
 const work=i=>async()=>{active++;peak=Math.max(peak,active);started.push(i);await new Promise(r=>release[i]=r);active--;if(i===0)throw Error('synthetic broken preview');return i;};
 const first=queue(work(0));const firstError=assert.rejects(first,/broken preview/);
 const second=queue(work(1)),third=queue(work(2)),fourth=queue(work(3));
 await assert.rejects(queue(work(4)),{status:429,code:'shop_gallery_busy'});
 await turn();assert.deepEqual(started,[0,1]);release[0]();await firstError;await turn();assert.deepEqual(started,[0,1,2]);
 release[1]();await second;await turn();assert.deepEqual(started,[0,1,2,3]);release[2]();release[3]();
 assert.deepEqual(await Promise.all([third,fourth]),[2,3]);assert.equal(peak,2);assert.equal(active,0);
 assert.equal(await queue(()=>42),42);
});
