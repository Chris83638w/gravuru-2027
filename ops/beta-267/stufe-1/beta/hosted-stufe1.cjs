// The protected review site has a separate OS account and no Shopify integration.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {fork} = require('node:child_process');
const {createHash, randomBytes, timingSafeEqual} = require('node:crypto');

const domain = 'konfi-beta.gravuru-designwerkstatt.de';
const origin = 'https://' + domain;
const root = path.resolve(__dirname, '../..');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'private/access.json'), 'utf8'));
if (!Array.isArray(tokens) || !tokens.length || !tokens.every(hash => /^[a-f0-9]{64}$/.test(hash))) {
  throw Error('Gültige Beta-Zugänge fehlen.');
}
const digests = tokens.map(hash => Buffer.from(hash, 'hex'));
const gatewayKey = randomBytes(32).toString('hex');
const worker = fork(path.join(__dirname,'preview.mjs'), ['0'], {
  cwd:root, stdio:['ignore','inherit','inherit','ipc'], execArgv:[],
  env:{
    PATH:process.env.PATH, HOME:process.env.HOME, LANG:'C.UTF-8', NODE_ENV:'production',
    GRAVURU_KATALOG:path.join(root,'katalog'), GRAVURU_SCHIEFERREGISTER:path.join(root,'schiefer-original.json'),
    GRAVURU_PYTHON:path.join(root,'venv/bin/python'), GRAVURU_BETA_PROXY_KEY:gatewayKey, GRAVURU_BETA_DATA:path.join(root,'private/data')
  }
});
let workerPort;
worker.once('message', message => {
  if (Number.isInteger(message.port) && message.port > 0 && message.port <= 65535) workerPort = message.port;
});
worker.once('exit', () => { workerPort = null; process.exit(1); });
for (const signal of ['SIGINT','SIGTERM','exit']) process.once(signal, () => worker.kill());

function customerRoute(method, pathname) {
  const read = method === 'GET' || method === 'HEAD';
  if (!pathname.startsWith('/api/')) {
    if (pathname === '/beta-warenkorb') return ['GET','POST'].includes(method);
    if (pathname === '/beta-warenkorb/entfernen') return method === 'POST';
    if (!read) return false;
    return ['/', '/beta/cart', '/beta/dateien','/beta-vorschau','/favicon.ico', '/beta-client.mjs', '/beta-produkt', '/beta-datei', '/editor.html', '/models.json','/assistant.js','/workshop/theme-limits.mjs','/workshop/process-profiles.mjs'].includes(pathname)
      || /^\/(?:_runtime|_bundle|acrylic-assets|doorbell-assets|configurator|platform)\//.test(pathname)
      || /^\/workshop-ui\/(?:editor-icons|material-surfaces)\//.test(pathname);
  }
  if (read && ['/api/workshop/session','/api/guides'].includes(pathname)) return true;
  if (read && /^\/api\/workshop\/(?:design-assets|contours)\/[a-f0-9]{64}\/preview\.svg$/.test(pathname)) return true;
  if (pathname === '/api/workshop/acrylic-drafts') return method === 'POST';
  if (/^\/api\/workshop\/acrylic-drafts\/adraft_[a-f0-9-]{36}$/.test(pathname)) return method === 'GET' || method === 'POST';
  if (method === 'POST' && ['/api/workshop/customer-vector-logo/preview','/api/workshop/motif-search-events'].includes(pathname)) return true;
  if (read && /^\/api\/workshop\/cart-configurations\/konfig_[a-f0-9-]{36}\/\d+(?:\/photos\/[\w-]+)?$/.test(pathname)) return true;
  return false;
}

const site = http.createServer((req,res) => {
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','private, no-store');
  const fail = (code, message) => res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8'}).end(message);
  if (req.headers.host?.toLowerCase() !== domain) return fail(403,'Beta-Adresse erforderlich.');
  const digest = createHash('sha256').update(req.headers.authorization || '').digest();
  if (!digests.some(known => timingSafeEqual(known,digest))) {
    res.setHeader('WWW-Authenticate','Basic realm="Gravuru R15 Beta", charset="UTF-8"');
    return fail(401,'Anmeldung für die R15-Beta erforderlich.');
  }
  if (req.headers.origin && req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site' && req.headers['sec-fetch-mode'] !== 'navigate') return fail(403,'Aufruf aus der Beta erforderlich.');
  let url;
  try { url = new URL(req.url,origin); } catch { return fail(400,'Ungültige Adresse.'); }
  if (url.origin === origin && url.pathname.startsWith('/variante-c/')) return require('./variante-c-test/versuch.cjs')(req,res,url);
  if (url.origin === origin && url.pathname === '/prio-stufe-1/') return require('./prio-claude-stufe1/einstieg.cjs')(req,res,url);
  if (url.origin === origin && url.pathname === '/prio-pruefung.html' && ['GET','HEAD'].includes(req.method)) {
    let page;
    try { page = fs.readFileSync(path.join(root,'prio-pruefung.html')); }
    catch { return fail(404,'Prüfeinstieg fehlt.'); }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':page.length,'Vary':'Authorization',
      'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});
    return res.end(req.method === 'HEAD' ? undefined : page);
  }
  if (url.origin !== origin || !customerRoute(req.method,url.pathname)) return fail(404,'Prüfseite fehlt.');
  if (!workerPort) {res.setHeader('Retry-After','3');return fail(503,'Die Testumgebung startet.');}
  const headers = {'x-beta-gateway':gatewayKey};
  for (const key of ['content-type','content-length','accept','accept-encoding','x-gravuru-csrf','x-gravuru-draft','x-beta-cart']) {
    if (req.headers[key]) headers[key] = req.headers[key];
  }
  if (req.headers.origin) headers.origin = 'http://127.0.0.1:' + workerPort;
  const upstream = http.request({hostname:'127.0.0.1',port:workerPort,path:url.pathname+url.search,method:req.method,headers}, response => {
    const safeHeaders = {};
    for (const key of ['content-type','content-length','content-encoding','content-disposition','content-security-policy','vary','retry-after']) {
      if (response.headers[key] !== undefined) safeHeaders[key] = response.headers[key];
    }
    safeHeaders['cache-control'] = (response.headers['cache-control'] || 'no-store').replace(/\bpublic\b/i,'private');
    safeHeaders.vary = [safeHeaders.vary,'Authorization'].filter(Boolean).join(', ');
    res.writeHead(response.statusCode,safeHeaders);
    response.on('error', () => res.destroy());
    response.pipe(res);
  });
  upstream.on('error', () => res.headersSent ? res.destroy() : fail(503,'Der Prüfstand startet neu.'));
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
});
site.listen(process.env.PORT || 3000);
