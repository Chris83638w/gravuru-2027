// #265 (Chris: schneller Warenkorb, sämtliche Prüfungen bleiben): Jedes Sichern einer Kundengestaltung las das über 10 MB
// große Produktdokument zweimal aus der Datenbank (gewählte Revision und aktueller Stand) und prüfte es danach zweimal ganz.
// Eine Produktrevision ist unveränderlich (repository.mjs, Trigger immutable_revision_update und -delete). Diese Ablage hält
// je Prozess wenige gelesene Revisionen, tief eingefroren; product-model.mjs prüft ein gehaltenes Dokument nur einmal.
//
// Gültigkeit wie beim Antwortspeicher des Modells (customer-model-response-cache.mjs): Ein Eintrag gilt nur, solange
// `repository.revisionState(id,{revision})` (Revision, Veröffentlichung, Archivierung, Schemastand – ohne das Dokument) exakt
// dem Stand beim Lesen entspricht; sonst wird neu gelesen. Archivierung prüft der Aufrufer zusätzlich bei jeder Anfrage frisch
// (`repository.revisionStatus`). Sitzung, Zuordnung, Pause und Freigaben speichert diese Ablage nie.
// Begrenzung: höchstens `max` Revisionen je Ablage; die am längsten nicht benutzte wird verdrängt. Speicher je Revision:
// das gelesene Dokument und bis zu drei geprüfte Fassungen (product-model.mjs), also bis zu vier Dokumentgrößen.
import {holdProductDocument} from './product-model.mjs';
import {isFormProduct} from './form-product.mjs';
export const REVISION_RECORDS_DEFAULT=2;
const stores=new WeakMap();
const freeze=(value,seen=new WeakSet())=>{if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);}return value;};
// Wie `repository.get(id,{revision})`, mit denselben Fehlern. Ablagen ohne `revisionState` (ältere Attrappen) und
// Formprodukte lesen wie bisher.
export function heldRevisionRecord(repository,id,revision,{max=REVISION_RECORDS_DEFAULT}={}){
 if(!Number.isSafeInteger(max)||max<1)throw new RangeError('Gehaltene Revisionen: max muss eine positive ganze Zahl sein.');
 if(typeof repository?.revisionState!=='function')return repository.get(id,{revision});
 const state=JSON.stringify(repository.revisionState(id,{revision}));
 let held=stores.get(repository);if(!held){held=new Map();stores.set(repository,held);}
 const key=JSON.stringify([id,revision]),entry=held.get(key);
 if(entry){held.delete(key);if(entry.state===state){held.set(key,entry);return entry.record;}}
 const record=repository.get(id,{revision});
 if(isFormProduct(record.document))return record;
 holdProductDocument(record.document);freeze(record);
 held.set(key,{state,record});while(held.size>max)held.delete(held.keys().next().value);
 return record;
}
export const heldRevisionCount=repository=>stores.get(repository)?.size??0;
