"""Test packaged offline activation and HTTP delivery in fresh synthetic private storage."""
import base64,hashlib,hmac,json,os,shutil,socket,subprocess,sys,tempfile,time,urllib.request,urllib.error,zipfile
from pathlib import Path
archive,report=map(Path,sys.argv[1:]);os.umask(0o077)
with tempfile.TemporaryDirectory(prefix='gravuru-orders-package-') as temp:
 root=Path(temp);assert not any((p/'.git').exists() for p in [root,*root.parents]);release=root/'release';private=root/'private';private.mkdir()
 with zipfile.ZipFile(archive) as z:z.extractall(release)
 manifest=json.loads((release/'PACKAGE-MANIFEST.json').read_text())
 secret='synthetic_private_secret_only';secret_file=private/'secret';secret_file.write_text(secret)
 config=private/'config.json';settings={'schema':1,'purpose':'shopify-merchant-test-runtime','values':{'GRAVURU_SHOPIFY_APP_ORIGIN':'https://app-2027.gravuru-designwerkstatt.de','GRAVURU_PRIVATE_DATA_DIR':str(private/'data'),'GRAVURU_SHOPIFY_CLIENT_SECRET_FILE':str(secret_file),'GRAVURU_SHOPIFY_PYTHON':os.environ['GRAVURU_MERCHANT_TEST_PYTHON']}};config.write_text(json.dumps(settings))
 env=dict(os.environ,GRAVURU_SHOPIFY_CONFIG_FILE=str(config));backup=private/'backup';backup.mkdir();shutil.copyfile(config,backup/'previous-config.json');(backup/'ACTIVATION-RECEIPT.json').write_text(json.dumps({'sourceCommit':manifest['sourceCommit'],'entryActivated':True}))
 def run(args):
  r=subprocess.run(args,cwd=release,env=env,capture_output=True,text=True,timeout=40);assert r.returncode==0,r.stdout[-1000:];return r.stdout
 run(['node','ops/plesk/merchant-manage.mjs','prepare'])
 results=[]
 for expected in [False,True]:
  v=json.loads(run(['node','ops/plesk/enable-order-webhook.mjs',str(backup)]));assert v['enabled'] and v['alreadyEnabled']==expected;results.append(v)
 enabled=config.read_bytes();changed=json.loads(enabled);alternate=private/'alternate-secret';alternate.write_text(secret);changed['values']['GRAVURU_SHOPIFY_CLIENT_SECRET_FILE']=str(alternate);config.write_text(json.dumps(changed))
 r=subprocess.run(['node','ops/plesk/enable-order-webhook.mjs',str(backup)],cwd=release,env=env,capture_output=True,text=True);assert r.returncode==1 and json.loads(r.stdout)['reason']=='concurrent_config_change';config.write_bytes(enabled)
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 env['GRAVURU_SHOPIFY_TEST_PORT']=str(port);url=f'http://127.0.0.1:{port}'
 host={'Host':'app-2027.gravuru-designwerkstatt.de','X-Forwarded-Proto':'https'}
 payload=json.dumps({'id':901,'test':True,'financial_status':'paid','currency':'EUR','line_items':[]}).encode();signed={**host,'Content-Type':'application/json','X-Shopify-Hmac-Sha256':base64.b64encode(hmac.new(secret.encode(),payload,hashlib.sha256).digest()).decode(),'X-Shopify-Shop-Domain':'gravuru-design.myshopify.com','X-Shopify-Api-Version':'2026-07','X-Shopify-Topic':'orders/paid','X-Shopify-Webhook-Id':'synthetic-package-order-901'}
 def request(path,headers,data=None):
  try:
   with urllib.request.urlopen(urllib.request.Request(url+path,headers=headers,data=data),timeout=5) as r:return r.status,r.read()
  except urllib.error.HTTPError as e:return e.code,e.read()
 for duplicate in [False,True]:
  with (private/'runtime.log').open('w') as log:
   process=subprocess.Popen(['node','app.cjs'],cwd=release,env=env,stdout=log,stderr=log)
   try:
    deadline=time.monotonic()+30
    while True:
     try:
      assert request('/werkstatt/',host)[0]==200;break
     except urllib.error.URLError:
      assert process.poll() is None and time.monotonic()<deadline,'startup_failed';time.sleep(.1)
    assert request('/api/workshop/orders',host)[0]==401
    assert request('/webhooks/shopify/orders-paid',host,b'{}')[0]==415
    status,body=request('/webhooks/shopify/orders-paid',signed,payload);assert status==200 and json.loads(body)['duplicate']==duplicate
   finally:process.terminate();process.wait(timeout=15)
 result={'result':'PASS','sourceCommit':manifest['sourceCommit'],'syntheticPrivateStorageOnly':True,'offlineEnable':results,'concurrentConfigPreserved':True,'merchantApiStillProtected':True,'signedDeliveryAccepted':True,'duplicateAfterRestart':True,'realShopifyOrder':False}
 report.parent.mkdir(parents=True,exist_ok=True);report.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
