import {BASELINE_VERSION,verifyPreservedCandidate} from './preserved-version.mjs';
export function verifyRebuiltMerchantCandidate(before,candidate,activeVersionId){
 const normalized=structuredClone(candidate),original=before.appModuleVersions?.find(m=>m.type==='function'),next=normalized.appModuleVersions?.find(m=>m.type==='function');
 if(!original||!next||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(next.config.module_id)||next.config.module_id===original.config.module_id||next.config.module_metadata?.module_wasm_size_bytes!==3294)throw Error('Unexpected rebuilt function identity or size');
 const newId=next.config.module_id;
 next.config.module_id=original.config.module_id;next.config.module_metadata.module_wasm_size_bytes=original.config.module_metadata.module_wasm_size_bytes;
 const preserved=verifyPreservedCandidate(before,normalized,activeVersionId);
 return {...preserved,exactConfigurationPreservation:false,changedFields:['app_home.app_url','function.module_id','function.module_metadata.module_wasm_size_bytes'],
  themeFilesUnchanged:true,scopesUnchanged:true,webhooksUnchanged:true,functionQueryAndSettingsUnchanged:true,
  function:{previousModuleId:original.config.module_id,nextModuleId:newId,previousBytes:original.config.module_metadata.module_wasm_size_bytes,bytes:3294,wasmSha256:'f9360588df38eb108ec77ecd0276f46f4524841949c15a76d9789f332adb7890'},rollbackVersionId:BASELINE_VERSION,released:false};
}
