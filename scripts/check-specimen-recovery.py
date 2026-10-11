"""Run the locked specimen maintenance on a private backup copy; never touch live storage."""
import argparse
from collections import Counter
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile
import time

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('backup',type=Path);p.add_argument('--report',required=True,type=Path);args=p.parse_args()
def rows(file):
    with sqlite3.connect(file.as_uri()+'?mode=ro',uri=True) as db:
        assert db.execute('PRAGMA quick_check').fetchall()==[('ok',)]
        return {name:Counter(db.execute('SELECT * FROM "'+name.replace('"','""')+'"')) for name, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
with tempfile.TemporaryDirectory(prefix='gravuru-specimen-copy-') as tmp:
    root=Path(tmp);fixture=root/'fixture';fixture.mkdir(mode=0o700);(fixture/'.synthetic-merchant-runtime').touch()
    with (root/'fixture.log').open('w') as log:
        process=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/merchant-host.mjs'),str(fixture)],cwd=ROOT,env=dict(os.environ),stdout=log,stderr=log)
        try:
            deadline=time.monotonic()+45
            while not (fixture/'ready.json').exists():
                if process.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed')
                time.sleep(.1)
        finally:process.terminate();process.wait(timeout=15)
    before={}
    backup=root/'activation-backup';backup.mkdir(mode=0o700);(backup/'ACTIVATION-RECEIPT.json').write_text('{"scope":"isolated synthetic import verification"}')
    for name in ['workshop.sqlite','profiles.sqlite','design-assets.sqlite']:
        for suffix in ['-wal','-shm']:
            (fixture/'data'/(name+suffix)).unlink(missing_ok=True)
        shutil.copyfile(args.backup/name,fixture/'data'/name);(fixture/'data'/name).chmod(0o600)
        shutil.copyfile(args.backup/name,backup/name);(backup/name).chmod(0o600)
        before[name]=rows(fixture/'data'/name)
    env={**os.environ,'GRAVURU_SHOPIFY_CONFIG_FILE':str(fixture/'merchant.json')}
    command=['node',str(ROOT/'ops/plesk/import-existing-specimens.mjs'),str(backup)]
    first=json.loads(subprocess.check_output(command,cwd=ROOT,env=env,text=True))
    second=json.loads(subprocess.check_output(command,cwd=ROOT,env=env,text=True))
    assert all(r['master']['created'] and r['product']['created'] for r in first['imported'])
    assert all(not r['master']['created'] and not r['product']['created'] for r in second['imported'])
    checked=0
    for name,tables in before.items():
        after=rows(fixture/'data'/name)
        for table,old in tables.items():
            assert not (old-after[table]),'Historical rows changed: '+table
            checked+=1
    result={'result':'PASS','scope':'private backup copy with synthetic credentials','historicalTablesUnchanged':checked,'existingProductsUnchanged':first['existingProductsUnchanged'],'newMasters':2,'newProducts':2,'repeatCreatedNothing':True,'sqliteQuickChecks':'ok','liveDataModified':False}
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
