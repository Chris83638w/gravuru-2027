// Defaults to read-only preview. No automatic deployment, release, retries or DB writes.
import fs from 'node:fs';
import path from 'node:path';
import {createSteelPricingRepair,sha} from './steel-pricing-input-cas.mjs';
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,s)=>i%2?a:[...a,[v,s[i+1]]],[]));
const mode=args['--mode']||'preview',secretFile=args['--secret-file'],backupDir=args['--backup-dir'];
try{
 if(!['preview','apply','restore'].includes(mode)||!path.isAbsolute(secretFile||''))throw Error('arguments');
 const st=fs.lstatSync(secretFile);if(!st.isFile()||st.isSymbolicLink()||st.size>1024)throw Error('secret_file');
 const client=createSteelPricingRepair({readSecret:()=>fs.readFileSync(secretFile,'utf8').trim()});
 const saveBackup=async data=>{
  if(!path.isAbsolute(backupDir||''))throw Error('private_backup_required');
  const dir=fs.lstatSync(backupDir),real=fs.realpathSync(backupDir);
  if(!dir.isDirectory()||dir.isSymbolicLink()||!real.split(path.sep).includes('private')||process.platform!=='win32'&&(dir.mode&0o077)!==0)throw Error('private_backup_permissions');
  const value=JSON.stringify(data,null,2)+'\n',file=path.join(real,`steel-pricing-${mode}-${Date.now()}.json`);
  fs.writeFileSync(file,value,{flag:'wx',mode:0o600});if(fs.readFileSync(file,'utf8')!==value)throw Error('private_backup_readback');
  return {sha256:sha(value)};
 };
 let result;
 if(mode==='preview')result=await client.preview();
 if(mode==='apply')result=await client.apply({saveBackup,confirmedFunctionRelease:args['--confirmed-function-release']});
 if(mode==='restore'){
  const file=args['--backup-file'];if(!path.isAbsolute(file||''))throw Error('backup_file');
  const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.size>100000)throw Error('backup_file');
  result=await client.restore({backup:JSON.parse(fs.readFileSync(file,'utf8')),saveBackup});
 }
 console.log(JSON.stringify(result));
}catch(e){console.log(JSON.stringify({failed:true,code:/^[a-z_]+$/.test(e.code||e.message)?e.code||e.message:'repair_failed'}));process.exitCode=2;}
