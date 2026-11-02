import http from 'node:http';import net from 'node:net';import path from 'node:path';import {pathToFileURL} from 'node:url';import {once} from 'node:events';import {createHmac} from 'node:crypto';import {createShopifyTestRuntime} from './shopify-admin-test-server.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';
import {ORDER_WEBHOOK_PATH} from './shopify-order-webhook.mjs';
import {DOORBELL_STATUS_WEBHOOK_PATH} from './doorbell-status-webhook.mjs';
const rewrites=[['/api/workshop/','/api/workshop/acryl/'],['/workshop-ui/','/workshop-acryl-ui/'],['/configurator/','/acryl-configurator/'],['/platform/','/acryl-platform/'],['/workshop/','/acryl-workshop/'],['/_merchant-form-editor.html','/_merchant-acryl-form-editor.html'],['/werkstatt/kundenansicht','/werkstatt/acryl/kundenansicht'],['/acryl-galerie/Designgalerie.html','/werkstatt/acryl/'],['/acryl-galerie/Formvorlagen.html','/werkstatt/acryl/formen/']];
const nativeAssets=[['/_bundle/','/_acryl-bundle/'],['/_runtime/','/_acryl-runtime/'],['/acrylic-assets/','/acryl-assets/']];
// Ladezeit (Chris 27.10.2026, „prüfe alles“): statische Editor-Dateien durfte der Browser bisher nie behalten
// (jedes Öffnen lud Editor-Seite und Nachlade-Schriften neu). Gehashte Pakete dauerhaft, Katalog/Schriften/Motive 1 h,
// Editor-Seite 5 min (nur Browser). Alles andere bleibt „private, no-store“.
export function acrylCacheControl(pathname,status){
 if(status!==200)return null;
 if(/^\/_acryl-bundle\/[A-Za-z0-9_.-]+-[a-f0-9]{16}\.m?js$/.test(pathname))return 'public, max-age=31536000, immutable';
 if(/^\/_acryl-runtime\/lazy\/(?:katalog-kern\.json|motive-alle\.json|schriften\/[a-z0-9-]{1,80}\.json|motive\/[A-Za-z0-9_-]{1,80}\.json)$/.test(pathname))return 'public, max-age=3600';
 if(pathname==='/_merchant-acryl-editor.html')return 'private, max-age=300';
 return null;
}
export function acrylRoute(pathname){
 if(/^\/werkstatt\/bestellungen\/?$/.test(pathname))return '/werkstatt/bestellungen/';
 const orderPage=pathname.match(/^\/werkstatt\/acryl\/(bestellungen|pruefstaende|ausgaben|formprodukt)\/?$/);
 if(orderPage)return '/werkstatt/'+orderPage[1]+'/';
 if(/^\/doorbell-assets\/[a-f0-9]{64}\.webp$/.test(pathname))return pathname;
 if(/^\/werkstatt\/katalog\/?$/.test(pathname))return '/werkstatt/katalog/';
 if(/^\/werkstatt\/designs\/?$/.test(pathname))return '/werkstatt/designs/';
 // Katalogeditor (Paket L) ist die neue Werkstatt-App; /werkstatt/ selbst gehört auf dem Händlerhost noch der alten Laufzeit.
 if(/^\/werkstatt\/designs\/bearbeiten\/?$/.test(pathname))return '/werkstatt/designs/bearbeiten/';// Design-Dashboard (23.10.2026) gehört zum Acryl-Store wie die Katalogseite
 // Vorschaudateien kommen als URL in der JSON-Antwort (nicht umgeschrieben); ohne diese Zeile landeten sie in der alten Laufzeit.
 if(pathname==='/api/workshop/designs/svg')return pathname;
 // Paket M: Zielvorschau-URL kommt ebenfalls aus der JSON-Antwort (row.target.previewUrl).
 if(pathname==='/api/workshop/designs/target-preview')return pathname;
 if(/^\/api\/workshop\/designs\/editor(?:\/(?:preview|fit|font))?$/.test(pathname))return pathname;
 if(pathname==='/_merchant-acryl-form-editor.html')return '/_merchant-form-editor.html';
 if(pathname==='/_merchant-acryl-editor.html')return '/_merchant-editor.html';
 for(const [from,to] of [...rewrites.slice(0,5),...nativeAssets])if(pathname.startsWith(to))return from+pathname.slice(to.length);
 if(pathname==='/acryl-assistant.js')return '/assistant.js';
 if(pathname==='/api/acryl-guides')return '/api/guides';
 if(/^\/werkstatt\/acryl\/kundenansicht\/?$/.test(pathname))return '/werkstatt/kundenansicht/';
 if(/^\/werkstatt\/acryl(?:\/formen)?\/?$/.test(pathname))return pathname.endsWith('/')?pathname:pathname+'/';
 return null;
}
export function acrylAssetText(text,pathname=''){if(['/workshop-ui/configurator-test-client.mjs','/workshop-ui/orders-ui.mjs','/workshop-ui/order-store-context.mjs','/workshop-ui/order-product-ui.mjs','/workshop-ui/order-file-grants-ui.mjs','/workshop-ui/production-release-ui.mjs'].includes(pathname))return text;const pairs=[['/werkstatt/pruefstaende/','/werkstatt/acryl/pruefstaende/'],['/werkstatt/ausgaben/','/werkstatt/acryl/ausgaben/'],['/werkstatt/formprodukt/','/werkstatt/acryl/formprodukt/'],...rewrites,...nativeAssets,['/_merchant-editor.html','/_merchant-acryl-editor.html'],['/assistant.js','/acryl-assistant.js'],['/api/guides','/api/acryl-guides']],replacements=new Map(pairs),pattern=new RegExp(pairs.map(([from])=>[...from].map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('')).join('|'),'g');return text.replace(pattern,value=>replacements.get(value));}
// Kundeneinstieg (App-Proxy), Händlertest-Gateway und Bestelleingang laufen nur, wenn der Start ausdrücklich
// `customerIntegration` übergibt. Der Einstiegsskript-Aufruf leitet es aus GRAVURU_CUSTOMER_INTEGRATION ab:
// leer/fehlend → null (nichts ändert sich), `merchant-test-only` → beide Stores + Einstieg `/apps/konfigurator`,
// alles andere → Fehler vor dem Öffnen von Datenbanken. Live-Funkklingeln benötigen zusätzlich den exakten
// Freigabewert GRAVURU_DOORBELL_LIVE_ORDERS=approved-20261027 und die gespeicherte Produktfreigabe.
export function customerIntegrationFromEnv(env=process.env){
 const value=env.GRAVURU_CUSTOMER_INTEGRATION,live=env.GRAVURU_DOORBELL_LIVE_ORDERS,catalog=env.GRAVURU_CATALOG_LIVE_ORDERS;
 if(catalog!==undefined&&catalog!==''&&catalog!=='approved-issue139-20261102')throw Object.assign(Error('GRAVURU_CATALOG_LIVE_ORDERS kennt nur den Wert approved-issue139-20261102.'),{code:'catalog_live_orders_env'});
 if(live!==undefined&&live!==''&&live!=='approved-20261027')throw Object.assign(Error('GRAVURU_DOORBELL_LIVE_ORDERS kennt nur den Wert approved-20261027.'),{code:'doorbell_live_orders_env'});
 if(value===undefined||value===''){
  if(catalog==='approved-issue139-20261102')throw Object.assign(Error('Live-Katalogprodukte benötigen die bestehende customerIntegration.'),{code:'catalog_live_orders_env'});
  if(live==='approved-20261027')throw Object.assign(Error('Live-Funkklingeln benötigen die bestehende customerIntegration.'),{code:'doorbell_live_orders_env'});
  return null;
 }
 if(value!=='merchant-test-only')throw Object.assign(Error('GRAVURU_CUSTOMER_INTEGRATION kennt nur den Wert merchant-test-only.'),{code:'customer_integration_env'});
 return {mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl',shopEntry:{proxyPath:'/apps/konfigurator'},...(live==='approved-20261027'?{doorbellLiveOrders:true}:{}),...(catalog==='approved-issue139-20261102'?{catalogLiveOrders:true}:{})};
}
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
  if(integration?.orders?.matches(url.pathname))return void integration.orders.handle(req,res,url);
  if(integration?.gateway.matches(url.pathname))return void integration.gateway.handle(req,res,url);
  if(integration?.shopEntry?.matches(url.pathname))return void integration.shopEntry.handle(req,res,url);
  if(integration?.webhook&&url.pathname===ORDER_WEBHOOK_PATH)return void integration.webhook(req,res);
  if(integration?.statusWebhook&&url.pathname===DOORBELL_STATUS_WEBHOOK_PATH)return void integration.statusWebhook(req,res);
  const target=acrylRoute(url.pathname);
  if(!target)return existing.emit('request',req,res);
  const headers={host:config.host};for(const key of ['authorization','accept','accept-language','content-type','content-length','origin','x-gravuru-csrf','x-gravuru-draft','sec-fetch-site','sec-fetch-mode','sec-fetch-dest'])if(req.headers[key]!==undefined)headers[key]=req.headers[key];
  const upstream=http.request({hostname:'127.0.0.1',port,path:target+url.search,method:req.method,headers},response=>{
   const publicDoorbellImage=response.statusCode===200&&/^\/doorbell-assets\/[a-f0-9]{64}\.webp$/.test(target);
   const head={...response.headers,'Cache-Control':publicDoorbellImage?(response.headers['cache-control']||'public, max-age=31536000, immutable'):(acrylCacheControl(url.pathname,response.statusCode)||'private, no-store'),'X-Robots-Tag':'noindex, nofollow, noarchive'};delete head['cache-control'];
   if(!target.startsWith('/api/')&&/^(text\/html|text\/javascript|application\/javascript|text\/css)/.test(head['content-type']||'')){
    const chunks=[];let bytes=0;response.on('data',chunk=>{bytes+=chunk.length;if(bytes>20*1024*1024){upstream.destroy();return;}chunks.push(chunk);});response.on('end',()=>{const body=Buffer.from(acrylAssetText(Buffer.concat(chunks).toString('utf8'),target));delete head['content-length'];delete head['content-encoding'];res.writeHead(response.statusCode,{...head,'Content-Length':body.length});res.end(body);});
   }else{res.writeHead(response.statusCode,head);response.pipe(res);}
  });upstream.setTimeout(120000,()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502).end();else res.destroy();});req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
 });
 server.once('close',()=>{inner.close();inner.closeAllConnections();existing.close();existing.closeAllConnections();lock.stdin.end();});lock.once('exit',()=>{server.close();server.closeAllConnections();});return server;
}


