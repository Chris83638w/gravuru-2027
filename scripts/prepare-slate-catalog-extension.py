"""Prepare extracted slate door/house originals with the existing SVG adapter.

Only exact, already catalogued natural-slate dimensions are eligible. Files and
databases in previous review folders are never modified.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET


def outside_original_text_boxes(text, metadata):
    matches = [item.get('box') for item in metadata.get('texts', []) if item.get('text', '').replace('\n', '') == text.replace('\n', '')]
    if not matches or any(not box or len(box) != 4 for box in matches):
        return []
    width, height = metadata['plate']['widthMm'], metadata['plate']['heightMm']
    return matches if all(x + w <= 0 or y + h <= 0 or x >= width or y >= height for x, y, w, h in matches) else []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--inventory', required=True)
    ap.add_argument('--katalog', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--replacements')
    args = ap.parse_args()
    inventory_root, catalogue, out = Path(args.inventory).resolve(), Path(args.katalog).resolve(), Path(args.out).resolve()
    if out.exists():
        raise ValueError('Output must be a new directory; existing reviews are preserved.')
    inventory = json.loads((inventory_root / 'inventory.json').read_text(encoding='utf-8'))
    proof = {f['file']: f for f in json.loads((inventory_root / 'extracted-files.json').read_text(encoding='utf-8'))}
    spec = importlib.util.spec_from_file_location('original_adapter', Path(__file__).with_name('prepare-slate-original-source.py'))
    adapter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(adapter)
    family = json.loads((catalogue / 'familien/schiefer/schiefer-tafeln-natur.json').read_text(encoding='utf-8'))
    font_files = {f['name']: catalogue / f['file'] for f in json.loads((catalogue / 'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
    replacements = json.loads(Path(args.replacements).read_text(encoding='utf-8')) if args.replacements else {}
    replacements.update({name: {'to': target, 'source': 'schriften/ersatz-tuerschilder.json'} for name, target in json.loads((catalogue / 'schriften/ersatz-tuerschilder.json').read_text(encoding='utf-8')).items() if not name.startswith('_')})
    rows = []
    out.mkdir()
    assets = out / 'catalogue-assets'
    shutil.copytree(catalogue / 'materialien/zubehoer', assets / 'materialien/zubehoer')
    asset_proof = []
    for source in inventory['originals']:
        if source['family'] not in ('tuerschilder', 'hausnummern'):
            continue
        source_folder = inventory_root / 'sources' / source['id']
        metadata = json.loads((source_folder / 'design.json').read_text(encoding='utf-8'))
        if metadata['id'] != source['id'] or metadata['material'] != 'Schiefer':
            raise ValueError('Original identity/material mismatch: ' + source['id'])
        original = out / 'originals' / source['id']
        staging = out / 'catalogue-source' / Path(source['source']).parent
        original.mkdir(parents=True)
        staging.mkdir(parents=True)
        files = []
        for file in source_folder.iterdir():
            expected = proof[f"sources/{source['id']}/{file.name}"]
            if adapter.sha(file) != expected['sha256']:
                raise ValueError('Extracted source checksum mismatch: ' + str(file))
            shutil.copyfile(file, original / file.name)
            shutil.copyfile(file, staging / file.name)
            files.append({'name': file.name, 'sha256': expected['sha256'], 'bytes': file.stat().st_size})
        plate = [metadata['plate']['widthMm'], metadata['plate']['heightMm']]
        group = 'QU' if plate[0] == plate[1] else 'RE'
        targets = [s['key'] for s in family['sizes'] if s['groupKey'] == group and [s['widthMm'], s['heightMm']] == plate]
        for size in (s for s in family['sizes'] if s['key'] in targets):
            if not size.get('previewImage'):
                continue
            destination = assets / size['previewImage']
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(subprocess.check_output(['git', '-C', str(catalogue), 'show', inventory['catalogueCommit'] + ':' + size['previewImage']]))
                asset_proof.append({'file': size['previewImage'], 'sha256': adapter.sha(destination), 'catalogueCommit': inventory['catalogueCommit']})
        row = {'id': source['id'], 'source': source['source'], 'sourcePlateMm': plate, 'process': metadata['process'], 'group': 'Türschilder' if source['family'] == 'tuerschilder' else 'Hausnummern', 'subcategory': source.get('subcategory') or 'Allgemein', 'files': files, 'catalogueCategory': source['catalogueCategory'], 'catalogueExtension': True, 'targetSizeKeys': targets, 'targets': []}
        rows.append(row)
        if metadata['process'] != 'Gravur':
            row.update(status='open', reason='Druckoriginal erhalten; bearbeitbare Druckebenen und Druckprofil noch nicht vorbereitet.')
        elif not targets:
            row.update(status='open', reason=f'Originalmaß {plate[0]} × {plate[1]} mm fehlt als exaktes Format in der gepinnten Naturschiefer-Familie. Keine Drehung, Skalierung oder Geometrie erfunden.')
        else:
            try:
                native = out / 'native-source' / source['id']
                row['technicalChanges'] = adapter.adapt(staging, native, metadata, replacements, font_files)
                converted = json.loads((native / 'design.json').read_text(encoding='utf-8'))
                converted['themes'] = [source['family']]
                converted['source'] = str(Path(source['source']).parent).replace('\\', '/')
                converted['katalog'].update(zielgruppe=row['group'], unterkategorie=row['subcategory'])
                converted['originalPreparation']['source'] = converted['source']
                # Generic text roles avoid assigning memorial dates/sayings to
                # door signs. Text, typography, paths and placement stay intact.
                svg = ET.parse(native / 'design.svg')
                for parent in svg.getroot().iter():
                    for element in list(parent):
                        if adapter.tag(element) != 'text':
                            continue
                        text = ''.join(element.itertext())
                        boxes = outside_original_text_boxes(text, metadata)
                        if boxes:
                            parent.remove(element)
                            row['technicalChanges'].append({'id': element.get('id'), 'action': 'source text entirely outside original plate viewport excluded', 'text': text, 'sourceBoxesMm': boxes})
                for number, element in enumerate((n for n in svg.getroot().iter() if adapter.tag(n) == 'text'), 1):
                    element.set('data-feld', f'text-{number}')
                converted['fonts'] = sorted({n.get('font-family') for n in svg.getroot().iter() if adapter.tag(n) == 'text' and n.get('font-family')})
                converted['originalPreparation']['technicalChanges'] = row['technicalChanges']
                svg.write(native / 'design.svg', encoding='utf-8', xml_declaration=False)
                (native / 'design.json').write_text(json.dumps(converted, ensure_ascii=False, indent=2), encoding='utf-8')
                row['normalized'] = True
            except Exception as error:
                row.update(status='open', error=str(error))
        if len(rows) % 20 == 0:
            print(json.dumps({'sourceDone': len(rows), 'normalized': sum(r.get('normalized', False) for r in rows)}), flush=True)
    (out / 'source-inventory.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    (out / 'extension-source.json').write_text(json.dumps({'catalogueCommit': inventory['catalogueCommit'], 'originals': len(rows), 'exactFormatOnly': True, 'source': str(inventory_root), 'familyAssets': asset_proof, 'documentedFontPlan': str(Path(args.replacements).resolve()) if args.replacements else None}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'originals': len(rows), 'normalized': sum(r.get('normalized', False) for r in rows), 'open': sum(not r.get('normalized', False) for r in rows)}))


if __name__ == '__main__':
    main()
