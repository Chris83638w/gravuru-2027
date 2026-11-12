// Adapted from the preserved v9 Artifact appendix builder. Creates only six new sheets.
import fs from 'node:fs/promises';
import path from 'node:path';
import {argumentsFor,loadInputs,BUILD_ARGS,SHEETS,OUTPUT,PIN,writeNew,writeJson,sha} from './inputs.mjs';

const args=argumentsFor(process.argv.slice(2),BUILD_ARGS,['check-only']);
const data=await loadInputs(args); // Must finish before importing/creating any workbook.
if(args['check-only']) {console.log(JSON.stringify({inputsValid:true,reviewHash:data.review.reviewHash,authoring:false}));process.exit(0);}
const out=path.resolve(args.out);
await fs.mkdir(out); // Exclusive new directory, no overwrite/resume into an old result.
const {Workbook,SpreadsheetFile}=await import('./artifact-runtime.mjs');
const wb=Workbook.create(),specs=[];
const {review,observation,prices,labels,mapping,target}=data;
// Explicit text prefix avoids Artifact's scientific display of digit-only strings.
// The original exact GIDs remain in the pinned machine-readable mapping.
const numberId=id=>'ID '+id.split('/').at(-1);
const optText=options=>options.map(x=>x.name+': '+x.value).join(' / ');
const rows=(items)=>items.map(x=>Array.isArray(x)?x:[x]);
function sheet(name,title,headers,body,widths,{formulas=[],notes=[],numeric=[]}={}) {
  const s=wb.worksheets.add(name),n=headers.length,last=String.fromCharCode(64+n),end=7+body.length;
  s.showGridLines=false;s.tabColor=name==='HauptzielV7'?'#155765':'#68818A';
  s.getRange(`A1:${last}${end+notes.length+3}`).format.font={name:'Arial',size:11,color:'#172D35'};
  s.getRange(`A1:${last}${end+notes.length+3}`).format.verticalAlignment='center';
  s.getRange(`A1:${last}${end+notes.length+3}`).format.rowHeightPx=28;
  s.getRange(`A1:${last}${end+notes.length+3}`).setNumberFormat('@');
  widths.forEach((w,i)=>s.getRangeByIndexes(0,i,end+notes.length+3,1).format.columnWidthPx=w);
  s.getRange('A2').values=[[title]];s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#155765'};
  s.getRange('A2').format.rowHeightPx=36;
  s.getRange('A4').values=[['Kopienpilot: Reviewunterlage. Keine Livefreigabe; Bestätigung und Ausführung stehen aus.']];
  s.getRange(`A7:${last}7`).values=[headers];
  s.getRange(`A7:${last}7`).format={fill:'#155765',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeightPx:32,wrapText:true};
  if(body.length)s.getRange(`A8:${last}${end}`).values=rows(body);
  for(let r=0;r<body.length;r++)for(let c=0;c<n;c++)if(typeof body[r][c]==='number')s.getRangeByIndexes(r+7,c,1,1).setNumberFormat('0');
  for(const [cell,formula]of formulas)s.getRange(cell).formulas=[[formula]];
  for(const [range,format]of numeric)s.getRange(range).setNumberFormat(format);
  for(let i=0;i<notes.length;i++)s.getRange(`A${end+2+i}`).values=[[notes[i]]];
  if(body.length>20)s.freezePanes.freezeRows(7);
  specs.push({name,title,headers,body,formulas,notes,headerRow:7,dataStartRow:8,endRow:end,
    renderRange:`A1:${last}${body.length>60?26:end+notes.length+2}`});
  return s;
}

sheet(SHEETS[0],'Hauptacryl: Zielstand v7',['Angabe','Konkretes Ziel','Status'],[
 ['Shopprodukt','ID 16190784602492','bestehend, DRAFT'],
 ['Native Produkt-ID',review.scope.productId,'identitätserhaltend'],
 ['Produktrevision',`${review.scope.expectedRevision} → ${review.scope.expectedRevision+1}`,'vorgesehen'],
 ['Erhaltene Varianten',808,'IDs und SKUs erhalten'],
 ['Bindungen an Zielrevision',778,'nach nativer Übernahme'],
 ['Restvarianten bei Revision 1',30,'unverändert erhalten'],
 ['Preise schon gleich',620,'v9-Soll unverändert'],
 ['Preiskorrekturen',158,'138 × −0,30 €; 20 × −0,10 €'],
 ['Größenbeschriftungen',30,'3 Formate, Geometrie erhalten'],
 ['Davon auch Preiskorrektur',6,'182 verschiedene Varianten betroffen'],
 ['Hauptbild H1','ID 70116579869052','erhalten'],
 ['Name / SEO / Kategorien','Vorhandene Werte und Reihenfolge','erhalten'],
 ['Foto / SVG-Logo','AN / AN','bereits bestätigt'],
 ['Startdesign',target.config.familyFormats.source.shopProduct.defaultDesignId,'bestehende bestätigte Startvorlage'],
 ['Mehrwertsteuer',0.19,'inklusive, bereits bestätigt'],
 ['Mengenstaffel','5 % ab 3 / 10 % ab 5 / 15 % ab 10','bestehende bestätigte Regel'],
 ['Operator-Update-Review',review.reviewHash,'exakter nativer Updateumfang'],
 ['Freigabe / Ausführung','OFFEN','Kopienpilot-Unterlage; keine Livezustimmung'],
 ['Neue / gelöschte Produkte','0 / 0','nur dieses Hauptupdate'],
 ['Öffentliche Veröffentlichung','nicht enthalten','DRAFT bleibt'],
], [245,725,345],{numeric:[['B22','0%']],notes:['V9-Plan ist Herkunft. Dieser Update-Review ist kein neuer ProductGroup-Plan.']});

sheet(SHEETS[1],'158 bestehende Preise auf v9-Soll abgleichen',
 ['Varianten-ID','SKU','Befestigung','Maße mm','Istpreis EUR','v9-Soll EUR','Änderung EUR'],
 prices.map(x=>[numberId(x.shopifyVariantId),x.sku,x.nativeOptions.mounting,`${x.widthMm} × ${x.heightMm}`,x.currentShopUnitCents/100,x.targetUnitCents/100,null]),
 [160,410,125,120,125,125,140],{formulas:prices.map((x,i)=>[`G${i+8}`,`=F${i+8}-E${i+8}`]),numeric:[['E8:G165','0.00']],notes:['Istwerte stammen aus dem gepinnten Lesevergleich. Vor einer tatsächlichen Änderung frisch abgleichen.']});
sheet(SHEETS[2],'30 Größenbeschriftungen korrigieren',
 ['Varianten-ID','SKU','Bisherige Beschriftung','Zielbeschriftung','Breite mm','Höhe mm','Preisänderung EUR'],
 labels.map(x=>[numberId(x.shopifyVariantId),x.sku,x.currentShopSelectedOptions[0].value,x.proposedSelectedOptions[0].value,x.widthMm,x.heightMm,(x.targetUnitCents-x.currentShopUnitCents)/100]),
 [160,410,300,315,100,100,155],{numeric:[['E8:F37','0.0'],['G8:G37','0.00']],notes:['Nur die Anzeige wird genauer; die vorhandenen physischen Maße bleiben unverändert.']});
sheet(SHEETS[3],'30 Restvarianten unverändert erhalten',
 ['Varianten-ID','SKU','Vorhandene Optionen','Preis EUR','Native Revision','Behandlung'],
 mapping.residualVariants.map(x=>[numberId(x.id),x.sku,optText(x.selectedOptions),Number(x.price),1,'erhalten; kein Repoint / keine Löschung']),
 [160,410,700,120,120,340],{numeric:[['D8:D37','0.00']],notes:['Diese Varianten bleiben außerhalb der778 Zielbindungen und behalten die vorhandene Revision1.']});

const evidenceRows=[
 ['Vorherige Akte',review.origin.excelFile,'v9-Lauf, Dateiversion6'],['Vorherige Akte SHA',review.origin.excelSha256,'Dateibytes'],
 ['V9-Plan-ID',review.origin.v9PlanId,'Herkunft'],['V9-planHash',review.origin.v9PlanHash,'Herkunft'],
 ['Echter Update-reviewHash',review.reviewHash,'Operator-Update-Review'],['Importfingerprint',review.importFingerprint,'nativer Updateadapter'],
 ['Beobachtet am','UTC: '+observation.observedAt,'tatsächlicher Kopienkontext'],['Operatorbeleg',data.evidenceSource,'tatsächliche Quelle'],
 ['Reviewdatei SHA',data.inputPins.review.sha256,'Dateibytes'],['Observationdatei SHA',data.inputPins.observation.sha256,'Dateibytes'],
 ['Alter Dokumenthash',observation.preimage.documentBindingSha256,'ID-Binding-Verfahren'],['Alte Metadaten SHA',observation.preimage.metadataSha256,'Adapter-Digest'],
 ['Zieldokument SHA',review.target.productGroupSha256,'Produktgruppen-Verfahren'],['Zieldokument Binding-SHA',review.target.idBindingSha256,'ID-Binding-Verfahren'],
 ['Zielmetadaten SHA',observation.targetMetadataSha256,'Adapter-Digest'],['Kategorienvergleich SHA',observation.evidence.categoryComparisonSha256,'Dateibytes'],
 ['Nativer Validator SHA',observation.evidence.nativeValidatorSourceSha256,observation.evidence.nativeValidatorContract],
 ['Settingsrevision',observation.resourcePins.settings.revision,'native Ressourcenlesung'],['Settings SHA',observation.resourcePins.settings.sha256,'Adapter-Digest'],
 ['Ressourcenauflösung SHA',observation.resourcePins.resolutionSha256,'Adapter-Digest'],
 ['Mapping Gzip SHA',PIN.mappingGzip,'Dateibytes'],['Mapping JSON SHA',PIN.mappingJson,'dekomprimierte Dateibytes'],
 ...observation.resourcePins.categoryAssignments.map((x,i)=>[`Kategorie${i+1}`,x.id,x.present?x.sha256:'keine eigene Zuordnung']),
 ...observation.resourcePins.profiles.map(x=>[`Profil ${x.type}`,`${x.id}@${x.revision}`,x.sha256]),
 ['Fertigungsprofil',observation.resourcePins.productionProfile?`${observation.resourcePins.productionProfile.id}@${observation.resourcePins.productionProfile.revision}`:'kein gesonderter Pin',observation.resourcePins.productionProfile?.sha256??'null laut tatsächlicher Auflösung'],
 ['Freigabebeleg','OFFEN','erst nach tatsächlicher Zustimmung'],
 ['Kopienpilot','noch nicht ausgeführt','Observation ist ein Lesebeleg'],
 ['Älterer Kategorienhelper','readyForImport:false; Modulprofiltabellen dort nicht vorhanden','gesonderte Einordnung; keine Livefreigabe'],
];
sheet(SHEETS[4],'Quellen und tatsächliche Reviewbelege',['Beleg','Wert','Verfahren / Herkunft'],evidenceRows,[260,770,420]);
sheet(SHEETS[5],'Vorgesehener Ablauf und Abnahmeumfang',['Schritt','Anzahl','Gegenstand','Vor-/Nachprüfung','Status'],[
 ['Native Übernahme',1,'Bestehende cfg Revision 1 → Revision 2','Echter Review, frische CAS-/Metadaten-/Ressourcenprüfung, Journal/Readback','Freigabe offen'],
 ['Shoppreise',158,'138 B02S −30 Cent; 20 B04S −10 Cent','Frische Istwerte; vollständiger Readback aller 808 Varianten','separater Umfang'],
 ['Größenlabels',30,'3 genauere Beschriftungen; 6 zugleich Preisänderung','IDs/Geometrie/übrige Optionen erhalten','separater Umfang'],
 ['Bindungen',778,'8 Blöcke; höchstens 100 pro Block, letzter 78','Frische native Preis-/Shop-/Kopfbelege und erwartete Zuordnungsköpfe je Block','separater Umfang'],
 ['Restbindungen',30,'Revision 1 und alle vorhandenen Werte erhalten','Disjunkte vollständige Abdeckung: 778 + 30','unverändert'],
 ['Katalogfreigabe',778,'Genau Revision 2 und ihre Zielbindungen','Nach erfolgreichem Binding-/Preisabgleich; Revision 1 erhalten','separater Umfang'],
 ['Öffentliche Veröffentlichung',0,'Nicht Teil dieses Ablaufs','Shopstatus DRAFT erhalten','nicht enthalten'],
 ['Sechs Kleinprodukte',0,'Kein Kleinproduktimport mit dieser Hauptakte','Eigene tatsächliche Zielpläne und konkrete Abnahme erforderlich','separat'],
],[230,85,500,600,160],{notes:['Der Updateadapter führt nur das native Produktupdate aus. Die anderen Schritte benötigen den ausdrücklich benannten Gesamtumfang.']});

wb.recalculate();
for(const spec of specs) {
  const inspected=await wb.inspect({kind:'table',range:`${spec.name}!A7:${String.fromCharCode(64+spec.headers.length)}${Math.min(spec.endRow,20)}`,include:'values,formulas',tableMaxRows:14,tableMaxCols:7,maxChars:8000});
  await writeNew(path.join(out,spec.name+'.inspection.jsonl'),inspected.ndjson);
  const png=await wb.render({sheetName:spec.name,range:spec.renderRange,scale:1,format:'png'});
  await writeNew(path.join(out,spec.name+'.png'),new Uint8Array(await png.arrayBuffer()));
}
const appendix=path.join(out,'six-new-sheets.appendix.xlsx');
await (await SpreadsheetFile.exportXlsx(wb)).save(appendix); // Inside exclusively-created directory.
await writeJson(path.join(out,'appendix-index.json'),{schema:'gravuru-main-v7-appendix-build/v1',output:OUTPUT,reviewHash:review.reviewHash,
  importFingerprint:review.importFingerprint,sourceSha256:PIN.source,appendixSha256:sha(await fs.readFile(appendix)),inputPins:data.inputPins,
  mappingCounts:{matches:778,residual:30,prices:158,labels:30,labelAndPrice:6},sheets:specs,purpose:'copy-pilot-review-only',approvalHash:null,approved:false,executed:false});
console.log(JSON.stringify({appendixWritten:true,finalXlsxWritten:false,sheets:SHEETS,reviewHash:review.reviewHash}));
process.exit(0);
