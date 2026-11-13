// Neue Laufzeit für Mengen- und Mobil-Korrektur (Astra aea809f, auf Claude-Stand übertragen: Commit 45729579).
// Exakte Kopie der laufenden Laufzeit kandidat-7e551ab-20261113 in einen NEUEN Ordner, darin genau VIER Dateien ersetzt.
// Der laufende Ordner wird nur gelesen. Umschalten (um-schalten.mjs) und Neustart sind eigene Schritte.
//   node km-laufzeit-4572957.mjs              -> nur prüfen (Quelle, Prüfsummen, Platz)
//   node km-laufzeit-4572957.mjs --anlegen    -> neuen Ordner anlegen und prüfen
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hier=import.meta.dirname,P=fs.realpathSync(process.env.KM_P||path.resolve(hier,'..'));
const VON='kandidat-7e551ab-20261113',AUF='kandidat-4572957-20261113',D='app/configurator/variant-m/';
const DATEIEN=[
 ['design-reset.mjs','a3a4d09c22205fa2f2ba824b6788757774512743e75f8617146e78f8bd9a8f06','45b44abf6e6590284376d526a0b1f0f43d786b988b2403b6bebd96e4aef34e89'],
 ['modern-navigation.css','6b8457738d8054d62962f40f564a8487325079454a2fdd208bdceed7ee75690f','eb2fcd4bc1c98b8dcf11b4a692221572da26a7388fc15d0910e4fad5e2b3b766'],
 ['session-guard.mjs','5c098a37695d98c1141bf65467d1428dc4202b76ccf32d709dd696686dbfc872','5cc52cfd3c2b0b5a129e04b5ed014f9172d8caeecadc14187eb4eed5fd6221be'],
 ['ux.mjs','edac5b269432c58b3f18ac166aa9e1e43ccbfaca03f823ed1728607bfa569905','33c42c1543a6cf7774bd81d4bf6a372b268e64bf13957e541325f1a359511684']];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'km_laufzeit',...e}));
function inventar(root){let dateien=0,bytes=0,links=0;const h=crypto.createHash('sha256');const walk=rel=>{for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const r=path.join(rel,e.name);if(e.isSymbolicLink()){links++;h.update('L '+r+' '+fs.readlinkSync(path.join(root,r))+'\n');}else if(e.isDirectory())walk(r);else if(e.isFile()){const s=fs.statSync(path.join(root,r));dateien++;bytes+=s.size;h.update('F '+r+' '+s.size+'\n');}}};walk('');return {dateien,bytes,links,listeSha256:h.digest('hex')};}
try{
 const SRC=path.join(P,VON),DST=path.join(P,AUF);
 const neu=new Map(DATEIEN.map(([name,,neuSha])=>{const b=fs.readFileSync(path.join(hier,'km-4572957-'+name));if(sha(b)!==neuSha)throw new Error('Neue Datei im Staging weicht ab: '+name);return [name,b];}));
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
