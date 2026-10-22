import fs from 'node:fs';import path from 'node:path';
// A read-only SQLite open can create a zero-length WAL and a shared-memory index.
// They contain no committed database pages. All database hashes remain mandatory.
export function assertSnapshotMembers(directory,{uid=process.getuid?.()}={}){
 const fail=()=>{throw Object.assign(Error('snapshot_members'),{code:'snapshot_members'});};
 const required=['SNAPSHOT.json','workshop.sqlite','profiles.sqlite','design-assets.sqlite'];
 const names=fs.readdirSync(directory);if(required.some(n=>!names.includes(n)))fail();
 for(const name of names){
  const stat=fs.lstatSync(path.join(directory,name));
  if(!stat.isFile()||stat.isSymbolicLink()||(uid!==undefined&&(stat.uid!==uid||(stat.mode&0o077))))fail();
  if(required.includes(name))continue;
  const match=/^(workshop|profiles|design-assets)\.sqlite-(wal|shm)$/.exec(name);if(!match)fail();
  if(match[2]==='wal'){if(stat.size!==0)fail();}
  else{
   const wal=path.join(directory,match[1]+'.sqlite-wal');
   if(stat.size!==32768||!fs.existsSync(wal))fail();
   const w=fs.lstatSync(wal);if(!w.isFile()||w.isSymbolicLink()||w.size!==0)fail();
  }
 }
 return true;
}
