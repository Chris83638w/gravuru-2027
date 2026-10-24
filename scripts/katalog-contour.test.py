"""Regression checks for drawing-based contours and safe catalog imports.
Run: python -I scripts/katalog-contour.test.py
"""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent

def module(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

serie = module('katalog-edelstahl-serie')
haupt = module('katalog-hauptprodukte')
build = module('build-katalog')
excel = module('family-excel')
with patch.dict(sys.modules, {'cairosvg': object(), 'pymupdf': object()}):
    plate = module('plate-catalog-pdf')

def family():
    return {'groups': [], 'mountingRules': [
        {'id': 'KGL', 'label': 'Kleben', 'layout': 'none', 'count': 0, 'diameterMm': None, 'edgeMm': None, 'priceCents': 299, 'skuSuffix': 'KGL'},
        {'id': 'B02-E6-D4', 'label': 'Löcher', 'layout': 'left-right', 'count': 2, 'diameterMm': 4, 'edgeMm': 6, 'priceCents': 249, 'skuSuffix': 'B02'},
        {'id': 'B02S-E6-D4', 'label': 'Schrauben', 'layout': 'left-right', 'count': 2, 'diameterMm': 4, 'edgeMm': 6, 'priceCents': 269, 'skuSuffix': 'B02S', 'accessory': 'screws'}], 'sizes': [], 'source': {}}

def row(kind='retro2', w=90, h=60):
    return {'id': f'TRT{kind[-1]}-V2A-{w/10:g}x{h/10:g}', 'kind': kind,
            'form': {'retro1': 'Retro 1 (eckig)', 'retro2': 'Retro 2 (geschwungen)'}[kind],
            'widthMm': w, 'heightMm': h, 'baseCents': 1499 if w == 90 else 1999,
            'sourceNote': 'Preis 14,99 € (Vorgabe Chris)' if w == 90 else 'Preis 19,99 € – Vorschlag Claude',
            'outline': f'M0 0H{w}V{h}H0Z', 'holes': [{'x': 7.995, 'y': h/2, 'diameter': 4}, {'x': w-7.995, 'y': h/2, 'diameter': 4}],
            'options': {'K00': 0, 'KGL': 299, 'B02': 249, 'B02S': 299}, 'weightG': 58}

class ContourCatalogTests(unittest.TestCase):
    def test_drawing_is_verbatim_and_option_prices_come_from_existing_rules(self):
        source, f = row(), family()
        old_rules = copy.deepcopy(f['mountingRules'])
        size = serie.contour_size(source, f)
        self.assertEqual(size['outlinePath'], source['outline'])
        self.assertEqual(size['holesMm'], [{'x': 7.995, 'y': 30, 'diameterMm': 4}, {'x': 82.005, 'y': 30, 'diameterMm': 4}])
        self.assertEqual(size['baseCents'], 1499)
        self.assertEqual(f['mountingRules'][:3], old_rules)
        fixed = {r['id']: r for r in f['mountingRules']}
        self.assertIsNone(fixed['B02S-KONTUR']['edgeMm'])
        self.assertEqual(fixed['B02S-KONTUR']['priceCents'], 269)
        serie.contour_size(source, f)
        self.assertEqual(len(f['mountingRules']), 5)

    def test_other_retro_prices_stay_open_and_missing_confirmation_fails(self):
        self.assertIsNone(serie.contour_size(row(w=120, h=80), family())['baseCents'])
        source = row()
        source['sourceNote'] = 'Preis 14,99 € – Vorschlag Claude'
        with self.assertRaisesRegex(ValueError, 'bestätigter'):
            serie.contour_size(source, family())

    def test_open_path_and_ambiguous_options_fail(self):
        source = row()
        source['outline'] = 'M0 0H90V60'
        with self.assertRaisesRegex(ValueError, 'Konturpfad'):
            serie.contour_size(source, family())
        f = family()
        f['mountingRules'].append({**f['mountingRules'][1], 'id': 'B02-E8-D4', 'priceCents': 999})
        with self.assertRaisesRegex(ValueError, 'uneindeutig'):
            serie.contour_size(row(), f)

    def test_cli_dry_run_preserves_family_and_apply_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            kat = Path(tmp)
            target = kat / 'familien/edelstahl/steel-door-signs.json'
            target.parent.mkdir(parents=True)
            target.write_text(json.dumps(family()), encoding='utf-8')
            source = kat / 'zeichnungen/edelstahl-schilder-2027/geometrie.json'
            source.parent.mkdir(parents=True)
            rows = [row('retro1'), row(), row(w=120, h=80)]
            source.write_text(json.dumps({'rows': rows, 'sourceExcel': 'source.xlsx', 'excelSha256': 'a'*64, 'sourceDrawing': 'source.svg', 'drawingSha256': 'b'*64, 'rowCount': 3}), encoding='utf-8')
            before = target.read_bytes()
            args = [sys.executable, '-X', 'utf8', '-I', str(ROOT / 'katalog-edelstahl-serie.py'), '--katalog', tmp]
            result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', env={**__import__('os').environ, 'PYTHONUTF8': '1'})
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(target.read_bytes(), before)
            result = subprocess.run(args + ['--apply'], capture_output=True, text=True, encoding='utf-8', env={**__import__('os').environ, 'PYTHONUTF8': '1'})
            self.assertEqual(result.returncode, 0, result.stderr)
            applied = target.read_bytes()
            self.assertNotIn(b'\r\n', applied)
            actual = json.loads(applied)
            self.assertEqual([s['baseCents'] for s in actual['sizes']], [1499, 1499, None])
            self.assertTrue(all(g['shape'] == 'contour' for g in actual['groups']))
            result = subprocess.run(args + ['--apply'], capture_output=True, text=True, encoding='utf-8', env={**__import__('os').environ, 'PYTHONUTF8': '1'})
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(target.read_bytes(), applied)

    def test_open_sheet_requires_exact_source_geometry(self):
        with tempfile.TemporaryDirectory() as tmp:
            kat = Path(tmp)
            source = kat / 'zeichnungen/edelstahl-schilder-2027/geometrie.json'
            source.parent.mkdir(parents=True)
            source.write_text(json.dumps({'rows': [row()]}), encoding='utf-8')
            size = serie.contour_size(row(), family())
            sheets = {'TR2-V2A-9x6': ('retro-series', None)}
            self.assertEqual(haupt.resolve_contour_sheets(kat, sheets, {size['key']: size}), {'TR2-V2A-9x6': size['key']})
            size['holesMm'][0]['x'] = 8
            self.assertEqual(haupt.resolve_contour_sheets(kat, {'TR2-V2A-9x6': ('retro-series', None)}, {size['key']: size}), {})

    def test_main_product_uses_export_id_and_original_master_without_mutating_design(self):
        with tempfile.TemporaryDirectory() as tmp:
            kat = Path(tmp)
            def save(rel, data):
                p = kat / rel
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(json.dumps(data), encoding='utf-8')
                return p
            source = row(w=120, h=80)
            f = family()
            f['id'] = 'test-contour'
            f['sizes'] = [serie.contour_size(source, f)]
            save('familien/edelstahl/test.json', f)
            save('zeichnungen/edelstahl-schilder-2027/geometrie.json', {'rows': [source]})
            line = save('linien/test.json', {'name': 'Test', 'families': ['test-contour'], 'subcategories': [{'id': 'familie', 'themeId': 'familienschilder', 'mainProducts': []}]})
            series = 'designs/edelstahl-gravur-retro2-91x61/'
            save(series + 'index.json', [{'key': 'TR2-V2A-9x6-D16'}])
            design = save(series + 'TR2-V2A-9x6-D16/design.json', {'name': 'Rose', 'themes': ['familienschilder'], 'sizes': [], 'sizesOpen': ['TR2-V2A-12x8']})
            original = design.read_bytes()
            (kat / series / 'UEBERSICHT.md').write_text('| TR2-V2A-12x8 | offen |\n| Design | Name |\n', encoding='utf-8')
            (kat / 'input.csv').write_text('CustomizationID;Export-Name;Hauptdesign Artikelnummer;CDR Pfad\n7000000;Retro;TR2-V2A-12x8-D16;__NEU\n', encoding='utf-8')
            shop = kat / 'shop.txt'
            shop.write_text('TR2-V2A-12x8-D16|16077801193852|ACTIVE|retro-rose|19.90|1||Retro mit Rose\n', encoding='utf-8')
            args = [sys.executable, '-X', 'utf8', '-I', str(ROOT / 'katalog-hauptprodukte.py'), '--katalog', tmp, '--linie', 'test', '--csv', 'input.csv', '--customization-id', '7000000', '--shop', str(shop)]
            result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(line.read_text(encoding='utf-8'))['subcategories'][0]['mainProducts'], [])
            result = subprocess.run(args + ['--apply'], capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(result.returncode, 0, result.stderr)
            item = json.loads(line.read_text(encoding='utf-8'))['subcategories'][0]['mainProducts'][0]
            self.assertEqual(item['externalIds']['shopifyProductId'], '16077801193852')
            self.assertEqual(item['name'], 'Retro mit Rose')
            self.assertEqual(item['startDesign'], 'TR2-V2A-9x6-D16')
            self.assertEqual(item['sizesOffered'], ['GR-ES-RT2-120X80-T15'])
            self.assertEqual(design.read_bytes(), original)
            self.assertNotIn(b'\r\n', line.read_bytes())

    def test_excel_roundtrip_preserves_exact_source_contour_and_holes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            f = family()
            f.update(schema='gravuru-product-family/v2', id='test-contour', name='Kontur-Test',
                     material={'kind': 'steel', 'label': 'Edelstahl', 'thicknessMm': 1.5, 'processingProfileId': 'steel-engraving'},
                     designArea={'marginMm': 2, 'keepoutMm': 1}, withoutMounting=True,
                     fonts=['Montserrat'], briefingNotes='')
            source = row()
            f['sizes'] = [serie.contour_size(source, f)]
            f['groups'] = [{'key': 'RT2', 'name': 'Retro 2', 'shape': 'contour', 'cornerRadiusMm': 0}]
            family_path = root / 'family.json'
            family_path.write_text(json.dumps(f), encoding='utf-8')
            book = root / 'family.xlsx'
            excel.export([family_path], book)
            report = excel.import_(book, root / 'roundtrip')
            self.assertTrue(report[0][1].startswith('gültig'), report)
            restored = json.loads((root / 'roundtrip/test-contour.json').read_text(encoding='utf-8'))
            self.assertEqual(restored['sizes'][0]['outlinePath'], source['outline'])
            self.assertEqual(restored['sizes'][0]['holesMm'], f['sizes'][0]['holesMm'])
            self.assertEqual(restored['sizes'][0]['baseCents'], 1499)
            wb = excel.load_workbook(book)
            self.assertEqual(wb['_Konturgeometrie'].sheet_state, 'hidden')
            wb.remove(wb['_Konturgeometrie'])
            wb.save(book)
            with self.assertRaisesRegex(ValueError, 'originale Konturgeometrie fehlt'):
                excel.import_(book, root / 'missing')

    def test_pdf_drawing_uses_source_curve_and_size_holes(self):
        outline = 'M0 0C10 3 80 3 90 0V60H0Z'
        item = {'w': 90, 'h': 60, 'shape': 'contour', 'radius': 0, 'outlinePath': outline,
                'backing': None, 'holes': [(7.995, 30, 4)], 'label': 'Retro 2', 'lines': []}
        svg = ET.fromstring('<svg>' + plate.plate_svg(10, 20, item, .5) + '</svg>')
        self.assertEqual(svg.find('path').get('d'), outline)
        self.assertEqual(svg.find('path').get('transform'), 'translate(10 20) scale(0.5)')
        self.assertAlmostEqual(float(svg.find('circle').get('cx')), 13.9975)
        self.assertEqual(svg.find('circle').get('r'), '1.0')

    def test_undefined_contour_backing_is_labelled_and_not_replaced_by_rectangle(self):
        item = {'w': 90, 'h': 60, 'shape': 'contour', 'radius': 0, 'outlinePath': 'M0 0H90V60H0Z',
                'backing': 3, 'holes': [], 'label': 'Retro', 'lines': []}
        svg = ET.fromstring('<svg>' + plate.plate_svg(0, 0, item, .5) + '</svg>')
        self.assertEqual(len(svg.findall('path')), 1)
        self.assertIn('Rückplatte nicht dargestellt', svg.find('desc').text)
        self.assertIn('Rückplattenkontur offen', ''.join(svg.itertext()))

    def test_catalog_reports_connected_contour_and_keeps_backing_offset_gap(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            f = family()
            f.update(schema='gravuru-product-family/v2', id='test-contour', name='Kontur-Test',
                     material={'kind': 'steel', 'label': 'Edelstahl', 'thicknessMm': 1.5, 'processingProfileId': 'steel-engraving'},
                     designArea={'marginMm': 2, 'keepoutMm': 1}, withoutMounting=True,
                     fonts=['Montserrat'], briefingNotes='')
            f['sizes'] = [serie.contour_size(row(), f)]
            f['groups'] = [{'key': 'RT2', 'name': 'Retro 2', 'shape': 'contour', 'cornerRadiusMm': 0}]
            family_path = root / 'family.json'
            for backing in [None, {'label': 'Rückplatte', 'offsetMm': 3, 'thicknessMm': 1.5}]:
                with self.subTest(backing=backing):
                    if backing:
                        f['backing'] = backing
                    family_path.write_text(json.dumps(f), encoding='utf-8')
                    original = family_path.read_bytes()
                    expected = ['Rückplattenversatz der Kontur'] if backing else []
                    self.assertEqual(build.gaps_of(family_path), expected)
                    markdown = build.family_section(f, family_path, root, False)
                    self.assertIn('Der Konfigurator verwendet diese Kontur mit Gestaltungsrand und Lochschutz.', markdown)
                    self.assertNotIn('Konfiguratoranschluss noch offen', markdown)
                    self.assertIn('**Offen:** Rückplattenversatz der Kontur' if backing else '**Stammdaten vollständig.**', markdown)
                    self.assertEqual(family_path.read_bytes(), original)

    def test_preview_preserves_actual_curve_and_exact_hole_centres(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = family()
            source = row()
            source['outline'] = 'M0 0C10 3 80 3 90 0V60H0Z'
            f['sizes'] = [serie.contour_size(source, f)]
            f['groups'] = [{'key': 'RT2', 'shape': 'contour'}]
            build.contour_previews(f, Path(tmp))
            svg = ET.parse(Path(tmp) / 'konturen/GR-ES-RT2-90X60-T15.svg')
            ns = {'s': 'http://www.w3.org/2000/svg'}
            self.assertEqual(svg.find('s:path', ns).get('d'), source['outline'])
            self.assertEqual(svg.findall('s:circle', ns)[0].get('cx'), '7.995')

if __name__ == '__main__':
    unittest.main()
