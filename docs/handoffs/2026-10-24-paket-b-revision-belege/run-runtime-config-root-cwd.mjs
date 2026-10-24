// Diagnostic only; original full-run counters and logs remain unchanged.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {spawn,spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../gravuru-2027'),fullRun=path.join(here,'full-tests-2026-10-24T05-16-03-957Z-ta6XYd');
const testFiles=['app/workshop/editable-design.test.mjs','app/workshop/konfis.test.mjs','app/workshop/shopify-runtime-config.test.mjs'];
const python=path.resolve(here,'../pyenv/Scripts/python.exe'),temp=path.resolve(here,'../test-tmp');
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const planned={purpose:'Separate CWD diagnostics after full run; does not replace or alter original failures',repo,python,temp,node:process.version,files:testFiles.map(file=>({file,sha256:sha(path.join(repo,file))}))};
if(!process.argv.includes('--run'))console.log(JSON.stringify({...planned,mode:'plan-only'},null,2));
else{
 if(Number(process.versions.node.split('.')[0])!==24)throw Error('Node 24 required.');
 const full=JSON.parse(fs.readFileSync(path.join(fullRun,'summary.json'),'utf8'));
 if(!full.complete||full.executedFiles!==175)throw Error('The full 175-file run must finish first.');
 const originalInventory=JSON.parse(fs.readFileSync(path.join(fullRun,'inventory.json'),'utf8'));
 for(const entry of planned.files)if(originalInventory.files.find(x=>x.file===entry.file)?.sha256!==entry.sha256)throw Error('Test source differs from full-run inventory: '+entry.file);
 if(!fs.existsSync(python)||!fs.existsSync(temp))throw Error('Existing interpreter or TEMP directory missing.');
 const run=fs.mkdtempSync(path.join(here,'root-cwd-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
 const env={...process.env,GRAVURU_PYTHON:python,TEMP:temp,TMP:temp,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1',NO_COLOR:'1'};
 for(const key of Object.keys(env))if(key.startsWith('GRAVURU_')&&key!=='GRAVURU_PYTHON')delete env[key];
 fs.writeFileSync(path.join(run,'inventory.json'),JSON.stringify({...planned,originalRun:fullRun,originalCwd:originalInventory.cwd,diagnosticCwd:repo},null,2)+'\n');
 const results=[],totals={tests:0,passed:0,failed:0,cancelled:0,skipped:0,todo:0,suites:0};let complete=false;
 const persist=()=>fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({purpose:planned.purpose,complete,originalRun:fullRun,cwd:repo,plannedFiles:testFiles.length,executedFiles:results.length,totals,results},null,2)+'\n');
 persist();console.log('DIAGNOSTIC DIRECTORY '+run);
 for(const testFile of testFiles){
  const label=path.basename(testFile),events=path.join(run,label+'.events.jsonl'),raw=path.join(run,label+'.raw.log');
  const forceExit=testFile==='app/workshop/konfis.test.mjs';
  const args=[...(forceExit?['--test-force-exit']:[]),'--import',pathToFileURL(path.join(here,'full-tests-python-windows.mjs')).href,'--test','--test-concurrency=1','--test-timeout=600000','--test-reporter=tap','--test-reporter-destination=stdout','--test-reporter='+pathToFileURL(path.join(here,'full-tests-events.mjs')).href,'--test-reporter-destination='+events,path.join(repo,testFile)];
  fs.writeFileSync(raw,'');let launchError=null,timedOut=false;
  const child=spawn(process.execPath,args,{cwd:repo,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const capture=chunk=>{fs.appendFileSync(raw,chunk);process.stdout.write(chunk);};child.stdout.on('data',capture);child.stderr.on('data',capture);child.on('error',error=>{launchError={code:error.code,message:error.message};});
  const watchdog=setTimeout(()=>{timedOut=true;if(process.platform==='win32'&&Number.isSafeInteger(child.pid))spawnSync('taskkill.exe',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});child.kill();},605000);
  const exit=await new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));clearTimeout(watchdog);
  let rows=[],eventError=null;try{rows=fs.readFileSync(events,'utf8').split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));}catch(error){eventError=error.message;}
  const root=rows.filter(e=>e.type==='test:summary'&&e.data.file===undefined).at(-1)?.data;
  if(root)for(const key of Object.keys(totals))totals[key]+=Number(root.counts[key]||0);
  const sourceUnchanged=sha(path.join(repo,testFile))===planned.files.find(x=>x.file===testFile).sha256;
  const status=timedOut||launchError||eventError||!root?'incomplete':exit.code!==0||root.counts.failed||root.counts.cancelled||!sourceUnchanged?'failed':'passed';
  results.push({file:testFile,status,forceExit,originalCounts:full.results.find(x=>x.file===testFile)?.counts,counts:root?.counts??null,exitCode:exit.code,signal:exit.signal,timedOut,launchError,eventError,sourceUnchanged,failures:rows.filter(e=>e.type==='test:fail').map(e=>e.data),rawLog:path.basename(raw),eventLog:path.basename(events),command:[process.execPath,...args]});persist();
 }
 complete=true;persist();process.exitCode=results.some(x=>x.status!=='passed')?1:0;
}
