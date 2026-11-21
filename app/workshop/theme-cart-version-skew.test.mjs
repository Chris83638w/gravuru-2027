import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// #252 Versionswechsel beim Warenkorb: Die Shop-Module (shop-embed.mjs, theme-cart-ui.mjs, theme-cart-client.mjs)
// haben feste URLs mit max-age=300, offene Tabs behalten ihre geladenen Module. Jede Kombination aus altem
// (Stand 72bf9bb2, vor V1–V4) und neuem Modul muss laden und den Warenkorb füllen:
// - alter Client: weiter PNG-Pfad (FormData), weil er kein Kennzeichen sendet;
// - neuer Client: kleine JSON-Übergabe, nur wenn er das Kennzeichen sendet.
const ui=new URL('./ui/',import.meta.url),fixtures=new URL('./test-fixtures/',import.meta.url);
const OLD_CLIENT=new URL('theme-cart-client-72bf9bb2.mjs',fixtures),OLD_UI=new URL('theme-cart-ui-72bf9bb2.mjs',fixtures);
const LIVE_CLIENT=new URL('theme-cart-client-9bfc281b.mjs',fixtures);
// #265 Stufe A, Teil 4: Client des Stands 5b9bf5f0 – kennt das Bild am eigenen Server, aber noch nicht „take“ (Daten und
// Bestätigung in einem Proxy-Abruf). Tabs mit diesem Client bleiben bei data, dann claim.
const PRE_TAKE_CLIENT=new URL('theme-cart-client-5b9bf5f0.mjs',fixtures);
const NEW_CLIENT=new URL('theme-cart-client.mjs',ui),NEW_UI=new URL('theme-cart-ui.mjs',ui),NEW_EMBED=new URL('shop-embed.mjs',ui);
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
const hostedUrl='https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+'d'.repeat(64)+'.png?v=1700000000';
const shopDomain='test.myshopify.com',token='a'.repeat(64);

// Antwort des neuen Servers auf /cart/data: mit Kennzeichen ohne PNG, sonst wie bisher mit PNG.
function serverPayload({hosted}){
 const id='konfig_11111111-1111-4111-8111-111111111111';
 return {schema:'gravuru-theme-cart/v1',shopDomain,variantId:'11',productId:'1',quantity:2,unitCents:1999,totalCents:3998,currency:'EUR',configuration:{id,rev:1},mode:'create',previousRevision:null,
  properties:{_gravuru_offer:'1'.repeat(64),_gravuru_config:id,_gravuru_rev:'1',Design:'Leuchtturm',Gravurtext:'Familie Müller',Format:'120 × 80 mm',_gravuru_bild:'https://app.example/gestaltung/x.png',_gravuru_checkout_image:hostedUrl},
  ...(hosted?{}:{preview:{type:'image/png',base64:png}}),paymentConfirmed:false,productionReady:false};
}

// Synthetischer Shop: /cart.js, /cart/add.js (FormData = PNG-Pfad, JSON = gehostete Vorschau), App-Proxy /cart/data|claim.
// take: 'new' = Server ab #265 Stufe A, Teil 4 (claim mit Kennzeichen liefert Daten und Bestätigung), 'images' = derselbe
// Server mit Kassenbild bei Shopify (take:false); ohne Angabe = älterer Server, der Kennzeichen und Body nicht kennt.
function shop({take}={}){
 const cart={currency:'EUR',items:[]},log={dataHeaders:[],adds:[],claims:0,takes:[],order:[]};let claimed=false;
 const fetchImpl=async(url,o={})=>{
  url=String(url);
  if(url.endsWith('/cart/data')){log.order.push('data');log.dataHeaders.push({...o.headers});return Response.json(serverPayload({hosted:o.headers?.['X-Gravuru-Cart-Preview']==='hosted'}));}
  if(url.endsWith('/cart/claim')){
   log.order.push('claim');log.claims++;assert.equal(o.method,'POST');
   const taking=o.headers?.['X-Gravuru-Cart-Take']==='1';
   if(taking){assert.equal(o.headers['Content-Type'],'application/json');log.takes.push({headers:{...o.headers},body:JSON.parse(o.body)});}else assert.equal(o.body,undefined,'der bisherige claim hat keinen Body');
   if(taking&&take==='images')return Response.json({take:false});
   // Neuer Server: Eine gemeldete Zeile dieses Angebots wird nur bestätigt gemeldet (present), nie erneut bestätigt.
   const p=taking&&take==='new'?serverPayload({hosted:o.headers['X-Gravuru-Cart-Preview']==='hosted'}):null;
   if(p&&log.takes.at(-1).body.lines.some(l=>l.config===p.configuration.id&&l.offer===p.properties._gravuru_offer))return Response.json({payload:p,claimed:false,present:true});
   if(claimed)return Response.json({error:{code:'theme_cart_uncertain',message:'Diese Übertragung wurde bereits begonnen.'}},{status:409});
   claimed=true;return Response.json(p?{payload:p,claimed:true}:{claimed:true});
  }
  if(url.endsWith('/cart.js')){log.order.push('cart');return Response.json(structuredClone(cart));}
  if(url.endsWith('/cart/add.js')){
   let id,quantity,properties;
   if(o.body instanceof FormData){
    const file=o.body.get('items[0][properties][_Entwurf]');assert.equal(file.type,'image/png');assert.deepEqual(Buffer.from(await file.arrayBuffer()),Buffer.from(png,'base64'));
    id=Number(o.body.get('items[0][id]'));quantity=Number(o.body.get('items[0][quantity]'));properties={};
    for(const [k,v]of o.body.entries()){const m=k.match(/^items\[0\]\[properties\]\[(.+)\]$/);if(m)properties[m[1]]=typeof v==='string'?v:'https://cdn.shopify.com/s/files/1/uploads/design.png';}
    log.adds.push('png');
   }else{
    assert.equal(o.headers['Content-Type'],'application/json');const item=JSON.parse(o.body).items[0];({id,quantity,properties}=item);
    assert.equal(properties._Entwurf,hostedUrl);assert.ok(!o.body.includes('iVBORw0KGgo'));log.adds.push('json');
   }
   const line={key:id+':k',variant_id:id,product_id:1,quantity,original_price:1999,original_line_price:1999*quantity,final_line_price:1999*quantity,properties};
   log.order.push('add');cart.items.push(line);return Response.json({items:[line]});
  }
  assert.fail('unerwartete Anfrage '+url);
 };
 return {cart,log,fetchImpl};
}

// Modulpaar so ablegen, wie der Browser es auflöst: ./theme-cart-client.mjs neben der Seite.
function pair(t,page,client,name){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-skew-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=fs.readFileSync(page,'utf8').replaceAll('__EDITOR_ORIGIN__','https://app.example').replaceAll('__PROXY_PATH__','/apps/konfigurator');
 fs.writeFileSync(path.join(dir,name),source);fs.copyFileSync(client,path.join(dir,'theme-cart-client.mjs'));
 return pathToFileURL(path.join(dir,name)).href+'?'+Math.random();
}

test('#252 old cached client: a hosted-only handoff would fail, the PNG handoff it still gets works',async()=>{
 const old=await import(OLD_CLIENT.href+'?direct');
 assert.equal(old.hostedPreview,undefined,'fixture is the client before V1');
 assert.throws(()=>old.validateThemeCartPayload(serverPayload({hosted:true})),/Gestaltungsvorschau fehlt/,'the reported failure mode');
 const s=shop(),client=old.createThemeCartClient({fetchImpl:s.fetchImpl,root:'/',claim:async()=>{s.log.claims++;}});
 const result=await client.submit(serverPayload({hosted:false}));
 assert.equal(result.cartUrl,'/cart');assert.deepEqual(s.log.adds,['png']);assert.equal(s.log.claims,1);assert.equal(s.cart.items.length,1);
});

test('#252 new client keeps both paths: PNG when the server sends it, JSON for the hosted handoff',async()=>{
 const neu=await import(NEW_CLIENT.href+'?direct');
 for(const hosted of [false,true]){
  const s=shop(),client=neu.createThemeCartClient({fetchImpl:s.fetchImpl,root:'/',claim:async()=>{s.log.claims++;}});
  await client.submit(serverPayload({hosted}));assert.deepEqual(s.log.adds,[hosted?'json':'png']);assert.equal(s.cart.items.length,1);
 }
});

test('#252 shop-embed links with an old or new client and only asks for the hosted handoff when the client can process it',async t=>{
 globalThis.GRAVURU_SHOP_EMBED_NO_AUTO=true;t.after(()=>{delete globalThis.GRAVURU_SHOP_EMBED_NO_AUTO;});
 const withOld=await import(pair(t,NEW_EMBED,OLD_CLIENT,'shop-embed.mjs'));
 assert.deepEqual(withOld.cartRequestHeaders(token,'data'),{'X-Gravuru-Cart-Handoff':token},'old cached client → PNG path');
 const withNew=await import(pair(t,NEW_EMBED,NEW_CLIENT,'shop-embed.mjs'));
 assert.deepEqual(withNew.cartRequestHeaders(token,'data'),{'X-Gravuru-Cart-Handoff':token,'X-Gravuru-Cart-Preview':'hosted','X-Gravuru-Cart-Image':'server'});
 // Tab mit dem Client des Stands 9bfc281b (kennt die gehostete Vorschau, aber nicht das Bild am eigenen Server).
 const withLive=await import(pair(t,NEW_EMBED,LIVE_CLIENT,'shop-embed.mjs'));
 assert.deepEqual(withLive.cartRequestHeaders(token,'data'),{'X-Gravuru-Cart-Handoff':token,'X-Gravuru-Cart-Preview':'hosted'},'älterer Client → kein Kennzeichen für das Bild am eigenen Server');
 assert.deepEqual(withNew.cartRequestHeaders(token,'claim'),{'X-Gravuru-Cart-Handoff':token},'the capability belongs to /cart/data only');
 // #265 Stufe A, Teil 4: Der claim-Abruf des neuen Wegs („take“) trägt die Kennzeichen des data-Abrufs, weil seine Antwort
 // die Daten enthält. Nur ein Client, der ihn auswerten kann, schaltet ihn ein.
 assert.deepEqual(withNew.cartRequestHeaders(token,'take'),{'X-Gravuru-Cart-Handoff':token,'X-Gravuru-Cart-Preview':'hosted','X-Gravuru-Cart-Image':'server','X-Gravuru-Cart-Take':'1','Content-Type':'application/json'});
 const withPreTake=await import(pair(t,NEW_EMBED,PRE_TAKE_CLIENT,'shop-embed.mjs'));
 assert.deepEqual(withPreTake.cartRequestHeaders(token,'data'),{'X-Gravuru-Cart-Handoff':token,'X-Gravuru-Cart-Preview':'hosted','X-Gravuru-Cart-Image':'server'});
 assert.deepEqual([withOld.CART_TAKE,withLive.CART_TAKE,withPreTake.CART_TAKE,withNew.CART_TAKE],[false,false,false,true],'ältere Clients bleiben bei data, dann claim');
 assert.ok(fs.readFileSync(NEW_EMBED,'utf8').includes("import * as themeCart from './theme-cart-client.mjs'"),'namespace import: missing exports never break module linking');
});

// Eigenständige Übergabeseite: läuft beim Laden los; kleine DOM-/Browser-Nachbildung.
async function runStandalonePage(t,page,client,server={}){
 const s=shop(server),elements={},el=id=>elements[id]??={id,hidden:true,disabled:false,textContent:'',src:'',href:'',dataset:id==='[data-proxy-path]'?{proxyPath:'/apps/konfigurator'}:{},addEventListener(){}};
 const saved={document:globalThis.document,location:globalThis.location,window:globalThis.window,history:globalThis.history,fetch:globalThis.fetch};
 let assigned=null;
 Object.assign(globalThis,{document:{querySelector:sel=>el(sel)},location:{hash:'#handoff='+token,hostname:shopDomain,assign:url=>{assigned=url;}},window:{},history:{back(){}},fetch:s.fetchImpl});
 t.after(()=>{for(const [k,v]of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}});
 await import(pair(t,page,client,'theme-cart-ui.mjs'));
 for(let i=0;i<200&&assigned===null;i++)await new Promise(r=>setTimeout(r,5));
 return {s,assigned,status:elements['#status']?.textContent,image:elements['#preview'],details:elements['#details']?.textContent};
}

test('#252 standalone handoff page: new page with old cached client loads and uses the PNG path',async t=>{
 const r=await runStandalonePage(t,NEW_UI,OLD_CLIENT);
 assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.adds,['png']);
 assert.equal(r.s.log.dataHeaders[0]['X-Gravuru-Cart-Preview'],undefined);assert.match(r.image.src,/^data:image\/png;base64,iVBORw0KGgo/);
});

test('#252 standalone handoff page: new page with new client uses the small JSON handoff',async t=>{
 const r=await runStandalonePage(t,NEW_UI,NEW_CLIENT);
 assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.adds,['json']);
 assert.equal(r.s.log.dataHeaders[0]['X-Gravuru-Cart-Preview'],'hosted');assert.equal(r.image.src,hostedUrl);assert.equal(r.image.hidden,false);
 // #265 Stufe A, Teil 4: Dieser Shop ist ein älterer Server (nur beim Zurückrollen). Er kennt das Kennzeichen nicht und
 // bestätigt nur; die neuen Module holen die Daten danach mit data und legen genau einmal ein.
 assert.deepEqual(r.s.log.order,['cart','claim','data','add','cart']);assert.equal(r.s.log.takes.length,1);assert.equal(r.s.log.dataHeaders.length,1);assert.equal(r.s.cart.items.length,1);
});

// #265 Stufe A, Teil 4 („take“): Daten und Bestätigung in EINEM Proxy-Abruf – nur wenn Seite UND geladener Client es können.
const takeHeaders={'X-Gravuru-Cart-Handoff':token,'X-Gravuru-Cart-Preview':'hosted','X-Gravuru-Cart-Image':'server','X-Gravuru-Cart-Take':'1','Content-Type':'application/json'};
test('#265 standalone handoff page: new page, new client, new server – one proxy call, no data call',async t=>{
 const r=await runStandalonePage(t,NEW_UI,NEW_CLIENT,{take:'new'});
 assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.order,['cart','claim','add','cart'],'erst der eigene Warenkorb, dann genau ein Proxy-Abruf');
 assert.deepEqual(r.s.log.takes,[{headers:takeHeaders,body:{lines:[]}}]);assert.equal(r.s.log.dataHeaders.length,0);assert.deepEqual(r.s.log.adds,['json']);
 // Die Seite zeigt die Gestaltung aus den Daten des einen Abrufs.
 assert.equal(r.image.src,hostedUrl);assert.equal(r.image.hidden,false);assert.match(r.details,/Leuchtturm/);
});
test('#265 standalone handoff page: a server with checkout image at Shopify answers take:false – data, then claim as before',async t=>{
 const r=await runStandalonePage(t,NEW_UI,NEW_CLIENT,{take:'images'});
 assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.order,['cart','claim','data','cart','claim','add','cart']);
 assert.equal(r.s.log.takes.length,1,'der zweite claim ist der bisherige ohne Kennzeichen und Body');assert.deepEqual(r.s.log.adds,['json']);assert.equal(r.image.src,hostedUrl);
});
test('#265 standalone handoff page: new page with a cached client before take keeps data, then claim – also against the new server',async t=>{
 for(const [client,image] of [[PRE_TAKE_CLIENT,'server'],[LIVE_CLIENT,undefined]])for(const take of ['new',undefined]){
  const r=await runStandalonePage(t,NEW_UI,client,{take});
  assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.order,['data','cart','claim','add','cart']);assert.equal(r.s.log.takes.length,0,'kein Kennzeichen, keine Zeilenliste');
  assert.equal(r.s.log.dataHeaders[0]['X-Gravuru-Cart-Preview'],'hosted');assert.equal(r.s.log.dataHeaders[0]['X-Gravuru-Cart-Image'],image);assert.deepEqual(r.s.log.adds,['json']);
 }
});
test('#265 standalone handoff page: old cached page with new client against the new server stays on data, then claim',async t=>{
 const r=await runStandalonePage(t,OLD_UI,NEW_CLIENT,{take:'new'});
 assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.order,['data','cart','claim','add','cart']);assert.equal(r.s.log.takes.length,0);assert.deepEqual(r.s.log.adds,['png']);
});

// Produktseite (shop-embed.mjs): Einbettung installieren, Konfigurator-Fenster öffnen und die Übergabemeldung des Editors
// zustellen. Kleine DOM-Nachbildung; die Abrufe laufen gegen denselben synthetischen Shop.
async function runEmbedHandoff(t,client,{server={},s=shop(server),hostname=shopDomain}={}){
 const posted=[],node=()=>{const n={hidden:false,style:{},dataset:{},text:'',classList:{add(){},remove(){},contains:()=>false},contentWindow:{postMessage:m=>posted.push(m)},setAttribute(){},removeAttribute(){},getAttribute:()=>null,hasAttribute:()=>false,toggleAttribute(){},append(){},remove(){},replaceChildren(...c){n.text=c.map(x=>x.text??'').join('');},addEventListener(){},focus(){}};return n;};
 let onMessage=null,assigned=null,frame=null;
 const names=['document','location','window','fetch','setTimeout','GRAVURU_SHOP_EMBED_NO_AUTO'],saved=names.map(k=>[k,globalThis[k]]),realTimeout=globalThis.setTimeout;
 const restore=()=>{for(const [k,v]of saved){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}};
 Object.assign(globalThis,{GRAVURU_SHOP_EMBED_NO_AUTO:true,
  document:{createElement:tag=>{const n=node();if(tag==='iframe')frame=n;return n;},createTextNode:text=>({text}),head:node(),body:node(),documentElement:node(),activeElement:null,querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}},
  window:{addEventListener:(type,fn)=>{if(type==='message')onMessage=fn;}},location:{pathname:'/products/schild',hostname,assign:url=>{assigned=url;}},fetch:s.fetchImpl,
  // Wächter und Hinweis-Zeitgeber (15 s) dürfen den Testprozess nicht offen halten.
  setTimeout:(...a)=>{const h=realTimeout(...a);h.unref?.();return h;}});
 try{
  const embed=await import(pair(t,NEW_EMBED,client,'shop-embed.mjs')),api=embed.install({root:'/'});
  api.open('https://app.example/konfigurator/shop/#s=x');assert.ok(frame&&onMessage);
  onMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-handoff',token}});
  const failed=()=>posted.find(m=>m?.type==='gravuru-shop-handoff-result');
  for(let i=0;i<400&&assigned===null&&!failed();i++)await new Promise(r=>realTimeout(r,5));
  return {s,assigned,failed:failed()};
 }finally{restore();}
}
test('#265 product page (shop-embed): new modules against the new server need one proxy call; a second click only verifies',async t=>{
 const r=await runEmbedHandoff(t,NEW_CLIENT,{server:{take:'new'}});
 assert.equal(r.assigned,'/cart',r.failed?.message);assert.deepEqual(r.s.log.order,['cart','claim','add','cart']);
 assert.deepEqual(r.s.log.takes,[{headers:takeHeaders,body:{lines:[]}}]);assert.equal(r.s.log.dataHeaders.length,0);assert.deepEqual(r.s.log.adds,['json']);
 // Erneute Übergabe desselben Angebots (neuer Seitenaufruf, Zeile liegt im Warenkorb): gemeldet, nicht bestätigt, nicht eingelegt.
 const again=await runEmbedHandoff(t,NEW_CLIENT,{s:r.s});
 assert.equal(again.assigned,'/cart',again.failed?.message);assert.deepEqual(r.s.log.adds,['json']);assert.equal(r.s.cart.items.length,1);
 assert.deepEqual(r.s.log.takes[1].body,{lines:[{config:'konfig_11111111-1111-4111-8111-111111111111',rev:'1',offer:'1'.repeat(64)}]});
});
test('#265 product page (shop-embed): new modules with the reply of an older server, and with take:false',async t=>{
 const old=await runEmbedHandoff(t,NEW_CLIENT);
 assert.equal(old.assigned,'/cart',old.failed?.message);assert.deepEqual(old.s.log.order,['cart','claim','data','add','cart']);assert.deepEqual(old.s.log.adds,['json']);
 assert.deepEqual(old.s.log.dataHeaders,[{'X-Gravuru-Cart-Handoff':token,'X-Gravuru-Cart-Preview':'hosted','X-Gravuru-Cart-Image':'server'}]);
 // Zweiter Versuch gegen den älteren Server: Er lehnt den zweiten claim ab; es wird nichts doppelt angelegt.
 const again=await runEmbedHandoff(t,NEW_CLIENT,{s:old.s});
 assert.equal(again.assigned,null);assert.equal(again.failed.ok,false);assert.match(again.failed.message,/bereits begonnen/);assert.deepEqual(old.s.log.adds,['json']);assert.equal(old.s.cart.items.length,1);
 const images=await runEmbedHandoff(t,NEW_CLIENT,{server:{take:'images'}});
 assert.equal(images.assigned,'/cart',images.failed?.message);assert.deepEqual(images.s.log.order,['cart','claim','data','cart','claim','add','cart']);assert.equal(images.s.log.takes.length,1);assert.deepEqual(images.s.log.adds,['json']);
});
test('#265 product page (shop-embed): a cached client before take stays on data, then claim; the shop check still runs before the cart write',async t=>{
 for(const client of [PRE_TAKE_CLIENT,LIVE_CLIENT]){
  const r=await runEmbedHandoff(t,client,{server:{take:'new'}});
  assert.equal(r.assigned,'/cart',r.failed?.message);assert.deepEqual(r.s.log.order,['data','cart','claim','add','cart']);assert.equal(r.s.log.takes.length,0);assert.deepEqual(r.s.log.adds,['json']);
 }
 for(const client of [NEW_CLIENT,PRE_TAKE_CLIENT]){
  const r=await runEmbedHandoff(t,client,{server:{take:'new'},hostname:'anderer-shop.example'});
  assert.equal(r.assigned,null);assert.equal(r.failed.message,'Diese Übergabe gehört zu einem anderen Shop.');assert.deepEqual(r.s.log.adds,[]);assert.equal(r.s.cart.items.length,0);
 }
});

test('#252 standalone handoff page: old cached page with new client still fills the cart via PNG',async t=>{
 const r=await runStandalonePage(t,OLD_UI,NEW_CLIENT);
 assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.adds,['png']);assert.equal(r.s.log.dataHeaders[0]['X-Gravuru-Cart-Preview'],undefined);
});

// ENTSCHEIDUNGEN 3.52/3.53 (Chris 21.11.2026): Beim Einlegen geht nur Text an Shopify; die Zeile nennt das Bild am eigenen Server.
const serverImage='https://app.example/gestaltung/acryl/offer_11111111-1111-4111-8111-111111111111/'+'e'.repeat(64)+'.png';
function serverOnlyPayload({preview=false}={}){
 const p=serverPayload({hosted:!preview});delete p.properties._gravuru_checkout_image;p.properties._gravuru_bild=serverImage;return p;
}
// Synthetischer Shop für den neuen Weg: /cart/add.js bekommt JSON ohne _Entwurf und ohne Shopify-Bild.
function textOnlyShop(){
 const cart={currency:'EUR',items:[]},log={adds:[],claims:0};
 const fetchImpl=async(url,o={})=>{
  url=String(url);
  if(url.endsWith('/cart.js'))return Response.json(structuredClone(cart));
  if(url.endsWith('/cart/add.js')){
   let id,quantity,properties;
   if(o.body instanceof FormData){
    id=Number(o.body.get('items[0][id]'));quantity=Number(o.body.get('items[0][quantity]'));properties={};
    for(const [k,v]of o.body.entries()){const m=k.match(/^items\[0\]\[properties\]\[(.+)\]$/);if(m)properties[m[1]]=typeof v==='string'?v:'https://cdn.shopify.com/s/files/1/uploads/design.png';}
    log.adds.push('png');
   }else{
    assert.equal(o.headers['Content-Type'],'application/json');({id,quantity,properties}=JSON.parse(o.body).items[0]);
    assert.ok(!Object.hasOwn(properties,'_Entwurf'));assert.ok(!Object.hasOwn(properties,'_gravuru_checkout_image'));assert.equal(properties._gravuru_bild,serverImage);
    assert.ok(!o.body.includes('iVBORw0KGgo'));assert.ok(!o.body.includes('cdn.shopify.com'));log.adds.push('text');
   }
   const line={key:id+':k',variant_id:id,product_id:1,quantity,original_price:1999,original_line_price:1999*quantity,final_line_price:1999*quantity,properties};
   cart.items.push(line);return Response.json({items:[line]});
  }
  assert.fail('unerwartete Anfrage '+url);
 };
 return {cart,log,fetchImpl};
}

test('3.52 neuer Client: ohne Bild bei Shopify geht nur Text an den Warenkorb, und die Rücklese-Prüfung besteht',async()=>{
 const neu=await import(NEW_CLIENT.href+'?server');
 assert.equal(neu.serverPreview(serverOnlyPayload()),serverImage);
 const s=textOnlyShop(),client=neu.createThemeCartClient({fetchImpl:s.fetchImpl,root:'/',claim:async()=>{s.log.claims++;}});
 // Auch ein mitgegebenes Warenkorbbild aus dem Editor wird nicht übertragen.
 const result=await client.submit(serverOnlyPayload(),{image:new Blob([Buffer.from(png,'base64')],{type:'image/png'})});
 assert.equal(result.cartUrl,'/cart');assert.deepEqual(s.log.adds,['text']);assert.equal(s.log.claims,1);assert.equal(s.cart.items.length,1);
 assert.equal(s.cart.items[0].properties._Entwurf,undefined);
 // Eine Zeile, die doch ein Bild bei Shopify trägt, gilt nicht als bestätigt.
 const cart={currency:'EUR',items:[{...s.cart.items[0],properties:{...s.cart.items[0].properties,_Entwurf:'https://cdn.shopify.com/s/files/1/uploads/x.png'}}]};
 assert.throws(()=>neu.verifyThemeCartLine(cart,serverOnlyPayload()),/stimmen nicht überein/);
 // Nur die Bildadresse des eigenen Servers in der festen Form zählt.
 for(const bad of ['https://app.example/gestaltung/x.png','http://app.example/gestaltung/acryl/offer_11111111-1111-4111-8111-111111111111/'+'e'.repeat(64)+'.png',serverImage+'?x=1',serverImage.replace('offer_','proof_')]){
  const p=serverOnlyPayload();p.properties._gravuru_bild=bad;assert.throws(()=>neu.validateThemeCartPayload(p),/Gestaltungsvorschau fehlt/);
 }
});

// #265 Stufe B, Lieferung 3 (ENTSCHEIDUNGEN 3.53/3.57): Die Übergabe trägt zusätzlich `_gravuru_fertigung` (Bestellansicht der
// Werkstatt im Shopify-Admin). Jeder Client-Stand, der in offenen Tabs noch laufen kann, prüft Eigenschaften allgemein (Name,
// Länge, Text) und legt sie unverändert an die Zeile; die Rücklese-Prüfung vergleicht sie wie jede andere Eigenschaft.
test('#265 Lieferung 3: jeder Client-Stand nimmt die zusätzliche Eigenschaft an und legt sie unverändert an die Warenkorbzeile',async()=>{
 const link='https://'+shopDomain+'/admin/apps/synthetic-client/werkstatt/bestellungen/?config=konfig_11111111-1111-4111-8111-111111111111&rev=1';
 for(const [url,hosted] of [[OLD_CLIENT,false],[LIVE_CLIENT,false],[LIVE_CLIENT,true],[PRE_TAKE_CLIENT,false],[PRE_TAKE_CLIENT,true],[NEW_CLIENT,false],[NEW_CLIENT,true]]){
  const client=await import(url.href+'?fertigung'),p=serverPayload({hosted});p.properties._gravuru_fertigung=link;
  client.validateThemeCartPayload(p);
  const s=shop(),c=client.createThemeCartClient({fetchImpl:s.fetchImpl,root:'/',claim:async()=>{s.log.claims++;}});
  await c.submit(p);assert.equal(s.cart.items.length,1,url.pathname);assert.equal(s.cart.items[0].properties._gravuru_fertigung,link,url.pathname);assert.equal(s.log.claims,1);
  // Eine an der Zeile veränderte Adresse gilt nicht als bestätigt.
  const changed={currency:'EUR',items:[{...s.cart.items[0],properties:{...s.cart.items[0].properties,_gravuru_fertigung:link+'0'}}]};
  assert.throws(()=>client.verifyThemeCartLine(changed,p),/stimmen nicht überein/,url.pathname);
 }
});

test('3.52 Tab mit dem Client des Stands 9bfc281b: er bekommt weiter das Vorschaubild und legt wie bisher ein',async()=>{
 const live=await import(LIVE_CLIENT.href+'?direct');
 assert.equal(typeof live.hostedPreview,'function');assert.equal(live.serverPreview,undefined,'Fixture ist der Client vor 3.52');
 // Ohne Vorschaubild und ohne Shopify-Bild könnte dieser Client nicht einlegen – deshalb lässt der Server es ihm (kein Kennzeichen).
 assert.throws(()=>live.validateThemeCartPayload(serverOnlyPayload()),/Gestaltungsvorschau fehlt/);
 const s=textOnlyShop(),client=live.createThemeCartClient({fetchImpl:s.fetchImpl,root:'/',claim:async()=>{s.log.claims++;}});
 await client.submit(serverOnlyPayload({preview:true}));assert.deepEqual(s.log.adds,['png']);assert.equal(s.cart.items.length,1);
});
