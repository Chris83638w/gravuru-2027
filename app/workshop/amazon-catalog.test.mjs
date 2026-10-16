import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createAmazonCatalogStore,normalizeAmazonListing} from './amazon-catalog.mjs';
const marketplaceId='A1PA6795UKMFR9',scope={marketplaceId,provenance:'synthetic'};
const listing=(amount='29.99')=>({sku:'TEST-SLATE',summaries:[{marketplaceId,asin:'B000TEST01',productType:'HOME',status:['BUYABLE']}],offers:[{marketplaceId,offerType:'B2C',price:{amount,currencyCode:'EUR'}}],fulfillmentAvailability:[{fulfillmentChannelCode:'DEFAULT',quantity:5}],issues:[{code:'90220',severity:'ERROR',attributeNames:['brand'],message:'PRIVATE-ISSUE-TEXT'}],relationships:[{marketplaceId,relationships:[{type:'VARIATION',parentSkus:['TEST-PARENT'],childSkus:[]}]}],attributes:{private:'PRIVATE-ATTRIBUTE'},unknown:'PRIVATE-UNKNOWN'});
function setup(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());let now=Date.parse('2026-10-16T10:00:00Z');const store=createAmazonCatalogStore({database:db,clock:()=>now});return {db,store,tick:()=>now+=1000};}
test('official Listings Decimal/string price stays exact and free-form fields are absent',()=>{
 const value=normalizeAmazonListing(listing(),marketplaceId);assert.deepEqual(value.offers[0].price,{cents:2999,currency:'EUR'});assert.equal(value.availability[0].quantity,5);assert.deepEqual(value.relationships[0].parentSkus,['TEST-PARENT']);assert.equal(value.issues[0].code,'90220');assert.ok(!JSON.stringify(value).includes('PRIVATE'));
 assert.throws(()=>normalizeAmazonListing(listing(29.99),marketplaceId));assert.throws(()=>normalizeAmazonListing(listing('29.999'),marketplaceId));
});
test('A -> B -> A observations show latest A while retaining two immutable source snapshots',t=>{
 const f=setup(t);f.store.save([listing('10.00')],scope);f.tick();f.store.save([listing('20.00')],scope);f.tick();f.store.save([listing('10.00')],scope);
 assert.equal(f.store.list()[0].offers[0].price.cents,1000);assert.equal(f.store.list()[0].observedAt,'2026-10-16T10:00:02.000Z');assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM amazon_listing_snapshots').get().n,2);
 assert.throws(()=>f.db.exec("UPDATE amazon_listing_snapshots SET document='{}'"),/immutable/);
});
test('catalog sandbox and synthetic identities cannot hide one another',t=>{
 const f=setup(t);f.store.save([listing('10.00')],scope);f.store.save([listing('20.00')],{...scope,provenance:'sandbox'});assert.equal(f.store.list().length,2);assert.deepEqual(new Set(f.store.list().map(v=>v.provenance)),new Set(['synthetic','sandbox']));
});
test('older source modification time cannot roll back the latest known listing',t=>{
 const f=setup(t),newer=listing('20.00'),older=listing('10.00');newer.summaries[0].lastUpdatedDate='2026-10-16T10:00:00Z';older.summaries[0].lastUpdatedDate='2026-10-15T10:00:00Z';f.store.save([newer],scope);const result=f.store.save([older],scope);assert.equal(result.stale,1);assert.equal(f.store.list()[0].offers[0].price.cents,2000);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM amazon_listing_snapshots').get().n,2);
});
test('invalid page is atomic, real imports are rejected, missing values stay unknown',t=>{
 const f=setup(t),invalid=listing();invalid.fulfillmentAvailability[0].quantity=-1;
 assert.throws(()=>f.store.save([listing(),invalid],scope));assert.equal(f.store.list().length,0);assert.throws(()=>f.store.save([listing()],{...scope,provenance:'production'}));
 const raw=listing();delete raw.offers;delete raw.fulfillmentAvailability[0].quantity;f.store.save([raw],scope);assert.deepEqual(f.store.list()[0].offers,[]);assert.equal(f.store.list()[0].availability[0].quantity,null);
});
test('malformed optional collections fail with a safe validation error',()=>{
 for(const key of ['offers','issues','relationships','fulfillmentAvailability']){const value=listing();value[key]={private:'PRIVATE'};assert.throws(()=>normalizeAmazonListing(value,marketplaceId),error=>error.code==='amazon_listing'&&!error.message.includes('PRIVATE'));}
 const value=listing();delete value.offers[0].price;assert.throws(()=>normalizeAmazonListing(value,marketplaceId));
});
