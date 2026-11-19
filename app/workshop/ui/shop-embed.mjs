// Produktseite im Shop (Shop-Origin, geladen über den App-Proxy): „Jetzt personalisieren“ öffnet den
// Konfigurator als Fenster über der Produktseite statt auf eine andere Seite zu springen. „In den Warenkorb“
// meldet nur die einmalige Übergabekennung herauf; diese Seite holt die geprüften Werte über den App-Proxy und
// legt sie wie die bisherige Zwischenseite (theme-cart-ui.mjs) in den normalen Warenkorb. Ohne JavaScript
// oder bei Strg-/Mittelklick bleibt der normale Link (ganze Seite) unverändert.
import * as themeCart from './theme-cart-client.mjs';
// #252 Versionswechsel: Shop-Module haben feste URLs (max-age=300); offene Tabs behalten ihre geladenen Module.
// Namespace-Import statt benannter Importe: ein älteres theme-cart-client.mjs ohne neue Exporte bricht das Laden nicht ab.
// Die kleine JSON-Übergabe (ohne PNG) wird nur angefordert, wenn der tatsächlich geladene Client sie verarbeiten kann.
const {createThemeCartClient,cartImage}=themeCart,HOSTED_CART_PREVIEW=typeof themeCart.hostedPreview==='function';
export function cartRequestHeaders(token,path){return {'X-Gravuru-Cart-Handoff':token,...(path==='data'&&HOSTED_CART_PREVIEW?{'X-Gravuru-Cart-Preview':'hosted'}:{})};}
// Same step line as the cart handoff. Retries stay on this text; no extra control.
export const CHECKOUT_WAIT_TEXT='4 von 4 · Vorschau wird für die Kasse vorbereitet …';
export async function readCartDataUntilReady(fetchData,{sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,intervalMs=1200,limitMs=14000,onWait}={}){
 const started=now();
 for(;;){
  try{return await fetchData();}
  catch(error){
   if(error?.code!=='checkout_image_pending')throw error;
   if(now()-started+intervalMs>limitMs)throw error;
   onWait?.();
   await sleep(intervalMs);
  }
 }
}

const EDITOR_ORIGIN='__EDITOR_ORIGIN__',PROXY='__PROXY_PATH__';
const TOKEN=/^[a-f0-9]{64}$/;
const STYLE=`.gv-embed{position:fixed;inset:0;z-index:2147483000;background:#fff;display:flex;flex-direction:column}
.gv-embed[hidden]{display:none}
.gv-embed.gv-embed--preload{visibility:hidden;pointer-events:none}
.gv-embed__bar[hidden]{display:none}
.gv-embed__bar{position:relative;z-index:1;display:flex;justify-content:flex-end;padding:6px 8px;border-bottom:1px solid #dce5e1;background:#fff}
.gv-embed__close{font:inherit;font-size:15px;min-height:40px;padding:6px 14px;border:1px solid #c9d3cf;border-radius:8px;background:#fff;color:#243238;cursor:pointer}
.gv-embed__frame{flex:1;width:100%;border:0;display:block}
.gv-embed__status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.94);padding:24px;text-align:center}
.gv-embed__status[hidden]{display:none}
.gv-embed__box{max-width:420px;font-size:17px;line-height:1.5;color:#243238}
.gv-embed__box[data-busy]::before{content:'';display:block;width:28px;height:28px;margin:0 auto 14px;border:3px solid #c9d3cf;border-top-color:#175b42;border-radius:50%;animation:gv-embed-spin .8s linear infinite}
@keyframes gv-embed-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.gv-embed__box[data-busy]::before{animation:none}}
.gv-embed__hint{display:block;margin-top:10px;font-size:14px;color:#55646a}
.gv-embed__box button,.gv-embed__box a{display:inline-block;margin:12px 6px 0;min-height:44px;padding:10px 16px;border-radius:8px;font:inherit;font-size:15px;cursor:pointer;text-decoration:none}
.gv-embed__box button{border:1px solid #c9d3cf;background:#fff;color:#243238}
.gv-embed__box a{background:#5fa372;color:#fff}
html.gv-embed-open,html.gv-embed-open body{overflow:hidden}`;

export function startUrl(link){
 const url=new URL(link.href,location.href);
 if(url.origin!==location.origin||url.pathname!==PROXY+'/start')return null;
 // Entwurfsvorschauen laufen auf einer temporären Shopify-Domain. Die bestehende
 // Einbettung erlaubt nur den eigenen Shop; dort den normalen Seitenlink nutzen.
 if(/(^|\.)shopifypreview\.com$/.test(url.hostname))return null;
 url.searchParams.set('embed','1');
 return url.href;
}

// Startkarte (Chris 27.10.2026: „wenn die seite geladen ist, kann der konfi bereits laden“): nach dem Laden der
// Produktseite holt sie über den App-Proxy nur die kleine Sitzungsantwort (`format=json`, kein Fenster, kein Modell).
// Beim Klick öffnet das Fenster dann direkt den Konfigurator-Host – ohne Umweg über Shopify. Fehlt sie oder ist sie
// fast abgelaufen, gilt der normale Start über den App-Proxy.
// Eine Karte gilt höchstens 30 min nach Abruf (die Sitzung läuft ab Ausstellung) und nie in den letzten 10 min;
// ein Fehlschlag wird 60 s gemerkt (kein Abrufschwall beim Überfahren des Knopfs).
export function createStartTickets({fetchImpl=globalThis.fetch,now=Date.now,marginMs=10*60*1000,maxAgeMs=30*60*1000,retryMs=60*1000}={}){
 const tickets=new Map();
 const get=key=>{const t=tickets.get(key);return t?.url&&now()<t.until?t.url:null;};
 function load(key){
  if(!key)return Promise.resolve(null);
  const known=tickets.get(key);if(known?.pending)return known.pending;if(get(key))return Promise.resolve(get(key));if(known&&now()<known.failedUntil)return Promise.resolve(null);
  if(tickets.size>=16)tickets.clear();
  const entry={url:null,until:0,failedUntil:0,pending:null},fetchedAt=now();tickets.set(key,entry);
  const request=new URL(key);request.searchParams.set('format','json');
  entry.pending=Promise.resolve().then(()=>fetchImpl(request.href,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}})).then(async response=>{
   const data=response.ok?await response.json():null,until=Math.min(Date.parse(data?.expiresAt)-marginMs,fetchedAt+maxAgeMs);
   if(typeof data?.url!=='string'||!data.url.startsWith(EDITOR_ORIGIN+'/')||!(until>now()))throw Error('Startkarte ungültig');
   entry.url=data.url;entry.until=until;entry.pending=null;
   try{const warm=new URL(data.warm?.url);if(warm.origin===EDITOR_ORIGIN&&!warm.username&&!warm.password&&/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/warm\/$/.test(warm.pathname)&&!warm.search&&!warm.hash&&JSON.stringify(data.warm?.manifest).length<4096)entry.warm={url:warm.href,manifest:data.warm.manifest};}catch{}
   return entry.url;
  }).catch(()=>{entry.url=null;entry.pending=null;entry.failedUntil=now()+retryMs;return null;});
  return entry.pending;
 }
 return Object.freeze({get,load,warm:key=>get(key)?tickets.get(key)?.warm||null:null});
}

// Global (Chris 27.10.2026: „universal, auch wenn ich ein neues Produkt anlege“): Ein Theme-Baustein im
// Fußbereich schreibt auf jeder Produktseite mit Konfigurator-ID die Produktdaten als JSON (#gravuru-konfi).
// Fehlt auf der Vorlage der eigene Knopf, setzt diese Datei ihn an die Stelle der Kaufknöpfe; die normalen
// Kaufknöpfe dieses Produkts werden ausgeblendet (kein Kauf ohne Gestaltung).
const ID=/^\d{1,20}$/;
// Optional product-local presentation data. Liquid's product.variants is capped
// at 250; the reviewed product manifest supplies its complete ID list. These
// display/navigation hints never replace the server's signed binding checks.
function productPresentation(doc,raw){
 let data;try{data=JSON.parse(doc?.getElementById?.('gravuru-konfi-presentation')?.textContent||'');}catch{return null;}
 if(data?.schema!=='gravuru-shop-presentation/v1'||data.ui!=='prio-r15'||!ID.test(String(data.productId))||!Array.isArray(data.variants)||!data.variants.length||data.variants.length>2048)return null;
 // The existing custom-Liquid entry need not have the global app-embed JSON.
 // In that case accept this complete profile only beside its matching own link.
 if(!raw){
  const own=[...(doc?.querySelectorAll?.('[data-gravuru-personalisieren]')||[])].some(block=>block.getAttribute?.('data-product-id')===String(data.productId)&&block.getAttribute?.('data-start')===PROXY+'/start');
  if(!own)return null;raw={productId:data.productId,variantId:data.themeVariantId,back:data.back};
 }
 if(String(data.productId)!==String(raw.productId))return null;
 const variants=data.variants.map(String);
 if(variants.some(v=>!ID.test(v))||new Set(variants).size!==variants.length||!variants.includes(String(data.variantId))||!variants.includes(String(raw.variantId)))return null;
 return {ui:'prio-r15',variants,variantId:String(data.variantId),themeVariantId:String(raw.variantId),source:raw};
}
export function pageConfig(doc=globalThis.document){
 const node=doc?.getElementById?.('gravuru-konfi');
 let raw;try{raw=node?JSON.parse(node.textContent||''):null;}catch{return null;}
 const presentation=productPresentation(doc,raw);raw??=presentation?.source;if(!raw)return null;
 const productId=String(raw?.productId??''),variants=presentation?.variants||(Array.isArray(raw?.variants)?[...new Set(raw.variants.map(String))].filter(v=>ID.test(v)):[]);
 if(!ID.test(productId)||!variants.length||variants.length>(presentation?2048:250))return null;
 // Liquid's selected variant belongs to this product even when product.variants
 // contains only the first 250 IDs. This is a start hint, never a server binding.
 const variantId=presentation?.variantId||(ID.test(String(raw.variantId??''))?String(raw.variantId):variants[0]);
 const back=typeof raw.back==='string'&&/^\/(?!\/)[^\s]{0,300}$/.test(raw.back)?raw.back:'/';
 return {productId,variantId,variants,back,...(presentation?{ui:presentation.ui,themeVariantId:presentation.themeVariantId}:{})};
}
export function startHref(config,variantId=config.variantId,search=globalThis.location?.search||''){
 const selected=String(variantId),known=config.variants.includes(selected)||selected===config.variantId||selected===variantSelections.get(config)?.chosen;
 const params=new URLSearchParams({product:config.productId,variant:known?selected:config.variantId,back:config.back});
 if(config.ui==='prio-r15')params.set('ui','prio-r15');
 const toolbar=new URLSearchParams(search).getAll('leiste');if(toolbar.length===1&&['a','b'].includes(toolbar[0]))params.set('leiste',toolbar[0]);
 return PROXY+'/start?'+params;
}
// Kaufformulare genau dieses Produkts (auch die mitlaufende Kaufleiste), nicht die anderer Produkte auf der Seite.
const identifiedForms=new WeakMap();
export function productForms(config,doc=globalThis.document){
 let known=identifiedForms.get(config);if(!known){known=new WeakSet();identifiedForms.set(config,known);}
 return [...doc.querySelectorAll('form[action*="/cart/add"]')].filter(form=>{
  const value=String(form.querySelector('[name="id"]')?.value||'');if(!ID.test(value))return false;
  // The active theme's product-info (and sticky product wrapper) identifies its
  // product explicitly. A foreign wrapper wins over any remembered form/ID.
  const owner=form.closest?.('[data-product-id]')?.getAttribute?.('data-product-id');
  const own=owner!=null?owner===config.productId:known.has(form)||config.variants.includes(value)||value===config.variantId;
  if(own)known.add(form);return own;
 });
}
const variantSelections=new WeakMap();
export function currentVariant(config,doc,search=globalThis.location?.search||''){
 const forms=productForms(config,doc),value=form=>String(form?.querySelector('[name="id"]')?.value||'');
 if(config.ui!=='prio-r15'){
  let state=variantSelections.get(config);if(!state){state={chosen:config.variantId};variantSelections.set(config,state);}
  const buy=form=>!!form.querySelector('[type="submit"],[name="add"]'),sticky=form=>!!form.closest?.('[class*="sticky"],sticky-atc-bar');
  const main=forms.filter(form=>buy(form)&&!sticky(form)),buyForms=forms.filter(buy),candidates=main.length?main:buyForms.length?buyForms:forms;
  const choices=new Set(candidates.map(value));
  if(choices.size===1)state.chosen=[...choices][0];
  return state.chosen;
 }
 // Start at the main-image variant until a real selection changes. Prefer the
 // main purchase form over stale installment/sticky copies of the same product.
 const buy=form=>!!form.querySelector('[type="submit"],[name="add"]'),sticky=form=>!!form.closest?.('[class*="sticky"],sticky-atc-bar');
 const form=forms.find(form=>buy(form)&&!sticky(form))||forms.find(buy)||forms[0],rawSelected=value(form),selected=config.variants.includes(rawSelected)?rawSelected:'';
 let state=variantSelections.get(config);if(!state){state={form:config.themeVariantId,query:null,chosen:config.variantId};variantSelections.set(config,state);}
 if(selected&&selected!==state.form){state.form=selected;state.chosen=selected;}
 const values=new URLSearchParams(search).getAll('variant'),query=values.length===1&&config.variants.includes(values[0])?values[0]:null;
 if(query&&query!==state.query)state.chosen=query;state.query=query;
 return state.chosen;
}
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
 // Eigener Knopf immer bedienbar (Chris 28.10.2026, iPhone: „ausgegraut, tut nichts“): Theme-Sperren entfernen.
 for(const own of doc.querySelectorAll('[data-gravuru-personalisieren] a[data-gravuru-start]'))unlockStartLink(own);
 if(doc.querySelector('[data-gravuru-personalisieren]')||!forms.length)return null;
 const box=doc.createElement('div');box.className='gravuru-personalisieren';box.setAttribute('data-gravuru-personalisieren','');box.style.margin='12px 0 16px';
 const link=doc.createElement('a');link.className='btn btn--primary btn--gravuru-primary';link.setAttribute('data-gravuru-start','');link.rel='nofollow';link.textContent='Jetzt personalisieren';link.href=startHref(config,currentVariant(config,doc));
 const note=doc.createElement('p');note.style.cssText='margin:8px 0 0;font-size:.9em;opacity:.8;text-align:center';note.textContent='Design wählen, Text gestalten, eigenes Foto hochladen.';
 // Hauptformular: hat einen Kaufknopf (nicht das Ratenzahlungs-Formular im Preisblock) und liegt nicht in der Kaufleiste.
 const buy=form=>!!form.querySelector('[type="submit"],[name="add"]'),sticky=form=>!!form.closest?.('[class*="sticky"],sticky-atc-bar');
 const main=forms.find(form=>buy(form)&&!sticky(form))||forms.find(buy)||forms[0];
 unlockStartLink(link);box.append(link,note);main.after(box);return box;
}

export function unlockStartLink(link){
 for(const name of ['disabled','aria-disabled','tabindex'])if(link.getAttribute?.(name)!==null&&link.getAttribute?.(name)!==undefined)link.removeAttribute?.(name);
 for(const name of ['disabled','btn--disabled','is-disabled','loading','btn--loading'])if(link.classList?.contains?.(name))link.classList.remove(name);
 // Nur bei Abweichung setzen (kein Endlosspiel mit dem Attribut-Beobachter).
 if(link.style)for(const [key,value] of [['pointerEvents','auto'],['opacity','1'],['touchAction','manipulation'],['cursor','pointer']])if(link.style[key]!==value)link.style[key]=value;
 return link;
}
// Ausweg ohne Fenster: dieselbe Startadresse als ganze Seite (normaler Konfigurator-Einstieg über den App-Proxy).
export function pageStartUrl(key){try{const url=new URL(key);url.searchParams.delete('embed');url.searchParams.delete('format');return url.href;}catch{return null;}}

// Nur Nachrichten genau dieses Konfigurator-Fensters vom Konfigurator-Host werden angenommen.
export function acceptedMessage(event,frame){
 if(!frame||event.origin!==EDITOR_ORIGIN||event.source!==frame.contentWindow)return null;
 const data=event.data;
 if(data?.type==='gravuru-shop-close')return {type:'close'};
 // loaded: Fensterseite ist da (Wächter aus); ready: Editor bedienbar (eigene Kopfzeile, Fensterleiste ausblenden).
 if(data?.type==='gravuru-shop-ready')return {type:'loaded'};
 if(data?.type==='gravuru-shop-editor-ready')return {type:'ready'};
 if(data?.type==='gravuru-shop-failed')return {type:'failed',message:typeof data.message==='string'?data.message.slice(0,300):'',...(data.cartAccessMissing===true?{cartAccessMissing:true}:{})};
 // cartImage: Platte mit Material, wie im Überblick des Konfigurators (nur Anzeige, sonst die Gravurvorschau).
 if(data?.type==='gravuru-shop-handoff'&&TOKEN.test(data.token||''))return {type:'handoff',token:data.token,image:cartImage(data.cartImage)};
 return null;
}

// Absicht erkennbar (Zeiger über dem Knopf, Fokus, Berührung): Verbindung zum Konfigurator-Host schon aufbauen
// (spart beim Klick DNS/TLS für die Weiterleitung). Einmal je Seite, ohne Datenabruf.
export function connectOnIntent(doc=globalThis.document,origin=EDITOR_ORIGIN,onIntent=null){
 let done=false;
 const handler=event=>{if(!event?.target?.closest?.('[data-gravuru-personalisieren] a[data-gravuru-start]'))return;
  try{onIntent?.();}catch{}
  if(done)return;done=true;
  const hint=doc.createElement('link');hint.rel='preconnect';hint.href=origin;doc.head.append(hint);};
 for(const type of ['pointerover','focusin','touchstart'])doc.addEventListener(type,handler,{passive:true,capture:true});
 return handler;
}
export function install({root=window.Shopify?.routes?.root||'/'}={}){
 if(window.__gravuruShopEmbed)return window.__gravuruShopEmbed;
 const cartEdit=location.pathname===PROXY+'/start'?document.querySelector('a[data-gravuru-cart-edit]'):null;
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const shell=document.createElement('div');shell.className='gv-embed';shell.hidden=true;shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','Produkt personalisieren');
 const bar=document.createElement('div');bar.className='gv-embed__bar';
 const close=document.createElement('button');close.type='button';close.className='gv-embed__close';close.textContent='✕ Schließen';bar.append(close);
 const status=document.createElement('div');status.className='gv-embed__status';status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const box=document.createElement('div');box.className='gv-embed__box';status.append(box);
 shell.append(bar,status);document.body.append(shell);
 let frame=null,frameKey=null,busy=false,lastFocus=null,watchdog=null,frameReady=false;
 let slow=null;
 // V4: Schritt 4 von 4 mit Ladesymbol; nach 15 s ein beruhigender Hinweis statt scheinbarem Stillstand.
 const say=(text,{error=false,busy:running=false}={})=>{clearTimeout(slow);box.replaceChildren(document.createTextNode(text));status.hidden=false;box.toggleAttribute('data-busy',running);
  if(running)slow=setTimeout(()=>{if(!box.hasAttribute('data-busy'))return;const hint=document.createElement('span');hint.className='gv-embed__hint';hint.textContent='Bei langsamer Verbindung dauert das etwas länger – bitte das Fenster geöffnet lassen.';box.append(hint);},15000);
  if(error){const again=document.createElement('button');again.type='button';again.textContent='Zurück zur Gestaltung';again.addEventListener('click',()=>{status.hidden=true;});
   const cart=document.createElement('a');cart.href=root+'cart';cart.textContent='Warenkorb öffnen';box.append(document.createElement('br'),again,cart);}};
 // `key` = Startadresse über den App-Proxy; geöffnet wird ggf. die Startkarte (direkt). Gleicher Schlüssel = gleiches Fenster.
 function load(url,key=url){
  bar.hidden=false;frame?.remove();frame=document.createElement('iframe');frame.className='gv-embed__frame';frame.title='Produkt personalisieren';frame.setAttribute('allow','clipboard-write');
  frame.src=url;frameKey=key;frameReady=false;shell.append(frame);
 }
 // Hinweis mit Ausweg, falls der Konfigurator nicht kommt (Netz, Browser-Einstellungen, Sperren im Fenster).
 function trouble(text){
  if(!frameKey)return;
  clearTimeout(slow);box.removeAttribute('data-busy');box.replaceChildren(document.createTextNode(text));status.hidden=false;
  const wait=document.createElement('button');wait.type='button';wait.textContent='Weiter warten';wait.addEventListener('click',()=>{status.hidden=true;arm(20000);});
  const again=document.createElement('button');again.type='button';again.textContent='Neu laden';again.addEventListener('click',()=>{status.hidden=true;const key=frameKey;load(key,key);arm();});
  const page=document.createElement('a');page.href=cartEdit?.href||pageStartUrl(frameKey)||frameKey;page.target='_top';page.rel='nofollow';page.textContent='Ohne Fenster öffnen';
  box.append(document.createElement('br'),wait,again,page);
 }
 function arm(ms=15000){clearTimeout(watchdog);watchdog=setTimeout(()=>{if(!frameReady&&!shell.hidden)trouble('Der Konfigurator braucht gerade ungewöhnlich lange. Du kannst weiter warten, neu laden oder ihn ohne Fenster öffnen.');},ms);}
 // Vorgeladen: unsichtbar, aber in voller Größe aufgebaut (sonst misst der Editor 0 px); nicht bedienbar, nicht fokussierbar.
 function preload(url){
  if(frame||!url)return;
  shell.classList.add('gv-embed--preload');shell.setAttribute('aria-hidden','true');shell.hidden=false;load(url);
 }
 function open(url,key=url){
  lastFocus=document.activeElement;status.hidden=true;
  if(!frame||frameKey!==key)load(url,key);
  if(!frameReady)arm();
  shell.classList.remove('gv-embed--preload');shell.removeAttribute('aria-hidden');shell.hidden=false;
  document.documentElement.classList.add('gv-embed-open');close.focus();
 }
 // Schließen behält das geladene Fenster: erneutes Öffnen ist sofort da (gleicher Stand).
 function hide(){if(busy)return;if(cartEdit){location.assign(root+'cart');return;}shell.hidden=true;status.hidden=true;document.documentElement.classList.remove('gv-embed-open');lastFocus?.focus?.();}
 close.addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!shell.hidden)hide();});
 async function request(token,path,method='GET'){
  const r=await fetch(PROXY+'/cart/'+path,{method,credentials:'same-origin',cache:'no-store',headers:cartRequestHeaders(token,path)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const error=Error(data.error?.message||'Die Warenkorbübergabe konnte nicht geladen werden.');error.code=data.error?.code;throw error;}
  return data;
 }
 async function handoff(token,source,image){
  if(busy)return;busy=true;say(CHECKOUT_WAIT_TEXT,{busy:true});
  try{
   const payload=await readCartDataUntilReady(()=>request(token,'data'),{onWait:()=>say(CHECKOUT_WAIT_TEXT,{busy:true})});
   if(location.hostname!==payload.shopDomain)throw Error('Diese Übergabe gehört zu einem anderen Shop.');
   const client=createThemeCartClient({root,claim:()=>request(token,'claim','POST'),onProgress:text=>say('4 von 4 · '+text,{busy:true})});
   const submit=()=>client.submit(payload,{image}),result=navigator.locks?await navigator.locks.request('gravuru-theme-cart',submit):await submit();
   say('Im Warenkorb – einen Moment …',{busy:true});location.assign(result.cartUrl);
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
  else if(message.type==='loaded'){frameReady=true;clearTimeout(watchdog);if(!busy)status.hidden=true;}
  else if(message.type==='ready'){frameReady=true;clearTimeout(watchdog);if(!busy)status.hidden=true;bar.hidden=true;}
  else if(message.type==='failed'){
   if(cartEdit&&message.cartAccessMissing){location.replace(cartEdit.href);return;}
   frameReady=false;clearTimeout(watchdog);bar.hidden=false;trouble((message.message?message.message+' ':'')+'Bitte neu laden oder den Konfigurator ohne Fenster öffnen.');
  }
  else handoff(message.token,event.source,message.image);
 });
 if(cartEdit){open(cartEdit.dataset.gravuruCartEdit);return;}
 const config=pageConfig();
 if(config){
  prepareProductPage(config);
  // Varianten- und Abschnittswechsel des Themes bauen Kaufknöpfe neu auf: erneut ausblenden.
  const style=document.createElement('style');style.textContent='[data-gravuru-hidden-buy]{display:none!important}';document.head.append(style);
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;prepareProductPage(config);});}).observe(document.body,{childList:true,subtree:true});
  // Sperrt das Theme den Knopf nachträglich (Klasse, Stil, disabled), sofort wieder freigeben.
  new MutationObserver(records=>{for(const r of records)if(r.target?.matches?.('[data-gravuru-personalisieren] a[data-gravuru-start]'))unlockStartLink(r.target);}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','style','disabled','aria-disabled','tabindex']});
 }
 // Keep full-editor preloading off. A tiny separate app-origin frame warms only
 // the server's bounded public asset manifest in the same browser cache partition.
 const tickets=createStartTickets();
 let warmFrame=null,warmSignature=null;
 function warmAssets(key){
  const connection=navigator.connection;if(connection?.saveData||/(^|-)2g$/.test(String(connection?.effectiveType||''))||document.visibilityState==='hidden'||frame)return;
  const data=tickets.warm(key);if(!data)return;const signature=JSON.stringify(data);if(signature===warmSignature)return;warmSignature=signature;
  warmFrame?.remove();warmFrame=document.createElement('iframe');warmFrame.hidden=true;warmFrame.tabIndex=-1;warmFrame.setAttribute('aria-hidden','true');warmFrame.title='Konfigurator vorbereiten';warmFrame.referrerPolicy='no-referrer';warmFrame.src=data.url+'#'+encodeURIComponent(JSON.stringify(data.manifest));document.body.append(warmFrame);
 }
 const ownLink=()=>{const link=document.querySelector('[data-gravuru-personalisieren] a[data-gravuru-start]');if(link&&config)link.href=startHref(config,currentVariant(config,document));return link;};
 const fetchTicket=()=>{const link=ownLink();if(link&&!frame){const key=startUrl(link);tickets.load(key).then(()=>{const current=ownLink();if(current&&startUrl(current)===key)warmAssets(key);});}};
 connectOnIntent(document,EDITOR_ORIGIN,fetchTicket);
 if(config)scheduleProductWarmup(document,window,fetchTicket);
 // Klick in der Einfangphase: Theme-Skripte (Kaufleiste, Akkordeons …) können ihn nicht vorher schlucken.
 // Klappt das Fenster nicht, läuft der normale Link weiter (ganze Seite über den App-Proxy).
 document.addEventListener('click',event=>{
  const link=event.target?.closest?.('[data-gravuru-personalisieren] a[data-gravuru-start]');
  if(!link)return;
  // Gerade gewählte Variante übernehmen (auch für Strg-/Mittelklick, die normal weiterlaufen).
  if(config)link.href=startHref(config,currentVariant(config,document));
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const url=startUrl(link);if(!url)return;
  try{open(tickets.get(url)||url,url);event.preventDefault();event.stopPropagation();}catch{shell.hidden=true;document.documentElement.classList.remove('gv-embed-open');}
 },true);
 return (window.__gravuruShopEmbed=Object.freeze({open,hide,preload}));
}

if(typeof window!=='undefined'&&typeof document!=='undefined'&&!globalThis.GRAVURU_SHOP_EMBED_NO_AUTO){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
}

// Product markup and first paint are enough; unrelated images must not delay
// the small optional warmup. Intent listeners above still promote it immediately.
export function scheduleProductWarmup(doc,win,start){
 const run=()=>{const paint=fn=>win.requestAnimationFrame?win.requestAnimationFrame(fn):win.setTimeout(fn,0);paint(()=>paint(()=>{if(doc.visibilityState==='hidden')return;if(win.requestIdleCallback)win.requestIdleCallback(start,{timeout:600});else win.setTimeout(start,50);}));};
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',run,{once:true});else run();
}
