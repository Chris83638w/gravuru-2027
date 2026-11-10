// Antwortspeicher für GET /api/shop-entry/model (Paket 1a). Nur im Speicher des laufenden Prozesses:
// kein Timer, keine Ablage auf Platte, nichts über einen Neustart hinaus, keine Abhängigkeit auf die Oberfläche.
//
// Ein Eintrag gilt nur, solange der Datenbankstand des Stores (`repository.readEpoch()`) exakt der ist, bei dem er
// entstanden ist. Jeder Schreibvorgang – eigener, fremder, zurückgerollter, Schemaänderung – ändert diesen Stand und
// macht damit ALLE Einträge dieses Stores ungültig. Es wird nicht versucht, „unschädliche“ Schreibvorgänge zu erkennen.
// Sitzung, Zuordnung, Pause und Freigaben speichert dieser Speicher nie; sie prüft der Aufrufer bei jeder Anfrage frisch.
//
// Begrenzung: höchstens `maxEntries` Einträge UND höchstens `maxBytes` Antworttext. Zusätzlich halten Einträge das
// vollständige Servermodell (für die sitzungsgebundene Startvorschau); davon werden höchstens `maxModels` verschiedene
// gleichzeitig gehalten. Bei Überschreitung wird der am längsten nicht benutzte Eintrag verdrängt.
export const MODEL_RESPONSE_CACHE_DEFAULTS=Object.freeze({maxEntries:64,maxBytes:64*1024*1024,maxModels:2});

const positive=(value,name)=>{if(!Number.isSafeInteger(value)||value<1)throw new RangeError('Antwortspeicher: '+name+' muss eine positive ganze Zahl sein.');return value;};
const canonicalOptions=options=>JSON.stringify(Object.entries(options&&typeof options==='object'?options:{}).sort(([a],[b])=>a<b?-1:a>b?1:0));

// Schlüssel: alles, was die fertige Antwort bei gleichem Datenbankstand bestimmt und nicht je Anfrage frisch geprüft wird.
export function modelResponseKey({storeId,productId,productRevision,bindingId,assignmentRevision,unitCents,options,designId,slimState}){
 return JSON.stringify([storeId,productId,productRevision,bindingId,assignmentRevision,unitCents??null,canonicalOptions(options),designId??null,slimState]);
}

export function createModelResponseCache(limits={}){
 const maxEntries=positive(limits.maxEntries??MODEL_RESPONSE_CACHE_DEFAULTS.maxEntries,'maxEntries');
 const maxBytes=positive(limits.maxBytes??MODEL_RESPONSE_CACHE_DEFAULTS.maxBytes,'maxBytes');
 const maxModels=positive(limits.maxModels??MODEL_RESPONSE_CACHE_DEFAULTS.maxModels,'maxModels');
 const entries=new Map(),epochs=new Map();let bytes=0;
 const held=()=>{const set=new Set();for(const e of entries.values())if(e.held)set.add(e.held);return set;};
 // Intern nach Store getrennt, auch wenn ein Aufrufer denselben Schlüsseltext für zwei Stores verwendet.
 const slot=(storeId,key)=>storeId+'\u0000'+key;
 function drop(slotKey){const e=entries.get(slotKey);if(!e)return;entries.delete(slotKey);bytes-=e.bytes;}
 // Ein anderer Datenbankstand: alles dieses Stores verwerfen, nicht nur den angefragten Eintrag.
 function sync(storeId,epoch){
  if(epochs.get(storeId)===epoch)return;
  for(const [key,e] of [...entries])if(e.storeId===storeId)drop(key);
  epochs.set(storeId,epoch);
 }
 function evict(){
  while(entries.size>maxEntries||bytes>maxBytes||held().size>maxModels){
   const oldest=entries.keys().next();if(oldest.done)return;
   // Reicht die Modellgrenze nicht aus, solange ältere Einträge ohne gehaltenes Modell bleiben: trotzdem den ältesten entfernen.
   drop(oldest.value);
  }
 }
 return Object.freeze({
  limits:Object.freeze({maxEntries,maxBytes,maxModels}),
  // Treffer nur bei exakt gleichem Datenbankstand; benutzter Eintrag rückt ans Ende der Verdrängungsreihenfolge.
  get(storeId,key,epoch){
   sync(storeId,epoch);
   const at=slot(storeId,key),e=entries.get(at);if(!e)return null;
   entries.delete(at);entries.set(at,e);return e;
  },
  // `held`: gemeinsam genutztes Objekt {model,cardModel} desselben Produktstands (mehrere Einträge teilen eines).
  set(storeId,key,epoch,entry){
   sync(storeId,epoch);
   const at=slot(storeId,key);
   drop(at);
   const size=Buffer.byteLength(entry.json);
   // Ein einzelner Eintrag über der Byte-Grenze wird gar nicht erst abgelegt.
   if(size>maxBytes)return false;
   entries.set(at,{...entry,storeId,epoch,bytes:size});bytes+=size;
   evict();
   return entries.has(at);
  },
  // Gehaltenes Modell desselben Produktstands wiederverwenden (gleicher Datenbankstand), sonst null.
  heldFor(storeId,holderKey,epoch){
   sync(storeId,epoch);
   for(const e of entries.values())if(e.storeId===storeId&&e.held&&e.held.holderKey===holderKey)return e.held;
   return null;
  },
  stats:()=>({entries:entries.size,bytes,models:held().size}),
  clear(){entries.clear();epochs.clear();bytes=0;},
 });
}
