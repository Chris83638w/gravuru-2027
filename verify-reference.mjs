import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'QUELLEN-MANIFEST.json'), 'utf8'));
const extracted = process.argv.find(a => a.startsWith('--extracted='))?.slice('--extracted='.length);
const base = extracted ? path.resolve(root, extracted) : root;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function check(base, item) {
  const file = path.resolve(base, item.path);
  const rel = path.relative(base, file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Ungültiger relativer Pfad: ' + item.path);
  const bytes = fs.readFileSync(file);
  if (bytes.length !== item.bytes || hash(bytes) !== item.sha256) throw Error('Prüfsumme abweichend: ' + item.path);
}
for (const item of manifest.archives) check(root, item);
if (extracted) for (const item of manifest.files) check(base, item);
console.log(JSON.stringify({archivesVerified: manifest.archives.length, extractedFilesVerified: extracted ? manifest.files.length : 0, scope: 'Dateiintegrität; keine Funktions- oder Produktionsfreigabe'}));
