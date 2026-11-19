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
function shop(){
 const cart={currency:'EUR',items:[]},log={dataHeaders:[],adds:[],claims:0};
 const fetchImpl=async(url,o={})=>{
  url=String(url);
  if(url.endsWith('/cart/data')){log.dataHeaders.push({...o.headers});return Response.json(serverPayload({hosted:o.headers?.['X-Gravuru-Cart-Preview']==='hosted'}));}
  if(url.endsWith('/cart/claim')){log.claims++;assert.equal(o.method,'POST');return Response.json({claimed:true});}
  if(url.endsWith('/cart.js'))return Response.json(structuredClone(cart));
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
   cart.items.push(line);return Response.json({items:[line]});
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
 assert.deepEqual(withNew.cartRequestHeaders(token,'data'),{'X-Gravuru-Cart-Handoff':token,'X-Gravuru-Cart-Preview':'hosted'});
 assert.deepEqual(withNew.cartRequestHeaders(token,'claim'),{'X-Gravuru-Cart-Handoff':token},'the capability belongs to /cart/data only');
 assert.ok(fs.readFileSync(NEW_EMBED,'utf8').includes("import * as themeCart from './theme-cart-client.mjs'"),'namespace import: missing exports never break module linking');
});

// Eigenständige Übergabeseite: läuft beim Laden los; kleine DOM-/Browser-Nachbildung.
async function runStandalonePage(t,page,client){
 const s=shop(),elements={},el=id=>elements[id]??={id,hidden:true,disabled:false,textContent:'',src:'',href:'',dataset:id==='[data-proxy-path]'?{proxyPath:'/apps/konfigurator'}:{},addEventListener(){}};
 const saved={document:globalThis.document,location:globalThis.location,window:globalThis.window,history:globalThis.history,fetch:globalThis.fetch};
 let assigned=null;
 Object.assign(globalThis,{document:{querySelector:sel=>el(sel)},location:{hash:'#handoff='+token,hostname:shopDomain,assign:url=>{assigned=url;}},window:{},history:{back(){}},fetch:s.fetchImpl});
 t.after(()=>{for(const [k,v]of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}});
 await import(pair(t,page,client,'theme-cart-ui.mjs'));
 for(let i=0;i<200&&assigned===null;i++)await new Promise(r=>setTimeout(r,5));
 return {s,assigned,status:elements['#status']?.textContent,image:elements['#preview']};
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
});

test('#252 standalone handoff page: old cached page with new client still fills the cart via PNG',async t=>{
 const r=await runStandalonePage(t,OLD_UI,NEW_CLIENT);
 assert.equal(r.assigned,'/cart',r.status);assert.deepEqual(r.s.log.adds,['png']);assert.equal(r.s.log.dataHeaders[0]['X-Gravuru-Cart-Preview'],undefined);
});
