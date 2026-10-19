import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {appProxyMessage,appProxySignature,createAppProxyVerifier} from './shopify-app-proxy.mjs';

const secret='synthetic-app-proxy-secret-0123456789';
const shop='gravuru-synthetic.myshopify.com';
// Signierte Anfrage wie Shopify sie weiterleitet (Testschlüssel, kein echtes Geheimnis).
export function signedParams({customer='456',timestamp,extra={}}={},key=secret){
  const params=new URLSearchParams({shop,path_prefix:'/apps/gravuru',timestamp:String(timestamp??Math.floor(Date.now()/1000)),logged_in_customer_id:customer,...extra});
  params.set('signature',appProxySignature(params,key));
  return params;
}

test('Signaturnachricht folgt dem Shopify-Beispiel (sortiert, Mehrfachwerte mit Komma, ohne Trennzeichen)', ()=>{
  const params=new URLSearchParams('extra=1&extra=2&shop=some-shop.myshopify.com&path_prefix=%2Fapps%2Fawesome_reviews&timestamp=1317327555&signature=abc&logged_in_customer_id=');
  assert.equal(appProxyMessage(params),'extra=1,2logged_in_customer_id=path_prefix=/apps/awesome_reviewsshop=some-shop.myshopify.comtimestamp=1317327555');
  assert.equal(appProxySignature(params,'hush'),createHmac('sha256','hush').update(appProxyMessage(params)).digest('hex'));
});

test('Prüfer akzeptiert nur unversehrte, aktuelle Anfragen des eingestellten Shops', ()=>{
  const now=1_760_000_000_000,verify=createAppProxyVerifier({shopDomain:shop,secret,clock:()=>now});
  const ts=Math.floor(now/1000);
  assert.deepEqual(verify(signedParams({timestamp:ts})),{shopDomain:shop,customerId:'gid://shopify/Customer/456',pathPrefix:'/apps/gravuru'});
  assert.equal(verify(signedParams({timestamp:ts,customer:''})).customerId,null);
  const tampered=signedParams({timestamp:ts});tampered.set('logged_in_customer_id','789');
  assert.throws(()=>verify(tampered),e=>e.status===401&&e.code==='app_proxy_signature');
  assert.throws(()=>verify(signedParams({timestamp:ts},'other-secret-0123456789abcdef')),e=>e.status===401);
  assert.throws(()=>verify(new URLSearchParams({shop,timestamp:String(ts)})),e=>e.status===401);
  const foreign=signedParams({timestamp:ts});foreign.set('shop','other.myshopify.com');foreign.set('signature',appProxySignature(foreign,secret));
  assert.throws(()=>verify(foreign),e=>e.reason==='shop');
  assert.throws(()=>verify(signedParams({timestamp:ts-301})),e=>e.reason==='expired');
  assert.throws(()=>verify(signedParams({timestamp:ts+301})),e=>e.reason==='expired');
  assert.equal(verify(signedParams({timestamp:ts-299})).shopDomain,shop);
  const bad=signedParams({timestamp:ts,customer:'abc'});assert.throws(()=>verify(bad),e=>e.reason==='customer');
  assert.throws(()=>createAppProxyVerifier({shopDomain:'nicht-shopify.example',secret}),e=>e.code==='app_proxy_config');
  assert.throws(()=>createAppProxyVerifier({shopDomain:shop,secret:'kurz'}),e=>e.code==='app_proxy_config');
});
