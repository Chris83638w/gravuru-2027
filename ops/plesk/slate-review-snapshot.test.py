import importlib.util
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
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


if __name__ == '__main__':
    unittest.main()
