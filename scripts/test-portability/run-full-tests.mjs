// Preparation defaults to inventory only. --run is the explicit execution switch.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const value=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const required=name=>{const result=value(name);if(!result||result.startsWith('--'))throw Error('Missing required option '+name);return path.resolve(result);};
const repo=required('--repo'),python=required('--python'),temp=required('--temp'),output=required('--output');
fs.mkdirSync(output,{recursive:true});
const timeoutMs=Number(value('--timeout-ms')||600000);
if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000)throw Error('Invalid timeout.');
if(Number(process.versions.node.split('.')[0])!==24)throw Error('This prepared runner requires Node 24.');
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const scope=['app/configurator/variant-m','app/workshop'];
const files=scope.flatMap(dir=>fs.readdirSync(path.join(repo,dir),{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.test.mjs')).map(e=>dir+'/'+e.name)).sort();
const inventory=files.map(file=>({file,sha256:sha(path.join(repo,file))}));
const planned={mode:process.argv.includes('--run')?'run':'plan-only',repo,node:process.version,nodeExecutable:process.execPath,python,temp,timeoutMs,files:inventory,counts:Object.fromEntries(scope.map(dir=>[dir,files.filter(f=>f.startsWith(dir+'/')).length])),totalFiles:files.length};
const expected=value('--expected-files');if(expected!==null&&Number(expected)!==files.length)throw Error('Expected '+expected+' files, found '+files.length+'. No tests started.');
if(!process.argv.includes('--run')){
  fs.writeFileSync(path.join(output,'full-tests-plan.json'),JSON.stringify(planned,null,2)+'\n');
  console.log(JSON.stringify({...planned,files:undefined},null,2));console.log('PLAN ONLY. No test module imported or executed.');
}else{
  if(!fs.existsSync(python)||!fs.existsSync(temp))throw Error('Existing Python or TEMP directory missing; no tests started.');
  const run=fs.mkdtempSync(path.join(output,(value('--label')||'full-tests')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
  const cwd=repo,isolatedCwd=path.join(run,'cwd');fs.mkdirSync(isolatedCwd);
  const env={...process.env,GRAVURU_PYTHON:python,TEMP:temp,TMP:temp,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1',NO_COLOR:'1'};
  // Never inherit application credentials, production destinations, or artifact destinations.
  for(const key of Object.keys(env))if(key.startsWith('GRAVURU_')&&key!=='GRAVURU_PYTHON')delete env[key];
  const safeEnv={GRAVURU_PYTHON:python,TEMP:temp,TMP:temp,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1',NODE_OPTIONS_present:!!env.NODE_OPTIONS,PYTHONPATH_present:!!env.PYTHONPATH};
  const writeJson=(name,data)=>fs.writeFileSync(path.join(run,name),JSON.stringify(data,null,2)+'\n');
  writeJson('inventory.json',{...planned,cwd,environment:safeEnv});
  const protectedRoots=['.local-data','app/.local-data','deliverables','legacy-reference'];
  function protectedSnapshot(){
    const result={};
    function visit(absolute,relative){
      if(!fs.existsSync(absolute)){result[relative]={missing:true};return;}
      const stat=fs.lstatSync(absolute);
      if(stat.isSymbolicLink()){result[relative]={link:fs.readlinkSync(absolute)};return;}
      if(stat.isDirectory()){result[relative]={directory:true};for(const child of fs.readdirSync(absolute).sort())visit(path.join(absolute,child),relative+'/'+child);}
      else if(stat.isFile())result[relative]={bytes:stat.size,sha256:sha(absolute)};
    }
    for(const relative of protectedRoots)visit(path.join(repo,relative),relative);
    return result;
  }
  const protectedBefore=protectedSnapshot();writeJson('protected-before.json',protectedBefore);
  const probe=spawnSync(python,['-B','-c',
    'import sys,json,importlib\nr={"executable":sys.executable,"version":sys.version,"modules":{}}\nfor n in ["svgpathtools","pymupdf","PIL","cairosvg","fontTools","openpyxl","numpy"]:\n try:\n  m=importlib.import_module(n);r["modules"][n]={"available":True,"file":getattr(m,"__file__",None)}\n except Exception as e:r["modules"][n]={"available":False,"error":type(e).__name__+": "+str(e)}\nprint(json.dumps(r))'
  ],{cwd,env,windowsHide:true,encoding:'utf8',timeout:30000,maxBuffer:2e6});
  fs.writeFileSync(path.join(run,'python-environment.raw.log'),String(probe.stdout||'')+String(probe.stderr||''));
  let pythonEnvironment;try{pythonEnvironment=JSON.parse(String(probe.stdout).trim().split(/\r?\n/).at(-1));}catch{pythonEnvironment={error:'Probe output was not JSON; see raw log.'};}
  writeJson('python-environment.json',{...pythonEnvironment,exitCode:probe.status,error:probe.error?.message??null});
  const results=[],totals={tests:0,suites:0,passed:0,failed:0,cancelled:0,skipped:0,todo:0};
  let complete=false;
  const combined=path.join(run,'all.raw.log');
  function persist(){
    const filesByStatus={passed:0,failed:0,incomplete:0,skipped:0};for(const r of results)filesByStatus[r.status]++;
    writeJson('summary.json',{complete,plannedFiles:files.length,executedFiles:results.length,unstartedFiles:files.slice(results.length),filesByStatus,totals,countsMeaning:'Unmodified Node root-summary counts summed per file; file-load failures can themselves count as Node test failures. Missing summaries are incomplete, never passes.',results});
  }
  persist();console.log('RUN DIRECTORY '+run);
  for(let i=0;i<files.length;i++){
    const file=files[i],label=String(i+1).padStart(3,'0')+'-'+file.replaceAll('/','--');
    const raw=path.join(run,label+'.raw.log'),events=path.join(run,label+'.events.jsonl');
    const command=['--import',pathToFileURL(path.join(here,'full-tests-python-windows.mjs')).href,'--test','--test-concurrency=1','--test-timeout='+timeoutMs,
      '--test-reporter=tap','--test-reporter-destination=stdout','--test-reporter='+pathToFileURL(path.join(here,'full-tests-events.mjs')).href,'--test-reporter-destination='+events,path.join(repo,file)];
    fs.writeFileSync(raw,'');fs.appendFileSync(combined,'\n# TEST FILE '+file+'\n');
    const started=Date.now();let timedOut=false,launchError=null;
    const testCwd=['app/workshop/catalog-structure.test.mjs','app/workshop/design-dashboard.test.mjs'].includes(file)?isolatedCwd:repo;
    const child=spawn(process.execPath,command,{cwd:testCwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    const capture=chunk=>{fs.appendFileSync(raw,chunk);fs.appendFileSync(combined,chunk);};
    child.stdout.on('data',capture);child.stderr.on('data',capture);
    child.on('error',error=>{launchError={code:error.code,message:error.message};});
    const watchdog=setTimeout(()=>{
      timedOut=true;
      if(process.platform==='win32'&&Number.isSafeInteger(child.pid))spawnSync('taskkill.exe',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
      child.kill();
    },timeoutMs+5000);
    const exit=await new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));clearTimeout(watchdog);
    let eventRows=[],eventError=null;
    try{eventRows=fs.readFileSync(events,'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));}catch(error){eventError=error.message;}
    const root=eventRows.filter(e=>e.type==='test:summary'&&e.data.file===undefined).at(-1)?.data;
    const counts=root?.counts??null;
    if(counts)for(const key of Object.keys(totals))totals[key]+=Number(counts[key]||0);
    const output=fs.readFileSync(raw,'utf8');
    const environmentHints=[];
    if(/(?:EACCES|EPERM).*listen|listen.*(?:EACCES|EPERM)|listen.*127\.0\.0\.1/i.test(output)&&/(EACCES|EPERM)/.test(output))environmentHints.push('loopback-permission-candidate');
    if(/No module named|ModuleNotFoundError|DLL load failed|cannot load library/i.test(output))environmentHints.push('python-dependency-candidate');
    if(/spawn.*(?:ENOENT|EACCES)|Python.*(?:fehlt|nicht verfügbar)|python3.*not found/i.test(output))environmentHints.push('python-executable-candidate');
    if(/ERR_MODULE_NOT_FOUND|Cannot find module|ENOENT.*(?:fixtures|templates)/i.test(output))environmentHints.push('missing-source-or-fixture-candidate');
    if(/symlink.*(?:EPERM|EACCES)|(?:EPERM|EACCES).*symlink/i.test(output))environmentHints.push('windows-symlink-permission-candidate');
    const status=timedOut||launchError||eventError||!root?'incomplete':exit.code!==0||counts.failed||counts.cancelled?'failed':counts.tests>0&&counts.skipped===counts.tests?'skipped':'passed';
    results.push({file,cwd:testCwd,status,exitCode:exit.code,signal:exit.signal,timedOut,launchError,eventError,durationMs:Date.now()-started,counts,
      environmentHints,hintPolicy:'Hints require manual diagnosis; no failed, cancelled, skipped, or incomplete result is reclassified as a pass.',
      failures:eventRows.filter(e=>e.type==='test:fail').map(e=>e.data),rawLog:path.basename(raw),eventLog:path.basename(events),command:[process.execPath,...command]});
    persist();console.log((i+1)+'/'+files.length+' '+status+' '+file);
  }
  const protectedAfter=protectedSnapshot();writeJson('protected-after.json',protectedAfter);
  const protectedChanges=[...new Set([...Object.keys(protectedBefore),...Object.keys(protectedAfter)])].filter(p=>JSON.stringify(protectedBefore[p])!==JSON.stringify(protectedAfter[p]));
  const testSourceChanges=inventory.filter(x=>!fs.existsSync(path.join(repo,x.file))||sha(path.join(repo,x.file))!==x.sha256).map(x=>x.file);
  writeJson('integrity.json',{protectedChanges,testSourceChanges});
  complete=true;persist();
  const failed=results.some(r=>r.status==='failed'||r.status==='incomplete')||protectedChanges.length||testSourceChanges.length;
  console.log(JSON.stringify({complete,run,plannedFiles:files.length,executedFiles:results.length,totals,protectedChanges,testSourceChanges,exitCode:failed?1:0},null,2));
  process.exitCode=failed?1:0;
}
