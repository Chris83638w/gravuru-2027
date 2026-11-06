import test from 'node:test';
import assert from 'node:assert/strict';
import {slateGalleryHtml, orderedReviewTargets, reviewThemes, blankPreviewUrl} from './lib/slate-review-gallery-page.mjs';
import {reviewDesignMatches, reviewBlankMatches, materialOption} from './lib/slate-review-gallery-ui.js';
import {materialOverviewHtml, REVIEW_MATERIAL_OVERVIEW} from './lib/review-material-overview.mjs';

const steel = {
  id: 'ED-42,1', process: 'Gravur', kleinsteGroesse: 'large',
  reviewMaterial: {key: 'steel', label: 'Edelstahl', kind: 'steel'},
  reviewCategory: {key: 'tuerschilder-without', label: 'Türschilder ohne Foto', rank: 300, photo: 'without', topic: 'tuerschilder'},
  reviewThemes: [{key: 'familie', label: 'Familie'}, {key: 'baum', label: 'Lebensbaum'}, {key: 'baum', label: 'Lebensbaum'}],
  targets: [
    {sizeKey: 'large', mm: [300, 200], status: 'prepared', productKey: 'steel-large', nativeDesignId: 'steel-ed-42-1'},
    {sizeKey: 'square', mm: [100, 100], status: 'prepared', productKey: 'steel-square', nativeDesignId: 'steel-ed-42-1'},
    {sizeKey: 'narrow', mm: [200, 40], status: 'prepared', productKey: 'steel-narrow', nativeDesignId: 'steel-ed-42-1'},
  ],
};
const slate = {
  id: 'GT-S-30x20-D5', group: 'Tiere', subcategory: 'Hund', photoSlots: 0, process: 'Gravur',
  targets: [{sizeKey: 'small', mm: [220, 140], status: 'prepared'}, {sizeKey: 'large', mm: [300, 200], status: 'prepared'}],
};
const imported = {products: [
  ...steel.targets.map(target => ({key: target.productKey, productId: 'cfg_' + target.sizeKey, designIds: [steel.id]})),
  {key: 'large:Hunde', productId: 'cfg_slate_large', designIds: [slate.id]},
  {key: 'small:Hunde', productId: 'cfg_slate_small', designIds: [slate.id]},
]};
const blanks = [{key: 'steel-round-100', materialKey: 'steel', materialLabel: 'Edelstahl', form: 'Rund', label: 'Rund Ø 10 cm', mm: [100, 100], preview: 'originals/_blanks/steel-round-100.webp'}];

test('steel default follows the smallest physical area, explicit native ID and exact product key', () => {
  const targets = orderedReviewTargets(steel, imported);
  assert.deepEqual(targets.map(target => target.sizeKey), ['narrow', 'square', 'large']);
  assert.equal(targets[0].productId, 'cfg_narrow');
  assert.equal(targets[0].designId, 'steel-ed-42-1');
  assert.equal(targets[0].approvalKey, JSON.stringify(['steel', steel.id, 'narrow']));
  const incomplete = {...steel, targets: [{...steel.targets[0], nativeDesignId: undefined}, {...steel.targets[1], status: 'open'}]};
  assert.deepEqual(orderedReviewTargets(incomplete, imported), []);
  assert.equal(orderedReviewTargets(slate, imported)[0].productId, 'cfg_slate_large', 'existing slate default remains30×20');
});

test('multiple themes do not duplicate a design, its comments or its approval identity', () => {
  const approvalKey = JSON.stringify(['slate', slate.id, 'large']);
  const html = slateGalleryHtml({originals: [steel, slate]}, imported, {
    comments: {[slate.id]: {text: 'Bestehender Hinweis bleibt', revision: 7}},
    approvals: {[approvalKey]: {status: 'approved', metadata: {previewUrl: '/preview-exact-existing.svg'}}},
  });
  assert.equal((html.match(/ data-design-card /g) || []).length, 2);
  assert.equal((html.match(/data-comment-form/g) || []).length, 2);
  assert.equal((html.match(/data-approval-check/g) || []).length, 2);
  assert.equal((html.match(/data-approval-check checked/g) || []).length, 1);
  assert.match(html, /id="design-ED-42,1"/);
  assert.match(html, /data-product-id="cfg_narrow" data-design-id="steel-ed-42-1"/);
  assert.match(html, /data-themes="\[&quot;familie&quot;,&quot;baum&quot;\]"/);
  assert.match(html, /data-comment-form data-design-id="GT-S-30x20-D5" data-revision="7"/);
  assert.match(html, /Bestehender Hinweis bleibt/);
  assert.match(html, /src="\/preview-exact-existing.svg"/);
  assert.match(html, /<title>Katalog · Vorlagen prüfen und bearbeiten<\/title>/);
  assert.match(html, /<select id="material">/);assert.match(html, /<select id="theme">/);
  assert.match(html, /design=steel-ed-42-1&amp;originalId=ED-42%2C1/);
  assert.doesNotMatch(html, /design=katalog-ED-42/);
  assert.deepEqual(reviewThemes(slate), [{key: 'hunde', label: 'Hunde'}]);
});

test('material and theme filters intersect while either declared theme finds the same card', () => {
  const data = {search: 'ed-42,1 edelstahl familie lebensbaum gravur', material: 'steel', themes: '["familie","baum"]', category: 'tuerschilder-without', process: 'Gravur', approvalStatus: 'unreviewed'};
  for (const theme of ['familie', 'baum']) assert.equal(reviewDesignMatches(data, {view: 'designs', material: 'steel', theme}), true);
  assert.equal(reviewDesignMatches(data, {view: 'designs', material: 'slate', theme: 'baum'}), false);
  assert.equal(reviewDesignMatches(data, {view: 'designs', material: 'steel', theme: 'hunde'}), false);
  assert.equal(reviewDesignMatches(data, {view: 'designs', material: 'steel', theme: 'baum', search: ' LEBENSBAUM '}), true);
  assert.equal(reviewDesignMatches(data, {view: 'designs', material: 'steel', approval: 'approved'}), false);
  assert.equal(reviewDesignMatches(data, {view: 'blanks'}), false);
  assert.equal(reviewDesignMatches(data, {view: 'all', material: 'steel', category: 'tuerschilder-without'}), true);
});

test('blank plates have a separate gallery and no invented design, editor, text or approval', () => {
  const html = slateGalleryHtml({originals: [], blanks}, {products: []});
  const card = html.match(/<article class="blank-card"[\s\S]*?<\/article>/)?.[0];
  assert.ok(card);
  assert.match(html, /id="blank-gallery" hidden/);
  assert.match(html, /<option value="blanks">Rohlinge/);
  assert.match(card, /src="\/originale\/files\/originals\/_blanks\/steel-round-100.webp"/);
  assert.doesNotMatch(card, /data-design-card|data-approval-check|data-comment-form|data-inline|data-edit-link|Dein Text/);
  assert.equal((html.match(/ data-blank-card /g) || []).length, 1);
  const data = {search: 'edelstahl rund 10 cm', material: 'steel', form: 'Rund'};
  assert.equal(reviewBlankMatches(data, {view: 'blanks', material: 'steel', form: 'Rund', theme: 'baum', approval: 'approved'}), true);
  assert.equal(reviewBlankMatches(data, {view: 'designs', material: 'steel'}), false);
  assert.equal(reviewBlankMatches(data, {view: 'all', material: 'slate'}), false);
  assert.equal(reviewBlankMatches(data, {view: 'all', material: 'steel', form: 'Quadratisch'}), false);
});

test('blank previews cannot create external requests or escape the fixed gallery image path', () => {
  for (const value of ['https://outside.example/image.webp', '/originals/_blanks/a.webp', 'originals/_blanks/../a.webp', 'originals/_blanks/a.svg', 'originals/_blanks/a\\b.webp', 'originals/_blanks/a\n.webp']) assert.equal(blankPreviewUrl(value), null);
  assert.equal(blankPreviewUrl('originals/_blanks/rund 10.webp'), '/originale/files/originals/_blanks/rund%2010.webp');
});

test('documented visual-review gaps stay visible without inventing missing native targets', () => {
  const html = slateGalleryHtml({originals: [{...steel, visualReviewIssues: [{message: 'Prüfansicht für TO15x8 noch offen <Quelle>'}]}]}, imported);
  assert.match(html, /review-source-note">Prüfansicht für TO15x8 noch offen &lt;Quelle&gt;/);
  assert.equal((html.match(/ data-design-card /g) || []).length, 1);
  assert.equal((html.match(/<option value="\d+" data-approval-key/g) || []).length, 3);
  assert.match(html, /data-product-id="cfg_narrow" data-design-id="steel-ed-42-1"/);
});

test('material overview uses actual connected pack counts without altering the historical snapshot', () => {
  const html = materialOverviewHtml({activeMaterials: [{key: 'slate', originals: 325, editable: 233, blanks: 0}, {key: 'steel', originals: 28, editable: 28, blanks: 73}]});
  assert.match(html, /<summary>Materialien · Schiefer und Edelstahl<\/summary>/);
  assert.equal((html.match(/review-material-item is-active/g) || []).length, 2);
  assert.match(html, /28 Vorlagen · 28 bearbeitbar · 73 Rohlinge/);
  assert.doesNotMatch(html, /Edelstahl-Vorlagen sind in dieser Galerie noch nicht verbunden/);
  assert.equal(REVIEW_MATERIAL_OVERVIEW.materials.find(row => row.id === 'steel').galleryStatus, 'not-connected');
  assert.doesNotMatch(html, /<(?:a|button|article)\b|\shref=/i);
});

test('one original exposes three real material targets, separate approvals and the unchanged font warning', () => {
  const acrylic = {key: 'acrylic-schwarz-3mm', label: 'Acrylglas Schwarz · 3 mm', kind: 'acrylic'};
  const anthracite = {key: 'acrylic-anthrazit-3mm', label: 'Acrylglas Anthrazit · 3 mm', kind: 'acrylic'};
  const row = {...steel, targets: [steel.targets[1], ...[acrylic, anthracite].map(material => ({
    sizeKey: material.key + '-100', mm: [100, 100], status: 'prepared', productKey: material.key,
    nativeDesignId: 'steel-ed-42-1', reviewMaterial: material, familyId: material.key, familyLabel: material.label,
  }))], visualReviewIssues: [{message: 'Ersatz unsicher, bitte ansehen: Schrift <A>'}]};
  const importedVariants = {products: [...imported.products, ...row.targets.slice(1).map(target => ({key: target.productKey, productId: 'cfg_' + target.productKey, designIds: [row.id]}))]};
  const targets = orderedReviewTargets(row, importedVariants);
  assert.equal(new Set(targets.map(target => target.approvalKey)).size, 3);
  assert.equal(targets.find(target => target.material.key === acrylic.key).approvalKey, JSON.stringify([acrylic.key, row.id, acrylic.key + '-100']));
  const html = slateGalleryHtml({originals: [row]}, importedVariants);
  assert.equal((html.match(/ data-design-card /g) || []).length, 1);
  assert.equal((html.match(/data-comment-form/g) || []).length, 1);
  assert.match(html, /Material \/ Format/);
  assert.match(html, /data-material="acrylic-schwarz-3mm" data-material-label="Acrylglas Schwarz · 3 mm"/);
  assert.match(html, /Ersatz unsicher, bitte ansehen: Schrift &lt;A&gt;/);
  assert.equal((html.match(/review-material-item is-active/g) || []).length, 3);
  assert.doesNotMatch(html, /data-approval-check checked/);
});

test('material switch prefers the same actual dimensions and never invents a missing target', () => {
  const options = [
    {dataset: {material: 'steel', mm: '100x100'}},
    {dataset: {material: 'acrylic-schwarz-3mm', mm: '50x20'}},
    {dataset: {material: 'acrylic-schwarz-3mm', mm: '100x100'}},
  ];
  assert.equal(materialOption(options, 'acrylic-schwarz-3mm', options[0]), options[2]);
  assert.equal(materialOption(options, 'acrylic-schwarz-3mm', {dataset: {mm: '200x200'}}), options[1]);
  assert.equal(materialOption(options, 'slate', options[0]), undefined);
});

test('an open material target remains selectable and added target font warnings remain visible', () => {
  const material = {key: 'acrylic-schwarz-3mm', label: 'Acrylglas Schwarz · 3 mm', kind: 'acrylic'};
  const row = {...steel, targets: [steel.targets[1], {sizeKey: 'acryl-100', mm: [100, 100], status: 'open', reason: 'Schriftdatei fehlt', reviewMaterial: material,
    visualReviewIssues: [{message: 'Ersatz unsicher, bitte ansehen: neue Materialfassung'}]}]};
  const html = slateGalleryHtml({originals: [row]}, imported);
  assert.match(html, /data-open-reason="Schriftdatei fehlt"/);
  assert.match(html, /data-material="acrylic-schwarz-3mm"/);
  assert.match(html, /data-open-preview hidden/);
  assert.match(html, /review-source-note">Ersatz unsicher, bitte ansehen: neue Materialfassung/);
  assert.equal((html.match(/ data-design-card /g) || []).length, 1);
});

test('native fit warnings stay visible for the exact material and dimensions without declaring a blocker', () => {
  const row = {...steel, targets: [{...steel.targets[1], fit: {status: 'prüfen', issues: ['Motivkontur unter 0,04 mm <prüfen>']}}]};
  const html = slateGalleryHtml({originals: [row]}, imported);
  assert.match(html, /Darstellung prüfen · 1 Material-\/Format-Hinweise/);
  assert.match(html, /Edelstahl · 10 × 10 cm: Motivkontur unter 0,04 mm &lt;prüfen&gt;/);
  assert.match(html, /data-inline-open/);
  assert.doesNotMatch(html, /data-approval-check checked/);
});
