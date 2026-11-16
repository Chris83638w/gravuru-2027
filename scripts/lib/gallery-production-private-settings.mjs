import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {SHOPIFY_IDENTITY} from '../../app/workshop/shopify-runtime-config.mjs';
import {createDraftTokenProvider} from '../../app/workshop/shopify-draft-token.mjs';

const fail=code=>{throw Object.assign(Error('Die vorhandene private Verbindung konnte nicht bestätigt werden.'),{code});};
export const productionFileSha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function readProductionPrivateFile(filename,max,sha256){
 try{
  if(!path.isAbsolute(filename)||fs.realpathSync(filename)!==filename||!fs.statSync(filename).isFile()||fs.statSync(filename).size>max)fail('module_private_file');
  const bytes=fs.readFileSync(filename);
  if(sha256&&productionFileSha256(bytes)!==sha256)fail('module_private_file_pin');
  return bytes;
 }catch(error){if(error.code?.startsWith('module_private_'))throw error;fail('module_private_file');}
}

/** Reads only the explicitly selected existing app configuration and its real
 * secret-file reference. Uses the app's existing token provider, never requests
 * scopes, returns or prints a secret, or creates a different installation. */
export function loadExistingProductionShopifyReader(configFilename,{expectedSecretFilename,fetchImpl=globalThis.fetch,clock=Date.now}={}){
 let values;
 try{values=JSON.parse(readProductionPrivateFile(configFilename,256*1024)).values;}catch{fail('module_private_app_config');}
 if(!values||typeof values!=='object'||Array.isArray(values)||values.GRAVURU_SHOPIFY_DRAFT_TRANSFER!=='draft-only'||
   (values.GRAVURU_SHOPIFY_SHOP_DOMAIN??SHOPIFY_IDENTITY.shopDomain)!==SHOPIFY_IDENTITY.shopDomain||
   (values.GRAVURU_SHOPIFY_CLIENT_ID??SHOPIFY_IDENTITY.clientId)!==SHOPIFY_IDENTITY.clientId||
   typeof values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE!=='string'||expectedSecretFilename&&values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE!==expectedSecretFilename)fail('module_private_app_config');
 const secret=readProductionPrivateFile(values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,4096).toString('utf8').trim();
 if(!/^[\x21-\x7e]{16,4096}$/.test(secret))fail('module_private_app_secret');
 const getAccessToken=createDraftTokenProvider({...SHOPIFY_IDENTITY,clientSecret:secret},{fetchImpl,now:clock});
 return {shopDomain:SHOPIFY_IDENTITY.shopDomain,apiVersion:'2026-07',getAccessToken,fetchImpl,clock};
}

export function loadProductionModuleIdentity({metadataFilename,metadataSha256,originalIdsFilename,originalIdsSha256}){
 if(!/^[a-f0-9]{64}$/.test(metadataSha256||'')||!/^[a-f0-9]{64}$/.test(originalIdsSha256||''))fail('module_private_identity_pin');
 let metadata,originalIds;
 try{
  metadata=JSON.parse(gunzipSync(readProductionPrivateFile(metadataFilename,1024*1024,metadataSha256),{maxOutputLength:2*1024*1024}));
  originalIds=JSON.parse(readProductionPrivateFile(originalIdsFilename,100000,originalIdsSha256));
 }catch(error){if(error.code?.startsWith('module_private_'))throw error;fail('module_private_identity');}
 if(metadata.schema!=='gravuru-production-module-target-metadata/v1'||metadata.readOnly!==true||metadata.heads?.length!==404||metadata.approval?.variantCount!==404||!Array.isArray(originalIds)||originalIds.length!==251||new Set(originalIds).size!==251)fail('module_private_identity');
 return {...metadata.target,shopifyVariantIds:metadata.heads.map(h=>h.shopifyVariantId),originalIds,originalCount:251,sizeCount:80,variantCount:404};
}
