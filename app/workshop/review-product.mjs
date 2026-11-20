// Auftrag #265, ENTSCHEIDUNGEN 3.47 (Chris 20.11.2026: „wie Zakeke und Fancy“): Beim Klick auf „In den Warenkorb“ wird nur die
// Gestaltung gesichert; was die Fertigung braucht, entsteht nach der Bestellung.
//
// Bisher enthielt jedes Prüfpaket eines Kundenentwurfs den ganzen Produktstand (`product`, über 10 MB bei einer Familie mit
// 208 Designs). Ein Paket der neuen Art nennt stattdessen den Produktstand: Kennung, Revision und Prüfsumme des Dokuments.
// Produktrevisionen sind unveränderlich und nicht löschbar (Trigger immutable_revision_update/_delete in repository.mjs);
// die Prüfsumme belegt zusätzlich, dass genau dieses Dokument gemeint ist.
// Wer den Produktstand braucht (Fertigungsdatei, Fertigungspaket), holt ihn über `resolve` aus der Werkstatt und prüft die
// Prüfsumme. Pakete der bisherigen Art (`product` eingebettet) bleiben unverändert lesbar.
import {createHash} from 'node:crypto';

export const NATIVE_INPUT_EMBEDDED='gravuru-native-review-input/v1',NATIVE_INPUT_REFERENCE='gravuru-native-review-input/v2';
// Datei im Fertigungspaket, die den über den Verweis geholten Produktstand enthält (das Fertigungspaket bleibt eigenständig).
export const PRODUCT_DOCUMENT_FILE='produktstand.json';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'review_product'});};

// Dieselbe Textform beim Sichern und beim Lesen: JSON des aus der Datenbank gelesenen Dokuments.
export const productDocumentJson=document=>JSON.stringify(document);
export const productDocumentSha=document=>createHash('sha256').update(productDocumentJson(document)).digest('hex');

// Prüfsumme je Produktstand merken (das Dokument ist groß, die Revision unveränderlich). Je Werkstatt-Ablage getrennt,
// damit gleiche Kennungen in verschiedenen Datenbanken (Tests, Mandanten) sich nie mischen.
export function createProductShaMemo({max=64}={}){
 const byRepository=new WeakMap();
 return (repository,record)=>{
  let map=byRepository.get(repository);if(!map){map=new Map();byRepository.set(repository,map);}
  const key=record.id+'\0'+record.revision;let sha=map.get(key);
  if(!sha){sha=productDocumentSha(record.document);if(map.size>=max)map.delete(map.keys().next().value);map.set(key,sha);}
  return sha;
 };
}

// Liefert das Produktdokument zu einem gesicherten Stand: eingebettet (bisherige Art) oder über den Verweis geholt und geprüft.
// `reference` ist nur bei der neuen Art gesetzt.
export function savedProductDocument(saved,manifest,resolve){
 if(saved?.schema!==NATIVE_INPUT_REFERENCE)return {document:saved?.product,reference:null};
 const ref=saved.productRef;
 if(saved.product!==undefined||!ref||Object.keys(ref).sort().join()!=='id,revision,sha256'||typeof ref.id!=='string'||!Number.isSafeInteger(ref.revision)||ref.revision<1||!/^[a-f0-9]{64}$/.test(String(ref.sha256))||ref.id!==manifest?.product?.id||ref.revision!==manifest?.product?.revision)fail('Der Verweis auf den Produktstand ist nicht eindeutig.');
 if(typeof resolve!=='function')fail('Für diesen Prüfstand wird der gespeicherte Produktstand der Werkstatt gebraucht.');
 let document;try{document=resolve({id:ref.id,revision:ref.revision});}catch{fail('Der Produktstand dieses Prüfstands ist in der Werkstatt nicht lesbar.');}
 if(!document||typeof document!=='object'||productDocumentSha(document)!==ref.sha256)fail('Der Produktstand der Werkstatt passt nicht zur gesicherten Prüfsumme.');
 return {document,reference:{...ref}};
}

// --- Gesicherte Konfiguration (`konfigurator-quellen.json`) ---------------------------------------------------------------
// ENTSCHEIDUNGEN 3.47/3.49 (Chris 20.11.2026): Die gesicherte Konfiguration enthielt alle Designs der Familie (bei 208 Designs
// rund 9 MB je Entwurf), obwohl dieselben Listen unverändert im unveränderlichen Produktstand stehen. Ein Paket mit Verweis
// behält in diesen Listen nur das gewählte Design und nennt für jede gekürzte Liste Anzahl und Prüfsumme. Gekürzt wird nur,
// was beim Sichern nachweislich Zeichen für Zeichen im Produktstand steht; alles andere bleibt eingebettet.
// Die Fertigung stellt die vollständige Konfiguration aus dem Produktstand wieder her und prüft die Prüfsumme, bevor sie
// irgendetwas daraus liest. Ein gekürztes Paket ohne Produktstand ergibt nie eine Fertigungsdatei.
export const SOURCES_REFERENCE='gravuru-review-sources-ref/v1',REVIEW_SOURCES_FILE='konfigurator-quellen.json';
const LISTS=[
 {name:'profile.designs',holder:'profile',key:'designs',source:document=>document?.config?.profile?.designs},
 {name:'familyFormats.designs',holder:'familyFormats',key:'designs',source:document=>document?.config?.familyFormats?.designs},
];
const listSha=list=>createHash('sha256').update(JSON.stringify(list)).digest('hex');
// Dieselbe Textform wie acrylic-review.mjs für die Dateien des Prüfpakets.
export const reviewSourcesJson=config=>Buffer.from(JSON.stringify(config,null,2)+'\n');

export function slimReviewSources(frozen,document,designId){
 if(typeof designId!=='string'||!designId||frozen?.sourcesRef!==undefined)return frozen;
 const out={...frozen},lists={};
 for(const {name,holder,key,source} of LISTS){
  const owner=frozen[holder],list=owner?.[key],original=source(document);
  if(!Array.isArray(list)||!Array.isArray(original)||list.length<2||list.length!==original.length)continue;
  const sha256=listSha(list);
  if(listSha(original)!==sha256)continue;
  // Gleiche Schlüsselreihenfolge wie vorher: die wiederhergestellte Datei ist Byte für Byte die bisherige.
  out[holder]={...owner,[key]:list.filter(entry=>entry?.id===designId)};
  lists[name]={count:list.length,sha256};
 }
 return Object.keys(lists).length?{...out,sourcesRef:{schema:SOURCES_REFERENCE,designId,lists}}:frozen;
}

// Vollständige gesicherte Konfiguration: unverändert (bisherige Art) oder aus dem Produktstand wiederhergestellt und geprüft.
export function savedReviewSources(config,document){
 const ref=config?.sourcesRef;
 if(ref===undefined)return {config,restored:false};
 if(!ref||ref.schema!==SOURCES_REFERENCE||typeof ref.designId!=='string'||!ref.lists||typeof ref.lists!=='object'||Array.isArray(ref.lists)||!Object.keys(ref.lists).length)fail('Der Verweis der gesicherten Konfiguration ist nicht eindeutig.');
 if(!document||typeof document!=='object')fail('Für diese gesicherte Konfiguration wird der gespeicherte Produktstand der Werkstatt gebraucht.');
 const {sourcesRef,...full}=config;
 for(const [name,entry] of Object.entries(ref.lists)){
  const spec=LISTS.find(list=>list.name===name),kept=full[spec?.holder]?.[spec?.key];
  if(!spec||!entry||Object.keys(entry).sort().join()!=='count,sha256'||!Number.isSafeInteger(entry.count)||entry.count<2||!/^[a-f0-9]{64}$/.test(String(entry.sha256))||!Array.isArray(kept)||kept.length>1||kept.some(item=>item?.id!==ref.designId))fail('Der Verweis der gesicherten Konfiguration ist nicht eindeutig.');
  const original=spec.source(document);
  if(!Array.isArray(original)||original.length!==entry.count||listSha(original)!==entry.sha256)fail('Der Produktstand der Werkstatt passt nicht zur gesicherten Konfiguration.');
  full[spec.holder]={...full[spec.holder],[spec.key]:structuredClone(original)};
 }
 return {config:full,restored:true};
}
