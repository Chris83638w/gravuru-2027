import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCartLedger,euro,png,removeCartLine,renderCustomerCart} from './beta-267-cart.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const plate=(seed)=>png(48,36,(x,y)=>{
 const ink=seed==='nord'?[20,90,70]:[150,70,40];
 const on=y>8&&y<28&&x>6&&x<42;
 return on?ink:[240,236,228];
});

function line(seed,text){
 const previewPng=plate(seed);
 return {variantId:'9001',productTitle:'Funkklingel Fixture',designName:'Beispiel',options:[{label:'Format',value:'16x28 cm'},{label:'Befestigung',value:'SIL'}],gravurtext:text,unitCents:5498,quantity:1,currency:'EUR',designSha256:digest(Buffer.from(text)),previewPng,snapshotId:'proof-'+seed};
}

test('two personalisations of one variant keep their own preview, price and revision',()=>{
 const ledger=createCartLedger();
 const a=ledger.commit(line('nord','Haus Nord 12')),b=ledger.commit(line('sued','Haus Süd 27'));
 assert.equal(a.variantId,b.variantId);assert.notEqual(a.configuration.id,b.configuration.id);
 assert.equal(a.configuration.rev,1);assert.equal(b.configuration.rev,1);
 assert.notEqual(a.previewSha256,b.previewSha256);assert.equal(a.unitCents,5498);assert.equal(euro(5498),'54,98 €');
 const html=renderCustomerCart(ledger.lines());
 assert.equal(html.includes('Haus Nord 12'),true);assert.equal(html.includes('Haus Süd 27'),true);
 assert.equal(html.includes(a.previewSha256)===false,true);
 assert.equal((html.match(/data-enlarge data-src/g)||[]).length,2);
 assert.equal((html.match(/data-remove="/g)||[]).length,2);
 assert.equal(html.includes('gravuru-cart-edit'),false);
 assert.equal(html.includes('_gravuru_bearbeiten'),false);
 assert.equal(/<a\b/i.test(html),false);
 assert.equal(/>\s*Bearbeiten\s*</.test(html),false);
 assert.equal(/>\s*Weiter gestalten\s*</.test(html),false);
 const kept=removeCartLine(ledger.lines(),a.lineId);
 assert.equal(kept.length,1);assert.equal(kept[0].gravurtext,'Haus Süd 27');assert.equal(kept[0].previewSha256,b.previewSha256);
});

test('loading and error states stay visible and never fall back to another line image',()=>{
 const ready=createCartLedger().commit(line('nord','Haus Nord 12'));
 const html=renderCustomerCart([ready,{...ready,lineId:'cfg_wait',configuration:{id:'cfg_wait',rev:1},gravurtext:'wird geladen',preview:{status:'loading',message:'Persönliche Vorschau wird geladen.'}},{...ready,lineId:'cfg_bad',configuration:{id:'cfg_bad',rev:1},gravurtext:'fehlt',preview:{status:'error',message:'Persönliche Vorschau konnte nicht geladen werden.'}}]);
 assert.equal((html.match(/data-preview-status="loading"/g)||[]).length,1);
 assert.equal((html.match(/data-preview-status="error"/g)||[]).length,1);
 assert.equal((html.match(/data-enlarge data-src/g)||[]).length,1);
});

test('negative order checks reject wrong price, foreign id, stale revision, unpaid, cancelled and swapped previews',()=>{
 const ledger=createCartLedger(),a=ledger.commit(line('nord','Haus Nord 12')),b=ledger.commit(line('sued','Haus Süd 27'));
 const order=()=>({financialStatus:'paid',cancelledAt:null,lines:[a,b]});
 assert.equal(ledger.acceptOrder(order()).accepted,true);
 assert.equal(ledger.acceptOrder(order()).productionReady,false);
 assert.throws(()=>ledger.acceptOrder({...order(),financialStatus:'pending'}),{code:'order_unpaid'});
 assert.throws(()=>ledger.acceptOrder({...order(),cancelledAt:'2026-11-19T12:00:00Z'}),{code:'order_cancelled'});
 assert.throws(()=>ledger.acceptOrder({financialStatus:'paid',cancelledAt:null,lines:[{...a,unitCents:4999},b]}),{code:'order_price'});
 assert.throws(()=>ledger.acceptOrder({financialStatus:'paid',cancelledAt:null,lines:[{...a,configuration:{id:'cfg_fremd',rev:1}},b]}),{code:'order_foreign'});
 assert.throws(()=>ledger.acceptOrder({financialStatus:'paid',cancelledAt:null,lines:[{...a,configuration:{id:a.configuration.id,rev:0}},b]}),{code:'order_stale'});
 assert.throws(()=>ledger.acceptOrder({financialStatus:'paid',cancelledAt:null,lines:[{...a,gravurtext:'anders'},b]}),{code:'order_manipulated'});
 assert.throws(()=>ledger.acceptOrder({financialStatus:'paid',cancelledAt:null,lines:[{...a,previewSha256:b.previewSha256},{...b,previewSha256:a.previewSha256}]}),{code:'order_manipulated'});
 assert.throws(()=>ledger.remove('cfg_missing'),{code:'cart_missing'});
});
