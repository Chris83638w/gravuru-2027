import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';

const BUNDLE=/^\/_bundle\/(editor-[a-f0-9]{16}\.mjs)$/;
const MAX_SOURCE=20*1024*1024,MAX_CACHE=32*1024*1024;

// These are the already public build artifacts, never models, previews or uploads.
// Authorization is deliberately evaluated again on every hit by the existing host.
export function createPreparedEditorBundles({outputDirectory,transform,authorize,headers=()=>({})}){
 if(typeof transform!=='function'||typeof authorize!=='function')throw new TypeError('Bundle host functions required.');
 const directory=path.resolve(outputDirectory,'bundle'),cache=new Map();let cacheBytes=0;
 function remove(name){const old=cache.get(name);if(old){cacheBytes-=old.cost;cache.delete(name);}}
 function load(name){
  const file=path.join(directory,name),root=fs.realpathSync(directory),real=fs.realpathSync(file);
  if(path.dirname(real)!==root||fs.lstatSync(file).isSymbolicLink())return null;
  const stat=fs.statSync(file,{bigint:true});
  if(!stat.isFile()||stat.size>BigInt(MAX_SOURCE))return null;
  const stamp=[stat.dev,stat.ino,stat.size,stat.mtimeNs,stat.ctimeNs].join(':');
  const hit=cache.get(name);if(hit?.stamp===stamp){cache.delete(name);cache.set(name,hit);return hit;}
  remove(name);
  const source=fs.readFileSync(file),after=fs.statSync(file,{bigint:true});
  if([after.dev,after.ino,after.size,after.mtimeNs,after.ctimeNs].join(':')!==stamp)return null;
  const identity=Buffer.from(transform(source.toString('utf8'),'/_bundle/'+name)),gzip=gzipSync(identity,{level:9});
  const result={stamp,identity,gzip,cost:identity.length+gzip.length};
  if(result.cost<=MAX_CACHE){while(cacheBytes+result.cost>MAX_CACHE)remove(cache.keys().next().value);cache.set(name,result);cacheBytes+=result.cost;}
  return result;
 }
 // The two existing HTML preloads identify the active core and presentation chunk.
 // Historical chunks remain available on demand; no artifact is removed or written.
 try{
  const html=path.join(outputDirectory,'editor.html');
  if(fs.statSync(html).size<1024*1024){
   const names=[...fs.readFileSync(html,'utf8').matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="(\/_bundle\/editor-[a-f0-9]{16}\.mjs)"[^>]*>/g)].slice(0,2);
   for(const match of names)try{load(BUNDLE.exec(match[1])[1]);}catch{/* The original asset route remains the fallback. */}
  }
 }catch{/* No prepared output: leave the existing route available. */}
 return function handlePreparedBundle(req,res,pathname){
  const match=BUNDLE.exec(pathname);if(!match)return false;
  const common=headers(pathname),fail=status=>{res.writeHead(status,{...common,'Cache-Control':'no-store'});res.end();return true;};
  if(!authorize(req,pathname))return fail(403);
  if(!['GET','HEAD'].includes(req.method))return fail(405);
  let asset;try{asset=load(match[1]);}catch{return false;}if(!asset)return false;
  const encoding=selectEncoding(req.headers['accept-encoding']);if(!encoding)return fail(406);
  const bytes=asset[encoding];
  res.writeHead(200,{...common,'Content-Type':'text/javascript; charset=utf-8','Content-Length':bytes.length,
   'Cache-Control':'public, max-age=31536000, immutable','Vary':'Accept-Encoding','X-Content-Type-Options':'nosniff',
   ...(encoding==='gzip'?{'Content-Encoding':'gzip'}:{})});
  res.end(req.method==='HEAD'?undefined:bytes);return true;
 };
}

function selectEncoding(header){
 const values=new Map();
 for(const part of String(header||'').split(',')){
  const [name,...params]=part.trim().toLowerCase().split(';').map(x=>x.trim());if(!name)continue;
  const q=params.find(x=>x.startsWith('q=')),quality=q?Number(q.slice(2)):1;
  values.set(name,Number.isFinite(quality)&&quality>=0&&quality<=1?quality:0);
 }
 const gzip=values.get('gzip')??values.get('*')??0;
 const identity=values.get('identity')??(values.get('*')===0?0:1);
 return gzip>0&&gzip>=identity?'gzip':identity>0?'identity':gzip>0?'gzip':null;
}
