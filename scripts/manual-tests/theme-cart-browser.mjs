// Local browser fixture: no Shopify credentials, requests or external writes.
// node scripts/manual-tests/theme-cart-browser.mjs
// The real page/client run against an in-memory Ajax cart. Only the page's
// canonical-shop hostname guard is adapted to loopback in the served test copy.
import http from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root));
const preview=read('app/designs/acrylic-unser-anfang/reference.png');
const proxy='/apps/konfigurator',config='konfig_11111111-1111-4111-8111-111111111111';
let cart,mode,claimed,adds,removes,revision;
const other={key:'other:1',variant_id:77,product_id:7,quantity:1,original_price:500,original_line_price:500,final_line_price:500,properties:{Design:'Anderer Artikel'}};
const payload=()=>({schema:'gravuru-theme-cart/v1',shopDomain:'test.myshopify.com',productId:'1',variantId:'11',quantity:revision===1?1:2,unitCents:1999,totalCents:1999*(revision===1?1:2),currency:'EUR',configuration:{id:config,rev:revision},mode:revision===1?'create':'update',previousRevision:revision===1?null:1,properties:{_gravuru_offer:String(revision).repeat(64),_gravuru_config:config,_gravuru_rev:String(revision),Design:'Lokales Testdesign',Gravurtext:revision===1?'Familie Beispiel':'Familie Beispiel – bearbeitet',Format:'120 × 80 mm'},preview:{type:'image/png',base64:preview.toString('base64')},paymentConfirmed:false,productionReady:false});
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shell=body=>'<!doctype html><html lang="de"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lokale Warenkorbprüfung</title><style>body{font:18px/1.5 system-ui;max-width:760px;margin:32px auto;padding:20px;color:#253733}a{display:inline-block;padding:12px;background:#e3efeb;margin:4px;border-radius:8px}img{max-width:240px;max-height:180px;object-fit:contain}article{border-bottom:1px solid #ccc;padding:16px 0}</style><p><strong>Lokaler Test · keine Verbindung zu Shopify</strong></p>'+body+'</html>';
function reset(next){mode=next;claimed=false;adds=0;removes=0;revision=1;cart={currency:'EUR',items:[structuredClone(other)]};}
reset('normal');
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1'),send=(code,body,type='text/html; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);},json=(code,v)=>send(code,JSON.stringify(v),'application/json');
 try{
  if(u.pathname==='/')return send(200,shell('<h1>Warenkorbprüfung</h1><a href="/test/normal">Normal testen</a><a href="/test/lost">Verlorene Antwort testen</a><a href="/test/invalid">Falschen Preis testen</a>'));
  if(u.pathname.startsWith('/test/')){reset(u.pathname.split('/').at(-1));res.writeHead(302,{Location:proxy+'/cart#handoff='+'a'.repeat(64)});return res.end();}
  if(u.pathname==='/edit'){revision=2;claimed=false;res.writeHead(302,{Location:proxy+'/cart#handoff='+'b'.repeat(64)});return res.end();}
  if(u.pathname===proxy+'/cart')return send(200,read('app/workshop/ui/theme-cart.html').toString().replaceAll('__PROXY_PATH__',proxy).replace('<h1>','<p>Lokaler Test · keine Verbindung zu Shopify</p><h1>'));
  if(u.pathname===proxy+'/theme-cart-ui.mjs')return send(200,read('app/workshop/ui/theme-cart-ui.mjs').toString().replace('location.hostname!==payload.shopDomain',"location.hostname!=='127.0.0.1'"),'text/javascript');
  if(u.pathname===proxy+'/theme-cart-client.mjs')return send(200,read('app/workshop/ui/theme-cart-client.mjs'),'text/javascript');
  if(u.pathname===proxy+'/cart/data')return json(200,payload());
  if(u.pathname===proxy+'/cart/claim'){if(claimed)return json(409,{error:{message:'Übertragung bereits begonnen.'}});claimed=true;return json(200,{claimed:true});}
  if(u.pathname==='/cart.js')return json(200,cart);
  if(u.pathname==='/cart/add.js'){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const fd=await new Request('http://127.0.0.1',{method:'POST',headers:{'Content-Type':req.headers['content-type']},body:Buffer.concat(chunks)}).formData();
   const properties={};for(const [key,value]of fd){const match=key.match(/^items\[0\]\[properties\]\[(.+)\]$/);if(match)properties[match[1]]=typeof value==='string'?value:'https://cdn.shopify.com/s/files/1/uploads/test.png';}
   adds++;const p=payload(),quantity=Number(fd.get('items[0][quantity]'));
   cart.items.push({key:'new:'+revision,variant_id:Number(fd.get('items[0][id]')),product_id:1,quantity,properties,original_price:mode==='invalid'?1:p.unitCents,original_line_price:p.totalCents,final_line_price:p.totalCents});
   if(mode==='lost')return send(200,'{','application/json'); // Reply body is unreadable; upload has completed.
   return json(200,{items:cart.items.slice(-1)});
  }
  if(u.pathname==='/cart/change.js'){const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks));if(body.quantity!==0)return json(422,{});cart.items=cart.items.filter(l=>l.key!==body.id);removes++;return json(200,cart);}
  if(u.pathname==='/preview.png')return send(200,preview,'image/png');
  if(u.pathname==='/cart')return send(200,shell('<h1>Dein Test-Warenkorb</h1><p>Übertragungen: '+adds+' · Ersetzungen: '+removes+' · Positionen: '+cart.items.length+'</p>'+cart.items.map(l=>'<article><h2>'+esc(l.properties.Design)+'</h2>'+(l.properties._Entwurf?'<img src="/preview.png" alt="Gespeicherte Gestaltung"><p>'+esc(l.properties.Gravurtext)+'</p>':'')+'<p>Menge: '+l.quantity+' · '+(l.original_line_price/100).toFixed(2)+' €</p></article>').join('')+'<a href="/edit">Gestaltung bearbeiten</a><a href="/">Weitere Prüfung</a>'));
  return send(404,'Nicht gefunden');
 }catch(e){json(500,{error:{message:e.message}});}
});
server.listen(0,'127.0.0.1',()=>console.log('Lokale Testseite: http://127.0.0.1:'+server.address().port));
