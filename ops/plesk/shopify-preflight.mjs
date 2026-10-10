import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createShopifyAdminReadonly, preflightFailure} from '../../app/workshop/shopify-admin-readonly.mjs';
import {preflightVariantBindings} from '../../app/workshop/shopify-variant-preflight.mjs';
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function readPrivateFile(file, limit = 1024, encoding = 'utf8') {
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
export async function runPreflight(args) {
  if (![2, 4].includes(args.length) || args[0] !== '--secret-file' || args.length === 4 && args[2] !== '--binding-request') throw preflightFailure('arguments');
  // Input validation precedes token exchange. Arguments contain file paths only.
  const secretFile = args[1]; readPrivateFile(secretFile);
  let request;
  if (args.length === 4) {
    try {request = JSON.parse(readPrivateFile(args[3], 8 * 1024 * 1024));} catch {throw preflightFailure('binding_file');}
    if (!request || Object.keys(request).some(k => !['record', 'shopifyProductId', 'mappings'].includes(k))) throw preflightFailure('binding_file');
  }
  const client = createShopifyAdminReadonly({readSecret: () => readPrivateFile(secretFile).trim()});
  if (request) return preflightVariantBindings(request, client);
  return {schema: 'gravuru-shopify-installation-preflight/v1', installation: await client.checkInstallation(),
    bindingSaved: false, checkoutReady: false, published: false};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {const result = await runPreflight(process.argv.slice(2)); console.log(JSON.stringify(result)); if (result.matches === false) process.exitCode = 2;}
  catch (error) {
    // Never pass raw upstream/body/filesystem errors or input values to stdout.
    const code = /^[a-z_]+(?:_[0-9]{3})?$/.test(error.code || '') ? error.code : 'preflight_failed';
    console.log(JSON.stringify({ok: false, code, bindingSaved: false, checkoutReady: false})); process.exitCode = 1;
  }
}
