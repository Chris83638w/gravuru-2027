import fs from 'node:fs';
import {verifyRebuiltOrderScopeCandidate,hashModules,ORDER_BASELINE} from './order-scope-version.mjs';
const root='/var/www/vhosts/gravuru-designwerkstatt.de/private',dir=root+'/gravuru-orders-rebuilt-CnBMbH',receipt=root+'/gravuru-order-scope-rebuilt-20261011.json',app={id:'gid://shopify/App/423276544001',organizationId:'172197140'},tag='gravuru-2027-orders-20261011-build2';
process.umask(0o077);let token='';
try {
 const status=JSON.parse(fs.readFileSync(receipt));if(status.state!=='building'||status.privateDirectory!==dir)throw Error('Unexpected attempt receipt');
 const key=root+'/gravuru-shopify-app-automation-token',st=fs.lstatSync(key);if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||st.mode&0o077)throw Error('Private credential required');token=fs.readFileSync(key,'utf8').trim();
 Object.assign(process.env,{SHOPIFY_APP_AUTOMATION_TOKEN:token,SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'true',NO_COLOR:'1',XDG_CONFIG_HOME:dir});delete process.env.DEBUG;delete process.env.NODE_DEBUG;
 const {ma:getClient}=await import(root+'/gravuru-shopify-deploy-tools/node_modules/@shopify/cli/dist/chunk-Q45XAEG2.js');const client=getClient();
 const before=JSON.parse(fs.readFileSync(dir+'/before.json')),saved=JSON.parse(fs.readFileSync(dir+'/candidate.json')),check=JSON.parse(fs.readFileSync(dir+'/extension-check.json'));
 const candidate=await client.appVersionByTag(app,tag);if(candidate.uuid!=='gid://shopify/Version/1162598875137'||hashModules(candidate.appModuleVersions)!==hashModules(saved.appModuleVersions))throw Error('Candidate changed');
 const verification=verifyRebuiltOrderScopeCandidate(before,candidate,ORDER_BASELINE,check.function.sha256);
 const active=await client.activeAppVersion({apiKey:'9640dd7a6907f0c73e7013ea8c24869b'}),versions=await client.appVersions(app);
 if(active.id!==before.id||hashModules(active.appModuleVersions)!==hashModules(before.appModuleVersions)||versions.app.appVersions.nodes.find(v=>v.status==='active')?.versionId!==ORDER_BASELINE)throw Error('Baseline changed');
 const result={state:'staged',tag,versionId:candidate.uuid,privateDirectory:dir,verification,themeFileCount:check.themeFiles.length,sourceCommit:'d16b3ceb5be4671b32b37db282f0135dc7c3ba46',released:false,reconciledDifference:'Shopify sorted the same required scopes alphabetically',newDeployRequested:false};
 fs.writeFileSync(dir+'/scope-order-reconciliation.json',JSON.stringify(result,null,2),{flag:'wx'});fs.writeFileSync(receipt,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){console.log(JSON.stringify({state:'stopped',error:String(e.message).replaceAll(token||'__no_token__','[redacted]').slice(0,500)}));process.exitCode=1;}
