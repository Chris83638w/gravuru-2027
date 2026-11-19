import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPin, ringUnitCents, renderRingPreview, ringPreviewSvg, ringCartLines, requireSourcedPrice} from './beta-267-ring.mjs';
import {renderCustomerCart, renderCartDrawer} from './beta-267-cart.mjs';

test('the public Ring variant stays at 49.99 Euro without an invented surcharge', () => {
  assert.equal(ringPin.variant.variantId, '57471227756924');
  assert.equal(ringPin.variant.sku, 'FK-AV2A-16x28-1441');
  assert.equal(ringUnitCents(), 4999);
  assert.equal(ringPin.mountingK00.surchargeCents, 0);
  assert.throws(() => ringUnitCents('SIL'), {code:'ring_surcharge_refused'});
});

test('Strichdesign keeps the whole white angle and the camera image; the second design does not reuse that angle', () => {
  const strich = renderRingPreview({designId:'FK-RUNDUM', text:'Haus Nord 12'});
  const modern = renderRingPreview({designId:'FK-SEITLICH', text:'Haus Süd 27'});
  assert.equal(strich.design.name, 'Strichdesign');
  assert.equal(strich.samples.filter(sample => sample.white).length, 32);
  assert.equal(modern.samples.filter(sample => sample.white).length, 0);
  assert.notDeepEqual(strich.deviceCenter, [18, 20, 22]);
  assert.notEqual(strich.png.equals(modern.png), true);
  const svg = ringPreviewSvg({designId:'FK-RUNDUM', text:'Haus Nord 12'});
  assert.match(svg, /M22 87H138V237/);
  assert.match(svg, new RegExp(ringPin.device.sha256));
  assert.doesNotMatch(ringPreviewSvg({designId:'FK-SEITLICH', text:'Haus Süd 27'}), /M22 87H138V237/);
});

test('two Ring lines of the same variant keep separate previews and the drawer has no edit link', () => {
  const {ledger, lineA, lineB} = ringCartLines();
  assert.equal(lineA.variantId, lineB.variantId);
  assert.equal(lineA.unitCents, 4999);
  assert.notEqual(lineA.previewSha256, lineB.previewSha256);
  assert.notEqual(lineA.configuration.id, lineB.configuration.id);
  for (const html of [renderCustomerCart(ledger.lines()), renderCartDrawer(ledger.lines())]) {
    assert.equal(html.includes('Haus Nord 12') && html.includes('Haus Süd 27'), true);
    assert.equal(/<a\b|gravuru-cart-edit|_gravuru_bearbeiten/.test(html), false);
    assert.equal((html.match(/data-remove="/g) || []).length, 2);
  }
  assert.equal(ledger.acceptOrder({financialStatus:'paid', cancelledAt:null, lines:[lineA, lineB]}).productionReady, false);
  assert.throws(() => ledger.acceptOrder({financialStatus:'paid', cancelledAt:null, lines:[{...lineA, unitCents:5498}, lineB]}), {code:'order_price'});
  assert.throws(() => ledger.acceptOrder({financialStatus:'pending', cancelledAt:null, lines:[lineA, lineB]}), {code:'order_unpaid'});
  assert.throws(() => ledger.acceptOrder({financialStatus:'paid', cancelledAt:'2026-11-19', lines:[lineA, lineB]}), {code:'order_cancelled'});
  assert.throws(() => ledger.acceptOrder({financialStatus:'paid', cancelledAt:null, lines:[{...lineA, previewSha256:lineB.previewSha256}, lineB]}), {code:'order_manipulated'});
  assert.throws(() => ledger.acceptOrder({financialStatus:'paid', cancelledAt:null, lines:[{...lineA, configuration:{id:'fremd', rev:1}}, lineB]}), {code:'order_foreign'});
  for (const material of ['Edelstahl', 'Acryl', 'Schiefer']) assert.throws(() => requireSourcedPrice(material, {}), {code:'price_open'});
  assert.equal(requireSourcedPrice('Ring', {unitCents:4999}), 4999);
});
