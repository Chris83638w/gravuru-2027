import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';

const MAX_RESPONSE = 2 * 1024 * 1024;
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const fail = code => Object.assign(Error(code),{code});

export function loopbackTarget(input) {
  // Validate the literal first: URL() normalizes octal, shortened and integer IPv4.
  const m = typeof input === 'string' && input.match(/^http:\/\/(127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})\/?$/);
  if (!m || Number(m[2]) < 1024 || Number(m[2]) > 65535) throw fail('LOOPBACK_ONLY');
  return {hostname:m[1] === '[::1]' ? '::1' : m[1],port:Number(m[2]),origin:`http://${m[1]}:${m[2]}`};
}
function validateTarget(target) { return loopbackTarget(target?.origin); }

export function request(target,pathname,{timeoutMs=2000}={}) {
  target=validateTarget(target);
  if (!['/pilot/health','/pilot/model'].includes(pathname)) throw fail('ROUTE_NOT_ALLOWED');
  return new Promise((resolve,reject)=>{
    let finished=false,size=0;const chunks=[],started=performance.now();
    const done=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve(result);};
    const req=http.request({hostname:target.hostname,port:target.port,path:pathname,method:'GET',agent:false,headers:{Accept:'application/json','X-Gravuru-Load-Test':'synthetic-loopback-only'}},res=>{
      // Native http has no redirect handling; fail closed rather than following one.
      if (res.statusCode >= 300 && res.statusCode < 400) {res.destroy();req.destroy();done(fail('REDIRECT_REJECTED'));return;}
      res.on('data',data=>{size+=data.length;if(size>MAX_RESPONSE){res.destroy();req.destroy();done(fail('RESPONSE_BOUND'));}else chunks.push(data);});
      res.on('end',()=>done(null,{status:res.statusCode,bytes:size,ms:performance.now()-started,body:Buffer.concat(chunks)}));
      res.on('error',()=>done(fail('RESPONSE_ERROR')));
    });
    const timer=setTimeout(()=>{req.destroy();done(fail('REQUEST_TIMEOUT'));},timeoutMs);
    req.on('socket',socket=>socket.once('connect',()=>{if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(socket.remoteAddress)){req.destroy();done(fail('REMOTE_ADDRESS_REJECTED'));}}));
    req.on('error',()=>done(fail('CONNECTION_ERROR')));
    req.end();
  });
}

export async function assertPilot(target) {
  const r=await request(target,'/pilot/health');
  let health;try{health=JSON.parse(r.body.toString('utf8'));}catch{throw fail('PILOT_IDENTITY_REQUIRED');}
  if(r.status!==200 || health.schema!=='gravuru-integration-pilot/v1' || health.mode!=='synthetic-only' || health.externalNetwork!==false || health.privateData!==false) throw fail('PILOT_IDENTITY_REQUIRED');
  return {schema:health.schema,mode:health.mode,externalNetwork:health.externalNetwork,privateData:health.privateData};
}
const quantile=(values,q)=>values.length?Number([...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*q)-1)].toFixed(2)):null;

export async function runStage(target,{concurrency=1,durationMs=3000,requestsPerSecond=10,maxRequests=200,timeoutMs=2000}={}) {
  target=validateTarget(target);
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>16||!Number.isInteger(durationMs)||durationMs<100||durationMs>15000||!Number.isInteger(requestsPerSecond)||requestsPerSecond<1||requestsPerSecond>50||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>2000||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>5000)throw fail('STAGE_BOUNDS');
  await assertPilot(target); // Every stage rechecks identity before any workload.
  const started=performance.now(),deadline=started+durationMs,latencies=[],statuses={},errors={};
  let nextStart=started,reserved=0,completed=0,bytes=0,stopped=false;
  async function worker(){
    while(!stopped&&reserved<maxRequests){
      const when=Math.max(nextStart,performance.now());
      if(when>=deadline)return;
      nextStart=when+1000/requestsPerSecond;reserved++;
      if(when>performance.now())await sleep(when-performance.now());
      if(stopped)return;
      try{
        const r=await request(target,'/pilot/model',{timeoutMs});completed++;bytes+=r.bytes;latencies.push(r.ms);statuses[r.status]=(statuses[r.status]||0)+1;
        if(r.status!==200)stopped=true;
      }catch(e){completed++;errors[e.code||'REQUEST_ERROR']=(errors[e.code||'REQUEST_ERROR']||0)+1;stopped=true;}
    }
  }
  await Promise.all(Array.from({length:concurrency},worker));
  const elapsedMs=performance.now()-started;
  return {concurrency,requestRateCap:requestsPerSecond,durationRequestedMs:durationMs,elapsedMs:Number(elapsedMs.toFixed(2)),completed,bytes,statuses,errors,stoppedOnBusyOrFailure:stopped,requestsPerSecond:Number((completed*1000/elapsedMs).toFixed(2)),latencyMs:{p50:quantile(latencies,.5),p95:quantile(latencies,.95),p99:quantile(latencies,.99)},scope:'GET synthetic model transport only; no customer capacity claim'};
}

export async function loadTest({url,concurrencies=[1,2,4],durationMs=3000,requestsPerSecond=10}={}) {
  const target=loopbackTarget(url);
  if(!Array.isArray(concurrencies)||!concurrencies.length||concurrencies.length>4)throw fail('STAGE_BOUNDS');
  const identity=await assertPilot(target),stages=[];
  for(const concurrency of concurrencies){
    const stage=await runStage(target,{concurrency,durationMs,requestsPerSecond});stages.push(stage);
    if(stage.stoppedOnBusyOrFailure)break;
  }
  return {schema:'gravuru-loopback-transport-test/v1',checkedAt:new Date().toISOString(),origin:target.origin,identity,methods:['GET'],routes:['/pilot/health','/pilot/model'],externalRequests:0,stages,productionCapacityProven:false,limits:['Closed-loop test with global rate cap, not a realistic marketing arrival model.','No photo upload, image validation, SQLite persistence, Shopify cart or production rendering is exercised.','No traffic is sent to Plesk, Shopify, a DNS hostname or an HTTP proxy.']};
}

async function cli(){
  const values={};
  for(let i=2;i<process.argv.length;i++){
    const key=process.argv[i];if(!['--url','--concurrency','--duration-ms','--rps'].includes(key)||values[key]!==undefined||i+1>=process.argv.length)throw fail('ARGUMENTS');values[key]=process.argv[++i];
  }
  const result=await loadTest({url:values['--url'],...(values['--concurrency']?{concurrencies:values['--concurrency'].split(',').map(Number)}:{}),...(values['--duration-ms']?{durationMs:Number(values['--duration-ms'])}:{}),...(values['--rps']?{requestsPerSecond:Number(values['--rps'])}:{})});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  cli().catch(e=>{process.stderr.write('Lokaler Test gestoppt: '+(/^[A-Z_]{1,50}$/.test(e.code||'')?e.code:'REQUEST_ERROR')+'\n');process.exitCode=1;});
}
