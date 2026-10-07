// Only fixed codes and known source locations; never error messages or values.
const codes=new Set(['EACCES','EPERM','ENOENT','EADDRINUSE','EMFILE','ENOSPC','EAGAIN','ERR_MODULE_NOT_FOUND','ERR_SQLITE_ERROR']);
const files=new Set(['app.cjs','runtime.mjs','config.mjs','lock.mjs','build.mjs','http.mjs','product-repository.mjs']);
function startupDiagnostic(error){
  const frames=String(error?.stack||'').split('\n').slice(1).flatMap(line=>{
    const match=line.match(/[/\\]([a-zA-Z0-9_.-]+\.(?:mjs|cjs|js)):(\d+):(\d+)/);
    return match&&files.has(match[1])?[{file:match[1],line:Number(match[2]),column:Number(match[3])}]:[];
  }).slice(0,6);
  const result={code:codes.has(error?.code)?error.code:'UNKNOWN',frames};
  if(error?.code==='ENOENT'){
    const fs=require('node:fs');
    result.pythonCandidates=['/usr/bin/python3','/usr/bin/python3.11','/usr/bin/python3.12','/opt/alt/python311/bin/python3','/opt/alt/python312/bin/python3'].map(path=>{
      try{fs.accessSync(path,fs.constants.X_OK);return {path,executable:true};}catch{return {path,executable:false};}
    });
  }
  return result;
}
module.exports={startupDiagnostic};
