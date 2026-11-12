// Sicherung des Legacy-Stores (Datenordner laut privater Händlerkonfiguration: private/gravuru-2027-merchant-data).
// Gleicher Weg wie sicherung-db.mjs (SQLite-Online-Backup, Quelle nur lesend, Kopie geprüft, nichts wird überschrieben),
// Ziel getrennt unter private/sicherungen-db/legacy/. Mit --pruefen wird nur gelistet und der Platz geprüft.
// Mit --arbeitskopie=<Stand> entsteht zusätzlich aus der fertigen Sicherung eine *.copy.sqlite für Lesevergleiche.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {sichern} from './sicherung-db.mjs';
const hier=import.meta.dirname;
const DATA=process.env.KT_LEGACY_DATA||path.resolve(hier,'../gravuru-2027-merchant-data');
const ZIEL=process.env.KT_LEGACY_ZIEL||path.resolve(hier,'../sicherungen-db/legacy');
const log=e=>console.log(JSON.stringify({event:'kt_legacy_sicherung',...e}));
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
try{
 const eintraege=fs.readdirSync(DATA,{withFileTypes:true}).map(e=>({name:e.name,art:e.isDirectory()?'ordner':e.isFile()?'datei':'sonst',bytes:e.isFile()?fs.statSync(path.join(DATA,e.name)).size:null}));
 const dbs=eintraege.filter(e=>e.art==='datei'&&/\.sqlite$/.test(e.name)).map(e=>e.name).sort((a,b)=>a==='workshop.sqlite'?-1:b==='workshop.sqlite'?1:a.localeCompare(b));
 const kopie=process.argv.find(a=>a.startsWith('--arbeitskopie='))?.split('=')[1];
 if(kopie){
  if(!/^\d{8}T\d{6}Z$/.test(kopie))throw new Error('Stand ungültig.');
  const quelle=path.join(ZIEL,kopie,'workshop.sqlite'),dir=path.join(ZIEL,'arbeitskopie-'+kopie),ziel=path.join(dir,'workshop.copy.sqlite');
  const manifest=JSON.parse(fs.readFileSync(path.join(ZIEL,kopie,'manifest.json'),'utf8')),soll=manifest.dateien['workshop.sqlite'].sha256;
  fs.mkdirSync(dir,{mode:0o700});fs.copyFileSync(quelle,ziel,fs.constants.COPYFILE_EXCL);fs.chmodSync(ziel,0o600);
  const ist=dateiSha(ziel);if(ist!==soll)throw new Error('Arbeitskopie weicht von der Sicherung ab.');
  log({schritt:'arbeitskopie',ordner:path.relative(path.dirname(ZIEL),dir),bytes:fs.statSync(ziel).size,sha256:ist});
 }else{
  log({schritt:'inhalt',quelle:path.relative(path.resolve(hier,'..'),DATA),eintraege:eintraege.filter(e=>e.art!=='datei'||/sqlite|json$|lock/i.test(e.name)).slice(0,40),weitereDateien:eintraege.filter(e=>e.art==='datei'&&!/sqlite|json$|lock/i.test(e.name)).length,datenbanken:dbs});
  await sichern({dataDir:DATA,backupDir:ZIEL,nurPruefen:process.argv.includes('--pruefen'),dateien:dbs});
 }
}catch(error){log({schritt:'fehler',message:String(error.message||error),plan:error.plan||null});process.exitCode=1;}
