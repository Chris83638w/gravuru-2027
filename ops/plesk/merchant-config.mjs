import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {APP_ROOT, externalPath} from './config.mjs';
import {readPrivateFile} from './shopify-preflight.mjs';
import {shopifyRuntimeConfig, SHOPIFY_IDENTITY} from '../../app/workshop/shopify-runtime-config.mjs';

export const MERCHANT_MARKER = '.gravuru-shopify-merchant-test.json';
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
    if (Object.keys(values).length !== keys.length || keys.some(k => typeof values[k] !== 'string' || !values[k] || values[k].length > 1024 || env[k] !== undefined && env[k] !== values[k])) fail('merchant_config');
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
    GRAVURU_PRIVATE_DATA_DIR: values.GRAVURU_PRIVATE_DATA_DIR, GRAVURU_SHOPIFY_CLIENT_SECRET: secret};
  let runtime; try {runtime = shopifyRuntimeConfig(runtimeEnv);} catch {fail('merchant_config');}
  return {data: runtime.dataDirectory, origin: runtime.embeddedApp.origin, host: new URL(runtime.embeddedApp.origin).host,
    python: values.GRAVURU_SHOPIFY_PYTHON, runtime, runtimeEnv};
}
const markerFor = c => ({schema: 1, purpose: 'shopify-merchant-test-data', origin: c.origin});
export function verifyMerchantStorage(config) {
  try {
    externalPath(config.data, 'Daten');
    const stat = fs.lstatSync(config.data);
    if (!stat.isDirectory() || stat.uid !== process.getuid() || stat.mode & 0o077) fail('merchant_storage');
    if (JSON.stringify(JSON.parse(readPrivateFile(path.join(config.data, MERCHANT_MARKER)))) !== JSON.stringify(markerFor(config))) fail('merchant_storage');
    for (const entry of fs.readdirSync(config.data, {withFileTypes: true})) {
      if (entry.name !== MERCHANT_MARKER && !/^(?:(workshop|profiles|design-assets)\.sqlite(?:-(?:wal|shm|journal))?|\.runtime\.lock)$/.test(entry.name)) fail('merchant_storage');
      const s = fs.lstatSync(path.join(config.data, entry.name));
      if (!s.isFile() || s.isSymbolicLink() || s.uid !== process.getuid() || s.mode & 0o077) fail('merchant_storage');
    }
  } catch {fail('merchant_storage');}
}
export function checkMerchantPython(config) {
  const r = spawnSync(config.python, ['-I', '-c', 'import sys,sqlite3,fcntl,cairosvg,PIL,openpyxl,pymupdf,shapely,svgpathtools,numpy,scipy; assert sys.version_info >= (3,11); assert cairosvg.svg2pdf(bytestring=b\'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>\').startswith(b"%PDF"); print("GRAVURU_MERCHANT_PYTHON_OK")'], {encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024});
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
