// Zeichnen: Gestaltung → SVG-Markup in mm. Reine Textfunktionen ohne DOM, damit
// Editor, Warenkorbbild, Katalogvorschau und Server exakt denselben Code benutzen.

const esc = value => String(value).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/** CSS-Name einer veröffentlichten Schrift. Jede Schriftdatei bekommt einen eigenen Namen. */
export const schriftFamilie = name => 'gk-' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Jeder Buchstabe steht für sich: keine Unterschneidung, keine Ligaturen, keine kontextabhängigen Varianten.
 * So setzen der bestehende Konfi und die Werkstatt seit jeher (app/workshop/design-preview-glyphs.mjs:
 * „glyph.a + letterSpacing, no pair kerning“), und so sind alle Designs freigegeben. Mit Unterschneidung
 * würde Text schmaler laufen – gemessen bis 10 mm auf 300 mm Breite (dev/kontaktbogen.mjs).
 * Gleiche Regel in der Fertigung (server/fertigung.mjs).
 */
const TEXT_STIL = 'font-kerning:none;font-variant-ligatures:none;font-feature-settings:"kern" 0,"liga" 0,"clig" 0,"calt" 0;white-space:pre';

export function textMarkup(el, farbe) {
  const anker = el.anker === 'm' ? 'middle' : el.anker === 'e' ? 'end' : 'start';
  const zeilen = String(el.text).split('\n');
  const abstand = el.lh || el.size * 1.2;
  // Zeichenabstand: Der Browser hängt ihn auch hinter den letzten Buchstaben und richtet die Zeile samt diesem
  // Rest aus. Ausgerichtet wird aber – wie im bestehenden Konfi – das Sichtbare, also ohne den Rest.
  const x = el.x + (el.ls ? el.anker === 'm' ? el.ls / 2 : el.anker === 'e' ? el.ls : 0 : 0);
  const inhalt = zeilen.length === 1
    ? esc(zeilen[0])
    : zeilen.map((zeile, index) => `<tspan x="${x}" y="${el.y + index * abstand}">${esc(zeile) || ' '}</tspan>`).join('');
  return `<text x="${x}" y="${el.y}" font-family="${schriftFamilie(el.font)}" font-size="${el.size}" text-anchor="${anker}"` +
    (el.ls ? ` letter-spacing="${el.ls}"` : '') +
    (el.rot ? ` transform="rotate(${el.rot} ${el.x} ${el.y})"` : '') +
    ` fill="${farbe}" style='${TEXT_STIL}'>${inhalt}</text>`;
}

export function motivTransform(el) {
  const q = el.quelle;
  const cx = q.box[0] - q.tr[0] + q.box[2] / 2;
  const cy = q.box[1] - q.tr[1] + q.box[3] / 2;
  return `translate(${el.x} ${el.y})${el.rot ? ` rotate(${el.rot})` : ''} scale(${el.s}) translate(${-cx} ${-cy})`;
}

export function motivInhalt(el) {
  const q = el.quelle;
  if (q.svg) return q.svg; // Bibliotheksmotiv: geprüfter Inhalt der SVG-Datei
  return q.p.map(p =>
    `<path d="${p.d}" fill="${p.f === 0 ? 'none' : 'currentColor'}"` +
    (p.eo ? ' fill-rule="evenodd"' : '') +
    (p.sw ? ` stroke="currentColor" stroke-width="${p.sw}" stroke-linecap="${p.lc || 'butt'}" stroke-linejoin="${p.lj || 'miter'}"` : '') +
    (p.o != null ? ` opacity="${p.o}"` : '') + '/>').join('');
}

export function motivMarkup(el, farbe) {
  return `<g transform="${motivTransform(el)}" color="${farbe}" fill="${farbe}">${motivInhalt(el)}</g>`;
}

export function fotoMarkup(el, farbe, uid = '') {
  const x = el.x - el.w / 2;
  const y = el.y - el.h / 2;
  const clipId = `gk-clip-${uid}${el.id}`;
  const form = el.maske
    ? `<path d="${el.maske}" transform="translate(${el.x} ${el.y}) scale(${el.mk}) translate(${-(el.mbox[0] - el.mt[0] + el.mbox[2] / 2)} ${-(el.mbox[1] - el.mt[1] + el.mbox[3] / 2)})"/>`
    : el.form === 'circle' || el.form === 'ellipse'
      ? `<ellipse cx="${el.x}" cy="${el.y}" rx="${el.w / 2}" ry="${el.h / 2}"/>`
      : `<rect x="${x}" y="${y}" width="${el.w}" height="${el.h}"/>`;
  const dreh = el.rot ? ` transform="rotate(${el.rot} ${el.x} ${el.y})"` : '';
  if (!el.bild) {
    const groesse = Math.min(el.w, el.h) * 0.11;
    return `<g${dreh}><g fill="${farbe}" fill-opacity=".12" stroke="${farbe}" stroke-opacity=".55" stroke-width="${Math.max(0.15, groesse * 0.06)}" stroke-dasharray="${groesse * 0.5} ${groesse * 0.35}">${form}</g>` +
      `<text x="${el.x}" y="${el.y + groesse * 0.35}" font-family="system-ui,sans-serif" font-size="${groesse}" text-anchor="middle" fill="${farbe}" fill-opacity=".8">Dein Foto</text></g>`;
  }
  // Ausschnitt: zoom ≥ 1, ox/oy verschieben das Bild im Feld (Anteil der Feldgröße).
  const b = el.bild;
  const zoom = b.zoom || 1;
  const feld = el.w / el.h;
  const seite = b.w / b.h;
  const bw = (seite > feld ? el.h * seite : el.w) * zoom;
  const bh = (seite > feld ? el.h : el.w / seite) * zoom;
  const bx = el.x - bw / 2 + (b.ox || 0) * el.w;
  const by = el.y - bh / 2 + (b.oy || 0) * el.h;
  return `<g${dreh}><clipPath id="${clipId}">${form}</clipPath>` +
    `<image href="${esc(b.url)}" x="${bx}" y="${by}" width="${bw}" height="${bh}" preserveAspectRatio="none" clip-path="url(#${clipId})"${b.grau ? ' style="filter:grayscale(1)"' : ''}/></g>`;
}

export function elementMarkup(el, farbe, uid = '') {
  if (el.t === 'text') return textMarkup(el, farbe);
  if (el.t === 'motiv') return motivMarkup(el, farbe);
  return fotoMarkup(el, farbe, uid);
}

const rechteckPfad = ([x, y, w, h]) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;

/**
 * Szene: was unter und über der Gestaltung liegt.
 *   Platten (Türschild, Gedenktafel …): eine Lage; gestaltet wird auf der ganzen Platte.
 *   Funkklingelschild: Edelstahlplatte unten, Acrylglas darauf (Fläche je Rahmen, Farbe wählbar);
 *   gestaltet wird nur auf dem Acryl, das Gerät liegt als Bild darüber und ist fest.
 */
export function szene(familie, groesse, zustand) {
  const material = familie.material;
  if (familie.art !== 'klingel') {
    const gewaehlt = familie.optionen?.find(o => o.k === 'farbe')?.werte.find(w => w.k === zustand.opt?.farbe)?.farbe;
    return {lagen: [{d: groesse.d, farbe: gewaehlt || material.farbe, textur: material.textur || null}], flaeche: groesse.d, geraet: null, gesperrt: null};
  }
  const opt = zustand.opt || {};
  const acryl = groesse.kl.rahmen[opt.rahmen] || Object.values(groesse.kl.rahmen)[0];
  const position = groesse.kl.pos[opt.position] || groesse.kl.pos.standard;
  const farbe = familie.optionen.find(o => o.k === 'farbe')?.werte.find(w => w.k === opt.farbe)?.farbe || material.farbe;
  return {
    lagen: [{d: groesse.d, farbe: material.stahl.farbe, textur: material.stahl.textur || null}, {d: rechteckPfad(acryl), farbe, textur: null}],
    flaeche: rechteckPfad(acryl),
    geraet: familie.geraet?.bild ? {bild: familie.geraet.bild, box: position.bild, name: familie.geraet.name} : null,
    // Fläche des Geräts auf der Platte: Dahinter wird nie graviert (Entscheidung 3.33).
    gesperrt: position.bell,
  };
}

/** Lagen der Szene mit Glanz und Kante. Das Clip-Rechteck `gk-platte-<uid>` begrenzt die Gestaltung auf ihre Fläche. */
export function plattenMarkup(groesse, bild, basis = '', uid = '') {
  const clip = `gk-platte-${uid}`;
  const kante = Math.max(0.12, Math.min(groesse.w, groesse.h) * 0.004);
  return `<defs><clipPath id="${clip}"><path data-flaeche="1" d="${bild.flaeche}"/></clipPath>` +
    `<linearGradient id="gk-glanz-${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>` +
    bild.lagen.map((lage, index) =>
      `<path d="${lage.d}" fill="${lage.farbe}"/>` +
      (lage.textur ? `<clipPath id="${clip}-l${index}"><path d="${lage.d}"/></clipPath><image href="${esc(basis + lage.textur)}" x="0" y="0" width="${groesse.w}" height="${groesse.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip}-l${index})"/>` : '') +
      `<path d="${lage.d}" fill="url(#gk-glanz-${uid})"/>` +
      `<path d="${lage.d}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="${kante}"/>`).join('');
}

/** Gerät (z. B. Funkklingel) als Bild über der Gestaltung. Nur Vorschau, nie Teil der Fertigungsdaten. */
export function geraetMarkup(bild, basis = '') {
  if (!bild.geraet) return '';
  const [x, y, w, h] = bild.geraet.box;
  return `<image href="${esc(basis + bild.geraet.bild)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
}

export function befestigungMarkup(bef, material, basis = '') {
  if (!bef?.l?.length) return '';
  return bef.l.map(([x, y, d]) => {
    if (bef.schraube) {
      const kopf = 5; // Schraubenkopf 5 mm (Entscheidung 3.39)
      return material.schraube
        ? `<image href="${esc(basis + material.schraube)}" x="${x - kopf / 2}" y="${y - kopf / 2}" width="${kopf}" height="${kopf}"/>`
        : `<circle cx="${x}" cy="${y}" r="${kopf / 2}" fill="#9aa0a4" stroke="#555" stroke-width=".15"/>`;
    }
    return `<circle cx="${x}" cy="${y}" r="${d / 2}" fill="#f4f4f2" stroke="#000" stroke-opacity=".45" stroke-width=".15"/>`;
  }).join('');
}

/**
 * Vollständiges Bild einer Gestaltung, z. B. für Warenkorb und Katalogvorschau.
 * `schriftCss` enthält die @font-face-Regeln (im Browser als data:-Adressen), damit das Bild
 * auch außerhalb der Seite gleich aussieht.
 */
export function gestaltungSvg(zustand, familie, {basis = '', schriftCss = '', rand = 0.06, breite = null, hintergrund = null} = {}) {
  const groesse = familie.groessen.find(g => g.k === zustand.groesse);
  const bef = groesse.bef.find(b => b.id === zustand.bef);
  const farbe = familie.verfahren.farbe;
  const bild = szene(familie, groesse, zustand);
  const pad = Math.max(groesse.w, groesse.h) * rand;
  const vb = `${-pad} ${-pad} ${groesse.w + 2 * pad} ${groesse.h + 2 * pad}`;
  const masse = breite ? ` width="${breite}" height="${Math.round(breite * (groesse.h + 2 * pad) / (groesse.w + 2 * pad))}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${masse}>` +
    (schriftCss ? `<style>${schriftCss}</style>` : '') +
    (hintergrund ? `<rect x="${-pad}" y="${-pad}" width="${groesse.w + 2 * pad}" height="${groesse.h + 2 * pad}" fill="${hintergrund}"/>` : '') +
    plattenMarkup(groesse, bild, basis, 'b') +
    `<g clip-path="url(#gk-platte-b)">${zustand.els.map(el => elementMarkup(el, farbe, 'b')).join('')}</g>` +
    geraetMarkup(bild, basis) + befestigungMarkup(bef, familie.material, basis) + '</svg>';
}
