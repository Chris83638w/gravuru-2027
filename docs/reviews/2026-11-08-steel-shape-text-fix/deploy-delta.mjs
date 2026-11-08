// Prepared only. Root reviews and executes; --check never writes; --rollback restores backup.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const ROOT='/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-steel-r15-shopify-20261108';
const BACKUP='/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-steel-shopify-backup-20261108-cart-text-patch';
const P='app/configurator/variant-m/';
const OLD='editor-bab5a1fa49ee42d2.mjs',NEW='editor-eb6b798c7398f566.mjs';
const source=P+'family-formats.mjs',html=P+'.preview/editor.html',core=P+'.preview/bundle/';
const BEFORE={
 [source]:'43ab12c0ecd55b6ca826077302a194dc9f24a8ae4ed996e326eaf4dbd2627499',
 [html]:'018e29152fb44d758f193b79622d276d1fe33666a9eef31b21acbf256d964b8b',
 [core+OLD]:'72bcf141b4775f2d5aee5ff2543dd5fd69e52b883e4f85bd3cb2a7fe764b0ea2',
 [core+OLD+'.gz']:'bb11f9388c5be9021918fdbaeaf21aef382e517840cbf6aa0b43999962a60b4c'
};
const AFTER={
 [source]:'183d00d611042e2c2d9f6097787859656388adcc6ef92ae52c3c6498e4deb210',
 [html]:'9ee81d1481e2280139d0d407247ac6ac3040d035c4e04599c4695b97f53e2636',
 [core+NEW]:'538a7417200b07edf65912c845526f587f48007806090fa020c6ad55981489c3',
 [core+NEW+'.gz']:'4fda8299903d66a30ba71a6065663aba5d4664f82c901b10c67114d6d09f3c75'
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error(message);};
const verify=(bytes,expected,label)=>sha(bytes)===expected||fail('SHA-256 mismatch: '+label);
const read=relative=>fs.readFileSync(path.join(ROOT,relative));
function replace(text,from,to,count=1){
 if(text.split(from).length-1!==count)fail('Patch anchor count mismatch');
 return text.replaceAll(from,to);
}
const oldEdit="  const edited=state.objects.filter(o=>o.type==='text'&&!o.uxHidden&&o.customerEditable!==false&&o.text!==source.objects.find(s=>s.id===o.id)?.text);";
const newEdit=`  const editable=state.objects.filter(o=>o.type==='text'&&!o.uxHidden&&o.customerEditable!==false);
  // Keep complete name/date groups: omitting an unchanged second field makes
  // transferTexts split a multiword first field into the second one. Retain the
  // existing shape-switch transfer of other edited texts (including slogans).
  const grouped=new Set(changedCustomerTexts(editable,source));
  const edited=editable.filter(o=>grouped.has(o)||o.text!==source.objects.find(s=>s.id===o.id)?.text);`;
const escaped=text=>JSON.stringify(text).slice(1,-1);
function patched(input,bundled=false){
 const dep=bundled?'gravuru-bundle:36':'./workflow-model.mjs';
 let output=replace(input,`import {transferTexts} from '${dep}';`,`import {changedCustomerTexts,transferTexts} from '${dep}';`);
 output=replace(output,bundled?escaped(oldEdit):oldEdit,bundled?escaped(newEdit):newEdit);
 return bundled?replace(output,'HASH="bab5a1fa49ee42d2"','HASH="eb6b798c7398f566"'):output;
}
function atomic(file,bytes,{mode=0o644,expected=null}={}){
 if(expected){verify(fs.readFileSync(file),expected,file);}
 else if(fs.existsSync(file))fail('New target already exists: '+file);
 const temp=file+'.shape-text-'+process.pid+'.tmp';
 const fd=fs.openSync(temp,'wx',mode);
 try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 verify(fs.readFileSync(temp),sha(bytes),temp);
 if(expected){verify(fs.readFileSync(file),expected,file);fs.renameSync(temp,file);}
 else {fs.linkSync(temp,file);fs.unlinkSync(temp);}
 verify(fs.readFileSync(file),sha(bytes),file);
}
function restore(){
 // Validate every backup/current postimage before replacing anything.
 const originals=new Map(),current=new Map();
 for(const file of [source,html]){
  const bytes=fs.readFileSync(path.join(BACKUP,path.basename(file)));verify(bytes,BEFORE[file],file+' backup');originals.set(file,bytes);
  const hash=sha(read(file));if(![BEFORE[file],AFTER[file]].includes(hash))fail('Unknown current file: '+file);current.set(file,hash);
 }
 for(const file of [core+OLD,core+OLD+'.gz'])verify(read(file),BEFORE[file],file);
 for(const file of [core+NEW,core+NEW+'.gz'])if(fs.existsSync(path.join(ROOT,file)))verify(read(file),AFTER[file],file);
 for(const file of [source,html])if(current.get(file)!==BEFORE[file])atomic(path.join(ROOT,file),originals.get(file),{mode:fs.statSync(path.join(ROOT,file)).mode&0o777,expected:current.get(file)});
 for(const file of [source,html])verify(read(file),BEFORE[file],file);
 console.log(JSON.stringify({status:'restored',backup:BACKUP,retainedBundles:[OLD,NEW]}));
}
function deploy(){
 const originals=new Map(),post=new Map();
 for(const [file,hash] of Object.entries(BEFORE)){const bytes=read(file);verify(bytes,hash,file);originals.set(file,bytes);}
 post.set(source,Buffer.from(patched(originals.get(source).toString('utf8'))));
 post.set(html,Buffer.from(replace(originals.get(html).toString('utf8'),OLD,NEW,2)));
 post.set(core+NEW,Buffer.from(patched(originals.get(core+OLD).toString('utf8'),true)));
 post.set(core+NEW+'.gz',gzipSync(post.get(core+NEW),{level:9}));
 for(const [file,bytes] of post)verify(bytes,AFTER[file],file+' postimage');
 // The four complete target images now exist and are verified in memory.
 for(const file of [core+NEW,core+NEW+'.gz'])if(fs.existsSync(path.join(ROOT,file)))fail('New bundle already exists: '+file);
 if(fs.existsSync(BACKUP))fail('Backup directory already exists');
 if(process.argv.includes('--check')){console.log(JSON.stringify({status:'verified-no-write',files:[...post.keys()],backup:BACKUP}));return;}
 fs.mkdirSync(BACKUP,{mode:0o700}); // Atomic mkdir, intentionally no recursive/exist_ok.
 for(const file of [source,html]){
  const backup=path.join(BACKUP,path.basename(file));fs.writeFileSync(backup,originals.get(file),{flag:'wx',mode:0o600});verify(fs.readFileSync(backup),BEFORE[file],backup);
 }
 fs.writeFileSync(path.join(BACKUP,'hashes.json'),JSON.stringify({root:ROOT,before:BEFORE,after:AFTER},null,2)+'\n',{flag:'wx',mode:0o600});
 // Recheck all old files after backup; only the exact four runtime paths can change.
 for(const [file,hash] of Object.entries(BEFORE))verify(read(file),hash,file);
 atomic(path.join(ROOT,core+NEW),post.get(core+NEW),{mode:fs.statSync(path.join(ROOT,core+OLD)).mode&0o777});
 atomic(path.join(ROOT,core+NEW+'.gz'),post.get(core+NEW+'.gz'),{mode:fs.statSync(path.join(ROOT,core+OLD+'.gz')).mode&0o777});
 atomic(path.join(ROOT,source),post.get(source),{mode:fs.statSync(path.join(ROOT,source)).mode&0o777,expected:BEFORE[source]});
 atomic(path.join(ROOT,html),post.get(html),{mode:fs.statSync(path.join(ROOT,html)).mode&0o777,expected:BEFORE[html]});
 for(const [file,hash] of Object.entries(AFTER))verify(read(file),hash,file);
 for(const file of [core+OLD,core+OLD+'.gz'])verify(read(file),BEFORE[file],file);
 console.log(JSON.stringify({status:'applied',backup:BACKUP,files:AFTER,retainedOldBundle:OLD}));
}
if(process.argv.includes('--rollback'))restore();else deploy();
