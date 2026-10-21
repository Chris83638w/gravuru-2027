// Fehler 20.10.2026: Größenregeln für Design-Karten/Galerie trafen auch verschachtelte Motiv-SVGs
// (Kreuz, Rose … in der Designauswahl aufgeblasen). Regeln gelten nur für das äußere Vorschau-SVG.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const unscoped=/(\.c-design-card svg|\.c-gallery svg|\.workflow-hover-preview svg|\.motifs>button svg|\.workflow-motif-grid svg)(?=\s*[,{])/;
test('Design-Karten-Regeln sind auf das äußere SVG begrenzt (Quellen)',()=>{
  for(const file of ['ux.css','usability.css','workflow.css','adapter.mjs'])
    assert.doesNotMatch(fs.readFileSync(path.join(HERE,file),'utf8'),unscoped,file);
});
test('Build begrenzt die Regeln auch im Editor-Quelltext',()=>{
  const build=fs.readFileSync(path.join(HERE,'build.mjs'),'utf8');
  assert.match(build,/:not\(svg svg\)/);
  const out=path.join(HERE,'.preview','editor.html');
  if(fs.existsSync(out))assert.doesNotMatch(fs.readFileSync(out,'utf8'),/\.c-design-card svg(?=\s*[,{])/);
});
