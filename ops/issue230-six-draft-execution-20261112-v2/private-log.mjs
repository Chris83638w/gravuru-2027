import fs from 'node:fs';
import path from 'node:path';
// Operator supplies a new private log path. No DB path/default host is invented.
// Single process lock, append + fsync; no raw documents, tokens or customer data.
export function openPrivateLog(filename){
 const file=path.resolve(filename),lock=file+'.lock';
 if(fs.existsSync(file)&&(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()))throw Error('Private regular log required.');
 const lockFd=fs.openSync(lock,'wx',0o600);let fd;
 try{fd=fs.openSync(file,'a',0o600);}catch(e){fs.closeSync(lockFd);fs.unlinkSync(lock);throw e;}
 return {checkpoint(value){const line=JSON.stringify({at:new Date().toISOString(),...value})+'\n';fs.writeSync(fd,line);fs.fsyncSync(fd);},close(){fs.closeSync(fd);fs.closeSync(lockFd);fs.unlinkSync(lock);}};
}
