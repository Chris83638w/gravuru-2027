// Compare raw Node test events by file + test name + nesting + occurrence.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export function compareRuns(beforeDir,afterDir){
  function load(dir){
    const summary=read(path.join(dir,'summary.json')),inventory=read(path.join(dir,'inventory.json'));
    const integrity=read(path.join(dir,'integrity.json')),tests=new Map(),duplicates=[];
    const normalize=s=>String(s??'').replaceAll(inventory.repo,'<REPO>').replaceAll(inventory.temp,'<TEMP>').replaceAll(dir,'<RUN>');
    for(const result of summary.results){
      const occurrences=new Map();
      for(const event of fs.readFileSync(path.join(dir,result.eventLog),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)){
        if(!['test:pass','test:fail'].includes(event.type))continue;
        const d=event.data,keyBase=JSON.stringify([result.file,normalize(d.name),d.nesting??0]);
        const n=(occurrences.get(keyBase)||0)+1;occurrences.set(keyBase,n);
        if(n>1)duplicates.push({file:result.file,name:normalize(d.name),nesting:d.nesting,occurrence:n});
        const key=keyBase+'#'+n,err=d.details?.error;
        tests.set(key,{key,file:result.file,name:normalize(d.name),nesting:d.nesting??0,
          status:d.skip?'skipped':d.todo?'todo':event.type==='test:fail'?'failed':'passed',
          skipReason:d.skip??null,todoReason:d.todo??null,
          failure:err?{message:normalize(err.message),code:err.code??null,failureType:err.failureType??null}:null});
      }
    }
    return {dir,summary,inventory,integrity,tests,duplicates};
  }
  const b=load(beforeDir),a=load(afterDir);
  const bf=b.inventory.files.map(x=>x.file).sort(),af=a.inventory.files.map(x=>x.file).sort();
  const missingFiles=bf.filter(x=>!af.includes(x)),extraFiles=af.filter(x=>!bf.includes(x));
  const issues=[];
  for(const [label,r] of [['before',b],['after',a]]){
    const resultFiles=r.summary.results.map(x=>x.file).sort();
  if(JSON.stringify(resultFiles)!==JSON.stringify(r.inventory.files.map(x=>x.file).sort()))issues.push(label+': result files do not match inventory');
  if(r.inventory.files.length!==175)issues.push(label+': inventory is not exactly 175 files');
  if(!r.summary.complete||r.summary.executedFiles!==175||r.summary.plannedFiles!==175||r.summary.unstartedFiles.length)issues.push(label+': incomplete 175-file run');
    if(r.summary.results.some(x=>x.status==='incomplete'||x.counts?.cancelled))issues.push(label+': cancelled/incomplete file');
    if(r.integrity.protectedChanges.length||r.integrity.testSourceChanges.length)issues.push(label+': integrity changes');
    if(!r.tests.size)issues.push(label+': no terminal test events');
  }
  const missingTests=[],newFailures=[],coverageLoss=[],newTests=[],changedExistingFailures=[];
  for(const [key,old] of b.tests){
    const next=a.tests.get(key);
    if(!next){missingTests.push(old);continue;}
    if(next.status==='failed'&&old.status!=='failed')newFailures.push({before:old,after:next});
    if(['skipped','todo'].includes(next.status)&&next.status!==old.status)coverageLoss.push({before:old,after:next});
    if(old.status==='failed'&&next.status==='failed'&&JSON.stringify(old.failure)!==JSON.stringify(next.failure))changedExistingFailures.push({before:old,after:next});
  }
  for(const [key,next] of a.tests)if(!b.tests.has(key))newTests.push(next);
  const newTestsNotPassed=newTests.filter(t=>t.status!=='passed');
  const blocking=issues.length+missingFiles.length+extraFiles.length+missingTests.length+newFailures.length+coverageLoss.length+newTestsNotPassed.length+changedExistingFailures.length;
  return {
    verdict:blocking?'review-required':'no-new-failures',notASuitePassClaim:true,
    before:{directory:beforeDir,counts:b.summary.totals,files:bf.length},
    after:{directory:afterDir,counts:a.summary.totals,files:af.length},
    issues,missingFiles,extraFiles,missingTests,newFailures,coverageLoss,newTests,newTestsNotPassed,changedExistingFailures,
    retainedFailures:[...a.tests.values()].filter(t=>t.status==='failed'&&b.tests.get(t.key)?.status==='failed'),
    skips:{before:[...b.tests.values()].filter(t=>t.status==='skipped'),after:[...a.tests.values()].filter(t=>t.status==='skipped')},
    duplicateNameOccurrences:{before:b.duplicates,after:a.duplicates},
    policy:'No failed, skipped, cancelled, todo or incomplete result becomes a pass. Existing identical failures remain reported. Changed failure details and newly skipped tests require review. Counts never replace test-name matching.'
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [before,after,out]=process.argv.slice(2);
  const report=compareRuns(before,after);
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({verdict:report.verdict,before:report.before.counts,after:report.after.counts,newFailures:report.newFailures.length,missingTests:report.missingTests.length,changedExistingFailures:report.changedExistingFailures.length,newTestsNotPassed:report.newTestsNotPassed.length},null,2));
  process.exitCode=report.verdict==='no-new-failures'?0:1;
}
