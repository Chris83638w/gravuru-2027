import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {merchantConfig, prepareMerchantStorage} from '../../ops/plesk/merchant-config.mjs';
import {createMerchantRuntime} from '../../ops/plesk/merchant-runtime.mjs';
const root = fs.realpathSync(process.argv[2]);
if (!fs.existsSync(path.join(root, '.synthetic-merchant-runtime')) || fs.statSync(root).mode & 0o077) throw Error('Synthetic fixture directory required');
process.umask(0o077);
const key = path.join(root, 'synthetic-key'), file = path.join(root, 'merchant.json');
fs.writeFileSync(key, randomBytes(32).toString('hex'), {mode: 0o600, flag: 'wx'});
fs.writeFileSync(file, JSON.stringify({schema: 1, purpose: 'shopify-merchant-test-runtime', values: {
  GRAVURU_SHOPIFY_APP_ORIGIN: 'https://merchant.example', GRAVURU_PRIVATE_DATA_DIR: path.join(root, 'data'),
  GRAVURU_SHOPIFY_CLIENT_SECRET_FILE: key, GRAVURU_SHOPIFY_PYTHON: process.env.GRAVURU_MERCHANT_TEST_PYTHON
}}), {mode: 0o600, flag: 'wx'});
const env = {GRAVURU_SHOPIFY_CONFIG_FILE: file}; prepareMerchantStorage(merchantConfig(env));
const server = await createMerchantRuntime(env); server.listen(0, '127.0.0.1'); await once(server, 'listening');
fs.writeFileSync(path.join(root, 'ready.json'), JSON.stringify({port: server.address().port, origin: 'https://merchant.example'}));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => {server.close(); server.closeAllConnections(); await server.runtimeClosed;});
