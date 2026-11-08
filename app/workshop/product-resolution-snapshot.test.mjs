import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument,resolveProduct,withProductResolutionSnapshot} from './product-model.mjs';
import {prepareShopProduct,withShopPreparationSnapshot} from './shop-preparation.mjs';

function fixture(){
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const document=makeProductDocument(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64)),{name:'Synthetic resolution snapshot'});
 return {id:'cfg_00000000-0000-4000-8000-000000000001',revision:1,status:'draft',document,metadata:{}};
}

test('scoped resolution preserves all native variant prices, dimensions and rights and detaches caller mutations',()=>{
 const record=fixture(),variants=prepareShopProduct(record).variants;
 const reference=variants.map(v=>resolveProduct(record.document,{options:v.options}));
 let retained;
 withProductResolutionSnapshot(record.document,document=>{
  retained=document;assert.ok(Object.isFrozen(document.config.profile.designs[0].objects));
  assert.throws(()=>{document.config.basePriceCents=1;},TypeError);
  record.document.name='outside changed';
  for(let i=0;i<variants.length;i++)assert.deepEqual(resolveProduct(document,{options:variants[i].options}),reference[i]);
 });
 assert.equal(retained.name,'Synthetic resolution snapshot');
 const fresh=resolveProduct(record.document);assert.equal(fresh.config.profile.name,'outside changed');assert.equal(Object.isFrozen(fresh.config),false);
 record.document.config.extraMotifCents=-1;assert.throws(()=>withProductResolutionSnapshot(record.document,()=>{}));
});

test('preparation scopes keep snapshots immutable, results isolated and cleanup on errors/asynchronous callbacks',()=>{
 const record=fixture(),expected=prepareShopProduct(record);let retained;
 withShopPreparationSnapshot(record,snapshot=>{
  retained=snapshot;assert.ok(Object.isFrozen(snapshot));const first=prepareShopProduct(snapshot);first.variants[0].priceCents=1;
  assert.deepEqual(prepareShopProduct(snapshot),expected);
  assert.throws(()=>{snapshot.document.config.profile.designs[0].objects[0].x=999;},TypeError);
 });
 assert.deepEqual(prepareShopProduct(retained),expected,'retained record goes through ordinary validation after scope');
 assert.throws(()=>withShopPreparationSnapshot(record,()=>{throw Error('stop');}),/stop/);
 assert.throws(()=>withProductResolutionSnapshot(record.document,()=>Promise.resolve()),/asynchron/);
 assert.throws(()=>withShopPreparationSnapshot(record,()=>Promise.resolve()),/asynchron/);
 const changed=structuredClone(record);changed.document.config.extraMotifCents=170;assert.equal(prepareShopProduct(changed).extras.motifCents,170);
});
