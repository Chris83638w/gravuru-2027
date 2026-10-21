"""Restore an OFFLINE snapshot into a NEW private folder and check it without starting the app.

No network, runtime imports, live database backup, migrations, credentials, or service actions.
Input must be a completed snapshot from snapshot-merchant-data.py, not the runtime data folder.
Only the three receipt-bound databases are copied. Data is never printed.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import stat

DATABASES = ("workshop.sqlite", "profiles.sqlite", "design-assets.sqlite")
SHA = re.compile(r"^[a-f0-9]{64}$")


class Refused(Exception):
    pass


def require(condition, code):
    if not condition:
        raise Refused(code)


def digest_bytes(value):
    return hashlib.sha256(value).hexdigest()


def digest_file(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def private_path(path, exists=True):
    path = Path(path)
    require(path.is_absolute() and path == path.resolve(), "canonical_private_path_required")
    require(not path.is_symlink(), "symlink_refused")
    for parent in (path, *path.parents):
        require(not (parent / ".git").exists(), "private_data_inside_git_refused")
    if exists:
        require(path.exists(), "private_path_missing")
        if os.name == "posix":
            require(not path.stat().st_mode & 0o077, "private_permissions_required")
    return path


def regular_file(path):
    private_path(path)
    require(stat.S_ISREG(path.lstat().st_mode), "regular_file_required")
    require(path.stat().st_nlink == 1, "hardlink_refused")


def read_json(path):
    regular_file(path)
    require(path.stat().st_size <= 1024 * 1024, "receipt_too_large")
    return json.loads(path.read_text(encoding="utf-8"))


def connect_copy(path):
    # immutable is safe ONLY after standalone receipt/hash validation and private copy.
    db = sqlite3.connect(path.as_uri() + "?mode=ro&immutable=1", uri=True)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA query_only=ON")
    db.execute("PRAGMA trusted_schema=OFF")
    return db


def tables(db):
    return {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}


def rows(db, name, columns=None):
    # Names here are constants in this program, never taken from rows or CLI.
    if name not in tables(db):
        return []
    available = {r[1] for r in db.execute('PRAGMA table_info("' + name + '")')}
    selected = "*" if columns is None else ",".join('rowid AS "_rowid"' if c == "_rowid" else '"' + c + '"' for c in columns if c != "tenant_id" or c in available)
    if columns is not None:
        require(set(columns) - {"tenant_id", "_rowid"} <= available, "required_columns_missing")
    return db.execute('SELECT ' + selected + ' FROM "' + name + '"')


def blob_hash(db, table, column, row_id):
    result = hashlib.sha256()
    with db.blobopen(table, column, row_id, readonly=True) as blob:
        for chunk in iter(lambda: blob.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def product_revision(db, key):
    owner, identifier, revision = key
    has_tenant = any(r[1] == "tenant_id" for r in db.execute("PRAGMA table_info(product_revisions)"))
    suffix = " AND tenant_id=?" if has_tenant else ""
    return db.execute("SELECT * FROM product_revisions WHERE product_id=? AND revision=?" + suffix, (identifier, revision, owner) if has_tenant else (identifier, revision)).fetchone()


def tenant(row):
    return row["tenant_id"] if "tenant_id" in row.keys() else "gravuru"


def keyed(rows_, column="id"):
    return {(tenant(r), r[column]): r for r in rows_}


def revisions(db, name, column, columns=None):
    return {(tenant(r), r[column], r["revision"]): r for r in rows(db, name, columns)}


def document(row, field="document"):
    result = json.loads(row[field])
    require(isinstance(result, dict), "invalid_document")
    return result


def designs(doc):
    if doc.get("schema") == "gravuru-product/v1":
        return doc.get("config", {}).get("profile", {}).get("designs", [])
    return doc.get("designs", [])


def namespace_hash(owner, raw):
    return raw if owner == "gravuru" else digest_bytes((owner + ":" + raw).encode())


def verify_relations(workshop, profiles, assets):
    """Explicit checks for known current-source tables. Not an application/schema migration."""
    issues = Counter()
    counts = Counter()
    def check(ok, code):
        if not ok:
            issues[code] += 1

    for db, required in ((workshop, {"products", "product_revisions"}),
                         (profiles, {"profiles", "profile_revisions"}),
                         (assets, {"design_sources", "design_assets", "form_contours"})):
        require(required <= tables(db), "required_current_schema_tables_missing")
    product_rows = keyed(rows(workshop, "products"))
    product_revs = revisions(workshop, "product_revisions", "product_id", ("product_id", "revision", "tenant_id"))
    profile_rows = keyed(rows(profiles, "profiles"))
    profile_revs = revisions(profiles, "profile_revisions", "profile_id")
    mfg_rows = keyed(rows(profiles, "manufacturing_profiles"))
    mfg_revs = revisions(profiles, "manufacturing_profile_revisions", "profile_id")
    asset_rows = keyed(rows(assets, "design_assets", ("id", "source_sha256", "metadata", "tenant_id", "_rowid")))
    contour_rows = keyed(rows(assets, "form_contours", ("id", "metadata", "tenant_id", "_rowid")))
    surface_rows = keyed(rows(assets, "material_surfaces", ("sha256", "tenant_id", "_rowid")), "sha256")
    source_hashes = set()
    for r in rows(assets, "design_sources", ("sha256", "_rowid")):
        source_hashes.add(r["sha256"])
        check(blob_hash(assets, "design_sources", "bytes", r["_rowid"]) == r["sha256"], "design_original_hash")
        counts["designOriginals"] += 1
    for (owner, identifier), r in asset_rows.items():
        meta = document(r, "metadata")
        check(r["source_sha256"] in source_hashes, "asset_original_missing")
        check(meta.get("assetId") == identifier and meta.get("sourceSha256") == r["source_sha256"], "asset_metadata_binding")
        check(blob_hash(assets, "design_assets", "preview", r["_rowid"]) == meta.get("previewSha256"), "asset_preview_hash")
    for (owner, identifier), r in contour_rows.items():
        meta = document(r, "metadata")
        check(meta.get("id") == identifier and blob_hash(assets, "form_contours", "original", r["_rowid"]) == meta.get("sourceSha256"), "contour_original_binding")
        check(isinstance(meta.get("geometry"), dict) and bool(SHA.fullmatch(meta.get("geometrySha256", ""))), "contour_geometry_metadata")
    for (owner, identifier), r in surface_rows.items():
        check(namespace_hash(owner, blob_hash(assets, "material_surfaces", "original", r["_rowid"])) == identifier, "material_original_hash")
    for r in rows(assets, "workshop_fonts", ("sha256", "tenant_id", "_rowid")):
        check(namespace_hash(tenant(r), blob_hash(assets, "workshop_fonts", "original", r["_rowid"])) == r["sha256"], "font_original_hash")
    for r in rows(assets, "photo_example_sources"):
        check((tenant(r), r["asset_id"]) in asset_rows and r["source_sha256"] in source_hashes, "photo_example_binding")

    for heads, revs, code in ((product_rows, product_revs, "product"), (profile_rows, profile_revs, "profile"), (mfg_rows, mfg_revs, "manufacturing_profile")):
        for (owner, identifier), r in heads.items():
            check((owner, identifier, r["revision"]) in revs, code + "_head_revision_missing")
            if "published_revision" in r.keys() and r["published_revision"] is not None:
                check((owner, identifier, r["published_revision"]) in revs, code + "_published_revision_missing")
            if "master_id" in r.keys() and r["master_id"] is not None:
                master = product_rows.get((owner, r["master_id"]))
                check(master is not None and master["kind"] == "master", "product_master_missing")
    for r in mfg_revs.values():
        check(digest_bytes(r["document"].encode()) == r["sha256"], "manufacturing_document_hash")

    def asset_reference(owner, value):
        if isinstance(value, dict):
            for field, item in value.items():
                if field in ("assetId", "photoMaskAssetId") and item:
                    found = asset_rows.get((owner, item))
                    check(found is not None, "product_asset_missing")
                    if found is not None and value.get("sourceSha256"):
                        check(found["source_sha256"] == value["sourceSha256"], "product_asset_source_mismatch")
                else:
                    asset_reference(owner, item)
        elif isinstance(value, list):
            for item in value:
                asset_reference(owner, item)

    for r in rows(workshop, "product_revisions"):
        owner, product_id, revision = tenant(r), r["product_id"], r["revision"]
        check((owner, product_id) in product_rows, "revision_product_missing")
        doc = document(r)
        design_list = designs(doc)
        require(isinstance(design_list, list), "design_list_required")
        design_ids = [d.get("id") for d in design_list]
        check(all(isinstance(v, str) and v for v in design_ids) and len(set(design_ids)) == len(design_ids), "design_ids_invalid")
        counts["historicalDesignAssignments"] += len(design_list)
        head = product_rows.get((owner, product_id))
        if head and revision == head["revision"]:
            counts["currentDesignAssignments"] += len(design_list)
            counts["currentArchivedProducts"] += int(bool(head["archived"]))
        asset_reference(owner, doc)
        form = doc.get("form")
        if form:
            source = contour_rows.get((owner, form.get("contourId")))
            check(source is not None, "product_contour_missing")
            if source is not None:
                meta = document(source, "metadata")
                check(all(form.get(k) == meta.get(k) for k in ("sourceSha256", "geometrySha256", "geometry")), "product_geometry_source_mismatch")
        for field in ("materialSurface", "sceneBackground"):
            value = doc.get("config", {}).get(field)
            if isinstance(value, str) and value.startswith("/api/workshop/material-surfaces/"):
                identifier = value.rsplit("/", 1)[-1].removesuffix(".png")
                check((owner, identifier) in surface_rows, "product_material_original_missing")
        for selection in doc.get("profileAssignments", {}).values():
            if selection.get("mode") == "override":
                check((owner, selection.get("profileId")) in profile_rows, "product_profile_missing")
        production = doc.get("productionProfile")
        if production:
            check((owner, production.get("id"), production.get("revision")) in mfg_revs, "product_manufacturing_revision_missing")
        if "metadata" in r.keys():
            metadata = document(r, "metadata")
            for ref in metadata.get("profiles", {}).get("sources", {}).values():
                if ref.get("profileId"):
                    check((owner, ref["profileId"], ref.get("profileRevision")) in profile_revs, "snapshot_profile_revision_missing")

    def product_design(owner, product_id, revision, design_id):
        r = product_revision(workshop, (owner, product_id, revision))
        check(r is not None, "customer_product_revision_missing")
        if r:
            check(any(d.get("id") == design_id for d in designs(document(r))), "customer_design_missing")

    snapshots = keyed(rows(workshop, "form_review_snapshots", ("id", "draft_id", "draft_revision", "manifest", "tenant_id", "_rowid")))
    for family in ("form", "acrylic"):
        draft_rows = keyed(rows(workshop, family + "_customer_drafts"))
        draft_revs = revisions(workshop, family + "_customer_revisions", "draft_id")
        for (owner, identifier), r in draft_rows.items():
            product_design(owner, r["product_id"], r["product_revision"], r["design_id"])
            prior = draft_revs.get((owner, identifier, r["revision"]))
            check(prior is not None, "customer_head_revision_missing")
            if prior is not None:
                field = "snapshot_id" if family == "acrylic" else "state"
                check(prior[field] == r[field], "customer_head_content_mismatch")
        for (owner, identifier, revision), r in draft_revs.items():
            draft = draft_rows.get((owner, identifier))
            check(draft is not None, "customer_revision_draft_missing")
            if family == "acrylic":
                snap = snapshots.get((owner, r["snapshot_id"]))
                check(snap is not None, "customer_review_missing")
                if snap is not None and draft is not None:
                    m = document(snap, "manifest")
                    check(m.get("product", {}).get("id") == draft["product_id"] and m.get("product", {}).get("revision") == draft["product_revision"] and m.get("source", {}).get("designId") == draft["design_id"], "customer_review_product_mismatch")
                    # Native archive source identifies a preparation request, not
                    # the private adraft_ owner/revision. Ownership is established
                    # by acrylic_customer_revisions.snapshot_id and the fixed
                    # product/design identity above; never equate the two IDs.
    for r in rows(workshop, "form_customer_photos", ("source_sha256", "_rowid")):
        check(blob_hash(workshop, "form_customer_photos", "original", r["_rowid"]) == r["source_sha256"], "customer_original_hash")
    for (owner, identifier), r in snapshots.items():
        m = document(r, "manifest")
        product = m.get("product", {})
        product_design(owner, product.get("id"), product.get("revision"), m.get("source", {}).get("designId"))
        check(m.get("id") == identifier and m.get("source", {}).get("draftId") == r["draft_id"] and m.get("source", {}).get("draftRevision") == r["draft_revision"], "review_source_mismatch")
        check(blob_hash(workshop, "form_review_snapshots", "package", r["_rowid"]) == m.get("packageSha256"), "review_package_hash")
    counts.update({"products": len(product_rows), "productRevisions": len(product_revs), "profiles": len(profile_rows), "profileRevisions": len(profile_revs), "designAssets": len(asset_rows), "formContours": len(contour_rows), "materialOriginals": len(surface_rows), "reviewSnapshots": len(snapshots)})
    return {"counts": dict(counts), "issues": dict(issues), "valid": not issues}


def restore(snapshot, destination):
    os.umask(0o077)
    source = private_path(snapshot)
    target = private_path(destination, exists=False)
    private_path(target.parent)
    require(source.is_dir() and not target.exists(), "new_private_restore_directory_required")
    require(source not in target.parents and target not in source.parents, "separate_restore_tree_required")
    require({p.name for p in source.iterdir()} == {"SNAPSHOT.json", *DATABASES}, "standalone_snapshot_only_no_wal_or_extra_files")
    receipt = read_json(source / "SNAPSHOT.json")
    require(receipt.get("schema") == "gravuru-merchant-private-snapshot/v1" and receipt.get("runtimeLockHeld") is True, "offline_snapshot_receipt_required")
    entries = receipt.get("databases")
    require(isinstance(entries, list) and len(entries) == 3 and {r.get("file") for r in entries} == set(DATABASES), "exact_three_database_receipts_required")
    entries = {r["file"]: r for r in entries}
    for name in DATABASES:
        regular_file(source / name)
        entry = entries[name]
        require(isinstance(entry.get("sha256"), str) and bool(SHA.fullmatch(entry["sha256"])) and entry.get("quickCheck") == "ok", "invalid_database_receipt")
        require((source / name).stat().st_size == entry.get("bytes") and digest_file(source / name) == entry["sha256"], "snapshot_receipt_hash_mismatch")
    target.mkdir(mode=0o700)
    checks = []
    databases = []
    try:
        for name in DATABASES:
            # Copy completed receipt-bound backups, NEVER runtime database files.
            with (source / name).open("rb") as original, (target / name).open("xb") as copied:
                shutil.copyfileobj(original, copied, 1024 * 1024)
            os.chmod(target / name, 0o600)
            require(digest_file(target / name) == entries[name]["sha256"], "restored_file_hash_mismatch")
            db = connect_copy(target / name)
            databases.append(db)
            require([tuple(r) for r in db.execute("PRAGMA integrity_check")] == [("ok",)], "sqlite_integrity_failed")
            require(not db.execute("PRAGMA foreign_key_check").fetchone(), "sqlite_foreign_key_failed")
            checks.append({"file": name, "bytes": entries[name]["bytes"], "sha256": entries[name]["sha256"], "integrityCheck": "ok", "foreignKeys": "ok"})
        relations = verify_relations(*databases)
    finally:
        for db in databases:
            db.close()
    # Read-only openings must not alter the backups or create journals/sidecars.
    require({p.name for p in target.iterdir()} == set(DATABASES), "unexpected_restore_sidecar")
    for name in DATABASES:
        require(digest_file(source / name) == entries[name]["sha256"] and digest_file(target / name) == entries[name]["sha256"], "database_changed_during_validation")
    report = {"schema": "gravuru-private-restore-check/v1", "databaseRestorePassed": relations["valid"], "sourceFilesUnchanged": True,
              "allDatabaseBytesPreserved": True, "runtimeStarted": False, "migrationsRun": False, "externalNetwork": False,
              "completeApplicationRestoreProven": False, "lockEvidence": "upstream-receipt-declaration-only", "databases": checks,
              "relations": relations, "notChecked": ["actual-source-lock-and-writer-quiescence", "installed-release-and-resource-files", "credentials-and-storage-marker", "all-legacy-schema-and-cart-order-semantic-rules", "zip-entry-and-image-decoding", "native-mm-geometry-recalculation-and-physical-mounting", "application-start-and-customer-flow"]}
    with (target / "RESTORE-CHECK.json").open("x", encoding="utf-8") as stream:
        json.dump(report, stream, indent=2)
        stream.write("\n")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--private-paths-confirmed", action="store_true", help="Operator confirmed private ACLs and a standalone, finished offline snapshot.")
    args = parser.parse_args()
    try:
        require(args.private_paths_confirmed, "private_paths_confirmation_required")
        result = restore(args.snapshot, args.destination)
        print(json.dumps(result))
        raise SystemExit(0 if result["databaseRestorePassed"] else 2)
    except (Refused, OSError, sqlite3.Error, ValueError, TypeError, KeyError, AttributeError) as error:
        # Never print database strings, IDs, file names from data, or SQL errors.
        code = str(error) if isinstance(error, Refused) else "restore_check_failed"
        print(json.dumps({"schema": "gravuru-private-restore-check/v1", "databaseRestorePassed": False, "error": code, "runtimeStarted": False}))
        raise SystemExit(2)
