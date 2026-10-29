"""Regression: twelve layouts cannot mask a repeated or missing cat illustration."""
import json
import tempfile
import unittest
from pathlib import Path
from rasse_motif_sources import cat_motifs, sha


class CatMotifContract(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.base = self.root / 'motive-eigene/rasse-schilder-20261029'
        (self.base / 'varianten').mkdir(parents=True)
        self.sources = []
        for number in range(1, 13):
            vector = self.root / f'{number}.svg'
            raster = self.root / f'{number}.png'
            vector.write_text(f'<svg>{number}</svg>', encoding='utf-8')
            raster.write_bytes(f'original image {number}'.encode())
            self.sources.append({'breed': 'test-cat', 'variant': number,
                                 'file': vector.name, 'svgSha256': sha(vector),
                                 'sourceFile': raster.name, 'sourceSha256': sha(raster)})
        self.write_indexes()

    def write_indexes(self):
        (self.base / 'herkunft.json').write_text(json.dumps(self.sources[:1]), encoding='utf-8')
        (self.base / 'varianten/herkunft.json').write_text(json.dumps(self.sources[1:]), encoding='utf-8')

    def test_twelve_sources_resolve_in_layout_order(self):
        self.sources[1:] = reversed(self.sources[1:])
        self.write_indexes()
        result = cat_motifs(self.root, 'test-cat')
        self.assertEqual([p['variant'] for p in result], list(range(1, 13)))
        self.assertEqual(len({p['portrait'] for p in result}), 12)

    def test_missing_motif_never_reuses_original(self):
        self.sources.pop()
        self.write_indexes()
        with self.assertRaisesRegex(ValueError, 'exactly twelve'):
            cat_motifs(self.root, 'test-cat')

    def test_repeated_drawing_under_another_number_is_rejected(self):
        self.sources[-1] = dict(self.sources[1], variant=12)
        self.write_indexes()
        with self.assertRaisesRegex(ValueError, 'repeated motif'):
            cat_motifs(self.root, 'test-cat')

    def test_modified_asset_with_old_provenance_is_rejected(self):
        (self.root / '3.svg').write_text('<svg>replacement</svg>', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
            cat_motifs(self.root, 'test-cat')


if __name__ == '__main__':
    unittest.main()
