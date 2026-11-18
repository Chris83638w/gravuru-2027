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
DATABASE_SYNC_BYTES = 256 * 1024**2


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
        require(root.is_dir(), 'web_root_directory')
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


def drop_target_cache(p):
    """Only call for this job's private copies, never live source files."""
    if os.name == 'posix':
        with p.open('rb') as stream:
            os.posix_fadvise(stream.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)


def sync_target(p):
    """Flush only our new private target; never flush or evict a live source."""
    with p.open('r+b') as synced:
        os.fsync(synced.fileno())
    drop_target_cache(p)


def sha_file(p, guard=lambda: None, *, private_copy=False):
    h = hashlib.sha256()
    with p.open('rb') as stream:
        while block := stream.read(1024 * 1024):
            guard()
            h.update(block)
    if private_copy:
        drop_target_cache(p)
    return h.hexdigest()


def write_new(p, value):
    with p.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
        stream.flush()
        os.fsync(stream.fileno())
    p.chmod(0o600)
    drop_target_cache(p)


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


def cgroup_memory(proc_file=Path('/proc/self/cgroup'), sys_root=Path('/sys/fs/cgroup')):
    groups = []
    for line in proc_file.read_text().splitlines():
        ident, controllers, relative = line.split(':', 2)
        if ident == '0' and not controllers:
            root, names, version = sys_root, ('memory.current', 'memory.max'), 2
        elif 'memory' in controllers.split(','):
            root, names, version = sys_root / 'memory', ('memory.usage_in_bytes', 'memory.limit_in_bytes'), 1
        else:
            continue
        root = root.resolve()
        p = (root / relative.lstrip('/')).resolve()
        require(p.is_relative_to(root), 'cgroup_path')
        while p.is_relative_to(root):
            if all((p / n).is_file() for n in names):
                used, limit = ((p / n).read_text().strip() for n in names)
                if limit != 'max' and int(limit) < 2**60:
                    stats = dict(row.split() for row in (p / 'memory.stat').read_text().splitlines())
                    keys = ('total_inactive_file', 'total_active_file', 'total_dirty', 'total_writeback') if version == 1 else ('inactive_file', 'active_file', 'file_dirty', 'file_writeback')
                    require(all(k in stats and stats[k].isdigit() for k in keys), 'cgroup_stat_incomplete')
                    inactive, active, dirty, writeback = (int(stats[k]) for k in keys)
                    used, limit = int(used), int(limit)
                    # Dirty/writeback pages are not immediately reclaimable. Their
                    # overlap may make this estimate conservative, never looser.
                    reclaimable = min(used, max(0, inactive + active - dirty - writeback))
                    charged = used - reclaimable
                    groups.append(dict(version=version, pathSha256=hashlib.sha256(str(p).encode()).hexdigest(),
                                       usageBytes=used, limitBytes=limit, fileLruBytes=inactive+active,
                                       dirtyBytes=dirty, writebackBytes=writeback,
                                       reclaimableFileBytes=reclaimable, chargedBytes=charged,
                                       headroomBytes=limit-charged))
            if p == root:
                break
            p = p.parent
    require(bool(groups), 'cgroup_limit_unavailable')
    return {'headroomBytes': min(g['headroomBytes'] for g in groups), 'groups': groups}


class Guard:
    def __init__(self, limits, volume, data=None, *, metrics=None, clock=time.monotonic):
        keys = ('maxSeconds', 'maxPinnedSeconds', 'maxWalBytes', 'minFreeBytes', 'minHostAvailableBytes', 'minCgroupHeadroomBytes', 'addressSpaceBytes')
        require(all(type(limits.get(k)) is int and limits[k] > 0 for k in keys), 'explicit_limits_required')
        self.limits, self.volume, self.data, self.clock = limits, volume, data, clock
        self.started, self.max_wal = clock(), 0
        self.pin_started, self.pinned_seconds, self.last_metrics = None, 0, None
        self.metrics = metrics or self.read_metrics

    def read_metrics(self):
        s = os.statvfs(self.volume)
        wal = sum((self.data / (n + '-wal')).stat().st_size for n in DATABASES
                  if self.data and (self.data / (n + '-wal')).exists())
        memory = cgroup_memory()
        return dict(free=s.f_bavail*s.f_frsize, host=host_memory(), cgroup=memory['headroomBytes'], wal=wal,
                    cgroupDetails=memory['groups'])

    def end_pins(self):
        if self.pin_started is not None:
            self.pinned_seconds = self.clock() - self.pin_started
            self.pin_started = None

    def __call__(self):
        require(self.clock() - self.started <= self.limits['maxSeconds'], 'time_limit')
        pinned = self.clock() - self.pin_started if self.pin_started is not None else self.pinned_seconds
        require(pinned <= self.limits['maxPinnedSeconds'], 'pinned_time_limit')
        m = self.metrics()
        self.last_metrics = m
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
    drop_target_cache(target)


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
    try:
        with closing(sqlite3.connect(file.as_uri()+'?mode=ro&immutable=1', uri=True)) as db:
            require(checked_query(db, 'PRAGMA integrity_check', guard) == [('ok',)], 'copy_integrity')
            require(checked_query(db, 'PRAGMA foreign_key_check', guard) == [], 'copy_foreign_keys')
            return counts(db, guard)
    finally:
        drop_target_cache(file)


def capture_paths(config):
    require(config.get('schema') == SCHEMA, 'configuration_schema')
    data = canonical(config['data'], private=True, outside_git=True)
    require(data.is_dir(), 'source_directory')
    output = destination(config['destination'], config['webRoots'])
    require(not output.is_relative_to(data) and not data.is_relative_to(output), 'separate_destination')
    for raw in config.get('trees', {}).values():
        root = canonical(raw)
        require(root.is_dir(), 'resource_tree')
        require(not output.is_relative_to(root) and not root.is_relative_to(output), 'separate_destination')
    for name in DATABASES:
        stamp(canonical(data / name, private=True))
        for suffix in ('-wal', '-shm', '-journal'):
            sidecar = data / (name + suffix)
            if sidecar.exists() or sidecar.is_symlink():
                require(canonical(sidecar).is_file(), 'regular_file')
    for name, raw in config.get('files', {}).items():
        child(output, name)
        require(not name.startswith('data/') and name != RECEIPT, 'reserved_resource_path')
        stamp(canonical(raw))
    for raw in config.get('hashOnly', {}).values():
        stamp(canonical(raw, private=True))
    return data, output


def preflight(config, *, metrics=None, clock=time.monotonic):
    """Read paths/stat/metrics and pinned small files; never connect to SQLite."""
    data, output = capture_paths(config)
    guard = Guard(config['limits'], output.parent, data, metrics=metrics, clock=clock)
    guard()
    # Full recursive catalogue inventory belongs to capture, not this first check.
    for name, expected in config.get('expectedHashes', {}).items():
        require(name in config.get('files', {}), 'preflight_pin_requires_explicit_file')
        require(sha_file(canonical(config['files'][name]), guard) == expected, 'expected_resource_changed')
    for name, expected in config.get('expectedHashOnly', {}).items():
        require(name in config.get('hashOnly', {}) and
                sha_file(canonical(config['hashOnly'][name]), guard) == expected, 'expected_configuration_changed')
    require(os.name != 'posix' or (hasattr(os, 'posix_fadvise') and hasattr(os, 'POSIX_FADV_DONTNEED')), 'cache_advice_unavailable')
    return dict(phase='preflight', readOnly=True, databasesOpened=0, pathsCreated=0,
                destination=str(output), uid=os.getuid() if hasattr(os, 'getuid') else None,
                sourceFiles=[dict(file=n, bytes=(data / n).stat().st_size,
                                  mode=oct((data / n).stat().st_mode & 0o777)) for n in DATABASES],
                sourceDirectoryMode=oct(data.stat().st_mode & 0o777),
                metrics=guard.last_metrics, limits=config['limits'],
                timeoutExecutable=os.access('/usr/bin/timeout', os.X_OK),
                ioniceExecutable=os.access('/usr/bin/ionice', os.X_OK),
                appCgroupRelation='not-established-by-this-check')


def capture(config, *, metrics=None, clock=time.monotonic, hooks=None):
    data, output = capture_paths(config)
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
    inventory_seconds = clock() - guard.started
    sources, monitors, before_ids, source_counts, progress_syncs = {}, {}, {}, {}, {}
    opened_at = clock()
    with ExitStack() as stack:
        stack.callback(guard.end_pins)  # Registered first: runs after every DB closes.
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
        guard.pin_started = pin_started
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
            page_size = source.execute('PRAGMA page_size').fetchone()[0]
            last_synced_bytes = 0
            progress_syncs[name] = 0
            def progress(status, remaining, total):
                nonlocal last_synced_bytes
                guard()
                require(status not in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED), 'source_busy')
                copied_bytes = (total - remaining) * page_size
                if copied_bytes - last_synced_bytes >= DATABASE_SYNC_BYTES:
                    # SQLite may still hold its own small page cache. This bounds
                    # accumulated target writeback, without committing its backup
                    # transaction or touching source DBs or global kernel settings.
                    sync_target(target)
                    progress_syncs[name] += 1
                    last_synced_bytes = copied_bytes
                    guard()
            with closing(sqlite3.connect(target)) as copied:
                source.backup(copied, pages=128, progress=progress, sleep=0)
                copied.execute('PRAGMA journal_mode=DELETE')
            target.chmod(0o600)
            sync_target(target)
        require(all(stamp(data / n)[:2] == identity for n, identity in before_ids.items()), 'source_replaced')
    readers_seconds = clock() - opened_at
    guard()
    verification_started = clock()
    # Release all live readers before expensive integrity/hash checks or file copies.
    for name in DATABASES:
        require(check_db(output / 'data' / name, guard) == source_counts[name], 'copy_counts')
    for name, (source, _, expected) in resources.items():
        target = child(output, name)
        copy_file(source, target, guard)
        require(sha_file(target, guard, private_copy=True) == expected, 'resource_copy_changed')
    require(resource_inventory(config, guard) == resources, 'resource_changed')
    require({name: sha_file(canonical(raw), guard) for name, raw in config.get('hashOnly', {}).items()} == hash_only, 'configuration_changed')
    files = [{'file': p.relative_to(output).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha_file(p, guard, private_copy=True)}
             for p in sorted(output.rglob('*')) if p.is_file()]
    receipt = dict(schema=SCHEMA, createdAt=datetime.now(timezone.utc).isoformat(),
                   data=str(data), sourceReadOnly=True, liveRuntimeLockTaken=False,
                   method='sqlite-backup-pinned-wal-read-transactions', pinMilliseconds=round(pin_ms, 3),
                   dataVersionsBefore=before, dataVersionsAfter=after, counts=source_counts,
                   databaseSyncIntervalBytes=DATABASE_SYNC_BYTES, databaseProgressSyncs=progress_syncs,
                   limits=config['limits'], maxWalBytes=guard.max_wal, elapsedSeconds=round(clock()-guard.started, 3),
                   phaseSeconds=dict(inventory=round(inventory_seconds, 3), readersOpen=round(readers_seconds, 3),
                                     pinned=round(guard.pinned_seconds, 3),
                                     verificationAndResources=round(clock()-verification_started, 3)),
                   hashOnly=hash_only, files=files, resourceGitMetadataExcluded=True)
    write_new(output / RECEIPT, receipt)
    sync_dir(output)
    return {'phase': 'capture', 'destination': str(output), 'receiptSha256': sha_file(output / RECEIPT, private_copy=True),
            'files': len(files), 'bytes': sum(r['bytes'] for r in files),
            'elapsedSeconds': receipt['elapsedSeconds'], 'phaseSeconds': receipt['phaseSeconds'], 'maxWalBytes': guard.max_wal}


def verify(snapshot, expected_sha, guard=lambda: None):
    root = canonical(snapshot, private=True, outside_git=True)
    require(sha_file(canonical(root / RECEIPT), guard, private_copy=True) == expected_sha, 'receipt_changed')
    receipt = json.loads((root / RECEIPT).read_text(encoding='utf-8'))
    drop_target_cache(root / RECEIPT)
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
        require(file.is_file() and file.stat().st_size == row['bytes'] and sha_file(file, guard, private_copy=True) == row['sha256'], 'snapshot_hash')
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
    parser.add_argument('phase', choices=('preflight', 'capture', 'restore'))
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
    result = {'preflight': preflight, 'capture': capture, 'restore': restore}[args.phase](config)
    result['peakRssBytes'] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        code = error.code if isinstance(error, SnapshotFailure) else 'address_space_limit' if isinstance(error, MemoryError) else 'snapshot_failed'
        print(json.dumps({'error': code}), file=sys.stderr)
        sys.exit(1)
