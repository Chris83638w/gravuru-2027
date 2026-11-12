// Rein lesender Versionsleser über den vorhandenen privaten Hostweg (derselbe wie ops/shopify/stage-preserved-merchant.mjs:26-32
// und publish-order-scope.mjs:18-22): vorhandene Host-CLI 4.9.0 + dort verbleibender Automation-Zugang.
// Ruft AUSSCHLIESSLICH client.appVersions und client.activeAppVersion auf. Kein deploy, kein release, kein Stage-/Publish-Skript.
// Der Zugangswert wird nie ausgegeben, nie in eine Datei geschrieben und nie übertragen (nur an Shopify selbst über die CLI).
//   node vr-leser.mjs            -> nur Existenz/Eigentümer/Rechte/CLI-Version (liest den Zugangswert NICHT, kein Netz)
//   node vr-leser.mjs --lesen    -> zusätzlich die zwei Lesemethoden, Rohantworten privat in neuem Ordner
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),KEY=path.join(P,'gravuru-shopify-app-automation-token'),CLI=path.join(P,'gravuru-shopify-deploy-tools/node_modules/@shopify/cli'),CHUNK=path.join(CLI,'dist/chunk-Q45XAEG2.js');
const APP={id:'gid://shopify/App/423276544001',organizationId:'172197140',title:'Gravuru Konfigurator'},APP_KEY='9640dd7a6907f0c73e7013ea8c24869b';
const LESEN=process.argv.includes('--lesen'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>sha(JSON.stringify(canonical(v)));
// gleiche Definition wie ops/shopify/steel-pricing-preserved-version.mjs (fingerprint) bzw. order-scope-version.mjs (hashModules)
const fingerprint=modules=>modules.map(m=>({id:m.registrationId,uuid:m.registrationUuid,handle:m.registrationTitle,type:m.type,target:m.target,config:m.config})).sort((a,b)=>a.id.localeCompare(b.id));
let token='';const out={event:'vr_leser',modus:LESEN?'lesen':'pruefen',zeit:new Date().toISOString()};
const zeige=o=>{const text=JSON.stringify(o);if(token&&text.includes(token))throw new Error('Ausgabe enthielte den Zugangswert');console.log(text);};
try{
 // 1. Existenz / Eigentümer / Rechte / CLI-Version – ohne den Zugangswert zu lesen
 const z={vorhanden:false};try{const s=fs.lstatSync(KEY);Object.assign(z,{vorhanden:true,regulaereDatei:s.isFile(),symlink:s.isSymbolicLink(),eigentuemerIstProzess:s.uid===process.getuid(),modus:(s.mode&0o777).toString(8),nurEigentuemer:!(s.mode&0o077),bytes:s.size,geaendert:s.mtime.toISOString()});}catch(e){z.fehler=e.code||'lstat';}
 const c={vorhanden:false};try{const pk=JSON.parse(fs.readFileSync(path.join(CLI,'package.json'),'utf8')),s=fs.lstatSync(CLI);Object.assign(c,{vorhanden:true,name:pk.name,version:pk.version,eigentuemerIstProzess:s.uid===process.getuid(),modus:(s.mode&0o777).toString(8)});const cs=fs.statSync(CHUNK);Object.assign(c,{chunkBytes:cs.size,chunkSha256:sha(fs.readFileSync(CHUNK))});}catch(e){c.fehler=e.code||'cli';}
 out.zugang=z;out.cli=c;out.node=process.version;
 out.bereit=z.vorhanden&&z.regulaereDatei&&!z.symlink&&z.eigentuemerIstProzess&&z.nurEigentuemer&&z.bytes>=16&&z.bytes<=8193&&c.vorhanden&&c.version==='4.9.0'&&c.chunkBytes>0;
 if(LESEN){
  if(!out.bereit)throw Object.assign(new Error('Hostweg nicht bereit'),{code:'vr_nicht_bereit'});
  if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Object.assign(new Error('TLS-Prüfung abgeschaltet'),{code:'vr_tls'});
  process.umask(0o077);
  const ts=out.zeit.replace(/[-:]/g,'').slice(0,15)+'Z',U=path.join(P,'sicherungen-db','versionsleser-'+ts),xdg=path.join(U,'cli-arbeitsordner');fs.mkdirSync(U,{mode:0o700});fs.mkdirSync(xdg,{mode:0o700});
  token=fs.readFileSync(KEY,'utf8').trim();if(!/^[\x21-\x7e]{16,8192}$/.test(token))throw Object.assign(new Error('Zugangswert hat unerwartete Form'),{code:'vr_form'});
  Object.assign(process.env,{SHOPIFY_APP_AUTOMATION_TOKEN:token,SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'true',NO_COLOR:'1',XDG_CONFIG_HOME:xdg,XDG_CACHE_HOME:xdg,XDG_DATA_HOME:xdg,XDG_STATE_HOME:xdg});delete process.env.DEBUG;delete process.env.NODE_DEBUG;
  const {ma:getClient}=await import(pathToFileURL(CHUNK).href);if(typeof getClient!=='function')throw Object.assign(new Error('CLI-Client nicht gefunden'),{code:'vr_client'});
  const voll=getClient(),client={appVersions:a=>voll.appVersions(a),activeAppVersion:a=>voll.activeAppVersion(a)}; // nur diese zwei Lesemethoden
  const save=(name,value)=>{const text=JSON.stringify(value,null,2)+'\n';if(text.includes(token))throw new Error('Rohantwort enthielte den Zugangswert');fs.writeFileSync(path.join(U,name),text,{flag:'wx',mode:0o600});return {datei:name,bytes:Buffer.byteLength(text),sha256:sha(text)};};
  const t0=Date.now(),versions=await client.appVersions(APP),nodes=versions?.app?.appVersions?.nodes;if(!Array.isArray(nodes))throw Object.assign(new Error('appVersions ohne Liste'),{code:'vr_versions'});
  const active=await client.activeAppVersion({apiKey:APP_KEY}),mods=active?.appModuleVersions;if(!Array.isArray(mods))throw Object.assign(new Error('activeAppVersion ohne Module'),{code:'vr_active'});
  delete process.env.SHOPIFY_APP_AUTOMATION_TOKEN;
  const beobachtet=new Date().toISOString(),aktiv=nodes.filter(v=>v.status==='active'),fn=mods.filter(m=>m.type==='function'),th=mods.filter(m=>m.type==='theme_app_extension');
  const kurz=v=>({versionId:v.versionId,versionTag:v.versionTag,status:v.status,createdAt:v.createdAt??null});
  out.ordner=path.basename(U);out.dauerMs=Date.now()-t0;out.beobachtetUm=beobachtet;
  out.dateien=[save('versions.json',versions),save('active.json',active)];
  out.versionen={anzahl:nodes.length,aktiv:aktiv.map(kurz),neueste:nodes.slice(0,4).map(kurz),schluessel:Object.keys(nodes[0]??{}).sort()};
  out.aktiveVersion={schluessel:Object.keys(active).sort(),id:active.id??null,uuid:active.uuid??null,versionTag:active.versionTag??null,name:active.version?.name??null,module:mods.length,typen:mods.map(m=>m.type).sort(),modulHash:hash(fingerprint(mods)),
   function:fn.map(m=>({registrationId:m.registrationId,registrationUuid:m.registrationUuid,titel:m.registrationTitle,target:m.target??null,configSchluessel:Object.keys(m.config??{}).sort(),module_id:m.config?.module_id??null,api_version:m.config?.api_version??null,app_key_passt:m.config?.app_key===APP_KEY,configSha256:hash(m.config),module_metadataSha256:m.config?.module_metadata===undefined?null:hash(m.config.module_metadata),module_metadataSchluessel:m.config?.module_metadata&&typeof m.config.module_metadata==='object'?Object.keys(m.config.module_metadata).sort():typeof m.config?.module_metadata,targets:Array.isArray(m.config?.targets)?m.config.targets.map(t=>({target:t.target??null,input_querySha256:typeof t.input_query==='string'?sha(t.input_query):null,input_queryBytes:typeof t.input_query==='string'?Buffer.byteLength(t.input_query):null,export:t.export??null})):null})),
   theme:th.map(m=>({registrationId:m.registrationId,titel:m.registrationTitle,dateien:Object.keys(m.config?.theme_extension?.files??{}).length,configSha256:hash(m.config)}))};
  const beleg=save('LESEBELEG-aktive-version.json',{schema:'gravuru-aktive-appversion-hostleser/v1',kennzeichnung:'Rein lesend über vorhandene Host-CLI 4.9.0 und vorhandenen Automation-Zugang; nur appVersions + activeAppVersion; kein deploy/release',...out,zugang:{...z,geaendert:undefined}});
  out.dateien.push(beleg);
 }
 out.ok=true;zeige(out);
}catch(error){delete process.env.SHOPIFY_APP_AUTOMATION_TOKEN;const text=String(error?.message||'vr_fehler').replaceAll(token||'__kein_zugangswert__','[entfernt]').replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,400);const aus=JSON.stringify({...out,ok:false,fehler:{code:error?.code??null,message:text}});console.log(token&&aus.includes(token)?JSON.stringify({event:'vr_leser',ok:false,fehler:{code:'vr_ausgabe_gesperrt'}}):aus);process.exitCode=1;}
