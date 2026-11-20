import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createFormCustomerStore} from '../../app/workshop/form-customer-store.mjs';
import {NATIVE_REVIEW_SCHEMAS} from '../../app/workshop/native-review-schema.mjs';
import {readReviewPackage} from '../../app/workshop/review-package.mjs';
import {reviewZip} from '../../app/workshop/review-zip.mjs';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw Error('Bitte eine lokale Ring-Prüfdatenbank und einen neuen JSON-Bericht angeben.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const samples = JSON.parse(fs.readFileSync(new URL('../../docs/handoffs/2026-11-19-beta-267/tempo/Ring-Messwerte.json', import.meta.url))).samples;
const knownPngs = new Set(samples.filter(item => item.build === 'neu').map(item => item.pictureSha256));

function readSyntheticBundles() {
  const source = new DatabaseSync(sourcePath, {readOnly:true});
  try {
    const query = source.prepare(`SELECT manifest, preview, contour_pdf, package, photos FROM form_review_snapshots
      WHERE json_extract(manifest,'$.source.designId') IN ('FK-SEITLICH','FK-RUNDUM') ORDER BY rowid`);
    const bundles = [];
    for (const row of query.iterate()) {
      const manifest = JSON.parse(row.manifest);
      const archive = Buffer.from(row.package);
      const {files} = readReviewPackage(archive,manifest.packageSha256,NATIVE_REVIEW_SCHEMAS);
      if (!knownPngs.has(hash(files.get('gestaltung-kundenansicht.png')))) continue;
      bundles.push({manifest,preview:Buffer.from(row.preview),contourPdf:Buffer.from(row.contour_pdf),package:archive,photos:Buffer.from(row.photos)});
      if (bundles.length === 12) break;
    }
    assert.equal(bundles.length,12,'Zwölf gespeicherte Gestaltungen aus der Ring-Vergleichsmessung werden benötigt.');
    assert.equal(new Set(bundles.map(b => b.manifest.id)).size,12);
    assert.equal(bundles.filter(b => b.manifest.source.designId === 'FK-SEITLICH').length,6);
    return bundles;
  } finally { source.close(); }
}

// Compare an isolated serialization alternative. The complete archive payload otherwise stays the same.
function compactSources(bundle) {
  const {files,manifest} = readReviewPackage(bundle.package,bundle.manifest.packageSha256,NATIVE_REVIEW_SCHEMAS);
  for (const name of ['produkt-und-gestaltung.json','konfigurator-quellen.json']) {
    const value = JSON.parse(files.get(name));
    const bytes = Buffer.from(JSON.stringify(value)+'\n');
    assert.deepEqual(JSON.parse(bytes),value);
    files.set(name,bytes);
    const entry = manifest.files.find(file => file.path === name);
    entry.bytes = bytes.length;
    entry.sha256 = hash(bytes);
  }
  files.set('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
  const archive = reviewZip(Array.from(files,([path,bytes]) => ({path,bytes})));
  const digest = hash(archive);
  readReviewPackage(archive,digest,NATIVE_REVIEW_SCHEMAS);
  return {...bundle,package:archive,manifest:{...manifest,packageSha256:digest}};
}

function replay(dir, bundles, checkpointBetweenSaves) {
  const filename = path.join(dir,'workshop.sqlite');
  const store = createFormCustomerStore({filename});
  const observer = new DatabaseSync(filename);
  let settings;
  const rows = [];
  try {
    observer.prepare('SELECT count(*) FROM sqlite_schema').get();
    settings = {
      pageBytes:observer.prepare('PRAGMA page_size').get().page_size,
      checkpointPages:observer.prepare('PRAGMA wal_autocheckpoint').get().wal_autocheckpoint,
      journalMode:observer.prepare('PRAGMA journal_mode').get().journal_mode
    };
    assert.equal(settings.journalMode,'wal');
    // Both scratch databases begin after the schema has been persisted.
    observer.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
    const status = observer.prepare('PRAGMA wal_checkpoint(NOOP)');
    const flush = observer.prepare('PRAGMA wal_checkpoint(PASSIVE)');
    for (const bundle of bundles) {
      const mainBefore = fs.statSync(filename).size;
      const started = performance.now();
      const draft = store.acrylicDrafts.create(bundle);
      const saveMs = Math.round((performance.now()-started)*100)/100;
      assert.equal(draft.snapshotId,bundle.manifest.id);
      const state = status.get();
      const row = {design:bundle.manifest.source.designId,archiveBytes:bundle.package.length,saveMs,walFrames:state.log,
        checkpointedFrames:state.checkpointed,mainGrowthDuringSaveBytes:fs.statSync(filename).size-mainBefore};
      // NOOP must never flush the first small transaction. Older SQLite versions may not support it.
      if (!rows.length) assert.ok(state.log>0 && state.checkpointed===0,'Die SQLite-Version muss wal_checkpoint(NOOP) unterstützen.');
      if (checkpointBetweenSaves) {
        const before = fs.statSync(filename).size;
        const start = performance.now();
        const result = flush.get();
        row.controlMs = Math.round((performance.now()-start)*100)/100;
        row.controlMainGrowthBytes = fs.statSync(filename).size-before;
        assert.equal(result.log,result.checkpointed);
      }
      rows.push(row);
    }
    const final = flush.get();
    assert.equal(final.log,final.checkpointed);
  } finally {
    observer.close();
    store.close();
  }
  const reopened = createFormCustomerStore({filename});
  try {
    for (const bundle of bundles) {
      const archive = reopened.downloadSnapshot(bundle.manifest.id,'package');
      assert.equal(hash(archive),bundle.manifest.packageSha256);
    }
    return {settings,rows,reopenedExactArchives:bundles.length};
  } finally {
    reopened.close();
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-267-schreibtest-'));
try {
  const bundles = readSyntheticBundles();
  const normal = fs.mkdtempSync(path.join(root,'standard-'));
  const control = fs.mkdtempSync(path.join(root,'kontrolle-'));
  const compact = fs.mkdtempSync(path.join(root,'kompakt-'));
  const result = {application:'f7504182',node:process.version,sqlite:process.versions.sqlite,
    scope:'Lokale Schreiben über den vorhandenen R15-Entwurfsspeicher. Beim Kontrolllauf werden dieselben Daten zusätzlich zwischen den Speichervorgängen in die Hauptdatei übernommen. Größen sind beobachtetes Dateiwachstum, keine physischen Laufwerkszähler.',
    standard:replay(normal,bundles,false),control:replay(control,bundles,true),
    compactSources:replay(compact,bundles.map(compactSources),false)};
  fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
} finally {
  if (path.dirname(root)!==path.resolve(os.tmpdir()) || !path.basename(root).startsWith('gravuru-267-schreibtest-')) throw Error('Unerwarteter temporärer Pfad');
  fs.rmSync(root,{recursive:true,force:true});
}
