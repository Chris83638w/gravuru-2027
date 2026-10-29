// Local, read-only UI evidence for Issue #48. No workshop database, Shopify or writes.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateFamily,familyProductConfig} from '../app/workshop/product-families.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),preview=path.join(root,'app/configurator/variant-m/.preview');
const legacySeed=JSON.parse(fs.readFileSync(path.join(preview,'models.json'),'utf8'))[0].legacy;
const families=new Map(['aa','as','ss'].map(k=>[k,validateFamily(JSON.parse(fs.readFileSync(path.join(root,'app/workshop/test-fixtures/acrylic-families/'+k+'.json'),'utf8')))]));
const html='<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acryl · lokale Anschlussprüfung</title><style>html,body{margin:0;width:100%;height:100%}iframe{display:block;width:100%;height:100%;border:0}</style><script type="module">const model=await(await fetch("/model.json"+location.search)).json();window.UniversalConfig=model.universal;window.GravuruModelProfile=model.legacy;window.GravuruShopEntry={embedded:true};const f=document.createElement("iframe");f.title="Kunden-Konfigurator";f.src="/editor.html?leiste=b";document.body.append(f);</script></html>';
http.createServer((req,res)=>{
 try{
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  const url=new URL(req.url,'http://127.0.0.1'),p=url.pathname;
  if(p==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
  if(p==='/model.json'){
   const f=families.get(url.searchParams.get('family')||'ss'),s=f?.sizes.find(s=>s.key===(url.searchParams.get('plate')||'SS-RE-180X120'));
   if(!f||!s){res.writeHead(404).end('Familie oder Größe fehlt.');return;}
   const c=familyProductConfig(f,s,1),legacy=structuredClone(legacySeed);legacy.designs=c.profile.designs;legacy.purchasing.basePriceCents=c.basePriceCents;legacy.purchasing.bellModel=c.profile.name;legacy.features={...legacy.features,orderEnabled:false,productionConfirmed:false};res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({universal:c,legacy}));return;
  }
  const file=p==='/editor.html'?path.join(preview,'editor.html'):p==='/assistant.js'?path.join(preview,'assistant.js'):p==='/guides.json'?path.join(preview,'guides.json'):p.startsWith('/_bundle/')?path.join(preview,'bundle',path.basename(p)):p.startsWith('/_runtime/lazy/')?path.join(preview,'lazy',path.basename(p)):null;
  if(!file||!fs.existsSync(file)){res.writeHead(404).end();return;}
  const type={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'}).end(fs.readFileSync(file));
 }catch(e){console.error(e.message);res.writeHead(500).end('Lokale Vorschau konnte nicht geladen werden.');}
}).listen(8148,'127.0.0.1',()=>console.log('Local acrylic preview: http://127.0.0.1:8148/?family=ss&plate=SS-RE-180X120'));
