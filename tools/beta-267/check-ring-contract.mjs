// Compare the model actually served by the isolated beta with the original catalog.
// Read-only. No Shopify IDs, shop secrets, customer data or file bodies are reported.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {quote, variantCombinations} from '../../app/configurator/variant-m/contract.mjs';
import {closedDoorbellCut, doorbellSeparations} from '../../app/workshop/doorbell-artwork.mjs';
import {contourPathBounds} from '../../app/workshop/contour-path.mjs';
import {catalogPath, loadDoorbellCatalog} from '../../scripts/import-doorbell-catalog.mjs';

const port = Number(process.argv[2] || 18267);
assert.ok(Number.isInteger(port) && port > 1023 && port < 65536, 'Lokaler Port erforderlich');
assert.ok(process.env.GRAVURU_KATALOG, 'GRAVURU_KATALOG ist erforderlich');
const origin = 'http://127.0.0.1:' + port;
async function readLocal(route) {
  const response = await fetch(origin + route, {redirect: 'error'});
  assert.equal(response.status, 200, route);
  return response.json();
}
const handle = 'klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert';
const catalog = loadDoorbellCatalog(path.join(process.env.GRAVURU_KATALOG, 'migrationen/funkklingeln-42x3-20261027'));
const entry = catalog.entries.find(product => product.handle === handle);
assert.ok(entry, 'Referenzprodukt fehlt im Katalog');
const catalogModel = catalog.manifest.models.find(model => model.key === entry.modelKey);
assert.equal(entry.variantMatrixRef, catalogModel.legacyVariantMatrix);
const matrixBytes = readFileSync(catalogPath(catalog.root, entry.variantMatrixRef));
const matrix = JSON.parse(matrixBytes);
assert.equal(matrix.modelKey, entry.modelKey);
const source = catalog.bundles.get(entry.modelKey);
const key = ({format, color, frame, mounting}) => JSON.stringify([format, color, frame, mounting]);
const expected = new Map(matrix.variants.map(row => [key({...row, format: row.formatKey}), row.priceCents]));
assert.equal(expected.size, matrix.variants.length, 'Doppelte Katalogausführung');

const record = await readLocal('/beta-produkt?produkt=ring');
const [model] = await readLocal('/models.json?' + new URLSearchParams({configuration: record.id, revision: record.revision}));
assert.equal(model.configuration.id, record.id);
assert.equal(model.configuration.revision, record.revision);
const config = model.universal;
assert.equal(config.doorbell.modelKey, source.modelKey);
assert.equal(config.profile.defaultDesignId, entry.defaults.designId);
assert.equal(config.doorbell.defaultFormatKey, entry.formatKey);
const combinations = variantCombinations(config);
assert.deepEqual(new Set(combinations.map(key)), new Set(expected.keys()), 'Fehlende oder zusätzliche Ausführungen');
assert.equal(combinations.length, expected.size);
const positions = entry.allPositionKeys;
const quantities = [1, 3];
const availableDesigns = new Map();
for (const format of source.doorbell.formats) {
  const served = config.doorbell.formats.find(item => item.key === format.key);
  const ids = format.profile.designs.map(design => design.id);
  assert.deepEqual(served.profile.designs.map(design => design.id), ids, format.key);
  availableDesigns.set(format.key, served.profile.designs);
}
let quotesChecked = 0, layerPairs = 0;
const close = (a, b) => Math.abs(a - b) < 0.01;
function assertBox(actual, expected) {
  assert.deepEqual(actual.length, 4);
  assert.ok(actual.every((value, index) => close(value, expected[index])), JSON.stringify({actual, expected}));
}
for (const options of combinations) {
  const sourceFormat = source.doorbell.formats.find(format => format.key === options.format).profile;
  const {width, height, bell, cutPaths} = sourceFormat.geometry;
  const deviceBounds = cutPaths.map(path => contourPathBounds(closedDoorbellCut(path)));
  const frame = sourceFormat.frames.find(item => item.key === options.frame).acrylic;
  for (const position of positions) {
    const selection = {...options, position};
    const layers = doorbellSeparations(config, selection);
    assert.equal(layers.stock.width, sourceFormat.geometry.width);
    assert.equal(layers.stock.height, sourceFormat.geometry.height);
    const sourceHoles = sourceFormat.mounting.holes;
    const withScrews = sourceFormat.mounting.options.find(value => value.key === options.mounting).visibleScrews;
    const steelHoles = layers.steel.paths.filter(item => item.role === 'mounting-hole');
    assert.equal(steelHoles.length, withScrews ? sourceHoles.length : 0);
    for (const {boundsMm: [x, y, width, height]} of steelHoles) {
      assert.ok(sourceHoles.some(hole => close(hole.x, x + width / 2) && close(hole.y, y + height / 2)));
      assert.ok(close(width, sourceFormat.mounting.holeDiameterMm) && close(height, sourceFormat.mounting.holeDiameterMm));
    }
    const dx = position === 'opposite' ? width - 2 * bell.x - bell.width : 0;
    const dy = position === 'opposite' ? height - 2 * bell.y - bell.height : 0;
    for (const material of [layers.steel, layers.acrylic]) {
      const cuts = material.paths.filter(item => item.role === 'device-cut');
      assert.equal(cuts.length, cutPaths.length);
      for (const [index, cut] of cuts.entries()) {
        const [x, y, w, h] = deviceBounds[index];
        assertBox(cut.boundsMm, [x + dx, y + dy, w, h]);
        if (position === 'standard') assert.equal(cut.d, cutPaths[index]);
      }
    }
    const outers = layers.acrylic.paths.filter(p => p.role === 'outer');
    assert.equal(outers.length, 1);
    assertBox(outers[0].boundsMm, [frame.x, frame.y, frame.width, frame.height]);
    assert.equal(layers.steel.paths.filter(p => p.role === 'outer').length, 0);
    assert.equal(layers.productionReady, false);
    layerPairs++;
    for (const design of availableDesigns.get(options.format)) {
      for (const quantity of quantities) {
        const cost = quote(config, design.objects, design.id, selection, quantity);
        const cents = expected.get(key(options));
        assert.equal(cost.currency, matrix.currency || entry.currency);
        assert.equal(cost.unitCents, cents, JSON.stringify([options, position, design.id, quantity]));
        assert.equal(cost.totalCents, cents * quantity);
        quotesChecked++;
      }
    }
  }
}
console.log(JSON.stringify({
  product: handle, comparison: 'lokal ausgeliefertes Modell gegen versionierte Katalogmatrix',
  matrixSha256: createHash('sha256').update(matrixBytes).digest('hex'), formats: availableDesigns.size,
  designCounts: Object.fromEntries([...availableDesigns].map(([format, designs]) => [format, designs.length])),
  variants: combinations.length, positions, quantities, quotesChecked, layerPairs,
  shopifyCartChecked: false, machineReleased: false
}, null, 2));
