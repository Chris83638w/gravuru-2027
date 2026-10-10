import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {APP_KEY,BASELINE_VERSION,proposeMerchantHome,verifyPreservedCandidate} from './preserved-version.mjs';
const ROOT='/var/www/vhosts/gravuru-designwerkstatt.de/private';
const APP={id:'gid://shopify/App/423276544001',organizationId:'172197140',title:'Gravuru Konfigurator'};
export async function stageMerchantVersion(client,{tag,commit,save}){
 if(!/^gravuru-2027-merchant-[a-z0-9-]+$/.test(tag)||!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid version identity');
 const versions=await client.appVersions(APP),active=versions.app?.appVersions.nodes.filter(v=>v.status==='active');
 if(active?.length!==1||active[0].versionId!==BASELINE_VERSION)throw Error('Active version changed');
 const before=await client.activeAppVersion({apiKey:APP_KEY}),proposal=proposeMerchantHome(before,active[0].versionId);
 await save('before.json',before);await save('proposed-manifest.json',proposal.manifest);
 const result=await client.deploy({appManifest:proposal.manifest,appId:APP.id,organizationId:APP.organizationId,versionTag:tag,
  message:'Geprüfte neue Händlerwerkstatt; alle bestehenden Erweiterungen unverändert erhalten.',commitReference:'https://github.com/Chris83638w/gravuru-2027/commit/'+commit,skipPublish:true});
 await save('creation-result.json',result);
 if(result.appDeploy?.userErrors?.length||!result.appDeploy?.appVersion)throw Error('Candidate creation rejected: '+JSON.stringify(result.appDeploy?.userErrors||[]));
 const candidate=await client.appVersionByTag(APP,tag);await save('candidate.json',candidate);
 const verification=verifyPreservedCandidate(before,candidate,BASELINE_VERSION);
 const after=await client.appVersions(APP);
 if(after.app?.appVersions.nodes.find(v=>v.status==='active')?.versionId!==BASELINE_VERSION)throw Error('Active version changed during staging');
 return {...verification,tag,versionId:candidate.uuid,sourceCommit:commit,rollbackVersionId:BASELINE_VERSION,diff:proposal.diff,released:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [tag,commit]=process.argv.slice(2);let token='';
 try{
  if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error();process.umask(0o077);
  const credential=ROOT+'/gravuru-shopify-app-automation-token',info=fs.lstatSync(credential);
  if(!info.isFile()||info.isSymbolicLink()||info.uid!==process.getuid()||info.mode&0o077)throw Error();
  token=fs.readFileSync(credential,'utf8').trim();if(!/^[\x21-\x7e]{16,8192}$/.test(token))throw Error();
  const cli=ROOT+'/gravuru-shopify-deploy-tools/node_modules/@shopify/cli';if(JSON.parse(fs.readFileSync(cli+'/package.json')).version!=='4.9.0')throw Error();
  const directory=fs.mkdtempSync(ROOT+'/gravuru-merchant-version-');
  Object.assign(process.env,{SHOPIFY_APP_AUTOMATION_TOKEN:token,SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'true',NO_COLOR:'1',XDG_CONFIG_HOME:directory});delete process.env.DEBUG;delete process.env.NODE_DEBUG;
  const {ma:getClient}=await import(cli+'/dist/chunk-Q45XAEG2.js');
  const save=(name,value)=>{const text=JSON.stringify(value,null,2);if(text.includes(token))throw Error();fs.writeFileSync(directory+'/'+name,text+'\n',{flag:'wx',mode:0o600});};
  const result=await stageMerchantVersion(getClient(),{tag,commit,save});await save('STAGE.json',result);console.log(JSON.stringify({...result,privateDirectory:directory}));
 }catch(error){console.log(JSON.stringify({staged:false,released:false,error:String(error.message||'stage_failed').replaceAll(token||'__never_token__','[redacted]').slice(0,600)}));process.exitCode=1;}
}
