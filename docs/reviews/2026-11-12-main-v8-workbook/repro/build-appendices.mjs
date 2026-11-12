import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {Workbook,SpreadsheetFile} from './artifact-runtime.mjs';
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inputBytes=await fs.readFile(path.join(import.meta.dirname,'final-main-inputs.json')),input=JSON.parse(inputBytes),verified=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'input-verification.json'),'utf8'));
if(!verified.allPassed||sha(inputBytes)!==verified.inputSha256)throw Error('Unverified inputs');
for(const p of input.sources)if(sha(await fs.readFile(path.join(root,p.path)))!==p.sha256)throw Error('Source changed '+p.path);
await fs.mkdir(out);
const r=input.receipt,n=r.nativesUpdate,w=r.schreibfenster,id=v=>'ID '+v.split('/').at(-1),headers=['Angabe','Tatsächlicher Abschlussstand','Nachweis / Geltung'];
const execRows=[
 ['Produkt',input.product.title,'bestehendes Produkt aktualisiert'],
 ['Shopify-Produkt-ID',id(input.product.id),'identisch erhalten'],
 ['Native Produkt-ID',input.cfg,'identisch erhalten'],
 ['Native Revision',2,'Operator: R1 → R2; draft'],
 ['Shopstatus','DRAFT','nicht veröffentlicht'],
 ['Shopvarianten',808,'alle IDs unabhängig zurückgelesen'],
 ['Aktive Zielbindungen R2',778,'nativer Operatorbericht'],
 ['Erhaltene aktive Bindungen R1',30,'nativer Operatorbericht'],
 ['Shop-Preisänderungen',158,'138 × −0,30 EUR; 20 × −0,10 EUR'],
 ['Shop-Labeländerungen',30,'vorgegebene Geometrie unverändert'],
 ['Betroffene Shopvarianten',182,'6 mit Preis- und Labeländerung'],
 ['Gesamtfreigabe',input.approval.quote,'Nutzerantwort 12.11.2026'],
 ['Freigabereferenz',input.approval.id,'vorhandene Gesamtfreigabe'],
 ['Native Update-Zustimmung',n.zustimmung.approvalHash,'Operatorpin; Originaldatei nicht geliefert'],
 ['Native Updatequittung',n.quittung.receiptHash,'Operatorpin; Originaldatei nicht geliefert'],
 ['Nativer Importkey',n.importKey,'bestehendes cfg-Update; keine Neuanlage'],
 ['Importfingerprint',n.importFingerprint,'unverändert zur v7-Reviewherkunft'],
 ['Nativer Update-reviewHash',input.nativeOriginalReview.reviewHash,'Updateadapter; kein ProductGroup-planHash'],
 ['Shop-/Binding-Planhash',r.plan.planHash,'tatsächlicher Main-v2-Operatorplan'],
 ['Pricing-Planhash',r.plan.pricingPlanHash,'tatsächlicher Preisplan'],
 ['Operator-Planfreigabe',w.zustimmung.approvalHash,'Operatorpin; Originaldatei nicht geliefert'],
 ['Dokumenthash Revision 2',n.dokument,'natives ID-Binding-Hashverfahren'],
 ['Metadatenhash Revision 2',n.metadaten,'Operatorpin'],
 ['Historische Preisverträge R1',808,'unverändert laut Operator'],
 ['Neue Preisverträge R2',778,'vollständig; kein null laut Operator'],
 ['Katalogfreigabe R2',778,'30 Restvarianten dort nicht freigegeben'],
 ['Historische Katalogfreigabe R1',808,'vollständig erhalten laut Operator'],
 ['Einstieg',input.product.customization.value,'historischer Alias erhalten; konfi'],
 ['Hauptbild H1',id(input.product.featuredMedia.id),'beide vorhandenen Medien erhalten'],
 ['Steuer / Preise','Brutto inklusive 19 % MwSt.','bestätigte Beträge; kein neuer Preisvorschlag'],
 ['Mengenstaffel','ab 3 / 5 / 10 Stück: 5 / 10 / 15 %','vollständiger Stückpreis'],
 ['Uploads','Foto AN; SVG-Logo AN','bestehende Nutzerentscheidung'],
 ['Motiv / Foto / SVG-Logo','1,69 / 9,99 / 12,99 EUR','nativer Preisvertrag laut Operator'],
 ['Abschluss Schreibfenster',w.ende,'Operatorbericht; kein noch offener Lock'],
 ['Native Ergebnisprüfung',w.pruefungenGruen,'Operatorbericht'],
 ['Journaleinträge',w.journalEintraege,'started/done-Paare; Fenster geschlossen'],
 ['Unabhängiger Shopvergleich','808/808 Preise, Optionen und SKUs','17 vollständige Seiten; 0 Abweichungen'],
 ['Aktenzweck','Abschlussnachweis; kein Import/Reimport','alle früheren Blätter bleiben erhalten']
];
const sourceRows=[
 ['Vorgängerakte',path.basename(input.previous.path),'v7 enthält unveränderte Review-/Kopienhistorie'],
 ['Vorgängerakte SHA256',input.previous.sha256,'Dateibytes'],
 ['Originalpreisakte',path.basename(input.original.path),'unveränderte Quelle'],
 ['Originalpreisakte SHA256',input.original.sha256,'kein neuer creationKey'],
 ['Freigabequelle',input.approval.source,'tatsächliche Nutzerzustimmung'],
 ['Ergebnisquelle',input.receiptProvenance.comment,'Commit '+input.receiptProvenance.commit],
 ['Empfangener Kurzbericht SHA256',input.receiptProvenance.sha256,'8507 Bytes; Original-Gitdatei'],
 ['Voller Serverbeleg SHA256',w.beleg.sha256,String(w.beleg.bytes)+' Bytes; nicht geliefert'],
 ['Privater Gesamtplan SHA256',r.plan.planJson.sha256,String(r.plan.planJson.bytes)+' Bytes; nicht geliefert'],
 ['Binding-Rückvergleich SHA256',w.apply.bindingReadbackSha256,'Operatorpin; Einzelrecords nicht geliefert'],
 ['Commerce-Rückvergleich SHA256',w.apply.commerceSha256,'Operatorpin; eigenes Hashverfahren'],
 ['Preisfeld SHA256',r.readback.shopify.preisfeld.sha256,'3898 Bytes; Owner-App-Operatorbeleg'],
 ['Preisfeld CompareDigest',r.readback.shopify.preisfeld.compareDigestNeu,'Operatorpin; kein Connector-Abwesenheitsbeweis'],
 ['Native Updatebeleg SHA256',n.beleg.sha256,String(n.beleg.bytes)+' Bytes; nicht geliefert'],
 ['Historische R1-Verträge SHA256',r.readback.nativ.historischeVertraege.sha256,'808 laut Operator unverändert'],
 ['Aktive Function-Version',r.plan.function.releaseId,'Operatorbeobachtung '+r.plan.function.observedAt],
 ['Fertigungsprofil','kein gesonderter Pin / null','unveränderte R1-/R2-Quelle'],
 ['Geschützte Altprodukte',16,'alle weiterhin ACTIVE; Vergleich ohne Abweichung'],
 ['Altprodukt-Vergleichsumfang','zurückgegebene Produktfelder','Inventarmengen/nicht abgefragte Metafelder ausgenommen'],
 ['Beleggrenze','Kein Browser-, Warenkorb- oder Produktionslauf','diese Akte dokumentiert Ausführung und Rückvergleich'],
 ...input.sources.filter(p=>!p.path.includes('/received/')).map(p=>[path.basename(p.path),p.sha256,'Datei-SHA256; siehe Paketmanifest']),
 ['Vorherige Akten','Review-/Kopienangaben bleiben als Historie','keine alte Aussage still überschrieben'],
 ['Nachtrag','Keine erneute Produktfreigabe erforderlich','kein neuer Import-/Ausführungsauftrag']
];
const options=(v,name)=>v.selectedOptions.find(o=>o.name===name)?.value??'';
const variantHeaders=['Shopify-Varianten-ID','Form und Größe','Farbe','Befestigung','Vorher EUR','Ist EUR','Differenz EUR','Bindungsrev.','SKU'];
const variantRows=input.variants.map(v=>[id(v.id),options(v,'Form & Größe'),options(v,'Farbe'),options(v,'Befestigung'),v.beforeCents/100,v.unitCents/100,(v.unitCents-v.beforeCents)/100,v.reportedBindingRevision,v.sku]);
const specs=[{name:'AusfuehrungV8',title:'Hauptprodukt Acrylglas – tatsächlicher Abschluss',subtitle:'Bestehendes Produkt aktualisiert. 808 Varianten erhalten; Shopify bleibt DRAFT. Dieser Nachtrag löst keinen Import aus.',headers,body:execRows,widths:[265,795,400],headerRow:7,renderRanges:['A1:C28','A29:C'+(7+execRows.length)]},{name:'Varianten808',title:'Alle 808 bestehenden Varianten nach Ausführung',subtitle:'Preise und Optionen unabhängig aus Shopify gelesen. Bindungsrevisionen gemäß zugeordneter Operatorabdeckung: 778 × R2, 30 × R1. Alle Preise brutto inklusive 19 % MwSt.',headers:variantHeaders,body:variantRows,widths:[220,280,125,285,105,105,120,130,415],headerRow:7,renderRanges:['A1:I22','A777:I799','A800:I815']},{name:'BelegeV8',title:'Herkunft, Ausführungsbelege und Prüfgrenzen',subtitle:'Gelieferter Kurzbericht, private Serverpins und unabhängiger Shop-Rückvergleich sind getrennte Belegarten.',headers,body:sourceRows,widths:[280,800,440],headerRow:7,renderRanges:['A1:C25','A26:C'+(7+sourceRows.length)]}];
const wb=Workbook.create();for(const spec of specs){const s=wb.worksheets.add(spec.name),cols=spec.headers.length,last=String.fromCharCode(64+cols),end=spec.headerRow+spec.body.length;s.showGridLines=false;s.tabColor='#155765';s.getRange('A1:'+last+(end+2)).format={font:{name:'Arial',size:11,color:'#172D35'},verticalAlignment:'center',rowHeightPx:30};s.getRange('A1:'+last+(end+2)).setNumberFormat('@');spec.widths.forEach((w,i)=>s.getRangeByIndexes(0,i,end+2,1).format.columnWidthPx=w);s.getRange('A2').values=[[spec.title]];s.getRange('A2').format={font:{name:'Arial',size:16,bold:true,color:'#155765'},rowHeightPx:38};s.getRange('A4:'+last+'5').merge();s.getRange('A4').values=[[spec.subtitle]];s.getRange('A4:'+last+'5').format={wrapText:true,fill:'#EAF1F3'};s.getRange('A'+spec.headerRow+':'+last+spec.headerRow).values=[spec.headers];s.getRange('A'+spec.headerRow+':'+last+spec.headerRow).format={fill:'#155765',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true,rowHeightPx:38};s.getRange('A'+(spec.headerRow+1)+':'+last+end).values=spec.body;s.freezePanes.freezeRows(spec.headerRow);if(spec.name==='Varianten808'){s.getRange('E8:G'+end).setNumberFormat('0.00');s.getRange('H8:H'+end).setNumberFormat('0');s.getRange('A786:I815').format.fill='#EAF1F3';}else{s.getRange('A8:A'+end).format.font.bold=true;for(const [i,row]of spec.body.entries())if(typeof row[1]==='number')s.getRange('B'+(i+8)).setNumberFormat('0');}}
wb.recalculate();for(const spec of specs){const inspect=await wb.inspect({kind:'table',range:spec.name+'!A7:'+String.fromCharCode(64+spec.headers.length)+'18',include:'values,formulas',tableMaxRows:12,tableMaxCols:spec.headers.length,maxChars:5000});await fs.writeFile(path.join(out,spec.name+'.inspection.jsonl'),inspect.ndjson,{flag:'wx'});}
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},summary:'new appendix formula error scan'});await fs.writeFile(path.join(out,'errors.jsonl'),errors.ndjson,{flag:'wx'});
const appendix='main-v8-new-sheets.appendix.xlsx';await(await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,appendix));
const record={group:'main-acrylic-existing',output:input.output,previous:input.previous,originalExcel:input.original,appendix,appendixSha256:sha(await fs.readFile(path.join(out,appendix))),sheets:specs,variantRows:input.variants};
await fs.writeFile(path.join(out,'appendix-index.json'),JSON.stringify({schema:'issue230-main-v8-appendix-build/v1',purpose:input.purpose,inputSha256:sha(inputBytes),approval:input.approval,receiptProvenance:input.receiptProvenance,sources:input.sources,records:[record]},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({appendices:1,sheets:3,variants:808,allWritten:true}));
