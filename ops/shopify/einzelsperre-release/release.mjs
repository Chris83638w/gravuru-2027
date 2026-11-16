// Einzelsperre-Release (Chris 16.11.2026: „mach du das“). Läuft auf dem Plesk-Host über die
// Node-Konsole: exec -- node ../private/claude-einzelsperre-20261116/release.mjs --modus <m> ...
// Kein Wert des Automation-Tokens wird ausgegeben oder gespeichert. Kein --allow-deletes.
//
// Modi (in dieser Reihenfolge, jeder Schritt einzeln):
//   inventar                      nur lesen: vorhandene vollständige App-Projekte im private-Ordner
//   snapshot                      nur lesen: aktive Version + Module von Shopify
//   projekt --stufe A|B --vorlage <Projektordner>
//                                 lokal: neues vollständiges Projekt (Vorlage geprüft gegen Snapshot)
//   kandidat --stufe A|B          Shopify: Version ohne Freigabe hochladen (--no-release --no-build)
//   pruefen --stufe A|B           nur lesen: Kandidat gegen aktive Version (Modul für Modul)
//   freigeben --stufe A|B         Shopify: Kandidat freigeben (nur --allow-updates)
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import zlib from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const PRIVATE=process.env.EINZELSPERRE_TEST_PRIVATE||'/var/www/vhosts/gravuru-designwerkstatt.de/private';
const WORK=path.join(PRIVATE,'claude-einzelsperre-arbeit');
const CLI_DIR=path.join(PRIVATE,'gravuru-shopify-deploy-tools/node_modules/@shopify/cli');
const APP={id:'gid://shopify/App/423276544001',organizationId:'172197140',title:'Gravuru Konfigurator'};
const APP_KEY='9640dd7a6907f0c73e7013ea8c24869b';
const ACTIVE_ID='gid://shopify/Version/1199363391489',ACTIVE_TAG='gravuru-2027-steel-pricing-input-20261108-v2';
const FN_UID='3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef',THEME_UID='a4d6506c-8e89-ca7d-f5b1-1a0d1e00a1f9bb93e76a';
const TAGS={A:'gravuru-2027-checkout-pruefung-20261116-a1',B:'gravuru-2027-preis-einzelsperre-20261116-b1'};
const MESSAGES={A:'Checkout-Pruefung gravuru-checkout-guard ergaenzt; Preisfunktion, Theme und Einstellungen unveraendert.',B:'Preisfunktion Einzelsperre: ungueltige Position sperrt nur sich selbst; sonst unveraendert.'};
const BUNDLE=JSON.parse(fs.readFileSync(path.join(HERE,fs.existsSync(path.join(HERE,'bundle-v2.json'))?'bundle-v2.json':'bundle.json'),'utf8'));

const args=Object.fromEntries(process.argv.slice(2).reduce((r,v,i,s)=>v.startsWith('--')?[...r,[v.slice(2),s[i+1]]]:r,[]));
const sha=b=>createHash('sha256').update(b).digest('hex');
const sha64=b=>createHash('sha256').update(b).digest('base64');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>sha(JSON.stringify(canonical(v)));
const out=o=>console.log(JSON.stringify(o));
const fail=(code,extra={})=>{out({ok:false,code,...extra});process.exit(2);};

function token(){
 const file=path.join(PRIVATE,'gravuru-shopify-app-automation-token');
 const s=fs.statSync(file);if(!s.isFile()||s.mode&0o077)fail('token_datei');
 const t=fs.readFileSync(file,'utf8').trim();if(!/^[\x21-\x7e]{16,8192}$/.test(t))fail('token_format');
 return t;
}
function cliEnv(t){
 const env={...process.env};
 for(const k of Object.keys(env))if(k.startsWith('SHOPIFY_')||['DEBUG','NODE_DEBUG'].includes(k))delete env[k];
 fs.mkdirSync(path.join(WORK,'.cli-config'),{recursive:true,mode:0o700});
 return Object.assign(env,{CI:'true',NO_COLOR:'1',SHOPIFY_CLI_NO_ANALYTICS:'1',SHOPIFY_APP_AUTOMATION_TOKEN:t,XDG_CONFIG_HOME:path.join(WORK,'.cli-config')});
}
function checkCli(){
 const meta=JSON.parse(fs.readFileSync(path.join(CLI_DIR,'package.json'),'utf8'));
 if(meta.name!=='@shopify/cli'||meta.version!=='4.9.0')fail('cli_version');
}
async function client(){
 checkCli();const t=token();Object.assign(process.env,cliEnv(t));
 const {ma}=await import(pathToFileURL(path.join(CLI_DIR,'dist/chunk-Q45XAEG2.js')));
 return {c:ma(),t};
}
function save(name,value){fs.mkdirSync(WORK,{recursive:true,mode:0o700});const f=path.join(WORK,name);fs.writeFileSync(f,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n',{mode:0o600});return f;}
function noToken(text,t){if(t&&String(text).includes(t))fail('token_in_ausgabe');}

const fingerprint=m=>({id:m.registrationId,uuid:m.registrationUuid,handle:m.registrationTitle,type:m.type,target:m.target,config:m.config});
const stripBinary=c=>{const {module_id,module_metadata,...rest}=c||{};return rest;};
function summary(version){
 const mods=(version?.appModuleVersions||[]).map(fingerprint).sort((a,b)=>a.handle.localeCompare(b.handle));
 return mods.map(m=>({handle:m.handle,type:m.type,uid:m.id,target:m.target||null,configHash:hash(m.type==='function'?stripBinary(m.config):m.config).slice(0,16),wasmBytes:m.config?.module_metadata?.module_wasm_size_bytes??null}));
}
async function activeChecked(c,tag=ACTIVE_TAG,id=ACTIVE_ID){
 const versions=(await c.appVersions(APP)).app?.appVersions?.nodes||[];
 const active=versions.filter(v=>v.status==='active');
 if(active.length!==1||(id&&active[0].versionId!==id)||active[0].versionTag!==tag)fail('aktive_version_geaendert',{aktiv:active.map(v=>v.versionTag)});
 return c.activeAppVersion({apiKey:APP_KEY});
}

function wasmSuche(){
 const treffer=[];let anzahl=0;
 const walk=(dir,depth)=>{
  if(depth>8)return;let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
  for(const e of entries){
   const p=path.join(dir,e.name);
   if(e.isDirectory()){if(!['node_modules','.git','.cli-config','.cache','.npm'].includes(e.name))walk(p,depth+1);}
   else if(e.isFile()&&e.name.endsWith('.wasm')){anzahl++;const b=fs.readFileSync(p);const s=sha(b);if(b.length===Number(args.groesse||20977)||s===args.sha)treffer.push({datei:path.relative(PRIVATE,p),bytes:b.length,sha:s,mtime:fs.statSync(p).mtime.toISOString()});}
  }
 };
 walk(PRIVATE,0);out({ok:true,modus:'wasm-suche',anzahl,treffer});
}
function inventar(){
 const found=[];
 const walk=(dir,depth)=>{
  if(depth>5)return;let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
  if(entries.some(e=>e.name==='shopify.app.toml')&&fs.existsSync(path.join(dir,'extensions/gravuru-storefront'))){
   const fnWasm=path.join(dir,'extensions/gravuru-personalization-price/dist/function.wasm');
   const files=[];const w2=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w2(p);else files.push(p);}};w2(path.join(dir,'extensions/gravuru-storefront'));
   found.push({dir,themeFiles:files.length,fnWasmSha:fs.existsSync(fnWasm)?sha(fs.readFileSync(fnWasm)):null,extensions:fs.readdirSync(path.join(dir,'extensions')),mtime:fs.statSync(dir).mtime.toISOString()});
   return;
  }
  for(const e of entries)if(e.isDirectory()&&!['node_modules','.git','.cli-config'].includes(e.name))walk(path.join(dir,e.name),depth+1);
 };
 walk(PRIVATE,0);
 const ordner=fs.readdirSync(PRIVATE,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
 // Theme-Asset-Sammlungen (z. B. mika-steel-theme-assets-20261108.json.gz): nur Aufbau, Namen, Größen, Prüfsummen.
 const sammlungen=fs.readdirSync(PRIVATE).filter(n=>/theme-assets.*\.json(\.gz)?$/.test(n)).map(n=>{
  try{
   let b=fs.readFileSync(path.join(PRIVATE,n));if(n.endsWith('.gz'))b=zlib.gunzipSync(b);
   const j=JSON.parse(b.toString('utf8'));return {datei:n,aufbau:describe(j)};
  }catch(e){return {datei:n,fehler:String(e.message).slice(0,120)};}
 });
 out({ok:true,modus:'inventar',projekte:found,ordner,sammlungen});
}
function describe(j,depth=0){
 if(depth>3)return typeof j;
 if(Array.isArray(j))return {liste:j.length,erstes:j.length?describe(j[0],depth+1):null};
 if(j&&typeof j==='object'){
  const keys=Object.keys(j);
  return Object.fromEntries(keys.slice(0,25).map(k=>{
   const v=j[k];
   if(typeof v==='string')return [k,v.length>200?{text:v.length,sha64:sha64(/^[A-Za-z0-9+/=\s]+$/.test(v)&&v.length%4===0?Buffer.from(v,'base64'):Buffer.from(v)) ,base64:/^[A-Za-z0-9+/=\s]+$/.test(v)}:v.slice(0,80)];
   return [k,describe(v,depth+1)];
  }).concat(keys.length>25?[['_weitere',keys.length-25]]:[]));
 }
 return j;
}

async function snapshot(){
 const {c,t}=await client();const before=await activeChecked(c);
 const text=JSON.stringify(before);noToken(text,t);
 const f=save('snapshot-aktiv.json',before);
 const theme=before.appModuleVersions.find(m=>m.registrationTitle==='gravuru-storefront');
 const files=theme?.config?.theme_extension?.files||{};
 const themeFiles=Object.entries(files).flatMap(([d,e])=>Object.entries(e).map(([n,v])=>({file:d+'/'+n,inline:typeof v.value==='string',bytes:typeof v.value==='string'?Buffer.byteLength(v.value):v.size})));
 out({ok:true,modus:'snapshot',datei:f,sha:sha(text),module:summary(before),themeFiles});
}

function readToml(file){
 const py=fs.existsSync('/opt/alt/python311/bin/python3')?'/opt/alt/python311/bin/python3':'python3';
 const r=spawnSync(py,['-I','-c','import sys,json,tomllib\nprint(json.dumps(tomllib.loads(sys.stdin.read())))'],{input:fs.readFileSync(file),encoding:'utf8'});
 if(r.status!==0)fail('toml_lesen',{file:path.basename(file)});return JSON.parse(r.stdout);
}
function copyTree(src,dst){fs.cpSync(src,dst,{recursive:true,errorOnExist:true,force:false});}
function writeFunction(projekt,name,stufe){
 const part=BUNDLE[name];const dir=path.join(projekt,'extensions',part.handle);
 if(fs.existsSync(dir))fs.rmSync(dir,{recursive:true});
 fs.mkdirSync(dir,{recursive:true});copyTree(path.join(HERE,name,'src'),path.join(dir,'src'));
 fs.mkdirSync(path.join(dir,'dist'));const wasm=fs.readFileSync(path.join(HERE,name,'function.wasm'));
 if(sha(wasm)!==part.wasmSha256)fail('wasm_pruefsumme',{name});
 fs.writeFileSync(path.join(dir,'dist/function.wasm'),wasm);
 return dir;
}
function projekt(){
 const stufe=args.stufe,vorlage=path.resolve(args.vorlage||'');if(!['A','B'].includes(stufe)||!args.vorlage)fail('argumente');
 const snap=JSON.parse(fs.readFileSync(path.join(WORK,'snapshot-aktiv.json'),'utf8'));
 const theme=snap.appModuleVersions.find(m=>m.registrationTitle==='gravuru-storefront'),fn=snap.appModuleVersions.find(m=>m.registrationTitle==='gravuru-personalization-price');
 if(theme?.registrationId!==THEME_UID||fn?.registrationId!==FN_UID)fail('modul_identitaet');
 // Theme-Dateien der Vorlage müssen exakt dem aktiven Stand entsprechen.
 const tdir=path.join(vorlage,'extensions/gravuru-storefront');const abweichung=[];let geprueft=0;
 for(const [d,entries] of Object.entries(theme.config.theme_extension.files))for(const [n,e] of Object.entries(entries)){
  const p=path.join(tdir,d,n);if(!fs.existsSync(p)){abweichung.push(d+'/'+n+': fehlt');continue;}
  const b=fs.readFileSync(p);
  if(typeof e.value==='string'?b.toString('utf8')!==e.value:(b.length!==e.size||sha64(b)!==e.sha256))abweichung.push(d+'/'+n);else geprueft++;
 }
 const lokal=[];const w=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else lokal.push(path.relative(tdir,p));}};w(tdir);
 const extra=lokal.filter(f=>f!=='shopify.extension.toml'&&!theme.config.theme_extension.files[f.split('/')[0]]?.[f.split('/').slice(1).join('/')]);
 if(abweichung.length||extra.length)fail('theme_abweichung',{abweichung,extra});
 const ziel=path.join(WORK,'projekt-'+stufe);if(fs.existsSync(ziel))fail('ziel_existiert');
 fs.mkdirSync(ziel,{recursive:true,mode:0o700});
 for(const item of fs.readdirSync(vorlage))if(item.startsWith('shopify.app')&&item.endsWith('.toml')||item==='package.json')fs.copyFileSync(path.join(vorlage,item),path.join(ziel,item));
 fs.mkdirSync(path.join(ziel,'extensions'));
 for(const ext of fs.readdirSync(path.join(vorlage,'extensions')))copyTree(path.join(vorlage,'extensions',ext),path.join(ziel,'extensions',ext));
 // Preisfunktion: Abfrage immer exakt die aktive (Paket preis/src), WASM je Stufe:
 // Stufe A = aktive WASM (--preis-wasm, Größe muss der aktiven Version entsprechen), Stufe B = Einzelsperre.
 const fdir=path.join(ziel,'extensions/gravuru-personalization-price');
 const ftoml=readToml(path.join(fdir,'shopify.extension.toml'));
 const fext=ftoml.extensions?.[0]||ftoml;if((fext.uid||ftoml.uid)!==FN_UID)fail('funktion_uid');
 const queryFile=(fext.targeting?.[0]?.input_query)||'src/cart_transform_run.graphql';
 const activeQuery=fn.config.targets?.[0]?.input_query;
 const paketQuery=fs.readFileSync(path.join(HERE,'preis/src/cart_transform_run.graphql'),'utf8');
 if(!activeQuery||activeQuery.trim()!==paketQuery.trim())fail('aktive_query_abweichung');
 fs.rmSync(path.join(fdir,'src'),{recursive:true,force:true});copyTree(path.join(HERE,stufe==='A'?'aktiv':'preis','src'),path.join(fdir,'src'));
 if(fs.readFileSync(path.join(fdir,'src/cart_transform_run.graphql'),'utf8').trim()!==paketQuery.trim())fail('query_quelle');
 if(queryFile!=='src/cart_transform_run.graphql')fs.writeFileSync(path.join(fdir,queryFile),paketQuery);
 fs.mkdirSync(path.join(fdir,'dist'),{recursive:true});
 // Stufe A: Nachbau der aktiven Quelle (die aktive WASM liegt nirgends vor), Stufe B: Einzelsperre.
 const teil=stufe==='A'?'aktiv':'preis';
 const wasm=fs.readFileSync(path.join(HERE,teil,'function.wasm'));if(sha(wasm)!==BUNDLE[teil].wasmSha256)fail('wasm_pruefsumme',{teil});
 fs.writeFileSync(path.join(fdir,'dist/function.wasm'),wasm);
 // Checkout-Prüfung in beiden Stufen (in B unverändert gegenüber A).
 const gdir=writeFunction(ziel,'pruefung',stufe);
 for(const f of ['shopify.extension.toml','package.json','schema.graphql'])if(fs.existsSync(path.join(HERE,'pruefung',f)))fs.copyFileSync(path.join(HERE,'pruefung',f),path.join(gdir,f));
 const files=[];const w3=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w3(p);else files.push({f:path.relative(ziel,p),sha:sha(fs.readFileSync(p))});}};w3(ziel);
 save('projekt-'+stufe+'-dateien.json',files);
 out({ok:true,modus:'projekt',stufe,ziel,themeGeprueft:geprueft,dateien:files.length,preisWasm:sha(fs.readFileSync(path.join(fdir,'dist/function.wasm'))),preisWasmBytes:fs.statSync(path.join(fdir,'dist/function.wasm')).size,funktionToml:fext.name+' / '+(fext.targeting?.[0]?.export||''),pruefWasm:BUNDLE.pruefung.wasmSha256.slice(0,16),extensions:fs.readdirSync(path.join(ziel,'extensions'))});
}

function cli(argv,t){
 checkCli();
 const r=spawnSync(process.execPath,[path.join(CLI_DIR,'bin/run.js'),...argv],{encoding:'utf8',timeout:170000,env:cliEnv(t),maxBuffer:8*1024*1024});
 const text=(r.stdout||'')+(r.stderr||'');noToken(text,t);
 save('cli-'+argv[1]+'-'+Date.now()+'.log',text);
 return {status:r.status,text};
}
function configName(projekt){
 const tomls=fs.readdirSync(projekt).filter(f=>/^shopify\.app(\.[a-z0-9-]+)?\.toml$/.test(f));
 if(tomls.length<1)fail('app_toml');
 const main=tomls.includes('shopify.app.toml')?'shopify.app.toml':tomls[0];
 const cfg=readToml(path.join(projekt,main));if(cfg.client_id!==APP_KEY)fail('client_id');
 return main==='shopify.app.toml'?null:main.replace(/^shopify\.app\./,'').replace(/\.toml$/,'');
}
async function kandidat(){
 const stufe=args.stufe;if(!TAGS[stufe])fail('argumente');
 const {c,t}=await client();await activeChecked(c,stufe==='B'?TAGS.A:ACTIVE_TAG,stufe==='B'?null:ACTIVE_ID);
 const existing=await c.appVersionByTag(APP,TAGS[stufe]).catch(()=>null);if(existing?.versionTag===TAGS[stufe])fail('tag_existiert');
 const projektDir=path.join(WORK,'projekt-'+stufe),cfg=configName(projektDir);
 const argv=['app','deploy','--path',projektDir,...(cfg?['--config',cfg]:[]),'--no-release','--no-build','--no-input','--no-color','--version',TAGS[stufe],'--message',MESSAGES[stufe]];
 const r=cli(argv,t);
 out({ok:r.status===0,modus:'kandidat',stufe,tag:TAGS[stufe],status:r.status,ende:r.text.split('\n').filter(l=>l.trim()).slice(-12)});
}
function compare(before,cand,stufe){
 const b=Object.fromEntries((before.appModuleVersions||[]).map(m=>[m.registrationId,fingerprint(m)]));
 const k=Object.fromEntries((cand.appModuleVersions||[]).map(m=>[m.registrationId,fingerprint(m)]));
 const fehlt=Object.keys(b).filter(id=>!k[id]).map(id=>b[id].handle);
 const neu=Object.keys(k).filter(id=>!b[id]).map(id=>({handle:k[id].handle,type:k[id].type,target:k[id].target}));
 const geaendert=[],binaer=[];
 for(const id of Object.keys(b))if(k[id]){
  const x=b[id],y=k[id];
  const same=hash({...x,config:x.type==='function'?stripBinary(x.config):x.config})===hash({...y,config:y.type==='function'?stripBinary(y.config):y.config});
  if(!same){
   const keys=[...new Set([...Object.keys(x.config||{}),...Object.keys(y.config||{})])].filter(key=>hash(x.config?.[key])!==hash(y.config?.[key]));
   geaendert.push({handle:x.handle,felder:keys});
  }else if(x.type==='function'&&hash(x.config)!==hash(y.config))binaer.push({handle:x.handle,wasmVorher:x.config?.module_metadata?.module_wasm_size_bytes,wasmNachher:y.config?.module_metadata?.module_wasm_size_bytes});
 }
 const erwartetNeu=neu.length===1&&neu[0].handle==='gravuru-checkout-guard'&&neu[0].type==='function'&&neu[0].target==='cart.validations.generate.run';
 const preis=binaer.filter(x=>x.handle==='gravuru-personalization-price'),guard=binaer.filter(x=>x.handle==='gravuru-checkout-guard'),andere=binaer.filter(x=>!['gravuru-personalization-price','gravuru-checkout-guard'].includes(x.handle));
 let ok;
 if(stufe==='A')ok=!fehlt.length&&erwartetNeu&&!geaendert.length&&!andere.length&&!guard.length&&preis.length<=1&&preis.every(x=>x.wasmNachher===BUNDLE.aktiv.wasmBytes);
 else ok=!fehlt.length&&!neu.length&&!geaendert.length&&!andere.length&&preis.length===1&&preis[0].wasmNachher===BUNDLE.preis.wasmBytes&&guard.every(x=>x.wasmNachher===BUNDLE.pruefung.wasmBytes&&x.wasmVorher===BUNDLE.pruefung.wasmBytes);
 return {ok,fehlt,neu,geaendert,binaer,moduleVorher:Object.keys(b).length,moduleNachher:Object.keys(k).length};
}
async function pruefen(){
 const stufe=args.stufe;if(!TAGS[stufe])fail('argumente');
 const {c,t}=await client();
 const versions=(await c.appVersions(APP)).app?.appVersions?.nodes||[];const active=versions.filter(v=>v.status==='active');
 const before=await c.activeAppVersion({apiKey:APP_KEY}),cand=await c.appVersionByTag(APP,TAGS[stufe]);
 noToken(JSON.stringify(cand),t);save('kandidat-'+stufe+'.json',cand);save('aktiv-vor-'+stufe+'.json',before);
 out({ok:true,modus:'pruefen',stufe,aktiv:active.map(v=>v.versionTag),kandidat:cand?.versionTag,vergleich:compare(before,cand,stufe)});
}
async function freigeben(){
 const stufe=args.stufe;if(!TAGS[stufe])fail('argumente');
 if(args.bestaetigt!==TAGS[stufe])fail('bestaetigung_fehlt');
 const {c,t}=await client();
 const versions=(await c.appVersions(APP)).app?.appVersions?.nodes||[];const active=versions.filter(v=>v.status==='active');
 const erwartetAktiv=stufe==='A'?ACTIVE_TAG:TAGS.A;if(active.length!==1||active[0].versionTag!==erwartetAktiv)fail('aktive_version_unerwartet',{aktiv:active.map(v=>v.versionTag)});
 const before=await c.activeAppVersion({apiKey:APP_KEY}),cand=await c.appVersionByTag(APP,TAGS[stufe]);
 const v=compare(before,cand,stufe==='B'?'B':'A');if(!v.ok)fail('vergleich_nicht_ok',{vergleich:v});
 const projektDir=path.join(WORK,'projekt-'+stufe),cfg=configName(projektDir);
 const r=cli(['app','release','--path',projektDir,...(cfg?['--config',cfg]:[]),'--version',TAGS[stufe],'--allow-updates','--no-input','--no-color'],t);
 const after=((await c.appVersions(APP)).app?.appVersions?.nodes||[]).filter(x=>x.status==='active');
 out({ok:r.status===0&&after.length===1&&after[0].versionTag===TAGS[stufe],modus:'freigeben',stufe,status:r.status,aktivJetzt:after.map(x=>({tag:x.versionTag,id:x.versionId})),ende:r.text.split('\n').filter(l=>l.trim()).slice(-8)});
}

const modus=args.modus;
try{
 if(modus==='inventar')inventar();
 else if(modus==='wasm-suche')wasmSuche();
 else if(modus==='snapshot')await snapshot();
 else if(modus==='projekt')projekt();
 else if(modus==='kandidat')await kandidat();
 else if(modus==='pruefen')await pruefen();
 else if(modus==='freigeben')await freigeben();
 else fail('modus');
}catch(e){out({ok:false,code:'ausnahme',meldung:String(e?.message||e).slice(0,300)});process.exitCode=2;}
