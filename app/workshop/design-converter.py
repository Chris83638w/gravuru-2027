"""Bounded, fixed-artwork import. Originals belong in the caller's immutable store.

stdin: JSON {kind, bytes: base64, page?: 1}; stdout: result or {error:{code,message}}.
No inferred editable fields and no raster fallback. SVG uses only Python stdlib;
PDF additionally requires PyMuPDF. Run in a subprocess with timeout/output limits.
"""
import base64
import copy
import binascii
import io
import json
import math
import re
import struct
import sys
import xml.etree.ElementTree as ET

MAX_INPUT = 15 * 1024 * 1024
MAX_OUTPUT = 30 * 1024 * 1024
SVG_NS = 'http://www.w3.org/2000/svg'
XLINK_NS = 'http://www.w3.org/1999/xlink'
XML_NS = 'http://www.w3.org/XML/1998/namespace'
TAGS = set('svg g path rect circle ellipse line polyline polygon defs clipPath mask linearGradient radialGradient stop title desc use symbol image pattern'.split())
ATTRS = set(('id version data-text x y x1 y1 x2 y2 cx cy r rx ry width height d points transform viewBox preserveAspectRatio '
             'fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset '
             'opacity color clip-path clip-rule mask maskUnits maskContentUnits mask-type '
             'gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity fx fy fr '
             'patternUnits patternContentUnits patternTransform overflow display visibility vector-effect '
             'shape-rendering image-rendering color-interpolation color-rendering paint-order href').split())
STYLE_ATTRS = set(('fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset '
                   'opacity color clip-path clip-rule mask mask-type stop-color stop-opacity overflow display visibility vector-effect '
                   'shape-rendering image-rendering color-interpolation color-rendering paint-order').split())
IDENTIFIER = re.compile(r'[A-Za-z_][A-Za-z0-9_.:-]{0,159}\Z')
NUMBER = r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?'
LENGTH = re.compile(r'(' + NUMBER + r')(mm|cm|in|pt|pc|px)?\Z')
LOCAL_URL = re.compile(r'url\(\s*[\'\"]?#([A-Za-z_][A-Za-z0-9_.:-]{0,159})[\'\"]?\s*\)\Z')
STANDARD_PDF_FONTS = set(('Courier Courier-Bold Courier-Oblique Courier-BoldOblique '
                          'Helvetica Helvetica-Bold Helvetica-Oblique Helvetica-BoldOblique '
                          'Times-Roman Times-Bold Times-Italic Times-BoldItalic Symbol ZapfDingbats').split())
ET.register_namespace('', SVG_NS)


class ImportFailure(Exception):
    def __init__(self, message, code='unsupported_design'):
        super().__init__(message)
        self.code = code


def require(condition, message, code='unsupported_design'):
    if not condition:
        raise ImportFailure(message, code)


def dimension(value):
    match = LENGTH.fullmatch(value.strip())
    require(match is not None, 'SVG-Maße benötigen mm, cm, in, pt, pc oder px; Prozentmaße werden nicht unterstützt.')
    amount, unit = float(match[1]), match[2] or 'px'
    require(math.isfinite(amount) and amount > 0, 'SVG-Maße müssen endlich und positiv sein.')
    return amount * {'mm': 1, 'cm': 10, 'in': 25.4, 'pt': 25.4 / 72, 'pc': 25.4 / 6, 'px': 25.4 / 96}[unit], unit


def raster(value):
    match = re.fullmatch(r'data:image/(png|jpeg);base64,([A-Za-z0-9+/=\s]+)', value)
    require(match is not None, 'Bilder müssen vollständig als PNG oder JPEG eingebettet sein; externe Quellen sind nicht erlaubt.')
    try:
        raw = base64.b64decode(re.sub(r'\s', '', match[2]), validate=True)
    except (ValueError, binascii.Error):
        raise ImportFailure('Das eingebettete Bild ist ungültig.')
    require(0 < len(raw) <= MAX_INPUT, 'Das eingebettete Bild ist zu groß oder leer.')
    require(raw.startswith(b'\x89PNG\r\n\x1a\n') if match[1] == 'png' else raw.startswith(b'\xff\xd8\xff'), 'Der Bildtyp stimmt nicht mit den eingebetteten Daten überein.')
    dimensions = None
    if match[1] == 'png':
        require(len(raw) >= 45 and raw[12:16] == b'IHDR' and raw[-8:-4] == b'IEND', 'Das eingebettete PNG ist abgeschnitten.')
        dimensions = struct.unpack('>II', raw[16:24])
    else:
        require(raw.endswith(b'\xff\xd9'), 'Das eingebettete JPEG ist abgeschnitten.')
        cursor = 2
        while cursor + 4 <= len(raw):
            require(raw[cursor] == 255, 'Ungültige JPEG-Bildstruktur.')
            while cursor < len(raw) and raw[cursor] == 255:
                cursor += 1
            require(cursor < len(raw), 'Ungültige JPEG-Bildstruktur.')
            marker = raw[cursor]
            cursor += 1
            if marker in (0xda, 0xd9):
                break
            if marker == 1 or 0xd0 <= marker <= 0xd7:
                continue
            require(cursor + 2 <= len(raw), 'Ungültige JPEG-Bildstruktur.')
            length = int.from_bytes(raw[cursor:cursor + 2], 'big')
            require(length >= 2 and cursor + length <= len(raw), 'Ungültige JPEG-Segmentlänge.')
            if marker in (0xc0, 0xc1, 0xc2):
                require(length >= 8, 'Ungültige JPEG-Bildgröße.')
                height, width = struct.unpack('>HH', raw[cursor + 3:cursor + 7])
                dimensions = (width, height)
            cursor += length
    require(dimensions is not None and all(0 < n <= 32768 for n in dimensions) and dimensions[0] * dimensions[1] <= 64000000, 'Das eingebettete Bild ist ungültig oder überschreitet 64 Millionen Pixel.', 'size_limit')
    return 'data:image/' + match[1] + ';base64,' + base64.b64encode(raw).decode('ascii')


def sanitize_svg(raw):
    require(len(raw) <= MAX_OUTPUT, 'Die SVG-Ausgabe ist zu groß.', 'size_limit')
    try:
        source = raw.decode('utf-8-sig')
    except UnicodeError:
        raise ImportFailure('SVG muss UTF-8 verwenden.')
    require(not re.search(r'<!DOCTYPE|<!ENTITY', source, re.I), 'DOCTYPE und XML-Entitäten sind nicht erlaubt.')
    require(not re.search(r'<\?(?!xml\s)', source, re.I), 'XML-Verarbeitungsanweisungen sind nicht erlaubt.')
    # Iterate before building the full tree so excessively deep input is rejected early.
    depth = count = 0
    try:
        iterator = ET.iterparse(io.StringIO(source), events=('start', 'end'))
        for event, node in iterator:
            if event == 'start':
                depth += 1
                count += 1
                require(depth <= 64 and count <= 50000, 'SVG ist zu tief verschachtelt oder enthält zu viele Elemente.', 'complexity_limit')
            else:
                depth -= 1
        root = iterator.root
    except ET.ParseError:
        raise ImportFailure('Die SVG-Datei enthält ungültiges XML.')

    ids, references, warnings = {}, [], []
    def visit(node):
        tag = node.tag
        if tag.startswith('{'):
            namespace, tag = tag[1:].split('}', 1)
            require(namespace == SVG_NS, 'Fremde XML-Namensräume werden nicht unterstützt.')
        if tag in ('text', 'tspan', 'textPath'):
            raise ImportFailure('Text in Pfade umwandeln und die SVG-Datei erneut hochladen. Schriftarten werden nicht automatisch ersetzt.', 'text_requires_outlines')
        require(tag in TAGS, 'SVG-Element wird nicht unterstützt: ' + tag)
        node.tag = '{' + SVG_NS + '}' + tag
        if tag not in ('title', 'desc'):
            require(not (node.text or '').strip(), 'SVG enthält Text außerhalb eines unterstützten Elements.')
        require(not (node.tail or '').strip(), 'SVG enthält nicht unterstützten Text.')
        attrs = {}
        style = node.attrib.get('style')
        for key, value in node.attrib.items():
            if key == 'style':
                continue
            if key == '{' + XLINK_NS + '}href':
                key = 'href'
            elif key in ('{http://www.inkscape.org/namespaces/inkscape}groupmode', '{http://www.inkscape.org/namespaces/inkscape}label'):
                # MuPDF annotates PDF optional-content layers. These editor-only
                # labels do not affect geometry, color, visibility or rendering.
                if key.endswith('}groupmode'):
                    require(value == 'layer', 'Unbekannte SVG-Ebenenannotation.')
                continue
            elif key == '{' + XML_NS + '}space':
                require(value in ('preserve', 'default'), 'Ungültiger XML-Abstandswert.')
                continue
            require(key in ATTRS, 'SVG-Attribut wird nicht unterstützt: ' + key)
            require(key not in attrs, 'Doppelte SVG-Referenz.')
            attrs[key] = value
        if style is not None:
            require(not re.search(r'[/\\@{}!]', style), 'Nicht unterstützte SVG-Stilangabe.')
            for declaration in style.split(';'):
                if not declaration.strip():
                    continue
                require(':' in declaration, 'Ungültige SVG-Stilangabe.')
                key, value = (part.strip() for part in declaration.split(':', 1))
                require(key in STYLE_ATTRS and value, 'SVG-Stileigenschaft wird nicht unterstützt: ' + key)
                attrs[key] = value
        for key, value in list(attrs.items()):
            if key == 'data-text':
                # MuPDF annotates outlined glyph uses with their source character.
                # This remains escaped inert metadata, never editable SVG text.
                require(tag == 'use' and len(value) <= 32 and not re.search(r'[\x00-\x1f]', value), 'Ungültige SVG-Glyphenmetadaten.')
                continue
            require(not re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\\<>]', value), 'SVG enthält ungültige Attributwerte.')
            if key == 'id':
                require(IDENTIFIER.fullmatch(value) and value not in ids, 'SVG benötigt eindeutige gültige IDs.')
                ids[value] = node
            elif key == 'href':
                if tag == 'image':
                    attrs[key] = raster(value)
                else:
                    require(tag in ('use', 'linearGradient', 'radialGradient', 'pattern') and value.startswith('#') and IDENTIFIER.fullmatch(value[1:]), 'Nur interne SVG-Verweise sind erlaubt.')
                    references.append((node, value[1:]))
            elif key == 'version':
                require(tag == 'svg' and value in ('1.0', '1.1', '2.0'), 'SVG-Version wird nicht unterstützt.')
            elif re.search(r'url\s*\(', value, re.I):
                match = LOCAL_URL.fullmatch(value)
                require(key in ('fill', 'stroke', 'clip-path', 'mask') and match, 'Nur interne SVG-Farb- und Maskenverweise sind erlaubt.')
                references.append((node, match[1]))
                attrs[key] = 'url(#' + match[1] + ')'
            else:
                require(not re.search(r'(?:javascript|https?|file|data):|[{};@]|\b(?:var|env|expression)\s*\(', value, re.I), 'Externe oder dynamische SVG-Inhalte sind nicht erlaubt.')
        if tag == 'image':
            require('href' in attrs, 'Eingebettete Bilddaten fehlen.')
        if tag == 'use':
            require('href' in attrs, 'SVG-use benötigt einen internen Verweis.')
        node.attrib.clear()
        node.attrib.update(attrs)
        for child in node:
            visit(child)
    visit(root)
    require(root.tag == '{' + SVG_NS + '}svg', 'Die Datei benötigt ein SVG-Wurzelelement.')
    # References plus containment form the expansion graph: cycles and exponential
    # reuse are rejected, including indirect references through enclosing groups.
    edges = {node: list(node) for node in root.iter()}
    for node, target in references:
        require(target in ids, 'SVG verweist auf eine fehlende ID: ' + target)
        edges[node].append(ids[target])
    active, costs = set(), {}
    def cost(node, level=0):
        require(level <= 128 and node not in active, 'SVG enthält zyklische oder zu tiefe interne Verweise.', 'complexity_limit')
        if node in costs:
            return costs[node]
        active.add(node)
        total = 1
        for child in edges[node]:
            total += cost(child, level + 1)
            require(total <= 200000, 'SVG-Verweise erzeugen zu viele Elemente.', 'complexity_limit')
        active.remove(node)
        costs[node] = total
        return total
    cost(root)
    view = root.get('viewBox')
    box = None
    if view:
        values = re.split(r'[\s,]+', view.strip())
        require(len(values) == 4 and all(re.fullmatch(NUMBER, v) for v in values), 'SVG-viewBox ist ungültig.')
        box = list(map(float, values))
        require(all(map(math.isfinite, box)) and box[2] > 0 and box[3] > 0, 'SVG-viewBox muss positive Maße besitzen.')
    width = dimension(root.get('width')) if root.get('width') else None
    height = dimension(root.get('height')) if root.get('height') else None
    require(box is not None or (width and height), 'SVG benötigt width/height oder eine gültige viewBox.')
    if not box:
        box = [0, 0, width[0] * 96 / 25.4, height[0] * 96 / 25.4]
    if not width and not height:
        width, height = (box[2] * 25.4 / 96, 'px'), (box[3] * 25.4 / 96, 'px')
        width_source = 'viewBox-96dpi'
    elif not width:
        width = (height[0] * box[2] / box[3], height[1])
        width_source = 'height-and-viewBox'
    elif not height:
        height = (width[0] * box[3] / box[2], width[1])
        width_source = 'width-and-viewBox'
    else:
        width_source = 'explicit-dimensions'
    require(all(math.isfinite(v[0]) and 0 < v[0] <= 100000 for v in (width, height)), 'SVG-Abmessungen sind zu groß oder ungültig.')
    if width[1] == 'px' or height[1] == 'px':
        warnings.append('SVG-Pixelmaße bzw. einheitenlose Maße wurden mit 96 dpi in Millimeter umgerechnet.')
    root.set('width', format(width[0], '.12g') + 'mm')
    root.set('height', format(height[0], '.12g') + 'mm')
    root.set('viewBox', ' '.join(format(v, '.12g') for v in box))
    svg = ET.tostring(root, encoding='unicode')
    require(len(svg.encode('utf-8')) <= MAX_OUTPUT, 'Die SVG-Ausgabe ist zu groß.', 'size_limit')
    return {'svg': svg, 'widthMm': width[0], 'heightMm': height[0], 'widthSource': width_source,
            'pageCount': 1, 'page': 1, 'hasText': False, 'warnings': warnings}


def editable_parts(result, source_text=None):
    """Separate renderer objects without guessing text hidden inside bitmaps.

    Glyph outlines retain their appearance until the merchant explicitly replaces
    them with an available font. Masks, clipping and ancestor transforms survive.
    Rasterization is used ONLY to measure bounds, never as replacement artwork.
    """
    import pymupdf
    from PIL import Image
    root = ET.fromstring(result['svg'])
    ns = '{' + SVG_NS + '}'
    defs = [copy.deepcopy(n) for n in root if n.tag == ns+'defs']
    groups = []
    # PDF text blocks are source evidence. Never join unrelated lines by proximity.
    # Only untransformed ancestor groups and exact glyph origins can use this map;
    # unsupported geometry keeps the existing line groups and original vector art.
    blocks = []
    for block in (source_text or {}).get('blocks', []):
        if block.get('type') != 0:
            continue
        lines = []
        chars = []
        for line in block.get('lines', []):
            row = [c for span in line.get('spans', []) for c in span.get('chars', [])]
            chars.extend(row)
            lines.append(''.join(c.get('c', '') for c in row).replace('\u00a0', ' '))
        blocks.append({'text': '\n'.join(lines), 'chars': chars})
    def source_block(node, ancestors):
        if any(a.get('transform') for a in ancestors):
            return None
        transform = node.get('transform', '')
        values = re.findall(NUMBER, transform)
        if not re.fullmatch(r'matrix\([^)]*\)', transform.strip()) or len(values) != 6:
            return None
        x, y = map(float, values[4:6])
        character = node.get('data-text', '').replace('\u00a0', ' ')
        candidates = [i for i, block in enumerate(blocks) if any(
            c.get('c', '').replace('\u00a0', ' ') == character and
            abs(c.get('origin', [float('inf')]*2)[0]-x) < .02 and
            abs(c.get('origin', [float('inf')]*2)[1]-y) < .02
            for c in block['chars'])]
        return candidates[0] if len(candidates) == 1 else None
    def walk(parent, ancestors):
        run = []
        run_key = None
        def flush():
            nonlocal run, run_key
            if run:
                groups.append(('text', list(run), ancestors, blocks[run_key[1]]['text'] if run_key and run_key[0] == 'pdf-block' else None))
                run = []
                run_key = None
        for n in parent:
            tag = n.tag.removeprefix(ns)
            if tag in ('defs', 'title', 'desc'):
                continue
            if tag == 'use' and n.get('data-text'):
                matrix = re.findall(NUMBER, n.get('transform', ''))
                block = source_block(n, ancestors)
                key = ('pdf-block', block, *matrix[:4], n.get('fill')) if block is not None else tuple(matrix[:4]+matrix[5:6])+ (n.get('fill'),)
                if run and key != run_key:
                    flush()
                run_key = key
                run.append(n)
                continue
            flush()
            if tag == 'g' and not any(k in n.attrib for k in ('mask', 'opacity')):
                shell = ET.Element(n.tag, n.attrib)
                walk(n, ancestors+[shell])
            else:
                kind = 'photo' if any(e.tag == ns+'image' for e in n.iter()) else 'motif'
                groups.append((kind, [n], ancestors, None))
        flush()
    walk(root, [])
    require(0 < len(groups) <= 20, 'Diese Datei enthält mehr als 20 getrennte Bestandteile. Bitte Motive in der Quelldatei gruppieren.', 'parts_limit')
    box = list(map(float, root.get('viewBox').split()))
    factor = min(2, 1400/max(box[2:]))
    parts = []
    for kind, nodes, ancestors, block_text in groups:
        layer = ET.Element(root.tag, root.attrib)
        for d in defs:
            layer.append(copy.deepcopy(d))
        tip = layer
        for ancestor in ancestors:
            shell = copy.deepcopy(ancestor)
            tip.append(shell)
            tip = shell
        for n in nodes:
            tip.append(copy.deepcopy(n))
        # MuPDF SVG uses CSS px for physical dimensions. Explicit pixel sizing
        # makes the measuring raster align exactly with the source viewBox.
        measuring = copy.deepcopy(layer)
        measuring.set('width', str(box[2])+'px')
        measuring.set('height', str(box[3])+'px')
        with pymupdf.open(stream=ET.tostring(measuring), filetype='svg') as doc:
            pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(factor, factor), alpha=True)
            bounds = Image.frombytes('RGBA', (pix.width, pix.height), pix.samples).getchannel('A').getbbox()
        if not bounds:
            continue
        x0,y0,x1,y1 = bounds
        # One pixel of transparent padding prevents antialiasing being clipped.
        x=max(box[0], box[0]+(x0-1)/factor); y=max(box[1],box[1]+(y0-1)/factor)
        right=min(box[0]+box[2],box[0]+(x1+1)/factor); bottom=min(box[1]+box[3],box[1]+(y1+1)/factor)
        w=right-x;h=bottom-y
        mmx=result['widthMm']/box[2];mmy=result['heightMm']/box[3]
        layer.set('viewBox',f'{x} {y} {w} {h}')
        layer.set('width',f'{w*mmx}mm');layer.set('height',f'{h*mmy}mm')
        part={'kind':kind,'xMm':(x-box[0])*mmx,'yMm':(y-box[1])*mmy,'widthMm':w*mmx,'heightMm':h*mmy,'svg':sanitize_svg(ET.tostring(layer))['svg']}
        if kind == 'photo':
            # Preserve original clips, transforms and soft masks. Only the
            # visible photograph becomes white, with its original alpha. No
            # tracing, thresholding or rasterization of the template contour.
            mask_layer = copy.deepcopy(layer)
            def whiten(node):
                if node.tag == ns+'defs':
                    return
                if node.tag == ns+'image':
                    key = 'href' if 'href' in node.attrib else '{'+XLINK_NS+'}href'
                    raw_image = base64.b64decode(node.get(key).split(',',1)[1])
                    with Image.open(io.BytesIO(raw_image)) as img:
                        alpha = img.convert('RGBA').getchannel('A')
                        white = Image.new('RGBA', img.size, 'white')
                        white.putalpha(alpha)
                        output = io.BytesIO(); white.save(output,format='PNG')
                    node.set(key, 'data:image/png;base64,'+base64.b64encode(output.getvalue()).decode())
                for child in node:
                    whiten(child)
            whiten(mask_layer)
            part['maskSvg'] = sanitize_svg(ET.tostring(mask_layer))['svg']
        if kind=='text':
            text = ''.join(n.get('data-text','') for n in nodes).replace('\u00a0', ' ')
            compact = lambda s: ''.join(s.split())
            part['text'] = block_text if block_text and compact(block_text) == compact(text) else text
        parts.append(part)
    require(parts, 'Keine getrennt sichtbaren Bestandteile gefunden.', 'parts_missing')
    return parts


def convert(request):
    require(isinstance(request, dict) and request.get('kind') in ('svg', 'pdf'), 'Bitte SVG oder PDF auswählen.', 'invalid_request')
    encoded = request.get('bytes')
    require(isinstance(encoded, str) and len(encoded) <= MAX_INPUT * 4 // 3 + 4, 'Die Datei darf höchstens 15 MiB groß sein.', 'size_limit')
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise ImportFailure('Ungültige Dateidaten.', 'invalid_request')
    require(0 < len(raw) <= MAX_INPUT, 'Die Datei ist leer oder größer als 15 MiB.', 'size_limit')
    page_number = request.get('page', 1)
    require(type(page_number) is int and page_number > 0, 'Bitte eine gültige Seitennummer angeben.', 'invalid_page')
    if request['kind'] == 'svg':
        require(page_number == 1, 'SVG besitzt nur eine Seite.', 'invalid_page')
        result = sanitize_svg(raw)
        if request.get('parts') is True:
            result['parts'] = editable_parts(result)
        return result
    require(raw.startswith(b'%PDF-'), 'Ungültiger PDF-Dateikopf.', 'invalid_pdf')
    try:
        import pymupdf
        require(callable(getattr(pymupdf, 'open', None)), 'PDF-Import benötigt eine vollständig lesbare PyMuPDF-Installation.', 'pdf_dependency_missing')
    except ImportError:
        raise ImportFailure('PDF-Import benötigt das lokale Paket PyMuPDF. SVG-Import ist verfügbar.', 'pdf_dependency_missing')
    try:
        pymupdf.TOOLS.mupdf_display_errors(False)
        pymupdf.TOOLS.mupdf_display_warnings(False)
        with pymupdf.open(stream=raw, filetype='pdf') as document:
            require(not document.needs_pass, 'Passwortgeschützte PDFs werden nicht unterstützt.', 'encrypted_pdf')
            require(0 < document.page_count <= 500, 'PDF enthält keine oder mehr als 500 Seiten.', 'complexity_limit')
            require(page_number <= document.page_count, 'Die gewählte PDF-Seite existiert nicht.', 'invalid_page')
            page = document[page_number - 1]
            require(not list(page.annots() or []) and not list(page.widgets() or []), 'PDF-Anmerkungen und Formularfelder bitte vor dem Import in den Seiteninhalt übernehmen.', 'unsupported_pdf_annotations')
            standard_fonts_used = False
            for font in page.get_fonts(full=True):
                xref, extension, font_type, name = font[:4]
                base_name = re.sub(r'^[A-Z]{6}\+', '', name)
                # Type 3 fonts carry their glyph drawing programs in the PDF.
                if font_type == 'Type3':
                    continue
                embedded = bool(xref and document.extract_font(xref)[3])
                if not embedded:
                    require(base_name in STANDARD_PDF_FONTS,
                            'PDF-Schrift ist nicht eingebettet: ' + base_name + '. Bitte die Schrift einbetten oder Text in Pfade umwandeln.',
                            'pdf_font_not_embedded')
                    standard_fonts_used = True
            svg = page.get_svg_image(text_as_path=True)
            result = sanitize_svg(svg.encode('utf-8'))
            result.update(widthMm=page.rect.width * 25.4 / 72, heightMm=page.rect.height * 25.4 / 72,
                          widthSource='pdf-page', pageCount=document.page_count, page=page_number,
                          hasText=bool(page.get_text().strip()))
            # PDF points, not exporter-default SVG pixels, determine physical size.
            output_root = ET.fromstring(result['svg'])
            output_root.set('width', format(result['widthMm'], '.12g') + 'mm')
            output_root.set('height', format(result['heightMm'], '.12g') + 'mm')
            result['svg'] = ET.tostring(output_root, encoding='unicode')
            result['warnings'] = []
            result['warnings'].append('PDF als feste Vektorgestaltung übernommen; Text bleibt als Pfad. Farben sind eine RGB-Vorschau und kein freigegebener Produktionsfarbraum.')
            result['warnings'].append('Transparenzgruppen, Ebenen, Mischmodi und Sonderfarben bitte sichtbar mit der Originalseite vergleichen; diese Ausgabe ist kein verbindlicher Druckmaster.')
            if standard_fonts_used:
                result['warnings'].append('Nicht eingebettete PDF-Standardschriften wurden mit der Standardschriftdarstellung des PDF-Renderers in Pfade umgesetzt. Darstellung mit dem Original vergleichen.')
            if document.page_count > 1:
                result['warnings'].append('Nur Seite ' + str(page_number) + ' von ' + str(document.page_count) + ' wurde übernommen.')
            if request.get('parts') is True:
                result['parts'] = editable_parts(result, page.get_text('rawdict'))
            return result
    except ImportFailure:
        raise
    except Exception:
        raise ImportFailure('PDF konnte nicht zuverlässig als Vektorgestaltung gelesen werden.', 'invalid_pdf')


def main():
    try:
        data = sys.stdin.buffer.read(MAX_INPUT * 4 // 3 + 65537)
        require(len(data) <= MAX_INPUT * 4 // 3 + 65536, 'Die Anfrage ist zu groß.', 'size_limit')
        result = convert(json.loads(data))
        output = json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        require(len(output) <= MAX_OUTPUT, 'Die Importausgabe ist zu groß.', 'size_limit')
        sys.stdout.buffer.write(output)
    except (ImportFailure, ValueError, TypeError, RecursionError) as error:
        failure = error if isinstance(error, ImportFailure) else ImportFailure('Ungültige Importdaten.', 'invalid_request')
        sys.stdout.buffer.write(json.dumps({'error': {'code': failure.code, 'message': str(failure)}}, ensure_ascii=False).encode('utf-8'))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
