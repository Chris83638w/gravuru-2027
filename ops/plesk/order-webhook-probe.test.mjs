import test from 'node:test';import assert from 'node:assert/strict';
import http from 'node:http';import {once} from 'node:events';
import {ORDER_WEBHOOK_URI,probeOrderWebhook} from './order-webhook-probe.mjs';
import {ORDER_WEBHOOK_PATH} from '../../app/workshop/shopify-order-webhook.mjs';

test('unsigned native probe sends no browser metadata and does not follow redirects',async()=>{
 const received=[];let status=401;
 const server=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;received.push({method:req.method,headers:req.headers,body});res.writeHead(status,{location:'https://example.invalid/never'}).end();});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const requestImpl=(url,options,callback)=>{assert.equal(url,ORDER_WEBHOOK_URI);assert.equal(new URL(url).pathname,ORDER_WEBHOOK_PATH);assert.equal(options.rejectUnauthorized,undefined);return http.request(`http://127.0.0.1:${server.address().port}/probe`,options,callback);};
  assert.equal((await probeOrderWebhook({requestImpl})).status,401);status=302;assert.equal((await probeOrderWebhook({requestImpl})).status,302);
  assert.equal(received.length,2);for(const r of received){assert.equal(r.method,'POST');assert.equal(r.body,'{}');assert.equal(r.headers['content-type'],'application/json');assert.equal(r.headers['content-length'],'2');assert.equal(r.headers.origin,undefined);assert.equal(r.headers.authorization,undefined);assert.equal(r.headers['x-shopify-hmac-sha256'],undefined);assert.equal(Object.keys(r.headers).some(h=>h.startsWith('sec-fetch-')),false);}
 }finally{server.close();server.closeAllConnections();await once(server,'close');}
});

test('an unresponsive endpoint is bounded by the native request timeout',async()=>{
 const server=http.createServer(()=>{});server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await assert.rejects(probeOrderWebhook({timeoutMs:30,requestImpl:(_url,options,callback)=>http.request(`http://127.0.0.1:${server.address().port}/`,options,callback)}),{name:'AbortError'});}
 finally{server.close();server.closeAllConnections();await once(server,'close');}
});
