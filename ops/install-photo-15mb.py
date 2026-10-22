"""Hash-guarded update of two static editors and their subprocess photo worker.

No database, Shopify change or Node restart. Caller verifies the archive hash.
"""
import pathlib, os, json, hashlib, zipfile, subprocess, time
P = pathlib.Path('/var/www/vhosts/gravuru-designwerkstatt.de/private')
S = P / 'gravuru-combined-id-20261022-v1'
D = P / 'gravuru-tier-operations-20261022'
PACKAGE = D / 'gravuru-photo-15mb-v1.zip'
BACKUP = D / 'photo-15mb-before-v1'
PYTHON = str(P / 'gravuru-2027-test-python311/bin/python')
EXPECTED = {
 ('legacy','app/configurator/variant-m/ux.mjs'): 'afb6913dbba94039cdcd9f7f988d8ad49057ba61d5b5e536c06053c0e12a83c3',
 ('acryl','app/configurator/variant-m/ux.mjs'): 'ce8a67af166134158bcda55821b7c620114ce14c5023f59f61b1a4f824d85ac8',
 ('legacy','app/workshop/photo-import.py'): 'dfc4784f7ed70b0b78e8e955879e273641a01e3eb86575bde055656f6c6d1e64',
 ('acryl','app/workshop/photo-import.py'): 'dfc4784f7ed70b0b78e8e955879e273641a01e3eb86575bde055656f6c6d1e64',
}
def sha(b): return hashlib.sha256(b).hexdigest()
def new(p,b):
    with p.open('xb') as f: f.write(b); f.flush(); os.fsync(f.fileno())

def main():
    assert os.getuid()==10005 and os.getgid()==1003
    os.umask(0o077)
    assert not BACKUP.exists(), 'Inspect existing attempt before retry'
    files=[]
    with zipfile.ZipFile(PACKAGE) as z:
        assert set(z.namelist())=={'install.py','manifest.json','photo-import.py','photo-import.test.py','legacy/ux.mjs','acryl/ux.mjs'}
        assert z.testzip() is None
        manifest=json.loads(z.read('manifest.json'))
        rows=manifest['files']
        assert manifest['schema']=='gravuru-photo-15mb/v1' and len(rows)==4
        assert {(r['store'],r['path']) for r in rows}==set(EXPECTED)
        for r in rows:
            target=S/r['store']/r['path']
            assert not target.is_symlink() and target.resolve().is_relative_to(S.resolve())
            original=target.read_bytes(); updated=z.read(r['member'])
            assert sha(original)==r['before']==EXPECTED[(r['store'],r['path'])], 'Concurrent source change'
            assert sha(updated)==r['after']
            files.append((r,target,original,updated,target.stat().st_mode & 0o777))
        BACKUP.mkdir(mode=0o700)
        for name in ('photo-import.py','photo-import.test.py'): new(BACKUP/name,z.read(name))
    for r,target,original,updated,mode in files:
        name=r['store']+'-'+target.name
        new(BACKUP/('before-'+name),original); new(BACKUP/('after-'+name),updated)
        if target.suffix=='.mjs':
            subprocess.run(['/opt/plesk/node/24/bin/node','--check',str(BACKUP/('after-'+name))],check=True,timeout=15)
        else: compile(updated,str(target),'exec')
    tests=subprocess.run([PYTHON,'-I',str(BACKUP/'photo-import.test.py')],capture_output=True,timeout=60)
    new(BACKUP/'preflight-tests.txt',tests.stdout+tests.stderr)
    print((tests.stdout+tests.stderr).decode()[-700:])
    assert tests.returncode==0, 'Preflight failed; sources untouched'
    changed=[]
    try:
        # Workers first: existing browser tabs can save without losing a draft.
        for r,target,original,updated,mode in sorted(files,key=lambda f:f[1].suffix!='.py'):
            assert sha(target.read_bytes())==sha(original)
            temp=target.with_name(target.name+'.photo-15mb-next-'+str(os.getpid()))
            new(temp,updated); os.chmod(temp,mode)
            assert sha(target.read_bytes())==sha(original)
            os.replace(temp,target); changed.append((r,target,original,updated,mode))
        assert all(sha(t.read_bytes())==sha(u) for r,t,o,u,m in files)
        receipt={'schema':'gravuru-photo-15mb-install/v1','applied':True,'at':time.time(),'files':rows,'linuxTestsPassed':10,'privatePhotoTestSkipped':True,'databasesOpened':False,'shopifyChanged':False,'processRestarted':False}
        new(BACKUP/'APPLIED.json',json.dumps(receipt,indent=2).encode()); print(json.dumps(receipt))
    except BaseException:
        for r,target,original,updated,mode in reversed(changed):
            assert sha(target.read_bytes())==sha(updated), 'Concurrent change prevents rollback'
            temp=target.with_name(target.name+'.photo-15mb-rollback-'+str(os.getpid()))
            new(temp,original); os.chmod(temp,mode); os.replace(temp,target)
        raise
if __name__=='__main__': main()
