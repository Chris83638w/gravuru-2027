// Kunden-Konfigurator: ein Fenster über der Produktseite, direkt im Shop (kein iframe, keine zweite Domain).
import css from './stil.css';
import {h, s, icon, euro} from './dom.mjs';
import {buehne as buehneErzeugen} from './buehne.mjs';
import {schriftLader} from './schriften.mjs';
import {schriftFamilie} from '../core/zeichnen.mjs';
import * as modell from '../core/modell.mjs';
import {motivAusSvg} from './motiv.mjs';
import {fotoVorbereiten} from './foto.mjs';
import {abschliessen} from './abschluss.mjs';

const REITER = [
  {id: 'ausfuehrung', name: 'Ausführung', titel: 'Ausführung & Größe'},
  {id: 'designs', name: 'Designs', titel: 'Designs'},
  {id: 'text', name: 'Text', titel: 'Text'},
  {id: 'motive', name: 'Motive', titel: 'Motive'},
  {id: 'foto', name: 'Foto', titel: 'Foto'},
];

/**
 * @param {object} o
 * @param {string} o.basis     Adresse der veröffentlichten Daten, endet mit "/"
 * @param {string} o.produkt   Schlüssel des Produkts (Datei p/<produkt>.json)
 * @param {string} o.api       Adresse der Speicher-Schnittstelle
 * @param {object} [o.wahl]    {groesse, bef} von der Produktseite
 * @param {object} [o.bearbeiten] {id, token, zeile} – vorhandene Warenkorbposition bearbeiten
 * @param {object} o.shop      {hinzufuegen(position), ersetzen(zeile, position), zumWarenkorb()}
 */
export async function oeffnen(o) {
  const start = performance.now();
  const host = h('div', {id: 'gravuru-konfi'});
  const wurzel = host.attachShadow({mode: 'open'});
  wurzel.append(h('style', null, css));
  const app = h('div', {class: 'gk', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Konfigurator'});
  wurzel.append(app);
  document.body.append(host);
  const scrollVorher = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  // ---------------------------------------------------------------- Gerüst sofort zeigen
  const flaeche = h('div', {class: 'gk-flaeche'});
  const lade = h('div', {class: 'gk-lade'}, h('div', {class: 'gk-dreher'}));
  const mitte = h('main', {class: 'gk-mitte'}, flaeche, lade);
  const info = h('div', {class: 'gk-info'});
  const reiterLeiste = h('nav', {class: 'gk-reiter', role: 'tablist'});
  const inhalt = h('div', {class: 'gk-inhalt'});
  const werkzeugTitel = h('h2', null, 'Werkzeuge');
  const knopfUndo = h('button', {class: 'gk-knopf gk-rund', title: 'Rückgängig', 'aria-label': 'Rückgängig', disabled: true, onclick: () => schritt(-1)}, icon('undo'));
  const knopfRedo = h('button', {class: 'gk-knopf gk-rund', title: 'Wiederholen', 'aria-label': 'Wiederholen', disabled: true, onclick: () => schritt(1)}, icon('redo'));
  const werkzeug = h('aside', {class: 'gk-werkzeug'},
    h('div', {class: 'gk-werkzeug-kopf'}, werkzeugTitel,
      h('button', {class: 'gk-knopf gk-gruen', onclick: () => zumWarenkorb()}, 'In den Warenkorb'),
      h('button', {class: 'gk-knopf gk-rund gk-schliessen', 'aria-label': 'Schließen', onclick: () => reiterWaehlen(null)}, icon('zu'))),
    inhalt);
  const ansichtRegler = h('input', {type: 'range', min: 100, max: 400, step: 5, value: 100, 'aria-label': 'Ansicht', oninput: e => { buehne?.setZoom(e.target.value / 100); ansichtWert.textContent = e.target.value + ' %'; }});
  const ansichtWert = h('span', null, '100 %');
  const preisAnzeige = h('b', null, '');
  const mengeAnzeige = h('output', null, '1');
  const fuss = h('footer', {class: 'gk-fuss'},
    h('button', {class: 'gk-knopf', onclick: () => zuruecksetzen()}, 'Zurücksetzen'),
    h('div', {class: 'gk-ansicht'}, h('span', null, 'Ansicht'), ansichtRegler, ansichtWert),
    h('div', {class: 'gk-platz'}),
    h('div', {class: 'gk-menge'}, h('button', {'aria-label': 'Menge verringern', onclick: () => menge(-1)}, '−'), mengeAnzeige, h('button', {'aria-label': 'Menge erhöhen', onclick: () => menge(1)}, '+')),
    h('div', {class: 'gk-preis'}, preisAnzeige, h('button', {onclick: () => preisDetails()}, 'Preisdetails')),
    h('button', {class: 'gk-knopf gk-gruen', onclick: () => zumWarenkorb()}, icon('korb'), 'Warenkorb'));
  app.append(
    h('header', {class: 'gk-kopf'},
      h('button', {class: 'gk-knopf gk-zurueck', onclick: () => schliessen()}, icon('zurueck', 18), 'Zurück zum Produkt'),
      h('span', {class: 'gk-marke'}, 'gravuru'),
      knopfUndo, knopfRedo,
      h('button', {class: 'gk-knopf gk-rund', title: 'Ebenen', 'aria-label': 'Ebenen', onclick: () => reiterWaehlen('ebenen')}, icon('ebenen'))),
    reiterLeiste, mitte, info, werkzeug, fuss);

  // ---------------------------------------------------------------- Zustand
  let eintrag, familie, schriften, buehne;
  let zustand = null;
  let auswahl = null;
  let reiter = null;
  let verlauf = [];
  let stelle = -1;
  let geschlossen = false;
  const galerieCache = new Map();
  const designCache = new Map();
  const uploads = new Map(); // Element-ID → Promise<{id,url}> des Originalfotos
  const entwurfKey = () => 'gk:entwurf:' + o.produkt;

  function schliessen() {
    geschlossen = true;
    host.remove();
    document.documentElement.style.overflow = scrollVorher;
    o.onSchliessen?.();
  }

  const groesse = () => modell.groesseVon(familie, zustand.groesse);
  const erlaubteGroessen = () => eintrag.groessen ? familie.groessen.filter(g => eintrag.groessen.includes(g.k)) : familie.groessen;
  const fotoErlaubt = () => Boolean(familie.foto) || zustand.els.some(el => el.t === 'foto');
  const regeln = () => eintrag.regeln || {};

  /** Zustand setzen. `festhalten` legt einen Schritt für Rückgängig an. */
  function setze(neu, {festhalten = true, neueAuswahl = auswahl, struktur = false} = {}) {
    const strukturAlt = strukturSchluessel();
    zustand = neu;
    auswahl = neueAuswahl && neu.els.some(el => el.id === neueAuswahl) ? neueAuswahl : null;
    buehne.zeichnen(zustand, auswahl);
    if (festhalten) merken();
    kopfzeilen();
    if (struktur || strukturSchluessel() !== strukturAlt) werkzeugZeichnen();
    else werkzeugAbgleichen();
  }
  function merken() {
    verlauf = verlauf.slice(0, stelle + 1);
    verlauf.push(zustand);
    if (verlauf.length > 60) verlauf.shift();
    stelle = verlauf.length - 1;
    knopfUndo.disabled = stelle <= 0;
    knopfRedo.disabled = true;
    entwurfSichern();
  }
  function schritt(richtung) {
    const ziel = stelle + richtung;
    if (ziel < 0 || ziel >= verlauf.length) return;
    stelle = ziel;
    setze(verlauf[stelle], {festhalten: false, struktur: true});
    knopfUndo.disabled = stelle <= 0;
    knopfRedo.disabled = stelle >= verlauf.length - 1;
    entwurfSichern();
    nachladen();
  }
  let sicherTimer = 0;
  function entwurfSichern() {
    clearTimeout(sicherTimer);
    sicherTimer = setTimeout(() => {
      try { localStorage.setItem(entwurfKey(), JSON.stringify({zeit: Date.now(), zustand})); }
      catch { try { localStorage.removeItem(entwurfKey()); } catch {} }
    }, 400);
  }
  const strukturSchluessel = () => zustand ? [reiter, reiter === 'text' ? '' : auswahl, zustand.groesse, zustand.bef, zustand.design, zustand.els.map(el => el.id + el.t + (el.bild ? 1 : 0) + (el.font || '')).join(',')].join('|') : '';

  function kopfzeilen() {
    const g = groesse();
    const p = modell.preis(zustand, familie, regeln());
    preisAnzeige.textContent = euro(p.summe);
    mengeAnzeige.textContent = String(p.menge);
    info.replaceChildren(h('span', null, `${familie.material.name} · ${g.n}`), h('b', {class: 'gk-nur-mobil-preis'}, euro(p.summe)));
  }
  function menge(delta) {
    setze({...zustand, menge: Math.max(1, Math.min(99, (zustand.menge || 1) + delta))});
  }

  // ---------------------------------------------------------------- Reiter
  function reiterZeichnen() {
    const sichtbar = REITER.filter(r => r.id !== 'foto' || fotoErlaubt());
    reiterLeiste.replaceChildren(
      ...sichtbar.map(r => h('button', {role: 'tab', 'aria-selected': String(reiter === r.id), onclick: () => reiterWaehlen(reiter === r.id && istMobil() ? null : r.id)}, icon(r.id), r.name)),
      h('button', {class: 'gk-nur-mobil', onclick: () => zumWarenkorb()}, icon('korb'), 'Warenkorb'));
  }
  const istMobil = () => matchMedia('(max-width: 820px)').matches;
  function reiterWaehlen(id) {
    reiter = id;
    werkzeug.classList.toggle('gk-offen', Boolean(id));
    reiterZeichnen();
    werkzeugZeichnen();
    blattHoehe();
  }
  function blattHoehe() {
    app.style.setProperty('--blatt', istMobil() && reiter ? werkzeug.offsetHeight + 'px' : '0px');
  }
  new ResizeObserver(blattHoehe).observe(werkzeug);

  function werkzeugZeichnen() {
    if (!zustand) return;
    const aktiv = wurzel.activeElement;
    const fokusId = aktiv?.getAttribute?.('data-feld-id');
    const position = aktiv?.selectionStart;
    const scroll = inhalt.scrollTop;
    const bau = {ausfuehrung: reiterAusfuehrung, designs: reiterDesigns, text: reiterText, motive: reiterMotive, foto: reiterFoto, ebenen: reiterEbenen, schrift: reiterSchrift}[reiter];
    werkzeugTitel.textContent = REITER.find(r => r.id === reiter)?.titel || (reiter === 'ebenen' ? 'Ebenen' : reiter === 'schrift' ? 'Schrift wählen' : 'Werkzeuge');
    inhalt.replaceChildren(...(bau ? [bau()].flat() : [h('p', {class: 'gk-hinweis'}, 'Wähle oben einen Bereich oder tippe ein Element in der Vorschau an.')]));
    inhalt.scrollTop = scroll;
    if (fokusId) { // Tastatur bleibt offen, Schreibmarke bleibt an ihrer Stelle
      const feld = inhalt.querySelector(`[data-feld-id="${CSS.escape(fokusId)}"]`);
      if (feld) { feld.focus({preventScroll: true}); try { feld.setSelectionRange(position, position); } catch {} }
    }
  }
  /** Nur Werte nachführen (z. B. Schriftgröße beim Ziehen auf der Bühne), ohne Felder neu aufzubauen. */
  function werkzeugAbgleichen() {
    for (const kasten of inhalt.querySelectorAll('.gk-feld[data-el]')) kasten.classList.toggle('gk-aktiv', kasten.dataset.el === auswahl);
    for (const el of zustand.els) {
      if (el.t !== 'text') continue;
      const regler = inhalt.querySelector(`[data-groesse-id="${CSS.escape(el.id)}"]`);
      if (regler && wurzel.activeElement !== regler) { regler.value = el.size; regler.nextSibling.textContent = anzeigeGroesse(el.size); }
    }
  }
  const anzeigeGroesse = mm => String(Math.round(mm * 10) / 10).replace('.', ',');

  // ---------- Ausführung
  function miniPlatte(g, bef) {
    const pad = Math.max(g.w, g.h) * 0.06;
    const svg = s('svg', {viewBox: `${-pad} ${-pad} ${g.w + 2 * pad} ${g.h + 2 * pad}`});
    svg.append(s('path', {d: g.d, fill: familie.material.farbe === '#17191b' ? '#2b2f33' : '#c9d0d2', stroke: '#6b7b7f', 'stroke-width': pad * 0.25}));
    for (const [x, y, d] of bef?.l || []) svg.append(s('circle', {cx: x, cy: y, r: Math.max(d / 2, Math.max(g.w, g.h) * 0.035), fill: bef.schraube ? '#4b575a' : '#fff', stroke: '#4b575a', 'stroke-width': pad * 0.2}));
    return svg;
  }
  function reiterAusfuehrung() {
    const g = groesse();
    const erlaubt = erlaubteGroessen();
    const formen = familie.formen.filter(f => erlaubt.some(x => x.g === f.k));
    const teile = [];
    if (formen.length > 1) {
      teile.push(h('h3', null, 'Form'), h('div', {class: 'gk-kacheln'}, formen.map(f => {
        const beispiel = erlaubt.find(x => x.g === f.k);
        return h('button', {class: 'gk-kachel', 'aria-pressed': String(g.g === f.k), onclick: () => groesseWaehlen(naechsteGroesse(f.k, g))}, miniPlatte(beispiel), f.n);
      })));
    }
    const inForm = erlaubt.filter(x => x.g === g.g);
    if (inForm.length > 1) {
      teile.push(h('h3', null, 'Größe'), h('div', {class: 'gk-kacheln'}, inForm.map(x =>
        h('button', {class: 'gk-kachel', 'aria-pressed': String(x.k === g.k), onclick: () => groesseWaehlen(x)}, x.n, h('small', null, euro(x.p))))));
    }
    if (g.bef.length > 1) {
      teile.push(h('h3', null, 'Befestigung'), h('div', {class: 'gk-kacheln gk-zwei'}, g.bef.map(b =>
        h('button', {class: 'gk-kachel', 'aria-pressed': String(b.id === zustand.bef), onclick: () => setze({...zustand, bef: b.id}, {struktur: true})}, miniPlatte(g, b), b.n, h('small', null, b.p ? '+ ' + euro(b.p) : 'inklusive')))));
    }
    if (!teile.length) teile.push(h('p', {class: 'gk-hinweis'}, `${familie.material.name} · ${g.n}`));
    return teile;
  }
  /** Beim Formwechsel die Größe wählen, die der aktuellen Fläche am nächsten kommt. */
  function naechsteGroesse(formKey, aktuell) {
    const kandidaten = erlaubteGroessen().filter(x => x.g === formKey);
    return kandidaten.reduce((beste, x) => Math.abs(x.w * x.h - aktuell.w * aktuell.h) < Math.abs(beste.w * beste.h - aktuell.w * aktuell.h) ? x : beste, kandidaten[0]);
  }
  async function galerie(key) {
    const adresse = familie.galerie[key];
    if (!adresse) return [];
    if (!galerieCache.has(key)) galerieCache.set(key, fetch(o.basis + adresse).then(r => r.json()).then(j => j.designs).catch(error => { galerieCache.delete(key); throw error; }));
    return galerieCache.get(key);
  }
  function designLaden(adresse) {
    if (!designCache.has(adresse)) designCache.set(adresse, fetch(o.basis + adresse).then(r => { if (!r.ok) throw new Error('Design ' + r.status); return r.json(); }).catch(error => { designCache.delete(adresse); throw error; }));
    return designCache.get(adresse);
  }
  async function groesseWaehlen(ziel) {
    const von = groesse();
    if (ziel.k === von.k) return;
    let naechster;
    try {
      const liste = zustand.design ? await galerie(ziel.k) : [];
      const gleich = liste.find(d => d.id === zustand.design);
      // Dasselbe Design in anderer Form trägt dieselbe D-Nummer und denselben Namen (Katalogregel „Kennungen“).
      const aktuell = zustand.design ? (await galerie(von.k).catch(() => [])).find(d => d.id === zustand.design) : null;
      const verwandt = !gleich && aktuell ? liste.find(d => d.nr != null && d.nr === aktuell.nr && d.n === aktuell.n) : null;
      if (verwandt) {
        const design = await designLaden(verwandt.u);
        await schriften.alle(design.schriften);
        naechster = modell.designWechseln(zustand, design, ziel, Boolean(verwandt.ein));
        const bef = ziel.bef.find(b => b.id === zustand.bef) || ziel.bef[0];
        naechster.bef = bef.id;
      } else {
        naechster = modell.groesseSkalieren(zustand, von, ziel);
      }
    } catch {
      naechster = modell.groesseSkalieren(zustand, von, ziel);
    }
    setze(naechster, {struktur: true});
  }

  // ---------- Designs
  function reiterDesigns() {
    const raster = h('div', {class: 'gk-kacheln gk-zwei'}, h('div', {class: 'gk-dreher'}));
    const suche = h('input', {class: 'gk-suche', type: 'search', placeholder: 'Design suchen', 'aria-label': 'Design suchen', 'data-feld-id': 'design-suche', oninput: () => fuellen()});
    let liste = [];
    function fuellen() {
      const q = suche.value.trim().toLowerCase();
      const treffer = q ? liste.filter(d => (d.n + ' ' + d.id + ' d' + d.nr).toLowerCase().includes(q)) : liste;
      raster.replaceChildren(...treffer.slice(0, 120).map(d => {
        const kachel = h('button', {class: 'gk-kachel gk-design', 'aria-pressed': String(d.id === zustand.design), title: d.n, onclick: () => designWaehlen(d, kachel)},
          d.v ? h('img', {src: o.basis + d.v, loading: 'lazy', alt: ''}) : null, h('span', null, d.n));
        return kachel;
      }));
      if (!treffer.length) raster.replaceChildren(h('p', {class: 'gk-hinweis'}, 'Keine Designs für diese Größe gefunden.'));
    }
    galerie(zustand.groesse).then(l => { liste = l; fuellen(); }).catch(() => raster.replaceChildren(h('p', {class: 'gk-hinweis'}, 'Die Designs konnten nicht geladen werden. Bitte versuche es erneut.')));
    return [suche, h('p', {class: 'gk-hinweis'}, 'Deine Texte bleiben beim Wechsel erhalten.'), raster];
  }
  async function designWaehlen(d, kachel) {
    kachel.classList.add('gk-beschaeftigt');
    try {
      const design = await designLaden(d.u);
      await schriften.alle(design.schriften);
      setze(modell.designWechseln(zustand, design, groesse(), Boolean(d.ein)), {struktur: true, neueAuswahl: null});
      if (istMobil()) reiterWaehlen(null);
    } catch {
      toast('Das Design konnte nicht geladen werden.');
    } finally {
      kachel.classList.remove('gk-beschaeftigt');
    }
  }

  // ---------- Text
  function reiterText() {
    // Felder in Lesereihenfolge (von oben nach unten), unabhängig von der Ebenenfolge.
    const texte = zustand.els.filter(el => el.t === 'text').sort((a, b) => a.y - b.y || a.x - b.x);
    return [
      ...texte.map(el => textFeld(el)),
      h('button', {class: 'gk-knopf', onclick: () => {
        const neu = modell.neuerText(groesse(), zustand.els.find(el => el.t === 'text')?.font || familie.schriften[0]);
        setze({...zustand, els: [...zustand.els, neu]}, {neueAuswahl: neu.id, struktur: true});
        inhalt.querySelector(`[data-feld-id="${CSS.escape(neu.id)}"]`)?.focus();
      }}, icon('plus', 18), 'Text hinzufügen'),
    ];
  }
  function textFeld(el) {
    const aktiv = el.id === auswahl;
    const feld = h('textarea', {
      rows: Math.max(1, el.text.split('\n').length), 'data-feld-id': el.id, 'aria-label': 'Text', value: el.text, placeholder: 'Dein Text',
      autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: 500,
      onfocus: () => { if (auswahl !== el.id) { auswahl = el.id; buehne.auswaehlen(el.id); werkzeugAbgleichen(); } },
      oninput: event => {
        event.target.rows = Math.max(1, event.target.value.split('\n').length);
        aendern(el.id, {text: event.target.value}, false);
        einpassen(el.id);
      },
      onchange: () => merken(),
    });
    const kasten = h('div', {class: 'gk-feld' + (aktiv ? ' gk-aktiv' : ''), 'data-el': el.id}, feld);
    {
      const aktuell = () => zustand.els.find(e => e.id === el.id);
      kasten.append(h('div', {class: 'gk-optionen'},
        h('div', {class: 'gk-zeile'},
          h('button', {class: 'gk-knopf gk-schriftknopf', style: `font-family:"${schriftFamilie(el.font)}"`, onclick: () => { auswahl = el.id; reiterWaehlen('schrift'); }}, el.font),
          h('div', {class: 'gk-gruppe', role: 'group', 'aria-label': 'Ausrichtung'},
            [['s', 'links'], ['m', 'mitte'], ['e', 'rechts']].map(([wert, name]) => h('button', {'aria-pressed': String(el.anker === wert), 'aria-label': name, onclick: () => ausrichten(el.id, wert)}, icon(name, 18))))),
        h('div', {class: 'gk-zeile'}, h('label', null, 'Größe'),
          h('input', {type: 'range', min: 3, max: Math.round(groesse().h * 0.9), step: 0.5, value: el.size, 'data-groesse-id': el.id,
            oninput: event => { const e = aktuell(); const size = Number(event.target.value); const k = size / e.size; aendern(el.id, {size, wunsch: size, ls: e.ls * k, lh: e.lh * k}, false); event.target.nextSibling.textContent = anzeigeGroesse(size); },
            onchange: () => merken()}),
          h('output', null, anzeigeGroesse(el.size))),
        h('div', {class: 'gk-zeile'},
          h('button', {class: 'gk-knopf gk-warn', onclick: () => setze({...zustand, els: zustand.els.filter(e => e.id !== el.id)}, {neueAuswahl: null, struktur: true})}, icon('muell', 18), 'Text löschen'))));
    }
    return kasten;
  }
  /**
   * Text passt sich der Platte an: Wird er breiter als die Platte, schrumpft die Schrift (nicht unter 3 mm,
   * Entscheidung 3.2) und lässt 1 mm Abstand; wird er wieder kürzer, wächst sie bis zur gewünschten Größe zurück.
   */
  function einpassen(id) {
    const el = zustand.els.find(e => e.id === id);
    const r = buehne.rahmenVon(id);
    if (!el || !r || !r.w || el.rot) return;
    const wunsch = el.wunsch || el.size;
    // Freier Bereich der Platte auf Höhe des Textes; bei Oval und Rund schmaler als die Plattenbreite.
    const [von, bis] = buehne.freieBreite(r.y, r.y + r.h);
    const frei = Math.max(1, bis - von - 2);
    // Breite, die der Text bei Wunschgröße hätte (Breite wächst linear mit der Schriftgröße)
    const beiWunsch = r.w * wunsch / el.size;
    const ziel = Math.max(Math.min(3, wunsch), Math.min(wunsch, wunsch * frei / beiWunsch));
    const size = Number(ziel.toFixed(2));
    const k = size / el.size;
    const breite = r.w * k;
    // Ankerpunkt so verschieben, dass der Text innerhalb der Platte liegt
    let links = el.anker === 's' ? el.x : el.anker === 'm' ? el.x - breite / 2 : el.x - breite;
    const verschoben = Math.min(Math.max(links, von + 1), Math.max(von + 1, bis - 1 - breite)) - links;
    if (Math.abs(k - 1) < 0.002 && Math.abs(verschoben) < 0.01) return;
    aendern(id, {size, wunsch, ls: el.ls * k, lh: el.lh * k, x: Number((el.x + verschoben).toFixed(3))}, false);
  }
  function aendern(id, aenderung, festhalten = true) {
    setze({...zustand, els: zustand.els.map(e => e.id === id ? {...e, ...aenderung} : e)}, {festhalten});
  }
  /** Ausrichtung ändern, ohne dass der Text springt: Ankerpunkt wandert an die passende Kante. */
  function ausrichten(id, anker) {
    const el = zustand.els.find(e => e.id === id);
    const r = buehne.rahmenVon(id);
    const x = anker === 's' ? r.x : anker === 'm' ? r.x + r.w / 2 : r.x + r.w;
    aendern(id, {anker, x: Number(x.toFixed(3))});
    void el;
    werkzeugZeichnen();
  }
  function reiterSchrift() {
    const el = zustand.els.find(e => e.id === auswahl && e.t === 'text');
    if (!el) return [h('p', {class: 'gk-hinweis'}, 'Bitte zuerst einen Text auswählen.')];
    const probe = (el.text.split('\n')[0] || 'Beispiel').slice(0, 26);
    const reihenfolge = [...new Set([...familie.schriften, ...schriften.namen()])];
    const beobachter = new IntersectionObserver(eintraege => {
      for (const e of eintraege) if (e.isIntersecting) { beobachter.unobserve(e.target); schriften.laden(e.target.dataset.schrift).then(() => { e.target.firstChild.style.fontFamily = `"${schriftFamilie(e.target.dataset.schrift)}"`; e.target.firstChild.style.visibility = ''; }).catch(() => {}); }
    }, {root: inhalt, rootMargin: '200px'});
    const liste = h('div', {class: 'gk-schriften'}, reihenfolge.map(name => {
      const knopf = h('button', {'data-schrift': name, 'aria-pressed': String(name === el.font), onclick: async () => {
        await schriften.laden(name).catch(() => null);
        aendern(el.id, {font: name});
        reiterWaehlen('text');
      }}, h('span', {style: 'visibility:hidden'}, probe), h('small', null, name));
      beobachter.observe(knopf);
      return knopf;
    }));
    return [h('button', {class: 'gk-knopf', onclick: () => reiterWaehlen('text')}, icon('zurueck', 18), 'Zurück zum Text'), h('p', {class: 'gk-hinweis'}), liste];
  }

  // ---------- Motive
  let motivIndex = null;
  let motivKategorie = '';
  let motivSuche = '';
  function reiterMotive() {
    const raster = h('div', {class: 'gk-motive'});
    const chips = h('div', {class: 'gk-chips'});
    const suche = h('input', {class: 'gk-suche', type: 'search', placeholder: 'Motiv suchen, z. B. Herz', 'aria-label': 'Motiv suchen', 'data-feld-id': 'motiv-suche', value: motivSuche, oninput: event => { motivSuche = event.target.value; fuellen(); }});
    function fuellen() {
      if (!motivIndex) return;
      const q = suche.value.trim().toLowerCase();
      // Die Suche hat Vorrang vor der Kategorie.
      const treffer = q ? motivIndex.filter(m => (m.n + ' ' + m.c).toLowerCase().includes(q)) : motivIndex.filter(m => !motivKategorie || m.c === motivKategorie);
      chips.replaceChildren(...[''].concat([...new Set(motivIndex.map(m => m.c))]).map(c => h('button', {'aria-pressed': String(!q && c === motivKategorie), onclick: () => { motivKategorie = c; motivSuche = suche.value = ''; fuellen(); }}, c || 'Alle')));
      raster.replaceChildren(...treffer.slice(0, 90).map(m => h('button', {title: m.n, onclick: event => motivEinfuegen(m, event.currentTarget)}, h('img', {src: o.basis + m.u, loading: 'lazy', alt: ''}), h('span', null, m.n))));
      if (!treffer.length) raster.replaceChildren(h('p', {class: 'gk-hinweis'}, 'Kein Motiv gefunden.'));
    }
    if (motivIndex) fuellen();
    else fetch(o.basis + eintrag.motive).then(r => r.json()).then(j => { motivIndex = j.motive; fuellen(); }).catch(() => raster.replaceChildren(h('p', {class: 'gk-hinweis'}, 'Die Motive konnten nicht geladen werden.')));
    const preisHinweis = regeln().motiv != null ? h('p', {class: 'gk-hinweis'}, `Je zusätzlichem Motiv ${euro(regeln().motiv)}. Motive der Vorlage sind inklusive.`) : null;
    return [suche, chips, preisHinweis, raster];
  }
  async function motivEinfuegen(m, knopf) {
    knopf.disabled = true;
    try {
      const text = await fetch(o.basis + m.u).then(r => r.text());
      const {viewBox, inhalt: svgInhalt} = motivAusSvg(text);
      const neu = modell.neuesMotiv(groesse(), m, viewBox, svgInhalt);
      setze({...zustand, els: [...zustand.els, neu]}, {neueAuswahl: neu.id, struktur: true});
      if (istMobil()) reiterWaehlen(null);
    } catch {
      toast('Das Motiv konnte nicht geladen werden.');
    } finally {
      knopf.disabled = false;
    }
  }

  // ---------- Foto
  function reiterFoto() {
    const gewaehlt = zustand.els.find(e => e.id === auswahl && e.t === 'foto');
    const ziel = gewaehlt || zustand.els.find(e => e.t === 'foto' && !e.bild);
    const eingabe = h('input', {type: 'file', accept: 'image/jpeg,image/png,image/webp,image/heic', hidden: true, onchange: event => fotoGewaehlt(event.target.files[0], ziel)});
    const regel = familie.foto;
    const teile = [
      eingabe,
      h('button', {class: 'gk-knopf gk-gruen', onclick: () => eingabe.click()}, icon('foto', 18), gewaehlt?.bild ? 'Foto ersetzen' : 'Foto hochladen'),
      h('p', {class: 'gk-hinweis'}, regel ? `${regel.inklusive ? regel.inklusive + ' Foto inklusive, jedes weitere' : 'Je Foto'} ${euro(regel.preis)}.` : ''),
    ];
    if (gewaehlt?.bild) {
      teile.push(
        h('div', {class: 'gk-zeile'}, h('label', null, 'Ausschnitt'),
          h('input', {type: 'range', min: 1, max: 4, step: 0.02, value: gewaehlt.bild.zoom || 1,
            oninput: event => aendern(gewaehlt.id, {bild: {...zustand.els.find(e => e.id === gewaehlt.id).bild, zoom: Number(event.target.value)}}, false), onchange: () => merken()}),
          h('output', null, '')),
        h('div', {class: 'gk-zeile'}, h('button', {class: 'gk-knopf gk-warn', onclick: () => gewaehlt.original ? aendern(gewaehlt.id, {bild: null}) : setze({...zustand, els: zustand.els.filter(e => e.id !== gewaehlt.id)}, {neueAuswahl: null, struktur: true})}, icon('muell', 18), 'Foto entfernen')));
    }
    return teile;
  }
  async function fotoGewaehlt(datei, ziel) {
    if (!datei) return;
    try {
      const vorbereitet = await fotoVorbereiten(datei, {grau: familie.verfahren.art === 'gravur'});
      const bild = {url: vorbereitet.url, w: vorbereitet.w, h: vorbereitet.h, zoom: 1, ox: 0, oy: 0, grau: vorbereitet.grau, name: datei.name};
      let id;
      if (ziel) { id = ziel.id; setze({...zustand, els: zustand.els.map(e => e.id === id ? {...e, bild} : e)}, {neueAuswahl: id, struktur: true}); }
      else { const neu = modell.neuesFoto(groesse(), bild); id = neu.id; setze({...zustand, els: [...zustand.els, neu]}, {neueAuswahl: id, struktur: true}); }
      // Original im Hintergrund hochladen; der Warenkorb wartet darauf.
      uploads.set(id, fetch(o.api + '/uploads', {method: 'POST', headers: {'content-type': datei.type || 'application/octet-stream', 'x-dateiname': encodeURIComponent(datei.name)}, body: datei})
        .then(r => { if (!r.ok) throw new Error('Upload ' + r.status); return r.json(); }));
      uploads.get(id).catch(() => toast('Das Foto konnte nicht hochgeladen werden. Bitte prüfe deine Verbindung.'));
    } catch (error) {
      toast(error.message || 'Dieses Bild kann nicht verwendet werden.');
    }
  }

  // ---------- Ebenen
  function reiterEbenen() {
    const namen = el => el.t === 'text' ? (el.text.split('\n')[0] || 'Leerer Text') : el.t === 'motiv' ? (el.quelle.name || 'Motiv') : 'Foto';
    const verschieben = (index, delta) => { const els = [...zustand.els]; const [el] = els.splice(index, 1); els.splice(index + delta, 0, el); setze({...zustand, els}, {struktur: true}); };
    return [...zustand.els].map((el, index) => ({el, index})).reverse().map(({el, index}) =>
      h('div', {class: 'gk-ebene' + (el.id === auswahl ? ' gk-aktiv' : ''), onclick: () => { auswahl = el.id; buehne.auswaehlen(el.id); werkzeugZeichnen(); }},
        icon(el.t === 'text' ? 'text' : el.t === 'motiv' ? 'motive' : 'foto', 18), h('span', null, namen(el)),
        h('button', {class: 'gk-knopf gk-rund', 'aria-label': 'Nach vorn', disabled: index === zustand.els.length - 1, onclick: e => { e.stopPropagation(); verschieben(index, 1); }}, icon('hoch', 18)),
        h('button', {class: 'gk-knopf gk-rund', 'aria-label': 'Nach hinten', disabled: index === 0, onclick: e => { e.stopPropagation(); verschieben(index, -1); }}, icon('runter', 18)),
        h('button', {class: 'gk-knopf gk-rund gk-warn', 'aria-label': 'Löschen', onclick: e => { e.stopPropagation(); setze({...zustand, els: zustand.els.filter(x => x.id !== el.id)}, {struktur: true}); }}, icon('muell', 18))));
  }

  // ---------------------------------------------------------------- Dialoge
  function dialog(titel, koerper, aktionen) {
    const box = h('div', {class: 'gk-dialog', role: 'alertdialog', 'aria-label': titel}, h('div', null, h('h2', null, titel), koerper, h('div', {class: 'gk-aktionen'}, aktionen)));
    app.append(box);
    return () => box.remove();
  }
  function toast(text, aktion) {
    const box = h('div', {class: 'gk-toast', role: 'status'}, text, aktion ? h('button', {onclick: () => { box.remove(); aktion.tun(); }}, aktion.name) : null);
    app.append(box);
    setTimeout(() => box.remove(), aktion ? 9000 : 4500);
  }
  function zuruecksetzen() {
    const zu = dialog('Gestaltung zurücksetzen?', h('p', null, 'Das ursprüngliche Design wird wiederhergestellt. Deine Änderungen gehen verloren.'), [
      h('button', {class: 'gk-knopf', onclick: () => zu()}, 'Abbrechen'),
      h('button', {class: 'gk-knopf gk-warn', onclick: () => { zu(); setze({...modell.startZustand(eintrag, {groesse: zustand.groesse, bef: zustand.bef}), menge: zustand.menge}, {struktur: true, neueAuswahl: null}); }}, 'Zurücksetzen'),
    ]);
  }
  function preisDetails() {
    const p = modell.preis(zustand, familie, regeln());
    const g = groesse();
    const bef = modell.befestigungVon(g, zustand.bef);
    const namen = {motiv: 'Zusätzliche Motive', foto: 'Fotos', logo: 'Logos'};
    const zeilen = [[`${familie.material.name} · ${g.n}`, euro(p.grund)]];
    if (p.befestigung) zeilen.push([bef.n, euro(p.befestigung)]);
    for (const z of p.zusatz) zeilen.push([`${namen[z.art]} (${z.n} × ${euro(z.je)})`, euro(z.cents)]);
    if (p.rabatt) zeilen.push([`Mengenrabatt ${p.rabatt} %`, '− ' + euro(p.liste - p.stueck)]);
    zeilen.push([p.menge > 1 ? `Summe für ${p.menge} Stück` : 'Preis', euro(p.summe)]);
    const zu = dialog('Preisdetails', h('table', null, zeilen.map(([a, b]) => h('tr', null, h('td', null, a), h('td', null, b)))), [h('button', {class: 'gk-knopf', onclick: () => zu()}, 'Schließen')]);
  }

  // ---------------------------------------------------------------- Warenkorb
  let beschaeftigt = false;
  async function zumWarenkorb() {
    if (beschaeftigt || !zustand) return;
    const fehler = modell.pruefen(zustand, familie, {foto: fotoErlaubt()});
    if (fehler.length) {
      const zu = dialog('Bitte noch prüfen', h('ul', null, fehler.map(f => h('li', null, f.text))), [h('button', {class: 'gk-knopf', onclick: () => zu()}, 'Verstanden')]);
      const erste = fehler.find(f => f.id);
      if (erste) { auswahl = erste.id; buehne.auswaehlen(erste.id); }
      return;
    }
    beschaeftigt = true;
    const zu = dialog('Deine Gestaltung wird gespeichert …', h('div', {style: 'display:grid;place-items:center;padding:12px'}, h('div', {class: 'gk-dreher'})), []);
    try {
      await abschliessen({o, zustand, familie, eintrag, schriften, uploads});
      try { localStorage.removeItem(entwurfKey()); } catch {}
      o.shop.zumWarenkorb();
    } catch (error) {
      zu();
      const weg = dialog('Das hat nicht geklappt', h('p', null, error.kundentext || 'Deine Gestaltung konnte nicht in den Warenkorb gelegt werden. Sie ist auf diesem Gerät gesichert – bitte versuche es gleich noch einmal.'), [h('button', {class: 'gk-knopf', onclick: () => weg()}, 'Schließen')]);
      console.error('[gravuru-konfi]', error);
    } finally {
      beschaeftigt = false;
    }
  }

  /** Schriften und Bibliotheksinhalte nachladen, die ein wiederhergestellter Zustand braucht. */
  function nachladen() {
    return schriften.alle(zustand.els.filter(el => el.t === 'text').map(el => el.font)).catch(() => {});
  }

  // ---------------------------------------------------------------- Laden
  try {
    const bearbeitet = o.bearbeiten
      ? fetch(`${o.api}/gestaltungen/${encodeURIComponent(o.bearbeiten.id)}?token=${encodeURIComponent(o.bearbeiten.token)}`).then(r => { if (!r.ok) throw Object.assign(new Error('Gestaltung ' + r.status), {kundentext: 'Diese Gestaltung kann nicht mehr bearbeitet werden.'}); return r.json(); })
      : null;
    eintrag = await fetch(`${o.basis}p/${encodeURIComponent(o.produkt)}.json`).then(r => { if (!r.ok) throw new Error('Produkt ' + r.status); return r.json(); });
    if (geschlossen) return null;
    familie = eintrag.familie;
    schriften = schriftLader(o.basis, eintrag.schriften);
    buehne = buehneErzeugen({
      familie, basis: o.basis,
      onAuswahl: id => {
        auswahl = id;
        if (id) { const el = zustand.els.find(e => e.id === id); const ziel = el.t === 'text' ? 'text' : el.t === 'foto' ? 'foto' : reiter; if (!istMobil() && ziel !== reiter) return reiterWaehlen(ziel); }
        if (reiter === 'text') { werkzeugAbgleichen(); inhalt.querySelector('.gk-feld.gk-aktiv')?.scrollIntoView({block: 'nearest'}); } else werkzeugZeichnen();
      },
      onAendern: (neu, id) => setze(neu, {festhalten: false, neueAuswahl: id}),
      onFertig: () => merken(),
      onDoppel: id => { const el = zustand.els.find(e => e.id === id); if (el?.t === 'text') { auswahl = id; reiterWaehlen('text'); const feld = inhalt.querySelector(`[data-feld-id="${CSS.escape(id)}"]`); feld?.focus(); feld?.select(); } },
    });
    buehne.onAnsicht(z => { ansichtRegler.value = Math.round(z * 100); ansichtWert.textContent = Math.round(z * 100) + ' %'; });
    flaeche.append(buehne.knoten);

    let gespeichert = null;
    if (!o.bearbeiten) { try { gespeichert = JSON.parse(localStorage.getItem(entwurfKey()) || 'null'); } catch {} }
    const frisch = modell.startZustand(eintrag, o.wahl);
    // Platte sofort zeigen; Texte folgen, sobald ihre Schrift da ist (kein Springen durch Ersatzschrift).
    zustand = {...frisch, els: frisch.els.filter(el => el.t !== 'text')};
    buehne.zeichnen(zustand, null);
    kopfzeilen();
    reiterZeichnen();
    const tPlatte = performance.now() - start;

    let ziel = frisch;
    if (bearbeitet) { const daten = await bearbeitet; ziel = daten.zustand; }
    else if (gespeichert?.zustand?.v === modell.VERSION && gespeichert.zustand.produkt === eintrag.key && modell.groesseVon(familie, gespeichert.zustand.groesse)) ziel = gespeichert.zustand;
    zustand = ziel;
    await nachladen();
    if (geschlossen) return null;
    lade.remove();
    verlauf = []; stelle = -1;
    setze(ziel, {struktur: true, neueAuswahl: null});
    if (!istMobil()) reiterWaehlen('text');
    if (ziel !== frisch && !bearbeitet) {
      toast('Dein Entwurf wurde wiederhergestellt.', {name: 'Neu beginnen', tun: () => setze(modell.startZustand(eintrag, o.wahl), {struktur: true, neueAuswahl: null})});
    }
    const messung = {plattenMs: Math.round(tPlatte), bereitMs: Math.round(performance.now() - start)};
    host.dataset.bereit = JSON.stringify(messung);
    o.onBereit?.(messung);
    return {schliessen, zustand: () => zustand};
  } catch (error) {
    lade.replaceChildren(h('div', {style: 'pointer-events:auto;text-align:center;padding:20px'},
      h('p', null, error.kundentext || 'Der Konfigurator konnte nicht geladen werden.'),
      h('button', {class: 'gk-knopf', onclick: () => { schliessen(); }}, 'Zurück zum Produkt')));
    console.error('[gravuru-konfi]', error);
    return null;
  }
}
