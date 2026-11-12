// Neue Laufzeit für den Galerie-Fix (Entscheidung Chris 12.11.2026 „ja“): exakte Kopie der laufenden Laufzeit
// kandidat-f85390b-20261112 in einen NEUEN Ordner, darin genau EINE Datei ersetzt
// (app/configurator/variant-m/contract.mjs, Commit ff1f1ca7). Der laufende Ordner wird nur gelesen.
// Umschalten (um-schalten.mjs) und Neustart sind eigene, getrennte Schritte.
//   node gt-laufzeit.mjs              -> nur prüfen (Quelle, Prüfsummen, Platz)
//   node gt-laufzeit.mjs --anlegen    -> neuen Ordner anlegen und prüfen
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hier=import.meta.dirname,P=fs.realpathSync(process.env.GT_P||path.resolve(hier,'..'));
const VON='kandidat-f85390b-20261112',AUF='kandidat-ff1f1ca-20261112',DATEI='app/configurator/variant-m/contract.mjs';
const ALT_SHA='2a5bd4e1e755b84dd96cdff9af30a47c8cc372ba47ccc7215b8fdeca486e78cc',NEU_SHA='5acd5311e4744a4b252814824fcc6ed1c34a014d0c8c7073504621c7e26c16d0',NEU_QUELLE='ga-contract-ff1f1ca.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'gt_laufzeit',...e}));
function inventar(root){let dateien=0,bytes=0,links=0;const h=crypto.createHash('sha256');const walk=rel=>{for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const r=path.join(rel,e.name);if(e.isSymbolicLink()){links++;h.update('L '+r+' '+fs.readlinkSync(path.join(root,r))+'\n');}else if(e.isDirectory())walk(r);else if(e.isFile()){const s=fs.statSync(path.join(root,r));dateien++;bytes+=s.size;h.update('F '+r+' '+s.size+'\n');}}};walk('');return {dateien,bytes,links,listeSha256:h.digest('hex')};}
try{
 const SRC=path.join(P,VON),DST=path.join(P,AUF),neu=fs.readFileSync(path.join(hier,NEU_QUELLE));
 if(sha(neu)!==NEU_SHA)throw new Error('Neue contract.mjs im Staging weicht ab.');
 if(sha(fs.readFileSync(path.join(SRC,DATEI)))!==ALT_SHA)throw new Error('contract.mjs der laufenden Laufzeit weicht vom Stand f85390b ab.');
 const vorher=inventar(SRC),st=fs.statfsSync(P),frei=Number(st.bavail)*Number(st.bsize);
 const stand={von:VON,auf:AUF,quelle:vorher,freiBytes:frei,zielVorhanden:fs.existsSync(DST)};
 if(!process.argv.includes('--anlegen')){log({schritt:'pruefung',...stand,bereit:!stand.zielVorhanden&&frei>vorher.bytes*3});process.exit(0);}
 if(stand.zielVorhanden)throw new Error('Zielordner existiert bereits. Nichts geändert.');
 if(frei<vorher.bytes*3)throw new Error('Zu wenig freier Speicher.');
 fs.cpSync(SRC,DST,{recursive:true,errorOnExist:true,force:false,preserveTimestamps:true,verbatimSymlinks:true});
 const kopie=inventar(DST);
 if(kopie.listeSha256!==vorher.listeSha256||kopie.dateien!==vorher.dateien||kopie.bytes!==vorher.bytes)throw new Error('Kopie weicht vom Quellinventar ab (Ordner bleibt zur Prüfung liegen, nichts umgeschaltet).');
 const ziel=path.join(DST,DATEI),modus=fs.statSync(ziel).mode&0o777;
 if(sha(fs.readFileSync(ziel))!==ALT_SHA)throw new Error('Kopierte contract.mjs weicht ab.');
 fs.unlinkSync(ziel);fs.writeFileSync(ziel,neu,{flag:'wx',mode:modus});
 const nachher=inventar(DST),quelleNachher=inventar(SRC);
 const ok=sha(fs.readFileSync(ziel))===NEU_SHA&&nachher.dateien===vorher.dateien&&nachher.bytes===vorher.bytes-Buffer.byteLength(fs.readFileSync(path.join(SRC,DATEI)))+neu.length&&quelleNachher.listeSha256===vorher.listeSha256&&sha(fs.readFileSync(path.join(SRC,DATEI)))===ALT_SHA;
 log({schritt:'angelegt',bestanden:ok,von:VON,auf:AUF,quelle:vorher,ziel:nachher,quelleUnveraendert:quelleNachher.listeSha256===vorher.listeSha256,ersetzt:{datei:DATEI,alt:ALT_SHA,neu:NEU_SHA,modus:modus.toString(8)}});
 if(!ok)process.exitCode=1;
}catch(e){log({schritt:'fehler',fehler:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300),bestanden:false});process.exitCode=1;}
