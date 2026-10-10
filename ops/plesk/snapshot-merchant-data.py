"""Create an offline, consistent private copy of all merchant SQLite databases."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sqlite3


def snapshot(config,destination):
 os.umask(0o077)
 for path in [config,destination]:
  if not path.is_absolute() or path.resolve()!=path or path.is_symlink():raise ValueError('Canonical private paths required')
  for parent in path.parents:
   if (parent/'.git').exists():raise ValueError('Private data must remain outside Git')
 if destination.exists() or not destination.parent.is_dir():raise ValueError('New private backup directory required')
 settings=json.loads(config.read_text())
 if settings.get('purpose')!='shopify-merchant-test-runtime':raise ValueError('Merchant configuration required')
 data=Path(settings['values']['GRAVURU_PRIVATE_DATA_DIR'])
 if data.resolve()!=data or data.is_symlink() or data.stat().st_mode&0o077:raise ValueError('Private merchant directory required')
 with (data/'.runtime.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  destination.mkdir(mode=0o700);files=[]
  for name in ['workshop.sqlite','profiles.sqlite','design-assets.sqlite']:
   source=data/name
   if source.is_symlink() or source.stat().st_mode&0o077:raise ValueError('Private database required')
   target=destination/name
   with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as original,sqlite3.connect(target) as copied:
    original.backup(copied)
    if copied.execute('PRAGMA quick_check').fetchall()!=[('ok',)]:raise ValueError('Backup integrity check failed')
   files.append({'file':name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'quickCheck':'ok'})
  receipt={'schema':'gravuru-merchant-private-snapshot/v1','runtimeLockHeld':True,'databases':files,'privateDataChanged':False}
  (destination/'SNAPSHOT.json').write_text(json.dumps(receipt,indent=2)+'\n');return receipt

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--config',type=Path,required=True);p.add_argument('--destination',type=Path,required=True);a=p.parse_args()
 print(json.dumps(snapshot(a.config,a.destination)))
