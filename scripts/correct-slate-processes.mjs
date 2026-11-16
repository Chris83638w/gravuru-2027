// Run after source extraction, before native preparation; also supports existing open-only reports.
import fs from 'node:fs';
import path from 'node:path';
import {correctSlateProcesses} from './lib/slate-process-corrections.mjs';
const args = process.argv.slice(2), value = k => args[args.indexOf(k) + 1];
if (!args.includes('--data')) throw Error('--data required');
const root = path.resolve(value('--data'));
const plan = JSON.parse(fs.readFileSync(new URL('./data/slate-process-corrections-20261106.json', import.meta.url)));
const pending = [];
for (const name of ['source-inventory.json', 'preparation-report.json']) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file));
  if (Array.isArray(data)) pending.push([file, correctSlateProcesses(data, plan)]);
  else {
    data.originals = correctSlateProcesses(data.originals, plan, data.products);
    data.counts.engraving = data.originals.filter(r => r.process === 'Gravur').length;
    data.counts.uv = data.originals.filter(r => r.process === 'UV').length;
    data.counts.openDesigns = data.originals.filter(r => r.process === 'Gravur' && (!r.targets.length || r.targets.some(t => t.status !== 'prepared'))).length;
    pending.push([file, data]);
  }
}
if (!pending.length) throw Error('No source inventory/report found');
// All guards pass before any metadata write. Original files and native product data stay untouched.
for (const [file, data] of pending) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({correctedIds: Object.keys(plan.designs), files: pending.map(([f]) => path.basename(f)), originalFilesChanged: 0, productWrites: 0}));
