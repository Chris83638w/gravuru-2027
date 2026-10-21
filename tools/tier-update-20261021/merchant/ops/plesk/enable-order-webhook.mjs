// Explicit offline activation after a verified merchant release and private backup.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {once} from 'node:events';
import {merchantConfig,verifyMerchantStorage} from './merchant-config.mjs';import {readPrivateFile} from './shopify-preflight.mjs';import {lockTestData} from './lock.mjs';
let lock,released;
try {
 process.umask(0o077);
 const config=merchantConfig(process.env);verifyMerchantStorage(config);
 const file=process.env.GRAVURU_SHOPIFY_CONFIG_FILE,backup=process.argv[2];
 if(config.origin!=='https://app-2027.gravuru-designwerkstatt.de'||!file||!backup)throw Error('target');
 const receipt=JSON.parse(readPrivateFile(path.join(backup,'ACTIVATION-RECEIPT.json'),1024*1024));
 const manifest=JSON.parse(fs.readFileSync(new URL('../../PACKAGE-MANIFEST.json',import.meta.url)));
 if(receipt.sourceCommit!==manifest.sourceCommit||!receipt.entryActivated)throw Error('activation_receipt');
 const previous=JSON.parse(readPrivateFile(path.join(backup,'previous-config.json'),16384));
 if(previous.values.GRAVURU_SHOPIFY_ORDER_WEBHOOK!==undefined)throw Error('previous_config');
 lock=await lockTestData(config);released=once(lock,'exit');
 const before=readPrivateFile(file,16384),current=JSON.parse(before),enabled=structuredClone(previous);enabled.values.GRAVURU_SHOPIFY_ORDER_WEBHOOK='test-only-2026-07';
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);const alreadyEnabled=equal(current,enabled);
 if(!alreadyEnabled&&!equal(current,previous))throw Error('concurrent_config_change');
 if(!alreadyEnabled){
  const temp=file+'.orders-20261011.new';fs.writeFileSync(temp,JSON.stringify(enabled,null,2)+'\n',{flag:'wx',mode:0o600});
  if(readPrivateFile(file,16384)!==before)throw Error('concurrent_config_change');fs.renameSync(temp,file);
 }
 if(!merchantConfig(process.env).orderWebhook)throw Error('config_readback');
 console.log(JSON.stringify({enabled:true,alreadyEnabled,mode:'test-only',apiVersion:'2026-07',sourceCommit:manifest.sourceCommit,configSha256:createHash('sha256').update(readPrivateFile(file,16384)).digest('hex'),shopifySubscriptionChanged:false,checkoutEnabled:false}));
}catch(e){console.log(JSON.stringify({enabled:false,reason:/^[a-z_]+$/.test(e.message)?e.message:'activation_stopped'}));process.exitCode=1;}
finally{if(lock){lock.stdin.end();await released;}}
