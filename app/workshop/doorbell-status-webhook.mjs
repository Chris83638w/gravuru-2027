import {verifyDoorbellStatusWebhook} from './order-intake.mjs';
export const DOORBELL_STATUS_WEBHOOK_PATH='/webhooks/shopify/doorbell-orders-status';
const MAX_BYTES=1024*1024;
const stop=status=>Object.assign(Error('Funkklingel-Statusnachricht nicht übernommen.'),{status});

// Separate from the existing paid/test route. Only the explicitly enabled acryl
// intake is injected. No legacy store or browser session participates.
export function createDoorbellStatusWebhookHandler({intake,config,bodyTimeoutMs=3000}){
 const scopeMethod=config?.mode==='catalog-live-approved'?'catalogLiveOrderScope':'doorbellLiveOrderScope';
 if(!['doorbell-live-approved','catalog-live-approved'].includes(config?.mode)||config.apiVersion!=='2026-07'||typeof intake?.receive!=='function'||typeof intake?.[scopeMethod]!=='function'||!Number.isInteger(bodyTimeoutMs)||bodyTimeoutMs<1||bodyTimeoutMs>3000)throw Error('Live-Statuseingang nicht eingerichtet.');
 const fixed=Object.freeze({...config});
 return async function handle(req,res){
  const reply=(status,value)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Connection':'close'});res.end(JSON.stringify(value));};
  try{
   if(req.method!=='POST')throw stop(405);
   if(req.url!==DOORBELL_STATUS_WEBHOOK_PATH)throw stop(404);
   if(req.headers.origin!==undefined||Object.keys(req.headers).some(k=>k.startsWith('sec-fetch-')))throw stop(403);
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||req.headers['content-encoding']!==undefined)throw stop(415);
   for(const name of ['x-shopify-hmac-sha256','x-shopify-shop-domain','x-shopify-api-version','x-shopify-topic','x-shopify-webhook-id']){
    if(typeof req.headers[name]!=='string'||req.rawHeaders.filter((v,i)=>i%2===0&&v.toLowerCase()===name).length!==1)throw stop(401);
   }
   if(req.headers['content-length']!==undefined&&(!/^[0-9]+$/.test(req.headers['content-length'])||Number(req.headers['content-length'])>MAX_BYTES))throw stop(413);
   const raw=await new Promise((resolve,reject)=>{
    let size=0,parts=[];const timer=setTimeout(()=>finish(stop(408)),bodyTimeoutMs);
    const cleanup=()=>{clearTimeout(timer);req.off('data',data);req.off('end',end);req.off('aborted',aborted);req.off('error',aborted);};
    const finish=(error,value)=>{cleanup();parts=[];error?reject(error):resolve(value);};
    const data=chunk=>{size+=chunk.length;if(size>MAX_BYTES)finish(stop(413));else parts.push(chunk);};
    const end=()=>finish(null,Buffer.concat(parts));const aborted=()=>finish(stop(400));
    req.on('data',data);req.once('end',end);req.once('aborted',aborted);req.once('error',aborted);
   });
   const v=verifyDoorbellStatusWebhook(raw,req.headers,fixed);
   const scope=intake[scopeMethod]({shopDomain:v.shopDomain,orderId:v.orderId,lines:v.payload.line_items});
   if(scope==='unrelated')return reply(200,{accepted:true,ignored:true,matchedLines:0});
   if(scope==='pending')throw stop(409);
   if(scope!=='known')throw stop(422);
   const result=intake.receive(raw,req.headers,fixed);
   reply(200,{accepted:true,duplicate:result.duplicate,matchedLines:result.matchedLines,testOnly:false});
  }catch(error){req.resume();reply([400,401,403,404,405,408,409,413,415,422,503].includes(error.status)?error.status:503,{accepted:false});}
 };
}
