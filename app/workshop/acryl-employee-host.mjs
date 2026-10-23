import http from 'node:http';import net from 'node:net';import path from 'node:path';import {pathToFileURL} from 'node:url';import {once} from 'node:events';import {createHmac} from 'node:crypto';import {createShopifyTestRuntime} from './shopify-admin-test-server.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';
import {ORDER_WEBHOOK_PATH} from './shopify-order-webhook.mjs';
const rewrites=[['/api/workshop/','/api/workshop/acryl/'],['/workshop-ui/','/workshop-acryl-ui/'],['/configurator/','/acryl-configurator/'],['/platform/','/acryl-platform/'],['/workshop/','/acryl-workshop/'],['/_merchant-form-editor.html','/_merchant-acryl-form-editor.html'],['/werkstatt/kundenansicht','/werkstatt/acryl/kundenansicht'],['/acryl-galerie/Designgalerie.html','/werkstatt/acryl/'],['/acryl-galerie/Formvorlagen.html','/werkstatt/acryl/formen/']];
const nativeAssets=[['/_bundle/','/_acryl-bundle/'],['/_runtime/','/_acryl-runtime/'],['/acrylic-assets/','/acryl-assets/']];
export function acrylRoute(pathname){
 if(/^\/werkstatt\/katalog\/?$/.test(pathname))return '/werkstatt/katalog/';
 if(pathname==='/_merchant-acryl-form-editor.html')return '/_merchant-form-editor.html';
 if(pathname==='/_merchant-acryl-editor.html')return '/_merchant-editor.html';
 for(const [from,to] of [...rewrites.slice(0,5),...nativeAssets])if(pathname.startsWith(to))return from+pathname.slice(to.length);
 if(pathname==='/acryl-assistant.js')return '/assistant.js';
 if(pathname==='/api/acryl-guides')return '/api/guides';
 if(/^\/werkstatt\/acryl\/kundenansicht\/?$/.test(pathname))return '/werkstatt/kundenansicht/';
 if(/^\/werkstatt\/acryl(?:\/formen)?\/?$/.test(pathname))return pathname.endsWith('/')?pathname:pathname+'/';
 return null;
}
export function acrylAssetText(text,pathname=''){if(pathname==='/workshop-ui/configurator-test-client.mjs')return text;const pairs=[...rewrites,...nativeAssets,['/_merchant-editor.html','/_merchant-acryl-editor.html'],['/assistant.js','/acryl-assistant.js'],['/api/guides','/api/acryl-guides']],replacements=new Map(pairs),pattern=new RegExp(pairs.map(([from])=>[...from].map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('')).join('|'),'g');return text.replace(pattern,value=>replacements.get(value));}
export async function createAcrylEmployeeHost({legacyRelease,dataDirectory,env=process.env,customerIntegration=null}){
 const module=file=>import(pathToFileURL(path.join(legacyRelease,'ops/plesk',file)).href);
 const [{merchantConfig},{createMerchantRuntime},{lockTestData}]=await Promise.all([module('merchant-config.mjs'),module('merchant-runtime.mjs'),module('lock.mjs')]);
 const config=merchantConfig(env);let existing,inner,lock,acrylWorkshop,integration;
 try{
  existing=await createMerchantRuntime(env);lock=await lockTestData({...config,data:dataDirectory});
  const token=createHmac('sha256',config.runtime.shopifySessions.secret).update(JSON.stringify(['gravuru-acryl-employee-csrf/v1',config.origin,config.runtime.shopifySessions.clientId])).digest('hex');
  ({server:inner,workshop:acrylWorkshop}=createShopifyTestRuntime({...config.runtimeEnv,GRAVURU_PRIVATE_DATA_DIR:dataDirectory,GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only'},{merchantCsrfToken:token}));
  integration=createConfiguratorIntegration({settings:customerIntegration,legacy:existing.workshop,acryl:acrylWorkshop,origin:config.origin,shopifySessions:config.runtime.shopifySessions,orderWebhook:config.orderWebhook});
  inner.address=net.Server.prototype.address;net.Server.prototype.listen.call(inner,0,'127.0.0.1');await once(inner,'listening');
 }catch(e){inner?.close();existing?.close();lock?.stdin.end();throw e;}
 const port=inner.address().port,server=http.createServer((req,res)=>{
  let url;try{url=new URL(req.url,config.origin);}catch{return res.writeHead(400).end();}
  if(req.headers.host!==config.host||req.headers['x-forwarded-proto']!=='https'||!req.url.startsWith('/')||req.url.startsWith('//'))return res.writeHead(403).end();
  if(integration?.gateway.matches(url.pathname))return void integration.gateway.handle(req,res,url);
  if(integration?.shopEntry?.matches(url.pathname))return void integration.shopEntry.handle(req,res,url);
  if(integration?.webhook&&url.pathname===ORDER_WEBHOOK_PATH)return void integration.webhook(req,res);
  const target=acrylRoute(url.pathname);
  if(!target)return existing.emit('request',req,res);
  const headers={host:config.host};for(const key of ['authorization','accept','accept-language','content-type','content-length','origin','x-gravuru-csrf','x-gravuru-draft','sec-fetch-site','sec-fetch-mode','sec-fetch-dest'])if(req.headers[key]!==undefined)headers[key]=req.headers[key];
  const upstream=http.request({hostname:'127.0.0.1',port,path:target+url.search,method:req.method,headers},response=>{
   const head={...response.headers,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'};
   if(!target.startsWith('/api/')&&/^(text\/html|text\/javascript|application\/javascript|text\/css)/.test(head['content-type']||'')){
    const chunks=[];let bytes=0;response.on('data',chunk=>{bytes+=chunk.length;if(bytes>20*1024*1024){upstream.destroy();return;}chunks.push(chunk);});response.on('end',()=>{const body=Buffer.from(acrylAssetText(Buffer.concat(chunks).toString('utf8'),target));delete head['content-length'];delete head['content-encoding'];res.writeHead(response.statusCode,{...head,'Content-Length':body.length});res.end(body);});
   }else{res.writeHead(response.statusCode,head);response.pipe(res);}
  });upstream.setTimeout(120000,()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502).end();else res.destroy();});req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
 });
 server.once('close',()=>{inner.close();inner.closeAllConnections();existing.close();existing.closeAllConnections();lock.stdin.end();});lock.once('exit',()=>{server.close();server.closeAllConnections();});return server;
}

