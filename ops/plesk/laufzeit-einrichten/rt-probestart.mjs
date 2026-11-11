// Probestart des neuen Laufzeitordners auf einer KOPIE der Datenbanken – ohne Shopify-Anbindung, nur 127.0.0.1.
// Zeigt: (1) was der Start an den Datenbanken ändert (Schema, Zeilenzahlen), (2) Zeiten und Speicher der
// Werkstatt-Designliste mit echtem Katalog und echten Daten. Die Live-Datenbank wird nicht geöffnet.
import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';

const hier=import.meta.dirname;
const RT=process.env.RT_ZIEL||path.resolve(hier,'../kandidat-af6fd98-20261111');
const KATALOG=process.env.RT_KATALOG||path.resolve(hier,'../issue139-katalog-20261102');
const SICH=process.env.RT_SICHERUNG||path.resolve(hier,'../sicherungen-db/20261111T195242Z');
const PROBE=process.env.RT_PROBE||path.resolve(hier,'../sicherungen-db/probedaten-20261111T195242Z');
const LINIEN=(process.env.RT_LINIEN||'edelstahl-tuerschilder').split(',');
if(/[\\/]acryl-employee-20261021-v1[\\/]data/.test(PROBE))throw new Error('Live-Datenordner ist ausgeschlossen.');
process.env.GRAVURU_KATALOG_WORKER='enabled';
process.env.GRAVURU_KATALOG=KATALOG;
if(!process.env.GRAVURU_PYTHON)process.env.GRAVURU_PYTHON=path.resolve(hier,'../gravuru-2027-test-python311/bin/python');
const DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const log=entry=>console.log(JSON.stringify({event:'rt_probestart',...entry}));
const ereignisse=[];const warn=console.warn;
console.warn=(...a)=>{try{const e=JSON.parse(a[0]);if(String(e.event).startsWith('katalog_worker')){ereignisse.push(e);return;}}catch{}};

function schema(file){
 if(!fs.existsSync(file))return null;
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  const objekte={};for(const r of db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all())objekte[r.type+' '+r.name]=sha(r.sql||'').slice(0,12);
  const zeilen={};for(const r of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())zeilen[r.name]=db.prepare('SELECT COUNT(*) AS n FROM "'+r.name.replaceAll('"','""')+'"').get().n;
  return {objekte,zeilen,userVersion:db.prepare('PRAGMA user_version').get().user_version};
 }finally{db.close();}
}
function unterschied(vorher,nachher){
 if(!vorher||!nachher)return {vorhanden:[!!vorher,!!nachher]};
 const neu=Object.keys(nachher.objekte).filter(k=>!(k in vorher.objekte)),weg=Object.keys(vorher.objekte).filter(k=>!(k in nachher.objekte));
 const geaendert=Object.keys(nachher.objekte).filter(k=>k in vorher.objekte&&vorher.objekte[k]!==nachher.objekte[k]);
 const zeilen={};for(const t of Object.keys(nachher.zeilen))if(vorher.zeilen[t]!==nachher.zeilen[t])zeilen[t]=[vorher.zeilen[t]??null,nachher.zeilen[t]];
 return {neu,weg,geaendert,zeilen,userVersion:[vorher.userVersion,nachher.userVersion]};
}
const get=(base,route)=>new Promise((res,rej)=>{const start=performance.now();http.get(base+route,{headers:{'accept-encoding':'gzip'}},r=>{let n=0;const h=crypto.createHash('sha256');r.on('data',c=>{n+=c.length;h.update(c);});r.on('end',()=>res({route,status:r.statusCode,ms:Math.round(performance.now()-start),bytes:n,gzip:r.headers['content-encoding']||null,sha:h.digest('hex').slice(0,12)}));}).on('error',rej);});

try{
 // 1. Probedaten aus der Sicherung (nur beim ersten Mal)
 if(!fs.existsSync(PROBE)){
  fs.mkdirSync(PROBE,{mode:0o700});
  for(const name of DBS){const src=path.join(SICH,name);if(!fs.existsSync(src))continue;const db=new DatabaseSync(src,{readOnly:true});try{await backup(db,path.join(PROBE,name),{rate:4096});}finally{db.close();}fs.chmodSync(path.join(PROBE,name),0o600);}
  log({schritt:'probedaten',ordner:PROBE,dateien:fs.readdirSync(PROBE)});
 }else log({schritt:'probedaten',vorhanden:true,dateien:fs.readdirSync(PROBE).filter(n=>!n.startsWith('preview'))});
 const vorher=Object.fromEntries(DBS.map(n=>[n,schema(path.join(PROBE,n))]));
 // 2. Bauen (in den Probeordner, der neue Laufzeitordner bleibt unberührt) und starten
 const t0=Date.now();
 const {build}=await import(pathToFileURL(path.join(RT,'app/configurator/variant-m/build.mjs')).href);
 const out=path.join(PROBE,'preview-'+Date.now());fs.mkdirSync(out,{mode:0o700});
 build({outputDirectory:out});
 const seed=JSON.parse(fs.readFileSync(path.join(out,'models.json'),'utf8'))[0];
 const bundle=fs.existsSync(path.join(out,'bundle'))?fs.readdirSync(path.join(out,'bundle')).filter(n=>/^editor-.*\.mjs$/.test(n)):[];
 log({schritt:'gebaut',ms:Date.now()-t0,bundle});
 const {createWorkshop}=await import(pathToFileURL(path.join(RT,'app/workshop/http.mjs')).href);
 const {createPreviewServer}=await import(pathToFileURL(path.join(RT,'app/configurator/variant-m/server.mjs')).href);
 const t1=Date.now();
 const workshop=createWorkshop({filename:path.join(PROBE,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:KATALOG});
 const srv=createPreviewServer({outputDirectory:out,workshop});srv.listen(0,'127.0.0.1');await once(srv,'listening');
 const base='http://127.0.0.1:'+srv.address().port;
 log({schritt:'gestartet',ms:Date.now()-t1,rssMb:Math.round(process.memoryUsage().rss/1048576)});
 let lag=0,last=performance.now();const iv=setInterval(()=>{const now=performance.now();lag=Math.max(lag,now-last-20);last=now;},20);
 // 3. Messung
 const abrufe=[];
 abrufe.push(await get(base,'/api/workshop/designs'));
 for(const linie of LINIEN){
  abrufe.push(await get(base,'/api/workshop/designs?linie='+encodeURIComponent(linie)));
  abrufe.push(await get(base,'/api/workshop/designs?linie='+encodeURIComponent(linie)));
 }
 abrufe.push(await get(base,'/api/workshop/motif-search-stats'));
 clearInterval(iv);
 const arbeiter=ereignisse.filter(e=>e.event==='katalog_worker').map(e=>({op:e.op,ok:e.ok,ms:e.ms,msList:e.msList??null,bytes:e.bytes,heapMb:e.heapMb??null,rssMb:e.rssMb??null}));
 const sonst=ereignisse.filter(e=>e.event!=='katalog_worker').map(e=>({event:e.event,reason:e.reason??null,entries:e.entries??e.count??null}));
 log({schritt:'messung',abrufe,arbeiter,sonst,hauptprozessVerzoegerungMs:Math.round(lag),rssMb:Math.round(process.memoryUsage().rss/1048576)});
 await new Promise(r=>srv.close(r));srv.closeAllConnections?.();workshop.close();
 // 4. Was hat der Start an den Datenbanken geändert?
 const nachher=Object.fromEntries(DBS.map(n=>[n,schema(path.join(PROBE,n))]));
 log({schritt:'datenbank',aenderungen:Object.fromEntries(DBS.map(n=>[n,unterschied(vorher[n],nachher[n])]))});
 log({schritt:'fertig'});
 setTimeout(()=>process.exit(process.exitCode||0),1500).unref();
}catch(error){console.warn=warn;log({schritt:'fehler',message:String(error.message||error),stack:String(error.stack||'').split('\n').slice(1,4).map(s=>s.trim().replace(/file:\/\/.*\/private\//,'')).join(' | ')});process.exitCode=1;setTimeout(()=>process.exit(1),1500).unref();}
