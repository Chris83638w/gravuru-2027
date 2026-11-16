import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('extension', Path(__file__).with_name('prepare-slate-catalog-extension.py'))
extension = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extension)


class OriginalViewport(unittest.TestCase):
    def test_only_fully_invisible_original_text_is_excluded(self):
        metadata = {'plate': {'widthMm': 200, 'heightMm': 200}, 'texts': [{'text': '14400000', 'box': [0, -18.12, 47.7, 8.12]}, {'text': 'Familie', 'box': [12, 75, 175, 16]}]}
        self.assertEqual(extension.outside_original_text_boxes('14400000', metadata), [[0, -18.12, 47.7, 8.12]])
        self.assertEqual(extension.outside_original_text_boxes('Familie', metadata), [])
        self.assertEqual(extension.outside_original_text_boxes('Unbekannt', metadata), [])

    def test_partial_overlap_missing_box_or_ambiguous_repetition_is_retained(self):
        for texts in [[{'text': 'Text', 'box': [0, -3, 10, 5]}], [{'text': 'Text'}], [{'text': 'Text', 'box': [0, -10, 10, 5]}, {'text': 'Text', 'box': [0, 10, 10, 5]}]]:
            self.assertEqual(extension.outside_original_text_boxes('Text', {'plate': {'widthMm': 100, 'heightMm': 100}, 'texts': texts}), [])


if __name__ == '__main__':
    unittest.main()
