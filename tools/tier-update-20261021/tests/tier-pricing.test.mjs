import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {quote,money,quantityTiersIssue,activeQuantityTiers,quantityTierFor,applyQuantityTier,quantityTierLabels,prepareConfig} from '../merchant/app/configurator/variant-m/contract.mjs';
import {commercePrice,selectCommerceVariant,validateCommerce,variantKey} from '../merchant/app/configurator/variant-m/commerce-model.mjs';
import {uploadQuote,additionalMotifCount} from '../merchant/app/configurator/variant-m/ux-model.mjs';
import {ACRYLIC_PRICING} from '../merchant/app/configurator/variant-m/acrylic-product.mjs';

// Synthetic pricing-only fixture: no private product, artwork or image bytes.
// The 2299/999-cent values match the separately verified revision-5 product.
const tiers=()=>[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}];
function fixture(withTier=true){
  return {basePriceCents:2299,extraMotifCents:169,photo:{includedCount:0,extraPriceCents:999},
    ...(withTier?{quantityTiers:tiers(),quantityTierScope:'complete-unit'}:{}),profile:{id:'synthetic-tier-product',revision:'test:1',material:{kind:'slate'},
      defaultDesignId:'synthetic-design',designs:[{id:'synthetic-design',marks:[],objects:[{id:'included',type:'motif',motif:'test-motif'}]}],
      optionGroups:[{id:'mounting',name:'Befestigung',defaultValueId:'none',values:[{id:'none',priceCents:0},{id:'holes',priceCents:299}]}]}};
}
function state(config,withPhoto=true){
  return {designId:config.profile.defaultDesignId,mOptions:{mounting:'none'},objects:[...structuredClone(config.profile.designs[0].objects),
    ...(withPhoto?[{id:'test-photo',type:'photoSlot',uxUploadId:'synthetic-image',uxUploadKind:'photo'}]:[])]};
}
function binding(config,priceMode='shopify-cart-transform'){
  return {schema:'gravuru-shopify-commerce/v2',productId:'gid://shopify/Product/1',profileId:config.profile.id,revision:config.profile.revision,
    currency:'EUR',priceMode,...(priceMode==='shopify-cart-transform'?{cartTransformId:'gid://shopify/CartTransform/1'}:{}),
    designIds:config.profile.designs.map(d=>d.id),variants:[{id:'1',key:variantKey({mounting:'none'}),priceCents:2299},{id:'2',key:variantKey({mounting:'holes'}),priceCents:2598}]};
}

test('products without a quantityTiers key keep the exact legacy return shape and values',()=>{
  const c=fixture(false),s=state(c);
  assert.deepEqual(quote(c,s.objects,s.designId,s.mOptions,3),{currency:'EUR',unitCents:2299,totalCents:6897,quantity:3,additionalMotifs:0,options:{mounting:'none'}});
  assert.deepEqual(commercePrice(c,s,3),{currency:'EUR',unitCents:3298,totalCents:9894,quantity:3,additionalMotifs:0,options:{mounting:'none'},chargedUploads:1,key:'[["mounting","none"]]'});
});

for(const [quantity,percentOff,unitCents] of [[1,null,3298],[2,6,3100],[3,10,2968],[4,10,2968],[99,10,2968]]){
  test(`explicit complete-unit tier boundary quantity ${quantity}, including photo`,()=>{
    const c=fixture(),s=state(c),p=commercePrice(c,s,quantity);
    assert.equal(p.unitCents,unitCents);assert.equal(p.totalCents,unitCents*quantity);
    assert.equal(p.listUnitCents,3298);assert.equal(p.quantityTier?.percentOff??null,percentOff);
    assert.equal(p.quantityTierDiscountCents,3298-unitCents);assert.equal(p.chargedUploads,1);
    assert.equal(p.quantityTierScope,'complete-unit');
  });
}

test('all nine observed mounting surcharges and photo participate in the complete-unit tier',()=>{
  for(const cents of [0,299,399,898,998,1398,1299,1499,499])for(const [quantity,percent]of [[2,6],[3,10]]){
    const c=fixture();c.profile.optionGroups[0].values[0].priceCents=cents;const p=commercePrice(c,state(c),quantity);
    const expected=Math.floor(((2299+cents+999)*(100-percent)+50)/100);
    assert.equal(p.unitCents,expected);assert.equal(p.totalCents,expected*quantity);
  }
});

test('additional motifs participate in the tier; template credit and duplicate handling stay unchanged',()=>{
  const c=fixture(),s=state(c);s.mOptions.mounting='holes';s.objects.push({id:'additional',type:'motif',motif:'test-motif'});
  const p=commercePrice(c,s,2);
  assert.equal(p.additionalMotifs,1);assert.equal(p.listUnitCents,2299+299+169+999);
  assert.equal(p.unitCents,3540);assert.equal(p.quantityTierDiscountCents,226);
});

test('hidden photos are not charged and duplicate uses of the same upload are charged once',()=>{
  const c=fixture(),s=state(c);s.objects.push({...s.objects[1],id:'duplicate'},
    {id:'hidden',type:'photoSlot',uxUploadId:'hidden-image',uxUploadKind:'photo',uxHidden:true});
  const p=commercePrice(c,s,2);assert.equal(p.chargedUploads,1);assert.equal(p.totalCents,6200);
});

test('included photo allowance is free and chargeable logo participates in the complete-unit tier',()=>{
  const c=fixture(),s=state(c);c.photo.includedCount=1;
  s.objects.push({id:'logo',type:'image',uxUploadId:'logo-image',uxUploadKind:'logo'});
  const p=commercePrice(c,s,3);assert.equal(p.chargedUploads,1);assert.equal(p.unitCents,2968);
});

test('an explicit empty schedule prevents any fallback discount',()=>{
  const c=fixture();c.quantityTiers=[];const p=commercePrice(c,state(c),99);
  assert.equal(p.unitCents,3298);assert.equal(p.quantityTier,null);assert.equal(p.quantityTierDiscountCents,0);
  assert.deepEqual(quantityTierLabels(c),[]);
});

test('an open tier disables the entire schedule as in the pinned bf5c contract',()=>{
  const c=fixture();c.quantityTiers[1].percentOff=null;
  assert.equal(activeQuantityTiers(c),null);assert.equal(quantityTierFor(c,2),null);
  assert.equal(commercePrice(c,state(c),2).totalCents,6596);assert.deepEqual(quantityTierLabels(c),[]);
  assert.throws(()=>applyQuantityTier(2299,c.quantityTiers[1]),/offen/);
});

test('invalid schedules fail before a price can be returned',()=>{
  const invalid=[null,{},[{minQuantity:1,percentOff:6}],[{minQuantity:3,percentOff:10},{minQuantity:2,percentOff:6}],
    [{minQuantity:2,percentOff:6},{minQuantity:2,percentOff:10}],[{minQuantity:2,percentOff:100}],
    [{minQuantity:2,percentOff:-1}],[{minQuantity:2,percentOff:'6'}],[{minQuantity:2,percentOff:6.001}],
    [{minQuantity:2,percentOff:6,unitCents:100}],[{minQuantity:2,percentOff:6,authorized:true}],
    [{minQuantity:2,unitCents:-1}],Array.from({length:11},(_,i)=>({minQuantity:i+2,percentOff:6}))];
  for(const quantityTiers of invalid){const c=fixture();c.quantityTiers=quantityTiers;
    assert.ok(quantityTiersIssue(quantityTiers));assert.throws(()=>commercePrice(c,state(c),2),/Mengenstaffel/);
    assert.throws(()=>prepareConfig(c),/Mengenstaffel/);
  }
});

test('quantity boundaries are enforced and nothing accepts numeric strings',()=>{
  const c=fixture();for(const n of [0,-1,100,1.5,'2',NaN,Infinity]){
    assert.throws(()=>quantityTierFor(c,n),/Menge/);assert.throws(()=>commercePrice(c,state(c),n),/Menge/);
  }
});

test('half-cent rounding is per unit before multiplication, including two-decimal percentages',()=>{
  assert.equal(applyQuantityTier(1990,{minQuantity:2,percentOff:5}),1891);
  assert.equal(applyQuantityTier(1001,{minQuantity:2,percentOff:50}),501);
  assert.equal(applyQuantityTier(10000,{minQuantity:2,percentOff:6.25}),9375);
  const c=fixture();c.basePriceCents=1990;c.quantityTiers=[{minQuantity:2,percentOff:5}];
  assert.equal(commercePrice(c,state(c,false),2).totalCents,3782);
});

test('safe-integer rounding remains exact and overflow or negative prices fail closed',()=>{
  const amount=Number.MAX_SAFE_INTEGER;
  assert.equal(applyQuantityTier(amount,{minQuantity:2,percentOff:6}),Number((BigInt(amount)*9400n+5000n)/10000n));
  assert.throws(()=>applyQuantityTier(-1,{minQuantity:2,percentOff:6}),/Gesamtpreis/);
  assert.throws(()=>applyQuantityTier(1.5,{minQuantity:2,percentOff:6}),/Gesamtpreis/);
  const c=fixture();c.basePriceCents=amount;assert.throws(()=>quote(c,[],c.profile.defaultDesignId,{},3),/Gesamtpreis/);
});

test('fixed-base tier replaces only the base; variable-price acrylic and steel reject this shape',()=>{
  const c=fixture();delete c.quantityTierScope;c.quantityTiers=[{minQuantity:2,unitCents:1999}];const s=state(c);s.mOptions.mounting='holes';
  assert.equal(commercePrice(c,s,2).unitCents,1999+299+999);
  assert.match(quantityTierLabels(c)[0],/19,99/);
  for(const key of ['acrylic','steelFormats'])assert.throws(()=>activeQuantityTiers({...c,[key]:{}}),/festem Grundpreis/);
});

test('no tier is inferred from material, name or a desired-looking customer object',()=>{
  const c=fixture(false);c.profile.name='Gedenktafel Schiefer';const s=state(c);
  s.quantityTiers=tiers();s.objects[0].percentOff=99;
  assert.equal(commercePrice(c,s,3).totalCents,9894);assert.equal(quantityTierFor(c,3),null);
});

test('read-only configuration/state remain byte-equivalent after repeated quotes',()=>{
  const c=fixture(),s=state(c),before=JSON.stringify({c,s});
  for(const n of [1,2,3,2])commercePrice(c,s,n);
  assert.equal(JSON.stringify({c,s}),before);
});

test('unscoped historical tier keeps its former before-photo arithmetic and has no new scope field',()=>{
  const c=fixture();delete c.quantityTierScope;
  for(const [quantity,unitCents]of [[2,3160],[3,3068]]){
    const p=commercePrice(c,state(c),quantity);assert.equal(p.unitCents,unitCents);
    assert.equal('quantityTierScope' in p,false);
  }
});

test('complete-unit scope is explicit and rejects unknown scope, missing tiers or fixed-base tiers',()=>{
  for(const quantityTierScope of [null,'','before-photos','COMPLETE-UNIT',{},true]){
    const c=fixture();c.quantityTierScope=quantityTierScope;
    assert.throws(()=>commercePrice(c,state(c),2),/Mengenstaffel/);
  }
  const c=fixture();delete c.quantityTiers;assert.throws(()=>activeQuantityTiers(c),/Mengenstaffel/);
  c.quantityTiers=[{minQuantity:2,unitCents:1999}];assert.throws(()=>activeQuantityTiers(c),/Mengenstaffel/);
});

test('complete-unit rounding happens once after photos, not independently on each component',()=>{
  const c=fixture();c.basePriceCents=5;c.photo.extraPriceCents=5;
  const p=commercePrice(c,state(c),3);
  assert.equal(p.listUnitCents,10);assert.equal(p.unitCents,9);assert.equal(p.totalCents,27);
  assert.equal(p.quantityTierDiscountCents,1);
});

function renderActualPriceFunction(config,s,quantity){
  // Execute the actual small UI price updater with DOM sinks, not a copied renderer.
  const source=fs.readFileSync(new URL('../merchant/app/configurator/variant-m/ux.mjs',import.meta.url),'utf8');
  const start=source.indexOf('  function updatePrice(){'),end=source.indexOf('  function update(){',start);
  assert.ok(start>=0&&end>start);
  const cells={'[data-fk-quantity]':{value:String(quantity)},'[data-fk-total]':{},'[data-ux-price-lines]':{}},errors=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  Function('config','el','profile','$','quote','commercePrice','uploadQuote','money','esc','say','legacy','additionalMotifCount','design',
    source.slice(start,end)+';updatePrice();')(
      config,{state:s},config.profile,k=>cells[k],quote,commercePrice,uploadQuote,money,esc,e=>errors.push(e),null,additionalMotifCount,()=>config.profile.designs[0]);
  assert.deepEqual(errors,[]);
  return {total:cells['[data-fk-total]'].textContent,html:cells['[data-ux-price-lines]'].innerHTML};
}

test('actual UX price updater shows mounting list price and full-unit discount separately after photos',()=>{
  const c=fixture(),s=state(c);s.mOptions.mounting='holes';c.profile.optionGroups[0].values[1].label='Bohrungen';
  for(const quantity of [2,3]){
    const p=commercePrice(c,s,quantity),ui=renderActualPriceFunction(c,s,quantity);
    assert.equal(ui.total,money(p.totalCents));
    assert.ok(ui.html.includes('<p>Bohrungen: '+money(299)+'</p>'));
    assert.ok(ui.html.includes('Fotos / Logos (1): '+money(999)));
    assert.ok(ui.html.includes('je Stück: −'+money(p.quantityTierDiscountCents)));
    assert.ok(ui.html.indexOf('Mengenrabatt')>ui.html.indexOf('Fotos / Logos'));
  }
});

test('actual UX price updater retains unscoped and no-tier totals, without a discount line for quantity one',()=>{
  for(const scope of [undefined,'complete-unit'])for(const withTier of [false,true]){
    const c=fixture(withTier);if(scope===undefined)delete c.quantityTierScope;
    const s=state(c),ui=renderActualPriceFunction(c,s,1);
    assert.equal(ui.total,money(3298));assert.equal(ui.html.includes('Mengenrabatt'),false);
    const qty3=renderActualPriceFunction(c,s,3);
    assert.equal(qty3.total,money(commercePrice(c,s,3).totalCents));
    assert.ok(qty3.html.includes('<p>Optionen: '+money(0)+'</p>'));
  }
});

test('fixed Shopify price remains usable at quantity one but refuses an active tier',()=>{
  const c=fixture(),s=state(c,false),b=binding(c,'base-only');validateCommerce(c,b);
  assert.equal(selectCommerceVariant(c,b,s,1).unitCents,2299);
  assert.throws(()=>selectCommerceVariant(c,b,s,2),/Mengenstaffel/);
});

test('CartTransform binding retains undiscounted variant base and carries the final tier amount',()=>{
  const c=fixture(),s=state(c),b=binding(c);validateCommerce(c,b);
  const p=selectCommerceVariant(c,b,s,2);assert.equal(p.baseVariantCents,2299);assert.equal(p.unitCents,3100);
  b.variants[0].priceCents=2161;assert.throws(()=>validateCommerce(c,b),/Shop-Preiszuordnung/);
});

test('legacy variable steel price still takes format/option prices rather than adding the nominal base',()=>{
  const c=fixture(false);c.steelFormats={};c.profile.optionGroups[0].values[0].priceCents=4500;
  const p=commercePrice(c,state(c),2);assert.equal(p.unitCents,5499);assert.equal(p.totalCents,10998);
  assert.equal('listUnitCents' in p,false);
});

test('legacy acrylic combination pricing, base surcharge and included photo stay unchanged',()=>{
  const c=fixture(false);c.acrylic={pricing:structuredClone(ACRYLIC_PRICING)};c.photo={includedCount:1,extraPriceCents:0};
  c.profile.optionGroups=['size','base','wall'].map((id,i)=>({id,name:id,defaultValueId:['large','eiche','wall'][i],values:[{id:['large','eiche','wall'][i],priceCents:0}]}));
  const s=state(c);s.mOptions={size:'large',base:'eiche',wall:'wall'};
  const p=commercePrice(c,s,3);assert.equal(p.unitCents,1999+999+100+599);assert.equal(p.totalCents,11091);
  assert.equal('quantityTier' in p,false);assert.equal(p.chargedUploads,0);
});

test('copied dependency closure remains byte-identical to the audited release',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../evidence/tier-pricing-sources.json',import.meta.url)));
  for(const row of manifest.files){
    if(['app/configurator/variant-m/contract.mjs','app/configurator/variant-m/commerce-model.mjs','app/configurator/variant-m/ux.mjs'].includes(row.path))continue;
    const bytes=fs.readFileSync(new URL('../merchant/'+row.path,import.meta.url));
    assert.equal(bytes.length,row.bytes,row.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);
  }
});
