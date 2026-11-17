// Local visual comparison fixture. No Shopify calls or real customer data.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]),port=Number(process.argv[3]),enabled=process.argv[4]==='enabled';
const load=file=>import(pathToFileURL(path.join(root,file)).href);
const {build}=await load('app/configurator/variant-m/build.mjs');
const {createPreviewServer}=await load('app/configurator/variant-m/server.mjs');
const outputDirectory=path.resolve('work/p1-ui-'+port);fs.mkdirSync(outputDirectory,{recursive:true});
build({outputDirectory});const model=JSON.parse(fs.readFileSync(path.join(outputDirectory,'models.json')))[0];
const server=createPreviewServer({outputDirectory}),original=server.listeners('request')[0];
server.removeListener('request',original);
let saves=0,carts=0;
const binding={productId:'cfg_synthetic',productRevision:1};
server.on('request',async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port),send=(code,type,body)=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
 if(url.pathname==='/')return send(200,'text/html; charset=utf-8','<!doctype html><html lang="de"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P1 lokaler Konfi-Vergleich</title><style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style><script src="/fixture.js"></script><iframe title="Prio Konfigurator" src="/editor.html?module=einzeln"></iframe></html>');
 if(url.pathname==='/fixture.js')return send(200,'text/javascript',`
 window.UniversalConfig=${JSON.stringify(model.universal)};
 window.GravuruModelProfile=${JSON.stringify(model.legacy)};
 window.GravuruWorkshopReview=${JSON.stringify(binding)};
 window.GravuruShopEntry=Object.freeze({...window.GravuruWorkshopReview,shopDomain:'test.myshopify.com',presentation:'prio-r15',preSaveOnReview:${enabled},cartMode:'theme',themeCartPath:'/apps/konfigurator/cart',csrfToken:'fixture',productName:'Unser Anfang',request:(_,options)=>fetch('/fixture-save',options),submitCart:async()=>{await fetch('/fixture-cart',{method:'POST'});throw Error('Die Warenkorbübergabe ist abgelaufen. Bitte zum Konfigurator zurückkehren und erneut starten.');}});
 `);
 if(url.pathname==='/fixture-save'){
  let input='';for await(const chunk of req)input+=chunk;const body=JSON.parse(input);saves++;
  await new Promise(r=>setTimeout(r,1000));
  return send(body.expectedRevision?200:201,'application/json',JSON.stringify({id:'adraft_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',token:'b'.repeat(64),revision:(body.expectedRevision||0)+1,snapshotId:'proof_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}));
 }
 if(url.pathname==='/fixture-cart'){carts++;return send(200,'application/json','{}');}
 if(url.pathname==='/fixture-stats')return send(200,'application/json',JSON.stringify({enabled,saves,carts}));
 return original(req,res);
});
server.listen(port,'127.0.0.1',()=>console.log('Local fixture http://127.0.0.1:'+port));
