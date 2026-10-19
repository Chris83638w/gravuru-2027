import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {build} from './build.mjs';
import {createPreviewServer} from './server.mjs';

test('local preview serves complete acrylic model but no write, shop or admin routes',async()=>{
  const result=build();
  assert.equal(result.models,1);
  const server=createPreviewServer();
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;
  const request=(url,{method='GET',headers={}}={})=>new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,path:url,method,headers},res=>{
      const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });req.on('error',reject);req.end();
  });
  try{
    const model=await request('/models.json');assert.equal(model.status,200);
    const rows=JSON.parse(model.body);assert.equal(rows.length,1);
    assert.equal(rows[0].key,'acryl');assert.equal(rows[0].universal.profile.binding.kind,'local-review');
    assert.equal(rows[0].universal.profile.features.orderEnabled,false);
    assert.equal(rows[0].universal.profile.optionGroups.find(g=>g.id==='base').values.length,7);
    for(const route of ['/?model=acryl','/editor.html','/assistant.js','/api/guides','/configurator/variant-m/contract.mjs','/workshop/theme-limits.mjs','/acrylic-assets/scene-empty-v2.png','/acrylic-assets/base-buche-v2.png','/acrylic-assets/base-eiche-v2.png','/acrylic-assets/base-nussbaum-v2.png','/acrylic-assets/base-klar-v2.png','/acrylic-assets/base-satiniert-v2.png','/acrylic-assets/base-holz-flach-v2.png']){
      assert.equal((await request(route)).status,200,route);
    }
    const head=await request('/models.json',{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.body.length,0);
    assert.match(head.headers['content-security-policy'],/frame-ancestors 'self'/);
    for(const route of ['/api/session','/api/product-workbench','/produktanlage.html','/.env','/workshop/http.mjs','/workshop/theme-limits.test.mjs','/_runtime/%2e%2e%2f%2e%2e%2fQUELLEN-MANIFEST.json','/configurator/variant-m/server.test.mjs/../../../../.git/config'])assert.equal((await request(route)).status,404,route);
    assert.equal((await request('/api/acrylic/export',{method:'POST'})).status,405);
    assert.equal((await request('/models.json',{headers:{Host:'evil.example'}})).status,403);
    assert.equal((await request('/models.json',{headers:{Origin:'https://evil.example'}})).status,403);
    assert.equal((await request('/models.json',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
    assert.equal((await request('/models.json',{headers:{Origin:`http://127.0.0.1:${port}`}})).status,200);
  }finally{server.close();await once(server,'close');}
});
