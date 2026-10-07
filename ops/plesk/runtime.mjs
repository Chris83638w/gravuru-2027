import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {once} from 'node:events';
import {createHash,timingSafeEqual} from 'node:crypto';
import {build,OUTPUT} from '../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {testConfig,verifyStorage,verifyDirectory,PYTHON_MARKER,markerValue} from './config.mjs';
import {lockTestData} from './lock.mjs';

const digest=value=>createHash('sha256').update(value).digest();
// Private operator test only. No Shopify sessions, credentials, webhook or transfer transport.
export async function createPrivateTestRuntime(env){
  const config=testConfig(env);verifyStorage(config);
  verifyDirectory(config.pythonDir,PYTHON_MARKER,markerValue(config,'test-python'));
  fs.accessSync(config.python,fs.constants.X_OK);
  process.umask(0o077);process.env.GRAVURU_PYTHON=config.python;
  // Server-owned Python environment only; never inherit packages from the development checkout.
  delete process.env.PYTHONPATH;
  const lock=await lockTestData(config);let workshop,inner;
  try{
    build();const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
    workshop=createWorkshop({filename:path.join(config.data,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
    inner=createPreviewServer({workshop});inner.once('close',()=>{workshop.close();lock.stdin.end();});
    // LiteSpeed replaces HTTP listen/address to capture the public app socket.
    // This private server must keep a real loopback socket and its own address.
    inner.address=net.Server.prototype.address;
    net.Server.prototype.listen.call(inner,0,'127.0.0.1');await once(inner,'listening');
  }catch(error){workshop?.close();lock.stdin.end();throw error;}
  const port=inner.address().port,expected=digest(config.username+':'+config.password);
  const server=http.createServer((req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.setHeader('Referrer-Policy','no-referrer');
    const reject=status=>res.writeHead(status).end();
    if(req.headers.host!==config.host||req.headers['x-forwarded-proto']!=='https'||!req.url.startsWith('/')||req.url.startsWith('//'))return reject(403);
    if(req.headers.origin&&req.headers.origin!==config.origin||req.headers['sec-fetch-site']&&!['none','same-origin'].includes(req.headers['sec-fetch-site']))return reject(403);
    const auth=/^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(req.headers.authorization||'');
    const decoded=auth&&auth[1].length<=1024?Buffer.from(auth[1],'base64'):Buffer.alloc(0);
    if(!timingSafeEqual(expected,digest(decoded))){res.setHeader('WWW-Authenticate','Basic realm="Gravuru private test", charset="UTF-8"');return reject(401);}
    if(req.url==='/__test/health'&&['GET','HEAD'].includes(req.method)){
      res.setHeader('Content-Type','application/json');return res.end(req.method==='HEAD'?undefined:JSON.stringify({ready:true,scope:'private-operator-test',shopifyConnected:false}));
    }
    const headers={host:'127.0.0.1:'+port};
    for(const name of ['accept','accept-language','content-type','content-length','cookie','x-gravuru-csrf','sec-fetch-site','sec-fetch-mode','sec-fetch-dest'])if(req.headers[name]!==undefined)headers[name]=req.headers[name];
    if(req.headers.origin)headers.origin='http://127.0.0.1:'+port;
    // Only after authentication and exact external Host/Origin checks use the existing loopback contract.
    const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},response=>{
      res.writeHead(response.statusCode,{...response.headers,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'});response.pipe(res);
    });
    upstream.setTimeout(120000,()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)reject(502);else res.destroy();});
    req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
  });
  server.once('close',()=>{inner.close();inner.closeAllConnections();});
  lock.once('exit',()=>{server.close();server.closeAllConnections();inner.close();inner.closeAllConnections();});
  return server;
}
