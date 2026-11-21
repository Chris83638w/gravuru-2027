import test from 'node:test';
import assert from 'node:assert/strict';
import {crossStoreOrders,createCrossStoreOrders,outputStateFromJobs,rejectedOutputState} from './cross-store-orders.mjs';
import {orderKey,orderApi,orderPage,orderRequest,selectedOrder} from './ui/order-store-context.mjs';
import {acrylAssetText,acrylRoute} from './acryl-employee-host.mjs';
import {once} from 'node:events';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
const shop='test.myshopify.com',origin='https://work.example';
const row=(id,orderId)=>({id,orderId,shopDomain:shop,receivedAt:'2026-10-29T11:00:00Z',product:{name:'Test'},test:true});
const store=(storeId,rows,errors=[])=>({storeId,apiPrefix:storeId==='acryl'?'/api/workshop/acryl/':'/api/workshop/',workshop:{sessionContext:{shopDomain:shop},orderIntake:{list:()=>rows,errors:()=>errors,status:id=>({label:storeId+' '+id})}}});
const stores=()=>[store('legacy',[row('same','old')]),store('acryl',[row('same','new'),{...row('foreign','x'),shopDomain:'other.myshopify.com'}],[{...row('error','rejected'),intakeError:'Preis weicht ab'}])];

test('orders page serves its complete browser module graph, including the scoped store helper',async t=>{
 const server=createPreviewServer({workshop:{}});server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const origin='http://127.0.0.1:'+server.address().port,queue=['/workshop-ui/orders-ui.mjs'],visited=new Set();
 while(queue.length){const path=queue.shift();if(visited.has(path))continue;visited.add(path);
  const response=await fetch(origin+path);assert.equal(response.status,200,path);assert.match(response.headers.get('content-type'),/javascript/,path);
  const source=await response.text();for(const m of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){const child=new URL(m[1],origin+path).pathname;if(child.startsWith('/workshop-ui/'))queue.push(child);}
 }
 assert.ok(visited.has('/workshop-ui/order-store-context.mjs'));assert.ok(visited.has('/workshop-ui/merchant-request.mjs'));
});
test('combined orders keep both stores, rejected lines, immutable IDs and independent statuses',()=>{
 const input=stores(),before=JSON.stringify(input),r=crossStoreOrders(input,{shopDomain:shop,enabled:true});
 assert.equal(r.orders.length,2);assert.deepEqual(new Set(r.orders.map(o=>o.orderId)),new Set(['old','new']));
 assert.equal(r.orders[0].id,r.orders[1].id);assert.notEqual(orderKey(r.orders[0]),orderKey(r.orders[1]));
 assert.equal(r.statuses['acryl:same'].label,'acryl same');assert.equal(r.statuses['legacy:same'].label,'legacy same');
 assert.equal(r.errors[0].storeId,'acryl');assert.equal(r.errors[0].intakeError,'Preis weicht ab');assert.equal(JSON.stringify(input),before);
 assert.equal(selectedOrder(r.orders,'same'),null);assert.equal(selectedOrder(r.orders,'acryl:same').orderId,'new');
 assert.equal(selectedOrder(r.orders.slice(0,1),'same'),r.orders[0]);
});
// #265 Stufe B, Lieferung 1 (ENTSCHEIDUNGEN 3.48/3.51/3.53): Kennzeichen der Fertigungsdatei je Position.
test('the output mark is derived from the export jobs alone: fertig before wird erstellt before bitte prüfen, always with a reason',()=>{
 const job=(id,status,error=null)=>({id,status,error});
 assert.deepEqual(outputStateFromJobs([job('a','failed','alt'),job('b','running'),job('c','completed')]),{state:'fertig',reason:null,jobId:'c'});
 assert.deepEqual(outputStateFromJobs([job('a','failed','alt'),job('b','queued')]),{state:'wird erstellt',reason:null,jobId:'b'});
 assert.deepEqual(outputStateFromJobs([job('b','running')]),{state:'wird erstellt',reason:null,jobId:'b'});
 assert.deepEqual(outputStateFromJobs([job('a','failed','Die Schrift fehlt.'),job('z','failed','älter')]),{state:'bitte prüfen',reason:'Die Schrift fehlt.',jobId:'a'});
 assert.deepEqual(outputStateFromJobs([],'Die getrennte Fertigungsausgabe ist noch nicht angebunden.'),{state:'bitte prüfen',reason:'Die getrennte Fertigungsausgabe ist noch nicht angebunden.',jobId:null});
 for(const empty of [outputStateFromJobs([]),outputStateFromJobs([job('a','failed')]),rejectedOutputState({})]){assert.equal(empty.state,'bitte prüfen');assert.ok(empty.reason);}
 assert.deepEqual(rejectedOutputState({intakeError:'Preis weicht ab'}),{state:'bitte prüfen',reason:'Preis weicht ab',jobId:null});
});
test('combined orders carry the output mark per position; rejected lines are „bitte prüfen“ with the intake reason and their saved design',()=>{
 const job=(id,status,error=null)=>({id,status,error}),jobs={same:[job('job_1','queued')]},asked=[];
 const input=stores();input[1].workshop.orderIntake.errors=()=>[{...row('error','rejected'),lineId:'9',intakeError:'Preis weicht ab',snapshotId:'proof_saved'}];
 // Nur die neue Laufzeit kennt das Kennzeichen; es wird bei jedem Lesen neu aus den Aufträgen des Prüfstands gebildet.
 input[1].workshop.orderOutputState=line=>{asked.push(line.id);return outputStateFromJobs(jobs[line.id]||[],'Noch kein Ausgabeauftrag.');};
 const read=()=>crossStoreOrders(input,{shopDomain:shop,enabled:true});
 let r=read();assert.deepEqual(r.outputStates,{'acryl:same':{state:'wird erstellt',reason:null,jobId:'job_1'}},'the older runtime has no mark');
 assert.deepEqual(asked,['same'],'foreign shops are never asked');
 assert.deepEqual(r.errors[0].outputState,{state:'bitte prüfen',reason:'Preis weicht ab',jobId:null});
 assert.equal(r.errors[0].snapshotId,'proof_saved');assert.equal(orderPage(r.errors[0],'pruefstaende/?snapshot='+r.errors[0].snapshotId),'/werkstatt/acryl/pruefstaende/?snapshot=proof_saved');
 jobs.same=[job('job_1','completed')];assert.deepEqual(read().outputStates['acryl:same'],{state:'fertig',reason:null,jobId:'job_1'});
 jobs.same=[job('job_1','failed','Die Python-Druckprüfung ist nicht verfügbar.')];assert.deepEqual(read().outputStates['acryl:same'],{state:'bitte prüfen',reason:'Die Python-Druckprüfung ist nicht verfügbar.',jobId:'job_1'});
 delete jobs.same;assert.deepEqual(read().outputStates['acryl:same'],{state:'bitte prüfen',reason:'Noch kein Ausgabeauftrag.',jobId:null});
 // Ein Lesefehler bleibt auf das Kennzeichen dieser Position begrenzt und verrät nichts Internes.
 input[1].workshop.orderOutputState=()=>{throw Error('private database path');};r=read();
 assert.equal(r.orders.length,2);assert.equal(r.outputStates['acryl:same'].state,'bitte prüfen');assert.ok(r.outputStates['acryl:same'].reason);assert.ok(!JSON.stringify(r).includes('private database path'));
 // Auch nicht lesbare Positionen stehen als „bitte prüfen“ in der Fehlerliste.
 const unreadable=crossStoreOrders([store('acryl',[{...row('bad','position-1'),lineId:'1',receivedAt:null}])],{shopDomain:shop,enabled:true});
 assert.equal(unreadable.errors[0].outputState.state,'bitte prüfen');assert.equal(unreadable.errors[0].outputState.reason,unreadable.errors[0].intakeError);
});
test('an older Merchant runtime without E3 still contributes orders alongside recent Acryl positions',()=>{
 const input=stores();
 delete input[0].workshop.orderIntake.errors;
 const result=crossStoreOrders(input,{shopDomain:shop,enabled:true});
 assert.deepEqual(new Set(result.orders.map(order=>order.storeId)),new Set(['legacy','acryl']));
 assert.equal(result.statuses['legacy:same'].label,'legacy same');
 assert.equal(result.errors.length,1);
 assert.equal(result.errors[0].storeId,'acryl');
});
test('a failed position or invalid display record becomes a scoped error row',()=>{
 const failed={...row('broken','position-101'),lineId:'11',quantity:4};
 const badDisplay={...row('bad-display','position-102'),lineId:'12',receivedAt:null};
 const foreign={...failed,shopDomain:'other.myshopify.com',orderId:'foreign'};
 const input=[store('legacy',[row('healthy','legacy-order'),failed,foreign]),store('acryl',[row('healthy','acryl-order'),badDisplay])];
 const status=input[0].workshop.orderIntake.status,calls=[];
 input[0].workshop.orderIntake.status=id=>{
  calls.push(id);
  if(id===failed.id)throw Error('private detail');
  return status(id);
 };
 const result=crossStoreOrders(input,{shopDomain:shop,enabled:true});
 assert.deepEqual(result.orders.map(order=>order.orderId),['acryl-order','legacy-order']);
 assert.deepEqual(calls,['healthy','broken']);
 assert.deepEqual(result.errors.map(error=>[error.orderId,error.lineId,error.pagePrefix,error.status,error.overviewReadError]),[
  ['position-101','11','/werkstatt/','fehler',true],
  ['position-102','12','/werkstatt/acryl/','fehler',true],
 ]);
 assert.ok(!JSON.stringify(result).includes('private detail'));
});
test('combined endpoint requires the merchant and fixed origin; accepts no writes or partial index',async()=>{
 let reads=0;const s=stores();for(const x of s){const old=x.workshop.orderIntake.list;x.workshop.orderIntake.list=()=>{reads++;return old();};}
 const api=createCrossStoreOrders({stores:s,origin,shopDomain:shop,verifyMerchant:t=>t==='Bearer good'?{role:'merchant',shopDomain:shop,subject:'operator'}:null,enabled:true});
 const req={method:'GET',headers:{host:'work.example','x-forwarded-proto':'https',authorization:'Bearer good'}};
 async function run(r,u=origin+'/api/workshop/all-orders'){let status,value;await api.handle(r,{writeHead(s){status=s;},end(v){value=JSON.parse(v);}},new URL(u));return {status,value};}
 for(const bad of [{...req,method:'POST'},{...req,headers:{...req.headers,authorization:'bad'}},{...req,headers:{...req.headers,origin:'https://evil.example'}},{...req,headers:{...req.headers,'sec-fetch-site':'cross-site'}},{...req,headers:{...req.headers,host:'other.example'}}])assert.ok((await run(bad)).status>=400);
 assert.equal(reads,0);assert.equal((await run(req,origin+'/api/workshop/all-orders?store=other')).status,404);
 assert.equal((await run(req)).value.orders.length,2);assert.equal(reads,2);
 s[1].workshop.orderIntake.list=()=>{throw Error('private database path');};const failed=await run(req);assert.equal(failed.status,503);assert.ok(!JSON.stringify(failed).includes('private database path'));
});
test('scope pins every action and view to the row; foreign routing is rejected',()=>{
 const row={apiPrefix:'/api/workshop/acryl/',pagePrefix:'/werkstatt/acryl/'};
 assert.equal(orderApi(row,'orders/one/production'),'/api/workshop/acryl/orders/one/production');
 assert.equal(orderPage(row,'pruefstaende/?snapshot=one'),'/werkstatt/acryl/pruefstaende/?snapshot=one');
 assert.equal(orderApi({},'session'),'/api/workshop/session');
 assert.throws(()=>orderApi({apiPrefix:'https://evil.example/'},'orders'));
 assert.throws(()=>orderPage({...row,pagePrefix:'/werkstatt/'},'ausgaben/'));
 for(const name of ['bestellungen','pruefstaende','ausgaben','formprodukt'])assert.equal(acrylRoute('/werkstatt/acryl/'+name+'/'),'/werkstatt/'+name+'/');
 assert.equal(acrylRoute('/werkstatt/bestellungen/'),'/werkstatt/bestellungen/');
 assert.equal(acrylRoute('/werkstatt/acryl/ausgaben/other'),null);
 for(const name of ['orders-ui','order-store-context','order-product-ui','order-file-grants-ui','production-release-ui'])assert.equal(acrylAssetText('"/api/workshop/" "/api/workshop/acryl/"','/workshop-ui/'+name+'.mjs'),'"/api/workshop/" "/api/workshop/acryl/"');
 assert.equal(acrylAssetText('"/werkstatt/pruefstaende/"'), '"/werkstatt/acryl/pruefstaende/"');
});
test('a write obtains CSRF from the same store even when the selection changes while awaiting it',async t=>{
 const calls=[];const row={apiPrefix:'/api/workshop/acryl/'};
 const request=async(path,options)=>{calls.push({path,options});if(path.endsWith('/session')){row.apiPrefix='/api/workshop/';return new Response(JSON.stringify({csrfToken:'acryl-token'}));}return new Response('{}');};
 await orderRequest(row,'orders/one/production/transition',{to:'geprueft'},request);
 assert.deepEqual(calls.map(c=>c.path),['/api/workshop/acryl/session','/api/workshop/acryl/orders/one/production/transition']);
 assert.equal(new Headers(calls[1].options.headers).get('x-gravuru-csrf'),'acryl-token');assert.equal(calls[1].options.method,'POST');
});
