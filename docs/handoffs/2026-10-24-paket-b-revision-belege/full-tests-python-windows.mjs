// Test-only Windows command alias. No result, assertion, exception, or status is changed.
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {promisify} from 'node:util';
if(process.platform==='win32'){
  if(!process.env.GRAVURU_PYTHON)throw Error('GRAVURU_PYTHON must name the existing test interpreter.');
  const redirect=file=>file==='python3'?process.env.GRAVURU_PYTHON:file;
  for(const name of ['spawn','spawnSync','execFile','execFileSync']){
    const original=cp[name];
    const wrapped=function(file,...args){return Reflect.apply(original,this,[redirect(file),...args]);};
    if(name==='execFile')Object.defineProperty(wrapped,promisify.custom,{value:(...args)=>{
      let child;
      const promise=new Promise((resolve,reject)=>{child=wrapped(...args,(error,stdout,stderr)=>{
        if(error){error.stdout=stdout;error.stderr=stderr;reject(error);}else resolve({stdout,stderr});
      });});
      promise.child=child;return promise;
    }});
    cp[name]=wrapped;
  }
  syncBuiltinESMExports();
}
