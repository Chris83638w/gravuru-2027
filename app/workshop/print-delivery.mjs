import {printPDF} from '../configurator/variant-m/print-export-model.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'print_delivery'});};
// #265, ENTSCHEIDUNGEN 3.57: Die vier Downloads der Bestellansicht – PDF, PDF mit Kontur, SVG, SVG mit Kontur – je Fläche.
// „Mit Kontur“ gibt es bei allen Produkten; die Kontur ist die Schablone zum Anlegen und immer eine Haarlinie. In PDF ist das die
// Breite 0 (form-engraving-worker.py: „PDF width zero is a device hairline“). SVG kennt keine Breite 0 (sie wäre unsichtbar); dort
// gilt die dünnste Angabe, die das Repo für Schnitt- und Konturlinien schon verwendet: 0,05 mm (form-engraving-worker.py,
// doorbell-artwork.mjs, CutContour in print-export-model.mjs). Die Farbe ist die der bestehenden Konturdatei des Produkts:
// Funkklingel rot (Schnitt der Acrylauflage, sie trägt die Gestaltung), Schiefergravur blau, sonst schwarz.
export const ORDER_FILES_SCHEMA='gravuru-order-files/v1';
export const ORDER_FORMATS=Object.freeze(['pdf','pdf-contour','svg','svg-contour']);
export const contourStroke=(artwork,{engraving=false}={})=>artwork.doorbellLayers?'#ff0000':engraving&&artwork.manifest.product.material?.kind==='slate'?'#0000ff':'#000000';
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
// `orderFiles` (#265, ENTSCHEIDUNGEN 3.57): zusätzlich die Druckdatei ohne Schnittlinie („PDF“) und mit der Schnittlinie als
// Haarlinie („PDF mit Kontur“) – sonst Byte für Byte derselbe Aufbau wie die Druckdatei. Annahme (von Chris nicht ausdrücklich
// bestätigt): „PDF“ ist die vorhandene Druckdatei mit Farbe und Weiß, nur ohne Schnittlinie; bei Mimaki bleibt Weiß wie heute
// die eigene Datei. Ohne den Schalter entsteht nichts Neues (Formprodukte alter Art bleiben unverändert).
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
 const variant=async cut=>Buffer.from(await (await printPDF({...input,kind,cut})).arrayBuffer());
 return {pdf,downloads,extras,order:{pdf:await variant('none'),contour:await variant('hairline')}};
}
// #265, ENTSCHEIDUNGEN 3.57: Datei der Bestellansicht aus dem gesicherten Ausgabepaket. Wie bei der Weißdatei muss die Prüfsumme
// der ausgelieferten Bytes zum Dateinachweis des Auftrags passen. Ausgaben alter Art (vor diesem Rezeptstand, Formprodukte) führen
// die vier Dateien nicht: `orderFileSets` ist dann leer, der Download nennt den Grund statt eines Fehlers aus dem Paket.
export function orderFileSets(metadata){
 const sets=metadata?.orderFiles;
 if(sets?.schema!==ORDER_FILES_SCHEMA||!Array.isArray(sets.surfaces))return [];
 return sets.surfaces.filter(s=>['front','back'].includes(s?.id)&&s.files&&typeof s.files==='object').map(s=>({id:s.id,formats:ORDER_FORMATS.filter(f=>typeof s.files[f]?.name==='string'&&/^[a-f0-9]{64}$/.test(s.files[f]?.sha256||''))}));
}
export const ORDER_FILE_MISSING='Diese Datei gibt es für die gespeicherte Ausgabe noch nicht. Bitte die Ausgabe für diese Position neu erstellen.';
export function orderDownload(result,format,surfaceId='front'){
 if(!ORDER_FORMATS.includes(format))fail('Bitte PDF, PDF mit Kontur, SVG oder SVG mit Kontur auswählen.');
 if(!orderFileSets(result?.metadata).find(s=>s.id===surfaceId)?.formats.includes(format))throw Object.assign(Error(ORDER_FILE_MISSING),{status:409,code:'order_file_missing'});
 const descriptor=result.metadata.orderFiles.surfaces.find(s=>s.id===surfaceId).files[format];
 if(!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.(?:pdf|svg)$/.test(descriptor.name)||descriptor.name.endsWith('.svg')!==format.startsWith('svg'))fail('Unbekannte Datei im Ausgabeauftrag.');
 let files;try{({files}=readReviewPackage(result.archive,digest(result.archive),[...NATIVE_REVIEW_SCHEMAS,'gravuru-form-review/v1']));}catch{fail('Das gespeicherte Ausgabepaket ist unvollständig oder verändert.');}
 const bytes=files.get(descriptor.name);
 if(!bytes||digest(bytes)!==descriptor.sha256)fail('Die gespeicherte Datei ist unvollständig oder verändert.');
 return {bytes,suffix:descriptor.name,mime:format.startsWith('svg')?'image/svg+xml':'application/pdf',sha256:descriptor.sha256};
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
