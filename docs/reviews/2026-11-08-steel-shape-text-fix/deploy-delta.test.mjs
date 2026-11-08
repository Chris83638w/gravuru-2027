// Local verification only: the deployment program runs against an in-memory filesystem.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const baseline=process.env.GRAVURU_TEXT_PATCH_BASELINE;
assert.ok(baseline,'Set GRAVURU_TEXT_PATCH_BASELINE to the existing local pre-fix R15 worktree');
const script=fs.readFileSync(new URL('./deploy-delta.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const root='/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-steel-r15-shopify-20261108';
const backup='/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-steel-shopify-backup-20261108-cart-text-patch';
const prefix='app/configurator/variant-m/';
const source=prefix+'family-formats.mjs',html=prefix+'.preview/editor.html';
const bundle=prefix+'.preview/bundle/';
const old='editor-bab5a1fa49ee42d2.mjs',next='editor-eb6b798c7398f566.mjs';
const inputs=[source,html,bundle+old,bundle+old+'.gz'];
const original=new Map(inputs.map(file=>[root+'/'+file,fs.readFileSync(path.join(baseline,file))]));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));

function memory(){
 const files=new Map([...original].map(([p,b])=>[p,Buffer.from(b)])),dirs=new Set(),events=[],fds=new Map();let fd=10,failRename;
 const mock={
  readFileSync(file){assert.ok(files.has(file),'Missing mock file '+file);return Buffer.from(files.get(file));},
  existsSync(file){return files.has(file)||dirs.has(file);},
  statSync(file){assert.ok(files.has(file));return {mode:0o100644};},
  mkdirSync(dir){assert.equal(dirs.has(dir),false);dirs.add(dir);events.push(['mkdir',dir]);},
  openSync(file,flag){assert.equal(flag,'wx');assert.equal(files.has(file),false);files.set(file,Buffer.alloc(0));fds.set(++fd,file);events.push(['open',file]);return fd;},
  writeFileSync(file,bytes,options={}){file=fds.get(file)||file;if(options.flag==='wx')assert.equal(files.has(file),false);files.set(file,Buffer.from(bytes));events.push(['write',file]);},
  fsyncSync(){},closeSync(){},
  renameSync(from,to){if(to===failRename){failRename=null;throw Error('Injected rename interruption');}assert.ok(files.has(from));files.set(to,files.get(from));files.delete(from);events.push(['rename',to]);},
  linkSync(from,to){assert.equal(files.has(to),false);files.set(to,files.get(from));events.push(['link',to]);},
  unlinkSync(file){assert.ok(files.has(file));files.delete(file);events.push(['unlink',file]);}
 };
 const run=(args=[],code=script)=>{const messages=[];vm.runInNewContext(code,{fs:mock,path:path.posix,createHash,gzipSync,Buffer,process:{pid:101,argv:['node','deploy-delta.mjs',...args]},console:{log:message=>messages.push(JSON.parse(message))}});return messages;};
 return {files,dirs,events,run,interruptRename(file){failRename=file;}};
}

test('deploy delta fits Plesk size budget and --check verifies exact postimages without writes',()=>{
 assert.ok(fs.readFileSync(new URL('./deploy-delta.mjs',import.meta.url)).toString('base64').length<12000);
 const m=memory();assert.equal(m.run(['--check'])[0].status,'verified-no-write');assert.deepEqual(m.events,[]);
});

test('all old hashes and all postimages are checked before even creating the backup',()=>{
 for(const input of inputs){const m=memory();m.files.set(root+'/'+input,Buffer.from('wrong'));assert.throws(()=>m.run(),/SHA-256 mismatch/);assert.deepEqual(m.events,[]);}
 const m=memory();assert.throws(()=>m.run([],script.replace('Keep complete name/date groups','Keep complete altered groups')),/SHA-256 mismatch/);assert.deepEqual(m.events,[]);
});

test('existing backup or new target blocks apply without touching runtime or backup',()=>{
 for(const collision of ['backup',bundle+next,bundle+next+'.gz']){
  const m=memory();if(collision==='backup')m.dirs.add(backup);else m.files.set(root+'/'+collision,Buffer.from('existing'));
  assert.throws(()=>m.run(),/already exists/);assert.deepEqual(m.events,[]);
 }
});

test('apply backs up originals, installs exact bundles first, source next, and atomically renames editor last',()=>{
 const m=memory();assert.equal(m.run()[0].status,'applied');
 for(const entry of manifest.runtimeFiles)assert.equal(digest(m.files.get(root+'/'+entry.path)),entry.sha256);
 for(const file of [source,html])assert.deepEqual(m.files.get(backup+'/'+path.basename(file)),original.get(root+'/'+file));
 for(const file of [bundle+old,bundle+old+'.gz'])assert.deepEqual(m.files.get(root+'/'+file),original.get(root+'/'+file));
 assert.deepEqual(m.events.filter(([kind])=>['link','rename'].includes(kind)).map(([,file])=>file),[bundle+next,bundle+next+'.gz',source,html].map(file=>root+'/'+file));
 const allowed=new Set([...original.keys(),...manifest.runtimeFiles.map(e=>root+'/'+e.path),backup+'/family-formats.mjs',backup+'/editor.html',backup+'/hashes.json']);
 assert.ok([...m.files.keys()].every(file=>allowed.has(file)),'no fifth runtime file, stylesheet or backend was touched');
 assert.equal(m.run(['--rollback'])[0].status,'restored');
 for(const file of inputs)assert.deepEqual(m.files.get(root+'/'+file),original.get(root+'/'+file));
 assert.ok(m.files.has(root+'/'+bundle+next)&&m.files.has(root+'/'+bundle+next+'.gz'),'rollback retains bundles for open sessions');
});

test('manual rollback recovers an interrupted final rename and refuses unknown current source bytes',()=>{
 const m=memory();m.interruptRename(root+'/'+html);assert.throws(()=>m.run(),/Injected rename interruption/);
 assert.equal(m.run(['--rollback'])[0].status,'restored');
 for(const file of inputs)assert.deepEqual(m.files.get(root+'/'+file),original.get(root+'/'+file));
 m.files.set(root+'/'+source,Buffer.from('foreign edit'));const count=m.events.length;
 assert.throws(()=>m.run(['--rollback']),/Unknown current file/);assert.equal(m.events.length,count);
});
