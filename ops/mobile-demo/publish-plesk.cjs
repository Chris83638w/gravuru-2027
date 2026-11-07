'use strict';
// Prepared additive recipe. Importing this file never runs a publication.
// CLI requires an explicit flag; it never restarts an app or edits a router.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const VHOST='/var/www/vhosts/gravuru-designwerkstatt.de';
const EXPECTED=Object.freeze({
 helperSha256:'3dac4c30311a452c697348998fbd48e3c7a4af359324a647acffa181cb9972ec',
 startSha256:'42cd0a64f2e8e2a48761aefac2c0323990dbfe667517c88497eb03ca243852dd',
 preview22Sha256:'7ae7872b409b2e1e63c85f03f57822a8835ebf4da64872b1a565e4e594949087',
 preview30Sha256:'521d42fe10b0fb586ccf9e811b22603d9d9a924dcc2f1148bec7074c2f19f7b8'
});
const DEFAULTS=Object.freeze({
 publicRoot:VHOST+'/gravuru-2027-merchant/public',
 applicationRoot:VHOST+'/gravuru-2027-merchant',
 privateRoot:VHOST+'/private',
 python:VHOST+'/private/gravuru-2027-test-python311/bin/python',
 helper:path.join(__dirname,'archive.py'),
 previewRelative:'produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24'
});
const HTACCESS=`# Only this new demo directory. No parent/router/startup change.
<IfModule mod_mime.c>
  AddType text/javascript .mjs .js
  AddType text/css .css
  AddType application/json .json
  AddType image/webp .webp
  AddType image/svg+xml .svg
</IfModule>
<IfModule mod_headers.c>
  Header always set Cache-Control "no-store"
  Header always set X-Robots-Tag "noindex, nofollow, noarchive"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "no-referrer"
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/javascript text/css application/json image/svg+xml
</IfModule>
`;
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fileSha(file){const fd=fs.openSync(file,'r'),hash=crypto.createHash('sha256'),buffer=Buffer.alloc(1024*1024);try{for(let n;(n=fs.readSync(fd,buffer,0,buffer.length,null));)hash.update(buffer.subarray(0,n));return hash.digest('hex');}finally{fs.closeSync(fd);}}
const within=(root,file)=>{const p=path.relative(root,file);return p!==''&&!p.startsWith('..')&&!path.isAbsolute(p);};
function actualDirectory(directory){const absolute=path.resolve(directory);if(fs.lstatSync(absolute).isSymbolicLink()||!fs.statSync(absolute).isDirectory())throw Error('Real directory required: '+absolute);return fs.realpathSync(absolute);}
function plainFile(file){if(fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())throw Error('Regular source file required: '+file);return fs.realpathSync(file);}
function newDirectChild(root,name){if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name))throw Error('Unsafe new directory name');const result=path.join(root,name);if(fs.existsSync(result)||fs.lstatSync(root).isSymbolicLink())throw Error('Destination exists or parent changed: '+result);return result;}
function writePrivate(file,value){fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function publicInventory(root,{excludePrefix=null}={}){
 const inventory={};
 function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name),relative=path.relative(root,file).split(path.sep).join('/');if(excludePrefix&&(relative===excludePrefix.slice(0,-1)||relative.startsWith(excludePrefix)))continue;const stat=fs.lstatSync(file);if(stat.isSymbolicLink()){const target=fs.readlinkSync(file);inventory[relative]={type:'symlink',target,sha256:digest(target)};}else if(stat.isDirectory())walk(file);else if(stat.isFile())inventory[relative]={type:'file',bytes:stat.size,sha256:fileSha(file)};else throw Error('Unsupported public entry: '+relative);}}
 walk(root);return inventory;
}
function same(value,other){return JSON.stringify(value)===JSON.stringify(other);}
function runHelper(options,operation,output){
 const args=[options.helper,operation,'--zip',options.zip,'--zip-sha256',options.expected.zipSha256,'--manifest-sha256',options.expected.manifestSha256];if(output)args.push('--output',output);
 const result=cp.spawnSync(options.python,args,{encoding:'utf8',timeout:300000,maxBuffer:1024*1024,windowsHide:true});
 if(result.error||result.status!==0)throw Error('Archive verification/extraction failed: '+String(result.error?.message||result.stderr).slice(0,1200));
 const report=JSON.parse(result.stdout);if(report.namespace!==options.expected.namespace)throw Error('Archive namespace changed');return report;
}
function publishNewDemo(input={}){
 const options={...DEFAULTS,...input,expected:{...EXPECTED,...input.expected}};
 const expected=options.expected;if(!/^\/konfi-demo\/[a-z0-9][a-z0-9-]{3,79}\/$/.test(expected.namespace))throw Error('Invalid demo namespace');
 if(!options.zip||!expected.zipSha256||!expected.manifestSha256)throw Error('Explicit ZIP path, ZIP SHA, manifest SHA and namespace are required');
 for(const [key,value] of Object.entries(expected))if(key.endsWith('Sha256')&&!/^[a-f0-9]{64}$/.test(value))throw Error('Invalid SHA guard');
 const publicRoot=actualDirectory(options.publicRoot),privateRoot=actualDirectory(options.privateRoot),applicationRoot=actualDirectory(options.applicationRoot);
 if(within(publicRoot,privateRoot)||within(privateRoot,publicRoot)||privateRoot===publicRoot)throw Error('Public/private roots must be separate');
 const zip=plainFile(options.zip);if(!within(privateRoot,zip))throw Error('ZIP must be uploaded into private storage');options.zip=zip;
 const helper=plainFile(options.helper);if(fileSha(helper)!==expected.helperSha256)throw Error('Archive helper SHA changed');options.helper=helper;
 if(fileSha(zip)!==expected.zipSha256)throw Error('ZIP SHA changed');
 const backupPath=path.resolve(options.backup||path.join(privateRoot,expected.namespace.split('/')[2]+'-before-publication'));if(path.dirname(backupPath)!==privateRoot)throw Error('Backup must be a new direct private child');
 const backup=newDirectChild(privateRoot,path.basename(backupPath));
 const demoParent=path.join(publicRoot,'konfi-demo'),demoName=expected.namespace.split('/')[2],target=path.join(demoParent,demoName);
 if(fs.existsSync(demoParent)&&actualDirectory(demoParent)!==demoParent)throw Error('Demo parent is not the expected real directory');
 if(fs.existsSync(target))throw Error('Demo target exists; nothing will be overwritten');
 const sources={
  'start-r5.cjs':path.join(applicationRoot,'start-r5.cjs'),
  'app.cjs':path.join(applicationRoot,'app.cjs'),
  '22x14.html':path.join(publicRoot,options.previewRelative,'22x14.html'),
  '30x20.html':path.join(publicRoot,options.previewRelative,'30x20.html')
 };
 for(const [name,file] of Object.entries(sources)){const real=plainFile(file),base=name.endsWith('.cjs')?applicationRoot:publicRoot;if(!within(base,real))throw Error('Guard source escaped its root');sources[name]=real;}
 const sourceProof=()=>Object.fromEntries(Object.entries(sources).map(([name,file])=>[name,{bytes:fs.statSync(file).size,sha256:fileSha(file)}]));
 const beforeSources=sourceProof();
 for(const [name,required] of [['start-r5.cjs',expected.startSha256],['22x14.html',expected.preview22Sha256],['30x20.html',expected.preview30Sha256]])if(beforeSources[name].sha256!==required)throw Error('Existing host file changed: '+name);
 const archive=runHelper(options,'verify');
 const beforePublic=publicInventory(publicRoot),beforePublicSha=digest(JSON.stringify(beforePublic));
 if(input.apply!==true){
  if(!same(beforeSources,sourceProof()))throw Error('Host files changed during verification');
  return {schema:'gravuru-mobile-demo-publication-check/v1',action:'verify-only',namespace:expected.namespace,archive,sourceFiles:beforeSources,publicFiles:Object.keys(beforePublic).length,publicInventorySha256:beforePublicSha,plannedPrivateBackup:backup,plannedNewTarget:target,changesPerformed:0};
 }
 // This is the first write: a new private backup. Nothing public changes until
 // all copied originals, the extracted package and the preconditions re-check.
 fs.mkdirSync(backup,{mode:0o700});
 const saved=path.join(backup,'original-files');fs.mkdirSync(saved,{mode:0o700});
 for(const [name,file] of Object.entries(sources)){const destination=path.join(saved,name);fs.copyFileSync(file,destination,fs.constants.COPYFILE_EXCL);fs.chmodSync(destination,0o600);if(fileSha(destination)!==beforeSources[name].sha256)throw Error('Original changed while backing up: '+name);}
 writePrivate(path.join(backup,'BEFORE.json'),{schema:'gravuru-mobile-demo-publication-before/v1',publicRoot,namespace:expected.namespace,archive,sourceFiles:beforeSources,publicInventorySha256:beforePublicSha,publicInventory:beforePublic});
 const stage=path.join(backup,'validated-package');runHelper(options,'extract',stage);
 if(!same(beforeSources,sourceProof())||!same(beforePublic,publicInventory(publicRoot)))throw Error('Existing host changed before publication; private backup retained');
 const manifestBytes=fs.readFileSync(path.join(stage,'MANIFEST.json'));if(digest(manifestBytes)!==expected.manifestSha256)throw Error('Extracted manifest changed');const manifest=JSON.parse(manifestBytes);
 if(!fs.existsSync(demoParent)){fs.mkdirSync(demoParent,{mode:0o755});fs.chmodSync(demoParent,0o755);}
 if(actualDirectory(demoParent)!==demoParent||!within(publicRoot,demoParent))throw Error('Demo parent changed');
 // mkdir is exclusive: unlike directory rename, it never replaces an existing
 // empty directory. An interrupted new route remains incomplete, never retried
 // automatically over the top of an existing route.
 fs.mkdirSync(target,{mode:0o755});
 fs.chmodSync(target,0o755);
 if(actualDirectory(target)!==target)throw Error('Demo target changed');
 const directories=new Set([target]);
 for(const relative of Object.keys(manifest.files).sort()){
  const from=path.join(stage,...relative.split('/')),to=path.join(target,...relative.split('/'));if(!within(stage,from)||!within(target,to))throw Error('Validated path escaped');
  const parent=path.dirname(to);if(!directories.has(parent)){fs.mkdirSync(parent,{recursive:true,mode:0o755});if(!within(target,fs.realpathSync(parent)))throw Error('New directory escaped');directories.add(parent);}
  const proof=manifest.files[relative];if(fs.statSync(from).size!==proof.bytes||fileSha(from)!==proof.sha256)throw Error('Staged file changed: '+relative);
  fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);fs.chmodSync(to,0o644);if(fs.statSync(to).size!==proof.bytes||fileSha(to)!==proof.sha256)throw Error('Published copy differs: '+relative);
 }
 fs.writeFileSync(path.join(target,'.htaccess'),HTACCESS,{flag:'wx',mode:0o644});
 fs.writeFileSync(path.join(target,'MANIFEST.json'),manifestBytes,{flag:'wx',mode:0o644});
 fs.chmodSync(path.join(target,'.htaccess'),0o644);fs.chmodSync(path.join(target,'MANIFEST.json'),0o644);
 // mkdir mode is filtered by umask. Make only newly created demo directories
 // readable to the static web server, never alter permissions in the old tree.
 const setNewDirectoryModes=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Unexpected link in new route');if(entry.isDirectory()){fs.chmodSync(file,0o755);setNewDirectoryModes(file);}}};setNewDirectoryModes(target);
 const afterSources=sourceProof(),afterPublic=publicInventory(publicRoot,{excludePrefix:expected.namespace.slice(1)});
 const unchanged=same(beforeSources,afterSources)&&same(beforePublic,afterPublic);
 const report={schema:'gravuru-mobile-demo-publication/v1',namespace:expected.namespace,zipSha256:expected.zipSha256,manifestSha256:expected.manifestSha256,files:Object.keys(manifest.files).length+1,additionalNewFiles:{'.htaccess':{sha256:digest(HTACCESS),bytes:Buffer.byteLength(HTACCESS)}},privateBackup:backup,originalFilesUnchanged:same(beforeSources,afterSources),oldPublicInventoryUnchanged:same(beforePublic,afterPublic),beforePublicInventorySha256:beforePublicSha,afterPublicInventorySha256:digest(JSON.stringify(afterPublic)),verified:unchanged,restart:false,routerChanged:false,shopWrites:0,databaseWrites:0};
 writePrivate(path.join(backup,'AFTER.json'),report);
 if(!unchanged)throw Error('Existing files changed during publication; investigate AFTER.json. No existing file was restored or overwritten.');
 return report;
}
module.exports={EXPECTED,DEFAULTS,HTACCESS,publishNewDemo,publicInventory,fileSha};
if(require.main===module){
 try{
  const args={},allowed=new Set(['zip','zip-sha256','manifest-sha256','namespace','backup']);let apply=false;
  for(let i=2;i<process.argv.length;i++){
   if(process.argv[i]==='--publish-new-demo'){if(apply)throw Error('Duplicate publication flag');apply=true;continue;}
   const key=process.argv[i].replace(/^--/,'');if(!process.argv[i].startsWith('--')||!allowed.has(key)||Object.hasOwn(args,key)||!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw Error('Unknown, missing or duplicate argument');args[key]=process.argv[++i];
  }
  console.log(JSON.stringify(publishNewDemo({apply,zip:args.zip,...(args.backup?{backup:args.backup}:{}),expected:{namespace:args.namespace,zipSha256:args['zip-sha256'],manifestSha256:args['manifest-sha256']}})));
 }catch(error){console.error('DEMO_PUBLICATION_ABORTED '+error.message);process.exitCode=1;}
}
