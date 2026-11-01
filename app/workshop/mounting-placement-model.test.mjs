import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorkshop} from './http.mjs';
import {familyProductConfig} from './product-families.mjs';
import {makeProductDocument} from './product-model.mjs';
import {signPlacementEnabled} from '../configurator/variant-m/mounting-placement.mjs';

test('real workshop model retains catalog family after assigning customer IDs, without changing saved documents',t=>{
 const f=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),size=f.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
 const config=familyProductConfig({...f,groups:f.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:f.mountingRules.filter(r=>size.mounting.includes(r.id))},size,1);
 const w=createWorkshop({filename:':memory:',seedConfig:config,legacy:{purchasing:{},features:{}}});t.after(()=>w.close());
 const doc=makeProductDocument(config,{name:'Sign',kind:'product'});doc.config.profile.id='katalog-line-sub-size';doc.categoryIds=['familie-steel-door-signs'];
 const item=w.repository.create(doc),before=w.repository.get(item.id),model=w.internalModel(item.id);
 assert.equal(model.universal.profile.id,item.id);assert.equal(model.universal.mountingPlacementFamily,'steel-door-signs');assert(signPlacementEnabled(model.universal,model.universal.profile));assert.deepEqual(w.repository.get(item.id),before);
 const other=structuredClone(doc);other.categoryIds=['familie-gedenktafel-30x20-edelstahl'];other.config.profile.revision='other:1';
 const notSign=w.repository.create(other),otherModel=w.internalModel(notSign.id);assert.equal(otherModel.universal.mountingPlacementFamily,undefined);assert(!signPlacementEnabled(otherModel.universal,otherModel.universal.profile));
});
