import test from 'node:test';
import assert from 'node:assert/strict';
import {needsDeviceModule,DOORBELL_SCHEMA} from './product-module-context.mjs';

test('device modules follow the stored schema, never titles, materials or visual resemblance',()=>{
 for(const config of [
  {profile:{name:'Funkklingel',kind:'universal-product',material:{kind:'steel'}}},
  {familyFormats:{source:{lineId:'edelstahl-tuerschilder'}}},
  {profile:{workingArea:{headHeightMm:140,previewHeightMm:150}}},
  {profile:{name:'Gedenktafel',kind:'universal-product'}}
 ])assert.equal(needsDeviceModule(config),false);
 const native={doorbell:{schema:DOORBELL_SCHEMA},profile:{kind:'layered-doorbell'}};
 assert.equal(needsDeviceModule(native),true);assert.equal(needsDeviceModule(native,'legacy'),false);
 const legacy={profile:{kind:'layered-doorbell'}};
 assert.equal(needsDeviceModule(legacy),false);assert.equal(needsDeviceModule(legacy,'legacy'),true);
 assert.equal(needsDeviceModule(null),true,'server/merchant processes support mixed product kinds');
});
