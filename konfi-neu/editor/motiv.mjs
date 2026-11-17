// Bibliotheksmotiv aus einer SVG-Datei übernehmen. Es wird nur bekannte Vektorgeometrie
// übernommen; Skripte, Verweise, Bilder und Stilangaben werden verworfen.
const ERLAUBT = new Set(['g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line']);
const ATTRIBUTE = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points', 'transform', 'fill-rule', 'clip-rule', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'opacity']);
const esc = value => String(value).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

export function motivAusSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName !== 'svg' || doc.querySelector('parsererror')) throw new Error('Motiv ist keine gültige SVG-Datei.');
  const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) throw new Error('Motiv ohne gültige viewBox.');
  const schreiben = node => {
    if (node.nodeType !== 1 || !ERLAUBT.has(node.nodeName)) return '';
    let attrs = '';
    for (const attr of node.attributes) {
      if (ATTRIBUTE.has(attr.name)) attrs += ` ${attr.name}="${esc(attr.value)}"`;
      // Farben werden zur Gravur- bzw. Druckfarbe; "none" bleibt, damit Konturen und Aussparungen stimmen.
      else if (attr.name === 'fill' || attr.name === 'stroke') attrs += ` ${attr.name}="${attr.value.trim() === 'none' ? 'none' : 'currentColor'}"`;
    }
    const kinder = [...node.childNodes].map(schreiben).join('');
    return node.nodeName === 'g' ? `<g${attrs}>${kinder}</g>` : `<${node.nodeName}${attrs}/>`;
  };
  const inhalt = [...svg.childNodes].map(schreiben).join('');
  if (!inhalt) throw new Error('Motiv enthält keine Vektorformen.');
  return {viewBox, inhalt};
}
