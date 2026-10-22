import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {commercePrice} from './commerce-model.mjs';
import {quote,money,visibleGroups} from './contract.mjs';
import {uploadQuote,additionalMotifCount} from './ux-model.mjs';

// Exercise the actual rendering function: the backend price was already right,
// while this UI added the undiscounted photo again after calculating the tier.
const source=fs.readFileSync(process.env.GRAVURU_PREVIEW_UX_SOURCE||new URL('./ux.mjs',import.meta.url),'utf8');
const start=source.indexOf('  function updatePrice()'),end=source.indexOf('\n  function update(){',start);
assert.ok(start>=0&&end>start);
function render({quantity=2,photo=true,scope='complete-unit',tiers=true,mounting='none',extraMotif=false}={}){
  const config={basePriceCents:2299,extraMotifCents:169,photo:{includedCount:0,extraPriceCents:999},
    ...(tiers?{quantityTiers:[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}],...(scope?{quantityTierScope:scope}:{})}:{}),
    profile:{id:'price-regression',revision:'test',material:{kind:'slate'},defaultDesignId:'design',
      designs:[{id:'design',objects:[]}],optionGroups:[{id:'mounting',defaultValueId:'none',values:[{id:'none',label:'Ohne Befestigung',priceCents:0},{id:'holes',label:'Bohrungen',priceCents:299}]}]}};
  const state={designId:'design',mOptions:{mounting},objects:[...(photo?[{id:'photo',type:'photoSlot',uxUploadId:'synthetic',uxUploadKind:'photo'}]:[]),...(extraMotif?[{id:'motif',type:'motif',motif:'synthetic'}]:[])]};
  const nodes=new Map(),$=key=>{if(!nodes.has(key))nodes.set(key,{value:quantity});return nodes.get(key);};
  const args={config,el:{state},profile:config.profile,$,uploadQuote,commercePrice,quote,money,visibleGroups,additionalMotifCount,esc:x=>String(x),tierNote:{dataset:{}},say:message=>{throw Error(message);}};
  Function(...Object.keys(args),source.slice(start,end)+'\nupdatePrice();')(...Object.values(args));
  return {total:$('[data-fk-total]').textContent,detail:$('[data-ux-price-lines]').innerHTML};
}
test('preview includes the photo in the full-unit tier at quantity two',()=>{
  const r=render();assert.equal(r.total,money(6200));assert.ok(r.detail.includes('Fotos / Logos (1): '+money(999)));assert.ok(r.detail.includes('Ohne Befestigung: '+money(0)));assert.ok(r.detail.includes('−'+money(198)+' je Stück'));
});
test('preview includes the photo in the full-unit tier at quantity three',()=>{
  const r=render({quantity:3});assert.equal(r.total,money(8904));assert.ok(r.detail.includes('−'+money(330)+' je Stück'));
});
test('one unit and products without a tier retain the full photo charge',()=>{
  assert.equal(render({quantity:1}).total,money(3298));assert.equal(render({quantity:2,tiers:false}).total,money(6596));
});
test('old unscoped tier continues to exclude the photo discount',()=>{
  assert.equal(render({scope:undefined}).total,money(6200));
  assert.equal(render({scope:null}).total,money(6320));
});
test('mounting and motifs remain listed at their undiscounted component prices',()=>{
  const r=render({mounting:'holes',extraMotif:true});assert.equal(r.total,money(7080));assert.ok(r.detail.includes('Bohrungen: '+money(299)));assert.ok(r.detail.includes('Zusätzliche Motive: '+money(169)));
});
test('removing the photo removes its surcharge before applying the tier',()=>{
  assert.equal(render({photo:false}).total,money(4322));
});
