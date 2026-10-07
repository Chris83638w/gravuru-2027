"""Package committed runtime files only. No working tree data, secrets or databases."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def package(commit, destination):
    commit = git('rev-parse', '--verify', commit + '^{commit}').decode().strip()
    files = {}
    tree = git('ls-tree', '-rz', '--full-tree', commit, 'app', 'ops/plesk')
    for item in tree.split(b'\0'):
        if not item:
            continue
        info, raw_path = item.split(b'\t', 1)
        mode, kind, object_id = info.decode().split()
        name = raw_path.decode()
        if mode != '100644' and mode != '100755' or kind != 'blob':
            raise ValueError('Only regular committed files may enter the package: ' + name)
        if name.endswith('.test.mjs'):
            continue
        parts = PurePosixPath(name).parts
        if any(p in ['.git', '.local-data', 'node_modules', '__pycache__', '.preview'] or p.startswith('.env') for p in parts) or any(name.endswith(s) for s in ['.sqlite', '.sqlite-wal', '.sqlite-shm', '.log', '.pem', '.key']):
            raise ValueError('Private/generated file in runtime selection: ' + name)
        data = git('cat-file', 'blob', object_id)
        if b'-----BEGIN PRIVATE KEY-----' in data or b'-----BEGIN OPENSSH PRIVATE KEY-----' in data:
            raise ValueError('Key material must never enter the package')
        files[name] = data
    for required in ['ops/plesk/app.cjs', 'ops/plesk/README.md', 'app/workshop/design-zip.mjs', 'app/workshop/design-source-path.mjs']:
        if required not in files:
            raise ValueError('Required committed runtime file missing: ' + required)
    files['app.cjs'] = b"require('./ops/plesk/app.cjs');\n"
    files['package.json'] = (json.dumps({'name': 'gravuru-2027-private-test', 'version': '0.1.0', 'private': True,
        'type': 'module', 'engines': {'node': '>=24'}, 'scripts': {'start': 'node app.cjs',
        'plesk:prepare': 'node ops/plesk/prepare.mjs', 'plesk:check': 'node ops/plesk/check.mjs'}}, indent=2) + '\n').encode()
    files['public/robots.txt'] = b'User-agent: *\nDisallow: /\n'
    files['INSTALLATION.md'] = files['ops/plesk/README.md']
    manifest = {'schema': 1, 'sourceCommit': commit, 'scope': 'private-operator-test', 'shopifyConnected': False,
                'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(files.items())]}
    files['PACKAGE-MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    if destination.exists():
        raise ValueError('Output already exists; choose a new output path.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 7, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100600 << 16
            archive.writestr(info, data)
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
        for item in manifest['files']:
            assert hashlib.sha256(archive.read(item['path'])).hexdigest() == item['sha256']
    result = {'sourceCommit': commit, 'file': destination.name, 'bytes': destination.stat().st_size,
              'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'entries': len(files)}
    destination.with_suffix('.sha256').write_text(result['sha256'] + '  ' + destination.name + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', default='HEAD')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    package(args.commit, args.output.resolve())
