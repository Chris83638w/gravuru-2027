import {prepareShopProduct} from './shop-preparation.mjs';
import {preflightFailure} from './shopify-admin-readonly.mjs';

// Validates an explicit proposal against the existing canonical product plan.
// Never writes bindings or treats a matching Admin price as checkout approval.
export async function preflightVariantBindings({record, shopifyProductId, mappings}, client) {
  const reject = () => {throw preflightFailure('binding_request');};
  const plan = prepareShopProduct(record);
  if (!plan.sourceReady || !/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/.test(shopifyProductId || '') || !Array.isArray(mappings) || !mappings.length || mappings.length > 100) reject();
  const keys = new Set(), ids = new Set(), groups = record.document.config?.profile.optionGroups || [];
  const proposals = mappings.map(mapping => {
    if (!mapping || Object.keys(mapping).some(k => !['key', 'variantId'].includes(k))) reject();
    const variant = plan.variants.find(v => v.key === mapping.key);
    if (!variant || typeof mapping.variantId !== 'string' || !/^[1-9][0-9]{0,19}$/.test(mapping.variantId) || keys.has(mapping.key) || ids.has(mapping.variantId)) reject();
    keys.add(mapping.key); ids.add(mapping.variantId);
    return {key: mapping.key, id: 'gid://shopify/ProductVariant/' + mapping.variantId, priceCents: variant.priceCents,
      options: groups.map(g => {const v = g.values.find(v => v.id === variant.options[g.id]); return {name: g.name, value: v.label || v.id};})};
  });
  const result = await client.inspectVariants(proposals.map(p => p.id));
  const rows = proposals.map((p, index) => {
    const actual = result.variants[index], issues = [];
    if (!actual?.found || actual.id !== p.id) issues.push('variant_missing');
    else {
      if (actual.productId !== shopifyProductId) issues.push('product_mismatch');
      if (actual.priceCents !== p.priceCents) issues.push('price_mismatch');
      if (['ARCHIVED', 'UNLISTED'].includes(actual.status)) issues.push('product_status');
      // A single form variant may use Shopify's default Title/Default Title or
      // the explicit Ausführung/Standard pair used by our existing draft adapter.
      const optionsMatch = p.options.length ? actual.options.length === p.options.length && p.options.every(o => actual.options.some(a => a.name === o.name && a.value === o.value))
        : actual.options.length === 1 && (actual.options[0].name === 'Title' && actual.options[0].value === 'Default Title' || actual.options[0].name === 'Ausführung' && actual.options[0].value === 'Standard');
      if (!optionsMatch) issues.push('options_mismatch');
    }
    if (result.installation.currency !== plan.currency) issues.push('currency_mismatch');
    return {key: p.key, variantId: p.id, expectedPriceCents: p.priceCents, actualPriceCents: actual?.found ? actual.priceCents : null,
      status: actual?.found ? actual.status : null, matches: issues.length === 0, issues};
  });
  return {schema: 'gravuru-shopify-variant-preflight/v1', configuration: plan.configuration, sourceSha256: plan.sha256,
    shopifyProductId, installation: result.installation, rows, matches: rows.every(r => r.matches),
    complete: mappings.length === plan.variants.length, extrasRequireSeparateBinding: Boolean(plan.extras.motifCents || plan.extras.photoCents),
    bindingSaved: false, checkoutReady: false, published: false};
}
