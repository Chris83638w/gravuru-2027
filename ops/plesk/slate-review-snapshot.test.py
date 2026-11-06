import importlib.util
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('snapshot', Path(__file__).with_name('slate-review-snapshot.py'))
snapshot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snapshot)


class SnapshotTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='gravuru-slate-snapshot-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / 'source-data'
        self.gallery = self.root / 'source-gallery'
        self.data.mkdir()
        self.gallery.mkdir()
        self.connections = []
        for name in snapshot.DATABASES:
            db = sqlite3.connect(self.data / name)
            self.connections.append(db)
            self.addCleanup(db.close)
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('PRAGMA wal_autocheckpoint=0')
            db.execute('CREATE TABLE preserved(id TEXT, revision INTEGER, text TEXT)')
            db.execute('INSERT INTO preserved VALUES(?,?,?)', ('unchanged-id', 3, 'edited text / comment'))
            db.commit()
        product = {'key': 'slate-only', 'productId': 'cfg_original-id', 'reviewOnly': True, 'designIds': ['D1']}
        pack = {'schema': 'gravuru-slate-original-review/v1', 'reviewOnly': True, 'released': False,
                'originals': [{'id': 'D1'}], 'products': [product]}
        (self.gallery / 'manifest.json').write_text(json.dumps(pack), encoding='utf-8')
        (self.gallery / 'files-sha256.json').write_text(json.dumps([snapshot.record(self.gallery / 'manifest.json', 'manifest.json')]))
        (self.data / snapshot.MAPPING).write_text(json.dumps({'localOnly': True, 'published': False, 'shopifyWrites': 0, 'products': [product]}))
        self.output = self.root / 'snapshot'

    def capture(self):
        return snapshot.capture(self.data, self.gallery, self.output)

    def test_material_review_schema_survives_capture_and_verification(self):
        manifest = self.gallery / 'manifest.json'
        pack = json.loads(manifest.read_text(encoding='utf-8'))
        pack['schema'] = 'gravuru-design-original-review/v1'
        manifest.write_text(json.dumps(pack), encoding='utf-8')
        (self.gallery / 'files-sha256.json').write_text(json.dumps([snapshot.record(manifest, 'manifest.json')]))
        self.capture()
        self.assertEqual(snapshot.verify(self.output)['counts']['products'], 1)

    def test_wal_edits_comments_revisions_and_ids_survive_install(self):
        self.assertTrue((self.data / 'workshop.sqlite-wal').stat().st_size > 0)
        result = self.capture()
        self.assertEqual(result['products'], 1)
        receipt = snapshot.verify(self.output)
        self.assertFalse(any(row['file'].endswith(('-wal', '-shm')) for row in receipt['files']))
        target, gallery = self.root / 'new-data', self.root / 'new-gallery'
        snapshot.install(self.output, target, gallery, 'https://slate.example')
        for name in snapshot.DATABASES:
            with closing(sqlite3.connect(target / name)) as db:
                self.assertEqual(db.execute('SELECT * FROM preserved').fetchall(), [('unchanged-id', 3, 'edited text / comment')])
        self.assertEqual((target / snapshot.MAPPING).read_bytes(), (self.data / snapshot.MAPPING).read_bytes())
        with self.assertRaisesRegex(ValueError, 'never overwritten'):
            snapshot.install(self.output, target, gallery, 'https://slate.example')
        self.assertEqual(len(self.connections[0].execute('SELECT * FROM preserved').fetchall()), 1)

    def test_tampered_snapshot_rejected_before_creating_targets(self):
        self.capture()
        (self.output / 'data' / snapshot.MAPPING).write_text('{}')
        target = self.root / 'new-data'
        with self.assertRaisesRegex(ValueError, 'Checksum mismatch'):
            snapshot.install(self.output, target, self.root / 'new-gallery', 'https://slate.example')
        self.assertFalse(target.exists())

    def test_omitted_source_and_changed_gallery_fail_closed(self):
        (self.data / 'unknown.sqlite').write_bytes(b'private data')
        with self.assertRaisesRegex(ValueError, 'Unexpected files'):
            self.capture()
        (self.data / 'unknown.sqlite').unlink()
        (self.gallery / 'manifest.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'Checksum mismatch'):
            self.capture()
        self.assertFalse(self.output.exists())

    def test_paths_and_repeated_capture_cannot_overwrite(self):
        self.capture()
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.capture()
        for name in ['../secret', '/absolute', 'data/../../secret', 'C:/secret', 'data\\secret', '.env', 'data//secret']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                snapshot.child(self.output, name)

    def test_private_archive_contains_only_verified_snapshot(self):
        self.capture()
        archive = self.root / 'private-snapshot.zip'
        snapshot.archive(self.output, archive)
        with zipfile.ZipFile(archive) as zipped:
            self.assertIsNone(zipped.testzip())
            self.assertEqual(set(zipped.namelist()), snapshot.regular_files(self.output))
        self.assertTrue(archive.with_suffix('.zip.sha256').exists())
        with self.assertRaisesRegex(ValueError, 'new archive'):
            snapshot.archive(self.output, archive)

    def approval_database(self):
        db = sqlite3.connect(self.data / 'review-approvals.sqlite')
        self.addCleanup(db.close)
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('PRAGMA wal_autocheckpoint=0')
        db.execute('CREATE TABLE approvals(design_id TEXT, revision INTEGER, approved INTEGER, fingerprint TEXT)')
        db.executemany('INSERT INTO approvals VALUES(?,?,?,?)', [('D1', 1, 1, 'original-content'), ('D1', 2, 0, 'changed-content')])
        db.commit()
        return db

    def test_approval_history_and_wal_survive_capture_verify_and_new_install(self):
        db = self.approval_database()
        self.assertTrue((self.data / 'review-approvals.sqlite-wal').stat().st_size > 0)
        result = self.capture()
        self.assertIn('review-approvals.sqlite', result['databases'])
        receipt = snapshot.verify(self.output)
        self.assertEqual(len(receipt['databases']), 5)
        self.assertFalse(any(row['file'].endswith(('-wal', '-shm')) for row in receipt['files']))
        target, gallery = self.root / 'new-data', self.root / 'new-gallery'
        snapshot.install(self.output, target, gallery, 'https://slate.example')
        with closing(sqlite3.connect(target / 'review-approvals.sqlite')) as copied:
            self.assertEqual(copied.execute('SELECT * FROM approvals ORDER BY revision').fetchall(), db.execute('SELECT * FROM approvals ORDER BY revision').fetchall())
        self.assertEqual(db.execute('SELECT COUNT(*) FROM approvals').fetchone()[0], 2)

    def test_original_four_database_receipts_without_new_inventory_remain_readable(self):
        self.capture()
        receipt_file = self.output / snapshot.RECEIPT
        receipt = json.loads(receipt_file.read_text(encoding='utf-8'))
        self.assertEqual(receipt.pop('databases'), list(snapshot.DATABASES))
        receipt_file.write_text(json.dumps(receipt), encoding='utf-8')
        self.assertEqual(snapshot.verify(self.output)['schema'], snapshot.SCHEMA)
        self.assertFalse((self.output / 'data' / 'review-approvals.sqlite').exists())

    def test_approval_database_created_during_gallery_copy_is_included(self):
        copy = snapshot.copy_private
        created = False

        def copying(source, target):
            nonlocal created
            if not created:
                self.approval_database()
                created = True
            return copy(source, target)

        with patch.object(snapshot, 'copy_private', copying):
            self.capture()
        self.assertIn('review-approvals.sqlite', snapshot.verify(self.output)['databases'])

    def test_orphan_approval_journal_is_never_silently_omitted(self):
        (self.data / 'review-approvals.sqlite-wal').write_bytes(b'approval journal')
        with self.assertRaisesRegex(ValueError, 'journal exists without'):
            self.capture()
        self.assertFalse(self.output.exists())

    def test_declared_approval_database_cannot_be_omitted_from_snapshot(self):
        self.capture()
        receipt_file = self.output / snapshot.RECEIPT
        receipt = json.loads(receipt_file.read_text(encoding='utf-8'))
        receipt['databases'].append('review-approvals.sqlite')
        receipt_file.write_text(json.dumps(receipt), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'database inventory'):
            snapshot.verify(self.output)


if __name__ == '__main__':
    unittest.main()
