import {slateReviewCategory} from './slate-review-catalog.mjs';

const MATERIALS = Object.freeze({slate: {key: 'slate', label: 'Schiefer', kind: 'slate'}, steel: {key: 'steel', label: 'Edelstahl', kind: 'steel'}});
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const dimensions = mm => Array.isArray(mm) && mm.length === 2 && mm.every(value => Number.isFinite(value) && value > 0);
const fail = message => { throw Error(message); };

export function designReviewMaterial(row) {
  if (row.reviewMaterial === undefined) return {...MATERIALS.slate};
  const stated = row.reviewMaterial, material = Object.hasOwn(MATERIALS, stated?.key) ? MATERIALS[stated.key] : null;
  if (!material || stated.kind !== material.kind || stated.label !== material.label) fail('Unsupported review material');
  return {...material};
}

export function designReviewCategory(row) {
  if (row.reviewCategory === undefined) return slateReviewCategory(row);
  const category = row.reviewCategory;
  if (!category || !text(category.key) || !text(category.label) || !Number.isFinite(category.rank) ||
      !['without', 'with', 'unknown'].includes(category.photo) || !text(category.topic)) fail('Invalid review category');
  return {...category};
}

// Keep existing slate keys byte-for-byte stable across the material extension.
export const designReviewApprovalKey = (row, sizeKey) => JSON.stringify([designReviewMaterial(row).key, row.id, sizeKey || 'unprepared']);

export function resolveDesignReviewTarget(row, target, imported) {
  const material = designReviewMaterial(row);
  if (target.status !== 'prepared' || !dimensions(target.mm) || !text(target.sizeKey)) return null;
  const explicit = target.productKey !== undefined || target.nativeDesignId !== undefined || material.key !== 'slate';
  if (explicit && (!text(target.productKey) || !text(target.nativeDesignId))) return null;
  const products = imported.products.filter(product => Array.isArray(product.designIds) && product.designIds.includes(row.id) &&
    (explicit ? product.key === target.productKey : product.key.startsWith(target.sizeKey + ':')));
  if (products.length > 1) fail('Ambiguous review target');
  const product = products[0];
  if (!product) return null;
  return {productId: product.productId, productKey: product.key, designId: explicit ? target.nativeDesignId : 'katalog-' + row.id,
    material, mm: [...target.mm], sizeKey: target.sizeKey};
}

// The manifest is an allowlist, not merely display metadata. Every imported
// product/design must also belong to its immutable prepared package baseline.
export function validatedDesignReviewTargets(pack, imported) {
  if (!['gravuru-slate-original-review/v1', 'gravuru-design-original-review/v1'].includes(pack?.schema) || pack.reviewOnly !== true || pack.released !== false ||
      imported?.localOnly !== true || imported.published !== false || imported.shopifyWrites !== 0 ||
      !Array.isArray(pack.originals) || !Array.isArray(pack.products) || !Array.isArray(imported.products)) fail('Unpublished local review mapping required');
  const originals = new Map(pack.originals.map(row => [row.id, row]));
  const baseline = new Map(pack.products.map(product => [product.key, product]));
  if (originals.size !== pack.originals.length || baseline.size !== pack.products.length) fail('Duplicate review package identity');
  const productIds = new Set(), productKeys = new Set();
  for (const product of imported.products) {
    const source = baseline.get(product.key);
    if (!source || product.reviewOnly !== true || !text(product.productId) || productIds.has(product.productId) || productKeys.has(product.key) ||
        !Array.isArray(product.designIds) || !Array.isArray(source.designIds) || new Set(product.designIds).size !== product.designIds.length ||
        product.designIds.some(id => !originals.has(id) || !source.designIds.includes(id))) fail('Invalid review product mapping');
    productIds.add(product.productId); productKeys.add(product.key);
  }
  const targets = [], nativePairs = new Set();
  for (const row of pack.originals) {
    designReviewMaterial(row);
    for (const target of row.targets || []) {
      const resolved = resolveDesignReviewTarget(row, target, imported);
      if (!resolved) continue;
      const pair = JSON.stringify([resolved.productId, resolved.designId]);
      if (nativePairs.has(pair)) fail('Duplicate native review target');
      nativePairs.add(pair); targets.push({...resolved, originalId: row.id});
    }
  }
  return targets;
}
