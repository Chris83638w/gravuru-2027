import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {selectedProfile, resolvedOptions} from '../../app/configurator/variant-m/contract.mjs';
import {physicalGeometry} from '../../app/configurator/variant-m/print-geometry.mjs';
import {getProcessingProfile} from '../../app/platform/sources/app/shared/models/processing-profiles.mjs';

const fail = (status, code, message) => { throw Object.assign(Error(message), {status, code}); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hashPattern = /^[a-f0-9]{64}$/;
const validHash = value => typeof value === 'string' && hashPattern.test(value);
const validKey = key => typeof key === 'string' && key.length > 0 && key.length <= 1000 && key === key.trim() && !/[\0\r\n]/.test(key);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// A deterministic, typed encoding: insertion order and binary buffer identity do
// not matter. Undefined optional object fields match their absent JSON form.
function canonical(value, seen = new Set()) {
  if (value instanceof Uint8Array) return 'B' + value.byteLength + ':' + digest(value);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return 'J' + JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return 'J' + JSON.stringify(value);
  if ((!Array.isArray(value) && !plain(value)) || seen.has(value)) fail(422, 'review_resource_invalid', 'Eine Freigaberessource ist unvollständig oder nicht eindeutig lesbar.');
  seen.add(value);
  const result = Array.isArray(value)
    ? 'A[' + value.map(item => canonical(item, seen)).join(',') + ']'
    : 'O{' + Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key], seen)).join(',') + '}';
  seen.delete(value); return result;
}

/**
 * Hash a single native design as displayed. Product revision, other designs,
 * prices and unrelated library entries are deliberately outside this contract.
 * rendererVersion is the host's content hash of the actual renderer dependency
 * sources; alternatively renderedSvg can identify the exact rendered view.
 * Resolvers are synchronous and private: asset(id), url(url), optional font(id).
 * They return complete bytes/JSON, never an unresolved ID or a network promise.
 */
export function nativeDesignReviewFingerprint({document, designId, options = {}, rendererVersion, renderedSvg, view = {}, resourceResolvers = {}} = {}) {
  if (!plain(document?.config) || !plain(document.config.profile) || typeof designId !== 'string') fail(422, 'review_native_required', 'Für die Freigabe fehlt die native Designvorlage.');
  if (!(typeof rendererVersion === 'string' && rendererVersion.trim()) && !(typeof renderedSvg === 'string' && /^\s*<svg\b/.test(renderedSvg))) fail(422, 'review_renderer_required', 'Der tatsächlich verwendete Vorschau-Renderer ist nicht eindeutig bestimmt.');
  if (renderedSvg !== undefined && (typeof renderedSvg !== 'string' || !/^\s*<svg\b/.test(renderedSvg))) fail(422, 'review_renderer_invalid', 'Die native Vorschau ist unvollständig.');
  const config = document.config, selectedOptions = resolvedOptions(config, options), profile = selectedProfile(config, selectedOptions);
  // The legacy acrylic scene reads bundled photographs and base PNGs directly
  // from disk. A source-code signature alone does not identify those pixels.
  if (config.acrylic && !renderedSvg) fail(422, 'review_scene_resources_required', 'Die Acryl-Szene benötigt eine vollständig gerenderte Vorschau mit ihren eingebetteten Bildressourcen.');
  const design = profile.designs?.find(item => item.id === designId);
  if (!design || !Array.isArray(design.objects)) fail(404, 'review_design_missing', 'Diese Vorlage gehört nicht zum gewählten nativen Ziel.');
  const resources = config.localResources || {}, fonts = Object.create(null), motifs = [], assets = new Map(), urls = new Map();
  const need = (resolver, key, kind) => {
    if (typeof resolver !== 'function') fail(422, 'review_resource_missing', `Die Freigaberessource ${kind} „${key}“ fehlt.`);
    let value;
    try { value = resolver(key, {kind}); } catch (error) { fail(422, 'review_resource_missing', `Die Freigaberessource ${kind} „${key}“ ist nicht lesbar: ${error.message}`); }
    if (value === undefined || value === null || value?.then || typeof value === 'string' && !value.length || value instanceof Uint8Array && !value.byteLength) fail(422, 'review_resource_missing', `Die Freigaberessource ${kind} „${key}“ ist unvollständig.`);
    canonical(value); return value;
  };
  const asset = (id, kind) => {
    if (typeof id !== 'string' || !hashPattern.test(id)) fail(422, 'review_asset_invalid', 'Eine native Foto-, Motiv- oder Maskenreferenz ist ungültig.');
    if (!assets.has(id)) assets.set(id, need(resourceResolvers.asset, id, kind));
  };
  const url = value => {
    if (typeof value !== 'string' || !value || value.startsWith('#') || value.startsWith('data:')) return;
    // Named SVG-local references are already part of the rendered vector data.
    const match = /^\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg(?:\?.*)?$/.exec(value);
    if (match) { asset(match[1], 'SVG'); return; }
    if (!urls.has(value)) urls.set(value, need(resourceResolvers.url, value, 'Bild'));
  };
  const scan = value => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/(?:\b(?:href|xlink:href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^\s)'"#][^)'"\s]*)["']?\s*\))/g)) url(match[1] || match[2]);
    } else if (Array.isArray(value)) value.forEach(scan);
    else if (plain(value)) for (const [key, item] of Object.entries(value)) { if (['url', 'src', 'href'].includes(key)) url(item); else scan(item); }
  };
  const fontIds = [...new Set(design.objects.filter(object => object.type === 'text').map(object => object.font))].sort();
  for (const id of fontIds) {
    if (typeof id !== 'string' || !id) fail(422, 'review_font_missing', 'Eine verwendete Schrift ist nicht eindeutig bestimmt.');
    fonts[id] = Object.hasOwn(resources.fonts || {}, id) ? resources.fonts[id] : need(resourceResolvers.font, id, 'Schrift');
    if (!plain(fonts[id]) || !Object.keys(fonts[id]).length) fail(422, 'review_font_missing', `Die verwendete Schrift „${id}“ ist unvollständig.`);
  }
  for (const key of [...new Set(design.objects.filter(object => object.type === 'motif').map(object => object.motif))].sort()) {
    const matches = (resources.motifs || []).filter(motif => motif.key === key);
    if (matches.length !== 1) fail(422, 'review_motif_missing', `Das verwendete Motiv „${key}“ fehlt oder ist nicht eindeutig.`);
    motifs.push(matches[0]); if (matches[0].artwork?.assetId) asset(matches[0].artwork.assetId, 'Motiv'); scan(matches[0]);
  }
  const slotIds = new Set(design.objects.filter(object => object.type === 'photoSlot').map(object => object.id));
  for (const object of design.objects) {
    if (object.photoMaskAssetId) asset(object.photoMaskAssetId, 'Fotomaske');
    if (object.assetId) asset(object.assetId, 'Objekt');
    if (object.uxUploadId || object.media || object.crop) fail(422, 'review_transient_media', 'Ein ungespeichertes Bild oder ein Kundenentwurf kann nicht als native Vorlage freigegeben werden.');
  }
  const photos = (resources.photoExamples || []).filter(photo => photo.designId === designId && slotIds.has(photo.slotId));
  const placeholders = (resources.photoPlaceholders || []).filter(photo => photo.designId === designId && slotIds.has(photo.slotId));
  for (const photo of photos) asset(photo.assetId, 'Musterfoto');
  placeholders.forEach(scan); photos.forEach(scan);
  const hints = (config.photo?.hints || []).filter(hint => hint.designId === designId && slotIds.has(hint.slotId));
  const effective = {
    geometry: profile.geometry, physicalGeometry: physicalGeometry(config, {mOptions: selectedOptions}),
    material: profile.material, processing: getProcessingProfile(profile), processingSelection: profile.processing,
    surfaces: profile.surfaces, mountingPreview: profile.mountingPreview, backingPreview: profile.backingPreview, workingArea: profile.workingArea,
    familyAcrylic: !!config.familyAcrylic, acrylicScene: config.acrylic ? {version: config.acrylic.version, designWidth: config.acrylic.designWidth, designHeight: config.acrylic.designHeight} : null,
    materialSurface: config.materialSurface, sceneBackground: config.sceneBackground,
    options: selectedOptions, view, photoEnabled: config.photo?.enabled, hints,
  };
  url(config.materialSurface); url(config.sceneBackground); url(profile.mountingPreview?.image); scan(effective); if (renderedSvg) scan(renderedSvg);
  return digest(canonical({schema: 'gravuru-design-review-fingerprint/v1', design, effective,
    rendererVersion: rendererVersion || null, renderedSvg: renderedSvg || null, fonts, motifs, photos, placeholders,
    assets: Object.fromEntries([...assets].sort(([a], [b]) => a.localeCompare(b))), urls: Object.fromEntries([...urls].sort(([a], [b]) => a.localeCompare(b)))}));
}

/** Private review only: append-only events, no catalogue or shop writes. */
export function createDesignReviewApprovals(filename, {resolveTarget, listTargets, actor = 'private-review-session', now = () => new Date()} = {}) {
  if (typeof resolveTarget !== 'function' || typeof listTargets !== 'function') throw Error('Freigaben benötigen eine serverseitige Zielauflösung.');
  if (typeof actor !== 'string' || !actor.trim() || actor.length > 160 || /[\r\n\0]/.test(actor)) throw Error('Der private Prüfakteur ist ungültig.');
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS design_review_approval_events (
      target_key TEXT NOT NULL, revision INTEGER NOT NULL,
      approved INTEGER NOT NULL CHECK(approved IN (0,1)), fingerprint TEXT,
      metadata TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(target_key,revision)
    );
    CREATE TRIGGER IF NOT EXISTS design_review_approval_immutable_update BEFORE UPDATE ON design_review_approval_events
      BEGIN SELECT RAISE(ABORT,'Review approval events are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS design_review_approval_immutable_delete BEFORE DELETE ON design_review_approval_events
      BEGIN SELECT RAISE(ABORT,'Review approval events are immutable'); END;`);
  const latest = key => db.prepare('SELECT revision,approved,fingerprint,actor,created_at FROM design_review_approval_events WHERE target_key=? ORDER BY revision DESC LIMIT 1').get(key);
  function target(key) {
    if (!validKey(key)) fail(422, 'review_key_invalid', 'Die Zielkennung ist ungültig.');
    const current = resolveTarget(key);
    if (!current) fail(404, 'review_target_missing', 'Dieses Prüfziel wurde nicht gefunden.');
    if (!plain(current) || typeof current.available !== 'boolean' || current.available && !validHash(current.fingerprint) || !current.available && current.fingerprint !== null && !validHash(current.fingerprint)) fail(422, 'review_target_invalid', 'Der native Prüfstand ist nicht eindeutig bestimmt.');
    const metadata = current.metadata ?? {}; canonical(metadata);
    return {...current, metadata};
  }
  function state(key, current, event) {
    const approved = !!(current.available && event?.approved && event.fingerprint === current.fingerprint);
    return {key, approved, status: !current.available ? 'unavailable' : approved ? 'approved' : event?.approved ? 'changed' : 'unreviewed',
      revision: event?.revision || 0, fingerprint: current.fingerprint,
      approvedFingerprint: event?.approved ? event.fingerprint : null,
      updatedAt: event?.created_at || null, actor: event?.actor || null, metadata: structuredClone(current.metadata)};
  }
  const get = key => state(key, target(key), latest(key));
  return {
    get,
    all() {
      const keys = listTargets();
      if (!Array.isArray(keys) || new Set(keys).size !== keys.length || keys.some(key => !validKey(key))) fail(422, 'review_targets_invalid', 'Die Prüfziele sind nicht eindeutig.');
      return Object.fromEntries(keys.map(key => [key, get(key)]));
    },
    save(input) {
      const fields = ['key', 'approved', 'expectedRevision', 'expectedFingerprint'];
      if (!plain(input) || Object.keys(input).length !== fields.length || fields.some(key => !Object.hasOwn(input, key)) || !validKey(input.key) || typeof input.approved !== 'boolean' || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || input.expectedFingerprint !== null && !validHash(input.expectedFingerprint)) fail(422, 'review_approval_invalid', 'Bitte Ziel, Häkchen, Ereignisstand und gesehenen Prüfstand vollständig übergeben.');
      db.exec('BEGIN IMMEDIATE');
      try {
        const current = target(input.key), event = latest(input.key);
        if (input.expectedRevision !== (event?.revision || 0)) fail(409, 'review_approval_conflict', 'Das Freigabehäkchen wurde inzwischen geändert. Bitte den aktuellen Stand neu laden.');
        if (input.approved && !current.available) fail(422, 'review_target_unavailable', 'Eine noch nicht verfügbare native Vorlage kann nicht bestätigt werden.');
        if (input.approved && (!input.expectedFingerprint || input.expectedFingerprint !== current.fingerprint)) fail(409, 'review_fingerprint_changed', 'Die Vorlage wurde seit deiner Sichtprüfung geändert. Bitte die neue Vorschau prüfen.');
        const unchanged = input.approved ? event?.approved === 1 && event.fingerprint === current.fingerprint : !event?.approved;
        if (unchanged) { db.exec('COMMIT'); return state(input.key, current, event); }
        const date = new Date(now()); if (!Number.isFinite(date.getTime())) throw Error('Ungültiges Ereignisdatum.');
        db.prepare('INSERT INTO design_review_approval_events(target_key,revision,approved,fingerprint,metadata,actor,created_at) VALUES(?,?,?,?,?,?,?)')
          .run(input.key, (event?.revision || 0) + 1, Number(input.approved), current.fingerprint ?? event?.fingerprint ?? null, JSON.stringify(current.metadata), actor, date.toISOString());
        const saved = latest(input.key); db.exec('COMMIT'); return state(input.key, current, saved);
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: () => db.close(),
  };
}
