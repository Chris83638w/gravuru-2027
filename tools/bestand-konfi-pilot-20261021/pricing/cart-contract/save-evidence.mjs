import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {setup} from './fixtures.mjs';
import {cartTransformRun} from './proposed/cart_transform_run.js';
import {cartTransformRun as bundledRun} from './evidence/cart-transform.bundle.mjs';
import assert from 'node:assert/strict';
const provenance=JSON.parse(fs.readFileSync(new URL('./provenance.json',import.meta.url),'utf8'));
const blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
for(const s of provenance.legacyFunction.files){
 const file=new URL(s.file,import.meta.url);let bytes=fs.readFileSync(file);
 // apply_patch adds a terminal LF; remove that byte only if it restores the
 // exact expected Git blob. Never normalize arbitrary source differences.
 if(blob(bytes)!==s.gitBlobSha1&&bytes.at(-1)===10&&blob(bytes.subarray(0,-1))===s.gitBlobSha1){bytes=bytes.subarray(0,-1);fs.writeFileSync(file,bytes);}
 if(blob(bytes)!==s.gitBlobSha1)throw Error('Original Git source mismatch: '+s.file);
}
for(const quantity of [1,2,3,4,99]){
 const f=setup({quantity}),result=cartTransformRun(f.input);
 assert.deepEqual(bundledRun(f.input),result);
 fs.writeFileSync(new URL('./evidence/quantity-'+quantity+'.json',import.meta.url),JSON.stringify({provenance:'Synthetic IDs; manually observed product prices; requested GitHub tiers; public test key only',input:f.input,expected:result,quote:f.offer.quote},null,2)+'\n');
}
const files=[];
function walk(url,prefix=''){
 for(const entry of fs.readdirSync(url,{withFileTypes:true})){
  if(['node_modules','file-hashes.json'].includes(entry.name))continue;
  const path=prefix+entry.name,item=new URL(entry.name+(entry.isDirectory()?'/':''),url);
  if(entry.isDirectory())walk(item,path+'/');
  else {const bytes=fs.readFileSync(item);files.push({file:path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 }
}
walk(new URL('.',import.meta.url));
fs.writeFileSync(new URL('./file-hashes.json',import.meta.url),JSON.stringify({generatedAt:new Date().toISOString(),files},null,2)+'\n');
console.log(JSON.stringify({originalsVerified:provenance.legacyFunction.files.length,bundleCases:5,files:files.length,wasmVerified:false}));

