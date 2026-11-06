import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {once} from 'node:events';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {build,OUTPUT} from '../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {testConfig,privateTestEnvironment,verifyStorage,verifyDirectory,PYTHON_MARKER,markerValue} from './config.mjs';
import {lockTestData} from './lock.mjs';

const digest=value=>createHash('sha256').update(value).digest();
let privateEntryDiagnostics=0;
const diagnosticFetchHeader=value=>typeof value==='string'?value.replace(/[^\x20-\x7e]/g,'').slice(0,20):null;
function activatedEntryNavigation(req,route){
  // A clicked external link may open these read-only pages, never an API/frame.
  // Fetch Metadata defines document + navigate + ?1 as activated navigation.
  return req.method==='GET'&&['/originale/','/originale/editor'].includes(route)
    &&['cross-site','same-site'].includes(req.headers['sec-fetch-site'])
    &&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document'
    &&req.headers['sec-fetch-user']==='?1';
}
// Private operator test only. No Shopify sessions, credentials, webhook or transfer transport.
export async function createPrivateTestRuntime(env){
  const config=testConfig(privateTestEnvironment(env));verifyStorage(config);
  verifyDirectory(config.pythonDir,PYTHON_MARKER,markerValue(config,'test-python'));
  fs.accessSync(config.python,fs.constants.X_OK);
  process.umask(0o077);process.env.GRAVURU_PYTHON=config.python;
  // Server-owned Python environment only; never inherit packages from the development checkout.
  delete process.env.PYTHONPATH;
  const lock=await lockTestData(config);let workshop,inner,gallery;
  try{
    build();const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
    // LiteSpeed may recycle an idle process while a protected editor stays open.
    // Bind its CSRF token to this private login, not the short-lived process.
    // Password/user/origin changes rotate it; Basic auth remains mandatory.
    const operatorCsrfToken=createHmac('sha256',config.password).update(JSON.stringify(['gravuru-private-test-csrf/v1',config.origin,config.username])).digest('hex');
    workshop=createWorkshop({filename:path.join(config.data,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,operatorCsrfToken});
    inner=createPreviewServer({workshop});
    if(config.slateReviewPackage){
      const {attachSlateReviewGallery}=await import('./slate-review-runtime.mjs');
      const csrfToken=createHmac('sha256',config.password).update(JSON.stringify(['gravuru-private-slate-review-csrf/v1',config.origin,config.username])).digest('hex');
      gallery=attachSlateReviewGallery(inner,config,{csrfToken,workshop});
    }
    inner.once('close',()=>{gallery?.close();workshop.close();lock.stdin.end();});
    // LiteSpeed replaces HTTP listen/address to capture the public app socket.
    // This private server must keep a real loopback socket and its own address.
    inner.address=net.Server.prototype.address;
    net.Server.prototype.listen.call(inner,0,'127.0.0.1');await once(inner,'listening');
  }catch(error){gallery?.close();workshop?.close();lock.stdin.end();throw error;}
  const server=createPrivateTestProxy(config,inner);
  server.once('close',()=>{inner.close();inner.closeAllConnections();});
  lock.once('exit',()=>{server.close();server.closeAllConnections();inner.close();inner.closeAllConnections();});
  return server;
}

// Exported separately so the external authentication boundary can be tested
// without starting or locking a real workshop database.
export function createPrivateTestProxy(config,inner,{onRequestFinished=event=>console.error('private-entry-request',JSON.stringify(event))}={}){
  const port=inner.address().port,expected=digest(config.username+':'+config.password);
  const server=http.createServer((req,res)=>{
    const route=req.url.split('?')[0],entryNavigation=activatedEntryNavigation(req,route);
    if(req.method==='GET'&&['/editor.html','/originale/editor'].includes(route)&&privateEntryDiagnostics<20){
      privateEntryDiagnostics++;
      const diagnostic={method:req.method,route,
        secFetchSite:diagnosticFetchHeader(req.headers['sec-fetch-site']),secFetchMode:diagnosticFetchHeader(req.headers['sec-fetch-mode']),
        secFetchDest:diagnosticFetchHeader(req.headers['sec-fetch-dest']),secFetchUser:diagnosticFetchHeader(req.headers['sec-fetch-user']),
        hostMatches:req.headers.host===config.host,httpsMatches:req.headers['x-forwarded-proto']==='https',
        originPresent:req.headers.origin!==undefined,originMatches:req.headers.origin===config.origin};
      res.once('finish',()=>{try{onRequestFinished({...diagnostic,status:res.statusCode});}catch{/* Diagnostics must not affect the private response. */}});
    }
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.setHeader('Referrer-Policy','no-referrer');
    const reject=status=>res.writeHead(status).end();
    if(req.headers.host!==config.host||req.headers['x-forwarded-proto']!=='https'||!req.url.startsWith('/')||req.url.startsWith('//'))return reject(403);
    if(req.headers.origin&&req.headers.origin!==config.origin)return reject(403);
    if(req.headers['sec-fetch-site']&&!['none','same-origin'].includes(req.headers['sec-fetch-site'])&&!entryNavigation)return reject(403);
    const auth=/^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(req.headers.authorization||'');
    const decoded=auth&&auth[1].length<=1024?Buffer.from(auth[1],'base64'):Buffer.alloc(0);
    if(!timingSafeEqual(expected,digest(decoded))){res.setHeader('WWW-Authenticate','Basic realm="Gravuru private test", charset="UTF-8"');return reject(401);}
    if(req.url==='/__test/health'&&['GET','HEAD'].includes(req.method)){
      res.setHeader('Content-Type','application/json');return res.end(req.method==='HEAD'?undefined:JSON.stringify({ready:true,scope:'private-operator-test',shopifyConnected:false}));
    }
    const headers={host:'127.0.0.1:'+port};
    for(const name of ['accept','accept-language','content-type','content-length','cookie','x-gravuru-csrf','x-gravuru-draft','x-slate-review-csrf','sec-fetch-site','sec-fetch-mode','sec-fetch-dest'])if(req.headers[name]!==undefined)headers[name]=req.headers[name];
    // Only this authenticated, exact-page navigation passed the outer policy.
    // The loopback handlers otherwise reject its original cross-site header.
    if(entryNavigation)headers['sec-fetch-site']='none';
    if(req.headers.origin)headers.origin='http://127.0.0.1:'+port;
    // Only after authentication and exact external Host/Origin checks use the existing loopback contract.
    const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},response=>{
      res.writeHead(response.statusCode,{...response.headers,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'});response.pipe(res);
    });
    upstream.setTimeout(120000,()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)reject(502);else res.destroy();});
    req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
  });
  return server;
}
