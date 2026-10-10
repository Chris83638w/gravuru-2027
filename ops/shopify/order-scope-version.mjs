import {createHash} from 'node:crypto';
export const ORDER_BASELINE='gid://shopify/Version/1162554900481';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const hashModules=modules=>createHash('sha256').update(JSON.stringify(canonical(modules.map(m=>({id:m.registrationId,uuid:m.registrationUuid,handle:m.registrationTitle,type:m.type,target:m.target,config:m.config})).sort((a,b)=>a.id.localeCompare(b.id))))).digest('hex');
export function proposeOrderScope(before,activeVersionId){
 const modules=before?.appModuleVersions;
 if(activeVersionId!==ORDER_BASELINE||before.version?.name!=='Gravuru Konfigurator'||!Array.isArray(modules)||modules.length!==7||new Set(modules.map(m=>m.registrationId)).size!==7)throw Error('order_baseline');
 const access=modules.filter(m=>m.type==='app_access'),hooks=modules.filter(m=>m.type==='webhooks'),home=modules.find(m=>m.type==='app_home');
 if(access.length!==1||hooks.length!==1||hooks[0].config.api_version!=='2026-07'||home?.config.app_url!=='https://app-2027.gravuru-designwerkstatt.de/werkstatt/'||typeof access[0].config.scopes!=='string')throw Error('order_config');
 const scopes=access[0].config.scopes.split(',');
 if(!scopes.length||scopes.some(s=>!/^\w+$/.test(s))||scopes.includes('read_orders'))throw Error('order_scopes');
 // Shopify serializes required scopes alphabetically when building a version.
 const proposed=structuredClone(modules);proposed.find(m=>m.registrationId===access[0].registrationId).config.scopes=[...scopes,'read_orders'].sort().join(',');
 return {proposed,beforeHash:hashModules(modules),proposedHash:hashModules(proposed),
  manifest:{name:before.version.name,handle:'',modules:proposed.map(m=>({type:m.type,handle:m.registrationTitle,uid:m.registrationId,uuid:m.registrationUuid,assets:m.registrationId,...(m.target?{target:m.target}:{}),config:m.config}))},
  addedScopes:['read_orders'],removedScopes:[],moduleCount:7,themeUnchanged:true,functionUnchanged:true,appHomeUnchanged:true,webhooksUnchanged:true,released:false};
}
export function verifyOrderScopeCandidate(before,candidate,activeVersionId){
 const proposal=proposeOrderScope(before,activeVersionId);
 if(!candidate?.versionTag||hashModules(candidate.appModuleVersions)!==proposal.proposedHash)throw Error('order_candidate_changed');
 return {addedScopes:proposal.addedScopes,removedScopes:[],moduleCount:7,themeUnchanged:true,functionUnchanged:true,appHomeUnchanged:true,webhooksUnchanged:true,rollbackVersionId:activeVersionId,released:false};
}

// CLI must upload the retained extension assets again. Verify the locally rebuilt
// Wasm against the already released binary before normalizing only its upload ID.
export function verifyRebuiltOrderScopeCandidate(before,candidate,activeVersionId,wasmSha256){
 if(wasmSha256!=='f9360588df38eb108ec77ecd0276f46f4524841949c15a76d9789f332adb7890')throw Error('order_function_binary');
 const normalized=structuredClone(candidate),old=before.appModuleVersions.find(m=>m.type==='function'),next=normalized.appModuleVersions.find(m=>m.type==='function');
 if(!old||!next||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(next.config.module_id)||next.config.module_metadata?.module_wasm_size_bytes!==3294||old.config.module_metadata?.module_wasm_size_bytes!==3294)throw Error('order_function_identity');
 const newId=next.config.module_id;next.config.module_id=old.config.module_id;
 const verification=verifyOrderScopeCandidate(before,normalized,activeVersionId);
 return {...verification,functionBinarySha256:wasmSha256,previousFunctionModuleId:old.config.module_id,functionModuleId:newId,functionBinaryUnchanged:true};
}
