import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join,delimiter} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';

export const MAX_CUSTOMER_VECTOR_LOGO=2*1024*1024;
export const MAX_CUSTOMER_VECTOR_LOGO_BYTES=MAX_CUSTOMER_VECTOR_LOGO;
export const CUSTOMER_VECTOR_LOGO_VERSION='svg-black-v1';
const MAX_OUTPUT=4*1024*1024;
const worker=fileURLToPath(new URL('./customer-vector-logo.py',import.meta.url));
const localPython=fileURLToPath(new URL('../../.local-data/python',import.meta.url));
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python',process.platform==='win32'?'python.exe':'bin/python3');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const failure=(code,message,status=422)=>Object.assign(Error(message),{code,status});
let active=0;

/** Original bytes are immutable evidence, never a browser-renderable resource.
 * svg/preview are passive paths built by the worker, never raw uploaded markup.
 * width/height are viewBox units. Physical source sizes are optional, never guessed.
 */
export async function prepareCustomerVectorLogo({name,bytes}={}){
  if(typeof name!=='string'||!name.toLowerCase().endsWith('.svg'))throw failure('logo_format','Bitte ein Vektorlogo als SVG hochladen. Fotos und PDF werden hier nicht unterstützt.');
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>MAX_CUSTOMER_VECTOR_LOGO)throw failure('logo_size','Das SVG-Logo darf höchstens 2 MB groß sein.',413);
  if(active>=2)throw failure('logo_busy','Die Logoprüfung ist gerade ausgelastet. Bitte gleich noch einmal versuchen.',503);
  // Snapshot the buffer before an asynchronous caller could change its content.
  const original=Buffer.from(bytes);
  active++;
  try{
    const result=await new Promise((resolve,reject)=>{
      const binary=process.env.GRAVURU_PYTHON||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
      const child=spawn(binary,[worker],{windowsHide:true,env:{...process.env,PYTHONPATH:[localPython,process.env.PYTHONPATH].filter(Boolean).join(delimiter)},stdio:['pipe','pipe','pipe']});
      let done=false,size=0;const chunks=[];
      const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
      const timer=setTimeout(()=>{child.kill();finish(failure('logo_timeout','Das Logo ist zu aufwendig für die automatische Prüfung. Bitte die SVG-Datei vereinfachen.'));},15000);
      child.on('error',()=>finish(failure('logo_converter_unavailable','Die Vektorprüfung ist derzeit nicht verfügbar.',503)));
      child.stderr.on('data',()=>{}); // Never return uploaded document contents in diagnostics.
      child.stdin.on('error',()=>{});
      child.stdout.on('data',chunk=>{
        size+=chunk.length;
        if(size>MAX_OUTPUT){child.kill();finish(failure('logo_complexity','Die umgewandelte Vektordatei ist zu groß.'));}
        else chunks.push(chunk);
      });
      child.on('close',code=>{
        if(done)return;
        try{
          const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if(value.error){finish(failure(value.error.code,value.error.message,value.error.code==='logo_converter_unavailable'?503:422));return;}
          if(code!==0||value.version!==CUSTOMER_VECTOR_LOGO_VERSION||typeof value.svg!=='string'||typeof value.preview!=='string'||![value.width,value.height].every(n=>Number.isFinite(n)&&n>0)||!Array.isArray(value.warnings)||value.warnings.some(x=>typeof x!=='string'))throw Error();
          finish(null,value);
        }catch{finish(failure('logo_invalid','Die SVG-Datei konnte nicht sicher als Vektorlogo gelesen werden.'));}
      });
      child.stdin.end(JSON.stringify({bytes:original.toString('base64')}));
    });
    const svg=Buffer.from(result.svg,'utf8'),preview=Buffer.from(result.preview,'utf8'),sourceSha256=hash(original);
    if(svg.length>MAX_CUSTOMER_VECTOR_LOGO||preview.length>MAX_CUSTOMER_VECTOR_LOGO)throw failure('logo_complexity','Die umgewandelte Vektordatei ist zu groß. Bitte die SVG-Datei vereinfachen.');
    return {...result,original,svg,preview,sourceSha256,sha256:sourceSha256,outputSha256:hash(svg)};
  }finally{active--;}
}
