"""Exercise the packaged upgrade twice on a private copy; all HTTP is intercepted."""
import hashlib,json,os,shutil,sqlite3,subprocess,sys,tempfile,zipfile
from pathlib import Path
archive,source,pricing_path,report=map(Path,sys.argv[1:])
os.umask(0o077)
with tempfile.TemporaryDirectory(prefix='gravuru-font-upgrade-') as temp:
 root=Path(temp);assert not any((p/'.git').exists() for p in [root,*root.parents])
 release=root/'release';private=root/'private';private.mkdir(mode=0o700)
 with zipfile.ZipFile(archive) as z:z.extractall(release)
 manifest=json.loads((release/'PACKAGE-MANIFEST.json').read_text())
 data=private/'data';backup=private/'backup';data.mkdir();backup.mkdir()
 inventory=[]
 for name in ['workshop.sqlite','profiles.sqlite','design-assets.sqlite']:
  for target in [data,backup]:shutil.copyfile(source/name,target/name);(target/name).chmod(0o600)
  inventory.append({'file':name,'sha256':hashlib.sha256((backup/name).read_bytes()).hexdigest()})
 (backup/'ACTIVATION-RECEIPT.json').write_text(json.dumps({'sourceCommit':manifest['sourceCommit'],'entryActivated':True,'sqliteBackups':inventory}))
 origin='https://app-2027.gravuru-designwerkstatt.de'
 (data/'.gravuru-shopify-merchant-test.json').write_text(json.dumps({'schema':1,'purpose':'shopify-merchant-test-data','origin':origin},separators=(',',':')))
 secret=private/'secret';secret.write_text('synthetic_secret_do_not_log')
 python=os.environ['GRAVURU_MERCHANT_TEST_PYTHON']
 config=private/'config.json';config.write_text(json.dumps({'schema':1,'purpose':'shopify-merchant-test-runtime','values':{'GRAVURU_SHOPIFY_APP_ORIGIN':origin,'GRAVURU_PRIVATE_DATA_DIR':str(data),'GRAVURU_SHOPIFY_CLIENT_SECRET_FILE':str(secret),'GRAVURU_SHOPIFY_PYTHON':python}}))
 shutil.copyfile(pricing_path,private/'pricing.json')
 preload=private/'mock.mjs';preload.write_text('''import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {prepareShopProduct} from '../release/app/workshop/shop-preparation.mjs';
import {parseStoredDocument} from '../release/app/workshop/product-document-resources.mjs';
const db=new DatabaseSync(new URL('./data/workshop.sqlite',import.meta.url).pathname,{readOnly:true});
const row=db.prepare("SELECT product_id,revision,document FROM product_revisions WHERE product_id='cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1' ORDER BY revision DESC LIMIT 1").get();
const document=parseStoredDocument(db,row.document,{tenantId:'gravuru'});db.close();
const plan=prepareShopProduct({id:row.product_id,revision:row.revision,document,status:'draft'});
const pricing=JSON.parse(fs.readFileSync(new URL('./pricing.json',import.meta.url))).product.pricing;
const variants=plan.variants.map(v=>({id:'gid://shopify/ProductVariant/'+Object.entries(pricing.variants).find(([,p])=>p===v.priceCents)[0],price:(v.priceCents/100).toFixed(2),product:{id:pricing.productId,status:'ACTIVE'},selectedOptions:document.config.profile.optionGroups.map(g=>({name:g.name,value:g.values.find(i=>i.id===v.options[g.id]).label}))}));
globalThis.fetch=async(url,options)=>{
 if(url==='https://gravuru-design.myshopify.com/admin/oauth/access_token')return Response.json({access_token:'synthetic_access_token_only',expires_in:3600,scope:'read_products'});
 if(url!=='https://gravuru-design.myshopify.com/admin/api/2026-07/graphql.json')throw Error('unexpected_network');
 const q=JSON.parse(options.body);if(!q.query.startsWith('query Gravuru')||q.query.includes('mutation'))throw Error('unexpected_mutation');
 const data={shop:{myshopifyDomain:'gravuru-design.myshopify.com',currencyCode:'EUR',plan:{partnerDevelopment:false}},currentAppInstallation:{app:{id:'gid://shopify/App/423276544001'},accessScopes:[{handle:'read_products'}]}};
 if(q.variables.ids)data.nodes=q.variables.ids.map(id=>variants.find(v=>v.id===id));else data.product={id:pricing.productId,status:'ACTIVE',onlineStoreUrl:null,pricing:{jsonValue:pricing}};
 return Response.json({data},{headers:{'x-shopify-api-version':'2026-07'}});
};
''')
 env=dict(os.environ,GRAVURU_SHOPIFY_CONFIG_FILE=str(config),GRAVURU_PYTHON=python)
 subprocess.run(['node','--input-type=module','-e',"import {build} from './app/configurator/variant-m/build.mjs';build();"],cwd=release,env=env,check=True,capture_output=True)
 command=['node','--import',str(preload),'ops/plesk/upgrade-memorial-font.mjs',str(backup)]
 outcomes=[]
 for expected in [False,True]:
  r=subprocess.run(command,cwd=release,env=env,capture_output=True,text=True)
  v=json.loads(r.stdout);assert r.returncode==0,v;assert v['alreadyApplied']==expected and v['variantBindings']==9 and v['previousRevisionPreserved'];outcomes.append(v)
 # Newer merchant edits must be preserved, never overwritten by a retry.
 subprocess.run(['node','--input-type=module','-e',"import {createProductRepository} from './app/workshop/repository.mjs';import {validateProductDocument} from './app/workshop/product-model.mjs';const r=createProductRepository({filename:process.argv[1],validateDocument:validateProductDocument});const p=r.get('cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1');p.document.name+=' test';r.save(p.id,p.document,p.revision);r.close();",str(data/'workshop.sqlite')],cwd=release,env=env,check=True,capture_output=True)
 r=subprocess.run(command,cwd=release,env=env,capture_output=True,text=True);v=json.loads(r.stdout);assert r.returncode==1 and v['reason']=='product_changed_since_backup',v
 result={'result':'PASS','sourceCommit':manifest['sourceCommit'],'isolatedPrivateCopy':True,'realNetworkRequests':0,'firstRun':outcomes[0],'secondRun':outcomes[1],'newerProductRevisionPreserved':True}
 report.parent.mkdir(parents=True,exist_ok=True);report.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
