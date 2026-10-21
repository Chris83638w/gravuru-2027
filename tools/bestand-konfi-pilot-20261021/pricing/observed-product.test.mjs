import test from 'node:test';
import assert from 'node:assert/strict';
import {commerce} from './load-pricing.mjs';
import {observation,observedConfig,observedState} from './observed-product.mjs';

test('manual observation and requested tier are explicitly distinct from live Shopify verification',()=>{
  assert.equal(observation.source.configurationId,'cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1');
  assert.equal(observation.source.productRevision,5);
  assert.equal(observation.source.kind,'manual-ui-observation');
  assert.equal(observation.requestedPricing.liveVerified,false);
  assert.equal(observation.testScope.shopifyVariantMapping,null);
  assert.deepEqual(observedConfig().quantityTiers,observation.requestedPricing.tiers);
});
for(const [quantity,unitCents,totalCents] of [[1,3298,3298],[2,3160,6320],[3,3068,9204],[4,3068,12272]]){
  test('observed revision-5 base plus one chargeable photo, desired tier at quantity '+quantity,()=>{
    const price=commerce.commercePrice(observedConfig(),observedState(),quantity);
    assert.equal(price.unitCents,unitCents);assert.equal(price.totalCents,totalCents);assert.equal(price.chargedUploads,1);
  });
}
test('all nine manually observed mounting prices participate before discount',()=>{
  const expected=[
    ['observed-none',3160,3068],
    ['observed-hole2',3441,3337],
    ['observed-hole4',3535,3427],
    ['observed-spacer2-silver',4004,3876],
    ['observed-spacer2-black',4098,3966],
    ['observed-spacer4-silver',4474,4326],
    ['observed-stand-clear',4381,4237],
    ['observed-stand-black',4569,4417],
    ['observed-silicone',3629,3517]
  ];
  const c=observedConfig();
  assert.equal(observation.observed.mounting.length,expected.length);
  for(const [id,unit2,unit3] of expected){
    assert.equal(commerce.commercePrice(c,observedState(id),2).unitCents,unit2,id+' qty 2');
    assert.equal(commerce.commercePrice(c,observedState(id),3).unitCents,unit3,id+' qty 3');
  }
});

