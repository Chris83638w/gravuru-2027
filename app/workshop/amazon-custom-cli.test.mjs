import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runAmazonCustomInspectionCLI } from '../../scripts/amazon-custom-inspect.mjs';

function run(args) { let output = '', error = ''; const status = runAmazonCustomInspectionCLI(args, { stdout: text => output += text, stderr: text => error += text }); return { status, output, error }; }
test('CLI requires classification and approval, emits only bounded metadata, and does not alter input', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-amazon-custom-cli-')), file = path.join(dir, 'sample.json');
  const bytes = Buffer.from('{"text":"PRIVATE-TEXT-MUST-NOT-PRINT","image":"https://sample.invalid?token=SECRET","unknown":42}');
  fs.writeFileSync(file, bytes); t.after(() => { fs.unlinkSync(file); fs.rmdirSync(dir); });
  for (const args of [[file], ['--approved', file], ['--classification=synthetic', file],
    ['--classification=real', '--approved', file], ['--classification=synthetic', '--approved', '--include-values', file]]) {
    const result = run(args); assert.equal(result.status, 1); assert.equal(result.output, ''); assert.ok(!result.error.includes(file));
  }
  const result = run(['--classification=synthetic', '--approved', file]), report = JSON.parse(result.output);
  assert.equal(result.status, 0); assert.equal(report.valuesIncluded, false); assert.equal(report.productionReady, false);
  assert.equal(report.counts.candidateFields, 2); assert.ok(!result.output.includes('PRIVATE')); assert.ok(!result.output.includes('SECRET'));
  assert.ok(report.candidateFields.every(entry => !Object.hasOwn(entry, 'value'))); assert.deepEqual(fs.readFileSync(file), bytes);
});

test('CLI truncates displayed fields and never prints private paths on filesystem errors', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-amazon-custom-cli-')), file = path.join(dir, 'sample.json');
  fs.writeFileSync(file, JSON.stringify({ fields: Array.from({ length: 120 }, (_, i) => ({ text: 'TEST-' + i })) }));
  t.after(() => { fs.unlinkSync(file); fs.rmdirSync(dir); });
  const result = run(['--classification=anonymized', '--approved', file]), report = JSON.parse(result.output);
  assert.equal(report.counts.candidateFields, 120); assert.equal(report.candidateFields.length, 100); assert.equal(report.truncated, true);
  const missing = run(['--classification=synthetic', '--approved', path.join(dir, 'PRIVATE.json')]);
  assert.equal(missing.status, 1); assert.ok(!missing.error.includes('PRIVATE')); assert.equal(run(['--help']).status, 0);
});
