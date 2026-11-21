import * as themeCart from './theme-cart-client.mjs';
// #252: Namespace-Import, damit diese Seite auch mit einem noch zwischengespeicherten älteren Client (ohne hostedPreview) lädt.
const {createThemeCartClient}=themeCart,hostedPreview=typeof themeCart.hostedPreview==='function'?themeCart.hostedPreview:null;
const serverCartImage=typeof themeCart.serverPreview==='function';
const status=document.querySelector('#status'),button=document.querySelector('#check'),back=document.querySelector('#back');
const proxy=document.querySelector('[data-proxy-path]').dataset.proxyPath,token=new URLSearchParams(location.hash.slice(1)).get('handoff');
const root=window.Shopify?.routes?.root||'/';
document.querySelector('#cart').href=root+'cart';
back.addEventListener('click',()=>history.back());
let busy=false,payload,client;
// #265 Stufe A, Teil 4: Der geladene Client holt Warenkorbdaten und Bestätigung in EINEM Proxy-Abruf („take“ = claim mit
// Zeilenliste und den Kennzeichen des data-Abrufs). Ein älterer zwischengespeicherter Client bleibt bei data, dann claim.
const cartTake=typeof themeCart.themeCartLines==='function';
async function request(path,method='GET',lines){
 const take=lines!==undefined,data=path==='data'||take;
 const r=await fetch(proxy+'/cart/'+path,{method,credentials:'same-origin',cache:'no-store',headers:{'X-Gravuru-Cart-Handoff':token,...(data&&hostedPreview?{'X-Gravuru-Cart-Preview':'hosted'}:{}),...(data&&serverCartImage?{'X-Gravuru-Cart-Image':'server'}:{}),...(take?{'X-Gravuru-Cart-Take':'1','Content-Type':'application/json'}:{})},...(take?{body:JSON.stringify({lines})}:{})});
 // Status und Kennung des Fehlers gehen mit: Der Client erkennt daran einen nicht angenommenen „take“-Abruf (takeNotAccepted).
 const reply=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(reply.error?.message||'Die Warenkorbübergabe konnte nicht geladen werden.'),{status:r.status,code:reply.error?.code});return reply;
}
// Shop prüfen und die Gestaltung zeigen, sobald die Warenkorbdaten vorliegen (vor dem Einlegen).
function show(payload){
 if(location.hostname!==payload.shopDomain)throw Error('Diese Übergabe gehört zu einem anderen Shop.');
 const image=document.querySelector('#preview'),hosted=hostedPreview?.(payload)??(serverCartImage?themeCart.serverPreview(payload):null);
 if(payload.preview?.base64||hosted){image.src=payload.preview?.base64?'data:image/png;base64,'+payload.preview.base64:hosted;image.hidden=false;}
 document.querySelector('#details').textContent=[payload.properties.Design,payload.properties.Format,...Object.entries(payload.properties).filter(([k])=>k.startsWith('Gravurtext')).map(([,v])=>v)].filter(Boolean).join('\n');
}
async function run(){
 if(busy)return;busy=true;button.disabled=true;
 try{
  if(!/^[a-f0-9]{64}$/.test(token||''))throw Error('Bitte starte die Warenkorbübergabe im Konfigurator.');
  if(!cartTake)show(payload??=await request('data'));
  client??=createThemeCartClient({root,claim:()=>request('claim','POST'),...(cartTake?{take:lines=>request('claim','POST',lines),load:()=>request('data'),onPayload:show}:{}),onProgress:text=>{status.textContent=text;}});
  const submit=()=>cartTake?client.transfer():client.submit(payload),result=navigator.locks?await navigator.locks.request('gravuru-theme-cart',submit):await submit();
  status.textContent='Deine Gestaltung und Vorschau sind im Warenkorb bestätigt.';location.assign(result.cartUrl);
 }catch(error){status.textContent=error.message||'Die Übertragung konnte nicht bestätigt werden. Bitte den Warenkorb prüfen.';button.hidden=false;}
 finally{busy=false;button.disabled=false;}
}
button.addEventListener('click',run);
run();
