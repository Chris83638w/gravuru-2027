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
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('snapshot_native_online', Path(__file__).with_name('snapshot-native-online.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.parent = Path(tempfile.gettempdir()).resolve()
        self.root = Path(tempfile.mkdtemp(prefix='font-online-snapshot-', dir=self.parent)).resolve()
        self.data = self.root / 'data'
        self.data.mkdir(mode=0o700)
        (self.root / 'public').mkdir()
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
        self.credentials.chmod(0o600)
        self.output = self.root / 'snapshot'
        self.config = dict(schema=module.SCHEMA, data=str(self.data), destination=str(self.output),
                           webRoots=[str(self.root / 'public')], trees={'katalog': str(self.catalog)},
                           files={'entry/app.cjs': str(self.entry)}, hashOnly={'shopifyConfig': str(self.credentials)},
                           expectedHashes={'entry/app.cjs': module.sha_file(self.entry)},
                           expectedHashOnly={'shopifyConfig': module.sha_file(self.credentials)},
                           limits=dict(maxSeconds=1800, maxPinnedSeconds=300, maxWalBytes=1024**3, minFreeBytes=10*1024**3,
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

    def test_pinned_deadline_is_separate_and_releases_every_reader(self):
        def clock():
            return 301 if (self.output / 'data' / module.DATABASES[0]).exists() else 0
        self.assert_code('pinned_time_limit', lambda: self.capture(clock=clock))
        self.assertFalse((self.output / module.RECEIPT).exists())
        self.assertTrue(all(db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()[0] == 0 for db in self.writers.values()))

    def test_preflight_creates_nothing_and_never_opens_a_database(self):
        before = sorted(str(p) for p in self.root.rglob('*'))
        hashes = {n: module.sha_file(self.data / n) for n in module.DATABASES}
        with patch.object(module.sqlite3, 'connect', side_effect=AssertionError('preflight must not open SQLite')):
            result = module.preflight(self.config, metrics=self.metrics)
        self.assertEqual(result['databasesOpened'], 0)
        self.assertEqual(result['pathsCreated'], 0)
        self.assertEqual(before, sorted(str(p) for p in self.root.rglob('*')))
        self.assertEqual(hashes, {n: module.sha_file(self.data / n) for n in module.DATABASES})
        self.assertFalse(self.output.exists())
        bad = {**self.config, 'webRoots': [str(self.root / 'missing-webroot')]}
        self.assert_code('web_root_directory', lambda: module.preflight(bad, metrics=self.metrics))

    def test_cache_advice_is_only_for_private_copies_never_live_sources(self):
        advised = []
        with patch.object(module, 'drop_target_cache', side_effect=lambda p: advised.append(p)):
            result = self.capture()
            restored = self.root / 'restored'
            module.restore({**self.config, 'snapshot': str(self.output), 'destination': str(restored),
                            'receiptSha256': result['receiptSha256']}, metrics=self.metrics)
        self.assertTrue(advised)
        self.assertTrue(all(p.is_relative_to(self.output) or p.is_relative_to(restored) for p in advised))
        self.assertTrue(all(self.output / 'data' / n in advised for n in module.DATABASES))
        receipt = module.verify(self.output, result['receiptSha256'])
        self.assertGreaterEqual(receipt['phaseSeconds']['readersOpen'], receipt['phaseSeconds']['pinned'])

    def fake_cgroup(self, version, levels):
        system = self.root / ('sys-v' + str(version))
        base = system / 'memory' if version == 1 else system
        proc = self.root / ('proc-v' + str(version))
        proc.write_text('1:memory:/worker\n' if version == 1 else '0::/worker\n')
        for name, used, limit, inactive, active, dirty, writeback in levels:
            directory = base / name
            directory.mkdir(parents=True, exist_ok=True)
            names = ('memory.usage_in_bytes', 'memory.limit_in_bytes') if version == 1 else ('memory.current', 'memory.max')
            (directory / names[0]).write_text(str(used))
            (directory / names[1]).write_text(str(limit))
            fields = ('total_inactive_file', 'total_active_file', 'total_dirty', 'total_writeback') if version == 1 else ('inactive_file', 'active_file', 'file_dirty', 'file_writeback')
            (directory / 'memory.stat').write_text('\n'.join(f'{k} {v}' for k, v in zip(fields, (inactive, active, dirty, writeback))))
        return proc, system

    def test_v1_clean_cache_is_reclaimable_dirty_pages_and_parent_limits_count(self):
        proc, system = self.fake_cgroup(1, [('worker', 950, 1000, 400, 300, 50, 50),
                                          ('', 1300, 1500, 200, 100, 100, 0)])
        result = module.cgroup_memory(proc, system)
        self.assertEqual(result['headroomBytes'], 400)
        self.assertEqual([g['headroomBytes'] for g in result['groups']], [650, 400])
        self.assertEqual(result['groups'][0]['chargedBytes'], 350)

    def test_v2_clean_cache_reclaims_but_dirty_writeback_and_missing_stats_fail_closed(self):
        proc, system = self.fake_cgroup(2, [('worker', 999, 1000, 500, 400, 100, 50),
                                          ('', 999, 'max', 500, 400, 100, 50)])
        self.assertEqual(module.cgroup_memory(proc, system)['headroomBytes'], 751)
        (system / 'worker' / 'memory.stat').write_text('inactive_file 20\nactive_file 10\nfile_dirty 100\nfile_writeback 20\n')
        self.assertEqual(module.cgroup_memory(proc, system)['headroomBytes'], 1)
        (system / 'worker' / 'memory.stat').write_text('inactive_file 20\n')
        self.assert_code('cgroup_stat_incomplete', lambda: module.cgroup_memory(proc, system))

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
