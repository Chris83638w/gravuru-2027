// Kleinste nötige DOM-Hilfen. Kein Framework: Der Editor soll in wenigen Kilobyte starten.

/** Element erzeugen: h('button', {class: 'x', onclick: fn}, 'Text', kind) */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'value') el.value = value;
    else if (key === 'checked' || key === 'disabled' || key === 'selected') el[key] = Boolean(value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) if (value != null) el.setAttribute(key, value);
  return el;
}

export const euro = cents => (cents / 100).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';

/** Linien-Icons in einem Stil (Entscheidung 3.4: ein Icon-Stil). */
const ICONS = {
  ausfuehrung: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 5v4M9 15v4',
  designs: 'M4 4h16v16H4zM4 10h16M10 10v10',
  text: 'M6 5h12M12 5v14M9 19h6',
  motive: 'M12 3l2.2 6.3L20 12l-5.8 2.7L12 21l-2.2-6.3L4 12l5.8-2.7z',
  foto: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  korb: 'M4 5h2l2 10h10l2-7H7M9 19h.01M17 19h.01',
  zurueck: 'M19 12H5m5-5l-5 5 5 5',
  undo: 'M8 8L4 12l4 4M4 12h10a5 5 0 010 10h-2',
  redo: 'M16 8l4 4-4 4M20 12H10a5 5 0 000 10h2',
  ebenen: 'M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  muell: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  plus: 'M12 5v14M5 12h14',
  zu: 'M6 6l12 12M18 6L6 18',
  hoch: 'M6 14l6-6 6 6',
  runter: 'M6 10l6 6 6-6',
  links: 'M4 6h16M4 12h10M4 18h13',
  mitte: 'M4 6h16M7 12h10M5 18h14',
  rechts: 'M4 6h16M10 12h10M7 18h13',
  ok: 'M5 12l5 5 9-10',
};
export function icon(name, size = 22) {
  const svg = s('svg', {viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'});
  svg.append(s('path', {d: ICONS[name] || ''}));
  return svg;
}
