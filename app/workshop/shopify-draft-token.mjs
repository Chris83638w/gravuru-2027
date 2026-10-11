// Organization-owned app: short-lived Admin token, held only in process memory.
// No new scopes are requested, and acquiring a token never creates a product.
export function createDraftTokenProvider({shopDomain,clientId,clientSecret},{fetchImpl=globalThis.fetch,now=()=>Date.now()}={}){
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)||typeof clientId!=='string'||!clientId||typeof clientSecret!=='string'||clientSecret.length<16)throw Error('Shop-Entwurfsanmeldung fehlt.');
 let cached=null,pending=null;
 return async function token(){
  if(cached&&now()<cached.expiresAt)return cached.value;
  if(pending)return pending;
  pending=(async()=>{
   const response=await fetchImpl(`https://${shopDomain}/admin/oauth/access_token`,{method:'POST',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret})});
   if(!response.ok||response.redirected||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('token_response');
   const reader=response.body.getReader(),chunks=[];let bytes=0;
   try{for(;;){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>16384)throw Error('token_size');chunks.push(Buffer.from(r.value));}}finally{await reader.cancel();}
   const data=JSON.parse(Buffer.concat(chunks).toString());
   if(typeof data.access_token!=='string'||! /^[\x21-\x7e]{16,4096}$/.test(data.access_token)||!Number.isInteger(data.expires_in)||data.expires_in<120||data.expires_in>86400||typeof data.scope!=='string'||!data.scope.split(',').map(s=>s.trim()).includes('write_products'))throw Error('token_scope');
   cached={value:data.access_token,expiresAt:now()+(data.expires_in-60)*1000};return cached.value;
  })().catch(()=>{cached=null;throw Error('Shopify-Anmeldung für Produktentwürfe nicht bestätigt. Vorhandene App-Berechtigung write_products und Verbindung prüfen.');}).finally(()=>{pending=null;});
  return pending;
 };
}
