import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {customerUxPlan} from './customer-ux-policy.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {makeProductDocument} from './product-model.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
function native(){
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  for(const object of config.profile.designs[0].objects.filter(o=>o.type==='text')){
    measureText(object,resources.fonts);
    if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}
  }
  return config;
}
test('proposal validates complete product documents, counts blocked rows and preserves originals',()=>{
 const original=makeProductDocument(native());
 const before=structuredClone(original),invalid=structuredClone(original);invalid.profileAssignments.fonts={mode:'override',profileId:null};
 const plan=customerUxPlan([original,invalid,null]);
 assert.deepEqual(plan.counts,{products:3,ready:1,blocked:2});
 assert.deepEqual(original,before);assert.equal(plan.rows[0].document.config.motifCharge,'all');assert.equal(plan.rows[0].document.config.extraMotifCents,169);
 assert.deepEqual(plan.rows[0].document.config.textRules,{maxCharsPerLine:50});
 assert.deepEqual(plan.rows[0].document.config.profile,before.config.profile);
 assert.ok(plan.rows[1].reason);assert.ok(plan.rows[2].reason);
});
