// Neue Laufzeit für Handy-Zurück-Taste und volle Reiterleiste (Chris 13.11.2026, Commit 4f909b1).
// Exakte Kopie der laufenden Laufzeit kandidat-4572957-20261113 in einen NEUEN Ordner, darin genau ZWEI Dateien ersetzt.
// Der laufende Ordner wird nur gelesen. Umschalten (um-schalten.mjs) und Neustart sind eigene Schritte.
//   node hz-laufzeit-4f909b1.mjs              -> nur prüfen (Quelle, Prüfsummen, Platz)
//   node hz-laufzeit-4f909b1.mjs --anlegen    -> neuen Ordner anlegen und prüfen
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hier=import.meta.dirname,P=fs.realpathSync(process.env.HZ_P||path.resolve(hier,'..'));
const VON='kandidat-4572957-20261113',AUF='kandidat-4f909b1-20261113',D='app/configurator/mobile-demo/';
const DATEIEN=[
 ['demo.mjs','4227eb43f63d384797c2ba7fe68d3f5797eddae3fa435446fd6e4fcfd7cb9308','92f7714889030ef9b2c6b797d0425d59e8cae18806c79527af3e0026c960f1dc'],
 ['demo.css','856dc180ea883a7a19be89a0862c61f96ddc2cd6fc48179a7e7fa20a0be8a321','05559e66cbb6a3bafbf8be2755b1700f561f1c52f58c2f995fdb6df6408f8ed2']];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'hz_laufzeit',...e}));
function inventar(root){let dateien=0,bytes=0,links=0;const h=crypto.createHash('sha256');const walk=rel=>{for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const r=path.join(rel,e.name);if(e.isSymbolicLink()){links++;h.update('L '+r+' '+fs.readlinkSync(path.join(root,r))+'\n');}else if(e.isDirectory())walk(r);else if(e.isFile()){const s=fs.statSync(path.join(root,r));dateien++;bytes+=s.size;h.update('F '+r+' '+s.size+'\n');}}};walk('');return {dateien,bytes,links,listeSha256:h.digest('hex')};}
try{
 const SRC=path.join(P,VON),DST=path.join(P,AUF);
 const neu=new Map(DATEIEN.map(([name,,neuSha])=>{const b=fs.readFileSync(path.join(hier,'hz-4f909b1-'+name));if(sha(b)!==neuSha)throw new Error('Neue Datei im Staging weicht ab: '+name);return [name,b];}));
 for(const [name,altSha] of DATEIEN)if(sha(fs.readFileSync(path.join(SRC,D,name)))!==altSha)throw new Error('Laufende Datei weicht vom erwarteten Stand ab: '+name);
 const vorher=inventar(SRC),st=fs.statfsSync(P),frei=Number(st.bavail)*Number(st.bsize);
 const stand={von:VON,auf:AUF,quelle:vorher,freiBytes:frei,zielVorhanden:fs.existsSync(DST)};
 if(!process.argv.includes('--anlegen')){log({schritt:'pruefung',...stand,bereit:!stand.zielVorhanden&&frei>vorher.bytes*3});process.exit(0);}
 if(stand.zielVorhanden)throw new Error('Zielordner existiert bereits. Nichts geändert.');
 if(frei<vorher.bytes*3)throw new Error('Zu wenig freier Speicher.');
 fs.cpSync(SRC,DST,{recursive:true,errorOnExist:true,force:false,preserveTimestamps:true,verbatimSymlinks:true});
 const kopie=inventar(DST);
 if(kopie.listeSha256!==vorher.listeSha256||kopie.dateien!==vorher.dateien||kopie.bytes!==vorher.bytes)throw new Error('Kopie weicht vom Quellinventar ab (Ordner bleibt zur Prüfung liegen, nichts umgeschaltet).');
 let delta=0;const ersetzt=[];
 for(const [name,altSha,neuSha] of DATEIEN){
  const ziel=path.join(DST,D,name),alt=fs.readFileSync(ziel),modus=fs.statSync(ziel).mode&0o777;
  if(sha(alt)!==altSha)throw new Error('Kopierte Datei weicht ab: '+name);
  fs.unlinkSync(ziel);fs.writeFileSync(ziel,neu.get(name),{flag:'wx',mode:modus});
  if(sha(fs.readFileSync(ziel))!==neuSha)throw new Error('Geschriebene Datei weicht ab: '+name);
  delta+=neu.get(name).length-alt.length;ersetzt.push({datei:D+name,alt:altSha,neu:neuSha,modus:modus.toString(8)});
 }
 const nachher=inventar(DST),quelleNachher=inventar(SRC);
 const ok=nachher.dateien===vorher.dateien&&nachher.bytes===vorher.bytes+delta&&quelleNachher.listeSha256===vorher.listeSha256;
 log({schritt:'angelegt',bestanden:ok,von:VON,auf:AUF,quelle:vorher,ziel:nachher,quelleUnveraendert:quelleNachher.listeSha256===vorher.listeSha256,ersetzt});
 if(!ok)process.exitCode=1;
}catch(e){log({schritt:'fehler',fehler:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300),bestanden:false});process.exitCode=1;}
