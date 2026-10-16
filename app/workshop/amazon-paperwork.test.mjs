import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createAmazonOrderStore} from './amazon-order-store.mjs';
import {createAmazonPaperworkStore,amazonPositionCode} from './amazon-paperwork.mjs';

function raw({id='123-1234567-1234567',time='2026-10-16T10:00:00Z',marketplaceId='A1PA6795UKMFR9',count=2,status='UNSHIPPED',custom=false,quantity=2}={}){return {orderId:id,createdTime:'2026-10-15T10:00:00Z',lastUpdatedTime:time,salesChannel:{channelName:'AMAZON',marketplaceId},fulfillment:{fulfilledBy:'MERCHANT',fulfillmentStatus:status},buyer:{name:'PRIVATE_BUYER'},orderItems:Array.from({length:count},(_,i)=>({orderItemId:'ITEM-'+i,quantityOrdered:quantity,product:{sellerSku:'TEST-SKU-'+i,asin:'B000TEST01',customizationAvailable:custom,title:'PRIVATE_TITLE',price:{unitPrice:{amount:'19.99',currencyCode:'EUR'}}},fulfillment:{quantityFulfilled:0,quantityUnfulfilled:quantity}}))};}
function setup(t,{assigned=false,custom=false}={}){
 const directory=mkdtempSync(path.join(os.tmpdir(),'g27-paperwork-')),filename=path.join(directory,'test.sqlite');let db,orders,paperwork,customValue=null,now=Date.parse('2026-10-16T11:00:00Z');
 function open(){db=new DatabaseSync(filename);orders=createAmazonOrderStore({database:db,clock:()=>now,accountId:'test-account',repository:{get:id=>({id,revision:1,status:'draft',document:{kind:'product',name:'TEST · Müller Schild'}})},snapshot:id=>({id,schema:'gravuru-native-review/v1',packageSha256:'a'.repeat(64),product:{id:'cfg_test',revision:1},selection:{price:{quantity:2}}})});paperwork=createAmazonPaperworkStore({database:db,orders,clock:()=>now,custom:()=>customValue});}
 open();t.after(()=>{db.close();assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));assert.ok(path.basename(directory).startsWith('g27-paperwork-'));rmSync(directory,{recursive:true,force:true});});
 const receive=(order=raw({custom}),provenance='synthetic')=>orders.ingestPage({orders:[order]},{provenance}).lines;
 const lines=receive();function assign(values=lines){for(const line of values){orders.bind({marketplaceId:line.marketplaceId,sku:line.sku,productId:'cfg_test',productRevision:1});orders.attachSnapshot({lineId:line.id,snapshotId:'proof_'+line.id});}}
 if(assigned)assign();return {get db(){return db;},get orders(){return orders;},get paperwork(){return paperwork;},lines,receive,assign,setCustom:value=>customValue=value,tick:()=>now+=1000,reopen(){db.close();open();}};
}

test('one selected position freezes the complete scoped order once, with stable non-PII codes',t=>{
 const f=setup(t),first=f.paperwork.enqueue({lineIds:[f.lines[0].id]}),job=first.jobs[0];assert.equal(first.jobs.length,1);assert.equal(job.document.lines.length,2);assert.equal(job.status,'queued');assert.equal(job.blocked,false);assert.ok(job.openChecks.includes('snapshot-not-assigned'));
 assert.equal(f.paperwork.enqueue({lineIds:f.lines.map(l=>l.id)}).jobs[0].id,job.id);assert.equal(f.paperwork.list().total,1);
 const saved=JSON.stringify(job);assert.doesNotMatch(saved,/PRIVATE_BUYER|PRIVATE_TITLE|buyer|recipient/);assert.equal(job.document.lines[0].positionCode,amazonPositionCode(f.orders.get(f.lines[0].id)));assert.notEqual(job.document.lines[0].positionCode,job.document.lines[1].positionCode);
 f.reopen();assert.equal(f.paperwork.get(job.id).fingerprint,job.fingerprint);assert.equal(f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0].id,job.id);
 for(const table of ['amazon_paperwork_jobs','amazon_paperwork_codes','amazon_paperwork_events']){assert.throws(()=>f.db.exec(`DELETE FROM ${table}`),/retention/);assert.throws(()=>f.db.exec(`UPDATE ${table} SET ${table==='amazon_paperwork_codes'?'identity':'document'}='changed'`),/immutable/);}
});

test('missing snapshots still generate marked test PDFs; generation and print confirmation remain distinct and idempotent',t=>{
 const f=setup(t),job=f.paperwork.enqueue({lineIds:[f.lines[0].id],format:'A5'}).jobs[0];
 assert.throws(()=>f.paperwork.confirmPrinted({jobIds:[job.id],requestId:'not-generated',outputId:'unknown'}),/zuvor erzeugte/);
 const generated=f.paperwork.generate({jobIds:[job.id]});assert.equal(generated.pdf.subarray(0,5).toString(),'%PDF-');assert.equal(generated.pageCount,2);assert.equal(f.paperwork.get(job.id).status,'generated');assert.equal(f.paperwork.get(job.id).openChecks.includes('snapshot-not-assigned'),true);
 assert.deepEqual(f.paperwork.generate({jobIds:[job.id]}).pdf,generated.pdf);assert.equal(f.paperwork.events(job.id).filter(e=>e.kind==='generated').length,1);
 const args={jobIds:[job.id],outputId:generated.outputId,requestId:'print-001'},confirmed=f.paperwork.confirmPrinted(args);assert.equal(confirmed.physicalPrintingVerified,false);assert.equal(f.paperwork.get(job.id).status,'print-confirmed');assert.deepEqual(f.paperwork.confirmPrinted(args),confirmed);assert.equal(f.paperwork.events(job.id).filter(e=>e.kind==='print-confirmed').length,1);
 assert.throws(()=>f.paperwork.scan({code:job.document.orderId,stage:'production',requestId:'scan-missing'}),/gesperrt/);assert.equal(f.paperwork.scanEvents().length,0);
 f.reopen();assert.deepEqual(f.paperwork.output(generated.outputId).pdf,generated.pdf);assert.equal(f.paperwork.get(job.id).status,'print-confirmed');
});

test('batch snapshots are atomic and batch confirmation identifies exactly the generated PDF',t=>{
 const f=setup(t),other=f.receive(raw({id:'TEST-OTHER',count:1}));assert.throws(()=>f.paperwork.enqueue({lineIds:[other[0].id,'amazonline_missing']}));assert.equal(f.paperwork.list().total,0);
 const jobs=f.paperwork.enqueue({lineIds:[f.lines[0].id,other[0].id]}).jobs,ids=jobs.map(j=>j.id),generated=f.paperwork.generate({jobIds:ids});assert.equal(generated.pageCount,3);assert.equal(f.paperwork.list().total,2);
 assert.throws(()=>f.paperwork.confirmPrinted({jobIds:[ids[0]],outputId:generated.outputId,requestId:'wrong-batch'}),/genau/);assert.equal(f.paperwork.get(ids[0]).status,'generated');
 const args={jobIds:ids,outputId:generated.outputId,requestId:'print-batch'};f.paperwork.confirmPrinted(args);assert.throws(()=>f.paperwork.confirmPrinted({...args,jobIds:[ids[0]]}),/anderen Vorgang/);
 assert.equal(f.paperwork.list({limit:1,offset:1}).jobs.length,1);
});

test('frozen jobs become stale after assignment or source changes; earlier PDF and its hashes remain intact',t=>{
 const f=setup(t),first=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0],output=f.paperwork.generate({jobIds:[first.id]});f.assign();
 assert.equal(f.paperwork.get(first.id).blocked,true);assert.ok(f.paperwork.get(first.id).blockers.includes('paperwork-source-changed'));assert.throws(()=>f.paperwork.generate({jobIds:[first.id]}),/gesperrt/);
 const second=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0];assert.notEqual(second.id,first.id);assert.equal(second.openChecks.length,0);assert.equal(second.document.lines[0].positionCode,first.document.lines[0].positionCode);
 f.receive(raw({time:'2026-10-16T12:00:00Z',quantity:3}));assert.equal(f.paperwork.get(second.id).blocked,true);assert.throws(()=>f.paperwork.scan({code:second.document.orderId,stage:'production',requestId:'changed-scan'}),/gesperrt/);assert.deepEqual(f.paperwork.output(output.outputId).pdf,output.pdf);
});

test('order barcodes are scoped across marketplaces/provenance; position codes remain unique and read-only resolution writes nothing',t=>{
 const f=setup(t),second=f.receive(raw({marketplaceId:'A13V1IB3VIYZZH'})),third=f.receive(raw(), 'sandbox');const jobs=f.paperwork.enqueue({lineIds:[f.lines[0].id,second[0].id,third[0].id]}).jobs;
 assert.equal(jobs.length,3);assert.equal(new Set(jobs.map(j=>j.document.lines[0].positionCode)).size,3);assert.throws(()=>f.paperwork.resolveScan({code:f.lines[0].orderId}),/mehrdeutig/);
 const before=f.db.prepare('SELECT total_changes() AS n').get().n,resolved=f.paperwork.resolveScan({code:f.lines[0].orderId+'\r\n',accountId:'test-account',provenance:'synthetic',marketplaceId:'A1PA6795UKMFR9'});assert.equal(resolved.kind,'order');assert.equal(resolved.positions.length,2);assert.equal(f.db.prepare('SELECT total_changes() AS n').get().n,before);
 const position=f.paperwork.resolveScan({code:jobs[0].document.lines[0].positionCode});assert.equal(position.kind,'position');assert.equal(position.positions.length,1);
 assert.throws(()=>f.paperwork.resolveScan({code:position.code,accountId:'other-account'}),/diesem Amazon-Konto/);assert.throws(()=>f.paperwork.resolveScan({code:position.code,marketplaceId:'UNKNOWN'}),/keinem/);
});

test('explicit scan stages are sequential, atomic, monotonic and durable across retries/restarts',t=>{
 const f=setup(t,{assigned:true}),job=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0],code=job.document.orderId;
 assert.throws(()=>f.paperwork.scan({code,stage:'shipping-ready',requestId:'skip'}),/Reihenfolge/);assert.throws(()=>f.paperwork.scan({code,requestId:'implicit'}),/ausdrücklich/);assert.equal(f.paperwork.scanEvents().length,0);
 const input={code,stage:'production',requestId:'production-1'},first=f.paperwork.scan(input);assert.equal(first.changed,2);assert.equal(first.shippingStatusChanged,false);assert.equal(first.productionReady,false);assert.equal(f.paperwork.scan(input).replayed,true);assert.equal(f.paperwork.scan({...input,requestId:'production-repeat'}).changed,0);assert.equal(f.paperwork.resolveScan({code}).positions[0].revision,1);
 assert.throws(()=>f.paperwork.scan({...input,stage:'quality'}),/anderen Vorgang/);const position=job.document.lines[0].positionCode;assert.equal(f.paperwork.scan({code:position,stage:'quality',requestId:'quality-one'}).changed,1);
 assert.throws(()=>f.paperwork.scan({code,stage:'shipping-ready',requestId:'atomic-stage-skip'}),/Reihenfolge/);assert.equal(f.paperwork.resolveScan({code:position}).positions[0].stage,'quality');assert.equal(f.paperwork.scan({code,stage:'quality',requestId:'quality-all'}).changed,1);
 assert.equal(f.paperwork.scan({code,stage:'shipping-ready',requestId:'ready'}).changed,2);assert.equal(f.paperwork.scan({...input,requestId:'old-stage'}).changed,0);assert.ok(f.paperwork.resolveScan({code}).positions.every(p=>p.stage==='shipping-ready'&&p.revision===3));
 f.reopen();assert.ok(f.paperwork.resolveScan({code}).positions.every(p=>p.stage==='shipping-ready'));assert.equal(f.paperwork.scanEvents({lineId:f.lines[0].id}).length,6);assert.equal(f.orders.get(f.lines[0].id).fulfillmentStatus,'UNSHIPPED');
});

test('cancellation and source conflicts block fresh PDFs and all scan transitions without touching earlier artifacts',t=>{
 const f=setup(t,{assigned:true}),job=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0],output=f.paperwork.generate({jobIds:[job.id]});f.receive(raw({status:'CANCELLED',time:'2026-10-16T12:00:00Z'}));
 assert.throws(()=>f.paperwork.generate({jobIds:[job.id]}),/gesperrt/);assert.throws(()=>f.paperwork.confirmPrinted({jobIds:[job.id],outputId:output.outputId,requestId:'cancelled-print'}),/gesperrter/);assert.throws(()=>f.paperwork.scan({code:job.document.lines[0].positionCode,stage:'production',requestId:'cancelled-scan'}),/gesperrt/);assert.equal(f.paperwork.scanEvents().length,0);assert.deepEqual(f.paperwork.output(output.outputId).pdf,output.pdf);
 const next=f.receive(raw({id:'CONFLICT-TEST',count:1}));f.assign(next);const other=f.paperwork.enqueue({lineIds:[next[0].id]}).jobs[0];f.receive(raw({id:'CONFLICT-TEST',count:1,quantity:3}));assert.ok(f.paperwork.get(other.id).blockers.includes('conflicting-source-events'));assert.throws(()=>f.paperwork.generate({jobIds:[other.id]}),/gesperrt/);
});

test('only approved synthetic/anonymized Custom text is frozen; callback extras and real-data claims are discarded',t=>{
 const f=setup(t,{assigned:true,custom:true});f.setCustom({approved:true,provenance:'production',texts:[{label:'Name',value:'PRIVATE_REAL'}]});const first=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0];assert.ok(first.openChecks.includes('customization-not-approved'));assert.doesNotMatch(JSON.stringify(first),/PRIVATE_REAL/);assert.ok(f.paperwork.generate({jobIds:[first.id]}).pdf.length>1000);
 f.setCustom({approved:true,provenance:'synthetic',texts:[{label:'Testname',value:'Müller & Söhne'}],buyer:{name:'PRIVATE_BUYER'},token:'PRIVATE_TOKEN'});const second=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0];assert.equal(second.openChecks.length,0);assert.match(JSON.stringify(second),/Müller/);assert.doesNotMatch(JSON.stringify(second),/PRIVATE_BUYER|PRIVATE_TOKEN/);assert.equal(f.paperwork.scan({code:second.document.orderId,stage:'production',requestId:'custom-production'}).changed,2);
 f.setCustom({approved:true,provenance:'anonymized',texts:[{label:'Logo',value:'TEST'}]});const third=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0];assert.equal(third.document.lines[0].customTexts[0].value,'TEST');
 f.setCustom({approved:true,provenance:'synthetic',texts:[{label:'bad',value:'\u202eunsafe'}]});assert.throws(()=>f.paperwork.enqueue({lineIds:[f.lines[0].id]}),/Testinhalt/);
});

test('batch access is not limited to the order dashboard last 200 lines',t=>{
 const f=setup(t);for(let i=0;i<3;i++)for(let j=0;j<75;j++)f.receive(raw({id:`TEST-BULK-${i}-${j}`,count:1}));assert.equal(f.orders.list().length,200);
 const job=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0];assert.equal(job.document.lines.length,2);assert.equal(f.paperwork.resolveScan({code:f.lines[0].orderId}).positions.length,2);
});

test('scan progress is pinned to Custom source/version/image hashes and never silently carried into a new cycle',t=>{
 const f=setup(t,{assigned:true,custom:true}),summary={approved:true,provenance:'synthetic',version:2,hash:'a'.repeat(64),sourceSha256:'b'.repeat(64),texts:[{label:'Testtext',value:'Gleichbleibender Text'}],options:[{label:'Ausführung',value:'Schwarz'}],images:[{sha256:'c'.repeat(64)}]};f.setCustom(summary);
 const job=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0],code=job.document.orderId;assert.equal(job.document.lines[0].customTexts[1].value,'Schwarz');assert.equal(job.document.lines[0].customReference.version,2);
 f.paperwork.scan({code,stage:'production',requestId:'source-production'});f.paperwork.scan({code,stage:'quality',requestId:'source-quality'});
 f.setCustom({...summary,version:3,hash:'d'.repeat(64),images:[{sha256:'e'.repeat(64)}]});assert.ok(f.paperwork.resolveScan({code}).positions.every(p=>p.blockers.includes('progress-source-changed')));assert.throws(()=>f.paperwork.scan({code,stage:'shipping-ready',requestId:'old-cycle'}),/gesperrt/);assert.ok(f.paperwork.resolveScan({code}).positions.every(p=>p.stage==='quality'));assert.equal(f.paperwork.get(job.id).blocked,true);
 const next=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0];assert.notEqual(next.id,job.id);assert.equal(next.document.lines[0].customReference.hash,'d'.repeat(64));
});

test('Custom field bounds align with the approved import contract, including labels plus 4096 value characters',t=>{
 const f=setup(t,{assigned:true,custom:true});f.setCustom({approved:true,provenance:'synthetic',texts:Array.from({length:4},(_,i)=>({label:'Text '+i,value:'x'.repeat(1024)})),options:[]});assert.equal(f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0].document.lines[0].customTexts.length,4);
 f.setCustom({approved:true,provenance:'synthetic',texts:Array.from({length:32},(_,i)=>({label:'Text '+i,value:'TEST'})),options:Array.from({length:32},(_,i)=>({label:'Option '+i,value:'TEST'}))});assert.equal(f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0].document.lines[0].customTexts.length,64);
});

test('a pending manual Custom import blocks scan even when Amazon did not mark customization available',t=>{
 const f=setup(t,{assigned:true}),job=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0],code=job.document.orderId;assert.equal(job.openChecks.length,0);
 f.setCustom({approved:false,provenance:'synthetic',texts:[],reason:'custom_review_pending'});assert.ok(f.paperwork.resolveScan({code}).positions.every(p=>p.blockers.includes('customization-not-approved')));assert.throws(()=>f.paperwork.scan({code,stage:'production',requestId:'pending-custom'}),/gesperrt/);assert.equal(f.paperwork.get(job.id).blocked,true);
 const pending=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0];assert.equal(pending.document.lines[0].customPresent,true);assert.equal(pending.document.lines[0].customStatus,'custom_review_pending');assert.ok(f.paperwork.generate({jobIds:[pending.id]}).pdf.length>1000);
 f.setCustom({approved:false,provenance:null,texts:[],reason:'custom_import_missing'});assert.equal(f.paperwork.resolveScan({code}).positions[0].blockers.length,0);f.paperwork.scan({code,stage:'production',requestId:'no-custom'});
 f.setCustom({approved:false,provenance:'synthetic',texts:[],reason:'amazon_custom_import_order_changed'});assert.ok(f.paperwork.resolveScan({code}).positions[0].blockers.includes('progress-source-changed'));assert.throws(()=>f.paperwork.scan({code,stage:'quality',requestId:'pending-after-start'}),/gesperrt/);
});

test('enqueue savepoint rolls back a later failure while preserving the caller transaction',t=>{
 const f=setup(t),second=f.receive(raw({id:'SECOND-ATOMIC',count:1}));f.db.exec('CREATE TABLE test_caller(note TEXT); BEGIN; INSERT INTO test_caller VALUES(\'kept\');');
 f.db.exec("CREATE TRIGGER fail_second_paperwork BEFORE INSERT ON amazon_paperwork_jobs WHEN NEW.document LIKE '%SECOND-ATOMIC%' BEGIN SELECT RAISE(ABORT,'forced second job failure');END;");
 assert.throws(()=>f.paperwork.enqueue({lineIds:[f.lines[0].id,second[0].id]}),/forced second/);assert.equal(f.db.isTransaction,true);assert.equal(f.paperwork.list().total,0);assert.equal(f.db.prepare('SELECT count(*) AS n FROM amazon_paperwork_codes').get().n,0);assert.equal(f.db.prepare('SELECT note FROM test_caller').get().note,'kept');f.db.exec('COMMIT');
});

test('stored PDF corruption is detected before download, duplicate generation or print confirmation',t=>{
 const f=setup(t),job=f.paperwork.enqueue({lineIds:[f.lines[0].id]}).jobs[0],output=f.paperwork.generate({jobIds:[job.id]});f.db.exec('DROP TRIGGER amazon_paperwork_outputs_fixed');f.db.prepare('UPDATE amazon_paperwork_outputs SET pdf=? WHERE id=?').run(Buffer.from('%PDF-corrupted'),output.outputId);
 assert.throws(()=>f.paperwork.output(output.outputId),/Prüfsumme/);assert.throws(()=>f.paperwork.generate({jobIds:[job.id]}),/Prüfsumme/);assert.throws(()=>f.paperwork.confirmPrinted({jobIds:[job.id],outputId:output.outputId,requestId:'corrupt-print'}),/Prüfsumme/);assert.equal(f.paperwork.get(job.id).status,'generated');
});
