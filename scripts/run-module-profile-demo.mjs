// Isolated, loopback-only acceptance environment. Never reads live databases.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {moduleProfileTestSource} from '../app/workshop/test-fixtures/module-profile-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),localRoot=path.join(root,'.local-data');
const directory=path.resolve(localRoot,process.env.GRAVURU_MODULE_DEMO_DIRECTORY||'module-profile-demo');
if(!directory.startsWith(localRoot+path.sep))throw Error('Demo data must stay inside the isolated local-data directory');
const outputDirectory=path.join(directory,'preview'),port=Number(process.env.GRAVURU_MODULE_DEMO_PORT||8218);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local demo port');
const sourcePath=process.env.GRAVURU_MODULE_DEMO_SOURCE&&path.resolve(process.env.GRAVURU_MODULE_DEMO_SOURCE);
const input=sourcePath?JSON.parse(fs.readFileSync(sourcePath,'utf8')):null;
const sourceDocument=input?(input.nativeUpdate?.document||input.document||input):moduleProfileTestSource();
const sourceSha256=createHash('sha256').update(JSON.stringify(sourceDocument)).digest('hex'),receiptFile=path.join(directory,'source-receipt.json');
if(fs.existsSync(receiptFile)&&JSON.parse(fs.readFileSync(receiptFile,'utf8')).sha256!==sourceSha256)throw Error('The saved demo source differs; select a fresh local demo directory');
build({outputDirectory});
const seed=JSON.parse(fs.readFileSync(path.join(outputDirectory,'models.json'),'utf8'))[0];
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:null});
if(!workshop.repository.moduleSources().length){
 const source=workshop.repository.create(sourceDocument);
 fs.writeFileSync(receiptFile,JSON.stringify({sourcePath:sourcePath||null,sourceProductId:source.id,sha256:sourceSha256,scope:'isolated-local-copy',shopifyWrites:0},null,2)+'\n');
}else if(sourcePath&&!fs.existsSync(receiptFile))throw Error('Existing demo data has no source receipt; select a fresh local demo directory');
const server=createPreviewServer({outputDirectory,workshop});
if(process.env.GRAVURU_MODULE_DEMO_DIAGNOSTICS==='1')server.on('request',(req,res)=>{
 const pathname=new URL(req.url,'http://local.invalid').pathname;
 res.once('finish',()=>{
  if(res.statusCode!==403&&pathname!=='/werkstatt/module/')return;
  const headers=Object.fromEntries(['host','origin','sec-fetch-site','sec-fetch-mode','sec-fetch-dest'].filter(name=>req.headers[name]!==undefined).map(name=>[name,String(req.headers[name]).slice(0,200)]));
  fs.appendFileSync(path.join(directory,'request-diagnostics.jsonl'),JSON.stringify({at:new Date().toISOString(),method:req.method,path:pathname,status:res.statusCode,headers})+'\n');
 });
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}/werkstatt/module/`,scope:'isolated-local-test',source:sourcePath?'native-product-copy':'synthetic-test-product',sourceSha256,shopifyWrites:0})));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{workshop.close();process.exit(0);}));
