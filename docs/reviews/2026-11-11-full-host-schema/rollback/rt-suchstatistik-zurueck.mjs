// RÜCKWEG, nur nach einem Zurückschalten auf den alten Laufzeitordner und bei ANGEHALTENER App:
// baut die Tabelle motif_search_daily in der Live-Datenbank wieder auf das alte 7-Spalten-Schema zurück,
// damit der alte Code wieder schreiben kann. Motivsuchen bleiben erhalten; Zeilen der neuen Designsuche
// (search_kind='design') passen nicht ins alte Schema; sie werden vor dem Rueckbau privat archiviert.
// Alles andere in der Datenbank bleibt unberührt (keine Bestellungen, keine Produkte).
// Aufruf: node rt-suchstatistik-zurueck.mjs --pruefen   (schreibt nichts)
//         node rt-suchstatistik-zurueck.mjs --ausfuehren
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const hier=import.meta.dirname;
const DB=process.env.RT_DB||path.resolve(hier,'../acryl-employee-20261021-v1/data/workshop.sqlite');
const SICHERUNG=process.env.RT_SICHERUNG_DB; // Sicherung von VOR dem Umschalten (altes Schema), Pflicht
const ausfuehren=process.argv.includes('--ausfuehren');
const log=entry=>console.log(JSON.stringify({event:'rt_suchstatistik_zurueck',...entry}));
const ALT=['tenant','day','product_group','term','source','searches','without_results'];

function archiveOtherSearches(db){
 // Called inside the existing BEGIN IMMEDIATE, before any destructive DDL.
 const statement=db.prepare("SELECT * FROM motif_search_daily WHERE search_kind<>'motif' ORDER BY tenant,day,product_group,term,source,search_kind");
 statement.setReadBigInts(true);
 const rows=statement.all();if(!rows.length)return null;
 const archive=process.env.RT_SUCHSTATISTIK_ARCHIV;
 if(!archive||!path.isAbsolute(archive))throw new Error('RT_SUCHSTATISTIK_ARCHIV muss eine neue absolute private Archivdatei nennen; kein Rueckbau ohne Sicherung der Designsuche.');
 const directory=path.dirname(archive),info=fs.statSync(directory);
 if(!info.isDirectory()||(process.platform!=='win32'&&((info.mode&0o077)!==0||typeof process.getuid==='function'&&info.uid!==process.getuid())))throw new Error('Archivverzeichnis muss privat (0700) sein und dem ausfuehrenden Benutzer gehoeren.');
 const payload={schema:'gravuru-search-kind-rollback-archive/v1',table:'motif_search_daily',integerEncoding:'sqliteInteger decimal strings',rows};
 const payloadText=JSON.stringify(payload,(_key,value)=>typeof value==='bigint'?{sqliteInteger:value.toString()}:value);
 const payloadSha256=createHash('sha256').update(payloadText).digest('hex');
 const bytes=Buffer.from(JSON.stringify({createdAt:new Date().toISOString(),payloadSha256,payload:JSON.parse(payloadText)})+'\n');
 let fd;
 try{
  fd=fs.openSync(archive,'wx+',0o600);
  fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);
  const check=Buffer.alloc(bytes.length);let read=0;
  while(read<check.length){const n=fs.readSync(fd,check,read,check.length-read,read);if(!n)throw new Error('Archiv unvollstaendig.');read+=n;}
  if(!check.equals(bytes)||fs.fstatSync(fd).size!==bytes.length)throw new Error('Archivpruefung fehlgeschlagen.');
 }finally{if(fd!==undefined)fs.closeSync(fd);}
 // Persist the new directory entry as well on the Linux operator host.
 if(process.platform!=='win32'){const dfd=fs.openSync(directory,'r');try{fs.fsyncSync(dfd);}finally{fs.closeSync(dfd);}}
 return {zeilen:rows.length,payloadSha256,dateiSha256:createHash('sha256').update(bytes).digest('hex')};
}

try{
 if(!SICHERUNG)throw new Error('RT_SICHERUNG_DB fehlt (Sicherung von vor dem Umschalten).');
 const s=new DatabaseSync(pathToFileURL(SICHERUNG).href+'?immutable=1',{readOnly:true});
 let altSql;try{altSql=s.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='motif_search_daily'").get()?.sql;const cols=s.prepare('PRAGMA table_info(motif_search_daily)').all().map(c=>c.name);if(cols.join(',')!==ALT.join(','))throw new Error('Die Sicherung hat nicht das alte Schema.');}finally{s.close();}
 if(!altSql)throw new Error('Altes Schema nicht in der Sicherung gefunden.');
 const db=new DatabaseSync(DB,{readOnly:!ausfuehren});
 try{
  db.exec('PRAGMA busy_timeout=3000');
  const cols=db.prepare('PRAGMA table_info(motif_search_daily)').all().map(c=>c.name);
  const zahl=sql=>db.prepare(sql).get().n;
  if(cols.join(',')===ALT.join(',')){log({schritt:'nichts_zu_tun',spalten:cols.length,zeilen:zahl('SELECT COUNT(*) AS n FROM motif_search_daily')});}
  else{
   if(!cols.includes('search_kind'))throw new Error('Unbekanntes Schema; nichts geändert.');
   const plan={spalten:cols.length,motivZeilen:zahl("SELECT COUNT(*) AS n FROM motif_search_daily WHERE search_kind='motif'"),designZeilenVerworfen:zahl("SELECT COUNT(*) AS n FROM motif_search_daily WHERE search_kind<>'motif'"),motivSuchen:zahl("SELECT COALESCE(SUM(searches),0) AS n FROM motif_search_daily WHERE search_kind='motif'")};
   if(!ausfuehren)log({schritt:'pruefung',...plan});
   else{
    const andere=db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE tbl_name='motif_search_daily' AND type IN ('index','trigger') AND name NOT LIKE 'sqlite_%'").get().n;
    if(andere)throw new Error('Unerwartete Indizes/Trigger an der Tabelle; nichts geändert.');
    db.exec('BEGIN IMMEDIATE');
    try{
     const archiv=archiveOtherSearches(db);
     if(archiv)log({schritt:'designsuche_archiviert',...archiv});
     db.exec(altSql.replace(/motif_search_daily/,'motif_search_daily_alt'));
     db.exec("INSERT INTO motif_search_daily_alt("+ALT.join(',')+") SELECT "+ALT.join(',')+" FROM motif_search_daily WHERE search_kind='motif'");
     db.exec('DROP TABLE motif_search_daily; ALTER TABLE motif_search_daily_alt RENAME TO motif_search_daily');
     const nach=db.prepare('PRAGMA table_info(motif_search_daily)').all().map(c=>c.name);
     const zeilen=zahl('SELECT COUNT(*) AS n FROM motif_search_daily'),suchen=zahl('SELECT COALESCE(SUM(searches),0) AS n FROM motif_search_daily');
     if(nach.join(',')!==ALT.join(',')||zeilen!==plan.motivZeilen||suchen!==plan.motivSuchen)throw new Error('Nachprüfung fehlgeschlagen.');
     db.exec('COMMIT');log({schritt:'zurueckgebaut',...plan,zeilen,suchen});
    }catch(error){db.exec('ROLLBACK');throw error;}
   }
  }
 }finally{db.close();}
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}

