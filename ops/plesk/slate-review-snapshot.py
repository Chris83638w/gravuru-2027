"""Private Schiefer review snapshots. Standard library only; never overwrite a target.

Capture uses SQLite's backup API while ALL source databases hold reserved write
locks. This includes committed WAL contents and keeps inter-database references.
No import/rebuild from catalogue baselines is performed.
"""
import argparse
from contextlib import ExitStack, closing
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sqlite3
import zipfile

DATABASES = ('design-assets.sqlite', 'profiles.sqlite', 'workshop.sqlite', 'review-comments.sqlite')
OPTIONAL_DATABASES = ('review-approvals.sqlite',)
MAPPING = 'local-review-import.json'
RECEIPT = 'ONLINE-SNAPSHOT.json'
SCHEMA = 'gravuru-slate-online-snapshot/v1'
DERIVED_CACHE = re.compile(r'review-fingerprint-cache\.json(?:\.[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.tmp)?')


def digest(file):
    checksum = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            checksum.update(chunk)
    return checksum.hexdigest()


def no_links(file):
    for part in (file, *file.parents):
        if part.is_symlink() or (hasattr(part, 'is_junction') and part.is_junction()):
            raise ValueError('Symbolic paths and junctions are not allowed')


def separate_path(raw):
    file = Path(raw).absolute()
    no_links(file)
    file = file.resolve()
    if file == Path(file.anchor) or 'gravuru-werkstatt' in file.parts:
        raise ValueError('Choose a separate private review path')
    if any((part / '.git').exists() for part in (file, *file.parents)):
        raise ValueError('Private snapshots and data must stay outside Git')
    return file


def child(root, relative):
    if not isinstance(relative, str) or '\\' in relative or '\x00' in relative:
        raise ValueError('Invalid snapshot path')
    parts = PurePosixPath(relative).parts
    if not parts or relative != '/'.join(parts) or any(part in ('.', '..') or ':' in part or part.startswith('.') for part in parts):
        raise ValueError('Invalid snapshot path')
    file = root.joinpath(*parts)
    if not file.is_relative_to(root):
        raise ValueError('Path escapes snapshot')
    no_links(file)
    return file


def regular_files(root):
    result = set()
    for file in root.rglob('*'):
        no_links(file)
        if file.is_file():
            result.add(file.relative_to(root).as_posix())
        elif not file.is_dir():
            raise ValueError('Only regular files and directories are allowed')
    return result


def record(file, relative):
    return {'file': relative, 'bytes': file.stat().st_size, 'sha256': digest(file)}


def check_record(root, row):
    file = child(root, row['file'])
    if not file.is_file() or file.stat().st_size != row['bytes'] or digest(file) != row['sha256']:
        raise ValueError('Checksum mismatch: ' + row['file'])
    return file


def write_json(file, value):
    with file.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    file.chmod(0o600)


def copy_private(source, target):
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with source.open('rb') as incoming, target.open('xb') as outgoing:
        shutil.copyfileobj(incoming, outgoing)
    target.chmod(0o600)


def db_check(file):
    with closing(sqlite3.connect(file.as_uri() + '?mode=ro&immutable=1', uri=True)) as db:
        if db.execute('PRAGMA quick_check').fetchall() != [('ok',)]:
            raise ValueError('SQLite consistency check failed')


def source_databases(data):
    present = list(DATABASES)
    for name in OPTIONAL_DATABASES:
        no_links(data / name)
        if (data / name).exists() and not (data / name).is_file():
            raise ValueError('Optional review database is not a regular file: ' + name)
        if (data / name).is_file():
            present.append(name)
        elif any((data / (name + suffix)).exists() for suffix in ('-wal', '-shm', '-journal')):
            raise ValueError('Optional database journal exists without its database: ' + name)
    return tuple(present)


def validate_mapping(gallery, data):
    pack = json.loads((gallery / 'manifest.json').read_text(encoding='utf-8'))
    mapping = json.loads((data / MAPPING).read_text(encoding='utf-8'))
    if pack.get('schema') not in ('gravuru-slate-original-review/v1', 'gravuru-design-original-review/v1') or pack.get('reviewOnly') is not True or pack.get('released') is not False:
        raise ValueError('Expected an unpublished design review package')
    if mapping.get('localOnly') is not True or mapping.get('published') is not False or mapping.get('shopifyWrites') != 0:
        raise ValueError('Expected a local unpublished review mapping')
    ids = {row['id'] for row in pack['originals']}
    expected = {row['key']: sorted(row['designIds']) for row in pack['products']}
    actual = {row['key']: sorted(row['designIds']) for row in mapping['products']}
    if expected != actual or len(actual) != len(mapping['products']) or len(ids) != len(pack['originals']):
        raise ValueError('Mapping and gallery disagree')
    if any(row.get('reviewOnly') is not True or any(i not in ids for i in row['designIds']) for row in mapping['products']):
        raise ValueError('Mapping includes unknown or released designs')
    return {'originals': len(ids), 'products': len(actual)}


def capture(data, gallery, output):
    data, gallery, output = map(separate_path, (data, gallery, output))
    if any(a.is_relative_to(b) or b.is_relative_to(a) for a, b in ((data, gallery), (data, output), (gallery, output))):
        raise ValueError('Source and output paths must be separate')
    if output.exists():
        raise ValueError('Snapshot output already exists; use a new directory')
    expected = {MAPPING, '.gravuru-private-test.json', '.runtime.lock'}
    expected.update(name + suffix for name in (*DATABASES, *OPTIONAL_DATABASES) for suffix in ('', '-wal', '-shm', '-journal'))
    source_files = regular_files(data)
    # The derived cache has no approval events or editable data and is tied to
    # this physical database. Rebuild after restore; never ship stale entries.
    # Only the writer's exact filenames are omitted, not arbitrary cache files.
    disposable = {name for name in source_files if DERIVED_CACHE.fullmatch(name)}
    if source_files - expected - disposable:
        raise ValueError('Unexpected files in source data; do not omit them silently')
    for name in (*DATABASES, MAPPING):
        if not (data / name).is_file():
            raise ValueError('Required source file missing: ' + name)
    source_databases(data)  # Never silently omit orphaned approval journals.
    baseline_file = gallery / 'files-sha256.json'
    baseline = json.loads(baseline_file.read_text(encoding='utf-8'))
    names = {row['file'] for row in baseline}
    if len(names) != len(baseline) or regular_files(gallery) - {'.gravuru-slate-review.json'} != names | {'files-sha256.json'}:
        raise ValueError('Gallery file inventory does not match its checksums')
    for row in baseline:
        check_record(gallery, row)
    counts = validate_mapping(gallery, data)
    output.mkdir(parents=True, mode=0o700)
    (output / 'data').mkdir(mode=0o700)
    (output / 'gallery').mkdir(mode=0o700)
    # Immutable catalogue bytes are copied first, outside the database lock.
    # Re-check source and copy against the same pinned checksum to catch edits.
    for name in sorted(names | {'files-sha256.json'}):
        source = child(gallery, name)
        copy_private(source, child(output / 'gallery', name))
    for row in baseline:
        check_record(output / 'gallery', row)
    if digest(baseline_file) != digest(output / 'gallery' / 'files-sha256.json'):
        raise ValueError('Gallery changed during snapshot')
    # Discover optional review tables again after copying the immutable package;
    # the app may have enabled approvals during that longer read-only phase.
    databases = source_databases(data)
    with ExitStack() as stack:
        for name in databases:
            lock = sqlite3.connect((data / name).as_uri() + '?mode=rw', uri=True, timeout=5)
            stack.callback(lock.close)
            lock.execute('BEGIN IMMEDIATE')
        if source_databases(data) != databases:
            raise ValueError('Review database inventory changed during snapshot; retry with a new output')
        mapping_bytes = (data / MAPPING).read_bytes()
        for name in databases:
            source = sqlite3.connect((data / name).as_uri() + '?mode=ro', uri=True, timeout=5)
            destination = sqlite3.connect(output / 'data' / name)
            try:
                source.backup(destination)
                # Seal the standalone backup; never ship copied WAL/SHM files.
                destination.execute('PRAGMA journal_mode=DELETE')
            finally:
                source.close()
                destination.close()
            (output / 'data' / name).chmod(0o600)
        if (data / MAPPING).read_bytes() != mapping_bytes:
            raise ValueError('Product mapping changed during snapshot; retry with a new output')
        if source_databases(data) != databases:
            raise ValueError('Review database inventory changed during snapshot; retry with a new output')
        with (output / 'data' / MAPPING).open('xb') as stream:
            stream.write(mapping_bytes)
        (output / 'data' / MAPPING).chmod(0o600)
    for name in databases:
        db_check(output / 'data' / name)
    validate_mapping(output / 'gallery', output / 'data')
    files = [record(child(output, name), name) for name in sorted(regular_files(output))]
    receipt = {'schema': SCHEMA, 'createdAt': datetime.now(timezone.utc).isoformat(),
               'reviewOnly': True, 'published': False, 'counts': counts,
               'databases': list(databases),
               'capture': 'sqlite-backup-with-all-database-write-locks', 'files': files}
    write_json(output / RECEIPT, receipt)
    return {'snapshot': str(output), 'files': len(files), 'bytes': sum(row['bytes'] for row in files), 'databases': list(databases), **counts}


def verify(snapshot):
    snapshot = separate_path(snapshot)
    receipt = json.loads((snapshot / RECEIPT).read_text(encoding='utf-8'))
    if receipt.get('schema') != SCHEMA or receipt.get('reviewOnly') is not True or receipt.get('published') is not False:
        raise ValueError('Not a private review snapshot')
    rows = receipt['files']
    names = {row['file'] for row in rows}
    if len(rows) != len(names) or regular_files(snapshot) != names | {RECEIPT}:
        raise ValueError('Unexpected, duplicated or missing snapshot files')
    databases = tuple(receipt.get('databases', DATABASES))
    if databases != DATABASES + tuple(name for name in OPTIONAL_DATABASES if name in databases):
        raise ValueError('Unexpected snapshot database inventory')
    if {name for name in names if name.startswith('data/')} != {'data/' + n for n in (*databases, MAPPING)}:
        raise ValueError('Unexpected snapshot database inventory')
    if any(not name.startswith(('data/', 'gallery/')) for name in names):
        raise ValueError('Snapshot contains an unrelated file')
    for row in rows:
        check_record(snapshot, row)
    for name in databases:
        db_check(snapshot / 'data' / name)
    validate_mapping(snapshot / 'gallery', snapshot / 'data')
    return receipt


def install(snapshot, data, gallery, origin):
    snapshot, data, gallery = map(separate_path, (snapshot, data, gallery))
    if any(a.is_relative_to(b) or b.is_relative_to(a) for a, b in ((data, gallery), (data, snapshot), (gallery, snapshot))):
        raise ValueError('Installation requires separate paths')
    if data.exists() or gallery.exists():
        raise ValueError('Installation only creates new directories; existing data is never overwritten')
    # Origin is also checked by the Node/config.mjs entry point before installation.
    from urllib.parse import urlsplit
    parsed = urlsplit(origin)
    if parsed.scheme != 'https' or parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password or not parsed.hostname or '.' not in parsed.hostname:
        raise ValueError('Expected an exact HTTPS origin')
    receipt = verify(snapshot)
    data.mkdir(parents=True, mode=0o700)
    gallery.mkdir(parents=True, mode=0o700)
    for row in receipt['files']:
        scope, name = row['file'].split('/', 1)
        root = data if scope == 'data' else gallery
        copy_private(child(snapshot, row['file']), child(root, name))
        check_record(root, {**row, 'file': name})
    # Activation markers are last. An incomplete copy can never boot as a valid runtime.
    write_json(gallery / '.gravuru-slate-review.json', {'schema': 1, 'purpose': 'slate-review-gallery', 'origin': origin})
    write_json(data / '.gravuru-private-test.json', {'schema': 1, 'purpose': 'private-test-data', 'origin': origin})
    return {'installed': True, 'published': False, 'data': str(data), 'gallery': str(gallery), 'counts': receipt['counts']}


def archive(snapshot, output):
    snapshot, output = map(separate_path, (snapshot, output))
    if output.exists() or output.is_relative_to(snapshot) or output.with_suffix(output.suffix + '.sha256').exists():
        raise ValueError('Choose a new archive outside the snapshot directory')
    receipt = verify(snapshot)
    output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with zipfile.ZipFile(output, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as zipped:
        for name in sorted([row['file'] for row in receipt['files']] + [RECEIPT]):
            zipped.write(child(snapshot, name), name)
    output.chmod(0o600)
    checksum = digest(output)
    with output.with_suffix(output.suffix + '.sha256').open('x', encoding='utf-8') as sidecar:
        sidecar.write(checksum + '  ' + output.name + '\n')
    output.with_suffix(output.suffix + '.sha256').chmod(0o600)
    return {'archive': str(output), 'bytes': output.stat().st_size, 'sha256': checksum, 'privateData': True}


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    capture_parser = sub.add_parser('capture')
    for name in ('data', 'gallery', 'output'):
        capture_parser.add_argument('--' + name, required=True)
    verify_parser = sub.add_parser('verify')
    verify_parser.add_argument('--snapshot', required=True)
    install_parser = sub.add_parser('install')
    for name in ('snapshot', 'data', 'gallery', 'origin'):
        install_parser.add_argument('--' + name, required=True)
    archive_parser = sub.add_parser('archive')
    for name in ('snapshot', 'output'):
        archive_parser.add_argument('--' + name, required=True)
    args = vars(parser.parse_args())
    command = args.pop('command')
    result = globals()[command](**args)
    if command == 'verify':
        result = {'verified': True, 'files': len(result['files']), 'counts': result['counts']}
    print(json.dumps(result))


if __name__ == '__main__':
    main()
