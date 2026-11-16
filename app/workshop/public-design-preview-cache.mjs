import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,createHmac,timingSafeEqual,randomBytes} from 'node:crypto';

const SCHEMA='gravuru-public-template-preview/v1',HASH=/^[a-f0-9]{64}$/;
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export const previewDigest=value=>sha(JSON.stringify(canonical(value)));
// The imported renderer graph is fingerprinted once per process. Flat native
// plates use only resources contained in their immutable model/assets; legacy
// scene/doorbell renderers with separately loaded resources remain private.
let renderer;
export function publicPreviewRendererFingerprint(){
 if(renderer)return renderer;
 const seen=new Map(),root=new URL('./product-preview.mjs',import.meta.url);
 function visit(url){const filename=fileURLToPath(url);if(seen.has(filename))return;const text=fs.readFileSync(url,'utf8');seen.set(filename,[url.pathname.split('/app/').at(-1),sha(text)]);
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+\.mjs)['"]/g))visit(new URL(match[1],url));}
 visit(root);renderer=previewDigest([...seen.values()].sort((a,b)=>a[0].localeCompare(b[0])));return renderer;
}
// Dedicated derived-file cache, never an original/design/customer-upload store.
// Address includes tenant, shop, binding, exact model/resources/options and
// renderer. Identical SVG bytes in two stores therefore have different URLs.
export function createPublicDesignPreviewCache({directory,secret,rendererFingerprint=publicPreviewRendererFingerprint(),maxBytes=64*1024*1024}={}){
 if(typeof directory!=='string'||!path.isAbsolute(directory)||path.resolve(directory)!==directory||typeof secret!=='string'||secret.length<16||!HASH.test(rendererFingerprint)||!Number.isSafeInteger(maxBytes)||maxBytes<1024)throw Error('Ungültiger öffentlicher Vorschauspeicher.');
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 if(fs.lstatSync(directory).isSymbolicLink())throw Error('Vorschauspeicher darf keine Verknüpfung sein.');
 const key=createHmac('sha256',secret).update(SCHEMA).digest(),sign=value=>createHmac('sha256',key).update(value).digest('hex');
 const address=identity=>sign(JSON.stringify(canonical(identity)));
 const filename=id=>path.join(directory,id+'.json');
 function read(id){
  if(!HASH.test(id||''))return null;
  try{const file=filename(id),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>3*1024*1024)return null;
   const value=JSON.parse(fs.readFileSync(file,'utf8')),payload=value.payload,text=JSON.stringify(payload);
   if(!HASH.test(value.signature||'')||!timingSafeEqual(Buffer.from(value.signature),Buffer.from(sign(text)))||payload?.schema!==SCHEMA||address(payload.identity)!==id||payload.identity?.renderer!==rendererFingerprint||typeof payload.body!=='string')return null;
   const body=Buffer.from(payload.body,'base64');if(!body.length||body.length>2*1024*1024||sha(body)!==payload.bodyHash)return null;
   return {hash:id,identity:payload.identity,body};
  }catch{return null;}
 }
 function get(identity){const hit=read(address(identity));return hit&&previewDigest(hit.identity)===previewDigest(identity)?hit:null;}
 function put(identity,body){
  if(identity?.renderer!==rendererFingerprint||!Buffer.isBuffer(body)||!body.length||body.length>2*1024*1024)throw Error('Vorschau überschreitet den erlaubten Rahmen.');
  const id=address(identity),old=read(id);if(old){if(!old.body.equals(body))throw Error('Unveränderliche Vorschau hat abweichenden Inhalt.');return old;}
  const payload={schema:SCHEMA,identity:canonical(identity),bodyHash:sha(body),body:body.toString('base64')},text=JSON.stringify({payload,signature:sign(JSON.stringify(payload))});
  const used=fs.readdirSync(directory).filter(name=>/^[a-f0-9]{64}\.json$/.test(name)).reduce((sum,name)=>sum+fs.lstatSync(path.join(directory,name)).size,0);
  if(used+Buffer.byteLength(text)>maxBytes)throw Error('Vorschauspeicher ist voll.');
  const temp=path.join(directory,'.'+randomBytes(12).toString('hex')+'.tmp');
  try{fs.writeFileSync(temp,text,{flag:'wx',mode:0o600});try{fs.linkSync(temp,filename(id));}catch(error){if(error.code!=='EEXIST')throw error;}}
  finally{try{fs.unlinkSync(temp);}catch{}}
  const saved=read(id);if(!saved||!saved.body.equals(body))throw Error('Vorschau konnte nicht unveränderlich gesichert werden.');return saved;
 }
 return Object.freeze({rendererFingerprint,get,read,put});
}
