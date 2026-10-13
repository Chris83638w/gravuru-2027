"""Contracts for reuse, editable fields, physical size and accidental drift."""
import base64
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('session', Path(__file__).with_name('product-design-session.py'))
s = importlib.util.module_from_spec(spec); spec.loader.exec_module(s)
PHOTO = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4X8AAAAASUVORK5CYII=')


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root/'reference.svg'
        self.source.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 150 200">'
            '<defs><clipPath id="mask"><rect width="100" height="100"/></clipPath></defs>'
            '<g id="photo"><g clip-path="url(#mask)"><image width="100" height="100" href="data:image/png;base64,'+
            base64.b64encode(PHOTO).decode()+'"/></g></g><g id="names"><text x="75" y="150" font-family="Garamond">Namen</text></g>'
            '<g id="line"><path d="M20 160H130" stroke="black"/></g></svg>')
        self.ref = {'name': 'Synthetic', 'sourceSha256': s.digest(self.source.read_bytes()), 'widthMm': 150, 'heightMm': 200,
            'shape': 'rectangle', 'layers': {'photo': 'Foto', 'names': 'Namen', 'line': 'Linie'},
            'fields': {'photo': {'kind': 'photo', 'key': 'main'}, 'names': {'kind': 'text', 'key': 'names'}},
            'fonts': {'Garamond': 'Garamond Acryl'}, 'visualStatus': 'Synthetic fixture'}
        self.job = self.root/'job'

    def start(self, **kwargs):
        return s.start(self.source, self.job, self.ref, 'Nur Namen ändern', changed=['names'], **kwargs)

    def edit(self, mutate):
        tree = ET.parse(self.job/'design.svg'); mutate(tree.getroot()); tree.write(self.job/'design.svg', encoding='utf-8')

    def test_name_edit_keeps_photo_and_original_and_check_is_repeatable(self):
        raw = self.source.read_bytes(); self.start()
        self.edit(lambda root: root.find('.//'+s.NS+'text').__setattr__('text', 'Anna & Ben'))
        first = s.check(self.job); second = s.check(self.job)
        self.assertEqual(first, second)
        result = ET.fromstring((Path(first['output'])/'design.svg').read_bytes())
        self.assertEqual(s.bitmap(next(result.iter(s.NS+'image')).get('href'))[0], PHOTO)
        self.assertEqual((self.job/'source.svg').read_bytes(), raw)
        self.assertNotIn('base64', (self.job/'BRIEF.md').read_text())
        self.assertNotIn('base64', (self.job/'design.svg').read_text())
        self.assertEqual((self.job/'source.svg').stat().st_mode & 0o777, 0o600)

    def test_unrequested_decoration_change_fails(self):
        self.start(); self.edit(lambda r: r.find('.//'+s.NS+'path').set('stroke', 'red'))
        with self.assertRaisesRegex(ValueError, 'Nicht beauftragte'): s.check(self.job)

    def test_editable_text_must_not_be_flattened(self):
        self.start()
        def flatten(r):
            group = r.find(s.NS+'g[@id="names"]'); group.clear(); group.set('id', 'names')
            ET.SubElement(group, s.NS+'path', {'d': 'M1 1H2'})
        self.edit(flatten)
        with self.assertRaisesRegex(ValueError, 'Kundenfeld'): s.check(self.job)

    def test_photo_replacement_requires_specific_permission(self):
        s.start(self.source, self.job, self.ref, 'Foto verschieben', changed=['photo'])
        changed = PHOTO+b'changed'; name = s.digest(changed)+'.png'
        (self.job/'assets'/name).write_bytes(changed)
        self.edit(lambda r: next(r.iter(s.NS+'image')).set('href', 'assets/'+name))
        with self.assertRaisesRegex(ValueError, 'Bild wurde ungefragt'): s.check(self.job)

    def test_pixels_or_incorrect_viewbox_fail(self):
        self.start(); self.edit(lambda r: r.set('width', '150px'))
        with self.assertRaisesRegex(ValueError, 'Maße in mm'): s.check(self.job)
        self.edit(lambda r: (r.set('width', '150mm'), r.set('viewBox', '0 0 300 400')))
        with self.assertRaisesRegex(ValueError, 'viewBox'): s.check(self.job)

    def test_source_change_and_double_start_fail(self):
        self.start()
        with self.assertRaises(FileExistsError): self.start()
        (self.job/'source.svg').write_bytes(self.source.read_bytes()+b'\n')
        with self.assertRaisesRegex(ValueError, 'Original'): s.check(self.job)

    def test_external_image_and_traversal_fail(self):
        self.start()
        for href in ['https://example.com/photo.png', '../reference.svg', 'file:///etc/passwd']:
            with self.subTest(href=href):
                self.edit(lambda r: next(r.iter(s.NS+'image')).set('href', href))
                with self.assertRaisesRegex(ValueError, 'Bildverweis'): s.check(self.job)

    def test_script_rejected(self):
        self.start(); self.edit(lambda r: ET.SubElement(r.find(s.NS+'g'), s.NS+'script'))
        with self.assertRaisesRegex(ValueError, 'SVG-Element'): s.check(self.job)

    def test_shape_dimensions_and_incomplete_review_are_explicit(self):
        self.start(width=200, height=200, shape='circle')
        result = s.check(self.job)
        self.assertEqual([result['widthMm'], result['heightMm']], [200, 200])
        self.assertEqual(result['contourContainment'], 'not_checked')
        self.assertEqual(result['visualReview'], 'pending')
        self.assertFalse(result['productionReleased'])
        for shape, w, h, radius in [('rectangle', 150, 200, 0), ('rounded-rectangle', 150, 200, 8),
                                     ('circle', 200, 200, 0), ('ellipse', 150, 200, 0), ('arch', 150, 200, 0)]:
            root = ET.fromstring(s.contour(w, h, shape, radius))
            self.assertEqual(s.dimensions(root), [w, h])
        for shape, w, h, radius in [('circle', 150, 200, 0), ('arch', 200, 40, 0),
                                     ('rounded-rectangle', 150, 200, 0), ('rectangle', -1, 200, 0)]:
            with self.assertRaises(ValueError): s.contour(w, h, shape, radius)

    def test_unmapped_font_fails(self):
        self.start(); self.edit(lambda r: r.find('.//'+s.NS+'text').set('font-family', 'Invented'))
        with self.assertRaisesRegex(ValueError, 'Schrift'): s.check(self.job)

    def test_photo_mask_must_resolve_even_when_photo_layer_is_editable(self):
        s.start(self.source, self.job, self.ref, 'Foto verschieben', changed=['photo'])
        self.edit(lambda r: r.find('.//'+s.NS+'g[@clip-path]').set('clip-path', 'url(#missing)'))
        with self.assertRaisesRegex(ValueError, 'Fotomaske nicht auflösbar'): s.check(self.job)

    def test_reordering_existing_layers_fails(self):
        self.start()
        def reorder(root):
            group = root.find(s.NS+'g[@id="names"]'); root.remove(group); root.append(group)
        self.edit(reorder)
        with self.assertRaisesRegex(ValueError, 'Ebenenreihenfolge'): s.check(self.job)


if __name__ == '__main__':
    unittest.main()
