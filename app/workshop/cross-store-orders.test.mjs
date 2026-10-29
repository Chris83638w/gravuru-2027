import test from 'node:test';
import assert from 'node:assert/strict';
import {crossStoreOrders,createCrossStoreOrders} from './cross-store-orders.mjs';
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
