// Private synchronous reads over EXISTING server instances. No database constructor,
// migration, binding write, Shopify request, price formula or material conversion.
import {isDeepStrictEqual} from 'node:util';
import {immutableBindingReadSnapshot,immutableBindingProductSnapshot,isBindingProductSnapshot} from './shop-product-binding-read-snapshot.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const configId = /^cfg_[a-f0-9-]{36}$/;
const profileId = /^mfg_[a-f0-9-]{36}$/;
const sha = /^[a-f0-9]{64}$/;
const positive = v => Number.isSafeInteger(v) && v > 0;
const cents = v => Number.isSafeInteger(v) && v >= 0 && v <= 100000000;
const schemas = new Set(['gravuru-product/v1', 'gravuru-form-product/v1']);
const sourceChecks = new Set(['availability','kind','designs','material','method','price','variants']);
function fail(code, message, status = 422) { throw Object.assign(new Error(message), {code, status}); }
function copy(value) {
  try { return structuredClone(value); }
  catch { fail('shop_binding_adapter_data', 'Der gespeicherte Lesezugriff liefert keine kopierbaren Daten.'); }
}
function choice(value) {
  if (!object(value) || Object.keys(value).length > 64) fail('shop_binding_options', 'Vollständige Ausführungswahl fehlt.');
  for (const [key, val] of Object.entries(value)) if (!/^[A-Za-z0-9_-]{1,100}$/.test(key) ||
      ['__proto__','constructor','prototype'].includes(key) || typeof val !== 'string' || !val || val.length > 200 || /[\x00-\x1f\x7f]/.test(val))
    fail('shop_binding_options', 'Ungültige Ausführungswahl.');
  return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b, 'en')));
}
const optionKey = value => JSON.stringify(choice(value));
function sync(target, method, ...args) {
  const result = target[method](...args);
  if (result && typeof result.then === 'function') fail('shop_binding_adapter_async', 'Der Leseadapter muss synchron arbeiten.');
  return result;
}

/** productionProfileScope is an explicit SERVER-FACTORY assertion, not a DB proof.
 * Never construct any of these parameters from browser fields. The factory must
 * attest that the existing profile instance belongs to this exact tenant/store.
 */
export function createShopBindingReadAdapter({storeId, tenantId, shopDomain, workshop, productionProfileScope} = {}) {
  if (typeof storeId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(storeId) ||
      typeof tenantId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(tenantId) ||
      typeof shopDomain !== 'string' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain) || !object(workshop))
    fail('shop_binding_adapter_scope', 'Expliziter privater Store-, Mandanten- und Shopkontext fehlt.');
  if (!object(productionProfileScope) || Object.keys(productionProfileScope).length !== 2 ||
      productionProfileScope.storeId !== storeId || productionProfileScope.tenantId !== tenantId)
    fail('shop_binding_profile_scope', 'Der Server muss den Store und Mandanten der vorhandenen Profilinstanz bestätigen.');
  const {repository, orderIntake, productionProfiles} = workshop;
  if (!repository || typeof repository.get !== 'function' || !orderIntake || typeof orderIntake.bindings !== 'function' ||
      !productionProfiles || typeof productionProfiles.resolve !== 'function')
    fail('shop_binding_adapter_instances', 'Vorhandene Repository-, Bindungs- und Profilinstanzen fehlen.');
  const documents = new WeakMap();
  let bindingRead=null;
  function withBindingReadSnapshot(read,{readProductStamp,reuseSnapshot=false}={}){
    scope();
    if(typeof read!=='function'||readProductStamp!==undefined&&typeof readProductStamp!=='function')fail('shop_binding_snapshot_scope','A synchronous binding read phase is required.');
    // Nested native validation shares the caller's still-locked phase. A new
    // source guard must never replace the guard of an existing phase.
    if(bindingRead){if(!reuseSnapshot||readProductStamp&&readProductStamp!==bindingRead.readProductStamp)fail('shop_binding_snapshot_scope','The binding read source changed.');const value=read();if(value?.then instanceof Function)fail('shop_binding_adapter_async','A binding read phase must be synchronous.');return value;}
    bindingRead={rows:null,readiness:new Map(),products:new Map(),prepared:new WeakMap(),readProductStamp};
    try{const value=read();if(value&&typeof value.then==='function')fail('shop_binding_adapter_async','A binding read phase must be synchronous.');return value;}finally{bindingRead=null;}
  }
  function scope() {
    if (workshop.tenantId !== tenantId || repository.tenantId !== tenantId || orderIntake.tenantId !== tenantId ||
        workshop.sessionContext?.shopDomain !== shopDomain || workshop.repository !== repository ||
        workshop.orderIntake !== orderIntake || workshop.productionProfiles !== productionProfiles ||
        (own(productionProfiles, 'tenantId') && productionProfiles.tenantId !== tenantId))
      fail('shop_binding_adapter_scope', 'Vorhandene Instanzen passen nicht mehr zum festgelegten privaten Kontext.');
  }
  scope();
  function getCurrentProduct(id) {
    scope();
    if (typeof id !== 'string' || !configId.test(id)) fail('shop_binding_product', 'Eine gespeicherte Produkt-ID ist erforderlich.');
    const stamp=bindingRead?.readProductStamp?.(id),cached=bindingRead?.products.get(id);
    if(cached){if(!isDeepStrictEqual(stamp,cached.stamp))fail('shop_binding_revision','Der Produktstand wurde innerhalb der gesperrten Prüfung geändert.',409);return cached.record;}
    let value;
    try { value = sync(repository, 'get', id); }
    catch (error) {
      if (error?.code === 'shop_binding_adapter_async') throw error;
      fail('shop_binding_product_missing', 'Produkt im festgelegten Store nicht verfügbar.', error?.status === 404 ? 404 : 422);
    }
    if (!object(value) || value.id !== id || !positive(value.revision) || !object(value.document) ||
        (own(value, 'tenantId') && value.tenantId !== tenantId)) fail('shop_binding_product', 'Produktbeleg oder fester Stand ist ungültig.');
    const result = copy(value);
    if(stamp!==undefined){
      // The stamp is read from the exact locked binding database, not browser
      // state. Recheck after repository access in case a local callback wrote.
      if(!isDeepStrictEqual(stamp,bindingRead.readProductStamp(id)))fail('shop_binding_revision','Der Produktstand wurde während des Lesens geändert.',409);
      immutableBindingProductSnapshot(result);bindingRead.products.set(id,{stamp,record:result});
    }
    documents.set(result.document, isBindingProductSnapshot(result)?result:copy(result));
    return result;
  }
  function currentRecord(value) {
    const result = getCurrentProduct(typeof value === 'string' ? value : value?.id);
    if (typeof value !== 'string' && (!object(value) || result!==value&&!isDeepStrictEqual(result, value)))
      fail('shop_binding_revision', 'Der übergebene Produktbeleg entspricht nicht dem aktuellen gespeicherten Stand.', 409);
    return result;
  }
  function prepared(record) {
    if (!schemas.has(record.document.schema)) fail('shop_binding_product_schema', 'Dieser Produktvertrag wird nicht unterstützt.');
    const cached=bindingRead?.prepared.get(record);if(cached)return cached;
    try {const value=prepareShopProduct(record);if(isBindingProductSnapshot(record))bindingRead?.prepared.set(record,value);return value;}
    catch { fail('shop_binding_source_invalid', 'Der gespeicherte Produktvertrag kann noch nicht für den Shop vorbereitet werden.'); }
  }
  function resolveSelection(record, selected) {
    scope();
    const current = currentRecord(record), options = choice(selected), source = prepared(current);
    if (source.sourceReady !== true) fail('shop_binding_source_not_ready', 'Die gespeicherten Produktgrundlagen sind noch nicht vollständig.');
    const matches = source.variants.filter(variant => optionKey(variant.options) === optionKey(options));
    if (matches.length !== 1 || !cents(matches[0].priceCents)) fail('shop_binding_selection', 'Keine eindeutige gespeicherte Ausführung für diese Auswahl.');
    return {options: copy(matches[0].options), unitCents: matches[0].priceCents};
  }
  function resolveProductionProfile(document) {
    scope();
    const baseline = documents.get(document);
    if (!baseline || !isDeepStrictEqual(document, baseline.document)) fail('shop_binding_profile_document', 'Das Fertigungsprofil benötigt einen unveränderten gespeicherten Produktbeleg.');
    const current = currentRecord(baseline), ref = current.document.productionProfile;
    if (ref == null) fail('production_profile_missing', 'Dem Produkt ist noch kein fester Fertigungsprofilstand zugeordnet.');
    if (!object(ref) || !profileId.test(ref.id) || !positive(ref.revision)) fail('production_profile_invalid', 'Der Fertigungsprofilverweis ist ungültig.');
    let profile;
    try { profile = sync(productionProfiles, 'resolve', copy(current.document)); }
    catch (error) {
      if (error?.code === 'shop_binding_adapter_async') throw error;
      fail('production_profile_invalid', 'Der gespeicherte Fertigungsprofilstand fehlt oder passt nicht zu diesem Produkt.');
    }
    if (!object(profile) || profile.id !== ref.id || profile.revision !== ref.revision || !sha.test(profile.sha256) ||
        !object(profile.document) || profile.document.archived === true || (own(profile, 'tenantId') && profile.tenantId !== tenantId))
      fail('production_profile_invalid', 'Der bestätigte Fertigungsprofilstand ist ungültig oder archiviert.');
    return copy(profile);
  }
  function getBindings() {
    scope();
    if(bindingRead?.rows)return bindingRead.rows;
    const values = sync(orderIntake, 'bindings');
    if (!Array.isArray(values) || values.some(row => !object(row) || typeof row.shopDomain !== 'string' ||
        (own(row, 'tenantId') && row.tenantId !== tenantId))) fail('shop_binding_existing', 'Der bestehende Bindungsbeleg ist ungültig oder mandantenfremd.');
    const rows=copy(values.filter(row => row.shopDomain === shopDomain));
    return bindingRead?(bindingRead.rows=immutableBindingReadSnapshot(rows)):rows;
  }
  function readiness(recordOrProductId) {
    scope(); // Configuration/identity failures must never be downgraded to product blockers.
    const blockers = [], add = (code, message) => { if (!blockers.some(b => b.code === code)) blockers.push({code, message}); };
    let record, source, profile;
    try { record = currentRecord(recordOrProductId); }
    catch (error) {
      if (error?.code === 'shop_binding_adapter_scope' || error?.code === 'shop_binding_adapter_async') throw error;
      add(error.code || 'shop_binding_product', error.message);
    }
    if (record) {
      try {
        source = prepared(record);
        for (const check of source.checks) if (sourceChecks.has(check.id) && check.status !== 'ready') add('source_' + check.id, check.message);
        if (source.sourceReady !== true && !blockers.length) add('source_not_ready', 'Die Produktgrundlagen sind noch nicht vollständig.');
      } catch (error) { add(error.code, error.message); }
      try { profile = resolveProductionProfile(record.document); }
      catch (error) {
        if (error?.code === 'shop_binding_adapter_scope' || error?.code === 'shop_binding_adapter_async') throw error;
        add(error.code, error.message);
      }
      const existing=getBindings(),readKey=JSON.stringify([record.id,record.revision]);
      let indexed=bindingRead?.readiness.get(readKey);
      if(!indexed){
        const current=existing.filter(row=>row.productId===record.id&&row.productRevision===record.revision);
        const variantProducts=new Map(),selectionVariants=new Map();
        for(const row of existing){
          if(!variantProducts.has(row.variantId))variantProducts.set(row.variantId,new Set());
          variantProducts.get(row.variantId).add(row.productId);
        }
        if(current.length>1)for(const row of current){
          const selected=optionKey(row.options??{});
          if(!selectionVariants.has(selected))selectionVariants.set(selected,new Set());
          selectionVariants.get(selected).add(row.variantId);
        }
        indexed={current,variantProducts,selectionVariants};
        bindingRead?.readiness.set(readKey,indexed);
      }
      const {current,variantProducts,selectionVariants}=indexed;
      for(const row of current){
        if(variantProducts.get(row.variantId).size>1)
          add('binding_variant_product_conflict', 'Eine bestehende Shopify-Variante ist mehreren Konfigurationsprodukten zugeordnet.');
        if(current.length>1&&selectionVariants.get(optionKey(row.options??{})).size>1)
          add('binding_selection_ambiguous', 'Dieselbe gespeicherte Ausführung besitzt mehrere Shopify-Variantenbindungen.');
      }
    }
    return {productId: record?.id ?? (typeof recordOrProductId === 'string' && configId.test(recordOrProductId) ? recordOrProductId : null),
      productRevision: record?.revision ?? null, productSchema: record?.document.schema ?? null,
      sourceReady: source?.sourceReady === true, blockers, ready: blockers.length === 0,
      productionProfileRef: profile ? {id: profile.id, revision: profile.revision, sha256: profile.sha256} : null,
      productionBlockers: copy(profile?.blockers ?? []), productionReady: false,
      scope: 'private-readiness-only', publicAccess: false, checkoutEnabled: false};
  }
  return Object.freeze({tenantId, shopDomain, storeId, getCurrentProduct, resolveSelection, resolveProductionProfile, getBindings, readiness, withBindingReadSnapshot});
}
