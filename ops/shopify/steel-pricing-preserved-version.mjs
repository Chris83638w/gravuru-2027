// Reuse every active remote module. Only a reviewed, already-uploaded inactive
// Function artifact may replace the active Function artifact. No local theme.
import {createHash} from 'node:crypto';
export const APP={id:'gid://shopify/App/423276544001',organizationId:'172197140',title:'Gravuru Konfigurator'};
export const APP_KEY='9640dd7a6907f0c73e7013ea8c24869b';
export const BASELINE_VERSION='gid://shopify/Version/1191284113409';
export const BASELINE_TAG='gravuru-2027-issue139-pricing-20261102-v1';
export const ARTIFACT_TAG='gravuru-2027-steel-pricing-input-artifact-20261108';
export const RELEASE_TAG='gravuru-2027-steel-pricing-input-20261108-v1';
export const WASM={bytes:13428,sha256:'dad74c5d38ac291e739aa184862e5c751207be3104fb6ddbead1bbf9440ae401'};
const FUNCTION_UID='3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef',THEME_UID='a4d6506c-8e89-ca7d-f5b1-1a0d1e00a1f9bb93e76a';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
const fingerprint=modules=>modules.map(m=>({id:m.registrationId,uuid:m.registrationUuid,handle:m.registrationTitle,type:m.type,target:m.target,config:m.config})).sort((a,b)=>a.id.localeCompare(b.id));
function one(modules,handle,type,uid){const found=modules.filter(m=>m.registrationTitle===handle);if(found.length!==1||found[0].type!==type||found[0].registrationId!==uid)fail('preserved_module_identity');return found[0];}
function inventory(snapshot){
 const modules=snapshot?.appModuleVersions;
 if(!Array.isArray(modules)||modules.length<5||modules.length>100||new Set(modules.map(m=>m.registrationId)).size!==modules.length||modules.some(m=>!m.registrationId||!m.registrationUuid||!m.config||typeof m.config!=='object'))fail('preserved_inventory');
 const fn=one(modules,'gravuru-personalization-price','function',FUNCTION_UID),theme=one(modules,'gravuru-storefront','theme_app_extension',THEME_UID);
 if(fn.target!=='cart.transform.run'||fn.config.app_key!==APP_KEY||!theme.config.theme_extension?.files||!Object.keys(theme.config.theme_extension.files).length)fail('preserved_configuration');
 for(const type of ['app_home','app_access','webhooks'])if(modules.filter(m=>m.type===type).length!==1)fail('preserved_required_module');
 return {modules,fn,theme};
}
export function proposeSteelPricingVersion(before,artifact,activeVersionId){
 if(activeVersionId!==BASELINE_VERSION)fail('preserved_baseline_changed');
 const {modules,fn}=inventory(before),candidate=one(artifact?.appModuleVersions||[],'gravuru-personalization-price','function',FUNCTION_UID);
 if(artifact.versionTag!==ARTIFACT_TAG||candidate.registrationUuid!==fn.registrationUuid||candidate.target!==fn.target||candidate.config.module_id===fn.config.module_id||!/^[a-f0-9-]{36}$/.test(candidate.config.module_id||'')||candidate.config.module_metadata?.module_wasm_size_bytes!==WASM.bytes)fail('preserved_artifact_identity');
 // Query, scopes, API version, target, UI paths and every other Function field
 // must equal the active version. Only the compiled artifact metadata may differ.
 const normalized=structuredClone(candidate.config);normalized.module_id=fn.config.module_id;normalized.module_metadata=fn.config.module_metadata;
 // The isolated compiler lacks locale files and reports {}. Keep the exact
 // active translations; never let artifact staging erase those UI strings.
 if(hash(normalized.localization||{})!==hash(fn.config.localization||{})){
  if(hash(normalized.localization)!==hash({}))fail('preserved_artifact_localization_changed');
  normalized.localization=structuredClone(fn.config.localization);
 }
 if(hash(normalized)!==hash(fn.config))fail('preserved_function_config_changed');
 const proposed=structuredClone(modules),next=proposed.find(m=>m.registrationId===FUNCTION_UID);
 next.config.module_id=candidate.config.module_id;next.config.module_metadata=structuredClone(candidate.config.module_metadata);
 const manifest={name:before.version.name,handle:'',modules:proposed.map(m=>({type:m.type,handle:m.registrationTitle,uid:m.registrationId,uuid:m.registrationUuid,assets:m.registrationId,...(m.target?{target:m.target}:{}),config:m.config}))};
 return {manifest,proposed,beforeHash:hash(fingerprint(modules)),proposedHash:hash(fingerprint(proposed)),changedFields:['function.module_id','function.module_metadata'],unchangedModuleCount:modules.length-1,wasm:WASM,released:false};
}
export function verifySteelPricingVersion(before,artifact,candidate,activeVersionId){
 const p=proposeSteelPricingVersion(before,artifact,activeVersionId);inventory(candidate);
 if(candidate.versionTag!==RELEASE_TAG||hash(fingerprint(candidate.appModuleVersions))!==p.proposedHash)fail('preserved_candidate_changed');
 return {exactRemoteModulePreservation:true,themeFilesUnchanged:true,scopesUnchanged:true,proxyAndUrlsUnchanged:true,functionQueryUnchanged:true,moduleCount:p.proposed.length,changedFields:p.changedFields,wasm:WASM,released:false};
}
export async function stageSteelPricingVersion(client,{commit,save}){
 if(!/^[a-f0-9]{40}$/.test(commit)||typeof save!=='function')fail('preserved_stage_arguments');
 const active=async()=>{const rows=(await client.appVersions(APP)).app?.appVersions.nodes,found=rows?.filter(v=>v.status==='active');if(found?.length!==1||found[0].versionId!==BASELINE_VERSION||found[0].versionTag!==BASELINE_TAG)fail('preserved_active_changed');return rows;};
 const versions=await active();if(versions.some(v=>v.versionTag===RELEASE_TAG))fail('preserved_candidate_exists');
 const before=await client.activeAppVersion({apiKey:APP_KEY}),artifact=await client.appVersionByTag(APP,ARTIFACT_TAG),p=proposeSteelPricingVersion(before,artifact,BASELINE_VERSION);
 await save('before.json',before);await save('artifact.json',artifact);await save('expected.json',p);
 const result=await client.deploy({appManifest:p.manifest,appId:APP.id,organizationId:APP.organizationId,versionTag:RELEASE_TAG,message:'Preisvertrag unter Function-Eingabegrenze; alle bestehenden Module unverändert erhalten.',commitReference:'https://github.com/Chris83638w/gravuru-2027/commit/'+commit,skipPublish:true});
 await save('creation.json',result);if(result.appDeploy?.userErrors?.length||!result.appDeploy?.appVersion)fail('preserved_creation_rejected');
 const candidate=await client.appVersionByTag(APP,RELEASE_TAG);await save('candidate.json',candidate);
 const verified=verifySteelPricingVersion(before,artifact,candidate,BASELINE_VERSION);await active();
 return {...verified,tag:RELEASE_TAG,versionId:candidate.uuid,rollback:BASELINE_TAG,sourceCommit:commit};
}
