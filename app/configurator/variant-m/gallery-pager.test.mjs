import test from 'node:test';
import assert from 'node:assert/strict';
import {createGalleryPager} from './gallery-pager.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('all pages load once and duplicate clicks cannot skip a page',async()=>{
 const requests=[],pending=deferred(),pager=createGalleryPager(page=>{requests.push(page);return page===0?pending.promise:Promise.resolve({items:[3],nextPage:null});});
 const first=pager.load();assert.equal(await pager.load(),null);pending.resolve({items:[1,2],nextPage:1});assert.deepEqual((await first).items,[1,2]);
 assert.deepEqual((await pager.load()).items,[3]);assert.equal(await pager.load(),null);assert.deepEqual(requests,[0,1]);
});
test('reset while loading discards the stale page without unlocking a newer request',async()=>{
 const old=deferred(),fresh=deferred();const pager=createGalleryPager((_page,filter)=>filter==='old'?old.promise:fresh.promise);
 const first=pager.load('old');pager.reset();const second=pager.load('new');old.resolve({items:['old'],nextPage:7});assert.equal(await first,null);assert.equal(pager.loading,true);
 fresh.resolve({items:['new'],nextPage:1});assert.deepEqual((await second).items,['new']);assert.equal(pager.next,1);
});
test('failed and preparing pages retry the same page; stale failures stay silent',async()=>{
 let count=0;const pages=[],pager=createGalleryPager(async page=>{pages.push(page);if(count++===0)throw Error('network');if(count===2)return {status:'preparing'};return {items:['ok'],nextPage:null};});
 await assert.rejects(pager.load(),/network/);assert.equal((await pager.load()).status,'preparing');assert.deepEqual((await pager.load()).items,['ok']);assert.deepEqual(pages,[0,0,0]);
 const stale=deferred(),other=createGalleryPager(()=>stale.promise),read=other.load();other.reset();stale.reject(Error('old network'));assert.equal(await read,null);
});
