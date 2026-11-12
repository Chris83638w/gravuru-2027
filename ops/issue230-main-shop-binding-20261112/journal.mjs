// Private append-only operator receipts. No DB/table/schema writes.
import fs from 'node:fs';
import path from 'node:path';
import {digest,sha} from './main-operator.mjs';
const need=(v,code)=>{if(!v)throw Object.assign(Error(code),{code});};
function syncDirectory(dir){if(process.platform==='win32')return;const fd=fs.openSync(dir,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
export function writeNewJson(filename,value){const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n'),fd=fs.openSync(filename,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}syncDirectory(path.dirname(filename));return {sha256:sha(bytes),bytes:bytes.length};}
export function openExecutionJournal(directory,planHash){
 need(/^[a-f0-9]{64}$/.test(planHash),'journal_plan_hash');
 const root=path.resolve(directory);if(!fs.existsSync(root))fs.mkdirSync(root,{mode:0o700});need(fs.statSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink(),'journal_directory');
 const lock=path.join(root,'.lock'),lockfd=fs.openSync(lock,'wx',0o600);fs.writeFileSync(lockfd,JSON.stringify({pid:process.pid,planHash}));fs.fsyncSync(lockfd);
 let closed=false;const events=[];
 try{
  const names=fs.readdirSync(root).filter(n=>/^\d{5}\.json$/.test(n)).sort();
  for(let i=0;i<names.length;i++){
   need(names[i]===String(i).padStart(5,'0')+'.json','journal_sequence');const filename=path.join(root,names[i]);need(!fs.lstatSync(filename).isSymbolicLink(),'journal_symlink');
   const event=JSON.parse(fs.readFileSync(filename,'utf8')),{eventHash,...body}=event;
   need(event.planHash===planHash&&event.index===i&&event.previousHash===(events.at(-1)?.eventHash??null)&&eventHash===digest(body),'journal_integrity');events.push(event);
  }
 }catch(e){fs.closeSync(lockfd);fs.unlinkSync(lock);throw e;}
 return {planHash,events:()=>structuredClone(events),append(value){
  need(!closed,'journal_closed');need(['started','done','not-applied'].includes(value.state)&&/^(shop-variants|shop-pricing|bindings:[0-7]|catalog-main-r2)$/.test(value.key),'journal_event');
  const body={...structuredClone(value),planHash,index:events.length,previousHash:events.at(-1)?.eventHash??null,recordedAt:new Date().toISOString()},event={...body,eventHash:digest(body)};
  writeNewJson(path.join(root,String(events.length).padStart(5,'0')+'.json'),event);events.push(event);return structuredClone(event);
 },close(){if(!closed){closed=true;fs.closeSync(lockfd);fs.unlinkSync(lock);syncDirectory(root);}}};
}
