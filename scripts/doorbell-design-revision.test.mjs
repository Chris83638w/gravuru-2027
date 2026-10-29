import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from '../app/workshop/test-fixtures/doorbell-config.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';
import {prepareDoorbellDesignRevision} from './doorbell-design-revision.mjs';
test('new revision grants native move/delete while preserving geometry, prices and existing rights',()=>{
 const old=makeProductDocument(doorbellFixture());const copy=structuredClone(old);
 const next=prepareDoorbellDesignRevision(old);
 assert.deepEqual(old,copy);
 assert.equal(next.elementRights.example['mark-0'].move,true);
 assert.equal(next.elementRights.example['mark-0'].delete,true);
 assert.equal(next.elementRights.example['mark-0'].replace,true);
 assert.equal(next.elementRights.example['mark-0'].scale,old.elementRights.example['mark-0'].scale);
 assert.deepEqual(next.config.profile.optionGroups,old.config.profile.optionGroups);
 assert.deepEqual(next.config.doorbell.formats.map(f=>f.profile.geometry),old.config.doorbell.formats.map(f=>f.profile.geometry));
});
