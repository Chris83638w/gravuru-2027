"""Convert every mapped Unicode glyph; never silently subset a merchant font."""
import base64, io, json, sys
try:
    import resource
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024**2, 512 * 1024**2))
    resource.setrlimit(resource.RLIMIT_CPU, (20, 20))
except ImportError:
    pass
try:
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    raw = base64.b64decode(json.load(sys.stdin)['bytes'], validate=True)
    if raw[:4] not in (b'\x00\x01\x00\x00', b'OTTO'):
        raise ValueError('Bitte eine einzelne TTF- oder OTF-Schrift auswählen.')
    font = TTFont(io.BytesIO(raw), lazy=False)
    if 'fvar' in font:
        raise ValueError('Bitte einen festen Schriftschnitt statt einer variablen Schrift hochladen.')
    cmap = font.getBestCmap() or {}
    if not cmap or len(cmap) > 10000:
        raise ValueError('Die Schrift muss 1 bis 10.000 Unicode-Zeichen enthalten.')
    # E4 (P2-13): required characters for engraving texts. Missing ones are reported,
    # the library decides (reject, or accept with a reason for digits-only/capitals-only fonts).
    required = 'ÄÖÜäöüß€0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,-\' '
    missing = [c for c in required if ord(c) not in cmap]
    glyphset = font.getGlyphSet()
    glyphs = {}
    for codepoint, name in cmap.items():
        if codepoint < 32 or 0xD800 <= codepoint <= 0xDFFF:
            continue
        pen = SVGPathPen(glyphset)
        glyphset[name].draw(pen)
        glyphs[chr(codepoint)] = {'a': glyphset[name].width, 'd': pen.getCommands()}
    name = font['name'].getDebugName(4) or font['name'].getDebugName(1) or 'Importierte Schrift'
    result = {'name': name, 'glyphCount': len(glyphs), 'missingGlyphs': missing, 'font': {'regular': {'units': font['head'].unitsPerEm, 'glyphs': glyphs}}}
    encoded = json.dumps(result, ensure_ascii=True, separators=(',', ':'))
    if len(encoded) > 8 * 1024**2:
        raise ValueError('Die vollständigen Schriftpfade sind zu umfangreich (über 8 MB).')
    print(encoded)
except Exception as error:
    message = str(error) if isinstance(error, ValueError) else 'Die Schrift konnte nicht gelesen werden. Bitte eine gültige TTF- oder OTF-Datei verwenden.'
    print(json.dumps({'error': message}))
    sys.exit(1)
