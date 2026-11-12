import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {Workbook,SpreadsheetFile} from './artifact-runtime.mjs';
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inputFile=path.join(import.meta.dirname,'final-six-inputs.json'),inputBytes=await fs.readFile(inputFile);
const input=JSON.parse(inputBytes),verified=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'input-verification.json'),'utf8'));
if(!verified.allPassed||sha(inputBytes)!==verified.inputsSha256)throw Error('Unverified inputs');
for(const p of input.sources)if(sha(await fs.readFile(path.join(root,p.path)))!==p.sha256)throw Error('Input changed '+p.path);
await fs.mkdir(out);
const records=[],id=v=>'ID '+v.split('/').at(-1),headers=['Angabe','Tatsächlicher Ausführungsstand','Nachweis'];
for(const r of input.rows){
 const body=[
 ['Status','Angelegt und zugeordnet; Shopify DRAFT','nicht veröffentlicht'],
 ['Produkt',r.title,'tatsächlicher Shop-Titel'],
 ['Shopify-Produkt-ID',id(r.shop.productId),'bestehende Akten ergänzt'],
 ['Native Produkt-ID',r.execution.productId,'durch execute erzeugtes Ziel'],
 ['Native Produktrevision',r.execution.revision,'tatsächlicher Zielrecord'],
 ['Varianten',r.variantRows.length,'alle Optionen/Preise rückgelesen'],
 ['Nativer Plan',r.preparation.planId,'tatsächliche Registry'],
 ['Nativer planHash',r.preparation.planHash,'Produktgruppen-Verfahren'],
 ['Bestätigungs-ID',r.execution.confirmationId,'tatsächliches confirm'],
 ['Gesamtfreigabe','Ja, Gesamtpaket ausführen','Nutzerantwort 12.11.2026'],
 ['Freigabereferenz',input.approval.id,'Katalogfreigabe laut Operator'],
 ['Ausführungs-Reviewhash',input.receipt.reviewHash,'Sechs-DRAFT-Operator'],
 ['Einstieg',r.shop.templateSuffix+' / '+r.shop.customizationId,'unabhängig zurückgelesen'],
 ['Veröffentlichung','DRAFT; publishedAt null','keine Verkaufsfreigabe'],
 ['Produktbilder',r.shop.images,'keine Medien übertragen'],
 ['Grund-/Aufpreise','Brutto inklusive 19 % MwSt.','Beträge unverändert'],
 ['Mengenstaffel','ab 3 / 5 / 10 Stück: 5 / 10 / 15 %','vollständiger Stückpreis'],
 ['Uploads','Foto AUS; SVG-Logo AUS','bestätigter Produktinhalt'],
 ['Motivaufschlag EUR',r.pricing.extraMotifCents/100,'bestätigt; Abrechnung '+r.pricing.motifCharge],
 ['Preis-/Bindungsbeleg','45/45 laut tatsächlichem Operatorbericht','Eigentümer-App; kein Fremd-App-null-Beweis'],
 ['Katalogfreigabe','alle Varianten dieser Produktrevision','Operatorbericht; kein Shop-Publishing'],
 ['Quellen / Herkunft','Kennungen und unveränderte Akten',''],
 ['Vorbereitungsquelle',r.preparation.sourceId,'nicht mit execute-Ziel verwechseln'],
 ['Vorlage',r.preparation.templateId,'tatsächliche Registry'],
 ['Modulprofil',r.moduleProfile.id+' @'+r.moduleProfile.revision,'Inhaltshash gleich v9'],
 ['Modulprofil-Inhalt SHA256',r.moduleProfile.sha256,'gemeldeter nativer Hash'],
 ['Motivprofil',r.motifProfile.id+' @'+r.motifProfile.revision,'13 bestätigte Motive'],
 ['Creation-Key',r.creationKey,'unverändert; Originalpreisakte'],
 ['Originalpreisakte SHA256',r.originalExcel.sha256,'kein neuer Importkey'],
 ['Vorgängerakte',path.basename(r.previous.path),'alle alten Teile erhalten'],
 ['Vorgängerakte SHA256',r.previous.sha256,'Dateibytes'],
 ['Kopienplan (Historie)',r.copyProvenance.planId,'nicht die produktive Plan-ID'],
 ['Kopienplanhash (Historie)',r.copyProvenance.planHash,'unveränderter Vorbeleg'],
 ['Freigabequelle',input.approval.source,'tatsächliche Nutzerantwort'],
 ['Ergebnisquelle',input.receipt.source,'Commit '+input.receipt.commit],
 ['Empfangene Ergebnisdatei SHA256',input.sources[0].sha256,'gelieferte kompakte Ergebnisdatei'],
 ['Voller Serverbeleg SHA256',input.receipt.reportedFullReceipt.sha256,'Operatorpin; Vollbytes nicht geliefert'],
 ['Unabhängiger Shopread SHA256',input.sources[1].sha256,'45 Optionen/Preise + Einstieg'],
 ['Beleggrenze','Kein Browser-, Warenkorb- oder Produktionslauf','Eigentümer-App-Vertrag: Operatorbeleg'],
 ['Aktenzweck','Abschlussnachweis; kein Import/Reimport','alte Kopienblätter bleiben Historie'],
 ];
 const wb=Workbook.create(),s=wb.worksheets.add('Ausfuehrung'),end=7+body.length;
 s.showGridLines=false;s.tabColor='#155765';
 s.getRange('A1:C'+(end+2)).format={font:{name:'Arial',size:11,color:'#172D35'},verticalAlignment:'center',rowHeightPx:28};
 s.getRange('A1:C'+(end+2)).setNumberFormat('@');
 [265,795,350].forEach((w,i)=>s.getRangeByIndexes(0,i,end+2,1).format.columnWidthPx=w);
 s.getRange('A2').values=[[r.title+' – Ausführung']];s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#155765'};s.getRange('A2').format.rowHeightPx=36;
 s.getRange('A4:C5').merge();s.getRange('A4').values=[['Tatsächliche neue Produktkennungen. Alle älteren Blätter, Preise und Geometrien bleiben unverändert. Shopify bleibt DRAFT; dieser Nachtrag löst keinen Import aus.']];
 s.getRange('A4:C5').format={wrapText:true,fill:'#EAF1F3',font:{name:'Arial',size:11,color:'#172D35'}};
 s.getRange('A7:C7').values=[headers];s.getRange('A8:C'+end).values=body;
 for(const n of [7,8+body.findIndex(x=>x[0]==='Quellen / Herkunft')])s.getRange('A'+n+':C'+n).format={fill:'#155765',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeightPx:32};
 s.getRange('A8:A'+end).format.font.bold=true;
 for(const [i,row]of body.entries())if(typeof row[1]==='number')s.getRange('B'+(i+8)).setNumberFormat(row[0].includes('EUR')?'0.00':'0');
 s.freezePanes.freezeRows(7);
 const v=wb.worksheets.add('Shopzuordnung'),vrows=r.variantRows.map(x=>[id(x.variantId),x.choices.find(c=>c.id==='color')?.display??'Edelstahl',x.choices.find(c=>c.id==='mounting').display,x.unitCents/100,x.widthMm,x.heightMm]);
 const vh=['Shopify-Varianten-ID','Farbe / Material','Befestigung','Brutto EUR','Breite mm','Höhe mm'];
 v.showGridLines=false;v.tabColor='#155765';
 v.getRange('A1:F'+(vrows.length+9)).format={font:{name:'Arial',size:11,color:'#172D35'},verticalAlignment:'center',rowHeightPx:30};
 [220,160,310,110,110,110].forEach((w,i)=>v.getRangeByIndexes(0,i,vrows.length+9,1).format.columnWidthPx=w);
 v.getRange('A2').values=[['Tatsächliche Varianten und Preise']];v.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#155765'};
 v.getRange('A4:F4').merge();v.getRange('A4').values=[['Shopprodukt '+id(r.shop.productId)+'; native Revision '+r.execution.revision+'; alle Preise inklusive 19 % MwSt.']];
 v.getRange('A6:F6').values=[vh];v.getRange('A6:F6').format={fill:'#155765',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeightPx:34,horizontalAlignment:'center'};
 v.getRange('A7:F'+(6+vrows.length)).values=vrows;v.getRange('A7:C'+(6+vrows.length)).setNumberFormat('@');v.getRange('D7:D'+(6+vrows.length)).setNumberFormat('0.00');v.getRange('E7:F'+(6+vrows.length)).setNumberFormat('0');
 v.freezePanes.freezeRows(6);wb.recalculate();
 const inspected=await wb.inspect({kind:'table',range:'Ausfuehrung!A7:C18',include:'values,formulas',tableMaxRows:12,tableMaxCols:3,maxChars:5000});
 await fs.writeFile(path.join(out,r.output+'.inspection.jsonl'),inspected.ndjson,{flag:'wx'});
 const errs=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},summary:'new appendix error scan'});
 await fs.writeFile(path.join(out,r.output+'.errors.jsonl'),errs.ndjson,{flag:'wx'});
 const appendix=r.output+'.appendix.xlsx';await(await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,appendix));
 records.push({...r,appendix,appendixSha256:sha(await fs.readFile(path.join(out,appendix))),sheets:[{name:s.name,title:r.title+' – Ausführung',headers,body,headerRow:7,renderRanges:['A1:C28','A29:C'+end]},{name:v.name,title:'Tatsächliche Varianten und Preise',headers:vh,body:vrows,headerRow:6,renderRanges:['A1:F'+(8+vrows.length)]}]});
 console.log(JSON.stringify({appendix:r.output,variants:r.variantRows.length}));
}
await fs.writeFile(path.join(out,'appendix-index.json'),JSON.stringify({schema:'issue230-six-execution-appendix-build/v1',purpose:input.purpose,inputSha256:sha(inputBytes),approval:input.approval,receipt:input.receipt,sources:input.sources,records},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({appendices:6,variants:45,mainWritten:false}));
