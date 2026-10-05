import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {importEnvironment} from './design-assets.mjs';
export function formContourPdf(document,{id,revision}){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.env.GRAVURU_PYTHON||(process.platform==='win32'?'python':'python3'),[fileURLToPath(new URL('./contour-pdf.py',import.meta.url))],{env:importEnvironment(),windowsHide:true,stdio:['pipe','pipe','pipe']});
  let done=false,bytes=0;const chunks=[];
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422,code:'contour_pdf_failed'})):resolve(result);};
  const timer=setTimeout(()=>{child.kill();finish('Die Kontur-PDF konnte nicht rechtzeitig erstellt werden.');},45000);
  child.on('error',()=>finish('Python ist für die Kontur-PDF nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
  child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>8*1024*1024){child.kill();finish('Die Kontur-PDF ist zu groß.');}else chunks.push(chunk);});
  child.on('close',code=>{const buffer=Buffer.concat(chunks);if(code!==0||!buffer.subarray(0,5).equals(Buffer.from('%PDF-')))finish('Die Kontur-PDF konnte nicht zuverlässig erstellt werden.');else finish(null,buffer);});
  child.stdin.end(JSON.stringify({geometry:document.form.geometry,reference:`${id}:${revision}; contour=${document.form.contourId}; geometry=${document.form.geometrySha256}`}));
 });
}
