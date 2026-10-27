import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {doorbellImageResource,isDoorbellImagePath,DOORBELL_IMAGE_PACKAGE} from './doorbell-image-resource.mjs';

test('device images resolve only within the fixed catalog package',()=>{
 const filename='a'.repeat(64)+'.webp';
 assert.deepEqual(doorbellImageResource('/doorbell-assets/'+filename,'/catalog'),{base:path.join('/catalog',DOORBELL_IMAGE_PACKAGE),relative:filename});
 assert.equal(doorbellImageResource('/doorbell-assets/'+filename,null),null);
});
test('device route rejects traversal, arbitrary names and other file types',()=>{
 for(const input of ['/doorbell-assets/../secrets.json','/doorbell-assets/'+('a'.repeat(64))+'.png','/doorbell-assets/'+('A'.repeat(64))+'.webp','/doorbell-assets/model.webp','/doorbell-assets/'+('a'.repeat(64))+'.webp/extra','/doorbell-assets/%2e%2e/file.webp'])
  assert.equal(isDoorbellImagePath(input),false,input);
});

