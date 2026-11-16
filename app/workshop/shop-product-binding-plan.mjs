// Local, server-side planning only. No persistence, HTTP, activation or Shopify calls.
// Leseadapter müssen aus genau einem vertrauenswürdigen Mandanten-Store kommen;
// niemals Browserdaten als Produkt-, Preis-, Profil- oder Shopify-Beleg verwenden.
import {createHash} from 'node:crypto';
import {isBindingReadSnapshot,isBindingProductSnapshot} from './shop-product-binding-read-snapshot.mjs';
const bindingIndexes=new WeakMap();
// Only deeply frozen records made inside a guarded native read phase qualify.
// Untrusted/mutable adapters retain their full per-call digest validation.
const productDigests=new WeakMap();

export const SHOP_BINDING_PLAN_SCHEMA = 'gravuru-shop-product-binding-plan/v1';
const plans = new WeakSet();
const fail = (code, message) => { throw Object.assign(new Error(message), {code, status: 422}); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const integer = v => Number.isSafeInteger(v) && v >= 1;
const cents = v => Number.isSafeInteger(v) && v >= 0 && v <= 100000000;
const numericId = /^[1-9][0-9]{0,19}$/;
const configId = /^cfg_[a-f0-9-]{36}$/;
const profileId = /^mfg_[a-f0-9-]{36}$/;
const sha = /^[a-f0-9]{64}$/;
const schemas = new Set(['gravuru-product/v1', 'gravuru-form-product/v1']);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function gid(value, type) {
  const prefix = `gid://shopify/${type}/`;
  if (typeof value !== 'string' || !value.startsWith(prefix) || !numericId.test(value.slice(prefix.length))) fail('shop_binding_identity', 'Ungültige Shopify-ID.');
  return value.slice(prefix.length);
}
function context(value, expected) {
  if (!object(value) || typeof value.tenantId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.tenantId) ||
      typeof value.shopDomain !== 'string' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value.shopDomain)) fail('shop_binding_context', 'Shop-/Mandantenkontext fehlt.');
  if (expected && (value.tenantId !== expected.tenantId || value.shopDomain !== expected.shopDomain)) fail('shop_binding_context', 'Shop oder Mandant stimmen nicht überein.');
}
function options(value) {
  if (!object(value) || Object.keys(value).length > 64) fail('shop_binding_options', 'Vollständige Ausführungswahl fehlt.');
  const entries = Object.entries(value);
  for (const [k, v] of entries) if (!/^[a-zA-Z0-9_-]{1,100}$/.test(k) || ['__proto__', 'prototype', 'constructor'].includes(k) ||
      typeof v !== 'string' || !v || v.length > 200 || /[\x00-\x1f\x7f]/.test(v)) fail('shop_binding_options', 'Ausführungswahl ist ungültig.');
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b, 'en')));
}
function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  fail('shop_binding_document', 'Produktbeleg enthält keine gültigen JSON-Daten.');
}
const digest = value => {const cacheable=isBindingProductSnapshot(value),cached=cacheable?productDigests.get(value):null;if(cached)return cached;const hash=createHash('sha256').update(canonical(value)).digest('hex');if(cacheable)productDigests.set(value,hash);return hash;};
const equal = (a, b) => canonical(a) === canonical(b);
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function read(adapter, method, ...args) {
  const result = adapter[method](...args);
  if (result?.then instanceof Function) fail('shop_binding_adapter', 'Leseadapter müssen synchron sein.');
  return result;
}
function checkAdapter(adapter, expected) {
  context(adapter, expected);
  if (typeof adapter.storeId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(adapter.storeId) ||
      (expected.storeId !== undefined && adapter.storeId !== expected.storeId)) fail('shop_binding_store', 'Privater Datenspeicher stimmt nicht mit dem Plan überein.');
  for (const method of ['getCurrentProduct', 'resolveSelection', 'resolveProductionProfile', 'getBindings'])
    if (typeof adapter[method] !== 'function') fail('shop_binding_adapter', 'Ein erforderlicher Leseadapter fehlt.');
}
function productSelection(adapter, item, purpose) {
  if (!object(item) || !configId.test(item.productId) || !integer(item.productRevision)) fail('shop_binding_product', 'Produkt-ID und fester Produktstand sind erforderlich.');
  const record = read(adapter, 'getCurrentProduct', item.productId);
  if (!object(record) || record.id !== item.productId || record.revision !== item.productRevision) fail('shop_binding_revision', 'Der ausgewählte Produktstand ist nicht mehr aktuell.');
  if (record.status === 'archived' || record.document?.kind !== 'product' || !schemas.has(record.document?.schema)) fail('shop_binding_product', 'Kein unterstütztes aktives Produkt.');
  const selected = options(item.options);
  if (record.document.schema === 'gravuru-product/v1') {
    const groups = record.document.config?.profile?.optionGroups;
    if (!Array.isArray(groups) || Object.keys(selected).some(key => !groups.some(group => group.id === key)))
      fail('shop_binding_options', 'Nur echte Ausführungsgruppen dürfen eine Shop-Variante bestimmen, keine Kunden-Zusatzfelder.');
  }
  // Der bestehende Auflöser prüft Ausführungen und Basispreis. Hier keine Preisformel.
  const resolved = read(adapter, 'resolveSelection', record, selected);
  if (!object(resolved) || !equal(options(resolved.options), selected) || !cents(resolved.unitCents)) fail('shop_binding_selection', 'Ausführung oder bestätigter Basispreis stimmen nicht überein.');
  if (record.document.schema === 'gravuru-form-product/v1' && Object.keys(selected).length) fail('shop_binding_options', 'Formprodukt ist bereits eine feste Ausführung.');
  const ref = record.document.productionProfile;
  let productionProfileRef = null;
  if (ref == null) {
    if (purpose !== 'id-binding') {
      // Preserve the strict adapter's established missing-profile error. An
      // adapter returning null (or any value without a reference) still fails.
      read(adapter, 'resolveProductionProfile', record.document);
      fail('shop_binding_profile', 'Passender fester Fertigungsprofilstand fehlt.');
    }
  } else {
    // ID planning permits only an actually absent assignment. Never suppress a
    // malformed, missing revision, archived or incompatible existing reference.
    if (!object(ref) || Object.keys(ref).length !== 2 || !profileId.test(ref.id) || !integer(ref.revision))
      fail('shop_binding_profile', 'Der gespeicherte Fertigungsprofilverweis ist ungültig.');
    const profile = read(adapter, 'resolveProductionProfile', record.document);
    if (!object(profile) || profile.id !== ref.id || profile.revision !== ref.revision || !sha.test(profile.sha256) ||
        !object(profile.document) || profile.document.archived === true) fail('shop_binding_profile', 'Passender fester Fertigungsprofilstand fehlt.');
    productionProfileRef = {id: profile.id, revision: profile.revision, sha256: profile.sha256};
  }
  return {productId: record.id, productRevision: record.revision, productSchema: record.document.schema,
    documentSha256: digest(record.document), options: selected, baseUnitCents: resolved.unitCents,
    productionProfileRef};
}
function evidenceTime(evidence, now, maxAgeMs) {
  if (!Number.isSafeInteger(now) || !integer(maxAgeMs) || maxAgeMs > 86400000 || typeof evidence.readAt !== 'string') fail('shop_binding_freshness', 'Explizite Gültigkeitsdauer des Shop-Belegs fehlt.');
  const readAt = Date.parse(evidence.readAt);
  if (!Number.isFinite(readAt) || readAt > now || now - readAt > maxAgeMs) fail('shop_binding_freshness', 'Shop-Beleg ist veraltet oder liegt in der Zukunft.');
}
function bindings(adapter) {
  const rows = read(adapter, 'getBindings');
  if (!Array.isArray(rows)) fail('shop_binding_existing', 'Bestehende Bindungen fehlen.');
  const scope=JSON.stringify([adapter.tenantId,adapter.shopDomain,adapter.storeId]);
  const cached=isBindingReadSnapshot(rows)?bindingIndexes.get(rows):null;
  if(cached?.scope===scope)return cached;
  const ids = new Set();
  for (const row of rows) {
    if (!object(row) || typeof row.id !== 'string' || !/^binding_[a-f0-9-]{36}$/.test(row.id) || ids.has(row.id) ||
        row.shopDomain !== adapter.shopDomain || !numericId.test(row.variantId) || !configId.test(row.productId) ||
        !integer(row.productRevision) || !cents(row.unitCents) || (own(row, 'tenantId') && row.tenantId !== adapter.tenantId)) fail('shop_binding_existing', 'Bestehende Bindung ist fremd, doppelt oder ungültig.');
    ids.add(row.id);
  }
  const byVariant=new Map(),byProductRevision=new Map(),choices=new Map();
  for(const row of rows){
    const key=JSON.stringify([row.productId,row.productRevision]);
    if(!byVariant.has(row.variantId))byVariant.set(row.variantId,[]);
    if(!byProductRevision.has(key))byProductRevision.set(key,[]);
    byVariant.get(row.variantId).push(row);byProductRevision.get(key).push(row);
  }
  const indexed={scope,rows,byVariant,byProductRevision,choices};
  if(isBindingReadSnapshot(rows))bindingIndexes.set(rows,indexed);
  return indexed;
}
function existingBinding(rows, target) {
  const variants=rows.byVariant.get(target.variantId)||[],key=JSON.stringify([target.productId,target.productRevision]);
  let choices=rows.choices.get(key);
  if(!choices){
    choices=new Map();
    for(const row of rows.byProductRevision.get(key)||[]){
      const selected=canonical(options(row.options??{}));
      if(!choices.has(selected))choices.set(selected,[]);choices.get(selected).push(row);
    }
    rows.choices.set(key,choices);
  }
  const selected=choices.get(canonical(target.options))||[];
  if (variants.some(row => row.productId !== target.productId) ||
      selected.some(row => row.variantId !== target.variantId))
    fail('shop_binding_existing_conflict', 'Bestehende Varianten- und Konfigurationszuordnungen sind nicht eindeutig.');
  const matches = variants.filter(r => r.productId === target.productId && r.productRevision === target.productRevision);
  if (matches.length > 1) fail('shop_binding_ambiguous', 'Mehrere bestehende Bindungen passen zur selben Ausführung.');
  const row = matches[0];
  if (row && (row.unitCents !== target.baseUnitCents || !equal(options(row.options ?? {}), target.options))) fail('shop_binding_existing', 'Bestehende Bindung hat andere Optionen oder einen anderen Basispreis.');
  return row ? {mode: 'reuse', id: row.id} : {mode: 'bind-required', id: null};
}

/**
 * Shopify-Beleg: {tenantId,shopDomain,readAt,complete:true,products:[{id,variants:[{id,productId,priceCents}]}]}.
 * Auswahl: {shopifyProductId,shopifyVariantId,productId,productRevision,options}.
 * Adapter: vertrauenswürdige tenant-/shopgebundene READ-Funktionen; getBindings = orderIntake.bindings.
 * resolveSelection wählt exakt eine vorhandene prepareShopProduct(record).variants-Zeile;
 * Kunden-Zusatzfelder gehören später in den privaten Entwurf, nicht in diese Bindung.
 * Kein SKU-Lookup: der einmalige SKU-Abgleich muss bereits eindeutig konkrete IDs geliefert haben.
 */
export function planShopProductBindings({tenantId, shopDomain, shopifyEvidence, selections, adapter, purpose = 'profile-bound', now = Date.now(), maxEvidenceAgeMs} = {}) {
  if (!['id-binding', 'profile-bound'].includes(purpose)) fail('shop_binding_purpose', 'Ein unterstützter serverseitiger Planzweck ist erforderlich.');
  const ctx = {tenantId, shopDomain}; context(ctx); checkAdapter(adapter, ctx); context(shopifyEvidence, ctx);
  evidenceTime(shopifyEvidence, now, maxEvidenceAgeMs);
  if (shopifyEvidence.complete !== true || !Array.isArray(shopifyEvidence.products) || !Array.isArray(selections) || !selections.length) fail('shop_binding_incomplete', 'Vollständiger Shop-Beleg und explizite Auswahl sind erforderlich.');
  const productIds = new Set(), variants = new Map();
  for (const product of shopifyEvidence.products) {
    if (!object(product)) fail('shop_binding_incomplete', 'Shopify-Produktbeleg fehlt.');
    gid(product.id, 'Product');
    if (productIds.has(product.id) || !Array.isArray(product.variants)) fail('shop_binding_ambiguous', 'Doppeltes oder unvollständiges Shopify-Produkt.');
    productIds.add(product.id);
    for (const variant of product.variants) {
      if (!object(variant)) fail('shop_binding_incomplete', 'Shopify-Variantenbeleg fehlt.');
      gid(variant.id, 'ProductVariant');
      if (variant.productId !== product.id || variants.has(variant.id) || !cents(variant.priceCents)) fail('shop_binding_ownership', 'Variante gehört nicht eindeutig zum Shop-Produkt.');
      variants.set(variant.id, {...variant, productId: product.id});
    }
  }
  const prior = bindings(adapter), chosen = new Set();
  const entries = selections.map(item => {
    if (!object(item)) fail('shop_binding_incomplete', 'Explizite Produktzuordnung fehlt.');
    gid(item.shopifyProductId, 'Product'); const variantId = gid(item.shopifyVariantId, 'ProductVariant');
    const shopVariant = variants.get(item.shopifyVariantId);
    if (!shopVariant || shopVariant.productId !== item.shopifyProductId) fail('shop_binding_ownership', 'Shopify-Produkt und Variante sind nicht gemeinsam bestätigt.');
    if (chosen.has(item.shopifyVariantId)) fail('shop_binding_ambiguous', 'Eine Variante hat mehrere ausgewählte Zielkonfigurationen.');
    chosen.add(item.shopifyVariantId);
    const selected = productSelection(adapter, item, purpose);
    if (selected.baseUnitCents !== shopVariant.priceCents) fail('shop_binding_price', 'Shop-Basispreis weicht vom bestehenden Produktauflöser ab.');
    const target = {...selected, shopifyProductId: item.shopifyProductId, shopifyVariantId: item.shopifyVariantId, variantId};
    return {...target, binding: existingBinding(prior, target)};
  });
  const plan = freeze({schema: SHOP_BINDING_PLAN_SCHEMA, ...ctx, storeId: adapter.storeId, purpose, mode: 'plan-only',
    productionStatus: entries.some(entry => entry.productionProfileRef === null) ? 'profile-assignment-pending' : 'not-released',
    productionReady: false, publicAccess: false, checkoutEnabled: false,
    evidenceReadAt: shopifyEvidence.readAt, maxEvidenceAgeMs, entries});
  plans.add(plan); return plan;
}

/** Exact ID lookup only. Rechecks current product/profile/binding evidence; never activates a plan. */
export function resolveShopProductBinding(plan, {tenantId, shopDomain, shopifyProductId, shopifyVariantId, adapter, now = Date.now()} = {}) {
  if (!plans.has(plan)) fail('shop_binding_plan', 'Erst einen lokalen Plan mit bestätigten Belegen erzeugen.');
  context({tenantId, shopDomain}, plan); checkAdapter(adapter, plan);
  evidenceTime({readAt: plan.evidenceReadAt}, now, plan.maxEvidenceAgeMs);
  gid(shopifyProductId, 'Product'); gid(shopifyVariantId, 'ProductVariant');
  const found = plan.entries.filter(e => e.shopifyProductId === shopifyProductId && e.shopifyVariantId === shopifyVariantId);
  if (found.length !== 1) fail('shop_binding_unknown', 'Keine eindeutige geplante Zuordnung für diese Shopify-IDs.');
  const entry = found[0], current = productSelection(adapter, entry, plan.purpose);
  for (const key of ['productId', 'productRevision', 'productSchema', 'documentSha256', 'options', 'baseUnitCents', 'productionProfileRef'])
    if (!equal(current[key], entry[key])) fail('shop_binding_changed', 'Produkt-, Options- oder Profilbeleg hat sich seit der Planung geändert.');
  if (!equal(existingBinding(bindings(adapter), entry), entry.binding)) fail('shop_binding_changed', 'Shop-Bindung hat sich seit der Planung geändert.');
  return freeze({...entry, tenantId, shopDomain, storeId: plan.storeId, purpose: plan.purpose, mode: 'plan-only',
    productionStatus: entry.productionProfileRef === null ? 'profile-assignment-pending' : 'not-released',
    productionReady: false, publicAccess: false, checkoutEnabled: false});
}

