import {performance,PerformanceObserver} from 'node:perf_hooks';

const safe=read=>{try{return read();}catch{return null;}};
const round=n=>Math.round(Math.max(0,n)*100)/100;
export const cartCpuSnapshot=()=>safe(()=>process.cpuUsage());
export function cartCpuDelta(before,after=cartCpuSnapshot()){
 return before&&after?{available:1,userMs:round((after.user-before.user)/1000),systemMs:round((after.system-before.system)/1000)}:{available:0};
}
const memory=()=>safe(()=>{const m=process.memoryUsage();return {rss:m.rss,heapUsed:m.heapUsed};});
const osKeys=['involuntaryContextSwitches','voluntaryContextSwitches','fsRead','fsWrite','majorPageFault'];
export function cartResourceDelta(before,after,platform=process.platform){
 if(!before||!after)return {available:0};
 const unsupported=platform==='win32'?['involuntaryContextSwitches','voluntaryContextSwitches','majorPageFault']:[];
 return {available:1,unsupported,delta:Object.fromEntries(osKeys.filter(k=>!unsupported.includes(k)).map(k=>[k,Math.max(0,after[k]-before[k])]))};
}

// One observer per V8 isolate. Delivery is deferred by Node: do not claim a
// synchronous zero or hold the HTTP response open waiting for the last GC.
const windows=new Set();
function consume(entries){
 for(const e of entries)for(const w of windows){
  const overlap=Math.min(e.startTime+e.duration,w.ended)-Math.max(e.startTime,w.started);
  if(overlap>0){w.count++;w.pauseMs+=overlap;}
 }
}
const observer=safe(()=>{
 if(!PerformanceObserver.supportedEntryTypes.includes('gc'))return null;
 const value=new PerformanceObserver(list=>consume(list.getEntries()));value.observe({entryTypes:['gc']});return value;
});
export function startCartResources(started=performance.now()){
 const cpu=cartCpuSnapshot(),usage=safe(()=>process.resourceUsage()),before=memory();
 const gc={started,ended:Infinity,count:0,pauseMs:0};if(observer)windows.add(gc);
 let result;
 return (deliverGc)=>{
  if(result)return result;
  gc.ended=performance.now();
  result={processCpu:cartCpuDelta(cpu),resourceUsage:cartResourceDelta(usage,safe(()=>process.resourceUsage())),
   memory:{before,after:memory()},gc:{supported:observer?1:0,supplementPossible:observer?1:0,graceMs:25}};
  if(observer){
   // One bounded grace timer covers entries enqueued at the last sync step.
   // No await in the customer path. A process exit can lose this supplement;
   // consumers must treat a missing supplement as unknown, never zero.
   setTimeout(()=>{
    consume(observer.takeRecords());windows.delete(gc);
    if(gc.count)deliverGc({windowStartMs:gc.started,windowEndMs:gc.ended,windowMs:round(gc.ended-gc.started),count:gc.count,pauseMs:round(gc.pauseMs),delivery:'deferred-observed',isolate:'current'});
   },25).unref();
  }
  return result;
 };
}
