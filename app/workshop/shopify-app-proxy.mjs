import {createHmac,timingSafeEqual} from 'node:crypto';

// Shopify App-Proxy-Anfragen (K7, Ü8.2). Shopify hängt an jede über
// `/apps/<prefix>/…` weitergeleitete Anfrage `shop`, `path_prefix`, `timestamp`,
// `logged_in_customer_id` (leer ohne Anmeldung) und `signature` an. Die Signatur
// ist HMAC-SHA256 (hex) über alle Parameter außer `signature`, je Parameter als
// `name=wert` (Mehrfachwerte mit Komma), sortiert und ohne Trennzeichen
// aneinandergehängt; Schlüssel ist das App-Geheimnis (Client Secret).
// Quelle: shopify.dev → Apps → Online store → App proxies → Authenticate.
// Die Signatur belegt nur Unversehrtheit; der Server prüft Shop und Zeit selbst.
const reject=(reason='signature')=>{throw Object.assign(Error('Die Anfrage kommt nicht bestätigt aus dem Shop.'),{status:401,code:'app_proxy_signature',reason});};
export function appProxyMessage(params){
  const pairs=new Map();
  for(const [key,value] of params){if(key==='signature')continue;pairs.set(key,[...(pairs.get(key)||[]),value]);}
  return [...pairs].map(([key,values])=>key+'='+values.join(',')).sort().join('');
}
export const appProxySignature=(params,secret)=>createHmac('sha256',secret).update(appProxyMessage(params)).digest('hex');
export function createAppProxyVerifier({shopDomain,secret,clock=Date.now,maxAgeSeconds=300}){
  if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain||'')||typeof secret!=='string'||secret.length<16||!Number.isInteger(maxAgeSeconds)||maxAgeSeconds<1)
    throw Object.assign(Error('App-Proxy-Prüfung ist nicht eingerichtet.'),{status:503,code:'app_proxy_config'});
  return function verify(params){
    if(!(params instanceof URLSearchParams))reject('malformed');
    const signature=params.get('signature');
    if(params.getAll('signature').length!==1||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))reject();
    const expected=appProxySignature(params,secret);
    if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))reject();
    if(params.getAll('shop').length!==1||params.get('shop')!==shopDomain)reject('shop');
    const timestamp=params.get('timestamp');
    if(params.getAll('timestamp').length!==1||!/^[1-9][0-9]{0,15}$/.test(timestamp||''))reject('timestamp');
    const age=Math.floor(clock()/1000)-Number(timestamp);
    if(age>maxAgeSeconds||age<-maxAgeSeconds)reject('expired');
    if(params.getAll('logged_in_customer_id').length>1)reject('customer');
    const customer=params.get('logged_in_customer_id');
    let customerId=null;
    if(customer!==null&&customer!==''){if(!/^[1-9][0-9]{0,19}$/.test(customer))reject('customer');customerId='gid://shopify/Customer/'+customer;}
    return Object.freeze({shopDomain,customerId,pathPrefix:params.get('path_prefix')||null});
  };
}
