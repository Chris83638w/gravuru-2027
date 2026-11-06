"""Package committed runtime files only. No working tree data, secrets or databases."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SLATE_RUNTIME_FILES = [
    'scripts/lib/slate-review-gallery.mjs',
    'scripts/lib/slate-review-gallery-page.mjs',
    'scripts/lib/slate-review-catalog.mjs',
    'scripts/lib/slate-review-gallery-ui.js',
    'scripts/lib/slate-review-gallery.css',
    'scripts/lib/slate-review-comments.mjs',
    'scripts/lib/slate-review-comments-ui.js',
]


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def package(commit, destination, runtime='private-operator-test'):
    if runtime not in ['private-operator-test', 'shopify-merchant-test']:
        raise ValueError('Unknown runtime')
    commit = git('rev-parse', '--verify', commit + '^{commit}').decode().strip()
    version = '0.1.0-recovery.20261010+' + commit[:12]
    files = {}
    tree = git('ls-tree', '-rz', '--full-tree', commit, 'app', 'ops/plesk', *SLATE_RUNTIME_FILES)
    for item in tree.split(b'\0'):
        if not item:
            continue
        info, raw_path = item.split(b'\t', 1)
        mode, kind, object_id = info.decode().split()
        name = raw_path.decode()
        if mode != '100644' and mode != '100755' or kind != 'blob':
            raise ValueError('Only regular committed files may enter the package: ' + name)
        if name.endswith(('.test.mjs', '.test.py')):
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
    if 'ops/plesk/slate-review-runtime.mjs' in files:
        for required in SLATE_RUNTIME_FILES:
            if required not in files:
                raise ValueError('Required committed gallery file missing: ' + required)
    entry = 'merchant-app.cjs' if runtime == 'shopify-merchant-test' else 'app.cjs'
    installation = 'ops/plesk/MERCHANT-README.md' if runtime == 'shopify-merchant-test' else 'ops/plesk/README.md'
    if 'ops/plesk/' + entry not in files or installation not in files:
        raise ValueError('Required runtime entry or installation guide missing')
    files['app.cjs'] = ("require('./ops/plesk/" + entry + "');\n").encode()
    files['package.json'] = (json.dumps({'name': 'gravuru-2027-merchant-test' if runtime == 'shopify-merchant-test' else 'gravuru-2027-private-test', 'version': version, 'private': True,
        'type': 'module', 'engines': {'node': '>=24'}, 'scripts': {'start': 'node app.cjs',
        'plesk:prepare': 'node ops/plesk/prepare.mjs', 'plesk:check': 'node ops/plesk/check.mjs',
        'shopify:preflight': 'node ops/plesk/shopify-preflight.mjs',
        'plesk:merchant:prepare': 'node ops/plesk/merchant-manage.mjs prepare',
        'plesk:merchant:check': 'node ops/plesk/merchant-manage.mjs check'}}, indent=2) + '\n').encode()
    files['public/robots.txt'] = b'User-agent: *\nDisallow: /\n'
    files['INSTALLATION.md'] = files[installation]
    manifest = {'schema': 1, 'version': version, 'sourceCommit': commit, 'scope': runtime, 'shopifyConnected': False,
                'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(files.items())]}
    files['PACKAGE-MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    if destination.exists():
        raise ValueError('Output already exists; choose a new output path.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 10, 0, 0, 0))
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
    parser.add_argument('--runtime', choices=['private-operator-test', 'shopify-merchant-test'], default='private-operator-test')
    args = parser.parse_args()
    package(args.commit, args.output.resolve(), args.runtime)
