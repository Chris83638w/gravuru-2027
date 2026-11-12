// Konfis-Hostanschluss auf der vorhandenen Wegwerfumgebung private/vollhost-f85390b-20261112 prüfen.
// Die geänderte Hostdatei (Branch dev/claude-konfis-hostanschluss-20261112, Commit 26a1c38f: eine Routenzeile) wird als NEUE
// Datei neben die unveränderte gelegt (acryl-employee-host.konfis.mjs) und nur von diesem Lauf geladen. Der Host läuft auf
// 127.0.0.1 mit Netzwächter und den Kopien beider Stores; Live-App, Live-Daten und app.cjs bleiben unberührt.
// Es werden nur GET-Anfragen gestellt: keine Statusknöpfe, kein POST. Das Händlertoken wird mit dem synthetischen Secret der
// Kopie im Speicher erzeugt und nie ausgegeben.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),V=path.join(P,'vollhost-f85390b-20261112'),PORT=18979;
const ALT='fc7f2402028eaa99e2a96e2adad18de892f00c2ee07b007f3ba69fa162512f8c',NEU='2301c9d1f7f19220dbf24999f374cfc2c1093dc8565eddf8ea459af7bcfc3def';
const ANKER=" if(/^\\/werkstatt\\/motivsuche\\/?$/.test(pathname))return '/werkstatt/motivsuche/';\n";
const ZUSATZ=" // B1 Konfis (Menüpunkt der Acryl-Werkstatt): Seite liegt in der neuen Laufzeit; ohne diese Zeile endete der Aufruf als 404 in der alten.\n if(/^\\/werkstatt\\/konfis\\/?$/.test(pathname))return '/werkstatt/konfis/';\n";
const HOST_LIMIT=4000,KONTO_LIMIT=9000,START_MS=240000;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'kf_pruefung',...e}));
const kopien={GRAVURU_SHOPIFY_CONFIG_FILE:path.join(V,'konfig/merchant-shopify.json'),GRAVURU_ACRYL_LEGACY_RELEASE:path.join(V,'legacy-release'),GRAVURU_ACRYL_DATA_DIR:path.join(V,'acryl-daten'),GRAVURU_PUBLIC_PREVIEW_DIRECTORY:path.join(V,'vorschau')};
function hostUmgebung(){
 const text=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),werte={};
 for(const m of text.matchAll(/process\.env\.([A-Z0-9_]+)\s*=\s*(["'])(.*?)\2/g))werte[m[1]]=m[3];
 for(const k of Object.keys(kopien))if(!(k in werte))throw new Error('Hostoption fehlt in app.cjs: '+k);
 const basis=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^(GRAVURU|SHOPIFY|PASSENGER|KT_|RT_|ZV_)/i.test(k)&&!/SECRET|TOKEN|PASSWORD/i.test(k)));
 return {...basis,...werte,...kopien,GRAVURU_ACRYL_PORT:String(PORT)};
}
function rss(pid){try{const t=fs.readFileSync('/proc/'+pid+'/status','utf8');const g=k=>{const m=new RegExp('^'+k+':\\s+(\\d+) kB','m').exec(t);return m?+m[1]/1024:0;};return {rss:g('VmRSS'),ppid:+(/^PPid:\s+(\d+)/m.exec(t)?.[1]||0)};}catch{return null;}}
function baumRss(pid){const alle=[];try{for(const d of fs.readdirSync('/proc'))if(/^\d+$/.test(d)){const r=rss(d);if(r&&r.rss>0)alle.push({pid:+d,...r});}}catch{}const ids=new Set([pid]);let neu=true;while(neu){neu=false;for(const p of alle)if(ids.has(p.ppid)&&!ids.has(p.pid)){ids.add(p.pid);neu=true;}}return {baum:alle.filter(p=>ids.has(p.pid)).reduce((a,p)=>a+p.rss,0),konto:alle.reduce((a,p)=>a+p.rss,0)};}
const wartePort=ms=>new Promise(res=>{const ende=Date.now()+ms;const versuch=()=>{const s=net.connect({host:'127.0.0.1',port:PORT});s.once('connect',()=>{s.destroy();res(true);});s.once('error',()=>{s.destroy();if(Date.now()>ende)res(false);else setTimeout(versuch,500);});};versuch();});
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
let kind=null,schritt='start';const ergebnis={schema:'gravuru-konfis-hostanschluss-kopienpruefung/v1',erstellt:new Date().toISOString(),umgebung:path.basename(V)};
try{
 // 1. geänderte Hostdatei als neue Datei neben der unveränderten
 schritt='hostdatei';const dir=path.join(V,'kandidat/app/workshop'),orig=fs.readFileSync(path.join(dir,'acryl-employee-host.mjs'),'utf8'),ziel=path.join(dir,'acryl-employee-host.konfis.mjs');
 if(sha(orig)!==ALT)throw new Error('Unveränderte Hostdatei hat nicht den Stand f85390b.');
 if(orig.split(ANKER).length!==2)throw new Error('Ankerzeile nicht eindeutig.');
 const neu=orig.replace(ANKER,ANKER+ZUSATZ);if(sha(neu)!==NEU)throw new Error('Geänderte Hostdatei entspricht nicht dem Commit 26a1c38f.');
 if(fs.existsSync(ziel)){if(sha(fs.readFileSync(ziel))!==NEU)throw new Error('Vorhandene Prüfdatei weicht ab.');}else fs.writeFileSync(ziel,neu,{flag:'wx',mode:0o600});
 ergebnis.hostdatei={unveraendert:ALT,geaendert:NEU,neueDatei:'kandidat/app/workshop/acryl-employee-host.konfis.mjs',zeilenMehr:neu.split('\n').length-orig.split('\n').length,originalUnberuehrt:sha(fs.readFileSync(path.join(dir,'acryl-employee-host.mjs')))===ALT};
 // 2. Konfiguration der Kopie
 schritt='konfiguration';const env=hostUmgebung(),konfig=JSON.parse(fs.readFileSync(kopien.GRAVURU_SHOPIFY_CONFIG_FILE,'utf8')).values,origin=konfig.GRAVURU_SHOPIFY_APP_ORIGIN,hostName=new URL(origin).host;
 if(!konfig.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE.startsWith(V+path.sep)||!konfig.GRAVURU_PRIVATE_DATA_DIR.startsWith(V+path.sep))throw new Error('Konfiguration zeigt nicht auf die Wegwerfumgebung.');
 const geheim=fs.readFileSync(konfig.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,'utf8').trim();
 const {SHOPIFY_IDENTITY}=await import(pathToFileURL(path.join(V,'kandidat/app/workshop/shopify-runtime-config.mjs')).href);
 const token=(schluessel=geheim)=>{const jetzt=Math.floor(Date.now()/1000),kopf=b64({alg:'HS256',typ:'JWT'}),inhalt=b64({iss:'https://'+SHOPIFY_IDENTITY.shopDomain+'/admin',dest:'https://'+SHOPIFY_IDENTITY.shopDomain,aud:SHOPIFY_IDENTITY.clientId,sub:'1',exp:jetzt+60,nbf:jetzt-5,iat:jetzt-5,jti:crypto.randomUUID(),sid:crypto.randomUUID()});return 'Bearer '+kopf+'.'+inhalt+'.'+crypto.createHmac('sha256',schluessel).update(kopf+'.'+inhalt).digest('base64url');};
 if(await wartePort(300))throw new Error('Port '+PORT+' ist schon belegt.');
 // 3. Host mit der geänderten Datei starten
 schritt='hoststart';const stempel=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),logDatei=path.join(V,'belege','host-konfis-'+stempel+'.stderr.log'),out=fs.openSync(logDatei,'wx',0o600);
 const code=`const m=await import(process.argv[1]);try{const s=await m.createAcrylEmployeeHost({legacyRelease:process.env.GRAVURU_ACRYL_LEGACY_RELEASE,dataDirectory:process.env.GRAVURU_ACRYL_DATA_DIR,customerIntegration:m.customerIntegrationFromEnv(process.env)});s.listen(${PORT},'127.0.0.1');for(const g of ['SIGTERM','SIGINT'])process.once(g,()=>{s.close();s.closeAllConnections();});}catch(e){console.error(JSON.stringify({event:'kf_start_fehler',code:e.code||null,message:String(e.message||e).slice(0,300)}));process.exit(1);}`;
 const start=Date.now();kind=spawn(process.execPath,['--import',pathToFileURL(path.join(hier,'vh-netzwaechter.mjs')).href,'--input-type=module','-e',code,pathToFileURL(ziel).href],{cwd:path.join(V,'app-root'),env,stdio:['ignore',out,out]});
 let beendet=null,spitze={baum:0,konto:0},grund=null;kind.on('exit',(c,s)=>{beendet={code:c,signal:s};});
 const takt=setInterval(()=>{if(beendet)return;const r=baumRss(kind.pid);spitze={baum:Math.max(spitze.baum,r.baum),konto:Math.max(spitze.konto,r.konto)};if(!grund&&(r.baum>HOST_LIMIT||r.konto>KONTO_LIMIT)){grund=r.baum>HOST_LIMIT?'host_ueber_grenze':'konto_ueber_grenze';kind.kill('SIGKILL');}},250);
 const anfrage=(pfad,kopf={})=>new Promise(res=>{const an=Date.now(),req=http.request({host:'127.0.0.1',port:PORT,path:pfad,method:'GET',headers:{Host:hostName,'X-Forwarded-Proto':'https',...kopf}},r=>{const teile=[];r.on('data',c=>teile.push(c));r.on('end',()=>{const body=Buffer.concat(teile);let data=null;if(/json/.test(r.headers['content-type']||''))try{data=JSON.parse(body.toString('utf8'));}catch{}res({status:r.statusCode,ms:Date.now()-an,bytes:body.length,typ:(r.headers['content-type']||'').split(';')[0],text:body.toString('utf8'),data});});});req.setTimeout(150000,()=>req.destroy(new Error('timeout')));req.on('error',e=>res({status:0,ms:Date.now()-an,bytes:0,typ:'',text:'',data:null,fehler:String(e.code||e.message)}));req.end();});
 const kurz=r=>({status:r.status,ms:r.ms,bytes:r.bytes,typ:r.typ,...(r.fehler?{fehler:r.fehler}:{}),...(r.data&&r.data.error?{code:r.data.error.code??r.data.code??null}:{})});
 try{
  if(!await wartePort(START_MS)||beendet)throw new Error('Host lauscht nicht.');ergebnis.startBisPortS=Math.round((Date.now()-start)/100)/10;
  schritt='anfragen';const a={};
  // Seite und Dateien (wie jede Werkstattseite ohne Anmeldung als Hülle ausgeliefert; Daten nur mit Händlersitzung)
  const seite=await anfrage('/werkstatt/konfis/'),ohneSlash=await anfrage('/werkstatt/konfis');
  a.seite={...kurz(seite),hatUi:seite.text.includes('/workshop-acryl-ui/konfis-ui.mjs'),hatCss:seite.text.includes('/workshop-acryl-ui/konfis.css'),keinUnumgeschriebenerPfad:!/["'(]\/workshop-ui\//.test(seite.text),titel:(seite.text.match(/<title>([^<]{0,80})/)||[])[1]||null};a.seiteOhneSlash=kurz(ohneSlash);
  const ui=await anfrage('/workshop-acryl-ui/konfis-ui.mjs'),css=await anfrage('/workshop-acryl-ui/konfis.css');
  a.ui={...kurz(ui),ruftAcrylApi:ui.text.includes('/api/workshop/acryl/konfis'),ruftKeineLegacyApi:!ui.text.includes("'/api/workshop/konfis")};a.css=kurz(css);
  a.falscherUnterpfad=kurz(await anfrage('/werkstatt/konfis/x'));
  // Daten: ohne Anmeldung, mit falsch signiertem Token, mit Händlertoken der Kopie
  a.apiOhneAnmeldung=kurz(await anfrage('/api/workshop/acryl/konfis?status=all&page=1&pageSize=24'));
  a.apiFalschesToken=kurz(await anfrage('/api/workshop/acryl/konfis?status=all&page=1&pageSize=24',{authorization:token('x'.repeat(48))}));
  const liste=await anfrage('/api/workshop/acryl/konfis?status=all&page=1&pageSize=24',{authorization:token()}),d=liste.data||{};
  a.apiHaendler={...kurz(liste),schluessel:Object.keys(d).slice(0,14),seite:d.page??null,seiten:d.pages??null,gesamt:d.total??null,zaehler:d.counts??null,ausgeschlossen:d.excluded??null,eintraege:Array.isArray(d.konfis)?d.konfis.length:null,eintragSchluessel:Array.isArray(d.konfis)&&d.konfis[0]?Object.keys(d.konfis[0]).slice(0,16):null,
   statusVerteilungSeite1:Array.isArray(d.konfis)?d.konfis.reduce((m,k)=>{m[k.status]=(m[k.status]||0)+1;return m;},{}):null};
  const such=await anfrage('/api/workshop/acryl/konfis?status=all&page=1&pageSize=24&query='+encodeURIComponent('Türschild Acrylglas 3 mm'),{authorization:token()}),sd=such.data||{};
  a.apiSucheHauptacryl={...kurz(such),gesamt:sd.total??null,enthaeltHauptacryl:Array.isArray(sd.konfis)&&sd.konfis.some(k=>k.id==='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0')};
  // Store-Zuordnung: dieselbe Abfrage über den Legacy-Pfad darf nicht die Acryl-Liste liefern
  a.legacyApiPfad=kurz(await anfrage('/api/workshop/konfis?status=all&page=1&pageSize=24',{authorization:token()}));
  // Nachbarn unverändert
  a.acrylSeite=kurz(await anfrage('/werkstatt/acryl/'));a.legacyWerkstatt=kurz(await anfrage('/werkstatt/'));a.designs=kurz(await anfrage('/werkstatt/designs/'));a.motivsuche=kurz(await anfrage('/werkstatt/motivsuche/'));
  ergebnis.anfragen=a;
  ergebnis.pruefungen={seite_200_html:seite.status===200&&a.seite.typ==='text/html'&&a.seite.hatUi&&a.seite.hatCss,seite_ohne_slash_200:ohneSlash.status===200,dateien_200:ui.status===200&&css.status===200&&a.ui.ruftAcrylApi,unterpfad_bleibt_404:a.falscherUnterpfad.status===404,
   api_ohne_anmeldung_401:a.apiOhneAnmeldung.status===401,api_falsches_token_401:a.apiFalschesToken.status===401,api_haendler_200_mit_liste:liste.status===200&&Array.isArray(d.konfis)&&Number.isSafeInteger(d.total),acryl_store_bestaetigt:a.apiSucheHauptacryl.enthaeltHauptacryl===true,nachbarn_200:[a.acrylSeite,a.legacyWerkstatt,a.designs,a.motivsuche].every(x=>x.status===200),nur_get:true};
 }finally{clearInterval(takt);if(kind&&!beendet){kind.kill('SIGTERM');await new Promise(r=>{const z=setTimeout(()=>{try{kind.kill('SIGKILL');}catch{}r();},15000);kind.once('exit',()=>{clearTimeout(z);r();});});}
  fs.closeSync(out);const hostLog=fs.readFileSync(logDatei,'utf8');
  ergebnis.host={spitzeBaumMiB:Math.round(spitze.baum),spitzeKontoMiB:Math.round(spitze.konto),abbruchGrund:grund,ende:beendet,netzBlockiert:(hostLog.match(/vh_netz_blockiert/g)||[]).length,startFehler:(hostLog.match(/kf_start_fehler[^\n]{0,300}/)||[null])[0],logDatei:path.basename(logDatei),logZeilen:hostLog.split('\n').filter(Boolean).length};}
 ergebnis.bestanden=!!ergebnis.pruefungen&&Object.values(ergebnis.pruefungen).every(Boolean)&&ergebnis.host.netzBlockiert===0&&!ergebnis.host.abbruchGrund;
 const beleg=path.join(V,'belege','TESTBELEG-konfis-hostanschluss-'+stempel+'.json');fs.writeFileSync(beleg,JSON.stringify(ergebnis,null,1),{flag:'wx',mode:0o600});ergebnis.belegSha256=sha(fs.readFileSync(beleg));
 log(ergebnis);
}catch(error){log({...ergebnis,schritt,fehler:String(error.message||error).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300),bestanden:false});process.exitCode=1;}
