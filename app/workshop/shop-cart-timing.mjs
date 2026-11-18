import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import {startCartEventLoopTiming} from './shop-cart-event-loop.mjs';
import {cartCpuSnapshot,cartCpuDelta,startCartResources} from './shop-cart-resources.mjs';

// Only server-owned labels and numeric measurements. Never record request URLs,
// tokens, bodies, product/customer IDs or exception messages.
const scope=new AsyncLocalStorage();
const routes=new Set(['acrylic-drafts','theme-cart','cart/data','cart/claim','checkout-image']);
const label=name=>typeof name==='string'&&/^[a-z][a-z0-9_]{0,47}$/.test(name);
const round=value=>Math.round(Math.max(0,value)*100)/100;
function write(logger,event){try{const result=logger(event);if(result&&typeof result.catch==='function')result.catch(()=>{});}catch{}}
function finish(trace,status){
 if(trace.done)return {};
 trace.done=true;
 const totalMs=round(performance.now()-trace.started);
 const steps=Object.fromEntries([...trace.steps].map(([name,value])=>[name,{...value,durationMs:round(value.durationMs)}]));
 const identity={version:2,startedAt:trace.startedAt,traceId:trace.id,route:trace.route,...(trace.parentId?{parentTraceId:trace.parentId}:{})};
 const resources=trace.finishResources(gc=>write(trace.logger,{event:'shop_cart_gc',...identity,gc}));
 const event={event:'shop_cart_timing',...identity,status,totalMs,steps,droppedStepCalls:trace.droppedStepCalls,counts:{...trace.counts},storageReads:{coverage:'instrumented-sync-db-reads',...trace.reads,durationMs:round(trace.reads.durationMs)},eventLoop:trace.finishEventLoop(),...resources};
 // A broken log destination must not change the customer's response.
 write(trace.logger,event);
 return {'X-Gravuru-Timing-Id':trace.id,'Server-Timing':['total;dur='+totalMs,...Object.entries(steps).filter(([name])=>trace.headerNames.has(name)).map(([name,v])=>name+';dur='+v.durationMs)].join(', ')};
}
export async function withCartTiming(route,logger,work,{parentId}={}){
 if(!routes.has(route))return work();
 const started=performance.now();
 const trace={id:randomUUID(),route,logger,started,startedAt:new Date().toISOString(),steps:new Map(),droppedStepCalls:0,headerNames:new Set(),counts:{},reads:{calls:0,failures:0,rows:0,durationMs:0},done:false,parentId,finishEventLoop:startCartEventLoopTiming(),finishResources:startCartResources(started)};
 return scope.run(trace,async()=>{
  try{return await work();}
  finally{if(!trace.done)finish(trace,0);}// No JSON response: connection closed/aborted.
 });
}
export function cartTimingStep(name,work,{logOnly=false}={}){
 const trace=scope.getStore();
 if(!trace||trace.done||!label(name))return work();
 if(!trace.steps.has(name)&&trace.steps.size>=64){trace.droppedStepCalls++;return work();}
 // Reserve the label before nested/async work so the bound also holds for overlap.
 if(!trace.steps.has(name))trace.steps.set(name,{durationMs:0,calls:0,failures:0,syncCalls:0,asyncCalls:0,processCpu:{available:1,userMs:0,systemMs:0}});
 if(!logOnly)trace.headerNames.add(name);
 const started=performance.now(),cpu=cartCpuSnapshot();
 const record=(failed,async=false)=>{
  if(trace.done)return;
  const step=trace.steps.get(name)||{durationMs:0,calls:0,failures:0,syncCalls:0,asyncCalls:0,processCpu:{available:1,userMs:0,systemMs:0}};
  step.durationMs+=performance.now()-started;step.calls++;if(failed)step.failures++;
  step[async?'asyncCalls':'syncCalls']++;const used=cartCpuDelta(cpu);
  if(!used.available)step.processCpu.available=0;else{step.processCpu.userMs=round(step.processCpu.userMs+used.userMs);step.processCpu.systemMs=round(step.processCpu.systemMs+used.systemMs);}
  trace.steps.set(name,step);
 };
 try{
  const result=work();
  if(result&&typeof result.then==='function')return result.then(value=>{record(false,true);return value;},error=>{record(true,true);throw error;});
  record(false);return result;
 }catch(error){record(true);throw error;}
}
export const cartTimingDetail=(name,work)=>cartTimingStep(name,work,{logOnly:true});
// Instrument only the existing synchronous reads, never issue a COUNT/query
// for telemetry. Rows means returned rows, not SQLite's internal scan count.
export function cartTimingRead(name,work){
 const trace=scope.getStore();if(!trace||trace.done)return work();
 return cartTimingDetail(name,()=>{
  const started=performance.now();trace.reads.calls++;
  try{const value=work();trace.reads.rows+=value==null?0:Array.isArray(value)?value.length:1;return value;}
  catch(error){trace.reads.failures++;throw error;}
  finally{trace.reads.durationMs+=performance.now()-started;}
 });
}
export function cartTimingBytes(name,value){
 const trace=scope.getStore();if(!trace||trace.done)return;
 if(typeof value==='string'||Buffer.isBuffer(value))cartTimingCount(name,Buffer.byteLength(value));
}
export function cartTimingCount(name,value=1){
 const trace=scope.getStore();
 if(!trace||trace.done||!label(name)||!Number.isSafeInteger(value)||value<0||(!Object.hasOwn(trace.counts,name)&&Object.keys(trace.counts).length>=32))return;
 trace.counts[name]=(trace.counts[name]||0)+value;
}
export function cartTimingHeaders(status){const trace=scope.getStore();return trace?finish(trace,status):{};}
// The existing image job may outlive theme-cart. Give it its own log record so
// polling is never added to a response that has already been sent.
export function cartTimingBackground(work){
 const parent=scope.getStore();if(!parent)return work();
 return withCartTiming('checkout-image',parent.logger,async()=>{
  try{const value=await work();cartTimingHeaders(200);return value;}
  catch(error){cartTimingHeaders(502);throw error;}
 },{parentId:parent.id});
}
