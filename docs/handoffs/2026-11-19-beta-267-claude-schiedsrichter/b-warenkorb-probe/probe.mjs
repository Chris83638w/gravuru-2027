// Claude · Probe zum Warenkorb-Patch von Team B (60f05317): Was passiert, wenn die Shopify-Datei beim Klick noch nicht fertig ist?
// Aufruf: node probe.mjs <Arbeitskopie B> <Vorschau.png>
import fs from 'node:fs';import {pathToFileURL} from 'node:url';import path from 'node:path';
const [root,pngPath]=process.argv.slice(2);const mod=p=>import(pathToFileURL(path.join(root,p)).href);
const {attachRevisionPreview}=await mod('app/workshop/shop-cart-preview.mjs');
const {createThemeCartClient,validateThemeCartPayload,hostedPreview}=await mod('app/workshop/ui/theme-cart-client.mjs');
const {checkoutDesignImage}=await mod('ops/shopify/checkout-image/cart-image.mjs');
const png=fs.readFileSync(pngPath);const hex=c=>c.repeat(64);const cfg='konfig_00000000-0000-4000-8000-000000000001';
const payload=()=>({schema:'gravuru-theme-cart/v1',mode:'create',shopDomain:'gravuru-design.myshopify.com',variantId:'57471227756924',productId:'1',quantity:1,unitCents:4999,totalCents:4999,currency:'EUR',paymentConfirmed:false,productionReady:false,
  configuration:{id:cfg,rev:1},properties:{_gravuru_config:cfg,_gravuru_rev:'1',_gravuru_offer:hex('a'),_gravuru_bild:'https://app-2027.gravuru-designwerkstatt.de/gestaltung/x/'+hex('b')+'.png'},preview:{type:'image/png',base64:png.toString('base64')}});
const out={vorschauBytes:png.length};
// 1. Shopify braucht 2,2 s (wie in den Live-Protokollen), der Patch wartet nicht
{const p=payload();const t=performance.now();const r=await attachRevisionPreview({checkoutImage:()=>new Promise(res=>setTimeout(()=>res('https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+hex('c')+'.png'),2200)),source:p.properties._gravuru_bild,payload:p});
 out.shopifyNochNichtFertig={antwortNachMs:Math.round(performance.now()-t),status:r.status,hatKassenbild:'_gravuru_checkout_image' in p.properties,vorschauStatus:p.properties._gravuru_vorschau_status,bildLaeuftUeberAntwort:!!p.preview,base64Zeichen:p.preview.base64.length,gueltig:(()=>{try{validateThemeCartPayload(p);return true;}catch(e){return e.message;}})(),clientNutztShopifyDatei:!!hostedPreview(p)};
 // 2. Was schickt der unveränderte Warenkorb-Client an Shopify?
 const calls=[];const fetchImpl=async(url,o={})=>{const isForm=typeof FormData!=='undefined'&&o.body instanceof FormData;let file=null;if(isForm){const f=o.body.get('items[0][properties][_Entwurf]');file={name:f?.name,type:f?.type,bytes:f?.size};}
   calls.push({url:String(url).replace(/\?.*$/,''),method:o.method||'GET',art:isForm?'Formular mit Datei':typeof o.body==='string'?'JSON':'-',datei:file});
   if(/cart\.js/.test(url))return new Response(JSON.stringify({currency:'EUR',items:[]}),{status:200,headers:{'Content-Type':'application/json'}});
   return new Response(JSON.stringify({items:[]}),{status:200,headers:{'Content-Type':'application/json'}});};
 try{await createThemeCartClient({fetchImpl,claim:async()=>{}}).submit(p);}catch(e){out.clientEnde=String(e.message).slice(0,120);}
 out.anShopify=calls.filter(c=>/cart\/add/.test(c.url));
 // 3. Kassenbild (Cart Transform) für eine Zeile ohne registrierte Shopify-Datei
 const line=extra=>({id:'gid://shopify/CartLine/1',configuration:{value:cfg},configRevision:{value:'1'},offer:{value:hex('a')},...extra});
 out.kassenbild={ohneShopifyDatei:checkoutDesignImage(line({})),mitShopifyDatei:checkoutDesignImage(line({checkoutImage:{value:'https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+hex('c')+'.png'}}))};}
// 4. Shopify ist schon fertig: dann bleibt alles wie bisher
{const p=payload();const r=await attachRevisionPreview({checkoutImage:async()=>'https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+hex('c')+'.png',source:p.properties._gravuru_bild,payload:p});out.shopifySchonFertig={status:r.status,hatKassenbild:'_gravuru_checkout_image' in p.properties};}
// Rechenwert Handyprofil 1,6 Mbit/s herunter, 0,75 Mbit/s hinauf, 150 ms je Anfrage
out.rechnungHandyprofil={herunterS:+(out.shopifyNochNichtFertig.base64Zeichen/(1.6*1024*1024/8)).toFixed(1),hinaufS:+(png.length/(0.75*1024*1024/8)).toFixed(1)};
console.log(JSON.stringify(out,null,1));fs.writeFileSync('ergebnis.json',JSON.stringify(out,null,1));
