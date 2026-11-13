// Neue Laufzeit für den schnelleren Konfi-Start (Entscheidung Chris 13.11.2026 „Schnellerer Start“): exakte Kopie der
// laufenden Laufzeit kandidat-ff1f1ca-20261112 in einen NEUEN Ordner, darin genau EINE Datei ersetzt
// (app/workshop/ui/shop-design-switch.mjs, Commit 7e551ab4). Der laufende Ordner wird nur gelesen.
// Umschalten (um-schalten.mjs) und Neustart sind eigene, getrennte Schritte.
//   node gt-laufzeit.mjs              -> nur prüfen (Quelle, Prüfsummen, Platz)
//   node gt-laufzeit.mjs --anlegen    -> neuen Ordner anlegen und prüfen
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hier=import.meta.dirname,P=fs.realpathSync(process.env.GT_P||path.resolve(hier,'..'));
const VON='kandidat-ff1f1ca-20261112',AUF='kandidat-7e551ab-20261113',DATEI='app/workshop/ui/shop-design-switch.mjs';
const ALT_SHA='664507d58a5f4d6d5cbe29d7d69d647b04427249c447052dfbbc1742d2fcf7e7',NEU_SHA='527a0707994b6d3d03f8b6e26ccfd72a58cf88b9379675800593c02f70c6a59a',NEU_QUELLE='ks-design-switch-7e551ab.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'ks_laufzeit',...e}));
function inventar(root){let dateien=0,bytes=0,links=0;const h=crypto.createHash('sha256');const walk=rel=>{for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const r=path.join(rel,e.name);if(e.isSymbolicLink()){links++;h.update('L '+r+' '+fs.readlinkSync(path.join(root,r))+'\n');}else if(e.isDirectory())walk(r);else if(e.isFile()){const s=fs.statSync(path.join(root,r));dateien++;bytes+=s.size;h.update('F '+r+' '+s.size+'\n');}}};walk('');return {dateien,bytes,links,listeSha256:h.digest('hex')};}
try{
 const SRC=path.join(P,VON),DST=path.join(P,AUF),neu=fs.readFileSync(path.join(hier,NEU_QUELLE));
 if(sha(neu)!==NEU_SHA)throw new Error('Neue shop-design-switch.mjs im Staging weicht ab.');
 if(sha(fs.readFileSync(path.join(SRC,DATEI)))!==ALT_SHA)throw new Error('shop-design-switch.mjs der laufenden Laufzeit weicht vom Stand ff1f1ca ab.');
 const vorher=inventar(SRC),st=fs.statfsSync(P),frei=Number(st.bavail)*Number(st.bsize);
 const stand={von:VON,auf:AUF,quelle:vorher,freiBytes:frei,zielVorhanden:fs.existsSync(DST)};
 if(!process.argv.includes('--anlegen')){log({schritt:'pruefung',...stand,bereit:!stand.zielVorhanden&&frei>vorher.bytes*3});process.exit(0);}
 if(stand.zielVorhanden)throw new Error('Zielordner existiert bereits. Nichts geändert.');
 if(frei<vorher.bytes*3)throw new Error('Zu wenig freier Speicher.');
 fs.cpSync(SRC,DST,{recursive:true,errorOnExist:true,force:false,preserveTimestamps:true,verbatimSymlinks:true});
 const kopie=inventar(DST);
 if(kopie.listeSha256!==vorher.listeSha256||kopie.dateien!==vorher.dateien||kopie.bytes!==vorher.bytes)throw new Error('Kopie weicht vom Quellinventar ab (Ordner bleibt zur Prüfung liegen, nichts umgeschaltet).');
 const ziel=path.join(DST,DATEI),modus=fs.statSync(ziel).mode&0o777;
 if(sha(fs.readFileSync(ziel))!==ALT_SHA)throw new Error('Kopierte shop-design-switch.mjs weicht ab.');
 fs.unlinkSync(ziel);fs.writeFileSync(ziel,neu,{flag:'wx',mode:modus});
 const nachher=inventar(DST),quelleNachher=inventar(SRC);
 const ok=sha(fs.readFileSync(ziel))===NEU_SHA&&nachher.dateien===vorher.dateien&&nachher.bytes===vorher.bytes-Buffer.byteLength(fs.readFileSync(path.join(SRC,DATEI)))+neu.length&&quelleNachher.listeSha256===vorher.listeSha256&&sha(fs.readFileSync(path.join(SRC,DATEI)))===ALT_SHA;
 log({schritt:'angelegt',bestanden:ok,von:VON,auf:AUF,quelle:vorher,ziel:nachher,quelleUnveraendert:quelleNachher.listeSha256===vorher.listeSha256,ersetzt:{datei:DATEI,alt:ALT_SHA,neu:NEU_SHA,modus:modus.toString(8)}});
 if(!ok)process.exitCode=1;
}catch(e){log({schritt:'fehler',fehler:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300),bestanden:false});process.exitCode=1;}
