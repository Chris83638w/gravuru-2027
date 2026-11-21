import {hashModules} from './order-scope-version.mjs';
// #265 Stufe C (vorbereitet), ENTSCHEIDUNGEN 3.53/3.57: Welche Unterschiede die App-Version der Stufe C zur aktiven Version
// haben darf – und sonst keine. Reine Vergleichshilfe nach dem Muster von order-scope-version.mjs: kein Netz, kein Deploy,
// keine Freigabe. Der Operator liest die aktive Version (`before`) und den bereitgestellten Kandidaten selbst von Shopify und
// übergibt beide; hier steht keine App-, Versions- oder Extension-Kennung. Veröffentlicht wird nur nach Chris' Freigabe.
//  - Berechtigung: genau `write_orders` kommt hinzu (für den Tag „Gravuru: bitte prüfen“, app/workshop/shopify-order-review-tag.mjs).
//  - Neue Module: genau die beiden vorbereiteten Extensions (Handles unten); ihre Kennungen vergibt die CLI.
//  - Alles Bisherige (Theme, Preisfunktion, Checkout-Prüfung, Webhooks, App-Proxy, App-Adresse, übrige Berechtigungen) bleibt gleich.
export const STAGE_C=Object.freeze({scope:'write_orders',extensions:Object.freeze(['gravuru-order-block','gravuru-thank-you-preview'])});
export function proposeStageC(before){
 const modules=before?.appModuleVersions;
 if(!Array.isArray(modules)||!modules.length||new Set(modules.map(m=>m.registrationId)).size!==modules.length)throw Error('stage_c_baseline');
 if(modules.some(m=>STAGE_C.extensions.includes(m.registrationTitle)))throw Error('stage_c_extension_exists');
 const access=modules.filter(m=>m.type==='app_access');
 if(access.length!==1||typeof access[0].config?.scopes!=='string')throw Error('stage_c_config');
 const scopes=access[0].config.scopes.split(',');
 // `read_orders` braucht der Block der Bestellseite; es ist seit dem 11.10.2026 Teil der App und wird hier nicht ergänzt.
 if(scopes.some(s=>!/^\w+$/.test(s))||!scopes.includes('read_orders')||scopes.includes(STAGE_C.scope))throw Error('stage_c_scopes');
 // Shopify serializes required scopes alphabetically when building a version.
 const proposed=structuredClone(modules);proposed.find(m=>m.registrationId===access[0].registrationId).config.scopes=[...scopes,STAGE_C.scope].sort().join(',');
 return {proposed,beforeHash:hashModules(modules),proposedHash:hashModules(proposed),addedScopes:[STAGE_C.scope],removedScopes:[],addedExtensions:[...STAGE_C.extensions],moduleCount:modules.length+STAGE_C.extensions.length,released:false};
}
// `sameFunctionBinaries: true` darf der Operator nur setzen, nachdem er die Prüfsummen der hochgeladenen Wasm-Dateien mit
// denen der aktiven Version verglichen hat (wie verifyRebuiltOrderScopeCandidate). Dann – und nur bei gleicher Dateigröße –
// gilt die neue Upload-Kennung einer Funktion nicht als Änderung. Ohne die Angabe muss auch sie gleich sein.
export function verifyStageCCandidate(before,candidate,{sameFunctionBinaries=false}={}){
 const proposal=proposeStageC(before),old=new Map(before.appModuleVersions.map(m=>[m.registrationId,m])),modules=candidate?.appModuleVersions;
 if(!candidate?.versionTag||!Array.isArray(modules)||new Set(modules.map(m=>m.registrationId)).size!==modules.length)throw Error('stage_c_candidate');
 const kept=structuredClone(modules.filter(m=>old.has(m.registrationId))),added=modules.filter(m=>!old.has(m.registrationId));
 if(sameFunctionBinaries===true)for(const next of kept.filter(m=>m.type==='function')){
  const previous=old.get(next.registrationId).config;
  if(Number.isSafeInteger(previous?.module_metadata?.module_wasm_size_bytes)&&next.config?.module_metadata?.module_wasm_size_bytes===previous.module_metadata.module_wasm_size_bytes&&/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(next.config.module_id||''))next.config.module_id=previous.module_id;
 }
 if(hashModules(kept)!==proposal.proposedHash)throw Error('stage_c_candidate_changed');
 if(added.length!==STAGE_C.extensions.length||added.map(m=>m.registrationTitle).sort().join(',')!==STAGE_C.extensions.join(','))throw Error('stage_c_extensions');
 // Typ und Ziel der neuen Module nur ausgeben: ihre Form in der Versionsliste ist am echten Kandidaten abzulesen.
 return {addedScopes:proposal.addedScopes,removedScopes:[],unchangedModules:kept.length-1,changedModules:['app_access'],addedExtensions:added.map(m=>({handle:m.registrationTitle,type:m.type,target:m.target||null})).sort((a,b)=>a.handle.localeCompare(b.handle)),released:false};
}
