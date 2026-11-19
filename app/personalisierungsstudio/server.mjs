import http from 'node:http';
import fs from 'node:fs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {hash,here} from './catalog.mjs';
import {DEMO_SHOP} from './store.mjs';
import {proxyShop,readOrder,downloadShopifyFile,syncF02Orders} from './shopify.mjs';
import {merchantPage,merchantImport} from './merchant-server.mjs';

export {DEMO_SHOP};
export const DEMO_VARIANT='90002';
const DEMO_PRODUCT='70001';
export {DEMO_PRODUCT};
const staticFiles=new Map([
  ['editor.mjs','editor.mjs'],['render.mjs','render.mjs'],['text-paths.mjs','../platform/sources/app/shared/models/text-paths.mjs'],
  ['studio.css','studio.css'],['steel.webp','../designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.webp']
]);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function frame(title,body,head=''){return '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+'</title>'+head+'<link rel="stylesheet" href="/studio/files/studio.css"><body class="gs-demo"><header><a href="/">gravuru <b>Studio</b></a><nav><a href="/cart">Warenkorb</a> <a href="/werkstatt">Werkstatt</a></nav></header><main>'+body+'</main></body></html>';}
function authorized(req,token){if(!token) return false;const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+token);return a.length===b.length && timingSafeEqual(a,b);}
async function body(req,limit=100_000){
  if(!req.headers['content-type']?.startsWith('application/json')) throw Error('JSON-Anfrage erforderlich.');
  const parts=[];let length=0;
  for await(const part of req){length+=part.length;if(length>limit) throw Error('Datei oder Anfrage zu groß.');parts.push(part);}
  return JSON.parse(Buffer.concat(parts).toString());
}
export function createServer(store, options={}) {
  const {demo=false,secret,shop,opsToken,shopifyToken,shopifyFetch=fetch,f02}=options;
  const carts=new Map(),encoded=new Map();let orderNumber=1000;
  const files=new Map();
  let activeF02Sync;
  if(demo) orderNumber=Math.max(orderNumber,...store.orders(DEMO_SHOP).map(o=>Number(o.id)).filter(Number.isSafeInteger));
  return http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost'),p=url.pathname, method=req.method;
    const send=(code,type,msg,cache='no-store',key=null)=>{
      let data=Buffer.isBuffer(msg)?msg:Buffer.from(msg);
      res.setHeader('Content-Type',type);res.setHeader('Cache-Control',cache);res.setHeader('X-Content-Type-Options','nosniff');
      if(data.length>1000 && /json|javascript|svg|text\/(html|css)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding']||'')){
        res.setHeader('Vary','Accept-Encoding');res.setHeader('Content-Encoding','gzip');
        const compressed=key && encoded.get(key);
        if(compressed) data=compressed;
        else {data=gzipSync(data);if(key){if(encoded.size>=96) encoded.delete(encoded.keys().next().value);encoded.set(key,data);}}
      } else if(/json|javascript|svg|text\/(html|css)/.test(type)) res.setHeader('Vary','Accept-Encoding');
      res.writeHead(code);res.end(data);
    };
    const json=(value,code=200)=>send(code,'application/json; charset=utf-8',JSON.stringify(value));
    const html=value=>send(200,'text/html; charset=utf-8',value);
    try {
      if(demo){
        if(!/^((127\.0\.0\.1|localhost)(:\d+)?)$/.test(req.headers.host||'') || !['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress)){
          return json({error:'Demo nur auf diesem Rechner erreichbar.'},403);
        }
        if(method==='POST' && req.headers.origin && req.headers.origin!=='http://'+req.headers.host) return json({error:'Fremder Ursprung.'},403);
      }
      let tenant;
      if((p==='/verwaltung' && demo || !demo && (p==='/werkstatt' || p==='/')) && method==='GET')return html(merchantPage(demo,!demo && !!f02));
      if(method==='GET' && ['/merchant/merchant.mjs','/merchant/studio.css'].includes(p))return send(200,p.endsWith('.mjs')?'text/javascript':'text/css',fs.readFileSync(here(p.split('/').pop())));
      if(p.startsWith('/studio/')) tenant=demo?DEMO_SHOP:proxyShop(url.searchParams,secret);
      if(p.startsWith('/studio/files/') && method==='GET'){
        const name=p.split('/').pop(),file=staticFiles.get(name);
        if(!file) return json({error:'Datei fehlt.'},404);
        const type=name.endsWith('.mjs')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css':'image/webp';
        if(!files.has(name)){const bytes=fs.readFileSync(here(file));files.set(name,{bytes,tag:'"'+hash(bytes)+'"'});}
        const {bytes,tag}=files.get(name),cache=name.endsWith('.webp')?'private, max-age=86400':'private, max-age=0, must-revalidate';
        res.setHeader('ETag',tag);res.setHeader('Cache-Control',cache);
        if(req.headers['if-none-match']===tag){res.writeHead(304);return res.end();}
        return send(200,type,bytes,cache,name);
      }
      if(p==='/studio/catalog' && method==='GET'){
        const binding=store.binding(tenant,url.searchParams.get('variant')||'');
        const tag='"'+hash(JSON.stringify([tenant,binding.product,binding.variant,binding.revision]))+'"';
        res.setHeader('ETag',tag);res.setHeader('Cache-Control','private, no-cache');
        if(req.headers['if-none-match']===tag){res.writeHead(304);return res.end();}
        const data=JSON.stringify(binding).slice(0,-1)+',"initialAssets":'+store.bootstrap(tenant,binding.revision)+'}';
        return send(200,'application/json',data,'private, no-cache',tag);
      }
      if(/^\/studio\/assets\/[a-f0-9]{64}$/.test(p) && method==='GET'){
        const key=p.split('/').pop();
        return send(200,'application/json',store.asset(tenant,key),'public, max-age=31536000, immutable',key);
      }
      if(p==='/studio/designs' && method==='POST') return json(store.save(tenant,await body(req)),201);
      if(p==='/studio/photos' && method==='POST') return json(await store.upload(tenant,await body(req,11_000_000)),201);
      if(p.startsWith('/api/') || demo && p.startsWith('/demo/manage/')){
        const local=demo && p.startsWith('/demo/manage/'),owner=local?DEMO_SHOP:shop;
        if(!local && !authorized(req,opsToken)) return json({error:'Werkstattzugang erforderlich.'},401);
        const route=p.slice(local?'/demo/manage'.length:'/api'.length);
        if(method==='POST' && ['/imports/check','/imports/publish'].includes(route)){
          const input=await body(req,11_000_000);
          if(local && route.endsWith('/publish') && (input.product!==DEMO_PRODUCT || input.variant!==DEMO_VARIANT))throw Error('Nur die lokale Mustervariante ist gebunden.');
          return json(await merchantImport(store,owner,input,route.endsWith('/publish')));
        }
        const sync=/^\/orders\/(\d+)\/sync$/.exec(route);
        const dl=/^\/orders\/(\d+)\/lines\/(\d+)\/(svg|pdf|json|original)$/.exec(route);
        if(!local && f02 && route==='/orders/f02/sync' && method==='POST') {
          activeF02Sync ??= syncF02Orders(store,shop,shopifyToken,f02,shopifyFetch)
            .finally(()=>{activeF02Sync=undefined;});
          return json(await activeF02Sync);
        }
        if(!local && sync && method==='POST') return json({positions:store.receive(shop,await readOrder(shop,shopifyToken,sync[1],shopifyFetch,f02),f02)});
        if(route==='/orders' && method==='GET') return json(store.orders(owner));
        if(dl && method==='GET'){
          const file=local
            ? await store.download(owner,dl[1],dl[2],dl[3],{localDemo:true})
            : await downloadShopifyFile(store,owner,shopifyToken,dl[1],dl[2],dl[3],shopifyFetch,f02);
          res.setHeader('Content-Disposition','attachment; filename="'+dl[1]+'-'+dl[2]+'.'+(dl[3]==='original' ? file.type.split('/')[1] : dl[3])+'"');
          return send(200,file.type,file.bytes);
        }
      }
      if(!demo) return json({error:'Nicht gefunden.'},404);
      let cookie=(req.headers.cookie||'').match(/(?:^|; )gs_cart=([a-f0-9]{32})(?:;|$)/)?.[1];
      if(!cookie || !carts.has(cookie)){
        cookie=randomBytes(16).toString('hex');carts.set(cookie,[]);
        res.setHeader('Set-Cookie','gs_cart='+cookie+'; HttpOnly; SameSite=Strict; Path=/');
      }
      const cart=carts.get(cookie);
      if(p==='/' && method==='GET') return html(frame('Heimathafen gestalten','<p class="gs-kicker">Edelstahl · 90 × 60 mm</p><h1>Unser Heimathafen</h1><gravuru-studio data-base="/studio/" data-variant="'+DEMO_VARIANT+'" data-product="'+DEMO_PRODUCT+'" data-currency-label="10,99 €" data-surface="/studio/files/steel.webp" data-cart="/cart" data-add="/cart/add.js" data-cart-json="/cart.js"></gravuru-studio><script type="module" src="/studio/files/editor.mjs"></script>','<link rel="modulepreload" href="/studio/files/render.mjs"><link rel="modulepreload" href="/studio/files/text-paths.mjs"><link rel="preload" as="fetch" crossorigin="anonymous" href="/studio/catalog?variant='+DEMO_VARIANT+'">'));
      if(p==='/cart.js' && method==='GET') return json({items:cart});
      if(p==='/cart/add.js' && method==='POST'){
        const {items}=await body(req);
        if(!Array.isArray(items)||items.length!==1)throw Error('Eine Position erwartet.');
        const {id,quantity,properties}=items[0];
        if(String(id)!==DEMO_VARIANT || !Number.isInteger(quantity) || quantity<1 || quantity>99 || !properties?._gravuru_studio) throw Error('Testposition ungültig.');
        const item=cart.find(i=>i.properties._gravuru_studio===properties._gravuru_studio);
        if(item) item.quantity+=quantity;else cart.push({variant_id:String(id),quantity,properties,price:1099});
        return json({items});
      }
      if(p==='/cart' && method==='GET') return html(frame('Warenkorb','<h1>Warenkorb</h1>'+(!cart.length?'<p>Dein Warenkorb ist leer.</p>':cart.map(i=>'<article><h2>'+escape(i.properties.Gestaltung)+'</h2><p>'+escape(i.properties.Personalisierung||'')+'</p><p>'+i.quantity+' Stück · '+(i.price*i.quantity/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'</p></article>').join('')+'<form action="/demo/order" method="post"><button>Testbestellung für die Werkstatt erzeugen</button></form>')));
      if(p==='/demo/order' && method==='POST'){
        if(!cart.length)throw Error('Warenkorb leer.');
        const id=String(++orderNumber);
        store.receive(DEMO_SHOP,{id,name:'Probe #'+id,status:'TEST',lines:cart.map((i,n)=>({id:String(n+1),product:DEMO_PRODUCT,variant:i.variant_id,job:i.properties._gravuru_studio,quantity:i.quantity}))});
        cart.length=0;res.writeHead(303,{Location:'/werkstatt'});return res.end();
      }
      if(p==='/werkstatt' && method==='GET'){
        const list=store.orders(DEMO_SHOP);
        return html(frame('Werkstatt','<h1>Werkstatt</h1><p><a href="/verwaltung">Designs verwalten und importieren</a></p>'+(list.length?list.map(o=>'<article><h2>'+escape(o.name)+'</h2><p>Position '+o.line+' · '+o.qty+' Stück</p>'+['svg','pdf','json'].map(f=>'<a class="gs-download" href="/demo/export/'+o.id+'/'+o.line+'/'+f+'">'+f.toUpperCase()+'</a>').join(' ')+'</article>').join(''):'<p>Hier erscheinen die Positionen aus deinem Testwarenkorb.</p>')));
      }
      const download=/^\/demo\/export\/(\d+)\/(\d+)\/(svg|pdf|json|original)$/.exec(p);
      if(download && method==='GET'){
        const file=await store.download(DEMO_SHOP,download[1],download[2],download[3],{localDemo:true});
        res.setHeader('Content-Disposition','attachment; filename="Heimathafen-'+download[1]+'-'+download[2]+'.'+download[3]+'"');
        return send(200,file.type,file.bytes);
      }
      return json({error:'Nicht gefunden.'},404);
    } catch(error) {
      return json({error:error.message},error.status===409?409:/Signatur|App-Proxy/.test(error.message)?403:422);
    }
  });
}
