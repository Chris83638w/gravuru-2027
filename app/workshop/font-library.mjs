import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {sha256,importEnvironment} from './design-assets.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'font_import'});};
export const MAX_FONT_BYTES=8*1024*1024;
export function convertFont(bytes){return new Promise((resolve,reject)=>{
 const child=spawn(process.env.GRAVURU_PYTHON||'python3',[fileURLToPath(new URL('./font-import.py',import.meta.url))],{env:importEnvironment(),stdio:['pipe','pipe','pipe']});
 let done=false,count=0;const chunks=[];
 const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422,code:'font_import'})):resolve(result);};
 const timer=setTimeout(()=>{child.kill();finish('Die Schriftprüfung dauert zu lange.');},25000);
 child.on('error',()=>finish('Die Schriftprüfung ist derzeit nicht verfügbar.'));
 child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
 child.stdout.on('data',chunk=>{count+=chunk.length;if(count>MAX_FONT_BYTES+4096){child.kill();finish('Die vollständigen Schriftpfade sind zu umfangreich.');}else chunks.push(chunk);});
 child.on('close',code=>{if(done)return;try{const data=JSON.parse(Buffer.concat(chunks).toString());if(code||data.error)finish(data.error||'Die Schrift konnte nicht gelesen werden.');else finish(null,data);}catch{finish('Die Schriftprüfung hat keine gültige Antwort geliefert.');}});
 child.stdin.end(JSON.stringify({bytes}));
});}
export function createFontLibrary({filename,converter=convertFont}){
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);let busy=false;
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS workshop_fonts (sha256 TEXT PRIMARY KEY,id TEXT UNIQUE NOT NULL,name TEXT NOT NULL,glyph_count INTEGER NOT NULL,original BLOB NOT NULL,resource TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS workshop_font_immutable BEFORE UPDATE ON workshop_fonts BEGIN SELECT RAISE(ABORT,'immutable font'); END;`);
 const list=()=>db.prepare('SELECT sha256,id,name,glyph_count AS glyphCount FROM workshop_fonts ORDER BY name').all().map(row=>({...row}));
 return {list,resources:()=>Object.fromEntries(db.prepare('SELECT id,resource FROM workshop_fonts').all().map(row=>[row.id,JSON.parse(row.resource)])),
 async import({name,bytes}){
  if(typeof name!=='string'||name.length>200||/[\x00-\x1f\\/]/.test(name)||!/\.(ttf|otf)$/i.test(name))fail('Bitte eine TTF- oder OTF-Datei auswählen.');
  if(typeof bytes!=='string'||!bytes.length||bytes.length>Math.ceil(MAX_FONT_BYTES/3)*4||Buffer.from(bytes,'base64').toString('base64')!==bytes)fail('Bitte eine Schriftdatei bis 8 MB auswählen.');
  const original=Buffer.from(bytes,'base64'),hash=sha256(original),existing=list().find(row=>row.sha256===hash);if(existing)return existing;
  if(busy)fail('Eine Schrift wird gerade geprüft. Bitte kurz danach erneut versuchen.');
  busy=true;let data;try{data=await converter(bytes);}finally{busy=false;}
  if(!data.font?.regular?.glyphs||!Number.isInteger(data.glyphCount)||data.glyphCount<1||data.glyphCount>10000)fail('Ungültige Schriftpfade.');
  const label=String(data.name).replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,150)||name;
  const id=label+' · '+hash.slice(0,12);
  db.prepare('INSERT INTO workshop_fonts VALUES (?,?,?,?,?,?)').run(hash,id,label,data.glyphCount,original,JSON.stringify(data.font));
  return {sha256:hash,id,name:label,glyphCount:data.glyphCount};
 },close:()=>db.close()};
}
