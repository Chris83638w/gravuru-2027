// Funkklingelschilder veröffentlichen.
//
// Quelle: Katalog `migrationen/funkklingeln-42x3-20261027` (42 Geräte × 3 Formate), gelesen und geprüft mit dem
// bestehenden Lader. Lage der Klingel je Position, Schnittpfade und Designs berechnet die bestehende, abgenommene
// Auswahl-Logik (`selectedDoorbellProfile`); die Designs der beiden Querformate entstehen wie der Live-Stand
// (Revision 2) aus den Hochformat-Originalen (`prepareDoorbellDesignRepair`). Hier wird nichts neu erfunden.
//
// Aufbau eines Funkklingelschilds: Edelstahlplatte unten, Acrylglas darauf. Der „Rahmen“ ist der sichtbare
// Edelstahlrand. Graviert wird nur auf Acryl. Die Klingel selbst ist fest und gehört nicht zum Lieferumfang.
import fs from 'node:fs';
import path from 'node:path';
import {loadDoorbellCatalog, buildDoorbellConfig} from '../../scripts/import-doorbell-catalog.mjs';
import {selectedDoorbellProfile} from '../../app/configurator/variant-m/doorbell-selection.mjs';
import {prepareDoorbellDesignRepair} from '../../scripts/prepare-doorbell-design-repair.mjs';
import {kompaktPfad} from '../core/pfad.mjs';

const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const rechteck = b => [round(b.x), round(b.y), round(b.width), round(b.height)];
const FORMAT_NAMEN = {'16x28': 'Hochformat 16 × 28 cm', '24x20': 'Querformat 24 × 20 cm', '35x18': 'Länglich 35 × 18 cm'};
// Anzeige wie im bestehenden Konfi (doorbell-ui.mjs): rechts/links bei Querformaten, unten/oben im Hochformat.
const POSITION_NAMEN = {quer: {standard: 'Klingel rechts', opposite: 'Klingel links'}, hoch: {standard: 'Klingel unten', opposite: 'Klingel oben'}};
// Nur Anzeige. Schwarz wie MATERIAL_COLORS.acrylic; Anthrazit ist ein gewählter Anzeigewert ohne Quelle.
const ACRYL_FARBEN = {schwarz: '#17191b', anthrazit: '#3a3d40'};

/** Farben eines Zierelements auf die Gravurfarbe umstellen; nur bekannte, harmlose SVG-Formen zulassen. */
function zierInhalt(fragment, id) {
  if (/<\s*(script|image|use|foreignObject|style|a)\b|\son\w+\s*=|href\s*=/i.test(fragment)) throw new Error('Zierelement mit nicht erlaubtem Inhalt: ' + id);
  return fragment.replace(/\b(fill|stroke)="(?!none")[^"]*"/g, '$1="currentColor"');
}

export function klingelnVeroeffentlichen({katalogRoot, appRoot, schriften, writeHashed, bildVeroeffentlichen, hinweise, slug, regelQuelle, standKennung, motivIndex, out}) {
  const root = path.join(katalogRoot, 'migrationen', 'funkklingeln-42x3-20261027');
  if (!fs.existsSync(root)) { hinweise.push({art: 'klingel', grund: 'Funkklingel-Katalog nicht gefunden'}); return {familien: 0, produkte: {}, designs: 0}; }
  const katalog = loadDoorbellCatalog(root);
  // Shopify-Zuordnung: Kennung im Metafeld custom.customization_id → Gerät und Startformat (Stand 29.10.2026).
  const zuordnungDatei = path.join(appRoot, '..', 'docs', 'handoffs', 'issue47-20261029', 'products-126.json');
  const zuordnung = fs.existsSync(zuordnungDatei) ? JSON.parse(fs.readFileSync(zuordnungDatei, 'utf8')) : [];
  const zeilen = Array.isArray(zuordnung) ? zuordnung : zuordnung.products || zuordnung.entries || [];
  const texturStahl = bildVeroeffentlichen(path.join(appRoot, 'designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.webp'));
  const schraube = bildVeroeffentlichen(path.join(appRoot, 'designs/aosu-labrador/runtime/images/gravuru-schraubenkopf-fotorealistisch.webp'));
  const geraeteIndex = new Map(JSON.parse(fs.readFileSync(path.join(root, 'device-index.json'), 'utf8')).entries?.map(e => [e.modelKey, e]) || JSON.parse(fs.readFileSync(path.join(root, 'device-index.json'), 'utf8')).devices?.map(e => [e.modelKey, e]) || []);

  const produkte = {};
  const familienUrls = {};
  let designZahl = 0;
  const modelle = new Map();
  for (const eintrag of katalog.entries) { if (!modelle.has(eintrag.modelKey)) modelle.set(eintrag.modelKey, []); modelle.get(eintrag.modelKey).push(eintrag); }

  for (const [modelKey, eintraege] of modelle) {
    try {
      const native = katalog.bundles.get(modelKey);
      const basis = buildDoorbellConfig(native, eintraege[0], {imageSha256: '0'.repeat(64)});
      const config = prepareDoorbellDesignRepair(basis).input || prepareDoorbellDesignRepair(basis);
      const motive = new Map((native.localResources?.motifs || []).map(m => [m.key, m]));
      const geraet = geraeteIndex.get(modelKey);
      const geraetBild = geraet ? bildVeroeffentlichen(path.join(root, geraet.path)) : null;
      if (!geraetBild) hinweise.push({art: 'klingel', id: modelKey, grund: 'Gerätebild fehlt'});

      const groessen = [];
      const galerie = {};
      const startDesigns = new Map(); // "<format>|<position>|<designId>" → Designdokument
      const fonts = new Set();
      let farben = null, rahmenNamen = null;
      for (const format of config.doorbell.formats) {
        const pos = {};
        let profilStandard = null;
        for (const position of ['standard', 'opposite']) {
          const profil = selectedDoorbellProfile(config, {format: format.key, color: 'schwarz', frame: 'FK-RUNDUM', mounting: 'K00', position});
          if (position === 'standard') profilStandard = profil;
          const g = profil.geometry;
          pos[position] = {bell: rechteck(g.bell), bild: rechteck(g.bellImageBounds || g.bell)};
          const liste = [];
          profil.designs.forEach((design, index) => {
            const els = design.objects.map(o => {
              if (o.type === 'text') {
                if (!schriften[o.font]) throw new Error('Schrift nicht veröffentlicht: ' + o.font);
                fonts.add(o.font);
                // Bestand: x/y = Mitte des Textkastens; Grundlinie = Mitte + 0,35 · Schriftgröße (katalog-convert.mjs).
                return {t: 'text', id: o.id, feld: o.fieldKey || o.id, text: o.text, font: o.font, size: round(o.size), x: round(o.x), y: round(o.y + 0.35 * o.size), anker: 'm', ...(o.rotation ? {rot: round(o.rotation, 2)} : {})};
              }
              const quelle = motive.get(o.motif);
              if (!quelle) throw new Error('Zierelement fehlt: ' + o.motif);
              return {t: 'motiv', id: o.id, box: [round(o.x - o.w / 2), round(o.y - o.h / 2), round(o.w), round(o.h)], qbox: quelle.bounds.map(v => round(v)), svg: zierInhalt(quelle.svgFragment, o.motif), ...(o.rotation ? {rot: round(o.rotation, 2)} : {})};
            });
            const doc = {v: 1, id: `${modelKey}~${format.key}~${position}~${design.id}`, name: design.name, nr: index + 1, platte: [g.width, g.height], schriften: [...new Set(els.filter(e => e.t === 'text').map(e => e.font))], els, rahmen: design.borderKey || null};
            const u = writeHashed('d', slug(doc.id), 'json', doc);
            designZahl++;
            startDesigns.set(`${format.key}|${position}|${design.id}`, doc);
            liste.push({id: doc.id, n: doc.name, nr: doc.nr, u});
          });
          galerie[`${format.key}|${position}`] = writeHashed('g/' + slug('fk-' + modelKey), slug(`${format.key}-${position}`), 'json', {designs: liste});
        }
        const p = profilStandard;
        farben ||= p.materials.acrylic.colors;
        rahmenNamen ||= p.frames.map(f => ({k: f.key, n: f.name}));
        const loecher = p.mounting.holes.map(h => [h.x, h.y, p.mounting.holeDiameterMm]);
        groessen.push({
          k: format.key, g: 'F', n: FORMAT_NAMEN[format.key] || format.label, w: p.geometry.width, h: p.geometry.height, p: format.basePriceCents,
          d: `M0 0H${p.geometry.width}V${p.geometry.height}H0Z`,
          bef: p.mounting.options.map(o => ({id: o.key, n: o.name, p: o.surchargeCents, l: o.visibleScrews ? loecher : [], ...(o.visibleScrews ? {schraube: 1} : {})})),
          kl: {pos, rahmen: Object.fromEntries(p.frames.map(f => [f.key, rechteck(f.acrylic)])), posNamen: POSITION_NAMEN[p.geometry.height > p.geometry.width ? 'hoch' : 'quer']},
        });
      }
      const familie = {
        v: 1, id: 'fk-' + modelKey, art: 'klingel', name: 'Klingelschild für ' + eintraege[0].modelLabel,
        material: {art: 'klingel', k: 'klingel', name: 'Edelstahl mit Acrylglas', farbe: ACRYL_FARBEN.schwarz, stahl: {farbe: '#bac2c4', ...(texturStahl ? {textur: texturStahl} : {})}, schraube},
        verfahren: {id: 'acrylic-engraving', art: 'gravur', farbe: '#e1e4e5'},
        formen: [{k: 'F', n: 'Format'}],
        groessen,
        optionen: [
          {k: 'position', n: 'Position der Klingel', werte: [{k: 'standard'}, {k: 'opposite'}]},
          {k: 'rahmen', n: 'Edelstahlrahmen', werte: rahmenNamen},
          {k: 'farbe', n: 'Farbe des Acrylglases', werte: farben.map(f => ({k: f.key, n: f.name, farbe: ACRYL_FARBEN[f.key] || ACRYL_FARBEN.schwarz}))},
        ],
        geraet: {name: eintraege[0].modelLabel, bild: geraetBild},
        schriften: [...fonts],
        // Foto-Upload: Chris, 17.11.2026 („Funkklingel kann Foto haben“). Preis siehe regeln.json.
        foto: {inklusive: regelQuelle.fotoFunkklingel.inklusive, preis: regelQuelle.fotoFunkklingel.cents},
        galerie,
      };
      const familieUrl = writeHashed('f', slug(familie.id), 'json', familie);

      for (const eintrag of eintraege) {
        const zeile = zeilen.find(z => z.model === eintrag.modelLabel && z.format === eintrag.formatKey) || zeilen.find(z => (z.configProduct || z.key) === eintrag.key);
        const kennung = zeile?.customizationId || zeile?.configProduct;
        if (!kennung) { hinweise.push({art: 'klingel', id: eintrag.key, grund: 'keine Shopify-Kennung in products-126.json'}); continue; }
        const d = eintrag.defaults;
        const start = startDesigns.get(`${d.format}|${d.position}|${d.designId}`) || startDesigns.get(`${d.format}|${d.position}|FK-RUNDUM`);
        const key = slug(kennung);
        fs.mkdirSync(path.join(out, 'p'), {recursive: true});
        fs.writeFileSync(path.join(out, 'p', key + '.json'), JSON.stringify({
          v: 1, key, name: zeile.title || `${familie.name} · ${FORMAT_NAMEN[d.format]}`, linie: 'funkklingelschilder', thema: null,
          familie, groessen: null, start,
          wahl: {groesse: d.format, bef: d.mounting, opt: {position: d.position, rahmen: d.frame, farbe: d.color}},
          schriften: Object.fromEntries(Object.entries(schriften).map(([name, font]) => [name, {u: font.u}])), motive: motivIndex,
          // Zusatzmotive: Chris, 17.11.2026 (1,69 € je Motiv, auch bei Funkklingeln). Logos bleiben aus.
          // Eine Mengenstaffel ist für Funkklingeln nicht belegt.
          regeln: {motiv: regelQuelle.motiv.cents, staffel: []},
          stand: standKennung, vorschau: 1, ids: {shopifyProductId: String(zeile.productId || '').split('/').pop(), customizationId: kennung},
        }));
        produkte[key] = {name: zeile.title || familie.name, familie: familie.id, start: start?.id || null, shopify: String(zeile.productId || '').split('/').pop() || null};
      }
      familienUrls[familie.id] = {u: familieUrl, designs: 96, groessen: groessen.length};
    } catch (error) {
      hinweise.push({art: 'klingel', id: modelKey, grund: error.message});
    }
  }
  return {familien: familienUrls, produkte, designs: designZahl};
}
