import test from 'node:test';
import assert from 'node:assert/strict';
import {contract,commerce,personalization,defaults,family,fixture,state,defaultQuantityTiers,sourceEvidence} from './load-pricing.mjs';

test('all 10 source files match the pinned Git blob hashes',()=>{
  assert.equal(sourceEvidence.length,10);
  assert.ok(sourceEvidence.every(s=>s.verified));
});
test('confirmed tier values and first matching theme priority',()=>{
  const g=defaultQuantityTiers({id:'gedenktafeln-30x20'},{themeId:'tiergedenktafeln'});
  assert.deepEqual(g.tiers,[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}]);
  const firms=defaultQuantityTiers({id:'edelstahl-tuerschilder'},{themeId:'firmenschilder'});
  assert.equal(firms.ruleId,'entscheidung-20261019-nr4');
  assert.deepEqual(firms.tiers,[{minQuantity:5,percentOff:5},{minQuantity:10,percentOff:10},{minQuantity:25,percentOff:15}]);
  const doors=defaultQuantityTiers({id:'edelstahl-tuerschilder'},{themeId:'hausnummern'});
  assert.deepEqual(doors.tiers,[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}]);
  assert.equal(defaultQuantityTiers({id:'unknown'},{themeId:'unknown'}),null);
  assert.ok(defaults.rules.every(r=>r.tiers.every(t=>t.percentOff!==null)));
});
test('actual source family supplies 2999-cent base and 299/399-cent mounting',()=>{
  assert.equal(family.id,'gedenktafel-30x20-schiefer-natur');
  assert.equal(family.sizes[0].baseCents,2999);
  assert.deepEqual(family.mountingRules.map(r=>r.priceCents),[299,399]);
});
for(const [quantity,unit,total,percent] of [[1,2999,2999,null],[2,2819,5638,6],[3,2699,8097,10],[4,2699,10796,10],[99,2699,267201,10]]){
  test('memorial tier boundary quantity '+quantity,()=>{
    const c=fixture(),p=commerce.commercePrice(c,state(c),quantity);
    assert.equal(p.unitCents,unit);assert.equal(p.totalCents,total);
    assert.equal(p.quantityTier?.percentOff??null,percent);
  });
}
for(const invalid of [0,100,1.5]){
  test('invalid quantity '+invalid+' rejected',()=>{
    const c=fixture();assert.throws(()=>commerce.commercePrice(c,state(c),invalid),/Menge: 1 bis 99/);
  });
}
test('mounting discounted BEFORE adding the non-discounted extra photo',()=>{
  const c=fixture(),photos=[{id:'p1',type:'photoSlot',uxUploadId:'u1',uxUploadKind:'photo'},{id:'p2',type:'photoSlot',uxUploadId:'u2',uxUploadKind:'photo'}];
  for(const [n,unit,total] of [[1,4197,4197],[2,3999,7998],[3,3867,11601],[4,3867,15468]]){
    const p=commerce.commercePrice(c,state(c,photos,'B02'),n);
    assert.equal(p.unitCents,unit);assert.equal(p.totalCents,total);assert.equal(p.chargedUploads,1);
    assert.equal(p.quantityTierDiscountCents,n===1?0:n===2?198:330);
  }
});
test('one included photo stays free; a logo does not consume the photo allowance',()=>{
  const c=fixture(),photo={id:'p1',type:'photoSlot',uxUploadId:'u1',uxUploadKind:'photo'};
  assert.equal(commerce.commercePrice(c,state(c,[photo]),2).chargedUploads,0);
  const logo={...photo,uxUploadKind:'logo'};
  const p=commerce.commercePrice(c,state(c,[logo]),2);assert.equal(p.chargedUploads,1);assert.equal(p.unitCents,3718);
});
test('percentage includes extra motif, filled field and designed reverse side',()=>{
  const c=fixture();c.profile.optionFields=[{id:'gift',kind:'checkbox',label:'Testfeld',priceCents:250}];
  c.profile.surfaces=[{id:'front'},{id:'back',priceCents:500}];
  const s=state(c,[{id:'extra',type:'motif',motif:'synthetic-test'},{id:'back-text',type:'text',surfaceId:'back'}],'B02');
  s.mOptions.gift=true;
  const p=commerce.commercePrice(c,s,2);
  assert.equal(p.fieldCents,250);assert.equal(p.backCents,500);
  assert.equal(p.listUnitCents,4217);assert.equal(p.unitCents,3964);assert.equal(p.totalCents,7928);
});
test('half cent rounds up PER UNIT before multiplying quantity',()=>{
  assert.equal(contract.applyQuantityTier(1990,{minQuantity:5,percentOff:5}),1891);
  assert.equal(contract.applyQuantityTier(1001,{minQuantity:5,percentOff:50}),501);
  const c=fixture();c.basePriceCents=1990;c.quantityTiers=[{minQuantity:2,percentOff:5}];
  const p=commerce.commercePrice(c,state(c),2);assert.equal(p.unitCents,1891);assert.equal(p.totalCents,3782);
});
test('open tier disables the WHOLE tier schedule rather than blocking purchase',()=>{
  const c=fixture();c.quantityTiers=[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:null}];
  assert.equal(contract.activeQuantityTiers(c),null);assert.deepEqual(contract.quantityTierLabels(c),[]);
  const p=commerce.commercePrice(c,state(c),3);assert.equal(p.unitCents,2999);assert.equal(p.quantityTier,null);
  const binding={priceMode:'base-only',variants:[{id:'1',key:p.key,priceCents:2999}]};
  assert.equal(commerce.selectCommerceVariant(c,binding,state(c),3).unitCents,2999);
});
test('explicitly no tier does not fall back to a discount in pricing',()=>{
  const c=fixture();c.quantityTiers=[];assert.equal(commerce.commercePrice(c,state(c),99).unitCents,2999);
});
test('open reverse-side surcharge blocks a designed back',()=>{
  const c=fixture();c.profile.surfaces=[{id:'front'},{id:'back',priceCents:null}];
  assert.throws(()=>commerce.commercePrice(c,state(c,[{id:'back',type:'text',surfaceId:'back'}]),2),/Aufpreis.*offen/);
});
test('unconfirmed photo surcharge is rejected',()=>{
  const c=fixture({photoCents:null});assert.throws(()=>commerce.commercePrice(c,state(c),2),/Fotopreisregel/);
});
test('fixed Shopify price blocks the first active tier, not quantity one',()=>{
  const c=fixture(),s=state(c),p=commerce.commercePrice(c,s,1);
  const binding={priceMode:'base-only',variants:[{id:'1',key:p.key,priceCents:2999}]};
  assert.equal(commerce.selectCommerceVariant(c,binding,s,1).unitCents,2999);
  for(const n of [2,3,4])assert.throws(()=>commerce.selectCommerceVariant(c,binding,s,n),/Mengenstaffel.*noch nicht freigeschaltet/);
});
test('server personalization agrees with discounted mounting plus undiscounted photo',()=>{
  const c=fixture(),photos=[{id:'p1',type:'photoSlot',uxUploadId:'u1',uxUploadKind:'photo'},{id:'p2',type:'photoSlot',uxUploadId:'u2',uxUploadKind:'photo'}];
  const p=commerce.commercePrice(c,state(c,photos,'B02'),2);
  const server={baseCents:3298,extraMotifCents:169,extraPhotoCents:899,revision:'1'};
  const snapshot={id:'proof_pricing_pilot',packageSha256:'a'.repeat(64),selection:{price:p},product:{basePriceCents:p.unitCents}};
  assert.equal(personalization.personalizationForSnapshot(server,snapshot).unitCents,3999);
  const tampered=structuredClone(snapshot);tampered.selection.price.quantityTierDiscountCents++;
  assert.throws(()=>personalization.personalizationForSnapshot(server,tampered),/Aufpreisbindung/);
  const photoDiscounted=structuredClone(snapshot);photoDiscounted.selection.price.unitCents=3945;
  assert.throws(()=>personalization.personalizationForSnapshot(server,photoDiscounted),/Aufpreisbindung/);
});
test('current server personalization rejects separately priced reverse-side or field amounts',()=>{
  const c=fixture();c.profile.optionFields=[{id:'gift',kind:'checkbox',label:'Testfeld',priceCents:250}];
  const s=state(c);s.mOptions.gift=true;
  const p=commerce.commercePrice(c,s,2),server={baseCents:2999,extraMotifCents:169,extraPhotoCents:899,revision:'1'};
  const snapshot={id:'proof_pricing_pilot',packageSha256:'a'.repeat(64),selection:{price:p},product:{basePriceCents:p.unitCents}};
  assert.throws(()=>personalization.personalizationForSnapshot(server,snapshot),/Aufpreisbindung/);
});

