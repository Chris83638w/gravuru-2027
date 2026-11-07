import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {designReviewMaterial, designReviewMaterials, designReviewMaterialMatches, designReviewCategory, designReviewApprovalKey, resolveDesignReviewTarget, validatedDesignReviewTargets} from './lib/design-review-targets.mjs';
import {slateReviewApprovalKey, slateReviewApprovalTargets, createSlateApprovalTargetSource} from './lib/slate-review-approval-targets.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';

const steel = {key: 'steel', label: 'Edelstahl', kind: 'steel'};
const category = {key: 'steel-tuerschilder', label: 'Türschilder', rank: 100, photo: 'without', topic: 'tuerschilder'};
const originalId = 'TRE-V2A-8x3,5-D1', nativeDesignId = 'katalog-TRE-V2A-8x3-5-D1';
function fixture() {
  const row = {id: originalId, reviewMaterial: steel, reviewCategory: category,
    targets: [{sizeKey: 'GR-ES-RE-80X35-T15', productKey: 'steel:GR-ES-RE-80X35-T15', nativeDesignId, mm: [80,35], status: 'prepared'}]};
  const product = {key: row.targets[0].productKey, productId: 'cfg_steel', reviewOnly: true, designIds: [row.id]};
  return {row, pack: {schema: 'gravuru-design-original-review/v1', reviewOnly: true, released: false, originals: [row], products: [product]},
    imported: {localOnly: true, published: false, shopifyWrites: 0, products: [structuredClone(product)]}};
}

test('legacy slate identities and resolution remain stable; explicit steel IDs preserve comma original IDs', () => {
  const slate = {id: 'GT-S-30x20-D1'}, target = {status: 'prepared', sizeKey: 'large', mm: [300,200]};
  const imported = {products: [{key: 'large:Hunde', productId: 'cfg_slate', designIds: [slate.id]}]};
  assert.deepEqual(designReviewMaterial(slate), {key: 'slate', label: 'Schiefer', kind: 'slate'});
  assert.equal(designReviewApprovalKey(slate, 'large'), slateReviewApprovalKey(slate.id, 'large'));
  assert.equal(designReviewApprovalKey(slate), slateReviewApprovalKey(slate.id));
  assert.equal(resolveDesignReviewTarget(slate, target, imported).designId, 'katalog-' + slate.id);
  const f = fixture(), actual = validatedDesignReviewTargets(f.pack, f.imported)[0];
  assert.equal(actual.originalId, originalId); assert.equal(actual.designId, nativeDesignId);
  assert.equal(actual.productId, 'cfg_steel'); assert.deepEqual(actual.material, steel);
  assert.equal(designReviewApprovalKey(f.row, f.row.targets[0].sizeKey), JSON.stringify(['steel', originalId, 'GR-ES-RE-80X35-T15']));
  assert.deepEqual(designReviewCategory(f.row), category);
  assert.equal(slateReviewApprovalTargets(f.pack, f.imported)[0].material, 'Edelstahl');
});

test('only explicit steel targets, known material pairs and manifest-allowlisted designs resolve', () => {
  const f = fixture(), target = f.row.targets[0];
  for (const changes of [{productKey: undefined}, {nativeDesignId: undefined}, {productKey: 'foreign'}, {status: 'open'}, {mm: [NaN,35]}]) {
    assert.equal(resolveDesignReviewTarget(f.row, {...target, ...changes}, f.imported), null);
  }
  for (const reviewMaterial of [{key: 'invented', label: 'Holz', kind: 'wood'}, {...steel, kind: 'slate'}, {key: '__proto__'}]) {
    assert.throws(() => designReviewMaterial({...f.row, reviewMaterial}), /Unsupported review material/);
  }
  const foreign = structuredClone(f.imported); foreign.products[0].designIds.push('foreign');
  assert.throws(() => validatedDesignReviewTargets(f.pack, foreign), /Invalid review product/);
  const wrongBaseline = structuredClone(f.pack); wrongBaseline.products[0].designIds = [];
  assert.throws(() => validatedDesignReviewTargets(wrongBaseline, f.imported), /Invalid review product/);
  const duplicate = structuredClone(f.imported); duplicate.products.push({...duplicate.products[0], productId: 'cfg_other'});
  assert.throws(() => validatedDesignReviewTargets(f.pack, duplicate), /Invalid review product/);
  assert.throws(() => resolveDesignReviewTarget(f.row, target, duplicate), /Ambiguous/);
  assert.throws(() => validatedDesignReviewTargets({...f.pack, schema: 'arbitrary'}, f.imported), /Unpublished local/);
});

test('source-only materials remain visible without becoming native supported families',()=>{
  const wood={key:'wood',label:'Holz',kind:'wood'};
  assert.deepEqual(designReviewMaterial({reviewMaterial:wood}),wood);
  assert.equal(designReviewMaterialMatches({kind:'wood'},wood),false);
  const unknown={key:'unknown',label:'Material offen',kind:'unknown'};
  assert.deepEqual(designReviewMaterial({reviewMaterial:unknown}),unknown);
  assert.equal(designReviewMaterialMatches({kind:'unknown'},unknown),false);
});

test('steel approval fingerprints use native content and reject changed material, source identity or geometry', () => {
  const f = fixture();
  const family = JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json', import.meta.url)));
  family.sizes = [structuredClone(family.sizes[0])];
  f.row.targets[0].familyId=family.id;
  Object.assign(family.sizes[0], {widthMm: 80, heightMm: 35, key: f.row.targets[0].sizeKey});
  const config = familyProductConfig(family, family.sizes[0], 1), design = config.profile.designs[0];
  design.id = nativeDesignId; design.katalog = {designId: originalId,target:{familyId:family.id}}; config.profile.defaultDesignId = nativeDesignId;
  const record = {id: 'cfg_steel', revision: 1, status: 'draft', document: makeProductDocument(config)};
  const workshop = {repository: {get: () => structuredClone(record)}, assets: {read: () => {throw Error('Unexpected external asset');}}, fonts: {resources: () => ({})}};
  const source = createSlateApprovalTargetSource({...f, workshop}), key = source.listTargets()[0];
  const first = source.resolveTarget(key);
  assert.equal(first.available, true); assert.match(first.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.metadata.designId, nativeDesignId); assert.match(first.metadata.previewUrl, /reviewFingerprint=/);
  const original = structuredClone(record.document);
  for (const mutate of [d => {d.config.profile.material.kind = 'slate';}, d => {d.config.profile.geometry.width = 90;}, d => {d.config.profile.designs[0].katalog.designId = 'foreign';},d=>{d.config.profile.designs[0].katalog.target.familyId='foreign';}]) {
    record.document = structuredClone(original); mutate(record.document); record.revision++; source.beginRead();
    assert.equal(source.resolveTarget(key).available, false);
  }
  record.document = structuredClone(original); record.document.config.profile.designs[0].objects[0].text = 'Familie Neu'; record.revision++; source.beginRead();
  const changed = source.resolveTarget(key); assert.equal(changed.available, true); assert.notEqual(changed.fingerprint, first.fingerprint);
});

test('one original resolves independent steel and acrylic variants without changing historic keys', () => {
  const f=fixture(),historic=designReviewApprovalKey(f.row,f.row.targets[0].sizeKey);
  const materials=[
    {key:'acrylic-schwarz-3mm',label:'Acrylglas Schwarz · 3 mm',kind:'acrylic'},
    {key:'acrylic-anthrazit-3mm',label:'Acrylglas Anthrazit · 3 mm',kind:'acrylic'},
    {key:'acrylic-as-5mm',label:'Acrylglas Schwarz · 5 mm',kind:'acrylic'},
    {key:'acrylic-aa-5mm',label:'Acrylglas Anthrazit · 5 mm',kind:'acrylic'},
  ];
  for(const [index,material] of materials.entries()){
    const target={...f.row.targets[0],reviewMaterial:material,familyId:'family-'+index,familyLabel:'Familie '+index,productKey:material.key+':format',sizeKey:'format'};
    f.row.targets.push(target);
    const product={key:target.productKey,productId:'cfg_'+index,reviewOnly:true,designIds:[f.row.id]};
    f.pack.products.push(product);f.imported.products.push(structuredClone(product));
  }
  assert.deepEqual(designReviewMaterials(f.row),[steel,...materials]);
  const resolved=validatedDesignReviewTargets(f.pack,f.imported);
  assert.equal(resolved.length,5);assert.equal(new Set(resolved.map(t=>t.originalId)).size,1);
  assert.equal(designReviewApprovalKey(f.row,f.row.targets[0].sizeKey,f.row.targets[0]),historic);
  const approvals=slateReviewApprovalTargets(f.pack,f.imported);
  assert.equal(new Set(approvals.map(target=>target.key)).size,5);
  for(let index=0;index<materials.length;index++){
    assert.deepEqual(resolved[index+1].material,materials[index]);assert.equal(resolved[index+1].familyId,'family-'+index);
    assert.equal(approvals[index+1].materialKey,materials[index].key);
  }
  assert.equal(designReviewMaterialMatches({kind:'acrylic',variant:'schwarz',thicknessMm:3},materials[0]),true);
  assert.equal(designReviewMaterialMatches({kind:'acrylic',variant:'anthrazit',thicknessMm:3},materials[0]),false);
  assert.equal(designReviewMaterialMatches({kind:'acrylic',variant:'schwarz',thicknessMm:5},materials[0]),false);
  const duplicate=structuredClone(f.pack);duplicate.originals[0].targets.push({...duplicate.originals[0].targets[1],familyId:'another-family'});
  assert.throws(()=>validatedDesignReviewTargets(duplicate,f.imported),/Duplicate material\/format/);
  assert.throws(()=>designReviewMaterial(f.row,{reviewMaterial:null}),/Unsupported/);
});
