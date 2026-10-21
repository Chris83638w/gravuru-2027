import {applyQuantityTier, quantityTierFor} from '../configurator/variant-m/contract.mjs';

// Internal server contract. Callers must read pricing with the owning Shopify app
// and verify product/variant ownership before binding; never accept browser prices.
const fail = () => { throw Object.assign(Error('Shopify-Aufpreisbindung und gesicherter Entwurf stimmen nicht überein.'), {status:422, code:'cart_personalization'}); };
const count = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const money = n => Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
const has = (value, key) => Boolean(value) && Object.hasOwn(value, key);

// The additive v1 checkout contract deliberately supports only closed percentage
// tiers. Editor-only open/fixed-price tiers must not silently enter checkout.
function checkoutTiers(value) {
  if (!Array.isArray(value) || value.length > 10) fail();
  let previous = 1;
  return value.map(tier => {
    if (!tier || typeof tier !== 'object' || Array.isArray(tier) ||
        Object.keys(tier).length !== 2 || !has(tier, 'minQuantity') || !has(tier, 'percentOff') ||
        !Number.isSafeInteger(tier.minQuantity) || tier.minQuantity < 2 ||
        tier.minQuantity > 99 || tier.minQuantity <= previous ||
        !Number.isFinite(tier.percentOff) || tier.percentOff <= 0 || tier.percentOff >= 100 ||
        Math.abs(tier.percentOff * 100 - Math.round(tier.percentOff * 100)) >= 1e-9) fail();
    previous = tier.minQuantity;
    return {minQuantity:tier.minQuantity, percentOff:tier.percentOff};
  });
}
const sameTier = (actual, expected) => expected === null ? actual === null :
  actual && typeof actual === 'object' && !Array.isArray(actual) && Object.keys(actual).length === 2 &&
  actual.minQuantity === expected.minQuantity && actual.percentOff === expected.percentOff;

export function capturePersonalization(pricing, {variantId, baseCents, document}) {
  if (pricing?.schema !== 'gravuru-personalization-pricing/v1' || pricing.enabled !== true ||
      !/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/.test(pricing.productId) ||
      !/^[1-9][0-9]{0,9}$/.test(String(pricing.revision)) || pricing.currency !== 'EUR' ||
      pricing.variants?.[variantId] !== baseCents || !money(baseCents) ||
      !money(pricing.extraMotifCents) || !money(pricing.extraPhotoCents) ||
      pricing.extraMotifCents !== document.config?.extraMotifCents ||
      pricing.extraPhotoCents !== document.config?.photo?.extraPriceCents) fail();
  const withTiers = has(pricing, 'quantityTiers');
  if (withTiers !== has(document.config, 'quantityTiers')) fail();
  if (withTiers ? pricing.quantityTierScope !== 'complete-unit' || document.config.quantityTierScope !== 'complete-unit' :
      has(pricing, 'quantityTierScope') || has(document.config, 'quantityTierScope')) fail();
  const quantityTiers = withTiers ? checkoutTiers(pricing.quantityTiers) : null;
  if (withTiers && JSON.stringify(quantityTiers) !== JSON.stringify(checkoutTiers(document.config.quantityTiers))) fail();
  return {productId:pricing.productId, revision:String(pricing.revision), baseCents,
    extraMotifCents:pricing.extraMotifCents, extraPhotoCents:pricing.extraPhotoCents,
    ...(withTiers ? {quantityTiers, quantityTierScope:'complete-unit'} : {})};
}

export function personalizationForSnapshot(contract, manifest) {
  const p = manifest.selection?.price;
  if (!p || !count(p.additionalMotifs, 200) || !count(p.chargedUploads, 4) ||
      !Number.isSafeInteger(p.quantity) || p.quantity < 1 || p.quantity > 99 ||
      !money(contract?.baseCents) || !money(contract?.extraMotifCents) || !money(contract?.extraPhotoCents) ||
      !/^proof_[a-zA-Z0-9_-]{1,100}$/.test(manifest.id) || !/^[a-f0-9]{64}$/.test(manifest.packageSha256)) fail();
  // These price components are outside this narrowly scoped legacy-v1 pilot.
  if ((p.fieldCents !== undefined && p.fieldCents !== 0) || (p.backCents !== undefined && p.backCents !== 0)) fail();
  const photoCents = p.chargedUploads * contract.extraPhotoCents;
  const listCents = contract.baseCents + p.additionalMotifs * contract.extraMotifCents + photoCents;
  if (!money(listCents) || !money(photoCents)) fail();
  let discountedCents = listCents;
  if (has(contract, 'quantityTiers')) {
    if (contract.quantityTierScope !== 'complete-unit' || p.quantityTierScope !== 'complete-unit') fail();
    const quantityTiers = checkoutTiers(contract.quantityTiers);
    const tier = quantityTierFor({quantityTiers}, p.quantity);
    discountedCents = applyQuantityTier(listCents, tier);
    if (!sameTier(p.quantityTier, tier) ||
        p.quantityTierDiscountCents !== listCents - discountedCents ||
        p.listUnitCents !== listCents) fail();
  } else if (has(contract, 'quantityTierScope') || has(p, 'quantityTierScope') || p.quantityTier != null || (p.quantityTierDiscountCents != null && p.quantityTierDiscountCents !== 0)) fail();
  const unitCents = discountedCents;
  if (!money(unitCents) || p.unitCents !== unitCents || manifest.product?.basePriceCents !== unitCents ||
      p.totalCents !== unitCents * p.quantity) fail();
  return {unitCents, personalization:{revision:contract.revision, motifs:p.additionalMotifs, uploads:p.chargedUploads,
    // An opaque reference to the privately stored editable original; no customer
    // text, media, download capability or draft token goes into cart attributes.
    designReference:`gravuru:${manifest.id}:${manifest.packageSha256}`}};
}

export function personalizationAttributes(value) {
  if (value === undefined) return [];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 4 || !Object.keys(value).every(k=>['revision','motifs','uploads','designReference'].includes(k)) ||
      typeof value.revision !== 'string' || !/^[1-9][0-9]{0,9}$/.test(value.revision) ||
      !count(value.motifs,200) || !count(value.uploads,4) || typeof value.designReference !== 'string' ||
      !/^gravuru:proof_[a-zA-Z0-9_-]{1,100}:[a-f0-9]{64}$/.test(value.designReference)) fail();
  return [{key:'_gravuru_motifs',value:String(value.motifs)}, {key:'_gravuru_uploads',value:String(value.uploads)},
    {key:'_gravuru_revision',value:value.revision}, {key:'Bearbeitbarer Entwurf',value:value.designReference}];
}

