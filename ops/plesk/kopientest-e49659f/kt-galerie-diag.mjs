// Diagnose-Lauf zur Galerie-Kaltmessung (e49659f) auf der Datenbank-ARBEITSKOPIE: derselbe Messablauf wie Astras
// scripts/shop-gallery-benchmark.mjs, aber die Messereignisse werden sofort ausgegeben (ein abgebrochener Lauf hinterlässt
// sonst nichts). Astras Datei bleibt unverändert; die abgeleitete Kopie liegt nur im privaten Messordner.
// Ein Prozess, Wächter wie zuvor. Kein Netz, keine Live-Datenbank, eigener Wegwerf-Cache.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname;
const BASE=process.env.KT_BASE||path.resolve(hier,'../sicherungen-db');
const RT=process.env.KT_RT||path.resolve(hier,'../kandidat-e49659f-20261111');
const WORKSHOP=process.env.KT_WORKSHOP||path.join(BASE,'arbeitskopie-20261111T195242Z','workshop.copy.sqlite');
const MESS=process.env.KT_MESS||path.join(BASE,'kopientest-e49659f-20261111');
const STORE=process.env.KT_STORE||'acryl',SHOP=process.env.KT_SHOP||'gravuru-design.myshopify.com',TENANT='gravuru';
const LIMIT_MIB=+(process.env.KT_LIMIT_MIB||1800),KONTO_LIMIT_MIB=+(process.env.KT_KONTO_LIMIT_MIB||3300),ZEIT_MS=+(process.env.KT_ZEIT_MS||10*60*1000);
const PIN='f74c425e58bcfbd4d9e881873e5ea623b1cd3605f574e05ae069edf3b1df9336';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const KIND_ENV=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^(GRAVURU|SHOPIFY|RT_|ZV_|KT_)/i.test(k)&&!/SECRET|TOKEN|PASSWORD/i.test(k)));
const einmal=(text,alt,neu,anzahl=1)=>{const n=text.split(alt).length-1;if(n!==anzahl)throw new Error('Ableitung passt nicht ('+n+'×): '+alt.slice(0,40));return text.split(alt).join(neu);};
function rssVon(pid){try{const t=fs.readFileSync('/proc/'+pid+'/status','utf8');const r=/VmRSS:\s+(\d+) kB/.exec(t);return r?+r[1]/1024:0;}catch{return null;}}
function konto(){let s=0;try{for(const d of fs.readdirSync('/proc'))if(/^\d+$/.test(d))s+=rssVon(d)||0;}catch{}return +s.toFixed(1);}
try{
 const real=fs.realpathSync(WORKSHOP);
 if(!/\.copy\.sqlite$/.test(real)||/[\\/]private[\\/](?:acryl-employee-20261021-v1|mika-r15-resume-20261108-v1)[\\/]/.test(real)||/[\\/]sicherungen-db[\\/]\d{8}T\d{6}Z[\\/]/.test(real))throw new Error('Nur die Arbeitskopie.');
 const quelle=fs.readFileSync(path.join(RT,'scripts/shop-gallery-benchmark.mjs'),'utf8');if(sha(quelle)!==PIN)throw new Error('Messwerkzeug weicht ab.');
 const zeile="process.stderr.write(JSON.stringify(";
 let text=einmal(quelle,"from '../app/workshop/","from '"+pathToFileURL(path.join(RT,'app/workshop')).href+"/",4);
 text=einmal(text,"onMeasure:entry=>measurements.push(entry)","onMeasure:entry=>{measurements.push(entry);"+zeile+"{t:Math.round(performance.now()),rss:Math.round(process.memoryUsage().rss/1048576),...entry})+'\\n');}");
 text=einmal(text,"cardFor:(_store,b)=>{cardReads++;","cardFor:(_store,b)=>{cardReads++;if(cardReads%20===1)"+zeile+"{t:Math.round(performance.now()),rss:Math.round(process.memoryUsage().rss/1048576),karten:cardReads})+'\\n');");
 text="setInterval(()=>{const m=process.memoryUsage(),f=x=>Math.round(x/1048576);"+zeile+"{t:Math.round(performance.now()),mem:[f(m.rss),f(m.heapUsed),f(m.external),f(m.arrayBuffers)]})+'\\n');},2000).unref();\n"+text;
 const dir=path.join(MESS,'diag');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const stempel=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
 const skript=path.join(dir,'shop-gallery-benchmark.diag.mjs');fs.writeFileSync(skript,text,{mode:0o600});
 const cache=path.join(dir,'gallery-v3-diag-only-'+stempel+'.sqlite');
 const kontoVorher=konto(),start=Date.now();
 const kind=spawn(process.execPath,[skript,'--local-copy','--restart-child','--db',real,'--tenant',TENANT,'--store',STORE,'--shop',SHOP,'--source-label','reviewed-gallery-fix-diag','--cache-db',cache],{cwd:RT,stdio:['ignore','pipe','pipe'],env:KIND_ENV});
 let out='',err='',spitze=0,kontoSpitze=kontoVorher,grund=null,letzter=0;
 kind.stdout.on('data',d=>{out+=d;});kind.stderr.on('data',d=>{err+=d;if(err.length>400000)err=err.slice(-300000);});
 const takt=setInterval(()=>{const r=rssVon(kind.pid);if(r===null)return;spitze=Math.max(spitze,r);const jetzt=Date.now();
  if(jetzt-letzter>=5000){letzter=jetzt;const k=konto();kontoSpitze=Math.max(kontoSpitze,k);if(k>KONTO_LIMIT_MIB&&!grund){grund='konto_ueber_'+KONTO_LIMIT_MIB+'_MiB';kind.kill('SIGKILL');}}
  if(r>LIMIT_MIB&&!grund){grund='prozess_ueber_'+LIMIT_MIB+'_MiB';kind.kill('SIGKILL');}
  if(jetzt-start>ZEIT_MS&&!grund){grund='zeit_ueber_'+ZEIT_MS+'_ms';kind.kill('SIGKILL');}},100);
 const ende=await new Promise(res=>kind.on('close',(code,signal)=>res({code,signal})));clearInterval(takt);
 const zeilen=err.split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return {roh:l.slice(0,200)};}});
 const ereignisse=zeilen.filter(z=>z.event),speicher=zeilen.filter(z=>z.mem),karten=zeilen.filter(z=>z.karten),sonst=zeilen.filter(z=>z.roh||z.error);
 let ergebnis=null;try{ergebnis=JSON.parse(out.trim().split('\n').at(-1));}catch{}
 const beleg={schema:'gravuru-kopientest-galerie-diag/v1',start:new Date(start).toISOString(),exit:ende.code,signal:ende.signal,abbruchDurchWaechter:grund,laufMs:Date.now()-start,prozessSpitzeMiB:+spitze.toFixed(1),kontoVorherMiB:kontoVorher,kontoSpitzeMiB:kontoSpitze,ereignisse,speicher,karten,sonst,ergebnis,cacheBytes:fs.existsSync(cache)?fs.statSync(cache).size:0};
 fs.writeFileSync(path.join(dir,'galerie-diag-'+stempel+'.json'),JSON.stringify(beleg),{flag:'wx',mode:0o600});
 const duenn=(a,n)=>a.filter((_,i)=>i%Math.ceil(a.length/n||1)===0||i===a.length-1);
 console.log(JSON.stringify({event:'kt_galerie_diag',...beleg,speicher:duenn(speicher,16).map(z=>[Math.round(z.t/1000),...z.mem]),karten:duenn(karten,8).map(z=>[Math.round(z.t/1000),z.karten,z.rss]),ergebnis:ergebnis?{cold:ergebnis.cold,warm:ergebnis.warm,peakRssMiB:ergebnis.peakRssMiB,lightweightProductReads:ergebnis.lightweightProductReads}:null}));
 if(ende.code!==0)process.exitCode=1;
}catch(error){console.log(JSON.stringify({event:'kt_galerie_diag',fehler:String(error.message||error)}));process.exitCode=1;}
