"""Package/verify/extract one complete static demo. No network or host activation."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import zipfile

SCHEMA = 'gravuru-mobile-demo/v1'
MAX_TOTAL = 512 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_digest(filename):
    result = hashlib.sha256()
    with open(filename, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def safe_name(name):
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9_-][A-Za-z0-9_./-]*', name):
        raise ValueError('Invalid archive path')
    parts = name.split('/')
    if any(not part or part.startswith('.') or part in ('.', '..') for part in parts):
        raise ValueError('Invalid archive path')
    if str(PurePosixPath(name)) != name:
        raise ValueError('Non-canonical archive path')
    return name


def read_manifest(raw, expected_sha):
    if digest(raw) != expected_sha:
        raise ValueError('Manifest SHA mismatch')
    value = json.loads(raw)
    if value.get('schema') != SCHEMA or value.get('checkout') is not False:
        raise ValueError('Not a completed demo manifest')
    if not re.fullmatch(r'/konfi-demo/[a-z0-9][a-z0-9-]{3,79}/', value.get('namespace', '')):
        raise ValueError('Invalid demo namespace')
    files = value.get('files')
    if not isinstance(files, dict) or not files or len(files) > 10000:
        raise ValueError('Invalid manifest file list')
    total = 0
    folded = set()
    for name, proof in files.items():
        safe_name(name)
        if name == 'MANIFEST.json' or name.lower() in folded:
            raise ValueError('Duplicate manifest filename')
        folded.add(name.lower())
        if not isinstance(proof, dict) or type(proof.get('bytes')) is not int or proof['bytes'] < 0 or not re.fullmatch(r'[a-f0-9]{64}', proof.get('sha256', '')):
            raise ValueError('Invalid manifest proof')
        total += proof['bytes']
    if total > MAX_TOTAL:
        raise ValueError('Demo exceeds archive size limit')
    return value


def source_file(root, relative):
    filename = root.joinpath(*safe_name(relative).split('/'))
    current = root
    for part in relative.split('/'):
        current = current / part
        if current.is_symlink():
            raise ValueError('Symlink in package source')
    filename.resolve(strict=True).relative_to(root)
    if not filename.is_file():
        raise ValueError('Package entry is not a regular file')
    return filename


def verify_bytes(data, proof, name):
    if len(data) != proof['bytes'] or digest(data) != proof['sha256']:
        raise ValueError('File SHA mismatch: ' + name)


def inspect_archive(filename, expected_zip_sha, expected_manifest_sha, extract=None):
    if file_digest(filename) != expected_zip_sha:
        raise ValueError('ZIP SHA mismatch')
    output = None if extract is None else Path(extract).absolute()
    if output is not None and (output.exists() or output.is_symlink()):
        raise FileExistsError('Extraction destination already exists')
    with zipfile.ZipFile(filename, 'r') as archive:
        entries = archive.infolist()
        names = [safe_name(info.filename) for info in entries]
        if len(names) != len(set(names)) or len(names) != len(set(n.lower() for n in names)):
            raise ValueError('Duplicate ZIP entry')
        if names.count('MANIFEST.json') != 1:
            raise ValueError('Manifest missing from ZIP')
        by_name = {info.filename: info for info in entries}
        for info in entries:
            mode = info.external_attr >> 16
            if info.is_dir() or info.flag_bits & 1 or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG)):
                raise ValueError('Unsupported ZIP entry')
        if by_name['MANIFEST.json'].file_size > 2 * 1024 * 1024:
            raise ValueError('Manifest is too large')
        raw = archive.read('MANIFEST.json')
        manifest = read_manifest(raw, expected_manifest_sha)
        expected = set(manifest['files']) | {'MANIFEST.json'}
        if set(names) != expected:
            raise ValueError('ZIP entries do not exactly match manifest')
        for name, proof in manifest['files'].items():
            if by_name[name].file_size != proof['bytes']:
                raise ValueError('ZIP size differs from manifest')
            verify_bytes(archive.read(name), proof, name)
        # No extractall: every archive entry was checked before a new directory
        # is created, and each new file uses exclusive creation.
        if output is not None:
            output.mkdir(mode=0o700, parents=False, exist_ok=False)
            real_root = output.resolve(strict=True)
            for name in sorted(expected):
                target = output.joinpath(*name.split('/'))
                target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                target.parent.resolve(strict=True).relative_to(real_root)
                data = raw if name == 'MANIFEST.json' else archive.read(name)
                if name != 'MANIFEST.json':
                    verify_bytes(data, manifest['files'][name], name)
                with open(target, 'xb') as stream:
                    os.chmod(target, 0o600)
                    stream.write(data)
    if file_digest(filename) != expected_zip_sha:
        raise ValueError('ZIP changed during inspection')
    return {'schema': SCHEMA, 'namespace': manifest['namespace'], 'files': len(entries),
            'zipSha256': expected_zip_sha, 'manifestSha256': expected_manifest_sha,
            'extracted': output is not None}


def pack(directory, output, expected_manifest_sha):
    root = Path(directory).resolve(strict=True)
    raw = source_file(root, 'MANIFEST.json').read_bytes()
    manifest = read_manifest(raw, expected_manifest_sha)
    target = Path(output).absolute()
    if target.exists() or target.is_symlink():
        raise FileExistsError('ZIP already exists; no overwrite')
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if target.parent.resolve().is_relative_to(root):
        raise ValueError('ZIP output must be outside the input package')
    names = sorted([*manifest['files'], 'MANIFEST.json'])
    # Verify sources before creating the archive; source hashes are checked again
    # while adding each file, so an in-progress source change fails closed.
    for name, proof in manifest['files'].items():
        verify_bytes(source_file(root, name).read_bytes(), proof, name)
    with open(target, 'xb') as out:
        os.chmod(target, 0o600)
        with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=True) as archive:
            for name in names:
                data = raw if name == 'MANIFEST.json' else source_file(root, name).read_bytes()
                if name != 'MANIFEST.json':
                    verify_bytes(data, manifest['files'][name], name)
                info = zipfile.ZipInfo(name, date_time=(2026, 11, 7, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o600) << 16
                archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    result = inspect_archive(target, file_digest(target), expected_manifest_sha)
    result.update({'output': str(target), 'bytes': target.stat().st_size})
    return result


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command', required=True)
    package = commands.add_parser('pack')
    package.add_argument('--directory', required=True)
    package.add_argument('--output', required=True)
    package.add_argument('--manifest-sha256', required=True)
    for operation in ('verify', 'extract'):
        command = commands.add_parser(operation)
        command.add_argument('--zip', required=True)
        command.add_argument('--zip-sha256', required=True)
        command.add_argument('--manifest-sha256', required=True)
        if operation == 'extract':
            command.add_argument('--output', required=True)
    args = parser.parse_args()
    if args.command == 'pack':
        result = pack(args.directory, args.output, args.manifest_sha256)
    else:
        result = inspect_archive(args.zip, args.zip_sha256, args.manifest_sha256,
                                 args.output if args.command == 'extract' else None)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
