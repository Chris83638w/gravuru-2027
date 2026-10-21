// Private, one-time read-only helper; no runtime, DB, app or production imports.
// Provenance: gravuru-2027 bf5c059f13e0868d7c554616b7c35ff7a328ae62.
// Transport/token/identity checks copied from app/workshop/shopify-admin-readonly.mjs;
// readPrivateFile body copied unchanged from ops/plesk/shopify-preflight.mjs.
// Only two fixed queries are exposed. Never prints token, secret, config or paths.
// Usage (run as the existing app user):
// node audit-cart-transform.mjs --app-root /absolute/actual-app-root --config /absolute/private/gravuru-2027-merchant-shopify.json
// Success prints ONLY [{id,functionId,blockOnFailure},...]; [] means no transforms.
// This does not attest WASM behavior or safe checkout. No scopes are requested.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ADMIN_READONLY_IDENTITY = Object.freeze({shopDomain:'gravuru-design.myshopify.com', clientId:'9640dd7a6907f0c73e7013ea8c24869b',
  appId: 'gid://shopify/App/423276544001', apiVersion: '2026-07'});
const fields = `shop { myshopifyDomain currencyCode plan { partnerDevelopment } }
  currentAppInstallation { app { id } accessScopes { handle } }`;
const installationQuery = `query GravuruInstallationPreflight { ${fields} }`;
class ReadonlyError extends Error {}
export const preflightFailure = code => Object.assign(new ReadonlyError('Shopify-Vorprüfung nicht bestätigt: ' + code), {code, status: 502});
const fail = code => {throw preflightFailure(code);};
const tokenPattern = /^[\x21-\x7e]{16,4096}$/;

// Only fixed GraphQL queries are exposed. No arbitrary query, mutation,
// access token getter, redirect, persistence or automatic HTTP retry.
export function createShopifyAdminReadonly({readSecret}, {fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 20000} = {}) {
  if (typeof readSecret !== 'function' || typeof fetchImpl !== 'function' || typeof now !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail('configuration');
  const {shopDomain, clientId, appId, apiVersion} = ADMIN_READONLY_IDENTITY;
  let cached = null, pending = null;
  async function request(url, options, {limit, version = false}) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs); let reader;
    try {
      const response = await fetchImpl(url, {...options, redirect: 'error', cache: 'no-store', signal: controller.signal});
      if (!response.ok || response.redirected) fail('http_' + response.status);
      if (version && response.headers.get('x-shopify-api-version') !== apiVersion) fail('api_version');
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '') || !response.body) fail('response_format');
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) fail('response_size');
      reader = response.body.getReader(); let size = 0; const chunks = [];
      for (;;) {
        const {done, value} = await reader.read();
        if (controller.signal.aborted) fail('timeout');
        if (done) break;
        size += value.byteLength; if (size > limit) fail('response_size'); chunks.push(Buffer.from(value));
      }
      return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
    } catch (error) {
      if (error instanceof ReadonlyError) throw error;
      fail(controller.signal.aborted ? 'timeout' : 'network_or_response');
    } finally {
      clearTimeout(timer); controller.abort(); if (reader) {try {await reader.cancel();} catch {} reader.releaseLock();}
    }
  }
  async function token() {
    if (cached && now() < cached.refreshAt) return cached.value;
    if (pending) return pending;
    pending = (async () => {
      const started = now(); let secret;
      try {secret = await readSecret();} catch {fail('secret_file');}
      if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(secret)) fail('secret_format');
      const value = await request(`https://${shopDomain}/admin/oauth/access_token`, {method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
        body: new URLSearchParams({grant_type: 'client_credentials', client_id: clientId, client_secret: secret}).toString()}, {limit: 65536});
      if (!tokenPattern.test(value?.access_token || '') || !Number.isInteger(value.expires_in) || value.expires_in < 120 || value.expires_in > 86400 || typeof value.scope !== 'string') fail('token_response');
      const refreshAt = started + value.expires_in * 1000 - 60000;
      if (now() >= refreshAt) fail('token_expired');
      cached = {value: value.access_token, refreshAt}; return cached.value;
    })();
    try {return await pending;} finally {pending = null;}
  }
  async function execute(query, variables) {
    const accessToken = await token(); let result;
    try {
      result = await request(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': accessToken},
        body: JSON.stringify({query, variables})}, {limit: 1048576, version: true});
    } catch (error) {cached = null; throw error;}
    if (!result?.data || result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length)) fail('graphql');
    const {shop, currentAppInstallation: installation} = result.data;
    if (shop?.myshopifyDomain !== shopDomain || installation?.app?.id !== appId || !Array.isArray(installation.accessScopes) || installation.accessScopes.some(s => typeof s?.handle !== 'string' || !/^[a-z_]+$/.test(s.handle)) || typeof shop.plan?.partnerDevelopment !== 'boolean' || !/^[A-Z]{3}$/.test(shop.currencyCode || '')) {cached = null; fail('installation_identity');}
    return {data: result.data, installation: {shopDomain, appId, apiVersion, currency: shop.currencyCode,
      partnerDevelopment: shop.plan.partnerDevelopment, scopes: [...new Set(installation.accessScopes.map(s => s.handle))].sort(),
      scope: 'admin-readonly', merchantLoginVerified: false, customerLoginVerified: false, safeCheckoutVerified: false}};
  }
  return Object.freeze({
    async inspectCartTransforms() {
      // Do not even request the protected resource without an existing grant.
      const {installation:first}=await execute(installationQuery,{});
      if(!first.scopes.some(s=>s==='read_cart_transforms'||s==='write_cart_transforms'))fail('cart_transforms_scope');
      const {data,installation}=await execute(cartTransformsQuery,{});
      if(!installation.scopes.some(s=>s==='read_cart_transforms'||s==='write_cart_transforms'))fail('cart_transforms_scope');
      const result=data.cartTransforms;
      if(!result||!Array.isArray(result.nodes)||result.nodes.length>100||typeof result.pageInfo?.hasNextPage!=='boolean')fail('cart_transforms_response');
      if(result.pageInfo.hasNextPage)fail('cart_transforms_incomplete');
      const seen=new Set();
      return result.nodes.map(row=>{
        if(!/^gid:\/\/shopify\/CartTransform\/[1-9][0-9]{0,19}$/.test(row?.id||'')||seen.has(row.id)||
          typeof row.functionId!=='string'||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.functionId)||
          /^gid:\/\/shopify\/ShopifyFunction\/[A-Za-z0-9_-]{1,100}$/.test(row.functionId))||typeof row.blockOnFailure!=='boolean')fail('cart_transforms_response');
        seen.add(row.id);
        return {id:row.id,functionId:row.functionId,blockOnFailure:row.blockOnFailure};
      });
    }
  });
}

export const cartTransformsQuery=`query GravuruCartTransformReadOnlyAudit {
  ${fields}
  cartTransforms(first:100) { nodes { id functionId blockOnFailure } pageInfo { hasNextPage } }
}`;
export function createPrivateReader(appRoot){
  if(typeof appRoot!=='string'||!path.isAbsolute(appRoot)||path.resolve(appRoot)!==appRoot||appRoot===path.parse(appRoot).root||fs.realpathSync(appRoot)!==appRoot)fail('app_root');
function readPrivateFile(file, limit = 1024, encoding = 'utf8') {
  let fd;
  try {
    if (typeof file !== 'string' || !path.isAbsolute(file) || path.resolve(file) !== file || file === appRoot || file.startsWith(appRoot + path.sep) || fs.realpathSync(file) !== file) throw Error();
    for (let p = path.dirname(file);; p = path.dirname(p)) {
      if (fs.existsSync(path.join(p, '.git'))) throw Error();
      if (path.dirname(p) === p) break;
    }
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid() || stat.mode & 0o077 || stat.size < 1 || stat.size > limit) throw Error();
    return fs.readFileSync(fd, encoding);
  } catch {throw preflightFailure('private_file');}
  finally {if (fd !== undefined) fs.closeSync(fd);}
}

  return readPrivateFile;
}
const configKeys=['GRAVURU_SHOPIFY_APP_ORIGIN','GRAVURU_PRIVATE_DATA_DIR','GRAVURU_SHOPIFY_CLIENT_SECRET_FILE','GRAVURU_SHOPIFY_PYTHON',
 'GRAVURU_SHOPIFY_ORDER_WEBHOOK','GRAVURU_SHOPIFY_TEST_CART','GRAVURU_SHOPIFY_TEST_CART_REVISION','GRAVURU_AI_CONFIG_FILE','GRAVURU_SHOPIFY_DRAFT_TRANSFER'];
export function secretFileFromConfig(text){
 let record;try{record=JSON.parse(text);}catch{fail('merchant_config');}
 if(record?.schema!==1||record.purpose!=='shopify-merchant-test-runtime'||!record.values||typeof record.values!=='object'||Array.isArray(record.values))fail('merchant_config');
 const v=record.values;
 if(Object.keys(v).some(k=>!configKeys.includes(k))||configKeys.slice(0,4).some(k=>typeof v[k]!=='string'||!v[k]||v[k].length>1024))fail('merchant_config');
 if(v.GRAVURU_SHOPIFY_APP_ORIGIN!=='https://app-2027.gravuru-designwerkstatt.de')fail('merchant_config');
 const file=v.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE;
 if(!path.isAbsolute(file)||path.resolve(file)!==file)fail('merchant_config');
 return file;
}
export async function runAudit(args,{privateReaderFactory=createPrivateReader,fetchImpl=globalThis.fetch}={}){
 if(args.length!==4||args[0]!=='--app-root'||args[2]!=='--config')fail('arguments');
 const [appRoot,configFile]=[args[1],args[3]];
 if(!path.isAbsolute(configFile)||path.resolve(configFile)!==configFile||path.basename(configFile)!=='gravuru-2027-merchant-shopify.json'||path.basename(path.dirname(configFile))!=='private')fail('arguments');
 const readPrivateFile=privateReaderFactory(appRoot);
 const secretFile=secretFileFromConfig(readPrivateFile(configFile,16384));
 const client=createShopifyAdminReadonly({readSecret:()=>readPrivateFile(secretFile).trim()},{fetchImpl});
 return client.inspectCartTransforms();
}
export async function main(args,{write=line=>process.stdout.write(line+'\n'),...dependencies}={}){
 try{write(JSON.stringify(await runAudit(args,dependencies)));return 0;}
 catch(error){
  const code=error instanceof ReadonlyError&&/^[a-z_]+(?:_[0-9]{3})?$/.test(error.code||'')?error.code:'cart_transform_audit_failed';
  write(JSON.stringify({ok:false,code}));return 1;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main(process.argv.slice(2));

