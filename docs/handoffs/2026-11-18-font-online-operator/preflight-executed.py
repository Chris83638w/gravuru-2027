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


