import {applyQuantityTier} from '../configurator/variant-m/contract.mjs';

// Internal server contract. Callers must read pricing with the owning Shopify app
// and verify product/variant ownership before binding; never accept browser prices.
const fail = () => { throw Object.assign(Error('Shopify-Aufpreisbindung und gesicherter Entwurf stimmen nicht überein.'), {status:422, code:'cart_personalization'}); };
const count = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const money = n => Number.isSafeInteger(n) && n >= 0 && n <= 100000000;

export function capturePersonalization(pricing, {variantId, baseCents, document}) {
  if (pricing?.schema !== 'gravuru-personalization-pricing/v1' || pricing.enabled !== true ||
      !/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/.test(pricing.productId) ||
      !/^[1-9][0-9]{0,9}$/.test(String(pricing.revision)) || pricing.currency !== 'EUR' ||
      pricing.variants?.[variantId] !== baseCents || !money(baseCents) ||
      !money(pricing.extraMotifCents) || !money(pricing.extraPhotoCents) ||
      pricing.extraMotifCents !== document.config?.extraMotifCents ||
      pricing.extraPhotoCents !== document.config?.photo?.extraPriceCents) fail();
  return {productId:pricing.productId, revision:String(pricing.revision), baseCents,
    extraMotifCents:pricing.extraMotifCents, extraPhotoCents:pricing.extraPhotoCents};
}

export function personalizationForSnapshot(contract, manifest) {
  const p = manifest.selection?.price;
  if (!p || !count(p.additionalMotifs, 200) || !count(p.chargedUploads, 4) ||
      !/^proof_[a-zA-Z0-9_-]{1,100}$/.test(manifest.id) || !/^[a-f0-9]{64}$/.test(manifest.packageSha256)) fail();
  const quoted = contract.baseCents + p.additionalMotifs * contract.extraMotifCents;
  const unitCents = quoted - tierDiscount(quoted, p) + p.chargedUploads * contract.extraPhotoCents;
  if (!money(unitCents) || p.unitCents !== unitCents || manifest.product?.basePriceCents !== unitCents ||
      !Number.isSafeInteger(p.quantity) || p.quantity < 1 || p.quantity > 99 || p.totalCents !== unitCents * p.quantity) fail();
  return {unitCents, personalization:{revision:contract.revision, motifs:p.additionalMotifs, uploads:p.chargedUploads,
    // An opaque reference to the privately stored editable original; no customer
    // text, media, download capability or draft token goes into cart attributes.
    designReference:`gravuru:${manifest.id}:${manifest.packageSha256}`}};
}

// K14 (Ü11.1): Staffelabschlag eines Prüfstands. Der Prüfstand ist serverseitig
// erzeugt; geprüft wird, dass Stufe, Menge und Abschlag zum Listenpreis passen.
// Ohne Stufe 0 – bestehende Prüfstände bleiben unverändert.
export function tierDiscount(listCents, price) {
  const tier = price?.quantityTier;
  if (tier === undefined || tier === null) return 0;
  const discount = price.quantityTierDiscountCents;
  if (!tier || typeof tier !== 'object' || !Number.isSafeInteger(tier.minQuantity) || !Number.isSafeInteger(price.quantity) || price.quantity < tier.minQuantity ||
      !Number.isSafeInteger(discount) || discount < 0 || discount > listCents) fail();
  if (Object.hasOwn(tier, 'percentOff') && (!Number.isFinite(tier.percentOff) || listCents - applyQuantityTier(listCents, tier) !== discount)) fail();
  return discount;
}
export const tierUnitCents = (listCents, manifest) => listCents - tierDiscount(listCents, manifest?.selection?.price);

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
