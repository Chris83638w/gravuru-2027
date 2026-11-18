import copy
from contextlib import closing
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('snapshot_native_online', Path(__file__).with_name('snapshot-native-online.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.parent = Path(tempfile.gettempdir()).resolve()
        self.root = Path(tempfile.mkdtemp(prefix='font-online-snapshot-', dir=self.parent)).resolve()
        self.data = self.root / 'data'
        self.data.mkdir(mode=0o700)
        self.writers = {}
        for name in module.DATABASES:
            p = self.data / name
            db = sqlite3.connect(p, isolation_level=None, timeout=0)
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('CREATE TABLE evidence(version INTEGER)')
            db.execute('INSERT INTO evidence VALUES(1)')
            p.chmod(0o600)
            self.writers[name] = db
        self.catalog = self.root / 'catalog'
        self.catalog.mkdir()
        (self.catalog / 'font-set.json').write_text('["Synthetic Font"]')
        (self.catalog / '.git').mkdir()
        (self.catalog / '.git' / 'config').write_text('synthetic-secret-not-a-resource')
        self.entry = self.root / 'app.cjs'
        self.entry.write_text('// synthetic entry\n')
        self.credentials = self.root / 'shopify.json'
        self.credentials.write_text('{"secret":"never-copy-synthetic-secret"}')
        self.output = self.root / 'snapshot'
        self.config = dict(schema=module.SCHEMA, data=str(self.data), destination=str(self.output),
                           webRoots=[str(self.root / 'public')], trees={'katalog': str(self.catalog)},
                           files={'entry/app.cjs': str(self.entry)}, hashOnly={'shopifyConfig': str(self.credentials)},
                           expectedHashes={'entry/app.cjs': module.sha_file(self.entry)},
                           expectedHashOnly={'shopifyConfig': module.sha_file(self.credentials)},
                           limits=dict(maxSeconds=1800, maxWalBytes=1024**3, minFreeBytes=10*1024**3,
                                       minHostAvailableBytes=6*1024**3, minCgroupHeadroomBytes=6*1024**3,
                                       addressSpaceBytes=512*1024**2))

    def tearDown(self):
        for db in self.writers.values():
            db.close()
        # Only delete the exact temporary fixture created by this test.
        self.assertEqual(self.root.parent, self.parent)
        self.assertTrue(self.root.name.startswith('font-online-snapshot-'))
        self.assertEqual(self.root.resolve(), self.root)
        shutil.rmtree(self.root)

    def metrics(self):
        return dict(free=10**12, host=10**12, cgroup=10**12, wal=0)

    def capture(self, **kwargs):
        return module.capture(self.config, metrics=self.metrics, **kwargs)

    def assert_code(self, expected, call):
        with self.assertRaises(module.SnapshotFailure) as caught:
            call()
        self.assertEqual(caught.exception.code, expected)

    def test_common_snapshot_allows_later_writes_and_restores_exact_copy(self):
        def later():
            for db in self.writers.values():
                db.execute('UPDATE evidence SET version=2')  # timeout=0: no blocked writer accepted.
        result = self.capture(hooks={'afterAllPins': later})
        receipt = module.verify(self.output, result['receiptSha256'])
        self.assertEqual(receipt['dataVersionsBefore'], receipt['dataVersionsAfter'])
        self.assertTrue(receipt['sourceReadOnly'])
        self.assertFalse((self.output / 'katalog' / '.git').exists())
        self.assertNotIn('never-copy-synthetic-secret', (self.output / module.RECEIPT).read_text())
        self.assertEqual(receipt['hashOnly']['shopifyConfig'], module.sha_file(self.credentials))
        restored = self.root / 'restored'
        config = {**self.config, 'destination': str(restored), 'snapshot': str(self.output), 'receiptSha256': result['receiptSha256']}
        module.restore(config, metrics=self.metrics)
        for name in module.DATABASES:
            self.assertEqual(self.writers[name].execute('SELECT version FROM evidence').fetchone()[0], 2)
            for directory in (self.output, restored):
                with closing(sqlite3.connect((directory / 'data' / name).as_uri()+'?mode=ro', uri=True)) as db:
                    self.assertEqual(db.execute('SELECT version FROM evidence').fetchone()[0], 1)
            self.assertEqual(module.sha_file(self.output / 'data' / name), module.sha_file(restored / 'data' / name))
        if os.name == 'posix':
            self.assertEqual(self.output.stat().st_mode & 0o777, 0o700)
            self.assertTrue(all(p.stat().st_mode & 0o077 == 0 for p in self.output.rglob('*')))

    def test_commit_during_pin_window_refuses_before_output_creation(self):
        def race(name):
            if name == module.DATABASES[0]:
                for db in self.writers.values():
                    db.execute('UPDATE evidence SET version=2')
        self.assert_code('concurrent_pin_change', lambda: self.capture(hooks={'afterPin': race}))
        self.assertFalse(self.output.exists())
        self.assertTrue(all(db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()[0] == 0 for db in self.writers.values()))

    def test_each_resource_limit_aborts_partial_copy_and_releases_readers(self):
        cases = [('wal', 2*1024**3, 'wal_limit'), ('free', 0, 'disk_reserve'),
                 ('host', 0, 'host_memory_reserve'), ('cgroup', 0, 'cgroup_memory_reserve')]
        for field, value, code in cases:
            with self.subTest(field=field):
                output = self.root / ('snapshot-' + field)
                config = {**self.config, 'destination': str(output)}
                def metrics():
                    result = self.metrics()
                    if (output / 'data' / module.DATABASES[0]).exists():
                        result[field] = value
                    return result
                self.assert_code(code, lambda: module.capture(config, metrics=metrics))
                self.assertFalse((output / module.RECEIPT).exists())
                self.assertTrue(all(db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()[0] == 0 for db in self.writers.values()))

    def test_deadline_aborts_partial_copy_and_releases_readers(self):
        def clock():
            return 2000 if (self.output / 'data' / module.DATABASES[0]).exists() else 0
        self.assert_code('time_limit', lambda: self.capture(clock=clock))
        self.assertFalse((self.output / module.RECEIPT).exists())
        self.assertTrue(all(db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()[0] == 0 for db in self.writers.values()))

    def test_changed_resource_or_configuration_never_gets_success_receipt(self):
        for key, target in [('resource', self.catalog / 'font-set.json'), ('config', self.credentials)]:
            with self.subTest(key=key):
                config = {**self.config, 'destination': str(self.root / key)}
                previous = target.read_bytes()
                try:
                    self.assert_code('resource_copy_changed' if key == 'resource' else 'configuration_changed',
                                     lambda: module.capture(config, metrics=self.metrics, hooks={'afterAllPins': lambda: target.write_text('changed')}))
                    self.assertFalse((Path(config['destination']) / module.RECEIPT).exists())
                finally:
                    target.write_bytes(previous)

    def test_existing_public_and_overlapping_outputs_are_refused(self):
        self.output.mkdir()
        sentinel = self.output / 'unchanged'
        sentinel.write_bytes(b'keep')
        self.assert_code('fresh_destination', self.capture)
        self.assertEqual(sentinel.read_bytes(), b'keep')
        for output, code in [(self.root / 'public' / 'copy', 'public_destination'),
                             (self.catalog / 'copy', 'private_outside_git'),
                             (self.data / 'copy', 'separate_destination')]:
            self.assert_code(code, lambda: module.capture({**self.config, 'destination': str(output)}, metrics=self.metrics))

    def test_tampered_receipt_and_file_cannot_be_restored(self):
        result = self.capture()
        config = {**self.config, 'snapshot': str(self.output), 'destination': str(self.root / 'restore'), 'receiptSha256': '0'*64}
        self.assert_code('receipt_changed', lambda: module.restore(config, metrics=self.metrics))
        config['receiptSha256'] = result['receiptSha256']
        (self.output / 'katalog' / 'font-set.json').write_text('tampered')
        self.assert_code('snapshot_hash', lambda: module.restore(config, metrics=self.metrics))
        self.assertFalse(Path(config['destination']).exists())

    def test_changed_reviewed_entry_or_config_stops_before_snapshot_creation(self):
        for key, file, code in [('entry', self.entry, 'expected_resource_changed'),
                                ('config', self.credentials, 'expected_configuration_changed')]:
            with self.subTest(key=key):
                before = file.read_bytes()
                try:
                    file.write_text('changed since operator review')
                    self.assert_code(code, self.capture)
                    self.assertFalse(self.output.exists())
                finally:
                    file.write_bytes(before)

    def test_source_foreign_key_failure_does_not_become_verified_backup(self):
        db = self.writers[module.DATABASES[0]]
        db.executescript('CREATE TABLE p(id INTEGER PRIMARY KEY); CREATE TABLE c(parent REFERENCES p(id)); INSERT INTO c VALUES(99);')
        self.assert_code('copy_foreign_keys', self.capture)
        self.assertFalse((self.output / module.RECEIPT).exists())

    def test_resource_traversal_and_source_links_are_rejected(self):
        config = copy.deepcopy(self.config)
        config['files'] = {'../escape': str(self.entry)}
        self.assert_code('relative_path', lambda: module.capture(config, metrics=self.metrics))
        link = self.catalog / 'linked'
        try:
            link.symlink_to(self.entry)
        except OSError:
            self.skipTest('Creating symlinks requires Windows privileges; Linux must run this case.')
        with self.assertRaises(module.SnapshotFailure):
            self.capture()
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
