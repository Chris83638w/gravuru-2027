"""Install and boot a committed merchant ZIP in an isolated synthetic environment."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('archive',type=Path);p.add_argument('--report',type=Path,default=ROOT/'docs/releases/20261010/merchant-package-install.json');args=p.parse_args()
archive=args.archive.resolve();sha=hashlib.sha256(archive.read_bytes()).hexdigest()
with tempfile.TemporaryDirectory(prefix='gravuru-merchant-install-') as temporary:
 root=Path(temporary);fixture=root/'fixture';fixture.mkdir(mode=0o700);(fixture/'.synthetic-merchant-runtime').touch()
 environment=dict(os.environ)
 with (root/'fixture.log').open('w') as log:
  process=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/merchant-host.mjs'),str(fixture)],cwd=ROOT,env=environment,stdout=log,stderr=log)
  try:
   deadline=time.monotonic()+45
   while not (fixture/'ready.json').exists():
    if process.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed')
    time.sleep(.1)
  finally:process.terminate();process.wait(timeout=15)
 target=root/'installed';config=fixture/'merchant.json'
 result=subprocess.run(['python',str(ROOT/'ops/plesk/stage-merchant-release.py'),'--archive',str(archive),'--sha256',sha,'--target',str(target),'--config',str(config)],capture_output=True,text=True,check=True)
 receipt=json.loads(result.stdout)
 with socket.socket() as listener:listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
 environment.update(GRAVURU_SHOPIFY_CONFIG_FILE=str(config),GRAVURU_SHOPIFY_TEST_PORT=str(port))
 checks={}
 with (root/'runtime.log').open('w') as log:
  process=subprocess.Popen(['node','app.cjs'],cwd=target,env=environment,stdout=log,stderr=log)
  try:
   deadline=time.monotonic()+30
   while True:
    try:
     request=urllib.request.Request(f'http://127.0.0.1:{port}/werkstatt/kundenansicht/',headers={'Host':'merchant.example','X-Forwarded-Proto':'https'})
     with urllib.request.urlopen(request,timeout=2) as response:
      assert response.status==200 and b'customer-preview.mjs' in response.read();checks['installedCustomerPreview']=True
     break
    except (ConnectionError,urllib.error.URLError):
     if process.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Installed merchant did not start')
     time.sleep(.1)
   try:urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}/api/workshop/products',headers={'Host':'merchant.example','X-Forwarded-Proto':'https'}),timeout=5);raise AssertionError('Anonymous API unexpectedly open')
   except urllib.error.HTTPError as error:assert error.code==401;checks['anonymousApiDenied']=True
  finally:process.terminate();process.wait(timeout=15)
 receipt.update(isolatedRuntimeStarted=True,syntheticDataOnly=True,checks=checks,result='PASS')
 output=args.report;output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
