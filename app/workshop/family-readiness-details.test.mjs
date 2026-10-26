import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {familyReadinessDetails,familyReady} from './product-families.mjs';
const family=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url),'utf8'));
test('open base and accessory prices leave geometry ready but keep import blocked',()=>{
 const f=family();f.sizes[0].baseCents=null;f.mountingRules[0].priceCents=null;
 const r=familyReadinessDetails(f);assert.equal(r.complete,false);assert.equal(familyReady(f).ready,false);
 assert.equal(r.geometry.complete,true);assert.deepEqual(r.geometry.issues,[]);
 assert.equal(r.prices.complete,false);assert.match(r.prices.issues.join(' '),/Grundpreis/);assert.match(r.prices.issues.join(' '),/Aufpreis/);
});
test('missing drill geometry stays separate from open prices',()=>{
 const f=family();const rule=f.mountingRules.find(r=>r.layout!=='none');rule.edgeMm=null;rule.diameterMm=null;f.sizes[0].baseCents=null;
 const r=familyReadinessDetails(f);assert.equal(r.geometry.complete,false);assert.match(r.geometry.issues.join(' '),/Bohrbild/);
 assert.doesNotMatch(r.geometry.issues.join(' '),/Grundpreis|Aufpreis/);assert.doesNotMatch(r.prices.issues.join(' '),/Bohrbild/);
 assert.equal(r.complete,false);assert.equal(r.prices.complete,false);
});
