// RÜCKWEG, nur nach einem Zurückschalten auf den alten Laufzeitordner und bei ANGEHALTENER App:
// baut die Tabelle motif_search_daily in der Live-Datenbank wieder auf das alte 7-Spalten-Schema zurück,
// damit der alte Code wieder schreiben kann. Motivsuchen bleiben erhalten; Zeilen der neuen Designsuche
// (search_kind='design') passen nicht ins alte Schema und werden gezählt und verworfen.
// Alles andere in der Datenbank bleibt unberührt (keine Bestellungen, keine Produkte).
// Aufruf: node rt-suchstatistik-zurueck.mjs --pruefen   (schreibt nichts)
//         node rt-suchstatistik-zurueck.mjs --ausfuehren
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const hier=import.meta.dirname;
const DB=process.env.RT_DB||path.resolve(hier,'../acryl-employee-20261021-v1/data/workshop.sqlite');
const SICHERUNG=process.env.RT_SICHERUNG_DB; // Sicherung von VOR dem Umschalten (altes Schema), Pflicht
const ausfuehren=process.argv.includes('--ausfuehren');
const log=entry=>console.log(JSON.stringify({event:'rt_suchstatistik_zurueck',...entry}));
const ALT=['tenant','day','product_group','term','source','searches','without_results'];
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
