#!/usr/bin/env python3
"""Tests für scripts/import-amazon-order.py (unittest, ohne pytest).

    python3 scripts/import-amazon-order.test.py            # alle Tests
    python3 scripts/import-amazon-order.test.py -v -k Zip  # Auswahl

Die Tests laufen hermetisch: ein synthetischer Mini-Katalog mit einer erzeugten Testschrift (Kerning und Ligatur),
die anonymisierte Fixture app/workshop/fixtures/amazon-order/ (Struktur des Referenzfalls, Mustertexte) und das
Mapping amazon/ des Repos. Nur die Klasse TestRealkatalog braucht das echte Repo gravuru-katalog (Umgebungsvariable
GRAVURU_KATALOG oder ../gravuru-katalog); fehlt es, wird sie übersprungen.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import math
import os
import shutil
import socket
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HIER = Path(__file__).resolve().parent
REPO = HIER.parent
FIXTURE = REPO / 'app' / 'workshop' / 'fixtures' / 'amazon-order'
MAPPING = REPO / 'amazon'


def lade(name: str, datei: str):
    spec = importlib.util.spec_from_file_location(name, HIER / datei)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


imp = lade('import_amazon_order', 'import-amazon-order.py')
fix = lade('make_amazon_fixture', 'make-amazon-fixture.py')

ITEM = fix.FIX_ITEM_ID
FOTO = fix.FIX_FOTO
SVG = fix.FIX_SVG
VORSCHAU = fix.FIX_VORSCHAU
ORDNER = f'{fix.FIX_ORDER_ID}_{ITEM}'


# --------------------------------------------------------------------------------------------------
# Testmaterial
# --------------------------------------------------------------------------------------------------

def baue_testschrift(pfad: Path):
    """Kleine TTF: 600 Einheiten je Buchstabe, 520 je Ziffer, Kerning V+A = -80, Ligatur f+i = eine Glyphe (700)."""
    from fontTools.fontBuilder import FontBuilder
    from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    zeichen = [chr(c) for c in range(0x20, 0x7F)] + list('äöüÄÖÜß–')
    namen = {c: ('space' if c == ' ' else f'uni{ord(c):04X}') for c in zeichen}
    ordnung = ['.notdef'] + [namen[c] for c in zeichen] + ['f_i']
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(ordnung)
    fb.setupCharacterMap({ord(c): namen[c] for c in zeichen})

    def vorschub(n):
        if n == 'space':
            return 250
        if n == 'f_i':
            return 700
        if n == '.notdef':
            return 500
        c = chr(int(n[3:], 16))
        return 600 if c.isalpha() else 520 if c.isdigit() else 300

    glyphen, metriken = {}, {}
    for n in ordnung:
        pen = TTGlyphPen(None)
        adv = vorschub(n)
        if n != 'space':
            pen.moveTo((50, 0))
            pen.lineTo((50, 700))
            pen.lineTo((adv - 50, 700))
            pen.lineTo((adv - 50, 0))
            pen.closePath()
        glyphen[n] = pen.glyph()
        metriken[n] = (adv, 50)
    fb.setupGlyf(glyphen)
    fb.setupHorizontalMetrics(metriken)
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({'familyName': 'Testschrift', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()
    addOpenTypeFeaturesFromString(fb.font, '''
languagesystem DFLT dflt;
languagesystem latn dflt;
feature liga { sub uni0066 uni0069 by f_i; } liga;
feature kern { pos uni0056 uni0041 -80; } kern;
''')
    pfad.parent.mkdir(parents=True, exist_ok=True)
    fb.save(str(pfad))


DESIGN_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300.0 200.0" width="300.0mm" height="200.0mm">
<rect id="platte" width="300.0" height="200.0" fill="none" stroke="#999" stroke-width="0.2"/>
<path id="motiv-1" d="M0 0 H300 V200 H0 Z" fill="none" stroke="none" stroke-width="0.0" fill-rule="evenodd"/>
<path id="motiv-2" d="M203.66 90.55 H234.21 V114.96 H203.66 Z" fill="#b3b3b3" stroke="none" stroke-width="0.0" fill-rule="evenodd"/>
<path id="hinweis-4" class="hinweis" d="M0 0 H10 V10 H0 Z" fill="#ffffff" display="none"/>
<text id="text-1" x="1" y="1" font-family="Great Vibes" font-size="12">Snow</text>
</svg>
'''


def baue_testkatalog(wurzel: Path):
    baue_testschrift(wurzel / 'schriften' / 'dateien' / 'Great Vibes' / 'GreatVibes-Regular.ttf')
    (wurzel / 'schriften' / 'schriften.json').write_text(json.dumps({'fonts': [
        {'name': 'Great Vibes', 'file': 'schriften/dateien/Great Vibes/GreatVibes-Regular.ttf'},
        {'name': 'Minimalist', 'file': None},
        {'name': 'Fehlt', 'file': 'schriften/dateien/Fehlt/Fehlt.ttf'},
    ]}), encoding='utf-8')
    fam = {'schema': 'gravuru-product-family/v2', 'id': 'gedenktafel-30x20-schiefer-natur', 'designArea': {'marginMm': 10, 'keepoutMm': 1},
           'groups': [{'key': 'RE', 'name': 'Rechteck', 'shape': 'rect', 'cornerRadiusMm': 0}],
           'mountingRules': [{'id': 'B02-E12-D5', 'layout': 'left-right', 'count': 2, 'diameterMm': 5, 'edgeMm': 12},
                             {'id': 'B04-E12-D5', 'layout': 'corners', 'count': 4, 'diameterMm': 5, 'edgeMm': 12}],
           'sizes': [{'key': 'GT-SN-RE-300X200', 'groupKey': 'RE', 'label': '30 × 20 cm', 'widthMm': 300, 'heightMm': 200, 'mounting': ['B02-E12-D5', 'B04-E12-D5']}]}
    (wurzel / 'familien' / 'schiefer').mkdir(parents=True)
    (wurzel / 'familien' / 'schiefer' / 'gedenktafel-30x20-schiefer-natur.json').write_text(json.dumps(fam), encoding='utf-8')
    bestand = wurzel / 'designs' / 'bestand' / 'gedenktafeln'
    for pfad in ('Tiere/Allgemein/gravur-rechteck-D201', 'A/d300', 'A/d400a', 'A/d400b'):
        (bestand / pfad).mkdir(parents=True)
        (bestand / pfad / 'design.svg').write_text(DESIGN_SVG, encoding='utf-8')
    eintrag = lambda key, nr, proc, path: {'key': key, 'process': proc, 'form': 'Rechteck', 'designNo': nr, 'masterId': f'GT-{key}', 'path': path}
    (bestand / 'designs.json').write_text(json.dumps([
        eintrag('gravur-rechteck-D201', 201, 'Gravur', 'Tiere/Allgemein/gravur-rechteck-D201'),
        eintrag('gravur-rechteck-D300', 300, 'Gravur', 'A/d300'), eintrag('uv-granit-D300', 300, 'UV', 'A/d300'),
        eintrag('gravur-rechteck-D400', 400, 'Gravur', 'A/d400a'), eintrag('gravur-herz-D400', 400, 'Gravur', 'A/d400b'),
    ]), encoding='utf-8')


def finde_echten_katalog() -> Path | None:
    for p in (os.environ.get('GRAVURU_KATALOG'), str(REPO.parent / 'gravuru-katalog'), '/home/claude/gravuru-katalog'):
        if p and (Path(p) / 'schriften' / 'schriften.json').is_file():
            return Path(p)
    return None


def zip_bytes(dateien: dict[str, bytes]) -> bytes:
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, d in dateien.items():
            z.writestr(n, d)
    return out.getvalue()


def schreibe_zip(pfad: Path, dateien: dict[str, bytes]) -> Path:
    pfad.write_bytes(zip_bytes(dateien))
    return pfad


def fixture_dateien() -> dict[str, bytes]:
    return {p.name: p.read_bytes() for p in sorted(FIXTURE.iterdir()) if p.suffix in ('.json', '.xml', '.svg', '.jpg')}


def synth_breite(familie, zeile, groesse, katalog_schrift):
    return katalog_schrift.breite(katalog_schrift.formen(zeile, familie)) * groesse / katalog_schrift.upm


def baue_bestellung(katalog: 'imp.Katalog', mod=None, nur_json=False) -> dict[str, bytes]:
    """Fixture-Bestellung mit Layout für die Testschrift (die Fixture-Maße gelten für die echte Great Vibes)."""
    dateien = fixture_dateien()
    doc = json.loads(dateien[f'{ITEM}.json'])
    fabric = imp.parse_fabric(dateien[SVG])
    foto = next(b for b in fabric['bilder'] if b['href'] == FOTO)
    overlay = next(b for b in fabric['bilder'] if '://' in b['href'])
    clip = foto['clip']
    meta = {'foto': {'m': foto['m'], 'href': FOTO, 'x': foto['x'], 'y': foto['y'], 'w': foto['w'], 'h': foto['h']}, 'overlay_href': overlay['href'],
            'clip': (clip[2] - clip[0], clip[3] - clip[1], (clip[0] + clip[2]) / 2, (clip[1] + clip[3]) / 2),
            'texte': [{'m': t['m'], 'groesse': t['groesse'], 'familie': t['familie']} for t in fabric['texte']]}
    if mod:
        mod(doc)
    schrift = katalog.schrift('Great Vibes', {})[1]
    doc, svg = fix.layout_neu(doc, meta, lambda f, z, g: synth_breite('Great Vibes', z, g, schrift))
    neu = dict(dateien)
    neu[f'{ITEM}.json'] = json.dumps(doc, ensure_ascii=False).encode('utf-8')
    neu[SVG] = svg.encode('utf-8')
    if nur_json:
        neu.pop(f'{ITEM}.xml', None)
    else:
        neu[f'{ITEM}.xml'] = fix.objekt_zu_xml(doc)
    return neu


def optionen(doc, name):
    """Alle OptionCustomization-Knoten mit diesem Namen."""
    treffer = []

    def gehe(n):
        if isinstance(n, dict):
            if n.get('type') == 'OptionCustomization' and n.get('name') == name:
                treffer.append(n)
            for c in n.get('children', []) or []:
                gehe(c)

    gehe(doc['customizationData'])
    return treffer


def setze_option(doc, name, wert):
    for o in optionen(doc, name):
        o['optionSelection']['name'] = wert
        o['optionSelection']['label'] = wert
        o['displayValue'] = wert
    for a in doc['customizationInfo']['version3.0']['surfaces'][0]['areas']:
        if a.get('name') == name and a.get('customizationType') == 'Options':
            a['optionValue'] = wert


class Basis(unittest.TestCase):
    """Gemeinsamer synthetischer Katalog."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp(prefix='amazon-test-'))
        cls.katalogpfad = cls.tmp / 'katalog'
        baue_testkatalog(cls.katalogpfad)
        cls.katalog = imp.Katalog(cls.katalogpfad)
        cls.mapping = imp.Mapping(MAPPING)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def lauf(self, dateien: dict[str, bytes], nur_pruefen=True, backend='auto', mapping=None, name=None, umrechnung='corel'):
        """Einen Lauf über eine ZIP; gibt (Ergebnis, Ausgabeordner) zurück."""
        arbeits = Path(tempfile.mkdtemp(dir=self.tmp))
        z = schreibe_zip(arbeits / (name or 'bestellung.zip'), dateien)
        out = arbeits / 'out'
        out.mkdir()
        r = imp.verarbeite_zip(z, self.katalog, mapping or self.mapping, out, backend, nur_pruefen, umrechnung)
        return r, out

    def position(self, mod=None, **kw):
        r, out = self.lauf(baue_bestellung(self.katalog, mod), **kw)
        self.assertEqual(r['fehler'], [], r['fehler'])
        p = r['positionen'][0]
        self.assertEqual(p['status'], 'ok', p['fehler'])
        return json.loads((out / p['ordner'] / 'bestellung.json').read_text(encoding='utf-8')), out / p['ordner']

    def fehler_code(self, dateien, **kw):
        r, out = self.lauf(dateien, **kw)
        if r['fehler']:
            return r['fehler'][0]['code']
        self.assertEqual(len(r['positionen']), 1)
        self.assertEqual(r['positionen'][0]['status'], 'fehler', 'erwartet: Fehler')
        return r['positionen'][0]['fehler'][0]['code']


# --------------------------------------------------------------------------------------------------
# Umrechnung
# --------------------------------------------------------------------------------------------------

# Corel-Regel (Standard): 400er Raster, 10 px Rand, ein Maßstab aus der längeren Plattenseite, Platte mittig.
C_S = 220 / 380                          # mm je px bei 220 × 140
C_OX = 10.0
C_OY = (400 - 140 / C_S) / 2             # 79.0909… px


def corel_mm(px, py):
    return (px - C_OX) * C_S, (py - C_OY) * C_S


class TestUmrechnung(unittest.TestCase):
    def test_corel_ecken_und_mitte(self):
        r = imp.Raster({'x': 9, 'y': 73, 'width': 381, 'height': 254}, 220, 140)
        self.assertEqual(r.regel, 'corel')
        x, y = r.punkt(10, C_OY)
        self.assertAlmostEqual(x, 0)
        self.assertAlmostEqual(y, 0)
        x, y = r.punkt(390, 400 - C_OY)
        self.assertAlmostEqual(x, 220)
        self.assertAlmostEqual(y, 140)
        x, y = r.punkt(200, 200)
        self.assertAlmostEqual(x, 110)
        self.assertAlmostEqual(y, 70)

    def test_corel_ein_massstab_hochformat(self):
        r = imp.Raster({'x': 0, 'y': 0, 'width': 400, 'height': 400}, 140, 220)
        self.assertAlmostEqual(r.sx, r.sy)
        self.assertAlmostEqual(r.sx, 220 / 380)
        self.assertAlmostEqual(r.punkt(200, 10)[1], 0)

    def test_corel_foto_wie_im_paritaetslauf(self):
        # Paritätslauf 20.10.2026: Pythons alte Fotobox (Druckbereich-Regel) in Corel-mm umgerechnet = Corel-Ergebnis.
        alt = imp.Raster({'x': 9, 'y': 73, 'width': 381, 'height': 254}, 220, 140, 'druckbereich')
        neu = imp.Raster({'x': 9, 'y': 73, 'width': 381, 'height': 254}, 220, 140)
        px0 = (9 + 10.1723 * 381 / 220, 73 + 8.6165 * 254 / 140)
        px1 = (9 + 99.2372 * 381 / 220, 73 + 133.0234 * 254 / 140)
        self.assertAlmostEqual(alt.punkt(*px0)[0], 10.1723, places=3)
        x0, y0 = neu.punkt(*px0)
        x1, y1 = neu.punkt(*px1)
        for ist, soll in zip((x0, y0, x1 - x0, y1 - y0), (9.62, 5.52, 89.30, 130.67)):
            self.assertAlmostEqual(ist, soll, delta=0.02)

    def test_unbekannte_regel(self):
        with self.assertRaises(ValueError):
            imp.Raster({'x': 9, 'y': 73, 'width': 381, 'height': 254}, 220, 140, 'frei')

    def test_raster_ecken_und_mitte(self):
        r = imp.Raster({'x': 9, 'y': 73, 'width': 381, 'height': 254}, 220, 140, 'druckbereich')
        self.assertEqual(r.punkt(9, 73), (0, 0))
        x, y = r.punkt(390, 327)
        self.assertAlmostEqual(x, 220)
        self.assertAlmostEqual(y, 140)
        x, y = r.punkt(9 + 190.5, 73 + 127)
        self.assertAlmostEqual(x, 110)
        self.assertAlmostEqual(y, 70)

    def test_getrennte_massstaebe_bei_unterschiedlichem_seitenverhaeltnis(self):
        r = imp.Raster({'x': 9, 'y': 73, 'width': 381, 'height': 254}, 220, 140, 'druckbereich')
        self.assertAlmostEqual(r.sx, 220 / 381)
        self.assertAlmostEqual(r.sy, 140 / 254)
        self.assertNotAlmostEqual(r.sx, r.sy, places=2)

    def test_raster_bei_30x20_ist_massgleich(self):
        r = imp.Raster({'x': 9, 'y': 73, 'width': 381, 'height': 254}, 300, 200, 'druckbereich')
        self.assertAlmostEqual(r.sx / r.sy, 1.0, places=2)

    def test_matrizen(self):
        m = imp.mat_mul((2, 0, 0, 3, 10, 20), (1, 0, 0, 1, 5, 5))
        self.assertEqual(imp.mat_pt(m, 0, 0), (20, 35))
        self.assertEqual(imp.parse_transform('matrix(1 0 0 1 200 200.5)'), (1, 0, 0, 1, 200, 200.5))
        self.assertEqual(imp.parse_transform('translate(3 4) scale(2)'), (2, 0, 0, 2, 3, 4))
        with self.assertRaises(imp.PositionsFehler):
            imp.parse_transform('skewX(20)')

    def test_cent(self):
        self.assertEqual(imp.cent(11.89), 1189)
        self.assertEqual(imp.cent(0), 0)
        self.assertEqual(imp.cent('2.995'), 300)


# --------------------------------------------------------------------------------------------------
# Schrift und Ausrichtung
# --------------------------------------------------------------------------------------------------

class TestSchrift(Basis):
    def test_vorschub_kerning_und_ligatur(self):
        s = self.katalog.schrift('Great Vibes', {})[1]
        self.assertEqual(s.breite(s.formen('Mu')), 1200)
        self.assertEqual(s.breite(s.formen('VA')), 600 + 600 - 80)            # Kerning V+A
        self.assertEqual(s.breite(s.formen('AV')), 1200)                       # nur dieses Paar ist gekernt
        self.assertEqual([g for g, _ in s.formen('fi')], ['f_i'])              # Ligatur
        self.assertEqual(s.breite(s.formen('fi')), 700)
        self.assertEqual(s.breite(s.formen('a ')), 600 + 250)                  # Leerzeichen am Zeilenende zählt (wie Fabric)

    def test_fehlendes_zeichen(self):
        s = self.katalog.schrift('Great Vibes', {})[1]
        with self.assertRaises(imp.PositionsFehler) as e:
            s.formen('A\u2603')
        self.assertEqual(e.exception.code, 'glyph_missing')

    def test_schrift_exakter_name_und_alias(self):
        self.assertEqual(self.katalog.schrift('Great Vibes', {})[0], 'Great Vibes')
        self.assertEqual(self.katalog.schrift('GREAT-VIBES', {'GREAT-VIBES': 'Great Vibes'})[0], 'Great Vibes')
        self.assertEqual(self.katalog.schrift('great vibes', {'GREAT VIBES': 'Great Vibes'})[0], 'Great Vibes')

    def test_schrift_unbekannt_ohne_stillen_ersatz(self):
        for wunsch, aliase in (('Great  Vibes', {}), ('Nicht da', {}), ('Alias', {'Alias': 'Nicht da'}), ('Minimalist', {}), ('Fehlt', {})):
            with self.assertRaises(imp.PositionsFehler) as e:
                self.katalog.schrift(wunsch, aliase)
            self.assertEqual(e.exception.code, 'font_unknown', wunsch)

    def test_ausrichtung_aus_tspan_kanten(self):
        breiten = [100.0, 60.0, 80.0]
        gr = 20.0
        self.assertEqual(imp.bestimme_ausrichtung([-50, -30, -40], breiten, 100, gr)[0], 'center')
        self.assertEqual(imp.bestimme_ausrichtung([-50, -50, -50], breiten, 100, gr)[0], 'left')
        self.assertEqual(imp.bestimme_ausrichtung([-50, -10, -30], breiten, 100, gr)[0], 'right')
        # einzeilig: alle drei Varianten fallen zusammen -> zentriert
        self.assertEqual(imp.bestimme_ausrichtung([-50], [100.0], 100, gr)[0], 'center')

    def test_zeilenumbrueche(self):
        self.assertEqual(imp.normalisiere_text('a \r\nb\nc'), ['a ', 'b', 'c'])
        self.assertEqual(imp.normalisiere_text('x\ty'), ['x y'])
        self.assertEqual(imp.normalisiere_text('ein'), ['ein'])


# --------------------------------------------------------------------------------------------------
# Gesamtlauf mit Fixture
# --------------------------------------------------------------------------------------------------

class TestAusgabe(Basis):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.dateien = baue_bestellung(cls.katalog)
        arbeits = cls.tmp / 'voll'
        arbeits.mkdir()
        cls.zip = schreibe_zip(arbeits / 'fixture.zip', cls.dateien)
        cls.out = arbeits / 'out'
        cls.ergebnis = imp.verarbeite_zip(cls.zip, cls.katalog, cls.mapping, cls.out, 'auto', False)
        cls.ordner = cls.out / ORDNER
        cls.best = json.loads((cls.ordner / 'bestellung.json').read_text(encoding='utf-8'))
        cls.summary = json.loads((cls.ordner / 'summary.json').read_text(encoding='utf-8'))

    def test_lauf_ohne_fehler(self):
        self.assertEqual(self.ergebnis['fehler'], [])
        self.assertEqual(self.ergebnis['positionen'][0]['status'], 'ok')
        self.assertEqual(self.ergebnis['positionen'][0]['ordner'], ORDNER)

    def test_dateien_vorhanden(self):
        for n in ('bestellung.json', 'gravur.svg', 'gravur.pdf', 'kontur.pdf', 'summary.pdf', 'summary.json', 'foto-1.jpg'):
            self.assertTrue((self.ordner / n).is_file(), n)

    def test_schema_bestellung(self):
        b = self.best
        self.assertEqual(b['schema'], 'gravuru-order/v1')
        self.assertEqual(b['source'], 'amazon-custom')
        for k in ('orderId', 'orderItemId', 'asin', 'sku', 'familyId', 'sizeKey', 'designId', 'fields', 'mounting', 'options', 'note', 'warnings', 'sourceSha256'):
            self.assertIn(k, b)
        self.assertEqual((b['orderId'], b['orderItemId'], b['asin'], b['sku']), (fix.FIX_ORDER_ID, ITEM, 'B013T1VRKS', 'Boxenschild2443'))
        self.assertIs(b['productionReady'], False)
        self.assertEqual(b['designId'], 'GT-gravur-rechteck-D201')
        self.assertEqual([f['id'] for f in b['fields']], ['text-1', 'text-2', 'text-3', 'foto-1'])
        for f in b['fields']:
            if f['type'] == 'text':
                for k in ('text', 'font', 'sizeMm', 'x', 'y', 'align', 'lines'):
                    self.assertIn(k, f)
            else:
                for k in ('file', 'cropMm', 'scale', 'rotation'):
                    self.assertIn(k, f)
        self.assertEqual(set(b['sourceSha256']), {f'{ITEM}.json', f'{ITEM}.xml', SVG, FOTO, VORSCHAU})
        self.assertTrue(all(len(v) == 64 for v in b['sourceSha256'].values()))
        self.assertEqual(b['sourceSha256'][FOTO], imp.sha256((FIXTURE / FOTO).read_bytes()))

    def test_schema_summary(self):
        s = self.summary
        self.assertEqual(s['schema'], 'gravuru-amazon-summary/v1')
        self.assertIs(s['productionReady'], False)
        self.assertEqual(s['errors'], [])
        self.assertEqual(s['aufpreisSummeCent'], 1189)
        self.assertEqual(s['fields'], self.best['fields'])
        self.assertEqual(set(s['files']), {'gravur.svg', 'foto-1.jpg', 'gravur.pdf', 'kontur.pdf', 'summary.pdf', 'bestellung.json'})
        for n, h in s['files'].items():
            if n not in ('summary.json',):
                self.assertEqual(imp.sha256((self.ordner / n).read_bytes()), h, n)

    def test_platzhalterfamilie_und_massangaben(self):
        b = self.best
        self.assertEqual(b['familyId'], 'gedenktafel-22x14-schiefer-natur')
        self.assertEqual(b['familyStatus'], 'platzhalter')
        self.assertEqual((b['plate']['widthMm'], b['plate']['heightMm'], b['plate']['marginMm'], b['plate']['shape']), (220, 140, 10, 'rect'))
        codes = [w['code'] for w in b['warnings']]
        for c in ('familie_platzhalter', 'seitenverhaeltnis'):
            self.assertIn(c, codes)
        # D201 ist seit 19.10.2026 aus den Corel-CDRs berechnet, nicht mehr geschätzt; Proportion passt zum Katalogmotiv.
        self.assertNotIn('overlay_geschaetzt', codes)
        self.assertNotIn('motivproportion', codes)
        self.assertNotIn('schriftbreite', codes)
        self.assertNotIn('ausrichtung_unsicher', codes)

    def test_schriftgroesse_mm(self):
        # Schriftgröße = font-size · scale · (mm je px der Corel-Regel)
        erwartet = 203.56028368794327 * 0.25886728338014503 * C_S
        f = {x['id']: x for x in self.best['fields']}
        self.assertAlmostEqual(f['text-1']['sizeMm'], erwartet, places=3)
        self.assertAlmostEqual(f['text-2']['sizeMm'], 203.56028368794327 * 0.10100797795269684 * C_S, places=3)
        self.assertAlmostEqual(f['text-3']['sizeMm'], 203.56028368794327 * 0.08384680212650573 * C_S, places=3)

    def test_schriftgroesse_wie_corel_im_paritaetslauf(self):
        # Corel setzte im Referenzfall 86,5 / 33,5 / 28 pt (gerundet auf 0,5 pt); die Fixture hat dasselbe Layout.
        f = {x['id']: x for x in self.best['fields']}
        for fid, pt in (('text-1', 86.5), ('text-2', 33.5), ('text-3', 28.0)):
            self.assertEqual(round(f[fid]['sizeMm'] / 25.4 * 72 * 2) / 2, pt, fid)

    def test_textlage_mitte_in_mm(self):
        # Mittelpunkt der Textbox (px 281.74 / 117.77) mit der Corel-Regel -> mm
        f = {x['id']: x for x in self.best['fields']}
        x, y = corel_mm(281.74085808, 117.76829851)
        self.assertAlmostEqual(f['text-1']['boxMm'][0], x, places=3)
        self.assertAlmostEqual(f['text-1']['boxMm'][1], y, places=3)
        self.assertEqual(f['text-1']['align'], 'center')

    def test_zeilen_und_ausrichtung(self):
        f = {x['id']: x for x in self.best['fields']}
        self.assertEqual(len(f['text-3']['lines']), 4)
        self.assertEqual(f['text-3']['lines'][0], 'Ruhige, würdige Gestaltung. ')          # Leerzeichen am Ende bleibt
        self.assertEqual(f['text-3']['lines'][3], 'Motive dezent.')
        self.assertEqual(f['text-3']['align'], 'center')
        self.assertIsNotNone(f['text-3']['lineHeightMm'])
        self.assertIsNone(f['text-1']['lineHeightMm'])
        # y-Abstand der Zeilen = Fabric-Zeilenabstand in mm
        self.assertAlmostEqual(f['text-3']['lineHeightMm'], 203.56028368794327 * 1.13 * 1.16 * 0.08384680212650573 * C_S, places=2)

    def test_foto_unveraendert_und_lage(self):
        self.assertEqual((self.ordner / 'foto-1.jpg').read_bytes(), (FIXTURE / FOTO).read_bytes())
        fo = next(f for f in self.best['fields'] if f['type'] == 'photo')
        self.assertEqual(fo['pixels'], [1118, 1636])
        # Mittelpunkt (103.74, 201.49) px -> mm, Größe 154.25 × 225.7 px -> mm, ein Maßstab: Foto unverzerrt
        cx, cy = corel_mm(103.73865314, 201.48758671)
        self.assertAlmostEqual(fo['centerMm'][0], cx, places=3)
        self.assertAlmostEqual(fo['centerMm'][1], cy, places=3)
        self.assertAlmostEqual(fo['sizeMm'][0], 1118 * 0.13796435 * C_S, places=2)
        self.assertAlmostEqual(fo['sizeMm'][1], 1636 * 0.13796435 * C_S, places=2)
        self.assertAlmostEqual(fo['scale']['x'], fo['scale']['y'], places=5)
        self.assertEqual(fo['rotation'], 0)
        # Paritätslauf 20.10.2026: Corel-Fotorahmen 9,62 / 5,52 mm, 89,30 × 130,67 mm (Fixture hat dasselbe Layout)
        x0, y0, x1, y1 = fo['cropMm']
        for ist, soll in zip((x0, y0, x1 - x0, y1 - y0), (9.62, 5.52, 89.30, 130.67)):
            self.assertAlmostEqual(ist, soll, delta=0.03)
        cl = fo['clipMm']
        self.assertTrue(cl[0] >= 0 and cl[1] >= 0 and cl[2] <= 220 and cl[3] <= 140, cl)

    def test_motiv_aus_katalog_in_amazon_box(self):
        m = self.best['design']
        self.assertEqual(m['designNo'], 201)
        soll = json.loads((MAPPING / 'design-overlays.json').read_text(encoding='utf-8'))['gedenktafeln']['201']
        self.assertEqual(m['bbox400'], soll['bbox400'])
        # Corel lädt die 22×14-Vorlage: Motiv steht dort, nicht in der Konfigurator-Box (Paritätslauf 20.10.2026)
        self.assertEqual(m['boxMm'], soll['vorlageMm']['220x140']['boxMm'])
        self.assertTrue(m['lagequelle'].endswith('GT-S-22x14-D201.cdr'))
        bx, by, bw, bh = m['boxMm']
        kx, ky = corel_mm(soll['bbox400'][0], soll['bbox400'][1])
        self.assertAlmostEqual(m['konfiBoxMm'][0], kx, places=2)
        self.assertAlmostEqual(m['konfiBoxMm'][2], soll['bbox400'][2] * C_S, places=2)
        self.assertIn('motiv_versatz', [w['code'] for w in self.best['warnings']])
        # proportional eingepasst: Motiv 30,55 × 24,41 mm, begrenzt durch die Höhe
        self.assertAlmostEqual(m['groesseMm'][0] / m['groesseMm'][1], 30.55 / 24.41, places=3)
        self.assertLessEqual(m['groesseMm'][0], bw + 1e-6)
        self.assertLessEqual(m['groesseMm'][1], bh + 1e-6)

    def test_geschaetzte_motivlage_warnt(self):
        tmp = Path(tempfile.mkdtemp(dir=self.tmp))
        for n in ('asin-mapping.json', 'font-aliases.json'):
            shutil.copy(MAPPING / n, tmp / n)
        (tmp / 'design-overlays.json').write_text(json.dumps({'gedenktafeln': {'201': {'bbox400': [268, 188, 39, 30], 'quelle': 'geschätzt (Test)'}}}), encoding='utf-8')
        r, out = self.lauf(baue_bestellung(self.katalog), mapping=imp.Mapping(tmp))
        p = r['positionen'][0]
        self.assertEqual(p['status'], 'ok', p['fehler'])
        b = json.loads((out / p['ordner'] / 'bestellung.json').read_text(encoding='utf-8'))
        codes = [w['code'] for w in b['warnings']]
        self.assertIn('overlay_geschaetzt', codes)
        self.assertIn('motiv_ohne_vorlage', codes)          # keine Vorlagenlage, Konfigurator-Bild 1,50 ≠ Platte 1,57
        self.assertNotIn('motiv_versatz', codes)

    def test_seitenverhaeltnis_meldet_corel_und_ueberstand(self):
        w = next(x for x in self.best['warnings'] if x['code'] == 'seitenverhaeltnis')
        self.assertIn('wie Corel', w['text'])
        self.assertIn('3.5 mm', w['text'])                  # (79,09 − 73) px × 220/380 = 3,5 mm über die Platte
        s = json.loads((self.ordner / 'summary.json').read_text(encoding='utf-8'))
        self.assertEqual(s['umrechnung'], 'corel')

    def test_alte_regel_druckbereich_bleibt_waehlbar(self):
        r, out = self.lauf(baue_bestellung(self.katalog), umrechnung='druckbereich')
        p = r['positionen'][0]
        self.assertEqual(p['status'], 'ok', p['fehler'])
        b = json.loads((out / p['ordner'] / 'bestellung.json').read_text(encoding='utf-8'))
        s = json.loads((out / p['ordner'] / 'summary.json').read_text(encoding='utf-8'))
        self.assertEqual(s['umrechnung'], 'druckbereich')
        f = {x['id']: x for x in b['fields']}
        self.assertAlmostEqual(f['text-1']['sizeMm'], 203.56028368794327 * 0.25886728338014503 * 140 / 254, places=3)
        codes = [w['code'] for w in b['warnings']]
        self.assertNotIn('motiv_versatz', codes)              # Vorlagenlage gilt nur für die Corel-Regel
        self.assertAlmostEqual(b['design']['boxMm'][0], (b['design']['bbox400'][0] - 9) * 220 / 381, places=2)

    def test_svg_ebenen(self):
        import xml.etree.ElementTree as ET
        svg = (self.ordner / 'gravur.svg').read_text(encoding='utf-8')
        wurzel = ET.fromstring(svg)
        self.assertEqual(wurzel.get('viewBox'), '0 0 220 140')
        self.assertEqual((wurzel.get('width'), wurzel.get('height')), ('220mm', '140mm'))
        ids = {el.get('id'): el for el in wurzel.iter() if el.get('id')}
        self.assertEqual(ids['platte'].get('data-role'), 'guide')
        self.assertEqual(ids['bohrungen'].get('data-role'), 'cut')
        for n in ('motiv-2', 'foto-1', 'text-1', 'text-2', 'text-3'):
            self.assertEqual(ids[n].get('data-role'), 'engrave', n)
        self.assertNotIn('motiv-1', ids)                        # unsichtbare Ebene (fill none, stroke none) wird nicht übernommen
        self.assertNotIn('hinweis-4', ids)
        # Texte nur als Pfade, nie als Schrift
        self.assertNotIn('<text', svg)
        self.assertNotIn('font-family', svg)
        # Gravur schwarz, kein Weiß in Druckebenen, keine Guides in Druckebenen
        for n in ('motiv-2', 'text-1', 'text-2', 'text-3'):
            el = ids[n]
            fills = [e.get('fill') for e in el.iter() if e.get('fill')]
            self.assertTrue(fills and all(f == '#000000' for f in fills), (n, fills))
        for n in ('foto-1', 'motiv-2', 'text-1', 'text-2', 'text-3'):
            for e in ids[n].iter():
                self.assertNotIn(e.get('fill', '').lower(), ('#fff', '#ffffff', 'white'))
                self.assertNotIn(e.get('stroke', ''), ('#999999',))
        # Foto: Originaldatei per Verweis, beschnitten
        img = next(ids['foto-1'].iter('{http://www.w3.org/2000/svg}image'))
        self.assertEqual(img.get('{http://www.w3.org/1999/xlink}href'), 'foto-1.jpg')
        self.assertTrue(ids['foto-1'].get('clip-path', '').startswith('url(#clip-foto-1)'))
        # Reihenfolge wie bei Amazon: Foto, Motiv, Texte; Hilfslinie zuerst
        reihenfolge = [el.get('id') for el in wurzel if el.get('id')]
        self.assertEqual(reihenfolge, ['platte', 'bohrungen', 'foto-1', 'motiv-2', 'text-1', 'text-2', 'text-3'])

    def test_pdf_masse_und_inhalt(self):
        import pymupdf
        k = 72 / 25.4
        for n in ('gravur.pdf', 'kontur.pdf'):
            d = pymupdf.open(self.ordner / n)
            self.assertEqual(len(d), 1)
            self.assertAlmostEqual(d[0].rect.width, 220 * k, delta=0.05, msg=n)
            self.assertAlmostEqual(d[0].rect.height, 140 * k, delta=0.05, msg=n)
            self.assertEqual(d[0].get_fonts(), [], f'{n}: Text muss in Pfade umgewandelt sein')
        g = pymupdf.open(self.ordner / 'gravur.pdf')
        self.assertEqual(len(g[0].get_images()), 1)
        self.assertGreater(len(g[0].get_drawings()), 3)
        ko = pymupdf.open(self.ordner / 'kontur.pdf')
        self.assertEqual(len(ko[0].get_images()), 0)
        self.assertEqual(len(ko[0].get_drawings()), 1)          # nur Außenkontur (Acrylständer: keine Bohrungen)

    def test_gravur_pdf_hat_keine_hilfs_oder_schnittebene(self):
        import pymupdf
        pix = pymupdf.open(self.ordner / 'gravur.pdf')[0].get_pixmap(dpi=40, colorspace=pymupdf.csGRAY)
        # Die Plattenkontur (Hilfslinie) darf nicht in der Gravurdatei stehen: Seitenrand bleibt weiß
        w, h = pix.width, pix.height
        rand = [pix.pixel(x, 0)[0] for x in range(w)] + [pix.pixel(x, h - 1)[0] for x in range(w)] + [pix.pixel(0, y)[0] for y in range(h)]
        self.assertGreater(min(rand), 240)

    def test_summary_pdf_eine_seite(self):
        import pymupdf
        d = pymupdf.open(self.ordner / 'summary.pdf')
        self.assertEqual(len(d), 1)
        text = d[0].get_text()
        for s in (fix.FIX_ORDER_ID, ITEM, 'freigegeben von', 'KEINE PRODUKTIONSFREIGABE', 'text-1', 'foto-1'):
            self.assertIn(s, text)
        self.assertEqual(len(d[0].get_images()), 2)             # Amazon-Vorschau und unsere Vorschau

    def test_nur_pruefen_schreibt_keine_grafik(self):
        r, out = self.lauf(self.dateien, nur_pruefen=True)
        self.assertEqual(sorted(p.name for p in (out / ORDNER).iterdir()), ['bestellung.json', 'summary.json'])

    def test_lauf_ist_deterministisch(self):
        r, out = self.lauf(self.dateien, nur_pruefen=True)
        a = json.loads((out / ORDNER / 'bestellung.json').read_text(encoding='utf-8'))
        self.assertEqual(a['fields'], self.best['fields'])
        self.assertEqual(a['warnings'], self.best['warnings'])

    def test_cli_exit_codes(self):
        arbeits = Path(tempfile.mkdtemp(dir=self.tmp))
        ok = schreibe_zip(arbeits / 'ok.zip', self.dateien)
        kaputt = schreibe_zip(arbeits / 'kaputt.zip', {'unsinn.txt': b'x'})
        def args(ziele, ziel):
            a = ['--katalog', str(self.katalogpfad), '--mapping', str(MAPPING), '--out', str(arbeits / ziel), '--nur-pruefen']
            for z in ziele:
                a += ['--zip', str(z)]
            return a
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(imp.main(args([ok], 'o1')), 0)
            self.assertEqual(imp.main(args([ok, kaputt], 'o2')), 1)
        lauf = json.loads((arbeits / 'o2' / 'import-lauf.json').read_text(encoding='utf-8'))
        self.assertEqual(len(lauf['zips']), 2)                  # die gute Position wird trotz des kaputten ZIP verarbeitet
        self.assertTrue((arbeits / 'o2' / ORDNER / 'bestellung.json').is_file())
        self.assertEqual(lauf['zips'][1]['fehler'][0]['code'], 'json_missing')


# --------------------------------------------------------------------------------------------------
# Design-Erkennung, Optionen, Befestigung
# --------------------------------------------------------------------------------------------------

class TestDesignOptionen(Basis):
    def test_design_nummer_regex(self):
        for text, nr in (('Doppelherz D201', 201), ('Tier D1234', 1234), ('Katze D55 und D201', 201), ('Herz D201 (ohne Freistellung)', 201), ('D100', 100)):
            self.assertEqual(int(imp.DESIGN_NR.findall(text)[-1]), nr, text)
        for text in ('Design Frei', 'XD201', 'D20', 'Doppelherz', 'D12345'):
            self.assertEqual(imp.DESIGN_NR.findall(text), [], text)

    def test_ohne_freistellung_suffix(self):
        b, _ = self.position(lambda d: setze_option(d, 'Designs', 'Doppelherz D201 (ohne Freistellung)'))
        self.assertEqual(b['design']['designNo'], 201)
        self.assertIn('design_ohne_freistellung', [w['code'] for w in b['warnings']])

    def test_design_frei_hat_kein_motiv_und_braucht_keine_kalibrierung(self):
        b, ordner = self.position(lambda d: setze_option(d, 'Designs', 'Design Frei'), nur_pruefen=False)
        self.assertIsNone(b['design'])
        self.assertIsNone(b['designId'])
        self.assertNotIn('motiv-2', (ordner / 'gravur.svg').read_text(encoding='utf-8'))
        self.assertNotIn('overlay_geschaetzt', [w['code'] for w in b['warnings']])

    def test_design_waehlt_gravur_und_form(self):
        k = self.katalog
        self.assertEqual(imp.waehle_design(k.designs('gedenktafeln'), 300, 'rect', 'x')['key'], 'gravur-rechteck-D300')
        with self.assertRaises(imp.PositionsFehler) as e:
            imp.waehle_design(k.designs('gedenktafeln'), 400, 'ellipse', 'x')          # zwei Gravur-Designs, keins „Rund“
        self.assertEqual(e.exception.code, 'design_unknown')

    def test_bohrungen_zwei_loecher_auf_30x20(self):
        def mod(d):
            setze_option(d, 'Größe', 'ca. 30x20 cm (Bestseller)')
            setze_option(d, 'var_befestigung', '2 Bohrlöcher')
        b, ordner = self.position(mod, nur_pruefen=False)
        self.assertEqual(b['familyStatus'], 'katalog')
        self.assertEqual(b['sizeKey'], 'GT-SN-RE-300X200')
        self.assertEqual((b['plate']['widthMm'], b['plate']['heightMm']), (300, 200))
        self.assertNotIn('familie_platzhalter', [w['code'] for w in b['warnings']])
        self.assertEqual(b['mounting']['ruleId'], 'B02-E12-D5')
        self.assertEqual([(h['x'], h['y'], h['diameter']) for h in b['mounting']['holes']], [(12, 100, 5), (288, 100, 5)])
        svg = (ordner / 'gravur.svg').read_text(encoding='utf-8')
        self.assertEqual(svg.count('<circle'), 2)
        import pymupdf
        ko = pymupdf.open(ordner / 'kontur.pdf')
        self.assertEqual(len(ko[0].get_drawings()), 3)                   # Kontur + 2 Bohrungen
        self.assertAlmostEqual(ko[0].rect.width, 300 * 72 / 25.4, delta=0.05)

    def test_bohrungen_vier_ecken(self):
        def mod(d):
            setze_option(d, 'Größe', 'ca. 30x20 cm (Bestseller)')
            setze_option(d, 'var_befestigung', '4 Bohrlöcher')
        b, _ = self.position(mod)
        self.assertEqual(sorted((h['x'], h['y']) for h in b['mounting']['holes']), [(12, 12), (12, 188), (288, 12), (288, 188)])

    def test_bohrbild_regel_gleich_wie_im_modell(self):
        """Gleiche Geometrie wie app/platform/.../mounting-rules.mjs (keine zweite Geometrielogik)."""
        if not shutil.which('node'):
            self.skipTest('node nicht verfügbar')
        regeln = {'left-right': 2, 'top-bottom': 2, 'corners': 4, 'top-center': 1}
        js = ("import {holesFor} from './app/platform/sources/app/shared/models/mounting-rules.mjs';"
              "const out={};for(const [l,c] of Object.entries(%s)){out[l]=holesFor({width:300,height:200,shape:'rect',cornerRadiusMm:0},{layout:l,count:c,diameterMm:5,edgeMm:12});}"
              "console.log(JSON.stringify(out));" % json.dumps(regeln))
        p = subprocess.run(['node', '--input-type=module', '-e', js], cwd=REPO, capture_output=True, text=True)
        if p.returncode != 0:
            self.skipTest('node konnte das Modell nicht laden: ' + p.stderr[:200])
        erwartet = json.loads(p.stdout)
        for layout, count in regeln.items():
            ist = imp.bohrungen_fuer(300, 200, 'rect', {'id': 'x', 'layout': layout, 'count': count, 'diameterMm': 5, 'edgeMm': 12})
            self.assertEqual(ist, erwartet[layout], layout)

    def test_bohrloecher_auf_platzhalter_ohne_regel_warnen(self):
        b, _ = self.position(lambda d: setze_option(d, 'var_befestigung', '2 Bohrlöcher'))
        self.assertEqual(b['mounting']['holes'], [])
        self.assertIn('bohrbild_offen', [w['code'] for w in b['warnings']])

    def test_unbekannte_optionen_warnen_nur(self):
        def mod(d):
            setze_option(d, 'var_befestigung', 'Wandhalterung Gold')
            setze_option(d, 'Zusätzliches Imprägnierspray (60 ml Sprühflasche)', 'Imprägnierspray 60 ml')
        b, _ = self.position(mod)
        codes = [w['code'] for w in b['warnings']]
        self.assertIn('befestigung_unbekannt', codes)
        self.assertIn('option_unbekannt', codes)
        self.assertEqual(b['mounting']['holes'], [])

    def test_anmerkung_wird_markiert(self):
        def mod(d):
            for a in d['customizationInfo']['version3.0']['surfaces'][0]['areas']:
                if a.get('label') == 'Anmerkung':
                    a['text'] = 'bitte Foto aufhellen'

            def gehe(n):
                if n.get('type') == 'TextCustomization' and n.get('label') == 'Anmerkung':
                    n['inputValue'] = 'bitte Foto aufhellen'
                for c in n.get('children', []) or []:
                    gehe(c)
            gehe(d['customizationData'])
        b, _ = self.position(mod)
        self.assertEqual(b['note'], 'bitte Foto aufhellen')
        self.assertIn('anmerkung', [w['code'] for w in b['warnings']])

    def test_gedrehter_text_und_foto(self):
        """Drehung wird aus der Fabric-Matrix gelesen und um die Textmitte angewendet."""
        dateien = baue_bestellung(self.katalog)
        svg = dateien[SVG].decode('utf-8')
        c, s = math.cos(math.radians(10)), math.sin(math.radians(10))
        alt = 'matrix(0.25886728 0.0 0.0 0.25886728 281.74085808 117.76829851)'
        self.assertIn(alt, svg)
        dateien[SVG] = svg.replace(alt, f'matrix({0.25886728 * c} {0.25886728 * s} {-0.25886728 * s} {0.25886728 * c} 281.74085808 117.76829851)').encode('utf-8')
        r, out = self.lauf(dateien, nur_pruefen=False)
        self.assertEqual(r['positionen'][0]['status'], 'ok', r)
        b = json.loads((out / ORDNER / 'bestellung.json').read_text(encoding='utf-8'))
        t1 = next(f for f in b['fields'] if f['id'] == 'text-1')
        self.assertAlmostEqual(t1['rotation'], 10, places=3)
        self.assertIn('rotate(10', (out / ORDNER / 'gravur.svg').read_text(encoding='utf-8'))


# --------------------------------------------------------------------------------------------------
# Fehlerfälle
# --------------------------------------------------------------------------------------------------

class TestFehler(Basis):
    def test_asin_unknown(self):
        def mod(d):
            d['asin'] = 'B000000000'
        self.assertEqual(self.fehler_code(baue_bestellung(self.katalog, mod)), 'asin_unknown')

    def test_size_unknown_option_ohne_familie(self):
        self.assertEqual(self.fehler_code(baue_bestellung(self.katalog, lambda d: setze_option(d, 'Größe', 'ca. 99x99 cm'))), 'size_unknown')

    def test_size_unknown_ohne_groessenoption(self):
        def mod(d):
            for o in optionen(d, 'Größe'):
                o['name'] = 'Nichtgröße'
        self.assertEqual(self.fehler_code(baue_bestellung(self.katalog, mod)), 'size_unknown')

    def test_masse_nie_aus_optionstext(self):
        """„ca. 22x14 cm“ wird nicht geparst: ohne Mapping-Eintrag Fehler, auch wenn der Text Maße enthält."""
        r, _ = self.lauf(baue_bestellung(self.katalog, lambda d: setze_option(d, 'Größe', 'ca. 21x15 cm')))
        self.assertEqual(r['positionen'][0]['fehler'][0]['code'], 'size_unknown')

    def test_family_unknown(self):
        mp = imp.Mapping(MAPPING)
        mp.asin = json.loads(json.dumps(mp.asin))
        mp.asin['B013T1VRKS']['placeholderGeometry'] = {}
        self.assertEqual(self.fehler_code(baue_bestellung(self.katalog), mapping=mp), 'family_unknown')

    def test_design_unknown(self):
        for wert in ('Doppelherz D999', 'Doppelherz'):
            self.assertEqual(self.fehler_code(baue_bestellung(self.katalog, lambda d, w=wert: setze_option(d, 'Designs', w))), 'design_unknown', wert)

    def test_overlay_unknown(self):
        self.assertEqual(self.fehler_code(baue_bestellung(self.katalog, lambda d: setze_option(d, 'Designs', 'Test D300'))), 'overlay_unknown')

    def test_font_unknown(self):
        def mod(d):
            def gehe(n):
                if n.get('type') == 'FontCustomization':
                    n['fontSelection']['family'] = 'Unbekannte Schrift'
                for c in n.get('children', []) or []:
                    gehe(c)
            gehe(d['customizationData'])
        self.assertEqual(self.fehler_code(baue_bestellung(self.katalog, mod)), 'font_unknown')

    def test_photo_missing(self):
        d = baue_bestellung(self.katalog)
        del d[FOTO]
        self.assertEqual(self.fehler_code(d), 'photo_missing')

    def test_photo_kein_jpeg(self):
        d = baue_bestellung(self.katalog)
        d[FOTO] = b'kein bild'
        self.assertEqual(self.fehler_code(d), 'photo_missing')

    def test_layout_missing_ohne_svg(self):
        d = baue_bestellung(self.katalog)
        del d[SVG]
        self.assertEqual(self.fehler_code(d), 'layout_missing')

    def test_layout_missing_textzahl(self):
        d = baue_bestellung(self.katalog)
        s = d[SVG].decode('utf-8')
        a = s.index('<g style="" clip-path="url(#CLIPPATH_24)"')
        d[SVG] = (s[:a] + '</svg>\n').encode('utf-8')
        self.assertEqual(self.fehler_code(d), 'layout_missing')

    def test_svg_invalid(self):
        d = baue_bestellung(self.katalog)
        d[SVG] = b'<svg><g></svg>'
        self.assertEqual(self.fehler_code(d), 'svg_invalid')
        d[SVG] = b'<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/>'
        self.assertEqual(self.fehler_code(d), 'svg_invalid')

    def test_json_invalid_und_missing(self):
        d = baue_bestellung(self.katalog)
        d[f'{ITEM}.json'] = b'{kein json'
        self.assertEqual(self.fehler_code(d), 'json_invalid')
        d = {SVG: baue_bestellung(self.katalog)[SVG]}
        self.assertEqual(self.fehler_code(d), 'json_missing')

    def test_order_id_nur_sichere_zeichen(self):
        def mod(d):
            d['orderId'] = '../../etc'
        self.assertEqual(self.fehler_code(baue_bestellung(self.katalog, mod)), 'json_invalid')

    def test_fehler_stoppt_nur_die_position(self):
        arbeits = Path(tempfile.mkdtemp(dir=self.tmp))
        gut = schreibe_zip(arbeits / 'gut.zip', baue_bestellung(self.katalog))
        schlecht = baue_bestellung(self.katalog, lambda d: d.__setitem__('asin', 'B000000000'))
        schlecht = schreibe_zip(arbeits / 'schlecht.zip', schlecht)
        out = arbeits / 'out'
        with contextlib.redirect_stdout(io.StringIO()):
            code = imp.main(['--zip', str(schlecht), '--zip', str(gut), '--katalog', str(self.katalogpfad), '--mapping', str(MAPPING), '--out', str(out), '--nur-pruefen'])
        self.assertEqual(code, 1)
        lauf = json.loads((out / 'import-lauf.json').read_text(encoding='utf-8'))
        self.assertEqual([p['status'] for z in lauf['zips'] for p in z['positionen']], ['fehler', 'ok'])
        self.assertEqual(lauf['zips'][0]['positionen'][0]['fehler'][0]['code'], 'asin_unknown')
        self.assertTrue((out / ORDNER / 'fehler.json').is_file() or (out / ORDNER / 'bestellung.json').is_file())

    def test_fehlertexte_deutsch(self):
        r, _ = self.lauf(baue_bestellung(self.katalog, lambda d: d.__setitem__('asin', 'B000000000')))
        text = r['positionen'][0]['fehler'][0]['text']
        self.assertIn('ASIN', text)
        self.assertIn('asin-mapping.json', text)

    def test_text_zu_lang(self):
        def mod(d):
            def gehe(n):
                if n.get('type') == 'TextCustomization' and n.get('inputValue') == 'Muster':
                    n['inputValue'] = 'x' * 2500
                for c in n.get('children', []) or []:
                    gehe(c)
            gehe(d['customizationData'])
        r, _ = self.lauf(baue_bestellung(self.katalog) | {f'{ITEM}.json': json.dumps(self._mit_langem_text(), ensure_ascii=False).encode('utf-8')})
        self.assertEqual(r['positionen'][0]['fehler'][0]['code'], 'json_invalid')

    def _mit_langem_text(self):
        doc = json.loads(baue_bestellung(self.katalog)[f'{ITEM}.json'])
        for p, t in fix.text_platzierungen(doc)[:1]:
            t['inputValue'] = 'x' * 2500
        return doc

    def test_warnung_schriftbreite_bei_abweichender_amazon_box(self):
        d = baue_bestellung(self.katalog)
        doc = json.loads(d[f'{ITEM}.json'])
        for p, t in fix.text_platzierungen(doc)[:1]:
            p['buyerPlacement']['dimension']['width'] *= 1.1
        d[f'{ITEM}.json'] = json.dumps(doc, ensure_ascii=False).encode('utf-8')
        r, out = self.lauf(d)
        b = json.loads((out / r['positionen'][0]['ordner'] / 'bestellung.json').read_text(encoding='utf-8'))
        self.assertIn('schriftbreite', [w['code'] for w in b['warnings']])


# --------------------------------------------------------------------------------------------------
# ZIP-Sicherheit, Netz, XML
# --------------------------------------------------------------------------------------------------

class TestZipSicherheit(Basis):
    def zip_mit(self, eintraege) -> Path:
        arbeits = Path(tempfile.mkdtemp(dir=self.tmp))
        pfad = arbeits / 'x.zip'
        with zipfile.ZipFile(pfad, 'w') as z:
            for e in eintraege:
                if isinstance(e, tuple):
                    z.writestr(e[0], e[1])
                else:
                    z.writestr(e, b'{}')
        return pfad

    def code(self, pfad):
        with self.assertRaises(imp.PositionsFehler) as e:
            imp.lese_zip(pfad)
        return e.exception.code

    def test_pfad_mit_punkt_punkt(self):
        self.assertEqual(self.code(self.zip_mit(['../evil.json'])), 'zip_unsafe')
        self.assertEqual(self.code(self.zip_mit(['a/../../evil.json'])), 'zip_unsafe')

    def test_absoluter_pfad_und_laufwerk(self):
        self.assertEqual(self.code(self.zip_mit(['/etc/passwd.json'])), 'zip_unsafe')
        self.assertEqual(self.code(self.zip_mit(['C:/x.json'])), 'zip_unsafe')
        self.assertEqual(self.code(self.zip_mit(['a\\b.json'])), 'zip_unsafe')

    def test_symlink(self):
        pfad = self.zip_mit([])
        with zipfile.ZipFile(pfad, 'w') as z:
            zi = zipfile.ZipInfo('link.json')
            zi.external_attr = (stat.S_IFLNK | 0o777) << 16
            z.writestr(zi, '/etc/passwd')
        self.assertEqual(self.code(pfad), 'zip_unsafe')

    def test_nur_vier_dateitypen(self):
        pfad = self.zip_mit([('a.json', b'{}'), ('b.exe', b'MZ'), ('c.png', b'x'), ('d.JPG', b'x'), ('e.svg', b'<svg/>'), ('f.xml', b'<a/>'), ('g.py', b'import os')])
        dateien, hinweise = imp.lese_zip(pfad)
        self.assertEqual(sorted(dateien), ['a.json', 'd.JPG', 'e.svg', 'f.xml'])
        self.assertEqual(sorted(h['code'] for h in hinweise), ['datei_ignoriert'] * 3)

    def test_groessenlimit(self):
        alt = imp.MAX_ZIP_BYTES
        try:
            imp.MAX_ZIP_BYTES = 1000
            self.assertEqual(self.code(self.zip_mit([('a.json', b'x' * 2000)])), 'zip_too_large')
            imp.MAX_ZIP_BYTES = 3000
            self.assertEqual(self.code(self.zip_mit([('a.json', b'x' * 2000), ('b.json', b'y' * 2000)])), 'zip_too_large')
        finally:
            imp.MAX_ZIP_BYTES = alt
        self.assertEqual(imp.MAX_ZIP_BYTES, 50 * 1024 * 1024)

    def test_zu_viele_eintraege(self):
        alt = imp.MAX_EINTRAEGE
        try:
            imp.MAX_EINTRAEGE = 3
            self.assertEqual(self.code(self.zip_mit([f'{i}.json' for i in range(5)])), 'zip_unsafe')
        finally:
            imp.MAX_EINTRAEGE = alt

    def test_doppelte_namen(self):
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            pfad = self.zip_mit([('a.json', b'1'), ('a.json', b'2')])
        self.assertEqual(self.code(pfad), 'zip_unsafe')

    def test_kein_zip(self):
        arbeits = Path(tempfile.mkdtemp(dir=self.tmp))
        p = arbeits / 'x.zip'
        p.write_bytes(b'kein zip')
        self.assertEqual(self.code(p), 'zip_invalid')
        self.assertEqual(self.code(arbeits / 'fehlt.zip'), 'zip_invalid')

    def test_verschluesselt(self):
        pfad = self.zip_mit([('a.json', b'{}')])
        daten = bytearray(pfad.read_bytes())
        i = daten.find(b'PK\x01\x02')
        daten[i + 8] |= 1                                   # Flag-Bit im zentralen Verzeichnis
        pfad.write_bytes(bytes(daten))
        self.assertEqual(self.code(pfad), 'zip_invalid')

    def test_kein_netzzugriff(self):
        """Overlay-PNG und Font-URLs in den Bestelldaten werden nie geladen."""
        def verboten(*a, **k):
            raise AssertionError('Netzzugriff versucht')
        alt = (socket.socket.connect, socket.create_connection, socket.getaddrinfo)
        socket.socket.connect = verboten
        socket.create_connection = verboten
        socket.getaddrinfo = verboten
        try:
            dateien = baue_bestellung(self.katalog)
            self.assertIn(b'https://example.invalid', dateien[SVG])
            self.assertIn(b'https://example.invalid', dateien[f'{ITEM}.json'])
            r, out = self.lauf(dateien, nur_pruefen=False)
        finally:
            socket.socket.connect, socket.create_connection, socket.getaddrinfo = alt
        self.assertEqual(r['positionen'][0]['status'], 'ok')

    def test_quelltext_ohne_netzbibliotheken(self):
        quelle = (HIER / 'import-amazon-order.py').read_text(encoding='utf-8')
        for verboten in ('import requests', 'import urllib', 'from urllib', 'import socket', 'http.client', 'import httpx', 'urlopen'):
            self.assertNotIn(verboten, quelle, verboten)

    def test_xml_fallback_ergibt_gleiche_positionen(self):
        mit = baue_bestellung(self.katalog)
        ohne_json = {k: v for k, v in mit.items() if k != f'{ITEM}.json'}
        r1, o1 = self.lauf(mit)
        r2, o2 = self.lauf(ohne_json)
        self.assertEqual(r2['positionen'][0]['status'], 'ok', r2)
        b1 = json.loads((o1 / ORDNER / 'bestellung.json').read_text(encoding='utf-8'))
        b2 = json.loads((o2 / ORDNER / 'bestellung.json').read_text(encoding='utf-8'))
        self.assertEqual(b1['fields'], b2['fields'])
        self.assertEqual(b1['options'], b2['options'])

    def test_xml_mit_doctype_wird_nicht_gelesen(self):
        d = {k: v for k, v in baue_bestellung(self.katalog).items() if k != f'{ITEM}.json'}
        d[f'{ITEM}.xml'] = b'<!DOCTYPE data [<!ENTITY x "y">]><data/>'
        self.assertEqual(self.fehler_code(d), 'json_invalid')

    def test_externe_href_werden_nur_gelesen(self):
        f = imp.parse_fabric(baue_bestellung(self.katalog)[SVG])
        extern = [b for b in f['bilder'] if '://' in b['href']]
        self.assertEqual(len(extern), 1)
        self.assertEqual(len(f['bilder']), 2)
        self.assertEqual(len(f['texte']), 3)


class TestPdfVerfahren(Basis):
    def test_cairo_und_mupdf_liefern_gleiche_seite(self):
        if not imp.cairo_verfuegbar():
            self.skipTest('CairoSVG/libcairo nicht verfügbar')
        import pymupdf
        dateien = baue_bestellung(self.katalog)
        seiten = {}
        for backend in ('cairo', 'mupdf'):
            r, out = self.lauf(dateien, nur_pruefen=False, backend=backend, name=f'{backend}.zip')
            self.assertEqual(r['positionen'][0]['status'], 'ok', (backend, r))
            d = pymupdf.open(out / ORDNER / 'gravur.pdf')
            self.assertAlmostEqual(d[0].rect.width, 220 * 72 / 25.4, delta=0.05)
            pix = d[0].get_pixmap(dpi=60, colorspace=pymupdf.csGRAY)
            seiten[backend] = list(pix.samples)
        diff = sum(abs(a - b) for a, b in zip(seiten['cairo'], seiten['mupdf'])) / len(seiten['cairo'])
        self.assertLess(diff, 3.0, f'mittlere Abweichung {diff:.2f} Graustufen')

    def test_unbekanntes_verfahren(self):
        with self.assertRaises(imp.PositionsFehler) as e:
            imp.pdf_aus_svg('<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm"/>', 10, 10, 'unbekannt')
        self.assertEqual(e.exception.code, 'pdf_backend')


# --------------------------------------------------------------------------------------------------
# Echter Katalog (optional)
# --------------------------------------------------------------------------------------------------

@unittest.skipUnless(finde_echten_katalog(), 'Repo gravuru-katalog nicht gefunden (GRAVURU_KATALOG setzen)')
class TestRealkatalog(unittest.TestCase):
    """Fixture mit den echten Katalogschriften und dem echten Design D201: Layout-Maße der Fixture passen zur Schrift."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp(prefix='amazon-real-'))
        cls.katalogpfad = finde_echten_katalog()
        z = schreibe_zip(cls.tmp / 'fixture.zip', fixture_dateien())
        cls.out = cls.tmp / 'out'
        cls.r = imp.verarbeite_zip(z, imp.Katalog(cls.katalogpfad), imp.Mapping(MAPPING), cls.out, 'auto', True)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_ohne_fehler_und_ohne_breitenwarnung(self):
        self.assertEqual(self.r['fehler'], [])
        p = self.r['positionen'][0]
        self.assertEqual(p['status'], 'ok', p['fehler'])
        codes = [w['code'] for w in p['warnungen']]
        self.assertNotIn('schriftbreite', codes)
        self.assertNotIn('ausrichtung_unsicher', codes)
        self.assertNotIn('shaping_unvollstaendig', codes)

    def test_echtes_design_d201(self):
        b = json.loads((self.out / ORDNER / 'bestellung.json').read_text(encoding='utf-8'))
        self.assertEqual(b['designId'], 'GT-S-30x20-D201')
        self.assertEqual(b['design']['key'], 'gravur-rechteck-D201')
        # Motiv in der Box der 22×14-Vorlage (15,16 mm hoch) auf 24,37 mm Katalogmotiv – wie Corel.
        # Vorher: Konfigurator-Box mit getrennten Maßstäben 0,6982, davor geschätzt 0,6785.
        self.assertAlmostEqual(b['design']['massstab'], 0.6221, places=3)

    def test_fixture_texte_sind_zentriert_und_im_kerning_der_echten_schrift(self):
        schrift = imp.Katalog(self.katalogpfad).schrift('Great Vibes', {})[1]
        self.assertEqual(schrift.breite(schrift.formen('Muster')) > 0, True)
        b = json.loads((self.out / ORDNER / 'bestellung.json').read_text(encoding='utf-8'))
        self.assertEqual([f['align'] for f in b['fields'] if f['type'] == 'text'], ['center'] * 3)


# --------------------------------------------------------------------------------------------------
# Corel-Zuordnung (erzeugt aus der produktiven Corel-Tabelle; nur Spur und Hinweis)
# --------------------------------------------------------------------------------------------------

corel_gen = lade('build_asin_mapping_from_corel', 'build-asin-mapping-from-corel.py')

COREL_CSV = (
    'ASIN;View-Name;Dateipfad;Hinweis (muss nicht ausgefüllt werden);Konfi-Typ;Größe;Design-Nummer;Schablonenpfad;'
    'Konfi-Options-Übersetzungen;Designauswahl verwendung erzwingen;View Sortierung;Produktbild laden;'
    'Breite wie Größenauswahl;automatisches Größenmanagement;Auf Breite skalieren\r\n'
    ';A C H T U N G:\r\n'
    ';GEDENKTAFELN ---------------------------\r\n'
    'B013T1VRKS;;V:\\Produkte\\Gedenktafeln\\Gravur\\Schiefer;;;ja;;;;;;;;;\r\n'
    'B0000COREL;;V:\\Produkte\\Gedenktafeln\\Gravur\\Schiefer\\30x20;Mit Entwurf;;;7;;;;;;;;\r\n'
    '>;;V:\\Produkte\\Gedenktafeln\\Gravur\\Schiefer\\Rückseite;;;;;;;;;;;;\r\n'
    ';TÜRSCHILDER ---------------------------\r\n'
    'B0000COREL;;V:\\Produkte\\Türschilder\\Gravur\\Edelstahl;;;;;;;;;;;;\r\n'
)


class TestCorelZuordnung(Basis):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.csv = cls.tmp / 'corel.csv'
        cls.csv.write_bytes(COREL_CSV.encode('cp1252'))
        cls.mapdir = cls.tmp / 'mapping-mit-corel'
        cls.mapdir.mkdir()
        for n in ('asin-mapping.json', 'font-aliases.json', 'design-overlays.json'):
            shutil.copy(MAPPING / n, cls.mapdir / n)
        with contextlib.redirect_stdout(io.StringIO()):
            corel_gen.main(['--asin-csv', str(cls.csv), '--out', str(cls.mapdir / 'asin-mapping.corel.json')])
        cls.corel = json.loads((cls.mapdir / 'asin-mapping.corel.json').read_text(encoding='utf-8'))
        cls.mapping_corel = imp.Mapping(cls.mapdir)

    def test_generator_erste_zeile_gilt_folgezeilen_zaehlen(self):
        e = self.corel['B0000COREL']
        self.assertEqual(e['abschnitt'], 'GEDENKTAFELN')               # erste Fundstelle, wie Corel
        self.assertEqual(e['dateipfad'], 'V:\\Produkte\\Gedenktafeln\\Gravur\\Schiefer\\30x20')
        self.assertEqual(e['designNummer'], '7')
        self.assertEqual(e['weitereViews'], 1)
        self.assertEqual(len(e['corelDoppelteZeilen']), 1)
        self.assertNotIn('groesseAusOrdner', e)                         # Standardwerte werden nicht geschrieben
        self.assertTrue(self.corel['B013T1VRKS']['groesseAusOrdner'])
        self.assertEqual(self.corel['_quelle']['asins'], 2)
        self.assertEqual(self.corel['_quelle']['schema'], 'gravuru-amazon-corel-mapping/v1')

    def test_handgepflegt_bleibt_unveraendert(self):
        self.assertEqual((self.mapdir / 'asin-mapping.json').read_bytes(), (MAPPING / 'asin-mapping.json').read_bytes())

    def test_ohne_corel_datei_leer(self):
        leer = self.tmp / 'mapping-ohne-corel'
        leer.mkdir(exist_ok=True)
        for n in ('asin-mapping.json', 'font-aliases.json', 'design-overlays.json'):
            shutil.copy(MAPPING / n, leer / n)
        m = imp.Mapping(leer)
        self.assertEqual(m.corel, {})
        self.assertIsNone(m.corel_eintrag('B013T1VRKS'))
        self.assertIsNone(m.corel_eintrag('_quelle'))

    def test_asin_nur_in_corel_meldet_herkunft(self):
        r, _ = self.lauf(baue_bestellung(self.katalog, lambda d: d.__setitem__('asin', 'B0000COREL')), mapping=self.mapping_corel)
        f = r['positionen'][0]['fehler'][0]
        self.assertEqual(f['code'], 'asin_unknown')
        self.assertIn('Corel-Tabelle', f['text'])
        self.assertIn('Gedenktafeln\\Gravur\\Schiefer\\30x20', f['text'])

    def test_spur_nur_in_summary(self):
        r, out = self.lauf(baue_bestellung(self.katalog), mapping=self.mapping_corel)
        p = r['positionen'][0]
        self.assertEqual(p['status'], 'ok', p['fehler'])
        s = json.loads((out / p['ordner'] / 'summary.json').read_text(encoding='utf-8'))
        b = json.loads((out / p['ordner'] / 'bestellung.json').read_text(encoding='utf-8'))
        self.assertEqual(s['corel']['corelZeile'], 4)
        self.assertTrue(s['corel']['pfadRegel'].startswith('V:\\Produkte\\Gedenktafeln\\Gravur\\Schiefer\\22x14*'))
        self.assertTrue(s['corel']['pfadRegel'].endswith('-D201'))
        self.assertNotIn('corel', b)                                     # gravuru-order/v1 bleibt unverändert


# --------------------------------------------------------------------------------------------------
# Motivlagen aus Corel-Design-CDRs (erzeugt; handgepflegt hat Vorrang)
# --------------------------------------------------------------------------------------------------

ov_gen = lade('build_design_overlays_from_corel', 'build-design-overlays-from-corel.py')


def raw_platte_und_motiv(platte_in, motiv_in, foto_in=None, zweites=None):
    """Synthetischer libcdr-Rohtext: rote Platte, schwarze Motive (Rechtecke), optional gelber Fotorahmen."""
    def rect(x0, y0, x1, y1):
        return ('drawPath (svg:d: ((librevenge:path-action: M, svg:x: %.4fin, svg:y: %.4fin), (librevenge:path-action: L, svg:x: %.4fin, svg:y: %.4fin), '
                '(librevenge:path-action: L, svg:x: %.4fin, svg:y: %.4fin), (librevenge:path-action: L, svg:x: %.4fin, svg:y: %.4fin), (librevenge:path-action: Z)))'
                % (x0, y0, x1, y0, x1, y1, x0, y1))
    z = ['startDocument()', '  startPage(svg:height: 8.0in, svg:width: 12.0in)', '    startLayer ()',
         '      setStyle(draw:fill: none, draw:stroke: solid, svg:stroke-color: #ff0000, svg:stroke-width: 0.003in)', '      ' + rect(*platte_in)]
    for m in [motiv_in] + ([zweites] if zweites else []):
        z += ['      setStyle(draw:fill: solid, draw:fill-color: #000000, draw:stroke: none, svg:fill-rule: evenodd)', '      ' + rect(*m)]
    if foto_in:
        z += ['      setStyle(draw:fill: none, draw:stroke: solid, svg:stroke-color: #ffff00, svg:stroke-width: 0.0079in)', '      ' + rect(*foto_in)]
    z += ['    endLayer', '  endPage', 'endDocument']
    return '\n'.join(z)


class TestDesignOverlaysAusCorel(Basis):
    def test_lies_raw_platte_motiv_foto(self):
        g = ov_gen.lies_raw(raw_platte_und_motiv((0.2, 0.2, 12.0, 8.0), (8.0, 3.5, 9.2, 4.46), (0.3, 1.0, 5.0, 8.0)))
        self.assertEqual(g['motive'], 1)
        self.assertAlmostEqual(g['platte'][2], 12.0)
        self.assertAlmostEqual(g['foto'][0], 0.3)

    def test_kurve_nicht_stuetzpunkte(self):
        # Bézier mit Stützpunkten weit außerhalb: Box der Kurve ist kleiner als die der Stützpunkte
        z = ('drawPath (svg:d: ((librevenge:path-action: M, svg:x: 0.0000in, svg:y: 0.0000in), '
             '(librevenge:path-action: C, svg:x: 1.0000in, svg:x1: 0.0000in, svg:x2: 1.0000in, svg:y: 0.0000in, svg:y1: 1.0000in, svg:y2: 1.0000in)))')
        b = ov_gen.bbox(ov_gen.punkte(z))
        self.assertAlmostEqual(b[3], 0.75, places=3)                  # Scheitel bei 3/4, nicht bei 1

    def test_baue_konfi_und_vorlage_nach_nennmass(self):
        IN = 25.4
        dateien = [
            (Path('GT-S-30x20-D7.cdr'), raw_platte_und_motiv((0.2, 0.2, 0.2 + 300 / IN, 0.2 + 200 / IN), (0.2 + 200 / IN, 0.2 + 90 / IN, 0.2 + 230 / IN, 0.2 + 114 / IN))),
            (Path('GT-S-22x14-D7.cdr'), raw_platte_und_motiv((0.0, 0.0, 220 / IN, 140 / IN), (145 / IN, 64 / IN, 164 / IN, 79 / IN), zweites=(150 / IN, 60 / IN, 152 / IN, 62 / IN))),
            (Path('GT-S-22x14.cdr'), raw_platte_und_motiv((0, 0, 1, 1), (0.1, 0.1, 0.2, 0.2))),
        ]
        daten, hinweise = ov_gen.baue(dateien, '30x20', 'gedenktafeln', '2026-10-20')
        e = daten['gedenktafeln']['7']
        self.assertEqual(e['vorlageMm']['300x200']['boxMm'], [200.0, 90.0, 30.0, 24.0])
        self.assertEqual(e['vorlageMm']['220x140']['boxMm'], [145.0, 60.0, 19.0, 19.0])   # Vereinigung beider Motive
        self.assertEqual(e['vorlageMm']['220x140']['motive'], 2)
        s = 380 / 300
        for ist, soll in zip(e['bbox400'], (10 + 200 * s, (400 - 200 * s) / 2 + 90 * s, 30 * s, 24 * s)):
            self.assertAlmostEqual(ist, soll, places=1)
        self.assertTrue(any('GT-S-22x14.cdr' in h for h in hinweise))

    def test_handgepflegt_hat_vorrang_und_corel_ergaenzt(self):
        tmp = Path(tempfile.mkdtemp(dir=self.tmp))
        for n in ('asin-mapping.json', 'font-aliases.json'):
            shutil.copy(MAPPING / n, tmp / n)
        (tmp / 'design-overlays.json').write_text(json.dumps({'gedenktafeln': {}}), encoding='utf-8')
        corel = json.loads((MAPPING / 'design-overlays.json').read_text(encoding='utf-8'))
        corel['_quelle'] = {'schema': 'test'}
        (tmp / 'design-overlays.corel.json').write_text(json.dumps(corel), encoding='utf-8')
        m = imp.Mapping(tmp)
        self.assertEqual(m.overlay('gedenktafeln', 201)['bbox400'], corel['gedenktafeln']['201']['bbox400'])
        self.assertIsNone(m.overlay('gedenktafeln', 9999))
        b, _ = (lambda r: (r[0], r[1]))(self.lauf(baue_bestellung(self.katalog), mapping=m))
        self.assertEqual(b['positionen'][0]['status'], 'ok', b['positionen'][0]['fehler'])
        # handgepflegt gewinnt
        (tmp / 'design-overlays.json').write_text(json.dumps({'gedenktafeln': {'201': {'bbox400': [1, 2, 3, 4], 'quelle': 'Hand'}}}), encoding='utf-8')
        self.assertEqual(imp.Mapping(tmp).overlay('gedenktafeln', 201)['bbox400'], [1, 2, 3, 4])

    def test_erzeugte_datei_stimmt_mit_handwert_d201(self):
        p = MAPPING / 'design-overlays.corel.json'
        if not p.is_file():
            self.skipTest('design-overlays.corel.json nicht erzeugt')
        gen = json.loads(p.read_text(encoding='utf-8'))['gedenktafeln']['201']
        hand = json.loads((MAPPING / 'design-overlays.json').read_text(encoding='utf-8'))['gedenktafeln']['201']
        self.assertEqual(gen['bbox400'], hand['bbox400'])
        self.assertEqual(gen['vorlageMm']['220x140']['boxMm'], hand['vorlageMm']['220x140']['boxMm'])


if __name__ == '__main__':
    unittest.main(verbosity=1)
