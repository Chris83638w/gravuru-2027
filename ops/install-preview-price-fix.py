"""Only replace the two reviewed static editor modules, with private rollback."""
import pathlib, os, json, hashlib, zipfile, subprocess, time

P = pathlib.Path('/var/www/vhosts/gravuru-designwerkstatt.de/private')
S = P / 'gravuru-combined-id-20261022-v1'
D = P / 'gravuru-tier-operations-20261022'
PACKAGE = D / 'gravuru-preview-price-fix-v1.zip'
BACKUP = D / 'preview-price-before-v1'
EXPECTED = {
    'legacy': ('c10b4b897421a769f4809a2a5515dc87b613edc8cad352a8658da78a6cf13112', '96d7c897080a0c3fed63cea32661a5452a3afdcb2fcfe10b4c9cf1ca6c6a07c0'),
    'acryl': ('5a43141e43eecc4ffeb1f9856319ff4392b5fa13047d72f4caffb2d35e5cab53', '8b4edfca04ddbf5cfe724d8fcae9064bef21fad1d924d8bbc717cce26201f5c4'),
}
def sha(b): return hashlib.sha256(b).hexdigest()
def new(p, b):
    with p.open('xb') as f:
        f.write(b); f.flush(); os.fsync(f.fileno())
def main():
    assert os.getuid() == 10005 and os.getgid() == 1003
    os.umask(0o077)
    assert not BACKUP.exists(), 'Existing attempt: inspect its receipt, do not rerun'
    files=[]
    with zipfile.ZipFile(PACKAGE) as z:
        assert set(z.namelist()) == {'install.py','manifest.json','legacy/ux.mjs','acryl/ux.mjs'}
        assert z.testzip() is None
        for store, (before, after) in EXPECTED.items():
            target=S/store/'app/configurator/variant-m/ux.mjs'
            assert not target.is_symlink() and target.resolve().is_relative_to(S.resolve())
            original=target.read_bytes(); updated=z.read(store+'/ux.mjs')
            assert sha(original)==before, 'Concurrent source change: '+store
            assert sha(updated)==after
            files.append((store,target,original,updated,target.stat().st_mode & 0o777))
    BACKUP.mkdir(mode=0o700)
    for store,target,original,updated,mode in files:
        new(BACKUP/(store+'-before.mjs'),original)
        new(BACKUP/(store+'-after.mjs'),updated)
        subprocess.run(['/opt/plesk/node/24/bin/node','--check',str(BACKUP/(store+'-after.mjs'))],check=True,timeout=15)
    changed=[]
    try:
        for store,target,original,updated,mode in files:
            assert sha(target.read_bytes())==sha(original)
            temp=target.with_name('ux.preview-price-next-'+str(os.getpid())+'.mjs')
            new(temp,updated); os.chmod(temp,mode)
            assert sha(target.read_bytes())==sha(original)
            os.replace(temp,target); changed.append((store,target,original,updated,mode))
        assert all(sha(target.read_bytes())==sha(updated) for store,target,original,updated,mode in files)
        receipt={'applied':True,'at':time.time(),'files':[{ 'store':store,'before':sha(original),'after':sha(updated)} for store,target,original,updated,mode in files],
                 'databasesOpened':False,'shopifyChanged':False,'processRestarted':False}
        new(BACKUP/'APPLIED.json',json.dumps(receipt,indent=2).encode())
        print(json.dumps(receipt))
    except BaseException:
        for store,target,original,updated,mode in reversed(changed):
            assert sha(target.read_bytes())==sha(updated), 'Concurrent change prevents rollback'
            temp=target.with_name('ux.preview-price-rollback-'+str(os.getpid())+'.mjs')
            new(temp,original); os.chmod(temp,mode); os.replace(temp,target)
        raise
if __name__=='__main__': main()
