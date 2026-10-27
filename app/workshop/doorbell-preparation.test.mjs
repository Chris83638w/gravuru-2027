import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareShopProduct} from './shop-preparation.mjs';
import {makeProductDocument} from './product-model.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';

const record=()=>({id:'cfg_12345678-1234-4234-8234-123456789012',revision:1,status:'draft',document:makeProductDocument(doorbellFixture(),{name:'Synthetic doorbell',kind:'product'})});

test('doorbell preparation reuses only validated product data and returns isolated values',()=>{
 const source=record(),first=prepareShopProduct(source),expected=structuredClone(first);
 assert.equal(first.variants.length,120);
 first.variants[0].priceCents=1;first.variants[0].options.position='opposite';first.checks.length=0;
 const second=prepareShopProduct(structuredClone(source));
 assert.deepEqual(second,expected);
 assert.notEqual(second.variants,first.variants);
 second.variants[0].options.color='changed';
 assert.deepEqual(prepareShopProduct(source),expected);
 const invalid=structuredClone(source);invalid.document.config.doorbell.modelKey='';
 assert.throws(()=>prepareShopProduct(invalid));
});

test('document, status, revision, identity and manufacturing metadata cannot reuse an obsolete doorbell plan',()=>{
 const source=record(),base=prepareShopProduct(source);
 const renamed=structuredClone(source);renamed.document.name='Changed product';
 assert.equal(prepareShopProduct(renamed).title,'Changed product');
 const archived={...source,status:'archived'};
 assert.equal(prepareShopProduct(archived).sourceReady,false);
 assert.equal(prepareShopProduct({...source,revision:2}).configuration.revision,2);
 assert.equal(prepareShopProduct({...source,id:'cfg_87654321-1234-4234-8234-123456789012'}).configuration.id,'cfg_87654321-1234-4234-8234-123456789012');
 const profile={id:'mfg_12345678-1234-4234-8234-123456789012',revision:1,sha256:'a'.repeat(64)};
 const withProfile=prepareShopProduct({...source,metadata:{productionProfile:profile}});
 assert.deepEqual(withProfile.productionProfile,profile);assert.notEqual(withProfile.sha256,base.sha256);
 assert.equal(prepareShopProduct(source).productionProfile,null);
});
