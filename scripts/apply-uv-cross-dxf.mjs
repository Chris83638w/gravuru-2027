// Regenerate the UV cross contours from the supplied, revision-bound DXFs.
// node scripts/apply-uv-cross-dxf.mjs <catalogue> [directory containing the supplied DXFs]
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {contourPathBounds,contourPathCommands} from '../app/workshop/contour-path.mjs';
import {validateFamily} from '../app/workshop/product-families.mjs';

const [catalogue, supplied] = process.argv.slice(2);
assert(catalogue, 'Catalogue directory is required.');
const revision = 'DXF-R2';
const sourceDirectory = 'schneidvorlagen/kreuze/dxf-2026-11-09';
const manifestPath = sourceDirectory + '/konturen.json';
const familyPath = 'familien/acryl/uv-gedenkkreuze-acryl-klar.json';
const registerPath = 'designs/uv-gedenkkreuze-register.json';
const sizes = ['11x20', '14x25', '22x40'];
const read = file => fs.readFileSync(path.join(catalogue, file));
const readJson = file => JSON.parse(read(file).toString('utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const number = value => Number(value.toFixed(12));
const changes = new Map();
const queue = (file, bytes) => changes.set(file, Buffer.from(bytes));
const queueJson = (file, data) => queue(file, JSON.stringify(data, null, 2) + '\n');

function extractDxf(bytes) {
  const lines = bytes.toString('ascii').trimEnd().split(/\r?\n/);
  assert.equal(lines.length % 2, 0, 'Unvollständige DXF-Gruppe.');
  const tags = Array.from({length: lines.length / 2}, (_, i) => [Number(lines[i * 2].trim()), lines[i * 2 + 1].trim()]);
  const section = name => {
    const start = tags.findIndex(([code, value], i) => code === 2 && value === name && tags[i - 1]?.[1] === 'SECTION');
    const end = tags.findIndex(([code, value], i) => i > start && code === 0 && value === 'ENDSEC');
    assert(start >= 0 && end > start, 'DXF-Abschnitt fehlt: ' + name);
    return tags.slice(start + 1, end);
  };
  const header = section('HEADER');
  const units = header.findIndex(([code, value]) => code === 9 && value === '$INSUNITS');
  assert(units >= 0 && header[units + 1]?.[1] === '4', 'Die DXF muss in Millimetern vorliegen.');
  const entity = section('ENTITIES');
  assert.deepEqual(entity.filter(([code]) => code === 0).map(([, value]) => value), ['LWPOLYLINE'],
    'Genau eine geschlossene Schnitt-Polylinie erwartet.');
  const get = code => entity.find(([key]) => key === code)?.[1];
  const layer = get(8);
  assert.equal(layer, 'SCHNITT');
  assert(Number(get(70)) & 1, 'Schnitt-Polylinie muss geschlossen sein.');
  for (const [code, expected] of [[38, 0], [39, 0], [40, 0], [41, 0], [43, 0], [210, 0], [220, 0], [230, 1]]) {
    assert(entity.every(([key, value]) => key !== code || Number(value) === expected),
      'Die Kontur muss eine ebene Haarlinie ohne DXF-Transformation sein.');
  }

  const vertices = [];
  for (const [code, value] of entity) {
    if (code === 10) vertices.push({x: Number(value), y: NaN, bulge: 0});
    if (code === 20) vertices.at(-1).y = Number(value);
    if (code === 42) vertices.at(-1).bulge = Number(value);
  }
  assert.equal(vertices.length, Number(get(90)));
  assert(vertices.length >= 3 && vertices.every(v => Object.values(v).every(Number.isFinite)));

  function makeOutline(minX, maxY) {
    const point = v => [number(v.x - minX), number(maxY - v.y)].join(' ');
    return vertices.reduce((outline, start, i) => {
      const end = vertices[(i + 1) % vertices.length];
      if (start.bulge === 0) return outline + ' L' + point(end);
      const angle = 4 * Math.atan(start.bulge);
      const chord = Math.hypot(end.x - start.x, end.y - start.y);
      const radius = number(chord / (2 * Math.sin(Math.abs(angle) / 2)));
      assert(radius > 0, 'Ungültiger DXF-Kreisbogen.');
      // SVG's Y-axis is reversed, so the bulge direction reverses as well.
      return outline + ' A' + [radius, radius, 0, Number(Math.abs(angle) > Math.PI), Number(angle < 0)].join(' ') + ' ' + point(end);
    }, 'M' + point(vertices[0])) + ' Z';
  }

  // Derive the extents of the arcs as well as of the vertices. The supplied
  // DXFs have placeholder $EXTMIN and $EXTMAX header entries.
  const [minX, minYDown] = contourPathBounds(makeOutline(0, 0));
  const outline = makeOutline(minX, -minYDown);
  const [left, top, width, height] = contourPathBounds(outline).map(number);
  assert.equal(left, 0);
  assert.equal(top, 0);
  const arcs = contourPathCommands(outline).filter(command => command.command === 'A');
  return {
    layer, vertices: vertices.length, arcCount: arcs.length, widthMm: width, heightMm: height,
    radiiMm: [...new Set(arcs.map(({values}) => values[0]))], outline
  };
}

function replaceCutPath(svg, oldPath, newPath, filename) {
  const pattern = /(<g\b[^>]*\bdata-spot-name="CutContour"[^>]*>\s*<path\b[^>]*\bd=")([^"]+)(")/g;
  const cuts = [...svg.matchAll(pattern)];
  assert.equal(cuts.length, 1, filename + ': Eindeutige CutContour-Gruppe erwartet.');
  assert([oldPath, newPath].includes(cuts[0][2]), filename + ': Abweichende Ausgangskontur.');
  return svg.replace(pattern, (_, before, _old, after) => before + newPath + after);
}

const family = readJson(familyPath);
const historicalContours = readJson('schneidvorlagen/kreuze/kreuze.json');
const contourSources = {};
for (const size of sizes) {
  const dxf = 'kreuz-' + size + '.dxf';
  const file = sourceDirectory + '/' + dxf;
  const bytes = supplied ? fs.readFileSync(path.join(supplied, dxf)) : read(file);
  if (fs.existsSync(path.join(catalogue, file))) {
    assert(read(file).equals(bytes), file + ': DXF-Quelle wurde bereits eingefroren.');
  }
  const source = extractDxf(bytes);
  const format = family.sizes.find(row => row.key === 'UV-KREUZ-' + size.toUpperCase());
  const oldPath = historicalContours[size].outline;
  assert(format && [oldPath, source.outline].includes(format.outlinePath), size + ': Unbekannte Ausgangskontur.');
  assert.deepEqual([source.widthMm, source.heightMm], [format.widthMm, format.heightMm],
    size + ': Die freigegebene Fassung braucht für abweichende Maße eine neue Einpassung.');
  const oldCommands = contourPathCommands(oldPath);
  const newCommands = contourPathCommands(source.outline);
  assert.deepEqual(newCommands.map(c => c.command), oldCommands.map(c => c.command));
  const maxCoordinateChange = Math.max(...newCommands.flatMap((c, i) => c.values.map((v, j) => Math.abs(v - oldCommands[i].values[j]))));
  assert(maxCoordinateChange <= .001, size + ': Konturform außerhalb des Rundungsvergleichs.');
  format.outlinePath = source.outline;
  contourSources[size] = {file, sha256: sha256(bytes), ...source, maxRoundedCoordinateChangeMm: number(maxCoordinateChange)};
  queue(file, bytes);
  queue(sourceDirectory + '/kreuz-' + size + '.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${source.widthMm}mm" height="${source.heightMm}mm" viewBox="0 0 ${source.widthMm} ${source.heightMm}">\n<path id="CutContour" d="${source.outline}" fill="none" stroke="#ff0000" stroke-width="0.0762"/>\n</svg>\n`);

  const series = 'designs/uv-gedenkkreuze-' + size;
  const index = readJson(series + '/index.json');
  assert.equal(index.length, 20);
  for (const {pfad} of index) {
    const folder = series + '/' + pfad;
    const design = readJson(folder + '/design.json');
    assert.deepEqual(design.plateMm, [source.widthMm, source.heightMm]);
    for (const filename of ['design.svg', 'CutContour.svg']) {
      const svgPath = folder + '/' + filename;
      queue(svgPath, replaceCutPath(read(svgPath).toString('utf8'), oldPath, source.outline, svgPath));
    }

    // The approved SVG stays byte-identical. Publish the current master as a
    // new production reference, retaining the two R1a fit corrections.
    const currentMaster = folder + '/druck-master.svg';
    const newMaster = 'druck-master-' + revision + '.svg';
    const svg = replaceCutPath(read(currentMaster).toString('utf8'), oldPath, source.outline, currentMaster);
    const currentTitle = /(<title>[^<]*?\/SVG-)R1(?:a)?(<\/title>)/;
    const currentMetadata = /((?:&quot;|")svgRevision(?:&quot;|")\s*:\s*(?:&quot;|"))R1a?((?:&quot;|"))/;
    assert(currentTitle.test(svg) && currentMetadata.test(svg), currentMaster + ': Originalrevision fehlt.');
    queue(folder + '/' + newMaster, svg.replace(currentTitle, (_, pre, post) => pre + revision + post)
      .replace(currentMetadata, (_, pre, post) => pre + revision + post));
    design.svgRevision = revision;
    design.contourSource = {file, sha256: contourSources[size].sha256, revision};
    design.productionSources.master = newMaster;
    queueJson(folder + '/design.json', design);
  }
}

const manifest = {schema: 'gravuru-uv-cross-dxf-contours/v1', revision, units: 'mm', sizes: contourSources};
const manifestBytes = JSON.stringify(manifest, null, 2) + '\n';
queue(manifestPath, manifestBytes);
// Prevent core.autocrlf from altering the original DXF files on commit.
queue(sourceDirectory + '/.gitattributes', '*.dxf -text\nkonturen.json text eol=lf\n');
family.source = {
  repository: 'Chris83638w/gravuru-katalog.',
  path: manifestPath,
  sha256: sha256(manifestBytes),
  note: 'DXF-R2 aus den drei gelieferten DXFs vom 09.11.2026. Originale und Prüfsummen im Konturregister. Historische Ableitung unter schneidvorlagen/kreuze/kreuze.json.'
};
family.briefingNotes = family.briefingNotes.replace('Katalogkonturen unverändert.', 'Konturstand DXF-R2 direkt aus den drei gelieferten DXFs.');
validateFamily(family);
queueJson(familyPath, family);
const register = readJson(registerPath);
register.contourRevision = revision;
register.contourSource = manifestPath;
queueJson(registerPath, register);
for (const [file, bytes] of changes) {
  const target = path.join(catalogue, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) fs.writeFileSync(target, bytes);
}
console.log(JSON.stringify(manifest, null, 2));
