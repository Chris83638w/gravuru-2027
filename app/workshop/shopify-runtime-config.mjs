import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createShopifySessionVerifier} from './shopify-session.mjs';
import {createShopifyAdminHost} from './shopify-admin-host.mjs';
import {createShopDraftTransport} from './shop-draft-transfer.mjs';
import {createDraftTokenProvider} from './shopify-draft-token.mjs';
const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
// Public identity read from Shopify App 423276544001 on 2026-10-06; not a secret.
export const SHOPIFY_IDENTITY=Object.freeze({shopDomain:'gravuru-design.myshopify.com',clientId:'9640dd7a6907f0c73e7013ea8c24869b'});
export const REQUIRED_SHOPIFY_FIELDS=Object.freeze(['GRAVURU_SHOPIFY_CLIENT_SECRET','GRAVURU_SHOPIFY_APP_ORIGIN','GRAVURU_PRIVATE_DATA_DIR']);
const invalid=()=>{throw Object.assign(Error('Shopify-Testkonfiguration ungültig. Feldnamen und Vorgaben in der Projektübergabe prüfen; keine Schlüssel ausgeben.'),{code:'shopify_runtime_config'});};
export function shopifyRuntimeConfig(env){
  const missing=REQUIRED_SHOPIFY_FIELDS.filter(key=>typeof env[key]!=='string'||!env[key]);
  if(missing.length)throw Object.assign(Error('Shopify-Testkonfiguration fehlt.'),{code:'shopify_runtime_missing',missing});
  const shopDomain=env.GRAVURU_SHOPIFY_SHOP_DOMAIN??SHOPIFY_IDENTITY.shopDomain,clientId=env.GRAVURU_SHOPIFY_CLIENT_ID??SHOPIFY_IDENTITY.clientId,secret=env.GRAVURU_SHOPIFY_CLIENT_SECRET;
  const dataDirectory=env.GRAVURU_PRIVATE_DATA_DIR,port=env.GRAVURU_SHOPIFY_TEST_PORT===undefined?8962:Number(env.GRAVURU_SHOPIFY_TEST_PORT);
  if(shopDomain!==SHOPIFY_IDENTITY.shopDomain||clientId!==SHOPIFY_IDENTITY.clientId||!path.isAbsolute(dataDirectory)||dataDirectory!==path.resolve(dataDirectory)||dataDirectory==='/'||!Number.isInteger(port)||port<1024||port>65535)invalid();
  const relative=path.relative(repository,dataDirectory);
  if(!relative||!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))invalid();
  const shopifySessions={mode:'test-only',shopDomain,clientId,secret},embeddedApp={mode:'embedded-test',shopDomain,clientId,origin:env.GRAVURU_SHOPIFY_APP_ORIGIN};
  try{createShopifySessionVerifier(shopifySessions);createShopifyAdminHost(embeddedApp,shopifySessions);}catch{invalid();}
  let shopDrafts=null;
  if(env.GRAVURU_SHOPIFY_DRAFT_TRANSFER!==undefined&&env.GRAVURU_SHOPIFY_DRAFT_TRANSFER!=='draft-only')invalid();
  if(env.GRAVURU_SHOPIFY_DRAFT_TRANSFER==='draft-only')shopDrafts={config:{mode:'draft-only',shopDomain,apiVersion:'2026-07',getAccessToken:createDraftTokenProvider({shopDomain,clientId,clientSecret:secret})}};
  if(env.GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN){
    const config={mode:'draft-only',shopDomain,apiVersion:'2026-07',accessToken:env.GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN};
    try{createShopDraftTransport(config);}catch{invalid();}shopDrafts={config};
  }
  // K7: App-Proxy-Signatur (Konto-Entwürfe) nutzt dasselbe App-Geheimnis; kein weiteres Feld nötig.
  const appProxy={shopDomain,secret};
  // K13: Mandanteneinstellungen des Standardmandanten – nur Namen der Env-/Secret-Felder, nie deren Werte.
  const tenantSettings={clientSecretRef:'GRAVURU_SHOPIFY_CLIENT_SECRET',storefrontApiVersion:'2026-07',...(env.GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN?{adminTokenRef:'GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN'}:{})};
  return {shopifySessions,embeddedApp,shopDrafts,appProxy,tenantSettings,dataDirectory,port};
}
export function checkShopifyRuntime(env){
  try{const config=shopifyRuntimeConfig(env);return {configured:true,scope:'merchant-embedded-test',draftTransferConfigured:Boolean(config.shopDrafts),credentialsVerified:false,httpsHostVerified:false,privateStorageVerified:false};}
  catch(error){return {configured:false,error:error.code==='shopify_runtime_missing'?'missing_fields':'invalid_configuration',missing:error.missing||[],credentialsVerified:false,httpsHostVerified:false,privateStorageVerified:false};}
}
