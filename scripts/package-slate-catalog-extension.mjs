import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';

const args = process.argv.slice(2), arg = name => args[args.indexOf(name) + 1];
for (const key of ['--data', '--out']) if (!args.includes(key)) throw Error(`${key} required`);
const data = path.resolve(arg('--data')), out = path.resolve(arg('--out'));
if (fs.existsSync(out)) throw Error('Package output must be new.');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const report = read(path.join(data, 'preparation-report.json'));
assert.equal(report.catalogueExtension, true);
assert.equal(report.exactFormatOnly, true);
assert.equal(report.originals.length, new Set(report.originals.map(row => row.id)).size);
const repository = createProductRepository({filename: path.join(data, 'workshop.sqlite'), validateDocument: validateProductDocument});
let sourceFiles = 0, preparedTargets = 0, objects = 0;
try {
  for (const product of report.products) {
    const document = read(path.join(data, product.file)), stored = repository.get(product.productId);
    validateProductDocument(document);
    assert.deepEqual(stored.document.config, document.config);
    assert.equal(stored.status, 'draft');
  }
  for (const row of report.originals) {
    for (const file of row.files) {
      assert.equal(sha(path.join(data, 'originals', row.id, file.name)), file.sha256);
      assert.equal(sha(path.join(data, 'catalogue-source', path.dirname(row.source), file.name)), file.sha256);
      sourceFiles++;
    }
    for (const target of row.targets.filter(target => target.status === 'prepared')) {
      assert.deepEqual(target.mm, row.sourcePlateMm);
      assert.equal(target.scale, 1);
      assert.deepEqual(target.offsetMm, [0, 0]);
      const {template} = read(path.join(data, target.file));
      assert.equal(template.katalog.originalId, row.id);
      assert.equal(template.katalog.sourceSvgSha256, sha(path.join(data, 'originals', row.id, 'design.svg')));
      assert.equal(template.katalog.target.released, false);
      assert(report.products.some(product => product.key.startsWith(target.sizeKey + ':') && product.designIds.includes(row.id)));
      preparedTargets++;
      objects += template.objects.length;
    }
  }
} finally { repository.close(); }
write(path.join(data, 'audit.json'), {sourceFiles, sourceFilesByteIdentical: true, preparedTargets, preparedObjects: objects, exactSourceDimensions: true, scale: 1, offsetMm: [0, 0], productsReadBack: report.products.length, allLocalDrafts: true, shopifyWrites: 0});
execFileSync(process.execPath, [fileURLToPath(new URL('./package-slate-originals.mjs', import.meta.url)), '--data', data, '--out', out], {stdio: 'inherit'});
const manifestFile = path.join(out, 'manifest.json'), manifest = read(manifestFile);
manifest.catalogueExtension = true;
manifest.exactFormatOnly = true;
write(manifestFile, manifest);
const sizes = [...new Set(report.originals.flatMap(row => row.targets.filter(target => target.status === 'prepared').map(target => target.mm.join(' × ') + ' mm')))];
fs.writeFileSync(path.join(out, 'START-HIER.md'), `# Schiefer-Türschilder und Hausnummern · Ergänzung\n\nKatalog ${report.catalogueCommit}. ${report.counts.originals} Originale aus der Neuen Struktur, ${report.counts.preparedDesigns} native Konfi-Vorlagen in exakt vorhandenen Originalformaten (${sizes.join('; ')}). ${report.originals.filter(row => !row.targets.some(target => target.status === 'prepared')).length} bleiben mit ihrer Ursache offen.\n\nAlle Originaldateien sind bytegleich erhalten. Die Vorbereitung übernimmt Originaltexte, Originalpfade und Positionen; ausschließlich dokumentierte Ersatzschriften aus schriften/ersatz-tuerschilder.json und dem bereits genehmigten Fontplan sind erlaubt. Kein Drehen, kein Anpassen an andere Seitenverhältnisse, keine erfundene Platte. Die 14 × 22 cm großen Hausnummernmaster bleiben offen, weil im gepinnten Naturschiefer-Familienkatalog kein genau passendes Format liegt. UV-Drucke werden nicht zu Gravuren umgewandelt.\n\nImport ausschließlich in einen neuen lokalen Prüfungsordner: node scripts/load-slate-original-review.mjs --package "${out}" --out "<neuer Prüfungsordner>". Dieses Paket überschreibt keine vorhandenen Kommentare oder gespeicherten Bearbeitungen. Für eine Zusammenführung muss der vorhandene Prüfungsordner zuerst gesichert und die Produkt-/Importliste vereinigt werden. Bildfreigaben und Live-Freigabe bleiben offen.\n\nAudit: ${sourceFiles} Originaldateien, ${preparedTargets} exakte Größenfassungen, ${objects} native Elemente, ${report.products.length} Produkt-Rücklesevergleiche. Details und offene Ursachen in preparation-report.json, audit.json und OFFENE-ORIGINALE.json.\n`, 'utf8');
const checksums = read(path.join(out, 'files-sha256.json')).map(file => ({...file, sha256: sha(path.join(out, file.file)), bytes: fs.statSync(path.join(out, file.file)).size}));
write(path.join(out, 'files-sha256.json'), checksums);
console.log(JSON.stringify({out, preparedTargets, sourceFiles, objects, formats: sizes, productsReadBack: report.products.length}));
