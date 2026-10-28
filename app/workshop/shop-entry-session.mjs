import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

// Kurzlebige, zustandslose Kundensitzung für den öffentlichen Konfigurator-Einstieg (SHOP-ENTRY.txt).
// Das Token nennt nur die feste Zuordnung (Store, Shopify-IDs, cfg-Stand, Bindungsrevision) und eine
// zufällige Sitzungskennung; keine Kundendaten, kein Entwurfstoken, kein Geheimnis. Der Schlüssel wird aus
// dem App-Geheimnis abgeleitet, damit dasselbe Geheimnis nie direkt für zwei Zwecke signiert.
const PREFIX='gse1';
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const gidNumber=/^[1-9][0-9]{0,19}$/;
const cfgId=/^cfg_[a-f0-9-]{36}$/;
const positive=v=>Number.isSafeInteger(v)&&v>0;
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const decode=text=>{if(!/^[A-Za-z0-9_-]+$/.test(text))fail(403,'shop_entry_session','Die Sitzung ist ungültig.');const bytes=Buffer.from(text,'base64url');if(bytes.toString('base64url')!==text)fail(403,'shop_entry_session','Die Sitzung ist ungültig.');try{const value=JSON.parse(bytes.toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{fail(403,'shop_entry_session','Die Sitzung ist ungültig.');}};

export const SHOP_ENTRY_SESSION_MAX_TTL_MS=12*60*60*1000;

export function createShopEntrySessions({secret,clock=Date.now,ttlMs=4*60*60*1000,skewMs=60*1000}){
  if(typeof secret!=='string'||secret.length<16||typeof clock!=='function'||!Number.isSafeInteger(ttlMs)||ttlMs<60*1000||ttlMs>SHOP_ENTRY_SESSION_MAX_TTL_MS||!Number.isSafeInteger(skewMs)||skewMs<0||skewMs>5*60*1000)
    fail(503,'shop_entry_config','Der Konfigurator-Einstieg ist nicht eingerichtet.');
  const key=createHmac('sha256',secret).update('gravuru-shop-entry/v1').digest();
  const sign=body=>createHmac('sha256',key).update(body).digest('base64url');
  const fields=['v','st','p','va','c','r','b','a','cu','sid','iat','exp'];
  function check(payload){
    if(Object.keys(payload).length!==fields.length||fields.some(k=>!Object.hasOwn(payload,k)))return false;
    const {v,st,p,va,c,r,b,a,cu,sid,iat,exp}=payload;
    return v===1&&typeof st==='string'&&/^[-A-Za-z0-9_]{1,100}$/.test(st)&&typeof p==='string'&&gidNumber.test(p)&&typeof va==='string'&&gidNumber.test(va)&&
      typeof c==='string'&&cfgId.test(c)&&positive(r)&&typeof b==='string'&&/^binding_[a-f0-9-]{36}$/.test(b)&&positive(a)&&
      (cu===null||typeof cu==='string'&&/^gid:\/\/shopify\/Customer\/[1-9][0-9]{0,19}$/.test(cu))&&typeof sid==='string'&&/^[a-f0-9]{32}$/.test(sid)&&positive(iat)&&positive(exp)&&exp>iat&&exp-iat<=SHOP_ENTRY_SESSION_MAX_TTL_MS;
  }
  return Object.freeze({
    ttlMs,
    // `binding` ist das Ergebnis von registry.resolve (storeId, shopifyProductId, shopifyVariantId, productId,
    // productRevision, bindingId, assignmentRevision). Nur diese Kennungen gelangen ins Token.
    issue(binding,{customerId=null,expiresAt}={}){
      const now=clock(),ceiling=expiresAt===undefined?now+ttlMs:Date.parse(expiresAt);
      if(!Number.isFinite(ceiling))fail(503,'shop_entry_expiry','Die Sitzungsgrenze ist ungültig.');
      if(Math.floor(ceiling/1000)<=Math.floor(now/1000))fail(403,'shop_entry_expired','Die Sitzung ist abgelaufen. Bitte die Produktseite neu öffnen.');
      const payload={v:1,st:binding.storeId,p:binding.shopifyProductId.split('/').at(-1),va:binding.shopifyVariantId.split('/').at(-1),c:binding.productId,r:binding.productRevision,b:binding.bindingId,a:binding.assignmentRevision,cu:customerId,sid:randomBytes(16).toString('hex'),iat:Math.floor(now/1000),exp:Math.floor(Math.min(now+ttlMs,ceiling)/1000)};
      if(!check(payload))fail(503,'shop_entry_binding','Die Produktzuordnung ist für den Einstieg nicht vollständig.');
      const body=encode(payload);
      return {token:PREFIX+'.'+body+'.'+sign(body),expiresAt:new Date(payload.exp*1000).toISOString(),sid:payload.sid};
    },
    verify(token){
      if(typeof token!=='string'||token.length>2048)fail(403,'shop_entry_session','Die Sitzung ist ungültig.');
      const parts=token.split('.');
      if(parts.length!==3||parts[0]!==PREFIX||!/^[A-Za-z0-9_-]{43}$/.test(parts[2]))fail(403,'shop_entry_session','Die Sitzung ist ungültig.');
      const expected=sign(parts[1]);
      if(!timingSafeEqual(Buffer.from(parts[2]),Buffer.from(expected)))fail(403,'shop_entry_session','Die Sitzung ist ungültig.');
      const payload=decode(parts[1]);
      if(!check(payload))fail(403,'shop_entry_session','Die Sitzung ist ungültig.');
      const now=clock();
      if(payload.exp*1000<=now)fail(403,'shop_entry_expired','Die Sitzung ist abgelaufen. Bitte die Produktseite neu öffnen; eine gespeicherte Gestaltung bleibt erhalten.');
      if(payload.iat*1000>now+skewMs)fail(403,'shop_entry_session','Die Sitzung ist ungültig.');
      return Object.freeze({storeId:payload.st,shopifyProductId:'gid://shopify/Product/'+payload.p,shopifyVariantId:'gid://shopify/ProductVariant/'+payload.va,productId:payload.c,productRevision:payload.r,bindingId:payload.b,assignmentRevision:payload.a,customerId:payload.cu,sid:payload.sid,expiresAt:new Date(payload.exp*1000).toISOString()});
    }
  });
}
