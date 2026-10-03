"""Materialize the verified current source into a NEW directory. No uploads/deploys.
Usage: python3 cloud_setup.py --output /tmp/gravuru-2027-fresh
Run beside the transport ZIP and the four immutable reference ZIPs.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import zipfile

ARCHIVE = 'Gravuru-2027-Quellstand-20261003.zip'
EXPECTED = '87a5476f3ee6c192c894e7ad4c91cf9baaffac50614d7fabb8b96ab034e672a6'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def safe_name(name):
    p = PurePosixPath(name)
    if p.is_absolute() or not p.parts or any(x in ('..', '.', '') for x in p.parts) or '\\' in name or ':' in name:
        raise ValueError('Unsafe archive path')
    return p

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    target = args.output.resolve()
    if target.exists():
        raise SystemExit('Target exists; use a fresh directory, no files were changed')
    archive = source / ARCHIVE
    if sha(archive.read_bytes()) != EXPECTED:
        raise SystemExit('Transport checksum mismatch')
    with zipfile.ZipFile(archive) as z:
        manifest = json.loads(z.read('CLOUD-SOURCE-MANIFEST.json'))
        items = manifest['files']
        names = [x['path'] for x in items]
        members = z.infolist()
        if len(names) != len(set(names)) or len(members) != len(set(x.filename for x in members)):
            raise ValueError('Duplicate archive path')
        if set(x.filename for x in members) != set(names) | {'CLOUD-SOURCE-MANIFEST.json'}:
            raise ValueError('Unexpected archive members')
        for member in members:
            safe_name(member.filename)
            if stat.S_ISLNK(member.external_attr >> 16):
                raise ValueError('Symlink refused')
        for item in items:
            data = z.read(item['path'])
            if len(data) != item['bytes'] or sha(data) != item['sha256']:
                raise ValueError('Source checksum mismatch: ' + item['path'])
        refs = json.loads(z.read('QUELLEN-MANIFEST.json'))['archives']
        for ref in refs:
            safe_name(ref['path'])
            data = (source / ref['path']).read_bytes()
            if len(data) != ref['bytes'] or sha(data) != ref['sha256']:
                raise ValueError('Reference checksum mismatch: ' + ref['path'])
        target.mkdir(parents=True, exist_ok=False)
        for item in items:
            dest = target / item['path']
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(z.read(item['path']))
        for ref in refs:
            dest = target / ref['path']
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / ref['path'], dest)
        (target / 'CLOUD-SOURCE-MANIFEST.json').write_bytes(z.read('CLOUD-SOURCE-MANIFEST.json'))
    comparisons = [{'path':item['path'], 'status':'IDENTISCH' if sha((target/item['path']).read_bytes()) == item['sha256'] else 'ABWEICHEND'} for item in items]
    report = {'transportSha256':EXPECTED, 'sourceCommit':manifest['sourceCommit'],
              'files':len(items), 'identical':sum(x['status']=='IDENTISCH' for x in comparisons),
              'references':len(refs), 'comparison':comparisons,
              'scope':'Source restore only. No private database, customer data, secrets or cloud-runtime proof included.'}
    (target/'CLOUD-SOURCE-COMPARISON.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='comparison'}))

if __name__ == '__main__':
    main()
