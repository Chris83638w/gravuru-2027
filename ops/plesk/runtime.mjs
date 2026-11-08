import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {once} from 'node:events';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {build,OUTPUT} from '../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {testConfig,privateTestEnvironment,verifyStorage,verifyDirectory,PYTHON_MARKER,markerValue} from './config.mjs';
import {lockTestData} from './lock.mjs';

const digest=value=>createHash('sha256').update(value).digest();
const diagnosticValue=(value,allowed)=>value===undefined?null:allowed.includes(value)?value:'other';
const diagnosticLength=value=>typeof value==='string'&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):null;
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
      const {attachConfiguredSlateReviewGallery}=await import('./slate-review-runtime.mjs');
      const csrfToken=createHmac('sha256',config.password).update(JSON.stringify(['gravuru-private-slate-review-csrf/v1',config.origin,config.username])).digest('hex');
      gallery=await attachConfiguredSlateReviewGallery(inner,config,{csrfToken,workshop});
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
export function createPrivateTestProxy(config,inner,{onDiagnostic=event=>console.error('private-entry-request',JSON.stringify(event))}={}){
  const port=inner.address().port,expected=digest(config.username+':'+config.password);
  const diagnosticRunId=randomUUID(),diagnosticCounts=new Map();let diagnosticSequence=0;
  const server=http.createServer((req,res)=>{
    const route=req.url.split('?')[0],entryNavigation=activatedEntryNavigation(req,route);
    let trace;
    if(req.method==='GET'&&['/editor.html','/originale/editor'].includes(route)&&(diagnosticCounts.get(route)||0)<20){
      diagnosticCounts.set(route,(diagnosticCounts.get(route)||0)+1);
      const identity={runId:diagnosticRunId,sequence:++diagnosticSequence,route},started=performance.now();
      trace={bytes:0,complete:null,emit(phase,details={}){
        try{onDiagnostic({...identity,phase,timestamp:new Date().toISOString(),elapsedMs:Math.round((performance.now()-started)*1000)/1000,...details});}
        catch{/* Diagnostics must not affect the private response. */}
      }};
      trace.emit('request-begin',{method:req.method,
        secFetchSite:diagnosticValue(req.headers['sec-fetch-site'],['none','same-origin','same-site','cross-site']),
        secFetchMode:diagnosticValue(req.headers['sec-fetch-mode'],['navigate','cors','no-cors','same-origin','websocket']),
        secFetchDest:diagnosticValue(req.headers['sec-fetch-dest'],['document','iframe','empty','script','style','image','font']),
        secFetchUser:diagnosticValue(req.headers['sec-fetch-user'],['?1','?0']),
        hostMatches:req.headers.host===config.host,httpsMatches:req.headers['x-forwarded-proto']==='https',
        originPresent:req.headers.origin!==undefined,originMatches:req.headers.origin===config.origin});
      // Reserve a trace at entry, not an event budget: even after the route cap,
      // every already observed response retains its finish/abort/close evidence.
      const outerState=()=>({status:res.statusCode,upstreamBytes:trace.bytes,upstreamComplete:trace.complete,
        headersSent:res.headersSent,writableEnded:res.writableEnded,writableFinished:res.writableFinished});
      res.once('finish',()=>trace.emit('outer-finish',outerState()));
      res.once('close',()=>trace.emit('outer-close',outerState()));
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
      if(trace){
        trace.emit('upstream-headers',{status:response.statusCode,declaredBytes:diagnosticLength(response.headers['content-length']),
          contentType:diagnosticValue(response.headers['content-type']?.split(';')[0].trim().toLowerCase(),['text/html','application/json','text/javascript','application/javascript','text/css']),
          contentEncoding:diagnosticValue(response.headers['content-encoding'],['identity','gzip','br','deflate']),
          connectionHeader:response.headers.connection!==undefined,keepAliveHeader:response.headers['keep-alive']!==undefined,transferEncodingHeader:response.headers['transfer-encoding']!==undefined});
        response.on('data',chunk=>{const first=trace.bytes===0;trace.bytes+=chunk.length;if(first)trace.emit('upstream-first-byte',{upstreamBytes:trace.bytes});});
        const received=()=>({upstreamBytes:trace.bytes,complete:response.complete});
        response.once('end',()=>{trace.complete=response.complete;trace.emit('upstream-end',received());});
        response.once('aborted',()=>{trace.complete=response.complete;trace.emit('upstream-aborted',received());});
        response.once('close',()=>{trace.complete=response.complete;trace.emit('upstream-close',received());});
      }
      res.writeHead(response.statusCode,{...response.headers,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'});response.pipe(res);
    });
    upstream.setTimeout(120000,()=>{trace?.emit('upstream-timeout');upstream.destroy();});
    upstream.on('error',error=>{trace?.emit('upstream-request-error',{code:diagnosticValue(error.code,['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EPIPE','EAI_AGAIN','ENOTFOUND','ERR_HTTP_CONTENT_LENGTH_MISMATCH','ERR_STREAM_PREMATURE_CLOSE'])});if(!res.headersSent)reject(502);else res.destroy();});
    req.on('aborted',()=>{trace?.emit('request-aborted');upstream.destroy();});res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
  });
  return server;
}
