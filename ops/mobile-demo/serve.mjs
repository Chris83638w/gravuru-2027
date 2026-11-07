import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {demoNamespace} from './build.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
export function verifyDemoPackage(directory){
 const root=fs.realpathSync(directory),manifest=JSON.parse(fs.readFileSync(path.join(root,'MANIFEST.json'),'utf8'));
 if(manifest.schema!=='gravuru-mobile-demo/v1'||manifest.checkout!==false)throw Error('Kein abgeschlossenes Demo-Paket.');demoNamespace(manifest.namespace);
 for(const [relative,proof] of Object.entries(manifest.files)){
  if(relative.startsWith('/')||relative.includes('\\')||relative.split('/').some(p=>!p||p==='..'||p.startsWith('.')))throw Error('Ungültiger Manifestpfad.');
  const file=path.resolve(root,relative),real=fs.realpathSync(file),within=path.relative(root,real);
  if(within.startsWith('..')||path.isAbsolute(within))throw Error('Datei verlässt Paket.');
  const bytes=fs.readFileSync(real);if(bytes.length!==proof.bytes||sha(bytes)!==proof.sha256)throw Error('Paket-Prüfsumme abweichend: '+relative);
 }
 return {root,manifest};
}
export function createDemoServer({directory}={}){
 const {root,manifest}=verifyDemoPackage(directory),prefix=manifest.namespace;
 return http.createServer((req,res)=>{
  const fail=status=>res.writeHead(status,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end();
  if(!['GET','HEAD'].includes(req.method))return fail(405);
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://demo.invalid').pathname);}catch{return fail(400);}
  if(!pathname.startsWith(prefix)||pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p==='..'||p.startsWith('.')))return fail(404);
  const relative=pathname.slice(prefix.length)||'index.html';if(!Object.hasOwn(manifest.files,relative)||relative.endsWith('.gz'))return fail(404);
  let selected=relative,encoding=null;
  const accepts=String(req.headers['accept-encoding']||'').split(',').some(p=>{const [kind,...opts]=p.trim().split(';');return kind==='gzip'&&!opts.some(v=>/^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(v));});
  if(accepts&&Object.hasOwn(manifest.files,relative+'.gz')){selected+='.gz';encoding='gzip';}
  try{
   const bytes=fs.readFileSync(path.join(root,selected));
   if(bytes.length!==manifest.files[selected].bytes||sha(bytes)!==manifest.files[selected].sha256)return fail(503);
   const headers={'Content-Type':relative==='api/guides'?'application/json; charset=utf-8':types[path.extname(relative)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Accept-Encoding'};
   if(encoding)headers['Content-Encoding']=encoding;
   res.writeHead(200,headers).end(req.method==='HEAD'?undefined:bytes);
  }catch{return fail(404);}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args={};for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i].startsWith('--')||!process.argv[i+1])throw Error('Option und Wert erforderlich.');args[process.argv[i].slice(2)]=process.argv[i+1];}
 if(!args.directory)throw Error('--directory fehlt.');
 for(const key of Object.keys(args))if(!['directory','port','host'].includes(key))throw Error('Unbekannte Option: '+key);
 const port=Number(args.port||8217),host=args.host||'127.0.0.1';if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Ungültiger Port.');
 const server=createDemoServer({directory:args.directory}),manifest=JSON.parse(fs.readFileSync(path.join(args.directory,'MANIFEST.json')));
 server.listen(port,host,()=>console.log(JSON.stringify({url:'http://'+host+':'+port+manifest.namespace,checkout:false,readOnly:true})));
}
