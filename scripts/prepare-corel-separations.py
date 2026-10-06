"""Split Gravuru's reviewed, opaque PDF 1.3 proof; never a general PDF converter.
Preserve page registration and CMYK image streams. Fail closed on unknown structure.
Input/output must be supplied explicitly; source and existing outputs are untouched.
"""
import argparse, hashlib, json, re
from pathlib import Path
import pymupdf as pdf


def blocks(stream):
    # Our generated streams have no strings, inline images or marked content.
    depth = 0
    start = 0
    result = []
    end = 0
    for token in re.finditer(r'(?<!\S)[qQ](?!\S)', stream):
        if token[0] == 'q':
            if depth == 0:
                if stream[end:token.start()].strip():
                    raise ValueError('Unexpected content outside graphics block')
                start = token.start()
            depth += 1
        else:
            depth -= 1
            if depth < 0:
                raise ValueError('Unbalanced graphics state')
            if depth == 0:
                end = token.end()
                result.append(stream[start:end])
    if depth or stream[end:].strip():
        raise ValueError('Incomplete graphics block')
    return result


def compound_text(block):
    pattern = r'((?:-?\d+(?:\.\d+)?\s+){3}-?\d+(?:\.\d+)?) k\n(.*?) f(?=\s|$)'
    matches = list(re.finditer(pattern, block, re.S))
    if not matches or len({m[1] for m in matches}) != 1:
        raise ValueError('Expected one CMYK color per text field')
    for previous, current in zip(matches, matches[1:]):
        if block[previous.end():current.start()].strip():
            raise ValueError('Unexpected operator between glyphs')
    for m in matches:
        if re.sub(r'-?\d+(?:\.\d+)?|[mlch]|\s', '', m[2]):
            raise ValueError('Unexpected glyph path')
    ink = matches[0][1] + ' k\n' + '\n'.join(m[2] for m in matches) + ' f'
    return block[:matches[0].start()] + ink + block[matches[-1].end():], len(matches)


def prepare(source, destination):
    source, destination = Path(source), Path(destination)
    names = ['Roland-Textfelder-gruppiert.pdf', 'Mimaki-NUR-RDG_WHITE.pdf', 'Mimaki-FARBE-ohne-RDG_WHITE.pdf']
    if any((destination / name).exists() for name in names + ['separation-report.json']):
        raise ValueError('Destination already contains outputs; use a new private folder')
    original = source.read_bytes()
    if not original.startswith(b'%PDF-1.3'):
        raise ValueError('Use the reviewed opaque Gravuru PDF 1.3 proof')
    doc = pdf.open(stream=original, filetype='pdf')
    if len(doc) != 1 or doc.is_repaired:
        raise ValueError('Expected one undamaged page')
    objects = '\n'.join(doc.xref_object(i) for i in range(1, doc.xref_length()))
    if any(tag in objects for tag in ['/SMask', '/Transparency', '/OCProperties']) or doc[0].get_fonts():
        raise ValueError('Unexpected transparency, layers or live text')
    page = doc[0]
    parts = blocks(page.read_contents().decode('ascii'))
    if len(parts) != 3 or '/White cs 1 scn' not in parts[0] or '/Artwork Do' not in parts[1] or '/Cut CS' not in parts[2]:
        raise ValueError('Unexpected plate structure')
    forms = page.get_xobjects()
    if len(forms) != 1 or forms[0][1] != 'Artwork':
        raise ValueError('Unexpected artwork form')
    form = forms[0][0]
    drawing = blocks(doc.xref_stream(form).decode('ascii'))
    groups, paint = [], []
    for block in drawing:
        if re.search(r'\bDo\b', block):
            paint.append(block)
            continue
        grouped, glyphs = compound_text(block)
        index = len(groups) + 1
        xref = doc.get_new_xref()
        bbox = doc.xref_get_key(form, 'BBox')[1]
        graphics = doc.xref_get_key(form, 'Resources/ExtGState')[1]
        resources = f'<< /ExtGState {graphics} >>'
        doc.update_object(xref, f'<< /Type /XObject /Subtype /Form /BBox {bbox} /Resources {resources} >>')
        doc.update_stream(xref, grouped.encode('ascii'))
        name = f'TextEntry{index}'
        doc.xref_set_key(form, 'Resources/XObject/' + name, f'{xref} 0 R')
        paint.append('q /' + name + ' Do Q')
        groups.append({'group': name, 'glyphPaths': glyphs, 'compoundVectorPaths': 1})
    if not groups:
        raise ValueError('No explicit text fields found')
    doc.update_stream(form, '\n'.join(paint).encode('ascii'))
    grouped_bytes = doc.tobytes(garbage=4, deflate=True, use_objstms=0)
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    result = {'sourceSha256': hashlib.sha256(original).hexdigest(), 'textGroups': groups,
              'pageMm': [round(page.rect.width*25.4/72, 4), round(page.rect.height*25.4/72, 4)],
              'whiteCoverage': 'unchanged from source, not full-page', 'outputs': []}
    for name, selection in zip(names, ['combined', 'white', 'color']):
        out = pdf.open(stream=grouped_bytes, filetype='pdf')
        p = out[0]
        if selection != 'combined':
            streams = blocks(p.read_contents().decode('ascii'))
            content = streams[0] if selection == 'white' else streams[1] + '\n' + streams[2]
            xref = out.get_new_xref()
            out.update_object(xref, '<<>>')
            out.update_stream(xref, content.encode('ascii'))
            p.set_contents(xref)
            # Prune unused resources physically, not merely by hiding a layer.
            if selection == 'white':
                for key in ['Resources/XObject', 'Resources/ColorSpace/Cut']:
                    out.xref_set_key(p.xref, key, 'null')
            else:
                out.xref_set_key(p.xref, 'Resources/ColorSpace/White', 'null')
        # Remove null keys without losing stream data (update_object resets it).
        for i in range(1, out.xref_length()):
            obj = out.xref_object(i)
            if re.search(r'/\w+\s+null\b', obj):
                data = out.xref_stream(i) if out.xref_is_stream(i) else None
                out.update_object(i, re.sub(r'/\w+\s+null\b', '', obj))
                if data is not None:
                    out.update_stream(i, data)
        data = out.tobytes(garbage=4, deflate=True, use_objstms=0)
        data = re.sub(rb'^%PDF-1\.[0-7]', b'%PDF-1.3', data, count=1)
        target = destination / name
        with target.open('xb') as output:
            output.write(data)
        target.chmod(0o600)
        result['outputs'].append({'name': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        out.close()
    doc.close()
    (destination/'separation-report.json').write_text(json.dumps(result, indent=2)+'\n')
    (destination/'separation-report.json').chmod(0o600)
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('destination')
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.destination), indent=2))
