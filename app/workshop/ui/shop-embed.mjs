// Produktseite im Shop (Shop-Origin, geladen über den App-Proxy): „Jetzt personalisieren“ öffnet den
// Konfigurator als Fenster über der Produktseite statt auf eine andere Seite zu springen. „In den Warenkorb“
// meldet nur die einmalige Übergabekennung herauf; diese Seite holt die geprüften Werte über den App-Proxy und
// legt sie wie die bisherige Zwischenseite (theme-cart-ui.mjs) in den normalen Warenkorb. Ohne JavaScript
// oder bei Strg-/Mittelklick bleibt der normale Link (ganze Seite) unverändert.
import {createThemeCartClient} from './theme-cart-client.mjs';

const EDITOR_ORIGIN='__EDITOR_ORIGIN__',PROXY='__PROXY_PATH__';
const TOKEN=/^[a-f0-9]{64}$/;
const STYLE=`.gv-embed{position:fixed;inset:0;z-index:2147483000;background:#fff;display:flex;flex-direction:column}
.gv-embed[hidden]{display:none}
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

// Nur Nachrichten genau dieses Konfigurator-Fensters vom Konfigurator-Host werden angenommen.
export function acceptedMessage(event,frame){
 if(!frame||event.origin!==EDITOR_ORIGIN||event.source!==frame.contentWindow)return null;
 const data=event.data;
 if(data?.type==='gravuru-shop-close')return {type:'close'};
 if(data?.type==='gravuru-shop-handoff'&&TOKEN.test(data.token||''))return {type:'handoff',token:data.token};
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
 let frame=null,busy=false,lastFocus=null;
 const say=(text,{error=false}={})=>{box.replaceChildren(document.createTextNode(text));status.hidden=false;
  if(error){const again=document.createElement('button');again.type='button';again.textContent='Zurück zur Gestaltung';again.addEventListener('click',()=>{status.hidden=true;});
   const cart=document.createElement('a');cart.href=root+'cart';cart.textContent='Warenkorb öffnen';box.append(document.createElement('br'),again,cart);}};
 function open(url){
  lastFocus=document.activeElement;status.hidden=true;
  frame?.remove();frame=document.createElement('iframe');frame.className='gv-embed__frame';frame.title='Produkt personalisieren';frame.setAttribute('allow','clipboard-write');
  frame.src=url;shell.append(frame);shell.hidden=false;document.documentElement.classList.add('gv-embed-open');close.focus();
 }
 function hide(){if(busy)return;shell.hidden=true;frame?.remove();frame=null;status.hidden=true;document.documentElement.classList.remove('gv-embed-open');lastFocus?.focus?.();}
 close.addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!shell.hidden)hide();});
 async function request(token,path,method='GET'){
  const r=await fetch(PROXY+'/cart/'+path,{method,credentials:'same-origin',cache:'no-store',headers:{'X-Gravuru-Cart-Handoff':token}});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error?.message||'Die Warenkorbübergabe konnte nicht geladen werden.');return data;
 }
 async function handoff(token,source){
  if(busy)return;busy=true;say('Deine Gestaltung wird in den Warenkorb gelegt …');
  try{
   const payload=await request(token,'data');
   if(location.hostname!==payload.shopDomain)throw Error('Diese Übergabe gehört zu einem anderen Shop.');
   const client=createThemeCartClient({root,claim:()=>request(token,'claim','POST'),onProgress:text=>say(text)});
   const submit=()=>client.submit(payload),result=navigator.locks?await navigator.locks.request('gravuru-theme-cart',submit):await submit();
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
  else handoff(message.token,event.source);
 });
 document.addEventListener('click',event=>{
  const link=event.target?.closest?.('[data-gravuru-personalisieren] a[data-gravuru-start]');
  if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const url=startUrl(link);if(!url)return;
  event.preventDefault();open(url);
 });
 return (window.__gravuruShopEmbed=Object.freeze({open,hide}));
}

if(typeof window!=='undefined'&&typeof document!=='undefined'&&!globalThis.GRAVURU_SHOP_EMBED_NO_AUTO){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
}
