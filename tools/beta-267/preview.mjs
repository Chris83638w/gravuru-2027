// Isolated acceptance host. All writes use a new in-memory workshop; there is no Shopify transport.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {makeProductDocument} from '../../app/workshop/product-model.mjs';
import {steelSpecimen} from '../../app/workshop/specimen-product.mjs';
import {workshopResources} from '../../app/workshop/catalog.mjs';
import {acrylicArtwork} from '../../app/workshop/acrylic-artwork.mjs';
import {acrylicContourProof,createAcrylicPrintProof} from '../../app/workshop/acrylic-print-proof.mjs';
import {catalogPath,loadDoorbellCatalog, importDecorations, buildDoorbellConfig, resourceCrosswalk} from '../../scripts/import-doorbell-catalog.mjs';
import {loadSlateRegister} from './slate-register.mjs';
import {cartShopDomain,createPreviewCart} from './preview-cart.mjs';

const port = Number(process.argv[2] || 18267);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Ungültiger lokaler Port.');
const catalogRoot = process.env.GRAVURU_KATALOG;
if (!catalogRoot) throw Error('GRAVURU_KATALOG muss auf den geprüften Katalog verweisen.');
const modelKey = 'ring-wired-pro-3-gen-5dfya2-16x28';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gravuru-beta267-'));
const origin = 'http://127.0.0.1:' + port;
build({outputDirectory: directory});
const [seed] = JSON.parse(fs.readFileSync(path.join(directory, 'models.json')));
const temporarySecret=randomBytes(32).toString('hex');
const workshop = createWorkshop({filename: ':memory:', seedConfig: seed.universal, legacy: seed.legacy, katalogDir: null,
  orderWebhook:{shopDomain:cartShopDomain,secret:temporarySecret,apiVersion:'2026-07',mode:'test-only'}});
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
const serveWorkshop = server.listeners('request')[0];
server.removeListener('request', serveWorkshop);
const betaPage = fs.readFileSync(new URL('./preview.html', import.meta.url),'utf8')
  .replace('<!--slate-link-->', products.has('schiefer') ? '<a href="/?produkt=schiefer">Schiefer-Rohling</a>' : '');
const betaClient = fs.readFileSync(new URL('./preview-client.mjs', import.meta.url));
const cartPage=fs.readFileSync(new URL('./preview-cart.html',import.meta.url));
const cartClient=fs.readFileSync(new URL('./preview-cart-client.mjs',import.meta.url));
const variantRows=JSON.parse(fs.readFileSync(catalogPath(catalog.root,entry.variantMatrixRef),'utf8')).variants;
const cartHandler=createPreviewCart({workshop,record:workshop.repository.get(products.get('ring').id),entry,variants:variantRows,origin,secret:temporarySecret});
server.on('request', async (req, res) => {
  const send = (status, type, bytes) => {
    res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'self'; object-src 'none'"}).end(bytes);
  };
  if (req.headers.host !== '127.0.0.1:' + port || (req.headers.origin && req.headers.origin !== origin)
      || req.headers['sec-fetch-site'] === 'cross-site' && req.headers['sec-fetch-mode'] !== 'navigate') {
    return send(403, 'text/plain', 'Lokaler Prüfzugang erforderlich.');
  }
  const url = new URL(req.url, origin);
  if(req.method==='GET'&&url.pathname==='/beta-warenkorb')return send(200,'text/html; charset=utf-8',cartPage);
  if(req.method==='GET'&&url.pathname==='/beta-warenkorb.mjs')return send(200,'text/javascript; charset=utf-8',cartClient);
  if(url.pathname.startsWith('/beta-warenkorb/daten')||url.pathname.startsWith('/gestaltung/'))return cartHandler(req,res,url.pathname,send);
  if (req.method === 'GET' && url.pathname === '/') return send(200, 'text/html; charset=utf-8', betaPage);
  if (req.method === 'GET' && url.pathname === '/favicon.ico') return send(204, 'image/x-icon', '');
  if (req.method === 'GET' && url.pathname === '/beta-client.mjs') return send(200, 'text/javascript; charset=utf-8', betaClient);
  if (req.method === 'GET' && url.pathname === '/beta-produkt') {
    const record = products.get(url.searchParams.get('produkt'));
    return record ? send(200, 'application/json', JSON.stringify(record)) : send(404, 'text/plain', 'Prüfprodukt fehlt.');
  }
  if (req.method === 'GET' && url.pathname === '/beta-datei') {
    // The normal private draft grant is required even on loopback. Resolve the
    // immutable snapshot from the saved revision before returning its files.
    try {
      const draft = workshop.customerDrafts.acrylicDrafts.get(url.searchParams.get('entwurf'), req.headers['x-gravuru-draft']);
      if (draft.revision !== Number(url.searchParams.get('revision'))) return send(409, 'text/plain', 'Entwurfsstand hat sich geändert.');
      const review = workshop.customerDrafts.review(draft.snapshotId).manifest;
      const archive = workshop.customerDrafts.downloadSnapshot(draft.snapshotId, 'package');
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
server.listen(port, '127.0.0.1', () => console.log('Beta bereit ' + origin + '/'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => {
  workshop.close();
  fs.rmSync(directory, {recursive: true, force: true});
}));
