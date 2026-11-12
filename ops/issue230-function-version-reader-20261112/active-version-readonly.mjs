// Existing CLI 4.9.0 Dev-Platform READ methods only. No app project parsing,
// build/deploy/release, DB constructor, Shopify Admin mutation or token-file read.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const APP=Object.freeze({id:'gid://shopify/App/423276544001',organizationId:'172197140',title:'Gravuru Konfigurator'});
const APP_KEY='9640dd7a6907f0c73e7013ea8c24869b',FUNCTION_UID='3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>sha(JSON.stringify(canonical(v)));
class ReaderError extends Error{constructor(code){super(code);this.code=code;}}
const need=(ok,code)=>{if(!ok)throw new ReaderError(code);};
const iso=clock=>{const time=clock();need(Number.isSafeInteger(time)&&time>=0,'version_reader_clock');return new Date(time).toISOString();};
function activeRow(response){
 const app=response?.app,rows=app?.appVersions?.nodes;
 need(app&&(!Object.hasOwn(app,'id')||app.id===APP.id)&&Array.isArray(rows)&&rows.length>0&&rows.length<=2000,'version_reader_versions_schema');
 const active=rows.filter(row=>row?.status==='active');need(active.length===1,'version_reader_active_not_unique');const row=active[0];
 need(/^gid:\/\/shopify\/Version\/[1-9][0-9]*$/.test(row.versionId??'')&&/^[A-Za-z0-9_.-]{1,160}$/.test(row.versionTag??''),'version_reader_active_identity');
 return {versionId:row.versionId,versionTag:row.versionTag,status:'active'};
}
function moduleProof(snapshot){
 need(/^gid:\/\/shopify\/Release\/[1-9][0-9]*$/.test(snapshot?.id??'')&&Array.isArray(snapshot.appModuleVersions),'version_reader_snapshot_schema');
 const matches=snapshot.appModuleVersions.filter(m=>m?.registrationId===FUNCTION_UID&&m.registrationTitle==='gravuru-personalization-price'&&m.type==='function');need(matches.length===1,'version_reader_function_not_unique');
 const m=matches[0],c=m.config;
 need(m.target==='cart.transform.run'&&typeof m.registrationUuid==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(m.registrationUuid)&&c?.app_key===APP_KEY&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(c.module_id??'')&&Number.isSafeInteger(c.module_metadata?.module_wasm_size_bytes)&&c.module_metadata.module_wasm_size_bytes>0&&c.module_metadata.module_wasm_size_bytes<10000000&&Array.isArray(c.targets)&&c.targets.length===1&&c.targets[0].handle==='cart.transform.run'&&typeof c.targets[0].input_query==='string'&&Buffer.byteLength(c.targets[0].input_query)<100000,'version_reader_function_schema');
 const query=c.targets[0].input_query;
 return {releaseId:snapshot.id,moduleCount:snapshot.appModuleVersions.length,function:{registrationId:m.registrationId,registrationUuid:m.registrationUuid,handle:'gravuru-personalization-price',target:'cart.transform.run',moduleId:c.module_id,wasmBytes:c.module_metadata.module_wasm_size_bytes,inputQuerySha256:sha(query),containsJsonValue:/\bjsonValue\b/.test(query),containsValue:/\bvalue\b/.test(query),configSha256:digest(c)}};
}
export async function readActiveVersion(client,{clock=Date.now}={}){
 need(typeof client?.appVersions==='function'&&typeof client?.activeAppVersion==='function','version_reader_client_methods');
 const readStartedAt=iso(clock);
 const safeRead=async(method,input)=>{try{return await client[method](input);}catch{throw new ReaderError('version_reader_remote_failed');}};
 const first=activeRow(await safeRead('appVersions',APP));
 const details=moduleProof(await safeRead('activeAppVersion',{apiKey:APP_KEY})),observedAt=iso(clock);
 const last=activeRow(await safeRead('appVersions',APP)),readCompletedAt=iso(clock);
 need(first.versionId===last.versionId&&first.versionTag===last.versionTag,'version_reader_active_changed');
 need(readStartedAt<=observedAt&&observedAt<=readCompletedAt,'version_reader_clock_changed');
 // Exact projection only: never return raw SDK responses, scopes, URLs, headers,
 // tokens, unrelated modules or a guessed WASM digest from its byte count.
 return {schema:'issue230-active-app-version-readonly/v1',readOnly:true,mutations:0,appId:APP.id,organizationId:APP.organizationId,readStartedAt,observedAt,readCompletedAt,activeVersion:first,...details,versionReadBracketStable:true,wasmDigestRead:false};
}
export function validateCliRoot(directory){
 const root=path.resolve(directory),packageFile=path.join(root,'package.json'),clientFile=path.join(root,'dist/chunk-Q45XAEG2.js');
 const packageStat=fs.lstatSync(packageFile);need(packageStat.isFile()&&!packageStat.isSymbolicLink(),'version_reader_cli_regular_files');
 const pkg=JSON.parse(fs.readFileSync(packageFile,'utf8'));need(pkg.name==='@shopify/cli'&&pkg.version==='4.9.0','version_reader_cli_version');
 const clientStat=fs.lstatSync(clientFile);need(clientStat.isFile()&&!clientStat.isSymbolicLink(),'version_reader_cli_regular_files');
 return {clientFile,cliVersion:pkg.version,packageSha256:sha(fs.readFileSync(packageFile)),clientChunkSha256:sha(fs.readFileSync(clientFile))};
}
async function quiet(operation){
 // The SDK may print diagnostics while authenticating. They are never forwarded.
 // This standalone reader owns its process; do not use this wrapper in a host.
 const out=process.stdout.write,err=process.stderr.write;const discard=(_chunk,encoding,callback)=>{if(typeof encoding==='function')encoding();else if(typeof callback==='function')callback();return true;};
 process.stdout.write=discard;process.stderr.write=discard;
 try{return await operation();}finally{process.stdout.write=out;process.stderr.write=err;}
}
function writePrivateNew(file,value){
 const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n'),fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 if(process.platform!=='win32'){const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}}
 return {bytes:bytes.length,sha256:sha(bytes)};
}
export async function run(argv){
 need(argv.length===4&&argv[0]==='--cli-root'&&argv[2]==='--out','version_reader_arguments');
 need(process.env.NODE_TLS_REJECT_UNAUTHORIZED!=='0','version_reader_tls');
 // Credentials stay with the existing host launcher. No file is opened here.
 need(typeof process.env.SHOPIFY_APP_AUTOMATION_TOKEN==='string'&&process.env.SHOPIFY_APP_AUTOMATION_TOKEN.length>=16,'version_reader_existing_auth_required');
 const cli=validateCliRoot(argv[1]),output=path.resolve(argv[3]),parent=path.dirname(output);
 need(!fs.existsSync(output)&&fs.lstatSync(parent).isDirectory()&&!fs.lstatSync(parent).isSymbolicLink(),'version_reader_new_private_output');
 if(process.platform!=='win32'){const stat=fs.statSync(parent);need(stat.uid===process.getuid()&&(stat.mode&0o077)===0,'version_reader_private_directory');}
 process.umask(0o077);const state=fs.mkdtempSync(path.join(parent,'cli-version-read-state-'));
 Object.assign(process.env,{SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'true',NO_COLOR:'1',XDG_CONFIG_HOME:state});delete process.env.DEBUG;delete process.env.NODE_DEBUG;
 const report=await quiet(async()=>{const {ma:getClient}=await import(pathToFileURL(cli.clientFile).href);need(typeof getClient==='function','version_reader_cli_export');return readActiveVersion(getClient());});
 const result={...report,reader:{cliVersion:cli.cliVersion,packageSha256:cli.packageSha256,clientChunkSha256:cli.clientChunkSha256}};
 const file=writePrivateNew(output,result);return {ok:true,readOnly:true,mutations:0,activeVersion:result.activeVersion,observedAt:result.observedAt,outputSha256:file.sha256,outputBytes:file.bytes};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 // Bound an unavailable auth/remote request. No child/runtime/app is started.
 const timer=setTimeout(()=>{process.stdout.write=stdout;process.stderr.write=stderr;process.stderr.write(JSON.stringify({ok:false,code:'version_reader_timeout',mutations:0})+'\n');process.exit(1);},45000);
 const stdout=process.stdout.write,stderr=process.stderr.write;
 run(process.argv.slice(2)).then(result=>{clearTimeout(timer);console.log(JSON.stringify(result));}).catch(error=>{clearTimeout(timer);console.error(JSON.stringify({ok:false,code:error instanceof ReaderError?error.code:'version_reader_failed',mutations:0}));process.exitCode=1;});
}
