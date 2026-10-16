import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createAmazonOrderStore} from './amazon-order-store.mjs';

const options={provenance:'synthetic',marketplaceIds:['A1PA6795UKMFR9']};
const order=(patch={})=>({orderId:'TEST-ORDER-01',createdTime:'2026-10-15T10:00:00Z',lastUpdatedTime:'2026-10-15T11:00:00Z',salesChannel:{channelName:'AMAZON',marketplaceId:'A1PA6795UKMFR9'},fulfillment:{fulfillmentStatus:'UNSHIPPED',fulfilledBy:'MERCHANT',shipByWindow:{latestDateTime:'2026-10-19T20:00:00Z'}},orderItems:[{orderItemId:'TEST-ITEM-01',quantityOrdered:2,product:{sellerSku:'TEST-SLATE-01',asin:'B000TEST01',price:{unitPrice:{amount:'29.99',currencyCode:'EUR'}}},fulfillment:{quantityFulfilled:0,quantityUnfulfilled:2}}],...structuredClone(patch)});
function setup(t){
 const db=new DatabaseSync(':memory:');let time=Date.parse('2026-10-16T10:00:00Z');t.after(()=>db.close());
 const record={id:'cfg_test',revision:3,status:'draft',document:{kind:'product',name:'Synthetisches Schieferschild'}},manifest={id:'proof_test',schema:'gravuru-native-review/v1',packageSha256:'a'.repeat(64),product:{id:'cfg_test',revision:3,basePriceCents:4999,currency:'EUR'},selection:{options:{size:'small'},price:{quantity:2}},productionProfile:{id:'profile_test',revision:2,sha256:'b'.repeat(64)}};
 const factory=()=>createAmazonOrderStore({database:db,clock:()=>time,repository:{get(id,{revision}={}){assert.equal(id,record.id);return {...record,revision:revision??record.revision};}},snapshot:id=>{assert.equal(id,manifest.id);return manifest;}});
 let store=factory();const receive=payload=>store.ingestPage({orders:[payload]},options),bind=()=>store.bind({marketplaceId:'A1PA6795UKMFR9',sku:'TEST-SLATE-01',productId:'cfg_test',productRevision:3});
 return {db,record,manifest,get store(){return store;},receive,bind,reopen(){store=factory();},setTime:value=>time=Date.parse(value)};
}
test('identities deduplicate across repeated delivery and store reopen; original lines are immutable',t=>{
 const f=setup(t),a=f.receive(order());assert.equal(a.inserted,1);assert.equal(a.lines[0].totalCents,5998);const id=a.lines[0].id;
 assert.equal(f.receive(order()).duplicates,1);f.reopen();assert.equal(f.receive(order()).duplicates,1);assert.equal(f.store.list().length,1);assert.equal(f.store.get(id).id,id);
 for(const table of ['amazon_order_lines','amazon_order_events']){assert.throws(()=>f.db.exec(`UPDATE ${table} SET document='{}'`),/immutable/);assert.throws(()=>f.db.exec(`DELETE FROM ${table}`),/retention/);}
});
test('test scopes isolate identities and the seller account is frozen',t=>{
 const f=setup(t);f.receive(order());f.store.ingestPage({orders:[order()]},{...options,provenance:'sandbox'});assert.equal(f.store.list().length,2);
 assert.throws(()=>createAmazonOrderStore({database:f.db,accountId:'different-seller'}),/anderen Amazon-Konto/);
 assert.throws(()=>f.store.ingestPage({orders:[order()]},{provenance:'live'}),/gesperrt/);
});
test('pages are atomic; one invalid order rolls back all rows and cursor advancement',t=>{
 const f=setup(t);
 assert.throws(()=>f.store.ingestPage({orders:[order(),order({orderId:'TEST-ORDER-02',lastUpdatedTime:'bad'})],checkpointKey:'daily',nextToken:'opaque'},options));
 assert.equal(f.store.list().length,0);assert.equal(f.store.checkpoint('daily'),null);
});
test('cursor compare-and-swap prevents lost responses and changed queries from advancing state',t=>{
 const f=setup(t),query={marketplaceIds:['A1PA6795UKMFR9'],includedData:['FULFILLMENT','CANCELLATION']};
 const first=f.store.ingestPage({orders:[order()],checkpointKey:'daily',query,nextToken:'PRIVATE-CURSOR'},options);assert.equal(first.checkpoint.revision,1);assert.ok(!JSON.stringify(first).includes('PRIVATE-CURSOR'));assert.ok(!JSON.stringify(f.store.checkpoints()).includes('PRIVATE-CURSOR'));
 assert.throws(()=>f.store.ingestPage({orders:[order({orderId:'TEST-ORDER-02'})],checkpointKey:'daily',query,nextToken:null},options),/inzwischen/);assert.equal(f.store.list().length,1);
 assert.throws(()=>f.store.ingestPage({orders:[],checkpointKey:'daily',query:{},expectedRevision:1,expectedNextToken:'PRIVATE-CURSOR'},options),/anderen Suchabfrage/);
 const second=f.store.ingestPage({orders:[],checkpointKey:'daily',query,expectedRevision:1,expectedNextToken:'PRIVATE-CURSOR'},options);assert.equal(second.checkpoint.revision,2);assert.equal(f.store.checkpoint('daily').nextToken,null);
 assert.throws(()=>f.store.ingestPage({orders:[],checkpointKey:'daily',query,expectedRevision:1,expectedNextToken:'PRIVATE-CURSOR'},options),/inzwischen/);
});
test('later events update displayed source values; older arrivals cannot roll them back',t=>{
 const f=setup(t),id=f.receive(order()).lines[0].id,newer=order({lastUpdatedTime:'2026-10-15T12:00:00Z'});newer.orderItems[0].quantityOrdered=3;newer.orderItems[0].fulfillment.quantityUnfulfilled=3;
 f.receive(newer);assert.equal(f.store.get(id).quantity,3);
 const old=order({lastUpdatedTime:'2026-10-15T10:30:00Z'});assert.equal(f.receive(old).stale,1);assert.equal(f.store.get(id).quantity,3);assert.equal(f.store.status(id).eventCount,3);
});
test('same timestamp with different source data blocks production until a newer unambiguous source',t=>{
 const f=setup(t),raw=order(),id=f.receive(raw).lines[0].id;raw.orderItems[0].product.price.unitPrice.amount='30.00';f.receive(raw);
 assert.equal(f.store.status(id).conflict,true);assert.equal(f.store.status(id).productionBlocked,true);
 raw.lastUpdatedTime='2026-10-15T13:00:00Z';f.receive(raw);assert.equal(f.store.status(id).conflict,false);
});
test('historical cancellation and buyer requests latch a production stop even after reordered unshipped events',t=>{
 const f=setup(t),id=f.receive(order({lastUpdatedTime:'2026-10-15T14:00:00Z'})).lines[0].id,cancelled=order({lastUpdatedTime:'2026-10-15T12:00:00Z'});cancelled.fulfillment.fulfillmentStatus='CANCELLED';f.receive(cancelled);
 assert.equal(f.store.status(id).cancelled,true);assert.equal(f.store.status(id).state,'CANCELLED');
 f.bind();assert.throws(()=>f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'}),/gesperrt/);
 const request=order({orderId:'TEST-ORDER-02'});request.orderItems[0].cancellation={cancellationRequest:{cancelReason:'PRIVATE-REASON'}};const other=f.receive(request).lines[0].id;assert.equal(f.store.status(other).cancellationRequested,true);
});
test('a position missing from the latest complete order remains visible but blocked',t=>{
 const f=setup(t),id=f.receive(order()).lines[0].id;f.receive(order({lastUpdatedTime:'2026-10-15T14:00:00Z',orderItems:[]}));assert.equal(f.store.list().length,1);assert.equal(f.store.status(id).missing,true);assert.ok(f.store.status(id).blockers.includes('item-missing-in-latest-order'));
});
test('explicit SKU and snapshot assignment uses existing versions without recalculating Amazon prices',t=>{
 const f=setup(t),id=f.receive(order()).lines[0].id,b=f.bind();assert.equal(f.bind().id,b.id);const before=JSON.stringify(f.manifest);
 const assigned=f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'});assert.equal(assigned.product.revision,3);assert.equal(assigned.quantity,2);assert.equal(assigned.unitCents,2999);assert.equal(assigned.sourcePackageSha256,'a'.repeat(64));assert.equal(JSON.stringify(f.manifest),before);assert.equal(f.store.get(id).snapshotId,'proof_test');assert.equal(f.store.get(id).product.name,f.record.document.name);assert.equal(f.store.status(id).productionReady,false);
 assert.deepEqual(f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'}),assigned);assert.throws(()=>f.store.attachSnapshot({lineId:id,snapshotId:'proof_other'}),/unveränderlich/);assert.throws(()=>f.store.bind({marketplaceId:'A1PA6795UKMFR9',sku:'TEST-SLATE-01',productId:'cfg_test',productRevision:4}),/unveränderlich/);
 assert.throws(()=>f.db.exec("UPDATE amazon_production_assignments SET document='{}'"),/immutable/);
});
test('assigned production snapshot survives source amendments and cancellation; changes require review',t=>{
 const f=setup(t),id=f.receive(order()).lines[0].id;f.bind();const assigned=f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'}),newer=order({lastUpdatedTime:'2026-10-15T12:00:00Z'});newer.orderItems[0].quantityOrdered=3;newer.orderItems[0].fulfillment.quantityUnfulfilled=3;f.receive(newer);
 assert.equal(f.store.get(id).quantity,3);assert.equal(f.store.get(id).assignment.quantity,2);assert.deepEqual(f.store.get(id).assignment,assigned);assert.equal(f.store.status(id).changed,true);
 newer.lastUpdatedTime='2026-10-15T13:00:00Z';newer.orderItems[0].cancellation={cancellationExecution:{cancelledBy:'BUYER'}};f.receive(newer);assert.equal(f.store.status(id).cancelled,true);assert.deepEqual(f.store.get(id).assignment,assigned);
});
test('assignment refuses unknown products, mismatched revision/quantity/hash and not-ready orders',t=>{
 const f=setup(t),id=f.receive(order()).lines[0].id;assert.throws(()=>f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'}),/SKU zuerst/);f.bind();
 f.manifest.product.revision=4;assert.throws(()=>f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'}),/stimmen nicht/);f.manifest.product.revision=3;f.manifest.selection.price.quantity=1;assert.throws(()=>f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'}),/Menge/);f.manifest.selection.price.quantity=2;f.manifest.packageSha256='bad';assert.throws(()=>f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'}),/stimmen nicht/);
 const pending=order({orderId:'TEST-ORDER-PENDING'});pending.fulfillment.fulfillmentStatus='PENDING';const pendingId=f.receive(pending).lines[0].id;assert.throws(()=>f.store.attachSnapshot({lineId:pendingId,snapshotId:'proof_test'}),/gesperrt/);
});
test('custom availability and lateness are explicit; no restricted payload is stored',t=>{
 const f=setup(t),raw=order();raw.buyer={name:'PRIVATE-NAME'};raw.recipient={address:'PRIVATE-ADDRESS'};raw.orderItems[0].product.title='PRIVATE-TITLE';raw.orderItems[0].product.customization={customizedUrl:'https://example.invalid/PRIVATE-SIGNATURE'};raw.orderItems[0].cancellation={cancellationRequest:{cancelReason:'PRIVATE-REASON'}};
 const id=f.receive(raw).lines[0].id;assert.ok(f.store.status(id).blockers.includes('customization-not-imported'));f.setTime('2026-10-20T10:00:00Z');assert.equal(f.store.status(id).late,true);
 const dump=['amazon_order_events','amazon_order_lines','amazon_sku_bindings','amazon_production_assignments'].map(table=>JSON.stringify(f.db.prepare(`SELECT * FROM ${table}`).all())).join('');assert.ok(!dump.includes('PRIVATE'));assert.ok(!dump.includes('example.invalid'));
});
test('form review has no quantity contract and remains explicitly blocked as unverified',t=>{
 const f=setup(t),id=f.receive(order()).lines[0].id;f.bind();f.manifest.schema='gravuru-form-review/v1';delete f.manifest.selection;
 const assignment=f.store.attachSnapshot({lineId:id,snapshotId:'proof_test'});assert.equal(assignment.quantity,2);assert.equal(assignment.quantityVerified,false);assert.ok(f.store.status(id).blockers.includes('snapshot-quantity-unverified'));assert.equal(f.store.status(id).requiresReview,true);
});
