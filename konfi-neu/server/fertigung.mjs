// Fertigungsdateien aus einer gespeicherten Gestaltung: maßhaltige SVG in mm, Text als Pfade.
//
// Regeln und ihre Quelle (ENTSCHEIDUNGEN.md, Abschnitt 6):
//   6.3  Text bleibt im Design Text; Pfade entstehen erst hier, bei der Bestellung.
//   6.2  Farben: Edelstahlkontur blau, Acrylaußenkontur gelb, Innenschnitte rot, Gravur schwarz.
//        Getrennte Dateien je Lage. Klingel, Gerätebild und Positionshilfen stehen nie in den Schneiddaten.
//   6.8  Schnittlinien als rote Haarlinie (#FF0000, 0,0762 mm).
//   6.4  Bohrlöcher: Die Gravur bleibt vollständig, keine Aussparung. Gebohrt wird danach.
//   6.6  Acryl wird von hinten graviert: zusätzlich eine gespiegelte Datei für den Laser.
//   6.11 Eine Testbestellung löst nie eine Fertigung aus: Ordner und Auftrag sind als TEST gekennzeichnet.
//
// Textsatz: HarfBuzz, dieselbe Bibliothek, mit der Chrome und Firefox Text setzen, auf der Originalschrift.
// (Ein einfacherer Satz ohne HarfBuzz wich bei 10 von 89 Schriften um bis zu 7,7 % ab, weil er deren
// Unterschneidung nicht kannte – gemessen mit dev/vergleich-textbreite.mjs.)
// Zusätzlich misst der Editor die Breite jedes Textes und schickt sie mit; weicht die hier berechnete Breite ab,
// steht das als Prüfhinweis im Auftrag. So geht keine Abweichung unbemerkt in die Fertigung.
import fs from 'node:fs';
import path from 'node:path';
import * as hb from 'harfbuzzjs';
import {groesseVon, befestigungVon, materialName, texteVon, ueberlappt} from '../core/modell.mjs';
import {motivTransform, motivInhalt} from '../core/zeichnen.mjs';

const HAARLINIE = 0.0762;
const BLAU = '#0000ff', GELB = '#ffff00', ROT = '#ff0000', SCHWARZ = '#000000';
// Wie in der Vorschau (core/zeichnen.mjs): Unterschneidung an, Ligaturen und kontextabhängige Varianten aus.
const MERKMALE = ['liga', 'clig', 'calt', 'dlig', 'hlig'].map(tag => new hb.Feature(tag, 0));

/** Glyphenumriss aus Schrifteinheiten (y nach oben) in mm an seine Stelle setzen. */
function umrissSetzen(d, k, x0, y0) {
  let istX = true;
  return d.replace(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g, zahl => {
    const wert = istX ? x0 + Number(zahl) * k : y0 - Number(zahl) * k;
    istX = !istX;
    return String(Number(wert.toFixed(4)));
  });
}

/** Textsatz auf den Originalschriften. `zeile` liefert Breite und Umriss einer Textzeile in mm. */
export function schriftSatz(schriftOrdner) {
  const verzeichnis = JSON.parse(fs.readFileSync(path.join(schriftOrdner, '..', 'schriften.json'), 'utf8'));
  const geladen = new Map();
  function schrift(name) {
    if (!geladen.has(name)) {
      const eintrag = verzeichnis[name];
      if (!eintrag) throw new Error('Schrift für die Fertigung fehlt: ' + name);
      const bytes = fs.readFileSync(path.join(schriftOrdner, eintrag.datei));
      const face = new hb.Face(new hb.Blob(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
      // Schriften, die ihre Unterschneidung nur in der alten Tabelle „kern“ tragen, werden überall ohne
      // Unterschneidung gesetzt (publish/schriften.py). Diese HarfBuzz-Fassung wertet die Tabelle ohnehin nicht aus.
      geladen.set(name, {font: new hb.Font(face), upem: face.upem, umrisse: new Map()});
    }
    return geladen.get(name);
  }
  return {
    zeile(name, text, groesse, abstand = 0) {
      const s = schrift(name);
      const buffer = new hb.Buffer();
      buffer.addText(text);
      buffer.guessSegmentProperties();
      hb.shape(s.font, buffer, MERKMALE);
      const infos = buffer.getGlyphInfos(), positionen = buffer.getGlyphPositions();
      const k = groesse / s.upem;
      const glyphen = [];
      const fehlt = new Set();
      let x = 0;
      infos.forEach((info, index) => {
        const p = positionen[index];
        if (info.codepoint === 0) fehlt.add(String.fromCodePoint(text.codePointAt(info.cluster) ?? 0xfffd));
        if (!s.umrisse.has(info.codepoint)) s.umrisse.set(info.codepoint, s.font.glyphToPath(info.codepoint));
        glyphen.push({d: s.umrisse.get(info.codepoint), x: x + p.xOffset * k, y: p.yOffset * k});
        x += p.xAdvance * k + abstand;
      });
      buffer.destroy?.();
      return {breite: x, fehlt: [...fehlt], pfad: (x0, y0) => glyphen.map(g => g.d ? umrissSetzen(g.d, k, x0 + g.x, y0 - g.y) : '').join('')};
    },
  };
}
const n = wert => Number(Number(wert).toFixed(4));
const esc = value => String(value).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const kreis = ([x, y, d]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(d / 2)}"/>`;
const rechteckPfad = ([x, y, w, h]) => `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;

export function fertigung({schriftOrdner}) {
  const satz = schriftSatz(schriftOrdner);

  /** Text als Pfad. Liefert Markup und die berechnete Breite der breitesten Zeile. */
  function textPfad(el) {
    const zeilen = String(el.text).split('\n');
    const abstand = el.lh || el.size * 1.2;
    let d = '', breiteMax = 0;
    const fehlt = new Set();
    zeilen.forEach((text, index) => {
      const zeile = satz.zeile(el.font, text, el.size, el.ls || 0);
      for (const zeichen of zeile.fehlt) fehlt.add(zeichen);
      breiteMax = Math.max(breiteMax, zeile.breite);
      const start = el.anker === 'm' ? el.x - zeile.breite / 2 : el.anker === 'e' ? el.x - zeile.breite : el.x;
      d += zeile.pfad(start, el.y + index * abstand);
    });
    const markup = `<path d="${d}"${el.rot ? ` transform="rotate(${el.rot} ${n(el.x)} ${n(el.y)})"` : ''}/>`;
    return {markup, breite: breiteMax, fehlt: [...fehlt]};
  }

  /**
   * @param {object} gestaltung  {id, rev, zustand, preis} aus dem Speicher
   * @param {object} eintrag     veröffentlichtes Produkt (dist/daten/p/…)
   * @param {(uploadId:string) => ({datei:string}|null)} upload  Originalfoto zu einer Upload-Kennung
   * @returns {{dateien: Record<string,string>, fotos: {datei:string, element:string}[], auftrag: object}}
   */
  return function erzeugen(gestaltung, eintrag, upload = () => null) {
    const zustand = gestaltung.zustand;
    const familie = eintrag.familie;
    const groesse = groesseVon(familie, zustand.groesse);
    const bef = befestigungVon(groesse, zustand.bef);
    const hinweise = [];
    const fotos = [];
    const klingel = familie.art === 'klingel';
    const position = klingel ? groesse.kl.pos[zustand.opt.position] : null;
    const acryl = klingel ? groesse.kl.rahmen[zustand.opt.rahmen] : null;

    // ---- Gravur: alle Elemente in Plattenkoordinaten, schwarz
    const gravur = zustand.els.map(el => {
      if (el.t === 'text') {
        if (!el.text.trim()) return '';
        const {markup, breite, fehlt} = textPfad(el);
        if (fehlt.length) hinweise.push(`Text „${el.text.split('\n')[0].slice(0, 40)}“: Die Schrift ${el.font} enthält ${fehlt.map(z => '„' + z + '“').join(', ')} nicht. Der Kunde hat an dieser Stelle eine Ersatzschrift gesehen – nicht fertigen, bevor das geklärt ist.`);
        if (typeof el.mw === 'number' && Math.abs(breite - el.mw) > Math.max(0.3, el.mw * 0.015)) {
          hinweise.push(`Text „${el.text.split('\n')[0].slice(0, 40)}“: Breite hier ${breite.toFixed(2)} mm, im Editor ${el.mw.toFixed(2)} mm. Bitte mit dem Vorschaubild vergleichen.`);
        }
        if (el.mw == null) hinweise.push(`Text „${el.text.split('\n')[0].slice(0, 40)}“: keine Vergleichsbreite aus dem Editor.`);
        return markup;
      }
      if (el.t === 'motiv') {
        if (position && !el.rot && ueberlappt([el.x - el.w / 2, el.y - el.h / 2, el.w, el.h], position.bell)) hinweise.push('Ein Motiv liegt auf der Gerätefläche.');
        // Feste Farbe statt „currentColor“: Fertigungsprogramme kennen den Platzhalter nicht.
        return `<g transform="${motivTransform(el)}">${motivInhalt(el).replaceAll('currentColor', SCHWARZ)}</g>`;
      }
      if (el.t === 'foto' && el.bild) {
        const original = upload(el.bild.upload);
        if (!original) { hinweise.push('Originalfoto fehlt für Element ' + el.id + '.'); return ''; }
        fotos.push({datei: original.datei, element: el.id});
        hinweise.push(`Foto „${original.datei}“ ist als Bild eingebettet (Ausschnitt wie im Editor). Für die Gravur muss es in der Werkstatt gerastert werden.`);
        const b = el.bild, zoom = b.zoom || 1, feld = el.w / el.h, seite = b.w / b.h;
        const bw = (seite > feld ? el.h * seite : el.w) * zoom, bh = (seite > feld ? el.h : el.w / seite) * zoom;
        const id = `ausschnitt-${fotos.length}`;
        return `<g${el.rot ? ` transform="rotate(${el.rot} ${n(el.x)} ${n(el.y)})"` : ''}><clipPath id="${id}"><rect x="${n(el.x - el.w / 2)}" y="${n(el.y - el.h / 2)}" width="${n(el.w)}" height="${n(el.h)}"/></clipPath>` +
          `<image href="${esc(original.datei)}" x="${n(el.x - bw / 2 + (b.ox || 0) * el.w)}" y="${n(el.y - bh / 2 + (b.oy || 0) * el.h)}" width="${n(bw)}" height="${n(bh)}" preserveAspectRatio="none" clip-path="url(#${id})"/></g>`;
      }
      return '';
    }).join('');

    const rahmen = (inhalt, {spiegeln = false, feld = [0, 0, groesse.w, groesse.h], titel}) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${n(feld[2])}mm" height="${n(feld[3])}mm" viewBox="${n(feld[0])} ${n(feld[1])} ${n(feld[2])} ${n(feld[3])}">` +
      `<title>${esc(titel)}</title>` +
      (spiegeln ? `<g transform="translate(${n(2 * feld[0] + feld[2])} 0) scale(-1 1)">${inhalt}</g>` : inhalt) + '</svg>';
    const linie = (farbe, id, inhalt) => `<g id="${id}" fill="none" stroke="${farbe}" stroke-width="${HAARLINIE}">${inhalt}</g>`;
    const kennung = `${gestaltung.id}.${gestaltung.rev}`;
    const dateien = {};

    if (!klingel) {
      const stahl = familie.material.art === 'steel';
      const kontur = linie(stahl ? BLAU : GELB, 'kontur', `<path d="${groesse.d}"/>`);
      const bohrungen = bef.l.length ? linie(ROT, 'bohrungen', bef.l.map(kreis).join('')) : '';
      const inhalt = kontur + `<g id="gravur" fill="${SCHWARZ}" stroke="none">${gravur}</g>` + bohrungen;
      dateien['fertigung.svg'] = rahmen(inhalt, {titel: `${kennung} · ${materialName(familie, zustand)} · ${groesse.n} · lesbar`});
      if (familie.material.rueckseite) {
        dateien['laser-gespiegelt.svg'] = rahmen(inhalt, {spiegeln: true, titel: `${kennung} · von hinten graviert · gespiegelt für den Laser`});
        hinweise.push('Acryl wird von hinten graviert: Für den Laser die Datei „laser-gespiegelt.svg“ verwenden (Entscheidung 6.6).');
      }
    } else {
      // Zwei Lagen, getrennte Dateien. Geräteaussparungen gehen durch beide Lagen; die Gravur steht nur auf dem Acryl.
      const schnitte = position.schnitte.map(d => `<path d="${d}"/>`).join('');
      const ecken = bef.l; // nur bei Schraubbefestigung
      dateien['edelstahl.svg'] = rahmen(
        linie(BLAU, 'kontur-edelstahl', `<path d="${groesse.d}"/>`) + linie(ROT, 'schnitte', schnitte + ecken.map(kreis).join('')),
        {titel: `${kennung} · Edelstahl 1,5 mm · ${groesse.n}`});
      // Ins Acryl kommen nur Bohrungen, die vollständig in der Acrylfläche liegen.
      const imAcryl = ecken.filter(([x, y, d]) => x - d / 2 >= acryl[0] && y - d / 2 >= acryl[1] && x + d / 2 <= acryl[0] + acryl[2] && y + d / 2 <= acryl[1] + acryl[3]);
      dateien['acryl.svg'] = rahmen(
        linie(GELB, 'kontur-acryl', `<path d="${rechteckPfad(acryl)}"/>`) + `<g id="gravur" fill="${SCHWARZ}" stroke="none">${gravur}</g>` + linie(ROT, 'schnitte', schnitte + imAcryl.map(kreis).join('')),
        {feld: acryl, titel: `${kennung} · Acrylglas 3 mm ${zustand.opt.farbe} · ${n(acryl[2])} × ${n(acryl[3])} mm`});
      hinweise.push('Funkklingel: Ob das Acryl von vorn oder von hinten graviert wird, ist nicht festgelegt. Die Datei ist lesbar (nicht gespiegelt).');
    }

    const auftrag = {
      gestaltung: kennung, produkt: eintrag.key, name: eintrag.name,
      material: materialName(familie, zustand), groesse: groesse.n, masseMm: [groesse.w, groesse.h],
      befestigung: bef.n, variante: gestaltung.sku,
      ...(klingel ? {klingel: familie.geraet.name, klingelposition: groesse.kl.posNamen[zustand.opt.position], rahmen: familie.optionen.find(o => o.k === 'rahmen').werte.find(w => w.k === zustand.opt.rahmen)?.n, acrylfarbe: zustand.opt.farbe, acrylMm: acryl} : {}),
      texte: texteVon(zustand), fotos: fotos.map(f => f.datei), dateien: Object.keys(dateien), pruefhinweise: hinweise,
    };
    return {dateien, fotos, auftrag};
  };
}

/** Schreibt die Dateien einer bezahlten Position in ihren Ordner und kopiert die Originalfotos dazu. */
export function fertigungSchreiben({ziel, ergebnis, uploadsOrdner, position}) {
  fs.mkdirSync(ziel, {recursive: true});
  for (const [name, inhalt] of Object.entries(ergebnis.dateien)) fs.writeFileSync(path.join(ziel, name), inhalt);
  for (const foto of ergebnis.fotos) if (fs.existsSync(path.join(uploadsOrdner, foto.datei))) fs.copyFileSync(path.join(uploadsOrdner, foto.datei), path.join(ziel, foto.datei));
  fs.writeFileSync(path.join(ziel, 'auftrag.json'), JSON.stringify({...position, ...ergebnis.auftrag}, null, 1));
}
