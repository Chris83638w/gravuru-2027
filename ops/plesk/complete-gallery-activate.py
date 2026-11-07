"""Activate ONLY the reviewed mapping of private Plesk site 19.

The operator stops the private application first and switches its Plesk code /
document roots afterwards. This helper never starts/stops services, edits Plesk,
changes config/code, replaces databases, or accesses Shopify.
"""
import argparse
from contextlib import closing, contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import sqlite3
import stat

ROOT = Path('/var/www/vhosts/gravuru-designwerkstatt.de')
STAGE = ROOT / 'private/complete-gallery-20261107-v1'
ACTIVE = ROOT / 'private/gesamtbestand-stage-0bb50565-20261106-v1'
DATA = ACTIVE / 'data'
EXPECTED_UID = 10005
ORIGIN = 'https://test-2027.gravuru-designwerkstatt.de'
SITE_ID = 19
MAPPING = 'local-review-import.json'
DATABASES = ('review-comments.sqlite', 'review-approvals.sqlite', 'profiles.sqlite')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(file):
    h = hashlib.sha256()
    with file.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def checked_path(file, *, directory=False, private=True):
    require(file.is_absolute() and file.resolve() == file, 'Canonical site path required')
    for item in (file, *file.parents):
        require(not item.is_symlink() and not (item / '.git').exists(), 'Linked or Git path rejected')
    info = file.stat()
    require(info.st_uid == EXPECTED_UID, 'Unexpected site ownership')
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode), 'Regular site file/directory required')
    require(not private or not info.st_mode & 0o077, 'Private permissions required')
    return file


def read_json(file, *, private=True):
    checked_path(file, private=private)
    return json.loads(file.read_text(encoding='utf-8'))


def write_new(file, value):
    raw = value if isinstance(value, bytes) else (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()
    fd = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())


def fsync_directory(directory):
    fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


@contextmanager
def runtime_lock():
    lock_path = checked_path(DATA / '.runtime.lock')
    fd = os.open(lock_path, os.O_RDWR | os.O_NOFOLLOW)
    with os.fdopen(fd, 'r+b') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        require(os.fstat(stream.fileno()).st_ino == lock_path.stat().st_ino, 'Runtime lock path changed')
        yield


def verify_config(file, *, gallery, expected_sha):
    config = read_json(file)
    require(digest(file) == expected_sha, 'Private configuration changed')
    require(config.get('schema') == 1 and config.get('purpose') == 'private-test-runtime', 'Wrong private configuration')
    values = config.get('values', {})
    require(values.get('GRAVURU_TEST_ORIGIN') == ORIGIN, 'Wrong private site origin')
    require(values.get('GRAVURU_PRIVATE_DATA_DIR') == str(DATA), 'Existing data location must remain unchanged')
    require(values.get('GRAVURU_SLATE_REVIEW_PACKAGE') == str(gallery), 'Wrong private gallery location')
    return config


def verify_stage(args):
    require(os.getuid() == EXPECTED_UID and SITE_ID == 19, 'Only the private site 19 account is allowed')
    require(re.fullmatch('[a-f0-9]{40}', args.commit or '') and re.fullmatch('[a-f0-9]{64}', args.mapping_sha256 or ''), 'Pinned commit and mapping digest required')
    for directory in (STAGE, ACTIVE, DATA):
        checked_path(directory, directory=True)
    proof_file = STAGE / 'STAGE-READY.json'
    proof = read_json(proof_file)
    require(proof.get('schema') == 'gravuru-complete-gallery-stage/v1' and proof.get('ready') is True and proof.get('activated') is False and proof.get('shopifyWrites') == 0, 'Ready unpublished stage required')
    require(proof.get('sourceCommit') == args.commit and proof.get('mappingSha256') == args.mapping_sha256, 'Pinned stage differs')
    require(proof.get('backupVerified') is True and proof.get('preservation', {}).get('passed') is True, 'Verified stage preservation required')
    require(proof.get('runtimeImportsAndBuildVerified') is True and proof.get('stagedMappingVerified') is True, 'Verified staged runtime and mapping required')
    require(not proof.get('activationReviewRequired') and proof.get('concurrentlyChangedExistingHeads') == [], 'Concurrent staging changes need a separate review')
    paths = {'code': ROOT / ('gravuru-2027-complete-' + args.commit[:8]), 'gallery': STAGE / 'gallery', 'config': STAGE / 'config.json', 'mapping': STAGE / 'staged-import.json'}
    for key, file in paths.items():
        require(proof.get(key) == str(file), 'Stage path differs: ' + key)
        checked_path(file, directory=key in ('code', 'gallery'), private=key != 'code')
    for field, file in [('mappingSha256', paths['mapping']), ('galleryManifestSha256', paths['gallery'] / 'manifest.json'), ('wrapperSha256', paths['code'] / 'app.cjs')]:
        require(re.fullmatch('[a-f0-9]{64}', proof.get(field, '')) and digest(file) == proof[field], 'Stage content differs: ' + field)
    current = verify_config(ACTIVE / 'config.json', gallery=ACTIVE / 'gallery-4', expected_sha=proof.get('activeConfigSha256'))
    staged = verify_config(paths['config'], gallery=paths['gallery'], expected_sha=proof.get('configSha256'))
    left = dict(current['values']); right = dict(staged['values'])
    left.pop('GRAVURU_SLATE_REVIEW_PACKAGE'); right.pop('GRAVURU_SLATE_REVIEW_PACKAGE')
    require(left == right, 'Credentials, Python or existing data configuration changed')
    require(read_json(DATA / '.gravuru-private-test.json') == {'schema': 1, 'purpose': 'private-test-data', 'origin': ORIGIN}, 'Wrong active data marker')
    require(read_json(paths['gallery'] / '.gravuru-slate-review.json') == {'schema': 1, 'purpose': 'slate-review-gallery', 'origin': ORIGIN}, 'Wrong staged gallery marker')
    manifest = read_json(paths['code'] / 'PACKAGE-MANIFEST.json', private=False)
    require(manifest.get('sourceCommit') == args.commit and manifest.get('scope') == 'private-operator-test' and manifest.get('shopifyConnected') is False, 'Wrong private code release')
    seen = set()
    for row in manifest['files']:
        name = row['path']; parts = PurePosixPath(name)
        require(name not in seen and not parts.is_absolute() and '\\' not in name and ':' not in name and all(p not in ('', '.', '..') for p in name.split('/')), 'Unsafe code inventory')
        seen.add(name)
        file = checked_path(paths['code'].joinpath(*parts.parts), private=False)
        if name != 'app.cjs':
            require(file.stat().st_size == row['bytes'] and digest(file) == row['sha256'], 'Staged code changed: ' + name)
    expected_wrapper = 'process.env.GRAVURU_TEST_CONFIG_FILE=' + json.dumps(str(paths['config'])) + ";\nrequire('./ops/plesk/app.cjs');\n"
    require((paths['code'] / 'app.cjs').read_text() == expected_wrapper, 'Unexpected private entry wrapper')
    return proof, paths


def mapping_rows(mapping):
    require(mapping.get('localOnly') is True and mapping.get('published') is False and mapping.get('shopifyWrites') == 0 and isinstance(mapping.get('products'), list), 'Unpublished native mapping required')
    rows = {}; ids = set()
    for row in mapping['products']:
        require(isinstance(row.get('key'), str) and row['key'] not in rows and re.fullmatch(r'cfg_[A-Za-z0-9_-]+', row.get('productId', '')) and row['productId'] not in ids, 'Duplicate or invalid native mapping identity')
        require(row.get('reviewOnly') is True and isinstance(row.get('designIds'), list) and len(row['designIds']) == len(set(row['designIds'])) and all(isinstance(i, str) and i for i in row['designIds']), 'Invalid native design allowlist')
        rows[row['key']] = row; ids.add(row['productId'])
    return rows


def heads(db):
    return db.execute('SELECT tenant_id,id,revision,published_revision,archived FROM products ORDER BY tenant_id,id').fetchall()


def verify_native(db, old_mapping, new_mapping, gallery):
    old = mapping_rows(old_mapping); new = mapping_rows(new_mapping)
    for key, value in old.items():
        require(new.get(key) == value, 'Existing mapped group changed: ' + key)
    require(gallery.get('schema') in ('gravuru-slate-original-review/v1', 'gravuru-design-original-review/v1') and gallery.get('reviewOnly') is True and gallery.get('released') is False, 'Private gallery required')
    originals = {row['id']: row for row in gallery['originals']}
    products = {row['key']: row for row in gallery['products']}
    require(len(originals) == len(gallery['originals']) and len(products) == len(gallery['products']) and set(products) == set(new), 'Gallery mapping inventory differs')
    expected = {key: {} for key in new}
    by_original = {}
    for key, row in new.items():
        require(sorted(row['designIds']) == sorted(products[key]['designIds']) and all(i in originals for i in row['designIds']), 'Gallery design identity differs')
        for original_id in row['designIds']:
            by_original.setdefault(original_id, []).append(key)
    for original_id, original in originals.items():
        for target in original.get('targets', []):
            if target.get('status') != 'prepared':
                continue
            if target.get('productKey') is not None:
                candidates = [target['productKey']] if target['productKey'] in by_original.get(original_id, []) else []
                native_id = target.get('nativeDesignId')
            else:
                candidates = [k for k in by_original.get(original_id, []) if k.startswith(str(target.get('sizeKey')) + ':')]
                native_id = 'katalog-' + original_id
            require(len(candidates) == 1 and isinstance(native_id, str) and native_id and native_id not in expected[candidates[0]], 'Ambiguous native gallery target')
            expected[candidates[0]][native_id] = original_id
    for key, row in new.items():
        require(len(expected[key]) == len(row['designIds']), 'Missing native design target')
        record = db.execute("SELECT p.revision,p.published_revision,p.archived,json_extract(r.document,'$.config.reviewOnly') FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.tenant_id=p.tenant_id AND r.revision=p.revision WHERE p.tenant_id='gravuru' AND p.id=?", (row['productId'],)).fetchone()
        require(record is not None and record[0] >= 1 and record[1] is None and record[2] == 0 and record[3] == 1, 'Mapped product is missing or not an unpublished review: ' + key)
        designs = db.execute("SELECT json_extract(d.value,'$.id'),json_extract(d.value,'$.katalog.designId'),json_extract(d.value,'$.katalog.originalId') FROM product_revisions r,json_each(r.document,'$.config.profile.designs') d WHERE r.tenant_id='gravuru' AND r.product_id=? AND r.revision=?", (row['productId'], record[0])).fetchall()
        require(len(designs) == len(expected[key]) and {d[0] for d in designs} == set(expected[key]), 'Native design IDs differ: ' + key)
        for native_id, source_id, original_id in designs:
            identities = [v for v in (source_id, original_id) if v is not None]
            require(identities and all(v == expected[key][native_id] for v in identities), 'Native original ID differs: ' + key)
    return {'previousMappedGroups': len(old), 'mappedGroups': len(new), 'addedMappedGroups': len(new) - len(old), 'originals': len(originals)}


def backup_sqlite(source, target):
    checked_path(source)
    with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as original:
        with closing(sqlite3.connect(target)) as copied:
            original.backup(copied)
            require(copied.execute('PRAGMA quick_check').fetchall() == [('ok',)], 'SQLite backup is inconsistent')
    target.chmod(0o600)
    with target.open('rb') as stream:
        os.fsync(stream.fileno())
    return {'file': target.name, 'sha256': digest(target), 'bytes': target.stat().st_size, 'quickCheck': 'ok'}


def activate(args):
    os.umask(0o077)
    proof, paths = verify_stage(args)
    backup = args.backup or STAGE / ('activation-backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    require(backup.is_absolute() and backup.resolve() == backup and backup.parent == STAGE and re.fullmatch(r'activation-backup-[A-Za-z0-9_-]+', backup.name) and not backup.exists(), 'Fresh private stage backup required')
    require(STAGE.stat().st_dev == DATA.stat().st_dev, 'Atomic mapping replacement requires the same filesystem')
    with runtime_lock():
        # The runtime holds this exact lock for its entire listening lifetime.
        # A stopped app stays excluded throughout backup, rechecks and commit.
        proof, paths = verify_stage(args)
        active_mapping = checked_path(DATA / MAPPING)
        require(digest(active_mapping) == proof['beforeMappingSha256'], 'Active mapping changed after staging')
        before_bytes = active_mapping.read_bytes(); next_bytes = paths['mapping'].read_bytes()
        require(hashlib.sha256(next_bytes).hexdigest() == args.mapping_sha256, 'Staged mapping changed')
        gallery = read_json(paths['gallery'] / 'manifest.json')
        checked_path(DATA / 'workshop.sqlite')
        with closing(sqlite3.connect((DATA / 'workshop.sqlite').as_uri() + '?mode=ro', uri=True)) as db:
            counts = verify_native(db, json.loads(before_bytes), json.loads(next_bytes), gallery)
            before_heads = heads(db)
        backup.mkdir(mode=0o700)
        write_new(backup / 'previous-local-review-import.json', before_bytes)
        write_new(backup / 'product-heads.json', {'schema': 'gravuru-native-heads/v1', 'columns': ['tenantId', 'productId', 'revision', 'publishedRevision', 'archived'], 'heads': before_heads})
        write_new(backup / 'STAGE-READY.json', (STAGE / 'STAGE-READY.json').read_bytes())
        write_new(backup / 'previous-config.json', (ACTIVE / 'config.json').read_bytes())
        sqlite_backups = [backup_sqlite(DATA / name, backup / name) for name in DATABASES]
        next_file = backup / 'mapping-next.tmp'; rollback_file = backup / 'mapping-rollback.tmp'
        write_new(next_file, next_bytes); write_new(rollback_file, before_bytes)
        receipt = {'schema': 'gravuru-complete-gallery-activation/v1', 'createdAtUtc': datetime.now(timezone.utc).isoformat(), 'siteId': SITE_ID, 'sourceCommit': args.commit, 'stageProofSha256': digest(STAGE / 'STAGE-READY.json'), 'previousMappingSha256': proof['beforeMappingSha256'], 'mappingSha256': args.mapping_sha256, 'data': str(DATA), 'sameData': True, 'code': str(paths['code']), 'gallery': str(paths['gallery']), 'config': str(paths['config']), 'counts': counts, 'sqliteBackups': sqlite_backups, 'headsSha256': digest(backup / 'product-heads.json'), 'rollback': {'mappingBackup': str(backup / 'previous-local-review-import.json'), 'mappingTarget': str(active_mapping), 'previousConfig': str(ACTIVE / 'config.json'), 'requiresStoppedApplicationAndRuntimeLock': True}, 'mappingActivated': True, 'serviceStarted': False, 'pleskChanged': False, 'shopifyWrites': 0, 'databaseHistoryReplaced': False, 'noHops': True}
        write_new(backup / 'ACTIVATION-PREPARED.json', {**receipt, 'mappingActivated': False})
        pending_receipt = backup / 'ACTIVATION-RECEIPT.pending.json'
        write_new(pending_receipt, receipt)
        fsync_directory(backup)
        changed = False
        try:
            verify_stage(args)
            require(digest(active_mapping) == proof['beforeMappingSha256'], 'Concurrent active mapping edit')
            with closing(sqlite3.connect((DATA / 'workshop.sqlite').as_uri() + '?mode=ro', uri=True)) as db:
                require(heads(db) == before_heads, 'Concurrent native product edit')
            os.replace(next_file, active_mapping); changed = True
            fsync_directory(DATA)
            require(digest(active_mapping) == args.mapping_sha256, 'Installed mapping readback differs')
            os.replace(pending_receipt, backup / 'ACTIVATION-RECEIPT.json')
            fsync_directory(backup)
        except BaseException:
            if changed:
                os.replace(rollback_file, active_mapping)
                fsync_directory(DATA)
                require(digest(active_mapping) == proof['beforeMappingSha256'], 'Mapping rollback could not be verified; use the private backup')
                receipt_file = backup / 'ACTIVATION-RECEIPT.json'
                if receipt_file.exists():
                    receipt_file.unlink()
            raise
        return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--mapping-sha256', required=True)
    parser.add_argument('--backup', type=Path)
    try:
        print(json.dumps(activate(parser.parse_args())))
    except Exception as error:
        raise SystemExit('Private gallery activation stopped: ' + str(error))
