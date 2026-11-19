// Ordinary shop cart transport. All values originate in a saved server offer.
// Read-back is a browser check, never proof of payment or a manufacturing release.
const fail=message=>{throw Error(message);};
// Shared by the product-page embed and the standalone handoff page.
export const CHECKOUT_WAIT_TEXT='Vorschau wird für die Kasse vorbereitet …';
export async function readCartDataUntilReady(fetchData,{sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,intervalMs=1200,limitMs=14000,pauseAfterMs=4000,onWait}={}){
 const started=now();let attempt=0;
 for(;;){
  const mark=now();
  try{return await fetchData(attempt);}
  catch(error){
   if(error?.code!=='checkout_image_pending')throw error;
   if(now()-started>=limitMs)throw error;
   onWait?.();attempt++;
   if(now()-mark<pauseAfterMs){const gap=Math.min(intervalMs,limitMs-(now()-started));if(gap>0)await sleep(gap);}
  }
 }
}
const int=n=>Number.isSafeInteger(n)&&n>=0;
const configId=v=>typeof v==='string'&&/^konfig_[a-f0-9-]{36}$/.test(v);
export function validateThemeCartPayload(p){
 if(p?.schema!=='gravuru-theme-cart/v1'||!/^[-a-z0-9]+\.myshopify\.com$/.test(p.shopDomain||'')||!/^\d{1,20}$/.test(p.variantId||'')||!/^\d{1,20}$/.test(p.productId||'')||!int(p.quantity)||p.quantity<1||p.quantity>99||!int(p.unitCents)||p.unitCents>100000000||p.totalCents!==p.unitCents*p.quantity||p.currency!=='EUR'||p.paymentConfirmed!==false||p.productionReady!==false||!configId(p.configuration?.id)||!Number.isSafeInteger(p.configuration.rev)||p.configuration.rev<1||!['create','update'].includes(p.mode))fail('Die gesicherte Warenkorbübergabe ist unvollständig.');
 if(!p.properties||Array.isArray(p.properties)||Object.keys(p.properties).length>80||Object.entries(p.properties).some(([k,v])=>!k||k.length>130||/[\x00-\x1f]/.test(k)||typeof v!=='string'||v.length>12000)||p.properties._gravuru_config!==p.configuration.id||p.properties._gravuru_rev!==String(p.configuration.rev)||!/^[a-f0-9]{64}$/.test(p.properties._gravuru_offer||'')||Object.hasOwn(p.properties,'_Entwurf'))fail('Die Gestaltungszuordnung ist unvollständig.');
 // Without inline PNG the server-made Shopify file is the cart preview (no upload through the customer's device).
 if(p.preview===undefined?!hostedPreview(p):p.preview?.type!=='image/png'||typeof p.preview.base64!=='string'||p.preview.base64.length>8*1024*1024||!/^iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(p.preview.base64))fail('Die Gestaltungsvorschau fehlt.');
 if(p.mode==='update'&&(!Number.isSafeInteger(p.previousRevision)||p.previousRevision<1||p.previousRevision>=p.configuration.rev))fail('Der bisherige Gestaltungsstand ist unklar.');
 return p;
}
// READY MediaImage made server-side by shopify-checkout-image.mjs from _gravuru_bild.
const HOSTED_PREVIEW=/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/\d{1,6}\/\d{1,6}\/\d{1,6}\/files\/gravuru-gestaltung-[a-f0-9]{64}\.png(?:\?v=\d{1,20})?$/;
export function hostedPreview(p){const url=p?.properties?._gravuru_checkout_image;return typeof url==='string'&&HOSTED_PREVIEW.test(url)?url:null;}
const hostedOnly=p=>p.preview===undefined?hostedPreview(p):null;
export const CART_IMAGE_MAX_BYTES=1536*1024;
export function cartImage(image){
 return typeof Blob!=='undefined'&&image instanceof Blob&&/^image\/(jpeg|png)$/.test(image.type)&&image.size>0&&image.size<=CART_IMAGE_MAX_BYTES?image:null;
}
const stable=value=>JSON.stringify(Object.fromEntries(Object.entries(value||{}).sort(([a],[b])=>a.localeCompare(b))));
const signature=line=>JSON.stringify([String(line.variant_id??line.id),line.quantity,stable(line.properties),line.selling_plan_allocation?.selling_plan?.id??null]);
function cartData(cart){
 if(!cart||cart.currency!=='EUR'||!Array.isArray(cart.items)||cart.items.some(l=>!l||typeof l.key!=='string'||!int(l.quantity)||l.quantity<1))fail('Der Shop-Warenkorb konnte nicht geprüft werden. Bitte Euro als Währung verwenden.');
 return cart;
}
const own=(cart,p)=>cart.items.filter(l=>l.properties?._gravuru_config===p.configuration.id);
const current=(cart,p)=>own(cart,p).filter(l=>l.properties?._gravuru_offer===p.properties._gravuru_offer);
function previewUrl(value,shop){
 if(typeof value!=='string')return false;
 try{const u=new URL(value,'https://'+shop);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname===shop||u.hostname==='cdn.shopify.com')&&(/\/uploads\//.test(u.pathname)||u.hostname==='cdn.shopify.com');}catch{return false;}
}
// Multipart form submission canonicalizes text line endings to CRLF. Compare
// engraving text as lines; identifiers, URLs and all other properties stay exact.
function sameProperty(key,actual,expected){
 if(/^Gravurtext(?: [1-9]\d*)?$/.test(key)&&typeof actual==='string')return actual.replace(/\r\n?/g,'\n')===expected.replace(/\r\n?/g,'\n');
 return actual===expected;
}
export function verifyThemeCartLine(cart,p){
 cartData(cart);const lines=current(cart,p);
 if(lines.length!==1)fail('Die Gestaltung wurde nicht eindeutig im Warenkorb bestätigt. Bitte den Warenkorb prüfen.');
 const line=lines[0];
 if(String(line.variant_id??line.id)!==p.variantId||String(line.product_id)!==p.productId||line.quantity!==p.quantity||line.original_price!==p.unitCents||line.original_line_price!==p.totalCents||!int(line.final_line_price)||line.final_line_price>p.totalCents||Object.entries(p.properties).some(([k,v])=>!sameProperty(k,line.properties?.[k],v))||!previewUrl(line.properties?._Entwurf,p.shopDomain)||(hostedOnly(p)&&line.properties._Entwurf!==hostedOnly(p)))fail('Gestaltung, Vorschau, Ausführung, Menge oder Preis im Warenkorb stimmen nicht überein. Bitte den Warenkorb prüfen.');
 return line;
}
const previous=(cart,p)=>p.mode==='update'?own(cart,p).filter(l=>l.properties._gravuru_rev===String(p.previousRevision)):[];
function otherSignatures(cart,p){const relevant=new Set([...current(cart,p),...previous(cart,p)]);return cart.items.filter(l=>!relevant.has(l)).map(signature).sort();}
function preserve(before,after,p){if(JSON.stringify(otherSignatures(before,p))!==JSON.stringify(otherSignatures(after,p)))fail('Der Warenkorb wurde zwischenzeitlich geändert. Bitte alle Positionen prüfen.');}
export function createThemeCartClient({fetchImpl=globalThis.fetch,claim,root='/',onProgress=()=>{}}={}){
 if(typeof claim!=='function'||!/^\/(?!\/)[A-Za-z0-9/_-]*\/$|^\/$/.test(root))fail('Die Shop-Verbindung ist ungültig.');
 let busy=false,attempted=false;
 const json=async(path,options={})=>{const r=await fetchImpl(root+path,{...options,credentials:'same-origin',cache:'no-store'});let b;try{b=await r.json();}catch{fail('Shopify hat die Übertragung nicht bestätigt. Bitte den Warenkorb prüfen.');}if(!r.ok)fail(b.description||b.error?.message||'Shopify hat die Übertragung nicht bestätigt. Bitte den Warenkorb prüfen.');return b;};
 const read=async()=>cartData(await json('cart.js'));
 async function finish(cart,p,before){
  verifyThemeCartLine(cart,p);
  const old=previous(cart,p);
  if(old.length){
   if(p.mode!=='update'||old.length!==1||old[0].properties._gravuru_rev!==String(p.previousRevision))fail('Mehrere oder neuere Gestaltungen wurden gefunden. Bitte den Warenkorb prüfen.');
   onProgress('Die bisherige Gestaltung wird durch den geprüften neuen Stand ersetzt …');
   // Delete only the exact old key after the new line and its uploaded preview are verified.
   cart=cartData(await json('cart/change.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:old[0].key,quantity:0})}));
  }
  if(previous(cart,p).length!==0||current(cart,p).length!==1)fail('Die Gestaltung konnte nicht eindeutig ersetzt werden. Bitte den Warenkorb prüfen.');
  const line=verifyThemeCartLine(cart,p);preserve(before,cart,p);
  return {line,cart,cartUrl:root+'cart',paymentConfirmed:false};
 }
 return {
  // image: optional fertiges Warenkorbbild (Platte mit Material, aus dem Konfigurator-Fenster). Nur Anzeige im
  // Warenkorb; ohne gültiges Bild bleibt die gespeicherte Gravurvorschau des Servers.
  async submit(input,{image=null}={}){
   if(busy)fail('Die Warenkorbübergabe läuft bereits.');busy=true;
   try{
    const p=validateThemeCartPayload(input);onProgress('Vorhandenen Warenkorb prüfen …');const before=await read(),existing=current(before,p);
    if(existing.length)return await finish(before,p,before);
    const old=previous(before,p);
    if(p.mode==='update'&&old.length!==1)fail('Die bisherige Warenkorbposition fehlt oder wurde geändert. Bitte den Warenkorb prüfen.');
    if(attempted)fail('Die Übertragung ist noch nicht bestätigt. Bitte den Warenkorb prüfen; es wird keine zweite Position angelegt.');
    const hosted=hostedOnly(p);let request;
    if(hosted){
     // Text properties only: the preview is already a Shopify file, so nothing large leaves the customer's device.
     const id=Number(p.variantId);if(!Number.isSafeInteger(id))fail('Die gesicherte Warenkorbübergabe ist unvollständig.');
     request={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{id,quantity:p.quantity,properties:{...p.properties,_Entwurf:hosted}}]})};
    }else{
     const raw=atob(p.preview.base64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
     if(bytes.length<8||bytes.slice(0,8).join(',')!=='137,80,78,71,13,10,26,10')fail('Die Gestaltungsvorschau ist ungültig.');
     const data=new FormData();data.set('items[0][id]',p.variantId);data.set('items[0][quantity]',String(p.quantity));
     for(const [k,v]of Object.entries(p.properties))data.set('items[0][properties]['+k+']',v);
     // Modern handoffs bind the lossless PNG to the immutable saved review.
     const picture=p.properties._gravuru_bild?null:cartImage(image);
     data.append('items[0][properties][_Entwurf]',picture||new Blob([bytes],{type:'image/png'}),picture?.type==='image/jpeg'?'gravuru-gestaltung.jpg':'gravuru-gestaltung.png');
     request={method:'POST',body:data};
    }
    attempted=true;await claim();onProgress('Gestaltung und Vorschau an den Warenkorb übertragen …');
    let uploadError;try{await json('cart/add.js',request);}catch(e){uploadError=e;}
    // Also read after a lost POST reply. Never automatically resend the upload.
    const after=await read();
    if(!current(after,p).length){if(uploadError)throw uploadError;fail('Die Gestaltung fehlt nach der Übertragung. Bitte den Warenkorb prüfen.');}
    onProgress('Vorschau, Gestaltung, Menge und Preis zurückprüfen …');
    return await finish(after,p,before);
   }finally{busy=false;}
  }
 };
}
