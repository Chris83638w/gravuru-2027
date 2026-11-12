// NUR LESEN bei Shopify über die besitzende Gravuru-App (App 423276544001): tatsächlicher $app.personalization-Record
// des Hauptacryls (namespace/key/type/Wert-Hash/compareDigest) sowie die bei Shopify sichtbare Function-/Cart-Transform-
// Identität. Zwei feste Abfragen, keine Mutation, kein Warenkorb, kein Deploy. Der Zugang (Client-Credentials der App)
// wird wie in den vorhandenen Werkzeugen (shopify-admin-readonly.mjs, steel-pricing-input-cas.mjs) aus der privaten
// Händlerkonfiguration gelesen; weder Secret noch Token werden ausgegeben oder gespeichert.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),RT=path.join(P,'kandidat-f85390b-20261112'),TARGET='gid://shopify/Product/16190784602492';
const ERWARTET='7c997f49153d43a937a75501ed5bc016eda1003e129d1735528b801ee7962cf5';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'pv_shopify',...e}));
const fail=code=>{throw Object.assign(new Error(code),{code});};
let token;
try{
 const {ADMIN_READONLY_IDENTITY:I}=await import(pathToFileURL(path.join(RT,'app/workshop/shopify-admin-readonly.mjs')).href);
 const appText=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),cfgFile=(appText.match(/process\.env\.GRAVURU_SHOPIFY_CONFIG_FILE\s*=\s*(["'])(.*?)\1/)||[])[2];
 if(!cfgFile)fail('konfiguration_fehlt');
 const secretFile=JSON.parse(fs.readFileSync(cfgFile,'utf8')).values?.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE;if(!secretFile)fail('secretpfad_fehlt');
 const st=fs.statSync(secretFile);if(!st.isFile()||st.mode&0o077||st.size<16||st.size>1024)fail('secretdatei');
 const secret=fs.readFileSync(secretFile,'utf8').trim();if(!/^[A-Za-z0-9_-]{16,256}$/.test(secret))fail('secretformat');
 const anfrage=async(url,options)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);try{const r=await fetch(url,{...options,redirect:'error',cache:'no-store',signal:c.signal});if(!r.ok)fail('http_'+r.status);return {json:await r.json(),version:r.headers.get('x-shopify-api-version')};}finally{clearTimeout(t);}};
 const t=(await anfrage(`https://${I.shopDomain}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:I.clientId,client_secret:secret}).toString()})).json;
 if(typeof t.access_token!=='string'||t.access_token.length<16)fail('token');token=t.access_token;
 const gql=async query=>anfrage(`https://${I.shopDomain}/admin/api/${I.apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query})});
 const R1=await gql(`query HauptacrylPreisvertragLesen { shop { myshopifyDomain currencyCode } currentAppInstallation { app { id title handle } accessScopes { handle } } product(id:"${TARGET}") { id status updatedAt pricing: metafield(namespace:"$app",key:"personalization") { id namespace key type value compareDigest createdAt updatedAt ownerType } } }`);
 const d=R1.json.data;if(!d||R1.json.errors?.length)fail('graphql');
 if(d.shop?.myshopifyDomain!==I.shopDomain||d.currentAppInstallation?.app?.id!==I.appId||d.product?.id!==TARGET)fail('identitaet');
 const m=d.product.pricing,scopes=[...new Set(d.currentAppInstallation.accessScopes.map(s=>s.handle))].sort();
 let wert=null;try{wert=m?JSON.parse(m.value):null;}catch{}
 const out={schema:'gravuru-hauptacryl-app-preisvertrag-lesebeleg/v1',gelesen:new Date().toISOString(),nurLesend:true,mutationen:0,
  identitaet:{shopDomain:d.shop.myshopifyDomain,waehrung:d.shop.currencyCode,appId:d.currentAppInstallation.app.id,appTitel:d.currentAppInstallation.app.title??null,appHandle:d.currentAppInstallation.app.handle??null,apiVersionAngefragt:I.apiVersion,apiVersionAntwort:R1.version,scopes},
  produkt:{id:d.product.id,status:d.product.status,updatedAt:d.product.updatedAt},
  metafeld:m?{id:m.id,namespace:m.namespace,key:m.key,type:m.type,ownerType:m.ownerType,compareDigest:m.compareDigest,createdAt:m.createdAt,updatedAt:m.updatedAt,wertBytes:Buffer.byteLength(m.value),wertSha256:sha(m.value),wertGleichErwartet:sha(m.value)===ERWARTET,
   inhalt:wert?{schema:wert.schema,enabled:wert.enabled,productId:wert.productId,revision:wert.revision,currency:wert.currency,varianten:wert.variants?Object.keys(wert.variants).length:null,extraMotifCents:wert.extraMotifCents??null,extraPhotoCents:wert.extraPhotoCents??null,extraLogoCents:wert.extraLogoCents??null,quantityTiers:wert.quantityTiers??null,quantityTierScope:wert.quantityTierScope??null,history:Array.isArray(wert.history)?wert.history.length:null,legacyOffers:wert.legacyOffers===undefined?null:(Array.isArray(wert.legacyOffers)?wert.legacyOffers.length:typeof wert.legacyOffers),optionPrices:wert.optionPrices===undefined?null:Object.keys(wert.optionPrices).length,schluessel:Object.keys(wert)}:null}:null};
 // Function-/Cart-Transform-Identität, soweit die Admin-API sie der App zeigt (keine Versionsangabe der App möglich)
 for(const [name,q] of [['functions','query FunktionenLesen { shopifyFunctions(first:25) { nodes { id title apiType apiVersion app { id title } } } }'],['cartTransforms','query CartTransformsLesen { cartTransforms(first:10) { nodes { id functionId blockOnFailure } } }']]){
  try{const r=await gql(q);out[name]=r.json.errors?.length?{fehler:r.json.errors.map(e=>String(e.message).slice(0,160)).slice(0,3)}:Object.values(r.json.data)[0].nodes;}catch(e){out[name]={fehler:String(e.code||e.message).slice(0,80)};}}
 const ts=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',dir=path.join(P,'sicherungen-db','preisvertrag-shopify-'+ts);fs.mkdirSync(dir,{mode:0o700});
 const text=JSON.stringify(out,null,1);fs.writeFileSync(path.join(dir,'hauptacryl-app-personalization-lesebeleg.json'),text,{flag:'wx',mode:0o600});
 if(m)fs.writeFileSync(path.join(dir,'personalization.value.json'),m.value,{flag:'wx',mode:0o600});
 log({...out,ordner:path.basename(dir),belegSha256:sha(text)});
}catch(error){log({ok:false,code:/^[a-z_0-9]+$/.test(error.code||'')?error.code:'lesen_fehlgeschlagen'});process.exitCode=1;}
finally{token=undefined;}
