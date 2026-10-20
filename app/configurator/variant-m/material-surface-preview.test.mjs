import test from 'node:test';
import assert from 'node:assert/strict';
import {previewSurfaceUrl, surfacePreview, validSurface} from './material-surface.mjs';

// Leistung mobil (20.10.2026): data:-Texturen werden für die Bildschirmvorschau einmal zur blob:-Adresse.
const png='data:image/png;base64,'+Buffer.from('\x89PNG\r\n\x1a\nTEST','binary').toString('base64');
const svg='<svg viewBox="0 0 90 30"><defs></defs><rect width="90" height="30"/></svg>';

test('data:-Textur wird einmal zur blob:-Adresse und in der Vorschau verwendet', () => {
  const a=previewSurfaceUrl(png),b=previewSurfaceUrl(png);
  assert.match(a,/^blob:/);
  assert.equal(a,b,'gleiche Textur → gleiche Adresse, keine neuen Blobs je Zeichnung');
  const out=surfacePreview(svg,a,{width:90,height:30,shape:'rect'});
  assert.ok(out.includes('href="'+a+'"'));
  assert.ok(!out.includes('base64'),'die große Textur steht nicht mehr im Vorschau-Markup');
});

test('fremde blob:-Adressen und ungültige Werte bleiben gesperrt', () => {
  assert.equal(validSurface('blob:http://x/abc'),false);
  assert.equal(surfacePreview(svg,'blob:http://x/abc',{width:90,height:30,shape:'rect'}),svg);
  assert.equal(previewSurfaceUrl('/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png'),'/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png');
  assert.equal(previewSurfaceUrl('data:text/html;base64,PGI+'),'data:text/html;base64,PGI+');
});
