// Isolated acceptance host. All writes use a new in-memory workshop; there is no Shopify transport.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createReviewCart} from './review-cart.mjs';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {makeProductDocument} from '../../app/workshop/product-model.mjs';
import {steelSpecimen} from '../../app/workshop/specimen-product.mjs';
import {workshopResources} from '../../app/workshop/catalog.mjs';
import {acrylicArtwork} from '../../app/workshop/acrylic-artwork.mjs';
import {acrylicContourProof,createAcrylicPrintProof} from '../../app/workshop/acrylic-print-proof.mjs';
import {loadDoorbellCatalog, importDecorations, buildDoorbellConfig, resourceCrosswalk} from '../../scripts/import-doorbell-catalog.mjs';
import {loadSlateRegister} from './slate-register.mjs';

const requestedPort = Number(process.argv[2] || 18267);
const proxyKey = process.env.GRAVURU_BETA_PROXY_KEY;
const assignedPort = requestedPort === 0 && !!proxyKey;
if (!Number.isInteger(requestedPort) || !assignedPort && requestedPort < 1024 || requestedPort > 65535) throw Error('Ungültiger lokaler Port.');
const catalogRoot = process.env.GRAVURU_KATALOG;
if (!catalogRoot) throw Error('GRAVURU_KATALOG muss auf den geprüften Katalog verweisen.');
const modelKey = 'ring-wired-pro-3-gen-5dfya2-16x28';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gravuru-beta267-'));
build({outputDirectory: directory});
const [seed] = JSON.parse(fs.readFileSync(path.join(directory, 'models.json')));
const csrfToken = randomBytes(32).toString('hex');
const workshop = createWorkshop({filename: ':memory:', seedConfig: seed.universal, legacy: seed.legacy, katalogDir: null, operatorCsrfToken:csrfToken});
const catalog = loadDoorbellCatalog(path.join(catalogRoot, 'migrationen/funkklingeln-42x3-20261027'));
const entry = catalog.entries.find(item => item.modelKey === modelKey && item.formatKey === '16x28');
const model = catalog.manifest.models.find(item => item.key === modelKey);
const library = resourceCrosswalk(catalog, workshopResources());
const {native} = await importDecorations(catalog.bundles.get(modelKey), workshop.assets);
const ring = buildDoorbellConfig(native, entry, {fontIds: library.fonts, motifIds: library.motifs, imageSha256: model.image.sha256});
const products = new Map();
function addProduct(key, config) {
  const record = workshop.repository.create(makeProductDocument(config, {kind: 'product', name: config.profile.name}));
  products.set(key, {id: record.id, revision: record.revision});
}
addProduct('ring', ring);
addProduct('heimathafen', await steelSpecimen(workshop.assets));
addProduct('acryl', seed.universal);
if (process.env.GRAVURU_SCHIEFERREGISTER) {
  const {source,productFor} = loadSlateRegister(process.env.GRAVURU_SCHIEFERREGISTER);
  const blank = source.tafeln.find(row=>row.id==='SL-21');
  const slate = productFor(blank);
  slate.profile.name='Naturschiefer 30 × 20 cm · Prüfrohling';
  addProduct('schiefer',slate);
}
const server = createPreviewServer({outputDirectory: directory, workshop});
const reviewCart = createReviewCart(workshop,products);
const serveWorkshop = server.listeners('request')[0];
server.removeListener('request', serveWorkshop);
const betaPage = fs.readFileSync(new URL('./preview.html', import.meta.url),'utf8')
  .replace('<!--slate-link-->', products.has('schiefer') ? '<a href="/?produkt=schiefer">Schiefer-Rohling</a>' : '');
const betaClient = fs.readFileSync(new URL('./preview-client.mjs', import.meta.url));
server.on('request', async (req, res) => {
  const send = (status, type, bytes) => {
    res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'self'; object-src 'none'"}).end(bytes);
  };
  const port = server.address().port;
  const origin = 'http://127.0.0.1:' + port;
  if (proxyKey && req.headers['x-beta-gateway'] !== proxyKey) return send(403, 'text/plain', 'Geschützter Prüfzugang erforderlich.');
  if (req.headers.host !== '127.0.0.1:' + port || (req.headers.origin && req.headers.origin !== origin)
      || req.headers['sec-fetch-site'] === 'cross-site' && req.headers['sec-fetch-mode'] !== 'navigate') {
    return send(403, 'text/plain', 'Lokaler Prüfzugang erforderlich.');
  }
  const url = new URL(req.url, origin);
  if (['GET','HEAD'].includes(req.method) && ['/','/beta/cart'].includes(url.pathname)) return send(200, 'text/html; charset=utf-8', req.method === 'HEAD' ? '' : betaPage);
  if (req.method === 'GET' && url.pathname === '/favicon.ico') return send(204, 'image/x-icon', '');
  if (req.method === 'GET' && url.pathname === '/beta-client.mjs') return send(200, 'text/javascript; charset=utf-8', betaClient);
  if (url.pathname === '/beta-warenkorb') {
    try {
      const key = req.headers['x-beta-cart'];
      if (req.method === 'GET') return send(200,'application/json',JSON.stringify(reviewCart.view(key)));
      if (req.method !== 'POST' || req.headers['x-gravuru-csrf'] !== csrfToken) return send(403,'text/plain','Prüfsitzung fehlt.');
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4096) return send(413,'text/plain','Angaben zu umfangreich.');
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      return send(200,'application/json',JSON.stringify(reviewCart.submit(key,body,req.headers['x-gravuru-draft'])));
    } catch (error) { return send(error.status || 422,'text/plain; charset=utf-8',error.message); }
  }
  if (req.method === 'GET' && url.pathname === '/beta-produkt') {
    const record = products.get(url.searchParams.get('produkt'));
    return record ? send(200, 'application/json', JSON.stringify(record)) : send(404, 'text/plain', 'Prüfprodukt fehlt.');
  }
  if (req.method === 'GET' && url.pathname === '/beta-datei') {
    // The normal private draft grant is required even on loopback. Resolve the
    // immutable snapshot from the saved revision before returning its files.
    try {
      const revision = Number(url.searchParams.get('revision'));
      let snapshotId;
      if (url.searchParams.has('config')) {
        snapshotId = reviewCart.snapshot(req.headers['x-beta-cart'],url.searchParams.get('config'),revision);
      } else {
        const draft = workshop.customerDrafts.acrylicDrafts.get(url.searchParams.get('entwurf'),req.headers['x-gravuru-draft']);
        if (draft.revision !== revision) return send(409,'text/plain','Entwurfsstand hat sich geändert.');
        snapshotId = draft.snapshotId;
      }
      const review = workshop.customerDrafts.review(snapshotId).manifest;
      const archive = workshop.customerDrafts.downloadSnapshot(snapshotId,'package');
      const format = url.searchParams.get('format');
      if (format === 'zip') return send(200, 'application/zip', archive);
      if (format === 'kontur') return send(200, 'application/pdf', await acrylicContourProof(archive, review.packageSha256));
      if (format === 'druck' && review.product.method === 'print') {
        const {pdf} = await createAcrylicPrintProof(archive,review.packageSha256);
        return send(200,'application/pdf',pdf);
      }
      if (format === 'svg') {
        const artwork = await acrylicArtwork(archive, review.packageSha256, {engraving: review.product.method === 'engraving'});
        return send(200, 'image/svg+xml', artwork.svg);
      }
      return send(404, 'text/plain', 'Dateityp fehlt.');
    } catch (error) { return send(error.status || 422, 'text/plain; charset=utf-8', 'Prüfdatei konnte nicht freigegeben werden.'); }
  }
  return serveWorkshop(req, res);
});
server.listen(requestedPort, '127.0.0.1', () => {
  const port = server.address().port;
  if (process.send) process.send({port});
  else console.log('Beta bereit http://127.0.0.1:' + port + '/');
});
for (const signal of ['SIGINT', 'SIGTERM', 'disconnect']) process.once(signal, () => server.close(() => {
  workshop.close();
  fs.rmSync(directory, {recursive: true, force: true});
}));
