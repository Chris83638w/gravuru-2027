"""Bounded solid SVG -> non-overlapping engraving paths. No raster tracing.

Original colour boundaries cannot all survive one engraving colour. The safe
colour preview and mandatory caller confirmation are part of this contract.
White paint cuts out earlier paint; later paint can fill those areas again.
Curve operations use pinned Skia PathOps, not pixel tracing or polygon sampling.
"""
import base64
import importlib.util
import io
import json
import math
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

VERSION = 'svg-black-v1'
MAX_BYTES = 2 * 1024 * 1024
MAX_ELEMENTS = 512
MAX_SHAPES = 256
MAX_NUMBERS = 16000
MAX_COMMANDS = 12000
MAX_OUTPUT = 4 * 1024 * 1024
NS = 'http://www.w3.org/2000/svg'
NUMBER = r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?'
TAGS = {'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'title', 'desc', 'defs'}
GEOMETRY = {'d', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height'}
ATTRS = GEOMETRY | {'viewBox', 'preserveAspectRatio', 'version', 'id', 'transform', 'fill', 'stroke', 'fill-rule', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'fill-opacity', 'stroke-opacity'}
COLORS = dict(zip('black silver gray white maroon red purple fuchsia green lime olive yellow navy blue teal aqua orange'.split(), '#000000 #c0c0c0 #808080 #ffffff #800000 #ff0000 #800080 #ff00ff #008000 #00ff00 #808000 #ffff00 #000080 #0000ff #008080 #00ffff #ffa500'.split()))
ASPECT = re.compile(r'(?:(?:defer)\s+)?(none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max))(?:\s+(meet|slice))?\Z')


class LogoFailure(Exception):
    def __init__(self, message, code='logo_invalid'):
        super().__init__(message)
        self.code = code


def require(ok, message, code='logo_invalid'):
    if not ok:
        raise LogoFailure(message, code)


def tag_name(tag):
    return tag.rsplit('}', 1)[-1]


def solid_color(value):
    value = value.strip().lower()
    if value == 'none':
        return value
    if value in COLORS:
        return COLORS[value]
    if re.fullmatch(r'#[0-9a-f]{3}', value):
        return '#' + ''.join(c * 2 for c in value[1:])
    if re.fullmatch(r'#[0-9a-f]{6}', value):
        return value
    match = re.fullmatch(r'rgb\(\s*(' + NUMBER + r'%?)\s*,\s*(' + NUMBER + r'%?)\s*,\s*(' + NUMBER + r'%?)\s*\)', value)
    if match:
        pieces = match.groups()
        require(all(p.endswith('%') for p in pieces) or not any(p.endswith('%') for p in pieces), 'Bitte einheitliche RGB-Farbwerte verwenden.')
        limit = 100 if pieces[0].endswith('%') else 255
        numbers = [float(p.rstrip('%')) for p in pieces]
        require(all(math.isfinite(n) and 0 <= n <= limit for n in numbers), 'Das SVG enthält ungültige Farbwerte.')
        return '#' + ''.join(format(round(n * 255 / limit), '02x') for n in numbers)
    raise LogoFailure('Bitte reine Volltonfarben als HEX oder RGB verwenden. Transparenzen, Verläufe und dynamische Farben sind für dieses Logo nicht möglich.', 'logo_effect')


def sanitized_source(raw):
    require(0 < len(raw) <= MAX_BYTES, 'Das SVG-Logo darf höchstens 2 MB groß sein.', 'logo_size')
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeError:
        raise LogoFailure('Bitte das SVG als UTF-8-Datei speichern.')
    require(not re.search(r'<!\s*(?:DOCTYPE|ENTITY)', text, re.I), 'Externe Definitionen sind im SVG nicht erlaubt.', 'logo_unsafe')
    depth = 0
    count = 0
    try:
        for event, element in ET.iterparse(io.StringIO(text), events=('start', 'end')):
            if event == 'start':
                depth += 1
                count += 1
                require(depth <= 24 and count <= MAX_ELEMENTS, 'Das SVG hat zu viele oder zu tief verschachtelte Elemente.', 'logo_complexity')
                tag = tag_name(element.tag)
                require(tag not in {'image', 'foreignObject'}, 'Fotos oder eingebettete Rasterbilder sind in Edelstahl-Logos nicht möglich. Bitte eine reine Vektordatei hochladen.', 'logo_raster')
                require(tag not in {'text', 'tspan', 'textPath'}, 'Bitte die Schrift im Logo zuerst in Pfade umwandeln; Schriften werden nicht ersetzt.', 'logo_text')
                require(tag in TAGS, 'Das SVG enthält nicht unterstützte Inhalte. Bitte als einfache Vektorpfade ohne Verläufe, Masken oder Effekte exportieren.', 'logo_effect')
                require(tag != 'svg' or depth == 1, 'Verschachtelte SVG-Zeichenflächen werden nicht unterstützt.', 'logo_effect')
            else:
                depth -= 1
        source_root = ET.fromstring(text)
    except ET.ParseError:
        raise LogoFailure('Die SVG-Datei ist beschädigt oder unvollständig.')
    # Reuse the source import's namespace, XML, CSS and attribute security checks.
    spec = importlib.util.spec_from_file_location('gravuru_design_converter', Path(__file__).with_name('design-converter.py'))
    converter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(converter)
    try:
        sanitized = converter.sanitize_svg(raw)
    except converter.ImportFailure as error:
        raise LogoFailure(str(error), 'logo_unsafe')
    root = ET.fromstring(sanitized['svg'])
    numbers = 0
    shapes = 0
    for element in root.iter():
        tag = tag_name(element.tag)
        if tag == 'defs':
            require(not list(element), 'Wiederverwendete oder verknüpfte Formen bitte vor dem Upload in echte Pfade auflösen.', 'logo_effect')
        if tag in TAGS - {'svg', 'g', 'defs', 'title', 'desc'}:
            shapes += 1
        for key, value in list(element.attrib.items()):
            require(key in ATTRS, 'Diese SVG-Eigenschaft wird für Logos nicht unterstützt: ' + key, 'logo_effect')
            if key == 'id':
                del element.attrib[key]
            elif key in {'fill', 'stroke'}:
                element.set(key, solid_color(value))
            elif key in {'opacity', 'fill-opacity', 'stroke-opacity'}:
                require(re.fullmatch(NUMBER, value) and float(value) == 1, 'Bitte Transparenzen vor dem Upload in klare Volltonflächen auflösen.', 'logo_effect')
                del element.attrib[key]
            elif key == 'fill-rule':
                require(value in {'nonzero', 'evenodd'}, 'Ungültige SVG-Füllregel.')
            elif key == 'stroke-linecap':
                require(value in {'butt', 'round', 'square'}, 'Nicht unterstützter Linienabschluss.')
            elif key == 'stroke-linejoin':
                require(value in {'miter', 'round', 'bevel'}, 'Nicht unterstützte Linienverbindung.')
            elif key == 'stroke-dasharray':
                # A tiny dash period on a long curve can expand to billions of
                # contours before the normalized-path budget can be inspected.
                require(value == 'none', 'Bitte gestrichelte Linien vor dem Upload in Flächen umwandeln.', 'logo_effect')
            elif key == 'preserveAspectRatio':
                require(ASPECT.fullmatch(value.strip()), 'Die SVG-Ausrichtung ist ungültig.', 'logo_effect')
            if key in GEOMETRY | {'viewBox', 'transform', 'stroke-width', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset'}:
                values = re.findall(NUMBER, value)
                numbers += len(values)
                require(numbers <= MAX_NUMBERS and all(math.isfinite(float(v)) and abs(float(v)) <= 1000000 for v in values), 'Das Logo enthält zu viele oder zu große Koordinaten.', 'logo_complexity')
    require(0 < shapes <= MAX_SHAPES, 'Bitte ein Logo mit höchstens 256 Vektorformen verwenden.', 'logo_complexity')
    box = list(map(float, root.get('viewBox').split()))
    require(min(box[2:]) >= 0.001 and max(box[2:]) <= 100000, 'Ungültige Größe der SVG-Zeichenfläche.', 'logo_complexity')
    # No physical size is inferred from pixels or a viewBox-only source.
    physical = all(re.fullmatch(NUMBER + r'\s*(?:mm|cm|in|pt|pc)', source_root.get(k, '').strip(), re.I) for k in ('width', 'height'))
    dimensions = {'widthMm': sanitized['widthMm'] if physical else None, 'heightMm': sanitized['heightMm'] if physical else None}
    aspect = root.get('preserveAspectRatio')
    legacy = (aspect is None or aspect in {'xMidYMid', 'xMidYMid meet', 'none'}) and abs((sanitized['widthMm'] / sanitized['heightMm']) / (box[2] / box[3]) - 1) < 0.00001
    if not legacy:
        # SVG2 viewport mapping, before stroke expansion / boolean paths. Keep
        # the exact old path for every previously accepted v1 source: saved
        # output hashes are checked again when a customer edits an old order.
        align, fit = ASPECT.fullmatch((aspect or 'xMidYMid meet').strip()).groups()
        # Overall physical scale is metadata; retain the actual viewport ratio
        # in bounded viewBox units (no guessed logo size on the product).
        width, height = sanitized['widthMm'], sanitized['heightMm']
        unit = max(box[2], box[3]) / max(width, height)
        width, height = width * unit, height * unit
        require(min(width, height) >= 0.001, 'Das Seitenverhältnis des SVG ist zu extrem.', 'logo_complexity')
        sx, sy = width / box[2], height / box[3]
        if align != 'none':
            sx = sy = max(sx, sy) if fit == 'slice' else min(sx, sy)
        tx, ty = -box[0] * sx, -box[1] * sy
        if align != 'none':
            tx += (width - box[2] * sx) * {'Min': 0, 'Mid': .5, 'Max': 1}[align[1:4]]
            ty += (height - box[3] * sy) * {'Min': 0, 'Mid': .5, 'Max': 1}[align[5:8]]
        group = ET.Element('{' + NS + '}g', {'transform': f'matrix({sx:.17g} 0 0 {sy:.17g} {tx:.17g} {ty:.17g})'})
        for child in list(root):
            root.remove(child)
            group.append(child)
        root.append(group)
        box = [0, 0, width, height]
        root.set('viewBox', ' '.join(format(v, '.17g') for v in box))
    # SVG geometry uses the viewBox. Source mm/px are metadata, not a second scale.
    root.set('width', str(box[2]))
    root.set('height', str(box[3]))
    root.attrib.pop('preserveAspectRatio', None)
    return ET.tostring(root, encoding='unicode'), box, dimensions


def convert(raw):
    source, box, dimensions = sanitized_source(raw)
    try:
        import pathops
        from picosvg.svg import SVG
        from picosvg.svg_types import SVGPath
        from picosvg.svg_transform import Affine2D
        from picosvg.svg_pathops import skia_path, svg_commands
    except ImportError:
        raise LogoFailure('Die Vektorprüfung ist noch nicht installiert (requirements-logo.txt).', 'logo_converter_unavailable')
    # Skia works on curves. Conic stroke ends/arcs are represented as curves by
    # picosvg (bounded numerical conversion), never as a traced bitmap.
    class LogoSVG(SVG):
        @property
        def tolerance(self):
            # Finer than the font-oriented default (0.1% of the viewBox).
            # Skia still has finite precision; no exact mathematical claim.
            return min(box[2], box[3]) * 0.000001

    simple = LogoSVG.fromstring(source)
    simple.topicosvg(ndigits=9, inplace=True)
    before_clip = simple.tostring()
    simple.clip_to_viewbox(inplace=True)
    clipped = simple.tostring() != before_clip
    shapes = simple.shapes()
    require(len(shapes) <= MAX_SHAPES * 2, 'Das Logo erzeugt zu viele Vektorkonturen.', 'logo_complexity')
    output = pathops.Path()
    preview_paths = []
    colours = set()
    has_white = False
    command_count = 0
    for shape in shapes:
        colour = solid_color(shape.fill)
        require(shape.stroke == 'none' and shape.opacity == 1 and shape.fill_opacity == 1, 'Nicht eindeutig auflösbare Linien oder Transparenz.', 'logo_effect')
        if colour == 'none':
            continue
        shape = shape.apply_transform(Affine2D.identity().translate(-box[0], -box[1]))
        commands = tuple(shape.as_cmd_seq())
        command_count += len(commands)
        require(command_count <= MAX_COMMANDS and all(math.isfinite(n) and abs(n) <= 10000000 for _, args in commands for n in args), 'Das Logo erzeugt zu viele oder zu große Pfade.', 'logo_complexity')
        path = skia_path(commands, shape.fill_rule)
        path.simplify(fix_winding=True)
        # A white layer removes only earlier paint. This also preserves holes
        # created by strokes; layers above it are still painted afterwards.
        if colour == '#ffffff':
            has_white = True
            output = pathops.op(output, path, pathops.PathOp.DIFFERENCE, fix_winding=True)
        else:
            colours.add(colour)
            output = pathops.op(output, path, pathops.PathOp.UNION, fix_winding=True)
        require(len(output) <= MAX_COMMANDS, 'Die Überlappungen erzeugen zu viele Konturen.', 'logo_complexity')
        preview_path = SVGPath().update_path(svg_commands(path))
        preview_paths.append((colour, preview_path.d))
    require(output.area > 0 and len(output) > 0, 'Das Logo enthält nach der Umwandlung keine sichtbare Gravurfläche.', 'logo_empty')
    output.simplify(fix_winding=True)
    black = SVGPath().update_path(svg_commands(output))

    def document(paths):
        root = ET.Element('svg', {'xmlns': NS, 'viewBox': f'0 0 {box[2]:.12g} {box[3]:.12g}', 'width': f'{box[2]:.12g}', 'height': f'{box[3]:.12g}'})
        for colour, data in paths:
            ET.SubElement(root, 'path', {'fill': colour, 'fill-rule': 'nonzero', 'd': data})
        return ET.tostring(root, encoding='unicode', short_empty_elements=True) + '\n'

    warnings = ['Schwarze Flächen werden graviert, weiße Flächen bleiben frei. Bitte die Schwarzvorschau vor dem Übernehmen mit dem Original vergleichen.']
    if len(colours) > 1:
        warnings.append('Mehrfarbiges Logo: Farbgrenzen zwischen farbigen Flächen verschwinden in Schwarz. Dadurch können Buchstaben oder Details zusammenlaufen. Nur übernehmen, wenn alle benötigten Details in der Schwarzvorschau erkennbar bleiben.')
    elif colours - {'#000000'}:
        warnings.append('Die Farbe des Logos wurde für die Gravur in Schwarz umgewandelt.')
    if has_white:
        warnings.append('Weiße Flächen wurden als Aussparungen erhalten; es wird keine weiße Farbe graviert.')
    if clipped:
        warnings.append('Vektoren außerhalb der SVG-Zeichenfläche wurden an der Zeichenfläche beschnitten. Bitte die Ränder der Vorschau prüfen.')
    warnings.append('Feine Linien und Aussparungen müssen in der gewählten Schildgröße geprüft werden. Diese Umwandlung bestätigt keine Mindeststärke und ist keine Fertigungsfreigabe.')
    result = {'version': VERSION, 'svg': document([('#000000', black.d)]), 'preview': document(preview_paths), 'width': box[2], 'height': box[3], **dimensions, 'pathCount': sum(1 for cmd, _ in black if cmd == 'M'), 'minFeatureUnits': None, 'detailCheck': 'manual-required', 'warnings': warnings}
    require(len(json.dumps(result).encode('utf-8')) <= MAX_OUTPUT, 'Das umgewandelte Logo ist zu groß.', 'logo_complexity')
    return result


def main():
    # Additional process limits on hosts that support them. Windows is bounded by
    # input/shape/path limits plus the parent process' timeout/output budget.
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CPU, (12, 12))
    except (ImportError, OSError, ValueError):
        pass
    try:
        data = sys.stdin.buffer.read(MAX_BYTES * 4 // 3 + 4097)
        require(len(data) <= MAX_BYTES * 4 // 3 + 4096, 'Die Logo-Anfrage ist zu groß.', 'logo_size')
        request = json.loads(data)
        raw = base64.b64decode(request['bytes'], validate=True)
        result = convert(raw)
        sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
        return 0
    except Exception as error:
        if not isinstance(error, LogoFailure):
            error = LogoFailure('Das SVG lässt sich nicht zuverlässig in Gravurpfade umwandeln. Bitte als einfache Volltonpfade exportieren.')
        sys.stdout.buffer.write(json.dumps({'error': {'code': error.code, 'message': str(error)}}, ensure_ascii=False).encode('utf-8'))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
