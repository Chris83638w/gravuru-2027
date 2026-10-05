"""Physical closed contours only. No artwork tracing, page-size guessing or raster fallback."""
import base64
import importlib.util
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path as FilePath

spec = importlib.util.spec_from_file_location('design_converter', FilePath(__file__).with_name('design-converter.py'))
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
require, Failure = common.require, common.ImportFailure
MAX_BYTES = 15 * 1024 * 1024
TOL = 0.005  # mm, topology checks only; original curves remain in the result.
MAX_POINTS = 100000


def dependencies():
    global np, Path, Line, CubicBezier, QuadraticBezier, Arc, parse_path, parse_transform, transform, Polygon
    try:
        import numpy as np
        from svgpathtools import Path, Line, CubicBezier, QuadraticBezier, Arc, parse_path
        from svgpathtools.parser import parse_transform
        from svgpathtools.path import transform
        from shapely.geometry import Polygon
    except ImportError:
        raise Failure('Konturimport benötigt die dokumentierten Python-Pakete in requirements-contours.txt.', 'contour_dependencies_missing')


def affine(path, matrix):
    require(np.isfinite(matrix).all() and abs(np.linalg.det(matrix[:2, :2])) > 1e-12,
            'Die Kontur enthält eine ungültige oder zusammengefallene Transformation.')
    def point(z):
        xy = matrix @ np.array([z.real, z.imag, 1.0])
        return complex(xy[0], xy[1])
    result = []
    for s in path:
        if not isinstance(s, Arc):
            result.append(transform(s, matrix))
            continue
        # Ellipse axes after any invertible affine transform. Keep arcs as arcs.
        phi = math.radians(s.rotation)
        rotation = np.array([[math.cos(phi), -math.sin(phi)], [math.sin(phi), math.cos(phi)]])
        u, radii, _ = np.linalg.svd(matrix[:2, :2] @ rotation @ np.diag([s.radius.real, s.radius.imag]))
        angle = math.degrees(math.atan2(u[1, 0], u[0, 0]))
        result.append(Arc(point(s.start), complex(*radii), angle, s.large_arc,
                          bool(s.sweep) != (np.linalg.det(matrix[:2, :2]) < 0), point(s.end)))
    return Path(*result)


def matrix(value):
    if not value:
        return np.eye(3)
    syntax = re.compile(r'\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)\s*,?')
    end = 0
    for m in syntax.finditer(value):
        require(m.start() == end, 'Ungültige SVG-Transformation.')
        nums = re.findall(common.NUMBER, m[2])
        require(not re.sub(common.NUMBER, '', m[2]).strip(' ,\t\n\r'), 'Ungültige SVG-Transformation.')
        expected = {'matrix': (6,), 'translate': (1, 2), 'scale': (1, 2), 'rotate': (1, 3), 'skewX': (1,), 'skewY': (1,)}[m[1]]
        require(len(nums) in expected and all(math.isfinite(float(n)) and abs(float(n)) <= 1e6 for n in nums), 'Ungültige SVG-Transformation.')
        end = m.end()
    require(end == len(value), 'Ungültige SVG-Transformation.')
    return parse_transform(value)


def svg_paths(raw):
    clean = common.sanitize_svg(raw)
    root = ET.fromstring(clean['svg'])
    original = ET.fromstring(raw)
    require(original.get('width') and original.get('height'), 'SVG-Konturen benötigen width und height mit eindeutigen Einheiten; eine viewBox allein reicht nicht.', 'physical_size_missing')
    width, height = clean['widthMm'], clean['heightMm']
    x, y, w, h = map(float, root.get('viewBox').split())
    sx, sy = width/w, height/h
    aspect = root.get('preserveAspectRatio', 'xMidYMid meet').strip()
    if aspect != 'none':
        require(re.fullmatch(r'x(Min|Mid|Max)Y(Min|Mid|Max)(?:\s+meet)?', aspect), 'SVG-Konturen mit Beschnitt (slice) werden nicht übernommen.')
        match = re.match(r'x(Min|Mid|Max)Y(Min|Mid|Max)', aspect)
        scale = min(sx, sy)
        dx = (width-w*scale)*{'Min': 0, 'Mid': .5, 'Max': 1}[match[1]]
        dy = (height-h*scale)*{'Min': 0, 'Mid': .5, 'Max': 1}[match[2]]
        sx = sy = scale
    else:
        dx = dy = 0
    viewport = np.array([[sx, 0, dx-x*sx], [0, sy, dy-y*sy], [0, 0, 1]])
    paths = []
    def number(node, key, default=0):
        value = node.get(key, str(default))
        require(re.fullmatch(common.NUMBER, value) and math.isfinite(float(value)), 'Maße innerhalb der SVG benötigen endliche viewBox-Koordinaten.')
        return float(value)
    def visit(node, parent, depth=0):
        tag = node.tag.split('}')[-1]
        require(tag in ('svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'title', 'desc', 'defs'), 'Die Konturdatei darf nur Vektorpfade enthalten, keine Bilder, Texte, Masken oder Verweise.', 'contour_only')
        if tag in ('title', 'desc'):
            return
        if tag == 'defs':
            require(len(node) == 0, 'Konturen bitte ohne Symbole oder Definitionen als direkte Pfade exportieren.')
            return
        require(depth == 0 or tag != 'svg', 'Verschachtelte SVG-Ansichtsflächen bitte vor dem Import auflösen.')
        require(not any(node.get(k) for k in ('clip-path', 'mask', 'href', 'display', 'visibility', 'vector-effect')), 'Ausgeblendete, maskierte oder beschnittene Konturen bitte vor dem Import auflösen.')
        for key in ('opacity', 'fill-opacity', 'stroke-opacity'):
            require(node.get(key, '1') == '1', 'Transparente Konturen werden nicht automatisch als Schnittpfade interpretiert.')
        tf = parent @ matrix(node.get('transform', ''))
        path = None
        if tag == 'path':
            d = node.get('d', '')
            require(len(d) <= 200000 and not re.sub(r'[MmLlHhVvCcSsQqTtAaZz]|'+common.NUMBER+r'|[\s,]', '', d), 'Ungültige oder zu komplexe SVG-Pfaddaten.')
            path = parse_path(d)
        elif tag in ('polygon', 'polyline'):
            value = node.get('points', '')
            require(not re.sub(common.NUMBER+r'|[\s,]', '', value), 'Ungültige Polygonpunkte.')
            nums = list(map(float, re.findall(common.NUMBER, value)))
            require(6 <= len(nums) <= 10000 and len(nums) % 2 == 0, 'Ungültige Polygonpunkte.')
            pts = [complex(*nums[i:i+2]) for i in range(0, len(nums), 2)]
            if tag == 'polygon' and pts[-1] != pts[0]:
                pts.append(pts[0])
            path = Path(*(Line(a, b) for a, b in zip(pts, pts[1:]) if a != b))
        elif tag == 'rect':
            xx, yy, ww, hh = (number(node, k) for k in ('x', 'y', 'width', 'height'))
            require(ww > 0 and hh > 0, 'Rechteckmaße müssen positiv sein.')
            rx, ry = number(node, 'rx', node.get('ry', 0)), number(node, 'ry', node.get('rx', 0))
            require(rx >= 0 and ry >= 0, 'Ungültiger Eckenradius.')
            rx, ry = min(rx, ww/2), min(ry, hh/2)
            if rx and ry:
                path = parse_path(f'M{xx+rx} {yy}H{xx+ww-rx}A{rx} {ry} 0 0 1 {xx+ww} {yy+ry}V{yy+hh-ry}A{rx} {ry} 0 0 1 {xx+ww-rx} {yy+hh}H{xx+rx}A{rx} {ry} 0 0 1 {xx} {yy+hh-ry}V{yy+ry}A{rx} {ry} 0 0 1 {xx+rx} {yy}Z')
            else:
                path = parse_path(f'M{xx} {yy}h{ww}v{hh}h{-ww}Z')
        elif tag in ('circle', 'ellipse'):
            cx, cy = number(node, 'cx'), number(node, 'cy')
            rx, ry = (number(node, 'r'),)*2 if tag == 'circle' else (number(node, 'rx'), number(node, 'ry'))
            require(rx > 0 and ry > 0, 'Ellipse oder Kreis benötigt positive Radien.')
            path = parse_path(f'M{cx-rx} {cy}A{rx} {ry} 0 1 0 {cx+rx} {cy}A{rx} {ry} 0 1 0 {cx-rx} {cy}Z')
        if path is not None:
            require(len(path) <= 5000, 'Zu viele Pfadsegmente.', 'complexity_limit')
            for sub in path.continuous_subpaths():
                require(len(sub) and sub.isclosed(), 'Mindestens ein Pfad ist offen. Bitte die Kontur schließen.', 'open_contour')
                paths.append(affine(sub, tf))
        for child in node:
            visit(child, tf, depth+1)
    visit(root, viewport)
    return paths, width, height, clean['warnings']


def pdf_paths(raw):
    import pymupdf as fitz
    fitz.TOOLS.mupdf_display_errors(False)
    fitz.TOOLS.mupdf_display_warnings(False)
    doc = fitz.open(stream=raw, filetype='pdf')
    require(not doc.needs_pass, 'Passwortgeschützte PDF bitte entsperrt als Kontur exportieren.')
    require(doc.page_count == 1, 'Bitte genau eine PDF-Seite mit einer Außenkontur exportieren.', 'ambiguous_pages')
    page = doc[0]
    require(not list(page.annots() or []) and not list(page.widgets() or []), 'PDF-Anmerkungen und Formularfelder sind keine Konturen.')
    require(not page.get_text().strip() and not page.get_image_info(), 'Die PDF enthält Text oder Bilder. Bitte eine separate Datei nur mit Formkonturen verwenden.', 'contour_only')
    drawings = page.get_drawings(extended=True)
    require(0 < len(drawings) <= 512, 'Keine oder zu viele PDF-Konturen gefunden.', 'complexity_limit')
    paths = []
    def point(p):
        p = p * page.rotation_matrix
        return complex(p.x, p.y) * (25.4/72)
    for draw in drawings:
        if draw['type'] == 'clip' and not draw.get('layer'):
            # MuPDF emits the PDF CropBox as a clip. It does not alter a path
            # entirely inside the page; the path bounds are checked below.
            items = draw['items']
            if len(items) == 1 and items[0][0] == 're':
                box = items[0][1] * page.rotation_matrix
                if box.contains(page.rect):
                    continue
        require(draw['type'] in ('s', 'f', 'fs') and not draw.get('layer'), 'PDF mit Ebenen, Masken oder Beschnitt bitte als reine Konturen exportieren.')
        require(all(draw.get(k) in (None, 1) for k in ('stroke_opacity', 'fill_opacity')), 'Transparente PDF-Konturen werden nicht übernommen.')
        segments = []
        def finish(close=False):
            if not segments:
                return
            if close and abs(segments[-1].end-segments[0].start) > 1e-7:
                segments.append(Line(segments[-1].end, segments[0].start))
            require(abs(segments[-1].end-segments[0].start) <= 1e-7, 'Die PDF enthält einen offenen Pfad. Bitte ausdrücklich schließen.', 'open_contour')
            segments[-1].end = segments[0].start
            paths.append(Path(*segments))
            segments.clear()
        require(len(draw['items']) <= 5000, 'Zu viele PDF-Pfadsegmente.', 'complexity_limit')
        for item in draw['items']:
            kind = item[0]
            if kind in ('re', 'qu'):
                finish()
                rect = item[1]
                pts = [rect.tl, rect.tr, rect.br, rect.bl] if kind == 're' else [rect.ul, rect.ur, rect.lr, rect.ll]
                pts = list(map(point, pts));paths.append(Path(*(Line(pts[i], pts[(i+1)%4]) for i in range(4))))
                continue
            require(kind in ('l', 'c'), 'Unbekannte PDF-Pfadgeometrie.')
            pts = list(map(point, item[1:]))
            if segments and abs(segments[-1].end-pts[0]) > 1e-7:
                finish()
            segments.append(Line(*pts) if kind == 'l' else CubicBezier(*pts))
        finish(draw.get('closePath', False))
    width, height = page.rect.width*25.4/72, page.rect.height*25.4/72
    doc.close()
    return paths, width, height, []


def flatten(path):
    points = [path.start]
    def distance(p, a, b):
        if a == b:
            return abs(p-a)
        t = max(0, min(1, ((p-a).real*(b-a).real+(p-a).imag*(b-a).imag)/abs(b-a)**2))
        return abs(p-(a+t*(b-a)))
    def add(s, depth=0):
        require(depth < 24 and len(points) < MAX_POINTS, 'Kontur zu komplex für eine zuverlässige Prüfung.', 'complexity_limit')
        if isinstance(s, Line):
            flat = True
        elif isinstance(s, Arc):
            angle = abs(math.radians(s.delta))
            flat = angle <= math.pi/6 and max(s.radius.real, s.radius.imag)*(1-math.cos(angle/2)) <= TOL
        else:
            flat = max(distance(p, s.start, s.end) for p in s.bpoints()[1:-1]) <= TOL
        if flat:
            points.append(s.end)
        else:
            a, b = s.split(.5);add(a, depth+1);add(b, depth+1)
    for s in path:
        add(s)
        # Arc.split evaluates trigonometric endpoints. Keep the exact shared
        # endpoint instead of adding a microscopic closing spur to a ring.
        points[-1] = s.end
    return [(p.real, p.imag) for p in points]


def convert(data):
    dependencies()
    require(isinstance(data, dict) and data.get('kind') in ('svg', 'pdf'), 'Bitte SVG oder PDF verwenden.')
    encoded = data.get('bytes', '')
    require(isinstance(encoded, str) and len(encoded) <= MAX_BYTES*4/3+4, 'Die Konturdatei darf höchstens 15 MB groß sein.')
    raw = base64.b64decode(encoded, validate=True)
    require(0 < len(raw) <= MAX_BYTES, 'Die Konturdatei ist leer oder zu groß.')
    paths, page_w, page_h, warnings = svg_paths(raw) if data['kind'] == 'svg' else pdf_paths(raw)
    require(0 < len(paths) <= 128 and sum(map(len, paths)) <= 5000, 'Bitte eine Außenkontur mit höchstens 127 Ausschnitten verwenden.', 'complexity_limit')
    boxes = [p.bbox() for p in paths]
    require(all(math.isfinite(v) and abs(v) < 100000 for box in boxes for v in box), 'Ungültige Konturkoordinaten.')
    require(all(b[0] >= -TOL and b[2] >= -TOL and b[1] <= page_w+TOL and b[3] <= page_h+TOL for b in boxes), 'Konturen außerhalb der sichtbaren Dateiseite bitte ohne Beschnitt exportieren.')
    polygons, point_count = [], 0
    for p in paths:
        pts = flatten(p)
        point_count += len(pts)
        require(point_count <= MAX_POINTS, 'Zu komplexe Kontur.', 'complexity_limit')
        polygons.append(Polygon(pts))
    require(all(p.is_valid and p.area > TOL*TOL for p in polygons), 'Eine Kontur überschneidet sich selbst oder besitzt keine eindeutige Fläche.', 'invalid_topology')
    outer = max(range(len(paths)), key=lambda i: polygons[i].area)
    for i, polygon in enumerate(polygons):
        if i == outer:
            continue
        require(polygons[outer].contains(polygon) and polygons[outer].boundary.distance(polygon.boundary) > 4*TOL,
                'Mehrere Außenformen oder berührende Konturen: bitte eine Außenform mit klar getrennten Ausschnitten exportieren.', 'ambiguous_contours')
        for j in range(i):
            if j != outer:
                require(polygon.disjoint(polygons[j]) and polygon.distance(polygons[j]) > 4*TOL,
                        'Ausschnitte überlappen, sind verschachtelt oder zu dicht beieinander.', 'ambiguous_contours')
    xmin, xmax, ymin, ymax = boxes[outer]
    width, height = xmax-xmin, ymax-ymin
    require(.1 <= width <= 2000 and .1 <= height <= 2000, 'Konturmaß muss zwischen 0,1 und 2000 mm liegen.')
    move = np.array([[1, 0, -xmin], [0, 1, -ymin], [0, 0, 1]])
    contours = [{'role': 'outer' if i == outer else 'hole', 'd': affine(p, move).d()} for i, p in enumerate(paths)]
    contours.sort(key=lambda c: c['role'] != 'outer')
    return {'schema': 'gravuru-contour/v1', 'widthMm': width, 'heightMm': height, 'pageWidthMm': page_w, 'pageHeightMm': page_h,
            'sourceOriginMm': [xmin, ymin], 'contours': contours, 'holeCount': len(paths)-1, 'topologyToleranceMm': TOL,
            'warnings': warnings, 'measurement': 'path-centerline', 'unit': 'mm'}


def main():
    try:
        raw = sys.stdin.buffer.read(MAX_BYTES*4//3+65537)
        require(len(raw) <= MAX_BYTES*4//3+65536, 'Anfrage zu groß.')
        result = convert(json.loads(raw))
        sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False))
    except Exception as error:
        message = str(error) if isinstance(error, Failure) else 'Die Konturdatei konnte nicht zuverlässig gelesen werden. Bitte als geschlossene Vektorpfade exportieren.'
        sys.stdout.write(json.dumps({'error': {'code': getattr(error, 'code', 'invalid_contour'), 'message': message}}, ensure_ascii=False))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
