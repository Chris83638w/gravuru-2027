// Read the pinned Git tree rather than assuming every source is checked out.
// Optionally copy exact original blobs to a NEW directory. No source mutations.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {slateInventoryRows} from './lib/slate-review-catalog-inventory.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
for (const required of ['--katalog', '--package', '--out']) if (!arg(required)) throw Error(`${required} required`);
const root = path.resolve(arg('--katalog')), packageRoot = path.resolve(arg('--package')), out = path.resolve(arg('--out'));
if (fs.existsSync(out)) throw Error('Output directory must be new; existing review data is never overwritten.');
const pack = JSON.parse(fs.readFileSync(path.join(packageRoot, 'manifest.json'), 'utf8'));
const commit = arg('--commit', pack.catalogueCommit);
if (!/^[0-9a-f]{40}$/i.test(commit)) throw Error('Use a full pinned catalogue commit.');
const git = (...params) => execFileSync('git', ['-C', root, ...params], {maxBuffer: 256 * 1024 * 1024});
if (git('rev-parse', `${commit}^{commit}`).toString().trim() !== commit) throw Error('Catalogue commit mismatch.');
const entries = git('ls-tree', '-rzl', '--full-tree', commit, '--', 'designs/bestand').toString('utf8').split('\0').filter(Boolean).map(line => {
  const tab = line.indexOf('\t'), [mode, type, sha, bytes] = line.slice(0, tab).trim().split(/\s+/);
  if (type !== 'blob') throw Error(`Unexpected tree entry: ${type}`);
  return {mode, sha, bytes: Number(bytes), path: line.slice(tab + 1)};
});
const indexes = entries.filter(entry => /^designs\/bestand\/[^/]+\/designs\.json$/.test(entry.path)).map(entry => ({
  family: entry.path.split('/')[2],
  source: entry.path,
  gitBlob: entry.sha,
  designs: JSON.parse(git('cat-file', 'blob', entry.sha)),
}));
const rows = slateInventoryRows(indexes, entries, pack.originals);
const families = [...new Set(rows.map(row => row.family))].map(family => {
  const members = rows.filter(row => row.family === family);
  return {family, originals: members.length, engraving: members.filter(row => row.process === 'Gravur').length, prepared: members.filter(row => row.preparationStatus === 'prepared').length, open: members.filter(row => row.preparationStatus === 'open').length, sourceOnly: members.filter(row => row.preparationStatus === 'source-only').length, missingOriginals: members.filter(row => !row.sourceAvailable).length};
});
const report = {schema: 'gravuru-slate-review-catalog-inventory/v1', catalogueCommit: commit, source: 'designs/bestand/*/designs.json', materialRule: 'actual master material equals Schiefer; materials compatibility lists do not qualify', reviewOnly: true, released: false, stockSizesAreNotPreparedFormats: true, counts: {originals: rows.length, sourceReferences: rows.reduce((n, row) => n + row.sourcePaths.length, 0), prepared: rows.filter(row => row.preparationStatus === 'prepared').length, open: rows.filter(row => row.preparationStatus === 'open').length, sourceOnly: rows.filter(row => row.preparationStatus === 'source-only').length}, families, originals: rows};
fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
const extracted = [];
const extractFamilies = new Set(arg('--extract-families', '').split(',').filter(Boolean));
for (const family of extractFamilies) if (!families.some(row => row.family === family)) throw Error(`Unknown slate family: ${family}`);
for (const row of rows.filter(row => extractFamilies.has(row.family))) {
  if (!/^[A-Za-z0-9_.+, -]+$/.test(row.id)) throw Error(`Unsafe original ID: ${row.id}`);
  const target = path.join(out, 'sources', row.id);
  fs.mkdirSync(target, {recursive: true});
  for (const file of row.files) {
    if (file.name.includes('/') || file.name.includes('\\') || file.name === '..') throw Error('Unsafe source filename');
    const bytes = git('cat-file', 'blob', file.gitBlob);
    if (bytes.length !== file.bytes) throw Error(`Source byte count differs: ${row.id}/${file.name}`);
    fs.writeFileSync(path.join(target, file.name), bytes);
    extracted.push({id: row.id, file: `sources/${row.id}/${file.name}`, source: `${path.posix.dirname(row.source)}/${file.name}`, gitBlob: file.gitBlob, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length});
  }
}
fs.writeFileSync(path.join(out, 'extracted-files.json'), JSON.stringify(extracted, null, 2) + '\n');
const md = `# Schiefer-Originale aus der Neuen Struktur\n\nGepinnter Katalog: ${commit}. Nur Originalmaster mit Material Schiefer; keine Übernahme anderer Materialien.\n\n${rows.length} eindeutige Original-IDs; ${report.counts.prepared} mit mindestens einer bereits vorbereiteten Konfi-Version, ${report.counts.open} aus dem vorhandenen Paket offen, ${report.counts.sourceOnly} nur als Quelle inventarisiert. Keine zusätzliche Vorlage wurde durch diese Bestandsaufnahme vorbereitet oder freigegeben. Größen im Katalog belegen Lager-/Variantenbezüge, keine fertigen Konfi-Formate.\n\n| Bereich | Originale | Konfi vorbereitet | Bereits offen | Nur Quelle |\n| --- | ---: | ---: | ---: | ---: |\n${families.map(row => `| ${row.family} | ${row.originals} | ${row.prepared} | ${row.open} | ${row.sourceOnly} |`).join('\n')}\n\nVollständige IDs, Fotozuordnung, Originalmaße, Formatbezüge, Quellpfade und Git-Blob-IDs stehen in inventory.json. Mehrfach geführte Master werden je ID einmal gezählt; alle Quellpfade bleiben erhalten. Ausgewählte Originaldateien werden bytegleich unter sources/ gesichert, mit SHA-256 in extracted-files.json. Fehlende Metadaten und fehlende SVGs werden offen geführt. Die bestehenden Galerie-, Kommentar- und Bearbeitungsdaten bleiben unverändert.\n`;
fs.writeFileSync(path.join(out, 'START-HIER.md'), md);
console.log(JSON.stringify({out, catalogueCommit: commit, counts: report.counts, families, extractedFiles: extracted.length}));
