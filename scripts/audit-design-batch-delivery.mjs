import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PACKAGE_PATH = 'auftraege/2026-11-06-gesamtbestand';
export const DELIVERY_COMMIT = '86c1ff5f431acfe60d4cff388958112187005550';
export const SOURCE_COMMIT = '3c6051fbbc7904969948950fae12cae2ae663f30';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const countBy = (rows, key) => rows.reduce((out, row) => { const k = key(row); out[k] = (out[k] || 0) + 1; return out; }, {});
const equalCounts = (a = {}, b = {}) => [...new Set([...Object.keys(a), ...Object.keys(b)])].every(k => (a[k] || 0) === (b[k] || 0));
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));

export function inside(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes(':') || relative.startsWith('/') || relative.split('/').includes('..')) throw new Error(`Unsafe repository path: ${relative}`);
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw new Error(`Path escapes root: ${relative}`);
  return resolved;
}

function git(root, args, input) {
  const r = spawnSync('git', ['-C', root, '-c', 'core.quotepath=false', ...args], { input, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, windowsHide: true, env: { ...process.env, GIT_NO_LAZY_FETCH: '1' } });
  if (r.status !== 0) throw new Error(`git ${args[0]} failed: ${(r.stderr || r.error?.message || '').slice(0, 300)}`);
  return r.stdout.trim();
}

/** Reads bytes only. Missing sparse paths are distinguished from missing Git objects. */
export async function verifyFileIndex(root, index, { concurrency = 12, gitExists, gitBlobs, progress = () => {} } = {}) {
  const files = Object.entries(index), results = new Array(files.length);
  let cursor = 0, done = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(32, concurrency)) }, async () => {
    while (cursor < files.length) {
      const i = cursor++, [file, expected] = files[i];
      let result;
      try {
        const target = inside(root, file);
        if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('Invalid SHA-256');
        const bytes = await fs.readFile(target), actual = sha256(bytes);
        const gitExpected = gitBlobs?.get(file);
        const gitActual = gitExpected ? createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') : undefined;
        result = { file, expected, actual, bytes: bytes.length, status: actual !== expected ? 'hash-mismatch' : gitBlobs && (!gitExpected || gitExpected !== gitActual) ? 'git-blob-mismatch' : 'verified', ...(gitBlobs ? { gitExpected, gitActual } : {}) };
      } catch (e) {
        result = { file, expected, status: e.code === 'ENOENT' ? 'missing-checkout' : 'unreadable', error: e.code || e.message };
      }
      results[i] = result;
      done++;
      if (done % 2000 === 0 || done === files.length) progress({ stage: 'hashes', done, total: files.length });
    }
  }));
  if (gitExists) {
    const missing = results.filter(r => r.status === 'missing-checkout');
    const found = await gitExists(missing.map(r => r.file));
    for (const row of missing) row.status = found.has(row.file) ? 'sparse-unavailable' : 'missing-delivery-file';
  }
  return { counts: countBy(results, r => r.status), files: results };
}

/** Historical source approvals and a successful dry run never confer review approval. */
export function designReviewHolds(design) {
  const holds = new Set();
  if (design.blocker?.length) holds.add('declared-blocker');
  if (!design.ziele?.length) holds.add('no-target-family');
  if (design.mitFoto) holds.add('photo-decision');
  if (/UV|Druck/i.test(design.verfahren || '')) holds.add('print-review');
  if (/Verfahren klären/.test(design.zustand || '')) holds.add('process-unclear');
  if (design.lieferformPruefung?.klasse === 'umbau') holds.add('rebuild');
  if (design.lieferformPruefung?.klasse === 'umbenennung') holds.add('rename');
  if ((design.befunde || []).some(b => /Ersatz unsicher/.test(b.text || ''))) holds.add('uncertain-font');
  if ((design.schriften || []).some(f => ['Welcome', 'ParmaPetit'].includes(f.name) || ['Welcome', 'ParmaPetit'].includes(f.ersatzFuer))) holds.add('excluded-font');
  return { reviewStatus: 'unreviewed', released: false, holds: [...holds].sort() };
}

export function auditDryRun(manifest, dry) {
  const errors = [], expected = new Map();
  for (const row of manifest.designs || []) expected.set(`design:${row.id}`, row);
  for (const row of manifest.rohlinge || []) expected.set(`rohling:${row.id}`, row);
  const seen = new Set(), counts = { designs: {}, rohlinge: {} };
  if (dry.modus !== 'dry-run') errors.push({ code: 'DRY_RUN_MODE' });
  for (const row of dry.eintraege || []) {
    const key = `${row.art}:${row.id}`, group = row.art === 'design' ? 'designs' : row.art === 'rohling' ? 'rohlinge' : null;
    if (!expected.has(key)) errors.push({ code: 'DRY_RUN_UNKNOWN_ID', id: row.id });
    if (seen.has(key)) errors.push({ code: 'DRY_RUN_DUPLICATE_ID', id: row.id });
    seen.add(key);
    if (group) counts[group][row.status] = (counts[group][row.status] || 0) + 1;
  }
  for (const key of expected.keys()) if (!seen.has(key)) errors.push({ code: 'DRY_RUN_MISSING_ID', id: key });
  for (const group of ['designs', 'rohlinge']) if (!equalCounts(counts[group], dry.zaehler?.[group])) errors.push({ code: 'DRY_RUN_COUNTER', group });
  if (Object.values(dry.angewendet || {}).some(n => n !== 0)) errors.push({ code: 'DRY_RUN_APPLIED' });
  return { errors, counts, scope: 'upstream-empty-test-store-only', provesExistingGalleryCompatibility: false };
}

export function auditIdentity(rows, references, masterIds) {
  const errors = [], seen = new Set();
  for (const row of [...rows, ...references]) {
    if (!row.id || seen.has(row.id)) errors.push({ code: 'DUPLICATE_OR_EMPTY_ID', id: row.id });
    seen.add(row.id);
  }
  for (const row of references) {
    if (!Array.isArray(row.verweisAufMaster) || !row.verweisAufMaster.length) errors.push({ code: 'EMPTY_MASTER_REFERENCE', id: row.id });
    for (const master of row.verweisAufMaster || []) if (!masterIds.has(master)) errors.push({ code: 'UNKNOWN_MASTER_REFERENCE', id: row.id, master });
  }
  return errors;
}

export function auditTextFitting(factor) {
  if (factor.faktor === null && /bereits angewandte/.test(factor.hinweis || '')) return { code: 'APPLIED_FONT_RATIO_UNRECORDED', severity: 'warning', textIndex: factor.textIndex };
  if (!(Number.isFinite(factor.faktor) && factor.faktor > 0)) return { code: 'INVALID_TEXT_FACTOR', severity: 'error', textIndex: factor.textIndex };
  return null;
}

export async function auditDesignBatchDelivery({ catalogueRoot, outputRoot, expectedCommit = DELIVERY_COMMIT, progress = () => {} }) {
  catalogueRoot = path.resolve(catalogueRoot);
  const base = inside(catalogueRoot, PACKAGE_PATH), issues = [];
  const issue = (code, details = {}, severity = 'error') => issues.push({ severity, code, ...details });
  const head = git(catalogueRoot, ['rev-parse', 'HEAD']);
  if (head !== expectedCommit) throw new Error(`Wrong delivery commit: ${head}`);
  const gitBlobs = new Map(git(catalogueRoot, ['ls-tree', '-r', '-z', head]).split('\0').filter(Boolean).map(line => {
    const match = line.match(/^\d+ blob ([a-f0-9]+)\t([\s\S]*)$/);
    return match ? [match[2], match[1]] : [null, null];
  }).filter(([name]) => name));
  const [index, register, batchesIndex, blankManifest, fontTable] = await Promise.all([
    json(path.join(base, 'files-sha256.json')), json(path.join(base, 'register.json')), json(path.join(base, 'stapel.json')),
    json(path.join(base, 'rohlinge/manifest.json')), json(path.join(base, 'schriften-ersatz/ersatz-alle.json')),
  ]);
  const hashResult = await verifyFileIndex(catalogueRoot, index, { progress, gitBlobs, gitExists: async files => new Set(files.filter(f => gitBlobs.has(f))) });
  for (const row of hashResult.files) if (row.status !== 'verified') issue(row.status.toUpperCase().replaceAll('-', '_'), { file: row.file, expected: row.expected, actual: row.actual }, row.status === 'sparse-unavailable' ? 'unverified' : 'error');
  const verified = new Map(hashResult.files.map(r => [r.file, r]));
  const referencedFiles = new Map(), designs = [], references = [], batchReports = [], versions = [];
  const blanks = new Map(blankManifest.rohlinge.map(b => [b.id, b]));
  if (blanks.size !== blankManifest.rohlinge.length) issue('DUPLICATE_BLANK_ID');
  const allDry = { design: new Map(), rohling: new Map() }, uncertainNames = new Set(), uncertainDesigns = [];
  const indexMasters = new Map(batchesIndex.stapel.flatMap(b => b.designs.map(d => [d.id, { ...d, batch: b.id }])));
  const ids = Object.keys(register.zaehler.jeStapel);
  const diskBatches = (await fs.readdir(path.join(base, 'stapel'), { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name);
  for (const name of diskBatches) if (!ids.includes(name)) issue('UNREGISTERED_BATCH', { batch: name });
  const refFiles = (rows, owner) => {
    for (const f of rows || []) {
      if (!f.pfad) { issue('FILE_REFERENCE_NO_PATH', owner); continue; }
      const prior = referencedFiles.get(f.pfad);
      if (prior && (prior.sha256 !== f.sha256 || prior.bytes !== f.bytes)) issue('FILE_REFERENCE_CONFLICT', { ...owner, file: f.pfad });
      referencedFiles.set(f.pfad, f);
      if (index[f.pfad] !== f.sha256) issue('FILE_REFERENCE_INDEX_MISMATCH', { ...owner, file: f.pfad, indexed: index[f.pfad] || null, declared: f.sha256 });
      const actual = verified.get(f.pfad);
      if (actual?.status === 'verified' && actual.bytes !== f.bytes) issue('FILE_REFERENCE_SIZE_MISMATCH', { ...owner, file: f.pfad, declared: f.bytes, actual: actual.bytes });
    }
  };
  for (const b of blankManifest.rohlinge) refFiles(b.dateien, { id: b.id });
  for (let i = 0; i < ids.length; i++) {
    const batch = ids[i], mf = `${PACKAGE_PATH}/stapel/${batch}/manifest.json`;
    const manifest = await json(inside(catalogueRoot, mf));
    const dry = await json(inside(catalogueRoot, `${PACKAGE_PATH}/stapel/${batch}/pruefung/dry-run-leere-testablage.json`));
    if (manifest.schema !== 'gravuru-gesamtuebergabe/v1' || manifest.stapel.id !== batch) issue('BATCH_SCHEMA', { batch, file: mf });
    if (manifest.quelle.commit !== SOURCE_COMMIT) issue('SOURCE_COMMIT', { batch, actual: manifest.quelle.commit });
    const rows = manifest.designs || [], refs = manifest.verweiseAufMaster || [];
    if (rows.length !== manifest.zaehler.designs || refs.length !== manifest.zaehler.verweiseAufMaster || manifest.rohlinge.length !== manifest.zaehler.rohlinge) issue('BATCH_COUNTER', { batch });
    if (!equalCounts(countBy([...rows, ...refs], r => r.zustand), register.zaehler.jeStapel[batch])) issue('REGISTER_BATCH_STATES', { batch });
    if (!equalCounts(countBy(rows, r => r.zustand), manifest.zaehler.zustand)) issue('MANIFEST_BATCH_STATES', { batch });
    const result = auditDryRun(manifest, dry);
    for (const e of result.errors) issue(e.code, { batch, ...e });
    for (const e of dry.eintraege || []) {
      if (allDry[e.art]) {
        const prior = allDry[e.art].get(e.id);
        if (prior && prior.status !== e.status) issue('DRY_RUN_CROSS_BATCH_STATUS', { id: e.id, batch });
        allDry[e.art].set(e.id, { id: e.id, status: e.status, batch });
      }
    }
    for (const b of manifest.rohlinge) {
      const central = blanks.get(b.id);
      if (!central) issue('UNKNOWN_BLANK_REFERENCE', { batch, id: b.id });
      else if (central.version !== b.version) issue('BLANK_VERSION_REFERENCE', { batch, id: b.id });
      refFiles(b.dateien, { batch, id: b.id });
    }
    for (const d of [...rows, ...refs]) {
      const record = register.designs[d.id];
      if (!record) issue('UNREGISTERED_DESIGN', { id: d.id, batch });
      else if (record.stapel !== batch || record.zustand !== d.zustand) issue('REGISTER_DESIGN_STATE', { id: d.id, batch });
    }
    for (const d of rows) {
      refFiles(d.dateien, { id: d.id, batch });
      for (const blank of d.rohlingIds || []) if (!blanks.has(blank)) issue('UNKNOWN_DESIGN_BLANK', { id: d.id, blank, batch });
      for (const target of d.ziele || []) {
        for (const size of target.groessen || []) {
          const mm = target.groessenMm?.[size];
          if (!Array.isArray(mm) || mm.length !== 2 || !mm.every(v => Number.isFinite(v) && v > 0)) issue('INVALID_TARGET_MM', { id: d.id, batch, family: target.familie, size });
          const blank = blanks.get(`${target.familie}|${size}`);
          if (!blank) issue('TARGET_BLANK_MISSING', { id: d.id, batch, family: target.familie, size });
          else if (JSON.stringify(mm) !== JSON.stringify(blank.mm)) issue('TARGET_BLANK_MM', { id: d.id, batch, family: target.familie, size, mm, blankMm: blank.mm });
        }
      }
      for (const factor of d.textEinpassung || []) {
        const fitting = auditTextFitting(factor);
        if (fitting) issue(fitting.code, { id: d.id, batch, textIndex: fitting.textIndex }, fitting.severity);
      }
      const uncertain = (d.befunde || []).filter(b => /Ersatz unsicher/.test(b.text || ''));
      if (uncertain.length) {
        uncertainDesigns.push(d.id);
        for (const b of uncertain) { const match = b.text.match(/Schrift '([^']+)'/); if (match) uncertainNames.add(match[1]); }
      }
      const svg = d.dateien?.find(f => f.rolle === 'design-svg'), meta = d.dateien?.find(f => f.rolle === 'design-json');
      if (d.version && svg && meta) versions.push({ id: d.id, version: d.version, files: [svg.pfad, meta.pfad] });
      designs.push({ ...d, auditBatch: batch });
    }
    references.push(...refs);
    const localIds = new Set(rows.map(d => d.id));
    const gallery = manifest.galerie?.eintraege || [];
    for (const g of gallery) if (!localIds.has(g.id)) issue('UNKNOWN_GALLERY_ID', { id: g.id, batch });
    batchReports.push({ id: batch, designs: rows.length, references: refs.length, blanks: manifest.rohlinge.length, galleryEntries: gallery.length, states: countBy(rows, d => d.zustand), dryRun: result.counts });
    if ((i + 1) % 20 === 0 || i + 1 === ids.length) progress({ stage: 'batches', done: i + 1, total: ids.length });
  }
  const centralDry = await json(path.join(base, 'rohlinge/pruefung/dry-run-leere-testablage.json'));
  const centralDryResult = auditDryRun(blankManifest, centralDry);
  for (const e of centralDryResult.errors) issue(e.code, { batch: 'rohlinge', ...e });
  const blanksOutsideBatches = blankManifest.rohlinge.filter(b => !allDry.rohling.has(b.id)).map(b => b.id);
  for (const e of centralDry.eintraege || []) {
    const prior = allDry[e.art]?.get(e.id);
    if (prior && prior.status !== e.status) issue('DRY_RUN_CROSS_BATCH_STATUS', { id: e.id, batch: 'rohlinge' });
    allDry[e.art]?.set(e.id, { id: e.id, status: e.status, batch: 'rohlinge' });
  }
  for (const e of auditIdentity(designs, references, new Set(indexMasters.keys()))) issue(e.code, e);
  const actualIds = new Set([...designs, ...references].map(d => d.id));
  for (const id of Object.keys(register.designs)) if (!actualIds.has(id)) issue('REGISTER_DESIGN_NOT_DELIVERED', { id });
  for (const d of designs.filter(d => !d.lieferart || d.lieferart === 'master')) {
    const indexRow = indexMasters.get(d.id);
    if (!indexRow || indexRow.batch !== d.auditBatch || indexRow.pfad !== d.pfad) issue('MASTER_INDEX_DISAGREEMENT', { id: d.id, batch: d.auditBatch });
  }
  let versionVerified = 0;
  for (const [i, v] of versions.entries()) {
    if (!v.files.every(f => verified.get(f)?.status === 'verified')) continue;
    const actual = sha256(Buffer.concat(await Promise.all(v.files.map(f => fs.readFile(inside(catalogueRoot, f))))));
    if (actual !== v.version) issue('DESIGN_VERSION_MISMATCH', { id: v.id, expected: v.version, actual });
    else versionVerified++;
    if ((i + 1) % 4000 === 0 || i + 1 === versions.length) progress({ stage: 'versions', done: i + 1, total: versions.length });
  }
  for (const b of blanks.values()) {
    if (!b.version) continue;
    if (b.versionBasis?.startsWith('Verweis auf Katalogrohling ')) {
      const target = blanks.get(b.versionBasis.slice('Verweis auf Katalogrohling '.length));
      if (!target || target.version !== b.version) issue('BLANK_MASTER_VERSION', { id: b.id });
      continue;
    }
    const svg = b.dateien?.find(f => f.rolle === 'rohling-svg'), png = b.dateien?.find(f => f.rolle === 'rohling-png');
    const paths = svg ? [svg.pfad, ...(b.versionBasis?.includes('+ Ansicht-PNG') && png ? [png.pfad] : [])] : [];
    if (!paths.length || !paths.every(f => verified.get(f)?.status === 'verified')) continue;
    const actual = sha256(Buffer.concat(await Promise.all(paths.map(f => fs.readFile(inside(catalogueRoot, f))))));
    if (actual !== b.version) issue('BLANK_VERSION_MISMATCH', { id: b.id, expected: b.version, actual });
  }
  const security = countBy(Object.values(fontTable._details || {}), r => r.sicherheit);
  if (!Object.keys(index).some(f => /F-schriften-ersatz\/ergebnis\.json$/.test(f))) issue('FONT_STATUS_TABLE_NOT_DELIVERED', { file: `${PACKAGE_PATH}/schriften-ersatz/ersatz-alle.json`, reason: 'The generator reads a separate ergebnis.json status table; h/m/n alone does not reproduce the 151/129/1 classification. Per-design uncertainty findings are retained.', uncertainNamesInFindings: uncertainNames.size }, 'warning');
  const sourceDiff = git(catalogueRoot, ['diff', '--name-status', SOURCE_COMMIT, head]).split('\n').filter(Boolean);
  const outsidePackageDiff = sourceDiff.filter(line => !line.startsWith(`A\t${PACKAGE_PATH}/`));
  if (outsidePackageDiff.length) issue('SOURCE_FILES_CHANGED', { count: outsidePackageDiff.length, examples: outsidePackageDiff.slice(0, 10) });
  // These adapter inputs are not covered by Claude's delivery index. Verify their
  // raw bytes against Git independently, without reading promised blob contents.
  const extraSources = [];
  for (const [file, expected] of gitBlobs) {
    if (file !== `${PACKAGE_PATH}/files-sha256.json` && !/^(familien|linien)\/.*\.json$/.test(file)) continue;
    try {
      const bytes = await fs.readFile(inside(catalogueRoot, file));
      const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      extraSources.push({ file, sha256: sha256(bytes), gitBlob: expected, verified: actual === expected });
      if (actual !== expected) issue('ADAPTER_SOURCE_GIT_BLOB_MISMATCH', { file });
    } catch (e) { issue('ADAPTER_SOURCE_UNAVAILABLE', { file, reason: e.code || e.message }, 'unverified'); }
  }
  const holdCounts = {}, heldDesigns = [];
  for (const d of designs) {
    const review = designReviewHolds(d);
    for (const hold of review.holds) holdCounts[hold] = (holdCounts[hold] || 0) + 1;
    if (review.holds.length) heldDesigns.push({ id: d.id, batch: d.auditBatch, ...review });
  }
  const report = {
    schema: 'gravuru-design-batch-delivery-audit/v1', auditedAt: new Date().toISOString(), deliveryCommit: head, catalogueCommit: SOURCE_COMMIT,
    filesSha256Index: sha256(await fs.readFile(path.join(base, 'files-sha256.json'))), sourceFilesUnchanged: outsidePackageDiff.length === 0, additionalAdapterSources: extraSources,
    scope: { readOnly: true, imports: 0, approvals: 0, nativeRenderingChecked: false, sourceTypographyVisuallyApproved: false, expectedCategoryCoverageKnown: false },
    counts: { hashes: Object.keys(index).length, hashResults: hashResult.counts, batches: ids.length, masterBatches: batchesIndex.stapel.length, stockBatches: ids.filter(x => x.startsWith('B-')).length, registeredIds: Object.keys(register.designs).length, actualDesigns: designs.length, masterDesigns: indexMasters.size, stockDesigns: designs.filter(d => d.lieferart === 'bestand').length, masterReferences: references.length, blanks: blanks.size, designVersionsVerified: versionVerified, states: countBy([...designs, ...references], d => d.zustand), holdCounts },
    dryRuns: { scope: '219 batch dry runs plus the central blank dry run, against upstream empty test stores; not an import into the existing gallery', provesExistingGalleryCompatibility: false, centralBlankRun: centralDryResult.counts, blanksOutsideBatches, incompleteBlankOccurrences: batchReports.reduce((n, b) => n + (b.dryRun.rohlinge.unvollstaendig || 0), 0) + (centralDryResult.counts.rohlinge.unvollstaendig || 0), uniqueDesignStates: countBy([...allDry.design.values()], d => d.status), uniqueBlankStates: countBy([...allDry.rohling.values()], d => d.status), incompleteDesigns: [...allDry.design.values()].filter(d => d.status === 'unvollstaendig'), incompleteBlanks: [...allDry.rohling.values()].filter(d => d.status === 'unvollstaendig') },
    fonts: { replacementNames: Object.keys(fontTable).filter(k => !k.startsWith('_')).length, security, uncertainNamesInFindings: [...uncertainNames].sort(), uncertainDesigns: [...new Set(uncertainDesigns)], classificationTableDelivered: false },
    order: { rule: '1 → 2/3 → remaining master groups → B; material → product kind → theme → photo → format → original ID', masterBatches: batchesIndex.stapel.map(b => b.id), stockBatches: ids.filter(id => id.startsWith('B-')) },
    batches: batchReports, heldDesigns, issues, issueCounts: countBy(issues, i => i.code), passed: !issues.some(i => i.severity === 'error' || i.severity === 'unverified'),
  };
  if (outputRoot) {
    outputRoot = path.resolve(outputRoot);
    if (outputRoot === catalogueRoot || outputRoot.startsWith(catalogueRoot + path.sep)) throw new Error('Output must be outside source checkout');
    await fs.mkdir(outputRoot, { recursive: false });
    await fs.writeFile(path.join(outputRoot, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
    await fs.writeFile(path.join(outputRoot, 'file-verification.json'), JSON.stringify(hashResult, null, 2) + '\n');
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), opts = Object.fromEntries(args.reduce((a, v, i) => v.startsWith('--') ? [...a, [v.slice(2), args[i + 1]]] : a, []));
  if (!opts.katalog || !opts.out) throw new Error('Usage: node scripts/audit-design-batch-delivery.mjs --katalog <source> --out <new-output-directory>');
  const report = await auditDesignBatchDelivery({ catalogueRoot: opts.katalog, outputRoot: opts.out, progress: p => console.error(`${p.stage}: ${p.done}/${p.total}`) });
  console.log(JSON.stringify({ passed: report.passed, counts: report.counts, issueCounts: report.issueCounts, output: path.resolve(opts.out) }, null, 2));
  if (!report.passed) process.exitCode = 1;
}
