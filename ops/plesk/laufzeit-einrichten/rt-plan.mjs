// Neuen Laufzeitordner NEBEN dem heutigen anlegen – exakt der Git-Stand af6fd98 (app/, scripts/, ops/, package.json).
// Dateien kommen aus dem Paket oder, wenn dort nicht enthalten, aus dem heutigen Laufzeitordner – jede einzelne
// wird gegen die SHA-256 der Dateiliste geprüft. Der heutige Laufzeitordner wird nur gelesen.
// Zusätzlich wird .local-data/ (Python-Bibliotheken des Servers, nicht in Git) unverändert mitkopiert.
// Aufruf: node rt-einrichten.mjs --pruefen   (schreibt nichts)
//         node rt-einrichten.mjs             (legt den neuen Ordner an; bricht ab, wenn es ihn schon gibt)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const hier=import.meta.dirname;
const REV='af6fd986c735d97bddc974261398ab8c4e88e00b';
const PAKET=process.env.RT_PAKET||path.join(hier,'rt-af6fd986.teil01');
const PAKET_SHA='dba95e74ec39465b057b2dfca0c747915abc861a0c057c62d24d17462a3d38a4';
const BAUM_SHA='6f7b76b0de6b0492eef086ebe32f728575163a472ac84d89f73500c3b4843988';
const LIVE=process.env.RT_LIVE||path.resolve(hier,'../mika-r15-resume-20261108-v1');
const ZIEL=process.env.RT_ZIEL||path.resolve(hier,'../kandidat-af6fd98-20261111');
const nurPruefen=process.argv.includes('--pruefen');
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const log=entry=>console.log(JSON.stringify({event:'rt_einrichten',...entry}));

function alleDateien(root,rel=''){
 const out=[];
 for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){
  const p=rel?rel+'/'+e.name:e.name;
  if(e.isDirectory())out.push(...alleDateien(root,p));else out.push(p);
 }
 return out;
}

try{
 const gz=fs.readFileSync(PAKET);
 if(sha(gz)!==PAKET_SHA)throw new Error('Paket-Prüfsumme weicht ab.');
 const raw=zlib.gunzipSync(gz),hlen=raw.readUInt32BE(0),kopf=JSON.parse(raw.subarray(4,4+hlen).toString('utf8'));
 if(kopf.rev!==REV||kopf.schema!=='gravuru-rt-paket/v2')throw new Error('Paket gehört nicht zu '+REV);
 if(sha(Buffer.from(kopf.files.map(f=>f[0]+' '+f[2]).join('\n')))!==BAUM_SHA)throw new Error('Dateiliste weicht ab.');
 // 1. Durchgang: jede Datei beschaffen und prüfen, noch nichts schreiben
 let pos=4+hlen;const inhalt=new Map(),fehlt=[];let ausPaket=0,ausLive=0;
 for(const [p,bytes,hash,imPaket] of kopf.files){
  if(p.includes('..')||path.isAbsolute(p))throw new Error('Unzulässiger Pfad: '+p);
  let buf=null;
  if(imPaket){buf=raw.subarray(pos,pos+bytes);pos+=bytes;}
  else{try{buf=fs.readFileSync(path.join(LIVE,p));}catch{buf=null;}}
  if(!buf||buf.length!==bytes||sha(buf)!==hash){fehlt.push(p);continue;}
  inhalt.set(p,buf);if(imPaket)ausPaket++;else ausLive++;
 }
 if(pos!==raw.length)throw new Error('Paketlänge passt nicht zur Dateiliste.');
 // Was liegt im heutigen Ordner, das nicht in Git ist?
 const soll=new Set(kopf.files.map(f=>f[0]));
 const liveNur=alleDateien(LIVE).filter(p=>!soll.has(p));
 const gruppe=p=>p.startsWith('.local-data/')?'.local-data':p.split('/').slice(0,p.startsWith('app/')?3:1).join('/');
 const liveNurGruppen={};for(const p of liveNur)liveNurGruppen[gruppe(p)]=(liveNurGruppen[gruppe(p)]||0)+1;
 const lokal=liveNur.filter(p=>p.startsWith('.local-data/'));
 const liveNurLaufzeit=liveNur.filter(p=>/^(app|scripts|ops)\//.test(p)&&!/\.preview\/|__pycache__/.test(p));
 const plan={rev:REV,ziel:ZIEL,dateien:kopf.files.length,ausPaket,ausLive,fehltAnzahl:fehlt.length,fehlt,liveNurGruppen,liveNurLaufzeit:liveNurLaufzeit.slice(0,60),lokalDateien:lokal.length,zielVorhanden:fs.existsSync(ZIEL)};
 if(nurPruefen||fehlt.length){log({schritt:nurPruefen?'pruefung':'abbruch',...plan});if(fehlt.length)process.exitCode=1;}
 else{
  // 2. Durchgang: anlegen und schreiben (nie überschreiben)
  fs.mkdirSync(ZIEL,{mode:0o755});
  for(const [p,buf] of inhalt){const dest=path.join(ZIEL,p);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o755});fs.writeFileSync(dest,buf,{flag:'wx',mode:0o644});}
  const lokalListe=[];
  for(const p of lokal){
   const src=path.join(LIVE,p),dest=path.join(ZIEL,p),st=fs.lstatSync(src);
   fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
   if(st.isSymbolicLink())fs.symlinkSync(fs.readlinkSync(src),dest);
   else{fs.copyFileSync(src,dest,fs.constants.COPYFILE_EXCL);fs.chmodSync(dest,st.mode&0o777);lokalListe.push(p+' '+sha(fs.readFileSync(dest)));}
  }
  // Rücklesen: der neue Ordner muss exakt die Dateiliste ergeben
  const zurueck=kopf.files.map(f=>f[0]+' '+sha(fs.readFileSync(path.join(ZIEL,f[0])))).join('\n');
  const ok=sha(Buffer.from(zurueck))===BAUM_SHA;
  const zielDateien=alleDateien(ZIEL).filter(p=>!soll.has(p)&&!p.startsWith('.local-data/'));
  const beleg={schema:'gravuru-rt-einrichtung/v1',rev:REV,erstellt:new Date().toISOString(),baumSha256:BAUM_SHA,ruecklesenGleich:ok,dateien:kopf.files.length,ausPaket,ausLive,lokalDateien:lokalListe.length,lokalSha256:sha(Buffer.from(lokalListe.sort().join('\n'))),fremdeDateien:zielDateien};
  fs.writeFileSync(ZIEL+'.einrichtung.json',JSON.stringify(beleg,null,1),{flag:'wx',mode:0o600});
  log({schritt:'fertig',...beleg,liveNurGruppen,liveNurLaufzeit:liveNurLaufzeit.slice(0,60)});
  if(!ok||zielDateien.length)process.exitCode=1;
 }
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
