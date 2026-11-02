import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Preserve the frozen comparison path, but do not deliver its device defaults,
// drawing, options or historical commerce implementation to native products.
export function splitReferenceDevice(source,directory){
 const prefixes=['window.FunkklingelFrames=','window.FunkklingelBetaCSS=','window.FunkklingelReleaseCSS='];
 const scripts=[...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
 const selected=prefixes.map(prefix=>{
  const found=scripts.filter(m=>!m[1].trim()&&m[2].startsWith(prefix));
  if(found.length!==1)throw Error('Reference device script is not unique: '+prefix);
  return found[0];
 });
 const content=selected.map(m=>m[2]).join('\n;\n');
 const hash=createHash('sha256').update(content).digest('hex').slice(0,16);
 const name='reference-device-'+hash+'.js',file=path.join(directory,name);
 fs.mkdirSync(directory,{recursive:true});
 if(!fs.existsSync(file)){
  const temporary=file+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,content);fs.renameSync(temporary,file);
 }
 for(const [i,m] of selected.entries())source=source.replace(m[0],i===0?'<script>window.Funkklingel={};</script>':'');
 const marker='window.GravuruProfileChoices=await ';
 if(source.split(marker).length!==2)throw Error('Native editor bootstrap is not unique');
 const url='/_runtime/lazy/'+name;
 const loader="if(!window.parent.UniversalConfig)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src="+JSON.stringify(url)+";script.onload=resolve;script.onerror=()=>reject(Error('Vergleichseditor konnte nicht geladen werden'));document.head.append(script);});";
 source=source.replace(marker,loader+marker);
 return {source,url,bytes:Buffer.byteLength(content)};
}
