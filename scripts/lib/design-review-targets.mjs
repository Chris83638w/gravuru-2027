import {slateReviewCategory} from './slate-review-catalog.mjs';

const MATERIALS = Object.freeze(Object.fromEntries([
  ['slate', 'Schiefer', 'slate'], ['steel', 'Edelstahl', 'steel'],
  ['acrylic-schwarz-3mm', 'Acrylglas Schwarz · 3 mm', 'acrylic'],
  ['acrylic-anthrazit-3mm', 'Acrylglas Anthrazit · 3 mm', 'acrylic'],
  ['acrylic-as-5mm', 'Acrylglas Schwarz · 5 mm', 'acrylic'],
  ['acrylic-aa-5mm', 'Acrylglas Anthrazit · 5 mm', 'acrylic'],
].map(([key, label, kind]) => [key, {key, label, kind}])));
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const dimensions = mm => Array.isArray(mm) && mm.length === 2 && mm.every(value => Number.isFinite(value) && value > 0);
const fail = message => { throw Error(message); };

export function designReviewMaterial(row, target) {
  const stated = target?.reviewMaterial === undefined ? row.reviewMaterial : target.reviewMaterial;
  if (stated === undefined) return {...MATERIALS.slate};
  const material = Object.hasOwn(MATERIALS, stated?.key) ? MATERIALS[stated.key] : null;
  if (!material || stated.kind !== material.kind || stated.label !== material.label) fail('Unsupported review material');
  return {...material};
}

export function designReviewMaterials(row) {
  const materials = (row.targets?.length ? row.targets : [undefined]).map(target => designReviewMaterial(row, target));
  return [...new Map(materials.map(material => [material.key, material])).values()];
}

export function designReviewMaterialMatches(nativeMaterial, material) {
  if (nativeMaterial?.kind !== material.kind) return false;
  if (material.kind !== 'acrylic') return true;
  const expected = {
    'acrylic-schwarz-3mm': ['schwarz', 3], 'acrylic-anthrazit-3mm': ['anthrazit', 3],
    'acrylic-as-5mm': ['schwarz', 5], 'acrylic-aa-5mm': ['anthrazit', 5],
  }[material.key];
  return !!expected && nativeMaterial.variant === expected[0] && nativeMaterial.thicknessMm === expected[1];
}

export function designReviewCategory(row) {
  if (row.reviewCategory === undefined) return slateReviewCategory(row);
  const category = row.reviewCategory;
  if (!category || !text(category.key) || !text(category.label) || !Number.isFinite(category.rank) ||
      !['without', 'with', 'unknown'].includes(category.photo) || !text(category.topic)) fail('Invalid review category');
  return {...category};
}

// Keep existing slate keys byte-for-byte stable across the material extension.
export const designReviewApprovalKey = (row, sizeKey, target) => JSON.stringify([designReviewMaterial(row, target).key, row.id, sizeKey || 'unprepared']);

// A size key is catalogue-defined and includes its family. Material is also
// included so legacy pilot targets (which have no familyId) retain identity.
export const designReviewTargetKey = (row, target) => designReviewApprovalKey(row, target.sizeKey, target);

export function resolveDesignReviewTarget(row, target, imported) {
  const material = designReviewMaterial(row, target);
  if (target.status !== 'prepared' || !dimensions(target.mm) || !text(target.sizeKey)) return null;
  const explicit = target.productKey !== undefined || target.nativeDesignId !== undefined || material.key !== 'slate';
  if (explicit && (!text(target.productKey) || !text(target.nativeDesignId))) return null;
  const products = imported.products.filter(product => Array.isArray(product.designIds) && product.designIds.includes(row.id) &&
    (explicit ? product.key === target.productKey : product.key.startsWith(target.sizeKey + ':')));
  if (products.length > 1) fail('Ambiguous review target');
  const product = products[0];
  if (!product) return null;
  return {productId: product.productId, productKey: product.key, designId: explicit ? target.nativeDesignId : 'katalog-' + row.id,
    material, materialKey: material.key, materialLabel: material.label, materialKind: material.kind,
    familyId: target.familyId || null, familyLabel: target.familyLabel || null, mm: [...target.mm], sizeKey: target.sizeKey};
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
  const targets = [], nativePairs = new Set(), reviewKeys = new Set();
  for (const row of pack.originals) {
    designReviewMaterial(row);
    for (const target of row.targets || []) {
      const key = designReviewTargetKey(row, target);
      if (reviewKeys.has(key)) fail('Duplicate material/format review target');
      reviewKeys.add(key);
      const resolved = resolveDesignReviewTarget(row, target, imported);
      if (target.status === 'prepared' && !resolved) fail('Prepared review target is missing its explicit native mapping');
      if (!resolved) continue;
      const pair = JSON.stringify([resolved.productId, resolved.designId]);
      if (nativePairs.has(pair)) fail('Duplicate native review target');
      nativePairs.add(pair); targets.push({...resolved, originalId: row.id});
    }
  }
  return targets;
}
