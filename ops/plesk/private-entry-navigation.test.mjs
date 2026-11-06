import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createPrivateTestProxy} from './runtime.mjs';

test('private external entry links retain authentication and isolate every other request',async t=>{
  const forwarded=[],events=[];
  const inner=http.createServer((req,res)=>{
    forwarded.push({method:req.method,url:req.url,headers:req.headers});
    // Mirror the existing loopback gallery boundary, including its second check.
    if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return res.writeHead(403).end();
    res.writeHead(200,{'Content-Type':'text/html'}).end('private synthetic entry');
  });
  inner.listen(0,'127.0.0.1');await once(inner,'listening');
  const config={origin:'https://private.example',host:'private.example',username:'synthetic',password:'synthetic-private-password'};
  const proxy=createPrivateTestProxy(config,inner,{onRequestFinished:event=>events.push(event)});
  proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  t.after(()=>{proxy.closeAllConnections();inner.closeAllConnections();proxy.close();inner.close();});
  const authorization='Basic '+Buffer.from(config.username+':'+config.password).toString('base64');
  const navigation={'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate','sec-fetch-dest':'document','sec-fetch-user':'?1'};
  const request=(route='/originale/editor?configuration=synthetic&design=D1',{method='GET',headers={}}={})=>new Promise((resolve,reject)=>{
    const values={host:config.host,'x-forwarded-proto':'https',authorization,...navigation,...headers};
    for(const key of Object.keys(values))if(values[key]===undefined)delete values[key];
    const req=http.request({hostname:'127.0.0.1',port:proxy.address().port,path:route,method,headers:values},res=>{
      let body='';res.on('data',part=>body+=part);res.once('end',()=>resolve({status:res.statusCode,body,headers:res.headers}));
    });req.on('error',reject);req.end();
  });
  await t.test('clicked cross-site and same-site entry pages reach the strict inner handler',async()=>{
    for(const route of ['/originale/','/originale/editor?configuration=synthetic&design=D1'])for(const site of ['cross-site','same-site']){
      const response=await request(route,{headers:{'sec-fetch-site':site}});
      assert.equal(response.status,200);assert.equal(response.body,'private synthetic entry');
      assert.equal(response.headers['cache-control'],'private, no-store');
      assert.equal(forwarded.at(-1).headers['sec-fetch-site'],'none');
      assert.equal(forwarded.at(-1).headers.authorization,undefined);
    }
    assert.equal((await request(undefined,{headers:{origin:config.origin}})).status,200);
    assert.equal(forwarded.at(-1).headers.origin,'http://127.0.0.1:'+inner.address().port);
  });
  await t.test('diagnostics contain only bounded metadata, never queries or sensitive headers',async()=>{
    await request('/originale/editor?token=never-log-query',{headers:{cookie:'never-log-cookie',origin:config.origin,'sec-fetch-mode':'x'.repeat(80)}});
    const event=events.at(-1);
    assert.deepEqual(Object.keys(event).sort(),['method','route','secFetchSite','secFetchMode','secFetchDest','secFetchUser','hostMatches','httpsMatches','originPresent','originMatches','status'].sort());
    assert.equal(event.status,403);assert.equal(event.route,'/originale/editor');assert.equal(event.secFetchMode.length,20);
    assert.equal(event.hostMatches,true);assert.equal(event.httpsMatches,true);assert.equal(event.originPresent,true);assert.equal(event.originMatches,true);
    const logged=JSON.stringify(events);for(const privateValue of ['never-log-query','never-log-cookie',config.password,authorization,config.host])assert.ok(!logged.includes(privateValue));
  });
  await t.test('both entry pages still require valid Basic authentication',async()=>{
    const before=forwarded.length;
    for(const route of ['/originale/','/originale/editor'])for(const auth of ['', 'Basic '+Buffer.from('synthetic:wrong').toString('base64')]){
      const response=await request(route,{headers:{authorization:auth}});assert.equal(response.status,401);assert.equal(response.body,'');assert.match(response.headers['www-authenticate'],/^Basic /);
    }
    assert.equal(forwarded.length,before);
  });
  await t.test('exact origin, Host and HTTPS checks remain mandatory',async()=>{
    const before=forwarded.length;
    for(const headers of [{origin:'https://foreign.example'},{origin:'null'},{host:'foreign.example'},{'x-forwarded-proto':'http'},{'x-forwarded-proto':'https,http'}])assert.equal((await request(undefined,{headers})).status,403);
    assert.equal(forwarded.length,before);
  });
  await t.test('iframe, subresource, script-triggered and incomplete navigation metadata stay blocked',async()=>{
    const before=forwarded.length;
    for(const site of ['cross-site','same-site'])for(const headers of [
      {'sec-fetch-dest':'iframe'},{'sec-fetch-dest':'image'},{'sec-fetch-dest':'empty'},
      {'sec-fetch-mode':'cors'},{'sec-fetch-mode':'no-cors'},{'sec-fetch-mode':undefined},
      {'sec-fetch-dest':undefined},{'sec-fetch-user':undefined},{'sec-fetch-user':'?0'},
      {'sec-fetch-site':'unknown'},{'sec-fetch-site':'cross-site, same-origin'},
    ])assert.equal((await request(undefined,{headers:{'sec-fetch-site':site,...headers}})).status,403);
    assert.equal(forwarded.length,before);
  });
  await t.test('writes, HEAD, APIs, assets and nonexact route variants never get the exception',async()=>{
    const before=forwarded.length;
    for(const method of ['POST','PATCH','PUT','DELETE','HEAD','OPTIONS'])assert.equal((await request(undefined,{method})).status,403);
    for(const route of ['/editor.html','/originale','/originale//','/originale/editor/','/originale/%65ditor','/originale/editor/context','/originale/editor/save','/originale/editor.js','/originale/approvals','/originale/comments','/api/workshop/products','/__test/health','//originale/editor','/unknown'])assert.equal((await request(route)).status,403);
    assert.equal(forwarded.length,before);
  });
  await t.test('same-origin iframe and ordinary clients retain existing behavior and headers',async()=>{
    for(const site of ['same-origin','none',undefined]){
      assert.equal((await request('/editor.html',{headers:{'sec-fetch-site':site,'sec-fetch-dest':'iframe','sec-fetch-user':undefined}})).status,200);
      assert.equal(forwarded.at(-1).headers['sec-fetch-site'],site);
    }
  });
  await t.test('diagnostic output is capped at twenty events for the process',async()=>{
    for(let i=0;i<25;i++)assert.equal((await request('/editor.html',{headers:{'sec-fetch-site':'same-origin'}})).status,200);
    assert.equal(events.length,20);
  });
});
