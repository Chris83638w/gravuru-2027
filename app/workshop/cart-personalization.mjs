import {applyQuantityTier, quantityTierFor, vectorLogoAllowed} from '../configurator/variant-m/contract.mjs';
import {readOptionPrices,readSelectedOptions,priceSelectedOptions} from '../../ops/shopify/master-release/priced-options.mjs';
import {validateModuleProfile} from '../configurator/variant-m/module-profile.mjs';

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
  const moduleProfile=document.config?.moduleProfile;
  if(moduleProfile!==undefined)validateModuleProfile(moduleProfile);
  const optionsContract=pricing?.schema==='gravuru-personalization-pricing/v3';
  const vectorLogos=vectorLogoAllowed(document.config),logoContract=pricing?.schema==='gravuru-personalization-pricing/v2'||optionsContract&&has(pricing,'extraLogoCents');
  if (!['gravuru-personalization-pricing/v1','gravuru-personalization-pricing/v2','gravuru-personalization-pricing/v3'].includes(pricing?.schema) || pricing.enabled !== true ||
      !/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/.test(pricing.productId) ||
      !/^[1-9][0-9]{0,9}$/.test(String(pricing.revision)) || pricing.currency !== 'EUR' ||
      pricing.variants?.[variantId] !== baseCents || !money(baseCents) ||
      !money(pricing.extraMotifCents) || !money(pricing.extraPhotoCents) ||
      pricing.extraMotifCents !== document.config?.extraMotifCents ||
      pricing.extraPhotoCents !== document.config?.photo?.extraPriceCents) fail();
  // An explicitly disabled logo module may retain the owning shop's immutable
  // V2 price contract. The module snapshot still forbids all logo uploads/counts;
  // legacy products without a module profile keep the strict schema match.
  const retainedDisabledLogo=pricing.schema==='gravuru-personalization-pricing/v2'&&moduleProfile?.modules.logo===false;
  if(vectorLogos!==logoContract&&!retainedDisabledLogo||(logoContract?pricing.extraLogoCents!==1299:has(pricing,'extraLogoCents')))fail();
  let optionPrices;
  if(optionsContract){
    const fields=document.config?.profile?.optionFields||[];
    if(fields.some(f=>f.kind!=='checkbox'&&((f.priceCents||0)!==0||f.choices?.some(v=>(v.priceCents||0)!==0))))fail();
    try{optionPrices=readOptionPrices(pricing.optionPrices);const expected=readOptionPrices(Object.fromEntries(fields.filter(f=>f.kind==='checkbox'&&(f.priceCents||0)>0).map(f=>[f.id,f.priceCents])));if(JSON.stringify(optionPrices)!==JSON.stringify(expected))fail();}catch{fail();}
  }else if(has(pricing,'optionPrices'))fail();
  const withTiers = has(pricing, 'quantityTiers');
  if (withTiers !== has(document.config, 'quantityTiers')) fail();
  if (withTiers ? pricing.quantityTierScope !== 'complete-unit' || document.config.quantityTierScope !== 'complete-unit' :
      has(pricing, 'quantityTierScope') || has(document.config, 'quantityTierScope')) fail();
  const quantityTiers = withTiers ? checkoutTiers(pricing.quantityTiers) : null;
  if (withTiers && JSON.stringify(quantityTiers) !== JSON.stringify(checkoutTiers(document.config.quantityTiers))) fail();
  return {productId:pricing.productId, revision:String(pricing.revision), baseCents,
    ...(moduleProfile?{moduleProfile:structuredClone(moduleProfile)}:{}),
    extraMotifCents:pricing.extraMotifCents, extraPhotoCents:pricing.extraPhotoCents,
    ...(logoContract?{extraLogoCents:pricing.extraLogoCents}:{}),
    ...(optionsContract?{optionPrices}:{}),
    ...(document.config.motifCharge==='all'?{motifCharge:'all'}:{}),
    ...(withTiers ? {quantityTiers, quantityTierScope:'complete-unit'} : {})};
}

export function personalizationForSnapshot(contract, manifest) {
  const p = manifest.selection?.price;
  // The internal, revision-pinned contract retains module permissions. It is
  // not added to the Shopify Function input or inferred from client flags.
  if(contract?.moduleProfile!==undefined){
    const modules=validateModuleProfile(contract.moduleProfile).modules;
    // V1 counts raster logos together with photos in chargedUploads. Only V2/V3
    // with extraLogoCents splits the counts. Artwork validation has already
    // checked each upload kind against the same saved product revision.
    const uploadsAllowed=modules.photo||(!has(contract,'extraLogoCents')&&modules.logo);
    if(!p||(!uploadsAllowed&&p.chargedUploads!==0)||(!modules.logo&&(p.chargedLogos||0)!==0)||(!modules.motifs&&p.additionalMotifs!==0))fail();
  }
  if (!p || !count(p.additionalMotifs, 200) || !count(p.chargedUploads, 4) ||
      !Number.isSafeInteger(p.quantity) || p.quantity < 1 || p.quantity > 99 ||
      !money(contract?.baseCents) || !money(contract?.extraMotifCents) || !money(contract?.extraPhotoCents) ||
      !/^proof_[a-zA-Z0-9_-]{1,100}$/.test(manifest.id) || !/^[a-f0-9]{64}$/.test(manifest.packageSha256)) fail();
  // The deployed v1 transform cannot price dynamic fields or a back surcharge.
  // Preserve their editor behavior, but never silently charge only the base price.
  if (p.backCents !== undefined && p.backCents !== 0) fail();
  let optionCents=0,selectedOptions;
  if(has(contract,'optionPrices')){
    const fields=manifest.selection?.fields;
    if(!Array.isArray(fields)||new Set(fields.map(f=>f.id)).size!==fields.length)fail();
    selectedOptions=[];
    for(const field of fields){
      if(has(contract.optionPrices,field.id)){
        if(field.kind!=='checkbox'||field.value!==true||field.priceCents!==contract.optionPrices[field.id])fail();
        selectedOptions.push(field.id);
      }else if(field.priceCents!==0)fail();
    }
    selectedOptions.sort();try{optionCents=priceSelectedOptions(contract.optionPrices,selectedOptions);}catch{fail();}
    if(p.fieldCents!==optionCents)fail();
  }else if(p.fieldCents!==undefined&&p.fieldCents!==0)fail();
  const motifCount=contract.motifCharge==='all'?p.chargedMotifs:p.additionalMotifs;
  if(!count(motifCount,200)||motifCount<p.additionalMotifs||contract.motifCharge!=='all'&&has(p,'chargedMotifs'))fail();
  const logoContract=has(contract,'extraLogoCents');
  // Native quotes omit this field when vector upload is disabled. Only the
  // explicit immutable disabled-module snapshot may interpret absence as zero.
  const chargedLogos=contract.moduleProfile?.modules.logo===false&&p.chargedLogos===undefined?0:p.chargedLogos;
  if(logoContract?(contract.extraLogoCents!==1299||!count(chargedLogos,4)||chargedLogos+p.chargedUploads>4):has(p,'chargedLogos'))fail();
  const logoCents=logoContract?chargedLogos*contract.extraLogoCents:0;
  const photoCents = p.chargedUploads * contract.extraPhotoCents;
  const listCents = contract.baseCents + motifCount * contract.extraMotifCents + photoCents + logoCents + optionCents;
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
  return {unitCents, personalization:{revision:contract.revision, motifs:motifCount, uploads:p.chargedUploads,
    ...(logoContract?{logos:chargedLogos}:{}),
    ...(selectedOptions?{options:selectedOptions.join(',')||'-'}:{}),
    // An opaque reference to the privately stored editable original; no customer
    // text, media, download capability or draft token goes into cart attributes.
    designReference:`gravuru:${manifest.id}:${manifest.packageSha256}`}};
}

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


// Entwurfsnachweis an der Zeile (Chris 21.11.2026, 15:22 Uhr: für Kunden nicht mehr sichtbar). Der Wert bleibt derselbe
// undurchsichtige Verweis; nur der Schlüssel wechselt. Shopify blendet Schlüssel mit führendem Unterstrich an der Kasse aus.
// Der sichtbare Schlüssel bleibt gültig: für ältere Warenkörbe und Bestellungen und für jeden Weg, der den privaten noch nicht
// schreibt. Preisfunktion, Kassenprüfung und Bestelleingang lesen beide (ops/shopify/entwurf-privat-release/).
export const DESIGN_REFERENCE_KEY = 'Bearbeitbarer Entwurf';
export const PRIVATE_DESIGN_REFERENCE_KEY = '_gravuru_entwurf';

// `privateDesignReference: true` nur, wenn die aktive Preisfunktion und Kassenprüfung den privaten Schlüssel lesen und der
// Bestelleingang des Speichers ihn annimmt – sonst bliebe die neue Position ohne Preis bzw. würde beim Eingang abgelehnt.
export function personalizationAttributes(value, {privateDesignReference = false} = {}) {
  if (privateDesignReference !== false && privateDesignReference !== true) fail();
  if (value === undefined) return [];
  const logos=has(value,'logos'),options=has(value,'options');
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 4+Number(logos)+Number(options) || !Object.keys(value).every(k=>['revision','motifs','uploads','logos','options','designReference'].includes(k)) ||
      typeof value.revision !== 'string' || !/^[1-9][0-9]{0,9}$/.test(value.revision) ||
      !count(value.motifs,200) || !count(value.uploads,4) || typeof value.designReference !== 'string' ||
      (logos&&(!count(value.logos,4)||value.logos+value.uploads>4)) ||
      !/^gravuru:proof_[a-zA-Z0-9_-]{1,100}:[a-f0-9]{64}$/.test(value.designReference)) fail();
  if(options)try{readSelectedOptions(value.options);}catch{fail();}
  return [{key:'_gravuru_motifs',value:String(value.motifs)}, {key:'_gravuru_uploads',value:String(value.uploads)},
    ...(logos?[{key:'_gravuru_logos',value:String(value.logos)}]:[]),
    ...(options?[{key:'_gravuru_options',value:value.options}]:[]),
    {key:'_gravuru_revision',value:value.revision},
    {key:privateDesignReference ? PRIVATE_DESIGN_REFERENCE_KEY : DESIGN_REFERENCE_KEY,value:value.designReference}];
}

// Rücklesen an einer Bestell- oder Warenkorbzeile: `valuesOf(key)` liefert alle Werte dieses Schlüssels an der Zeile.
// Jede erwartete Angabe steht genau einmal mit genau ihrem Wert da. Der Entwurfsnachweis darf unter dem privaten oder dem
// sichtbaren Schlüssel stehen (oder unter beiden); jeder vorhandene Wert muss der erwartete sein, je Schlüssel höchstens einer.
export function personalizationAttributesMatch(value, valuesOf) {
  for (const expected of personalizationAttributes(value)) {
    if (expected.key !== DESIGN_REFERENCE_KEY) {
      const actual = valuesOf(expected.key);
      if (actual.length !== 1 || actual[0] !== expected.value) return false;
      continue;
    }
    const visible = valuesOf(DESIGN_REFERENCE_KEY), hidden = valuesOf(PRIVATE_DESIGN_REFERENCE_KEY);
    if (visible.length > 1 || hidden.length > 1 || visible.length + hidden.length < 1 ||
        [...visible, ...hidden].some(actual => actual !== expected.value)) return false;
  }
  return true;
}

