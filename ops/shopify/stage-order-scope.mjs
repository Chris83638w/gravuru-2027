import {proposeOrderScope,verifyRebuiltOrderScopeCandidate,hashModules,ORDER_BASELINE} from './order-scope-version.mjs';
import fs from 'node:fs';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const root='/var/www/vhosts/gravuru-designwerkstatt.de/private',source=root+'/gravuru-extension-check-vdp0xa7n/project',cli=root+'/gravuru-shopify-deploy-tools/node_modules/@shopify/cli',tag='gravuru-2027-orders-20261011-build2',app={id:'gid://shopify/App/423276544001',organizationId:'172197140'};
const receipt=root+'/gravuru-order-scope-rebuilt-20261011.json';let token='';process.umask(0o077);
try {
 if(fs.existsSync(receipt))throw Error('Receipt exists; inspect instead of repeating');
 const manifest=JSON.parse(fs.readFileSync(source+'/RELEASE-FILES.json'));
 for(const [name,e]of Object.entries(manifest.files)){let b=fs.readFileSync(source+'/'+name);if(name==='shopify.app.toml')b=Buffer.from(b.toString().replace('https://app-2027.gravuru-designwerkstatt.de/werkstatt/','https://gravuru-designwerkstatt.de/produktanlage.html'));if(b.length!==e.bytes||createHash('sha256').update(b).digest('hex')!==e.sha256)throw Error('Source differs: '+name);}
 const key=root+'/gravuru-shopify-app-automation-token',st=fs.lstatSync(key);if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||st.mode&0o077)throw Error('Private credential required');token=fs.readFileSync(key,'utf8').trim();
 const work=fs.mkdtempSync(root+'/gravuru-orders-rebuilt-'),project=work+'/project';fs.cpSync(source,project,{recursive:true,verbatimSymlinks:true});
 Object.assign(process.env,{SHOPIFY_APP_AUTOMATION_TOKEN:token,SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'true',NO_COLOR:'1',XDG_CONFIG_HOME:work});delete process.env.DEBUG;delete process.env.NODE_DEBUG;
 const {ma:getClient}=await import(cli+'/dist/chunk-Q45XAEG2.js');const client=getClient();
 const versions=await client.appVersions(app);if(versions.app.appVersions.nodes.find(v=>v.status==='active')?.versionId!==ORDER_BASELINE)throw Error('Active version changed');
 const before=await client.activeAppVersion({apiKey:'9640dd7a6907f0c73e7013ea8c24869b'}),saved=JSON.parse(fs.readFileSync(root+'/gravuru-order-baseline-TCtOQW/before.json'));if(before.id!==saved.id||hashModules(before.appModuleVersions)!==hashModules(saved.appModuleVersions))throw Error('Baseline changed');
 const proposal=proposeOrderScope(before,ORDER_BASELINE);fs.writeFileSync(work+'/before.json',JSON.stringify(before));fs.writeFileSync(work+'/expected.json',JSON.stringify({...before,appModuleVersions:proposal.proposed}));
 const config=project+'/shopify.app.toml',text=fs.readFileSync(config,'utf8'),old='scopes = '+JSON.stringify(before.appModuleVersions.find(m=>m.type==='app_access').config.scopes),next='scopes = '+JSON.stringify(proposal.proposed.find(m=>m.type==='app_access').config.scopes);
 if(text.split(old).length!==2)throw Error('Scope line differs');fs.writeFileSync(config,text.replace(old,next));
 fs.writeFileSync(receipt,JSON.stringify({state:'building',tag,privateDirectory:work}),{flag:'wx'});
 const result=spawnSync('/opt/plesk/node/24/bin/node',[cli+'/bin/run.js','app','deploy','--path',project,'--no-release','--no-input','--version',tag,'--message','Test-Bestelleingang: read_orders ergaenzt, Theme und Preisfunktion bytegleich erhalten.','--source-control-url','https://github.com/Chris83638w/gravuru-2027/commit/d16b3ceb5be4671b32b37db282f0135dc7c3ba46'],{encoding:'utf8',env:process.env,timeout:180000,maxBuffer:4*1024*1024});
 fs.writeFileSync(work+'/deploy.log',(result.stdout+'\n'+result.stderr).replaceAll(token,'[redacted]'));if(result.status!==0)throw Error('CLI build/deploy failed; inspect private log');
 const checked=spawnSync(root+'/gravuru-2027-test-python311/bin/python',[root+'/orders-verify-extension-20261011.py','--project',project,'--active',work+'/expected.json','--output',work+'/extension-check.json'],{encoding:'utf8',timeout:30000});if(checked.status!==0)throw Error('Extension source verification failed: '+checked.stderr.slice(-500));
 const check=JSON.parse(fs.readFileSync(work+'/extension-check.json')),candidate=await client.appVersionByTag(app,tag);fs.writeFileSync(work+'/candidate.json',JSON.stringify(candidate));
 const verification=verifyRebuiltOrderScopeCandidate(before,candidate,ORDER_BASELINE,check.function.sha256);
 const after=await client.appVersions(app);if(after.app.appVersions.nodes.find(v=>v.status==='active')?.versionId!==ORDER_BASELINE)throw Error('Active version changed during staging');
 const output={state:'staged',tag,versionId:candidate.uuid,privateDirectory:work,verification,themeFileCount:check.themeFiles.length,sourceCommit:'d16b3ceb5be4671b32b37db282f0135dc7c3ba46',released:false};fs.writeFileSync(receipt,JSON.stringify(output,null,2));console.log(JSON.stringify(output));
}catch(e){const result={state:'stopped',error:String(e.message||'rebuilt_failed').replaceAll(token||'__no_token__','[redacted]').slice(0,800)};console.log(JSON.stringify(result));fs.writeFileSync(root+'/gravuru-order-scope-rebuilt-error-20261011.json',JSON.stringify(result));process.exitCode=1;}
