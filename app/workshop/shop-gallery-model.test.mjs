import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shopGalleryModel} from './shop-gallery-model.mjs';
import {makeProductDocument,resolveProduct} from './product-model.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {variantCombinations,selectedProfile,quote} from '../configurator/variant-m/contract.mjs';
import {physicalGeometry} from '../configurator/variant-m/print-geometry.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
for(const [name,config] of [['doorbell',doorbellFixture()],['acrylic',makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64))]]){
 test(name+': lightweight cards keep all exact option prices, geometry and design visibility without rendering resources',()=>{
  const document=makeProductDocument(config,{name:'Synthetic gallery '+name});
  document.categoryIds=['linie-test-line','familie-test-family'];
  const full=resolveProduct(document).config;
  const record={id:'cfg_fixture',revision:7,document};
  const before=JSON.stringify(document),light=shopGalleryModel(record);
  assert.deepEqual(light.galleryCategoryIds,document.categoryIds);assert.notEqual(light.galleryCategoryIds,document.categoryIds);
  assert.equal(light.configuration.revision,7);assert.equal(light.name,document.name);
  for(const option of variantCombinations(full)){
   const expected=selectedProfile(full,option),actual=selectedProfile(light.universal,option);
   assert.deepEqual(actual.designs,expected.designs);
   assert.deepEqual(physicalGeometry(light.universal,{mOptions:option}),physicalGeometry(full,{mOptions:option}));
   for(const design of expected.designs)for(const objects of [[],design.objects])assert.deepEqual(quote(light.universal,objects,design.id,option),quote(full,objects,design.id,option));
  }
  assert.equal(JSON.stringify(document),before);assert.equal(light.universal.materialSurface,undefined);assert.equal(light.universal.sceneBackground,undefined);assert.equal(light.universal.localResources.fonts,undefined);assert.equal(light.universal.localResources.photoExamples,undefined);
  assert.ok(light.universal.localResources.motifs.every(m=>Object.keys(m).every(k=>['key','embeddedOnly','name','label','keywords','tags'].includes(k))));
 });
}

test('projection keeps embedded-only motif restrictions and all-motif pricing, without reading artwork',()=>{
 const config=doorbellFixture();config.motifCharge='all';config.extraMotifCents=169;
 const full=makeProductDocument(config,{name:'Motif price fixture'}).config;
 full.localResources.motifs=[{key:'restricted',name:'Haus',tags:['Zuhause'],embeddedOnly:true,svgFragment:'private artwork'}];
 for(const p of [full.profile,...full.doorbell.formats.map(f=>f.profile)])p.designs[0].objects.push({id:'motif-template',type:'motif',motif:'restricted',templateOrigin:true});
 const light=shopGalleryModel({id:'cfg_fixture',revision:1,document:{schema:'gravuru-product/v1',name:'Fixture',config:full}}).universal;
 const options=variantCombinations(full)[0],design=selectedProfile(full,options).designs[0];
 assert.deepEqual(quote(light,design.objects,design.id,options),quote(full,design.objects,design.id,options));
 for(const c of [full,light])assert.throws(()=>quote(c,[...design.objects,{id:'unauthorized',type:'motif',motif:'restricted'}],design.id,options),/Vorlagenmotiv/);
 assert.ok(!JSON.stringify(light).includes('private artwork'));
 assert.equal(light.localResources.motifs[0].name,'Haus');assert.deepEqual(light.localResources.motifs[0].tags,['Zuhause']);
});
