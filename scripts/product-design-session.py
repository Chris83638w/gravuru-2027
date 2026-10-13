"""Private, reusable Product Design work copies. No network or AI calls.

Keep original images outside the short brief, protect unchanged layers, and
check mm coordinates before handing the result to the existing importer.
This is not a renderer, contour-containment check or production approval.
"""
import argparse
import base64
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'design/product-design/references.json'
NS = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', NS[1:-1])
MAX_BYTES = 16 * 1024 * 1024
TAGS = {'svg', 'defs', 'g', 'clipPath', 'path', 'rect', 'circle', 'ellipse',
        'line', 'polyline', 'polygon', 'image', 'text', 'tspan', 'title', 'desc'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    require(path.is_file() and not path.is_symlink() and path.stat().st_size <= MAX_BYTES,
            'Datei fehlt, ist zu groß oder ist ein symbolischer Link: ' + str(path))
    return path.read_bytes()


def write(path, value):
    data = value if isinstance(value, bytes) else value.encode()
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'wb') as f:
        f.write(data)


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


def parse(raw):
    require(len(raw) <= MAX_BYTES and not re.search(br'<!DOCTYPE|<!ENTITY', raw, re.I),
            'Unsichere oder zu große SVG.')
    root = ET.fromstring(raw)
    require(root.tag == NS+'svg' and len(list(root.iter())) < 1000, 'SVG-Struktur ungültig.')
    require(set(root.attrib) == {'width', 'height', 'viewBox'}, 'Nur Maße/viewBox am SVG-Wurzelelement erlaubt.')
    ids = set()
    for e in root.iter():
        require(e.tag.startswith(NS) and e.tag[len(NS):] in TAGS, 'Nicht unterstütztes SVG-Element.')
        for key, value in e.attrib.items():
            local = key.rsplit('}', 1)[-1].lower()
            require(not local.startswith('on') and local not in {'style', 'base'}, 'Aktive/Stil-Inhalte nicht erlaubt.')
            if 'url(' in value.lower():
                require(re.fullmatch(r'url\(#[\w-]+\)', value), 'Externe Referenz nicht erlaubt.')
            if local == 'href':
                require(e.tag == NS+'image' and key == 'href', 'Nur direkte Bildverweise erlaubt.')
        if e.get('id'):
            require(e.get('id') not in ids, 'Doppelte SVG-ID.')
            ids.add(e.get('id'))
    dimensions(root)
    layers(root)
    return root


def dimensions(root):
    result = []
    for key in ('width', 'height'):
        value = root.get(key, '')
        require(re.fullmatch(r'\d+(?:\.\d+)?mm', value), 'SVG braucht physische Maße in mm.')
        number = float(value[:-2])
        require(math.isfinite(number) and 0 < number <= 2000, 'Maß außerhalb 0–2000 mm.')
        result.append(number)
    require([float(v) for v in root.get('viewBox', '').split()] == [0, 0, *result],
            'viewBox muss 0 0 Breite Höhe in mm entsprechen.')
    return result


def layers(root):
    out = {}
    for e in root:
        key = 'defs' if e.tag == NS+'defs' else e.get('id')
        require(e.tag in {NS+'g', NS+'defs'} and key and key not in out,
                'Getrennte benannte Ebenen und höchstens ein defs-Block erforderlich.')
        out[key] = e
    return out


def fingerprint(e):
    def node(n):
        return [n.tag, sorted(n.attrib.items()), n.text if (n.text or '').strip() else '',
                [node(c) for c in n]]
    return digest(json.dumps(node(e), ensure_ascii=False).encode())


def bitmap(href, assets=None):
    if href.startswith('data:'):
        match = re.fullmatch(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)', href)
        require(match, 'Nur eingebettete PNG-, JPEG- oder WebP-Bilder erlaubt.')
        raw = base64.b64decode(re.sub(r'\s', '', match[2]), validate=True)
        ext = match[1]
    else:
        require(assets is not None and re.fullmatch(r'assets/[a-f0-9]{64}\.(png|jpeg|webp)', href),
                'Bildverweis muss auf eine lokale Datei unter assets zeigen.')
        p = assets.parent / href
        require(not assets.is_symlink() and p.resolve().parent == assets.resolve(), 'Bildpfad verlässt assets.')
        raw, ext = read(p), p.suffix[1:]
        require(p.stem == digest(raw), 'Bilddateiname und Prüfsumme unterscheiden sich.')
    require(0 < len(raw) <= MAX_BYTES, 'Bildgröße ungültig.')
    valid = (ext == 'png' and raw.startswith(b'\x89PNG\r\n\x1a\n') or
             ext == 'jpeg' and raw.startswith(b'\xff\xd8\xff') or
             ext == 'webp' and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP')
    require(valid, 'Bildtyp stimmt nicht mit dem Inhalt überein.')
    return raw, ext


def embed(root, assets=None):
    result = copy.deepcopy(root)
    for image in result.iter(NS+'image'):
        raw, ext = bitmap(image.get('href', ''), assets)
        image.set('href', f'data:image/{ext};base64,'+base64.b64encode(raw).decode())
    return result


def image_hashes(layer):
    return [digest(bitmap(e.get('href', ''))[0]) for e in layer.iter(NS+'image')]


def contour(width, height, shape, radius=0):
    require(all(math.isfinite(v) and 0 < v <= 2000 for v in (width, height)), 'Ungültige Zielmaße.')
    require(math.isfinite(radius) and 0 <= radius <= min(width, height)/2, 'Ungültiger Eckenradius.')
    root = ET.Element(NS+'svg', {'width': f'{width:g}mm', 'height': f'{height:g}mm',
                                'viewBox': f'0 0 {width:g} {height:g}'})
    style = {'fill': 'none', 'stroke': '#165e51', 'stroke-width': '0.3'}
    if shape in ('rectangle', 'rounded-rectangle'):
        require(shape != 'rounded-rectangle' or radius > 0, 'Gerundete Form braucht einen Eckenradius.')
        require(shape != 'rectangle' or radius == 0, 'Rechteck hat keinen Eckenradius.')
        ET.SubElement(root, NS+'rect', {**style, 'width': f'{width:g}', 'height': f'{height:g}', 'rx': f'{radius:g}'})
    elif shape in ('circle', 'ellipse'):
        require(radius == 0 and (shape != 'circle' or width == height), 'Kreis braucht gleiche Maße, kein Eckenradius.')
        ET.SubElement(root, NS+'ellipse', {**style, 'cx': f'{width/2:g}', 'cy': f'{height/2:g}',
                                          'rx': f'{width/2:g}', 'ry': f'{height/2:g}'})
    else:
        require(shape == 'arch' and radius == 0 and height >= width/2, 'Ungültige Bogenform.')
        r = width/2
        ET.SubElement(root, NS+'path', {**style, 'd': f'M0 {height:g}V{r:g}A{r:g} {r:g} 0 0 1 {width:g} {r:g}V{height:g}Z'})
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)


def start(source, folder, reference, request, changed=(), changed_images=(), width=None,
          height=None, shape=None, radius=0, new_layers=False):
    raw = read(source)
    require(digest(raw) == reference['sourceSha256'], 'Quelle stimmt nicht mit der registrierten Referenz überein.')
    original = embed(parse(raw))
    source_layers = layers(original)
    require(set(source_layers)-{'defs'} == set(reference['layers']), 'Referenz-Ebenen stimmen nicht.')
    require(dimensions(original) == [reference['widthMm'], reference['heightMm']], 'Referenzmaße stimmen nicht.')
    require(set(changed) <= set(source_layers) and set(changed_images) <= set(changed),
            'Änderungen brauchen bekannte, ausdrücklich freigegebene Ebenen.')
    require(request.strip() and len(request) <= 2000, 'Kurzen Gestaltungsauftrag angeben (bis 2000 Zeichen).')
    width = reference['widthMm'] if width is None else width
    height = reference['heightMm'] if height is None else height
    shape = reference['shape'] if shape is None else shape
    frame = contour(width, height, shape, radius)
    folder.mkdir(mode=0o700, parents=True, exist_ok=False)
    assets = folder/'assets'; assets.mkdir(mode=0o700)
    work = copy.deepcopy(original)
    work.attrib.update(width=f'{width:g}mm', height=f'{height:g}mm', viewBox=f'0 0 {width:g} {height:g}')
    for e in work.iter(NS+'image'):
        data, ext = bitmap(e.get('href', ''))
        name = digest(data)+'.'+ext
        if not (assets/name).exists():
            write(assets/name, data)
        e.set('href', 'assets/'+name)
    job = {'schema': 'gravuru-product-design-job/v1', 'reference': reference,
           'widthMm': width, 'heightMm': height, 'shape': shape, 'radiusMm': radius,
           'changeLayers': list(changed), 'changeImages': list(changed_images), 'allowNewLayers': new_layers,
           'request': request, 'contourSha256': digest(frame)}
    write(folder/'source.svg', raw)
    write(folder/'design.svg', ET.tostring(work, encoding='utf-8', xml_declaration=True))
    write(folder/'contour.svg', frame)
    write(folder/'job.json', dump(job))
    brief = (f"# Product Design · {reference['name']}\n\nAuftrag: {request}\n\n"
             f"Ziel: {width:g} × {height:g} mm; Produktform: {shape}; Eckenradius: {radius:g} mm.\n"
             f"Bearbeiten: {', '.join(changed) or 'noch keine Ebene'}; Bildersatz nur: {', '.join(changed_images) or 'keiner'}.\n"
             f"Neue Ebenen: {'erlaubt' if new_layers else 'nicht beauftragt'}.\n\n"
             "Grundregeln: design/product-design/START.md im Gravuru-Repository.\n"
             "Arbeitsdatei: design.svg. Original: source.svg (nicht ändern/nicht als Text lesen).\n"
             "Konturreferenz: contour.svg (nicht Teil der Druckgrafik). Bilder unter assets/ wiederverwenden.\n"
             "Bei geänderten Maßen/Form das Layout bewusst anpassen; der Helfer hat nur die Zeichenfläche geändert.\n"
             "Nach Gestaltung: product-design-session.py check <dieser Ordner>; anschließend Sicht- und Importprüfung.\n\n"
             "Ebenen:\n" + '\n'.join(f"- {k}: {v}" for k, v in reference['layers'].items()) +
             "\n\nReferenzstatus: " + reference['visualStatus'] + '\n')
    write(folder/'BRIEF.md', brief)
    return {'result': 'PREPARED', 'folder': str(folder), 'briefBytes': len(brief.encode()),
            'workSvgBytes': (folder/'design.svg').stat().st_size, 'images': len(list(assets.iterdir()))}


def check(folder):
    job = json.loads(read(folder/'job.json'))
    require(job['schema'] == 'gravuru-product-design-job/v1', 'Unbekannte Auftragsversion.')
    ref = job['reference']; raw = read(folder/'source.svg')
    require(digest(raw) == ref['sourceSha256'], 'Original wurde verändert.')
    frame = contour(job['widthMm'], job['heightMm'], job['shape'], job['radiusMm'])
    require(read(folder/'contour.svg') == frame and digest(frame) == job['contourSha256'], 'Konturreferenz wurde verändert.')
    original = layers(embed(parse(raw)))
    result = embed(parse(read(folder/'design.svg')), folder/'assets')
    require(dimensions(result) == [job['widthMm'], job['heightMm']], 'Zielmaße stimmen nicht.')
    current = layers(result)
    require(set(original) <= set(current), 'Vorhandene Ebene wurde entfernt.')
    require(job['allowNewLayers'] or set(original) == set(current), 'Neue Ebene nicht beauftragt.')
    require([k for k in current if k in original] == list(original), 'Bestehende Ebenenreihenfolge verändert.')
    for key, before in original.items():
        if key not in job['changeLayers']:
            require(fingerprint(before) == fingerprint(current[key]), 'Nicht beauftragte Änderung an '+key)
        if key not in job['changeImages']:
            require(image_hashes(before) == image_hashes(current[key]), 'Bild wurde ungefragt geändert: '+key)
    for e in result.iter(NS+'text'):
        require(e.get('font-family') in ref['fonts'], 'Schrift nicht in der vorhandenen Zuordnung.')
    for key, field in ref['fields'].items():
        items = list(current[key].iter(NS+('text' if field['kind'] == 'text' else 'image')))
        require(len(items) == 1, 'Kundenfeld nicht mehr separat bearbeitbar: '+key)
        if field['kind'] == 'photo':
            clips = [e.get('clip-path') for e in current[key].iter() if e.get('clip-path')]
            require(len(clips) == 1 and re.fullmatch(r'url\(#[\w-]+\)', clips[0]), 'Fotomaske fehlt.')
            require(result.find('.//'+NS+'clipPath[@id="'+clips[0][5:-1]+'"]') is not None, 'Fotomaske nicht auflösbar.')
    svg = ET.tostring(result, encoding='utf-8', xml_declaration=True)
    report = {'result': 'PASS', 'checks': ['original', 'mm-and-viewBox', 'contour-reference', 'layer-order',
              'unchanged-layers', 'reused-images', 'editable-fields', 'font-mapping'],
              'sourceSha256': ref['sourceSha256'], 'designSha256': digest(svg),
              'widthMm': job['widthMm'], 'heightMm': job['heightMm'], 'shape': job['shape'],
              'visualReview': 'pending', 'contourContainment': 'not_checked',
              'importCompatibility': 'not_checked', 'productionReleased': False}
    # Content-addressed outputs cannot silently replace a previously checked result.
    target = folder/('checked-'+digest(svg)[:16]); target.mkdir(mode=0o700, exist_ok=True)
    require(not target.is_symlink(), 'Prüfziel darf kein Link sein.')
    for name, content in [('design.svg', svg), ('report.json', dump(report).encode())]:
        if (target/name).exists():
            require(read(target/name) == content, 'Vorhandenes Prüfergebnis unterscheidet sich.')
        else:
            write(target/name, content)
    return {**report, 'output': str(target)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('start')
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--reference', default='acryl-18')
    p.add_argument('--request', required=True)
    p.add_argument('--change-layer', action='append', default=[])
    p.add_argument('--change-image', action='append', default=[])
    p.add_argument('--width-mm', type=float)
    p.add_argument('--height-mm', type=float)
    p.add_argument('--shape', choices=['rectangle', 'rounded-rectangle', 'circle', 'ellipse', 'arch'])
    p.add_argument('--radius-mm', type=float, default=0)
    p.add_argument('--allow-new-layers', action='store_true')
    commands.add_parser('check').add_argument('folder', type=Path)
    a = parser.parse_args()
    try:
        if a.command == 'check':
            result = check(a.folder)
        else:
            refs = json.loads(read(CATALOG))['references']
            require(a.reference in refs, 'Unbekannte Referenz.')
            result = start(a.source, a.out, refs[a.reference], a.request, a.change_layer,
                           a.change_image, a.width_mm, a.height_mm, a.shape, a.radius_mm, a.allow_new_layers)
        print(dump(result))
    except (ValueError, OSError, ET.ParseError, KeyError, TypeError) as e:
        parser.exit(1, 'Prüfung abgebrochen: '+str(e)+'\n')


if __name__ == '__main__':
    main()
