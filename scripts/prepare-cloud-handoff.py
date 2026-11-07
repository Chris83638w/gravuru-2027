"""Create and verify a portable recovery package. No uploads or source deletion.

Usage: python prepare-cloud-handoff.py create REPO DEST --inputs INPUTS.json
       python prepare-cloud-handoff.py verify PACKAGE_DIRECTORY
       python prepare-cloud-handoff.py restore PACKAGE_DIRECTORY NEW_DIRECTORY
"""
import argparse
import contextlib
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import zipfile


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()


def git(repo, *args):
    return subprocess.check_output(['git', '-c', f'safe.directory={repo.as_posix()}', '-C', str(repo), *args])


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def ro_db(path):
    return sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)


def db_summary(path):
    with contextlib.closing(ro_db(path)) as db:
        integrity = [r[0] for r in db.execute('PRAGMA integrity_check')]
        if integrity != ['ok'] or list(db.execute('PRAGMA foreign_key_check')):
            raise ValueError(f'Database integrity failed: {path.name}')
        tables = {}
        for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
            quoted = '"' + name.replace('"', '""') + '"'
            # Stable logical hashes include every value, including BLOBs.
            rows = []
            for row in db.execute('SELECT * FROM ' + quoted):
                serial = [dict(blob=v.hex()) if isinstance(v, bytes) else v for v in row]
                rows.append(json.dumps(serial, ensure_ascii=False, separators=(',', ':')))
            tables[name] = dict(rows=len(rows), sha256=hashlib.sha256('\n'.join(sorted(rows)).encode()).hexdigest())
        return dict(integrity='ok', version=db.execute('PRAGMA user_version').fetchone()[0], tables=tables)


def verify_state(state, source_root=None):
    result = {n: db_summary(state / n) for n in ['workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite']}
    with contextlib.closing(ro_db(state / 'design-assets.sqlite')) as db:
        source_ids = set()
        for sha, data in db.execute('SELECT sha256,bytes FROM design_sources'):
            if hashlib.sha256(data).hexdigest() != sha:
                raise ValueError('Original design hash mismatch')
            source_ids.add(sha)
        asset_ids = set()
        for aid, source, preview, metadata in db.execute('SELECT id,source_sha256,preview,metadata FROM design_assets'):
            m = json.loads(metadata)
            ph = hashlib.sha256(preview).hexdigest()
            expected = hashlib.sha256(f"{source}:{ph}:{m['page']}".encode()).hexdigest()
            if source not in source_ids or ph != m['previewSha256'] or expected != aid or m['assetId'] != aid:
                raise ValueError('Design asset hash mismatch')
            asset_ids.add(aid)
    with contextlib.closing(ro_db(state / 'workshop.sqlite')) as db:
        references = 0
        shared_resources = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='product_document_resources'").fetchone()
        version = db.execute('PRAGMA user_version').fetchone()[0]
        if version >= 5 or shared_resources:
            # One authoritative decoder, including tenant/hash checks. Never
            # normalize the stored rows or copy hydrated payloads back into SQLite.
            root = source_root or Path(__file__).resolve().parent.parent
            helper = root / 'scripts' / 'lib' / 'product-revision-resources-audit.mjs'
            node = os.environ.get('GRAVURU_NODE') or shutil.which('node')
            if not node or not helper.is_file():
                raise ValueError('Shared resource verification requires Node and the matching source package')
            check = subprocess.run([node, str(helper), str(state / 'workshop.sqlite')],
                                   input=json.dumps(sorted(asset_ids)), text=True, capture_output=True, check=True)
            references = json.loads(check.stdout)['verifiedAssetReferences']
        for (raw,) in ([] if version >= 5 or shared_resources else db.execute('SELECT document FROM product_revisions')):
            def visit(value):
                nonlocal references
                if isinstance(value, dict):
                    if 'assetId' in value:
                        if value['assetId'] not in asset_ids:
                            raise ValueError('Revision refers to missing design asset')
                        references += 1
                    for child in value.values():
                        visit(child)
                elif isinstance(value, list):
                    for child in value:
                        visit(child)
            visit(json.loads(raw))
        result['productIndex'] = [dict(id=r[0], revision=r[1], name=r[2], archived=bool(r[3])) for r in db.execute('SELECT id,revision,name,archived FROM products ORDER BY id')]
        result['verifiedAssetReferences'] = references
    return result


def create(repo, dest, inputs):
    repo, dest = repo.resolve(), dest.resolve()
    if dest == repo or repo in dest.parents or dest.exists():
        raise ValueError('Choose a NEW backup directory outside the repository')
    dest.mkdir(parents=True)
    included, missing = [], []

    def copy(src, relative, role):
        target = dest / relative
        if not target.resolve().is_relative_to(dest) or target.exists():
            raise ValueError('Unsafe or duplicate target ' + relative)
        if not src.is_file() or src.is_symlink():
            missing.append(dict(path=str(src), role=role))
            return
        before = digest(src)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, target)
        if digest(src) != before or digest(target) != before:
            raise ValueError('Source changed during backup: ' + str(src))
        included.append(dict(path=relative, size=target.stat().st_size, sha256=before, role=role))

    source_files = git(repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').decode().split('\0')
    for name in sorted(set(filter(None, source_files))):
        p = Path(name)
        if p.name.startswith('.env') and p.name != '.env.example' or p.suffix in ['.pem', '.key', '.sqlite']:
            raise ValueError('Review potentially sensitive tracked file: ' + name)
        copy(repo / p, 'source/' + p.as_posix(), 'source')

    for item in inputs:
        src = Path(item['path'])
        if item.get('directory'):
            if not src.is_dir():
                missing.append(dict(path=str(src), role=item['role']))
                continue
            for p in sorted(src.rglob('*')):
                if p.is_file():
                    copy(p, item['target'] + '/' + p.relative_to(src).as_posix(), item['role'])
        else:
            copy(src, item['target'], item['role'])

    state = dest / 'state'
    state.mkdir()
    # Lock all writers briefly to snapshot all three stores at one consistent boundary.
    # Backup from separate read connections: backup() on its own write transaction can stall.
    locks = []
    try:
        for name in ['workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite']:
            db = sqlite3.connect(repo / '.local-data' / name, timeout=10)
            db.execute('BEGIN IMMEDIATE')
            locks.append(db)
        captured = datetime.datetime.now(datetime.timezone.utc).isoformat()
        for name in ['workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite']:
            with contextlib.closing(ro_db(repo / '.local-data' / name)) as src, contextlib.closing(sqlite3.connect(state / name)) as out:
                src.backup(out)
            if db_summary(repo / '.local-data' / name) != db_summary(state / name):
                raise ValueError('Database snapshot differs: ' + name)
    finally:
        for db in reversed(locks):
            db.rollback()
            db.close()
    database_report = verify_state(state, repo)
    for p in state.iterdir():
        if p.suffix == '.sqlite':
            included.append(dict(path='state/' + p.name, size=p.stat().st_size, sha256=digest(p), role='private-database'))
    bundle = dest / 'source-history.bundle'
    git(repo, 'bundle', 'create', str(bundle), '--all')
    git(repo, 'bundle', 'verify', str(bundle))
    included.append(dict(path=bundle.name, size=bundle.stat().st_size, sha256=digest(bundle), role='git-history'))
    manifest = dict(schema='gravuru-cloud-handoff/v1', capturedAt=captured,
                    sourceCommit=git(repo, 'rev-parse', 'HEAD').decode().strip(),
                    branch=git(repo, 'branch', '--show-current').decode().strip(),
                    gitStatus=git(repo, 'status', '--porcelain').decode(),
                    files=included, missing=missing, databases=database_report,
                    excluded=['Credentials, .env and browser login sessions', 'Reinstallable OS-specific Python runtime and dependency caches',
                              'Generated .preview build (recreated from source)', 'Unsaved browser-only editing state'],
                    cloudStatus='NOT_UPLOADED_NOT_RESTORED_NOT_VERIFIED')
    save_json(dest / 'MANIFEST.json', manifest)
    shutil.copy2(Path(__file__), dest / 'verify-and-restore.py')
    save_json(dest / 'VERIFICATION.json', verify(dest))
    archive = dest.with_suffix('.zip')
    if archive.exists():
        raise ValueError('Archive already exists')
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED, compresslevel=5) as z:
        for p in sorted(dest.rglob('*')):
            if p.is_file():
                z.write(p, p.relative_to(dest).as_posix())
    with zipfile.ZipFile(archive) as z:
        if z.testzip():
            raise ValueError('Archive CRC failed')
        for entry in included:
            if hashlib.sha256(z.read(entry['path'])).hexdigest() != entry['sha256']:
                raise ValueError('Archive content mismatch')
    archive.with_suffix('.zip.sha256').write_text(digest(archive) + '  ' + archive.name + '\n')
    print(json.dumps(dict(directory=str(dest), archive=str(archive), sha256=digest(archive), size=archive.stat().st_size,
                         files=len(included), missing=missing, databases=database_report), ensure_ascii=False, indent=2))


def verify(package):
    manifest = json.loads((package / 'MANIFEST.json').read_text(encoding='utf-8'))
    for item in manifest['files']:
        p = (package / item['path']).resolve()
        if not p.is_relative_to(package.resolve()) or not p.is_file() or digest(p) != item['sha256']:
            raise ValueError('Missing or changed file: ' + item['path'])
    if verify_state(package / 'state', package / 'source') != manifest['databases']:
        raise ValueError('Database logical state mismatch')
    return dict(status='PASS' if not manifest['missing'] else 'INCOMPLETE_INPUTS', files=len(manifest['files']),
                missing=manifest['missing'], databaseIntegrity='ok', originalAssetHashes='ok', revisionReferences='ok')


def restore(package, target):
    report = verify(package)
    if target.exists():
        raise ValueError('Restore target must not already exist; existing data are never overwritten')
    shutil.copytree(package / 'source', target)
    data = target / '.local-data'
    data.mkdir(exist_ok=False)
    for name in ['workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite']:
        shutil.copy2(package / 'state' / name, data / name)
    manifest = json.loads((package / 'MANIFEST.json').read_text(encoding='utf-8'))
    if verify_state(data, target) != manifest['databases']:
        raise ValueError('Restore verification failed')
    report.update(restoredTo=str(target.resolve()), cloudAcceptance='Still requires runtimes, tests, build and application checks at destination')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['create', 'verify', 'restore'])
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path, nargs='?')
    parser.add_argument('--inputs', type=Path)
    args = parser.parse_args()
    if args.action == 'create':
        create(args.source, args.destination, json.loads(args.inputs.read_text(encoding='utf-8-sig')))
    elif args.action == 'restore':
        restore(args.source, args.destination)
    else:
        print(json.dumps(verify(args.source), indent=2))
