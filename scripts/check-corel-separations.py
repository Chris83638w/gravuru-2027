"""Validate opaque Gravuru separation outputs using MuPDF, Ghostscript and pixels.
Only hashes and structural metrics are recorded, never customer image bytes.
"""
import argparse, hashlib, importlib.util, json, re, subprocess, tempfile
from pathlib import Path
import pymupdf as pdf

spec = importlib.util.spec_from_file_location('splitter', Path(__file__).with_name('prepare-corel-separations.py'))
splitter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(splitter)


def check(source, destination):
    source, destination = Path(source), Path(destination)
    baseline = pdf.open(source)
    original_parts = splitter.blocks(baseline[0].read_contents().decode('ascii'))
    report = {'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'result': 'PASS', 'outputs': []}
    expected_groups = json.loads((destination/'separation-report.json').read_text())['textGroups']
    for name, kind in [('Roland-Textfelder-gruppiert.pdf', 'combined'), ('Mimaki-NUR-RDG_WHITE.pdf', 'white'), ('Mimaki-FARBE-ohne-RDG_WHITE.pdf', 'color')]:
        file = destination/name
        doc = pdf.open(file)
        assert len(doc) == 1 and not doc.is_repaired and not doc[0].get_fonts()
        for box in ['MediaBox', 'TrimBox', 'BleedBox']:
            assert doc.xref_get_key(doc[0].xref, box) == baseline.xref_get_key(baseline[0].xref, box)
        objects = '\n'.join(doc.xref_object(i) for i in range(1, doc.xref_length()))
        assert not any(tag in objects for tag in ['/SMask', '/Transparency', '/OCProperties'])
        assert ('/RDG_WHITE' in objects) == (kind != 'color')
        assert '/CutContour' in objects
        item = {'file': name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'muPDFRepair': False, 'ghostscript': 'PASS', 'samePageBoxes': True, 'cutContourPresent': True}
        if kind == 'white':
            assert not doc[0].get_images() and not doc[0].get_xobjects()
            assert not re.search(rb'\bDo\b', doc[0].read_contents())
            assert splitter.blocks(doc[0].read_contents().decode('ascii')) == [original_parts[0], original_parts[2]]
            item.update(vectorOnly=True, whiteStreamUnchanged=True)
        else:
            forms = doc[0].get_xobjects()
            assert len(forms) == 1 and forms[0][1] == 'Artwork'
            entries = splitter.blocks(doc.xref_stream(forms[0][0]).decode('ascii'))
            text_entries = [entry for entry in entries if not re.search(r'\bDo\b', entry)]
            assert len(text_entries) == len(expected_groups)
            for entry in text_entries:
                assert len(re.findall(r'(?<!\S)f(?!\S)', entry)) == 1
                assert not re.search(r'\b(?:Do|BI)\b', entry)
            item['compoundVectorTextEntries'] = len(text_entries)
            # Existing image payloads are byte-identical, no text group became a bitmap.
            def image_payloads(document):
                return sorted(hashlib.sha256(document.xref_stream(image[0])).hexdigest() for image in document[0].get_images())
            assert image_payloads(doc) == image_payloads(baseline)
            item['imagePayloadsUnchanged'] = True
            expected = pdf.open(source)
            if kind == 'color':
                x = expected.get_new_xref()
                expected.update_object(x, '<<>>')
                expected.update_stream(x, (original_parts[1]+'\n'+original_parts[2]).encode('ascii'))
                expected[0].set_contents(x)
            for dpi in [150, 300]:
                before, after = expected[0].get_pixmap(dpi=dpi), doc[0].get_pixmap(dpi=dpi)
                assert before.samples == after.samples, f'Changed {kind} rendering at {dpi} dpi'
            item['pixelIdenticalAtDpi'] = [150, 300]
            expected.close()
        process = subprocess.run(['gs', '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dPDFSTOPONERROR', '-sDEVICE=nullpage', str(file)], capture_output=True, timeout=60)
        assert process.returncode == 0, process.stderr.decode() + process.stdout.decode()
        report['outputs'].append(item)
        doc.close()
    # Existing outputs cannot be overwritten, even on a repeated command.
    before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in destination.glob('*.pdf')}
    try:
        splitter.prepare(source, destination)
        raise AssertionError('Overwrite should be refused')
    except ValueError as e:
        assert 'already contains' in str(e)
    assert before == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in destination.glob('*.pdf')}
    with tempfile.TemporaryDirectory(prefix='g27-separation-rejection-') as tmp:
        invalid = Path(tmp)/'unsupported.pdf'
        invalid.write_bytes(b'%PDF-1.7\nunsupported')
        try:
            splitter.prepare(invalid, Path(tmp)/'outputs')
            raise AssertionError('Unsupported structure should be refused')
        except ValueError:
            assert not (Path(tmp)/'outputs').exists()
    report.update(overwriteRefused=True, unsupportedInputRefused=True)
    baseline.close()
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('destination')
    args = parser.parse_args()
    print(json.dumps(check(args.source, args.destination), indent=2))
