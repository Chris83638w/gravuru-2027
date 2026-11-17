import test from 'node:test';
import assert from 'node:assert/strict';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
import {reviewZip} from './review-zip.mjs';
import {digest,readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW} from './native-review-schema.mjs';

for(const files of [[],[{path:'leer',bytes:Buffer.alloc(0)}],[{path:'prüfstand/日本語.json',bytes:Buffer.from('{"text":"Grüße 👋"}')},{path:'binary.bin',bytes:Buffer.from(Array.from({length:256},(_,n)=>n))}],[{path:'gross.bin',bytes:Buffer.alloc(2*1024*1024,0xa5)}]]){
 test('native ZIP is byte-identical to the existing writer: '+files.map(f=>f.path).join(','),async()=>{
  const originals=files.map(f=>Buffer.from(f.bytes));
  const before=Buffer.from(await (await zipFiles(files.map(f=>({name:f.path,blob:new Blob([f.bytes])})))).arrayBuffer());
  const after=reviewZip(files);assert.deepEqual(after,before);
  files.forEach((f,i)=>assert.deepEqual(f.bytes,originals[i]));
 });
}
test('native package preserves all hashed files and rejects corruption through the existing reader',()=>{
 const content=Buffer.from('Unverändertes Original'),files=[{path:'quelle.bin',bytes:content}];
 files.push({path:'manifest.json',bytes:Buffer.from(JSON.stringify({schema:NATIVE_REVIEW,files:[{path:'quelle.bin',bytes:content.length,sha256:digest(content)}]}))});
 const zip=reviewZip(files),hash=digest(zip);
 assert.deepEqual(readReviewPackage(zip,hash,NATIVE_REVIEW).files.get('quelle.bin'),content);
 zip[50]^=1;assert.throws(()=>readReviewPackage(zip,hash,NATIVE_REVIEW),{status:422});
});
