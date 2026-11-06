"""Regression: delivered startup imports must resolve outside the source checkout."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('package_builder', Path(__file__).with_name('build-plesk-test-package.py'))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class RuntimeImports(unittest.TestCase):
    def package(self, root, include_price=True, runtime='runtime.mjs'):
        archive = root / 'runtime.zip'
        with zipfile.ZipFile(archive, 'w') as target:
            target.writestr('ops/plesk/' + runtime, "import '../../app/workshop/http.mjs';")
            target.writestr('app/workshop/http.mjs', "import './cart-personalization.mjs';")
            target.writestr('app/workshop/cart-personalization.mjs',
                            "import '../../ops/shopify/master-release/priced-options.mjs';")
            if include_price:
                target.writestr('ops/shopify/master-release/priced-options.mjs', 'export const price = 0;')
            target.writestr('ops/plesk/slate-review-runtime.mjs', 'export const gallery = true;')
            target.writestr('scripts/extend-design-review.mjs', 'export const importer = true;')
        return archive

    def test_transitive_private_startup_import_resolves(self):
        with tempfile.TemporaryDirectory() as temporary:
            archive = self.package(Path(temporary))
            builder.check_runtime_imports(archive, 'private-operator-test')

    def test_missing_transitive_price_module_fails_even_when_checkout_has_it(self):
        self.assertTrue((builder.ROOT / 'ops/shopify/master-release/priced-options.mjs').is_file())
        with tempfile.TemporaryDirectory() as temporary:
            archive = self.package(Path(temporary), include_price=False)
            with self.assertRaisesRegex(ValueError, 'priced-options.mjs'):
                builder.check_runtime_imports(archive, 'private-operator-test')

    def test_selected_merchant_startup_import_resolves(self):
        with tempfile.TemporaryDirectory() as temporary:
            archive = self.package(Path(temporary), runtime='merchant-runtime.mjs')
            builder.check_runtime_imports(archive, 'shopify-merchant-test')

    def test_only_shared_price_module_is_selected_from_release_tools(self):
        self.assertEqual(builder.SHARED_RUNTIME_FILES, ['ops/shopify/master-release/priced-options.mjs'])


if __name__ == '__main__':
    unittest.main()
