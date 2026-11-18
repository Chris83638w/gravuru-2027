"""Private native-WAL snapshot and restore. Never starts the app or writes sources.

All three read transactions are pinned inside one change-free window, checked
through separate, continuously open data_version monitor connections. Later
commits may continue while backup() copies the pinned snapshots. No retries.
"""
import argparse
from contextlib import ExitStack, closing
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import signal
import sqlite3
import sys
import time

DATABASES = ('workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite')
RECEIPT = 'SNAPSHOT.json'
SCHEMA = 'gravuru-native-online-snapshot/v1'


class SnapshotFailure(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def require(condition, code):
    if not condition:
        raise SnapshotFailure(code)


def canonical(raw, *, private=False, outside_git=False):
    p = Path(raw)
    require(p.is_absolute() and p.resolve() == p, 'canonical_path')
    for part in (p, *p.parents):
        require(not part.is_symlink() and not (hasattr(part, 'is_junction') and part.is_junction()), 'linked_path')
        if outside_git:
            require(not (part / '.git').exists(), 'private_outside_git')
    if private and os.name == 'posix':
        s = p.stat()
        require(s.st_uid == os.getuid() and s.st_mode & 0o077 == 0, 'private_permissions')
    return p


def destination(raw, web_roots):
    p = canonical(raw, outside_git=True)
    require(isinstance(web_roots, list) and bool(web_roots), 'web_roots_required')
    for raw_root in web_roots:
        root = canonical(raw_root)
        require(not p.is_relative_to(root) and not root.is_relative_to(p), 'public_destination')
    require(not p.exists() and p.parent.is_dir(), 'fresh_destination')
    canonical(p.parent, private=True, outside_git=True)
    return p


def child(root, name):
    parts = PurePosixPath(name).parts if isinstance(name, str) else ()
    require(bool(parts) and name == '/'.join(parts) and '\\' not in name and
            not any(x in ('.', '..', '') or ':' in x for x in parts), 'relative_path')
    p = canonical(root.joinpath(*parts))
    require(p != root and p.is_relative_to(root), 'relative_path')
    return p


def stamp(p):
    s = p.stat()
    require(p.is_file(), 'regular_file')
    return (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns)


def sha_file(p, guard=lambda: None):
    h = hashlib.sha256()
    with p.open('rb') as stream:
        while block := stream.read(1024 * 1024):
            guard()
            h.update(block)
    return h.hexdigest()


def write_new(p, value):
    with p.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
        stream.flush()
        os.fsync(stream.fileno())
    p.chmod(0o600)


def sync_dir(p):
    if os.name == 'posix':
        fd = os.open(p, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


def host_memory():
    rows = dict(line.split(':', 1) for line in Path('/proc/meminfo').read_text().splitlines())
    return int(rows['MemAvailable'].split()[0]) * 1024


def cgroup_headroom():
    limits = []
    for line in Path('/proc/self/cgroup').read_text().splitlines():
        ident, controllers, relative = line.split(':', 2)
        if ident == '0' and not controllers:
            root, names = Path('/sys/fs/cgroup'), ('memory.current', 'memory.max')
        elif 'memory' in controllers.split(','):
            root, names = Path('/sys/fs/cgroup/memory'), ('memory.usage_in_bytes', 'memory.limit_in_bytes')
        else:
            continue
        p = (root / relative.lstrip('/')).resolve()
        require(p.is_relative_to(root), 'cgroup_path')
        while p.is_relative_to(root):
            if all((p / n).is_file() for n in names):
                used, limit = ((p / n).read_text().strip() for n in names)
                if limit != 'max' and int(limit) < 2**60:
                    limits.append(int(limit) - int(used))
            if p == root:
                break
            p = p.parent
    require(bool(limits), 'cgroup_limit_unavailable')
    return min(limits)


class Guard:
    def __init__(self, limits, volume, data=None, *, metrics=None, clock=time.monotonic):
        keys = ('maxSeconds', 'maxWalBytes', 'minFreeBytes', 'minHostAvailableBytes', 'minCgroupHeadroomBytes', 'addressSpaceBytes')
        require(all(type(limits.get(k)) is int and limits[k] > 0 for k in keys), 'explicit_limits_required')
        self.limits, self.volume, self.data, self.clock = limits, volume, data, clock
        self.started, self.max_wal = clock(), 0
        self.metrics = metrics or self.read_metrics

    def read_metrics(self):
        s = os.statvfs(self.volume)
        wal = sum((self.data / (n + '-wal')).stat().st_size for n in DATABASES
                  if self.data and (self.data / (n + '-wal')).exists())
        return dict(free=s.f_bavail*s.f_frsize, host=host_memory(), cgroup=cgroup_headroom(), wal=wal)

    def __call__(self):
        require(self.clock() - self.started <= self.limits['maxSeconds'], 'time_limit')
        m = self.metrics()
        self.max_wal = max(self.max_wal, m['wal'])
        for key, field, code in [('minFreeBytes', 'free', 'disk_reserve'),
                                 ('minHostAvailableBytes', 'host', 'host_memory_reserve'),
                                 ('minCgroupHeadroomBytes', 'cgroup', 'cgroup_memory_reserve')]:
            require(m[field] >= self.limits[key], code)
        require(m['wal'] <= self.limits['maxWalBytes'], 'wal_limit')


def resource_inventory(config, guard):
    result = {}
    for prefix, raw in config.get('trees', {}).items():
        root = canonical(raw)
        require(root.is_dir(), 'resource_tree')
        for p in sorted(root.rglob('*')):
            relative = p.relative_to(root)
            if relative.parts[0] == '.git':
                continue  # Repository metadata is not an application resource.
            canonical(p)
            if p.is_dir():
                continue
            name = str(PurePosixPath(prefix) / relative.as_posix())
            require(name not in result, 'duplicate_resource')
            result[name] = (p, stamp(p), sha_file(p, guard))
    for name, raw in config.get('files', {}).items():
        require(name not in result, 'duplicate_resource')
        p = canonical(raw)
        result[name] = (p, stamp(p), sha_file(p, guard))
    return result


def copy_file(source, target, guard):
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with source.open('rb') as incoming, target.open('xb') as outgoing:
        while block := incoming.read(1024 * 1024):
            guard()
            outgoing.write(block)
        outgoing.flush()
        os.fsync(outgoing.fileno())
    target.chmod(0o600)


def checked_query(db, sql, guard):
    failure = []
    def tick():
        try:
            guard()
            return 0
        except SnapshotFailure as error:
            failure.append(error)
            return 1
    guard()
    db.set_progress_handler(tick, 10000)
    try:
        return db.execute(sql).fetchall()
    except sqlite3.Error:
        if failure:
            raise failure[0]
        raise
    finally:
        db.set_progress_handler(None, 0)


def counts(db, guard=lambda: None):
    names = [r[0] for r in checked_query(db, "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name", guard)]
    return {n: checked_query(db, 'SELECT count(*) FROM "' + n.replace('"', '""') + '"', guard)[0][0] for n in names}


def check_db(file, guard):
    # immutable applies only to a closed, standalone copy, never to live sources.
    with closing(sqlite3.connect(file.as_uri()+'?mode=ro&immutable=1', uri=True)) as db:
        require(checked_query(db, 'PRAGMA integrity_check', guard) == [('ok',)], 'copy_integrity')
        require(checked_query(db, 'PRAGMA foreign_key_check', guard) == [], 'copy_foreign_keys')
        return counts(db, guard)


def capture(config, *, metrics=None, clock=time.monotonic, hooks=None):
    require(config.get('schema') == SCHEMA, 'configuration_schema')
    data = canonical(config['data'], private=True, outside_git=True)
    output = destination(config['destination'], config['webRoots'])
    require(not output.is_relative_to(data) and not data.is_relative_to(output), 'separate_destination')
    for raw in config.get('trees', {}).values():
        root = canonical(raw)
        require(not output.is_relative_to(root) and not root.is_relative_to(output), 'separate_destination')
    guard = Guard(config['limits'], output.parent, data, metrics=metrics, clock=clock)
    guard()
    resources = resource_inventory(config, guard)
    for name in resources:
        require(not name.startswith('data/') and name != RECEIPT, 'reserved_resource_path')
        child(output, name)
    for name, expected in config.get('expectedHashes', {}).items():
        require(name in resources and resources[name][2] == expected, 'expected_resource_changed')
    hash_only = {name: sha_file(canonical(raw), guard) for name, raw in config.get('hashOnly', {}).items()}
    for name, expected in config.get('expectedHashOnly', {}).items():
        require(hash_only.get(name) == expected, 'expected_configuration_changed')
    sources, monitors, before_ids, source_counts = {}, {}, {}, {}
    with ExitStack() as stack:
        for name in DATABASES:
            file = canonical(data / name, private=True)
            for suffix in ('-wal', '-shm', '-journal'):
                sidecar = data / (name + suffix)
                if sidecar.exists() or sidecar.is_symlink():
                    require(canonical(sidecar).is_file(), 'regular_file')
            before_ids[name] = stamp(file)[:2]
            sources[name] = stack.enter_context(closing(sqlite3.connect(file.as_uri()+'?mode=ro', uri=True, isolation_level=None, timeout=0)))
            monitors[name] = stack.enter_context(closing(sqlite3.connect(file.as_uri()+'?mode=ro', uri=True, isolation_level=None, timeout=0)))
            require(sources[name].execute('PRAGMA journal_mode').fetchone()[0] == 'wal', 'source_requires_wal')
        before = {n: db.execute('PRAGMA data_version').fetchone()[0] for n, db in monitors.items()}
        pin_started = clock()
        for name, db in sources.items():
            db.execute('BEGIN')
            db.execute('SELECT count(*) FROM sqlite_schema').fetchone()
            if hooks and hooks.get('afterPin'):
                hooks['afterPin'](name)
        after = {n: db.execute('PRAGMA data_version').fetchone()[0] for n, db in monitors.items()}
        pin_ms = (clock() - pin_started)*1000
        require(before == after, 'concurrent_pin_change')
        require(all(stamp(data / n)[:2] == identity for n, identity in before_ids.items()), 'source_replaced')
        require(all(stamp(p) == identity for p, identity, _ in resources.values()), 'resource_changed')
        if hooks and hooks.get('afterAllPins'):
            hooks['afterAllPins']()
        guard()
        output.mkdir(mode=0o700)
        (output / 'data').mkdir(mode=0o700)
        for name, source in sources.items():
            source_counts[name] = counts(source, guard)
            target = output / 'data' / name
            fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(fd)
            def progress(status, remaining, total):
                guard()
                require(status not in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED), 'source_busy')
            with closing(sqlite3.connect(target)) as copied:
                source.backup(copied, pages=128, progress=progress, sleep=0)
                copied.execute('PRAGMA journal_mode=DELETE')
            target.chmod(0o600)
        require(all(stamp(data / n)[:2] == identity for n, identity in before_ids.items()), 'source_replaced')
    # Release all live readers before expensive integrity/hash checks or file copies.
    for name in DATABASES:
        require(check_db(output / 'data' / name, guard) == source_counts[name], 'copy_counts')
    for name, (source, _, expected) in resources.items():
        target = child(output, name)
        copy_file(source, target, guard)
        require(sha_file(target, guard) == expected, 'resource_copy_changed')
    require(resource_inventory(config, guard) == resources, 'resource_changed')
    require({name: sha_file(canonical(raw), guard) for name, raw in config.get('hashOnly', {}).items()} == hash_only, 'configuration_changed')
    files = [{'file': p.relative_to(output).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha_file(p, guard)}
             for p in sorted(output.rglob('*')) if p.is_file()]
    receipt = dict(schema=SCHEMA, createdAt=datetime.now(timezone.utc).isoformat(),
                   data=str(data), sourceReadOnly=True, liveRuntimeLockTaken=False,
                   method='sqlite-backup-pinned-wal-read-transactions', pinMilliseconds=round(pin_ms, 3),
                   dataVersionsBefore=before, dataVersionsAfter=after, counts=source_counts,
                   limits=config['limits'], maxWalBytes=guard.max_wal, elapsedSeconds=round(clock()-guard.started, 3),
                   hashOnly=hash_only, files=files, resourceGitMetadataExcluded=True)
    write_new(output / RECEIPT, receipt)
    sync_dir(output)
    return {'phase': 'capture', 'destination': str(output), 'receiptSha256': sha_file(output / RECEIPT),
            'files': len(files), 'bytes': sum(r['bytes'] for r in files),
            'elapsedSeconds': receipt['elapsedSeconds'], 'maxWalBytes': guard.max_wal}


def verify(snapshot, expected_sha, guard=lambda: None):
    root = canonical(snapshot, private=True, outside_git=True)
    require(sha_file(canonical(root / RECEIPT), guard) == expected_sha, 'receipt_changed')
    receipt = json.loads((root / RECEIPT).read_text(encoding='utf-8'))
    require(receipt.get('schema') == SCHEMA and receipt.get('sourceReadOnly') is True, 'snapshot_schema')
    names = [r['file'] for r in receipt['files']]
    require(len(names) == len(set(names)), 'duplicate_snapshot_file')
    actual = set()
    for p in root.rglob('*'):
        canonical(p)
        require(p.is_dir() or p.is_file(), 'regular_file')
        if p.is_file():
            actual.add(p.relative_to(root).as_posix())
    require(actual == set(names) | {RECEIPT}, 'snapshot_inventory')
    for row in receipt['files']:
        file = child(root, row['file'])
        require(file.is_file() and file.stat().st_size == row['bytes'] and sha_file(file, guard) == row['sha256'], 'snapshot_hash')
    for name in DATABASES:
        require(check_db(root / 'data' / name, guard) == receipt['counts'][name], 'snapshot_counts')
    return receipt


def restore(config, *, metrics=None, clock=time.monotonic):
    require(config.get('schema') == SCHEMA, 'configuration_schema')
    output = destination(config['destination'], config['webRoots'])
    snapshot = canonical(config['snapshot'], private=True, outside_git=True)
    require(not output.is_relative_to(snapshot) and not snapshot.is_relative_to(output), 'separate_destination')
    guard = Guard(config['limits'], output.parent, metrics=metrics, clock=clock)
    guard()
    receipt = verify(snapshot, config['receiptSha256'], guard)
    output.mkdir(mode=0o700)
    for row in receipt['files']:
        copy_file(child(snapshot, row['file']), child(output, row['file']), guard)
    copy_file(snapshot / RECEIPT, output / RECEIPT, guard)
    verify(output, config['receiptSha256'], guard)
    sync_dir(output)
    return {'phase': 'restore', 'destination': str(output), 'receiptSha256': config['receiptSha256'],
            'files': len(receipt['files']), 'elapsedSeconds': round(clock()-guard.started, 3)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=('capture', 'restore'))
    parser.add_argument('--config', required=True)
    args = parser.parse_args()
    file = canonical(args.config, private=True, outside_git=True)
    canonical(file.parent, private=True, outside_git=True)
    require(file.is_file() and file.stat().st_size <= 256*1024, 'configuration_file')
    config = json.loads(file.read_text(encoding='utf-8'))
    require(os.name == 'posix', 'linux_required')
    import resource
    limit = config['limits']['addressSpaceBytes']
    require(type(limit) is int and limit > 0, 'explicit_limits_required')
    resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    os.umask(0o077)
    os.nice(10)
    def stop(signum, frame):
        raise SnapshotFailure('interrupted')
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    result = capture(config) if args.phase == 'capture' else restore(config)
    result['peakRssBytes'] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print(json.dumps({'error': error.code if isinstance(error, SnapshotFailure) else 'snapshot_failed'}), file=sys.stderr)
        sys.exit(1)
