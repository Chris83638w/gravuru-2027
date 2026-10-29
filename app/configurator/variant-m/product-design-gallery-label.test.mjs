import test from 'node:test';
import assert from 'node:assert/strict';
import {designGalleryCount} from './product-design-gallery-label.mjs';
test('gallery uses German singular for one design and plural otherwise',()=>{
 assert.equal(designGalleryCount(1),'1 verfügbares Design');
 assert.equal(designGalleryCount(0),'0 verfügbare Designs');
 assert.equal(designGalleryCount(2),'2 verfügbare Designs');
 assert.equal(designGalleryCount(73),'73 verfügbare Designs');
});
