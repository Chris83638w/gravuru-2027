#!/usr/bin/env python3
"""Schriften aus dem Katalog als WOFF2 für den Browser bereitstellen.

Eingabe (stdin, JSON): {"out": "<Ordner>", "fonts": [{"name": ..., "file": ..., "ofl": bool}]}
Ausgabe (stdout, JSON): je Schrift Dateiname, Größe und Kennwerte.

Regeln:
- Die Quelldateien im Katalog werden nie verändert.
- Schriften unter SIL Open Font License werden auf lateinische Zeichen reduziert
  (übliches Web-Verfahren, spart den größten Teil der Dateigröße).
- Alle anderen Schriften werden nur verlustfrei in WOFF2 verpackt, nicht reduziert.
- Ligaturen und kontextabhängige Varianten bleiben in der Datei; der Editor schaltet sie
  für die Darstellung aus, damit Vorschau und Fertigungsdatei dieselben Buchstabenformen haben.
"""
import hashlib
import io
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

# Basis-Latein, Latin-1, Latin Extended-A, typografische Zeichen, Euro, Herz-/Sternzeichen.
UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) +
    [0x2010, 0x2011, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
     0x2020, 0x2022, 0x2026, 0x2032, 0x2033, 0x2039, 0x203A, 0x20AC, 0x2122,
     0x2605, 0x2606, 0x2661, 0x2665, 0x266A, 0x271D, 0x2764, 0x1E9E]
)


# Zeichen, die in deutschen Namen und Adressen vorkommen. Fehlt eines in einer Schrift, zeigt der Browser dafür
# still eine Ersatzschrift. Die Liste der fehlenden Zeichen wird veröffentlicht, damit der Editor warnen kann.
REFERENZ = [chr(c) for c in list(range(0x21, 0x7F)) + list(range(0xA1, 0x100)) if c != 0xAD] + list('„“‚‘’–—…€')


def fehlende(cmap):
    return ''.join(c for c in REFERENZ if ord(c) not in cmap)


def slug(name):
    out = ''.join(c.lower() if c.isalnum() else '-' for c in name)
    while '--' in out:
        out = out.replace('--', '-')
    return out.strip('-')


def alte_unterschneidung(font):
    """Unterschneidung nur in der alten Tabelle „kern“, nicht in GPOS.

    Browser gehen damit uneinheitlich um (Chrome verwirft die Tabelle bei manchen Schriften ganz). Für solche
    Schriften wird die Unterschneidung deshalb in Vorschau UND Fertigung abgeschaltet: gleiche Darstellung überall.
    """
    if 'kern' not in font:
        return False
    gpos = font['GPOS'].table if 'GPOS' in font else None
    features = gpos.FeatureList.FeatureRecord if gpos is not None and gpos.FeatureList else []
    return not any(record.FeatureTag == 'kern' for record in features)


def convert(entry, out_dir):
    font = TTFont(entry['file'], lazy=False)
    altkern = alte_unterschneidung(font)
    reduced = False
    if entry.get('ofl'):
        options = subset.Options()
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.notdef_outline = True
        options.glyph_names = False
        options.hinting = False
        options.desubroutinize = True
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=UNICODES)
        subsetter.subset(font)
        reduced = True
    font.flavor = 'woff2'
    buffer = io.BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    digest = hashlib.sha256(data).hexdigest()[:12]
    file_name = f"{slug(entry['name'])}.{digest}.woff2"
    with open(os.path.join(out_dir, file_name), 'wb') as handle:
        handle.write(data)
    # Für die Fertigung: die unveränderte Originaldatei (nicht öffentlich, nicht reduziert).
    original = slug(entry['name']) + os.path.splitext(entry['file'])[1].lower()
    if entry.get('original_dir'):
        import shutil
        shutil.copyfile(entry['file'], os.path.join(entry['original_dir'], original))
    head, hhea, os2 = font['head'], font['hhea'], font['OS/2'] if 'OS/2' in font else None
    cmap = font.getBestCmap() or {}
    return {
        'name': entry['name'],
        'file': file_name,
        'bytes': len(data),
        'sourceBytes': os.path.getsize(entry['file']),
        'reduced': reduced,
        'unitsPerEm': head.unitsPerEm,
        'ascender': hhea.ascent,
        'descender': hhea.descent,
        'capHeight': getattr(os2, 'sCapHeight', None) if os2 else None,
        'glyphs': len(cmap),
        'original': original,
        'fehlt': fehlende(TTFont(entry['file'], lazy=True).getBestCmap() or {}),
        'altkern': altkern,
    }


def convert_glyphs(entry, out_dir):
    """Schrift aus den Glyphendaten des Bestands bauen (JSON mit Umrissen je Zeichen).

    Für wenige Schriften der Funkklingel-Designs liegt im Katalog keine Schriftdatei, nur die Umrisse,
    mit denen der bisherige Konfigurator zeichnet. Aus genau diesen Umrissen entsteht hier eine WOFF2-Datei:
    gleiche Buchstabenformen und Laufweiten wie bisher, ohne Unterschneidung (die hatten die Daten nie).
    """
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.t2CharStringPen import T2CharStringPen
    from fontTools.svgLib.path import parse_path

    with open(entry['glyphs'], encoding='utf-8') as handle:
        source = json.load(handle)['regular']
    units = source['units']
    order, cmap, advances, charstrings = ['.notdef'], {}, {'.notdef': units // 2}, {}
    pen = T2CharStringPen(units // 2, None)
    charstrings['.notdef'] = pen.getCharString()
    for char, glyph in source['glyphs'].items():
        if len(char) != 1:
            continue
        name = 'uni%04X' % ord(char)
        pen = T2CharStringPen(glyph['a'], None)
        if glyph.get('d'):
            parse_path(glyph['d'], pen)
        order.append(name)
        cmap[ord(char)] = name
        advances[name] = glyph['a']
        charstrings[name] = pen.getCharString()
    builder = FontBuilder(units, isTTF=False)
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap(cmap)
    builder.setupCFF(entry['name'].replace(' ', ''), {'FullName': entry['name']}, charstrings, {})
    builder.setupHorizontalMetrics({name: (advances[name], 0) for name in order})
    builder.setupHorizontalHeader(ascent=source.get('ascent', units), descent=source.get('descent', -units // 4))
    builder.setupNameTable({'familyName': entry['name'], 'styleName': 'Regular'})
    builder.setupOS2(sTypoAscender=source.get('ascent', units), sTypoDescender=source.get('descent', -units // 4), usWinAscent=source.get('ascent', units), usWinDescent=-source.get('descent', -units // 4))
    builder.setupPost()
    font = builder.font
    original = slug(entry['name']) + '.otf'
    if entry.get('original_dir'):
        font.save(os.path.join(entry['original_dir'], original))
    font.flavor = 'woff2'
    buffer = io.BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    file_name = f"{slug(entry['name'])}.{hashlib.sha256(data).hexdigest()[:12]}.woff2"
    with open(os.path.join(out_dir, file_name), 'wb') as handle:
        handle.write(data)
    return {'name': entry['name'], 'file': file_name, 'bytes': len(data), 'sourceBytes': os.path.getsize(entry['glyphs']), 'reduced': False,
            'unitsPerEm': units, 'ascender': source.get('ascent', units), 'descender': source.get('descent', -units // 4), 'capHeight': None, 'glyphs': len(cmap), 'ausGlyphen': True, 'original': original, 'fehlt': fehlende(cmap)}


def main():
    job = json.load(sys.stdin)
    os.makedirs(job['out'], exist_ok=True)
    if job.get('original'):
        os.makedirs(job['original'], exist_ok=True)
        for entry in job['fonts']:
            entry['original_dir'] = job['original']
    result, errors = [], []
    for entry in job['fonts']:
        try:
            result.append(convert_glyphs(entry, job['out']) if entry.get('glyphs') else convert(entry, job['out']))
        except Exception as error:  # eine defekte Schrift darf den Lauf nicht abbrechen
            errors.append({'name': entry['name'], 'error': str(error)})
    json.dump({'fonts': result, 'errors': errors}, sys.stdout)


if __name__ == '__main__':
    main()
