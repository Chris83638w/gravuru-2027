"""Install a versioned editor in the existing isolated stage-one directory."""
from base64 import b64encode
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from http.client import HTTPSConnection
import gzip
import json
from pathlib import Path
import shlex
import subprocess
import sys

here = Path(__file__).resolve().parent
commit = '921928f41a7d61e73b504400728f2f6f629e8ade'
root = '/konfi-demo/prio-claude-stufe1-267/'
host = 'app-2027.gravuru-designwerkstatt.de'
manifest = json.loads((here/'manifest.json').read_text())
previous = {name:record['sha256'] for name,record in json.loads((here.parent/'manifest.json').read_text())['files'].items()}
before = previous['prio.html']
assert before == '189d1e64e67e5290c038ac603c0b25f66819067a24f2a79bb6902df42e6a40e1'
assert manifest['commit'] == commit and manifest['path']==root+'r921928f4/'
assert len(sys.argv)==3, 'Aufruf: python release.py stage|activate|rollback <Bauordner>'
action = sys.argv[1]
build = Path(sys.argv[2]).resolve(strict=True)
assert action in ('stage','activate','rollback')
files = {name:info['sha256'] for name,info in manifest['files'].items()}
packet={'action':action,'files':files,'previous':previous}
if action=='stage':
    packet['data']={}
    for name,digest in files.items():
        data=(build/'public'/name).read_bytes()
        assert digest==sha256(data).hexdigest()
        packet['data'][name]=b64encode(gzip.compress(data,mtime=0)).decode()

def public_check(test):
    path,digest=test
    conn=HTTPSConnection(host,timeout=40)
    try:
        conn.request('GET',path,headers={'Cache-Control':'no-cache','Accept-Encoding':'identity'})
        res=conn.getresponse()
        content=res.read()
        assert res.status==200 and sha256(content).hexdigest()==digest,path
        expected='text/html' if path.endswith('.html') else ('text/javascript','application/javascript')
        assert res.getheader('content-type','').startswith(expected),path
        return {'path':path,'sha256':digest,'bytes':len(content)}
    finally:
        conn.close()

def check_release():
    with ThreadPoolExecutor(max_workers=6) as pool:
        return list(pool.map(public_check,[(manifest['path']+n,h) for n,h in files.items()]))

# Verify that all new URLs are publicly served intact before changing the single entry.
if action=='activate':
    check_release()
program=r"""
import base64, fcntl, gzip, hashlib, json, os, re, sys, tempfile
from pathlib import Path
p=json.load(sys.stdin)
scope=Path.cwd()/'gravuru-2027-merchant/public/konfi-demo/prio-claude-stufe1-267'
release=scope/'r921928f4'
assert scope.resolve()==scope and scope.is_dir()
assert release.resolve()==release
pages={'editor.html','prio.html','shop-entry-page.js','shop-design-switch.js','pilot.js'}
assert all(len(p[k])==11 and pages<=set(p[k]) and all(n in pages or re.fullmatch(r'editor-[a-f0-9]{16}\.js',n) for n in p[k]) for k in ('files','previous'))
action=p['action']
assert action in ('stage','activate','rollback')
sha=lambda data:hashlib.sha256(data).hexdigest()
def read(file):
    assert file.resolve()==file and file.is_file(),str(file)
    return file.read_bytes()
def write(file,data,mode):
    assert file.resolve()==file
    with tempfile.NamedTemporaryFile(dir=file.parent,delete=False) as f:
        temporary=Path(f.name)
        try:
            f.write(data);f.flush();os.fchmod(f.fileno(),mode);os.fsync(f.fileno())
        except:
            temporary.unlink(missing_ok=True); raise
    try: os.replace(temporary,file)
    finally: temporary.unlink(missing_ok=True)
for n,h in p['previous'].items():
    if n!='prio.html': assert sha(read(scope/n))==h,n
old=p['previous']['prio.html']; new=p['files']['prio.html']
assert old=='189d1e64e67e5290c038ac603c0b25f66819067a24f2a79bb6902df42e6a40e1'
assert new!=old
if action=='stage': release.mkdir(mode=0o755,exist_ok=True)
assert release.is_dir() and release.resolve()==release
lock=release/'.install-lock'
assert lock.resolve()==lock
with lock.open('a+b') as handle:
    fcntl.flock(handle,fcntl.LOCK_EX)
    entry=scope/'prio.html'; backup=release/'.previous-entry'
    current=read(entry)
    assert sha(current) in (old,new)
    if action=='stage':
        assert set(p['data'])==set(p['files'])
        if not backup.exists():
            assert sha(current)==old
            write(backup,current,0o600)
        assert sha(read(backup))==old
        for n,h in p['files'].items():
            data=gzip.decompress(base64.b64decode(p['data'][n],validate=True))
            assert 100<len(data)<2500000 and sha(data)==h
            target=release/n
            if target.exists(): assert sha(read(target))==h,n
            else: write(target,data,0o644)
    else:
        assert sha(read(backup))==old
        for n,h in p['files'].items(): assert sha(read(release/n))==h,n
        data=read(release/'prio.html') if action=='activate' else read(backup)
        if data!=current: write(entry,data,0o644)
    print(json.dumps({'entry':sha(read(entry)),'previous':sha(read(backup)),'operation':action}))
"""
ssh=['ssh','-o','BatchMode=yes','-F',str(Path.home()/'.ssh/gravuru-workshop.conf'),'gravuru-werkstatt']
answer=subprocess.run([*ssh,shlex.join(['/opt/alt/python311/bin/python3','-c',program])],
                      input=json.dumps(packet).encode(),capture_output=True,timeout=150)
if answer.returncode:
    raise SystemExit(answer.stderr.decode(errors='replace')[-650:])
remote=json.loads(answer.stdout)
checks=check_release()
checks.append(public_check((root+'prio.html',remote['entry'])))
checks.append(public_check((root+'editor-d64f43ea13aaac6a.js',previous['editor-d64f43ea13aaac6a.js'])))
assert remote['previous']==before
if action!='stage': assert remote['entry']==(files['prio.html'] if action=='activate' else before)
(build/('https-'+action+'.json')).write_text(json.dumps({'commit':commit,'bundle':manifest['bundleNames']['core'],'remote':remote,'checks':checks},indent=2)+'\n')
print('Geprüft',action,remote['entry'],manifest['bundleNames']['core'],len(checks),'HTTPS-Dateien')
