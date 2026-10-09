import {createHash} from 'node:crypto';

export const APP_KEY = '9640dd7a6907f0c73e7013ea8c24869b';
export const OLD_HOME = 'https://gravuru-designwerkstatt.de/produktanlage.html';
export const NEW_HOME = 'https://app-2027.gravuru-designwerkstatt.de/werkstatt/';
export const BASELINE_VERSION = 'gid://shopify/Version/1146632241153';
const fail = code => {throw Object.assign(Error('Shopify-Version nicht sicher vorbereitet.'), {code});};
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function validate(modules) {
  if (!Array.isArray(modules) || !modules.length || modules.length > 100) fail('module_inventory');
  const ids = new Set(), uuids = new Set();
  for (const m of modules) {
    if (!m || typeof m.registrationId !== 'string' || !m.registrationId || ids.has(m.registrationId) ||
        typeof m.registrationUuid !== 'string' || !m.registrationUuid || uuids.has(m.registrationUuid) ||
        typeof m.registrationTitle !== 'string' || !m.registrationTitle || typeof m.type !== 'string' || !m.type ||
        !m.config || typeof m.config !== 'object' || Array.isArray(m.config) || typeof m.target !== 'string') fail('module_identity');
    ids.add(m.registrationId); uuids.add(m.registrationUuid);
  }
  for (const [handle, type] of [['app_home', 'app_home'], ['gravuru-storefront', 'theme_app_extension'], ['gravuru-personalization-price', 'function'], ['app_access', 'app_access'], ['webhooks', 'webhooks']]) {
    if (modules.filter(m => m.registrationTitle === handle && m.type === type).length !== 1) fail('required_module');
  }
  const fn = modules.find(m => m.registrationTitle === 'gravuru-personalization-price');
  if (fn.config.app_key !== APP_KEY || typeof fn.config.module_id !== 'string' || !fn.config.module_id || fn.target !== 'cart.transform.run') fail('function_identity');
  const theme = modules.find(m => m.registrationTitle === 'gravuru-storefront');
  if (!theme.config.theme_extension?.files || !Object.keys(theme.config.theme_extension.files).length) fail('theme_files');
}

// Build a proposed version from ALL remote modules, never from an incomplete
// local extension directory. This function neither publishes nor claims that
// remote asset hashes are a complete source/compiled-binary backup.
export function proposeMerchantHome(snapshot, activeVersionId) {
  if (activeVersionId !== BASELINE_VERSION) fail('baseline_changed');
  const modules = snapshot?.appModuleVersions; validate(modules);
  const home = modules.find(m => m.type === 'app_home');
  if (home.config.app_url !== OLD_HOME || home.config.embedded !== true) fail('home_changed');
  if (snapshot.version?.name !== 'Gravuru Konfigurator') fail('app_identity');
  const proposed = structuredClone(modules);
  proposed.find(m => m.registrationId === home.registrationId).config.app_url = NEW_HOME;
  const manifest = {name: snapshot.version.name, handle: '', modules: proposed.map(m => ({
    type: m.type, handle: m.registrationTitle, uid: m.registrationId, uuid: m.registrationUuid,
    ...(m.target ? {target: m.target} : {}), config: m.config
  }))};
  return {manifest, proposed, beforeHash: digest(modules), proposedHash: digest(proposed),
    diff: [{module: home.registrationId, field: 'app_url', before: OLD_HOME, after: NEW_HOME}],
    checkoutConnected: false, fullPublicationReady: false, released: false};
}

// Compare every identity, target and configuration field; reject extra/missing
// modules too. Read-only server metadata is not silently discarded.
export function verifyPreservedCandidate(before, candidate, activeVersionId) {
  const expected = proposeMerchantHome(before, activeVersionId).proposed;
  validate(candidate?.appModuleVersions);
  const fingerprint = modules => modules.map(m => ({id: m.registrationId, uuid: m.registrationUuid,
    handle: m.registrationTitle, type: m.type, target: m.target, config: m.config})).sort((a, b) => a.id.localeCompare(b.id));
  if (candidate.versionTag === undefined || digest(fingerprint(candidate.appModuleVersions)) !== digest(fingerprint(expected))) fail('candidate_changed');
  return {moduleCount: expected.length, exactConfigurationPreservation: true, changedFields: ['app_home.app_url'], released: false};
}
