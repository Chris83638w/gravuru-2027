"""Lossless review-sheet packaging. Pixel equality is verified before replacing our PNG copy."""
import argparse, hashlib, json, pathlib
from concurrent.futures import ProcessPoolExecutor
from PIL import Image

def convert(file):
    target = file.with_suffix('.webp')
    with Image.open(file) as source:
        pixels = source.convert('RGBA')
        pixels.save(target, format='WEBP', lossless=True, quality=100, method=4)
        with Image.open(target) as decoded:
            assert pixels.size == decoded.size and pixels.tobytes() == decoded.convert('RGBA').tobytes(), str(file)
        checksum = hashlib.sha256(pixels.tobytes()).hexdigest()
    result = dict(source=file.name, file=target.name, sourceBytes=file.stat().st_size,
                  bytes=target.stat().st_size, rgbaSha256=checksum, pixelIdentical=True)
    file.unlink()
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--katalog', required=True)
    args = parser.parse_args()
    root = pathlib.Path(args.katalog).resolve() / 'auftraege/2026-11-04-schiefer-designziele'
    rows = []
    for kind in ('premium', 'geschnitten', 'natur', 'kordel'):
        folder = root / kind
        report = json.loads((folder / 'pruefungen.json').read_text(encoding='utf-8'))
        files = []
        for sheet in report['sheets']:
            file = (folder / sheet['file']).resolve()
            assert file.parent == folder and file.name.startswith('bogen-'), str(file)
            if file.suffix == '.png': files.append(file)
        with ProcessPoolExecutor(max_workers=4) as pool: converted = list(pool.map(convert, files))
        mapping = {r['source']:r['file'] for r in converted}
        for sheet in report['sheets']: sheet['file'] = mapping.get(sheet['file'], sheet['file'])
        (folder / 'pruefungen.json').write_text(json.dumps(report,ensure_ascii=False,indent=1)+'\n', encoding='utf-8')
        readme = (folder / 'README.md').read_text(encoding='utf-8')
        for old,new in mapping.items(): readme = readme.replace(']('+old+')', ']('+new+')')
        (folder / 'README.md').write_text(readme, encoding='utf-8')
        rows.extend(dict(family=kind, **r) for r in converted)
        print(json.dumps(dict(family=kind,sheets=len(converted))), flush=True)
    if rows:
        result=dict(sheets=len(rows),sourceBytes=sum(r['sourceBytes'] for r in rows),bytes=sum(r['bytes'] for r in rows),pixelIdentical=True,rows=rows)
        (root / 'verlustfreie-boegen.json').write_text(json.dumps(result,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
        print(json.dumps({k:v for k,v in result.items() if k!='rows'}))
