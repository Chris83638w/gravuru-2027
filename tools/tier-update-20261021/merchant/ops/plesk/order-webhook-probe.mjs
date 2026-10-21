import {request as httpsRequest} from 'node:https';

export const ORDER_WEBHOOK_URI='https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/orders-paid';

// Node fetch adds Sec-Fetch-Mode. This server-to-server probe intentionally uses
// native HTTPS, with normal certificate verification and no redirect following.
// It sends no signature or payment and expects the deployed HMAC gate to deny it.
export function probeOrderWebhook({requestImpl=httpsRequest,timeoutMs=10000}={}){
 return new Promise((resolve,reject)=>{
  const req=requestImpl(ORDER_WEBHOOK_URI,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'2'},agent:false,signal:AbortSignal.timeout(timeoutMs)},res=>{
   const status=res.statusCode;res.destroy();resolve({status});
  });
  req.on('error',reject);req.end('{}');
 });
}
