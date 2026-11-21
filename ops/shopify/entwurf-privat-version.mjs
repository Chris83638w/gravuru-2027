import fs from 'node:fs';
import {hashModules} from './order-scope-version.mjs';
// Chris 21.11.2026, 15:22 Uhr: „Bearbeitbarer Entwurf“ soll für Kunden nicht mehr sichtbar sein. Dafür lesen Preisfunktion und
// Kassenprüfung den Entwurfsnachweis künftig auch unter dem privaten Schlüssel `_gravuru_entwurf`
// (Quellen: ops/shopify/entwurf-privat-release/). Diese Datei ist nur die Vergleichshilfe für die App-Version, nach dem Muster
// von order-scope-version.mjs und stage-c-version.mjs: kein Netz, kein Deploy, keine Freigabe, keine App- oder Versionskennung.
// Der Operator liest die aktive Version (`before`) und den bereitgestellten Kandidaten selbst von Shopify und übergibt beide.
//
// Erlaubt ist genau das:
//  - Die beiden Funktionen (Handles unten) haben eine neue Eingabeabfrage – exakt die aus entwurf-privat-release/ – und eine
//    neu hochgeladene Binärdatei (Upload-Kennung und Metadaten der Datei).
//  - Alles andere bleibt gleich: jedes andere Modul, jede Berechtigung, jede übrige Einstellung der beiden Funktionen.
//    Kein Modul kommt hinzu, keines fällt weg.
export const PRIVATE_REFERENCE=Object.freeze({functions:Object.freeze({
 'gravuru-personalization-price':Object.freeze({before:'einzelsperre-release/preis/src/cart_transform_run.graphql',after:'entwurf-privat-release/preis/src/cart_transform_run.graphql'}),
 'gravuru-checkout-guard':Object.freeze({before:'einzelsperre-release/pruefung/src/cart_validation_run.graphql',after:'entwurf-privat-release/pruefung/src/cart_validation_run.graphql'})
})});
const read=file=>fs.readFileSync(new URL('./'+file,import.meta.url),'utf8');
// Die Abfragen der aktiven Fassung und der Folgefassung, wie sie im Repo liegen.
export const expectedQueries=()=>Object.fromEntries(Object.entries(PRIVATE_REFERENCE.functions).map(([handle,files])=>[handle,{before:read(files.before),after:read(files.after)}]));
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.trim()===b.trim();
const unique=modules=>Array.isArray(modules)&&modules.length>0&&new Set(modules.map(m=>m.registrationId)).size===modules.length;

// `wasmBytes` (optional, je Handle): Größe der selbst gebauten Datei. Ist sie angegeben, muss Shopify genau diese Größe führen.
export function verifyPrivateReferenceCandidate(before,candidate,{queries=expectedQueries(),wasmBytes={}}={}){
 const base=before?.appModuleVersions,modules=candidate?.appModuleVersions,handles=Object.keys(PRIVATE_REFERENCE.functions);
 if(!unique(base))throw Error('private_reference_baseline');
 const functionsOf=list=>handles.map(handle=>list.filter(m=>m.registrationTitle===handle));
 if(functionsOf(base).some(found=>found.length!==1||found[0].type!=='function'))throw Error('private_reference_functions');
 if(!candidate?.versionTag||!unique(modules))throw Error('private_reference_candidate');
 const next=new Map(modules.map(m=>[m.registrationId,m]));
 if(modules.length!==base.length||base.some(m=>!next.has(m.registrationId)))throw Error('private_reference_modules');
 const normalized=structuredClone(modules),changed=[];
 for(const handle of handles){
  const old=base.find(m=>m.registrationTitle===handle),fresh=normalized.find(m=>m.registrationId===old.registrationId),query=queries?.[handle];
  const oldTargets=old.config?.targets,newTargets=fresh.config?.targets;
  // Genau ein Ziel mit genau der bisherigen bzw. der neuen Abfrage; sonst ist die Grundlage oder der Kandidat ein anderer Stand.
  if(!Array.isArray(oldTargets)||oldTargets.length!==1||!same(oldTargets[0].input_query,query?.before))throw Error('private_reference_baseline_query');
  if(!Array.isArray(newTargets)||newTargets.length!==1||!same(newTargets[0].input_query,query.after)||same(query.before,query.after))throw Error('private_reference_query');
  const size=fresh.config.module_metadata?.module_wasm_size_bytes;
  // Neue Datei: neue Upload-Kennung in der bekannten Form und eine plausible Größe. Shopify führt für Funktionen höchstens 256 kB.
  if(!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(fresh.config.module_id||'')||fresh.config.module_id===old.config.module_id||!Number.isSafeInteger(size)||size<1||size>256000)throw Error('private_reference_binary');
  if(wasmBytes[handle]!==undefined&&wasmBytes[handle]!==size)throw Error('private_reference_binary_size');
  changed.push({handle,previousModuleId:old.config.module_id,moduleId:fresh.config.module_id,wasmBytesBefore:old.config.module_metadata?.module_wasm_size_bytes??null,wasmBytesAfter:size});
  // Nur diese drei Angaben dürfen abweichen; danach muss das Modul dem bisherigen gleichen.
  fresh.config.targets[0].input_query=oldTargets[0].input_query;fresh.config.module_id=old.config.module_id;
  if(old.config.module_metadata===undefined)delete fresh.config.module_metadata;else fresh.config.module_metadata=structuredClone(old.config.module_metadata);
 }
 if(hashModules(normalized)!==hashModules(base))throw Error('private_reference_candidate_changed');
 return {changedModules:handles.slice().sort(),unchangedModules:base.length-handles.length,addedModules:[],removedModules:[],scopesUnchanged:true,functions:changed.sort((a,b)=>a.handle.localeCompare(b.handle)),released:false};
}
