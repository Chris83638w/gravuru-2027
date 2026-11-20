"""Locally pinned Stage 1 release; only stage/apply/rollback write on the Merchant host."""
import argparse, base64, hashlib, json, shlex, subprocess, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
BASE='2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179'
NEXT='921928f41a7d61e73b504400728f2f6f629e8ade'
HOST_SHA='41deb4fef94767bf04c73b65fc93e332f6212e0417b21e3e2e26e0cf258131ee'
SOURCES=['app/configurator/variant-m/'+n+'.mjs' for n in ['adapter','design-adoption','lazy-resources','product-design-gallery']]+['app/workshop/ui/shop-design-switch.mjs']
def git(*args):
    return subprocess.check_output(['git','-C',str(REPO),*args])
def sha(data):
    return hashlib.sha256(data).hexdigest()

def report(proof, output):
    encoded=json.dumps(proof,indent=2,ensure_ascii=False)
    print(encoded)
    if output:
        output.write_text(encoded+'\n',encoding='utf-8')

p=argparse.ArgumentParser()
p.add_argument('action',choices=['local','inspect','stage','check','apply','rollback'])
p.add_argument('--checkout',type=Path,default=HERE,help='Git-Arbeitskopie mit beiden festgelegten Commits')
p.add_argument('--ergebnis',type=Path,help='JSON zusätzlich in die angegebene lokale Datei schreiben')
args=p.parse_args()
REPO=subprocess.check_output(['git','-C',str(args.checkout),'rev-parse','--show-toplevel']).decode().strip()
if git('merge-base',BASE,NEXT).decode().strip()!=BASE:
    raise SystemExit('Unbekannte Commit-Abstammung.')
app_files=git('diff','--name-only',BASE,NEXT,'--','app').decode().splitlines()
if set(n for n in app_files if not n.endswith('.test.mjs'))!=set(SOURCES):
    raise SystemExit('Geänderte Anwendungsquellen weichen von der geprüften Liste ab.')
content={n:git('show',NEXT+':'+n) for n in SOURCES}
program=(HERE/'host.py').read_bytes().replace(b'\r\n',b'\n')
if sha(program)!=HOST_SHA:
    raise SystemExit('Das Hostprogramm weicht vom geprüften Stand ab.')
compile(program,'host.py','exec')
if args.action=='local':
    report({'base':BASE,'commit':NEXT,'script':sha(program),'sources':{n:sha(data) for n,data in content.items()}},args.ergebnis)
    raise SystemExit

envelope={'action':args.action,'code':base64.b64encode(program).decode(),'codeSha':sha(program)}
if args.action=='stage':
    envelope['files']={n:base64.b64encode(data).decode() for n,data in content.items()}
runner="""import base64,hashlib,json,sys
request=json.load(sys.stdin)
code=base64.b64decode(request.pop('code'),validate=True)
if hashlib.sha256(code).hexdigest()!=request.pop('codeSha'):raise ValueError('Releaseprogramm beschädigt')
exec(compile(code,'stufe1-live.py','exec'),{'__name__':'__main__','REQUEST':request})
"""
remote=shlex.join(['/opt/alt/python311/bin/python3','-c',runner])
proc=subprocess.run(['ssh','-o','BatchMode=yes','-F',str(Path.home()/'.ssh/gravuru-workshop.conf'),'gravuru-werkstatt',remote],
                    input=json.dumps(envelope).encode(),capture_output=True,timeout=420)
if proc.returncode:
    print(proc.stderr.decode(errors='replace')[-1600:],file=sys.stderr)
    raise SystemExit(proc.returncode)
report(json.loads(proc.stdout),args.ergebnis)
