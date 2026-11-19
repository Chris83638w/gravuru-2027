import {createHistogram,performance} from 'node:perf_hooks';

// One unref'ed process-wide heartbeat, independent of request contexts. A fresh
// monitorEventLoopDelay per handler can miss the first/last synchronous block:
// its timer has not run yet when the response is sent. Include that unfinished
// heartbeat interval here, without waiting or delaying the customer's response.
export function createCartEventLoopProbe({clock=()=>performance.now(),schedule=setInterval,cancel=clearInterval}={}){
 const resolutionMs=20,historyMs=1000,history=[],active=new Set();
 let previous=clock();const enabledAt=previous;
 const elapsed=(from,to)=>Math.max(0,to-from);
 const record=(histogram,ms)=>histogram.record(Math.max(1,Math.round(ms*1e6)));
 const stats=histogram=>({samples:histogram.count,maxMs:histogram.count?Math.round(histogram.max/1e4)/100:0,p99Ms:histogram.count?Math.round(histogram.percentile(99)/1e4)/100:0});
 const timer=schedule(()=>{
  const now=clock(),due=previous+resolutionMs;
  history.push({at:now,delayMs:elapsed(due,now)});
  // At 20 ms resolution, 64 entries cover the one-second lookback. The cap
  // also bounds memory if a supplied scheduler invokes the callback too often.
  while(history.length&&(history[0].at<now-historyMs||history.length>64))history.shift();
  for(const sample of active)if(now>sample.started)record(sample.histogram,elapsed(Math.max(due,sample.started),now));
  previous=now;
 },resolutionMs);
 timer.unref?.();
 return {
  start(){
   const started=clock(),recent=createHistogram();
   for(const sample of history)if(sample.at>=started-historyMs)record(recent,sample.delayMs);
   const pending=elapsed(previous+resolutionMs,started);
   if(pending>0)record(recent,pending);
   const beforeHandler={windowMs:Math.min(historyMs,elapsed(enabledAt,started)),...stats(recent)};
   const sample={started,histogram:createHistogram()};active.add(sample);
   let result;
   return ()=>{
    if(result)return result;
    const ended=clock();active.delete(sample);
    const pendingDuring=elapsed(Math.max(previous+resolutionMs,started),ended);
    if(pendingDuring>0)record(sample.histogram,pendingDuring);
    result={resolutionMs,beforeHandler,duringHandler:{windowMs:elapsed(started,ended),...stats(sample.histogram)}};
    return result;
   };
  },
  close(){cancel(timer);active.clear();history.length=0;}
 };
}

const processProbe=createCartEventLoopProbe();
export const startCartEventLoopTiming=()=>processProbe.start();
