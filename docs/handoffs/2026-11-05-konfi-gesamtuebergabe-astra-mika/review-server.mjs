// Nur lokale Bedienvorschau, keine Shopify-/Werkstatt-Schreibschnittstelle.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {OUTPUT, LAZY} from '../../../app/configurator/variant-m/build.mjs';
import {fontFileName} from '../../../app/configurator/variant-m/lazy-resources-model.mjs';
import {createPreviewServer} from '../../../app/configurator/variant-m/server.mjs';
import {productPreview} from '../../../app/workshop/product-preview.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const port = Number(option('--port', '8193'));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Ungültiger lokaler Port.');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const source = read(path.join(here, 'review-snapshot.json'));
const requirements = read(path.join(here, 'source-manifest.json'));
const fontPath = option('--fonts-config', process.env.GRAVURU_REVIEW_FONTS_CONFIG);
const supplied = fontPath ? read(path.resolve(fontPath)) : {};
const fontPool = supplied.localResources?.fonts || supplied.fonts || supplied;
const missing = [];
for (const [name, hash] of Object.entries(requirements.requiredFonts)) {
  let font = fontPool[name];
  if (!font) {
    try { font = read(path.join(LAZY, 'schriften', fontFileName(name))); } catch {}
  }
  if (!font || createHash('sha256').update(JSON.stringify(font)).digest('hex') !== hash) missing.push(name);
  else source.localResources.fonts[name] = font;
}
if (missing.length) throw Error('Original-Schriftkonturen fehlen oder weichen ab: ' + missing.join(', ') + '. Siehe README, --fonts-config. Keine Ersatzschrift wird eingesetzt.');
if (!fs.existsSync(path.join(OUTPUT, 'models.json'))) throw Error('Zuerst npm run build im Repository ausführen.');
const seed = read(path.join(OUTPUT, 'models.json'))[0];
const designs = source.profile.designs;
const binding = {productId:'local-door-sign', productRevision:1, shopifyProductId:'local-product', shopifyVariantId:'local-variant'};
function modelFor(id) {
  const universal = structuredClone(source);
  const design = designs.find(d => d.id === id) || designs.find(d => d.name.includes('Leuchtturm')) || designs[0];
  universal.localResources.motifs = universal.localResources.motifs.filter(m => design.objects.some(o => o.motif === m.key));
  universal.localResources.fonts = Object.fromEntries(Object.entries(universal.localResources.fonts).filter(([name]) => design.objects.some(o => o.font === name)));
  delete universal.familyFormats;
  universal.profile.optionGroups = universal.profile.optionGroups.filter(g => g.id !== 'size');
  universal.profile.designs = [design];
  universal.profile.defaultDesignId = design.id;
  const legacy = structuredClone(seed.legacy);
  legacy.designs = [design]; legacy.defaultDesignId = design.id;
  return {key:'acryl', configuration:{id:binding.productId, revision:1}, name:universal.profile.name, legacy, universal};
}
const server = createPreviewServer({outputDirectory:OUTPUT});
const base = server.listeners('request')[0];
server.removeAllListeners('request');
server.on('request', (req, res) => {
  if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host)) return res.writeHead(403).end();
  if (req.method !== 'GET') return res.writeHead(405).end();
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const send = (type, body) => {
    const zipped = gzipSync(body);
    res.writeHead(200, {'Content-Type':type, 'Content-Encoding':'gzip', 'Content-Length':zipped.length, 'Cache-Control':'no-store'}).end(zipped);
  };
  try {
    if (url.pathname === '/review') return send('text/html; charset=utf-8', fs.readFileSync(path.join(here, 'review.html')));
    if (url.pathname === '/review-model.json') return send('application/json', JSON.stringify({model:modelFor(url.searchParams.get('design')), binding, editorPath:'/editor.html'}));
    if (url.pathname === '/review-gallery.json') {
      const page = Number(url.searchParams.get('page') || 0);
      if (!Number.isInteger(page) || page < 0) return res.writeHead(400).end();
      return send('application/json', JSON.stringify({items:designs.slice(page*40, page*40+40).map(d => ({designId:d.id, designName:d.name, target:d.id, current:false, widthMm:120, heightMm:80, unitCents:1999})), total:designs.length, nextPage:(page+1)*40 < designs.length ? page+1 : null, hasTheme:false}));
    }
    if (url.pathname === '/review-preview.svg') {
      const model = modelFor(url.searchParams.get('design'));
      return send('image/svg+xml', productPreview(model, {designId:model.universal.profile.defaultDesignId}));
    }
    if (/^\/review-ui\/[a-z-]+\.mjs$/.test(url.pathname)) {
      const file = path.join(root, 'app/workshop/ui', url.pathname.split('/').pop());
      if (fs.existsSync(file)) return send('text/javascript', fs.readFileSync(file));
    }
    return base(req, res);
  } catch (error) { console.error(error.message); return res.writeHead(500).end('Lokale Vorschau fehlgeschlagen.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Lokale Bedienvorschau: http://127.0.0.1:${port}/review (${designs.length} archivierte Designs, keine Bestellung)`));
