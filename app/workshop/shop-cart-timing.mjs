import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';

// Only server-owned labels and numeric measurements. Never record request URLs,
// tokens, bodies, product/customer IDs or exception messages.
const scope=new AsyncLocalStorage();
const routes=new Set(['acrylic-drafts','theme-cart','cart/data','cart/claim','checkout-image']);
const label=name=>typeof name==='string'&&/^[a-z][a-z0-9_]{0,47}$/.test(name);
const round=value=>Math.round(Math.max(0,value)*100)/100;
function finish(trace,status){
 if(trace.done)return {};
 trace.done=true;
 const totalMs=round(performance.now()-trace.started);
 const steps=Object.fromEntries([...trace.steps].map(([name,value])=>[name,{...value,durationMs:round(value.durationMs)}]));
 const event={event:'shop_cart_timing',version:1,startedAt:trace.startedAt,traceId:trace.id,route:trace.route,status,totalMs,steps,counts:{...trace.counts},...(trace.parentId?{parentTraceId:trace.parentId}:{})};
 // A broken log destination must not change the customer's response.
 try{const result=trace.logger(event);if(result&&typeof result.catch==='function')result.catch(()=>{});}catch{}
 return {'X-Gravuru-Timing-Id':trace.id,'Server-Timing':['total;dur='+totalMs,...Object.entries(steps).map(([name,v])=>name+';dur='+v.durationMs)].join(', ')};
}
export async function withCartTiming(route,logger,work,{parentId}={}){
 if(!routes.has(route))return work();
 const trace={id:randomUUID(),route,logger,started:performance.now(),startedAt:new Date().toISOString(),steps:new Map(),counts:{},done:false,parentId};
 return scope.run(trace,async()=>{
  try{return await work();}
  finally{if(!trace.done)finish(trace,0);}// No JSON response: connection closed/aborted.
 });
}
export function cartTimingStep(name,work){
 const trace=scope.getStore();
 if(!trace||trace.done||!label(name)||(!trace.steps.has(name)&&trace.steps.size>=64))return work();
 const started=performance.now();
 const record=failed=>{
  if(trace.done)return;
  const step=trace.steps.get(name)||{durationMs:0,calls:0,failures:0};
  step.durationMs+=performance.now()-started;step.calls++;if(failed)step.failures++;
  trace.steps.set(name,step);
 };
 try{
  const result=work();
  if(result&&typeof result.then==='function')return result.then(value=>{record(false);return value;},error=>{record(true);throw error;});
  record(false);return result;
 }catch(error){record(true);throw error;}
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
