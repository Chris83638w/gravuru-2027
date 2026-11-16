// Read-only integrity verification. No database, network or repository writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const nativeHash=v=>sha(JSON.stringify(canonical(v)));
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
assert.equal(manifest.schema,'gravuru-issue230-v9-plan-transport/v1');
assert.equal(manifest.records.length,7);
let variants=0,roundtrips=0;
for(const f of manifest.files){
 assert.ok(!path.isAbsolute(f.path)&&!f.path.split(/[\\/]/).includes('..'),'Unsafe path');
 const bytes=await fs.readFile(path.join(root,f.path));
 assert.equal(bytes.length,f.bytes,f.path);assert.equal(sha(bytes),f.sha256,f.path);
 const original=f.gzip?gunzipSync(bytes):bytes;
 assert.equal(original.length,f.originalBytes,f.path);assert.equal(sha(original),f.originalSha256,f.path);
 if(f.gzip)roundtrips++;
}
for(const r of manifest.records){
 const stem=r.workbook.replace(/\.xlsx$/,'');
 const plan=JSON.parse(gunzipSync(await fs.readFile(path.join(root,stem,'plan.json.gz'))));
 const source=JSON.parse(gunzipSync(await fs.readFile(path.join(root,stem,'source-document.json.gz'))));
 const pair=JSON.parse(await fs.readFile(path.join(root,stem,'pair.json'),'utf8'));
 const {id,planHash,createdAt,...body}=plan;
 assert.equal(id,r.planId);assert.equal(planHash,r.planHash);assert.equal(nativeHash(body),r.planHash);
 assert.equal(nativeHash(source),r.source.sha256);assert.equal(pair.planId,r.planId);assert.equal(pair.planHash,r.planHash);
 assert.equal(plan.valid,true);assert.deepEqual(plan.issues,[]);assert.equal(plan.products.length,1);
 assert.equal(plan.products[0].combinationCount,r.variants);variants+=r.variants;
}
assert.equal(variants,823);assert.equal(roundtrips,14);
const shaList=await fs.readFile(path.join(root,'SHA256SUMS.txt'),'utf8');let sealedFiles=0;
for(const line of shaList.trim().split(/\r?\n/)){
 const m=/^([a-f0-9]{64})  (.+)$/.exec(line);assert.ok(m,'Malformed SHA line');
 assert.ok(!path.isAbsolute(m[2])&&!m[2].split(/[\\/]/).includes('..'),'Unsafe sealed path');
 assert.equal(sha(await fs.readFile(path.join(root,m[2]))),m[1],m[2]);sealedFiles++;
}
console.log(JSON.stringify({ok:true,plans:7,nativePlanHashes:7,sourceHashes:7,exactGzipRoundtrips:14,variants,files:manifest.files.length,sealedFiles,payloadBytes:manifest.totalPayloadBytes,largestPayloadBytes:manifest.largestPayloadBytes,databaseIncluded:false,readOnly:true}));
