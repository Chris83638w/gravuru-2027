// Default read-only plan using existing Shopify CLI 4.9.0 credentials.
// --mode verify-complete checks the full CLI-uploaded inactive candidate.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {APP,APP_KEY,BASELINE_VERSION,BASELINE_TAG,ARTIFACT_TAG,RELEASE_TAG,proposeSteelPricingVersion,verifyCompleteSteelPricingVersion} from './steel-pricing-preserved-version.mjs';
const args=Object.fromEntries(process.argv.slice(2).reduce((r,v,i,s)=>i%2?r:[...r,[v,s[i+1]]],[]));
try{
 const cli=path.resolve(args['--cli']||''),out=path.resolve(args['--out']||''),mode=args['--mode']||'plan';
 if(!args['--cli']||!args['--out']||!['plan','verify-complete'].includes(mode)||JSON.parse(fs.readFileSync(path.join(cli,'package.json'))).version!=='4.9.0'||fs.existsSync(out))throw Error('stage_arguments');
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 const save=async(name,value)=>{fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});};
 const {ma:getClient}=await import(pathToFileURL(path.join(cli,'dist/chunk-Q45XAEG2.js')));const client=getClient();
 let result;
 if(mode==='plan'){
  const versions=(await client.appVersions(APP)).app?.appVersions.nodes,active=versions?.filter(v=>v.status==='active');
  if(active?.length!==1||active[0].versionId!==BASELINE_VERSION||active[0].versionTag!==BASELINE_TAG)throw Error('stage_baseline_changed');
  const before=await client.activeAppVersion({apiKey:APP_KEY}),artifact=await client.appVersionByTag(APP,ARTIFACT_TAG);
  await save('before.json',before);await save('artifact.json',artifact);
  const p=proposeSteelPricingVersion(before,artifact,BASELINE_VERSION);await save('plan.json',p);
  result={planned:true,released:false,mutations:0,unchangedModuleCount:p.unchangedModuleCount,changedFields:p.changedFields,beforeHash:p.beforeHash,proposedHash:p.proposedHash};
 }else{
  const versions=(await client.appVersions(APP)).app?.appVersions.nodes,active=versions?.filter(v=>v.status==='active');
  if(active?.length!==1||active[0].versionId!==BASELINE_VERSION||active[0].versionTag!==BASELINE_TAG)throw Error('stage_baseline_changed');
  const before=await client.activeAppVersion({apiKey:APP_KEY}),candidate=await client.appVersionByTag(APP,RELEASE_TAG);
  await save('before.json',before);await save('candidate.json',candidate);
  result={...verifyCompleteSteelPricingVersion(before,candidate,BASELINE_VERSION),mutations:0,tag:RELEASE_TAG};
 }
 await save('receipt.json',result);console.log(JSON.stringify(result));
}catch(e){console.log(JSON.stringify({staged:false,released:false,code:/^[a-z_]+$/.test(e.code||e.message)?e.code||e.message:'stage_failed'}));process.exitCode=2;}
