"""Export committed source and selected evidence, without Git/private runtime data."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
def credential_content(data):
    # A source-code check containing a quoted marker is not itself a key block.
    return re.search(rb'(?m)^-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----\r?\n|\b(?:gh[pousr]_|shp(?:at|ca|pa|ss)_)[A-Za-z0-9]{24,}', data) is not None
SELECTED = ['app', 'ops', 'scripts', 'package.json', 'AGENTS.md', 'START_HERE.md', 'STATUS.md',
            'UMSETZUNGSPAKETE.md', 'NEUE-WERKSTATT-PLAN.md', 'MATERIALREFERENZEN.md',
            'README.md', 'LOKAL-STARTEN.md', 'QUELLEN-UND-START.md', 'QUELLEN-MANIFEST.json',
            'CLOUD-AKTUELL.md', 'CLOUD-EINRICHTUNG.md', 'CLOUD-HANDOVER.md',
            'CLOUD-SICHERUNG-PRUEFUNG.md', 'CLOUD-UEBERGABE.md', 'CLOUD-VALIDIERUNG-20261003.md',
            'CLOUD-SOURCE-COMPARISON.json', 'CLOUD-SOURCE-MANIFEST.json', 'cloud_setup.py',
            'G27-01-PRUEFUNG.md', 'G27-01-UEBERGABE.md', 'UEBERGABE-SOL-6.1.md',
            'KONFI-VERGLEICH-UND-AR.md', 'design-qa.md',
            'docs/reviews',
            'docs/dashboard-20261004/SHOPIFY-GEDENKTAFEL-20261009.md',
            'docs/dashboard-20261004/shopify-memorial-20261009',
            'docs/dashboard-20261004/SHOPIFY-HAENDLER-LAUFZEIT-20261009.md',
            'docs/dashboard-20261004/merchant-runtime-20261009',
            'docs/dashboard-20261004/SHOPIFY-ZUGRIFF-BESTAETIGT-20261009.md',
            'docs/dashboard-20261004/shopify-release-baseline-20261009',
            'docs/dashboard-20261004/SHOPIFY-VORPRUEFUNG-20261008.md',
            'docs/dashboard-20261004/shopify-preflight-20261008',
            'docs/dashboard-20261004/HTTPS-TESTABNAHME-20261007.md',
            'docs/dashboard-20261004/hosted-acceptance-20261007/report.json',
            'docs/dashboard-20261004/EXCEL-PROFILE-20261007.md']

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(commit, destination):
    commit = git('rev-parse', '--verify', commit + '^{commit}').decode().strip()
    files = {}
    for entry in git('ls-tree', '-rz', '--full-tree', commit, *SELECTED).split(b'\0'):
        if not entry:
            continue
        info, raw_name = entry.split(b'\t', 1)
        mode, kind, oid = info.decode().split()
        name = raw_name.decode()
        parts = PurePosixPath(name).parts
        if mode not in ['100644', '100755'] or kind != 'blob':
            raise ValueError('Non-regular source file: ' + name)
        if any(p in ['.git', '.local-data', '.test-output', 'node_modules', '__pycache__'] or p.startswith('.env') for p in parts) or name.endswith(('.sqlite', '.db', '.sqlite-wal', '.sqlite-shm', '.pem', '.key', '.log')):
            raise ValueError('Private/generated file selected: ' + name)
        data = git('cat-file', 'blob', oid)
        if credential_content(data):
            raise ValueError('Credential-shaped content needs review; file only: ' + name)
        files[name] = data
    brief = 'docs/reviews/CLAUDE-AUFTRAG-20261009.md'
    if brief not in files or 'ops/plesk/merchant-runtime.mjs' not in files:
        raise ValueError('Current review source missing')
    files['ZUERST-LESEN.md'] = files[brief]
    manifest = {'schema': 'gravuru-independent-review/v1', 'sourceCommit': commit,
                'scope': 'committed source, requirements and selected evidence; no server access',
                'claudeExecuted': False, 'independentReviewExecuted': False, 'uncommittedFilesIncluded': False,
                'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                          for name, data in sorted(files.items())]}
    files['REVIEW-MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    if destination.exists():
        raise ValueError('Output already exists')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 9, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100600 << 16
            archive.writestr(info, data)
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError('Archive verification failed')
        for item in manifest['files']:
            if hashlib.sha256(archive.read(item['path'])).hexdigest() != item['sha256']:
                raise ValueError('Source hash mismatch')
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix('.sha256').write_text(digest + '  ' + destination.name + '\n')
    print(json.dumps({'sourceCommit': commit, 'file': destination.name, 'bytes': destination.stat().st_size,
                      'sha256': digest, 'entries': len(files), 'claudeExecuted': False}))

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--commit', default='HEAD')
    p.add_argument('--output', required=True, type=Path)
    args = p.parse_args()
    build(args.commit, args.output.resolve())
