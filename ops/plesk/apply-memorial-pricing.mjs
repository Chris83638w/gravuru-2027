// Explicit opt-in maintenance command, not imported or called by the application.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {merchantConfig,verifyMerchantStorage} from './merchant-config.mjs';
import {readPrivateFile} from './shopify-preflight.mjs';
import {lockTestData} from './lock.mjs';
import {TARGET,assertPlan,digest,same,fail} from './tier-update-plan.mjs';
import {jsonFile,privatePath,writeNew,verifyEvidence,readState} from './prepare-memorial-tiers.mjs';
import {createTierPricingCas} from './memorial-pricing-cas-client.mjs';
export async function runPricing(args){
 const [flag,planFile,planSha,backupFile,resultFile]=args;
 if(args.length!==5||flag!=='--execute-reviewed-single-product')fail('explicit_execution_required');
 process.umask(0o077);const configFile=process.env.GRAVURU_SHOPIFY_CONFIG_FILE;
 if(!configFile||path.basename(configFile)!=='gravuru-2027-merchant-shopify.json')fail('config_target');
 const root=path.dirname(configFile),config=merchantConfig(process.env);
 if(path.basename(root)!=='private'||config.origin!=='https://app-2027.gravuru-designwerkstatt.de'||config.merchantTestCart?.productId!==TARGET.productId||config.merchantTestCart.productRevision!==5)fail('runtime_target');
 verifyMerchantStorage(config);for(const file of [backupFile,resultFile]){privatePath(file,root);if(fs.existsSync(file)||file.startsWith(config.data+path.sep))fail('new_output_required');}if(backupFile===resultFile)fail('distinct_outputs');
 const plan=assertPlan(jsonFile(planFile,planSha,root)),{backup}=verifyEvidence(plan.evidence,root),original=readState(path.join(backup,'workshop.sqlite'));
 if(original.record.revision!==5||!same(original.record.document,plan.documentBefore)||!same(original.mappings,plan.mappings))fail('backup_plan_mismatch');
 const lock=await lockTestData(config),released=once(lock,'exit');
 try{
  if(digest(readPrivateFile(configFile,16384))!==plan.configBeforeSha256)fail('concurrent_config_change');
  const state=readState(path.join(config.data,'workshop.sqlite'));if(state.record.revision!==6||!same(state.record.document,plan.documentAfter)||!same(state.mappings,plan.mappings))fail('new_revision_missing');
  const client=createTierPricingCas({readSecret:()=>config.runtimeEnv.GRAVURU_SHOPIFY_CLIENT_SECRET});
  const result=await client.apply(plan,{saveBackup:value=>writeNew(backupFile,{...value,planSha256:planSha},root)});
  const written=writeNew(resultFile,{...result,planSha256:planSha},root);return {ok:true,pricingRevision:'31',mutations:1,...written};
 }finally{lock.stdin.end();await released;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runPricing(process.argv.slice(2))));}catch(error){console.log(JSON.stringify({ok:false,code:/^[a-z_]+$/.test(error?.code||'')?error.code:'pricing_operation_failed',automaticRetryAllowed:false}));process.exitCode=1;}
}
