#!/usr/bin/env python3
"""Install a verified CDR source update from a private staging directory.

Run as the existing Plesk app owner. No network/mount/authentication changes.
The adjacent manifest.json pins both current files and every payload file.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def atomic_copy(src, dst, mode=0o644):
    fd, name = tempfile.mkstemp(prefix='.cdr-update-', dir=str(dst.parent))
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(src.read_bytes())
            f.flush()
            os.fsync(f.fileno())
        os.chmod(name, mode)
        os.replace(name, dst)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['check', 'apply', 'rollback'])
    ap.add_argument('--app', required=True)
    ap.add_argument('--python', required=True)
    ap.add_argument('--node', default='/opt/plesk/node/24/bin/node')
    a = ap.parse_args()
    os.umask(0o077)
    stage = Path(__file__).resolve().parent
    app = Path(a.app).resolve()
    assert os.getuid() != 0 and app.stat().st_uid == os.getuid(), 'Run as existing app owner'
    assert app.name == 'gravuru-cdr-mcp' and stage.parent == app.parent / 'private'
    manifest = json.loads((stage / 'manifest.json').read_text())
    for name, sha in manifest['payload'].items():
        assert Path(name).name == name and digest(stage / 'payload' / name) == sha, name
    backup = stage / 'rollback'
    marker = stage / 'CHECKED.json'
    receipt = stage / 'APPLIED.json'
    if a.mode == 'rollback':
        assert receipt.exists(), 'No applied update'
        for name in manifest['install']:
            assert digest(app / name) == manifest['payload'][name], 'App changed since update: ' + name
        before = json.loads((backup / 'before.json').read_text())
        for name in manifest['install']:
            dst = app / name
            if before[name] is None:
                # Keep the new module beside the rollback receipt, rather than deleting it.
                os.replace(dst, backup / ('added-' + name))
            else:
                assert digest(backup / name) == before[name]['sha256']
                atomic_copy(backup / name, dst, before[name]['mode'])
        (app / 'tmp').mkdir(exist_ok=True)
        (app / 'tmp' / 'restart.txt').touch()
        print(json.dumps({'rolledBack': True, 'sourceFilesUntouched': True}))
        return
    for name, sha in manifest['expected'].items():
        p = app / name
        assert (not p.exists()) if sha is None else (p.is_file() and digest(p) == sha), 'Unexpected installed file: ' + name
    if a.mode == 'check':
        testdir = stage / 'preflight'
        testdir.mkdir(exist_ok=True)
        for name in manifest['payload']:
            shutil.copy2(stage / 'payload' / name, testdir / name)
        shutil.copy2(app / 'cdr_engine.py', testdir / 'cdr_engine.py')
        env = dict(os.environ)
        env['PATH'] = str(Path(a.python).parent) + os.pathsep + env.get('PATH', '')
        env['CDR_MCP_QUIET'] = '1'
        with (stage / 'preflight.log').open('w') as out:
            tests = sorted(p.name for p in testdir.glob('*.test.mjs'))
            assert tests, 'No test files in payload'
            result = subprocess.run([a.node, '--test', *tests], cwd=str(testdir), env=env, stdout=out, stderr=subprocess.STDOUT, timeout=120)
        assert result.returncode == 0, 'Preflight failed; inspect preflight.log'
        marker.write_text(json.dumps({'manifestSha256': digest(stage / 'manifest.json')}))
        print(json.dumps({'preflight': 'passed', 'testFiles': tests, 'appChanged': False}))
        return
    assert json.loads(marker.read_text())['manifestSha256'] == digest(stage / 'manifest.json')
    assert not backup.exists() and not receipt.exists(), 'Update already staged/applied'
    backup.mkdir(mode=0o700)
    before = {}
    for name in manifest['install']:
        p = app / name
        before[name] = None
        if p.exists():
            shutil.copy2(p, backup / name)
            before[name] = {'sha256': digest(p), 'mode': p.stat().st_mode & 0o777}
    (backup / 'before.json').write_text(json.dumps(before))
    done = []
    try:
        # The dependency is installed first; the importing server module comes last.
        for name in manifest['install']:
            atomic_copy(stage / 'payload' / name, app / name)
            done.append(name)
        receipt.write_text(json.dumps({'commit': manifest['commit'], 'appliedAt': datetime.now(timezone.utc).isoformat(), 'after': {n: digest(app / n) for n in manifest['install']}, 'configChanged': False, 'networkChanged': False}, indent=2))
        (app / 'tmp').mkdir(exist_ok=True)
        (app / 'tmp' / 'restart.txt').touch()
    except Exception:
        for name in reversed(done):
            if before[name] is not None:
                atomic_copy(backup / name, app / name, before[name]['mode'])
            elif (app / name).exists():
                os.replace(app / name, backup / ('added-' + name))
        raise
    print(json.dumps({'installed': manifest.get('version', '1.1.0'), 'backupComplete': True, 'configChanged': False, 'networkChanged': False}))


if __name__ == '__main__':
    main()
