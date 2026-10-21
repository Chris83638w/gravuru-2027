"""Bounded, logical read-only inventory of three explicitly named merchant DBs.

Not a backup or a cross-database-consistent observation. No application imports.
SQLite mode=ro may use the existing WAL shared-memory index; never use immutable=1
against a live database, because that would ignore uncheckpointed WAL contents.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import time

DATABASES = ("workshop.sqlite", "profiles.sqlite", "design-assets.sqlite")
COUNTS = ("products", "product_revisions", "profiles", "profile_revisions", "manufacturing_profiles", "manufacturing_profile_revisions", "design_sources", "design_assets", "form_contours", "material_surfaces", "workshop_fonts", "photo_example_sources", "form_customer_drafts", "form_customer_revisions", "form_customer_photos", "acrylic_customer_drafts", "acrylic_customer_revisions", "form_review_snapshots")


def inventory(directory):
    root = Path(directory)
    if not root.is_absolute() or root != root.resolve() or not root.is_dir() or any((p / ".git").exists() for p in (root, *root.parents)):
        raise ValueError()
    if os.name == "posix" and root.stat().st_mode & 0o077:
        raise ValueError()
    reports = []
    for name in DATABASES:
        file = root / name
        if file.is_symlink() or not file.is_file() or file.stat().st_nlink != 1:
            raise ValueError()
        if os.name == "posix" and file.stat().st_mode & 0o077:
            raise ValueError()
        # Do not cause creation of a missing WAL index for an actively writing DB.
        if Path(str(file) + "-wal").exists() and not Path(str(file) + "-shm").exists():
            raise ValueError()
        started = time.monotonic()
        db = sqlite3.connect(file.as_uri() + "?mode=ro", uri=True, timeout=1)
        try:
            db.execute("PRAGMA query_only=ON")
            db.execute("PRAGMA trusted_schema=OFF")
            db.set_progress_handler(lambda: int(time.monotonic() - started > 10), 1000)
            db.execute("BEGIN")
            schema = db.execute("SELECT type,name,sql FROM sqlite_master ORDER BY type,name").fetchall()
            available = {r[1] for r in schema if r[0] == "table"}
            counts = {table: db.execute('SELECT count(*) FROM "' + table + '"').fetchone()[0] for table in COUNTS if table in available}
            # Merely count failures; no row values/foreign-key values/customer data.
            foreign_key_failures = sum(1 for _ in db.execute("PRAGMA foreign_key_check"))
            reports.append({"file": name, "bytes": file.stat().st_size, "userVersion": db.execute("PRAGMA user_version").fetchone()[0], "tableCount": len(available), "schemaSha256": hashlib.sha256(json.dumps(schema, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest(), "knownTableCounts": counts, "foreignKeyFailureCount": foreign_key_failures, "perDatabaseReadTransaction": True})
            db.rollback()
        finally:
            db.close()
    return {"schema": "gravuru-private-sqlite-inventory/v1", "logicalReadOnly": True, "crossDatabaseConsistent": False, "backupCreated": False, "runtimeStarted": False, "walSharedMemoryMayBeUsed": True, "databases": reports}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(inventory(args.data_dir)))
    except (ValueError, OSError, sqlite3.Error):
        print(json.dumps({"schema": "gravuru-private-sqlite-inventory/v1", "error": "private_sqlite_inventory_refused_or_unavailable", "backupCreated": False}))
        raise SystemExit(2)
