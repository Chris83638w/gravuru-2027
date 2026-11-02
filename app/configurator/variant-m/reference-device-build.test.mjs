import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {splitReferenceDevice} from './reference-device-build.mjs';

test('native startup does not load or execute historical device scripts; comparison loads them before bootstrap',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'reference-device-'));
 try{
  const source='<script>window.FunkklingelFrames=[1];</script><script>window.FunkklingelBetaCSS="old";</script><script>window.FunkklingelReleaseCSS="commerce";</script><script>(async()=>{window.GravuruProfileChoices=await import("choices");})();</script>';
  const result=splitReferenceDevice(source,dir);
  assert.doesNotMatch(result.source,/FunkklingelFrames=|FunkklingelBetaCSS=|FunkklingelReleaseCSS=/);
  const content=fs.readFileSync(path.join(dir,result.url.split('/').at(-1)),'utf8');
  for(const native of [true,false]){
   const requests=[],window={parent:{UniversalConfig:native?{}:null}};
   const sandbox={window,document:{createElement:()=>({}),head:{append:script=>{requests.push(script.src);vm.runInContext(content,context);script.onload();}}}};
   const context=vm.createContext(sandbox);
   for(const m of result.source.matchAll(/<script>([\s\S]*?)<\/script>/g))await vm.runInContext(m[1].replace('import("choices")','Promise.resolve(window.FunkklingelFrames)'),context);
   assert.deepEqual(requests,native?[]:[result.url]);
   assert.equal(window.FunkklingelBetaCSS,native?undefined:'old');
   assert.equal(window.GravuruProfileChoices?.[0],native?undefined:1);
  }
  assert.equal(splitReferenceDevice(source,dir).url,result.url);
  assert.throws(()=>splitReferenceDevice('<script>window.FunkklingelFrames=[];</script>',dir),/not unique/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
