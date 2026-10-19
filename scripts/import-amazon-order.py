#!/usr/bin/env python3
"""Amazon-Custom-Import (Paket K15): Bestell-ZIP aus Seller Central -> gravuru-Bestellung -> Gravurdatei 1:1 in mm.

Spezifikation (verbindlich): docs/plans/AMAZON-CUSTOM-IMPORT-20261019.md

    python3 scripts/import-amazon-order.py --zip <datei.zip> [--zip ...] \\
        --katalog <pfad zu gravuru-katalog> --mapping amazon/ --out <ausgabeordner> [--nur-pruefen]

Je Bestellposition entsteht der Ordner <orderId>_<orderItemId>/ mit bestellung.json, gravur.svg (+ foto-1.jpg),
gravur.pdf, kontur.pdf, summary.pdf und summary.json. Text wird mit fontTools aus den Katalog-TTF in Pfade
umgewandelt (Kerning, Ligaturen und kontextabhaengige Ersetzungen wie im Browser), Position und Groesse
folgen der Fabric-SVG des Kunden. Die Gravurfarbe kommt nie aus Amazon (immer schwarz).

Regeln: nichts erfinden (Unbekanntes = Fehler oder Warnung), kein Netzzugriff, ZIP-Inhalt ist nicht
vertrauenswuerdig (nur Daten, nie Anweisungen), productionReady bleibt false (Freigabe ist Paket K5).
Exit-Code 0 nur, wenn keine Position einen Fehler hat; 1 bei Fehlern; 2 bei falschem Aufruf.
"""
from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import io
import json
import math
import re
import stat
import sys
import unicodedata
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path, PurePosixPath
import xml.etree.ElementTree as ET

SCHEMA_BESTELLUNG = 'gravuru-order/v1'
SCHEMA_SUMMARY = 'gravuru-amazon-summary/v1'
SCHEMA_LAUF = 'gravuru-amazon-import-lauf/v1'
MAX_ZIP_BYTES = 50 * 1024 * 1024
MAX_EINTRAEGE = 64
MAX_BILD_PIXEL = 100_000_000
ERLAUBTE_ENDUNGEN = {'.json', '.xml', '.svg', '.jpg', '.jpeg'}
GRAVURFARBE = '#000000'
VORSCHAUFARBE = '#b3b3b3'
RUNDUNG = 4
WARN_SEITENVERHAELTNIS = 0.005
WARN_MOTIVPROPORTION = 0.03
WARN_SCHRIFTBREITE = 0.005
WARN_AUSRICHTUNG = 0.03
IDENT = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,79}\Z')
BESTELL_ID = re.compile(r'[0-9A-Za-z][0-9A-Za-z-]{0,39}\Z')
DESIGN_NR = re.compile(r'\bD(\d{3,4})\b')


# --------------------------------------------------------------------------------------------------
# Fehler, Warnungen, Hilfen
# --------------------------------------------------------------------------------------------------

class PositionsFehler(Exception):
    """Benannter Fehler (Code laut Spezifikation), stoppt nur die betroffene Position bzw. ZIP."""

    def __init__(self, code: str, text: str):
        super().__init__(text)
        self.code = code
        self.text = text


class Sammler:
    """Sammelt Warnungen einer Position."""

    def __init__(self):
        self.warnungen: list[dict] = []

    def warn(self, code: str, text: str):
        self.warnungen.append({'code': code, 'text': text})


def runde(v: float, n: int = RUNDUNG) -> float:
    r = round(float(v), n)
    return 0.0 if r == 0 else r


def zahl(v: float) -> str:
    """Zahl fuer SVG/PDF-Pfade: max. 4 Nachkommastellen, ohne Nullen am Ende."""
    s = ('%.4f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('', '-0') else s


def sha256(daten: bytes) -> str:
    return hashlib.sha256(daten).hexdigest()


def endlich(v, name: str) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError):
        raise PositionsFehler('json_invalid', f'Wert „{name}“ ist keine Zahl.')
    if not math.isfinite(f):
        raise PositionsFehler('json_invalid', f'Wert „{name}“ ist nicht endlich.')
    return f


def cent(betrag) -> int:
    """Betrag in Euro (Zahl oder Text) -> ganze Cent."""
    try:
        return int((Decimal(str(betrag)) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    except Exception:
        return 0


def abhaengigkeit(modul: str, paket: str):
    try:
        return __import__(modul, fromlist=['_'])
    except ImportError as e:
        raise SystemExit(f'Abhängigkeit fehlt: {paket} ({e}). Installation: pip install {paket}')


def pymupdf_laden():
    try:
        import pymupdf
        return pymupdf
    except ImportError:
        try:
            import fitz
            return fitz
        except ImportError as e:
            raise SystemExit(f'Abhängigkeit fehlt: pymupdf ({e}). Installation: pip install pymupdf')


# --------------------------------------------------------------------------------------------------
# 2x3-Matrizen (SVG-Konvention: a b c d e f)
# --------------------------------------------------------------------------------------------------

IDENTITAET = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def mat_mul(m, n):
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f)


def mat_pt(m, x, y):
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


_TRANSFORM = re.compile(r'\s*(matrix|translate|scale|rotate)\s*\(([^)]*)\)\s*,?')


def parse_transform(text: str | None):
    if not text or not text.strip():
        return IDENTITAET
    rest = text
    m = IDENTITAET
    while rest.strip():
        t = _TRANSFORM.match(rest)
        if not t:
            raise PositionsFehler('svg_invalid', f'Nicht unterstützte Transformation „{text[:60]}“.')
        art = t.group(1)
        try:
            w = [float(x) for x in re.split(r'[\s,]+', t.group(2).strip()) if x != '']
        except ValueError:
            raise PositionsFehler('svg_invalid', f'Ungültige Transformation „{text[:60]}“.')
        if not all(math.isfinite(x) for x in w):
            raise PositionsFehler('svg_invalid', 'Transformation mit nicht endlichem Wert.')
        if art == 'matrix' and len(w) == 6:
            n = tuple(w)
        elif art == 'translate' and len(w) in (1, 2):
            n = (1, 0, 0, 1, w[0], w[1] if len(w) == 2 else 0.0)
        elif art == 'scale' and len(w) in (1, 2):
            n = (w[0], 0, 0, w[1] if len(w) == 2 else w[0], 0, 0)
        elif art == 'rotate' and len(w) in (1, 3):
            r = math.radians(w[0])
            c, s = math.cos(r), math.sin(r)
            n = (c, s, -s, c, 0, 0)
            if len(w) == 3:
                n = mat_mul(mat_mul((1, 0, 0, 1, w[1], w[2]), n), (1, 0, 0, 1, -w[1], -w[2]))
        else:
            raise PositionsFehler('svg_invalid', f'Ungültige Transformation „{text[:60]}“.')
        m = mat_mul(m, n)
        rest = rest[t.end():]
    return m


def lokal(tag: str) -> str:
    return tag.rsplit('}', 1)[-1] if isinstance(tag, str) else ''


# --------------------------------------------------------------------------------------------------
# ZIP lesen (nicht vertrauenswuerdig)
# --------------------------------------------------------------------------------------------------

def lese_zip(pfad) -> tuple[dict[str, bytes], list[dict]]:
    """Liefert {Dateiname: Bytes} der vier erlaubten Dateitypen und Hinweise zu ignorierten Dateien."""
    p = Path(pfad)
    if not p.is_file():
        raise PositionsFehler('zip_invalid', f'ZIP-Datei nicht gefunden: {p.name}')
    if p.stat().st_size > MAX_ZIP_BYTES:
        raise PositionsFehler('zip_too_large', 'ZIP-Datei größer als 50 MB.')
    try:
        z = zipfile.ZipFile(p)
    except (zipfile.BadZipFile, OSError) as e:
        raise PositionsFehler('zip_invalid', f'Keine gültige ZIP-Datei: {e}')
    with z:
        infos = z.infolist()
        if len(infos) > MAX_EINTRAEGE:
            raise PositionsFehler('zip_unsafe', f'ZIP enthält mehr als {MAX_EINTRAEGE} Einträge.')
        dateien: dict[str, bytes] = {}
        hinweise: list[dict] = []
        summe = 0
        for info in infos:
            name = info.filename
            if info.is_dir():
                continue
            if '\x00' in name or '\\' in name or name.startswith('/') or re.match(r'^[A-Za-z]:', name):
                raise PositionsFehler('zip_unsafe', 'ZIP enthält einen unsicheren Dateipfad.')
            teile = PurePosixPath(name).parts
            if any(t in ('..', '.', '') for t in teile):
                raise PositionsFehler('zip_unsafe', 'ZIP enthält einen Pfad mit „..“.')
            if stat.S_ISLNK(info.external_attr >> 16):
                raise PositionsFehler('zip_unsafe', 'ZIP enthält einen symbolischen Link.')
            if info.flag_bits & 0x1:
                raise PositionsFehler('zip_invalid', 'ZIP ist verschlüsselt.')
            basis = PurePosixPath(name).name
            endung = PurePosixPath(basis).suffix.lower()
            if endung not in ERLAUBTE_ENDUNGEN:
                hinweise.append({'code': 'datei_ignoriert', 'text': f'Datei mit nicht erlaubtem Typ ignoriert: {basis[:60]}'})
                continue
            if info.file_size > MAX_ZIP_BYTES:
                raise PositionsFehler('zip_too_large', 'Eine Datei im ZIP ist größer als 50 MB.')
            summe += info.file_size
            if summe > MAX_ZIP_BYTES:
                raise PositionsFehler('zip_too_large', 'ZIP-Inhalt entpackt größer als 50 MB.')
            if info.compress_size and info.file_size > 1_000_000 and info.file_size / info.compress_size > 400:
                raise PositionsFehler('zip_unsafe', 'Auffälliges Kompressionsverhältnis (mögliche ZIP-Bombe).')
            if basis in dateien:
                raise PositionsFehler('zip_unsafe', f'Dateiname doppelt im ZIP: {basis[:60]}')
            with z.open(info) as f:
                daten = f.read(info.file_size + 1)
            if len(daten) != info.file_size:
                raise PositionsFehler('zip_unsafe', 'Dateigröße im ZIP stimmt nicht mit dem Inhalt überein.')
            dateien[basis] = daten
    return dateien, hinweise


# --------------------------------------------------------------------------------------------------
# Bestelldaten (JSON bzw. XML-Fallback) auslesen
# --------------------------------------------------------------------------------------------------

_LISTEN = {'children', 'surfaces', 'areas'}
_ZAHLEN = {'amount', 'x', 'y', 'width', 'height', 'scaleX', 'scaleY', 'angleOfRotation', 'quantity', 'value'}


def xml_zu_objekt(el):
    """Allgemeine XML->Objekt-Umwandlung im Format des JSON (children/surfaces/areas immer Liste)."""
    kinder = list(el)
    if not kinder:
        t = el.text or ''
        name = lokal(el.tag)
        if name in _ZAHLEN:
            try:
                f = float(t)
                return int(f) if f == int(f) and re.fullmatch(r'-?\d+', t.strip()) else f
            except ValueError:
                return t
        if name == 'children':
            return []
        return t
    out: dict = {}
    for k in kinder:
        name = lokal(k.tag)
        wert = xml_zu_objekt(k)
        if name in _LISTEN:
            out.setdefault(name, []).append(wert)
        elif name in out:
            if not isinstance(out[name], list):
                out[name] = [out[name]]
            out[name].append(wert)
        else:
            out[name] = wert
    return out


def lade_bestelldokumente(dateien: dict[str, bytes]) -> list[tuple[str, dict]]:
    """Alle Positionen eines ZIP: [(Dateiname, Dokument)]. JSON hat Vorrang, XML nur als Fallback."""
    gefunden = []
    for name in sorted(dateien):
        if not name.lower().endswith('.json'):
            continue
        try:
            doc = json.loads(dateien[name].decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            raise PositionsFehler('json_invalid', f'{name}: kein gültiges JSON ({e}).')
        if isinstance(doc, dict) and 'customizationData' in doc and 'orderItemId' in doc:
            gefunden.append((name, doc))
    if gefunden:
        return gefunden
    for name in sorted(dateien):
        if not name.lower().endswith('.xml'):
            continue
        if b'<!ENTITY' in dateien[name] or b'<!DOCTYPE' in dateien[name]:
            raise PositionsFehler('json_invalid', f'{name}: XML mit DOCTYPE/ENTITY wird nicht gelesen.')
        try:
            doc = xml_zu_objekt(ET.fromstring(dateien[name]))
        except ET.ParseError as e:
            raise PositionsFehler('json_invalid', f'{name}: kein gültiges XML ({e}).')
        if isinstance(doc, dict) and 'customizationData' in doc and 'orderItemId' in doc:
            gefunden.append((name, doc))
    if not gefunden:
        raise PositionsFehler('json_missing', 'Im ZIP fehlt die Bestell-JSON (<orderItemId>.json) mit customizationData.')
    return gefunden


def _kinder(knoten) -> list[dict]:
    k = knoten.get('children') if isinstance(knoten, dict) else None
    return [c for c in k if isinstance(c, dict)] if isinstance(k, list) else []


def extrahiere(doc: dict) -> dict:
    """customizationData-Baum -> flache Rohposition (nur Daten, keine Anweisungen)."""
    cd = doc.get('customizationData')
    if not isinstance(cd, dict):
        raise PositionsFehler('json_invalid', 'customizationData fehlt oder ist kein Objekt.')
    order_id, item_id = str(doc.get('orderId', '')), str(doc.get('orderItemId', ''))
    if not BESTELL_ID.match(order_id) or not BESTELL_ID.match(item_id):
        raise PositionsFehler('json_invalid', 'orderId/orderItemId fehlen oder enthalten unzulässige Zeichen.')
    roh = {'orderId': order_id, 'orderItemId': item_id, 'asin': str(doc.get('asin', '')), 'titel': str(doc.get('title', ''))[:300],
           'menge': int(doc['quantity']) if isinstance(doc.get('quantity'), (int, float)) else 1,
           'optionen': [], 'fotos': [], 'gruppen': [], 'anmerkung': '', 'svg': None, 'snapshot': None, 'bereiche': []}

    def option(n):
        sel = n.get('optionSelection') if isinstance(n.get('optionSelection'), dict) else {}
        kosten = sel.get('additionalCost') if isinstance(sel.get('additionalCost'), dict) else {}
        return {'name': str(n.get('name', '')), 'label': str(n.get('label', '')), 'wert': str(sel.get('name', n.get('displayValue', ''))),
                'aufpreisCent': cent(kosten.get('amount', 0)) if kosten else 0, 'hatOverlay': isinstance(sel.get('overlayImage'), dict)}

    def gehe(n, ctx, tiefe=0):
        if tiefe > 40:
            raise PositionsFehler('json_invalid', 'customizationData zu tief verschachtelt.')
        t = n.get('type')
        if t == 'PreviewContainerCustomization':
            if isinstance(n.get('svg'), str):
                roh['svg'] = n['svg']
            if isinstance(n.get('snapshot'), dict) and isinstance(n['snapshot'].get('imageName'), str):
                roh['snapshot'] = n['snapshot']['imageName']
        if t == 'ContainerCustomization' and any(c.get('type') == 'FontCustomization' for c in _kinder(n)):
            g = {'name': str(n.get('name', '')), 'label': str(n.get('label', '')), 'family': '', 'farbe': '', 'eingaben': []}
            roh['gruppen'].append(g)
            ctx = dict(ctx, gruppe=g)
        if t == 'PlacementContainerCustomization':
            ctx = dict(ctx, placement=n)
        if t == 'OptionCustomization':
            roh['optionen'].append(option(n))
        elif t == 'FontCustomization' and ctx.get('gruppe') is not None:
            fs = n.get('fontSelection') if isinstance(n.get('fontSelection'), dict) else {}
            ctx['gruppe']['family'] = str(fs.get('family', ''))
        elif t == 'ColorCustomization' and ctx.get('gruppe') is not None:
            cs = n.get('colorSelection') if isinstance(n.get('colorSelection'), dict) else {}
            ctx['gruppe']['farbe'] = str(cs.get('name', ''))
        elif t == 'ImageCustomization':
            bild = n.get('image') if isinstance(n.get('image'), dict) else {}
            p = ctx.get('placement') or {}
            roh['fotos'].append({'bildName': str(bild.get('imageName', '')), 'platzierung': p.get('buyerPlacement') if isinstance(p.get('buyerPlacement'), dict) else None,
                                 'bereich': {'position': p.get('position'), 'dimension': p.get('dimension')}, 'name': str(p.get('name', ''))})
        elif t == 'TextCustomization':
            p = ctx.get('placement')
            if ctx.get('gruppe') is not None and p is not None:
                ctx['gruppe']['eingaben'].append({'name': str(p.get('name', '')), 'label': str(n.get('label', '')), 'text': str(n.get('inputValue', '') or ''),
                                                  'platzierung': p.get('buyerPlacement') if isinstance(p.get('buyerPlacement'), dict) else None})
            elif str(n.get('name', '')).startswith('Informationen') or n.get('label') == 'Anmerkung':
                roh['anmerkung'] = str(n.get('inputValue', '') or '')
        for c in _kinder(n):
            gehe(c, ctx, tiefe + 1)

    gehe(cd, {})
    # Druckbereich: bevorzugt aus der flachen Liste (customizationInfo), sonst aus den Platzierungen
    info = doc.get('customizationInfo')
    flaechen = []
    if isinstance(info, dict):
        v = info.get('version3.0')
        if isinstance(v, dict) and isinstance(v.get('surfaces'), list):
            for s in v['surfaces']:
                if isinstance(s, dict) and isinstance(s.get('areas'), list):
                    flaechen.extend(a for a in s['areas'] if isinstance(a, dict))
    bereiche = []
    for a in flaechen:
        d, p = a.get('Dimensions'), a.get('Position')
        if isinstance(d, dict) and isinstance(p, dict):
            bereiche.append((endlich(p.get('x'), 'Position.x'), endlich(p.get('y'), 'Position.y'), endlich(d.get('width'), 'Dimensions.width'), endlich(d.get('height'), 'Dimensions.height')))
    if not bereiche:
        for f in roh['fotos']:
            b = f['bereich']
            if isinstance(b.get('position'), dict) and isinstance(b.get('dimension'), dict):
                bereiche.append((endlich(b['position'].get('x'), 'position.x'), endlich(b['position'].get('y'), 'position.y'),
                                 endlich(b['dimension'].get('width'), 'dimension.width'), endlich(b['dimension'].get('height'), 'dimension.height')))
    roh['bereiche'] = bereiche
    if roh['svg'] is None:
        for a in flaechen:
            if isinstance(a.get('svgImage'), str):
                roh['svg'] = a['svgImage']
                break
    return roh


def druckbereich(roh: dict, sammler: Sammler) -> dict:
    if not roh['bereiche']:
        raise PositionsFehler('layout_missing', 'Kein Druckbereich (Position/Dimensions) in den Bestelldaten gefunden.')
    erster = roh['bereiche'][0]
    if any(max(abs(a - b) for a, b in zip(erster, x)) > 1e-6 for x in roh['bereiche']):
        sammler.warn('druckbereich_uneinheitlich', 'Die Bereiche der Oberfläche sind nicht identisch; der erste Bereich wird verwendet.')
    x, y, w, h = erster
    if w <= 0 or h <= 0:
        raise PositionsFehler('layout_missing', 'Druckbereich hat keine positive Größe.')
    return {'x': x, 'y': y, 'width': w, 'height': h}


# --------------------------------------------------------------------------------------------------
# Fabric-SVG des Kunden (nur als Datenquelle gelesen, nie gerendert, keine externen href geladen)
# --------------------------------------------------------------------------------------------------

def _fl(el, name, default=None):
    v = el.get(name)
    if v is None:
        if default is None:
            raise PositionsFehler('svg_invalid', f'Attribut „{name}“ fehlt.')
        return default
    try:
        f = float(v)
    except ValueError:
        raise PositionsFehler('svg_invalid', f'Attribut „{name}“ ist keine Zahl.')
    if not math.isfinite(f):
        raise PositionsFehler('svg_invalid', f'Attribut „{name}“ ist nicht endlich.')
    return f


def parse_fabric(daten: bytes) -> dict:
    if b'<!ENTITY' in daten:
        raise PositionsFehler('svg_invalid', 'Fabric-SVG enthält ENTITY-Deklarationen und wird nicht gelesen.')
    try:
        wurzel = ET.fromstring(daten)
    except ET.ParseError as e:
        raise PositionsFehler('svg_invalid', f'Fabric-SVG nicht lesbar: {e}')
    if lokal(wurzel.tag) != 'svg':
        raise PositionsFehler('svg_invalid', 'Fabric-SVG hat kein svg-Wurzelelement.')
    clips = {}
    zaehler = 0
    for el in wurzel.iter():
        zaehler += 1
        if zaehler > 5000:
            raise PositionsFehler('svg_invalid', 'Fabric-SVG enthält zu viele Elemente.')
        if lokal(el.tag) == 'clipPath' and el.get('id'):
            rect = next((c for c in el if lokal(c.tag) == 'rect'), None)
            if rect is not None:
                clips[el.get('id')] = (_fl(rect, 'x', 0.0), _fl(rect, 'y', 0.0), _fl(rect, 'width'), _fl(rect, 'height'), parse_transform(rect.get('transform')))
    bilder, texte = [], []

    def clip_von(el, m):
        v = el.get('clip-path')
        if not v:
            return None
        t = re.fullmatch(r'url\(\s*#([^)\s]+)\s*\)', v.strip())
        if not t or t.group(1) not in clips:
            return None
        x, y, w, h, tr = clips[t.group(1)]
        mm = mat_mul(m, tr)
        pts = [mat_pt(mm, px, py) for px, py in ((x, y), (x + w, y), (x, y + h), (x + w, y + h))]
        return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))

    def gehe(el, m, clip):
        tag = lokal(el.tag)
        if tag in ('defs', 'clipPath', 'desc', 'title', 'metadata'):
            return
        m2 = mat_mul(m, parse_transform(el.get('transform')))
        c = clip_von(el, m2) or clip
        if tag == 'image':
            href = el.get('{http://www.w3.org/1999/xlink}href') or el.get('href') or ''
            bilder.append({'href': href, 'x': _fl(el, 'x', 0.0), 'y': _fl(el, 'y', 0.0), 'w': _fl(el, 'width'), 'h': _fl(el, 'height'), 'm': m2, 'clip': c})
            return
        if tag == 'text':
            zeilen = []
            for ts in el:
                if lokal(ts.tag) != 'tspan':
                    continue
                zeilen.append({'x': _fl(ts, 'x'), 'y': _fl(ts, 'y'), 'text': ts.text or ''})
            if not zeilen and (el.text or '').strip():
                zeilen.append({'x': _fl(el, 'x', 0.0), 'y': _fl(el, 'y', 0.0), 'text': el.text})
            texte.append({'familie': el.get('font-family', ''), 'groesse': _fl(el, 'font-size'), 'm': m2, 'zeilen': zeilen, 'clip': c})
            return
        for k in el:
            gehe(k, m2, c)

    gehe(wurzel, IDENTITAET, None)
    return {'bilder': bilder, 'texte': texte, 'viewBox': wurzel.get('viewBox', '')}


# --------------------------------------------------------------------------------------------------
# Schrift: fontTools, Kerning und OpenType-Ersetzungen (wie HarfBuzz im Browser, geprueft an allen 75 Katalogschriften)
# --------------------------------------------------------------------------------------------------

GSUB_FEATURES = ('ccmp', 'locl', 'rlig', 'liga', 'clig', 'calt', 'rclt')
MAX_REKURSION = 8


class Schriftdatei:
    """Laedt eine TTF und liefert Glyphenfolge, Vorschub (inkl. Kerning) und Umrisse."""

    def __init__(self, pfad):
        tt = abhaengigkeit('fontTools.ttLib', 'fonttools')
        self.pfad = str(pfad)
        self.font = tt.TTFont(io.BytesIO(Path(self.pfad).read_bytes()), lazy=True)   # kein offenes Dateihandle
        self.upm = self.font['head'].unitsPerEm
        self.cmap = self.font.getBestCmap()
        self.hmtx = self.font['hmtx']
        self.glyphset = self.font.getGlyphSet()
        gs = self.font['GSUB'].table if 'GSUB' in self.font else None
        self._gsub_liste = gs.LookupList.Lookup if gs is not None and gs.LookupList else []
        self._gsub = self._lookups('GSUB', GSUB_FEATURES)
        self._kern = self._lookups('GPOS', ('kern',))
        self.nicht_unterstuetzt: set = set()

    def _lookups(self, tabelle, tags):
        if tabelle not in self.font:
            return []
        t = self.font[tabelle].table
        if not t.ScriptList or not t.FeatureList or not t.LookupList:
            return []
        skripte = {r.ScriptTag: r.Script for r in t.ScriptList.ScriptRecord}
        skript = skripte.get('latn') or skripte.get('DFLT') or (next(iter(skripte.values())) if skripte else None)
        if skript is None or skript.DefaultLangSys is None:
            return []
        ls = skript.DefaultLangSys
        idx = list(ls.FeatureIndex)
        if ls.ReqFeatureIndex != 0xFFFF:
            idx.append(ls.ReqFeatureIndex)
        look = set()
        for i in idx:
            fr = t.FeatureList.FeatureRecord[i]
            if fr.FeatureTag in tags:
                look.update(fr.Feature.LookupListIndex)
        return sorted(look) if tabelle == 'GSUB' else [t.LookupList.Lookup[i] for i in sorted(look)]

    @staticmethod
    def _subtabellen(lookup):
        for s in lookup.SubTable:
            typ = lookup.LookupType
            if typ in (7, 9):
                typ = s.ExtensionLookupType
                s = s.ExtSubTable
            yield typ, s

    # ---- GSUB (Typ 1, 2, 4, 5, 6)
    def ersetzen(self, glyphen):
        g = list(glyphen)
        for li in self._gsub:
            lk = self._gsub_liste[li]
            i = 0
            while i < len(g):
                r = self._versuche(lk, g, i, 0)
                if r is None:
                    i += 1
                else:
                    g, schritt = r
                    i += max(1, schritt)
        return g

    def _versuche(self, lk, g, i, tiefe):
        for typ, s in self._subtabellen(lk):
            r = self._tabelle(typ, s, g, i, tiefe, lk)
            if r is not None:
                return r
        return None

    def _tabelle(self, typ, s, g, i, tiefe, lk):
        a = g[i]
        if typ == 1:
            if a in s.mapping:
                n = list(g)
                n[i] = s.mapping[a]
                return n, 1
            return None
        if typ == 2:
            if a in s.mapping:
                rep = list(s.mapping[a])
                return g[:i] + rep + g[i + 1:], len(rep)
            return None
        if typ == 4:
            for lig in s.ligatures.get(a, ()):
                c = list(lig.Component)
                if g[i + 1:i + 1 + len(c)] == c:
                    return g[:i] + [lig.LigGlyph] + g[i + 1 + len(c):], 1
            return None
        if typ in (5, 6):
            return self._kontext(typ, s, g, i, tiefe)
        self.nicht_unterstuetzt.add((lk.LookupType, typ))
        return None

    def _kontext(self, typ, s, g, i, tiefe):
        kette = typ == 6
        treffer = None
        a = g[i]
        if s.Format == 1:
            if a not in s.Coverage.glyphs:
                return None
            satz = (s.ChainSubRuleSet if kette else s.SubRuleSet)[s.Coverage.glyphs.index(a)]
            if satz is None:
                return None
            for r in (satz.ChainSubRule if kette else satz.SubRule):
                bt = list(r.Backtrack) if kette else []
                inp = list(r.Input)
                la = list(r.LookAhead) if kette else []
                if self._passt(g, i, bt, inp, la, lambda x, y: x == y):
                    treffer = (1 + len(inp), r.SubstLookupRecord)
                    break
        elif s.Format == 2:
            if a not in s.Coverage.glyphs:
                return None
            cd_in = (s.InputClassDef if kette else s.ClassDef).classDefs
            klasse = cd_in.get(a, 0)
            saetze = s.ChainSubClassSet if kette else s.SubClassSet
            if klasse >= len(saetze) or saetze[klasse] is None:
                return None
            cd_bt = s.BacktrackClassDef.classDefs if kette else {}
            cd_la = s.LookAheadClassDef.classDefs if kette else {}
            for r in (saetze[klasse].ChainSubClassRule if kette else saetze[klasse].SubClassRule):
                bt = list(r.Backtrack) if kette else []
                inp = list(r.Input)
                la = list(r.LookAhead) if kette else []
                if self._passt_klassen(g, i, bt, inp, la, cd_bt, cd_in, cd_la):
                    treffer = (1 + len(inp), r.SubstLookupRecord)
                    break
        elif s.Format == 3:
            if kette:
                bt = [c.glyphs for c in s.BacktrackCoverage]
                inp = [c.glyphs for c in s.InputCoverage]
                la = [c.glyphs for c in s.LookAheadCoverage]
            else:
                bt, inp, la = [], [c.glyphs for c in s.Coverage], []
            if not inp or a not in inp[0]:
                return None
            if self._passt(g, i, bt, inp[1:], la, lambda x, y: x in y):
                treffer = (len(inp), s.SubstLookupRecord)
        if treffer is None or tiefe >= MAX_REKURSION:
            return None
        n_inp, records = treffer
        g2 = list(g)
        verschiebung = 0
        for rec in sorted(records, key=lambda r: r.SequenceIndex):
            pos = i + rec.SequenceIndex + verschiebung
            if pos < 0 or pos >= len(g2):
                continue
            r = self._versuche(self._gsub_liste[rec.LookupListIndex], g2, pos, tiefe + 1)
            if r is not None:
                neu, _ = r
                verschiebung += len(neu) - len(g2)
                g2 = neu
        return g2, max(1, n_inp + verschiebung)

    @staticmethod
    def _passt(g, i, bt, inp, la, gleich):
        if i + 1 + len(inp) > len(g):
            return False
        for k, x in enumerate(inp):
            if not gleich(g[i + 1 + k], x):
                return False
        for k, x in enumerate(bt):
            j = i - 1 - k
            if j < 0 or not gleich(g[j], x):
                return False
        e = i + 1 + len(inp)
        if e + len(la) > len(g):
            return False
        return all(gleich(g[e + k], x) for k, x in enumerate(la))

    @staticmethod
    def _passt_klassen(g, i, bt, inp, la, cd_bt, cd_in, cd_la):
        if i + 1 + len(inp) > len(g):
            return False
        for k, x in enumerate(inp):
            if cd_in.get(g[i + 1 + k], 0) != x:
                return False
        for k, x in enumerate(bt):
            j = i - 1 - k
            if j < 0 or cd_bt.get(g[j], 0) != x:
                return False
        e = i + 1 + len(inp)
        if e + len(la) > len(g):
            return False
        return all(cd_la.get(g[e + k], 0) == x for k, x in enumerate(la))

    # ---- Kerning: GPOS 'kern' (Paarpositionierung, Typ 2), sonst alte 'kern'-Tabelle
    def kerning(self, glyphen):
        adv = [0] * len(glyphen)
        if not self._kern:
            if 'kern' in self.font:
                for kt in self.font['kern'].kernTables:
                    tab = getattr(kt, 'kernTable', None) or {}
                    for i in range(len(glyphen) - 1):
                        adv[i] += tab.get((glyphen[i], glyphen[i + 1]), 0)
            return adv
        for lk in self._kern:
            for i in range(len(glyphen) - 1):
                for typ, s in self._subtabellen(lk):
                    if typ != 2:
                        self.nicht_unterstuetzt.add(('GPOS', typ))
                        continue
                    w = self._paar(s, glyphen[i], glyphen[i + 1])
                    if w is not None:
                        adv[i] += w
                        break
        return adv

    @staticmethod
    def _paar(s, a, b):
        if a not in s.Coverage.glyphs:
            return None
        if s.Format == 1:
            for r in s.PairSet[s.Coverage.glyphs.index(a)].PairValueRecord:
                if r.SecondGlyph == b:
                    return (getattr(r.Value1, 'XAdvance', 0) or 0) if r.Value1 else 0
            return None
        c1 = s.ClassDef1.classDefs.get(a, 0)
        c2 = s.ClassDef2.classDefs.get(b, 0)
        if c1 >= len(s.Class1Record):
            return None
        v = s.Class1Record[c1].Class2Record[c2].Value1
        return (getattr(v, 'XAdvance', 0) or 0) if v else 0

    # ---- Oeffentliche Schnittstelle
    def formen(self, zeile: str, schrift_name: str = '') -> list[tuple[str, int]]:
        """[(Glyphenname, Vorschub in Schrifteinheiten inkl. Kerning)] fuer eine Zeile."""
        namen = []
        for ch in zeile:
            n = self.cmap.get(ord(ch))
            if n is None:
                raise PositionsFehler('glyph_missing', f'Zeichen „{ch}“ (U+{ord(ch):04X}) fehlt in der Schrift „{schrift_name or self.pfad}“.')
            namen.append(n)
        g = self.ersetzen(namen)
        k = self.kerning(g)
        return [(n, self.hmtx[n][0] + dk) for n, dk in zip(g, k)]

    def breite(self, formen) -> int:
        return sum(a for _, a in formen)

    def umriss(self, glyph: str, matrix6) -> tuple[str, list | None]:
        """Pfad (SVG-d) und Grenzen eines Glyphen, transformiert mit matrix6 (Schrifteinheiten -> Zielkoordinaten)."""
        pens = abhaengigkeit('fontTools.pens.svgPathPen', 'fonttools')
        tp = abhaengigkeit('fontTools.pens.transformPen', 'fonttools')
        bp = abhaengigkeit('fontTools.pens.boundsPen', 'fonttools')
        pen = pens.SVGPathPen(self.glyphset, ntos=zahl)
        grenzen = bp.BoundsPen(self.glyphset)
        self.glyphset[glyph].draw(tp.TransformPen(pen, matrix6))
        self.glyphset[glyph].draw(tp.TransformPen(grenzen, matrix6))
        return pen.getCommands(), (list(grenzen.bounds) if grenzen.bounds else None)


# --------------------------------------------------------------------------------------------------
# Katalog (nur lesen) und Mapping
# --------------------------------------------------------------------------------------------------

def lade_json(pfad: Path, was: str):
    try:
        return json.loads(pfad.read_text(encoding='utf-8'))
    except FileNotFoundError:
        raise SystemExit(f'{was} nicht gefunden: {pfad}')
    except (OSError, json.JSONDecodeError) as e:
        raise SystemExit(f'{was} nicht lesbar ({pfad}): {e}')


def innerhalb(wurzel: Path, pfad: Path) -> Path:
    r = pfad.resolve()
    if not r.is_relative_to(wurzel.resolve()):
        raise PositionsFehler('katalog_invalid', 'Katalogverweis zeigt außerhalb des Katalogordners.')
    return r


class Katalog:
    def __init__(self, wurzel):
        self.wurzel = Path(wurzel)
        if not self.wurzel.is_dir():
            raise SystemExit(f'Katalogordner nicht gefunden: {self.wurzel}')
        self._schriften = None
        self._designs: dict[str, list] = {}
        self._schriftdateien: dict[str, Schriftdatei] = {}

    def schriften(self) -> dict:
        if self._schriften is None:
            doc = lade_json(self.wurzel / 'schriften' / 'schriften.json', 'schriften.json')
            self._schriften = {f['name']: f for f in doc.get('fonts', []) if isinstance(f, dict) and 'name' in f}
        return self._schriften

    def schrift(self, wunsch: str, aliase: dict) -> tuple[str, Schriftdatei]:
        """Exakter Name, sonst Alias-Tabelle. Kein stiller Ersatz."""
        lib = self.schriften()
        name = wunsch if wunsch in lib else None
        if name is None:
            a = aliase.get(wunsch)
            if a is None:
                a = next((v for k, v in aliase.items() if k.casefold() == wunsch.casefold()), None)
            if a is not None and a in lib:
                name = a
        if name is None:
            raise PositionsFehler('font_unknown', f'Schrift „{wunsch}“ ist in der Schriftbibliothek des Katalogs nicht vorhanden (Alias-Tabelle amazon/font-aliases.json ergänzen).')
        datei = lib[name].get('file')
        if not datei:
            raise PositionsFehler('font_unknown', f'Schrift „{name}“ hat im Katalog keine Schriftdatei (Lizenz/Datei offen).')
        if name not in self._schriftdateien:
            p = innerhalb(self.wurzel, self.wurzel / datei)
            if not p.is_file():
                raise PositionsFehler('font_unknown', f'Schriftdatei für „{name}“ fehlt im Katalog: {datei}')
            self._schriftdateien[name] = Schriftdatei(p)
        return name, self._schriftdateien[name]

    def familie(self, familien_id: str):
        if not IDENT.match(familien_id):
            raise PositionsFehler('family_unknown', 'Ungültige Familien-ID im Mapping.')
        for p in sorted((self.wurzel / 'familien').rglob(f'{familien_id}.json')):
            doc = json.loads(p.read_text(encoding='utf-8'))
            if isinstance(doc, dict) and doc.get('id') == familien_id:
                return doc
        return None

    def designs(self, linie: str) -> list:
        if not IDENT.match(linie):
            raise PositionsFehler('design_unknown', 'Ungültige Linie im Mapping.')
        if linie not in self._designs:
            p = self.wurzel / 'designs' / 'bestand' / linie / 'designs.json'
            if not p.is_file():
                raise PositionsFehler('design_unknown', f'Designverzeichnis der Linie „{linie}“ fehlt im Katalog.')
            self._designs[linie] = json.loads(p.read_text(encoding='utf-8'))
        return self._designs[linie]

    def design_svg(self, linie: str, eintrag: dict) -> tuple[bytes, Path]:
        pfad = innerhalb(self.wurzel, self.wurzel / 'designs' / 'bestand' / linie / str(eintrag.get('path', '')) / 'design.svg')
        if not pfad.is_file():
            raise PositionsFehler('design_unknown', f'design.svg für {eintrag.get("key")} fehlt im Katalog.')
        return pfad.read_bytes(), pfad


class Mapping:
    def __init__(self, ordner):
        o = Path(ordner)
        self.asin = lade_json(o / 'asin-mapping.json', 'asin-mapping.json')
        self.aliase = lade_json(o / 'font-aliases.json', 'font-aliases.json')
        self.overlays = lade_json(o / 'design-overlays.json', 'design-overlays.json')
        for was, d in (('asin-mapping.json', self.asin), ('font-aliases.json', self.aliase), ('design-overlays.json', self.overlays)):
            if not isinstance(d, dict):
                raise SystemExit(f'{was} muss ein JSON-Objekt sein.')
        # Optional, erzeugt aus der produktiven Corel-Tabelle (scripts/build-asin-mapping-from-corel.py).
        # Liefert nur Herkunft/Corel-Pfad als Spur und Hinweis; Familien, Größen und Optionen kommen weiter
        # ausschließlich aus der handgepflegten asin-mapping.json (die hat immer Vorrang).
        corel_pfad = o / 'asin-mapping.corel.json'
        self.corel = lade_json(corel_pfad, 'asin-mapping.corel.json') if corel_pfad.is_file() else {}
        if not isinstance(self.corel, dict):
            raise SystemExit('asin-mapping.corel.json muss ein JSON-Objekt sein.')

    def corel_eintrag(self, asin: str) -> dict | None:
        e = self.corel.get(asin) if not asin.startswith('_') else None
        return e if isinstance(e, dict) else None


def corel_spur(eintrag: dict | None, groesse_wert: str | None, design_nr) -> dict | None:
    """Was die Corel-Skripte für diese ASIN laden würden – als Regel, ohne Dateisystem von V:."""
    if not eintrag:
        return None
    spur = {k: eintrag[k] for k in ('abschnitt', 'corelZeile', 'dateipfad', 'groesseAusOrdner', 'designNummer', 'weitereViews') if k in eintrag}
    teile = [str(eintrag.get('dateipfad') or '')]
    if eintrag.get('groesseAusOrdner'):
        m = re.search(r'(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)', groesse_wert or '')
        teile.append(f'{m.group(1)}x{m.group(2)}*' if m else '<Größenordner>')
    nr = eintrag.get('designNummer') or design_nr
    if nr not in (None, ''):
        teile.append(f'<Standardname>-D{nr}')
    spur['pfadRegel'] = '\\'.join(t for t in teile if t)
    return spur


# --------------------------------------------------------------------------------------------------
# Geometrie der Platte, Bohrungen (gleiche Regel wie app/platform/sources/app/shared/models/mounting-rules.mjs)
# --------------------------------------------------------------------------------------------------

LAYOUTS = {'left-right': 2, 'top-bottom': 2, 'corners': 4, 'top-center': 1}


def bohrungen_fuer(breite: float, hoehe: float, form: str, regel: dict) -> list[dict]:
    """Bohrbild als Regel (Anordnung, Durchmesser, Randabstand bis Mitte), nie als feste Koordinaten."""
    layout, d, e = regel.get('layout'), regel.get('diameterMm'), regel.get('edgeMm')
    if layout == 'none':
        return []
    if layout not in LAYOUTS or regel.get('count') != LAYOUTS[layout]:
        raise PositionsFehler('mounting_invalid', f'Bohrbild-Regel „{regel.get("id")}“: unbekannte Anordnung oder falsche Anzahl.')
    if not isinstance(d, (int, float)) or not isinstance(e, (int, float)) or not (1 <= d <= 12) or e < d / 2:
        raise PositionsFehler('mounting_invalid', f'Bohrbild-Regel „{regel.get("id")}“ ist unvollständig oder ungültig (Durchmesser 1–12 mm, Randabstand ≥ halber Durchmesser).')
    if form == 'ellipse' and layout == 'corners':
        raise PositionsFehler('mounting_invalid', 'Vier Eckbohrungen sind auf einer ovalen Form nicht eindeutig.')
    punkte = {'left-right': [(e, hoehe / 2), (breite - e, hoehe / 2)], 'top-bottom': [(breite / 2, e), (breite / 2, hoehe - e)],
              'corners': [(e, e), (breite - e, e), (e, hoehe - e), (breite - e, hoehe - e)], 'top-center': [(breite / 2, e)]}[layout]
    loecher = [{'x': runde(x, 6), 'y': runde(y, 6), 'diameter': d} for x, y in punkte]
    for i in range(len(loecher)):
        for j in range(i + 1, len(loecher)):
            if math.hypot(loecher[i]['x'] - loecher[j]['x'], loecher[i]['y'] - loecher[j]['y']) < d + 2:
                raise PositionsFehler('mounting_invalid', 'Die Bohrlöcher liegen zu dicht beieinander (mindestens 2 mm Steg).')
    return loecher


def plattenpfad(g: dict) -> str:
    """Aussenkontur als SVG-Pfad in mm (Rechteck mit Eckenradius oder Ellipse)."""
    w, h = g['widthMm'], g['heightMm']
    if g['shape'] == 'ellipse':
        rx, ry = w / 2, h / 2
        return f'M0 {zahl(ry)} A{zahl(rx)} {zahl(ry)} 0 1 1 {zahl(w)} {zahl(ry)} A{zahl(rx)} {zahl(ry)} 0 1 1 0 {zahl(ry)} Z'
    r = min(g.get('cornerRadiusMm') or 0, w / 2, h / 2)
    if r <= 0:
        return f'M0 0 H{zahl(w)} V{zahl(h)} H0 Z'
    return (f'M{zahl(r)} 0 H{zahl(w - r)} A{zahl(r)} {zahl(r)} 0 0 1 {zahl(w)} {zahl(r)} V{zahl(h - r)} A{zahl(r)} {zahl(r)} 0 0 1 {zahl(w - r)} {zahl(h)} '
            f'H{zahl(r)} A{zahl(r)} {zahl(r)} 0 0 1 0 {zahl(h - r)} V{zahl(r)} A{zahl(r)} {zahl(r)} 0 0 1 {zahl(r)} 0 Z')


def geometrie_aus_familie(fam: dict, groesse_key: str | None, sammler: Sammler, label: str) -> tuple[dict, str | None]:
    sizes = [s for s in fam.get('sizes', []) if isinstance(s, dict)]
    if groesse_key:
        s = next((x for x in sizes if x.get('key') == groesse_key), None)
        if s is None:
            raise PositionsFehler('size_unknown', f'Größe „{groesse_key}“ gibt es in der Familie {fam.get("id")} nicht.')
    elif len(sizes) == 1:
        s = sizes[0]
    else:
        raise PositionsFehler('size_unknown', f'Familie {fam.get("id")} hat {len(sizes)} Größen; im Mapping fehlt der sizeKey für „{label}“.')
    gruppe = next((g for g in fam.get('groups', []) if g.get('key') == s.get('groupKey')), None)
    if gruppe is None or not isinstance(s.get('widthMm'), (int, float)) or not isinstance(s.get('heightMm'), (int, float)):
        raise PositionsFehler('size_unknown', f'Größe „{s.get("key")}“ der Familie {fam.get("id")} ist unvollständig (Maße oder Gruppe offen).')
    form = gruppe.get('shape', 'rect')
    if form not in ('rect', 'ellipse'):
        raise PositionsFehler('shape_unsupported', f'Plattenform „{form}“ wird vom Importer noch nicht unterstützt.')
    da = fam.get('designArea') or {}
    return {'widthMm': float(s['widthMm']), 'heightMm': float(s['heightMm']), 'shape': form,
            'cornerRadiusMm': float(s.get('cornerRadiusMm', gruppe.get('cornerRadiusMm', 0)) or 0),
            'marginMm': float(da.get('marginMm') or 0), 'keepoutMm': float(da.get('keepoutMm') or 0)}, s.get('key')


def geometrie_aus_platzhalter(p: dict) -> dict:
    for k in ('widthMm', 'heightMm'):
        if not isinstance(p.get(k), (int, float)) or p[k] <= 0:
            raise PositionsFehler('size_unknown', f'placeholderGeometry ist unvollständig ({k}).')
    form = p.get('shape', 'rect')
    if form not in ('rect', 'ellipse'):
        raise PositionsFehler('shape_unsupported', f'Plattenform „{form}“ wird vom Importer noch nicht unterstützt.')
    return {'widthMm': float(p['widthMm']), 'heightMm': float(p['heightMm']), 'shape': form,
            'cornerRadiusMm': float(p.get('cornerRadiusMm') or 0), 'marginMm': float(p.get('marginMm') or 0), 'keepoutMm': float(p.get('keepoutMm') or 0)}


# --------------------------------------------------------------------------------------------------
# Design aus dem Katalog (Motiv-Vektoren) und Lage im Amazon-Raster
# --------------------------------------------------------------------------------------------------

def waehle_design(eintraege: list, nr: int, form: str, bezug: str) -> dict:
    kand = [e for e in eintraege if e.get('designNo') == nr]
    if not kand:
        raise PositionsFehler('design_unknown', f'Design D{nr} ist im Katalog ({bezug}) nicht vorhanden.')
    if len(kand) > 1:
        gravur = [e for e in kand if e.get('process') == 'Gravur']
        kand = gravur or kand
    if len(kand) > 1:
        wunsch = {'rect': 'Rechteck', 'ellipse': 'Rund'}.get(form)
        passend = [e for e in kand if e.get('form') == wunsch]
        kand = passend or kand
    if len(kand) > 1:
        raise PositionsFehler('design_unknown', f'Design D{nr} ist im Katalog mehrdeutig ({", ".join(str(e.get("key")) for e in kand[:4])}).')
    return kand[0]


def lese_motive(svg_bytes: bytes) -> list[dict]:
    """Sichtbare Motiv-/Deko-Pfade (Ebenen motiv-*, deko-*) mit Transformation und exakter Grenzbox."""
    if b'<!ENTITY' in svg_bytes:
        raise PositionsFehler('design_unknown', 'design.svg enthält ENTITY-Deklarationen.')
    try:
        wurzel = ET.fromstring(svg_bytes)
    except ET.ParseError as e:
        raise PositionsFehler('design_unknown', f'design.svg nicht lesbar: {e}')
    svgpath = abhaengigkeit('fontTools.svgLib.path', 'fonttools')
    bp = abhaengigkeit('fontTools.pens.boundsPen', 'fonttools')
    tp = abhaengigkeit('fontTools.pens.transformPen', 'fonttools')
    ergebnis = []

    def gehe(el, m):
        m2 = mat_mul(m, parse_transform(el.get('transform')))
        if lokal(el.tag) == 'path' and re.match(r'(motiv|deko)-', el.get('id', '')):
            fill, stroke = el.get('fill'), el.get('stroke')
            strich_sichtbar = stroke not in (None, 'none')
            sichtbar = el.get('display') != 'none' and (fill != 'none' or strich_sichtbar)
            if sichtbar and el.get('d'):
                pen = bp.BoundsPen(None)
                try:
                    svgpath.parse_path(el.get('d'), tp.TransformPen(pen, m2))
                except Exception as e:
                    raise PositionsFehler('design_unknown', f'Pfad {el.get("id")} in design.svg nicht lesbar: {e}')
                if pen.bounds:
                    ergebnis.append({'id': el.get('id'), 'd': el.get('d'), 'm': m2, 'bounds': list(pen.bounds), 'fillRule': el.get('fill-rule', 'nonzero'),
                                     'kontur': fill == 'none' and strich_sichtbar, 'strichMm': float(el.get('stroke-width') or 0)})
            return
        for k in el:
            gehe(k, m2)

    gehe(wurzel, IDENTITAET)
    return ergebnis


# --------------------------------------------------------------------------------------------------
# Umrechnung px (400er Raster) -> mm, getrennt in x und y ueber den Druckbereich
# --------------------------------------------------------------------------------------------------

class Raster:
    def __init__(self, bereich: dict, breite_mm: float, hoehe_mm: float):
        self.b = bereich
        self.sx = breite_mm / bereich['width']
        self.sy = hoehe_mm / bereich['height']
        self.matrix = (self.sx, 0.0, 0.0, self.sy, -bereich['x'] * self.sx, -bereich['y'] * self.sy)

    def punkt(self, px, py):
        return ((px - self.b['x']) * self.sx, (py - self.b['y']) * self.sy)

    def box(self, x0, y0, x1, y1):
        a, b = self.punkt(x0, y0)
        c, d = self.punkt(x1, y1)
        return (a, b, c, d)


# --------------------------------------------------------------------------------------------------
# Textfelder
# --------------------------------------------------------------------------------------------------

def normalisiere_text(t: str) -> list[str]:
    t = t.replace('\r\n', '\n').replace('\r', '\n').replace('\t', ' ')
    t = ''.join(c for c in t if c == '\n' or unicodedata.category(c) not in ('Cc', 'Cf'))
    return t.split('\n')


def bestimme_ausrichtung(xs: list[float], breiten: list[float], box_breite: float, groesse: float) -> tuple[str, float]:
    """Leitet die Ausrichtung aus den linken Kanten (tspan-x, relativ zur Textboxmitte) ab.
    Rueckgabe: (Ausrichtung, Restabweichung in Schriftgroessen). Gleichstand -> zentriert."""
    kandidaten = {
        'center': [-w / 2 for w in breiten],
        'left': [-box_breite / 2 for _ in breiten],
        'right': [box_breite / 2 - w for w in breiten],
    }
    beste, rest = 'center', None
    for name in ('center', 'left', 'right'):
        r = max(abs(x - p) for x, p in zip(xs, kandidaten[name])) / groesse
        if rest is None or r < rest - 1e-9:
            beste, rest = name, r
    return beste, rest


def baue_textfelder(roh: dict, fabric: dict, raster: Raster, katalog: Katalog, mapping: Mapping, geom: dict, sammler: Sammler) -> tuple[list[dict], list[dict]]:
    """Gibt (Felder fuer bestellung.json, Zeichnungs-Elemente fuer SVG) zurueck."""
    eingaben = []
    for g in roh['gruppen']:
        for e in g['eingaben']:
            if e['text'].strip():
                eingaben.append((g, e))
    felder, elemente = [], []
    texte = list(fabric['texte'])
    if len(texte) != len(eingaben):
        raise PositionsFehler('layout_missing', f'Fabric-SVG enthält {len(texte)} Texte, die Bestellung aber {len(eingaben)} nicht-leere Texteingaben.')
    benutzt_unvollstaendig = set()
    for n, ((gruppe, eingabe), ft) in enumerate(zip(eingaben, texte), start=1):
        wunsch = gruppe['family'] or ft['familie']
        if gruppe['family'] and ft['familie'] and gruppe['family'] != ft['familie']:
            sammler.warn('schrift_abweichung', f'text-{n}: Schrift in Bestellung „{gruppe["family"]}“, in Fabric-SVG „{ft["familie"]}“ – Bestellung gilt.')
        name, schrift = katalog.schrift(wunsch, mapping.aliase)
        if len(eingabe['text']) > 2000:
            raise PositionsFehler('json_invalid', f'text-{n}: Eingabetext länger als 2000 Zeichen.')
        zeilen = normalisiere_text(eingabe['text'])
        if len(zeilen) > 40:
            raise PositionsFehler('json_invalid', f'text-{n}: mehr als 40 Zeilen.')
        if len(ft['zeilen']) != len(zeilen):
            raise PositionsFehler('layout_missing', f'text-{n}: Fabric-SVG hat {len(ft["zeilen"])} Zeilen, die Eingabe {len(zeilen)}.')
        if [z['text'] for z in ft['zeilen']] != zeilen:
            sammler.warn('text_abweichung', f'text-{n}: Zeilen der Fabric-SVG weichen vom Eingabetext ab; die Eingabe wird gesetzt.')
        m = ft['m']
        a, b, c, d, e, f = m
        skala = math.hypot(a, b)
        if skala <= 0 or abs(math.hypot(c, d) - skala) > 1e-6 * max(1.0, skala) or abs(a * c + b * d) > 1e-6 * max(1.0, skala * skala):
            raise PositionsFehler('layout_missing', f'text-{n}: Transformation des Textes ist verzerrt oder gescherrt.')
        winkel = math.degrees(math.atan2(b, a))
        if abs(winkel) > 1e-6 and abs(raster.sx / raster.sy - 1) > WARN_SEITENVERHAELTNIS:
            sammler.warn('text_gedreht', f'text-{n}: gedrehter Text bei nicht maßgleichem Druckbereich; Drehung um die Textmitte mit y-Maßstab.')
        fs = ft['groesse']
        ku = skala * raster.sy                      # Elementeinheit -> mm (y-Skala, Text nicht verzerrt)
        groesse_mm = fs * ku
        # Zeilen formen
        formen = [schrift.formen(z, name) for z in zeilen]
        breiten = [schrift.breite(fm) * fs / schrift.upm for fm in formen]        # Elementeinheiten, inkl. Leerzeichen am Zeilenende (wie Fabric)
        box_b = max(breiten)
        xs = [z['x'] for z in ft['zeilen']]
        ys = [z['y'] for z in ft['zeilen']]
        ausr, rest = bestimme_ausrichtung(xs, breiten, box_b, fs)
        if rest > WARN_AUSRICHTUNG:
            sammler.warn('ausrichtung_unsicher', f'text-{n}: Ausrichtung nicht eindeutig aus der Fabric-SVG ableitbar (Restabweichung {rest * 100:.1f} % der Schriftgröße); „{ausr}“ gewählt.')
        pl = eingabe['platzierung'] or {}
        dim = pl.get('dimension') if isinstance(pl.get('dimension'), dict) else {}
        if isinstance(dim.get('width'), (int, float)) and dim['width'] > 0 and abs(box_b - dim['width']) / dim['width'] > WARN_SCHRIFTBREITE:
            sammler.warn('schriftbreite', f'text-{n}: berechnete Textbreite {box_b:.1f} weicht von Amazon ({dim["width"]:.1f}) um {abs(box_b - dim["width"]) / dim["width"] * 100:.1f} % ab – Schrift oder Zeichensatz prüfen.')
        xl = {'center': [-w / 2 for w in breiten], 'left': [-box_b / 2 for _ in breiten], 'right': [box_b / 2 - w for w in breiten]}[ausr]
        xc, yc = raster.punkt(e, f)                                              # Mittelpunkt der Textbox in mm
        k = fs * ku / schrift.upm                                                # Schrifteinheit -> mm
        teile, grenzen = [], None
        for zeile_formen, x_links, y_basis in zip(formen, xl, ys):
            pen_x = 0.0
            for glyph, vorschub in zeile_formen:
                gx = (x_links * ku) + pen_x * k
                gy = y_basis * ku
                dpfad, gb = schrift.umriss(glyph, (k, 0, 0, -k, gx, gy))
                if dpfad:
                    teile.append(dpfad)
                if gb:
                    grenzen = gb if grenzen is None else [min(grenzen[0], gb[0]), min(grenzen[1], gb[1]), max(grenzen[2], gb[2]), max(grenzen[3], gb[3])]
                pen_x += vorschub
        if schrift.nicht_unterstuetzt:
            benutzt_unvollstaendig.add(name)
        w_rad = math.radians(winkel)
        cw, sw = math.cos(w_rad), math.sin(w_rad)
        absbox = None
        if grenzen:
            ecken = [(grenzen[0], grenzen[1]), (grenzen[2], grenzen[1]), (grenzen[0], grenzen[3]), (grenzen[2], grenzen[3])]
            abs_ecken = [(xc + x * cw - y * sw, yc + x * sw + y * cw) for x, y in ecken]
            absbox = [min(p[0] for p in abs_ecken), min(p[1] for p in abs_ecken), max(p[0] for p in abs_ecken), max(p[1] for p in abs_ecken)]
        ax_lokal = {'center': 0.0, 'left': -box_b / 2, 'right': box_b / 2}[ausr] * ku
        ay_lokal = ys[0] * ku
        anker_x = xc + ax_lokal * cw - ay_lokal * sw
        anker_y = yc + ax_lokal * sw + ay_lokal * cw
        zeilenabstand = (ys[1] - ys[0]) * ku if len(ys) > 1 else None
        felder.append({'id': f'text-{n}', 'type': 'text', 'text': '\n'.join(zeilen), 'lines': zeilen, 'font': name, 'fontRequested': wunsch,
                       'sizeMm': runde(groesse_mm), 'x': runde(anker_x), 'y': runde(anker_y), 'align': ausr,
                       'lineHeightMm': runde(zeilenabstand) if zeilenabstand is not None else None, 'rotation': runde(winkel),
                       'boxMm': [runde(xc), runde(yc), runde(box_b * ku), runde((ys[-1] - ys[0]) * ku + fs * ku * 1.13)],
                       'bboxMm': [runde(v) for v in absbox] if absbox else None,
                       'quelle': {'gruppe': gruppe['name'], 'eingabe': eingabe['name']}})
        elemente.append({'id': f'text-{n}', 'art': 'text', 'font': name, 'd': ' '.join(teile), 'transform': (xc, yc, winkel), 'bbox': absbox, 'clip': ft['clip']})
    for name in sorted(benutzt_unvollstaendig):
        sammler.warn('shaping_unvollstaendig', f'Schrift „{name}“: einzelne OpenType-Regeln werden nicht umgesetzt; Text mit der Amazon-Vorschau vergleichen.')
    return felder, elemente


# --------------------------------------------------------------------------------------------------
# Foto
# --------------------------------------------------------------------------------------------------

def pil_laden():
    return abhaengigkeit('PIL.Image', 'pillow')


def lese_foto(daten: bytes, sammler: Sammler):
    Image = pil_laden()
    Image.MAX_IMAGE_PIXELS = MAX_BILD_PIXEL
    ops = abhaengigkeit('PIL.ImageOps', 'pillow')
    if not daten.startswith(b'\xff\xd8'):
        raise PositionsFehler('photo_missing', 'Die Fotodatei ist kein JPEG.')
    try:
        bild = Image.open(io.BytesIO(daten))
        bild.load()
    except Exception as e:
        raise PositionsFehler('photo_missing', f'Die Fotodatei ist nicht lesbar: {e}')
    if bild.width * bild.height > MAX_BILD_PIXEL:
        raise PositionsFehler('photo_missing', 'Das Foto hat mehr als 100 Megapixel.')
    drehung = 1
    try:
        drehung = bild.getexif().get(0x0112, 1)
    except Exception:
        pass
    if drehung not in (None, 1):
        bild = ops.exif_transpose(bild)
        out = io.BytesIO()
        bild.convert('RGB').save(out, format='JPEG', quality=95)
        daten = out.getvalue()
        sammler.warn('foto_gedreht', 'Das Foto trägt eine EXIF-Drehung; es wurde gedreht und neu gespeichert (nicht mehr byte-gleich zum Original).')
    return bild, daten


def foto_grau(bild):
    Image = pil_laden()
    rgb = bild.convert('RGBA')
    weiss = Image.new('RGBA', rgb.size, 'white')
    weiss.alpha_composite(rgb)
    return weiss.convert('RGB').convert('L', (.2126, .7152, .0722, 0))


def baue_foto(roh: dict, fabric: dict, raster: Raster, dateien: dict, geom: dict, sammler: Sammler):
    """Foto-Feld und Zeichnungselement; (None, None), wenn kein Foto bestellt wurde."""
    if not roh['fotos']:
        return None, None
    if len(roh['fotos']) > 1:
        sammler.warn('mehrere_fotos', 'Die Bestellung enthält mehrere Fotos; nur das erste wird verarbeitet.')
    f = roh['fotos'][0]
    name = f['bildName']
    if not name or name not in dateien:
        raise PositionsFehler('photo_missing', f'Das Kundenfoto „{name or "?"}“ fehlt im ZIP.')
    bild, daten = lese_foto(dateien[name], sammler)
    quelle = next((b for b in fabric['bilder'] if PurePosixPath(b['href']).name == name and '://' not in b['href']), None)
    if quelle is not None:
        m, ix, iy, iw, ih, clip = quelle['m'], quelle['x'], quelle['y'], quelle['w'], quelle['h'], quelle['clip']
    else:
        p = f['platzierung']
        if not p or abs(float(p.get('angleOfRotation') or 0)) > 1e-9:
            raise PositionsFehler('layout_missing', 'Foto kommt in der Fabric-SVG nicht vor und lässt sich ohne Drehung nicht aus buyerPlacement ableiten.')
        sk = p.get('scale') or {}
        pos, dim = p.get('position') or {}, p.get('dimension') or {}
        m = (endlich(sk.get('scaleX'), 'scaleX'), 0.0, 0.0, endlich(sk.get('scaleY'), 'scaleY'), endlich(pos.get('x'), 'position.x'), endlich(pos.get('y'), 'position.y'))
        ix, iy, iw, ih, clip = 0.0, 0.0, endlich(dim.get('width'), 'dimension.width'), endlich(dim.get('height'), 'dimension.height'), None
        sammler.warn('foto_layout_ersatz', 'Fotolage aus buyerPlacement abgeleitet (Fabric-SVG enthielt das Foto nicht).')
    if (bild.width, bild.height) != (round(iw), round(ih)):
        sammler.warn('foto_pixel', f'Foto hat {bild.width}×{bild.height} px, die Fabric-SVG rechnet mit {iw:.0f}×{ih:.0f} px (Streckung wie in der Amazon-Vorschau).')
    # Abbildung lokal (iw x ih) -> mm
    mm = mat_mul(raster.matrix, mat_mul(m, (1, 0, 0, 1, ix, iy)))
    winkel = math.degrees(math.atan2(m[1], m[0]))
    if abs(winkel) > 1e-6 and abs(raster.sx / raster.sy - 1) > WARN_SEITENVERHAELTNIS:
        sammler.warn('foto_gedreht_verzerrt', 'Das Foto ist gedreht und der Druckbereich ist nicht maßgleich; das Foto wird leicht geschert.')
    if clip is None:
        clip = (raster.b['x'], raster.b['y'], raster.b['x'] + raster.b['width'], raster.b['y'] + raster.b['height'])
    cm = raster.box(*clip)
    achsparallel = abs(mm[1]) < 1e-9 and abs(mm[2]) < 1e-9 and mm[0] > 0 and mm[3] > 0
    crop = None
    if achsparallel:
        bx0, by0 = mm[4], mm[5]
        bx1, by1 = bx0 + mm[0] * iw, by0 + mm[3] * ih
        crop = [max(bx0, cm[0]), max(by0, cm[1]), min(bx1, cm[2]), min(by1, cm[3])]
        if crop[2] <= crop[0] or crop[3] <= crop[1]:
            sammler.warn('foto_ausserhalb', 'Das Foto liegt vollständig außerhalb des Druckbereichs.')
            crop = None
    feld = {'id': 'foto-1', 'type': 'photo', 'file': 'foto-1.jpg', 'sha256': sha256(daten), 'pixels': [bild.width, bild.height],
            'sizeMm': [runde(math.hypot(mm[0], mm[1]) * iw), runde(math.hypot(mm[2], mm[3]) * ih)],
            'centerMm': [runde(mm[0] * (iw / 2) + mm[2] * (ih / 2) + mm[4]), runde(mm[1] * (iw / 2) + mm[3] * (ih / 2) + mm[5])],
            'scale': {'x': runde(math.hypot(mm[0], mm[1]) * iw / bild.width, 6), 'y': runde(math.hypot(mm[2], mm[3]) * ih / bild.height, 6)},
            'rotation': runde(winkel), 'cropMm': [runde(v) for v in crop] if crop else None,
            'clipMm': [runde(v) for v in cm], 'freistellung': 'werkstatt-standard (Weiß bleibt unbelichtet; Graustufen wie Raster-Worker)'}
    element = {'id': 'foto-1', 'art': 'foto', 'daten': daten, 'bild': bild, 'matrix': mm, 'lokal': (iw, ih), 'clip': cm, 'crop': crop, 'achsparallel': achsparallel}
    return feld, element


# --------------------------------------------------------------------------------------------------
# Motiv
# --------------------------------------------------------------------------------------------------

def baue_motiv(design_eintrag: dict, svg_bytes: bytes, overlay: dict, raster: Raster, sammler: Sammler, design_label: str):
    motive = lese_motive(svg_bytes)
    if not motive:
        sammler.warn('design_ohne_motiv', f'{design_label}: Das Katalogdesign enthält kein sichtbares Motiv (Ebenen motiv-*/deko-*).')
        return None, []
    bbox = overlay.get('bbox400')
    if not (isinstance(bbox, list) and len(bbox) == 4 and all(isinstance(v, (int, float)) for v in bbox) and bbox[2] > 0 and bbox[3] > 0):
        raise PositionsFehler('overlay_unknown', f'design-overlays.json: bbox400 für {design_label} fehlt oder ist ungültig.')
    quelle = str(overlay.get('quelle', ''))
    if quelle.startswith('geschätzt'):
        sammler.warn('overlay_geschaetzt', f'Lage des Motivs ({design_label}) ist nur geschätzt ({quelle}); bitte kalibrieren (Kalibrierlauf laut Spezifikation Abschnitt 6, scripts/calibrate-amazon-overlays.py ist noch nicht gebaut).')
    mx0 = min(m['bounds'][0] for m in motive)
    my0 = min(m['bounds'][1] for m in motive)
    mx1 = max(m['bounds'][2] for m in motive)
    my1 = max(m['bounds'][3] for m in motive)
    mb, mh = mx1 - mx0, my1 - my0
    bx, by, bw, bh = bbox
    if mb <= 0 or mh <= 0:
        raise PositionsFehler('design_unknown', f'{design_label}: Motivgröße ist null.')
    abw = abs((bw / bh) / (mb / mh) - 1)
    if abw > WARN_MOTIVPROPORTION:
        sammler.warn('motivproportion', f'Motivproportion: Amazon-Box {bw / bh:.3f} : 1 gegenüber Katalogmotiv {mb / mh:.3f} : 1 (Abweichung {abw * 100:.1f} %); Motiv wird proportional eingepasst.')
    x0, y0, x1, y1 = raster.box(bx, by, bx + bw, by + bh)
    k = min((x1 - x0) / mb, (y1 - y0) / mh)
    tx = (x0 + x1) / 2 - k * (mx0 + mx1) / 2
    ty = (y0 + y1) / 2 - k * (my0 + my1) / 2
    elemente = []
    for m in motive:
        elemente.append({'id': m['id'], 'art': 'motiv', 'd': m['d'], 'matrix': mat_mul((k, 0, 0, k, tx, ty), m['m']), 'fillRule': m['fillRule'], 'kontur': m['kontur'], 'strichMm': m['strichMm'] * k})
    info = {'designNo': design_eintrag.get('designNo'), 'boxMm': [runde(x0), runde(y0), runde(x1 - x0), runde(y1 - y0)], 'bbox400': bbox,
            'massstab': runde(k, 6), 'groesseMm': [runde(mb * k), runde(mh * k)], 'lagequelle': quelle}
    return info, elemente


# --------------------------------------------------------------------------------------------------
# Ausgabe: SVG (gravur, druck, kontur, vorschau)
# --------------------------------------------------------------------------------------------------

def fmt_matrix(m) -> str:
    return 'matrix(' + ' '.join(f'{v:.6f}'.rstrip('0').rstrip('.') if abs(v) >= 1e-9 else '0' for v in m) + ')'


def data_uri_png(bild) -> str:
    out = io.BytesIO()
    bild.save(out, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()


def foto_elemente(foto: dict, modus: str) -> tuple[str, str]:
    """(defs, body) fuer das Foto je Modus. 'svg': Originaldatei per Verweis; sonst Graustufen eingebettet."""
    mm, (iw, ih) = foto['matrix'], foto['lokal']
    cx0, cy0, cx1, cy1 = foto['clip']
    defs = f'<clipPath id="clip-foto-1"><rect x="{zahl(cx0)}" y="{zahl(cy0)}" width="{zahl(cx1 - cx0)}" height="{zahl(cy1 - cy0)}"/></clipPath>'
    if modus == 'svg':
        body = (f'<g id="foto-1" data-role="engrave" clip-path="url(#clip-foto-1)"><image width="{zahl(iw)}" height="{zahl(ih)}" preserveAspectRatio="none" '
                f'transform="{fmt_matrix(mm)}" xlink:href="foto-1.jpg"/></g>')
        return defs, body
    grau = foto_grau(foto['bild'])
    if foto['achsparallel'] and foto['crop']:
        bx0, by0 = mm[4], mm[5]
        pw, ph = grau.size
        sx, sy = mm[0] * iw / pw, mm[3] * ih / ph                       # mm je Pixel
        c = foto['crop']
        u0, v0 = max(0, math.floor((c[0] - bx0) / sx)), max(0, math.floor((c[1] - by0) / sy))
        u1, v1 = min(pw, math.ceil((c[2] - bx0) / sx)), min(ph, math.ceil((c[3] - by0) / sy))
        teil = grau.crop((u0, v0, u1, v1))
        body = (f'<image id="foto-1" data-role="engrave" x="{zahl(bx0 + u0 * sx)}" y="{zahl(by0 + v0 * sy)}" width="{zahl((u1 - u0) * sx)}" height="{zahl((v1 - v0) * sy)}" '
                f'preserveAspectRatio="none" xlink:href="{data_uri_png(teil)}"/>')
        return '', body
    body = (f'<g id="foto-1" data-role="engrave" clip-path="url(#clip-foto-1)"><image width="{zahl(iw)}" height="{zahl(ih)}" preserveAspectRatio="none" '
            f'transform="{fmt_matrix(mm)}" xlink:href="{data_uri_png(grau)}"/></g>')
    return defs, body


def baue_svg(modell: dict, modus: str) -> str:
    """modus: 'svg' (Gravurdatei mit Hilfs-/Schnittebenen), 'druck' (nur Gravur), 'kontur' (nur Schnitt), 'vorschau' (Simulation auf Schiefer)."""
    g = modell['geom']
    w, h = g['widthMm'], g['heightMm']
    farbe = VORSCHAUFARBE if modus == 'vorschau' else GRAVURFARBE
    teile = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {zahl(w)} {zahl(h)}" width="{zahl(w)}mm" height="{zahl(h)}mm">']
    defs, body = [], []
    pfad = plattenpfad(g)
    if modus == 'vorschau':
        body.append(f'<rect width="{zahl(w)}" height="{zahl(h)}" fill="#ffffff"/><path d="{pfad}" fill="#151515" stroke="#777777" stroke-width="0.3"/>')
    if modus == 'svg':
        body.append(f'<g id="platte" data-role="guide"><path d="{pfad}" fill="none" stroke="#999999" stroke-width="0.2"/></g>')
    if modus in ('svg', 'kontur', 'vorschau'):
        kreise = ''.join(f'<circle cx="{zahl(b["x"])}" cy="{zahl(b["y"])}" r="{zahl(b["diameter"] / 2)}" fill="none" stroke="{"#888888" if modus == "vorschau" else ("#ff0000" if modus == "svg" else "#000000")}" stroke-width="{"0.3" if modus == "vorschau" else "0.1" if modus == "svg" else "0.05"}"/>' for b in modell['bohrungen'])
        if modus == 'kontur':
            body.append(f'<path d="{pfad}" fill="none" stroke="#000000" stroke-width="0.05"/>')
        if kreise or modus == 'svg':
            body.append(f'<g id="bohrungen" data-role="cut">{kreise}</g>' if modus != 'vorschau' else kreise)
    if modus != 'kontur':
        if modell['foto'] is not None:
            d, b = foto_elemente(modell['foto'], 'svg' if modus == 'svg' else 'druck')
            if d:
                defs.append(d)
            if modus == 'vorschau':
                b = b.replace('data-role="engrave" ', '')
            body.append(b)
        for m in modell['motive']:
            if m['kontur']:
                attr = f'fill="none" stroke="{farbe}" stroke-width="{zahl(m["strichMm"] or 0.1)}"'
            else:
                attr = f'fill="{farbe}" stroke="none"'
            body.append(f'<path id="{m["id"]}" data-role="engrave" transform="{fmt_matrix(m["matrix"])}" d="{m["d"]}" {attr} fill-rule="{m["fillRule"]}"/>')
        for t in modell['texte']:
            xc, yc, winkel = t['transform']
            tr = f'translate({zahl(xc)} {zahl(yc)})' + (f' rotate({zahl(winkel)})' if abs(winkel) > 1e-9 else '')
            body.append(f'<g id="{t["id"]}" data-role="engrave" data-font="{t["font"]}" transform="{tr}"><path d="{t["d"]}" fill="{farbe}"/></g>')
    if defs:
        teile.append('<defs>' + ''.join(defs) + '</defs>')
    teile.extend(body)
    teile.append('</svg>')
    return '\n'.join(teile) + '\n'


# --------------------------------------------------------------------------------------------------
# PDF
# --------------------------------------------------------------------------------------------------

def cairo_verfuegbar() -> bool:
    try:
        import cairosvg  # noqa: F401
        return True
    except (ImportError, OSError):
        return False


def pdf_aus_svg(svg: str, breite_mm: float, hoehe_mm: float, backend: str = 'auto', titel: str = 'Gravuru Amazon-Import') -> bytes:
    fitz = pymupdf_laden()
    if backend == 'auto':
        backend = 'cairo' if cairo_verfuegbar() else 'mupdf'
    if backend == 'cairo':
        import cairosvg
        pdf = cairosvg.svg2pdf(bytestring=svg.encode('utf-8'))
    elif backend == 'mupdf':
        if 'clip-path=' in svg and '<clipPath' in svg:
            raise PositionsFehler('pdf_backend', 'Gedrehte oder gespiegelte Fotos benötigen CairoSVG (libcairo); der PyMuPDF-Ersatzweg kann keine Beschneidung.')
        doc = fitz.open(stream=svg.encode('utf-8'), filetype='svg')
        pdf = doc.convert_to_pdf()
        doc.close()
    else:
        raise PositionsFehler('pdf_backend', f'Unbekanntes PDF-Verfahren „{backend}“.')
    doc = fitz.open(stream=pdf, filetype='pdf')
    seite = doc[0]
    k = 72 / 25.4
    if abs(seite.rect.width - breite_mm * k) > 0.05 or abs(seite.rect.height - hoehe_mm * k) > 0.05:
        raise PositionsFehler('pdf_masse', f'PDF-Seitenmaß {seite.rect.width / k:.2f} × {seite.rect.height / k:.2f} mm weicht vom Plattenmaß ab.')
    doc.set_metadata({'title': titel, 'creator': 'gravuru-2027 import-amazon-order.py', 'subject': 'Keine Fertigungsfreigabe (productionReady=false)'})
    out = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return out


_ERSATZ = {'–': '-', '—': '-', '†': '+', '„': '"', '“': '"', '”': '"', '’': "'", '‘': "'", '…': '...', '€': 'EUR', '•': '*'}


def latin(s: str) -> str:
    s = ''.join(_ERSATZ.get(c, c) for c in str(s))
    return s.encode('latin-1', 'replace').decode('latin-1')


def baue_summary_pdf(modell: dict, vorschau_png: bytes | None, amazon_jpg: bytes | None, summary: dict) -> bytes:
    fitz = pymupdf_laden()
    doc = fitz.open()
    seite = doc.new_page(width=842, height=595)
    rand = 28
    seite.insert_text((rand, 34), latin(f'Amazon-Custom-Auftrag {summary["orderId"]} / {summary["orderItemId"]}'), fontsize=15, fontname='hebo')
    zeile2 = f'ASIN {summary["asin"]}  ·  SKU {summary["sku"]}  ·  Familie {summary["familyId"]} ({summary["familyStatus"]})  ·  Platte {summary["plate"]["widthMm"]:g} × {summary["plate"]["heightMm"]:g} mm  ·  Design {summary["designLabel"] or "ohne Motiv"}'
    seite.insert_text((rand, 50), latin(zeile2), fontsize=8.5)
    seite.insert_text((rand, 62), 'KEINE PRODUKTIONSFREIGABE - Sichtprüfung gegen die Amazon-Vorschau (Freigabe ist Paket K5).', fontsize=8.5, fontname='hebo', color=(0.7, 0, 0))
    bildhoehe = 230
    oben = 72
    x = rand
    seite.insert_text((x, oben + 8), 'Amazon-Vorschau (400 px)', fontsize=8)
    if amazon_jpg:
        seite.insert_image(fitz.Rect(x, oben + 12, x + bildhoehe, oben + 12 + bildhoehe), stream=amazon_jpg)
    else:
        seite.insert_text((x, oben + 40), 'Amazon-Vorschau fehlt im ZIP.', fontsize=8)
    x2 = x + bildhoehe + 18
    breite_unser = 842 - rand - x2
    seite.insert_text((x2, oben + 8), 'Unsere Vorschau (aus gravur.svg, Gravur hell auf Schiefer)', fontsize=8)
    if vorschau_png:
        w, h = modell['geom']['widthMm'], modell['geom']['heightMm']
        bw = min(breite_unser, bildhoehe * w / h)
        seite.insert_image(fitz.Rect(x2, oben + 12, x2 + bw, oben + 12 + bw * h / w), stream=vorschau_png)
    y = oben + 12 + bildhoehe + 20
    seite.insert_text((rand, y), 'Felder', fontsize=9, fontname='hebo')
    y += 11
    spalten = [(rand, 'Feld'), (rand + 48, 'Text / Datei'), (rand + 250, 'Schrift'), (rand + 350, 'Größe mm'), (rand + 398, 'Lage x / y mm'), (rand + 470, 'Ausr.')]
    for sx, titel in spalten:
        seite.insert_text((sx, y), titel, fontsize=7.5, fontname='hebo')
    y += 3
    seite.draw_line((rand, y), (rand + 520, y), width=0.4)
    y += 9
    for f in summary['fields']:
        if y > 500:
            seite.insert_text((rand, y), '... weitere Felder siehe summary.json', fontsize=7)
            y += 9
            break
        if f['type'] == 'text':
            erste = f['lines'][0] if f['lines'] else ''
            text = erste + (' ...' if len(f['lines']) > 1 else '')
            vals = [f['id'], text[:42], f['font'], f'{f["sizeMm"]:.1f}', f'{f["x"]:.1f} / {f["y"]:.1f}', f['align']]
        else:
            vals = [f['id'], f['file'], 'Foto', f'{f["sizeMm"][0]:.0f}x{f["sizeMm"][1]:.0f}', f'{f["centerMm"][0]:.1f} / {f["centerMm"][1]:.1f}', f'{f["rotation"]:g} Grad']
        for (sx, _), v in zip(spalten, vals):
            seite.insert_text((sx, y), latin(v), fontsize=7.5)
        y += 10
    if summary.get('motiv'):
        mt = summary['motiv']
        seite.insert_text((rand, y), latin(f'Motiv D{mt["designNo"]}: Box {mt["boxMm"][2]:.1f} x {mt["boxMm"][3]:.1f} mm bei {mt["boxMm"][0]:.1f} / {mt["boxMm"][1]:.1f}, Lage: {mt["lagequelle"]}'), fontsize=7.5)
        y += 10
    # rechte Spalte: Optionen, Anmerkung, Warnungen
    rx = rand + 545
    ry = oben + 12 + bildhoehe + 20
    seite.insert_text((rx, ry), 'Optionen / Befestigung', fontsize=9, fontname='hebo')
    ry += 11
    for o in summary['options']:
        wert = o['value'] + (f' (+{o["aufpreisCent"] / 100:.2f} EUR)' if o.get('aufpreisCent') else '')
        for zl in _umbruch(f'{o["label"] or o["name"]}: {wert}', 62):
            seite.insert_text((rx, ry), latin(zl), fontsize=7.5)
            ry += 9
    if summary.get('note'):
        ry += 3
        seite.insert_text((rx, ry), 'ANMERKUNG (Sichtprüfung!):', fontsize=7.5, fontname='hebo', color=(0.7, 0, 0))
        ry += 9
        for zl in _umbruch(summary['note'], 62):
            seite.insert_text((rx, ry), latin(zl), fontsize=7.5)
            ry += 9
    ry += 4
    seite.insert_text((rx, ry), f'Warnungen ({len(summary["warnings"])})', fontsize=9, fontname='hebo')
    ry += 11
    for wn in summary['warnings']:
        for i, zl in enumerate(_umbruch(wn['text'], 66)):
            if ry > 520:
                break
            seite.insert_text((rx, ry), latin(('- ' if i == 0 else '  ') + zl), fontsize=7)
            ry += 8.5
    # Pruefkaestchen
    fy = 556
    seite.draw_line((rand, fy - 12), (842 - rand, fy - 12), width=0.4)
    seite.draw_rect(fitz.Rect(rand, fy - 8, rand + 9, fy + 1), width=0.7)
    seite.insert_text((rand + 14, fy), 'Texte, Schrift, Foto und Motiv gegen Amazon-Vorschau geprüft', fontsize=8.5)
    seite.insert_text((rand + 330, fy), 'freigegeben von: ______________________', fontsize=8.5)
    seite.insert_text((rand + 560, fy), 'am: ______________', fontsize=8.5)
    doc.set_metadata({'title': 'Gravuru Amazon-Import Summary', 'creator': 'gravuru-2027 import-amazon-order.py', 'subject': 'Keine Fertigungsfreigabe'})
    out = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return out


def _umbruch(text: str, breite: int) -> list[str]:
    zeilen = []
    for absatz in str(text).split('\n'):
        akt = ''
        for wort in absatz.split(' '):
            if len(akt) + len(wort) + (1 if akt else 0) > breite:
                if akt:
                    zeilen.append(akt)
                akt = wort
            else:
                akt = (akt + ' ' + wort) if akt else wort
        zeilen.append(akt)
    return zeilen


def vorschau_png(svg_vorschau: str, w_mm: float, h_mm: float, backend: str) -> bytes:
    fitz = pymupdf_laden()
    pdf = pdf_aus_svg(svg_vorschau, w_mm, h_mm, backend)
    doc = fitz.open(stream=pdf, filetype='pdf')
    png = doc[0].get_pixmap(dpi=200).tobytes('png')
    doc.close()
    return png


# --------------------------------------------------------------------------------------------------
# Position verarbeiten
# --------------------------------------------------------------------------------------------------

def finde_option(roh: dict, namen: list[str]):
    for o in roh['optionen']:
        if o['name'] in namen:
            return o
    return None


def verarbeite_position(dateien: dict[str, bytes], dokument_name: str, doc: dict, katalog: Katalog, mapping: Mapping, backend: str, nur_pruefen: bool, zip_hinweise: list[dict]) -> dict:
    """Gibt {'roh', 'modell', 'bestellung', 'summary', 'warnungen', 'quellen'} zurueck oder wirft PositionsFehler."""
    sammler = Sammler()
    for h in zip_hinweise:
        sammler.warn(h['code'], h['text'])
    roh = extrahiere(doc)
    eintrag = mapping.asin.get(roh['asin'])
    corel = mapping.corel_eintrag(roh['asin'])
    if not isinstance(eintrag, dict):
        if corel:
            raise PositionsFehler('asin_unknown', f'ASIN „{roh["asin"]}“ steht nicht in amazon/asin-mapping.json, aber in der Corel-Tabelle '
                                  f'(Zeile {corel.get("corelZeile")}, Abschnitt {corel.get("abschnitt")}, Pfad {corel.get("dateipfad")}); '
                                  f'Familie, Größen und Optionen in asin-mapping.json ergänzen.')
        raise PositionsFehler('asin_unknown', f'ASIN „{roh["asin"]}“ steht nicht in amazon/asin-mapping.json (und nicht in der Corel-Tabelle).')
    # --- Groesse -> Familie
    groesse = finde_option(roh, [eintrag.get('sizeOption', 'Größe')])
    if groesse is None:
        raise PositionsFehler('size_unknown', 'Die Bestellung enthält keine Größen-Option.')
    fam_ref = (eintrag.get('familyBySize') or {}).get(groesse['wert'])
    if fam_ref is None:
        raise PositionsFehler('size_unknown', f'Größe „{groesse["wert"]}“ hat in amazon/asin-mapping.json keinen Familieneintrag (Maße werden nie aus dem Optionstext gelesen).')
    fam_id, size_key = (fam_ref, None) if isinstance(fam_ref, str) else (fam_ref.get('familyId'), fam_ref.get('sizeKey'))
    familie = katalog.familie(str(fam_id))
    platzhalter = (eintrag.get('placeholderGeometry') or {}).get(fam_id)
    if familie is not None:
        geom, size_key = geometrie_aus_familie(familie, size_key, sammler, groesse['wert'])
        familien_status, regeln = 'katalog', {r['id']: r for r in familie.get('mountingRules', []) if isinstance(r, dict) and 'id' in r}
    elif isinstance(platzhalter, dict):
        geom = geometrie_aus_platzhalter(platzhalter)
        familien_status, regeln = 'platzhalter', {r['id']: r for r in platzhalter.get('mountingRules', []) if isinstance(r, dict) and 'id' in r}
        sammler.warn('familie_platzhalter', f'Familie {fam_id} gibt es im Katalog noch nicht (Entscheidung offen); Platzhaltermaße {geom["widthMm"]:g} × {geom["heightMm"]:g} mm, Rand {geom["marginMm"]:g} mm, Form {geom["shape"]} aus dem Mapping.')
    else:
        raise PositionsFehler('family_unknown', f'Familie „{fam_id}“ fehlt im Katalog und hat keine placeholderGeometry im Mapping.')
    # --- Druckbereich und Umrechnung
    bereich = druckbereich(roh, sammler)
    raster = Raster(bereich, geom['widthMm'], geom['heightMm'])
    verhaeltnis_plate = geom['widthMm'] / geom['heightMm']
    verhaeltnis_area = bereich['width'] / bereich['height']
    abw = abs(verhaeltnis_plate / verhaeltnis_area - 1)
    if abw > WARN_SEITENVERHAELTNIS:
        sammler.warn('seitenverhaeltnis', f'Seitenverhältnis Druckbereich {verhaeltnis_area:.3f} zu Platte {verhaeltnis_plate:.3f} (Abweichung {abw * 100:.1f} %): Position getrennt in x und y umgerechnet, Text unverzerrt, Foto und Motiv in beiden Achsen.')
    # --- Fabric-SVG
    svg_name = roh['svg']
    if not svg_name or svg_name not in dateien:
        raise PositionsFehler('layout_missing', 'Die Fabric-SVG der Oberfläche fehlt im ZIP.')
    fabric = parse_fabric(dateien[svg_name])
    # --- Foto
    foto_feld, foto_el = baue_foto(roh, fabric, raster, dateien, geom, sammler)
    # --- Design / Motiv
    design_option = finde_option(roh, [eintrag.get('designOption', 'Designs'), 'Design'])
    design_id = design_label = None
    design_info = None
    motiv_elemente: list[dict] = []
    if design_option is None:
        sammler.warn('design_option_fehlt', 'Die Bestellung enthält keine Design-Option; es wird kein Motiv gesetzt.')
    else:
        design_label = design_option['wert']
        if re.match(r'\s*Design\s+Frei\b', design_label, re.I):
            design_info = None
        else:
            treffer = DESIGN_NR.findall(design_label)
            if not treffer:
                raise PositionsFehler('design_unknown', f'In „{design_label}“ ist keine Design-Nummer (Dxxx) erkennbar.')
            nr = int(treffer[-1])
            linie = eintrag.get('linie')
            d_eintrag = waehle_design(katalog.designs(str(linie)), nr, geom['shape'], f'Linie {linie}')
            svg_bytes, _ = katalog.design_svg(str(linie), d_eintrag)
            overlay = (mapping.overlays.get(str(linie)) or {}).get(str(nr))
            if not isinstance(overlay, dict):
                raise PositionsFehler('overlay_unknown', f'design-overlays.json hat keinen Eintrag für Design D{nr} (Linie {linie}); die Lage im Amazon-Raster ist unbekannt.')
            design_info, motiv_elemente = baue_motiv(d_eintrag, svg_bytes, overlay, raster, sammler, f'D{nr}')
            design_id = d_eintrag.get('masterId')
            design_info = dict(design_info or {}, key=d_eintrag.get('key'), masterId=design_id)
            if re.search(r'ohne\s+Freistellung', design_label, re.I):
                sammler.warn('design_ohne_freistellung', 'Design „ohne Freistellung“ bestellt: Foto wird ohne Motiv-Freistellung gesetzt.')
    # --- Texte
    textfelder, textelemente = baue_textfelder(roh, fabric, raster, katalog, mapping, geom, sammler)
    # --- Befestigung und Optionen
    befestigung_name = eintrag.get('mountingOption', 'var_befestigung')
    bohr_regeln = eintrag.get('mountingByOption') or {}
    optionen_map = eintrag.get('optionsByName') or {}
    befestigung = {'optionValue': None, 'ruleId': None, 'holes': []}
    bohrungen: list[dict] = []
    optionen_aus = []
    for o in roh['optionen']:
        if o['name'] in (eintrag.get('sizeOption', 'Größe'), eintrag.get('designOption', 'Designs'), 'Design'):
            continue
        opt_id = optionen_map.get(o['wert'])
        if o['name'] == befestigung_name:
            befestigung['optionValue'] = o['wert']
            if o['wert'] in bohr_regeln:
                rid = bohr_regeln[o['wert']]
                befestigung['ruleId'] = rid
                if rid is not None:
                    regel = regeln.get(rid)
                    if regel is None:
                        sammler.warn('bohrbild_offen', f'Bohrbild „{rid}“ ist für {fam_id} nicht bestimmbar (Regel fehlt); es werden keine Bohrungen gezeichnet.')
                    else:
                        bohrungen = bohrungen_fuer(geom['widthMm'], geom['heightMm'], geom['shape'], regel)
            elif opt_id is None:
                sammler.warn('befestigung_unbekannt', f'Befestigung „{o["wert"]}“ ist im Mapping nicht hinterlegt; keine Bohrungen gezeichnet.')
        elif opt_id is None:
            sammler.warn('option_unbekannt', f'Option „{o["label"] or o["name"]}“ = „{o["wert"]}“ ist im Mapping nicht hinterlegt.')
        optionen_aus.append({'name': o['name'], 'label': o['label'], 'value': o['wert'], 'id': opt_id, 'aufpreisCent': o['aufpreisCent']})
    befestigung['holes'] = bohrungen
    # --- Pruefungen Lage
    rand = geom['marginMm']
    for t in textfelder:
        bb = t['bboxMm']
        if not bb:
            continue
        if bb[0] < 0 or bb[1] < 0 or bb[2] > geom['widthMm'] or bb[3] > geom['heightMm']:
            sammler.warn('text_ausserhalb', f'{t["id"]} ragt über die Platte hinaus.')
        elif rand and (bb[0] < rand or bb[1] < rand or bb[2] > geom['widthMm'] - rand or bb[3] > geom['heightMm'] - rand):
            sammler.warn('text_im_rand', f'{t["id"]} liegt im Randbereich (< {rand:g} mm).')
        for b in bohrungen:
            r = b['diameter'] / 2 + geom['keepoutMm']
            nx, ny = min(max(b['x'], bb[0]), bb[2]), min(max(b['y'], bb[1]), bb[3])
            if math.hypot(nx - b['x'], ny - b['y']) < r:
                sammler.warn('text_am_bohrloch', f'{t["id"]} berührt die Schutzzone eines Bohrlochs.')
                break
    anmerkung = roh['anmerkung'].strip()
    if anmerkung:
        sammler.warn('anmerkung', 'Der Kunde hat eine Anmerkung hinterlassen (Sichtprüfung vor Gravur).')
    # --- Ergebnis
    quellen = {dokument_name: sha256(dateien[dokument_name]), svg_name: sha256(dateien[svg_name])}
    if foto_feld:
        quellen[roh['fotos'][0]['bildName']] = sha256(dateien[roh['fotos'][0]['bildName']])
    if roh['snapshot'] and roh['snapshot'] in dateien:
        quellen[roh['snapshot']] = sha256(dateien[roh['snapshot']])
    for n in sorted(dateien):
        if n.lower().endswith('.xml') and n not in quellen:
            quellen[n] = sha256(dateien[n])
    felder = list(textfelder) + ([foto_feld] if foto_feld else [])
    bestellung = {
        'schema': SCHEMA_BESTELLUNG, 'source': 'amazon-custom', 'orderId': roh['orderId'], 'orderItemId': roh['orderItemId'], 'asin': roh['asin'],
        'sku': eintrag.get('sku'), 'quantity': roh['menge'], 'familyId': fam_id, 'familyStatus': familien_status, 'sizeKey': size_key,
        'sizeOption': groesse['wert'], 'plate': {'widthMm': geom['widthMm'], 'heightMm': geom['heightMm'], 'shape': geom['shape'], 'cornerRadiusMm': geom['cornerRadiusMm'],
                                                'marginMm': geom['marginMm'], 'keepoutMm': geom['keepoutMm']},
        'printArea': dict(bereich, unit='px400'), 'designId': design_id, 'designLabel': design_label, 'design': design_info,
        'fields': felder, 'mounting': befestigung, 'options': optionen_aus, 'note': anmerkung, 'warnings': sammler.warnungen,
        'productionReady': False, 'sourceSha256': quellen,
    }
    summary = {
        'schema': SCHEMA_SUMMARY, 'orderId': roh['orderId'], 'orderItemId': roh['orderItemId'], 'asin': roh['asin'], 'sku': eintrag.get('sku'),
        'familyId': fam_id, 'familyStatus': familien_status, 'sizeKey': size_key, 'plate': bestellung['plate'], 'designLabel': design_label, 'designId': design_id,
        'motiv': design_info, 'fields': felder, 'options': optionen_aus, 'mounting': befestigung, 'note': anmerkung,
        'aufpreisSummeCent': sum(o['aufpreisCent'] for o in optionen_aus), 'warnings': sammler.warnungen, 'errors': [], 'productionReady': False,
        'files': {}, 'sourceSha256': quellen,
    }
    spur = corel_spur(corel, groesse['wert'], (DESIGN_NR.findall(design_label or '') or [None])[-1])
    if spur:
        summary['corel'] = spur   # nur Summary (Paritätsprüfung), nicht Teil von gravuru-order/v1
    modell ={'geom': geom, 'foto': foto_el, 'motive': motiv_elemente, 'texte': textelemente, 'bohrungen': bohrungen}
    return {'roh': roh, 'modell': modell, 'bestellung': bestellung, 'summary': summary, 'foto_daten': foto_el['daten'] if foto_el else None,
            'amazon_vorschau': dateien.get(roh['snapshot']) if roh['snapshot'] else None}


def json_bytes(obj) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def schreibe_position(pos: dict, ordner: Path, backend: str, nur_pruefen: bool) -> dict:
    """Schreibt alle Ausgaben; gibt {Datei: sha256} zurueck."""
    ordner.mkdir(parents=True, exist_ok=True)
    modell, summary, bestellung = pos['modell'], pos['summary'], pos['bestellung']
    dateien: dict[str, bytes] = {}
    if not nur_pruefen:
        g = modell['geom']
        svg = baue_svg(modell, 'svg')
        dateien['gravur.svg'] = svg.encode('utf-8')
        if pos['foto_daten'] is not None:
            dateien['foto-1.jpg'] = pos['foto_daten']
        dateien['gravur.pdf'] = pdf_aus_svg(baue_svg(modell, 'druck'), g['widthMm'], g['heightMm'], backend, 'Gravuru Amazon-Import Gravur 1:1')
        dateien['kontur.pdf'] = pdf_aus_svg(baue_svg(modell, 'kontur'), g['widthMm'], g['heightMm'], backend, 'Gravuru Amazon-Import Kontur 1:1')
        vp = vorschau_png(baue_svg(modell, 'vorschau'), g['widthMm'], g['heightMm'], backend)
        summary['files'] = {n: sha256(b) for n, b in dateien.items()}
        dateien['summary.pdf'] = baue_summary_pdf(modell, vp, pos['amazon_vorschau'], summary)
        summary['files']['summary.pdf'] = sha256(dateien['summary.pdf'])
    dateien['bestellung.json'] = json_bytes(bestellung)
    summary['files']['bestellung.json'] = sha256(dateien['bestellung.json'])
    dateien['summary.json'] = json_bytes(summary)
    for name, daten in dateien.items():
        (ordner / name).write_bytes(daten)
    return {n: sha256(b) for n, b in dateien.items()}


# --------------------------------------------------------------------------------------------------
# Lauf
# --------------------------------------------------------------------------------------------------

def verarbeite_zip(zip_pfad, katalog: Katalog, mapping: Mapping, out: Path, backend: str, nur_pruefen: bool) -> dict:
    ergebnis = {'zip': Path(zip_pfad).name, 'positionen': [], 'fehler': []}
    try:
        dateien, hinweise = lese_zip(zip_pfad)
        dokumente = lade_bestelldokumente(dateien)
    except PositionsFehler as e:
        ergebnis['fehler'].append({'code': e.code, 'text': e.text})
        return ergebnis
    for name, doc in dokumente:
        eintrag = {'quelle': name, 'status': 'ok', 'fehler': [], 'warnungen': [], 'ordner': None}
        try:
            pos = verarbeite_position(dateien, name, doc, katalog, mapping, backend, nur_pruefen, hinweise)
            ordner = out / f'{pos["roh"]["orderId"]}_{pos["roh"]["orderItemId"]}'
            eintrag['ordner'] = ordner.name
            eintrag['warnungen'] = pos['bestellung']['warnings']
            schreibe_position(pos, ordner, backend, nur_pruefen)
        except PositionsFehler as e:
            eintrag['status'] = 'fehler'
            eintrag['fehler'].append({'code': e.code, 'text': e.text})
            oid, iid = str(doc.get('orderId', '')), str(doc.get('orderItemId', ''))
            if BESTELL_ID.match(oid) and BESTELL_ID.match(iid):
                ordner = out / f'{oid}_{iid}'
                ordner.mkdir(parents=True, exist_ok=True)
                eintrag['ordner'] = ordner.name
                (ordner / 'fehler.json').write_bytes(json_bytes({'schema': 'gravuru-amazon-fehler/v1', 'orderId': oid, 'orderItemId': iid, 'errors': eintrag['fehler'], 'productionReady': False}))
        ergebnis['positionen'].append(eintrag)
    return ergebnis


def main(argv=None) -> int:
    wurzel = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description='Amazon-Custom-Bestell-ZIP -> gravuru-Bestellung und Gravurdatei (Paket K15).')
    ap.add_argument('--zip', action='append', required=True, help='Bestell-ZIP aus Seller Central (mehrfach möglich)')
    ap.add_argument('--katalog', required=True, help='Pfad zum Repo gravuru-katalog (nur lesen)')
    ap.add_argument('--mapping', default=str(wurzel / 'amazon'), help='Ordner mit asin-mapping.json, font-aliases.json, design-overlays.json')
    ap.add_argument('--out', required=True, help='Ausgabeordner (außerhalb des Repos, enthält Kundendaten)')
    ap.add_argument('--nur-pruefen', action='store_true', help='nur bestellung.json und summary.json, keine Grafik')
    ap.add_argument('--pdf-verfahren', choices=['auto', 'cairo', 'mupdf'], default='auto', help='PDF-Erzeugung (auto: CairoSVG, sonst PyMuPDF)')
    a = ap.parse_args(argv)
    out = Path(a.out)
    katalog, mapping = Katalog(a.katalog), Mapping(a.mapping)
    out.mkdir(parents=True, exist_ok=True)
    lauf = {'schema': SCHEMA_LAUF, 'zips': [], 'productionReady': False}
    fehler_gesamt = 0
    for z in a.zip:
        r = verarbeite_zip(z, katalog, mapping, out, a.pdf_verfahren, a.nur_pruefen)
        lauf['zips'].append(r)
        n_fehler = len(r['fehler']) + sum(1 for p in r['positionen'] if p['status'] != 'ok')
        fehler_gesamt += n_fehler
        for f in r['fehler']:
            print(f'FEHLER {r["zip"]}: [{f["code"]}] {f["text"]}')
        for p in r['positionen']:
            kopf = f'{r["zip"]} -> {p["ordner"] or "-"}'
            if p['status'] == 'ok':
                print(f'OK     {kopf} ({len(p["warnungen"])} Warnungen)')
                for w in p['warnungen']:
                    print(f'  Warnung [{w["code"]}] {w["text"]}')
            else:
                for f in p['fehler']:
                    print(f'FEHLER {kopf}: [{f["code"]}] {f["text"]}')
    (out / 'import-lauf.json').write_bytes(json_bytes(lauf))
    return 1 if fehler_gesamt else 0


if __name__ == '__main__':
    sys.exit(main())
