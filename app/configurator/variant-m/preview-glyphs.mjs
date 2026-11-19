// Small preview outlines for design cards. The same glyph paths as the full
// font, limited to the template characters. Production and the stage keep the
// full font in el.fontData and never read this pack.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PREVIEW_GLYPH_SCHEMA='gravuru-preview-glyphs/v1';
export const previewGlyphPath=hash=>'/_acryl-runtime/lazy/vorschau-glyphen/'+hash+'.json';
const PATH=/^\/_acryl-runtime\/lazy\/vorschau-glyphen\/([a-f0-9]{64})\.json$/;
export const previewGlyphHash=pathname=>PATH.exec(pathname)?.[1]||null;

export function templateCharacters(universal){
 const chars=new Set(['?']);
 const formats=universal?.doorbell?.formats;
 const designs=Array.isArray(formats)&&formats.length?formats.flatMap(format=>format?.profile?.designs||[]):[];
 for(const design of designs)for(const object of design?.objects||[]){
  if(object?.type!=='text'||typeof object.text!=='string')continue;
  for(const char of object.text)if(char!=='\n')chars.add(char);
 }
 return [...chars].sort();
}

function subsetFace(face,characters){
 if(!face||typeof face!=='object'||!face.glyphs||typeof face.glyphs!=='object')return null;
 const glyphs={};
 for(const char of characters)if(Object.hasOwn(face.glyphs,char))glyphs[char]=face.glyphs[char];
 return {...face,glyphs};
}

export function previewGlyphPack(universal){
 if(universal?.doorbell?.schema!=='gravuru-doorbell/v1')return null;
 const characters=templateCharacters(universal);
 const names=new Set();
 for(const format of universal.doorbell.formats||[])for(const design of format?.profile?.designs||[])for(const object of design?.objects||[])if(object?.type==='text'&&typeof object.font==='string')names.add(object.font);
 const fonts={};
 for(const name of [...names].sort()){
  const font=universal.localResources?.fonts?.[name];
  if(!font||typeof font!=='object')continue;
  const regular=subsetFace(font.regular,characters);
  if(!regular)continue;
  const bold=subsetFace(font.bold,characters);
  fonts[name]={regular,...(bold?{bold}:{})};
 }
 if(!Object.keys(fonts).length)return null;
 const body=Buffer.from(JSON.stringify({schema:PREVIEW_GLYPH_SCHEMA,characters,fonts}));
 const hash=createHash('sha256').update(body).digest('hex');
 return {hash,body,url:previewGlyphPath(hash)};
}
export function writePreviewGlyphPack(directory,pack){
 if(!directory||!/^[a-f0-9]{64}$/.test(pack?.hash||'')||!Buffer.isBuffer(pack.body))return null;
 fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,pack.hash+'.json');
 const temp=file+'.'+process.pid+'.tmp';
 fs.writeFileSync(temp,pack.body);fs.renameSync(temp,file);return file;
}
export function readPreviewGlyphPack(directory,hash){
 if(!directory||!/^[a-f0-9]{64}$/.test(hash||''))return null;
 try{return fs.readFileSync(path.join(directory,hash+'.json'));}catch{return null;}
}
export function rebuildPreviewGlyphPack(universals,hash){
 if(!/^[a-f0-9]{64}$/.test(hash||''))return null;
 for(const universal of universals||[]){let pack;try{pack=previewGlyphPack(universal);}catch{continue;}if(pack?.hash===hash)return pack;}
 return null;
}
export function prunePreviewGlyphPacks(directory,{keep=32}={}){
 if(!directory||!Number.isSafeInteger(keep)||keep<1)return 0;
 let names=[];try{names=fs.readdirSync(directory);}catch{return 0;}
 const files=names.filter(name=>/^[a-f0-9]{64}\.json$/.test(name)).map(name=>{const file=path.join(directory,name);let mtime=0;try{mtime=fs.statSync(file).mtimeMs;}catch{}return {file,mtime};}).sort((a,b)=>b.mtime-a.mtime);
 let removed=0;for(const item of files.slice(keep)){try{fs.rmSync(item.file);removed++;}catch{}}
 return removed;
}
export function previewGlyphFromModels(universals,hash,directory,{keep=32}={}){
 const pack=rebuildPreviewGlyphPack(universals,hash);if(!pack)return null;
 if(directory){writePreviewGlyphPack(directory,pack);prunePreviewGlyphPacks(directory,{keep});}
 return pack.body;
}
