// Bühne: zeigt die Platte und macht Elemente anfassbar (auswählen, verschieben, skalieren, drehen, löschen).
// Zoom: am Handy mit zwei Fingern, am PC mit dem Mausrad (Entscheidung 3.11), dazu der Regler „Ansicht“.
import {s} from './dom.mjs';
import {elementMarkup, plattenMarkup, befestigungMarkup, motivTransform, motivInhalt} from '../core/zeichnen.mjs';
import {groesseVon, befestigungVon} from '../core/modell.mjs';

const GRIFF_PX = 13; // halbe Kantenlänge der Griffe in Bildschirmpixeln

export function buehne({familie, basis, onAuswahl, onAendern, onFertig, onDoppel}) {
  const svg = s('svg', {class: 'gk-buehne', role: 'img', 'aria-label': 'Vorschau deiner Gestaltung'});
  const gPlatte = s('g');
  const gInhalt = s('g');
  const gBefestigung = s('g', {'pointer-events': 'none'});
  const gHilfe = s('g', {'pointer-events': 'none'});
  const gAuswahl = s('g');
  svg.append(gPlatte, gInhalt, gBefestigung, gHilfe, gAuswahl);

  let zustand = null;
  let groesse = null;
  let auswahl = null;
  let zoom = 1;
  let mitte = null; // Bildmitte in mm bei Zoom > 1
  let plattenSchluessel = '';
  const knoten = new Map(); // id → {g, inhalt, quelle}

  // ---------------------------------------------------------------- Ansicht
  function sicht() {
    const pad = Math.max(groesse.w, groesse.h) * 0.07;
    const voll = {x: -pad, y: -pad, w: groesse.w + 2 * pad, h: groesse.h + 2 * pad};
    const w = voll.w / zoom;
    const h = voll.h / zoom;
    const cx = Math.min(Math.max(mitte ? mitte.x : groesse.w / 2, voll.x + w / 2), voll.x + voll.w - w / 2);
    const cy = Math.min(Math.max(mitte ? mitte.y : groesse.h / 2, voll.y + h / 2), voll.y + voll.h - h / 2);
    return {x: cx - w / 2, y: cy - h / 2, w, h};
  }
  function sichtSetzen() {
    const v = sicht();
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    auswahlZeichnen();
  }
  /** mm je Bildschirmpixel */
  function massstab() {
    const rect = svg.getBoundingClientRect();
    const v = sicht();
    return Math.max(v.w / Math.max(1, rect.width), v.h / Math.max(1, rect.height));
  }
  function punkt(event) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return {x: 0, y: 0};
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return {x: p.x, y: p.y};
  }

  // ---------------------------------------------------------------- Zeichnen
  function zeichnen(neu, neueAuswahl = auswahl) {
    zustand = neu;
    auswahl = neueAuswahl;
    groesse = groesseVon(familie, zustand.groesse);
    const bef = befestigungVon(groesse, zustand.bef);
    const schluessel = groesse.k + '|' + zustand.bef;
    if (schluessel !== plattenSchluessel) {
      plattenSchluessel = schluessel;
      gPlatte.innerHTML = plattenMarkup(groesse, familie.material, basis, 'e');
      gInhalt.setAttribute('clip-path', 'url(#gk-platte-e)');
      gBefestigung.innerHTML = befestigungMarkup(bef, familie.material, basis);
      mitte = null;
    }
    const farbe = familie.verfahren.farbe;
    const gesehen = new Set();
    let vorher = null;
    for (const el of zustand.els) {
      gesehen.add(el.id);
      let eintrag = knoten.get(el.id);
      if (!eintrag) {
        eintrag = {g: s('g', {'data-id': el.id, class: 'gk-el'}), el: null};
        knoten.set(el.id, eintrag);
      }
      if (eintrag.el !== el) {
        if (el.t === 'motiv') {
          // Motivpfade können groß sein: Inhalt nur neu aufbauen, wenn sich die Quelle ändert.
          if (eintrag.el?.quelle !== el.quelle) {
            eintrag.g.innerHTML = `<g color="${farbe}" fill="${farbe}">${motivInhalt(el)}</g>`;
            eintrag.inhalt = eintrag.g.firstChild;
          }
          eintrag.inhalt.setAttribute('transform', motivTransform(el));
        } else {
          eintrag.g.innerHTML = elementMarkup(el, farbe, 'e');
        }
        eintrag.el = el;
      }
      // Reihenfolge im DOM = Reihenfolge im Zustand
      const soll = vorher ? vorher.nextSibling : gInhalt.firstChild;
      if (soll !== eintrag.g) gInhalt.insertBefore(eintrag.g, soll);
      vorher = eintrag.g;
    }
    for (const [id, eintrag] of knoten) {
      if (!gesehen.has(id)) { eintrag.g.remove(); knoten.delete(id); }
    }
    if (auswahl && !gesehen.has(auswahl)) auswahl = null;
    trefferFlaechen();
    sichtSetzen();
  }

  /**
   * Dünne Schriften und filigrane Motive wären sonst kaum zu treffen: Jedes Element bekommt eine
   * unsichtbare Fläche in der Größe seiner Hüllbox, die auf Zeiger reagiert.
   */
  function trefferFlaechen() {
    for (const [, eintrag] of knoten) {
      const el = eintrag.el;
      if (eintrag.flaecheFuer === el && eintrag.rect?.parentNode === eintrag.g) continue;
      const r = rahmen(el);
      // Ein Rechteck je Element, das mitwandert (kein Neuaufbau beim Ziehen).
      if (eintrag.rect?.parentNode !== eintrag.g) {
        eintrag.rect = s('rect', {fill: 'transparent', 'pointer-events': 'all'});
        eintrag.g.insertBefore(eintrag.rect, eintrag.g.firstChild);
      }
      for (const [name, wert] of [['x', r.x], ['y', r.y], ['width', Math.max(r.w, 0.01)], ['height', Math.max(r.h, 0.01)]]) eintrag.rect.setAttribute(name, wert);
      if (el.rot) eintrag.rect.setAttribute('transform', `rotate(${el.rot} ${r.px} ${r.py})`); else eintrag.rect.removeAttribute('transform');
      eintrag.flaecheFuer = el;
    }
  }

  /** Freier waagerechter Bereich der Platte zwischen zwei Höhen (berücksichtigt Oval, Rund und freie Konturen). */
  function freieBreite(oben, unten) {
    const kontur = gPlatte.querySelector('path');
    const innen = (x, y) => { try { return kontur.isPointInFill(new DOMPoint(x, y)); } catch { return true; } };
    const frei = x => innen(x, Math.max(0.01, oben)) && innen(x, Math.min(groesse.h - 0.01, unten));
    const mitteX = groesse.w / 2;
    if (!frei(mitteX)) return [0, groesse.w];
    const grenze = richtung => {
      let a = mitteX, b = richtung < 0 ? 0 : groesse.w;
      for (let i = 0; i < 18; i++) { const m = (a + b) / 2; if (frei(m)) a = m; else b = m; }
      return a;
    };
    return [grenze(-1), grenze(1)];
  }

  /** Hüllbox eines Elements in seinem ungedrehten Koordinatensystem, plus Drehpunkt. */
  function rahmen(el) {
    if (el.t === 'text') {
      const node = knoten.get(el.id)?.g.querySelector('text');
      let box = {x: el.x, y: el.y - el.size, width: el.size, height: el.size};
      try { const b = node.getBBox(); if (b.width || b.height) box = b; } catch {}
      return {x: box.x, y: box.y, w: box.width, h: box.height, px: el.x, py: el.y};
    }
    return {x: el.x - el.w / 2, y: el.y - el.h / 2, w: el.w, h: el.h, px: el.x, py: el.y};
  }

  function auswahlZeichnen() {
    gAuswahl.replaceChildren();
    const el = zustand?.els.find(e => e.id === auswahl);
    if (!el) return;
    const r = rahmen(el);
    const px = massstab();
    const rand = 4 * px;
    const g = s('g', el.rot ? {transform: `rotate(${el.rot} ${r.px} ${r.py})`} : {});
    const x0 = r.x - rand, y0 = r.y - rand, w = r.w + 2 * rand, h = r.h + 2 * rand;
    // Griffe bleiben im sichtbaren Bereich, auch wenn das Element über den Rand ragt.
    const v = sicht();
    const innen = GRIFF_PX * px * 1.15;
    const halte = (x, y) => el.rot ? [x, y] : [Math.min(Math.max(x, v.x + innen), v.x + v.w - innen), Math.min(Math.max(y, v.y + innen), v.y + v.h - innen)];
    // Innerhalb des Rahmens lässt sich das gewählte Element überall anfassen und ziehen.
    g.append(s('rect', {'data-griff': 'bewegen', x: x0, y: y0, width: w, height: h, fill: 'transparent', stroke: '#1d6fd6', 'stroke-width': 1.5 * px, 'stroke-dasharray': `${5 * px} ${3 * px}`, 'pointer-events': 'all', style: 'cursor:move'}));
    const griff = (art, cx, cy, farbe, zeichen) => {
      const k = s('g', {'data-griff': art, class: 'gk-griff', transform: `translate(${cx} ${cy}) scale(${px})`});
      k.append(s('circle', {r: GRIFF_PX, fill: farbe, stroke: '#fff', 'stroke-width': 2}));
      k.append(s('path', {d: zeichen, fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}));
      g.append(k);
    };
    griff('loeschen', ...halte(x0 + w, y0), '#d32f2f', 'M-5 -3h10M-2 -3v-2h4v2M-4 -3l1 8h6l1 -8');
    griff('groesse', ...halte(x0 + w, y0 + h), '#1d6fd6', 'M-4 -4l8 8M4 0v4h-4M-4 0v-4h4');
    griff('drehen', ...halte(x0, y0), '#1d6fd6', 'M4 -1a4.5 4.5 0 1 0 0 4M4 -5v4h-4');
    gAuswahl.append(g);
  }

  function hilfslinien(el) {
    gHilfe.replaceChildren();
    if (!el) return;
    const px = massstab();
    const r = rahmen(el);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const linie = (x1, y1, x2, y2) => gHilfe.append(s('line', {x1, y1, x2, y2, stroke: '#e0338a', 'stroke-width': px, 'stroke-dasharray': `${4 * px} ${3 * px}`}));
    if (Math.abs(cx - groesse.w / 2) < 0.05) linie(groesse.w / 2, 0, groesse.w / 2, groesse.h);
    if (Math.abs(cy - groesse.h / 2) < 0.05) linie(0, groesse.h / 2, groesse.w, groesse.h / 2);
  }

  // ---------------------------------------------------------------- Zeiger
  const zeiger = new Map();
  let geste = null;
  let letzterTipp = {zeit: 0, id: null};

  const ersetzen = (id, aenderung) => ({...zustand, els: zustand.els.map(e => e.id === id ? {...e, ...aenderung} : e)});

  svg.addEventListener('pointerdown', event => {
    zeiger.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (zeiger.size === 2) { // Zwei Finger: zoomen und verschieben der Ansicht
      const [a, b] = [...zeiger.values()];
      geste = {art: 'zoom', abstand: Math.hypot(a.x - b.x, a.y - b.y), zoom, mitte: mitte || {x: groesse.w / 2, y: groesse.h / 2}, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, px: massstab()};
      hilfslinien(null);
      return;
    }
    const start = punkt(event);
    const griff = event.target.closest?.('[data-griff]')?.getAttribute('data-griff');
    const el = zustand.els.find(e => e.id === (griff ? auswahl : event.target.closest?.('[data-id]')?.getAttribute('data-id')));
    if (!el) {
      if (auswahl) { auswahl = null; auswahlZeichnen(); onAuswahl(null); }
      if (zoom > 1) geste = {art: 'schwenk', start: {x: event.clientX, y: event.clientY}, mitte: mitte || {x: groesse.w / 2, y: groesse.h / 2}, px: massstab()};
      return;
    }
    event.preventDefault();
    svg.setPointerCapture(event.pointerId);
    if (griff === 'loeschen') {
      const naechster = {...zustand, els: zustand.els.filter(e => e.id !== el.id)};
      auswahl = null;
      onAendern(naechster, null);
      onFertig();
      return;
    }
    if (auswahl !== el.id) { auswahl = el.id; auswahlZeichnen(); onAuswahl(el.id); }
    // Liegt unter dem Zeiger ein anderes Element, wird es bei einem Tipp (ohne Ziehen) ausgewählt.
    let darunter = null;
    if (griff === 'bewegen') {
      const wurzel = svg.getRootNode();
      const treffer = (wurzel.elementsFromPoint ? wurzel : document).elementsFromPoint(event.clientX, event.clientY);
      darunter = treffer.map(n => n.closest?.('[data-id]')?.getAttribute('data-id')).find(id => id && id !== el.id) || null;
    }
    const r = rahmen(el);
    const zentrum = el.t === 'text' ? {x: r.x + r.w / 2, y: r.y + r.h / 2} : {x: el.x, y: el.y};
    geste = {
      art: griff || 'bewegen', id: el.id, start, original: el, bewegt: false, zentrum, darunter,
      abstand: Math.hypot(start.x - zentrum.x, start.y - zentrum.y) || 1,
      winkel: Math.atan2(start.y - r.py, start.x - r.px),
    };
  });

  svg.addEventListener('pointermove', event => {
    if (!zeiger.has(event.pointerId)) return;
    zeiger.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (!geste) return;
    if (geste.art === 'zoom' && zeiger.size >= 2) {
      const [a, b] = [...zeiger.values()];
      zoom = Math.min(5, Math.max(1, geste.zoom * Math.hypot(a.x - b.x, a.y - b.y) / geste.abstand));
      mitte = {x: geste.mitte.x - ((a.x + b.x) / 2 - geste.cx) * geste.px, y: geste.mitte.y - ((a.y + b.y) / 2 - geste.cy) * geste.px};
      sichtSetzen();
      ansichtMelden();
      return;
    }
    if (geste.art === 'schwenk') {
      mitte = {x: geste.mitte.x - (event.clientX - geste.start.x) * geste.px, y: geste.mitte.y - (event.clientY - geste.start.y) * geste.px};
      sichtSetzen();
      return;
    }
    const p = punkt(event);
    const o = geste.original;
    const dx = p.x - geste.start.x, dy = p.y - geste.start.y;
    if (!geste.bewegt && Math.hypot(dx, dy) < 3 * massstab()) return; // kleine Zitterbewegung ist ein Tipp
    geste.bewegt = true;
    let aenderung;
    if (geste.art === 'bewegen') {
      let x = o.x + dx, y = o.y + dy;
      // Einrasten an der Plattenmitte
      const fang = 1.2 * massstab() * 4;
      const r = rahmen(o);
      const cx = r.x + r.w / 2 + dx, cy = r.y + r.h / 2 + dy;
      if (Math.abs(cx - groesse.w / 2) < fang) x += groesse.w / 2 - cx;
      if (Math.abs(cy - groesse.h / 2) < fang) y += groesse.h / 2 - cy;
      aenderung = {x: rund(x), y: rund(y)};
    } else if (geste.art === 'groesse') {
      const faktor = Math.max(0.05, Math.hypot(p.x - geste.zentrum.x, p.y - geste.zentrum.y) / geste.abstand);
      if (o.t === 'text') {
        const size = Math.min(300, Math.max(1, o.size * faktor));
        const k = size / o.size;
        // um die Mitte des Textes skalieren, damit er unter dem Finger bleibt
        aenderung = {size: rund(size), ls: rund(o.ls * k), lh: rund(o.lh * k), x: rund(geste.zentrum.x + (o.x - geste.zentrum.x) * k), y: rund(geste.zentrum.y + (o.y - geste.zentrum.y) * k)};
      } else {
        // Motive bleiben auf der Platte: nie größer als die Plattenfläche
        const grenze = Math.min(groesse.w / o.w, groesse.h / o.h, 50);
        const k = Math.min(faktor, grenze);
        aenderung = {w: rund(o.w * k), h: rund(o.h * k)};
        if (o.t === 'motiv') aenderung.s = Number((o.s * k).toFixed(5));
        if (o.mk) aenderung.mk = Number((o.mk * k).toFixed(5));
      }
    } else if (geste.art === 'drehen') {
      const r = rahmen(o);
      let rot = o.rot + (Math.atan2(p.y - r.py, p.x - r.px) - geste.winkel) * 180 / Math.PI;
      rot = ((rot + 540) % 360) - 180;
      for (const raste of [-180, -90, 0, 90, 180]) if (Math.abs(rot - raste) < 3) rot = raste === -180 ? 180 : raste;
      aenderung = {rot: Number(rot.toFixed(1))};
    }
    if (aenderung) {
      onAendern(ersetzen(o.id, aenderung), o.id);
      if (geste.art === 'bewegen') hilfslinien(zustand.els.find(e => e.id === o.id));
    }
  });

  function ende(event) {
    zeiger.delete(event.pointerId);
    if (!geste) return;
    if (geste.art === 'zoom' || geste.art === 'schwenk') { if (zeiger.size < 2) geste = null; return; }
    hilfslinien(null);
    if (geste.bewegt) onFertig();
    else if (geste.art === 'bewegen') {
      const jetzt = Date.now();
      if (geste.darunter && !(letzterTipp.id === geste.id && jetzt - letzterTipp.zeit < 400)) {
        auswahl = geste.darunter; auswahlZeichnen(); onAuswahl(auswahl);
        letzterTipp = {zeit: jetzt, id: auswahl};
        geste = null;
        return;
      }
      if (letzterTipp.id === geste.id && jetzt - letzterTipp.zeit < 400) onDoppel?.(geste.id);
      letzterTipp = {zeit: jetzt, id: geste.id};
    }
    geste = null;
  }
  svg.addEventListener('pointerup', ende);
  svg.addEventListener('pointercancel', ende);

  svg.addEventListener('wheel', event => {
    event.preventDefault();
    const vor = punkt(event);
    zoom = Math.min(5, Math.max(1, zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
    const v = sicht();
    const basisMitte = mitte || {x: groesse.w / 2, y: groesse.h / 2};
    mitte = zoom === 1 ? null : basisMitte;
    sichtSetzen();
    if (mitte) { // Punkt unter dem Mauszeiger festhalten
      const nach = punkt(event);
      mitte = {x: mitte.x + vor.x - nach.x, y: mitte.y + vor.y - nach.y};
      sichtSetzen();
    }
    void v;
    ansichtMelden();
  }, {passive: false});

  let ansichtHoerer = null;
  const ansichtMelden = () => ansichtHoerer?.(zoom);
  const rund = value => Number(value.toFixed(3));
  new ResizeObserver(() => { if (zustand) auswahlZeichnen(); }).observe(svg);

  return {
    knoten: svg,
    zeichnen,
    auswaehlen(id) { auswahl = id; auswahlZeichnen(); },
    setZoom(wert) { zoom = Math.min(5, Math.max(1, wert)); if (zoom === 1) mitte = null; sichtSetzen(); },
    onAnsicht(fn) { ansichtHoerer = fn; },
    rahmenVon: id => { const el = zustand.els.find(e => e.id === id); return el ? rahmen(el) : null; },
    freieBreite,
  };
}
