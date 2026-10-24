// Paket E: Offline-Vorprüfung oder Abgleich mit einem bereits vorhandenen lokalen Shop-Export.
// Keine Zugangsdaten, kein Client, keine Freigabeumgehung. Die Fachlogik bleibt in shop-sync.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {targetsForLine,planShopSync,ACTIONS,SHOP_DOMAIN} from './shop-sync.mjs';
import {EXPORT_SCHEMA} from './shop-export.mjs';

export const REPORT_SCHEMA='gravuru-shop-sync-dry-run/v1';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error(message);};
const HELP=[
 'Offline-Vorbereitung für Paket E (Node >= 22):',
 'node scripts/shop-sync-dry-run.mjs --katalog <ordner> --linie <id> --out <neuer-berichtordner> [--export <lokale-products.json>]',
 'Ohne --export: nur Katalog-Vorprüfung, keine Shop-Aktionszähler.',
 'Mit --export: bestehender shop-sync-Planer, ohne Netzwerk oder Schreibzugriff auf den Shop.',
 'Freigaben bleiben erforderlich; --apply, --create, --alle-designs und --daten-aktualisieren sind nicht erlaubt.',
 'Ergebnis: bericht.json, bericht.md; mit Export zusätzlich plan.json. Exit 0 bedeutet Bericht erstellt, nicht Uploadfreigabe.',''
].join('\n');

export function parseArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const allowed=new Map([['--katalog','katalogRoot'],['--linie','lineId'],['--export','exportFile'],['--out','out']]),args={};
 for(let i=0;i<argv.length;i++){
  const key=allowed.get(argv[i]);
  if(!key)fail('Unbekannte oder nicht erlaubte Option: '+argv[i]);
  if(Object.hasOwn(args,key))fail('Option doppelt: '+argv[i]);
  const value=argv[++i];
  if(!value||value.startsWith('--'))fail('Wert fehlt für '+argv[i-1]);
  args[key]=value;
 }
 if(!args.katalogRoot||!args.lineId||!args.out)fail(HELP);
 return args;
}

// Metadaten sowie ausgewählte Startdesign-Dateien; keine Schrift-/Motivdateien.
function sourceManifest(katalog,targets){
 const files=new Set(katalog.files.values());
 for(const rel of ['themen.json','schriften/schriften.json','schriften/sets.json','motive/motive.json']){
  const file=path.join(katalog.root,rel);if(fs.existsSync(file))files.add(file);
 }
 const ids=new Set(targets.map(t=>t.startDesign));
 for(const master of katalog.designs.masters.filter(d=>ids.has(d.id))){
  files.add(master.svgFile);if(master.jsonFile)files.add(master.jsonFile);
 }
 return [...files].map(file=>({path:path.relative(katalog.root,file).split(path.sep).join('/'),sha256:digest(fs.readFileSync(file))})).sort((a,b)=>a.path.localeCompare(b.path,'en'));
}

export function prepareDryRun({katalogRoot,lineId,exportFile=null,generatedAt=new Date().toISOString()}){
 const katalog=openKatalog(katalogRoot),soll=targetsForLine(katalog,lineId);
 const line=katalog.lines.get(lineId),mains=line.subcategories.flatMap(sub=>(sub.mainProducts??[]).map(main=>({subcategory:sub.id,...main})));
 const sources=sourceManifest(katalog,soll.targets);
 const catalog={line:soll.line,counts:{mainProducts:mains.length,withShopifyProductId:mains.filter(m=>m.externalIds?.shopifyProductId).length,
  withoutShopifyProductId:mains.filter(m=>!m.externalIds?.shopifyProductId).length,targets:soll.targets.length,
  targetVariants:soll.targets.reduce((n,t)=>n+t.variants.length,0),releasedTargets:soll.targets.filter(t=>t.designReleased).length,
  blockedTargets:soll.targets.filter(t=>t.open.length).length,withoutPlannerBlockers:soll.targets.filter(t=>!t.open.length).length},
  sources,sourcesSha256:digest(JSON.stringify(sources)),targets:soll.targets,notes:soll.notes};
 let plan=null,exportInfo=null;
 if(exportFile){
  const raw=fs.readFileSync(exportFile),doc=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
  // Kein leerer Ersatzexport und keine stillschweigende Shop-Annahme.
  if(Array.isArray(doc)||doc?.shopDomain!==SHOP_DOMAIN)fail('Export braucht shopDomain '+SHOP_DOMAIN+' (products.json aus shop-export.mjs).');
  if(doc.schema!==EXPORT_SCHEMA||typeof doc.complete!=='boolean'||!Array.isArray(doc.products)||!Number.isFinite(Date.parse(doc.exportedAt)))fail('Exportformat unvollständig: schema, complete, exportedAt und products[] prüfen.');
  const seen=new Set();
  for(const product of doc.products){
   if(!product?.id||seen.has(product.id))fail('Export enthält eine fehlende oder doppelte Produkt-ID.');
   seen.add(product.id);
   if(!Array.isArray(product.options)||!product.options.length||product.options.some(o=>typeof o?.name!=='string'||!Array.isArray(o.values))||!Array.isArray(product.variants?.nodes)||!product.variants.nodes.length||product.variants.pageInfo?.hasNextPage===true)fail('Exportprodukt '+product.id+': vollständige Optionen und Varianten erforderlich.');
   const variantIds=new Set();
   for(const v of product.variants.nodes){
    if(!v?.id||variantIds.has(v.id)||!Array.isArray(v.selectedOptions))fail('Exportprodukt '+product.id+': Varianten-ID oder selectedOptions ungültig.');
    if(!Object.hasOwn(v,'sku')||(v.sku!==null&&typeof v.sku!=='string'))fail('Exportprodukt '+product.id+': SKU-Feld fehlt oder ist ungültig.');
    variantIds.add(v.id);
   }
  }
  plan=planShopSync(soll,doc,{generatedAt});
  exportInfo={file:path.basename(exportFile),sha256:digest(raw),...plan.export,shopDomain:doc.shopDomain};
 }
 return {schema:REPORT_SCHEMA,mode:plan?'export-plan':'catalog-only',generatedAt,catalog,export:exportInfo,plan};
}

const cell=value=>String(value??'offen').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
export function formatReport(report){
 const {catalog,plan}=report,c=catalog.counts;
 const lines=['# Shop-sync Offline-Bericht – '+catalog.line.name,'','Erstellt: '+report.generatedAt,'',
  plan?'Modus: Abgleich mit lokalem Export. Kein Shopzugriff.':'Modus: reine Katalog-Vorprüfung. **Kein Shop-Export vorhanden; Shop-Aktionszähler sind nicht ermittelt.**','',
  '| Katalog | Anzahl |','| --- | ---: |','| Hauptprodukte | '+c.mainProducts+' |',
  '| Mit / ohne hinterlegte Shopify-Produkt-ID | '+c.withShopifyProductId+' / '+c.withoutShopifyProductId+' |',
  '| Hauptprodukt-Größen | '+c.targets+' |','| Soll-Varianten | '+c.targetVariants+' |',
  '| Hauptprodukt-Größen mit freigegebenem Startdesign | '+c.releasedTargets+' |',
  '| Mit offenen Planervoraussetzungen | '+c.blockedTargets+' |','| Ohne offene Planervoraussetzungen | '+c.withoutPlannerBlockers+' |','',
  'Eine Katalog-ID ist kein aktueller Shop-Nachweis. Ohne offene Planervoraussetzungen bedeutet weder Designabnahme noch Uploadfreigabe.',''];
 if(plan){
  lines.push('Export: '+report.export.file+'; '+plan.export.products+' Produkte; '+(plan.export.complete?'vollständig laut Export':'**TEILEXPORT**')+'; Zeitpunkt: '+(plan.export.exportedAt??'nicht angegeben')+'.',
   'Export-SHA-256: '+report.export.sha256,'','| Geplante Aktion | Anzahl |','| --- | ---: |',...ACTIONS.map(a=>'| '+a+' | '+plan.counts[a]+' |'),'');
  if(!plan.export.complete)lines.push('Teilexport: fehlende Shop-Treffer belegen keine Neuanlage. Für Paket E einen frischen vollständigen Export verwenden.','');
 }
 lines.push('## Offen / Konflikte','','| Hauptprodukt | Größe | Startdesign | Grund |','| --- | --- | --- | --- |');
 const rows=plan?plan.entries.filter(e=>e.action==='offen'||e.action==='konflikt').map(e=>({...e,reasons:e.reasons})):
  catalog.targets.filter(t=>t.open.length).map(t=>({...t,reasons:t.open}));
 if(!rows.length)lines.push('| – | – | – | Keine offenen Planervoraussetzungen in diesem Lauf. |');
 for(const row of rows)lines.push('| '+cell(row.mainProductId)+' | '+cell(row.sizeKey)+' | '+cell(row.startDesign)+' | '+row.reasons.map(cell).join('; ')+' |');
 if(catalog.notes.length)lines.push('','## Hinweise','',...catalog.notes.map(n=>'- '+n));
 lines.push('','## Nächster Schritt','',
  plan?'Claude prüft diesen Plan mit frischem Export, Katalogstand und Werkstatt-Import. Erst danach die konkreten Aktionszähler Chris zur Freigabe vorlegen.':
   'Claude verbindet den Katalog (Paket D); Chris prüft und gibt Designs frei. Danach mit einem frischen lokalen products.json erneut ausführen und die Aktionszähler Chris vorlegen.',
  'Der Bericht verwendet die unveränderten shop-sync-Planregeln. Er ersetzt weder den Werkstatt-Import-Dry-run noch die Prüfung von Design/Größenzuordnung und Shop-Bindung.',
  '','Katalogquellen-SHA-256: '+catalog.sourcesSha256+'. Einzeldateien stehen in bericht.json.',
  'Exit 0 bestätigt nur die Berichtserstellung. Dieses Skript liest keine Zugangsdaten und bietet keine Schreiboption für Shopify.','');
 return lines.join('\n');
}

function assertOutsideKatalog(out,katalogRoot){
 const root=fs.realpathSync(katalogRoot);
 let parent=out;
 const tail=[];
 while(!fs.existsSync(parent)){tail.unshift(path.basename(parent));const next=path.dirname(parent);if(next===parent)fail('Ausgabepfad nicht auflösbar.');parent=next;}
 const resolved=path.resolve(fs.realpathSync(parent),...tail),relative=path.relative(root,resolved);
 if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))fail('Berichtordner muss außerhalb des Katalogs liegen.');
}

export function run(argv,{stdout=process.stdout}={}){
 const args=parseArgs(argv);
 if(args.help){stdout.write(HELP);return null;}
 const out=path.resolve(args.out);
 assertOutsideKatalog(out,args.katalogRoot);
 if(fs.existsSync(out))fail('Berichtordner existiert bereits; einen neuen --out Ordner wählen.');
 const report=prepareDryRun(args);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.mkdirSync(out); // Vorhandene Berichte nicht überschreiben, auch bei konkurrierenden Aufrufen.
 fs.writeFileSync(path.join(out,'bericht.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(out,'bericht.md'),formatReport(report),{flag:'wx'});
 if(report.plan)fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify(report.plan,null,2)+'\n',{flag:'wx'});
 stdout.write(formatReport(report)+'\nBerichte: '+out+'\n');
 return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{run(process.argv.slice(2));}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
