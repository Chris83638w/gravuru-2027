// Server-side adapter only; deliberately not connected to a public/operator route.
// Callers must authenticate, resolve the bound shop/offer and persist the returned
// cart privately before redirecting. A cart is not a payment or an order.
import {isIP} from 'node:net';
import {prepareCartRequest,verifyCartResponse,verifyCartBefore,CART_READ} from './storefront-cart.mjs';

const MAX_BYTES=1024*1024;
class StorefrontTransportError extends Error {}
const failure=(code,message,sent=false)=>Object.assign(new StorefrontTransportError(message),{
 status:sent?502:422,code,retryable:false,mayHaveCreatedCart:sent,
});
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function createStorefrontCartTransport(config,{fetchImpl=globalThis.fetch,timeoutMs=10000}={}){
 if(!record(config)||Object.keys(config).some(k=>!['shopDomain','apiVersion','privateToken','authentication','requestContext'].includes(k)))throw failure('storefront_config','Storefront-Konfiguration ist unvollständig oder ungültig.');
 const {shopDomain,apiVersion,privateToken}=config;
 const authentication=config.authentication??'private-token';
 if(typeof shopDomain!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/.test(shopDomain)||
  typeof apiVersion!=='string'||!/^20\d{2}-(01|04|07|10)$/.test(apiVersion)||
  !['private-token','tokenless'].includes(authentication)||
  (config.requestContext!==undefined&&(config.requestContext!=='merchant-test'||authentication!=='tokenless'))||
  (authentication==='tokenless'?Object.hasOwn(config,'privateToken'):
    typeof privateToken!=='string'||privateToken.length<16||privateToken.length>4096||/[^\x21-\x7e]/.test(privateToken))||
  typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw failure('storefront_config','Storefront-Konfiguration ist unvollständig oder ungültig.');
 const endpoint=`https://${shopDomain}/api/${apiVersion}/graphql.json`;
 // `replace` (cartId/lineId) ersetzt eine bestehende Zeile per cartLinesUpdate statt einen neuen Warenkorb anzulegen (K8).
 return async function createCart(offer,{buyerIp,signal,replace,addTo}={}){
  const operatorRequest=config.requestContext==='merchant-test'&&buyerIp===undefined;
  if(!operatorRequest&&(typeof buyerIp!=='string'||!isIP(buyerIp)||buyerIp.includes('%')))throw failure('storefront_buyer','Eine bestätigte Käufer-IP aus dem vertrauenswürdigen Anfragekontext ist erforderlich.');
  if(signal!==undefined&&!(signal instanceof AbortSignal))throw failure('storefront_input','Ungültiges Abbruchsignal.');
  if(signal?.aborted)throw failure('storefront_cancelled','Warenkorbanfrage vor dem Versand abgebrochen.');
  // Never serialize caller-supplied objects outside the established request model.
  const request=prepareCartRequest(offer,replace,addTo),frozenOffer={scope:offer.scope,variantId:offer.variantId,quantity:offer.quantity,unitCents:offer.unitCents,currency:offer.currency,property:{...offer.property},...(offer.personalization?{personalization:{...offer.personalization}}:{}),...(offer.configuration?{configuration:{...offer.configuration}}:{}),...(offer.fields?{fields:offer.fields.map(f=>({label:f.label,value:f.value}))}:{})};
  const frozenTarget=replace?{cartId:replace.cartId,lineId:replace.lineId}:undefined;
  const frozenAdd=addTo?{cartId:addTo.cartId}:undefined;
  const controller=new AbortController(),combined=signal?AbortSignal.any([controller.signal,signal]):controller.signal;
  const timer=setTimeout(()=>controller.abort(),timeoutMs);let reader,mutationSent=false;
  async function send(message){
   const body=JSON.stringify(message);
   const response=await fetchImpl(endpoint,{method:'POST',redirect:'manual',cache:'no-store',signal:combined,
    headers:{'Content-Type':'application/json','Accept':'application/json',...(authentication==='private-token'?{'Shopify-Storefront-Private-Token':privateToken}:{}),...(!operatorRequest?{'Shopify-Storefront-Buyer-IP':buyerIp}:{})},body});
   if(combined.aborted)throw failure('storefront_interrupted','Warenkorbergebnis nach Abbruch oder Zeitüberschreitung unklar. Nicht automatisch erneut anlegen.',true);
   if(!response.ok||response.redirected)throw failure('storefront_http','Shop-Antwort nicht erfolgreich. Warenkorbstatus unbestätigt; keine automatische Wiederholung.',true);
   const version=response.headers.get('x-shopify-api-version');
   if(version&&version!==apiVersion)throw failure('storefront_version','Shop verwendet eine andere API-Version. Warenkorb prüfen; keine Weiterleitung.',true);
   const contentType=response.headers.get('content-type')||'',length=response.headers.get('content-length');
   if(!/^application\/(?:json|graphql-response\+json)(?:\s*;|$)/i.test(contentType)||length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES)||!response.body)throw failure('storefront_response','Shop-Antwort nicht verlässlich lesbar. Warenkorb prüfen; keine Weiterleitung.',true);
   reader=response.body.getReader();const chunks=[];let size=0;
   for(;;){const {done,value}=await reader.read();if(combined.aborted)throw failure('storefront_interrupted','Warenkorbergebnis nach Abbruch oder Zeitüberschreitung unklar. Nicht automatisch erneut anlegen.',true);if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw failure('storefront_response','Shop-Antwort überschreitet die zulässige Größe. Warenkorb prüfen; keine Weiterleitung.',true);chunks.push(Buffer.from(value));}
   let result;try{result=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));}catch{throw failure('storefront_response','Shop-Antwort nicht verlässlich lesbar. Warenkorb prüfen; keine Weiterleitung.',true);}
   reader.releaseLock();reader=null;return result;
  }
  async function readCart(cartId){
   let after=null,cart,lines=[];const cursors=new Set();
   for(let page=0;page<10;page++){
    const result=await send({query:CART_READ,variables:{cartId,after}}),part=result?.data?.cart;
    if(result.errors!==undefined&&(!Array.isArray(result.errors)||result.errors.length)||part?.id!==cartId||!Array.isArray(part.lines?.nodes)||typeof part.lines.pageInfo?.hasNextPage!=='boolean')throw Error('read');
    if(cart&&cart.checkoutUrl!==part.checkoutUrl)throw Error('read');cart??=part;lines.push(...part.lines.nodes);
    if(!part.lines.pageInfo.hasNextPage)return {...cart,lines:{nodes:lines,pageInfo:{hasNextPage:false}}};
    after=part.lines.pageInfo.endCursor;if(typeof after!=='string'||!after||cursors.has(after))throw Error('read');cursors.add(after);
   }
   throw Error('read limit');
  }
  try{
   const existing=frozenTarget||frozenAdd;
   const before=existing?verifyCartBefore(await readCart(existing.cartId),frozenOffer,frozenTarget,frozenAdd):undefined;
   mutationSent=true;const result=await send(request);
   if(existing){
    const operation=frozenTarget?'cartLinesUpdate':'cartLinesAdd',response=result?.data?.[operation];
    if(response?.cart?.id!==existing.cartId||result.errors?.length||!Array.isArray(response.userErrors)||response.userErrors.length||!Array.isArray(response.warnings)||response.warnings.length)throw Error('mutation');
    response.cart=await readCart(existing.cartId);
   }
   try{return verifyCartResponse(result,frozenOffer,shopDomain,frozenTarget,frozenAdd,before);}catch{throw failure('storefront_cart_mismatch','Shop-Warenkorb ist bei Gestaltung, Preis, Verfügbarkeit oder Antwortstruktur nicht bestätigt. Keine Weiterleitung oder automatische Wiederholung.',mutationSent);}
  }catch(error){
   if(error instanceof StorefrontTransportError){error.mayHaveCreatedCart=mutationSent;throw error;}
   throw failure(combined.aborted?'storefront_interrupted':mutationSent?'storefront_network':'storefront_preflight','Warenkorb nicht bestätigt. Keine Weiterleitung oder automatische Wiederholung.',mutationSent);
  }finally{
   clearTimeout(timer);controller.abort();if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}
  }
 };
}
