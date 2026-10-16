#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMAZON_CUSTOM_LIMITS, inspectAmazonCustomSample } from '../app/workshop/amazon-custom.mjs';

const usage = 'Aufruf: node scripts/amazon-custom-inspect.mjs --classification=synthetic|anonymized --approved <datei.json|datei.zip>\nNur ausdrücklich freigegebene Testdaten. Keine Feldwerte, Downloads oder Dateiänderungen.';
const invalid = () => { throw Object.assign(new Error('Eingabe, Dateigröße oder Freigabe ungültig. --help zeigt die Verwendung.'), { code: 'amazon_custom_cli_input' }); };

/** CLI writes a bounded metadata report only. No option exposes personalization values. */
export function runAmazonCustomInspectionCLI(argv, { stdout = value => process.stdout.write(value), stderr = value => process.stderr.write(value) } = {}) {
  let fd;
  try {
    if (argv.length === 1 && argv[0] === '--help') { stdout(usage + '\n'); return 0; }
    let classification, approved = false, input;
    for (const arg of argv) {
      if (arg.startsWith('--classification=')) { if (classification !== undefined) invalid(); classification = arg.slice(17); }
      else if (arg === '--approved') { if (approved) invalid(); approved = true; }
      else if (arg.startsWith('-') || input !== undefined) invalid();
      else input = arg;
    }
    if (!['synthetic', 'anonymized'].includes(classification) || !approved || !input || /^(?:https?|ftp):/i.test(input)) invalid();
    const extension = path.extname(input).toLowerCase(), format = extension === '.json' ? 'json' : extension === '.zip' ? 'zip' : null;
    if (!format || !fs.lstatSync(input).isFile()) invalid();
    fd = fs.openSync(input, 'r'); const stat = fs.fstatSync(fd);
    const limit = format === 'json' ? AMAZON_CUSTOM_LIMITS.jsonBytes : AMAZON_CUSTOM_LIMITS.archiveBytes;
    if (!stat.isFile() || stat.size < 1 || stat.size > limit) invalid();
    // Read at most the approved bound even if another process grows the file.
    const buffer = Buffer.alloc(stat.size + 1); let count = 0;
    while (count < buffer.length) { const n = fs.readSync(fd, buffer, count, buffer.length - count, null); if (!n) break; count += n; }
    if (count !== stat.size) invalid();
    const report = inspectAmazonCustomSample({ bytes: buffer.subarray(0, count), format, source: { classification, operatorApproved: true } });
    const concise = value => String(value).slice(0, 240);
    const fields = report.candidates.slice(0, 100).map(({ file, path: fieldPath, kind, valueRedacted }) => ({ file: concise(file), path: concise(fieldPath), kind, ...(valueRedacted ? { valueRedacted } : {}) }));
    stdout(JSON.stringify({ schema: report.schema, classification, originalSha256: report.originalSha256, originalBytes: report.originalBytes,
      productionReady: false, reviewRequired: true, valuesIncluded: false,
      counts: { files: report.inventory.length, candidateFields: report.candidates.length, unknownFields: report.unknownFields.length },
      inventory: report.inventory.slice(0, 25).map(file => ({ ...file, name: concise(file.name) })),
      candidateFields: fields, unknownFields: report.unknownFields.slice(0, 100).map(item => ({ file: concise(item.file), path: concise(item.path), type: item.type })),
      truncated: report.inventory.length > 25 || report.candidates.length > 100 || report.unknownFields.length > 100,
      limitations: report.limitations }, null, 2) + '\n');
    return 0;
  } catch (error) {
    // System errors can contain private paths; output only our bounded static message/code.
    stderr(JSON.stringify({ error: 'Custom-Testprüfung fehlgeschlagen. Datei, Format, Grenzen und Freigabe prüfen.',
      code: /^amazon_custom_[a-z_]+$/.test(error?.code ?? '') ? error.code : 'amazon_custom_cli_file' }) + '\n');
    return 1;
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = runAmazonCustomInspectionCLI(process.argv.slice(2));
