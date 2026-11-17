#!/usr/bin/env node
// Baut die Browser-Dateien: einen winzigen Einstieg (konfi.js) und den Editor (editor.js), beide minifiziert.
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'dist', 'app');
fs.rmSync(out, {recursive: true, force: true});
const gemeinsam = {bundle: true, format: 'esm', minify: true, target: ['es2020', 'safari15'], loader: {'.css': 'text'}, legalComments: 'none', logLevel: 'warning'};
await build({...gemeinsam, entryPoints: [path.join(here, 'editor/einstieg.mjs')], outfile: path.join(out, 'konfi.js'), external: ['./editor.js']});
await build({...gemeinsam, entryPoints: [path.join(here, 'editor/app.mjs')], outfile: path.join(out, 'editor.js')});
const groessen = {};
for (const file of fs.readdirSync(out)) {
  const data = fs.readFileSync(path.join(out, file));
  groessen[file] = {bytes: data.length, brotli: zlib.brotliCompressSync(data, {params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 11}}).length, gzip: zlib.gzipSync(data, {level: 9}).length};
}
fs.writeFileSync(path.join(out, 'groessen.json'), JSON.stringify(groessen, null, 1));
console.log(JSON.stringify(groessen));
