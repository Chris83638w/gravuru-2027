import {printPDF} from '../configurator/variant-m/print-export-model.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'print_delivery'});};
// Both separations are rendered from the same frozen geometry and pixel arrays.
export async function printDelivery(input){
 const mimaki=input.settings.profile==='mimaki';
 const pdf=Buffer.from(await (await printPDF({...input,kind:mimaki?'color-cut':'combined'})).arrayBuffer());
 const name=mimaki?'Mimaki-FARBE-ohne-RDG_WHITE.pdf':'Roland-RDG_WHITE-CutContour.pdf';
 const downloads={pdf:{name,sha256:digest(pdf)}},extras=[];
 if(mimaki&&input.settings.white!=='none'){
  const white=Buffer.from(await (await printPDF({...input,kind:'white-spot-cut'})).arrayBuffer());
  downloads.white={name:'Mimaki-NUR-RDG_WHITE.pdf',sha256:digest(white)};
  extras.push({name:downloads.white.name,blob:new Blob([white])});
 }
 return {pdf,downloads,extras};
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
