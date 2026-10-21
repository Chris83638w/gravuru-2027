import {readAiDesignConfig} from './ai-design-config.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {APP_ROOT, externalPath} from './config.mjs';
import {readPrivateFile} from './shopify-preflight.mjs';
import {shopifyRuntimeConfig, SHOPIFY_IDENTITY} from '../../app/workshop/shopify-runtime-config.mjs';
import {memorialTestCartSettings} from '../../app/workshop/merchant-test-cart.mjs';

export const MERCHANT_MARKER = '.gravuru-shopify-merchant-test.json';
const webhookKey='GRAVURU_SHOPIFY_ORDER_WEBHOOK';
const cartKey='GRAVURU_SHOPIFY_TEST_CART';
const cartRevisionKey='GRAVURU_SHOPIFY_TEST_CART_REVISION';
const keys = ['GRAVURU_SHOPIFY_APP_ORIGIN', 'GRAVURU_PRIVATE_DATA_DIR', 'GRAVURU_SHOPIFY_CLIENT_SECRET_FILE', 'GRAVURU_SHOPIFY_PYTHON'];
export const merchantFailure = code => Object.assign(Error('Shopify-Händlerstart nicht bestätigt.'), {code});
const fail = code => {throw merchantFailure(code);};
export function merchantConfig(env) {
  if (Number(process.versions.node.split('.')[0]) < 24) fail('merchant_node');
  const file = env.GRAVURU_SHOPIFY_CONFIG_FILE || path.join(path.dirname(APP_ROOT), 'private', path.basename(APP_ROOT) + '-shopify.json');
  let values;
  try {
    externalPath(file, 'Konfiguration');
    const parent = fs.lstatSync(path.dirname(file));
    if (!parent.isDirectory() || parent.uid !== process.getuid() || parent.mode & 0o077) fail('merchant_config');
    const record = JSON.parse(readPrivateFile(file, 16384));
    if (record.schema !== 1 || record.purpose !== 'shopify-merchant-test-runtime' || !record.values || Array.isArray(record.values)) fail('merchant_config');
    values = record.values;
    if (Object.keys(values).some(k=>!keys.includes(k)&&k!==webhookKey&&k!==cartKey&&k!==cartRevisionKey&&k!=='GRAVURU_AI_CONFIG_FILE'&&k!=='GRAVURU_SHOPIFY_DRAFT_TRANSFER') || (values[webhookKey]!==undefined&&values[webhookKey]!=='test-only-2026-07') || (env[webhookKey]!==undefined&&env[webhookKey]!==values[webhookKey]) || keys.some(k => typeof values[k] !== 'string' || !values[k] || values[k].length > 1024 || env[k] !== undefined && env[k] !== values[k])) fail('merchant_config');
    if((values[cartKey]!==undefined&&(values[cartKey]!=='memorial-r2-tokenless-2026-07'||values[webhookKey]!=='test-only-2026-07'||values.GRAVURU_SHOPIFY_APP_ORIGIN!=='https://app-2027.gravuru-designwerkstatt.de'))||(env[cartKey]!==undefined&&env[cartKey]!==values[cartKey]))fail('merchant_config');
    if(values[cartRevisionKey]!==undefined&&(values[cartKey]===undefined||typeof values[cartRevisionKey]!=='string'||! /^[1-9][0-9]*$/.test(values[cartRevisionKey])||!Number.isSafeInteger(Number(values[cartRevisionKey]))||Number(values[cartRevisionKey])<2)||env[cartRevisionKey]!==undefined&&env[cartRevisionKey]!==values[cartRevisionKey])fail('merchant_config');
    if(values.GRAVURU_AI_CONFIG_FILE!==undefined&&(typeof values.GRAVURU_AI_CONFIG_FILE!=='string'||!values.GRAVURU_AI_CONFIG_FILE||values.GRAVURU_AI_CONFIG_FILE.length>1024)||env.GRAVURU_AI_CONFIG_FILE!==undefined&&env.GRAVURU_AI_CONFIG_FILE!==values.GRAVURU_AI_CONFIG_FILE)fail('merchant_config');
    if(values.GRAVURU_SHOPIFY_DRAFT_TRANSFER!==undefined&&values.GRAVURU_SHOPIFY_DRAFT_TRANSFER!=='draft-only'||env.GRAVURU_SHOPIFY_DRAFT_TRANSFER!==undefined&&env.GRAVURU_SHOPIFY_DRAFT_TRANSFER!==values.GRAVURU_SHOPIFY_DRAFT_TRANSFER)fail('merchant_config');
    if (env.GRAVURU_SHOPIFY_CLIENT_SECRET || env.GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN) fail('merchant_config');
    if (env.GRAVURU_SHOPIFY_CLIENT_ID !== undefined && env.GRAVURU_SHOPIFY_CLIENT_ID !== SHOPIFY_IDENTITY.clientId || env.GRAVURU_SHOPIFY_SHOP_DOMAIN !== undefined && env.GRAVURU_SHOPIFY_SHOP_DOMAIN !== SHOPIFY_IDENTITY.shopDomain) fail('merchant_config');
    externalPath(values.GRAVURU_PRIVATE_DATA_DIR, 'Daten');
    const origin = new URL(values.GRAVURU_SHOPIFY_APP_ORIGIN);
    if (['gravuru-designwerkstatt.de', 'www.gravuru-designwerkstatt.de', 'gravuru.highspeed.cloud'].includes(origin.hostname)) fail('merchant_config');
    const python = values.GRAVURU_SHOPIFY_PYTHON;
    if (!path.isAbsolute(python) || path.resolve(python) !== python) fail('merchant_config');
    fs.accessSync(python, fs.constants.X_OK);
  } catch {fail('merchant_config');}
  let secret;
  try {secret = readPrivateFile(values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE).trim();} catch {fail('merchant_secret_file');}
  const runtimeEnv = {GRAVURU_SHOPIFY_APP_ORIGIN: values.GRAVURU_SHOPIFY_APP_ORIGIN,
    GRAVURU_PRIVATE_DATA_DIR: values.GRAVURU_PRIVATE_DATA_DIR, GRAVURU_SHOPIFY_CLIENT_SECRET: secret,...(values.GRAVURU_SHOPIFY_DRAFT_TRANSFER?{GRAVURU_SHOPIFY_DRAFT_TRANSFER:values.GRAVURU_SHOPIFY_DRAFT_TRANSFER}:{})};
  let runtime; try {runtime = shopifyRuntimeConfig(runtimeEnv);} catch {fail('merchant_config');}
  return {data: runtime.dataDirectory, origin: runtime.embeddedApp.origin, host: new URL(runtime.embeddedApp.origin).host,
    python: values.GRAVURU_SHOPIFY_PYTHON, runtime, runtimeEnv, aiDesign:readAiDesignConfig(values.GRAVURU_AI_CONFIG_FILE),
    merchantTestCart:values[cartKey]===undefined?null:memorialTestCartSettings(values[cartRevisionKey]===undefined?2:Number(values[cartRevisionKey])),
    orderWebhook:values[webhookKey]===undefined?null:{mode:'test-only',apiVersion:'2026-07',shopDomain:SHOPIFY_IDENTITY.shopDomain,secret}};
}
const markerFor = c => ({schema: 1, purpose: 'shopify-merchant-test-data', origin: c.origin});
export function verifyMerchantStorage(config) {
  try {
    externalPath(config.data, 'Daten');
    const stat = fs.lstatSync(config.data);
    if (!stat.isDirectory() || stat.uid !== process.getuid() || stat.mode & 0o077) fail('merchant_storage');
    if (JSON.stringify(JSON.parse(readPrivateFile(path.join(config.data, MERCHANT_MARKER)))) !== JSON.stringify(markerFor(config))) fail('merchant_storage');
    for (const entry of fs.readdirSync(config.data, {withFileTypes: true})) {
      if (entry.name !== MERCHANT_MARKER && !/^(?:(workshop|profiles|design-assets)\.sqlite(?:-(?:wal|shm|journal))?|\.runtime\.lock|approved-customer-preview\.json)$/.test(entry.name)) fail('merchant_storage');
      const s = fs.lstatSync(path.join(config.data, entry.name));
      if (!s.isFile() || s.isSymbolicLink() || s.uid !== process.getuid() || s.mode & 0o077) fail('merchant_storage');
    }
  } catch {fail('merchant_storage');}
}
export function checkMerchantPython(config) {
  const r = spawnSync(config.python, ['-I', '-c', 'import sys,sqlite3,fcntl,cairosvg,PIL,openpyxl,fontTools,pymupdf,shapely,svgpathtools,numpy,scipy; assert sys.version_info >= (3,11); assert cairosvg.svg2pdf(bytestring=b\'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>\').startswith(b"%PDF"); print("GRAVURU_MERCHANT_PYTHON_OK")'], {encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
  if (r.status !== 0 || r.error || r.stdout.trim() !== 'GRAVURU_MERCHANT_PYTHON_OK') fail('merchant_python');
}
export function prepareMerchantStorage(config) {
  // Validate the installed interpreter first. Never install into or alter it.
  checkMerchantPython(config);
  if (fs.existsSync(config.data) && fs.readdirSync(config.data).length) {verifyMerchantStorage(config); return;}
  if (!fs.existsSync(config.data)) fs.mkdirSync(config.data, {mode: 0o700});
  const s = fs.lstatSync(config.data);
  if (!s.isDirectory() || s.isSymbolicLink() || s.uid !== process.getuid() || s.mode & 0o077) fail('merchant_storage');
  fs.writeFileSync(path.join(config.data, MERCHANT_MARKER), JSON.stringify(markerFor(config)) + '\n', {flag: 'wx', mode: 0o600});
  verifyMerchantStorage(config);
}
