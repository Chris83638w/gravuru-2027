// Isolierter Zwei-Store-Hosttest (Kandidat f85390b) auf der Wegwerfumgebung private/vollhost-f85390b-20261112/.
// Startet den unveränderten Hosteinstieg scripts/acryl-employee-entry.cjs der Kandidatenkopie als eigenen Prozess auf
// 127.0.0.1 (eigener Port), mit denselben Hostoptionen wie app.cjs – nur die vier Pfade (Händlerkonfiguration, Legacy-
// Release, Acryl-Datenordner, Vorschauordner) zeigen auf die Kopien. Netzausgang des Testprozesses ist auf Loopback
// begrenzt (vh-netzwaechter.mjs). Danach eine echte signierte Kundensitzung: Start, Modell, Galerie/Suche, Vorschau,
// Designwechsel, parallele Lesungen, mindestens 60 s. Keine Warenkorb-, Bestell-, Entwurfs- oder Webhookroute.
// Aufruf: node vh-sitzung.mjs vorpruefung | lauf <name> [--host=<MiB>] [--konto=<MiB>] [--diagnose]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),V=path.join(P,'vollhost-f85390b-20261112');
const PORT=18979,PRODUKT='16190784602492',VARIANTE='58104626479484',SHOP='gravuru-design.myshopify.com',PROXY='/apps/konfigurator';
const arg=(n,d)=>{const a=process.argv.find(x=>x.startsWith('--'+n+'='));return a?+a.split('=')[1]:d;};
const HOST_LIMIT=arg('host',4000),KONTO_LIMIT=arg('konto',8000),SITZUNG_MS=arg('sekunden',65)*1000,START_MS=240000;
const log=e=>console.log(JSON.stringify({event:'vh_sitzung',...e}));
const kopien={GRAVURU_SHOPIFY_CONFIG_FILE:path.join(V,'konfig/merchant-shopify.json'),GRAVURU_ACRYL_LEGACY_RELEASE:path.join(V,'legacy-release'),GRAVURU_ACRYL_DATA_DIR:path.join(V,'acryl-daten'),GRAVURU_PUBLIC_PREVIEW_DIRECTORY:path.join(V,'vorschau')};
// Hostoptionen aus der tatsächlichen app.cjs lesen; Werte werden nie ausgegeben.
function hostUmgebung(){
 const text=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),werte={};
 for(const m of text.matchAll(/process\.env\.([A-Z0-9_]+)\s*=\s*(["'])(.*?)\2/g))werte[m[1]]=m[3];
 for(const k of Object.keys(kopien))if(!(k in werte))throw new Error('Hostoption fehlt in app.cjs: '+k);
 const basis=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^(GRAVURU|SHOPIFY|PASSENGER|KT_|RT_|ZV_)/i.test(k)&&!/SECRET|TOKEN|PASSWORD/i.test(k)));
 return {env:{...basis,...werte,...kopien,GRAVURU_ACRYL_PORT:String(PORT)},namen:Object.keys(werte),ersetzt:Object.keys(kopien)};
}
function rss(pid){try{const t=fs.readFileSync('/proc/'+pid+'/status','utf8');const g=k=>{const m=new RegExp('^'+k+':\\s+(\\d+) kB','m').exec(t);return m?+m[1]/1024:0;};return {rss:g('VmRSS'),anon:g('RssAnon'),ppid:+(/^PPid:\s+(\d+)/m.exec(t)?.[1]||0)};}catch{return null;}}
function prozesse(){const out=[];try{for(const d of fs.readdirSync('/proc'))if(/^\d+$/.test(d)){const r=rss(d);if(r&&r.rss>0)out.push({pid:+d,...r});}}catch{}return out;}
function baumRss(pid){const alle=prozesse(),ids=new Set([pid]);let neu=true;while(neu){neu=false;for(const p of alle)if(ids.has(p.ppid)&&!ids.has(p.pid)){ids.add(p.pid);neu=true;}}const mein=alle.filter(p=>ids.has(p.pid));return {host:mein.find(p=>p.pid===pid)?.rss||0,baum:mein.reduce((a,p)=>a+p.rss,0),konto:alle.reduce((a,p)=>a+p.rss,0),kinder:mein.length-1};}
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const wartePort=ms=>new Promise(res=>{const ende=Date.now()+ms;const versuch=()=>{const s=net.connect({host:'127.0.0.1',port:PORT});s.once('connect',()=>{s.destroy();res(true);});s.once('error',()=>{s.destroy();if(Date.now()>ende)res(false);else setTimeout(versuch,500);});};versuch();});
const schlaf=ms=>new Promise(r=>setTimeout(r,ms));

function vorpruefung(){
 const {env}=hostUmgebung();
 const code=`const [mc,cfg]=await Promise.all([import(process.argv[1]),0]);try{const c=mc.merchantConfig(process.env);mc.verifyMerchantStorage(c);console.log(JSON.stringify({ok:true,host:c.host,datenordnerIstKopie:c.data===process.argv[2],python:!!c.python,warenkorb:!!c.merchantTestCart,webhook:!!c.orderWebhook,ki:!!(c.aiDesign&&c.aiDesign.config)}));}catch(e){console.log(JSON.stringify({ok:false,code:e.code||null,message:String(e.message||e).slice(0,200)}));}`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',code,pathToFileURL(path.join(V,'legacy-release/ops/plesk/merchant-config.mjs')).href,path.join(V,'legacy-daten')],{env,cwd:path.join(V,'app-root'),encoding:'utf8',timeout:60000});
 let e=null;try{e=JSON.parse(r.stdout.trim().split('\n').at(-1));}catch{}
 const belegt=fs.existsSync(path.join(V,'AUFBAU.json'));
 log({schritt:'vorpruefung',aufbau:belegt,exit:r.status,ergebnis:e,stderr:String(r.stderr||'').slice(0,300),portFrei:null});
}

async function lauf(name){
 if(!/^[a-z0-9-]{1,20}$/.test(name||''))throw new Error('Laufname fehlt.');
 const {env,namen,ersetzt}=hostUmgebung();
 const {appProxySignature}=await import(pathToFileURL(path.join(V,'kandidat/app/workshop/shopify-app-proxy.mjs')).href);
 const konfig=JSON.parse(fs.readFileSync(kopien.GRAVURU_SHOPIFY_CONFIG_FILE,'utf8')).values,origin=konfig.GRAVURU_SHOPIFY_APP_ORIGIN,hostName=new URL(origin).host;
 const geheim=fs.readFileSync(konfig.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,'utf8').trim();
 if(!konfig.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE.startsWith(V+path.sep)||!konfig.GRAVURU_PRIVATE_DATA_DIR.startsWith(V+path.sep))throw new Error('Konfiguration zeigt nicht auf die Wegwerfumgebung.');
 if(await wartePort(300))throw new Error('Port '+PORT+' ist schon belegt.');
 const stempel=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),logDatei=path.join(V,'belege','host-'+name+'-'+stempel+'.stderr.log');
 const diagnose=process.argv.includes('--diagnose');
 const einstieg=diagnose
  ?['--input-type=module','-e',`const m=await import(process.argv[1]);try{const s=await m.createAcrylEmployeeHost({legacyRelease:process.env.GRAVURU_ACRYL_LEGACY_RELEASE,dataDirectory:process.env.GRAVURU_ACRYL_DATA_DIR,customerIntegration:m.customerIntegrationFromEnv(process.env)});s.listen(${PORT},'127.0.0.1');for(const g of ['SIGTERM','SIGINT'])process.once(g,()=>{s.close();s.closeAllConnections();});}catch(e){console.error(JSON.stringify({event:'vh_start_fehler',code:e.code||null,message:String(e.message||e).slice(0,300),stack:String(e.stack||'').split('\\n').slice(1,5).map(x=>x.trim().replace(/\\/var\\/www\\/vhosts\\/[^/]+/,'~').slice(0,160))}));process.exitCode=1;}`,pathToFileURL(path.join(V,'kandidat/app/workshop/acryl-employee-host.mjs')).href]
  :[path.join(V,'kandidat/scripts/acryl-employee-entry.cjs')];
 const start=Date.now(),t=()=>Math.round((Date.now()-start)/100)/10;
 const out=fs.openSync(logDatei,'wx',0o600);
 const kind=spawn(process.execPath,['--import',pathToFileURL(path.join(hier,'vh-netzwaechter.mjs')).href,...einstieg],{cwd:path.join(V,'app-root'),env,stdio:['ignore',out,out]});
 let beendet=null;kind.on('exit',(code,signal)=>{beendet={code,signal,t:t()};});
 let spitze={host:0,baum:0,konto:0},grund=null;const verlauf=[],phasen=[];let letzter=0,phase='start';
 const takt=setInterval(()=>{if(beendet)return;const r=baumRss(kind.pid);spitze={host:Math.max(spitze.host,r.host),baum:Math.max(spitze.baum,r.baum),konto:Math.max(spitze.konto,r.konto)};
  if(Date.now()-letzter>=2000){letzter=Date.now();verlauf.push([t(),Math.round(r.host),Math.round(r.baum),Math.round(r.konto),phase]);}
  if(!grund&&r.baum>HOST_LIMIT){grund='host_ueber_'+HOST_LIMIT+'_MiB';kind.kill('SIGKILL');}
  if(!grund&&r.konto>KONTO_LIMIT){grund='konto_ueber_'+KONTO_LIMIT+'_MiB';kind.kill('SIGKILL');}},250);
 const setze=p=>{phase=p;const r=beendet?{host:0,baum:0,konto:0}:baumRss(kind.pid);phasen.push({phase:p,t:t(),hostMiB:Math.round(r.host),baumMiB:Math.round(r.baum)});};
 const anfragen=[];
 const anfrage=(marke,pfad,{method='GET',kopf={},daten}={})=>new Promise(res=>{
  const bytes=daten===undefined?null:Buffer.from(JSON.stringify(daten)),an=Date.now();
  const req=http.request({host:'127.0.0.1',port:PORT,path:pfad,method,headers:{Host:hostName,'X-Forwarded-Proto':'https',...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(bytes?{'Content-Length':bytes.length}:{}),...kopf}},r=>{const teile=[];r.on('data',c=>teile.push(c));r.on('end',()=>{const body=Buffer.concat(teile);let data=null;if(/json/.test(r.headers['content-type']||''))try{data=JSON.parse(body);}catch{}const e={marke,t:t(),status:r.statusCode,ms:Date.now()-an,bytes:body.length,typ:(r.headers['content-type']||'').split(';')[0],fehler:data?.error?.code||null};anfragen.push(e);res({...e,data,headers:r.headers,body});});});
  req.setTimeout(150000,()=>req.destroy(new Error('timeout')));req.on('error',err=>{const e={marke,t:t(),status:0,ms:Date.now()-an,bytes:0,fehler:String(err.code||err.message)};anfragen.push(e);res({...e,data:null,headers:{},body:Buffer.alloc(0)});});req.end(bytes);});
 const sitzung=tok=>({'X-Gravuru-Shop-Session':tok,Origin:origin});
 const ergebnis={};let fehler=null;
 try{
  const bereit=await wartePort(START_MS);setze('lauscht');ergebnis.startBisPortS=t();
  if(!bereit||beendet)throw new Error('Host lauscht nicht (Start fehlgeschlagen oder beendet).');
  // 1) signierter Start über den App-Proxy-Pfad (eigene HMAC mit dem synthetischen Secret der Kopie)
  const q=new URLSearchParams({shop:SHOP,path_prefix:PROXY,timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'',product:PRODUKT,variant:VARIANTE});q.set('signature',appProxySignature(q,geheim));
  const s=await anfrage('start',PROXY+'/start?'+q);let token=null,frag=[];
  if(s.status===302&&s.headers.location){const u=new URL(s.headers.location,origin),f=new URLSearchParams(u.hash.slice(1));token=f.get('s');frag=[...f.keys()];ergebnis.start={status:302,zielPfad:u.pathname,fragmentSchluessel:frag,tokenZeichen:token?token.length:0,tokenPraefix:token?token.slice(0,5):null};}
  else ergebnis.start={status:s.status,fehler:s.fehler};
  if(!token)throw new Error('Kein Sitzungstoken aus dem Start.');
  setze('sitzung');const sitzungStart=Date.now();
  // 2) Modell: native cfg/Revision, Bindung und Ablauf zurücklesen (keine Modellinhalte ausgeben)
  const m=await anfrage('modell-1',  '/api/shop-entry/model',{kopf:sitzung(token)});
  if(m.data){const d=m.data,klein=o=>o&&typeof o==='object'?Object.fromEntries(Object.entries(o).filter(([,v])=>v===null||['string','number','boolean'].includes(typeof v)).map(([k,v])=>[k,typeof v==='string'?v.slice(0,90):v])):o;
   ergebnis.modell={schluessel:Object.keys(d),bindung:klein(d.binding),bindungSchluessel:d.binding?Object.keys(d.binding):null,optionen:d.binding?.options??d.binding?.selectedOptions??null,expiresAt:d.expiresAt,productionReady:d.productionReady,startPreview:d.startPreview?Object.keys(d.startPreview):null,modellSchluessel:d.model?Object.keys(d.model):null,profil:klein(d.model?.universal?.profile),universalSchluessel:d.model?.universal?Object.keys(d.model.universal).slice(0,30):null};}
  setze('galerie');
  const g=await anfrage('galerie-0','/api/shop-entry/design-gallery',{kopf:sitzung(token)});
  const karten=g.data?.items||[];ergebnis.galerie={status:g.status,schluessel:g.data?Object.keys(g.data):null,total:g.data?.total??null,seite:karten.length,kartenSchluessel:karten[0]?Object.keys(karten[0]):null,galerieStatus:g.data?.status??null};
  const g2=await anfrage('galerie-alle','/api/shop-entry/design-gallery?theme=all&page=1',{kopf:sitzung(token)});
  const g3=await anfrage('galerie-suche','/api/shop-entry/design-gallery?q=familie',{kopf:sitzung(token)});
  ergebnis.galerie.alleSeite1={status:g2.status,total:g2.data?.total??null,seite:g2.data?.items?.length??null};ergebnis.galerie.suche={status:g3.status,total:g3.data?.total??null,seite:g3.data?.items?.length??null};
  setze('parallel');
  await Promise.all([anfrage('par-modell-a','/api/shop-entry/model',{kopf:sitzung(token)}),anfrage('par-modell-b','/api/shop-entry/model',{kopf:sitzung(token)}),anfrage('par-galerie-a','/api/shop-entry/design-gallery?page=1',{kopf:sitzung(token)}),anfrage('par-galerie-b','/api/shop-entry/design-gallery?q=herz',{kopf:sitzung(token)})]);
  // 3) Vorschau und Designwechsel für ein anderes Design aus der Galerie (Sitzungsfunktionen, keine Produktänderung)
  setze('vorschau');const ziel=karten.find(k=>k.target&&!k.current)||karten.find(k=>k.target);
  if(ziel){const v=await anfrage('vorschau','/api/shop-entry/design-gallery-preview',{method:'POST',kopf:sitzung(token),daten:{target:ziel.target}});ergebnis.vorschau={status:v.status,typ:v.typ,bytes:v.bytes,fehler:v.fehler};
   setze('wechsel');const w=await anfrage('wechsel','/api/shop-entry/design-switch',{method:'POST',kopf:sitzung(token),daten:{target:ziel.target}});
   ergebnis.wechsel={status:w.status,fehler:w.fehler,schluessel:w.data?Object.keys(w.data):null,designId:w.data?.designId??null,bindung:w.data?.binding?Object.fromEntries(Object.entries(w.data.binding).filter(([,x])=>['string','number'].includes(typeof x)).map(([k,x])=>[k,typeof x==='string'?x.slice(0,90):x])):null,unitCents:w.data?.unitCents??null,expiresAt:w.data?.expiresAt??null};
   if(w.data?.token){const m2=await anfrage('modell-nach-wechsel','/api/shop-entry/model',{kopf:sitzung(w.data.token)});ergebnis.wechsel.modellDanach=m2.status;}}
  else ergebnis.vorschau={status:null,hinweis:'kein Ziel in der Galerie'};
  // 4) native Ablehnungen bleiben aktiv
  setze('ablehnung');const a1=await anfrage('ohne-sitzung','/api/shop-entry/model',{kopf:{Origin:origin}}),a2=await anfrage('fremde-origin','/api/shop-entry/model',{kopf:{'X-Gravuru-Shop-Session':token,Origin:'https://fremd.example'}}),a3=await anfrage('falsche-signatur',PROXY+'/start?'+new URLSearchParams({...Object.fromEntries(q),signature:'0'.repeat(64)}));
  ergebnis.ablehnungen={ohneSitzung:[a1.status,a1.fehler],fremdeOrigin:[a2.status,a2.fehler],falscheSignatur:[a3.status,a3.fehler]};
  // 5) Sitzung halten: bis mindestens SITZUNG_MS alle 5 s lesen, Prozess alle 250 ms überwacht
  setze('halten');let i=0;while(Date.now()-sitzungStart<SITZUNG_MS&&!beendet){await schlaf(5000);i++;await anfrage('halten-'+i,i%2?'/api/shop-entry/model':'/api/shop-entry/design-gallery',{kopf:sitzung(token)});}
  const letzte=await anfrage('modell-ende','/api/shop-entry/model',{kopf:sitzung(token)});
  ergebnis.sitzung={dauerS:Math.round((Date.now()-sitzungStart)/1000),letzteModellantwort:letzte.status,expiresAt:letzte.data?.expiresAt??null,restS:letzte.data?.expiresAt?Math.round((new Date(letzte.data.expiresAt).getTime()-Date.now())/1000):null,prozessGleich:!beendet};
  setze('ende');
 }catch(e){fehler=String(e.message||e);}
 // sauberes Ende
 const vorEnde=beendet?null:baumRss(kind.pid);
 if(!beendet){kind.kill('SIGTERM');for(let i=0;i<80&&!beendet;i++)await schlaf(250);}
 let hart=false;if(!beendet){hart=true;kind.kill('SIGKILL');for(let i=0;i<20&&!beendet;i++)await schlaf(250);}
 clearInterval(takt);fs.closeSync(out);
 const zeilen=fs.readFileSync(logDatei,'utf8').split('\n').filter(Boolean),ereignisse={},merk=[];
 for(const z of zeilen){let j=null;try{j=JSON.parse(z);}catch{}const n=j?.event||'text';ereignisse[n]=(ereignisse[n]||0)+1;
  if(j&&/shop_gallery|vh_|katalog_worker|merchant_session|search_stats|fehler|error/i.test(n)&&merk.length<40)merk.push(Object.fromEntries(Object.entries(j).filter(([,v])=>['string','number','boolean'].includes(typeof v)).map(([k,v])=>[k,typeof v==='number'?Math.round(v):String(v).slice(0,120)])));
  if(!j&&merk.length<40)merk.push({text:z.replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,200)});}
 const m=JSON.parse(fs.readFileSync(path.join(P,'sicherungen-db/20261111T212859Z/manifest.json'),'utf8')).dateien,ml=JSON.parse(fs.readFileSync(path.join(P,'sicherungen-db/legacy/20261112T013926Z/manifest.json'),'utf8')).dateien;
 const sicherungen={acryl:dateiSha(path.join(P,'sicherungen-db/20261111T212859Z/workshop.sqlite'))===m['workshop.sqlite'].sha256,legacy:dateiSha(path.join(P,'sicherungen-db/legacy/20261112T013926Z/workshop.sqlite'))===ml['workshop.sqlite'].sha256};
 const groessen=d=>Object.fromEntries(fs.readdirSync(path.join(V,d)).map(n=>[n,fs.statSync(path.join(V,d,n)).size]));
 const stat=k=>{const a=anfragen.filter(x=>k.test(x.marke)).map(x=>x.ms).sort((x,y)=>x-y);return a.length?{n:a.length,min:a[0],median:a[Math.floor(a.length/2)],max:a.at(-1)}:null;};
 const beleg={schema:'gravuru-vollhost-sitzung/v1',lauf:name,diagnose,start:new Date(start).toISOString(),einstieg:diagnose?'createAcrylEmployeeHost (Diagnosehülle)':'scripts/acryl-employee-entry.cjs',port:PORT,hostoptionen:{ausAppCjs:namen,aufKopienUmgestellt:ersetzt},grenzen:{hostBaumMiB:HOST_LIMIT,kontoMiB:KONTO_LIMIT},fehler,abbruchDurchWaechter:grund,
  ergebnis,phasen,spitzeMiB:{host:Math.round(spitze.host),hostMitKindern:Math.round(spitze.baum),kontoSumme:Math.round(spitze.konto)},vorEndeMiB:vorEnde?{host:Math.round(vorEnde.host),baum:Math.round(vorEnde.baum),kinder:vorEnde.kinder}:null,
  ende:{code:beendet?.code??null,signal:beendet?.signal??null,beiS:beendet?.t??null,hartBeendet:hart},anfragen,antwortzeiten:{modell:stat(/modell/),galerie:stat(/galerie/),halten:stat(/halten/)},statusZaehlung:anfragen.reduce((a,x)=>{a[x.status]=(a[x.status]||0)+1;return a;},{}),
  hostEreignisse:ereignisse,ereignisAuszug:merk,sicherungenUnveraendert:sicherungen,kopienNachLauf:{acryl:groessen('acryl-daten'),legacy:groessen('legacy-daten'),vorschau:fs.readdirSync(path.join(V,'vorschau')).length},verlauf};
 fs.writeFileSync(path.join(V,'belege','sitzung-'+name+'-'+stempel+'.json'),JSON.stringify(beleg),{flag:'wx',mode:0o600});
 const duenn=(a,n)=>a.filter((_,i)=>i%Math.ceil(a.length/n||1)===0||i===a.length-1);
 log({...beleg,anfragen:anfragen.map(x=>[x.marke,x.t,x.status,x.ms,x.bytes,x.fehler].filter(v=>v!==null)),verlauf:duenn(verlauf,24)});
 if(fehler||grund||!ergebnis.sitzung)process.exitCode=1;
}
try{const b=process.argv[2];if(b==='vorpruefung')vorpruefung();else if(b==='lauf')await lauf(process.argv[3]);else throw new Error('Befehl: vorpruefung | lauf <name>');}
catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
