// Offline rehearsal only. Creates synthetic databases in a fresh temp directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {DatabaseSync,backup} from 'node:sqlite';
const [beforeRoot,afterRoot,output]=process.argv.slice(2);
if(!beforeRoot||!afterRoot||!output)throw Error('Usage: node tools/performance/font-backend-rollback.mjs <v2-checkout> <v3-checkout> <report.json>');
const oldFactory=(await import(pathToFileURL(path.resolve(beforeRoot,'app/workshop/profile-library.mjs')))).createProfileLibrary;
const newFactory=(await import(pathToFileURL(path.resolve(afterRoot,'app/workshop/profile-library.mjs')))).createProfileLibrary;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-font-rollback-')),filename=path.join(dir,'profiles.sqlite'),snapshot=path.join(dir,'before.sqlite'),restored=path.join(dir,'restored.sqlite');
const options={catalog:{fonts:['Michroma','Lato'],motifs:[]}};
const version=file=>{const d=new DatabaseSync(file,{readOnly:true});try{return d.prepare('PRAGMA user_version').get().user_version;}finally{d.close();}};
try{
 const old=oldFactory({...options,filename});
 const profile=old.create({name:'Synthetic rollback list',type:'fonts',items:['Lato','Michroma']});old.setDefault('fonts',{mode:'override',profileId:profile.id},1);
 const baseline={profiles:old.list(),settings:old.settings()};
 // Backup while the original WAL-mode library is open, never copy only the .sqlite file.
 const source=new DatabaseSync(filename,{readOnly:true});try{await backup(source,snapshot);}finally{source.close();old.close();}
 assert.equal(version(snapshot),2);
 const upgraded=newFactory({...options,filename});upgraded.adoptCatalogFontSet('synthetic',profile.id,1);upgraded.close();assert.equal(version(filename),3);
 let codeOnlyRollbackError;assert.throws(()=>oldFactory({...options,filename}),e=>{codeOnlyRollbackError=e.code;return e.code==='unsupported_database_version';});
 const saved=new DatabaseSync(snapshot,{readOnly:true});try{await backup(saved,restored);}finally{saved.close();}
 const recovered=oldFactory({...options,filename:restored});try{assert.deepEqual({profiles:recovered.list(),settings:recovered.settings()},baseline);}finally{recovered.close();}
 const check=new DatabaseSync(restored,{readOnly:true});let integrity;try{integrity=check.prepare('PRAGMA quick_check').get().quick_check;assert.equal(integrity,'ok');}finally{check.close();}
 const report={synthetic:true,node:process.version,backupSchema:2,upgradedSchema:3,codeOnlyRollbackRejected:true,codeOnlyRollbackError,restoredSchema:version(restored),restoredProfilesAndSettingsEqual:true,integrity,limitation:'Pre-upgrade snapshot restore only when no business writes occurred after upgrade; otherwise preserve current data and plan a separate recovery.'};
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{if(path.dirname(dir)!==path.resolve(os.tmpdir()))throw Error('Unexpected temp directory');fs.rmSync(dir,{recursive:true,force:true});}
