// Abnahme #168 auf der Datenbank-SICHERUNG (nie auf der Live-Datenbank):
// 1. Zielregister des Acryl-Hauptprodukts lesen (nur lesend, direkt auf der Sicherung)
// 2. Arbeitskopie workshop.copy.sqlite aus der Sicherung ziehen (SQLite-Online-Backup)
// 3. Suchstatistik-Migration des Kandidaten an der Arbeitskopie fahren, zweimal (Wiederholbarkeit)
// 4. Sicherung danach unverändert? (SHA-256 gegen manifest.json)
// Werkzeuge: Astra, Commit 3a8d86a (ops/issue230-operator-review-20261111). Modul: Kandidat 5702191.
import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const hier=import.meta.dirname;
const base=process.env.A168_BASE||path.resolve(hier,'../sicherungen-db');
const stand=process.env.A168_STAND||'20261111T195242Z';
const sicherung=path.join(base,stand,'workshop.sqlite');
const arbeit=path.join(base,'arbeitskopie-'+stand);
const QUELLEN={
 'a168-copy-guard.mjs':['werkzeuge/copy-guard.mjs','466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671'],
 'a168-inspect-native-target.mjs':['werkzeuge/inspect-native-target.mjs','af48d0568efad7126e2a5982eb7f4ff7f4f6fcac187c7003804a08eb9db44118'],
 'a168-migrate-search-stats-copy.mjs':['werkzeuge/migrate-search-stats-copy.mjs','1d872146a3fc28608a9f4c2a773d2fa17f2bcdceb3ee9ed9389ded4069c616ef'],
 'a168-motif-search-stats.mjs':['kandidat/app/workshop/motif-search-stats.mjs','ada0706845d396e089a6d3bd7007f11b937ed145b03ee5f99a2776cb5054de96'],
 'a168-tenant.mjs':['kandidat/app/workshop/tenant.mjs','3d946fc14a2c1435cd995776c4b441b3430cd8606f6afb55524855edda6c09e8'],
};
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
function shaFile(file){const h=crypto.createHash('sha256'),fd=fs.openSync(file,'r'),buf=Buffer.allocUnsafe(4<<20);try{for(let n;(n=fs.readSync(fd,buf,0,buf.length,null))>0;)h.update(buf.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest('hex');}
const log=entry=>console.log(JSON.stringify({event:'abnahme_168',...entry}));

try{
 if(/[\\/]acryl-employee-20261021-v1[\\/]data[\\/]/.test(sicherung))throw new Error('Live-Datenordner ist ausgeschlossen.');
 const manifest=JSON.parse(fs.readFileSync(path.join(base,stand,'manifest.json'),'utf8'));
 const soll=manifest.dateien['workshop.sqlite'].sha256;
 fs.mkdirSync(arbeit,{recursive:true,mode:0o700});
 for(const [name,[ziel,hash]] of Object.entries(QUELLEN)){
  const inhalt=fs.readFileSync(path.join(hier,name));
  if(sha(inhalt)!==hash)throw new Error('Prüfsumme weicht ab: '+name);
  const dest=path.join(arbeit,ziel);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
  if(!fs.existsSync(dest))fs.writeFileSync(dest,inhalt,{mode:0o600,flag:'wx'});
  else if(sha(fs.readFileSync(dest))!==hash)throw new Error('Vorhandene Datei weicht ab: '+ziel);
 }
 // 1. Zielregister – nur lesend, direkt auf der Sicherung
 const {inspectNativeTarget}=await import(pathToFileURL(path.join(arbeit,'werkzeuge/inspect-native-target.mjs')).href);
 const register=inspectNativeTarget(sicherung);
 fs.writeFileSync(path.join(arbeit,'zielregister.json'),JSON.stringify(register,null,1),{mode:0o600});
 const {activeBindings,legacyFixedBindings,...kopf}=register;
 log({schritt:'zielregister',...kopf,legacyFixedBindingCount:Array.isArray(legacyFixedBindings)?legacyFixedBindings.length:null});
 // 2. Arbeitskopie
 const kopie=path.join(arbeit,'workshop.copy.sqlite');
 if(!fs.existsSync(kopie)){
  const start=Date.now(),db=new DatabaseSync(sicherung,{readOnly:true});
  try{await backup(db,kopie,{rate:4096});}finally{db.close();}
  fs.chmodSync(kopie,0o600);log({schritt:'arbeitskopie',bytes:fs.statSync(kopie).size,ms:Date.now()-start});
 }else log({schritt:'arbeitskopie',vorhanden:true,bytes:fs.statSync(kopie).size});
 // 3. Migration an der Arbeitskopie, zweimal
 const {migrateSearchStatsCopy}=await import(pathToFileURL(path.join(arbeit,'werkzeuge/migrate-search-stats-copy.mjs')).href);
 const aufruf={copy:kopie,confirmation:kopie,codeRoot:path.join(arbeit,'kandidat'),moduleSha256:QUELLEN['a168-motif-search-stats.mjs'][1],expectedRows:Number(process.env.A168_ROWS||8)};
 const erster=await migrateSearchStatsCopy(aufruf),zweiter=await migrateSearchStatsCopy(aufruf);
 fs.writeFileSync(path.join(arbeit,'migration.json'),JSON.stringify({erster,zweiter},null,1),{mode:0o600});
 const kurz=r=>({alreadyMigrated:r.alreadyMigrated,vorher:{spalten:r.before.columns.length,zeilen:r.before.rows,suchen:r.before.searches,ohneTreffer:r.before.withoutResults},nachher:{spalten:r.after.columns.length,schluessel:r.after.primaryKey.join(','),zeilen:r.after.rows,motiv:r.after.motifRows,design:r.after.designRows,suchen:r.after.searches,ohneTreffer:r.after.withoutResults},zeilenGleich:r.before.normalizedRowsSha256===r.after.normalizedRowsSha256,uebrigesSchemaGleich:r.before.otherSchemaSha256===r.after.otherSchemaSha256});
 log({schritt:'migration',erster:kurz(erster),zweiter:kurz(zweiter)});
 const check=new DatabaseSync(pathToFileURL(kopie).href+'?immutable=1',{readOnly:true});
 let quick;try{quick=check.prepare('PRAGMA quick_check').all().map(row=>Object.values(row)[0]).join('; ');}finally{check.close();}
 // 4. Sicherung unverändert?
 const ist=shaFile(sicherung);
 log({schritt:'fertig',arbeitskopieQuickCheck:quick,sicherungUnveraendert:ist===soll,sicherungSha256:ist.slice(0,16),ordner:arbeit});
 if(ist!==soll||quick!=='ok')process.exitCode=1;
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
