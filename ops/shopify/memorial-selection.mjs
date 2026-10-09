import {createHash} from 'node:crypto';

const fail = code => {throw Object.assign(Error('Gedenktafel-Zuordnung nicht bestätigt.'), {code});};
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const unique = values => new Set(values).size === values.length;
const cents = price => {
  if (typeof price !== 'string' || !/^(0|[1-9][0-9]{0,6})\.[0-9]{2}$/.test(price)) fail('price_format');
  return Number(price.replace('.', ''));
};

// Compare two existing Shopify records: the product/variants and the app-owned
// pricing manifest. This does not introduce a checkout price calculation, create
// a new workshop product, or save an operational variant binding.
export function inspectMemorialSelection({product, manifest, personalization, currency}) {
  if (!product || !/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(product.id) || product.status !== 'ACTIVE' ||
      !/gedenktafel/i.test(product.title || '') || !/^[a-z0-9-]+$/.test(product.handle || '')) fail('product_identity');
  if (currency !== 'EUR' || personalization?.currency !== currency) fail('currency');
  if (!manifest || typeof manifest.productId !== 'string' || !manifest.productId || !Number.isSafeInteger(manifest.revision) || manifest.revision < 1 ||
      manifest.configurator !== 'variant-m' || manifest.customerEnabled !== true ||
      personalization?.schema !== 'gravuru-personalization-pricing/v1' || personalization.enabled !== true ||
      personalization.productId !== product.id || personalization.revision !== String(manifest.revision)) fail('configuration_identity');
  const geometry = manifest.geometry;
  if (!geometry || geometry.shape !== 'rect' || ![geometry.width, geometry.height].every(v => Number.isFinite(v) && v > 0) ||
      !Array.isArray(geometry.holes) || !Array.isArray(manifest.designs) || !manifest.designs.length ||
      !manifest.designs.some(d => d.id === manifest.defaultDesignId) ||
      manifest.designs.some(d => typeof d.id !== 'string' || !/^[a-f0-9]{64}$/.test(d.source || ''))) fail('design_source');
  if (!Array.isArray(manifest.options) || manifest.options.length !== 1 || manifest.options[0].id !== 'mounting' ||
      manifest.options[0].name !== 'Befestigung' || !Array.isArray(manifest.options[0].values)) fail('mounting_options');
  const group = manifest.options[0], options = group.values, variants = product.variants?.nodes;
  if (!options.length || options.length > 100 || !unique(options.map(o => o.id)) || !unique(options.map(o => o.label)) ||
      options.some(o => !o.id || !o.label || o.currency !== currency || !Array.isArray(o.holes)) ||
      !options.some(o => o.id === group.defaultValueId) ||
      !Array.isArray(variants) || product.variants.pageInfo?.hasNextPage !== false || variants.length !== options.length ||
      !unique(variants.map(v => v.id))) fail('variant_inventory');
  const configured = personalization.variants;
  if (!configured || typeof configured !== 'object' || Array.isArray(configured) || Object.keys(configured).length !== variants.length ||
      ![personalization.extraMotifCents, personalization.extraPhotoCents, ...Object.values(configured)].every(v => Number.isSafeInteger(v) && v >= 0)) fail('configured_prices');
  const rows = options.map(option => {
    const matches = variants.filter(v => v.selectedOptions?.length === 1 && v.selectedOptions[0].name === group.name && v.selectedOptions[0].value === option.label);
    if (matches.length !== 1) fail('option_mapping');
    const v = matches[0];
    if (!/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/.test(v.id) || v.availableForSale !== true) fail('variant_unavailable');
    const id = v.id.split('/').pop(), priceCents = cents(v.price);
    if (!Object.hasOwn(configured, id) || configured[id] !== priceCents) fail('price_mismatch');
    return {optionId: option.id, label: option.label, variantId: v.id, priceCents, holes: structuredClone(option.holes)};
  });
  return {schema: 'gravuru-memorial-selection/v1', source: 'existing-shopify-product-and-app-metafield',
    productId: product.id, title: product.title, handle: product.handle, currency,
    legacyConfiguration: {id: manifest.productId, revision: manifest.revision, sha256: hash(manifest)},
    pricingSha256: hash(personalization), widthMm: geometry.width, heightMm: geometry.height,
    designs: structuredClone(manifest.designs), defaultDesignId: manifest.defaultDesignId, variants: rows,
    extraMotifCents: personalization.extraMotifCents, extraPhotoCents: personalization.extraPhotoCents,
    existingPricesAndOptionsMatch: true, newWorkshopConfigurationId: null, bindingSaved: false,
    checkoutReady: false, published: false};
}
