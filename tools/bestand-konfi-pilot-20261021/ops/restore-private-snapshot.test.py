"""Synthetic-only backup/restore/inventory tests; no app, real DBs or network."""
import hashlib
from contextlib import contextmanager, closing
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


validator = module("restore_check", "restore-private-snapshot.py")
inventory = module("sqlite_inventory", "inventory-private-sqlite.py")
encode = lambda value: json.dumps(value, separators=(",", ":"), ensure_ascii=False)
sha = lambda value: hashlib.sha256(value).hexdigest()


@contextmanager
def connection(*args, **kwargs):
    db = sqlite3.connect(*args, **kwargs)
    try:
        with db:
            yield db
    finally:
        db.close()


def make_sources(root):
    root.mkdir(mode=0o700)
    original, preview = b"synthetic-svg-source-only", b"synthetic-preview-only"
    source_hash, preview_hash, asset_id = sha(original), sha(preview), "a" * 64
    contour_id, contour_original = "b" * 64, b"synthetic-contour-source-only"
    geometry = {"widthMm": 220, "heightMm": 140, "holeCount": 2, "contours": [{"role": "outer", "d": "M0 0 L220 0 L220 140 L0 140 Z"}]}
    form = {"contourId": contour_id, "sourceSha256": sha(contour_original), "geometrySha256": sha(encode(geometry).encode()), "geometry": geometry}
    native = {"schema": "gravuru-product/v1", "name": "Synthetic only", "config": {"profile": {"designs": [{"id": "rejected-design", "status": "rejected", "objects": [{"type": "text", "text": "SYNTHETIC SECRET MUST NOT PRINT", "xMm": 18, "yMm": 23}]}]}, "doorbell": {"xMm": 80, "yMm": 130}, "acrylic": {"xMm": 4, "yMm": 5}}, "profileAssignments": {"fonts": {"mode": "override", "profileId": "font-profile"}}, "productionProfile": {"id": "mfg-example", "revision": 1}}
    form_document = {"schema": "gravuru-form-product/v1", "name": "Synthetic form", "form": form, "designs": [{"id": "form-design", "assetId": asset_id, "sourceSha256": source_hash}]}
    with connection(root / "workshop.sqlite") as db:
        db.executescript("""CREATE TABLE products(id TEXT PRIMARY KEY,revision INTEGER,published_revision INTEGER,archived INTEGER,kind TEXT,master_id TEXT,tenant_id TEXT);
        CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,document TEXT,metadata TEXT,status TEXT,tenant_id TEXT,PRIMARY KEY(product_id,revision));
        CREATE TABLE acrylic_customer_drafts(id TEXT PRIMARY KEY,product_id TEXT,product_revision INTEGER,design_id TEXT,revision INTEGER,snapshot_id TEXT,tenant_id TEXT);
        CREATE TABLE acrylic_customer_revisions(draft_id TEXT,revision INTEGER,snapshot_id TEXT,tenant_id TEXT);
        CREATE TABLE form_review_snapshots(id TEXT PRIMARY KEY,draft_id TEXT,draft_revision INTEGER,manifest TEXT,package BLOB,tenant_id TEXT);
        CREATE TABLE form_customer_photos(id TEXT PRIMARY KEY,source_sha256 TEXT,original BLOB,tenant_id TEXT);""")
        db.executemany("INSERT INTO products VALUES(?,?,?,?,?,?,?)", [("native", 2, 1, 1, "product", None, "gravuru"), ("form", 1, None, 0, "product", None, "gravuru")])
        meta = {"profiles": {"sources": {"fonts": {"profileId": "font-profile", "profileRevision": 1}}}}
        db.executemany("INSERT INTO product_revisions VALUES(?,?,?,?,?,?)", [("native", 1, encode(native), encode(meta), "draft", "gravuru"), ("native", 2, encode(native), encode(meta), "archived", "gravuru"), ("form", 1, encode(form_document), "{}", "draft", "gravuru")])
        package = b"synthetic-private-review-package"
        manifest = {"id": "proof-test", "product": {"id": "native", "revision": 2}, "source": {"draftId": "draft-test", "draftRevision": 1, "designId": "rejected-design"}, "packageSha256": sha(package)}
        db.execute("INSERT INTO acrylic_customer_drafts VALUES(?,?,?,?,?,?,?)", ("draft-test", "native", 2, "rejected-design", 1, "proof-test", "gravuru"))
        db.execute("INSERT INTO acrylic_customer_revisions VALUES(?,?,?,?)", ("draft-test", 1, "proof-test", "gravuru"))
        db.execute("INSERT INTO form_review_snapshots VALUES(?,?,?,?,?,?)", ("proof-test", "draft-test", 1, encode(manifest), package, "gravuru"))
        db.execute("INSERT INTO form_customer_photos VALUES(?,?,?,?)", ("photo-test", sha(b"synthetic-photo"), b"synthetic-photo", "gravuru"))
    with connection(root / "profiles.sqlite") as db:
        db.executescript("""CREATE TABLE profiles(id TEXT PRIMARY KEY,revision INTEGER,tenant_id TEXT);
        CREATE TABLE profile_revisions(profile_id TEXT,revision INTEGER,document TEXT,tenant_id TEXT);
        CREATE TABLE manufacturing_profiles(id TEXT PRIMARY KEY,revision INTEGER,tenant_id TEXT);
        CREATE TABLE manufacturing_profile_revisions(profile_id TEXT,revision INTEGER,document TEXT,sha256 TEXT,tenant_id TEXT);""")
        db.execute("INSERT INTO profiles VALUES(?,?,?)", ("font-profile", 1, "gravuru"))
        db.execute("INSERT INTO profile_revisions VALUES(?,?,?,?)", ("font-profile", 1, '{"items":[]}', "gravuru"))
        db.execute("INSERT INTO manufacturing_profiles VALUES(?,?,?)", ("mfg-example", 1, "gravuru"))
        db.execute("INSERT INTO manufacturing_profile_revisions VALUES(?,?,?,?,?)", ("mfg-example", 1, '{"method":"engraving"}', sha(b'{"method":"engraving"}'), "gravuru"))
    with connection(root / "design-assets.sqlite") as db:
        db.executescript("""CREATE TABLE design_sources(sha256 TEXT PRIMARY KEY,bytes BLOB);
        CREATE TABLE design_assets(id TEXT PRIMARY KEY,source_sha256 TEXT,preview BLOB,metadata TEXT,tenant_id TEXT);
        CREATE TABLE form_contours(id TEXT PRIMARY KEY,original BLOB,metadata TEXT,tenant_id TEXT);
        CREATE TABLE material_surfaces(sha256 TEXT PRIMARY KEY,original BLOB,preview BLOB,tenant_id TEXT);""")
        db.execute("INSERT INTO design_sources VALUES(?,?)", (source_hash, original))
        db.execute("INSERT INTO design_assets VALUES(?,?,?,?,?)", (asset_id, source_hash, preview, encode({"assetId": asset_id, "sourceSha256": source_hash, "previewSha256": preview_hash}), "gravuru"))
        db.execute("INSERT INTO form_contours VALUES(?,?,?,?)", (contour_id, contour_original, encode({"id": contour_id, **{k: v for k, v in form.items() if k != "contourId"}}), "gravuru"))
        db.execute("INSERT INTO material_surfaces VALUES(?,?,?,?)", (sha(b"synthetic-steel"), b"synthetic-steel", b"preview", "gravuru"))
    for path in root.iterdir():
        path.chmod(0o600)


def snapshot_sources(source, target):
    """Exercise real sqlite3.Connection.backup. No claim to test Linux flock on Windows."""
    target.mkdir(mode=0o700)
    receipt = {"schema": "gravuru-merchant-private-snapshot/v1", "runtimeLockHeld": True, "privateDataChanged": False, "databases": []}
    for name in validator.DATABASES:
        with connection((source / name).as_uri() + "?mode=ro", uri=True) as original, connection(target / name) as copy:
            original.backup(copy)
            assert copy.execute("PRAGMA quick_check").fetchall() == [("ok",)]
        (target / name).chmod(0o600)
        receipt["databases"].append({"file": name, "bytes": (target / name).stat().st_size, "sha256": validator.digest_file(target / name), "quickCheck": "ok"})
    path = target / "SNAPSHOT.json"
    path.write_text(encode(receipt), encoding="utf-8")
    path.chmod(0o600)


class RestoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="gravuru-private-restore-synthetic-")
        self.root = Path(self.temp.name).resolve()
        self.root.chmod(0o700)
        self.source, self.snapshot, self.destination = (self.root / name for name in ("source", "snapshot", "restored"))
        make_sources(self.source)

    def tearDown(self):
        self.assertEqual(self.root.parent, Path(tempfile.gettempdir()).resolve())
        self.assertTrue(self.root.name.startswith("gravuru-private-restore-synthetic-"))
        self.temp.cleanup()

    def run_restore(self):
        snapshot_sources(self.source, self.snapshot)
        return validator.restore(self.snapshot, self.destination)

    def test_roundtrip_retains_rejected_design_geometry_and_all_bytes(self):
        before = {p.name: validator.digest_file(p) for p in self.source.iterdir()}
        result = self.run_restore()
        self.assertTrue(result["databaseRestorePassed"])
        self.assertFalse(result["completeApplicationRestoreProven"])
        self.assertFalse(result["runtimeStarted"])
        self.assertEqual(result["relations"]["counts"]["currentDesignAssignments"], 2)
        self.assertEqual(result["relations"]["counts"]["historicalDesignAssignments"], 3)
        self.assertEqual(result["relations"]["counts"]["currentArchivedProducts"], 1)
        self.assertEqual(before, {p.name: validator.digest_file(p) for p in self.source.iterdir()})
        with closing(validator.connect_copy(self.destination / "workshop.sqlite")) as db:
            d = json.loads(db.execute("SELECT document FROM product_revisions WHERE product_id='native' AND revision=2").fetchone()[0])
            self.assertEqual(d["config"]["profile"]["designs"][0]["status"], "rejected")
            self.assertEqual(d["config"]["doorbell"], {"xMm": 80, "yMm": 130})
            self.assertEqual(d["config"]["acrylic"], {"xMm": 4, "yMm": 5})
        self.assertNotIn("SYNTHETIC SECRET", encode(result))

    def test_tampered_snapshot_refused_before_copy(self):
        snapshot_sources(self.source, self.snapshot)
        with (self.snapshot / "workshop.sqlite").open("ab") as f:
            f.write(b"tamper")
        with self.assertRaisesRegex(validator.Refused, "snapshot_receipt_hash_mismatch"):
            validator.restore(self.snapshot, self.destination)
        self.assertFalse(self.destination.exists())

    def test_wal_in_snapshot_refused(self):
        snapshot_sources(self.source, self.snapshot)
        (self.snapshot / "workshop.sqlite-wal").write_bytes(b"unexpected")
        with self.assertRaisesRegex(validator.Refused, "standalone_snapshot"):
            validator.restore(self.snapshot, self.destination)

    def test_existing_target_not_overwritten(self):
        snapshot_sources(self.source, self.snapshot)
        self.destination.mkdir()
        sentinel = self.destination / "do-not-change"
        sentinel.write_bytes(b"existing work")
        with self.assertRaisesRegex(validator.Refused, "new_private_restore"):
            validator.restore(self.snapshot, self.destination)
        self.assertEqual(sentinel.read_bytes(), b"existing work")

    def test_database_directory_without_receipt_refused(self):
        with self.assertRaisesRegex(validator.Refused, "standalone_snapshot"):
            validator.restore(self.source, self.destination)

    def test_git_directory_refused(self):
        snapshot_sources(self.source, self.snapshot)
        (self.root / ".git").mkdir()
        with self.assertRaisesRegex(validator.Refused, "inside_git"):
            validator.restore(self.snapshot, self.destination)

    def test_missing_profile_revision_detected(self):
        with connection(self.source / "profiles.sqlite") as db:
            db.execute("DELETE FROM profile_revisions")
        result = self.run_restore()
        self.assertFalse(result["databaseRestorePassed"])
        self.assertIn("snapshot_profile_revision_missing", result["relations"]["issues"])

    def test_geometry_source_mismatch_detected(self):
        with connection(self.source / "design-assets.sqlite") as db:
            row = db.execute("SELECT metadata FROM form_contours").fetchone()
            meta = json.loads(row[0]); meta["geometry"]["widthMm"] = 300
            db.execute("UPDATE form_contours SET metadata=?", (encode(meta),))
        result = self.run_restore()
        self.assertFalse(result["databaseRestorePassed"])
        self.assertIn("product_geometry_source_mismatch", result["relations"]["issues"])

    def test_corrupt_original_detected_despite_valid_sqlite_and_receipt(self):
        with connection(self.source / "design-assets.sqlite") as db:
            db.execute("UPDATE design_sources SET bytes=?", (b"wrong-source",))
        result = self.run_restore()
        self.assertFalse(result["databaseRestorePassed"])
        self.assertIn("design_original_hash", result["relations"]["issues"])

    def test_cross_tenant_source_binding_detected(self):
        with connection(self.source / "design-assets.sqlite") as db:
            db.execute("UPDATE design_assets SET tenant_id='other'")
        result = self.run_restore()
        self.assertFalse(result["databaseRestorePassed"])
        self.assertIn("product_asset_missing", result["relations"]["issues"])

    def test_customer_review_product_revision_mismatch_detected(self):
        with connection(self.source / "workshop.sqlite") as db:
            row = db.execute("SELECT manifest FROM form_review_snapshots").fetchone()
            value = json.loads(row[0]); value["product"]["revision"] = 1
            db.execute("UPDATE form_review_snapshots SET manifest=?", (encode(value),))
        result = self.run_restore()
        self.assertIn("customer_review_product_mismatch", result["relations"]["issues"])

    def test_native_archive_request_identity_is_separate_from_private_owner_revision(self):
        with connection(self.source / "workshop.sqlite") as db:
            row = db.execute("SELECT manifest FROM form_review_snapshots").fetchone()
            value = json.loads(row[0])
            value["source"]["draftId"] = "acrylic-separate-preparation-request"
            value["source"]["draftRevision"] = 1
            db.execute("UPDATE form_review_snapshots SET draft_id=?,manifest=?", (value["source"]["draftId"], encode(value)))
            db.execute("UPDATE acrylic_customer_drafts SET revision=2")
            db.execute("UPDATE acrylic_customer_revisions SET revision=2")
        result = self.run_restore()
        self.assertTrue(result["databaseRestorePassed"])

    def test_inventory_reports_counts_only_and_leaves_db_bytes(self):
        before = {p.name: validator.digest_file(p) for p in self.source.iterdir()}
        result = inventory.inventory(self.source)
        self.assertFalse(result["crossDatabaseConsistent"])
        self.assertEqual(result["databases"][0]["knownTableCounts"]["product_revisions"], 3)
        self.assertEqual(before, {p.name: validator.digest_file(p) for p in self.source.iterdir()})
        self.assertNotIn("SYNTHETIC SECRET", encode(result))
        self.assertNotIn("rejected-design", encode(result))

    def test_inventory_missing_wal_index_refused(self):
        (self.source / "workshop.sqlite-wal").write_bytes(b"unexpected")
        with self.assertRaises(ValueError):
            inventory.inventory(self.source)

    def test_cli_requires_private_path_confirmation(self):
        result = subprocess.run([sys.executable, "-I", str(Path(__file__).with_name("restore-private-snapshot.py")), "--snapshot", str(self.source), "--destination", str(self.destination)], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)["error"], "private_paths_confirmation_required")
        self.assertFalse(self.destination.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
