import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createShopifyTestRuntime} from '../../app/workshop/shopify-admin-test-server.mjs';
import {createFontConnectionHost} from './font-connection-host.mjs';

const releaseRoot=fileURLToPath(new URL('../../',import.meta.url));
const fail=code=>{throw Object.assign(Error('Privater Schriftgruppen-Wartungslauf nicht bestätigt.'),{code,status:409});};
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const absolute=value=>typeof value==='string'&&path.isAbsolute(value)&&path.resolve(value)===value;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const moduleAt=(root,name)=>import(pathToFileURL(path.join(root,'ops','plesk',name)).href);

export function readFontMaintenanceConfig(filename){
  if(!absolute(filename)||fs.realpathSync(filename)!==filename)fail('font_maintenance_config');
  const stat=fs.statSync(filename),parent=fs.statSync(path.dirname(filename));
  if(!stat.isFile()||stat.size>256*1024||process.platform!=='win32'&&
    (stat.uid!==process.getuid()||parent.uid!==process.getuid()||(stat.mode|parent.mode)&0o077))fail('font_maintenance_config');
  return JSON.parse(fs.readFileSync(filename,'utf8'));
}

export function parseFontMaintenanceArguments(args){
  if(args.length<4||args[0]!=='--config'||!absolute(args[1]))fail('font_maintenance_arguments');
  const [,,phase,value,...rest]=args;
  if(phase==='execute'&&sha(value)&&!rest.length)return {filename:args[1],request:{phase,sha256:value}};
  if(phase!=='plan'||typeof value!=='string'||!value||rest.length%2)fail('font_maintenance_arguments');
  const request={phase,targetId:value};
  for(let i=0;i<rest.length;i+=2){
    if(rest[i]==='--restore-revision'&&!Object.hasOwn(request,'restoreRevision')&&/^[1-9]\d*$/.test(rest[i+1])&&Number.isSafeInteger(Number(rest[i+1])))request.restoreRevision=Number(rest[i+1]);
    else if(rest[i]==='--recovery-sha'&&!Object.hasOwn(request,'recoverySha')&&sha(rest[i+1]))request.recoverySha=rest[i+1];
    else fail('font_maintenance_arguments');
  }
  return {filename:args[1],request};
}

function validate(config,request){
  if(config?.schema!=='gravuru-font-maintenance/v1'||
    !['dataDirectory','legacyRelease','katalogRoot','planDirectory','python','merchantConfigFile','activeEntryFile','installedRelease'].every(k=>absolute(config[k]))||
    !sha(config.activeEntrySha256)||!sha(config.lockModuleSha256)||!Array.isArray(config.webRoots)||!config.webRoots.length||!config.webRoots.every(absolute)||
    !config.tenantId||!config.shopDomain||!Array.isArray(config.targets)||!Array.isArray(config.approvedSets)||
    config.approvedPlanSha!==null&&!sha(config.approvedPlanSha)||Object.hasOwn(config,'executionEnabled'))fail('font_maintenance_config');
  if(!['plan','execute'].includes(request?.phase))fail('font_maintenance_arguments');
  if(request.phase==='execute'){
    if(Object.keys(request).sort().join(',')!=='phase,sha256'||!sha(request.sha256)||request.sha256!==config.approvedPlanSha)fail('font_maintenance_plan_not_approved');
  }else if(!config.targets.some(t=>t.id===request.targetId)||Object.keys(request).some(k=>!['phase','targetId','restoreRevision','recoverySha'].includes(k))||
    request.restoreRevision!==undefined&&(!Number.isSafeInteger(request.restoreRevision)||request.restoreRevision<1)||request.recoverySha!==undefined&&!sha(request.recoverySha))fail('font_maintenance_arguments');
}

function verifyInstalledCode(config){
  if(fs.realpathSync(config.installedRelease)!==fs.realpathSync(releaseRoot))fail('font_maintenance_code_mismatch');
  const bytes=fs.readFileSync(config.activeEntryFile);
  if(digest(bytes)!==config.activeEntrySha256)fail('font_maintenance_code_mismatch');
  const entry=path.join(config.installedRelease,'scripts','acryl-employee-entry.cjs').replaceAll('\\','/');
  const references=[...bytes.toString('utf8').matchAll(/require\(\s*(['"])(.*?)\1\s*\)/g)].map(m=>m[2].replaceAll('\\','/'));
  if(!references.includes(entry))fail('font_maintenance_code_mismatch');
  for(const [key,value] of [['GRAVURU_ACRYL_DATA_DIR',config.dataDirectory],['GRAVURU_ACRYL_LEGACY_RELEASE',config.legacyRelease]]){
    const found=bytes.toString('utf8').match(new RegExp('process\\.env\\.'+key+'\\s*=\\s*([\x22\x27])([^\x22\x27]+)\\1'))?.[2];
    if(found?.replaceAll('\\','/')!==value.replaceAll('\\','/'))fail('font_maintenance_code_mismatch');
  }
}

async function releaseLock(lock){
  if(lock.exitCode!==null&&lock.exitCode!==undefined||lock.signalCode!==null&&lock.signalCode!==undefined)return;
  await new Promise(resolve=>{
    const timer=setTimeout(()=>lock.kill(),5000);
    lock.once('exit',()=>{clearTimeout(timer);resolve();});
    lock.stdin.end();
  });
}

/** One private command and one native owner, always under the exact existing
 * lock implementation. Dependencies are injectable for isolated fault tests;
 * the CLI uses only these production defaults. No listen/retry/auto restart. */
export async function runFontConnectionMaintenance({config,request,signal,dependencies={}}){
  validate(config,request);config=structuredClone(config);request=structuredClone(request);
  const acquire=dependencies.acquireLock??(async()=>{
    if(digest(fs.readFileSync(path.join(config.legacyRelease,'ops','plesk','lock.mjs')))!==config.lockModuleSha256)fail('font_maintenance_lock_code');
    const {lockTestData}=await moduleAt(config.legacyRelease,'lock.mjs');return lockTestData({data:config.dataDirectory,python:config.python});});
  const readRuntime=dependencies.readRuntime??(async()=>{const {merchantConfig}=await moduleAt(config.legacyRelease,'merchant-config.mjs');return merchantConfig({GRAVURU_SHOPIFY_CONFIG_FILE:config.merchantConfigFile});});
  const createRuntime=dependencies.createRuntime??createShopifyTestRuntime;
  let owner,interrupted=null,releasing=false,closeError,opening=false;
  const closeOwner=()=>{if(closeError)throw closeError;try{owner?.close();}catch(error){closeError=error;throw error;}};
  const check=()=>{if(interrupted||signal?.aborted)fail(interrupted??'font_maintenance_aborted');};
  check();
  // No runtime config/credentials, database, output directory or builder is
  // touched before the existing process-wide native data lock is acquired.
  const lock=await acquire();
  if(lock.exitCode!==null&&lock.exitCode!==undefined||lock.signalCode!==null&&lock.signalCode!==undefined)interrupted='font_maintenance_lock_lost';
  const stop=code=>{interrupted=code;try{closeOwner();}catch{/* finally retains the lock and reports this close failure. */}};
  const onExit=()=>{if(!releasing)stop('font_maintenance_lock_lost');};
  const onAbort=()=>stop('font_maintenance_aborted');
  lock.on('exit',onExit);signal?.addEventListener('abort',onAbort,{once:true});
  try{
    check();(dependencies.verifyInstalledCode??verifyInstalledCode)(config);
    const runtime=await readRuntime();check();
    if(runtime.python!==config.python||runtime.runtime?.shopifySessions?.shopDomain!==config.shopDomain)fail('font_maintenance_runtime_scope');
    const mount=createFontConnectionHost({...config,...dependencies.mountOptions,approvedPlanSha:request.phase==='execute'?config.approvedPlanSha:null});
    opening=true;
    owner=createRuntime({...runtime.runtimeEnv,GRAVURU_PRIVATE_DATA_DIR:config.dataDirectory,GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only'},
      {maintenanceOnly:true,katalogRoot:config.katalogRoot,fontConnection:mount});
    opening=false;
    check();
    if(owner.server||owner.orderWebhookHandler||typeof owner.close!=='function')fail('font_maintenance_owner');
    const operator=mount.operator();let result;
    if(request.phase==='plan'){
      const input={targetId:request.targetId,...(request.restoreRevision?{restoreRevision:request.restoreRevision}:{}),
        ...(request.recoverySha?{recoveryPlan:operator.read(request.recoverySha)}:{})};
      const plan=await operator.plan(input);
      result={phase:'plan',sha256:plan.sha256,targetId:plan.targetId,fromRevision:plan.fromRevision,boundRevision:plan.boundRevision};
    }else{
      const done=await operator.execute(request.sha256);
      result={phase:'execute',sha256:request.sha256,productId:done.productId,previousRevision:done.previousRevision,revision:done.revision,approved:done.approved};
    }
    check();return result;
  }catch(error){check();throw error;
  }finally{
    // The native owner must be closed before making the data lock available.
    // A close error intentionally retains the lock until this process exits.
    closeOwner();
    // A constructor can fail after opening stores but before returning their
    // owner. Only CLI process exit can then guarantee all OS handles are gone.
    if(opening)fail('font_maintenance_startup_failed');
    releasing=true;
    signal?.removeEventListener('abort',onAbort);lock.removeListener('exit',onExit);
    await (dependencies.releaseLock??releaseLock)(lock);
  }
}
