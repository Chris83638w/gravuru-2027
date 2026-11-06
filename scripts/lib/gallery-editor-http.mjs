import fs from 'node:fs';
import {createGalleryEditor} from '../../app/workshop/gallery-editor.mjs';

const json=(res,status,value)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const files=new Map([['/originale/editor',['gallery-editor.html','text/html; charset=utf-8']],['/originale/editor.js',['gallery-editor.mjs','text/javascript; charset=utf-8']],['/originale/editor.css',['gallery-editor.css','text/css; charset=utf-8']]]);
export function createGalleryEditorHandler({workshop,targets,csrfToken,onSaved=()=>{}}){
 const service=createGalleryEditor({workshop,targets});
 async function route(req,res,url){
  try{
   const origin='http://'+req.headers.host;
   if(req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')fail(403,'Bitte die private Galerie neu öffnen.');
   if(files.has(url.pathname)){
    if(!['GET','HEAD'].includes(req.method))fail(405,'Diese Seite wird nur gelesen.');
    const [name,type]=files.get(url.pathname),bytes=fs.readFileSync(new URL('../../app/workshop/ui/'+name,import.meta.url));
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; frame-src 'self'; object-src 'none'; frame-ancestors 'self'"});res.end(req.method==='HEAD'?undefined:bytes);return;
   }
   if(req.method==='GET'){
    const allowed=url.pathname==='/originale/editor/context'?['productId','designId','originalId']:['productId','designId','originalId','revision','assetId','part'];
    if(allowed.some(k=>url.searchParams.getAll(k).length!==1)||[...url.searchParams.keys()].some(k=>!allowed.includes(k)))fail(422,'Bitte genau eine Galerievorlage wählen.');
    const target=Object.fromEntries(['productId','designId','originalId'].map(k=>[k,url.searchParams.get(k)]));
    if(url.pathname==='/originale/editor/context')return json(res,200,{...service.open(target),csrfToken});
    if(url.pathname==='/originale/editor/media'){
     const bytes=service.media(target,url.searchParams.get('assetId'),url.searchParams.get('part'),Number(url.searchParams.get('revision')));
     const mime=bytes[0]===0xff&&bytes[1]===0xd8?'image/jpeg':bytes.subarray(8,12).toString()==='WEBP'?'image/webp':'image/png';
     res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);return;
    }
    fail(404,'Diese Galeriefunktion fehlt.');
   }
   if(req.method!=='POST'||!['/originale/editor/save','/originale/editor/media'].includes(url.pathname))fail(405,'Diese Aktion wird nicht unterstützt.');
   if(req.headers.origin!==origin||req.headers['x-slate-review-csrf']!==csrfToken)fail(403,'Die private Sitzung ist nicht mehr gültig. Bitte die Galerie neu öffnen.');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Die Bearbeitung konnte nicht gelesen werden.');
   const limit=url.pathname.endsWith('/media')?64*1024*1024:1024*1024;
   let size=0;const chunks=[];
   for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size<=limit)chunks.push(chunk);}
   if(size>limit){res.setHeader('Connection','close');fail(413,'Die Übertragung ist zu groß. Pro Bildfassung sind höchstens 15 MB möglich.');}
   let input;try{input=JSON.parse(Buffer.concat(chunks));}catch{fail(400,'Die Bearbeitung konnte nicht gelesen werden.');}
   const result=url.pathname.endsWith('/media')?await service.upload(input):service.save(input);
   if(url.pathname.endsWith('/save'))onSaved(result);
   json(res,200,result);
  }catch(error){json(res,error.status||422,{error:{code:error.code||'review_editor_error',message:error.status===500?'Speichern ist momentan nicht möglich. Deine Bearbeitung bleibt geöffnet.':error.message,actualRevision:error.actualRevision}});}
 }
 return (req,res,url)=>{if(!files.has(url.pathname)&&!url.pathname.startsWith('/originale/editor/'))return false;void route(req,res,url);return true;};
}
