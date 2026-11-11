import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const base=path.resolve('.'), run=path.join(base,'work/product-plans-run-v9'), work=path.join(base,'work/product-plans-sheets');
const previousDir=path.join(base,'outputs/Produktplaene-230/Excel-Nachtraege');
const previousManifest=JSON.parse(await fs.readFile(path.join(previousDir,'Manifest.json'),'utf8'));
const decisionBytes=await fs.readFile(path.join(run,'decisions.json'));
const decisions=JSON.parse(decisionBytes);
const summary=JSON.parse(await fs.readFile(path.join(run,'summary.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
if(decisions.tax.vatPercent!==19||!decisions.tax.confirmed||decisions.tax.pricePresentation!=='gross'||!decisions.quantityDiscount.confirmed||!decisions.starts.confirmedKeepExisting)throw Error('Decision pins incomplete');
const index=[];
for(const r of summary.results){
  const main=r.workbook==='Tuerschild-Acrylglas-3mm_v4.xlsx';
  const original=await fs.readFile(path.join(base,'work/product-plans-run-v8/excel',r.workbook));
  if(sha(original)!==r.excelSha256)throw Error('Original hash mismatch '+r.workbook);
  if(r.effectiveModules.photo!==main||r.effectiveModules.logo!==main)throw Error('Upload mismatch');
  const prior=previousManifest.records.find(x=>x.original===r.workbook);
  if(!prior||sha(await fs.readFile(path.join(previousDir,prior.output)))!==prior.xlsxSha256)throw Error('Previous appendix changed');
  const stem=r.workbook.replace(/\.xlsx$/,''), version=Number(prior.output.match(/_v(\d+)\.xlsx$/)[1])+1;
  const outputName=r.workbook.replace(/_v\d+\.xlsx$/,`_v${version}.xlsx`);
  const planPath=path.join(run,stem,'plan.json'), sourcePath=path.join(run,stem,'source-document.json');
  const profile=r.moduleProfilePins[0],plan=JSON.parse(await fs.readFile(planPath,'utf8'));
  if(r.valid!==true||plan.valid!==true||plan.issues.length)throw Error('Expected valid v9 plan');
  const tiers=plan.products[0].document.config.quantityTiers;
  if(JSON.stringify(tiers)!==JSON.stringify(decisions.quantityDiscount.tiers))throw Error('Tier decision mismatch');
  const tierText=tiers.map(x=>`ab ${x.minQuantity} Stück: ${x.percentOff} %`).join(' / ');
  const wb=Workbook.create(), s=wb.worksheets.add('PlanstandV9');
  s.showGridLines=false;s.tabColor='#155765';
  s.getRange('A1:C59').format.font={name:'Arial',size:11,color:'#172D35'};
  s.getRange('A1:C59').format.verticalAlignment='center';
  s.getRange('A1:A59').format.columnWidthPx=255;
  s.getRange('B1:B59').format.columnWidthPx=720;
  s.getRange('C1:C59').format.columnWidthPx=180;
  s.getRange('A1:C59').format.rowHeightPx=27;
  s.getRange('A1:C1').format.rowHeightPx=12;
  s.getRange('A2').values=[[`Planstand v9 · Akte v${version} · 11.11.2026`]];
  s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#155765'};
  s.getRange('A2:C2').format.rowHeightPx=35;
  s.getRange('A3').values=[[outputName]];
  s.getRange('A4:C5').merge();
  s.getRange('A4').values=[['Aktueller Stand: bestätigte Angaben und gültiger lokaler Plan. Frühere Nachträge und Preisblätter bleiben unveränderte historische Quellen. Die konkrete Planbestätigung und Ausführung stehen noch aus.']];
  s.getRange('A4:C5').format.wrapText=true;
  s.getRange('A4:C5').format.fill='#EDF4F6';
  s.getRange('A7:C18').values=[
    ['Entscheidung / Angabe','Aktueller Stand','Status'],
    ['Fotoupload',main?'AN':'AUS','bestätigt'],
    ['Foto-Aufpreis (Cent)',main?999:'nicht angeboten','bestätigt'],
    ['SVG-Logo-Upload',main?'AN':'AUS','bestätigt'],
    ['SVG-Logo-Aufpreis (Cent)',main?1299:'nicht angeboten','bestätigt'],
    ['Motiv-Aufpreis (Cent)',169,'übernommen'],
    ['Entscheidungsquelle','Nutzerentscheidungen im Chat und Entscheidungsbeleg v9','belegt'],
    ['Startdesign beibehalten',r.proposedStart.defaultDesignId,'beibehalten'],
    ['Startgröße beibehalten',r.proposedStart.sizeKey,'beibehalten'],
    ['Mehrwertsteuer (Bruttopreise)',0.19,'bestätigt 11.11.2026'],
    ['Mengenstaffeln',tierText,'bestätigt 20.10.2026'],
    ['Gesamtfreigabe / Ausführung','0 Bestätigungen · 0 Ausführungen · 0 Shopify-Schreibvorgänge','OFFEN'],
  ];
  s.getRange('B9').setNumberFormat('0');s.getRange('B11:B12').setNumberFormat('0');
  s.getRange('B16').setNumberFormat('0%');
  s.getRange('A20:C20').values=[['Nachweis / Herkunft','Exakte Referenz','Einordnung']];
  const rows=[
    ['Originaldatei',r.workbook,'unverändert'],
    ['Original-XLSX SHA-256',r.excelSha256,'native Eingabe'],
    ['Neue Dateiversion',outputName,'nur Nachtrag'],
    ['Finale Plan-ID',r.planId,'lokaler Plan v9'],
    ['Finaler planHash',r.planHash,'nativer Planhash'],
    ['Source-ID',r.source.id,'Entwurf'],
    ['Source-Revision',r.source.revision,'belegt'],
    ['Source SHA-256',r.source.sha256,'nativer Quellhash'],
    ['Template-ID',r.template.id,'belegt'],
    ['Template-Revision',r.template.revision,'belegt'],
    ['Template SHA-256',r.template.sha256,'belegt'],
    ['Modulprofil-ID',profile.id,'belegt'],
    ['Modulprofil-Revision',profile.revision,'belegt'],
    ['Modulprofil SHA-256',profile.sha256,'belegt'],
    ['Motivprofil-ID',r.smallMotifProfile?.id??'Hauptprodukt: vorhandene Motivauswahl','belegt'],
    ['Motivprofil-Revision',r.smallMotifProfile?.revision??'nicht gesondert','belegt'],
    ['Katalog-Commit',r.catalogCommit,'angewendet'],
    ['Planlauf','work/product-plans-run-v9/'+stem,'lokaler Nachweis'],
    ['plan.json Datei SHA-256',sha(await fs.readFile(planPath)),'Dateibytes'],
    ['source-document.json SHA-256',sha(await fs.readFile(sourcePath)),'Dateibytes'],
  ];
  s.getRange('A21:C40').values=rows;
  for(const rr of [7,20])s.getRange(`A${rr}:C${rr}`).format={fill:'#155765',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeightPx:30};
  s.getRange('A8:A18').format.font.bold=true;
  s.getRange('A21:A40').format.font.bold=true;
  s.getRange('C18').format={fill:'#FFF2CC',font:{name:'Arial',size:11,bold:true,color:'#7F6000'}};
  s.getRange('A41:C48').values=[
    ['Vorherige Akte',prior.output,'unverändert'],
    ['Vorherige Akte SHA-256',prior.xlsxSha256,'Kopiervorlage'],
    ['Entscheidungsdatei SHA-256',sha(decisionBytes),'Dateibytes'],
    ['Nativer Plan technisch gültig',true,'valid:true'],
    ['Enthaltene Designs',r.designs.native,main?'9 + 2 separat':'27 von 27'],
    ['Geometrieausnahmen',main?r.designs.fitExcludedIds.join(', '):'Keine dieser neun Ausnahmen im Kleinprodukt','ausgeschlossen'],
    ['Absichtlich ausgeblendet',main?r.designs.hiddenIds.join(', '):'Keine','beibehalten'],
    ['Preise einschließlich MwSt.','Bruttopreise einschließlich 19 % Mehrwertsteuer','bestätigt 11.11.2026'],
  ];
  s.getRange('A49:C49').values=[['Entscheidungsmanifest SHA-256',summary.decisionsManifestSha256,'kanonisches JSON']];
  s.getRange('A41:A48').format.font.bold=true;s.getRange('B46').format.wrapText=true;s.getRange('A46:C46').format.rowHeightPx=main?65:27;
  s.getRange('A50:C51').merge();
  s.getRange('A50').values=[['Provenienz: Der native Plan bindet die Original-XLSX. Dieser Nachtrag nennt den neuen v9-Plan. Das externe Manifest enthält die SHA-256 der neuen Akte. Alte Planverweise bleiben ausschließlich auf historischen Blättern erhalten.']];
  s.getRange('A50:C51').format.wrapText=true;
  s.getRange('A53:C54').merge();
  s.getRange('A53').values=[['Alle bisherigen Arbeitsblätter, Formeln, Zellwerte und Preise bleiben unverändert. Neun Geometrieausnahmen bleiben separate Nacharbeit, zwei hidden-Designs bleiben ausgeblendet. Keine pauschale 1.298-Design-Freigabe.']];
  s.getRange('A53:C54').format.wrapText=true;
  s.getRange('A56').values=[['Vollständige Übergabe / Issue 230']];
  s.getRange('B56').values=[['https://github.com/Chris83638w/gravuru-2027/issues/230']];
  s.getRange('A57:C57').values=[['Quellmetadaten SHA-256',r.source.metadataSha256,'native Metadaten']];
  wb.recalculate();
  const inspected=await wb.inspect({kind:'table',range:'PlanstandV9!A7:C48',tableMaxRows:42,tableMaxCols:3,maxChars:17000,tableMaxCellChars:300});
  await fs.writeFile(path.join(work,outputName+'.inspection.jsonl'),inspected.ndjson);
  const preview=await wb.render({sheetName:s.name,range:'A1:C57',scale:1,format:'png'});
  await fs.writeFile(path.join(work,outputName+'.nachtrag.png'),new Uint8Array(await preview.arrayBuffer()));
  await(await SpreadsheetFile.exportXlsx(wb)).save(path.join(work,outputName+'.appendix.xlsx'));
  index.push({original:r.workbook,output:outputName,previous:prior.output,previousSha256:prior.xlsxSha256,originalSha256:r.excelSha256,planId:r.planId,planHash:r.planHash,source:r.source,template:r.template,moduleProfile:profile,main,appendixSheet:s.name,decisionsSha256:sha(decisionBytes),proposedStart:r.proposedStart,quantityTiers:tiers,fitExcludedIds:r.designs.fitExcludedIds,hiddenIds:r.designs.hiddenIds,designCount:r.designs.native,valid:true});
  console.log(outputName+' appendix exported');
}
await fs.writeFile(path.join(work,'appendix-index.json'),JSON.stringify({run:'v9',decisionsManifestSha256:summary.decisionsManifestSha256,decisionsFileSha256:sha(decisionBytes),summarySha256:sha(await fs.readFile(path.join(run,'summary.json'))),records:index},null,2)+'\n');
process.exit(0);
