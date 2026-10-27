import {createHash} from 'node:crypto';
import {isBindingReadSnapshot,withBindingReadSnapshot} from './shop-product-binding-read-snapshot.mjs';
import {planShopProductBindings} from './shop-product-binding-plan.mjs';

const fail = (code, message, status = 422) => { throw Object.assign(new Error(message), {code, status}); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const fields = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bindingDigests=new WeakMap();
function bindingDigest(rows){if(!isBindingReadSnapshot(rows))return digest(rows);if(!bindingDigests.has(rows))bindingDigests.set(rows,digest(rows));return bindingDigests.get(rows);}
const allowed = ['shopifyProductId', 'shopifyVariantId', 'productId', 'productRevision', 'options'];
const productGid = /^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/;
const variantGid = /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const optionsKey = value => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')));

function selectionsFrom(input) {
  if (!fields(input, ['selections']) || !Array.isArray(input.selections) || !input.selections.length || input.selections.length > 100)
    fail('shop_binding_fields', 'Eine bis höchstens 100 ausdrückliche Zuordnungen angeben.');
  const ids = new Set();
  return input.selections.map(item => {
    if (!fields(item, allowed) || typeof item.shopifyProductId !== 'string' || typeof item.shopifyVariantId !== 'string' ||
        !productGid.test(item.shopifyProductId) || !variantGid.test(item.shopifyVariantId) ||
        typeof item.productId !== 'string' || !/^cfg_[a-f0-9-]{36}$/.test(item.productId) ||
        !Number.isSafeInteger(item.productRevision) || item.productRevision < 1 || !plain(item.options) || Object.keys(item.options).length > 64)
      fail('shop_binding_fields', 'Nur Produkt-IDs, Varianten-ID, festen Produktstand und Ausführungswahl angeben.');
    for (const [key, value] of Object.entries(item.options)) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key) ||
          typeof value !== 'string' || !value || value.length > 200 || /[\x00-\x1f\x7f]/.test(value))
        fail('shop_binding_options', 'Ungültige Ausführungswahl.');
    }
    if (ids.has(item.shopifyVariantId)) fail('shop_binding_ambiguous', 'Eine Shopify-Variante darf im Prüflauf nur einmal zugeordnet sein.');
    ids.add(item.shopifyVariantId);
    return structuredClone(item);
  });
}

/** Server-injected readers only. Browser input never supplies shop evidence, prices or profiles. */
export function createShopProductBindingCheck({adapter, reader, clock = Date.now, maxEvidenceAgeMs = 60000} = {}) {
  if (!adapter || !reader || typeof reader.inspectVariants !== 'function' || typeof clock !== 'function' ||
      !Number.isSafeInteger(maxEvidenceAgeMs) || maxEvidenceAgeMs < 1 || maxEvidenceAgeMs > 60000 ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(adapter.tenantId) || !/^[a-zA-Z0-9_-]{1,100}$/.test(adapter.storeId) ||
      !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(adapter.shopDomain) ||
      ['getCurrentProduct', 'resolveSelection', 'resolveProductionProfile', 'getBindings', 'readiness'].some(key => typeof adapter[key] !== 'function'))
    fail('shop_binding_configuration', 'Die private Zuordnungsprüfung ist nicht eingerichtet.', 503);
  const scope = Object.freeze({tenantId: adapter.tenantId, shopDomain: adapter.shopDomain, storeId: adapter.storeId});
  function ensureScope() {
    if (Object.keys(scope).some(key => adapter[key] !== scope[key])) fail('shop_binding_context', 'Der bestätigte Datenspeicher wurde geändert.', 409);
  }
  function capture(item) {
    const record = adapter.getCurrentProduct(item.productId);
    if (record?.id !== item.productId || record.revision !== item.productRevision) fail('shop_binding_revision', 'Der Produktstand wurde inzwischen geändert.', 409);
    if (record.status === 'archived' || record.document?.kind !== 'product') fail('shop_binding_product', 'Ein aktives eigenes Produkt ist erforderlich.');
    const selected = adapter.resolveSelection(record, item.options);
    if (!plain(selected?.options) || optionsKey(selected.options) !== optionsKey(item.options) || !Number.isSafeInteger(selected.unitCents) || selected.unitCents < 0)
      fail('shop_binding_selection', 'Ausführung und gespeicherter Grundpreis sind nicht eindeutig.');
    const readiness = adapter.readiness(record);
    if (!plain(readiness) || !Array.isArray(readiness.blockers)) fail('shop_binding_configuration', 'Der Bereitschaftsnachweis fehlt.', 503);
    // Compare before/after the network await: no silently changed source, profile or binding.
    const bindings = adapter.getBindings();
    if (!Array.isArray(bindings)) fail('shop_binding_configuration', 'Gespeicherte Zuordnungen fehlen.', 503);
    const conflicts = [];
    const variantId = item.shopifyVariantId.split('/').at(-1);
    for (const row of bindings) {
      if (row.shopDomain !== scope.shopDomain) fail('shop_binding_context', 'Eine gespeicherte Zuordnung gehört zu einem anderen Shop.');
      if (row.variantId === variantId && row.productId !== item.productId)
        conflicts.push({code: 'variant_config_conflict', message: 'Diese Shopify-Variante ist bereits einer anderen Konfiguration zugeordnet.'});
      if (row.productId === item.productId && row.productRevision === item.productRevision &&
          optionsKey(row.options ?? {}) === optionsKey(item.options) && row.variantId !== variantId)
        conflicts.push({code: 'selection_variant_conflict', message: 'Diese gespeicherte Ausführung besitzt bereits eine andere Shopify-Varianten-ID.'});
    }
    const blockers = [...readiness.blockers, ...conflicts]
      .filter((value, index, values) => values.findIndex(other => other.code === value.code) === index)
      .map(({code, message}) => ({code, message}));
    const profileMissing = record.document.productionProfile == null;
    const productionPending = blockers.filter(value => profileMissing && value.code === 'production_profile_missing');
    const bindingBlockers = blockers.filter(value => !profileMissing || value.code !== 'production_profile_missing');
    const publicReadiness = {productId: record.id, productRevision: record.revision,
      sourceReady: readiness.sourceReady === true,
      productionStatus: profileMissing ? 'profile-assignment-pending' : 'not-released',
      productionReady: false, publicAccess: false, checkoutEnabled: false,
      productionBlockers: Array.isArray(readiness.productionBlockers) ? readiness.productionBlockers.filter(value => typeof value === 'string') : [],
      productionPending, bindingBlockers, blockers: bindingBlockers,
      productionProfileRef: !profileMissing && readiness.productionProfileRef ? {id: readiness.productionProfileRef.id,
        revision: readiness.productionProfileRef.revision, sha256: readiness.productionProfileRef.sha256} : null};
    return {unitCents: selected.unitCents, readiness: publicReadiness,
      stateHash: digest({record, selected, readiness, bindingsSha256:bindingDigest(bindings)})};
  }
  return Object.freeze({async check(input) {
    ensureScope();
    const selections = selectionsFrom(input), before = withBindingReadSnapshot(adapter,()=>selections.map(capture)), started = clock();
    if (!Number.isSafeInteger(started) || started < 0) fail('shop_binding_freshness', 'Ungültige Prüfzeit.');
    let response;
    try { response = await reader.inspectVariants(selections.map(item => item.shopifyVariantId)); }
    catch { fail('shop_binding_remote_unavailable', 'Shopify konnte die angefragten IDs nicht bestätigen. Es wurde nichts gespeichert.', 502); }
    ensureScope();
    const now = clock();
    if (!Number.isSafeInteger(now) || now < started || now - started > maxEvidenceAgeMs)
      fail('shop_binding_freshness', 'Die Shopify-Prüfung hat zu lange gedauert. Bitte erneut prüfen.', 409);
    if (response?.installation?.shopDomain !== scope.shopDomain || response.installation.currency !== 'EUR' ||
        response.installation.scope !== 'admin-readonly' || !Array.isArray(response.variants) || response.variants.length !== selections.length)
      fail('shop_binding_shop_evidence', 'Shopify-Shop, Währung oder Antwortumfang stimmen nicht überein.', 502);
    const byId = new Map();
    for (const variant of response.variants) {
      if (!plain(variant) || typeof variant.id !== 'string' || !variantGid.test(variant.id) || byId.has(variant.id))
        fail('shop_binding_shop_evidence', 'Shopify-Varianten sind nicht eindeutig.', 502);
      byId.set(variant.id, variant);
    }
    return withBindingReadSnapshot(adapter,()=>{
    const products = new Map(), entries = selections.map((item, index) => {
      const current = capture(item), variant = byId.get(item.shopifyVariantId);
      if (current.stateHash !== before[index].stateHash) fail('shop_binding_changed', 'Produkt, Profil oder Zuordnung wurde während der Prüfung geändert.', 409);
      if (!variant || variant.found !== true || variant.productId !== item.shopifyProductId || !['ACTIVE', 'DRAFT', 'UNLISTED'].includes(variant.status))
        fail('shop_binding_ownership', 'Shopify-Produkt und Variante sind nicht gemeinsam verfügbar.');
      if (!Number.isSafeInteger(variant.priceCents) || variant.priceCents !== current.unitCents)
        fail('shop_binding_price', 'Shopify-Grundpreis und gespeicherte Ausführung unterscheiden sich.');
      if (!products.has(item.shopifyProductId)) products.set(item.shopifyProductId, {id: item.shopifyProductId, variants: []});
      products.get(item.shopifyProductId).variants.push({id: variant.id, productId: variant.productId, priceCents: variant.priceCents});
      return {...item, baseUnitCents: current.unitCents, shopifyStatus: variant.status, readiness: current.readiness};
    });
    const ready = entries.every(item => item.readiness.sourceReady === true && item.readiness.bindingBlockers.length === 0);
    const evidence = {tenantId: scope.tenantId, shopDomain: scope.shopDomain, readAt: new Date(started).toISOString(),
      complete: true, products: [...products.values()]};
    const plan = ready ? planShopProductBindings({...scope, purpose: 'id-binding', shopifyEvidence: evidence, selections, adapter, now, maxEvidenceAgeMs}) : null;
    return {schema: 'gravuru-shop-product-binding-check/v1', ...scope, mode: 'private-read-only-check',
      purpose: 'id-binding', status: ready ? 'id-plan-ready' : 'blocked', checkedAt: new Date(now).toISOString(),
      productionStatus: entries.some(item => item.readiness.productionStatus === 'profile-assignment-pending') ? 'profile-assignment-pending' : 'not-released',
      productionReady: false, publicAccess: false, checkoutEnabled: false, written: false, shopifyWrites: false,
      shopIdentityConfirmed: true, completeness: 'requested-variants-only', entries, plan};
    });
  }});
}

