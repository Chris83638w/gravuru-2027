import {textPaths} from '../../platform/sources/app/shared/models/text-paths.mjs';

// Use the same glyphs as the preview. Never retain an empty startup measurement:
// fonts arrive lazily, and an empty getBBox would otherwise fall back to the
// larger selection rectangle for the remainder of the session.
export function createTextBounds(el) {
  const faces = new WeakMap();
  return object => {
    const family = el.fontData?.[object.font];
    const face = family?.[object.bold ? 'bold' : 'regular'] || family?.regular;
    if (!face) throw Error('Schrift wird noch geladen.');
    const key = JSON.stringify([object.text,object.font,object.bold,object.italic,object.size,
      object.letterSpacing,object.textAnchor,object.lineHeight,object.w]);
    let cache = faces.get(face);
    if (cache?.has(key)) return cache.get(key);
    const svg = el.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.style.cssText = 'position:absolute;visibility:hidden;width:1px;height:1px';
    svg.innerHTML = '<g>'+textPaths(object,el.fontData)+'</g>';
    el.shadowRoot.append(svg);
    let bounds;
    try {
      const b = svg.firstElementChild.getBBox();
      bounds = {x:b.x,y:b.y,width:b.width,height:b.height};
    } finally { svg.remove(); }
    if (!Object.values(bounds).every(Number.isFinite) || !(bounds.width>0 && bounds.height>0)) {
      if (String(object.text??'').trim()) throw Error('Schrift konnte noch nicht gemessen werden.');
      return bounds;
    }
    if (!cache) faces.set(face,cache=new Map());
    if (cache.size>100) cache.clear();
    cache.set(key,bounds);
    return bounds;
  };
}
