import fcntl
from contextlib import closing
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('activate', Path(__file__).with_name('complete-gallery-activate.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ActivationTests(unittest.TestCase):
    def setUp(self):
        os.umask(0o077)
        self.temp = tempfile.TemporaryDirectory(prefix='complete-gallery-activation-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stage = self.root / 'private/complete-gallery-20261107-v1'
        self.active = self.root / 'private/gesamtbestand-stage-0bb50565-20261106-v1'
        self.data = self.active / 'data'
        for name, value in [('ROOT', self.root), ('STAGE', self.stage), ('ACTIVE', self.active), ('DATA', self.data), ('EXPECTED_UID', os.getuid())]:
            patched = patch.object(module, name, value); patched.start(); self.addCleanup(patched.stop)
        self.stage.mkdir(parents=True, mode=0o700); self.data.mkdir(parents=True, mode=0o700)
        self.commit = 'a' * 40
        self.code = self.root / ('gravuru-2027-complete-' + self.commit[:8]); self.code.mkdir(mode=0o755)
        self.gallery = self.stage / 'gallery'; self.gallery.mkdir(mode=0o700)
        self.backup = self.stage / 'activation-backup-test'
        self.write(self.data / '.runtime.lock', b'')
        self.write(self.data / '.gravuru-private-test.json', {'schema': 1, 'purpose': 'private-test-data', 'origin': module.ORIGIN})
        self.write(self.gallery / '.gravuru-slate-review.json', {'schema': 1, 'purpose': 'slate-review-gallery', 'origin': module.ORIGIN})
        self.old_row = {'key': 'size:old', 'productId': 'cfg_old', 'reviewOnly': True, 'designIds': ['OLD'], 'revision': 1}
        self.new_row = {'key': 'new-group', 'productId': 'cfg_new', 'reviewOnly': True, 'designIds': ['NEW,1'], 'revision': 1}
        self.mapping = lambda rows: {'localOnly': True, 'published': False, 'shopifyWrites': 0, 'products': rows}
        self.write(self.data / module.MAPPING, self.mapping([self.old_row]))
        self.write(self.stage / 'staged-import.json', self.mapping([self.old_row, self.new_row]))
        self.write(self.gallery / 'manifest.json', {'schema': 'gravuru-design-original-review/v1', 'reviewOnly': True, 'released': False,
            'products': [self.old_row, self.new_row], 'originals': [
                {'id': 'OLD', 'targets': [{'status': 'prepared', 'sizeKey': 'size', 'mm': [50, 20]}]},
                {'id': 'NEW,1', 'targets': [{'status': 'prepared', 'sizeKey': 'new-size', 'mm': [50, 20], 'productKey': 'new-group', 'nativeDesignId': 'native-new'}]}]})
        with closing(sqlite3.connect(self.data / 'workshop.sqlite')) as db, db:
            db.executescript('CREATE TABLE products(tenant_id TEXT,id TEXT,revision INTEGER,published_revision INTEGER,archived INTEGER);CREATE TABLE product_revisions(tenant_id TEXT,product_id TEXT,revision INTEGER,document TEXT);')
            for product, native, original, revision in [('cfg_old', 'katalog-OLD', 'OLD', 2), ('cfg_new', 'native-new', 'NEW,1', 1)]:
                db.execute('INSERT INTO products VALUES(?,?,?,?,?)', ('gravuru', product, revision, None, 0))
                for r in range(1, revision + 1):
                    document = {'config': {'reviewOnly': True, 'profile': {'designs': [{'id': native, 'katalog': {'designId': original}, 'objects': [{'text': 'user edit' if r > 1 else 'baseline'}]}]}}}
                    db.execute('INSERT INTO product_revisions VALUES(?,?,?,?)', ('gravuru', product, r, json.dumps(document)))
        for name in module.DATABASES:
            with closing(sqlite3.connect(self.data / name)) as db, db:
                db.execute('CREATE TABLE preserved(value TEXT)'); db.execute("INSERT INTO preserved VALUES('user data')")
        values = {'GRAVURU_TEST_ORIGIN': module.ORIGIN, 'GRAVURU_PRIVATE_DATA_DIR': str(self.data), 'GRAVURU_TEST_USERNAME': 'synthetic', 'GRAVURU_TEST_PASSWORD': 'synthetic-not-a-live-credential', 'GRAVURU_SLATE_REVIEW_PACKAGE': str(self.active / 'gallery-4')}
        self.write(self.active / 'config.json', {'schema': 1, 'purpose': 'private-test-runtime', 'values': values})
        self.write(self.stage / 'config.json', {'schema': 1, 'purpose': 'private-test-runtime', 'values': {**values, 'GRAVURU_SLATE_REVIEW_PACKAGE': str(self.gallery)}})
        self.write(self.code / 'ops/plesk/app.cjs', b'// private runtime\n')
        wrapper = 'process.env.GRAVURU_TEST_CONFIG_FILE=' + json.dumps(str(self.stage / 'config.json')) + ";\nrequire('./ops/plesk/app.cjs');\n"
        self.write(self.code / 'app.cjs', wrapper.encode())
        self.write(self.code / 'PACKAGE-MANIFEST.json', {'sourceCommit': self.commit, 'scope': 'private-operator-test', 'shopifyConnected': False, 'files': [{'path': 'ops/plesk/app.cjs', 'sha256': module.digest(self.code / 'ops/plesk/app.cjs'), 'bytes': (self.code / 'ops/plesk/app.cjs').stat().st_size}]})
        self.proof = {'schema': 'gravuru-complete-gallery-stage/v1', 'sourceCommit': self.commit, 'ready': True, 'activated': False, 'shopifyWrites': 0, 'backupVerified': True, 'runtimeImportsAndBuildVerified': True, 'stagedMappingVerified': True, 'preservation': {'passed': True}, 'concurrentlyChangedExistingHeads': [], 'code': str(self.code), 'gallery': str(self.gallery), 'config': str(self.stage / 'config.json'), 'mapping': str(self.stage / 'staged-import.json'),
            'mappingSha256': module.digest(self.stage / 'staged-import.json'), 'beforeMappingSha256': module.digest(self.data / module.MAPPING), 'activeConfigSha256': module.digest(self.active / 'config.json'), 'configSha256': module.digest(self.stage / 'config.json'), 'galleryManifestSha256': module.digest(self.gallery / 'manifest.json'), 'wrapperSha256': module.digest(self.code / 'app.cjs')}
        self.write(self.stage / 'STAGE-READY.json', self.proof)
        self.args = SimpleNamespace(commit=self.commit, mapping_sha256=self.proof['mappingSha256'], backup=self.backup)

    def write(self, file, value):
        file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        file.write_bytes(value if isinstance(value, bytes) else (json.dumps(value) + '\n').encode())
        file.chmod(0o600)

    def test_atomic_mapping_and_sqlite_backups_preserve_all_active_databases_and_edits(self):
        before = {p.name: module.digest(p) for p in self.data.glob('*.sqlite')}
        receipt = module.activate(self.args)
        self.assertEqual((self.data / module.MAPPING).read_bytes(), (self.stage / 'staged-import.json').read_bytes())
        self.assertEqual(before, {p.name: module.digest(p) for p in self.data.glob('*.sqlite')})
        self.assertEqual(receipt['siteId'], 19); self.assertTrue(receipt['sameData']); self.assertFalse(receipt['serviceStarted']); self.assertFalse(receipt['pleskChanged']); self.assertEqual(receipt['shopifyWrites'], 0)
        self.assertEqual(receipt['counts']['addedMappedGroups'], 1)
        self.assertEqual(module.digest(self.backup / 'previous-local-review-import.json'), self.proof['beforeMappingSha256'])
        self.assertEqual(json.loads((self.backup / 'ACTIVATION-RECEIPT.json').read_text()), receipt)
        summary = json.loads((self.backup / 'product-heads.json').read_text())
        self.assertIn(['gravuru', 'cfg_old', 2, None, 0], summary['heads'])
        for name in module.DATABASES:
            with closing(sqlite3.connect(self.backup / name)) as db:
                self.assertEqual(db.execute('SELECT value FROM preserved').fetchall(), [('user data',)])

    def test_live_runtime_lock_prevents_backups_and_mapping_change(self):
        with (self.data / '.runtime.lock').open('r+b') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                module.activate(self.args)
        self.assertFalse(self.backup.exists()); self.assertEqual(module.digest(self.data / module.MAPPING), self.proof['beforeMappingSha256'])

    def test_wrong_mapping_commit_or_active_config_fails_before_backup(self):
        self.args.commit = 'b' * 40
        with self.assertRaisesRegex(ValueError, 'Pinned stage differs'):
            module.activate(self.args)
        self.args.commit = self.commit; self.args.mapping_sha256 = 'f' * 64
        with self.assertRaisesRegex(ValueError, 'Pinned stage differs'):
            module.activate(self.args)
        self.args.mapping_sha256 = self.proof['mappingSha256']
        self.write(self.active / 'config.json', {'changed': True})
        with self.assertRaisesRegex(ValueError, 'configuration changed'):
            module.activate(self.args)
        self.assertFalse(self.backup.exists())

    def test_native_design_mismatch_fails_without_changing_mapping(self):
        with closing(sqlite3.connect(self.data / 'workshop.sqlite')) as db, db:
            db.execute("UPDATE product_revisions SET document=json_set(document,'$.config.profile.designs[0].id','wrong') WHERE product_id='cfg_new'")
        with self.assertRaisesRegex(ValueError, 'Native design IDs differ'):
            module.activate(self.args)
        self.assertFalse(self.backup.exists()); self.assertEqual(module.digest(self.data / module.MAPPING), self.proof['beforeMappingSha256'])

    def test_changed_old_mapping_identity_and_changed_active_mapping_are_rejected(self):
        altered = self.mapping([{**self.old_row, 'productId': 'cfg_changed'}, self.new_row])
        self.write(self.stage / 'staged-import.json', altered)
        self.proof['mappingSha256'] = module.digest(self.stage / 'staged-import.json'); self.args.mapping_sha256 = self.proof['mappingSha256']; self.write(self.stage / 'STAGE-READY.json', self.proof)
        with self.assertRaisesRegex(ValueError, 'Existing mapped group changed'):
            module.activate(self.args)
        self.write(self.data / module.MAPPING, self.mapping([]))
        with self.assertRaisesRegex(ValueError, 'Active mapping changed after staging'):
            module.activate(self.args)
        self.assertFalse(self.backup.exists())

    def test_receipt_failure_restores_exact_old_mapping_and_releases_lock(self):
        replace = os.replace
        def fail_receipt(source, target):
            if str(target).endswith('ACTIVATION-RECEIPT.json'):
                raise OSError('simulated receipt failure')
            return replace(source, target)
        with patch.object(module.os, 'replace', side_effect=fail_receipt):
            with self.assertRaisesRegex(OSError, 'simulated receipt failure'):
                module.activate(self.args)
        self.assertEqual(module.digest(self.data / module.MAPPING), self.proof['beforeMappingSha256'])
        self.assertFalse((self.backup / 'ACTIVATION-RECEIPT.json').exists())
        self.assertTrue((self.backup / 'ACTIVATION-PREPARED.json').exists())
        with module.runtime_lock():
            pass

    def test_running_native_write_during_backup_cannot_be_overwritten(self):
        original = module.backup_sqlite
        def concurrent(source, target):
            result = original(source, target)
            if source.name == 'profiles.sqlite':
                with closing(sqlite3.connect(self.data / 'workshop.sqlite')) as db, db:
                    db.execute("UPDATE products SET revision=3 WHERE id='cfg_old'")
            return result
        with patch.object(module, 'backup_sqlite', side_effect=concurrent):
            with self.assertRaisesRegex(ValueError, 'Concurrent native product edit'):
                module.activate(self.args)
        self.assertEqual(module.digest(self.data / module.MAPPING), self.proof['beforeMappingSha256'])

    def test_concurrent_mapping_edit_during_backup_is_preserved(self):
        original = module.backup_sqlite
        concurrent_mapping = self.mapping([self.old_row]); concurrent_mapping['note'] = 'separate operator edit'
        def concurrent(source, target):
            result = original(source, target)
            if source.name == 'profiles.sqlite':
                self.write(self.data / module.MAPPING, concurrent_mapping)
            return result
        with patch.object(module, 'backup_sqlite', side_effect=concurrent):
            with self.assertRaisesRegex(ValueError, 'Concurrent active mapping edit'):
                module.activate(self.args)
        self.assertEqual(json.loads((self.data / module.MAPPING).read_text()), concurrent_mapping)

    def test_foreign_data_path_linked_mapping_and_nonprivate_backup_are_rejected(self):
        self.args.backup = self.root / 'public-backup'
        with self.assertRaisesRegex(ValueError, 'Fresh private stage backup'):
            module.activate(self.args)
        self.args.backup = self.backup
        target = self.stage / 'staged-import.json'; raw = target.read_bytes(); target.unlink(); self.write(self.stage / 'other-mapping.json', raw); target.symlink_to(self.stage / 'other-mapping.json')
        with self.assertRaisesRegex(ValueError, 'Canonical site path'):
            module.activate(self.args)
        self.assertFalse(self.backup.exists())


if __name__ == '__main__':
    unittest.main()
