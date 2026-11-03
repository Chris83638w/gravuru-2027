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

// Türschild-Konfi (Chris 03.11.2026, ENTSCHEIDUNGEN 4.42): ein Produkt mit allen Formen und Größen.
const allSizesFixture=()=>{
 const m=fixture(),c=m.universal,designs=c.profile.designs.map((d,i)=>({...d,themes:['family'],katalog:{designId:'TS-V2A-D'+(i%104),plateMm:[120,80]}}));
 const formats=[['AB-120X80','AB',120,80],['RE-120X80','RE',120,80],['QU-100X100','QU',100,100],['OV-90X60','OV',90,60]].map(([key,form,width,height],n)=>({key,form,label:key,geometry:{shape:'rect',width,height,cornerRadiusMm:0,holes:[]},variants:[{color:'edelstahl',familyId:'steel-door-signs',sizeKey:key,basePriceCents:1999,material:{kind:'steel'},mounting:[{id:'K00',label:'Ohne',priceCents:0,holes:[]}],
  // AB/RE: alle Designs; Quadrat: nur die zweite Hälfte (D4 fehlt, Nummer 4 als D108 vorhanden); Oval: keines.
  designIds:n<2?designs.map(d=>d.id):n===2?designs.slice(104).map(d=>d.id):[]}]}));
 c.profile.themeId='family';c.profile.designs=designs;
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',defaultValueId:'AB-120X80',values:formats.map(f=>({id:f.key,label:f.key}))},{id:'mounting',defaultValueId:'K00',values:[{id:'K00'}]}];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:'AB-120X80',defaultColor:'edelstahl',colors:[{id:'edelstahl'}],source:{shopProduct:{sizeKey:'AB-120X80',themeId:'family',defaultDesignId:'TS-V2A-D4',groessenWahl:'alle'}},designs,formats};
 c.localResources={fonts:Object.fromEntries(Array.from({length:30},(_,i)=>['Font '+i,{regular:{glyphs:{A:{d:'M0 0 '.repeat(20000)}}}}])),motifs:[]};
 return m;
};
test('all-sizes door-sign product sends every format but only the start design and one fallback per format (4.42)',()=>{
 const model=allSizesFixture(),original=JSON.stringify(model),start=shopStartModel(model,null,{deferFonts:true});
 createModelSlimmer({fontUrl:h=>'/konfigurator/shop/schriften/'+h+'.json'}).slim(start.universal,{deferAll:true});
 const f=start.universal.familyFormats,kept=new Set(f.designs.map(d=>d.id));
 assert.deepEqual(f.formats.map(s=>s.key),['AB-120X80','RE-120X80','QU-100X100','OV-90X60']);
 assert.deepEqual([...kept].sort(),['D108','D4']);
 assert.deepEqual(f.formats.map(s=>s.variants[0].designIds),[['D4','D108'],['D4','D108'],['D108'],[]]);
 assert.equal(start.universal.profile.defaultDesignId,'D4');
 assert.ok(start.universal.profile.designs.every(d=>kept.has(d.id)));
 assert.ok(Buffer.byteLength(JSON.stringify(start))<=600000,'start model exceeds the agreed budget');
 assert.equal(JSON.stringify(model),original,'stored source stays complete');
});
test('all-sizes start follows the chosen Shopify variant and keeps explicit gallery choices strict',()=>{
 const model=allSizesFixture();
 const square=shopStartModel(model,null,{options:{size:'QU-100X100',mounting:'K00'}});
 assert.equal(square.universal.familyFormats.defaultSize,'QU-100X100');
 assert.equal(square.universal.profile.optionGroups.find(g=>g.id==='size').defaultValueId,'QU-100X100');
 assert.equal(square.universal.profile.defaultDesignId,'D108','same design number when the start design does not fit the size');
 assert.equal(shopStartModel(model,'D150',{options:{size:'QU-100X100'}}).universal.profile.defaultDesignId,'D150');
 assert.throws(()=>shopStartModel(model,'D4',{options:{size:'QU-100X100'}}),{code:'shop_entry_design'});
 assert.throws(()=>shopStartModel(model,null,{options:{size:'OV-90X60'}}),{code:'shop_entry_design'});
});
