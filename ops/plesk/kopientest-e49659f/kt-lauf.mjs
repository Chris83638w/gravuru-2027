// Kopientests für den Reparaturstand e49659f (Astra, #168): Galerie kalt/reopen, Hauptkategorien, Kleinprodukt-Identitäten.
// Liest ausschließlich die vorhandene Datenbank-ARBEITSKOPIE (nie Live, nie die unveränderte Sicherung),
// schreibt nur in einen eigenen privaten Messordner. Kein Netz, kein App-Start, keine Änderung an der laufenden App.
//   node kt-lauf.mjs galerie-kalt | galerie-reopen | kategorien | klein | status
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';

const hier=import.meta.dirname;
const BASE=process.env.KT_BASE||path.resolve(hier,'../sicherungen-db');
const RT=process.env.KT_RT||path.resolve(hier,'../kandidat-e49659f-20261111');
const WORKSHOP=process.env.KT_WORKSHOP||path.join(BASE,'arbeitskopie-20261111T195242Z','workshop.copy.sqlite');
const ZV=process.env.KT_ZV||path.join(BASE,'zielvergleich-20261111T205705Z');
const MESS=process.env.KT_MESS||path.join(BASE,'kopientest-e49659f-20261111');
const STORE=process.env.KT_STORE||'acryl',SHOP=process.env.KT_SHOP||'gravuru-design.myshopify.com',TENANT='gravuru';
const LIMIT_MIB=+(process.env.KT_LIMIT_MIB||1800),KONTO_LIMIT_MIB=+(process.env.KT_KONTO_LIMIT_MIB||3300),ZEIT_MS=+(process.env.KT_ZEIT_MS||15*60*1000);
const REV='e49659fe9cd6e433e578a5ffd054e0345cbcc440';
const PINS_RT={
 'app/workshop/shop-product-binding-store.mjs':'424dc43e4eed2f864cf7d78fd043827760d8c78ef731b5186b8de8fec2a30032',
 'app/workshop/shop-design-gallery.mjs':'82b2c59c97a1bea3b54ed356570e59e9a6fa134c92fff0fe3e6332696d420858',
 'scripts/shop-gallery-benchmark.mjs':'f74c425e58bcfbd4d9e881873e5ea623b1cd3605f574e05ae069edf3b1df9336',
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
 return {exit:ende.code,signal:ende.signal,abbruchDurchWaechter:grund,ms:Date.now()-start,prozessSpitzeMiB:+Math.max(spitze,hwm).toFixed(1),kontoVorherMiB:vorher.mib,kontoProzesseVorher:vorher.prozesse,kontoSpitzeMiB:+kontoSpitze.toFixed(1),verlauf,out,err:err.slice(0,800)};
}

async function galerie(art){
 pinsPruefen(RT,PINS_RT,['app/workshop/shop-product-binding-store.mjs','app/workshop/shop-design-gallery.mjs','scripts/shop-gallery-benchmark.mjs']);
 const quelle=kopieSchuetzen(WORKSHOP);messordner();
 const cache=path.join(MESS,'gallery-v3-measure-only.sqlite');
 if(art==='kalt')muss(!fs.existsSync(cache),'Messcache existiert schon – kalter Lauf wäre nicht frisch.');
 else muss(fs.existsSync(cache)&&fs.statSync(cache).size>0,'Messcache fehlt – erst galerie-kalt.');
 muss(path.dirname(cache)!==path.dirname(quelle),'Messcache muss getrennt von der Quelle liegen.');
 const beleg={schema:'gravuru-kopientest-galerie/v1',art,rev:REV,start:new Date().toISOString(),quelle:path.relative(BASE,quelle),quelleBytes:fs.statSync(quelle).size,grenzen:{prozessMiB:LIMIT_MIB,kontoMiB:KONTO_LIMIT_MIB,zeitMs:ZEIT_MS}};
 if(art==='kalt'){const t=Date.now();beleg.quelleSha256Vorher=dateiSha(quelle);beleg.hashVorherMs=Date.now()-t;}
 const lauf=await kindMitWaechter([path.join(RT,'scripts/shop-gallery-benchmark.mjs'),'--local-copy','--restart-child','--db',quelle,'--tenant',TENANT,'--store',STORE,'--shop',SHOP,'--source-label','reviewed-gallery-fix-'+(art==='kalt'?'cold':'reopen'),'--cache-db',cache],RT);
 let ergebnis=null;try{ergebnis=JSON.parse(lauf.out.trim().split('\n').at(-1));}catch{}
 Object.assign(beleg,{exit:lauf.exit,signal:lauf.signal,abbruchDurchWaechter:lauf.abbruchDurchWaechter,laufMs:lauf.ms,prozessSpitzeMiB:lauf.prozessSpitzeMiB,kontoVorherMiB:lauf.kontoVorherMiB,kontoProzesseVorher:lauf.kontoProzesseVorher,kontoSpitzeMiB:lauf.kontoSpitzeMiB,verlaufSekRssKonto:lauf.verlauf,stderr:lauf.err,ergebnis});
 if(art==='reopen'){const t=Date.now();beleg.quelleSha256Nachher=dateiSha(quelle);beleg.hashNachherMs=Date.now()-t;
  const kalt=fs.readdirSync(MESS).filter(n=>/^galerie-kalt-.*\.json$/.test(n)).sort().at(-1);
  if(kalt){const v=JSON.parse(fs.readFileSync(path.join(MESS,kalt),'utf8')).quelleSha256Vorher;beleg.quelleSha256VorKalt=v;beleg.quelleUnveraendert=v===beleg.quelleSha256Nachher;}}
 beleg.cacheBytes=fs.existsSync(cache)?fs.statSync(cache).size:0;beleg.ende=new Date().toISOString();
 const datei=ablegen('galerie-'+art+'-'+stempel()+'.json',JSON.stringify(beleg,null,1));
 const ereignisse=(ergebnis?.measurements||[]).map(m=>m.event);
 log({schritt:'galerie_'+art,datei:path.basename(datei),...beleg,verlaufSekRssKonto:beleg.verlaufSekRssKonto.filter((_,i,a)=>i%Math.ceil(a.length/12||1)===0),ereignisse});
 if(lauf.exit!==0||!ergebnis)process.exitCode=1;
}

const kurz=(v,tiefe=0,max=4)=>{
 if(Array.isArray(v))return v.length<=12&&v.every(x=>x===null||['string','number','boolean'].includes(typeof x))?v:(v.length<=6&&tiefe<max?v.map(x=>kurz(x,tiefe+1,max)):{anzahl:v.length});
 if(v&&typeof v==='object'){if(tiefe>=max)return {felder:Object.keys(v).length};return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,kurz(x,tiefe+1,max)]));}
 return typeof v==='string'&&v.length>100?v.slice(0,100)+'…':v;
};
function werkzeug(args,ausgabeName){
 const t=Date.now(),r=spawnSync(process.execPath,args,{cwd:RT,encoding:'utf8',maxBuffer:768*1024*1024,env:KIND_ENV});
 const datei=ablegen(ausgabeName+'-'+stempel()+'.json',r.stdout||'');let ergebnis=null;try{ergebnis=JSON.parse(r.stdout);}catch{}
 return {exit:r.status,ms:Date.now()-t,stderr:String(r.stderr||'').slice(0,900),datei:path.basename(datei),bytes:(r.stdout||'').length,ergebnis};
}
function kategorien(){
 pinsPruefen(RT,PINS_RT,['app/workshop/profile-library.mjs','ops/issue230-main-target-compare-20261111/compare-main-target-copy.mjs','ops/issue230-main-target-compare-20261111/resolve-main-category-profiles-readonly.mjs','ops/issue230-main-target-compare-20261111/copy-guard.mjs']);
 pinsPruefen(hier,PINS_HIER,['kt-materialize-metadata-preview.mjs','kt-metadata-changes.json','kt-update-intent.preview.json']);
 const quelle=kopieSchuetzen(WORKSHOP),profile=kopieSchuetzen(path.join(ZV,'profiles.copy.sqlite'));messordner();
 const alt=path.join(ZV,'main-target.preview.json'),mapping=path.join(ZV,'variant-mapping.preview.json.gz'),neu=path.join(MESS,'main-target-preserved-metadata.preview.json');
 muss(sha(fs.readFileSync(alt))===ZIEL_ALT,'Bisheriges Zielmodell weicht ab.');muss(sha(fs.readFileSync(mapping))===MAPPING_GZ,'Variantenzuordnung weicht ab.');
 if(!fs.existsSync(neu)){
  const m=spawnSync(process.execPath,[path.join(hier,'kt-materialize-metadata-preview.mjs'),alt,path.join(hier,'kt-metadata-changes.json'),neu],{encoding:'utf8',maxBuffer:8*1024*1024});
  muss(m.status===0,'Materialisierung fehlgeschlagen: '+String(m.stderr||'').slice(0,500));fs.chmodSync(neu,0o600);
 }
 muss(sha(fs.readFileSync(neu))===ZIEL_NEU,'Neues Zielmodell weicht ab.');
 log({schritt:'kategorien_vorbereitet',zielNeuSha256:ZIEL_NEU,zielNeuBytes:fs.statSync(neu).size});
 const r=werkzeug([path.join(RT,'ops/issue230-main-target-compare-20261111/compare-main-target-copy.mjs'),'--copy',quelle,'--profiles-copy',profile,'--mapping',mapping,'--target',neu,'--intent',path.join(hier,'kt-update-intent.preview.json'),'--resolver-source',path.join(RT,'app/workshop/profile-library.mjs'),'--tenant',TENANT],'main-target-category-comparison');
 const e=r.ergebnis,ce=e?.resourceProfiles?.categoryEvidence;
 log({schritt:'kategorien',exit:r.exit,ms:r.ms,stderr:r.stderr,datei:r.datei,bytes:r.bytes,felder:e?Object.keys(e):null,
  categoryEvidence:ce?kurz(ce,0,6):null,copyEvidence:e?kurz(e.copyEvidence,0,4):null,issues:e?kurz(e.issues,0,3):null,pending:e?kurz(e.pending,0,3):null,readyForImport:e?.readyForImport??null,
  actualStoredProfiles:e?.target?.actualStoredProfiles?kurz(e.target.actualStoredProfiles,0,4):null});
 if(r.exit!==0)process.exitCode=1;
}
function klein(){
 pinsPruefen(RT,PINS_RT,['ops/issue230-small-targets-copy-review-20261111/inspect-small-targets-copy.mjs','ops/issue230-small-targets-copy-review-20261111/copy-guard.mjs','ops/issue230-small-targets-copy-review-20261111/v9-source-aliases.json']);
 pinsPruefen(hier,PINS_HIER,['kt-six-groups.json']);
 const quelle=kopieSchuetzen(WORKSHOP);messordner();
 const r=werkzeug([path.join(RT,'ops/issue230-small-targets-copy-review-20261111/inspect-small-targets-copy.mjs'),'--copy',quelle,'--groups',path.join(hier,'kt-six-groups.json'),'--native-aliases',path.join(RT,'ops/issue230-small-targets-copy-review-20261111/v9-source-aliases.json'),'--tenant',TENANT,'--store-id',STORE],'small-target-identities-'+STORE);
 const e=r.ergebnis;
 log({schritt:'klein',exit:r.exit,ms:r.ms,stderr:r.stderr,datei:r.datei,bytes:r.bytes,felder:e?Object.keys(e):null,
  copyEvidence:e?kurz(e.copyEvidence,0,4):null,scope:e?kurz(e.scope,0,3):null,perGroup:e?kurz(e.perGroup,0,5):null,
  zahlen:e?Object.fromEntries(['activeBindings','bindingRevisionHistory','historicalFixedBindings','nativeAliasCandidates','nativeSourceIdCandidates','nativeCfgRevisions'].map(k=>[k,Array.isArray(e[k])?e[k].length:e[k]&&typeof e[k]==='object'?Object.keys(e[k]).length:e[k]??null])):null,
  missingBindingTables:e?.missingBindingTables??null,issues:e?kurz(e.issues,0,3):null,readyForImport:e?.readyForImport??null});
 if(r.exit!==0)process.exitCode=1;
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
 else if(befehl==='kategorien')kategorien();else if(befehl==='klein')klein();else if(befehl==='status')status();
 else throw new Error('Befehl: galerie-kalt | galerie-reopen | kategorien | klein | status');
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
