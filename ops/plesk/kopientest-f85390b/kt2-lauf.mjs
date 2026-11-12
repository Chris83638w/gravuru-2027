// Kopientest für den Reparaturstand f85390b (Astra, #168 6809793605): Galerie kalt/reopen mit blockweisem v4-Cache.
// Liest ausschließlich die vorhandene Datenbank-ARBEITSKOPIE (nie Live, nie die unveränderte Sicherung),
// schreibt nur in einen eigenen privaten Messordner. Kein Netz, kein App-Start, keine Änderung an der laufenden App.
//   node kt2-lauf.mjs galerie-kalt | galerie-reopen | status
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

const hier=import.meta.dirname;
const BASE=process.env.KT_BASE||path.resolve(hier,'../sicherungen-db');
const RT=process.env.KT_RT||path.resolve(hier,'../kandidat-f85390b-20261112');
const WORKSHOP=process.env.KT_WORKSHOP||path.join(BASE,'arbeitskopie-20261111T195242Z','workshop.copy.sqlite');
const ZV=process.env.KT_ZV||path.join(BASE,'zielvergleich-20261111T205705Z');
const MESS=process.env.KT_MESS||path.join(BASE,'kopientest-f85390b-20261112');
const STORE=process.env.KT_STORE||'acryl',SHOP=process.env.KT_SHOP||'gravuru-design.myshopify.com',TENANT='gravuru';
const LIMIT_MIB=+(process.env.KT_LIMIT_MIB||1800),KONTO_LIMIT_MIB=+(process.env.KT_KONTO_LIMIT_MIB||3300),ZEIT_MS=+(process.env.KT_ZEIT_MS||15*60*1000);
const REV='f85390bd3494920679b06c3b39cabf96c95c1343';
const PINS_RT={
 'app/workshop/shop-product-binding-store.mjs':'119a276d75bb83a67457f0e2ad37849f27a56b7a1b4a9789f527d4efbb8bc600',
 'app/workshop/shop-gallery-snapshot.mjs':'8d2451a35813c02c03814d949db92380262c0e7bb6312dea45bc9deb10823a0d',
 'app/workshop/shop-design-gallery.mjs':'82b2c59c97a1bea3b54ed356570e59e9a6fa134c92fff0fe3e6332696d420858',
 'scripts/shop-gallery-benchmark.mjs':'b251e8832f670a501c7a05bf14d7df66e08ecee3519e408e9a689ef1928b4590',
 'app/workshop/profile-library.mjs':'d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51',
 'ops/issue230-main-target-compare-20261111/compare-main-target-copy.mjs':'5c4394a4ad258dc30eca249fde5a3cc9d60e2755d8d00b62d76b61be29580394',
 'ops/issue230-main-target-compare-20261111/resolve-main-category-profiles-readonly.mjs':'e86c1ddf42fe957f2e60c9e7e769937e3c0f07571980cf382413b6db9cd48476',
 'ops/issue230-main-target-compare-20261111/copy-guard.mjs':'466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671',
 'ops/issue230-small-targets-copy-review-20261111/inspect-small-targets-copy.mjs':'f7885dbd2c7b23686a6086a6b8b4c6f2dea6c76b04f55f8062b91adc4fe98fee',
 'ops/issue230-small-targets-copy-review-20261111/copy-guard.mjs':'466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671',
 'ops/issue230-small-targets-copy-review-20261111/v9-source-aliases.json':'2ddc13a66c323ece8228867e1e8bf32388f7d82b129ff37128d37fb12a79f694',
};
const PINS_HIER={
 'kt-materialize-metadata-preview.mjs':'84e82f7ecc935abb154e7bb1af4eb5abd161820a71fbb723076d0df00d847643',
 'kt-metadata-changes.json':'80a648089bd45174464cd5ed9ad16fcc1a51639a2cf1a5636b917da891d782bc',
 'kt-update-intent.preview.json':'fcfddddeae4a188ef980a67912e247d85bb42b46c1d4836de669207b01b2282b',
 'kt-six-groups.json':'d2cb6cac1149da13db9ed9c2af83f27f3060a4531840636542e9fe95f4d6346f',
};
const ZIEL_ALT='2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c',ZIEL_NEU='ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407',MAPPING_GZ='3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf';

// Kindprozesse erben keine App-/Shop-Einstellungen aus der Umgebung.
const KIND_ENV=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^(GRAVURU|SHOPIFY|RT_|ZV_|KT_)/i.test(k)&&!/SECRET|TOKEN|PASSWORD/i.test(k)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'kt_lauf',...e}));
const muss=(ok,text)=>{if(!ok)throw new Error(text);};
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const pinsPruefen=(root,pins,namen)=>{for(const name of namen){const file=path.join(root,name);muss(fs.existsSync(file),'Datei fehlt: '+name);muss(sha(fs.readFileSync(file))===pins[name],'Prüfsumme weicht ab: '+name);}};
function kopieSchuetzen(file){
 const real=fs.realpathSync(file),info=fs.lstatSync(file);
 muss(real===path.resolve(file)&&info.isFile()&&!info.isSymbolicLink()&&info.nlink===1,'Nur eine normale, nicht verlinkte Kopie verwenden.');
 muss(/\.copy\.sqlite$/.test(real),'Quelle muss eine *.copy.sqlite-Arbeitskopie sein.');
 muss(!/[\\/]private[\\/](?:acryl-employee-20261021-v1|mika-r15-resume-20261108-v1)[\\/]/.test(real),'Live-Datenordner ist ausgeschlossen.');
 muss(!/[\\/]sicherungen-db[\\/]\d{8}T\d{6}Z[\\/]/.test(real),'Die unveränderte Sicherung ist ausgeschlossen.');
 for(const s of ['-wal','-journal'])muss(!fs.existsSync(real+s)||fs.statSync(real+s).size===0,'Kopie hat eine nichtleere '+s+'-Datei.');
 return real;
}
function cacheInfo(file){if(!fs.existsSync(file))return null;const db=new DatabaseSync(file,{readOnly:true});try{const zeilen=db.prepare("SELECT store_id AS store,length(CAST(payload AS BLOB)) AS payloadBytes,substr(payload,1,24) AS anfang,length(mac) AS macZeichen,substr(revision,1,16) AS revision FROM shop_gallery_cache").all();return {dateiBytes:fs.statSync(file).size,zeilen};}catch(e){return {dateiBytes:fs.statSync(file).size,fehler:String(e.message||e)};}finally{db.close();}}
const messordner=()=>{fs.mkdirSync(MESS,{recursive:true,mode:0o700});fs.chmodSync(MESS,0o700);};
const ablegen=(name,inhalt)=>{const file=path.join(MESS,name);fs.writeFileSync(file,inhalt,{flag:'wx',mode:0o600});return file;};
const stempel=()=>new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
// Speicher des eigenen Kontos: Summe aller sichtbaren Prozesse (im Hosting-Käfig sind das nur die eigenen).
function rssVon(pid){try{const t=fs.readFileSync('/proc/'+pid+'/status','utf8');const r=/VmRSS:\s+(\d+) kB/.exec(t),h=/VmHWM:\s+(\d+) kB/.exec(t);return {rss:r?+r[1]/1024:0,hwm:h?+h[1]/1024:0};}catch{return null;}}
function konto(){let summe=0,prozesse=0;try{for(const d of fs.readdirSync('/proc')){if(!/^\d+$/.test(d))continue;const r=rssVon(d);if(r&&r.rss>0){summe+=r.rss;prozesse++;}}}catch{}return {mib:+summe.toFixed(1),prozesse};}

async function kindMitWaechter(args,cwd){
 const vorher=konto(),start=Date.now();
 const kind=spawn(process.execPath,args,{cwd,stdio:['ignore','pipe','pipe'],env:KIND_ENV});
 let out='',err='',spitze=0,hwm=0,kontoSpitze=vorher.mib,grund=null;const verlauf=[];let letzter=0;
 kind.stdout.on('data',d=>{out+=d;});kind.stderr.on('data',d=>{err+=d;});
 const takt=setInterval(()=>{
  const r=rssVon(kind.pid);if(!r)return;spitze=Math.max(spitze,r.rss);hwm=Math.max(hwm,r.hwm);
  const jetzt=Date.now();
  if(jetzt-letzter>=5000){letzter=jetzt;const k=konto();kontoSpitze=Math.max(kontoSpitze,k.mib);verlauf.push([Math.round((jetzt-start)/1000),Math.round(r.rss),Math.round(k.mib)]);
   if(k.mib>KONTO_LIMIT_MIB&&!grund){grund='konto_ueber_'+KONTO_LIMIT_MIB+'_MiB';kind.kill('SIGKILL');}}
  if(r.rss>LIMIT_MIB&&!grund){grund='prozess_ueber_'+LIMIT_MIB+'_MiB';kind.kill('SIGKILL');}
  if(jetzt-start>ZEIT_MS&&!grund){grund='zeit_ueber_'+ZEIT_MS+'_ms';kind.kill('SIGKILL');}
 },100);
 const ende=await new Promise(res=>kind.on('close',(code,signal)=>res({code,signal})));clearInterval(takt);
 return {exit:ende.code,signal:ende.signal,abbruchDurchWaechter:grund,ms:Date.now()-start,prozessSpitzeMiB:+Math.max(spitze,hwm).toFixed(1),kontoVorherMiB:vorher.mib,kontoProzesseVorher:vorher.prozesse,kontoSpitzeMiB:+kontoSpitze.toFixed(1),verlauf,out,err};
}

async function galerie(art){
 pinsPruefen(RT,PINS_RT,['app/workshop/shop-product-binding-store.mjs','app/workshop/shop-gallery-snapshot.mjs','app/workshop/shop-design-gallery.mjs','scripts/shop-gallery-benchmark.mjs']);
 const quelle=kopieSchuetzen(WORKSHOP);messordner();
 const cache=path.join(MESS,'gallery-v4-measure-only.sqlite');
 if(art==='kalt')muss(!fs.existsSync(cache),'Messcache existiert schon – kalter Lauf wäre nicht frisch.');
 else muss(fs.existsSync(cache)&&fs.statSync(cache).size>0,'Messcache fehlt – erst galerie-kalt.');
 muss(path.dirname(cache)!==path.dirname(quelle),'Messcache muss getrennt von der Quelle liegen.');
 const beleg={schema:'gravuru-kopientest-galerie/v1',art,rev:REV,start:new Date().toISOString(),quelle:path.relative(BASE,quelle),quelleBytes:fs.statSync(quelle).size,grenzen:{prozessMiB:LIMIT_MIB,kontoMiB:KONTO_LIMIT_MIB,zeitMs:ZEIT_MS}};
 {const t=Date.now();beleg.quelleSha256Vorher=dateiSha(quelle);beleg.hashVorherMs=Date.now()-t;}
 const lauf=await kindMitWaechter([path.join(RT,'scripts/shop-gallery-benchmark.mjs'),'--local-copy','--restart-child','--db',quelle,'--tenant',TENANT,'--store',STORE,'--shop',SHOP,'--source-label','reviewed-gallery-fix-'+(art==='kalt'?'cold':'reopen'),'--cache-db',cache],RT);
 let ergebnis=null;try{ergebnis=JSON.parse(lauf.out.trim().split('\n').at(-1));}catch{}
 Object.assign(beleg,{exit:lauf.exit,signal:lauf.signal,abbruchDurchWaechter:lauf.abbruchDurchWaechter,laufMs:lauf.ms,prozessSpitzeMiB:lauf.prozessSpitzeMiB,kontoVorherMiB:lauf.kontoVorherMiB,kontoProzesseVorher:lauf.kontoProzesseVorher,kontoSpitzeMiB:lauf.kontoSpitzeMiB,verlaufSekRssKonto:lauf.verlauf,stderrZeilen:lauf.err.split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return {roh:l.slice(0,300)};}}),ergebnis});
 {const t=Date.now();beleg.quelleSha256Nachher=dateiSha(quelle);beleg.hashNachherMs=Date.now()-t;beleg.quelleUnveraendert=beleg.quelleSha256Vorher===beleg.quelleSha256Nachher;}
 beleg.cache=cacheInfo(cache);
 beleg.cacheBytes=fs.existsSync(cache)?fs.statSync(cache).size:0;beleg.ende=new Date().toISOString();
 const datei=ablegen('galerie-'+art+'-'+stempel()+'.json',JSON.stringify(beleg,null,1));
 const ereignisse=beleg.stderrZeilen.map(z=>z.event||'roh');
 log({schritt:'galerie_'+art,datei:path.basename(datei),...beleg,verlaufSekRssKonto:beleg.verlaufSekRssKonto.filter((_,i,a)=>i%Math.ceil(a.length/12||1)===0),ereignisse});
 if(lauf.exit!==0||!ergebnis)process.exitCode=1;
}

function status(){
 const rtBeleg=RT+'.einrichtung.json';
 log({schritt:'status',rtVorhanden:fs.existsSync(RT),rtBeleg:fs.existsSync(rtBeleg)?(({rev,baumSha256,dateien})=>({rev,baumSha256,dateien}))(JSON.parse(fs.readFileSync(rtBeleg,'utf8'))):null,
  quelle:fs.existsSync(WORKSHOP)?{bytes:fs.statSync(WORKSHOP).size,wal:fs.existsSync(WORKSHOP+'-wal')?fs.statSync(WORKSHOP+'-wal').size:null}:null,
  messordner:fs.existsSync(MESS)?fs.readdirSync(MESS).map(n=>[n,fs.statSync(path.join(MESS,n)).size]):null,konto:konto(),node:process.version});
}
try{
 const befehl=process.argv[2];
 if(befehl==='galerie-kalt')await galerie('kalt');else if(befehl==='galerie-reopen')await galerie('reopen');
 else if(befehl==='status')status();
 else throw new Error('Befehl: galerie-kalt | galerie-reopen | status');
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
