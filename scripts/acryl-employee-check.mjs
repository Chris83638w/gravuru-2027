import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createShopifyTestRuntime} from '../app/workshop/shopify-admin-test-server.mjs';
const legacy=process.argv[2],data=process.argv[3];
const {merchantConfig}=await import(pathToFileURL(path.join(legacy,'ops/plesk/merchant-config.mjs')));
const config=merchantConfig(process.env);
process.env.GRAVURU_PYTHON=config.python;
process.env.OPENBLAS_NUM_THREADS='1';process.env.OMP_NUM_THREADS='1';delete process.env.PYTHONPATH;
const {server}=createShopifyTestRuntime({...config.runtimeEnv,GRAVURU_PRIVATE_DATA_DIR:data,GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only'});
server.listen(0,'127.0.0.1');await once(server,'listening');
function check(route,expected,headers={}){return new Promise((resolve,reject)=>{
  const request=http.get({hostname:'127.0.0.1',port:server.address().port,path:route,headers:{host:new URL(config.origin).host,...headers}},response=>{
    response.resume();response.on('end',()=>response.statusCode===expected?resolve():reject(Error('Unexpected '+route+': '+response.statusCode+' (expected '+expected+')')));
  });request.setTimeout(15000,()=>request.destroy(Error('Preflight timeout')));request.on('error',reject);
});}
try{
  for(const [route,status] of [['/werkstatt/acryl/',200],['/workshop-ui/acryl-gallery-loader.mjs',200],['/workshop-ui/acryl-shop-ui.mjs',200],['/configurator/variant-m/form-motif-library.mjs',200],['/api/workshop/session',401]])await check(route,status);
  await check('/werkstatt/acryl/',403,{host:'unexpected.invalid'});
  await check('/api/workshop/session',403,{origin:'https://unexpected.invalid'});
  console.log(JSON.stringify({preflight:'passed',privateApiWithoutLogin:401,untrustedHost:403,untrustedOrigin:403,assets:'available'}));
}finally{server.close();server.closeAllConnections();}
