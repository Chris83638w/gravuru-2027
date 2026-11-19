import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {importEnvironment} from './design-assets.mjs';
import {prepareCustomerPhoto,prepareReviewPreviewPair} from './customer-photo.mjs';

test('paired customer and print previews keep the exact bytes and dimensions of individual imports',async()=>{
 const reference='iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAIElEQVR4nGM0Lp/JgA0wYRWlUOJMIIplCAmT9emU2QEA60kEUyzU9KoAAAAASUVORK5CYII=';
 const customer=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image; import sys; Image.new('RGB',(24,13),'#1379af').save(sys.stdout.buffer,format='WEBP')"],{env:importEnvironment()}).toString('base64');
 const result=await prepareReviewPreviewPair(customer,reference);
 assert.deepEqual(result.customer,await prepareCustomerPhoto(customer));
 assert.deepEqual(result.reference,await prepareCustomerPhoto(reference));
 assert.equal(result.customer.width,24);
 assert.equal(result.reference.height,8);
 await assert.rejects(prepareReviewPreviewPair(customer,Buffer.from('keine Bilddatei').toString('base64')),{code:'invalid_customer_photo'});
});
