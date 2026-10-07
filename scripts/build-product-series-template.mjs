// Run with the bundled Node runtime from a scratch directory whose node_modules
// junction points to the bundled packages. No runtime dependencies enter the repo.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {IMPORT_COLUMNS,DESIGN_COLUMNS} from '../app/workshop/batch.mjs';

const require=createRequire(path.join(process.cwd(),'package.json'));
const {Workbook,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.join(repo,'app/workshop/templates/produktserie.xlsx');
const scratch=path.resolve(process.env.TEMPLATE_PREVIEW_DIR||process.cwd());
const headers=[...IMPORT_COLUMNS];
assert.equal(headers.length,23);
const example=['beispiel-001','Mein erstes Acrylglasbild',null,null,null,null,null,'Unser Anfang','Anna & Lukas','Am See in Hamburg','14.06.2020','Hier begann unser Wir.',null,null,null,null,null,null,null,null,null,null];
example.push(null); // Optional per-row source folder.
const wb=Workbook.create();
const products=wb.worksheets.add('Produkte');
const designs=wb.worksheets.add('Designs');
designs.showGridLines=false;
designs.getRange('A1:H101').format={font:{name:'Arial',size:11,color:'#263C34'},rowHeight:28,wrapText:true,fill:'#FFF4D8'};
designs.getRange('A1:H1').values=[[...DESIGN_COLUMNS]];
designs.getRange('A1:H1').format={fill:'#245C48',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'}};
designs.getRange('A2:H101').setNumberFormat('@');
designs.getRange('E2:E101').setNumberFormat('0');designs.getRange('G2:G101').setNumberFormat('0');
[26,28,36,40,18,22,22,40].forEach((width,i)=>designs.getRangeByIndexes(0,i,101,1).format.columnWidth=width);
designs.freezePanes.freezeRows(1);designs.freezePanes.freezeColumns(2);
designs.tables.add('A1:H101',true,'Designzuordnungen').style='TableStyleLight1';
const settings=wb.worksheets.add('Einstellungen');
settings.getRange('A1:B3').values=[['key','value'],['schema_version','1'],['design_root','']];
settings.getRange('A1:B3').format={font:{name:'Arial',size:11,color:'#26323C'},rowHeight:28};
settings.getRange('A1:B1').format={fill:'#3E4B57',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'}};
settings.getRange('B2:B3').setNumberFormat('@');
settings.getRange('A1:A3').format.columnWidth=26;settings.getRange('B1:B3').format.columnWidth=70;
settings.freezePanes.freezeRows(1);
const guide=wb.worksheets.add('Anleitung');
const ink='#263C34',green='#245C48',amber='#FFF4D8',muted='#5A6860';

products.showGridLines=false;
products.tabColor=green;
products.getRange('A1:W102').format={font:{name:'Arial',size:11,color:ink},verticalAlignment:'center',rowHeight:27};
products.getRange('A1:W1').values=[headers];
products.getRange('A2:W2').values=[example];
products.getRange('A2:E102').setNumberFormat('@');
products.getRange('H2:N102').setNumberFormat('@');
products.getRange('O2:O102').setNumberFormat('@');
products.getRange('P2:P102').setNumberFormat('0');
products.getRange('P2:P102').format.horizontalAlignment='right';
products.getRange('Q2:R102').setNumberFormat('@');
products.getRange('F2:G102').setNumberFormat('0.00');
products.getRange('S2:S102').setNumberFormat('0.00');
products.getRange('T2:U102').setNumberFormat('@');products.getRange('V2:V102').setNumberFormat('0');
products.getRange('W2:W102').setNumberFormat('@');
products.getRange('F2:G102').format.horizontalAlignment='right';
products.getRange('A2:W102').format.fill=amber;
products.getRange('A2:W2').format.fill='#E3EEE7';
products.getRange('A2:W2').format.rowHeight=44;
products.getRange('A2:W102').format.wrapText=true;
products.getRange('A1:W1').format={fill:green,font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:37,wrapText:false,horizontalAlignment:'center',verticalAlignment:'center',borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
const widths=[23,36,27,23,27,25,25,27,27,34,20,36,39,62,40,21,36,23,25,18,46,24,40];
widths.forEach((width,i)=>{products.getRangeByIndexes(0,i,102,1).format.columnWidth=width;});
const table=products.tables.add('A1:W102',true,'Produktserie');
table.style='TableStyleLight1';
table.showFilterButton=true;
products.freezePanes.freezeRows(1);
products.freezePanes.freezeColumns(2);

guide.showGridLines=false;
guide.tabColor='#B8C7BE';
guide.getRange('A1:B42').format={font:{name:'Arial',size:11,color:ink},verticalAlignment:'center',rowHeight:27};
guide.getRange('A1:A42').format.columnWidth=28;
guide.getRange('B1:B42').format.columnWidth=112;
guide.getRange('A2').values=[['Gravuru 2027 · Produktserie']];
guide.getRange('A2').format.font={name:'Arial',size:17,bold:true,color:green};
guide.getRange('A2:B2').format.rowHeight=33;
guide.getRange('A3:B3').format.borders={bottom:{style:'thin',color:green}};
const intro=[
 ['Prinzip','create oder leer: neu aus Master. update: vorhandene Produkt-ID und erwarteten Stand verwenden, Master-Spalten leer. Leere Werte bleiben bei Aktualisierung erhalten.'],
 ['Master übernehmen','Die ausgewählte Mastervorlage liefert Designs, Optionen, Schriften und unveränderte Inhalte. Nur für Neuanlagen erforderlich; Updates verwenden product_id und expected_revision.'],
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
 ['name','Bei Neuanlage Pflichtfeld. Bei update bleibt ein leerer Name unverändert.'],
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
 ['design_file','Optional. Exakter SVG-/PDF-Dateiname oder relativer Pfad im ausgewählten Ordner/ZIP, z. B. klein/Design.svg. Bei Ordnerauswahl Hauptordner weglassen; im ZIP enthaltene Hauptordner beibehalten. Groß-/Kleinschreibung beachten.'],
 ['design_page','Optional. PDF-Seite als ganze Zahl ab 1. Leer nimmt Seite 1. Für SVG immer 1. Dieselbe PDF kann in mehreren Produktzeilen mit unterschiedlichen Seiten verwendet werden.'],
 ['design_id','Optional. ID des zu ersetzenden Designs im Master. Leer verwendet dessen Standarddesign. Alle anderen Designs bleiben erhalten. Nur zusammen mit design_file ausfüllen.'],
 ['design_fit','Acrylvorlage: visible oder original. Freie Formen: original (Standard) oder contain (proportional einpassen). Vollflächiger Druck benötigt eine Datei im passenden Formmaß; freie Ränder werden nicht automatisch gefüllt.'],
 ['price_eur','Freie Formprodukte: Grundpreis in Euro. Leer behält den bisherigen Wert.'],
 ['action','Leer/create: Neuanlage aus Master. update: bestehendes Produkt aktualisieren.'],
 ['product_id','Bei update: vorhandene cfg_-Produkt-ID. Master-Spalten leer lassen.'],
 ['expected_revision','Bei update: erwarteter aktueller Stand als ganze Zahl. Leere Änderungsfelder bleiben erhalten. Je Änderung neuer import_key, bei Wiederholung gleicher Schlüssel.']
];
guide.getRange('A14:B35').values=descriptions;
guide.getRange('A14:A35').format.font={name:'Arial',size:11,bold:true,color:ink};
guide.getRange('B14:B35').format.wrapText=true;
guide.getRange('A14:B35').format.rowHeight=43;
guide.getRange('A28:B35').format.rowHeight=56;
for(let row=14;row<=35;row+=2)guide.getRange(`A${row}:B${row}`).format.fill='#F1F5F1';
guide.getRange('A36:B40').values=[
 ['Eurozahlen','Excel kann je nach Sprache 14,99 anzeigen. Der Zellwert bleibt eine Zahl in Euro; keine Centbeträge wie 1499 eintragen.'],
 ['Aktueller Umfang','Freie Formprodukte übernehmen Kontur, Material, Stärke, Verfahren und Szene. price_eur ersetzt ihren Grundpreis. Alte Acrylvorlagen behalten ihre zwei Preise und Textspalten. Designersatz entfernt nur die Kundenfelder des ersetzten Formdesigns.'],
 ['Dateien auswählen','SVG/PDF-Dateien einzeln, als Ordner oder ZIP auswählen. Pfade in design_file mit / angeben. Nur referenzierte Designs werden beim Prüfen hochgeladen. Bis 100 Designs je 15 MB; ZIP bis 50 MB, insgesamt 150 MB entpackt.'],
 ['Feste Gestaltung','Mit design_file die Spalten heading, names, place, date und slogan leer lassen. Sonst wird die Zeile abgelehnt. Texte und Fotos der importierten Datei werden nicht automatisch zu bearbeitbaren Kundenfeldern.'],
 ['Dateiquellen','Relative Pfade verwenden; keine absoluten Pfade, .. oder Links. ZIP ohne Passwort, Standardkompression und UTF-8-Namen. Gleiche vollständige Pfade aus mehreren Quellen werden abgewiesen. Kein automatischer Ordner-/Drive-Abruf.']
];
guide.getRange('A36:A40').format.font={name:'Arial',size:11,bold:true,color:muted};
guide.getRange('B36:B40').format.font={name:'Arial',size:11,color:muted};
guide.getRange('B36:B40').format.wrapText=true;
guide.getRange('A36:B40').format.rowHeight=56;

guide.getRange('A43:B48').values=[["Designs · Zuordnung", "Optionales Blatt für mehrere Designs innerhalb eines freien Formprodukts. import_key muss im Blatt Produkte vorhanden sein. Höchstens 30 Designs pro Produkt (einschließlich erhaltener Designs)."], ["Designs · Felder", "design_id ist erforderlich: vorhandene ID ersetzen, neue ID ergänzen. design_name ist optional. design_file ist der exakte SVG/PDF-Dateiname oder relative Unterordnerpfad. design_page ab 1, leer = 1; design_fit original oder contain."], ["Designs · Standard", "default_design: leer/0 oder genau einmal 1 pro Produkt. Ohne 1 bleibt das bisherige Standarddesign erhalten, bei leerer Vorlage wird das erste neue Design verwendet."], ["Designs · Bestand", "Nicht zugeordnete Designs bleiben erhalten. Kundenfelder nur des ersetzten Designs entfallen und müssen ausdrücklich neu zugeordnet werden. Keine automatische Text-/Fotoerkennung."], ["Designs · Prüfung", "Die Designspalten im Blatt Produkte für dieses Produkt leer lassen. Fehler einer Designzeile blockieren das gesamte zugehörige Produkt. Unbekannte import_key stoppen die Prüfung. Bis 3000 Designzeilen und insgesamt 100 eindeutige Datei-/Seitenzuordnungen."], ["Designs · Grenzen", "Nur freie Formprodukte. Keine neue Material-/Größenvariante; alle Designs gehören zur gleichen Produktkontur. CSV unterstützt weiterhin die einzelne Dateizuordnung im Blatt Produkte."]];
guide.getRange('A43:B48').format={font:{name:'Arial',size:11,color:ink},wrapText:true,rowHeight:66};
for(const row of [28,38,40])guide.getRange(`A${row}:B${row}`).format.rowHeight=88;
guide.getRange("A44:B44").format.rowHeight=76;
wb.recalculate();
assert.deepEqual(products.getRange('A1:W1').values[0],headers);
assert.deepEqual(products.getRange('A2:W2').values[0],example);
assert(products.getRange('A3:V102').values.flat().every(value=>value===null||value===''));
assert(products.getRange('A1:W102').formulas.flat().every(value=>!value));
guide.getRange('A50:B52').values=[['Gemeinsamer Quellordner','Im Blatt Einstellungen design_root einmal eintragen, z. B. Kollektion. Leer = Auswahlwurzel. schema_version ist 1. design_file wird relativ dazu aufgelöst.'],['design_folder','Optionale letzte Spalte in Produkte und Designs: ersetzt den gemeinsamen Ordner für genau diese Zeile. Leer übernimmt design_root; . bedeutet Auswahlwurzel. Unterordner in design_file werden angehängt. Keine Vererbung von Produkte nach Designs.'],['Quellen & Wiederaufnahme','Ordner/ZIP weiterhin bewusst auswählen; keine automatische Dateisuche. Prüfbericht, Korrekturdatei und gespeicherte Prüfung behalten die Ordnerangaben. CSV nutzt design_folder ohne gemeinsame Einstellungen.']];
guide.getRange('A50:B52').format={font:{name:'Arial',size:11,color:ink},wrapText:true,rowHeight:76};
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
console.log(JSON.stringify({destination,deliverable,columns:headers.length,blankInputRows:100,sheets:4,exampleRows:1,formulas:0}));
