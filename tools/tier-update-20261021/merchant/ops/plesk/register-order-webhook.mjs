import fs from 'node:fs';import path from 'node:path';
import {merchantConfig,verifyMerchantStorage} from './merchant-config.mjs';
import {readPrivateFile} from './shopify-preflight.mjs';
import {ensureOrderSubscription,ORDER_WEBHOOK_URI} from './order-webhook-registration.mjs';
process.umask(0o077);
try {
 const config=merchantConfig(process.env);verifyMerchantStorage(config);
 if(config.origin!=='https://app-2027.gravuru-designwerkstatt.de'||!config.orderWebhook)throw Object.assign(Error(),{code:'registration_disabled'});
 const journal=path.join(path.dirname(config.data),'gravuru-orders-paid-registration-20261011.json');
 const priorAttempt=fs.existsSync(journal);
 if(priorAttempt){const previous=JSON.parse(readPrivateFile(journal,128*1024));if(previous.uri!==ORDER_WEBHOOK_URI)throw Object.assign(Error(),{code:'registration_journal'});}
 const result=await ensureOrderSubscription({secret:config.orderWebhook.secret,priorAttempt,beforeCreate:record=>fs.writeFileSync(journal,JSON.stringify(record)+'\n',{flag:'wx',mode:0o600})});
 fs.writeFileSync(journal,JSON.stringify({uri:ORDER_WEBHOOK_URI,state:'confirmed',...result},null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({registered:false,code:/^[a-z_]+$/.test(error.code||'')?error.code:'registration_stopped',...(error.issues?{issues:error.issues}:{})}));process.exitCode=1;}
