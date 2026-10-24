// Synchronous, process-independent catalogue transaction. Both source files and
// the audit line are staged before replacement. A durable journal rolls an
// interrupted transaction back when the next dashboard/CLI writer or editor
// reader acquires the lock. Published Git state is never touched.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'katalog_write'});};
const digest=bytes=>bytes===null?null:createHash('sha256').update(bytes).digest('hex');
const journalRelative='designs/.werkstatt-write-journal.json';
export function safeKatalogPath(root,relative,{missing=false,directory=false}={}){
 root=fs.realpathSync(root);
 if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..'||/[\x00-\x1f:]/.test(p)))fail(422,'Ungültiger Katalogpfad.');
 let current=root;const parts=relative.split('/');
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);let st;
  try{st=fs.lstatSync(current);}catch(e){if(e.code==='ENOENT'&&missing&&i===parts.length-1)return current;fail(404,'Katalogdatei nicht vorhanden.');}
  if(st.isSymbolicLink())fail(422,'Verknüpfungen sind für Katalogänderungen nicht erlaubt.');
  if(i<parts.length-1||directory){if(!st.isDirectory())fail(422,'Katalogpfad ist kein Ordner.');}
  else if(!st.isFile())fail(422,'Katalogpfad ist keine reguläre Datei.');
  if(!directory&&i===parts.length-1&&st.nlink>1)fail(422,'Mehrfach verknüpfte Katalogdateien sind nicht erlaubt.');
 }
 return current;
}
function durable(file,bytes,mode=0o600){const fd=fs.openSync(file,'wx',mode);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function journalWrite(root,data){
 const file=safeKatalogPath(root,journalRelative,{missing:true}),tmp=file+'.'+randomUUID()+'.tmp';
 try{durable(tmp,JSON.stringify(data)+'\n');fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function recover(root){
 const journal=safeKatalogPath(root,journalRelative,{missing:true});if(!fs.existsSync(journal))return;
 let data;try{data=JSON.parse(fs.readFileSync(journal,'utf8'));}catch{fail(503,'Katalog-Schreibjournal ist unlesbar. Wiederherstellung erforderlich.');}
 if(data.version!==1||!Array.isArray(data.files)||data.files.length>20||!['prepared','committed'].includes(data.phase))fail(503,'Katalog-Schreibjournal prüfen.');
 const files=data.files.map(f=>{
  const file=safeKatalogPath(root,f.relative,{missing:true}),old=f.old===null?null:Buffer.from(f.old,'base64'),current=fs.existsSync(file)?fs.readFileSync(file):null,hash=digest(current);
  if(hash!==digest(old)&&hash!==f.next)fail(503,'Katalogdatei wurde während einer unterbrochenen Transaktion verändert. Wiederherstellung prüfen.');
  return {...f,file,old,current};
 });
 if(data.phase==='prepared')for(const f of files){
  if(digest(f.current)===digest(f.old))continue;
  if(f.old===null){if(fs.existsSync(f.file))fs.unlinkSync(f.file);}
  else{const tmp=f.file+'.'+randomUUID()+'.restore';try{durable(tmp,f.old,f.mode??0o600);fs.renameSync(tmp,f.file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
 }
 // Temp names are generated here and may only refer to the same source directory.
 for(const f of files)if(typeof f.tmp==='string'&&/^[a-f0-9-]+$/.test(f.tmp)){
  const tmp=f.file+'.'+f.tmp+'.tmp';if(fs.existsSync(tmp)){const st=fs.lstatSync(tmp);if(st.isSymbolicLink()||!st.isFile())fail(503,'Transaktionsdatei prüfen.');fs.unlinkSync(tmp);}
 }
 fs.unlinkSync(journal);
}
export function withKatalogWriteLock(root,run){
 root=fs.realpathSync(root);const base=safeKatalogPath(root,'designs',{directory:true}),lock=path.join(base,'.werkstatt-write.lock'),owner=path.join(lock,'owner.json');
 try{fs.mkdirSync(lock);}catch(e){
  if(e.code!=='EEXIST')throw e;
  const st=fs.lstatSync(lock);if(st.isSymbolicLink()||!st.isDirectory())fail(422,'Ungültige Katalogsperre.');
  let info;try{if(fs.lstatSync(owner).isSymbolicLink())fail(422,'Ungültige Katalogsperre.');info=JSON.parse(fs.readFileSync(owner,'utf8'));}catch{fail(409,'Der Katalog wird gerade geändert. Bitte erneut laden.');}
  let alive=true;try{if(!Number.isSafeInteger(info.pid)||info.pid<=0)fail(409,'Katalogsperre prüfen.');process.kill(info.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
  if(alive)fail(409,'Der Katalog wird gerade geändert. Bitte erneut laden.');
  fs.unlinkSync(owner);fs.rmdirSync(lock);
  try{fs.mkdirSync(lock);}catch{fail(409,'Der Katalog wird gerade geändert. Bitte erneut laden.');}
 }
 try{durable(owner,JSON.stringify({pid:process.pid}));recover(root);return run(root);}finally{if(fs.existsSync(owner))fs.unlinkSync(owner);fs.rmdirSync(lock);}
}
export function writeKatalogTransaction(root,entries,{beforeReplace}={}){
 const nonce=randomUUID(),files=entries.map(({relative,text})=>{
  const file=safeKatalogPath(root,relative,{missing:true});
  return {relative,file,text,old:fs.existsSync(file)?fs.readFileSync(file):null,mode:fs.existsSync(file)?fs.statSync(file).mode&0o777:0o600,tmp:file+'.'+nonce+'.tmp'};
 });
 if(!files.length||files.length>20||new Set(files.map(f=>f.file)).size!==files.length)fail(422,'Ungültiger Katalog-Schreibvorgang.');
 const journal={version:1,phase:'prepared',files:files.map(f=>({relative:f.relative,old:f.old?.toString('base64')??null,next:digest(Buffer.from(f.text)),mode:f.mode,tmp:nonce}))};
 let prepared=false;
 try{
  for(const f of files)durable(f.tmp,f.text,f.mode);
  journalWrite(root,journal);prepared=true;
  let index=0;for(const f of files){safeKatalogPath(root,f.relative,{missing:true});beforeReplace?.(f.relative,index++);fs.renameSync(f.tmp,f.file);}
  journalWrite(root,{...journal,phase:'committed'});recover(root);
 }catch(error){
  if(prepared)try{recover(root);}catch(rollback){throw Object.assign(new AggregateError([error,rollback],'Katalogänderung fehlgeschlagen; Wiederherstellung prüfen.'),{status:500,code:'katalog_rollback'});}
  throw error;
 }finally{for(const f of files)if(fs.existsSync(f.tmp))fs.unlinkSync(f.tmp);}
 return files.map(f=>f.relative);
}

// A normal dashboard/preview read also recovers an interrupted write before
// returning a cached catalogue. With no journal this performs no filesystem write.
export function recoverKatalogIfNeeded(root){
 if(!fs.existsSync(path.join(root,...journalRelative.split('/'))))return false;
 return withKatalogWriteLock(root,()=>true);
}
