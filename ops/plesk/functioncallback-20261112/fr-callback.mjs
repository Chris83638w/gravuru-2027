// Privater Launcher + verifyActiveFunction-Callback für den Main-Operator v2, über Astras eigenständigen Versionsleser
// (ops/issue230-function-version-reader-20261112, Manifest 2a4ddc33…). Der Leser läuft als eigener Kindprozess; der
// Zugangswert wird nur dort hinein vererbt (Umgebung), nie ausgegeben, nie gespeichert, nie als Argument übergeben.
// Shopify-seitig ausschließlich appVersions + activeAppVersion. Kein deploy/release, keine Datenbank, kein Produkt.
//   node fr-callback.mjs      -> Ende-zu-Ende-Nachweis über createMainFunctionProbe des unveränderten Main-v2-Pakets
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fehler=(code,message=code)=>Object.assign(new Error(message),{code});
// Einzige belegte Zuordnung Version -> Build (README des Leserpakets, Punkt 2; docs/reviews/2026-11-08-steel-pricing-input)
export const BELEGTE_VERSION=Object.freeze({versionId:'gid://shopify/Version/1199363391489',versionTag:'gravuru-2027-steel-pricing-input-20261108-v2',wasmBytes:20977,wasmSha256:'a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2',buildSourceSha256:'5977e9d9a510223d55f2f6635910aa7af97fcd300eaeec6480a56d921129f1a7',functionUid:'3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef'});
export const FORMATE=Object.freeze(['history','v2','valueInput','variantDeltas','variantSequence','variantsFromRevision']);
const APP_ID='gid://shopify/App/423276544001';
export function createVerifyActiveFunction({privateRoot,readerDir,belegDir,log=[]}){
 const KEY=path.join(privateRoot,'gravuru-shopify-app-automation-token'),CLI=path.join(privateRoot,'gravuru-shopify-deploy-tools/node_modules/@shopify/cli'),READER=path.join(readerDir,'active-version-readonly.mjs');let n=0;
 return async function verifyActiveFunction(){
  const nr=++n,datei=path.join(belegDir,'active-version-'+String(nr).padStart(6,'0')+'.json'),eintrag={nr,start:new Date().toISOString()};log.push(eintrag);
  const st=fs.lstatSync(KEY);if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||st.mode&0o077)throw fehler('fr_zugangsdatei');
  let token=fs.readFileSync(KEY,'utf8').trim();if(!/^[\x21-\x7e]{16,8192}$/.test(token))throw fehler('fr_zugangsform');
  const env={...process.env,SHOPIFY_APP_AUTOMATION_TOKEN:token};delete env.NODE_TLS_REJECT_UNAUTHORIZED;
  const r=await new Promise((resolve,reject)=>{const kind=spawn(process.execPath,[READER,'--cli-root',CLI,'--out',datei],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});let out='',err='';kind.stdout.on('data',d=>{out+=d;});kind.stderr.on('data',d=>{err+=d;});const t=setTimeout(()=>kind.kill('SIGKILL'),50000);kind.on('error',e=>{clearTimeout(t);reject(fehler('fr_start',String(e.code||'start')));});kind.on('close',code=>{clearTimeout(t);resolve({code,out,err});});});
  const errText=String(r.err).replaceAll(token,'[entfernt]').slice(0,300),ausgabeSauber=!r.out.includes(token);token='';if(!ausgabeSauber)throw fehler('fr_ausgabe_gesperrt');
  eintrag.exit=r.code;
  if(r.code!==0){let code='fr_leser_fehlgeschlagen';try{code=JSON.parse(r.err.trim().split('\n').pop()).code||code;}catch{}eintrag.code=code;throw fehler(code,'Leser beendet mit '+r.code+': '+errText);}
  let std;try{std=JSON.parse(r.out.trim().split('\n').pop());}catch{throw fehler('fr_leser_ausgabe');}
  const bytes=fs.readFileSync(datei);if(std.ok!==true||std.mutations!==0||std.readOnly!==true||bytes.length!==std.outputBytes||sha(bytes)!==std.outputSha256)throw fehler('fr_beleg_hash');
  const b=JSON.parse(bytes),f=b.function;
  if(b.schema!=='issue230-active-app-version-readonly/v1'||b.readOnly!==true||b.mutations!==0||b.appId!==APP_ID||b.versionReadBracketStable!==true||b.wasmDigestRead!==false||b.activeVersion?.status!=='active'||f?.registrationId!==BELEGTE_VERSION.functionUid||f.handle!=='gravuru-personalization-price'||f.target!=='cart.transform.run')throw fehler('fr_beleg_schema');
  // Drift: der bekannte WASM-Hash wird NIE an eine andere Version oder Modulgröße gehängt
  if(b.activeVersion.versionId!==BELEGTE_VERSION.versionId||b.activeVersion.versionTag!==BELEGTE_VERSION.versionTag||f.wasmBytes!==BELEGTE_VERSION.wasmBytes)throw fehler('fr_aktive_version_unbelegt','Aktive Version oder Modulgröße ohne belegte Build-Zuordnung');
  Object.assign(eintrag,{datei:path.basename(datei),bytes:bytes.length,sha256:std.outputSha256,observedAt:b.observedAt,readStartedAt:b.readStartedAt,readCompletedAt:b.readCompletedAt,versionId:b.activeVersion.versionId,versionTag:b.activeVersion.versionTag,releaseSnapshot:b.releaseId,moduleCount:b.moduleCount,function:{registrationUuid:f.registrationUuid,moduleId:f.moduleId,wasmBytes:f.wasmBytes,inputQuerySha256:f.inputQuerySha256,containsJsonValue:f.containsJsonValue,containsValue:f.containsValue,configSha256:f.configSha256},reader:b.reader});
  return {schema:'issue230-active-pricing-function-evidence/v1',releaseId:b.activeVersion.versionId,wasmSha256:BELEGTE_VERSION.wasmSha256,buildSourceSha256:BELEGTE_VERSION.buildSourceSha256,observedAt:b.observedAt,reviewEvidenceSha256:std.outputSha256,formats:[...FORMATE]};
 };
}
// ---- Ende-zu-Ende-Nachweis (nur bei direktem Aufruf)
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const hier=import.meta.dirname,P=fs.realpathSync(process.env.FR_P||path.resolve(hier,'..')),BASIS=path.join(P,'sicherungen-db'),OP=path.join(BASIS,'mainanschluss-20261112T105018Z','paket');
 const MAX=Number(process.env.FR_MAX_ALTER_MS||60000),WARTE=Number(process.env.FR_WARTE_MS||62000),READER_MANIFEST='2a4ddc33fa888c458312ee0d9d0623b082c7dad72bdeb3fcfaf7488379a57d83',OP_MANIFEST='de182709cb4c004d338f666186cfa2785b755a708605adcf4d58b0c25721f416';
 const out={event:'fr_callback',schema:'gravuru-functioncallback-nachweis/v1',kennzeichnung:'Echter frischer Functioncallback über Host-CLI und erneuerten Zugang; nur Lesen bei Shopify; kein Operatorlauf, kein Plan, kein Produkt',zeit:new Date().toISOString()};let schritt='start';
 try{
  schritt='pakete';const sammel=JSON.parse(fs.readFileSync(path.join(hier,'fr-paket.json'),'utf8')),mb=Buffer.from(sammel['manifest.json'],'base64');if(sha(mb)!==READER_MANIFEST)throw fehler('fr_manifest');
  for(const f of JSON.parse(mb).files)if(sha(Buffer.from(sammel[f.path??f.file]??'','base64'))!==f.sha256)throw fehler('fr_paketdatei',f.path??f.file);
  if(sha(fs.readFileSync(path.join(OP,'manifest.json')))!==OP_MANIFEST)throw fehler('fr_operatormanifest');for(const f of JSON.parse(fs.readFileSync(path.join(OP,'manifest.json'))).files)if(sha(fs.readFileSync(path.join(OP,f.path)))!==f.sha256)throw fehler('fr_operatordatei',f.path);
  process.umask(0o077);const ts=out.zeit.replace(/[-:]/g,'').slice(0,15)+'Z',U=path.join(BASIS,'functioncallback-'+ts),readerDir=path.join(U,'reader'),belegDir=path.join(U,'belege');for(const d of [U,readerDir,belegDir])fs.mkdirSync(d,{mode:0o700});
  for(const [name,b64] of Object.entries(sammel))fs.writeFileSync(path.join(readerDir,name),Buffer.from(b64,'base64'),{flag:'wx',mode:0o600});
  out.ordner=path.basename(U);out.pakete={readerManifest:READER_MANIFEST,operatorManifest:OP_MANIFEST,callbackSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),maxAlterMs:MAX};
  schritt='probe';const {createMainFunctionProbe}=await import(pathToFileURL(path.join(OP,'main-pricing.mjs')).href),lesungen=[];
  const verifyActiveFunction=createVerifyActiveFunction({privateRoot:P,readerDir,belegDir,log:lesungen}),probe=createMainFunctionProbe({verifyActiveFunction,maxAgeMs:MAX});
  const erwartet={schema:'issue230-active-pricing-function-evidence/v1',releaseId:BELEGTE_VERSION.versionId,wasmSha256:BELEGTE_VERSION.wasmSha256,buildSourceSha256:BELEGTE_VERSION.buildSourceSha256,observedAt:out.zeit,reviewEvidenceSha256:'0'.repeat(64),formats:[...FORMATE]};
  const A=await probe(erwartet,[...FORMATE]),nachA=lesungen.length,tA=Date.now();
  const B=await probe(erwartet,[...FORMATE]),nachB=lesungen.length;                       // innerhalb der Frist: keine neue Lesung
  let drift=null;try{await probe({...erwartet,releaseId:'gid://shopify/Version/1'},[...FORMATE]);drift='nicht abgewiesen';}catch(e){drift=e.code||'abgewiesen';}const nachDrift=lesungen.length;
  let format=null;try{await probe(erwartet,[...FORMATE,'v3']);format='nicht abgewiesen';}catch(e){format=e.code||'abgewiesen';}
  schritt='warten';await new Promise(r=>setTimeout(r,WARTE));
  schritt='probe-neu';const C=await probe(erwartet,[...FORMATE]),nachC=lesungen.length;      // nach der Frist: wirklich neu gelesen
  const alter=l=>Date.parse(l.readCompletedAt)-Date.parse(l.observedAt);
  out.lesungen=lesungen;out.probe={A,B,C,lesungenNachA:nachA,nachB,nachDrift,nachC,wartezeitMs:Date.now()-tA,driftAndereVersion:drift,unbelegtesFormat:format};
  out.pruefungen={erste_lesung_echt:nachA===1&&lesungen[0].exit===0&&A.reviewEvidenceSha256===lesungen[0].sha256&&A.observedAt===lesungen[0].observedAt,innerhalb_frist_keine_neue_lesung:nachB===1&&B.observedAt===A.observedAt,drift_andere_version_abgewiesen:drift==='pricing_active_function_changed'&&nachDrift===1,unbelegtes_format_abgewiesen:format==='pricing_function_format_unproven',nach_frist_neu_gelesen:nachC===2&&C.observedAt!==A.observedAt&&Date.parse(C.observedAt)>Date.parse(A.observedAt)&&C.reviewEvidenceSha256===lesungen[1].sha256&&C.reviewEvidenceSha256!==A.reviewEvidenceSha256,
   identitaet_belegte_version:lesungen.every(l=>l.versionId===BELEGTE_VERSION.versionId&&l.versionTag===BELEGTE_VERSION.versionTag&&l.function.wasmBytes===20977),gleiche_module_in_beiden_lesungen:lesungen.length===2&&lesungen[0].function.configSha256===lesungen[1].function.configSha256&&lesungen[0].function.moduleId===lesungen[1].function.moduleId,belege_privat_0600:lesungen.every(l=>(fs.statSync(path.join(belegDir,l.datei)).mode&0o777)===0o600),zeitpunkte_aus_lesung:lesungen.every(l=>l.readStartedAt<=l.observedAt&&l.observedAt<=l.readCompletedAt&&alter(l)<5000)};
  out.bestanden=Object.values(out.pruefungen).every(Boolean);
  const text=JSON.stringify(out,null,1);fs.writeFileSync(path.join(U,'NACHWEIS-functioncallback.json'),text,{flag:'wx',mode:0o600});out.belegSha256=sha(text);out.belegBytes=Buffer.byteLength(text);console.log(JSON.stringify(out));
 }catch(e){console.log(JSON.stringify({...out,schritt,bestanden:false,fehler:{code:e?.code??null,message:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300)}}));process.exitCode=1;}
}
