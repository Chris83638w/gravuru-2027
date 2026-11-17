// Gestaltungsmodell: reine Funktionen, laufen identisch im Browser und auf dem Server.
// Alle Maße in mm (Ursprung links oben der Platte), alle Preise in ganzen Cent.
//
// Eine Gestaltung ("Zustand") ist ein kleines JSON-Dokument:
//   {v, produkt, familie, groesse, bef, design, els: [...], menge}
// Es ist das Einzige, was beim Warenkorb gespeichert wird. Vorschau, Preis und Fertigung
// werden daraus abgeleitet – es gibt keine zweite Wahrheit.

export const VERSION = 1;
/** Kleinste und größte Schriftgröße in mm – wie im bestehenden Konfi (text-paths.mjs: „Schriftgröße: 1 bis 100 mm“). */
export const SCHRIFT_MM = [1, 100];
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

export const groesseVon = (familie, key) => familie.groessen.find(g => g.k === key) || null;
export const befestigungVon = (groesse, id) => groesse?.bef.find(b => b.id === id) || null;

/** Maßstab und Versatz, um ein Design von seiner Masterplatte auf eine Größe zu übertragen. */
export function uebertragung(platte, groesse, einpassen = false) {
  const kx = groesse.w / platte[0];
  const ky = groesse.h / platte[1];
  // Gleiche Proportion (±1 %, Katalogregel): reine Skalierung. Sonst mittig einpassen.
  if (!einpassen && Math.abs(kx / ky - 1) <= 0.01) return {k: kx, dx: 0, dy: (groesse.h - platte[1] * kx) / 2};
  const k = Math.min(kx, ky);
  return {k, dx: (groesse.w - platte[0] * k) / 2, dy: (groesse.h - platte[1] * k) / 2};
}

/** Elemente eines veröffentlichten Designs in Zustands-Elemente der gewählten Größe umrechnen. */
export function elementeAusDesign(design, groesse, einpassen = false) {
  const {k, dx, dy} = uebertragung(design.platte, groesse, einpassen);
  return design.els.map(el => {
    if (el.t === 'text') {
      return {
        t: 'text', id: el.id, feld: el.feld, text: el.text, vorgabe: el.text, font: el.font,
        size: round(el.size * k), x: round(el.x * k + dx), y: round(el.y * k + dy), anker: el.anker,
        ls: round((el.ls || 0) * k), lh: el.lh ? round(el.lh * k) : 0, rot: el.rot || 0, original: true,
      };
    }
    if (el.t === 'motiv' && el.svg) {
      // Zierelement mit eigenem SVG-Inhalt (Funkklingeln): `qbox` ist die Hüllbox des Inhalts, `box` die Lage im Design.
      const [bx, by, bw, bh] = el.box;
      return {
        t: 'motiv', id: el.id, x: round((bx + bw / 2) * k + dx), y: round((by + bh / 2) * k + dy),
        w: round(bw * k), h: round(bh * k), rot: el.rot || 0, original: true,
        quelle: {art: 'design', design: design.id, ebene: el.id, box: el.qbox, tr: [0, 0], svg: el.svg}, s: round(bw / el.qbox[2] * k, 5),
      };
    }
    if (el.t === 'motiv') {
      const [bx, by, bw, bh] = el.box;
      return {
        t: 'motiv', id: el.id, x: round((bx + bw / 2) * k + dx), y: round((by + bh / 2) * k + dy),
        w: round(bw * k), h: round(bh * k), rot: el.rot || 0, original: true,
        // Quelle bleibt unverändert; "s" ist der Maßstab der Quellpfade.
        quelle: {art: 'design', design: design.id, ebene: el.id, box: el.box, tr: el.tr || [0, 0], p: el.p}, s: round(k, 5),
      };
    }
    const [bx, by, bw, bh] = el.box;
    return {
      t: 'foto', id: el.id, x: round((bx + bw / 2) * k + dx), y: round((by + bh / 2) * k + dy),
      w: round(bw * k), h: round(bh * k), rot: el.rot || 0, form: el.form, original: true, bild: null,
      ...(el.maske ? {maske: el.maske, mt: el.mt || [0, 0], mk: round(k, 5), mbox: el.box} : {}),
    };
  });
}

/** Neue Gestaltung für ein Produkt: Startgröße, Startbefestigung (immer ohne Befestigung, wenn möglich), Startdesign. */
export function startZustand(eintrag, kundenwahl = {}) {
  const familie = eintrag.familie;
  // Vorgaben des Produkts (z. B. Startformat einer Funkklingel), überschrieben durch die Wahl auf der Produktseite.
  const wahl = {...(eintrag.wahl || {}), ...Object.fromEntries(Object.entries(kundenwahl).filter(([, wert]) => wert != null))};
  const erlaubt = eintrag.groessen ? familie.groessen.filter(g => eintrag.groessen.includes(g.k)) : familie.groessen;
  const groesse = erlaubt.find(g => g.k === wahl.groesse) || erlaubt[0];
  const bef = groesse.bef.find(b => b.id === wahl.bef) || groesse.bef[0];
  return {
    v: VERSION, produkt: eintrag.key, familie: familie.id, groesse: groesse.k, bef: bef.id,
    design: eintrag.start?.id || null,
    els: eintrag.start ? elementeAusDesign(eintrag.start, groesse) : [],
    menge: 1,
    ...(familie.optionen ? {opt: optionenVon(familie, wahl.opt)} : {}),
  };
}

/** Gültige Auswahl für jede Zusatzoption der Familie (Position, Rahmen, Farbe …); Unbekanntes fällt auf den ersten Wert. */
export function optionenVon(familie, wunsch = {}) {
  return Object.fromEntries((familie.optionen || []).map(o => [o.k, o.werte.some(w => w.k === wunsch?.[o.k]) ? wunsch[o.k] : o.werte[0].k]));
}

/** Schlüssel der Designauswahl: je Größe, bei Funkklingeln zusätzlich je Klingelposition. */
export function galerieSchluessel(familie, groesseKey, opt) {
  return familie.art === 'klingel' ? `${groesseKey}|${opt?.position || 'standard'}` : groesseKey;
}

/** Schlüssel der Shop-Variante innerhalb eines Produkts. Die Klingelposition ist keine Variante. */
export function variantenSchluessel(familie, zustand) {
  if (familie.art === 'klingel') return `${zustand.groesse}-${zustand.opt.farbe}-${zustand.opt.rahmen}-${zustand.bef}`;
  // Platten mit Farbauswahl: Jede Farbe hat im Katalog eigene Größenschlüssel (…-SW, …-AN).
  const groesse = familie.farbGroessen?.[zustand.opt?.farbe]?.[zustand.groesse] || zustand.groesse;
  return `${groesse}-${zustand.bef}`;
}

/** Alle Shop-Varianten eines Produkts mit Schlüssel und Preis in Cent (Grundpreis + Befestigung). */
export function alleVarianten(familie, erlaubt = null) {
  const groessen = erlaubt ? familie.groessen.filter(g => erlaubt.includes(g.k)) : familie.groessen;
  const achsen = (familie.optionen || []).filter(o => o.k !== 'position');
  const auswahlen = achsen.reduce((liste, o) => liste.flatMap(opt => o.werte.map(w => ({...opt, [o.k]: w.k}))), [{}]);
  const liste = [];
  for (const g of groessen) for (const opt of auswahlen) for (const b of g.bef) {
    liste.push({sku: variantenSchluessel(familie, {groesse: g.k, bef: b.id, opt}), cents: g.p + b.p, groesse: g, bef: b, opt});
  }
  return liste;
}

/** Name des Materials in der gewählten Farbe, z. B. „Acrylglas anthrazit“. */
export function materialName(familie, zustand) {
  if (familie.art === 'klingel') return familie.name;
  return familie.optionen?.find(o => o.k === 'farbe')?.werte.find(w => w.k === zustand.opt?.farbe)?.n || familie.material.name;
}

/**
 * Anderes Design laden. Eigene Texte des Kunden wandern über den Feldschlüssel mit
 * (Entscheidung 3.17: Texte und Fotos übernehmen; Anordnung, Schriften, Motive aus der neuen Vorlage;
 * Logos und Zusatzmotive wandern nicht mit).
 */
export function designWechseln(zustand, design, groesse, einpassen = false) {
  const texte = new Map();
  const fotos = [];
  for (const el of zustand.els) {
    if (el.t === 'text' && el.original && el.text !== el.vorgabe) texte.set(el.feld, el.text);
    if (el.t === 'foto' && el.bild) fotos.push(el.bild);
  }
  const els = elementeAusDesign(design, groesse, einpassen);
  for (const el of els) {
    if (el.t === 'text' && texte.has(el.feld)) el.text = texte.get(el.feld);
    if (el.t === 'foto' && fotos.length) el.bild = fotos.shift();
  }
  return {...zustand, design: design.id, groesse: groesse.k, els};
}

/** Größe wechseln, ohne das Design zu wechseln: Alles wird mit der Platte umgerechnet, Kundenänderungen bleiben. */
export function groesseSkalieren(zustand, von, nach) {
  const {k, dx, dy} = uebertragung([von.w, von.h], nach);
  const els = zustand.els.map(el => {
    const kopie = {...el, x: round(el.x * k + dx), y: round(el.y * k + dy)};
    if (el.t === 'text') Object.assign(kopie, {size: round(el.size * k), ls: round(el.ls * k), lh: round(el.lh * k)});
    else Object.assign(kopie, {w: round(el.w * k), h: round(el.h * k)});
    if (el.t === 'motiv') kopie.s = round(el.s * k, 5);
    if (el.t === 'foto' && el.mk) kopie.mk = round(el.mk * k, 5);
    return kopie;
  });
  const bef = nach.bef.find(b => b.id === zustand.bef) || nach.bef[0];
  return {...zustand, groesse: nach.k, bef: bef.id, els};
}

let zaehler = 0;
export const neueId = prefix => `${prefix}-${Date.now().toString(36)}${(zaehler++).toString(36)}`;

export function neuerText(groesse, font, text = 'Dein Text') {
  const size = round(Math.max(3, Math.min(groesse.h * 0.12, groesse.w * 0.08)));
  return {t: 'text', id: neueId('text'), feld: neueId('feld'), text, vorgabe: '', font, size, x: round(groesse.w / 2), y: round(groesse.h / 2 + size * 0.35), anker: 'm', ls: 0, lh: 0, rot: 0, original: false};
}

/** Motiv aus der Bibliothek: viewBox und Inhalt der SVG-Datei, mittig mit rund einem Drittel der Plattenhöhe. */
export function neuesMotiv(groesse, motiv, viewBox, inhalt) {
  const ziel = Math.min(groesse.h * 0.45, groesse.w * 0.3);
  const s = ziel / Math.max(viewBox[2], viewBox[3]);
  return {
    t: 'motiv', id: neueId('motiv'), x: round(groesse.w / 2), y: round(groesse.h / 2), w: round(viewBox[2] * s), h: round(viewBox[3] * s), rot: 0, original: false,
    quelle: {art: 'bibliothek', key: motiv.k, name: motiv.n, box: viewBox, tr: [0, 0], svg: inhalt}, s: round(s, 5),
  };
}

export function neuesFoto(groesse, bild) {
  const seite = bild.w / bild.h;
  let w = groesse.w * 0.5;
  let h = w / seite;
  if (h > groesse.h * 0.7) { h = groesse.h * 0.7; w = h * seite; }
  return {t: 'foto', id: neueId('foto'), x: round(groesse.w / 2), y: round(groesse.h / 2), w: round(w), h: round(h), rot: 0, form: 'rect', original: false, bild};
}

// ---------------------------------------------------------------- Preis

/**
 * Preis einer Gestaltung. Quelle der Werte:
 *   Grundpreis und Befestigung: Katalogfamilie (sizes[].baseCents, mountingRules[].priceCents)
 *   Zusatzmotive, Fotos, Logos, Mengenstaffel: "regeln" aus dem Produkteintrag (jeweils mit Quelle veröffentlicht)
 * Der Server rechnet beim Speichern mit derselben Funktion nach; nur sein Ergebnis zählt.
 */
export function preis(zustand, familie, regeln = {}) {
  const groesse = groesseVon(familie, zustand.groesse);
  const bef = befestigungVon(groesse, zustand.bef);
  if (!groesse || !bef) throw new Error('Größe oder Befestigung gehört nicht zur Familie.');
  const zusatz = [];
  const motive = zustand.els.filter(el => el.t === 'motiv' && !el.original).length;
  if (motive && regeln.motiv != null) zusatz.push({art: 'motiv', n: motive, je: regeln.motiv, cents: motive * regeln.motiv});
  const fotos = zustand.els.filter(el => el.t === 'foto' && el.bild && !el.bild.logo);
  const fotoRegel = familie.foto || regeln.foto || null;
  if (fotos.length && fotoRegel) {
    // Design mit Fotofeld: erstes Foto frei. Ohne Fotofeld: jedes Foto kostet (Entscheidung 1.18).
    const frei = fotos.some(el => el.original) ? fotoRegel.inklusive || 0 : 0;
    const bezahlt = Math.max(0, fotos.length - frei);
    if (bezahlt) zusatz.push({art: 'foto', n: bezahlt, je: fotoRegel.preis, cents: bezahlt * fotoRegel.preis});
  }
  const logos = zustand.els.filter(el => el.t === 'foto' && el.bild?.logo).length;
  if (logos && regeln.logo != null) zusatz.push({art: 'logo', n: logos, je: regeln.logo, cents: logos * regeln.logo});
  const aufpreis = zusatz.reduce((sum, z) => sum + z.cents, 0);
  const liste = groesse.p + bef.p + aufpreis;
  const menge = Math.max(1, Math.min(99, Math.round(zustand.menge || 1)));
  const stufe = [...(familie.staffel || regeln.staffel || [])].sort((a, b) => b.ab - a.ab).find(s => menge >= s.ab);
  const stueck = stufe ? Math.round(liste * (100 - stufe.prozent) / 100) : liste;
  return {grund: groesse.p, befestigung: bef.p, zusatz, aufpreis, liste, stueck, menge, summe: stueck * menge, rabatt: stufe?.prozent || 0};
}

// ---------------------------------------------------------------- Prüfung

/** Fehler, die den Warenkorb sperren. Erst beim Abschluss anzeigen (Entscheidung 3.1). */
export function pruefen(zustand, familie, fähigkeiten = {}) {
  const fehler = [];
  const groesse = groesseVon(familie, zustand.groesse);
  if (!groesse) return [{code: 'groesse', text: 'Diese Größe ist nicht verfügbar.'}];
  if (!befestigungVon(groesse, zustand.bef)) fehler.push({code: 'befestigung', text: 'Diese Befestigung ist für die Größe nicht verfügbar.'});
  if (zustand.els.length > 40) fehler.push({code: 'anzahl', text: 'Zu viele Elemente.'});
  for (const o of familie.optionen || []) {
    if (!o.werte.some(w => w.k === zustand.opt?.[o.k])) fehler.push({code: 'option', text: `Bitte „${o.n}“ wählen.`});
  }
  const gesperrt = familie.art === 'klingel' ? (groesse.kl.pos[zustand.opt?.position] || groesse.kl.pos.standard).bell : null;
  for (const el of zustand.els) {
    if (el.t === 'text') {
      if (el.text.length > 500) fehler.push({code: 'text-lang', id: el.id, text: 'Ein Text ist zu lang.'});
      if (el.size < SCHRIFT_MM[0] || el.size > SCHRIFT_MM[1]) fehler.push({code: 'text-groesse', id: el.id, text: 'Schriftgröße außerhalb des möglichen Bereichs.'});
    }
    if (el.t === 'foto' && el.bild && fähigkeiten.foto === false && !el.bild.logo) fehler.push({code: 'foto', id: el.id, text: 'Fotos sind bei diesem Produkt nicht möglich.'});
    if (el.t === 'foto' && el.bild?.logo && fähigkeiten.logo === false) fehler.push({code: 'logo', id: el.id, text: 'Logos sind bei diesem Produkt nicht möglich.'});
    if (el.t === 'foto' && el.original && !el.bild) fehler.push({code: 'foto-fehlt', id: el.id, text: 'Bitte lade noch dein Foto hoch.'});
    // Motive und Fotos haben bekannte Maße; bei Texten prüft der Editor mit der gemessenen Breite (siehe ueberlappt).
    if (gesperrt && el.t !== 'text' && !el.rot && ueberlappt([el.x - el.w / 2, el.y - el.h / 2, el.w, el.h], gesperrt)) fehler.push({code: 'geraet', id: el.id, text: 'Ein Element liegt auf der Klingel. Bitte verschiebe es.'});
  }
  if (!zustand.els.some(el => (el.t === 'text' && el.text.trim()) || el.t === 'motiv' || (el.t === 'foto' && el.bild))) fehler.push({code: 'leer', text: 'Die Gestaltung ist noch leer.'});
  return fehler;
}

/** Überlappen sich zwei Rechtecke [x, y, w, h]? Berührung an der Kante zählt nicht. */
export function ueberlappt(a, b) {
  return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
}

/** Sichtbare Angaben für Warenkorb und Bestellung: Gravurtexte in Lesereihenfolge. */
export function texteVon(zustand) {
  return zustand.els.filter(el => el.t === 'text' && el.text.trim()).sort((a, b) => a.y - b.y || a.x - b.x).map(el => el.text.trim());
}
