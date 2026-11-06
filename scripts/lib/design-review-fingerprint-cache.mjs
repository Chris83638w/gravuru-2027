// Optional, disposable private acceleration. No documents, assets or approval
// events are stored here. An invalid/missing file always falls back to hashing.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const schema='gravuru-derived-review-fingerprints/v1', hash=/^[a-f0-9]{64}$/;
const digest=value=>createHash('sha256').update(value).digest('hex');
const allowedResource=r=>r&&Object.keys(r).sort().join(',')==='key,kind,sha256'&&hash.test(r.sha256)&&
  (r.kind==='asset'&&hash.test(r.key)||r.kind==='url'&&/^\/api\/workshop\/material-surfaces\/[a-f0-9]{64}\.png$/.test(r.key));
const validEntry=e=>e&&Object.keys(e).sort().join(',')==='fingerprint,resources'&&hash.test(e.fingerprint)&&Array.isArray(e.resources)&&e.resources.length<=100&&e.resources.every(allowedResource);

export function createDesignReviewFingerprintCache({filename,scope,maxEntries=100000,maxBytes=32*1024*1024}={}) {
  let dirty=false, lastError=null;
  const entries=new Map(),enabled=typeof filename==='string'&&path.isAbsolute(filename)&&hash.test(scope||'');
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||!Number.isSafeInteger(maxBytes)||maxBytes<100)throw Error('Invalid derived cache bounds');
  const safeFile=()=>{try{return !fs.lstatSync(filename).isSymbolicLink();}catch(e){return e.code==='ENOENT';}};
  if(enabled)try{
    if(!safeFile())throw Error('symlink');
    const stat=fs.statSync(filename);if(stat.size>maxBytes)throw Error('size');
    const parsed=JSON.parse(fs.readFileSync(filename,'utf8'));
    if(parsed.schema!==schema||parsed.scope!==scope||!Array.isArray(parsed.entries)||parsed.entries.length>maxEntries||
      parsed.sha256!==digest(JSON.stringify(parsed.entries)))throw Error('invalid');
    for(const pair of parsed.entries){if(!Array.isArray(pair)||pair.length!==2||!hash.test(pair[0])||!validEntry(pair[1])||entries.has(pair[0]))throw Error('entry');entries.set(pair[0],pair[1]);}
  }catch(e){entries.clear();if(e.code!=='ENOENT')lastError='cache-unavailable';}
  return {
    get:key=>enabled&&hash.test(key||'')&&entries.has(key)?structuredClone(entries.get(key)):null,
    put(key,value){
      if(!enabled)return;
      if(!hash.test(key||'')||!validEntry(value))throw Error('Invalid derived fingerprint entry');
      if(JSON.stringify(entries.get(key))===JSON.stringify(value))return;
      entries.delete(key);entries.set(key,structuredClone(value));dirty=true;
      while(entries.size>maxEntries)entries.delete(entries.keys().next().value);
    },
    flush(){
      if(!enabled||!dirty)return false;
      let temporary;
      try{
        if(!safeFile())throw Error('symlink');
        const rows=[...entries],body=JSON.stringify({schema,scope,entries:rows,sha256:digest(JSON.stringify(rows))})+'\n';
        if(Buffer.byteLength(body)>maxBytes)throw Error('size');
        temporary=filename+'.'+randomUUID()+'.tmp';
        const fd=fs.openSync(temporary,'wx',0o600);
        try{fs.writeFileSync(fd,body);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
        fs.renameSync(temporary,filename);temporary=null;dirty=false;lastError=null;return true;
      }catch{lastError='cache-write-unavailable';return false;}
      finally{if(temporary)try{fs.unlinkSync(temporary);}catch{}}
    },
    status:()=>({enabled,entries:entries.size,dirty,error:lastError}),
  };
}
