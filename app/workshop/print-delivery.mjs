import {printPDF} from '../configurator/variant-m/print-export-model.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {inflateSync,deflateSync} from 'node:zlib';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'print_delivery'});};
// #265, ENTSCHEIDUNGEN 3.61 und 3.62: Die Bestellansicht führt je Fläche genau zwei Dateien – PDF und SVG –, bei allen Produkten
// immer mit Kontur. Ihr Aufbau folgt der Musterdatei von Chris vom 21.11.2026 („so müssen die dateien aussehen“,
// test-fixtures/musterdatei-gravur-chris-20261121.pdf) und seiner Angabe zum Druck vom selben Tag:
//  - nie gespiegelt, unabhängig vom Fertigungsprofil („Wir drehen es dann in corel draw um“);
//  - Gravur: Inhalt in der Ebene „03 Gravur“ in reinem Schwarz; Konturen als Linie von 0,001 mm: blau zum Anlegen in der
//    Schablone, rot für das, was nach der Gravur geschnitten wird (`orderHoleLines`; form-engraving-worker.py baut die Dateien);
//  - Druck: jede Kontur (Außenform und Ausschnitte) als Linie von 0,001 mm in der Roland-Schmuckfarbe `CutContour` (rosa) –
//    Chris, 17:18 Uhr: „nur beim druck Betsellungen ist es die schnittkontur von roland, sprich rosa, da sonst farbe gedruckt
//    wird“; nie Blau oder Rot. Die Farbe ist sichtbar: Weiß (`RDG_WHITE`) liegt darunter, die Ebenenliste nennt erst Farbe, dann Weiß.
// Die Dateien der Seite „Ausgaben“ bleiben, wie sie sind (dort gilt weiter das Fertigungsprofil samt Spiegelung).
// Dateinachweis v3: Dateien im Aufbau der Musterdatei. Ausgaben mit einem Nachweis davor (v1: vier Dateien nach 3.57; v2: zwei
// Dateien nach 3.61) sind gespiegelt nach Profil und tragen die Kontur in anderer Farbe und Breite – sie werden über die
// Bestellansicht nicht mehr abgegeben. Der Auftrag mit dem heutigen Rezeptstand entsteht beim Öffnen der Position von selbst;
// bis er fertig ist, nennt der Hinweis den Stand („werden neu erstellt“).
export const ORDER_FILES_SCHEMA='gravuru-order-files/v3';
export const ORDER_FORMATS=Object.freeze(['pdf','svg']);
export const ORDER_LINE_MM=0.001;
// Gravur – welche Linie die Innenkonturen (Bohrungen, Ausschnitte) einer Platte in der Bestelldatei bekommen. Die einzige Stelle
// dieser Regel; der Gravur-Worker zeichnet nur, was hier steht ('cut' = rot, 'contour' = blau, 'omit' = nicht gezeichnet).
// Chris, 21.11.2026, 17:17 Uhr: „blaue linien sind nur für die konturen , damit man es in den schablonen anlegen kann. bei
// schildern aus acrylglas gibt es ausnahmen, weil da die löcher im anschliss der gravur geschnitten werden und daher rot
// benötigen“. Die Außenkontur ist bei allen Produkten blau (Anlegen). Bei Acrylglas werden die Löcher nach der Gravur
// geschnitten: rot. Maßgeblich ist das Material der Platte, die die Gravur trägt – beim nativen Produkt `material.kind`, beim
// Formprodukt alter Art `material.id` (FORM_MATERIALS: `acrylic-…`), bei der zweischichtigen Funkklingel die Acrylauflage.
// ANNAHME, von Chris nicht gesagt: Bei allen anderen Materialien bleiben die Innenkonturen als blaue Anlegelinie in der Datei
// (3.61: Konturen immer enthalten), geschnitten wird dort nichts. Sagt Chris „weglassen“, genügt hier 'omit'.
export const ORDER_HOLES_ACRYLIC='cut',ORDER_HOLES_OTHER='contour';
const isAcrylic=material=>material?.kind==='acrylic'||/^acrylic-/.test(material?.id??'');
export const orderHoleLines=({manifest,doorbellLayers=null})=>doorbellLayers||isAcrylic(manifest?.product?.material)?ORDER_HOLES_ACRYLIC:ORDER_HOLES_OTHER;
// Gravur – welche Platte die Seite der Bestelldatei ist („Seite = Plattenmaß“ wie in der Musterdatei). Sonst das ganze Format
// (`null`). Bei der zweischichtigen Funkklingel trägt die Acrylauflage die Gestaltung; sie kann kleiner sein als das gemeinsame
// Format von Träger und Auflage (Rahmen sichtbar). Die Musterdatei ist so eine Auflage: 160 × 260 mm im Format 16 × 28 cm.
export const orderPlate=({doorbellLayers=null})=>{const a=doorbellLayers?.acrylicBoundsMm;return a?{x:a.x,y:a.y,width:a.width,height:a.height}:null;};
// Was der Gravur-Worker für die Bestelldateien einer Vorderseite wissen muss (form-engraving-worker.py `orderFiles`).
export const orderEngravingFiles=artwork=>{const plate=orderPlate(artwork);return {holes:orderHoleLines(artwork),...(plate?{plate}:{})};};
// `CutContour` hat in der Druck-PDF die Ersatzfarbe 100 % Magenta (print-export-model.mjs). SVG kennt keine Schmuckfarben;
// dort steht dieselbe Farbe als RGB, die Gruppe heißt wie die Schmuckfarbe.
export const CUT_CONTOUR_RGB='#ff00ff';
const xml=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Druck-SVG der Bestellansicht: die gesicherte Gestaltung (seitenrichtig) plus Schnittkontur als letzte Gruppe. Wie in der
// Druck-PDF führt die Kontur alle Ringe der Form (Außenform und Ausschnitte) in der einen Schnittfarbe.
export function printSvgWithContour(svg,geometry){
 const end=svg.lastIndexOf('</svg>');
 if(end<0||svg.slice(end+6).trim())fail('Die Gestaltung lässt sich nicht mit Kontur ausgeben.');
 const group=`<g id="CutContour" data-layer="CutContour" fill="none" stroke="${CUT_CONTOUR_RGB}" stroke-width="${ORDER_LINE_MM}"><path d="${xml(geometry.contours.map(c=>c.d+' Z').join(' '))}"/></g>`;
 return svg.slice(0,end)+group+svg.slice(end);
}
export const orderFileSet=(id,files)=>({id,files:Object.fromEntries(ORDER_FORMATS.map(format=>{const [name,bytes]=files[format];return [format,{name,sha256:digest(bytes)}];}))});
// Der Druck-Worker liefert bei gespiegeltem Profil drei Felder zeilenweise gespiegelt (form-print-worker.py: `np.flip(axis=1)`
// für Farbe samt Deckung, erlaubtes Weiß und Weißdeckung); Schriftpfade und Bildebenen bleiben seitenrichtig und werden erst in
// printPDF gespiegelt. Für die Bestelldatei wird genau diese Spiegelung der drei Felder zurückgenommen.
function unmirrored(pixels){
 const {width,height}=pixels,flip=(source,channels)=>{
  if(!source)return source;
  const row=width*channels,target=new Uint8Array(source.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<channels;c++)target[y*row+(width-1-x)*channels+c]=source[y*row+x*channels+c];
  return target;
 };
 return {...pixels,rgb:flip(pixels.rgb,3),alpha:flip(pixels.alpha,1),whiteAllowed:flip(pixels.whiteAllowed,1),whiteAlpha:flip(pixels.whiteAlpha,1)};
}
// printPDF zeichnet die Haarlinie der Schnittkontur mit Breite 0 (Geräte-Haarlinie). Die Musterdatei von Chris führt Konturen
// mit 0,001 mm; dieselbe Breite gilt für die Druckkontur. Geändert wird nur diese eine Angabe im Seiteninhalt – print-export-
// model.mjs bleibt unberührt, damit die Editor-Pakete gleich bleiben. printPDF schreibt die Objekte fortlaufend mit einer
// Querverweistabelle; jedes andere Objekt wird Byte für Byte übernommen.
const CUT_DEVICE_HAIRLINE='/Cut CS 1 SCN 0 w\n',CUT_ORDER_LINE=`/Cut CS 1 SCN ${ORDER_LINE_MM} w\n`;
export function withOrderCutLine(pdf){
 const text=pdf.toString('latin1'),tail=/\nxref\n0 (\d+)\n((?:\d{10} \d{5} [fn] \n)+)trailer\n<< \/Size \d+ \/Root (\d+) 0 R >>\nstartxref\n(\d+)\n%%EOF$/.exec(text);
 if(!tail||Number(tail[4])!==tail.index+1||!text.startsWith('%PDF-1.7\n'))fail('Die Druckdatei hat nicht den erwarteten Aufbau.');
 const offsets=tail[2].trim().split('\n').slice(1).map(line=>Number(line.slice(0,10))),end=tail.index+1,objects=[];let changed=0;
 if(offsets.length!==Number(tail[1])-1||offsets.some((offset,i)=>offset<=(offsets[i-1]??0)||offset>=end))fail('Die Druckdatei hat nicht den erwarteten Aufbau.');
 offsets.forEach((offset,i)=>{
  let object=pdf.subarray(offset,offsets[i+1]??end);
  const head=/^(\d+) 0 obj\n<<  \/Filter \/FlateDecode \/Length (\d+) >>\nstream\n/.exec(object.subarray(0,120).toString('latin1'));
  if(head&&Number(head[1])===i+1){
   const data=object.subarray(head[0].length,head[0].length+Number(head[2]));let content;
   try{content=inflateSync(data).toString('latin1');}catch{content='';}
   if(content.includes(CUT_DEVICE_HAIRLINE)){
    if(content.split(CUT_DEVICE_HAIRLINE).length!==2)fail('Die Druckdatei führt die Schnittkontur nicht genau einmal.');
    const packed=deflateSync(Buffer.from(content.replace(CUT_DEVICE_HAIRLINE,CUT_ORDER_LINE),'latin1'));
    object=Buffer.concat([Buffer.from(`${i+1} 0 obj\n<<  /Filter /FlateDecode /Length ${packed.length} >>\nstream\n`,'latin1'),packed,Buffer.from('\nendstream\nendobj\n','latin1')]);changed++;
   }
  }
  objects.push(object);
 });
 if(changed!==1)fail('Die Druckdatei führt die Schnittkontur nicht genau einmal.');
 const parts=[Buffer.from('%PDF-1.7\n','latin1')],positions=[];let count=parts[0].length;
 for(const object of objects){positions.push(count);parts.push(object);count+=object.length;}
 parts.push(Buffer.from(`xref\n0 ${positions.length+1}\n0000000000 65535 f \n${positions.map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${positions.length+1} /Root ${tail[3]} 0 R >>\nstartxref\n${count}\n%%EOF`,'latin1'));
 return Buffer.concat(parts);
}
// Both separations are rendered from the same frozen geometry and pixel arrays.
// `orderFiles` (#265, ENTSCHEIDUNGEN 3.61/3.62): zusätzlich die „PDF“ der Bestellansicht – derselbe Aufbau wie die Druckdatei
// (Farbe sichtbar über Weiß; bei Mimaki bleibt Weiß wie heute die eigene Datei), aber seitenrichtig und mit der Schnittkontur
// als Linie von 0,001 mm in `CutContour`. Ohne den Schalter entsteht nichts Neues.
export async function printDelivery(input,{orderFiles=false}={}){
 const mimaki=input.settings.profile==='mimaki',kind=mimaki?'color-cut':'combined';
 const pdf=Buffer.from(await (await printPDF({...input,kind})).arrayBuffer());
 const name=mimaki?'Mimaki-FARBE-ohne-RDG_WHITE.pdf':'Roland-RDG_WHITE-CutContour.pdf';
 const downloads={pdf:{name,sha256:digest(pdf)}},extras=[];
 if(mimaki&&input.settings.white!=='none'){
  const white=Buffer.from(await (await printPDF({...input,kind:'white-spot-cut'})).arrayBuffer());
  downloads.white={name:'Mimaki-NUR-RDG_WHITE.pdf',sha256:digest(white)};
  extras.push({name:downloads.white.name,blob:new Blob([white])});
 }
 if(!orderFiles)return {pdf,downloads,extras};
 const plain=input.settings.mirror?{...input,settings:{...input.settings,mirror:false},pixels:unmirrored(input.pixels)}:input;
 return {pdf,downloads,extras,order:{pdf:withOrderCutLine(Buffer.from(await (await printPDF({...plain,kind,cut:'hairline'})).arrayBuffer()))}};
}
// #265, ENTSCHEIDUNGEN 3.61/3.62: Datei der Bestellansicht aus dem gesicherten Ausgabepaket. Wie bei der Weißdatei muss die
// Prüfsumme der ausgelieferten Bytes zum Dateinachweis des Auftrags passen. Ausgaben ohne den heutigen Dateinachweis führen die
// Dateien nicht: `orderFileSets` ist dann leer, der Download nennt den Grund statt eines Fehlers aus dem Paket.
function orderFileDescriptor(metadata,surface,format){
 const descriptor=metadata?.orderFiles?.schema===ORDER_FILES_SCHEMA&&Object.hasOwn(surface.files,format)?surface.files[format]:null;
 return typeof descriptor?.name==='string'&&/^[a-f0-9]{64}$/.test(descriptor.sha256||'')?descriptor:null;
}
export function orderFileSets(metadata){
 const sets=metadata?.orderFiles;
 if(sets?.schema!==ORDER_FILES_SCHEMA||!Array.isArray(sets.surfaces))return [];
 return sets.surfaces.filter(s=>['front','back'].includes(s?.id)&&s.files&&typeof s.files==='object').map(s=>({id:s.id,formats:ORDER_FORMATS.filter(f=>orderFileDescriptor(metadata,s,f))}));
}
export const ORDER_FILE_MISSING='Diese Datei gibt es für die gespeicherte Ausgabe noch nicht. Bitte die Ausgabe für diese Position neu erstellen.';
export const ORDER_FORMAT_REQUIRED='Bitte PDF oder SVG auswählen.';
export function orderDownload(result,format,surfaceId='front'){
 if(!ORDER_FORMATS.includes(format))fail(ORDER_FORMAT_REQUIRED);
 if(!orderFileSets(result?.metadata).find(s=>s.id===surfaceId)?.formats.includes(format))throw Object.assign(Error(ORDER_FILE_MISSING),{status:409,code:'order_file_missing'});
 const descriptor=orderFileDescriptor(result.metadata,result.metadata.orderFiles.surfaces.find(s=>s.id===surfaceId),format);
 if(!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.(?:pdf|svg)$/.test(descriptor.name)||descriptor.name.endsWith('.svg')!==(format==='svg'))fail('Unbekannte Datei im Ausgabeauftrag.');
 let files;try{({files}=readReviewPackage(result.archive,digest(result.archive),[...NATIVE_REVIEW_SCHEMAS,'gravuru-form-review/v1']));}catch{fail('Das gespeicherte Ausgabepaket ist unvollständig oder verändert.');}
 const bytes=files.get(descriptor.name);
 if(!bytes||digest(bytes)!==descriptor.sha256)fail('Die gespeicherte Datei ist unvollständig oder verändert.');
 return {bytes,suffix:descriptor.name,mime:format==='svg'?'image/svg+xml':'application/pdf',sha256:descriptor.sha256};
}
export function outputFormats(result){return ['pdf','zip',...(result?.metadata.downloads?.white?['white-pdf']:[])];}
export function outputDownload(result,format){
 if(!outputFormats(result).includes(format))fail('Für diesen gespeicherten Auftrag gibt es keine separate Weiß-PDF. Bitte einen neuen Mimaki-Auftrag mit Weißunterlegung anlegen.');
 if(format==='zip')return {bytes:result.archive,suffix:'alle-daten.zip',mime:'application/zip'};
 if(format==='pdf')return {bytes:result.pdf,suffix:result.metadata.downloads?.pdf?.name||'pruefausgabe.pdf',mime:'application/pdf'};
 const descriptor=result.metadata.downloads.white;
 if(!/^Mimaki-NUR-RDG_WHITE(?:-vorderseite)?\.pdf$/.test(descriptor.name))fail('Unbekannte Weißdatei im Ausgabeauftrag.');
 // Das Manifest des Fertigungspakets führt auch die Produktionsdateien mit sha256; eine
 // Abweichung dort ist dieselbe Verletzung wie ein abweichender Dateinachweis.
 let files;try{({files}=readReviewPackage(result.archive,digest(result.archive),result.metadata.sourceReviewSchema));}catch{fail('Das gespeicherte Ausgabepaket ist unvollständig oder verändert.');}
 const bytes=files.get(descriptor.name);
 if(!bytes||digest(bytes)!==descriptor.sha256)fail('Die gespeicherte Weißdatei ist unvollständig oder verändert.');
 return {bytes,suffix:descriptor.name,mime:'application/pdf'};
}
