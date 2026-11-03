import test from 'node:test';
import assert from 'node:assert/strict';
import {shopStartModel} from './shop-start-model.mjs';
import {createModelSlimmer} from './shop-model-slim.mjs';
import {FAMILY_FORMATS_SCHEMA} from '../configurator/variant-m/family-formats.mjs';
const fixture=()=>{const designs=Array.from({length:208},(_,i)=>({id:'D'+i,name:'Design '+i,objects:[{id:'text',type:'text',text:'Familie',font:'Lora'},{id:'motif',type:'motif',svg:'x'.repeat(5000)}]}));return {key:'acryl',configuration:{id:'p',revision:3},legacy:{designs},universal:{profile:{defaultDesignId:'D4',designs,optionGroups:[{id:'mount',values:[{id:'K00'},{id:'B02'}]}]},name:'Schild'}};};
test('memorial projection retains only its selected photo examples, placeholders and hints',()=>{
 const m=fixture(),items=['D4','D6'].map(designId=>({designId,slotId:'photo',assetId:'a'.repeat(64)}));
 m.universal.localResources={fonts:{},motifs:[],photoExamples:structuredClone(items),photoPlaceholders:structuredClone(items)};
 m.universal.photo={enabled:true,hints:items.map(({designId,slotId})=>({designId,slotId,text:'Foto hochladen',enabled:true}))};
 const before=structuredClone(m),start=shopStartModel(m),next=shopStartModel(m,'D6');
 for(const key of ['photoExamples','photoPlaceholders']){assert.deepEqual(start.universal.localResources[key].map(x=>x.designId),['D4']);assert.deepEqual(next.universal.localResources[key].map(x=>x.designId),['D6']);}
 assert.deepEqual(start.universal.photo.hints.map(x=>x.designId),['D4']);assert.deepEqual(m,before);
});
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

test('fixed family with 208 templates and large font outlines stays within the 600 KB start budget (#139)',()=>{
 const model=fixture(),c=model.universal,ids=c.profile.designs.map(d=>d.id);
 c.profile.themeId='family';
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,fixedSize:true,source:{shopProduct:{}},designs:c.profile.designs.map(d=>({...d,themes:['family'],katalog:{designId:d.id}})),formats:[{variants:[{designIds:ids}]}]};
 c.localResources={fonts:Object.fromEntries(Array.from({length:30},(_,i)=>['Font '+i,{regular:{glyphs:{A:{d:'M0 0 '.repeat(20000)}}}}])),motifs:[]};
 const original=JSON.stringify(model),start=shopStartModel(model,null,{deferFonts:true});
 const slimmer=createModelSlimmer({fontUrl:h=>'/konfigurator/shop/schriften/'+h+'.json'});
 slimmer.slim(start.universal,{deferAll:true});
 assert.ok(Buffer.byteLength(original)>3000000,'fixture must catch an accidental full-model response');
 assert.ok(Buffer.byteLength(JSON.stringify(start))<=600000,'uncompressed start model exceeds the agreed budget');
 assert.equal(start.universal.familyFormats.designs.length,1);
 assert.deepEqual(start.universal.familyFormats.formats[0].variants[0].designIds,['D4']);
 assert.equal(Object.keys(start.universal.localResources.fonts).length,0);
 assert.equal(start.universal.localResources.lazyFonts.length,30);
 assert.equal(JSON.stringify(model),original,'stored source stays complete');
});
