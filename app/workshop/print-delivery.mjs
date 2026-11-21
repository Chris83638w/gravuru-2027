import {printPDF} from '../configurator/variant-m/print-export-model.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'print_delivery'});};
// #265, ENTSCHEIDUNGEN 3.61 (ersetzt die vier Downloads aus 3.57): Die Bestellansicht führt je Fläche genau zwei Dateien – PDF
// und SVG –, und beide enthalten bei allen Produkten immer die Kontur. Dateien ohne Kontur gibt es dort nicht mehr. Die Kontur ist
// die Schablone zum Anlegen und immer eine Haarlinie. In PDF ist das die Breite 0 (form-engraving-worker.py: „PDF width zero is a
// device hairline“). SVG kennt keine Breite 0 (sie wäre unsichtbar); dort gilt die dünnste Angabe, die das Repo für Schnitt- und
// Konturlinien schon verwendet: 0,05 mm (form-engraving-worker.py, doorbell-artwork.mjs, CutContour in print-export-model.mjs).
// Eine Farbregel für alle Produktarten: Funkklingel rot (Schnitt der Acrylauflage, sie trägt die Gestaltung – 3.61),
// Schiefergravur blau, sonst schwarz. Schiefer nennt das native Produkt als `material.kind`, das Formprodukt alter Art als
// `material.id` (FORM_MATERIALS in form-product.mjs).
export const ORDER_FILES_SCHEMA='gravuru-order-files/v2';
export const ORDER_FORMATS=Object.freeze(['pdf','svg']);
// Ausgaben des Rezeptstands davor (3.57) führen je Fläche vier Dateien. Aus ihnen wird nur noch die Fassung mit Kontur
// ausgeliefert: „PDF“ ist dort `pdf-contour`, „SVG“ ist `svg-contour`. So liefern fertige Ausgaben sofort die richtige Datei,
// ohne neu gebaut zu werden; die Dateien ohne Kontur werden über die Bestellansicht nicht mehr abgegeben.
const ORDER_FILES_SCHEMA_V1='gravuru-order-files/v1',V1_SOURCE=Object.freeze({pdf:'pdf-contour',svg:'svg-contour'});
const isSlate=material=>material?.kind==='slate'||material?.id==='slate';
export const contourStroke=(artwork,{engraving=false}={})=>artwork.doorbellLayers?'#ff0000':engraving&&isSlate(artwork.manifest.product.material)?'#0000ff':'#000000';
const xml=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Derselbe Pfad und dieselbe Spiegelung wie die getrennte Konturdatei des Gravur-Workers; nur als letzte Ebene angehängt.
export function svgWithContour(svg,geometry,{mirror=false,stroke}){
 const end=svg.lastIndexOf('</svg>');
 if(end<0||svg.slice(end+6).trim()||!/^#[a-f0-9]{6}$/.test(stroke))fail('Die Gestaltung lässt sich nicht mit Kontur ausgeben.');
 const group=`<g id="kontur" fill="none" stroke="${stroke}" stroke-width="0.05"${mirror?` transform="translate(${geometry.widthMm} 0) scale(-1 1)"`:''}><path d="${xml(geometry.contours.map(c=>c.d+' Z').join(' '))}"/></g>`;
 return svg.slice(0,end)+group+svg.slice(end);
}
export const orderFileSet=(id,files)=>({id,files:Object.fromEntries(ORDER_FORMATS.map(format=>{const [name,bytes]=files[format];return [format,{name,sha256:digest(bytes)}];}))});
// Both separations are rendered from the same frozen geometry and pixel arrays.
// `orderFiles` (#265, ENTSCHEIDUNGEN 3.61): zusätzlich die Druckdatei mit der Schnittlinie als Haarlinie – die „PDF“ der
// Bestellansicht; sonst derselbe Aufbau wie die Druckdatei (Farbe und Weiß; bei Mimaki bleibt Weiß wie heute die eigene Datei).
// Eine Fassung ohne Schnittlinie entsteht nicht mehr. Ohne den Schalter entsteht nichts Neues.
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
 return {pdf,downloads,extras,order:{pdf:Buffer.from(await (await printPDF({...input,kind,cut:'hairline'})).arrayBuffer())}};
}
// #265, ENTSCHEIDUNGEN 3.61: Datei der Bestellansicht aus dem gesicherten Ausgabepaket. Wie bei der Weißdatei muss die Prüfsumme
// der ausgelieferten Bytes zum Dateinachweis des Auftrags passen. Ausgaben ohne Dateinachweis (vor 3.57) führen die Dateien
// nicht: `orderFileSets` ist dann leer, der Download nennt den Grund statt eines Fehlers aus dem Paket.
// `orderFileDescriptor`: Dateinachweis eines Formats – im heutigen Schema direkt, im Schema davor die Fassung mit Kontur.
function orderFileDescriptor(metadata,surface,format){
 const schema=metadata?.orderFiles?.schema,key=schema===ORDER_FILES_SCHEMA?format:schema===ORDER_FILES_SCHEMA_V1?V1_SOURCE[format]:null;
 const descriptor=key&&Object.hasOwn(surface.files,key)?surface.files[key]:null;
 return typeof descriptor?.name==='string'&&/^[a-f0-9]{64}$/.test(descriptor.sha256||'')?descriptor:null;
}
export function orderFileSets(metadata){
 const sets=metadata?.orderFiles;
 if(![ORDER_FILES_SCHEMA,ORDER_FILES_SCHEMA_V1].includes(sets?.schema)||!Array.isArray(sets.surfaces))return [];
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
