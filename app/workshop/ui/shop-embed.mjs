// Produktseite im Shop (Shop-Origin, geladen über den App-Proxy): „Jetzt personalisieren“ öffnet den
// Konfigurator als Fenster über der Produktseite statt auf eine andere Seite zu springen. „In den Warenkorb“
// meldet nur die einmalige Übergabekennung herauf; diese Seite holt die geprüften Werte über den App-Proxy und
// legt sie wie die bisherige Zwischenseite (theme-cart-ui.mjs) in den normalen Warenkorb. Ohne JavaScript
// oder bei Strg-/Mittelklick bleibt der normale Link (ganze Seite) unverändert.
import {createThemeCartClient,cartImage} from './theme-cart-client.mjs';

const EDITOR_ORIGIN='__EDITOR_ORIGIN__',PROXY='__PROXY_PATH__';
const TOKEN=/^[a-f0-9]{64}$/;
const STYLE=`.gv-embed{position:fixed;inset:0;z-index:2147483000;background:#fff;display:flex;flex-direction:column}
.gv-embed[hidden]{display:none}
.gv-embed.gv-embed--preload{visibility:hidden;pointer-events:none}
.gv-embed__bar{display:flex;justify-content:flex-end;padding:6px 8px;border-bottom:1px solid #dce5e1;background:#fff}
.gv-embed__close{font:inherit;font-size:15px;min-height:40px;padding:6px 14px;border:1px solid #c9d3cf;border-radius:8px;background:#fff;color:#243238;cursor:pointer}
.gv-embed__frame{flex:1;width:100%;border:0;display:block}
.gv-embed__status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.94);padding:24px;text-align:center}
.gv-embed__status[hidden]{display:none}
.gv-embed__box{max-width:420px;font-size:17px;line-height:1.5;color:#243238}
.gv-embed__box button,.gv-embed__box a{display:inline-block;margin:12px 6px 0;min-height:44px;padding:10px 16px;border-radius:8px;font:inherit;font-size:15px;cursor:pointer;text-decoration:none}
.gv-embed__box button{border:1px solid #c9d3cf;background:#fff;color:#243238}
.gv-embed__box a{background:#5fa372;color:#fff}
html.gv-embed-open,html.gv-embed-open body{overflow:hidden}`;

export function startUrl(link){
 const url=new URL(link.href,location.href);
 if(url.origin!==location.origin||url.pathname!==PROXY+'/start')return null;
 url.searchParams.set('embed','1');
 return url.href;
}

// Global (Chris 27.10.2026: „universal, auch wenn ich ein neues Produkt anlege“): Ein Theme-Baustein im
// Fußbereich schreibt auf jeder Produktseite mit Konfigurator-ID die Produktdaten als JSON (#gravuru-konfi).
// Fehlt auf der Vorlage der eigene Knopf, setzt diese Datei ihn an die Stelle der Kaufknöpfe; die normalen
// Kaufknöpfe dieses Produkts werden ausgeblendet (kein Kauf ohne Gestaltung).
const ID=/^\d{1,20}$/;
export function pageConfig(doc=globalThis.document){
 const node=doc?.getElementById?.('gravuru-konfi');if(!node)return null;
 let raw;try{raw=JSON.parse(node.textContent||'');}catch{return null;}
 const productId=String(raw?.productId??''),variants=Array.isArray(raw?.variants)?[...new Set(raw.variants.map(String))].filter(v=>ID.test(v)):[];
 if(!ID.test(productId)||!variants.length||variants.length>250)return null;
 const variantId=variants.includes(String(raw.variantId))?String(raw.variantId):variants[0];
 const back=typeof raw.back==='string'&&/^\/(?!\/)[^\s]{0,300}$/.test(raw.back)?raw.back:'/';
 return {productId,variantId,variants,back};
}
export function startHref(config,variantId=config.variantId){
 const params=new URLSearchParams({product:config.productId,variant:config.variants.includes(String(variantId))?String(variantId):config.variantId,back:config.back});
 return PROXY+'/start?'+params;
}
// Kaufformulare genau dieses Produkts (auch die mitlaufende Kaufleiste), nicht die anderer Produkte auf der Seite.
export function productForms(config,doc=globalThis.document){
 return [...doc.querySelectorAll('form[action*="/cart/add"]')].filter(form=>config.variants.includes(String(form.querySelector('[name="id"]')?.value||'')));
}
const currentVariant=(config,doc)=>productForms(config,doc).map(form=>String(form.querySelector('[name="id"]')?.value||'')).find(v=>config.variants.includes(v))||config.variantId;
export function prepareProductPage(config,doc=globalThis.document){
 const forms=productForms(config,doc);
 for(const form of forms)for(const node of form.querySelectorAll('[type="submit"],[name="add"],.shopify-payment-button'))node.setAttribute('data-gravuru-hidden-buy','');
 // Menge wählt der Kunde im Konfigurator; das Mengenfeld des Themes (Block oder Feld im Formular) ausblenden.
 if(forms.length){
  for(const node of doc.querySelectorAll('.product__block--quantity_selector'))node.setAttribute('data-gravuru-hidden-buy','');
  const ids=new Set(forms.map(form=>form.id).filter(Boolean));
  const fields=[...forms.flatMap(form=>[...form.querySelectorAll('[name="quantity"]')]),...[...doc.querySelectorAll('[name="quantity"][form]')].filter(q=>ids.has(q.getAttribute('form')))];
  for(const q of fields)(q.closest?.('.product__block,.product-form__quantity,quantity-input')||q).setAttribute('data-gravuru-hidden-buy','');
 }
 if(doc.querySelector('[data-gravuru-personalisieren]')||!forms.length)return null;
 const box=doc.createElement('div');box.className='gravuru-personalisieren';box.setAttribute('data-gravuru-personalisieren','');box.style.margin='12px 0 16px';
 const link=doc.createElement('a');link.className='btn btn--primary btn--gravuru-primary';link.setAttribute('data-gravuru-start','');link.rel='nofollow';link.textContent='Jetzt personalisieren';link.href=startHref(config,currentVariant(config,doc));
 const note=doc.createElement('p');note.style.cssText='margin:8px 0 0;font-size:.9em;opacity:.8;text-align:center';note.textContent='Design wählen, Text gestalten, eigenes Foto hochladen.';
 // Hauptformular: hat einen Kaufknopf (nicht das Ratenzahlungs-Formular im Preisblock) und liegt nicht in der Kaufleiste.
 const buy=form=>!!form.querySelector('[type="submit"],[name="add"]'),sticky=form=>!!form.closest?.('[class*="sticky"],sticky-atc-bar');
 const main=forms.find(form=>buy(form)&&!sticky(form))||forms.find(buy)||forms[0];
 box.append(link,note);main.after(box);return box;
}

// Nur Nachrichten genau dieses Konfigurator-Fensters vom Konfigurator-Host werden angenommen.
export function acceptedMessage(event,frame){
 if(!frame||event.origin!==EDITOR_ORIGIN||event.source!==frame.contentWindow)return null;
 const data=event.data;
 if(data?.type==='gravuru-shop-close')return {type:'close'};
 // cartImage: Platte mit Material, wie im Überblick des Konfigurators (nur Anzeige, sonst die Gravurvorschau).
 if(data?.type==='gravuru-shop-handoff'&&TOKEN.test(data.token||''))return {type:'handoff',token:data.token,image:cartImage(data.cartImage)};
 return null;
}

export function install({root=window.Shopify?.routes?.root||'/'}={}){
 if(window.__gravuruShopEmbed)return window.__gravuruShopEmbed;
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const shell=document.createElement('div');shell.className='gv-embed';shell.hidden=true;shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','Produkt personalisieren');
 const bar=document.createElement('div');bar.className='gv-embed__bar';
 const close=document.createElement('button');close.type='button';close.className='gv-embed__close';close.textContent='✕ Schließen';bar.append(close);
 const status=document.createElement('div');status.className='gv-embed__status';status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const box=document.createElement('div');box.className='gv-embed__box';status.append(box);
 shell.append(bar,status);document.body.append(shell);
 let frame=null,frameUrl=null,busy=false,lastFocus=null;
 const say=(text,{error=false}={})=>{box.replaceChildren(document.createTextNode(text));status.hidden=false;
  if(error){const again=document.createElement('button');again.type='button';again.textContent='Zurück zur Gestaltung';again.addEventListener('click',()=>{status.hidden=true;});
   const cart=document.createElement('a');cart.href=root+'cart';cart.textContent='Warenkorb öffnen';box.append(document.createElement('br'),again,cart);}};
 function load(url){
  frame?.remove();frame=document.createElement('iframe');frame.className='gv-embed__frame';frame.title='Produkt personalisieren';frame.setAttribute('allow','clipboard-write');
  frame.src=url;frameUrl=url;shell.append(frame);
 }
 // Vorgeladen: unsichtbar, aber in voller Größe aufgebaut (sonst misst der Editor 0 px); nicht bedienbar, nicht fokussierbar.
 function preload(url){
  if(frame||!url)return;
  shell.classList.add('gv-embed--preload');shell.setAttribute('aria-hidden','true');shell.hidden=false;load(url);
 }
 function open(url){
  lastFocus=document.activeElement;status.hidden=true;
  if(!frame||frameUrl!==url)load(url);
  shell.classList.remove('gv-embed--preload');shell.removeAttribute('aria-hidden');shell.hidden=false;
  document.documentElement.classList.add('gv-embed-open');close.focus();
 }
 // Schließen behält das geladene Fenster: erneutes Öffnen ist sofort da (gleicher Stand).
 function hide(){if(busy)return;shell.hidden=true;status.hidden=true;document.documentElement.classList.remove('gv-embed-open');lastFocus?.focus?.();}
 close.addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!shell.hidden)hide();});
 async function request(token,path,method='GET'){
  const r=await fetch(PROXY+'/cart/'+path,{method,credentials:'same-origin',cache:'no-store',headers:{'X-Gravuru-Cart-Handoff':token}});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error?.message||'Die Warenkorbübergabe konnte nicht geladen werden.');return data;
 }
 async function handoff(token,source,image){
  if(busy)return;busy=true;say('Deine Gestaltung wird in den Warenkorb gelegt …');
  try{
   const payload=await request(token,'data');
   if(location.hostname!==payload.shopDomain)throw Error('Diese Übergabe gehört zu einem anderen Shop.');
   const client=createThemeCartClient({root,claim:()=>request(token,'claim','POST'),onProgress:text=>say(text)});
   const submit=()=>client.submit(payload,{image}),result=navigator.locks?await navigator.locks.request('gravuru-theme-cart',submit):await submit();
   say('Im Warenkorb – einen Moment …');location.assign(result.cartUrl);
  }catch(error){
   const message=error?.message||'Die Übertragung konnte nicht bestätigt werden. Bitte den Warenkorb prüfen.';
   busy=false;say(message,{error:true});
   // Der Editor gibt seinen Knopf wieder frei und zeigt dieselbe Meldung.
   source?.postMessage({type:'gravuru-shop-handoff-result',token,ok:false,message},EDITOR_ORIGIN);
  }
 }
 window.addEventListener('message',event=>{
  const message=acceptedMessage(event,frame);if(!message)return;
  if(message.type==='close')hide();
  else handoff(message.token,event.source,message.image);
 });
 const config=pageConfig();
 if(config){
  prepareProductPage(config);
  // Varianten- und Abschnittswechsel des Themes bauen Kaufknöpfe neu auf: erneut ausblenden.
  const style=document.createElement('style');style.textContent='[data-gravuru-hidden-buy]{display:none!important}';document.head.append(style);
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;prepareProductPage(config);});}).observe(document.body,{childList:true,subtree:true});
 }
 // Vorladen ist aus (Messung 27.10.2026, Chrome): ein unsichtbares Fenster lädt der Browser stark gebremst –
 // nach 10 s war noch nicht einmal das Modell da, nach dem Klick dauerte es so lange wie ohne Vorladen. Es kostete
 // nur Daten. Schneller wird das Öffnen über ein schlankeres Modell. preload() bleibt für spätere Versuche.
 document.addEventListener('click',event=>{
  const link=event.target?.closest?.('[data-gravuru-personalisieren] a[data-gravuru-start]');
  if(!link||event.defaultPrevented)return;
  // Gerade gewählte Variante übernehmen (auch für Strg-/Mittelklick, die normal weiterlaufen).
  if(config)link.href=startHref(config,currentVariant(config,document));
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const url=startUrl(link);if(!url)return;
  event.preventDefault();open(url);
 });
 return (window.__gravuruShopEmbed=Object.freeze({open,hide,preload}));
}

if(typeof window!=='undefined'&&typeof document!=='undefined'&&!globalThis.GRAVURU_SHOP_EMBED_NO_AUTO){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
}
