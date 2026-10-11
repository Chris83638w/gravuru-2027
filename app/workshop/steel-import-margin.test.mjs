import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesignAssetStore} from './design-assets.mjs';
import {steelSpecimen} from './specimen-product.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {objectIssue} from '../platform/sources/app/shared/models/design-content.mjs';

test('explicit zero margin fits full steel plate and is included in reviewed revision without changing other designs',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const repository=createProductRepository({filename:':memory:',validateDocument:d=>assets.validateDocument(validateProductDocument(d))});t.after(()=>repository.close());
 const d=makeProductDocument(await steelSpecimen(assets));d.config.profile.geometry.safeMarginMm=2;
 const record=repository.create(d),before=structuredClone(record),designId=d.config.profile.defaultDesignId;
 const bytes=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="180mm" height="120mm" viewBox="0 0 180 120"><path fill="#888888" d="M0 0H180V120H0Z"/></svg>');
 const asset=await assets.import({name:'Rand.svg',bytes:bytes.toString('base64')});
 const input={expectedRevision:record.revision,designId,assetId:asset.assetId,originalName:'Rand.svg',marginMm:0};
 const plan=planDesignImport(repository,assets,record.id,input);
 assert.deepEqual(plan.placement,{x:45,y:30,widthMm:90,heightMm:60,scale:.5});assert.equal(plan.marginMm,0);
 assert.deepEqual(repository.get(record.id),before);
 assert.throws(()=>applyDesignImport(repository,assets,record.id,{...input,marginMm:2,token:plan.token}),e=>e.code==='review_changed');
 for(const marginMm of [-1,NaN,30,'0'])assert.throws(()=>planDesignImport(repository,assets,record.id,{...input,marginMm}),e=>e.code==='invalid_margin');
 const saved=applyDesignImport(repository,assets,record.id,{...input,token:plan.token});
 assert.equal(saved.document.config.profile.geometry.safeMarginMm,0);
 assert.equal(objectIssue(saved.document.config.profile.designs.find(v=>v.id===designId).objects[0],saved.document.config.profile),'');
 assert.deepEqual(saved.document.config.profile.designs.find(v=>v.id!==designId),d.config.profile.designs.find(v=>v.id!==designId));
 assert.deepEqual(saved.document.config.profile.optionGroups,d.config.profile.optionGroups);
 assert.deepEqual(repository.get(record.id,{revision:1}),before);assert.deepEqual(assets.read(asset.assetId,true),bytes);
});
