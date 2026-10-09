import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('review_export', Path(__file__).with_name('build-claude-review.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CredentialScan(unittest.TestCase):
    def test_actual_key_block_shape_is_rejected(self):
        for prefix in [b'', b'RSA ', b'EC ', b'OPENSSH ']:
            self.assertTrue(module.credential_content(b'-----BEGIN ' + prefix + b'PRIVATE KEY-----\n' + b'synthetic fixture only'))

    def test_quoted_guard_is_source_code(self):
        self.assertFalse(module.credential_content(b"if b'-----BEGIN PRIVATE KEY-----' in data: raise ValueError()"))

    def test_access_token_shapes_are_rejected(self):
        for prefix in [b'ghp_', b'shpat_', b'shpca_']:
            self.assertTrue(module.credential_content(prefix + b'X' * 32))
        self.assertFalse(module.credential_content(b'public client_id = 9640dd7a6907f0c73e7013ea8c24869b'))

if __name__ == '__main__':
    unittest.main()
