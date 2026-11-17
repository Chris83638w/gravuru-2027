import fs from 'node:fs';
import path from 'node:path';
const dir=process.argv[2];
const median=xs=>{const s=[...xs].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
const round=n=>Math.round(n*100)/100,MiB=n=>round(n/1048576);
const names=['before-ab-1','av2-ab-1','av2-ba-2','before-ba-2','candidate-gc','av2-natural','candidate-natural','server-final-natural'];
const results=names.map(name=>{
 const d=JSON.parse(fs.readFileSync(path.join(dir,name+'.json'))),warm=d.memorySamples.find(x=>x.phase==='run-0-idle').atMs;
 const measured=d.memorySamples.filter(x=>x.atMs>warm),idle=measured.filter(x=>x.phase.endsWith('-idle'));
 const fields=['rss','heapUsed','external','arrayBuffers'],range=rows=>Object.fromEntries(fields.map(key=>[key,{min:MiB(Math.min(...rows.map(x=>x[key]))),median:MiB(median(rows.map(x=>x[key]))),max:MiB(Math.max(...rows.map(x=>x[key])))}]));
 const steps=['review_zip','review_json','review_sha256','review_design_validate','review_product_resolve','review_price','registry_document_digest','registry_canonical','registry_raw_digest'];
 return {name,commit:d.commit,forcedGc:d.profile.forcedGc,runtimeWorkingTree:d.runtimeWorkingTree,profile:d.profile,
  routeMediansMs:Object.fromEntries(Object.entries(d.summary).map(([key,value])=>[key,round(value.medianMs)])),
  sequentialFourRequestsMedianMs:round(median(d.samples.map(s=>Object.values(s).reduce((n,v)=>n+v.elapsedMs,0)))),
  stepMediansMs:Object.fromEntries(steps.map(step=>[step,d.samples.some(s=>Object.values(s).some(v=>v.timing?.steps?.[step]))?round(median(d.samples.map(s=>Object.values(s).reduce((n,v)=>n+(v.timing?.steps?.[step]?.durationMs||0),0)))):null])),
  measuredMemoryMiB:range(measured),idleMemoryMiB:range(idle),
  maxDistinctSteps:Math.max(...d.samples.flatMap(s=>Object.values(s).map(v=>Object.keys(v.timing.steps).length))),
  droppedStepCalls:d.samples.flatMap(s=>Object.values(s)).every(v=>Number.isSafeInteger(v.timing.droppedStepCalls))?d.samples.flatMap(s=>Object.values(s)).reduce((n,v)=>n+v.timing.droppedStepCalls,0):null,
  digestHits:d.samples.map(s=>Object.values(s).reduce((n,v)=>n+(v.timing.counts.registry_digest_hits||0),0)),
  probeKinds:[...new Set(measured.map(x=>x.phase.startsWith('run-')?'round-boundary':x.phase==='interval-50ms'?'timer':'http-response'))]};
});
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify({notes:['Local synthetic HTTP, not mobile/Shopify elapsed time.','Measured memory samples start after warmup idle. Timer cannot sample during synchronous blocking; maxima are observed samples, not true peaks.','Idle GC runs explicitly force collection; natural runs do not.','AB1 records response/round boundaries; BA2 and candidate/natural also record a 50-ms timer.'],results},null,2)+'\n');
for(const r of results)console.log(JSON.stringify({name:r.name,ms:r.sequentialFourRequestsMedianMs,zip:r.stepMediansMs.review_zip,digest:r.stepMediansMs.registry_document_digest,peak:r.measuredMemoryMiB.rss.max,idleRss:r.idleMemoryMiB.rss,idleHeap:r.idleMemoryMiB.heapUsed,idleExternal:r.idleMemoryMiB.external,steps:r.maxDistinctSteps,dropped:r.droppedStepCalls}));
