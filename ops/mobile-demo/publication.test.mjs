import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{publishNewDemo,publicInventory,EXPECTED}=require('./publish-plesk.cjs');
const here=path.dirname(fileURLToPath(import.meta.url)),helper=path.join(here,'archive.py');
const python=process.env.GRAVURU_PYTHON||(process.platform==='win32'?path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'):'python3');
const sha=value=>createHash('sha256').update(value).digest('hex');
function command(args){const r=spawnSync(python,args,{encoding:'utf8',windowsHide:true});return {status:r.status,out:r.stdout,error:r.stderr};}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-demo-publication-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const app=path.join(root,'application'),pub=path.join(app,'public'),priv=path.join(root,'private'),source=path.join(root,'package');
 for(const dir of [pub,priv,source])fs.mkdirSync(dir,{recursive:true});
 const write=(base,relative,text)=>{const file=path.join(base,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return file;};
 const start='original startup',appSource='original application',old22='original 22x14 HTML',old30='original 30x20 HTML';
 write(app,'start-r5.cjs',start);write(app,'app.cjs',appSource);write(pub,'old-preview/22x14.html',old22);write(pub,'old-preview/30x20.html',old30);write(pub,'existing/keep.txt','untouched');
 const files={'index.html':'<html>Demo only</html>','_bundle/editor.mjs':'export default "original renderer";'};
 for(const [name,text] of Object.entries(files))write(source,name,text);
 const namespace='/konfi-demo/mobile-test-r4/',manifest={schema:'gravuru-mobile-demo/v1',namespace,checkout:false,files:Object.fromEntries(Object.entries(files).map(([name,text])=>[name,{bytes:Buffer.byteLength(text),sha256:sha(text)}]))};
 const manifestBytes=JSON.stringify(manifest),manifestSha=sha(manifestBytes);write(source,'MANIFEST.json',manifestBytes);
 const zip=path.join(priv,'demo.zip'),packed=command([helper,'pack','--directory',source,'--output',zip,'--manifest-sha256',manifestSha]);assert.equal(packed.status,0,packed.error);
 const zipSha=sha(fs.readFileSync(zip)),expected={namespace,zipSha256:zipSha,manifestSha256:manifestSha,helperSha256:sha(fs.readFileSync(helper)),startSha256:sha(start),preview22Sha256:sha(old22),preview30Sha256:sha(old30)};
 return {root,source,app,pub,priv,zip,zipSha,manifestSha,namespace,manifest,options:{applicationRoot:app,publicRoot:pub,privateRoot:priv,zip,helper,python,backup:path.join(priv,'new-private-backup'),previewRelative:'old-preview',expected},target:path.join(pub,'konfi-demo/mobile-test-r4')};
}
test('default is verification only: exact ZIP checked and no backup/public files created',t=>{
 const f=fixture(t),before=publicInventory(f.pub),privateBefore=fs.readdirSync(f.priv);
 const result=publishNewDemo(f.options);
 assert.equal(result.action,'verify-only');assert.equal(result.changesPerformed,0);
 assert.deepEqual(publicInventory(f.pub),before);assert.deepEqual(fs.readdirSync(f.priv),privateBefore);assert.equal(fs.existsSync(f.target),false);
 assert.equal(result.archive.files,3);
});
test('additive publication makes a private backup and preserves every old public/startup byte',t=>{
 const f=fixture(t),before=publicInventory(f.pub);let result;const previousUmask=process.umask(0o077);try{result=publishNewDemo({...f.options,apply:true});}finally{process.umask(previousUmask);}
 assert.equal(result.verified,true);assert.equal(result.originalFilesUnchanged,true);assert.equal(result.oldPublicInventoryUnchanged,true);
 assert.equal(result.restart,false);assert.equal(result.routerChanged,false);assert.equal(result.databaseWrites,0);assert.equal(result.shopWrites,0);
 assert.deepEqual(publicInventory(f.pub,{excludePrefix:f.namespace.slice(1)}),before);
 for(const name of Object.keys(f.manifest.files))assert.equal(fs.readFileSync(path.join(f.target,name),'utf8'),fs.readFileSync(path.join(f.source,name),'utf8'));
 assert.equal(sha(fs.readFileSync(path.join(f.target,'MANIFEST.json'))),f.manifestSha);
 const saved=JSON.parse(fs.readFileSync(path.join(f.options.backup,'BEFORE.json')));assert.equal(saved.publicInventorySha256,result.beforePublicInventorySha256);
 for(const name of ['start-r5.cjs','app.cjs','22x14.html','30x20.html'])assert.equal(sha(fs.readFileSync(path.join(f.options.backup,'original-files',name))),saved.sourceFiles[name].sha256);
 assert.ok(fs.existsSync(path.join(f.options.backup,'AFTER.json')));assert.ok(fs.existsSync(path.join(f.target,'.htaccess')));
 if(process.platform!=='win32'){assert.equal(fs.statSync(f.options.backup).mode&0o777,0o700);assert.equal(fs.statSync(path.join(f.options.backup,'BEFORE.json')).mode&0o777,0o600);assert.equal(fs.statSync(path.join(f.target,'index.html')).mode&0o777,0o644);assert.equal(fs.statSync(path.join(f.target,'_bundle')).mode&0o777,0o755);assert.equal(fs.statSync(path.join(f.target,'.htaccess')).mode&0o777,0o644);}
 assert.throws(()=>publishNewDemo({...f.options,apply:true}),/exists/);
});
test('changed live guards, helper, ZIP or pre-existing target fail before any backup/write',t=>{
 const f=fixture(t);
 for(const key of ['startSha256','preview22Sha256','preview30Sha256','helperSha256','zipSha256','manifestSha256']){
  assert.throws(()=>publishNewDemo({...f.options,apply:true,expected:{...f.options.expected,[key]:'0'.repeat(64)}}));
  assert.equal(fs.existsSync(f.options.backup),false);assert.equal(fs.existsSync(f.target),false);
 }
 fs.mkdirSync(f.target,{recursive:true});fs.writeFileSync(path.join(f.target,'keep'),'existing demo');
 assert.throws(()=>publishNewDemo({...f.options,apply:true}),/target exists/);assert.equal(fs.existsSync(f.options.backup),false);assert.equal(fs.readFileSync(path.join(f.target,'keep'),'utf8'),'existing demo');
});
test('archive creation and extraction refuse overwrites and reconstruct exactly the manifest',t=>{
 const f=fixture(t),output=path.join(f.priv,'extracted');
 const extract=['extract','--zip',f.zip,'--zip-sha256',f.zipSha,'--manifest-sha256',f.manifestSha,'--output',output];
 const result=command([helper,...extract]);assert.equal(result.status,0,result.error);assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(output,'MANIFEST.json'))).files),Object.keys(f.manifest.files));
 assert.notEqual(command([helper,...extract]).status,0);
 assert.notEqual(command([helper,'pack','--directory',f.source,'--output',f.zip,'--manifest-sha256',f.manifestSha]).status,0);
 assert.equal(sha(fs.readFileSync(f.zip)),f.zipSha);
});
test('native ZIP inspection rejects traversal, duplicate, unlisted and symlink entries before extraction',t=>{
 const f=fixture(t);
 const mutation=`import sys,zipfile,stat\nsrc,dst,kind=sys.argv[1:]\nwith zipfile.ZipFile(src) as source,zipfile.ZipFile(dst,'w') as target:\n for info in source.infolist(): target.writestr(info,source.read(info.filename))\n if kind=='traversal': target.writestr('../escape.txt','outside')\n if kind=='duplicate': target.writestr('index.html','duplicate')\n if kind=='extra': target.writestr('extra.txt','unlisted')\n if kind=='symlink':\n  info=zipfile.ZipInfo('link');info.create_system=3;info.external_attr=(stat.S_IFLNK|0o777)<<16;target.writestr(info,'/etc/passwd')\n`;
 for(const kind of ['traversal','duplicate','extra','symlink']){
  const zip=path.join(f.priv,kind+'.zip'),output=path.join(f.priv,'extract-'+kind),made=command(['-c',mutation,f.zip,zip,kind]);assert.equal(made.status,0,made.error);
  const result=command([helper,'extract','--zip',zip,'--zip-sha256',sha(fs.readFileSync(zip)),'--manifest-sha256',f.manifestSha,'--output',output]);assert.notEqual(result.status,0);assert.equal(fs.existsSync(output),false);
 }
 assert.equal(fs.existsSync(path.join(f.priv,'escape.txt')),false);
});
test('checked helper fingerprint matches the prepared host recipe',()=>assert.equal(sha(fs.readFileSync(helper)),EXPECTED.helperSha256));
