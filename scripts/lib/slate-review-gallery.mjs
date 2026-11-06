import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createSlateReviewComments} from './slate-review-comments.mjs';
import {slateGalleryHtml} from './slate-review-gallery-page.mjs';
import {withSlateReviewMetadata} from './slate-review-catalog.mjs';
export {slateGalleryHtml};
export function createSlateGalleryHandler(root, importsFile, {csrfToken: suppliedToken} = {}) {
 const pack=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),imported=JSON.parse(fs.readFileSync(importsFile));
 pack.originals=pack.originals.map(row=>{
  const file=path.resolve(root,'originals',row.id,'design.json');
  if(!file.startsWith(path.resolve(root,'originals')+path.sep))throw Error('Invalid original path');
  return withSlateReviewMetadata(row,fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{});
 });
 const comments=createSlateReviewComments(path.join(path.dirname(importsFile),'review-comments.sqlite'),pack.originals.map(r=>r.id));
 const csrfToken=suppliedToken||randomBytes(32).toString('hex');
 const json=(res,status,data)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(data));
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 async function saveComment(req,res){
  try{
   if(req.headers.origin!=='http://'+req.headers.host||req.headers['x-slate-review-csrf']!==csrfToken)fail(403,'Bitte die Galerie neu laden.');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Kommentar konnte nicht gelesen werden.');
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>65536)fail(413,'Der Kommentar ist zu lang.');chunks.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'Kommentar konnte nicht gelesen werden.');}
   if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['designId','text','expectedRevision'].includes(k)))fail(422,'Ungültiger Kommentar.');
   const comment=comments.save(input.designId,input.text,input.expectedRevision);
   json(res,200,{designId:input.designId,comment});
  }catch(error){json(res,error.status||500,{error:error.status?error.message:'Speichern ist momentan nicht möglich. Deine Eingabe bleibt erhalten.'});}
 }
 const handler=(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(!url.pathname.startsWith('/originale'))return false;
  if(!/^(127\.0\.0\.1|localhost|\[::1\]):[0-9]+$/.test(req.headers.host||'')){json(res,403,{error:'Nur in der lokalen Galerie verfügbar.'});return true;}
  if(url.pathname==='/originale/comments'){
   if(req.method==='GET')json(res,200,{comments:comments.all()});
   else if(req.method==='POST')void saveComment(req,res);
   else json(res,405,{error:'Diese Aktion wird nicht unterstützt.'});
   return true;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return true;}
  let bytes,type;
  if(['/originale','/originale/'].includes(url.pathname)){bytes=Buffer.from(slateGalleryHtml(pack,imported,{comments:comments.all(),csrfToken}));type='text/html; charset=utf-8';}
  else if(url.pathname==='/originale/comments.js'){bytes=fs.readFileSync(new URL('./slate-review-comments-ui.js',import.meta.url));type='text/javascript; charset=utf-8';}
  else if(url.pathname==='/originale/gallery.js'){bytes=fs.readFileSync(new URL('./slate-review-gallery-ui.js',import.meta.url));type='text/javascript; charset=utf-8';}
  else if(url.pathname==='/originale/gallery.css'){bytes=fs.readFileSync(new URL('./slate-review-gallery.css',import.meta.url));type='text/css; charset=utf-8';}
  else{
   let relative;try{relative=decodeURIComponent(url.pathname.slice('/originale/files/'.length));}catch{res.writeHead(400).end();return true;}
   const file=path.resolve(root,relative),ext=path.extname(file).toLowerCase();
   if(!url.pathname.startsWith('/originale/files/originals/')||!file.startsWith(path.resolve(root)+path.sep)||!['.png','.jpg','.jpeg','.webp'].includes(ext)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return true;}
   bytes=fs.readFileSync(file);type=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
  }
  res.writeHead(200,{'Content-Type':type,'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:bytes);return true;
 };
 handler.close=()=>comments.close();
 return handler;
}
