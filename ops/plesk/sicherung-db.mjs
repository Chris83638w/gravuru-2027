// Konsistente Sicherung der Werkstatt-Datenbanken im laufenden Betrieb.
// Liest die Quelle nur lesend (SQLite-Online-Backup inkl. WAL-Stand), schreibt in einen neuen Ordner.
// Aufruf: node sicherung-db.mjs            – Sicherung anlegen
//         node sicherung-db.mjs --pruefen  – nur Platz und Quelle prüfen, nichts schreiben
// Umgebungsvariablen: GRAVURU_DATA_DIR (Quelle), GRAVURU_BACKUP_DIR (Ziel-Oberordner).
import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const DATEIEN=Object.freeze(['workshop.sqlite','design-assets.sqlite','profiles.sqlite']);
const log=entry=>console.log(JSON.stringify({event:'db_sicherung',...entry}));

function sha256(file){
 const hash=crypto.createHash('sha256'),fd=fs.openSync(file,'r'),buf=Buffer.allocUnsafe(4<<20);
 try{for(let n;(n=fs.readSync(fd,buf,0,buf.length,null))>0;)hash.update(buf.subarray(0,n));}finally{fs.closeSync(fd);}
 return hash.digest('hex');
}
const groesse=file=>fs.existsSync(file)?fs.statSync(file).size:0;
function freierPlatz(dir){try{const s=fs.statfsSync(dir);return Number(s.bavail)*Number(s.bsize);}catch{return null;}}

function tabellen(db){
 const out={};
 for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all())
  out[name]=db.prepare('SELECT COUNT(*) AS n FROM "'+name.replaceAll('"','""')+'"').get().n;
 return out;
}

export async function sichern({dataDir,backupDir,nurPruefen=false,jetzt=new Date(),dateien=DATEIEN,zaehlen=true}){
 if(!fs.existsSync(dataDir))throw new Error('Quelle fehlt: '+dataDir);
 const vorhanden=dateien.filter(f=>fs.existsSync(path.join(dataDir,f)));
 if(!vorhanden.includes('workshop.sqlite')&&dateien.includes('workshop.sqlite'))throw new Error('workshop.sqlite fehlt in '+dataDir);
 const bedarf=vorhanden.reduce((sum,f)=>sum+groesse(path.join(dataDir,f))+groesse(path.join(dataDir,f+'-wal')),0);
 fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
 const frei=freierPlatz(backupDir);
 const plan={quelle:dataDir,ziel:backupDir,dateien:vorhanden,bedarfBytes:bedarf,freiBytes:frei};
 // Platzregel: doppelter Bedarf muss frei sein, damit die Sicherung den Betrieb nie in Platznot bringt.
 if(frei!==null&&frei<bedarf*2)throw Object.assign(new Error('Zu wenig freier Speicher: frei '+frei+' Bytes, verlangt '+bedarf*2),{plan});
 if(nurPruefen){log({schritt:'pruefung',...plan});return {...plan,geprueft:true};}
 const stamp=jetzt.toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
 const ziel=path.join(backupDir,stamp);
 fs.mkdirSync(ziel,{mode:0o700}); // schlägt fehl, wenn es den Ordner schon gibt – nie überschreiben
 const manifest={schema:'gravuru-db-sicherung/v1',erstellt:jetzt.toISOString(),quelle:dataDir,node:process.version,dateien:{}};
 for(const name of vorhanden){
  const start=Date.now(),src=path.join(dataDir,name),dest=path.join(ziel,name);
  const db=new DatabaseSync(src,{readOnly:true});
  let seiten=0;
  try{seiten=await backup(db,dest,{rate:4096});}finally{db.close();}
  fs.chmodSync(dest,0o600);
  // immutable=1: Prüfung legt keine -wal/-shm neben die Kopie; die Kopie bleibt eine einzelne Datei.
  const kopie=new DatabaseSync(pathToFileURL(dest).href+'?immutable=1',{readOnly:true});
  let pruefung,zeilen=null;
  try{
   pruefung=kopie.prepare('PRAGMA quick_check').all().map(row=>Object.values(row)[0]).join('; ');
   if(zaehlen)zeilen=tabellen(kopie);
  }finally{kopie.close();}
  if(pruefung!=='ok')throw new Error('Prüfung der Kopie fehlgeschlagen ('+name+'): '+pruefung);
  manifest.dateien[name]={bytes:groesse(dest),sha256:sha256(dest),seiten,quickCheck:pruefung,tabellen:zeilen,ms:Date.now()-start};
  log({schritt:'datei',name,bytes:manifest.dateien[name].bytes,seiten,ms:manifest.dateien[name].ms});
 }
 const file=path.join(ziel,'manifest.json');
 fs.writeFileSync(file,JSON.stringify(manifest,null,1),{mode:0o600,flag:'wx'});
 log({schritt:'fertig',ordner:ziel,dateien:Object.fromEntries(Object.entries(manifest.dateien).map(([k,v])=>[k,[v.bytes,v.sha256.slice(0,16)]]))});
 return {...plan,ordner:ziel,manifest};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const hier=import.meta.dirname;
 const dataDir=process.env.GRAVURU_DATA_DIR||path.resolve(hier,'../acryl-employee-20261021-v1/data');
 const backupDir=process.env.GRAVURU_BACKUP_DIR||path.resolve(hier,'../sicherungen-db');
 sichern({dataDir,backupDir,nurPruefen:process.argv.includes('--pruefen')}).catch(error=>{log({schritt:'fehler',message:String(error.message||error),plan:error.plan||null});process.exitCode=1;});
}
