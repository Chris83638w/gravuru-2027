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
test('restored source motifs receive explicit rights when a landscape placeholder had another identity',()=>{
 const config=doorbellFixture();
 for(const f of config.doorbell.formats.filter(f=>f.key!=='16x28'))f.profile.designs[0].objects.find(o=>o.id==='mark-0').id='placeholder';
 config.doorbell.defaultFormatKey='35x18';config.basePriceCents=6999;config.profile.optionGroups.find(g=>g.id==='format').defaultValueId='35x18';
 const old=makeProductDocument(config),next=prepareDoorbellDesignRevision(old);
 assert.equal(old.elementRights.example['mark-0'],undefined);
 assert.equal(next.elementRights.example['mark-0'].move,true);
 assert.equal(next.elementRights.example['mark-0'].delete,true);
 assert.equal(next.elementRights.example.placeholder,undefined);
});
