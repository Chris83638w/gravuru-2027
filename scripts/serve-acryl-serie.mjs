import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createWorkshop} from '../app/workshop/http.mjs';import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
const CODE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ROOT=path.resolve(CODE,'../..'),seed=JSON.parse(fs.readFileSync(path.join(CODE,'app/configurator/variant-m/.preview/models.json'),'utf8'))[0];
process.env.GRAVURU_PYTHON=process.argv[2];process.env.PYTHONPATH=process.argv[3];
const workshop=createWorkshop({filename:path.join(CODE,'.local-data/acryl-serie/workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const server=createPreviewServer({workshop});
const handle=server.listeners('request')[0];server.removeAllListeners('request');
server.on('request',async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');if(!url.pathname.startsWith('/acryl-galerie/'))return handle(req,res);
 const host=req.headers.host,port=server.address()?.port,origin='http://'+host;
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(host)||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return res.writeHead(403).end();
 if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
 let relative;try{relative=decodeURIComponent(url.pathname.slice('/acryl-galerie/'.length))||'Designgalerie.html';}catch{return res.writeHead(400).end();}
 if(!/^(?:Designgalerie\.html|Formvorlagen\.html|galerie\.mjs|galerie\.css|galerie-daten\.json|Galerievorschauen\/(?:TS-Acryl-D[0-9]+|Form-[A-Z0-9]+)-(?:SW|AN)\.svg)$/.test(relative))return res.writeHead(404).end();
 try{const bytes=fs.readFileSync(path.join(ROOT,'outputs/Acryl-Serie-2027',relative)),types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':types[path.extname(relative)],'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404).end();}
});server.on('close',()=>workshop.close());server.listen(Number(process.argv[4]||8977),'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port,scope:'local-acryl-drafts'})));
