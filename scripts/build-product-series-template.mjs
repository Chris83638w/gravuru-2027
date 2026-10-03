// Run with the bundled Node runtime from a scratch directory whose node_modules
// junction points to the bundled packages. No runtime dependencies enter the repo.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {IMPORT_COLUMNS} from '../app/workshop/batch.mjs';

const require=createRequire(path.join(process.cwd(),'package.json'));
const {Workbook,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.join(repo,'app/workshop/templates/produktserie.xlsx');
const scratch=path.resolve(process.env.TEMPLATE_PREVIEW_DIR||process.cwd());
const headers=[...IMPORT_COLUMNS];
assert.equal(headers.length,18);
const example=['beispiel-001','Mein erstes Acrylglasbild',null,null,null,null,null,'Unser Anfang','Anna & Lukas','Am See in Hamburg','14.06.2020','Hier begann unser Wir.',null,null,null,null,null,null];
const wb=Workbook.create();
const products=wb.worksheets.add('Produkte');
const guide=wb.worksheets.add('Anleitung');
const ink='#263C34',green='#245C48',amber='#FFF4D8',muted='#5A6860';

products.showGridLines=false;
products.tabColor=green;
products.getRange('A1:R102').format={font:{name:'Arial',size:11,color:ink},verticalAlignment:'center',rowHeight:27};
products.getRange('A1:R1').values=[headers];
products.getRange('A2:R2').values=[example];
products.getRange('A2:E102').setNumberFormat('@');
products.getRange('H2:N102').setNumberFormat('@');
products.getRange('O2:O102').setNumberFormat('@');
products.getRange('P2:P102').setNumberFormat('0');
products.getRange('P2:P102').format.horizontalAlignment='right';
products.getRange('Q2:R102').setNumberFormat('@');
products.getRange('F2:G102').setNumberFormat('0.00');
products.getRange('F2:G102').format.horizontalAlignment='right';
products.getRange('A2:R102').format.fill=amber;
products.getRange('A2:R2').format.fill='#E3EEE7';
products.getRange('A2:R2').format.rowHeight=44;
products.getRange('A2:R102').format.wrapText=true;
products.getRange('A1:R1').format={fill:green,font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:37,wrapText:false,horizontalAlignment:'center',verticalAlignment:'center',borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
const widths=[23,36,27,23,27,25,25,27,27,34,20,36,39,62,40,21,36,23];
widths.forEach((width,i)=>{products.getRangeByIndexes(0,i,102,1).format.columnWidth=width;});
const table=products.tables.add('A1:R102',true,'Produktserie');
table.style='TableStyleLight1';
table.showFilterButton=true;
products.freezePanes.freezeRows(1);
products.freezePanes.freezeColumns(2);

guide.showGridLines=false;
guide.tabColor='#B8C7BE';
guide.getRange('A1:B39').format={font:{name:'Arial',size:11,color:ink},verticalAlignment:'center',rowHeight:27};
guide.getRange('A1:A39').format.columnWidth=28;
guide.getRange('B1:B39').format.columnWidth=112;
guide.getRange('A2').values=[['Gravuru 2027 · Produktserie']];
guide.getRange('A2').format.font={name:'Arial',size:17,bold:true,color:green};
guide.getRange('A2:B2').format.rowHeight=33;
guide.getRange('A3:B3').format.borders={bottom:{style:'thin',color:green}};
const intro=[
 ['Prinzip','Jede ausgefüllte Zeile im Blatt Produkte legt ein neues Produkt mit den zwei bestehenden Acrylgrößen an.'],
 ['Master übernehmen','Die ausgewählte Mastervorlage liefert Designs, Optionen, Schriften und unveränderte Inhalte. Sie muss vor dem Import gewählt werden.'],
 ['Beispiel & Eingabe','Zeile 2 ist ein ausgefülltes Beispiel. Vor der eigenen Serie ersetzen oder löschen. Zeilen 3–102 sind 100 leere Eingabezeilen; weitere Zeilen können ergänzt werden.'],
 ['Farben','Die grüne Zeile zeigt das Beispiel. Die hellgelben Zellen sind für eigene Eingaben vorgesehen.'],
 ['Leere Felder','Optionale leere Felder übernehmen den Wert der Mastervorlage. name und import_key für jedes neue Produkt ausfüllen.'],
 ['Doppelte Einträge','Für jedes Produkt einen eindeutigen import_key verwenden und bei Wiederholungen beibehalten. Derselbe Schlüssel verhindert die erneute Anlage desselben Produkts.'],
 ['Format beibehalten','Spaltennamen in Zeile 1 und den Blattnamen Produkte unverändert lassen. Keine Titel-, Summen- oder Kommentarzeilen in die Produkttabelle einfügen.']
];
guide.getRange('A5:B11').values=intro;
guide.getRange('A5:A11').format.font={name:'Arial',size:11,bold:true,color:ink};
guide.getRange('B5:B11').format.wrapText=true;
guide.getRange('A5:B11').format.rowHeight=43;
guide.getRange('A7:B7').format.rowHeight=56;
guide.getRange('A13:B13').values=[['Feld','Eingabe und Bedeutung']];
guide.getRange('A13:B13').format={fill:green,font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:29,borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
const descriptions=[
 ['import_key','Pflichtfeld. Eigener stabiler Schlüssel, zum Beispiel liebe-001. Innerhalb der Serie eindeutig; bei einem erneuten Import denselben Schlüssel verwenden.'],
 ['name','Pflichtfeld. Name des neuen Produkts, zum Beispiel Mein erstes Acrylglasbild.'],
 ['master_id','Optional. Leer lassen, um die im Import gewählte Mastervorlage zu verwenden. Eine vorhandene Master-ID kann ausdrücklich angegeben werden.'],
 ['master_revision','Optional. Leer lassen, um die Revision der gewählten Mastervorlage zu übernehmen. Bei ausdrücklicher Angabe die passende Revision verwenden.'],
 ['category_ids','Optional. Vorhandene Kategorie-IDs durch Komma trennen, zum Beispiel liebe,geschenke. Leer übernimmt die Kategorien des Masters.'],
 ['price_small_eur','Optional. Grundpreis für 150 × 200 mm in Euro, zum Beispiel 14.99 als Zahl. Kein €-Zeichen eingeben. Leer übernimmt den Masterpreis.'],
 ['price_large_eur','Optional. Grundpreis für 200 × 266,7 mm in Euro, zum Beispiel 19.99 als Zahl. Sockel- und Wandhalterpreise kommen aus der Mastervorlage.'],
 ['heading','Optional. Text der Überschrift, zum Beispiel Unser Anfang. Leer übernimmt die Vorlage.'],
 ['names','Optional. Namen im Design, zum Beispiel Anna & Lukas. Leer übernimmt die Vorlage.'],
 ['place','Optional. Ortszeile im Design, zum Beispiel Am See in Hamburg. Leer übernimmt die Vorlage.'],
 ['date','Optional. Gedruckte Datumszeile als Text, zum Beispiel 14.06.2020. Diese Spalte ist bewusst als Text formatiert.'],
 ['slogan','Optional. Spruch im Design, zum Beispiel Hier begann unser Wir. Leer übernimmt die Vorlage.'],
 ['seo_title','Optional. SEO-Titel für das neue Produkt. Leer übernimmt den Wert der Mastervorlage.'],
 ['seo_description','Optional. SEO-Beschreibung für das neue Produkt. Leer übernimmt den Wert der Mastervorlage.'],
 ['design_file','Optional. Exakter Dateiname einer im Serienimport ausgewählten SVG/PDF, zum Beispiel Motiv.svg. Groß-/Kleinschreibung beachten. Leer übernimmt alle Designs des Masters.'],
 ['design_page','Optional. PDF-Seite als ganze Zahl ab 1. Leer nimmt Seite 1. Für SVG immer 1. Dieselbe PDF kann in mehreren Produktzeilen mit unterschiedlichen Seiten verwendet werden.'],
 ['design_id','Optional. ID des zu ersetzenden Designs im Master. Leer verwendet dessen Standarddesign. Alle anderen Designs bleiben erhalten. Nur zusammen mit design_file ausfüllen.'],
 ['design_fit','Optional. visible (Standard/leer) passt das Design proportional in die sichtbare Fläche ein. original behält das Originalmaß in mm. Zu große Originalmaße werden als Zeilenfehler gemeldet.']
];
guide.getRange('A14:B31').values=descriptions;
guide.getRange('A14:A31').format.font={name:'Arial',size:11,bold:true,color:ink};
guide.getRange('B14:B31').format.wrapText=true;
guide.getRange('A14:B31').format.rowHeight=43;
guide.getRange('A28:B31').format.rowHeight=56;
for(let row=14;row<=31;row+=2)guide.getRange(`A${row}:B${row}`).format.fill='#F1F5F1';
guide.getRange('A33:B37').values=[
 ['Eurozahlen','Excel kann je nach Sprache 14,99 anzeigen. Der Zellwert bleibt eine Zahl in Euro; keine Centbeträge wie 1499 eintragen.'],
 ['Aktueller Umfang','Die Serie übernimmt den Acrylaufbau und die Varianten des Masters. Ohne design_file können Textwerte geändert werden. Mit design_file wird genau das gewählte Design ersetzt.'],
 ['Dateien auswählen','Im Serienimport neben der Excel-Tabelle alle benötigten SVG/PDF-Dateien gemeinsam auswählen. Dateinamen und PDF-Seiten aus der Tabelle müssen eindeutig zu diesen Dateien passen.'],
 ['Feste Gestaltung','Mit design_file die Spalten heading, names, place, date und slogan leer lassen. Sonst wird die Zeile abgelehnt. Texte und Fotos der importierten Datei werden nicht automatisch zu bearbeitbaren Kundenfeldern.'],
 ['Dateiquellen','Nur Dateinamen eintragen, keine lokalen Pfade oder Drive-Links. Dateien werden hier ausdrücklich ausgewählt und hochgeladen. Automatischer Abruf aus Ordnern oder Drive ist nicht enthalten.']
];
guide.getRange('A33:A37').format.font={name:'Arial',size:11,bold:true,color:muted};
guide.getRange('B33:B37').format.font={name:'Arial',size:11,color:muted};
guide.getRange('B33:B37').format.wrapText=true;
guide.getRange('A33:B37').format.rowHeight=56;

wb.recalculate();
assert.deepEqual(products.getRange('A1:R1').values[0],headers);
assert.deepEqual(products.getRange('A2:R2').values[0],example);
assert(products.getRange('A3:R102').values.flat().every(value=>value===null||value===''));
assert(products.getRange('A1:R102').formulas.flat().every(value=>!value));
console.log((await wb.inspect({kind:'table',range:'Produkte!O1:R3',include:'values,formulas',tableMaxRows:3,tableMaxCols:4,maxChars:1600})).ndjson);
console.log((await wb.inspect({kind:'table',range:'Anleitung!A28:B37',include:'values,formulas',tableMaxRows:10,tableMaxCols:2,maxChars:4300})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!',options:{useRegex:true,maxResults:10},maxChars:1200})).ndjson);
await fs.mkdir(scratch,{recursive:true});
for(const [sheetName,range,name] of [['Produkte','O1:R6','produkte-design-dateien'],['Anleitung','A25:B38','anleitung-design-dateien']]){
 if(process.argv.includes('--products-only')&&sheetName!=='Produkte')continue;
 const preview=await wb.render({sheetName,range,scale:1.2,format:'png'});
 await fs.writeFile(path.join(scratch,name+'.png'),new Uint8Array(await preview.arrayBuffer()));
}
await fs.mkdir(path.dirname(destination),{recursive:true});
// The artifact runtime writes a diagnostic sidecar beside its export. Keep that
// diagnostic in scratch; deliver only the validated workbook to the repository.
const scratchExport=path.join(scratch,'produktserie.xlsx');
await (await SpreadsheetFile.exportXlsx(wb)).save(scratchExport);
await fs.copyFile(scratchExport,destination);
const deliverable=process.env.TEMPLATE_DELIVERABLE;
if(deliverable){await fs.mkdir(path.dirname(deliverable),{recursive:true});await fs.copyFile(scratchExport,deliverable);}
console.log(JSON.stringify({destination,deliverable,columns:headers.length,blankInputRows:100,sheets:2,exampleRows:1,formulas:0}));
