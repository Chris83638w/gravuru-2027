import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profiles,tabsFor,defaultChoices} from '../src/profiles.mjs';
test('Photo is explicit; a logo-only product has no photo step',()=>{
 assert.ok(tabsFor(profiles.sign).some(([id])=>id==='logo'));
 assert.ok(!tabsFor(profiles.sign).some(([id])=>id==='photo'));
 assert.ok(tabsFor(profiles.memorial).some(([id])=>id==='photo'));
});
test('An optionless product has neither an empty options tab nor empty choices',()=>{
 assert.ok(!tabsFor(profiles.simple).some(([id])=>id==='options'));
 assert.deepEqual(defaultChoices(profiles.simple),{});
});
test('Memorial mounting, stand and spray can coexist as independent selections',()=>{
 const choices={...defaultChoices(profiles.memorial),mounting:'Silikon',stand:'Schwarz',spray:'Mit Imprägnierspray'};
 for(const g of profiles.memorial.groups)assert.ok(g.values.includes(choices[g.id]));
 assert.equal(Object.keys(choices).length,3);
});
test('Missing capability information is not an implicit permission',()=>{
 assert.throws(()=>tabsFor({...profiles.sign,photo:undefined}));
 assert.throws(()=>tabsFor({...profiles.sign,logo:undefined}));
 assert.throws(()=>tabsFor({...profiles.sign,groups:undefined}));
});
test('Doorbell does not inherit memorial accessories or photo tools',()=>{
 assert.deepEqual(profiles.doorbell.groups.map(g=>g.id),['position','color','frame']);
 assert.ok(!tabsFor(profiles.doorbell).some(([id])=>id==='photo'));
});
