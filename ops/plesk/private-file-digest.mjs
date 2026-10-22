import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const appRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fail=()=>{throw Object.assign(Error('private_digest'),{code:'private_digest'});};
export function hashPrivateFile(file,limit=8*1024*1024*1024){
 let fd;
 try{
  if(typeof process.getuid!=='function'||typeof file!=='string'||!path.isAbsolute(file)||path.resolve(file)!==file||
     file===appRoot||file.startsWith(appRoot+path.sep)||fs.realpathSync(file)!==file||
     !Number.isSafeInteger(limit)||limit<1)fail();
  for(let p=path.dirname(file);;p=path.dirname(p)){
   if(fs.existsSync(path.join(p,'.git')))fail();
   if(path.dirname(p)===p)break;
  }
  fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  const before=fs.fstatSync(fd,{bigint:true});
  if(!before.isFile()||before.uid!==BigInt(process.getuid())||(before.mode&0o077n)!==0n||
     before.nlink!==1n||before.size<1n||before.size>BigInt(limit))fail();
  const digest=createHash('sha256'),buffer=Buffer.alloc(1024*1024);let total=0n,read;
  while((read=fs.readSync(fd,buffer,0,buffer.length,null))>0){
   total+=BigInt(read);if(total>BigInt(limit))fail();digest.update(buffer.subarray(0,read));
  }
  const after=fs.fstatSync(fd,{bigint:true}),entry=fs.lstatSync(file,{bigint:true});
  if(total!==before.size||['dev','ino','size','mtimeNs','ctimeNs','nlink','mode','uid'].some(k=>after[k]!==before[k])||
     entry.dev!==before.dev||entry.ino!==before.ino||entry.isSymbolicLink())fail();
  return {bytes:Number(total),sha256:digest.digest('hex')};
 }catch{fail();}finally{if(fd!==undefined)fs.closeSync(fd);}
}

