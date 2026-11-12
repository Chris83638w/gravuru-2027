// Existing v9/v7 Artifact authoring pattern, six additive copy-review sheets only.
import fs from 'node:fs/promises';
import path from 'node:path';
import {argumentsFor,loadInputs,sha,writeJson,writeNew} from './inputs.mjs';
const args=argumentsFor(process.argv.slice(2),['workspace','input','input-sha256','out'],['check-only']);
const data=await loadInputs(args); // All real native inputs before any workbook/output creation.
if(args['check-only']){console.log(JSON.stringify({allInputsValid:true,groups:6,pricesCompared:45,authoring:false,inputSha256:data.inputSha256}));process.exit(0);}
const out=path.resolve(args.out);await fs.mkdir(out); // New directory exclusively.
const {Workbook,SpreadsheetFile}=await import('./artifact-runtime.mjs');
const records=[];
for(const row of data.records){
 const {ref,plan,template,sourcePin,modulePin,motifPin,metadata}=row;
 const title=ref.name+' · Kopienplan',headers=['Angabe','Tatsächlicher Kopienstand','Einordnung'];
 const body=[
  ['Zweck','Prüfunterlage der isolierten Serverkopie','KEINE Produktfreigabe'],
  ['Produktziel','Neue eigene Kleinproduktgruppe; später DRAFT','keine Altproduktänderung'],
  ['Produktive Plan-IDs','Noch nicht mit dieser Akte behauptet','spätere echte Zuordnung'],
  ['Neue Dateiversion',ref.output,'nur zusätzliches Blatt'],
  ['Bisherige Akte',path.basename(ref.previous),'v9-Herkunft unverändert'],
  ['Bisherige Akte SHA-256',ref.previousSha256,'Dateibytes'],
  ['Originalpreisakte',path.basename(ref.original),'Preisquelle'],
  ['Originalpreisakte SHA-256',ref.originalSha256,'dauerhafte creationKey-Quelle'],
  ['Creation-Key',plan.creationKey,'unverändert'],
  ['Produkt-Key',ref.key,'unverändert'],
  ['Plan-ID',plan.id,'nur Kopie'],
  ['Nativer planHash',plan.planHash,'Produktgruppen-Verfahren'],
  ['Plan gültig',true,'valid:true auf Kopie'],
  ['Planbestätigung / Ausführung','0 / 0','OFFEN'],
  ['Freigabebeleg','KEINER','approvalHash: null'],
  ['Shopify-Schreibvorgänge',0,'nicht ausgeführt'],
  ['Quell-ID',sourcePin.productId,'nur Kopie'],
  ['Quellrevision',sourcePin.revision,'native Revision'],
  ['Quelldokument SHA-256',sourcePin.sha256,'Produktgruppen-Verfahren'],
  ['Vorlagen-ID',template.id,'nur Kopie'],
  ['Vorlagenrevision',template.revision,'native Revision'],
  ['Vorlagen SHA-256',template.sha256,'Produktgruppen-Verfahren'],
  ['Modulprofil-ID',modulePin.id,'echter Registereintrag auf Kopie'],
  ['Modulprofilrevision',modulePin.revision,'native Revision'],
  ['Modulprofil SHA-256',modulePin.sha256,'Produktgruppen-Verfahren'],
  ['Foto / SVG-Logo','AUS / AUS','bereits bestätigt'],
  ['Motivprofil-ID',motifPin.id,'echtes Auswahlprofil auf Kopie'],
  ['Motivprofilrevision',motifPin.revision,'separater Ausführungspin'],
  ['Motivprofil SHA-256',motifPin.storedDocumentSha256,'native JSON-Feldfolge name/type/items'],
  ['Auswählbare Motive',13,'bestätigte IDs und Reihenfolge'],
  ['Enthaltene Designs',27,'unveränderte Originalauswahl'],
  ['Startdesign beibehalten',ref.defaultDesignId,'bestätigt'],
  ['Startgröße beibehalten',ref.defaultSize,'physische Größe unverändert'],
  ['Preisangaben','Bruttopreise inklusive 19 % MwSt.','bestätigt 11.11.2026'],
  ['Mengenstaffel','5 % ab 3 / 10 % ab 5 / 15 % ab 10','bestätigt 20.10.2026'],
  ['Staffelumfang','complete-unit','kompletter Stückpreis'],
  ['Motiv-Aufpreis (Cent)',169,'unverändert'],
  ['Verglichene Kombinationen',row.variantReview.length,'alle Preise/Optionen wie v9'],
  ['Native Ressourcen-Settingsrevision',metadata.profiles.settingsRevision,'tatsächlich gespeicherte Metadaten'],
  ['Ressourcenauflösung SHA-256',row.resourceResolutionGroupSha256,'separate Belegprojektion; Produktgruppen-Verfahren'],
  ['Quellmetadaten SHA-256',row.sourceMetadataGroupSha256,'separater Beleg; Produktgruppen-Verfahren'],
  ['Operatorquelle',data.pack.evidenceSource,'tatsächlicher Kopiennachweis'],
  ['Operator-Codecommit',data.pack.sourceCommit,'Quellstand'],
  ['Record-Herkunft','Lokal aus v9 mit tatsächlichen Kopien-IDs rekonstruiert','keine Server-Bytekopien'],
  ['Server-Abgleich','44 kanonische Werte, Planhashes und Planlängen geprüft','unabhängiger Empfangsreview'],
  ['Business-Entscheidungen','In erhaltenen v9-Akten belegt','nicht in neuen nativen Revisionsmetadaten'],
  ['Tenant / Store',data.pack.tenantId+' / '+data.pack.storeId,'Operatorzuordnung der Kopie'],
  ['Eingabepaket SHA-256',data.inputSha256,'geprüfte Dateibytes'],
  ['Plan-JSON Datei SHA-256',row.input.plan.sha256,'ggf. Gzip-Dateibytes'],
  ['Lokaler v9-Ursprungsplan',ref.v9PlanId,'ausschließlich Herkunft'],
  ['Lokaler v9-planHash',ref.v9PlanHash,'ausschließlich Herkunft'],
  ['Preisvergleich','Optionen / physische Maße','Bruttopreis EUR'],
  ...row.variantReview.map((v,i)=>['Kombination '+(i+1),v.choices.map(c=>c.label+': '+c.display).join(' / ')+` / ${v.widthMm} × ${v.heightMm} mm`,v.unitCents/100]),
  ['Motivauswahl','Exakte bestätigte Motiv-ID','Reihenfolge'],
  ...row.motif.items.map((id,i)=>['Motiv '+(i+1),id,i+1]),
  ['Weiterer Ablauf','Erst tatsächliche Produktivpläne und konkrete Akten abnehmen','keine Übertragung der Kopien-IDs behauptet'],
  ['Altprodukte','Vorhandene ACTIVE-/Mehrgrößenprodukte bleiben erhalten','keine Löschung / kein Umhängen'],
 ];
 const wb=Workbook.create(),s=wb.worksheets.add('Kopienplan'),end=7+body.length;
 s.showGridLines=false;s.tabColor='#155765';
 s.getRange(`A1:C${end+2}`).format={font:{name:'Arial',size:11,color:'#172D35'},verticalAlignment:'center',rowHeightPx:28};
 s.getRange(`A1:C${end+2}`).setNumberFormat('@');
 [265,795,350].forEach((w,i)=>s.getRangeByIndexes(0,i,end+2,1).format.columnWidthPx=w);
 s.getRange('A2').values=[[title]];s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#155765'};s.getRange('A2').format.rowHeightPx=36;
 s.getRange('A4:C5').merge();s.getRange('A4').values=[['Native Kopienpläne – keine Produktfreigabe. Records lokal rekonstruiert und gegen Serverhashes geprüft. Alle älteren Blätter/Preise bleiben unverändert; neue Kennungen gelten nur für die Kopie.']];
 s.getRange('A4:C5').format={wrapText:true,fill:'#FFF2CC',font:{name:'Arial',size:11,color:'#7F6000'}};
 s.getRange('A7:C7').values=[headers];s.getRange(`A8:C${end}`).values=body;
 const sectionRows=[7,...body.flatMap((r,i)=>['Preisvergleich','Motivauswahl'].includes(r[0])?[8+i]:[])];
 for(const r of sectionRows)s.getRange(`A${r}:C${r}`).format={fill:'#155765',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeightPx:32};
 s.getRange(`A8:A${end}`).format.font.bold=true;
 for(const [i,values]of body.entries())for(const[c,value]of values.entries())if(typeof value==='number')s.getRangeByIndexes(i+7,c,1,1).setNumberFormat(values[0].startsWith('Kombination ')?'0.00':'0');
 s.freezePanes.freezeRows(7);wb.recalculate();
 const appendix=ref.output+'.appendix.xlsx';await(await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,appendix));
 const ranges=['A1:C27','A28:C55',`A56:C${end}`];
 for(let i=0;i<ranges.length;i++){const image=await wb.render({sheetName:s.name,range:ranges[i],scale:1,format:'png'});await writeNew(path.join(out,ref.output+`.preview-${i+1}.png`),new Uint8Array(await image.arrayBuffer()));}
 records.push({key:ref.key,output:ref.output,previous:ref.previous,previousSha256:ref.previousSha256,original:ref.original,originalSha256:ref.originalSha256,
  appendix,appendixSha256:sha(await fs.readFile(path.join(out,appendix))),planId:plan.id,planHash:plan.planHash,creationKey:plan.creationKey,
  source:sourcePin,template:{id:template.id,revision:template.revision,sha256:template.sha256},moduleProfile:modulePin,motifProfile:motifPin,
  variantReview:row.variantReview,inputs:row.input,sheet:{name:s.name,title,headers,body,renderRanges:ranges}});
 console.log(JSON.stringify({appendix:ref.output,planId:plan.id,priceRows:row.variantReview.length,finalXlsxWritten:false}));
}
await writeJson(path.join(out,'appendix-index.json'),{schema:'gravuru-six-copy-plan-appendix-build/v1',purpose:'isolated-copy-plan-review-only',approvalHash:null,approved:false,executed:false,
 inputSha256:data.inputSha256,referenceSha256:data.referenceSha256,evidenceSource:data.pack.evidenceSource,sourceCommit:data.pack.sourceCommit,records});
console.log(JSON.stringify({appendices:6,priceRows:45,finalWorkbooksWritten:0}));
process.exit(0);
