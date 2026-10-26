// K12 / B1: Import-Lauf Katalog → Werkstatt je Linie.
// Aufruf: node scripts/katalog-import.mjs --katalog <pfad> --linie <id> [--bestand <ordner>] [--db <sqlite>] [--json <bericht.json>] [--metrics <messung.json>] [--alle-designs] [--dry-run | --commit [--migrieren]]
// Ohne `--alle-designs` kommen nur im Design-Dashboard freigegebene Designs (design.json ziele[].freigabe.status = freigegeben für die jeweilige Familie) ins Produkt.
// Ohne `--commit` wird nichts geschrieben (Dry-run gegen eine Datenbank im Speicher);
// mit `--commit` schreibt das Skript Familie und Produkte in die Werkstatt-DB
// (Standard `.local-data/workshop.sqlite` neben `app/`, wie der Server).
// Der Katalog wird nur gelesen. Freigabe „importieren“ bleibt beim Nutzer.
import fs from 'node:fs';
import {checkImportTarget} from '../app/workshop/katalog-import-target.mjs';
import path from 'node:path';
import {getHeapStatistics} from 'node:v8';
import {build,OUTPUT,ROOT} from '../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {openKatalog,katalogPath} from '../app/workshop/katalog-source.mjs';
import {planKatalogImport,applyKatalogImport,formatReport,createKatalogReportWriter} from '../app/workshop/katalog-import.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {workshopResources} from '../app/workshop/catalog.mjs';

const arg=name=>{const i=process.argv.indexOf('--'+name);return i>0&&!String(process.argv[i+1]??'').startsWith('--')?process.argv[i+1]:undefined;};
const flag=name=>process.argv.includes('--'+name);
const katalogDir=arg('katalog')||katalogPath(),lineId=arg('linie'),bestand=arg('bestand')||null,commit=flag('commit');
const list=name=>arg(name)?arg(name).split(',').map(v=>v.trim()).filter(Boolean):null;
const only=(list('unterkategorie')||list('groesse')||list('hauptprodukt'))?{subcategories:list('unterkategorie'),sizes:list('groesse'),mainProducts:list('hauptprodukt')}:null;
if(!katalogDir||!lineId){console.error('Aufruf: node scripts/katalog-import.mjs --katalog <pfad> --linie <id> [--bestand <ordner>] [--db <sqlite>] [--unterkategorie a,b] [--groesse k1,k2] [--hauptprodukt id] [--json <datei>] [--alle-designs] [--commit [--migrieren]]');process.exit(2);}
if(commit&&flag('alle-designs')){console.error('--alle-designs ist nur für Dry-runs erlaubt; --commit benötigt freigegebene Familienziele.');process.exit(2);}
const dbFile=commit?(arg('db')||path.join(ROOT,'../.local-data/workshop.sqlite')):':memory:';

// Vollständige Dokumente benötigt nur --commit. Der Dry-run validiert ein Produkt
// nach dem anderen; der JSON-Bericht wird währenddessen fortlaufend geschrieben.
const jsonFile=arg('json'),metricsFile=arg('metrics'),partial=jsonFile?jsonFile+'.partial-'+process.pid:null;
const started=process.hrtime.bigint(),peak={rss:0,heapTotal:0,heapUsed:0,external:0,arrayBuffers:0};
let samples=0,completed=false,workshop=null,output=null;
const sample=()=>{const memory=process.memoryUsage();samples++;for(const key of Object.keys(peak))peak[key]=Math.max(peak[key],memory[key]??0);};
sample();
const timer=metricsFile?setInterval(sample,25).unref():null;
try{
 if(commit)checkImportTarget(dbFile,{migrate:flag('migrieren')});
 const katalog=openKatalog(katalogDir);
 build();
 const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json'),'utf8'))[0];
 workshop=createWorkshop({filename:dbFile,seedConfig:seed.universal,legacy:seed.legacy,themes:katalog.themes});
 if(partial)output=await fs.promises.open(partial,'wx');
 const reporter=output?createKatalogReportWriter(chunk=>output.writeFile(chunk,'utf8')):null;
 const available={...workshopResources().fonts,...workshop.fonts.resources()};
 const plan=await planKatalogImport(katalog,lineId,{repository:workshop.repository,families:workshop.families,bestand,available,converter:convertFont,fontLibrary:workshop.fonts,profiles:workshop.profiles,assets:workshop.assets,only,allDesigns:flag('alle-designs'),retainItems:commit,reporter,onProgress:metricsFile?sample:null});
 if(output){await output.close();output=null;await fs.promises.rename(partial,jsonFile);}
 console.log(formatReport(plan.report));
 if(!commit){console.log('\nDry-run: nichts geschrieben. Mit --commit werden '+plan.report.counts.new+' Produkte angelegt und '+plan.report.counts.update+' aktualisiert ('+dbFile+').');}
 else{
  console.log('Import-Plan für Mandant '+workshop.tenantId+': '+plan.report.counts.new+' neue, '+plan.report.counts.update+' aktualisierte, '+plan.report.counts.unchanged+' unveränderte und '+plan.report.counts.blocked+' gesperrte Produkte.');
  const result=applyKatalogImport(plan,{repository:workshop.repository,families:workshop.families});
  console.log('\nGeschrieben nach '+dbFile+': Familien '+result.families.map(f=>f.id+' '+f.action+' r'+f.revision).join(', ')+'; Produkte neu '+result.products.filter(p=>p.action==='neu').length+', aktualisiert '+result.products.filter(p=>p.action==='aktualisiert').length+', unverändert '+result.products.filter(p=>p.action==='unverändert').length+'.');
 }
 completed=true;
}finally{
 if(timer)clearInterval(timer);
 await output?.close();workshop?.close();sample();
 if(metricsFile){
  const metrics={completed,mode:commit?'commit':'dry-run',elapsedSeconds:Number(process.hrtime.bigint()-started)/1e9,heapLimitBytes:getHeapStatistics().heap_size_limit,peakProcessMemoryUsage:peak,samples,sampling:'25 ms plus document/fingerprint/product boundaries',maxRssBytes:process.resourceUsage().maxRSS*1024,node:process.version};
  fs.writeFileSync(metricsFile,JSON.stringify(metrics,null,2)+'\n');
  console.log('\nLaufzeit '+metrics.elapsedSeconds.toFixed(3)+' s; beobachteter Heap '+(peak.heapUsed/1024**2).toFixed(1)+' MiB, RSS '+(peak.rss/1024**2).toFixed(1)+' MiB.');
 }
}
