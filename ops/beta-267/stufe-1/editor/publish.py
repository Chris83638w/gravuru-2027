"""Install the standalone stage-one customer files in its own merchant demo directory."""
import base64
import concurrent.futures
import gzip
import hashlib
import http.client
import json
from pathlib import Path
import shlex
import subprocess

here = Path(__file__).resolve().parent
manifest = json.loads((here / 'manifest.json').read_text(encoding='utf-8'))
assert manifest['commit'] == 'a38c97014feeedba7238f4e55f851e80050bb754'
proof_file = here / 'public-proof.json'
previous = json.loads(proof_file.read_text(encoding='utf-8')) if proof_file.exists() else {}
sha = lambda data: hashlib.sha256(data).hexdigest()
files = {}
for name, info in manifest['files'].items():
    raw = (here / 'public' / name).read_bytes()
    assert info == {'bytes':len(raw), 'sha256':sha(raw)}
    files[name] = {'sha':sha(raw), 'old':previous.get(name),
                   'compressed':base64.b64encode(gzip.compress(raw, mtime=0)).decode()}

program = r"""
from pathlib import Path
import base64, gzip, hashlib, json, os, re, sys, tempfile
root = Path.cwd()/'gravuru-2027-merchant/public/konfi-demo'
assert root.is_dir() and root.resolve() == root
directory = root/'prio-claude-stufe1-267'
if not directory.exists(): directory.mkdir(mode=0o755)
assert directory.is_dir() and directory.resolve()==directory
packet = json.load(sys.stdin)
assert len(packet)==11
pages={'prio.html','editor.html','pilot.js','shop-entry-page.js','shop-design-switch.js'}
assert pages <= packet.keys()
assert all(name in pages or re.fullmatch(r'editor-[a-f0-9]{16}\.js',name) for name in packet)
assert all(file.name in packet and not file.is_symlink() for file in directory.iterdir())
sha = lambda b: hashlib.sha256(b).hexdigest()
output = {}
for name,item in packet.items():
    target = directory/name
    assert not target.is_symlink()
    data = gzip.decompress(base64.b64decode(item['compressed'],validate=True))
    assert 100 < len(data) < 2500000 and sha(data) == item['sha']
    if target.exists(): assert sha(target.read_bytes()) in (item['sha'], item['old'])
    output[name] = data
for name in sorted(output,key=lambda n: (n=='prio.html',n=='editor.html',n)):
    target = directory/name
    if target.exists() and target.read_bytes()==output[name]: continue
    with tempfile.NamedTemporaryFile(dir=directory,delete=False) as tmp:
        tmp.write(output[name]); tmp.flush(); os.fsync(tmp.fileno())
        os.fchmod(tmp.fileno(),0o644)
        ready = tmp.name
    os.replace(ready,target)
print(json.dumps({n:sha((directory/n).read_bytes()) for n in output}))
"""
ssh = ['ssh','-o','BatchMode=yes','-F',str(Path.home()/'.ssh/gravuru-workshop.conf'),'gravuru-werkstatt']
answer = subprocess.run([*ssh,shlex.join(['/opt/alt/python311/bin/python3','-c',program])],
                        input=json.dumps(files).encode(),capture_output=True,timeout=180)
if answer.returncode: raise RuntimeError(answer.stderr.decode(errors='replace')[-1200:])
actual = json.loads(answer.stdout)
assert actual == {n:f['sha'] for n,f in files.items()}
proof_file.write_text(json.dumps(actual,indent=2)+'\n',encoding='utf-8')

def check(name):
    conn = http.client.HTTPSConnection('app-2027.gravuru-designwerkstatt.de',timeout=45)
    try:
        conn.request('GET',manifest['path']+name,headers={'Cache-Control':'no-cache','Accept-Encoding':'identity'})
        resp = conn.getresponse()
        expected_type = 'text/html' if name.endswith('.html') else ('text/javascript','application/javascript')
        assert resp.status==200 and resp.getheader('Content-Type','').startswith(expected_type), (name,resp.status,resp.getheader('Content-Type'))
        assert sha(resp.read())==actual[name],name
    finally:
        conn.close()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(check,files))
print('Alle',len(actual),'Dateien öffentlich bytegenau und mit korrektem MIME-Typ bestätigt.')
