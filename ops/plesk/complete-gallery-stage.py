"""Verified private code/catalogue staging and append-only native import. No activation."""
import argparse,hashlib,json,os,shutil,sqlite3,stat,subprocess,zipfile
from pathlib import Path,PurePosixPath
from contextlib import closing
from datetime import datetime,timezone

ROOT=Path('/var/www/vhosts/gravuru-designwerkstatt.de')
STAGE=ROOT/'private/complete-gallery-20261107-v1'
ACTIVE=ROOT/'private/gesamtbestand-stage-0bb50565-20261106-v1'
DATA=ACTIVE/'data'
NODE='/opt/plesk/node/24/bin/node'
DATABASES=('design-assets.sqlite','profiles.sqlite','workshop.sqlite','review-comments.sqlite','review-approvals.sqlite')
def require(ok,message):
 if not ok:raise ValueError(message)
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as stream:
  for block in iter(lambda:stream.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def safe(root,name):
 p=PurePosixPath(name)
 require(name and not p.is_absolute() and '\\' not in name and ':' not in name and not any(ord(c)<32 for c in name) and all(x not in ('','..','.') for x in name.split('/')),'Unsafe archive path')
 out=root.joinpath(*p.parts)
 for item in (out,*out.parents):require(not item.is_symlink(),'Linked path')
 return out
def write(p,raw,durable=False):
 p.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
 with p.open('xb') as stream:
  stream.write(raw)
  if durable:stream.flush();os.fsync(stream.fileno())

def private_file(p):
 for item in (p,*p.parents):require(not item.is_symlink(),'Linked private path')
 s=p.stat();require(stat.S_ISREG(s.st_mode) and s.st_uid==os.getuid() and not s.st_mode&0o077,'Private regular file required')

def checked_archive(z,dest,rows,index_name):
 names=z.namelist()
 require(len(names)==len(set(names)) and set(names)==set(rows)|{index_name},'Archive inventory differs')
 # Verify every path/type/member before creating any output. Never materialize
 # links, special files, duplicate members or unchecked late archive entries.
 for entry in z.infolist():
  safe(dest,entry.filename)
  require(not entry.is_dir() and stat.S_IFMT(entry.external_attr>>16) in (0,stat.S_IFREG) and entry.file_size<300*1024**2,'Invalid archive member')
  raw=z.read(entry.filename)
  if entry.filename in rows:
   row=rows[entry.filename];require(len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256'],'Archive member differs')
 for name in names:write(safe(dest,name),z.read(name))
def extract_code(archive,dest,commit):
 with zipfile.ZipFile(archive) as z:
  manifest=json.loads(z.read('PACKAGE-MANIFEST.json'));rows={r['path']:r for r in manifest['files']}
  require(manifest['schema']==1 and manifest['sourceCommit']==commit and manifest['scope']=='private-operator-test' and manifest['shopifyConnected'] is False,'Wrong code release')
  require(len(rows)==len(manifest['files']),'Duplicate code inventory')
  checked_archive(z,dest,rows,'PACKAGE-MANIFEST.json')
 return manifest
def extract_addon(archive,dest):
 with zipfile.ZipFile(archive) as z:
  checks=json.loads(z.read('files-sha256.json'));rows={r['file']:r for r in checks}
  require(len(rows)==len(checks),'Duplicate catalogue inventory')
  checked_archive(z,dest,rows,'files-sha256.json')
 return len(rows)
def heads():
 with closing(sqlite3.connect((DATA/'workshop.sqlite').as_uri()+'?mode=ro',uri=True)) as db:
  return db.execute('SELECT tenant_id,id,revision,published_revision,archived FROM products ORDER BY tenant_id,id').fetchall()

def quote(name):return '"'+name.replace('"','""')+'"'

def row_hash(row):
 h=hashlib.sha256()
 for value in row:
  raw=value if isinstance(value,bytes) else str(value).encode('utf8')
  h.update(type(value).__name__.encode()+b':'+str(len(raw)).encode()+b':');h.update(raw)
 return h.hexdigest()

def preservation_snapshot(data):
 """Bounded per-row hashes; never retain document/photo/comment contents."""
 result={}
 for name in DATABASES:
  private_file(data/name)
  with closing(sqlite3.connect((data/name).as_uri()+'?mode=ro',uri=True)) as db:
   db.execute('BEGIN');tables={}
   for (table,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
    # Product heads may advance through the still-running old UI. Their current
    # revision is reported separately; the derived catalogue is rebuildable.
    if name=='workshop.sqlite' and table in ('products','product_catalog'):continue
    columns=list(db.execute('PRAGMA table_info('+quote(table)+')'))
    keys=[r[1] for r in sorted(columns,key=lambda r:r[5]) if r[5]]
    projection='*' if keys else 'rowid,*';key_positions=[next(i for i,r in enumerate(columns) if r[1]==key) for key in keys] if keys else [0]
    rows=[{'key':[row[i] for i in key_positions],'sha256':row_hash(row)} for row in db.execute('SELECT '+projection+' FROM '+quote(table))]
    tables[table]={'columns':[r[1] for r in columns],'keys':keys,'rows':rows}
   result[name]=tables
 return result

def verify_preservation(data,before):
 proof=[]
 for name,tables in before.items():
  count=0;added=0
  with closing(sqlite3.connect((data/name).as_uri()+'?mode=ro',uri=True)) as db:
   db.execute('BEGIN')
   for table,record in tables.items():
    require([r[1] for r in db.execute('PRAGMA table_info('+quote(table)+')')]==record['columns'],'Existing database schema changed')
    keys=record['keys'];projection='*' if keys else 'rowid,*'
    sql='SELECT '+projection+' FROM '+quote(table)+' WHERE '+' AND '.join(quote(key)+' IS ?' for key in (keys or ['rowid']))
    for row in record['rows']:
     current=db.execute(sql,row['key']).fetchone()
     require(current is not None and row_hash(current)==row['sha256'],'Existing database row changed or missing')
    total=db.execute('SELECT COUNT(*) FROM '+quote(table)).fetchone()[0];count+=len(record['rows']);added+=total-len(record['rows'])
  proof.append({'file':name,'preservedRows':count,'additionalRows':added})
 return {'passed':True,'databases':proof,'productHeadsReportedSeparately':True,'derivedProductCatalogueExcluded':True}
def main(args):
 require(os.getuid()==10005 and STAGE.is_dir() and (STAGE/'BACKUP.json').is_file(),'Private backup required')
 for directory in (STAGE,ACTIVE,DATA):
  for item in (directory,*directory.parents):require(not item.is_symlink(),'Linked staging path')
  require(directory.is_dir() and directory.stat().st_uid==os.getuid() and not directory.stat().st_mode&0o077,'Private staging directory required')
 for value,length in ((args.commit,40),(args.code_sha,64),(args.addon_sha,64)):
  require(len(value)==length and all(c in '0123456789abcdef' for c in value),'Pinned release digests required')
 code=ROOT/('gravuru-2027-complete-'+args.commit[:8]);addon=STAGE/'addon';base=STAGE/'base';gallery=STAGE/'gallery';mapping=STAGE/'staged-import.json'
 require(not any(p.exists() or p.is_symlink() for p in (code,addon,base,gallery,mapping,STAGE/'config.json',STAGE/'STAGE-READY.json',STAGE/'PRE-IMPORT.json',STAGE/'import.log',STAGE/'preflight.log',STAGE/'postflight.log')),'Fresh staging paths required')
 code_archive=STAGE/'code.zip';addon_archive=STAGE/'addon.zip'
 for file in (code_archive,addon_archive,STAGE/'BACKUP.json',ACTIVE/'config.json',DATA/'local-review-import.json'):private_file(file)
 require(sha(code_archive)==args.code_sha and sha(addon_archive)==args.addon_sha,'Archive digest differs')
 backup=json.loads((STAGE/'BACKUP.json').read_text())
 require(backup['schema']=='gravuru-complete-gallery-backup/v1' and backup['scope']=='private-gallery-only' and backup['shopifyWrites']==0,'Wrong backup scope')
 require(len(backup['databases'])==len(DATABASES) and {r['file'] for r in backup['databases']}==set(DATABASES),'Complete five-database backup required')
 for row in backup['databases']:
  file=safe(STAGE/'backup',row['file']);private_file(file)
  require(file.stat().st_size==row['bytes'] and sha(file)==row['sha256'],'Private backup digest differs')
 source=ACTIVE/'gallery-4';active_config_sha=sha(ACTIVE/'config.json');config=json.loads((ACTIVE/'config.json').read_text())
 require(config['schema']==1 and config['purpose']=='private-test-runtime' and config['values']['GRAVURU_TEST_ORIGIN']=='https://test-2027.gravuru-designwerkstatt.de' and config['values']['GRAVURU_PRIVATE_DATA_DIR']==str(DATA) and config['values']['GRAVURU_SLATE_REVIEW_PACKAGE']==str(source),'Wrong private site or active paths')
 require(shutil.disk_usage(ROOT).free>100*1024**3,'Insufficient staging storage')
 os.umask(0o077);print(json.dumps({'phase':'extract-verified-release'}),flush=True)
 manifest=extract_code(code_archive,code,args.commit);files=extract_addon(addon_archive,addon)
 index=json.loads((source/'files-sha256.json').read_text())
 require(sha(source/'manifest.json')==backup['baseManifestSha256'] and sha(source/'files-sha256.json')==sha(STAGE/'backup/gallery-files-sha256.json'),'Active gallery source changed')
 for r in [*index,{'file':'files-sha256.json','sha256':sha(source/'files-sha256.json'),'bytes':(source/'files-sha256.json').stat().st_size}]:
  incoming=safe(source,r['file']);require(incoming.stat().st_size==r['bytes'] and sha(incoming)==r['sha256'],'Base package changed')
  target=safe(base,r['file']);target.parent.mkdir(parents=True,exist_ok=True,mode=0o700);os.link(incoming,target)
 env={k:v for k,v in os.environ.items() if not k.startswith('GRAVURU_') and k not in ('NODE_OPTIONS','NODE_PATH','PYTHONPATH','PYTHONHOME')}
 env['GRAVURU_PYTHON']=str(ROOT/'private/gravuru-2027-test-python311/bin/python')
 # Module/build/configuration checks occur before the first native DB append.
 # Do not start either runtime and do not initialize/migrate any live database.
 preflight="await import('./ops/plesk/runtime.mjs');await import('./scripts/lib/slate-review-gallery.mjs');const {build}=await import('./app/configurator/variant-m/build.mjs');build();const {privateTestEnvironment,testConfig,verifyStorage}=await import('./ops/plesk/config.mjs');const c=testConfig(privateTestEnvironment(process.env));verifyStorage(c);const {verifySlateReviewDirectory}=await import('./ops/plesk/slate-review-runtime.mjs');verifySlateReviewDirectory(c);"
 with (STAGE/'preflight.log').open('xb') as log:
  result=subprocess.run([NODE,'--input-type=module','-e',preflight],cwd=code,env={**env,'GRAVURU_TEST_CONFIG_FILE':str(ACTIVE/'config.json')},stdout=log,stderr=subprocess.STDOUT)
 require(result.returncode==0,'Runtime/configuration preflight failed; see private preflight.log')
 config['values']['GRAVURU_SLATE_REVIEW_PACKAGE']=str(gallery)
 write(STAGE/'config.json',(json.dumps(config,indent=2)+'\n').encode(),durable=True)
 wrapper="process.env.GRAVURU_TEST_CONFIG_FILE="+json.dumps(str(STAGE/'config.json'))+";\nrequire('./ops/plesk/app.cjs');\n"
 require((code/'app.cjs').read_text()=="require('./ops/plesk/app.cjs');\n",'Unexpected startup wrapper')
 (code/'app.cjs').write_text(wrapper)
 code.chmod(0o755);(code/'public').chmod(0o755)
 for name in ('app.cjs','package.json','public/robots.txt'):(code/name).chmod(0o644)
 for row in manifest['files']:
  if row['path']!='app.cjs':require(sha(safe(code,row['path']))==row['sha256'],'Code changed during build')
 old_mapping=sha(DATA/'local-review-import.json');before=heads();preserved=preservation_snapshot(DATA)
 require(len(before)>=len(backup['heads']) and {(r[0],r[1]) for r in backup['heads']}.issubset({(r[0],r[1]) for r in before}),'A backed-up product is missing before import')
 write(STAGE/'PRE-IMPORT.json',(json.dumps({'mappingSha256':old_mapping,'heads':before,'preservation':preserved},separators=(',',':'))+'\n').encode(),durable=True)
 command=[NODE,'scripts/extend-design-review.mjs','--base',str(base),'--addon',str(addon),'--data',str(DATA),'--gallery-out',str(gallery),'--mapping-out',str(mapping)]
 print(json.dumps({'phase':'append-native-drafts','beforeProducts':len(before),'files':files}),flush=True)
 with (STAGE/'import.log').open('xb') as log:
  result=subprocess.run(command,cwd=code,env=env,stdout=log,stderr=subprocess.STDOUT)
 require(result.returncode==0,'Native import failed; see private import.log')
 require(sha(DATA/'local-review-import.json')==old_mapping and sha(ACTIVE/'config.json')==active_config_sha,'Active mapping or configuration changed during staging')
 preservation=verify_preservation(DATA,preserved)
 after=heads();byid={(r[0],r[1]):r for r in after};changed=[r[1] for r in before if byid.get((r[0],r[1]))!=r]
 require(all((r[0],r[1]) in byid for r in before),'Existing product missing')
 marker={'schema':1,'purpose':'slate-review-gallery','origin':config['values']['GRAVURU_TEST_ORIGIN']}
 write(gallery/'.gravuru-slate-review.json',(json.dumps(marker,separators=(',',':'))+'\n').encode())
 # Activation will atomically install only this mapping while the private app is stopped.
 postflight="import fs from 'node:fs';const {privateTestEnvironment,testConfig,verifyStorage,verifyDirectory,markerValue}=await import('./ops/plesk/config.mjs');const c=testConfig(privateTestEnvironment(process.env));verifyStorage(c);verifyDirectory(c.slateReviewPackage,'.gravuru-slate-review.json',markerValue(c,'slate-review-gallery'));const {validateSlateReviewMapping}=await import('./ops/plesk/slate-review-runtime.mjs');validateSlateReviewMapping(JSON.parse(fs.readFileSync(c.slateReviewPackage+'/manifest.json')),JSON.parse(fs.readFileSync(process.argv[1])));"
 with (STAGE/'postflight.log').open('xb') as log:
  result=subprocess.run([NODE,'--input-type=module','-e',postflight,str(mapping)],cwd=code,env={**env,'GRAVURU_TEST_CONFIG_FILE':str(STAGE/'config.json')},stdout=log,stderr=subprocess.STDOUT)
 require(result.returncode==0,'Staged mapping/configuration check failed; see private postflight.log')
 pack=json.loads((gallery/'manifest.json').read_text())
 proof={'schema':'gravuru-complete-gallery-stage/v1','createdAtUtc':datetime.now(timezone.utc).isoformat(),'sourceCommit':args.commit,'ready':not changed,'activationReviewRequired':bool(changed),'code':str(code),'gallery':str(gallery),'config':str(STAGE/'config.json'),'mapping':str(mapping),'mappingSha256':sha(mapping),'beforeMappingSha256':old_mapping,'configSha256':sha(STAGE/'config.json'),'activeConfigSha256':active_config_sha,'galleryManifestSha256':sha(gallery/'manifest.json'),'wrapperSha256':sha(code/'app.cjs'),'beforeProducts':len(before),'afterProducts':len(after),'concurrentlyChangedExistingHeads':changed,'preservation':preservation,'backupVerified':True,'runtimeImportsAndBuildVerified':True,'stagedMappingVerified':True,'counts':pack['counts'],'codeArchiveSha256':args.code_sha,'addonArchiveSha256':args.addon_sha,'activated':False,'shopifyWrites':0}
 write(STAGE/'STAGE-READY.json',(json.dumps(proof,indent=2)+'\n').encode(),durable=True);print(json.dumps(proof),flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--commit',required=True);p.add_argument('--code-sha',required=True);p.add_argument('--addon-sha',required=True);main(p.parse_args())
