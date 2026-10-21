"""Activate a staged, verified merchant release while its private data lock is free.

The Plesk merchant site must be stopped first. Makes a private SQLite/code backup,
then atomically replaces ONLY that merchant site's entrypoint. Never edits the
legacy workshop, its data, Shopify, TLS, payment settings or global services.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import stat
import tarfile


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def private(path,directory=False):
    if not path.is_absolute() or path.resolve()!=path or path.is_symlink():raise ValueError('Canonical private path required')
    s=path.stat()
    if s.st_uid!=os.getuid() or s.st_mode&0o077 or (not stat.S_ISDIR(s.st_mode) if directory else not stat.S_ISREG(s.st_mode)):raise ValueError('Private ownership/permissions differ')
    for p in path.parents:
        if (p/'.git').exists():raise ValueError('Private files cannot be inside Git')


def activate(args):
    os.umask(0o077)
    root=args.root;release=args.release;config=args.config;backup=args.backup
    if root.name!='gravuru-2027-merchant' or root.resolve()!=root or root.is_symlink():raise ValueError('Only the separate merchant application may be activated')
    private(config);private(release,True)
    settings=json.loads(config.read_text())
    if settings.get('purpose')!='shopify-merchant-test-runtime' or settings['values']['GRAVURU_SHOPIFY_APP_ORIGIN']!='https://app-2027.gravuru-designwerkstatt.de':raise ValueError('Merchant target differs')
    data=Path(settings['values']['GRAVURU_PRIVATE_DATA_DIR']);private(data,True)
    manifest=json.loads((release/'PACKAGE-MANIFEST.json').read_text());receipt=json.loads((release/'STAGE-RECEIPT.json').read_text())
    if manifest['scope']!='shopify-merchant-test' or receipt['sourceCommit']!=manifest['sourceCommit'] or receipt['activated'] or not receipt['runtimeConfigurationChecked']:raise ValueError('Staged release missing')
    for item in manifest['files']:
        file=release/item['path']
        if not file.resolve().is_relative_to(release) or file.is_symlink() or digest(file)!=item['sha256']:raise ValueError('Staged source changed')
    entry=root/'app.cjs'
    if entry.is_symlink() or digest(entry)!=args.expected_entry_sha256:raise ValueError('Merchant entry changed since review')
    if backup.exists() or not backup.is_absolute() or backup.resolve()!=backup or not backup.parent.is_dir():raise ValueError('Fresh private backup directory required')
    for parent in backup.parents:
        if (parent/'.git').exists():raise ValueError('Backup must remain outside Git')
    with (data/'.runtime.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        backup.mkdir(mode=0o700)
        inventory=[]
        # Explicit display/code-only releases never migrate or write product data.
        # Keep the same lock, integrity checks and reversible entry/code backups.
        for name in ([] if args.code_only else ['workshop.sqlite','profiles.sqlite','design-assets.sqlite']):
            source=data/name;private(source)
            target=backup/name
            with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as original,sqlite3.connect(target) as copied:
                original.backup(copied)
                if copied.execute('PRAGMA quick_check').fetchall()!=[('ok',)]:raise ValueError('SQLite backup check failed')
            inventory.append({'file':name,'bytes':target.stat().st_size,'sha256':digest(target),'quickCheck':'ok'})
        shutil.copyfile(entry,backup/'previous-app.cjs');shutil.copyfile(config,backup/'previous-config.json')
        with tarfile.open(backup/'previous-runtime.tar.gz','w:gz') as archive:
            for file in sorted(root.rglob('*')):
                if file.is_symlink():raise ValueError('Unexpected symlink in merchant runtime')
                if file.is_file():archive.add(file,arcname=file.relative_to(root),recursive=False)
        wrapper="process.env.GRAVURU_SHOPIFY_CONFIG_FILE="+json.dumps(str(config))+";\nrequire("+json.dumps(str(release/'ops/plesk/merchant-app.cjs'))+");\n"
        temp=root/('app.cjs.'+manifest['sourceCommit'][:12]+'.new')
        with temp.open('x') as out:out.write(wrapper);out.flush();os.fsync(out.fileno())
        # Recheck after backup. Never replace a concurrent deployment.
        if digest(entry)!=args.expected_entry_sha256:raise ValueError('Concurrent merchant deployment detected')
        os.replace(temp,entry)
        result={'schema':'gravuru-merchant-activation/v1','sourceCommit':manifest['sourceCommit'],'version':manifest['version'],
                'archiveSha256':receipt['archiveSha256'],'entrySha256':digest(entry),'previousEntrySha256':args.expected_entry_sha256,
                'sqliteBackups':inventory,'codeOnly':args.code_only,'runtimeBackupSha256':digest(backup/'previous-runtime.tar.gz'),
                'entryActivated':True,'serviceStarted':False,'shopifyChanged':False,'legacyWorkshopChanged':False}
        (backup/'ACTIVATION-RECEIPT.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['root','release','config','backup']:p.add_argument('--'+name,required=True,type=Path)
    p.add_argument('--expected-entry-sha256',required=True)
    p.add_argument('--code-only',action='store_true',help='No data migration: back up entry/config/code only; never modifies private databases')
    try:activate(p.parse_args())
    except Exception as error:raise SystemExit('Merchant activation stopped: '+str(error))
