"""Install a verified operator package into NEW directories only; never deploy a service."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import stat
import subprocess
import sys
import zipfile


def fresh_path(value):
    p = Path(value)
    if not p.is_absolute() or str(p.resolve()) != str(p) or p.exists():
        raise ValueError('A new absolute path without symlinks is required: ' + str(p))
    if any(part in {'gravuru-werkstatt', 'httpdocs', 'public', 'webroot'} for part in p.parts):
        raise ValueError('Live/public locations are forbidden')
    for parent in p.parents:
        if (parent / '.git').exists():
            raise ValueError('Installation and private data must be outside Git')
    if not p.parent.is_dir():
        raise ValueError('Create the parent directory first: ' + str(p.parent))
    return p


def validated_archive(archive, digest):
    with archive.open('rb') as stream:
        actual = hashlib.file_digest(stream, 'sha256').hexdigest()
    if not re.fullmatch('[0-9a-f]{64}', digest) or actual != digest:
        raise ValueError('Archive SHA-256 mismatch')
    with zipfile.ZipFile(archive) as z:
        entries = z.infolist()
        names = [i.filename for i in entries]
        if len(names) != len(set(names)) or len(names) > 10000 or sum(i.file_size for i in entries) > 512 * 1024 * 1024:
            raise ValueError('Duplicate entries or archive limits exceeded')
        for i in entries:
            p = PurePosixPath(i.filename)
            mode = i.external_attr >> 16
            if p.is_absolute() or '..' in p.parts or '\\' in i.filename or str(p) != i.filename or not stat.S_ISREG(mode):
                raise ValueError('Unsafe archive entry')
            if any(part in {'.git', '.local-data', 'node_modules', '__pycache__'} or part.startswith('.env') for part in p.parts) or p.suffix in {'.db', '.sqlite', '.key', '.pem'}:
                raise ValueError('Private/generated archive entry')
        manifest = json.loads(z.read('PACKAGE-MANIFEST.json'))
        if manifest['scope'] != 'private-operator-test' or manifest['shopifyConnected'] is not False:
            raise ValueError('This installer requires the separate operator-test package')
        records = manifest['files']
        if len({v['path'] for v in records}) != len(records) or set(names) != {v['path'] for v in records} | {'PACKAGE-MANIFEST.json'}:
            raise ValueError('Manifest file set mismatch')
        for item in records:
            raw = z.read(item['path'])
            if len(raw) != item['bytes'] or hashlib.sha256(raw).hexdigest() != item['sha256']:
                raise ValueError('Manifest hash mismatch: ' + item['path'])
        if not re.fullmatch('[0-9a-f]{40}', manifest['sourceCommit']) or not manifest.get('version'):
            raise ValueError('Missing immutable source version')
        return manifest


def install(args):
    os.umask(0o077)
    archive = args.archive.resolve(strict=True)
    manifest = validated_archive(archive, args.sha256)
    target, private = fresh_path(args.target), fresh_path(args.private_root)
    if target == private or target in private.parents or private in target.parents:
        raise ValueError('Application and private directories must be separate')
    # Validate before any filesystem mutation. The application repeats these checks.
    from urllib.parse import urlsplit
    url = urlsplit(args.origin)
    if url.scheme != 'https' or args.origin != 'https://' + url.netloc or url.username or url.password or not re.fullmatch('[a-z0-9.-]+', url.hostname or '') or '.' not in url.hostname or url.hostname in {'gravuru-designwerkstatt.de', 'www.gravuru-designwerkstatt.de', 'gravuru.highspeed.cloud'}:
        raise ValueError('A separate HTTPS test origin is required')
    node, npm = shutil.which('node'), shutil.which('npm')
    if not node or not npm or int(subprocess.check_output([node, '--version'], text=True).strip().split('.')[0][1:]) < 24:
        raise ValueError('Node.js 24+ and npm are required')
    python = str(Path(args.python).resolve(strict=True))
    subprocess.run([python, '-c', 'import sys,ctypes; assert sys.version_info >= (3,11); ctypes.CDLL("libcairo.so.2")'], check=True)
    target.mkdir(mode=0o700)
    private.mkdir(mode=0o700)
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            p = target / name
            p.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with p.open('xb') as f:
                f.write(z.read(name))
    values = {'GRAVURU_TEST_ORIGIN': args.origin, 'GRAVURU_PRIVATE_DATA_DIR': str(private / 'data'),
              'GRAVURU_TEST_PYTHON_DIR': str(private / 'python'), 'GRAVURU_BOOTSTRAP_PYTHON': python,
              'GRAVURU_TEST_USERNAME': 'gravuru-test', 'GRAVURU_TEST_PASSWORD': secrets.token_urlsafe(36)}
    config = private / 'config.json'
    config.write_text(json.dumps({'schema': 1, 'purpose': 'private-test-runtime', 'values': values}, indent=2) + '\n')
    env = {k: v for k, v in os.environ.items() if not k.startswith('GRAVURU_') and k != 'PYTHONPATH'}
    env['GRAVURU_TEST_CONFIG_FILE'] = str(config)
    if args.wheelhouse:
        env.update(PIP_NO_INDEX='1', PIP_FIND_LINKS=str(args.wheelhouse.resolve(strict=True)))
    log = private / 'install.log'
    with log.open('w') as out:
        for command in [[npm, 'run', 'plesk:prepare'], [npm, 'run', 'plesk:check']]:
            subprocess.run(command, cwd=target, env=env, stdout=out, stderr=subprocess.STDOUT, check=True, timeout=1000)
    receipt = {'schema': 'gravuru-install/v1', 'version': manifest['version'], 'sourceCommit': manifest['sourceCommit'],
               'archiveSha256': args.sha256, 'filesVerified': len(manifest['files']), 'prepared': True,
               'serverStarted': False, 'liveSystemChanged': False, 'shopifyConnected': False}
    (private / 'INSTALL-RECEIPT.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({**receipt, 'application': str(target), 'privateConfig': str(config)}, indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--archive', type=Path, required=True)
    p.add_argument('--sha256', required=True)
    p.add_argument('--target', required=True)
    p.add_argument('--private-root', required=True)
    p.add_argument('--origin', required=True)
    p.add_argument('--python', default=sys.executable)
    p.add_argument('--wheelhouse', type=Path)
    try:
        install(p.parse_args())
    except Exception as error:
        print('Installation stopped: ' + str(error) + '. Newly created directories are retained for diagnosis; existing paths are never overwritten.', file=sys.stderr)
        sys.exit(1)
