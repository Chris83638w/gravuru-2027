import http from 'node:http';
import net from 'node:net';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import {createShopifyTestRuntime} from '../../app/workshop/shopify-admin-test-server.mjs';
import {createShopifySessionVerifier} from '../../app/workshop/shopify-session.mjs';
import {merchantConfig, verifyMerchantStorage} from './merchant-config.mjs';
import {ORDER_WEBHOOK_PATH} from '../../app/workshop/shopify-order-webhook.mjs';
import {lockTestData} from './lock.mjs';

// Separate authenticated merchant runtime. Optional signed test-order input and
// explicitly pinned merchant test cart; public checkout remains disabled.
export async function createMerchantRuntime(env,{aiDesign:aiDesignOverride}={}) {
  const config = merchantConfig(env); verifyMerchantStorage(config);
  process.umask(0o077); process.env.GRAVURU_PYTHON = config.python; delete process.env.PYTHONPATH;
  const lock = await lockTestData(config), released = once(lock, 'exit'); let inner,orderWebhookHandler;
  try {
    const merchantCsrfToken = createHmac('sha256', config.runtime.shopifySessions.secret)
      .update(JSON.stringify(['gravuru-merchant-test-csrf/v1', config.origin, config.runtime.shopifySessions.clientId])).digest('hex');
    ({server: inner,orderWebhookHandler} = createShopifyTestRuntime(config.runtimeEnv, {merchantCsrfToken,orderWebhook:config.orderWebhook,merchantTestCart:config.merchantTestCart,aiDesign:aiDesignOverride??config.aiDesign}));
    inner.once('close', () => lock.stdin.end());
    // Only the outer server may be claimed by LiteSpeed/Passenger.
    inner.address = net.Server.prototype.address;
    net.Server.prototype.listen.call(inner, 0, '127.0.0.1'); await once(inner, 'listening');
    if (lock.exitCode !== null || lock.signalCode !== null) throw Error('Händler-Datensperre verloren.');
  } catch (error) {inner?.close(); lock.stdin.end(); await released; throw error;}
  const port = inner.address().port, verify = createShopifySessionVerifier(config.runtime.shopifySessions);
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
    const reject = status => res.writeHead(status).end();
    if (req.headers.host !== config.host || req.headers['x-forwarded-proto'] !== 'https' || !req.url.startsWith('/') || req.url.startsWith('//')) return reject(403);
    let pathname; try {pathname = decodeURIComponent(new URL(req.url, config.origin).pathname);} catch {return reject(400);}
    if (pathname===ORDER_WEBHOOK_PATH) {
      if(!orderWebhookHandler)return reject(404);
      return void orderWebhookHandler(req,res);
    }
    if (pathname.startsWith('/api/workshop/') || pathname === '/__shopify/health') {
      try {verify(req.headers.authorization, 'merchant');} catch {return reject(401);}
    }
    if (pathname === '/__shopify/health') {
      if (!['GET', 'HEAD'].includes(req.method)) return reject(405);
      if (req.headers.origin && req.headers.origin !== config.origin || req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) return reject(403);
      res.setHeader('Content-Type', 'application/json');
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ready: true, scope: 'shopify-merchant-test', shopMutationsEnabled: false, checkoutEnabled: false, merchantTestCartEnabled:Boolean(config.merchantTestCart), orderWebhookEnabled:Boolean(orderWebhookHandler)}));
    }
    const headers = {host: config.host};
    for (const name of ['authorization', 'accept', 'accept-language', 'content-type', 'content-length', 'origin', 'x-gravuru-csrf', 'x-gravuru-draft', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest']) if (req.headers[name] !== undefined) headers[name] = req.headers[name];
    const upstream = http.request({hostname: '127.0.0.1', port, path: req.url, method: req.method, headers}, response => {
      res.writeHead(response.statusCode, {...response.headers, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive'}); response.pipe(res);
    });
    upstream.setTimeout(120000, () => upstream.destroy());
    upstream.on('error', () => {if (!res.headersSent) reject(502); else res.destroy();});
    req.on('aborted', () => upstream.destroy()); res.on('close', () => {if (!res.writableFinished) upstream.destroy();}); req.pipe(upstream);
  });
  server.once('close', () => {inner.close(); inner.closeAllConnections();});
  lock.once('exit', () => {server.close(); server.closeAllConnections(); inner.close(); inner.closeAllConnections();});
  server.runtimeClosed = released;
  return server;
}
