import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {createShopifyAdminReadonly,ADMIN_READONLY_IDENTITY,main,secretFileFromConfig,cartTransformsQuery} from './audit-cart-transform.mjs';

const token='TEST_ONLY_access_token_not_real_12345',secret='TEST_ONLY_client_secret_not_real_12345';
const row={id:'gid://shopify/CartTransform/172523900',functionId:'01a0e45d-c47f-70b9-9d5a-a2c72120ae01',blockOnFailure:true};
const data=(scope='read_cart_transforms')=>({
 shop:{myshopifyDomain:'gravuru-design.myshopify.com',currencyCode:'EUR',plan:{partnerDevelopment:false}},
 currentAppInstallation:{app:{id:'gid://shopify/App/423276544001'},accessScopes:[{handle:scope}]},
 cartTransforms:{nodes:[{...row,notRequested:'must not escape'}],pageInfo:{hasNextPage:false}}
});
const reply=(body,version='2026-07')=>Response.json(body,{headers:{'x-shopify-api-version':version}});
function transport({scope='read_cart_transforms',mutate=()=>{},tokenResponse,version='2026-07',graphqlError=false}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  assert.equal(options.method,'POST');
  if(url.endsWith('/admin/oauth/access_token')){
   const params=new URLSearchParams(options.body);
   assert.equal(params.get('grant_type'),'client_credentials');assert.equal(params.get('client_id'),ADMIN_READONLY_IDENTITY.clientId);
   assert.equal(params.get('client_secret'),secret);assert.equal(params.has('scope'),false);
   return reply(tokenResponse??{access_token:token,expires_in:3600,scope});
  }
  assert.equal(url,'https://gravuru-design.myshopify.com/admin/api/2026-07/graphql.json');
  assert.equal(options.headers['X-Shopify-Access-Token'],token);
  const payload=JSON.parse(options.body);assert.ok(/^query /.test(payload.query));assert.ok(!/\bmutation\b/.test(payload.query));
  assert.deepEqual(payload.variables,{});
  const d=data(scope);mutate(d,payload.query);
  return reply(graphqlError?{errors:[{message:secret+token}],data:d}:{data:d},version);
 };
 return {calls,fetchImpl};
}
const client=t=>createShopifyAdminReadonly({readSecret:()=>secret},{fetchImpl:t.fetchImpl});
test('fixed endpoint, app identity, API and only the three requested result fields',async()=>{
 const t=transport(),result=await client(t).inspectCartTransforms();
 assert.deepEqual(result,[row]);assert.equal(t.calls.length,3);
 assert.equal(JSON.parse(t.calls[2].options.body).query,cartTransformsQuery);
 assert.deepEqual(Object.keys(client(t)),['inspectCartTransforms']);
});
test('existing write_cart_transforms grants the paired read, no new scopes requested',async()=>{
 assert.deepEqual(await client(transport({scope:'write_cart_transforms'})).inspectCartTransforms(),[row]);
});
test('missing scope stops before cartTransforms request',async()=>{
 const t=transport({scope:'read_products'});
 await assert.rejects(client(t).inspectCartTransforms(),e=>e.code==='cart_transforms_scope');
 assert.equal(t.calls.length,2);
});
test('scope revoked between fixed queries is rejected',async()=>{
 const t=transport({mutate:(d,q)=>{if(q===cartTransformsQuery)d.currentAppInstallation.accessScopes=[];}});
 await assert.rejects(client(t).inspectCartTransforms(),e=>e.code==='cart_transforms_scope');
});
for(const [name,mutate] of [
 ['shop',d=>{d.shop.myshopifyDomain='other.myshopify.com';}],
 ['app',d=>{d.currentAppInstallation.app.id='gid://shopify/App/1';}],
 ['scope shape',d=>{d.currentAppInstallation.accessScopes=[{handle:'bad scope'}];}]
]){
 test('rejects unexpected '+name,async()=>{
  const t=transport({mutate});await assert.rejects(client(t).inspectCartTransforms(),e=>e.code==='installation_identity');assert.equal(t.calls.length,2);
 });
}
test('different API response version fails closed',async()=>{
 await assert.rejects(client(transport({version:'2026-10'})).inspectCartTransforms(),e=>e.code==='api_version');
});
test('false blockOnFailure is returned honestly, not interpreted as enabled',async()=>{
 const t=transport({mutate:d=>{d.cartTransforms.nodes[0].blockOnFailure=false;}});
 assert.equal((await client(t).inspectCartTransforms())[0].blockOnFailure,false);
});
for(const [name,mutate,code] of [
 ['partial page',d=>{d.cartTransforms.pageInfo.hasNextPage=true;},'cart_transforms_incomplete'],
 ['duplicate',d=>{d.cartTransforms.nodes.push({...d.cartTransforms.nodes[0]});},'cart_transforms_response'],
 ['missing boolean',d=>{delete d.cartTransforms.nodes[0].blockOnFailure;},'cart_transforms_response'],
 ['invalid function',d=>{d.cartTransforms.nodes[0].functionId='untrusted arbitrary text';},'cart_transforms_response']
]){
 test('rejects '+name,async()=>{await assert.rejects(client(transport({mutate})).inspectCartTransforms(),e=>e.code===code);});
}
test('empty list is allowed and does not claim a deployed function',async()=>{
 const t=transport({mutate:d=>{d.cartTransforms.nodes=[];}});assert.deepEqual(await client(t).inspectCartTransforms(),[]);
});
test('GraphQL error, invalid token and upstream transport errors are sanitized',async()=>{
 await assert.rejects(client(transport({graphqlError:true})).inspectCartTransforms(),e=>e.code==='graphql'&&!e.message.includes(secret));
 await assert.rejects(client(transport({tokenResponse:{access_token:secret,expires_in:1,scope:'read_cart_transforms'}})).inspectCartTransforms(),e=>e.code==='token_response');
 const c=createShopifyAdminReadonly({readSecret:()=>secret},{fetchImpl:async()=>{throw Error(token+secret);}});
 await assert.rejects(c.inspectCartTransforms(),e=>e.code==='network_or_response'&&!e.message.includes(secret)&&!e.message.includes(token));
});
const appRoot=path.resolve('app-test-root'),privateDir=path.resolve('private'),configFile=path.join(privateDir,'gravuru-2027-merchant-shopify.json'),secretFile=path.join(privateDir,'client-secret');
const config=()=>({schema:1,purpose:'shopify-merchant-test-runtime',values:{
 GRAVURU_SHOPIFY_APP_ORIGIN:'https://app-2027.gravuru-designwerkstatt.de',
 GRAVURU_PRIVATE_DATA_DIR:path.join(privateDir,'data'),
 GRAVURU_SHOPIFY_CLIENT_SECRET_FILE:secretFile,GRAVURU_SHOPIFY_PYTHON:path.resolve('python')
}});
test('private config only supplies the existing external secret file',()=>{
 assert.equal(secretFileFromConfig(JSON.stringify(config())),secretFile);
 for(const edit of [
  r=>{r.schema=2;},r=>{r.values.GRAVURU_SHOPIFY_CLIENT_SECRET=secret;},
  r=>{r.values.GRAVURU_SHOPIFY_SHOP_DOMAIN='other';},
  r=>{r.values.GRAVURU_SHOPIFY_APP_ORIGIN='https://other.example';},
  r=>{r.values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE='relative-secret';}
 ]){const r=config();edit(r);assert.throws(()=>secretFileFromConfig(JSON.stringify(r)));}
});
test('CLI prints only the bounded audit result, never config, secret or token',async()=>{
 const t=transport(),output=[],reads=[];
 const result=await main(['--app-root',appRoot,'--config',configFile],{
  fetchImpl:t.fetchImpl,write:s=>output.push(s),
  privateReaderFactory:root=>{assert.equal(root,appRoot);return(file,limit)=>{reads.push({file,limit});return file===configFile?JSON.stringify(config()):secret;};}
 });
 assert.equal(result,0);assert.deepEqual(JSON.parse(output[0]),[row]);assert.equal(reads.length,2);
 assert.equal(reads[0].limit,16384);assert.equal(reads[1].file,secretFile);
 for(const text of [token,secret,secretFile,'GRAVURU_SHOPIFY_CLIENT_SECRET_FILE'])assert.ok(!output.join('').includes(text));
});
test('CLI rejects unknown arguments/config names before file access or network',async()=>{
 const output=[];let read=false;
 const status=await main(['--app-root',appRoot,'--config',path.join(privateDir,'other.json')],{
  write:s=>output.push(s),privateReaderFactory:()=>{read=true;throw Error(secret);},fetchImpl:()=>{throw Error('Unexpected request');}
 });
 assert.equal(status,1);assert.equal(read,false);assert.deepEqual(JSON.parse(output[0]),{ok:false,code:'arguments'});
});
test('CLI never prints raw filesystem/upstream errors or credentials',async()=>{
 const output=[];
 const status=await main(['--app-root',appRoot,'--config',configFile],{
  write:s=>output.push(s),privateReaderFactory:()=>{throw Error(token+secret+secretFile);}
 });
 assert.equal(status,1);assert.deepEqual(JSON.parse(output[0]),{ok:false,code:'cart_transform_audit_failed'});
});
test('helper imports only filesystem/path/url builtins and no DB/runtime modules',()=>{
 const source=fs.readFileSync(new URL('./audit-cart-transform.mjs',import.meta.url),'utf8');
 const imports=[...source.matchAll(/^import .* from '([^']+)';$/gm)].map(m=>m[1]);
 assert.deepEqual(imports,['node:fs','node:path','node:url']);
 assert.ok(!source.includes("node:sqlite"));assert.ok(!source.includes("import("));
});

