// K12 / B1: Import-Lauf Katalog → Werkstatt je Linie.
// Aufruf: node scripts/katalog-import.mjs --katalog <pfad> --linie <id> [--bestand <ordner>] [--db <sqlite>] [--json <bericht.json>] [--dry-run | --commit]
// Ohne `--commit` wird nichts geschrieben (Dry-run gegen eine Datenbank im Speicher);
// mit `--commit` schreibt das Skript Familie und Produkte in die Werkstatt-DB
// (Standard `.local-data/workshop.sqlite` neben `app/`, wie der Server).
// Der Katalog wird nur gelesen. Freigabe „importieren“ bleibt beim Nutzer.
import fs from 'node:fs';
import path from 'node:path';
import {build,OUTPUT,ROOT} from '../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {openKatalog,katalogPath} from '../app/workshop/katalog-source.mjs';
import {planKatalogImport,applyKatalogImport,formatReport} from '../app/workshop/katalog-import.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {workshopResources} from '../app/workshop/catalog.mjs';

const arg=name=>{const i=process.argv.indexOf('--'+name);return i>0&&!String(process.argv[i+1]??'').startsWith('--')?process.argv[i+1]:undefined;};
const flag=name=>process.argv.includes('--'+name);
const katalogDir=arg('katalog')||katalogPath(),lineId=arg('linie'),bestand=arg('bestand')||null,commit=flag('commit');
const list=name=>arg(name)?arg(name).split(',').map(v=>v.trim()).filter(Boolean):null;
const only=(list('unterkategorie')||list('groesse')||list('hauptprodukt'))?{subcategories:list('unterkategorie'),sizes:list('groesse'),mainProducts:list('hauptprodukt')}:null;
if(!katalogDir||!lineId){console.error('Aufruf: node scripts/katalog-import.mjs --katalog <pfad> --linie <id> [--bestand <ordner>] [--db <sqlite>] [--unterkategorie a,b] [--groesse k1,k2] [--hauptprodukt id] [--json <datei>] [--commit]');process.exit(2);}
const dbFile=commit?(arg('db')||path.join(ROOT,'../.local-data/workshop.sqlite')):':memory:';

const katalog=openKatalog(katalogDir);
build();
const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json'),'utf8'))[0];
const workshop=createWorkshop({filename:dbFile,seedConfig:seed.universal,legacy:seed.legacy,themes:katalog.themes});
try{
 const available={...workshopResources().fonts,...workshop.fonts.resources()};
 const plan=await planKatalogImport(katalog,lineId,{repository:workshop.repository,families:workshop.families,bestand,available,converter:convertFont,fontLibrary:workshop.fonts,profiles:workshop.profiles,assets:workshop.assets,only});
 console.log(formatReport(plan.report));
 const jsonFile=arg('json');if(jsonFile)fs.writeFileSync(jsonFile,JSON.stringify(plan.report,null,1)+'\n');
 if(!commit){console.log('\nDry-run: nichts geschrieben. Mit --commit werden '+plan.report.counts.new+' Produkte angelegt und '+plan.report.counts.update+' aktualisiert ('+dbFile+').');}
 else{
  const result=applyKatalogImport(plan,{repository:workshop.repository,families:workshop.families});
  console.log('\nGeschrieben nach '+dbFile+': Familien '+result.families.map(f=>f.id+' '+f.action+' r'+f.revision).join(', ')+'; Produkte neu '+result.products.filter(p=>p.action==='neu').length+', aktualisiert '+result.products.filter(p=>p.action==='aktualisiert').length+', unverändert '+result.products.filter(p=>p.action==='unverändert').length+'.');
 }
}finally{workshop.close();}
