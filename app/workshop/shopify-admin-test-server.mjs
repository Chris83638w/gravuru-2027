import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,OUTPUT} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';
import {shopifyRuntimeConfig,checkShopifyRuntime} from './shopify-runtime-config.mjs';

// Explicit alternate entry point; npm start continues to use loopback defaults.
// HTTPS must already terminate at a trusted host preserving the configured Host.
export function createShopifyTestRuntime(env){
  const config=shopifyRuntimeConfig(env),directory=config.dataDirectory;
  const fail=()=>{throw Error('Private Testablage nicht bestätigt. Vorhandene Daten nicht verändern; Pfad und Berechtigungen prüfen.');};
  // Do not create, chmod, migrate or choose a private directory implicitly.
  if(!fs.existsSync(directory)||fs.lstatSync(directory).isSymbolicLink()||fs.realpathSync(directory)!==directory||!fs.statSync(directory).isDirectory()||(fs.statSync(directory).mode&0o077))fail();
  for(let ancestor=directory;;ancestor=path.dirname(ancestor)){const marker=path.join(ancestor,'.git');if(fs.existsSync(marker)&&(fs.statSync(marker).isFile()||fs.existsSync(path.join(marker,'HEAD'))))fail();if(path.dirname(ancestor)===ancestor)break;}
  const filename=path.join(directory,'workshop.sqlite');
  for(const name of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite'].flatMap(name=>[name,name+'-wal',name+'-shm',name+'-journal'])){
    const file=path.join(directory,name);if(fs.existsSync(file)&&(fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile()))fail();
  }
  build();const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
  const workshop=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:config.shopifySessions,shopDrafts:config.shopDrafts});
  let server;try{server=createPreviewServer({workshop,embeddedApp:config.embeddedApp});}catch(e){workshop.close();throw e;}
  server.once('close',()=>workshop.close());return {server,port:config.port};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length&&(args.length!==1||args[0]!=='--check')){console.error('Nur --check oder Start ohne Argumente erlaubt.');process.exitCode=1;}
  else if(args[0]==='--check'){
    const result=checkShopifyRuntime(process.env);console.log(JSON.stringify(result));process.exitCode=result.configured?0:1;
  }else{
    try{const {server,port}=createShopifyTestRuntime(process.env);server.on('error',()=>{console.error('Shopify-Testlistener konnte nicht gestartet werden. Keine App-Veröffentlichung erfolgt.');process.exitCode=1;server.close();});server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({scope:'merchant-embedded-test',listening:true,port,httpsVerified:false})));}
    catch{console.error('Shopify-Teststart nicht möglich. npm run shopify:check zeigt fehlende Feldnamen; keine Schlüssel ausgeben.');process.exitCode=1;}
  }
}
