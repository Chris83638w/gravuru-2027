// Shop-Einstieg (App-Proxy + Block „Jetzt personalisieren“) als neue App-Version – nur auf dem Host.
//   node ops/shopify/stage-shop-entry.mjs stage            → Kandidatenversion ohne Release, Bericht stage.json
//   node ops/shopify/stage-shop-entry.mjs release <ordner> → genau diesen Kandidaten freigeben (keine Löschungen)
// Quelle ist das vollständige Projekt der aktiven Version vom 22.10.2026 (unverändert kopiert). Ergänzt werden nur
// [app_proxy] und zwei Theme-Dateien aus ops/shopify/theme-block. Zugang nur im Kindprozess, Logs ohne Token.
// Rückweg: `app release --version gravuru-2027-ids-tier-20261022-v1`. Spezifikation: ops/shopify/SHOP-EINSTIEG.md.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root='/var/www/vhosts/gravuru-designwerkstatt.de/private';
const source=root+'/gravuru-id-price-candidate-20261022-v2';
const cli=root+'/gravuru-shopify-deploy-tools/node_modules/@shopify/cli/bin/run.js';
const node='/opt/plesk/node/24/bin/node';
const blockDir=path.join(path.dirname(fileURLToPath(import.meta.url)),'theme-block');
export const TAG='gravuru-2027-shop-einstieg-20261026-v1',BASELINE='gravuru-2027-ids-tier-20261022-v1';
export const PROXY='\n[app_proxy]\nurl = "https://app-2027.gravuru-designwerkstatt.de/apps/konfigurator"\nsubpath = "konfigurator"\nprefix = "apps"\n';
export const ADDED=['blocks/jetzt-personalisieren.liquid','assets/gravuru-personalisieren.js'];

export function withProxy(text){if(text.includes('[app_proxy]'))throw Error('App-Proxy ist schon eingetragen.');return text.trimEnd()+'\n'+PROXY;}
export function activeTag(json){const list=Array.isArray(json)?json:json?.appVersions??json?.versions??[];const active=list.find(v=>String(v.status||'').toLowerCase()==='active');return active?.versionTag??active?.tag??active?.name??null;}

function readToken(){const key=root+'/gravuru-shopify-app-automation-token',st=fs.lstatSync(key);if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||st.mode&0o077)throw Error('Privater Zugang fehlt oder ist zu offen.');return fs.readFileSync(key,'utf8').trim();}
function run(args,work,token){const env={...process.env,SHOPIFY_APP_AUTOMATION_TOKEN:token,SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'true',NO_COLOR:'1',XDG_CONFIG_HOME:work};delete env.DEBUG;delete env.NODE_DEBUG;const r=spawnSync(node,[cli,...args],{encoding:'utf8',env,timeout:600000,maxBuffer:16*1024*1024});return {status:r.status,log:String((r.stdout||'')+'\n'+(r.stderr||'')).replaceAll(token,'[redacted]')};}
function versions(project,work,token,name){const r=run(['app','versions','list','--path',project,'--json'],work,token);fs.writeFileSync(path.join(work,name),r.log);let tag=null;try{tag=activeTag(JSON.parse(r.log.slice(r.log.indexOf('['),r.log.lastIndexOf(']')+1)||r.log));}catch{}return {status:r.status,active:tag};}

async function stage(){
 process.umask(0o077);
 const work=fs.mkdtempSync(root+'/gravuru-shop-einstieg-'),project=work+'/project';
 fs.cpSync(source,project,{recursive:true,verbatimSymlinks:true});
 const toml=project+'/shopify.app.toml';fs.writeFileSync(toml,withProxy(fs.readFileSync(toml,'utf8')));
 for(const rel of ADDED){const dest=project+'/extensions/gravuru-storefront/'+rel;if(fs.existsSync(dest))throw Error('Datei existiert schon: '+rel);fs.copyFileSync(path.join(blockDir,rel),dest);}
 const token=readToken();
 const before=versions(project,work,token,'versions-before.json');
 if(before.active!==BASELINE)throw Error('Aktive Version ist nicht '+BASELINE+' (gelesen: '+before.active+'). Stopp.');
 const deploy=run(['app','deploy','--path',project,'--no-release','--no-input','--version',TAG,'--message','Shop-Einstieg: App-Proxy /apps/konfigurator und Block Jetzt personalisieren'],work,token);
 fs.writeFileSync(work+'/deploy.log',deploy.log);
 const after=versions(project,work,token,'versions-after.json');
 const report={state:deploy.status===0?'staged':'failed',tag:TAG,work,activeBefore:before.active,activeAfter:after.active,deployStatus:deploy.status,candidateListed:fs.readFileSync(work+'/versions-after.json','utf8').includes(TAG),themeFilesAdded:ADDED,released:false};
 fs.writeFileSync(work+'/stage.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(deploy.status!==0)process.exitCode=1;
}
async function release(work){
 const report=JSON.parse(fs.readFileSync(path.join(work,'stage.json'),'utf8'));if(report.state!=='staged'||report.tag!==TAG)throw Error('Kein bereitgestellter Kandidat in '+work);
 const project=work+'/project',token=readToken();
 const before=versions(project,work,token,'versions-before-release.json');if(before.active!==BASELINE)throw Error('Aktive Version hat sich geändert: '+before.active);
 const r=run(['app','release','--path',project,'--version',TAG,'--allow-updates','--no-input'],work,token);fs.writeFileSync(work+'/release.log',r.log);
 const after=versions(project,work,token,'versions-after-release.json');
 const out={state:r.status===0&&after.active===TAG?'released':'release_failed',activeBefore:before.active,activeAfter:after.active,releaseStatus:r.status,rollback:BASELINE};
 fs.writeFileSync(work+'/release.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));if(out.state!=='released')process.exitCode=1;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [mode,work]=process.argv.slice(2);
 (mode==='stage'?stage():mode==='release'&&work?release(work):Promise.reject(Error('Aufruf: stage | release <ordner>')))
  .catch(e=>{console.log(JSON.stringify({state:'stopped',error:String(e.message).slice(0,600)}));process.exitCode=1;});
}
