"""Verify and stage a merchant release in a new directory; never switch a service."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import zipfile

spec=importlib.util.spec_from_file_location('archive_installer',Path(__file__).with_name('install-archive.py'))
installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)

def stage(args):
    os.umask(0o077)
    archive=args.archive.resolve(strict=True)
    manifest=installer.validated_archive(archive,args.sha256,'shopify-merchant-test')
    target=installer.fresh_path(str(args.target))
    config=args.config.resolve(strict=True)
    if config != args.config or config.is_symlink() or config.stat().st_mode & 0o077:
        raise ValueError('Private existing merchant configuration required')
    values=json.loads(config.read_text())
    if values.get('schema')!=1 or values.get('purpose')!='shopify-merchant-test-runtime':
        raise ValueError('Not a merchant configuration')
    target.mkdir(mode=0o700)
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            file=target/name;file.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
            with file.open('xb') as out:out.write(z.read(name))
    environment={k:v for k,v in os.environ.items() if not k.startswith('GRAVURU_') and k!='PYTHONPATH'}
    environment['GRAVURU_SHOPIFY_CONFIG_FILE']=str(config)
    for command in [[args.node,'app/configurator/variant-m/build.mjs'],[args.node,'ops/plesk/merchant-manage.mjs','check']]:
        result=subprocess.run(command,cwd=target,env=environment,capture_output=True,text=True,timeout=90)
        if result.returncode:raise ValueError('Staged build/runtime check failed (exit '+str(result.returncode)+')')
    receipt={'schema':'gravuru-merchant-stage/v1','sourceCommit':manifest['sourceCommit'],'version':manifest['version'],
             'archiveSha256':args.sha256,'filesVerified':len(manifest['files']),'built':True,'runtimeConfigurationChecked':True,
             'privateDataChanged':False,'activated':False}
    (target/'STAGE-RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--archive',required=True,type=Path);p.add_argument('--sha256',required=True)
    p.add_argument('--target',required=True,type=Path);p.add_argument('--config',required=True,type=Path)
    p.add_argument('--node',default='node')
    try:stage(p.parse_args())
    except Exception as error:raise SystemExit('Merchant staging stopped: '+str(error))
