import test from 'node:test';
import assert from 'node:assert/strict';
import {shopStartModel} from './shop-start-model.mjs';
const fixture=()=>{const designs=Array.from({length:208},(_,i)=>({id:'D'+i,name:'Design '+i,objects:[{id:'text',type:'text',text:'Familie',font:'Lora'},{id:'motif',type:'motif',svg:'x'.repeat(5000)}]}));return {key:'acryl',configuration:{id:'p',revision:3},legacy:{designs},universal:{profile:{defaultDesignId:'D4',designs,optionGroups:[{id:'mount',values:[{id:'K00'},{id:'B02'}]}]},name:'Schild'}};};
test('only the requested template is sent in both model copies; source, options and revision stay intact',()=>{
 const model=fixture(),before=structuredClone(model),start=shopStartModel(model);
 assert.deepEqual(start.universal.profile.designs,[model.universal.profile.designs[4]]);
 assert.deepEqual(start.legacy.designs,start.universal.profile.designs);
 assert.deepEqual(start.universal.profile.optionGroups,model.universal.profile.optionGroups);
 assert.deepEqual(start.configuration,model.configuration);
 assert.ok(JSON.stringify(start).length<300000);
 const next=shopStartModel(model,'D207');assert.equal(next.universal.profile.defaultDesignId,'D207');assert.equal(next.legacy.designs[0].id,'D207');
 next.universal.profile.designs[0].objects[0].text='Koch';assert.deepEqual(model,before);
});
test('unknown and unavailable templates fail closed',()=>{
 const model=fixture();assert.throws(()=>shopStartModel(model,'foreign'),{code:'shop_entry_design'});
 for(const flags of [{hidden:true},{released:false},{katalog:{fit:'passt nicht'}}]){Object.assign(model.universal.profile.designs[4],flags);assert.throws(()=>shopStartModel(model),{code:'shop_entry_design'});}
});
