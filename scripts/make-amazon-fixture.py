#!/usr/bin/env python3
"""Erzeugt die anonymisierte Fixture für den Amazon-Import (app/workshop/fixtures/amazon-order/).

    python3 scripts/make-amazon-fixture.py --zip <echte Bestell-ZIP> --katalog <gravuru-katalog> \\
        --out app/workshop/fixtures/amazon-order

Die echte ZIP wird nur lokal gelesen (Struktur, Platzierung, Optionen). Geschrieben wird eine synthetische
Bestellung mit gleicher Struktur: Order-ID 000-0000000-0000000, Position 00000000000000, Mustertexte,
generiertes Testbild (Farbverlauf mit Kreuz, 1118 × 1636 px) als Kundenfoto, Platzhalter als Vorschau.
Texte werden mit derselben Schriftlogik wie der Importer gesetzt (Fabric-Layout neu berechnet), damit die
Maße zu den Katalogschriften passen. Vor dem Schreiben prüft das Skript, dass nichts aus der echten
Bestellung (IDs, Dateinamen, Texte, Foto-Bytes) in der Fixture steht.

Die Funktionen layout_neu/baue_dateien werden auch von scripts/import-amazon-order.test.py benutzt.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import io
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HIER = Path(__file__).resolve().parent
FIX_ORDER_ID = '000-0000000-0000000'
FIX_ITEM_ID = '00000000000000'
FIX_MERCHANT = 'A0000000000000'
FIX_FOTO = '00000000-0000-4000-8000-000000000001.jpg'
FIX_VORSCHAU = '00000000-0000-4000-8000-000000000002.jpg'
FIX_SVG = '00000000-0000-4000-8000-000000000003.svg'
MUSTER_TEXTE = [
    'Muster',
    '01.01.2010 – 01.01.2020',
    'Ruhige, würdige Gestaltung. \nName groß, Lebensdaten klar lesbar,\nSpruch zurückhaltend; \nMotive dezent.',
]
FABRIC_FAKTOR_HOEHE = 1.13       # Fabric: Zeilenhöhe = Schriftgröße * 1,13
FABRIC_FAKTOR_BASIS = 0.778      # Grundlinie = Zeilenhöhe * (1 - 0,222)
FABRIC_FAKTOR_ZEILE = 1.16       # Fabric lineHeight


def lade_importer():
    spec = importlib.util.spec_from_file_location('import_amazon_order', HIER / 'import-amazon-order.py')
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


# --------------------------------------------------------------------------------------------------
# Baumwerkzeuge
# --------------------------------------------------------------------------------------------------

def gehe_strings(o, fn):
    """Wendet fn auf alle Strings (Werte, nicht Schlüssel) an und gibt die Kopie zurück."""
    if isinstance(o, dict):
        return {k: gehe_strings(v, fn) for k, v in o.items()}
    if isinstance(o, list):
        return [gehe_strings(v, fn) for v in o]
    if isinstance(o, str):
        return fn(o)
    return o


def text_platzierungen(doc):
    """Placement-Container der nicht-leeren Texteingaben in Dokumentreihenfolge (Verweise, keine Kopien)."""
    ergebnis = []

    def gehe(n, gruppe, platz):
        if not isinstance(n, dict):
            return
        t = n.get('type')
        if t == 'ContainerCustomization' and any(isinstance(c, dict) and c.get('type') == 'FontCustomization' for c in n.get('children', [])):
            gruppe = n
        if t == 'PlacementContainerCustomization':
            platz = n
        if t == 'TextCustomization' and gruppe is not None and platz is not None:
            ergebnis.append((platz, n))
        for c in n.get('children', []) or []:
            gehe(c, gruppe, platz)

    gehe(doc['customizationData'], None, None)
    return [(p, t) for p, t in ergebnis if str(t.get('inputValue', '')).strip()]


def objekt_zu_xml(doc) -> bytes:
    """JSON-Dokument -> XML in der Form, die Amazon als Fallback mitliefert (children/areas/surfaces wiederholt)."""
    def baue(eltern, name, wert):
        if isinstance(wert, list):
            for w in wert:
                baue(eltern, name, w)
            return
        el = ET.SubElement(eltern, name)
        if isinstance(wert, dict):
            for k, v in wert.items():
                baue(el, k, v)
        elif wert is None:
            pass
        elif isinstance(wert, bool):
            el.text = 'true' if wert else 'false'
        else:
            el.text = repr(wert) if isinstance(wert, float) else str(wert)

    wurzel = ET.Element('data')
    for k, v in doc.items():
        baue(wurzel, k, v)
    return ET.tostring(wurzel, encoding='utf-8')


# --------------------------------------------------------------------------------------------------
# Fabric-SVG neu aufbauen (gleiche Struktur wie das Original)
# --------------------------------------------------------------------------------------------------

_STIL_BILD = ('stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; '
              'stroke-miterlimit: 4; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;')
_STIL_TEXT = ('stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; '
              'stroke-miterlimit: 4; fill: rgb(179,179,179); fill-rule: nonzero; opacity: 1; white-space: pre;')


def fmt(v) -> str:
    return repr(float(v))


def clip_xml(nr: int, cw: float, ch: float, cx: float, cy: float) -> str:
    return (f'<clipPath id="CLIPPATH_{nr}" >\n\t<rect transform="matrix(1 0 0 1 {cx:g} {cy:g})" x="{-cw / 2:g}" y="{-ch / 2:g}" rx="0" ry="0" width="{cw:g}" height="{ch:g}" />\n</clipPath>\n')


def fabric_svg(meta: dict, zeilen_je_text: list[list[tuple[float, float, str]]]) -> str:
    """meta: {'foto': {...}, 'overlay_href', 'clip': (cw,ch,cx,cy), 'texte': [{'m','groesse','familie'}]}"""
    cw, ch, cx, cy = meta['clip']
    teile = ['<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
             '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n'
             '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="3200" height="3200" viewBox="0 0 400 400" xml:space="preserve">\n'
             '<desc>Created with Fabric.js 3.2.0</desc>\n<defs>\n</defs>\n']
    nr = 21
    f = meta['foto']
    m = f['m']
    teile.append(f'<g clip-path="url(#CLIPPATH_{nr})"  >\n<g transform="matrix({" ".join(fmt(v) for v in m)})"  >\n{clip_xml(nr, cw, ch, cx, cy)}'
                 f'\t<image style="{_STIL_BILD}"  xlink:href="{f["href"]}" x="{f["x"]:g}" y="{f["y"]:g}" width="{f["w"]:g}" height="{f["h"]:g}"></image>\n</g>\n</g>\n')
    teile.append(f'<g transform="matrix(1 0 0 1 200 200)"  >\n\t<image style="{_STIL_BILD}"  xlink:href="{meta["overlay_href"]}" x="-200" y="-200" width="400" height="400"></image>\n</g>\n')
    for t, zeilen in zip(meta['texte'], zeilen_je_text):
        nr += 1
        m = t['m']
        tspans = ''.join(f'<tspan x="{fmt(x)}" y="{fmt(y)}" >{_esc(text)}</tspan>' for x, y, text in zeilen)
        teile.append(f'<g style="" clip-path="url(#CLIPPATH_{nr})"  >\n<g transform="matrix({" ".join(fmt(v) for v in m)})"  >\n{clip_xml(nr, cw, ch, cx, cy)}'
                     f'\t\t<text xml:space="preserve" font-family="{t["familie"]}" font-size="{fmt(t["groesse"])}" font-style="normal" font-weight="normal" style="{_STIL_TEXT}" >{tspans}</text>\n</g>\n</g>\n')
    teile.append('</svg>\n')
    return ''.join(teile)


def _esc(s: str) -> str:
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def layout_neu(doc: dict, meta: dict, breite_fn) -> tuple[dict, str]:
    """Berechnet das Fabric-Layout der (neuen) Texte: zentriert, Grundlinien nach Fabric-Formeln,
    und schreibt Platzierung (buyerPlacement) in das Dokument. breite_fn(familie, zeile, groesse) -> Breite in Elementeinheiten."""
    plaetze = text_platzierungen(doc)
    if len(plaetze) != len(meta['texte']):
        raise SystemExit(f'Fixture: {len(plaetze)} Texte in der Bestellung, aber {len(meta["texte"])} Textelemente in der Vorlage-SVG.')
    zeilen_je_text = []
    for (platz, eingabe), t in zip(plaetze, meta['texte']):
        zeilen = eingabe['inputValue'].split('\n')
        fs = t['groesse']
        breiten = [breite_fn(t['familie'], z, fs) for z in zeilen]
        h_zeile = fs * FABRIC_FAKTOR_HOEHE
        schritt = h_zeile * FABRIC_FAKTOR_ZEILE
        hoehe = (len(zeilen) - 1) * schritt + h_zeile
        y0 = -hoehe / 2 + h_zeile * FABRIC_FAKTOR_BASIS
        zeilen_je_text.append([(-b / 2, y0 + i * schritt, z) for i, (b, z) in enumerate(zip(breiten, zeilen))])
        s = t['m'][0]
        box_b = max(breiten)
        platz['buyerPlacement'] = {'position': {'x': t['m'][4] - box_b * s / 2, 'y': t['m'][5] - hoehe * s / 2}, 'dimension': {'width': box_b, 'height': hoehe},
                                   'scale': {'scaleX': s, 'scaleY': s}, 'angleOfRotation': 0}
    return doc, fabric_svg(meta, zeilen_je_text)


# --------------------------------------------------------------------------------------------------
# Synthetische Bilder
# --------------------------------------------------------------------------------------------------

def testfoto(breite=1118, hoehe=1636) -> bytes:
    from PIL import Image, ImageDraw
    im = Image.new('RGB', (breite, hoehe))
    px = im.load()
    for y in range(hoehe):
        for x in range(breite):
            px[x, y] = (int(255 * x / (breite - 1)), int(255 * y / (hoehe - 1)), 140)
    d = ImageDraw.Draw(im)
    d.line((0, 0, breite, hoehe), fill=(255, 255, 255), width=6)
    d.line((breite, 0, 0, hoehe), fill=(0, 0, 0), width=6)
    d.rectangle((0, 0, breite - 1, hoehe - 1), outline=(255, 255, 255), width=10)
    d.ellipse((breite / 2 - 120, hoehe / 2 - 120, breite / 2 + 120, hoehe / 2 + 120), outline=(0, 0, 0), width=8)
    out = io.BytesIO()
    im.save(out, format='JPEG', quality=85)
    return out.getvalue()


def vorschau_platzhalter() -> bytes:
    from PIL import Image, ImageDraw
    im = Image.new('RGB', (400, 400), (70, 70, 70))
    d = ImageDraw.Draw(im)
    d.rectangle((9, 73, 390, 327), fill=(25, 25, 25), outline=(160, 160, 160))
    d.text((120, 190), 'PLATZHALTER-VORSCHAU', fill=(200, 200, 200))
    out = io.BytesIO()
    im.save(out, format='JPEG', quality=85)
    return out.getvalue()


# --------------------------------------------------------------------------------------------------
# Anonymisieren
# --------------------------------------------------------------------------------------------------

def echte_geheimnisse(imp, dateien: dict[str, bytes], doc: dict) -> set[bytes]:
    """Alles, was nicht in die Fixture gehören darf."""
    roh = imp.extrahiere(doc)
    tokens = {roh['orderId'], roh['orderItemId'], str(doc.get('merchantId', '')), roh['svg'] or '', roh['snapshot'] or ''}
    tokens |= {f['bildName'] for f in roh['fotos']}
    for g in roh['gruppen']:
        tokens |= {e['text'] for e in g['eingaben'] if e['text'].strip()} | {t for e in g['eingaben'] for t in e['text'].split('\n') if t.strip()}
    if roh['anmerkung'].strip():
        tokens.add(roh['anmerkung'].strip())

    def sammle(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ('buyerFilename',) and isinstance(v, str):
                    tokens.add(v)
                if k in ('imageUrl', 'fontUrl', 'optionImage') and isinstance(v, str) and v:
                    tokens.add(v.rsplit('/', 1)[-1].split('.')[0])
                sammle(v)
        elif isinstance(o, list):
            for v in o:
                sammle(v)

    sammle(doc)
    tokens = {t for t in tokens if len(t) >= 4}
    ergebnis = {t.encode('utf-8') for t in tokens}
    ergebnis |= {hashlib.sha256(b).hexdigest().encode() for n, b in dateien.items() if n.lower().endswith(('.jpg', '.jpeg'))}
    return ergebnis


def pruefe_ohne_geheimnisse(neu: dict[str, bytes], geheimnisse: set[bytes], echte_bytes: set[bytes]):
    for name, daten in neu.items():
        if daten in echte_bytes:
            raise SystemExit(f'Fixture-Datei {name} ist byte-gleich zu einer echten Datei.')
        for g in geheimnisse:
            if g in daten or g in name.encode():
                raise SystemExit(f'Fixture-Datei {name} enthält echte Daten ({g[:8].decode("utf-8", "replace")}…).')


def baue_dateien(imp, echte_dateien: dict[str, bytes], katalog_pfad) -> dict[str, bytes]:
    dokumente = imp.lade_bestelldokumente(echte_dateien)
    if len(dokumente) != 1:
        raise SystemExit('Die Vorlage-ZIP muss genau eine Bestellposition enthalten.')
    name, doc = dokumente[0]
    roh = imp.extrahiere(doc)
    fabric = imp.parse_fabric(echte_dateien[roh['svg']])
    katalog = imp.Katalog(katalog_pfad)
    aliase = {}
    geheimnisse = echte_geheimnisse(imp, echte_dateien, doc)
    echte_bytes = set(echte_dateien.values())

    # URLs vereinheitlichen
    urls: dict[str, str] = {}

    def url_neu(u: str) -> str:
        if u not in urls:
            endung = u.rsplit('.', 1)[-1] if '.' in u.rsplit('/', 1)[-1] else 'png'
            urls[u] = f'https://example.invalid/amazon-vorlage/datei-{len(urls) + 1:02d}.{endung[:4]}'
        return urls[u]

    ersatz = {roh['orderId']: FIX_ORDER_ID, roh['orderItemId']: FIX_ITEM_ID, str(doc.get('merchantId', '')): FIX_MERCHANT,
              roh['svg']: FIX_SVG, roh['snapshot']: FIX_VORSCHAU, roh['fotos'][0]['bildName']: FIX_FOTO}
    neu_doc = gehe_strings(doc, lambda s: url_neu(s) if s.startswith(('http://', 'https://')) else ersatz.get(s, s))

    def buyer(o):
        if isinstance(o, dict):
            for k, v in list(o.items()):
                if k == 'buyerFilename':
                    o[k] = 'kundenfoto.jpeg'
                else:
                    buyer(v)
        elif isinstance(o, list):
            for v in o:
                buyer(v)

    buyer(neu_doc)
    # Mustertexte
    plaetze = text_platzierungen(neu_doc)
    if len(plaetze) > len(MUSTER_TEXTE):
        raise SystemExit(f'Die Vorlage hat {len(plaetze)} Texte, es gibt nur {len(MUSTER_TEXTE)} Mustertexte.')
    for (platz, eingabe), muster in zip(plaetze, MUSTER_TEXTE):
        eingabe['inputValue'] = muster
    # Anmerkung leeren
    def leere_anmerkung(o):
        if isinstance(o, dict):
            if o.get('label') == 'Anmerkung' and 'inputValue' in o:
                o['inputValue'] = ''
            if o.get('label') == 'Anmerkung' and 'text' in o:
                o['text'] = ''
            for v in o.values():
                leere_anmerkung(v)
        elif isinstance(o, list):
            for v in o:
                leere_anmerkung(v)

    leere_anmerkung(neu_doc)
    # Fabric-Meta aus der echten SVG (nur Platzierung, nicht die Texte)
    foto_b = next(b for b in fabric['bilder'] if b['href'] == roh['fotos'][0]['bildName'])
    overlay_b = next((b for b in fabric['bilder'] if '://' in b['href']), None)
    clip = foto_b['clip']
    meta = {'foto': {'m': foto_b['m'], 'href': FIX_FOTO, 'x': foto_b['x'], 'y': foto_b['y'], 'w': foto_b['w'], 'h': foto_b['h']},
            'overlay_href': url_neu(overlay_b['href']) if overlay_b else '',
            'clip': (clip[2] - clip[0], clip[3] - clip[1], (clip[0] + clip[2]) / 2, (clip[1] + clip[3]) / 2),
            'texte': [{'m': t['m'], 'groesse': t['groesse'], 'familie': t['familie']} for t in fabric['texte']]}

    def breite(familie, zeile, groesse):
        _, s = katalog.schrift(familie, aliase)
        return s.breite(s.formen(zeile, familie)) * groesse / s.upm

    neu_doc, svg = layout_neu(neu_doc, meta, breite)
    neu = {f'{FIX_ITEM_ID}.json': (json.dumps(neu_doc, ensure_ascii=False, indent=2) + '\n').encode('utf-8'),
           f'{FIX_ITEM_ID}.xml': objekt_zu_xml(neu_doc), FIX_SVG: svg.encode('utf-8'),
           FIX_FOTO: testfoto(), FIX_VORSCHAU: vorschau_platzhalter()}
    pruefe_ohne_geheimnisse(neu, geheimnisse, echte_bytes)
    return neu


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description='Erzeugt die anonymisierte Amazon-Fixture aus einer echten Bestell-ZIP (nur lokal gelesen).')
    ap.add_argument('--zip', required=True, help='echte Bestell-ZIP (bleibt außerhalb des Repos)')
    ap.add_argument('--katalog', required=True, help='Pfad zum Repo gravuru-katalog')
    ap.add_argument('--out', required=True, help='Zielordner der Fixture')
    a = ap.parse_args(argv)
    imp = lade_importer()
    dateien, _ = imp.lese_zip(a.zip)
    neu = baue_dateien(imp, dateien, a.katalog)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, daten in neu.items():
        (out / name).write_bytes(daten)
        print(f'geschrieben: {out / name} ({len(daten)} Bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
