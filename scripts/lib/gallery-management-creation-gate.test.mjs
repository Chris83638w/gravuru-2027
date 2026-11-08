import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createGalleryManagementCreationGate,galleryManagementCreationRoute,GALLERY_PRODUCT_CREATION_URL} from './gallery-management-creation-gate.mjs';

const cfg='cfg_00000000-1111-2222-3333-444444444444',line='orderline_00000000-1111-2222-3333-444444444444';
const blocked=[
 '/api/workshop/products','/api/workshop/form-products','/api/workshop/products/'+cfg+'/copy',
 '/api/workshop/families/test-family/products','/api/workshop/orders/'+line+'/product-draft/apply',
 '/api/workshop/variants','/api/workshop/batch/commit','/api/workshop/variants/batch/commit'
];
const allowed=[
 ['PATCH','/api/workshop/products/'+cfg],['POST','/api/workshop/products/'+cfg+'/archive'],
 ['POST','/api/workshop/products/'+cfg+'/restore'],['POST','/api/workshop/products/'+cfg+'/editor-preview'],
 ['POST','/api/workshop/products/'+cfg+'/design-import'],['POST','/api/workshop/products/'+cfg+'/form-design-import'],
 ['PATCH','/api/workshop/catalog-structure'],['POST','/api/workshop/families'],
 ['PATCH','/api/workshop/families/test-family'],['POST','/api/workshop/families/test-family/sync'],
 ['POST','/api/workshop/batch/plan'],['POST','/api/workshop/batch/jobs'],
 ['POST','/api/workshop/variants/batch/plan'],['POST','/api/workshop/variants/batch/jobs'],
 ['PATCH','/api/workshop/variants/variants_00000000-1111-2222-3333-444444444444'],
 ['POST','/api/workshop/designs/variant'], // catalogue design, no native product
 ['POST','/api/workshop/orders/'+line+'/product-draft/preview'],
 ['POST','/api/workshop/customer-drafts'],['POST','/api/workshop/account-drafts'],
 ['POST','/originale/verwaltung/api/creation-plan'],['POST','/originale/verwaltung/api/creation-confirm'],
 ['POST','/originale/verwaltung/api/creation-execute'],['POST','/originale/api/gallery-save']
];

test('private gallery gate recognizes only concrete old creation routes and mixed commits',()=>{
 const gate=createGalleryManagementCreationGate();
 for(const pathname of blocked){
  let status,headers,body;const request={method:'POST',url:pathname+'?ignored=yes',get iterator(){throw Error('Request body must stay untouched');}};
  const response={writeHead(s,h){status=s;headers=h;return this;},end(value){body=JSON.parse(value);}};
  assert.equal(gate(request,response),true,pathname);assert.equal(status,428);assert.equal(headers.Location,GALLERY_PRODUCT_CREATION_URL);
  assert.equal(body.error.url,GALLERY_PRODUCT_CREATION_URL);assert.equal(body.created,false);assert.equal(body.scope,'private-gallery');
  if(pathname.includes('/batch/'))assert.match(body.error.message,/auch reine Update-Tabellen/);
 }
});

test('individual edits, catalogue-only creation, plans, review jobs and confirmed workflow pass through unchanged',()=>{
 const gate=createGalleryManagementCreationGate(),response={writeHead(){throw Error('Unrelated response changed');}};
 for(const [method,pathname] of allowed){
  const request={method,url:pathname,get iterator(){throw Error('Unrelated request body consumed');}};
  assert.equal(gate(request,response),false,method+' '+pathname);
 }
 for(const pathname of blocked)for(const method of ['GET','HEAD','PATCH','PUT','DELETE'])assert.equal(galleryManagementCreationRoute(method,pathname),null);
 assert.equal(galleryManagementCreationRoute('POST','/api/workshop/products-other'),null);
 assert.equal(galleryManagementCreationRoute('POST','/api/workshop/products/'+cfg+'/copy-more'),null);
});

test('HTTP mount returns 428 without calling the old handler; allowed edit body reaches it byte-for-byte',async t=>{
 const gate=createGalleryManagementCreationGate(),received=[];
 const server=http.createServer(async(req,res)=>{
  if(gate(req,res))return;
  const chunks=[];for await(const c of req)chunks.push(c);received.push({method:req.method,url:req.url,body:Buffer.concat(chunks).toString('utf8')});
  res.writeHead(200,{'Content-Type':'application/json'}).end('{"saved":true}');
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const rejected=await fetch(base+'/api/workshop/products',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"document":{"name":"Must not create"}}'});
 assert.equal(rejected.status,428);assert.equal((await rejected.json()).error.code,'group_confirmation_required');assert.equal(received.length,0);
 const body='{ "expectedRevision": 3, "document": { "name": "Unverändert übergeben" } }';
 const edited=await fetch(base+'/api/workshop/products/'+cfg,{method:'PATCH',headers:{'Content-Type':'application/json'},body});
 assert.equal(edited.status,200);assert.deepEqual(received,[{method:'PATCH',url:'/api/workshop/products/'+cfg,body}]);
});
