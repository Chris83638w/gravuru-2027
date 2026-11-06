import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {slateReviewCategory} from './slate-review-catalog.mjs';
import {nativeDesignReviewFingerprint} from './design-review-approvals.mjs';

// Catalogue size keys include the material/family. They survive a repeat import
// even if a private installation assigns a different product database ID.
export const slateReviewApprovalKey = (id, sizeKey) => JSON.stringify(['slate', id, sizeKey || 'unprepared']);
export const reviewSizeLabel = mm => Array.isArray(mm) ? mm.map(n => Number((n / 10).toFixed(2))).join(' × ') + ' cm' : 'Format offen';

export function slateReviewApprovalTargets(pack, imported) {
  return pack.originals.flatMap(row => {
    const category = slateReviewCategory(row);
    return (row.targets?.length ? row.targets : [{mm: row.sourcePlateMm}]).map(target => {
      const product = target.status === 'prepared' && imported.products.find(p => p.key.startsWith(target.sizeKey + ':') && p.designIds.includes(row.id));
      return {key: slateReviewApprovalKey(row.id, target.sizeKey), id: row.id, categoryKey: category.key, categoryLabel: category.label,
        material: 'Schiefer', format: reviewSizeLabel(target.mm), sizeKey: target.sizeKey || null, mm: target.mm,
        productId: product?.productId || null, designId: 'katalog-' + row.id,
        reason: target.reason || row.reason || row.error || 'Konfi-Aufbereitung noch offen.'};
    });
  });
}

// Fingerprint actual deployed renderer sources once, not hundreds of rendered
// SVGs on every gallery request. A renderer change requires a fresh visual OK.
function rendererSignature() {
  const seen = new Set(), files = [];
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const bytes = fs.readFileSync(file), source = bytes.toString('utf8');
    files.push([path.relative(fileURLToPath(new URL('../../', import.meta.url)), file).replaceAll('\\', '/'), bytes]);
    if (!file.endsWith('.mjs') && !file.endsWith('.js')) return;
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
      const next = path.resolve(path.dirname(file), match[1]);
      if (fs.existsSync(next) && fs.statSync(next).isFile()) visit(next);
    }
  }
  visit(fileURLToPath(new URL('../../app/workshop/product-preview.mjs', import.meta.url)));
  // The HTTP adapter embeds the actual material/photo resources before drawing.
  const adapter = fileURLToPath(new URL('../../app/workshop/http.mjs', import.meta.url));
  files.push(['app/workshop/http.mjs', fs.readFileSync(adapter)]);
  const hash = createHash('sha256');
  for (const [name, bytes] of files.sort((a, b) => a[0].localeCompare(b[0]))) hash.update(name).update('\0').update(bytes).update('\0');
  return hash.digest('hex');
}

export function createSlateApprovalTargetSource({pack, imported, workshop}) {
  const targets = slateReviewApprovalTargets(pack, imported), byKey = new Map(targets.map(t => [t.key, t]));
  if (byKey.size !== targets.length) throw Error('Duplicate review target');
  const records = new Map(), fingerprints = new Map(), rendererVersion = rendererSignature();
  const asset = id => workshop.assets.read(id);
  const resourceUrl = url => {
    const match = url.match(/^\/api\/workshop\/material-surfaces\/([a-f0-9]{64})\.png$/);
    if (match) return workshop.assets.materialSurface(match[1]);
    throw Error('Die Bildquelle ist noch nicht mit der Freigabeprüfung verbunden.');
  };
  return {
    targets,
    beginRead() { records.clear(); },
    listTargets: () => [...byKey.keys()],
    resolveTarget(key) {
      const target = byKey.get(key);
      if (!target) return null;
      const metadata = {...target};
      if (!workshop || !target.productId) return {available: false, fingerprint: null, metadata};
      try {
        if (!records.has(target.productId)) records.set(target.productId, workshop.repository.get(target.productId));
        const record = records.get(target.productId), profile = record.document.config?.profile;
        if (record.status === 'archived' || record.document.config.reviewOnly !== true || profile?.material?.kind !== 'slate' ||
            !target.mm || Math.abs(profile.geometry.width - target.mm[0]) > 1e-6 || Math.abs(profile.geometry.height - target.mm[1]) > 1e-6)
          throw Error('Vorlage oder Format ist nicht mehr mit diesem Prüfstand verbunden.');
        metadata.productRevision = record.revision;
        // Native revisions and SHA-addressed assets are immutable. Reuse their
        // proven fingerprint; a save gets a new revision and is hashed again.
        const design = profile.designs.find(d => d.id === target.designId);
        const localFonts = design?.objects.filter(o => o.type === 'text').every(o => Object.hasOwn(record.document.config.localResources.fonts, o.font));
        let cached = localFonts && fingerprints.get(key);
        if (!cached || cached.revision !== record.revision) {
          cached = {revision:record.revision, fingerprint:nativeDesignReviewFingerprint({document: record.document, designId: target.designId, rendererVersion,
            resourceResolvers: {asset, url: resourceUrl, font: id => workshop.fonts.resources()[id]}})};
          if (localFonts) fingerprints.set(key,cached);
        }
        const fingerprint = cached.fingerprint;
        metadata.previewUrl = '/api/workshop/products/' + encodeURIComponent(record.id) + '/preview.svg?' + new URLSearchParams({designId: target.designId, revision: String(record.revision), reviewFingerprint:fingerprint});
        return {available: true, fingerprint, metadata};
      } catch (error) {
        metadata.reason = error.status && error.status < 500 ? error.message : 'Vorlage oder benötigte Ressource kann noch nicht vollständig geprüft werden.';
        return {available: false, fingerprint: null, metadata};
      }
    },
  };
}
