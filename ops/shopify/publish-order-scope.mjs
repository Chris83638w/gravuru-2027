import fs from 'node:fs';import {createHash} from 'node:crypto';
import {verifyRebuiltOrderScopeCandidate,hashModules,ORDER_BASELINE} from './order-scope-version.mjs';
import {probeOrderWebhook} from '../plesk/order-webhook-probe.mjs';
const root='/var/www/vhosts/gravuru-designwerkstatt.de/private',cli=root+'/gravuru-shopify-deploy-tools/node_modules/@shopify/cli';
const app={id:'gid://shopify/App/423276544001',organizationId:'172197140'},tag='gravuru-2027-orders-20261011-build2';
process.umask(0o077);let token='';const receipt=root+'/order-scope-publication-20261011.json';
try {
 if(fs.existsSync(receipt)||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('Publication receipt exists or TLS disabled; inspect before proceeding');
 const staged=JSON.parse(fs.readFileSync(root+'/gravuru-order-scope-rebuilt-20261011.json'));
 if(staged.state!=='staged'||staged.tag!==tag||!/^gid:\/\/shopify\/Version\/[0-9]+$/.test(staged.versionId)||!/^\/var\/www\/vhosts\/gravuru-designwerkstatt\.de\/private\/gravuru-orders-rebuilt-[A-Za-z0-9]+$/.test(staged.privateDirectory))throw Error('Verified staging required');
 const directory=staged.privateDirectory,release=root+'/gravuru-merchant-release-d16b3ce';
 const manifest=JSON.parse(fs.readFileSync(release+'/PACKAGE-MANIFEST.json'));
 if(manifest.sourceCommit!=='d16b3ceb5be4671b32b37db282f0135dc7c3ba46'||createHash('sha256').update(fs.readFileSync('/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-merchant/app.cjs')).digest('hex')!=='f2fe4b2cf459b6a59596e3526fc8ea37cd954fbbc86894d25b0e0a799d870041')throw Error('Active merchant source differs');
 for(const item of manifest.files){if(createHash('sha256').update(fs.readFileSync(release+'/'+item.path)).digest('hex')!==item.sha256)throw Error('Installed package hash differs');}
 const base='https://app-2027.gravuru-designwerkstatt.de',requests=[['/werkstatt/serien/',200,{}],['/api/workshop/orders',401,{}]];
 for(const [path,status,options] of requests){const response=await fetch(base+path,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});if(response.status!==status)throw Error('HTTPS gate differs');await response.body?.cancel();}
 if((await probeOrderWebhook()).status!==401)throw Error('Unsigned webhook gate differs');
 const key=root+'/gravuru-shopify-app-automation-token',st=fs.lstatSync(key);if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||st.mode&0o077)throw Error('Private credential required');token=fs.readFileSync(key,'utf8').trim();
 Object.assign(process.env,{SHOPIFY_APP_AUTOMATION_TOKEN:token,SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'true',NO_COLOR:'1',XDG_CONFIG_HOME:directory});delete process.env.DEBUG;delete process.env.NODE_DEBUG;
 const {ma:getClient}=await import(cli+'/dist/chunk-Q45XAEG2.js');const client=getClient();
 const versions=await client.appVersions(app);if(versions.app.appVersions.nodes.find(v=>v.status==='active')?.versionId!==ORDER_BASELINE)throw Error('Active version changed');
 const before=JSON.parse(fs.readFileSync(directory+'/before.json')),active=await client.activeAppVersion({apiKey:'9640dd7a6907f0c73e7013ea8c24869b'});
 if(active.id!==before.id||hashModules(active.appModuleVersions)!==hashModules(before.appModuleVersions))throw Error('Active baseline changed');
 const candidate=await client.appVersionByTag(app,tag),saved=JSON.parse(fs.readFileSync(directory+'/candidate.json')),check=JSON.parse(fs.readFileSync(directory+'/extension-check.json'));
 if(candidate.uuid!==staged.versionId||hashModules(candidate.appModuleVersions)!==hashModules(saved.appModuleVersions))throw Error('Candidate changed');
 const verification=verifyRebuiltOrderScopeCandidate(before,candidate,ORDER_BASELINE,check.function.sha256);
 fs.writeFileSync(receipt,JSON.stringify({state:'publishing',versionId:candidate.uuid,rollbackVersionId:ORDER_BASELINE}),{flag:'wx'});
 const result=await client.release({app,version:{versionId:candidate.uuid}});if(result.appRelease?.userErrors?.length||!result.appRelease?.appVersion)throw Error('Release rejected');
 const after=await client.activeAppVersion({apiKey:'9640dd7a6907f0c73e7013ea8c24869b'}),afterVersions=await client.appVersions(app);
 if(afterVersions.app.appVersions.nodes.find(v=>v.status==='active')?.versionId!==candidate.uuid||hashModules(after.appModuleVersions)!==hashModules(candidate.appModuleVersions))throw Error('Active release readback differs');
 fs.writeFileSync(directory+'/published-after.json',JSON.stringify(after));
 const output={state:'released',tag,versionId:candidate.uuid,releaseId:after.id,sourceCommit:manifest.sourceCommit,verification:{...verification,released:true},appHome:base+'/werkstatt/',realOrderCreated:false,checkoutConnected:false};
 fs.writeFileSync(receipt,JSON.stringify(output,null,2));console.log(JSON.stringify(output));
}catch(error){console.log(JSON.stringify({state:'stopped',error:String(error.message||'publication_stopped').replaceAll(token||'__no_token__','[redacted]').slice(0,500)}));process.exitCode=1;}
