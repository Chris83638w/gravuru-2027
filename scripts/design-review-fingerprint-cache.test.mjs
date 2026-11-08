import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createDesignReviewFingerprintCache} from './lib/design-review-fingerprint-cache.mjs';

function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'derived-review-cache-'));t.after(()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'derived-review-cache-'));fs.rmSync(dir,{recursive:true,force:true});});return {filename:path.join(dir,'cache.json'),scope:'a'.repeat(64)};}
const key='b'.repeat(64),entry={fingerprint:'c'.repeat(64),resources:[]};
test('atomic replacement retains only validated hashes and rejects wrong scope or corrupted content',t=>{
  const options=fixture(t),cache=createDesignReviewFingerprintCache(options);cache.put(key,entry);assert.equal(cache.flush(),true);
  assert.deepEqual(createDesignReviewFingerprintCache(options).get(key),entry);
  const changed={fingerprint:'d'.repeat(64),resources:[]};cache.put(key,changed);assert.equal(cache.flush(),true);assert.deepEqual(createDesignReviewFingerprintCache(options).get(key),changed);
  assert.equal(fs.readdirSync(path.dirname(options.filename)).length,1,'no temporary files remain');
  assert.equal(createDesignReviewFingerprintCache({...options,scope:'e'.repeat(64)}).get(key),null);
  const corrupt=JSON.parse(fs.readFileSync(options.filename));corrupt.entries[0][1].fingerprint='f'.repeat(64);fs.writeFileSync(options.filename,JSON.stringify(corrupt));
  assert.equal(createDesignReviewFingerprintCache(options).get(key),null,'checksum mismatch cannot supply an approval fingerprint');
});
test('external mutable references and incomplete entries cannot be saved; capacity is bounded',t=>{
  const cache=createDesignReviewFingerprintCache({...fixture(t),maxEntries:1});
  assert.throws(()=>cache.put(key,{...entry,resources:[{kind:'url',key:'https://example.test/image.png',sha256:'d'.repeat(64)}]}));
  assert.throws(()=>cache.put(key,{fingerprint:entry.fingerprint}));
  cache.put(key,entry);cache.put('e'.repeat(64),entry);assert.equal(cache.get(key),null);assert.equal(cache.status().entries,1);
});
test('cache I/O failure and absent store scope leave the caller on the authoritative path',t=>{
  const options=fixture(t),cache=createDesignReviewFingerprintCache({...options,filename:path.join(path.dirname(options.filename),'missing','cache.json')});
  cache.put(key,entry);assert.equal(cache.flush(),false);assert.equal(cache.status().error,'cache-write-unavailable');
  const disabled=createDesignReviewFingerprintCache({...options,scope:null});disabled.put(key,entry);assert.equal(disabled.get(key),null);assert.equal(disabled.flush(),false);
});
