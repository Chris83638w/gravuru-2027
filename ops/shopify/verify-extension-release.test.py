"""Exercise the release gate against the recovered, nonsecret configuration."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('gate', Path(__file__).with_name('verify-extension-release.py'))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
ARCHIVE = ROOT / 'deliverables/shopify-extension-build-20261010/gravuru-shopify-extension-candidate.zip'
ACTIVE = json.loads((ROOT / 'docs/releases/20261010/active-modules.json').read_text())


class ReleaseGate(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        with zipfile.ZipFile(ARCHIVE) as archive:
            archive.extractall(self.root)

    def test_complete_candidate_preserves_all_active_modules(self):
        result = gate.verify(self.root, ACTIVE)
        self.assertEqual(len(result['themeFiles']), 19)
        self.assertEqual(result['moduleCount'], 7)
        self.assertFalse(result['function']['activeBinaryEqualityVerified'])
        self.assertFalse(result['wholeApplicationReady'])

    def test_missing_asset_is_not_an_extension_backup(self):
        (self.root / 'extensions/gravuru-storefront/assets/gravuru-loader.js').unlink()
        with self.assertRaisesRegex(ValueError, 'inventory'):
            gate.verify(self.root, ACTIVE)

    def test_modified_asset_is_not_silently_published(self):
        file = self.root / 'extensions/gravuru-storefront/assets/gravuru-loader.js'
        file.write_bytes(file.read_bytes() + b'\n')
        with self.assertRaisesRegex(ValueError, 'Changed theme asset'):
            gate.verify(self.root, ACTIVE)

    def test_stale_historical_app_home_extension_is_rejected(self):
        (self.root / 'extensions/app-home').mkdir()
        with self.assertRaisesRegex(ValueError, 'unexpected extension'):
            gate.verify(self.root, ACTIVE)

    def test_app_url_or_scopes_cannot_change_implicitly(self):
        file = self.root / 'shopify.app.toml'
        original = file.read_text()
        for changed in [original.replace('/produktanlage.html', '/werkstatt/'),
                        original.replace('read_files,', 'read_orders,read_files,')]:
            file.write_text(changed)
            with self.assertRaises(ValueError):
                gate.verify(self.root, ACTIVE)

    def test_current_snapshot_must_include_every_module(self):
        snapshot = json.loads(json.dumps(ACTIVE))
        snapshot['appModuleVersions'].pop()
        with self.assertRaisesRegex(ValueError, 'inventory'):
            gate.verify(self.root, snapshot)

    def test_function_query_and_wasm_must_exist(self):
        folder = self.root / 'extensions/gravuru-personalization-price'
        query = folder / 'src/cart_transform_run.graphql'
        original = query.read_bytes()
        query.write_bytes(original + b'\n')
        with self.assertRaisesRegex(ValueError, 'query changed'):
            gate.verify(self.root, ACTIVE)
        query.write_bytes(original)
        (folder / 'dist/function.wasm').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing or unsafe'):
            gate.verify(self.root, ACTIVE)

    def test_external_symlink_cannot_supply_a_theme_asset(self):
        file = self.root / 'extensions/gravuru-storefront/assets/gravuru-loader.js'
        external = self.root / 'external.js'
        file.rename(external)
        file.symlink_to(external)
        with self.assertRaisesRegex(ValueError, 'unsafe'):
            gate.verify(self.root, ACTIVE)


if __name__ == '__main__':
    unittest.main()
