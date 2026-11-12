// Update-Beobachtung für das Hauptacryl (cfg_8e7ebe96…, Rev 1 → geplantes Ziel) auf einer NEUEN Wegwerfkopie der drei
// Acryl-Datenbanken aus der Sicherung 20261111T212859Z. Nativer Anschluss nach Astras Beschreibung
// (docs/reviews/2026-11-11-operator-copy-context/main-update-native-context.md): derselbe Nicht-Formprodukt-Validator wie
// http.mjs:156, native Metadaten, productOverview, Ressourcenpin-Leser, guardedMetadataSnapshot.
// Führt NUR captureUpdateObservation sowie die CLI-Schritte prepare und verify aus. Kein Update, kein Import, keine
// Zustimmung; kein Netz, keine Live-Datenbank, keine Shopify-Funktion.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
const hier=import.meta.dirname,P=process.env.UO_P||path.resolve(hier,'..');
const RT=process.env.UO_RT||path.join(P,'kandidat-f85390b-20261112');
const SICH=process.env.UO_SICH||path.join(P,'sicherungen-db/20261111T212859Z');
const U=process.env.UO_U||path.join(P,'sicherungen-db/updatebeobachtung-20261112');
const ZIEL=process.env.UO_ZIEL||path.join(P,'sicherungen-db/kopientest-e49659f-20261111/main-target-preserved-metadata.preview.json');
const KATEGORIEN=process.env.UO_KAT||path.join(P,'sicherungen-db/kopientest-e49659f-20261111/main-target-category-comparison-20261111T225736Z.json');
const ZIEL_SHA='ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407',KAT_SHA='52a8c92658d09e234761ffa2767769a361c940c30b5606ff6330ce0be5984381';
const PINS={'ops/issue230-main-update-review-20261111/update-review.mjs':'6f68a00b590b6dedb5af29229fea816e31b4cab2bea5e937a67ed220a9fdd571','ops/issue230-main-update-review-20261111/update-review-cli.mjs':'9c17835a31d621ee696c063c523960206b824f7c51e9e446d35e4cd8429f40ac','ops/issue230-main-update-review-20261111/origin.json':'8de48fc6e010062cbc7a4f9084b5a90eba526c2b51c1eb8f596dbba7db6ec9f5','ops/issue230-main-resource-pins-20261111/read-resource-pins.mjs':'18952021f08bd9643d905c446ac502c0739edd7d6ae692254158004211f946b8',
 'app/workshop/http.mjs':'e2d7071c46463ed097044dc979f22796670804e5dda4c389f84684a4fce0948f','app/workshop/repository.mjs':'f9bba8887d956d283fd14cfd34a9455de2130d45ad75a7e5042b458a307bb4b1','app/workshop/profile-library.mjs':'d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51','app/workshop/production-profiles.mjs':'931d595d1abc374d84da7330476218f1f319aacc2648aa8210f1b8b9076c4cb3','app/workshop/design-assets.mjs':'888d6935c1b59dd189589ebb6ee16c54402bfc203d731e42bb4b276d70a2bdf1','app/workshop/font-library.mjs':'fa34d4855716547b5c4ebfa453b036f9ab73a6e73c417f834e03aee87a89415b','app/workshop/product-model.mjs':'f452d2590c6c9ec00fac260fd154d8fb5ec4f0fed1b7d34f98d16d594ae114a8','app/workshop/product-preview.mjs':'e0b7a15e0586b388e37c2029df9649d512632f753158ffaa0a5ae390f49d1c49','app/workshop/form-product.mjs':'eb932fef506d1878c66aec741545ef3f1618cc4783bd184e6fb5e559751e3754','app/workshop/catalog.mjs':'0d236f7873f3fae1bdaed174511164a08fc3af0a4424c993481730f8dcb88459','app/configurator/variant-m/build.mjs':'b7dfb58afb136ed6ad6939b6a9df0a56c26eef4b16e5926c3b700594dd4fb782'};
const DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'],TENANT='gravuru';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const log=e=>console.log(JSON.stringify({event:'uo_beobachtung',...e}));
const imp=p=>import(pathToFileURL(path.join(RT,p)).href);
const kurzFehler=e=>({code:e?.code??null,message:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,400)});
let schritt='start';
try{
 if(!process.env.UO_OHNE_PINS)for(const [f,h] of Object.entries(PINS))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Prüfsumme weicht ab: '+f);
 if(dateiSha(ZIEL)!==ZIEL_SHA)throw new Error('Zielmodell weicht ab.');
 // Kategorienbeleg: tatsächliche Datei und deren eigene Erfolgsmerkmale
 const katBytes=fs.readFileSync(KATEGORIEN);if(sha(katBytes)!==KAT_SHA)throw new Error('Kategorienbeleg weicht ab.');
 const kat=JSON.parse(katBytes),ce=kat.resourceProfiles?.categoryEvidence;
 const katMerkmale={comparisonCompleted:kat.comparisonCompleted===true,identityAndCoveragePassed:kat.identityAndCoveragePassed===true,issuesLeer:Array.isArray(kat.issues)&&kat.issues.length===0,resolverGeprueft:ce?.resolverSource?.checked===true,kategorienAendernAuswahlNicht:Array.isArray(ce?.categoryChangesSelections)&&ce.categoryChangesSelections.length===0,kategorienAendernQuellenNicht:Array.isArray(ce?.categoryChangesSources)&&ce.categoryChangesSources.length===0,zielIstDasNeue:kat.target?.proposedProductGroupDocumentSha256===ZIEL_SHA};
 const katBestanden=Object.values(katMerkmale).every(Boolean);
 // 1. neue Wegwerfkopie
 schritt='kopie';fs.mkdirSync(U,{mode:0o700});const daten=path.join(U,'daten'),bau=path.join(U,'bau');fs.mkdirSync(daten,{mode:0o700});fs.mkdirSync(bau,{mode:0o700});
 const manifest=JSON.parse(fs.readFileSync(path.join(SICH,'manifest.json'),'utf8')).dateien,kopien={};
 for(const f of DBS){fs.copyFileSync(path.join(SICH,f),path.join(daten,f),fs.constants.COPYFILE_EXCL);fs.chmodSync(path.join(daten,f),0o600);const s=dateiSha(path.join(daten,f));if(s!==manifest[f].sha256)throw new Error('Kopie weicht ab: '+f);kopien[f]=[manifest[f].bytes,s];}
 // 2. Saat wie der Host: Editorbau in den eigenen Ordner, erstes Modell
 schritt='bau';const {build}=await imp('app/configurator/variant-m/build.mjs');build({outputDirectory:bau});
 const seed=JSON.parse(fs.readFileSync(path.join(bau,'models.json'),'utf8'))[0];
 // 3. native Instanzen auf den zusammengehörigen Kopien
 schritt='instanzen';
 const [{createFontLibrary},{createProfileLibrary},{createProductionProfiles},{createDesignAssetStore},{workshopCatalog},{validateProductDocument},{isFormProduct},{productOverview},{createProductRepository},adapter,{createNativeUpdateResourcePinReader}]=await Promise.all(['app/workshop/font-library.mjs','app/workshop/profile-library.mjs','app/workshop/production-profiles.mjs','app/workshop/design-assets.mjs','app/workshop/catalog.mjs','app/workshop/product-model.mjs','app/workshop/form-product.mjs','app/workshop/product-preview.mjs','app/workshop/repository.mjs','ops/issue230-main-update-review-20261111/update-review.mjs','ops/issue230-main-resource-pins-20261111/read-resource-pins.mjs'].map(imp));
 const wFile=path.join(daten,'workshop.sqlite'),aFile=path.join(daten,'design-assets.sqlite'),pFile=path.join(daten,'profiles.sqlite');
 const fonts=createFontLibrary({filename:aFile,tenantId:TENANT});
 const profiles=createProfileLibrary({filename:pFile,catalog:workshopCatalog(seed.universal.localResources),tenantId:TENANT});profiles.registerFonts(fonts.list());
 const productionProfiles=createProductionProfiles({filename:pFile,tenantId:TENANT});
 const assets=createDesignAssetStore({filename:aFile,tenantId:TENANT});
 // Vollständiger nativer Validator: exakt der Nicht-Formprodukt-Zweig aus http.mjs:156
 const nativeValidate=value=>{const document=validateProductDocument(value);if(isFormProduct(document))throw Error('Dieser Anschluss gilt nur für das Haupt-Universalprodukt.');profiles.resolve(document);assets.validateDocument(document);productionProfiles.resolve(document);return document;};
 const nativeSnapshotMetadata=document=>({profiles:profiles.resolve(document),productionProfile:productionProfiles.resolve(document)});
 const readResourcePins=createNativeUpdateResourcePinReader({profiles,productionProfiles});
 const metadataSnapshot=adapter.guardedMetadataSnapshot(nativeSnapshotMetadata,readResourcePins);
 const repository=createProductRepository({filename:wFile,tenantId:TENANT,validateDocument:nativeValidate,snapshotMetadata:metadataSnapshot,catalogOverview:productOverview});
 const context={repository,metadataSnapshot,readResourcePins};
 // 4. Beobachtung
 schritt='ziel';const target=JSON.parse(fs.readFileSync(ZIEL,'utf8'));
 const selbst=sha(fs.readFileSync(fileURLToPath(import.meta.url)));
 const evidence={categoryComparisonSha256:KAT_SHA,categoryComparisonPassed:katBestanden,nativeValidatorContract:'native-product+resources+assets+manufacturing',nativeValidatorSourceSha256:selbst};
 let kopf=null;try{const h=repository.head('cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0');kopf={revision:h.revision,status:h.status};}catch(e){kopf={fehler:kurzFehler(e)};}
 // Einzelschritte getrennt ausweisen, damit ein Fehler die genaue Stelle nennt
 const teil={};
 for(const [name,fn] of [['validatorSchema',()=>validateProductDocument(target)],['ressourcen',()=>profiles.resolve(target)],['assets',()=>assets.validateDocument(target)],['fertigung',()=>productionProfiles.resolve(target)],['katalogprojektion',()=>productOverview(target)]]){const t=Date.now();try{const r=fn();teil[name]={ok:true,ms:Date.now()-t,...(name==='ressourcen'?{settingsRevision:r?.settingsRevision,warnungen:Array.isArray(r?.warnings)?r.warnings.length:null,quellen:r?.sources?Object.fromEntries(Object.entries(r.sources).map(([k,v])=>[k,v?.level??null])):null}:{}),...(name==='fertigung'?{ergebnis:r===null?null:{id:r.id,revision:r.revision,productionReady:r.productionReady,blocker:Array.isArray(r.blockers)?r.blockers.length:null}}:{}),...(name==='katalogprojektion'?{schluessel:r&&typeof r==='object'?Object.keys(r).slice(0,20):null}:{})};}catch(e){teil[name]={ok:false,ms:Date.now()-t,...kurzFehler(e)};}}
 schritt='beobachtung';let observation=null,beobFehler=null;const t0=Date.now();
 try{observation=adapter.captureUpdateObservation(context,target,{evidence});}catch(e){beobFehler=kurzFehler(e);}
 const ausgabe={schema:'gravuru-update-beobachtung-lauf/v1',erstellt:new Date().toISOString(),kandidat:path.basename(RT),anschlussSkriptSha256:selbst,kopien,kopfVorher:kopf,kategorienbeleg:{sha256:KAT_SHA,merkmale:katMerkmale,bestanden:katBestanden,pending:kat.pending??null,readyForImport:kat.readyForImport??null},einzelschritte:teil,beobachtungMs:Date.now()-t0,beobachtungFehler:beobFehler};
 let review=null,verify=null;
 if(observation){
  const oFile=path.join(U,'observation.json');fs.writeFileSync(oFile,JSON.stringify(observation,null,1),{flag:'wx',mode:0o600});ausgabe.observationSha256=dateiSha(oFile);
  schritt='prepare';const cli=path.join(RT,'ops/issue230-main-update-review-20261111/update-review-cli.mjs'),rFile=path.join(U,'main-update-review.json');
  const p=spawnSync(process.execPath,[cli,'prepare','--target',ZIEL,'--observation',oFile,'--origin',path.join(RT,'ops/issue230-main-update-review-20261111/origin.json'),'--output',rFile],{cwd:RT,encoding:'utf8',maxBuffer:64*1024*1024});
  try{review=JSON.parse(p.stdout.trim().split('\n').at(-1));}catch{review={exit:p.status,stderr:String(p.stderr||'').replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,400)};}
  if(fs.existsSync(rFile)){ausgabe.reviewDateiSha256=dateiSha(rFile);
   schritt='verify';const v=spawnSync(process.execPath,[cli,'verify','--target',ZIEL,'--review',rFile],{cwd:RT,encoding:'utf8',maxBuffer:64*1024*1024});
   try{verify=JSON.parse(v.stdout.trim().split('\n').at(-1));}catch{verify={exit:v.status,stderr:String(v.stderr||'').replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,400)};}}
 }
 // Nachweis: nichts wurde aktualisiert
 let kopfNachher=null;try{const h=repository.head('cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0');kopfNachher={revision:h.revision,status:h.status};}catch(e){kopfNachher={fehler:kurzFehler(e)};}
 Object.assign(ausgabe,{prepare:review,verify,kopfNachher,sicherungUnveraendert:dateiSha(path.join(SICH,'workshop.sqlite'))===manifest['workshop.sqlite'].sha256,kopieNachLauf:Object.fromEntries(fs.readdirSync(daten).map(n=>[n,fs.statSync(path.join(daten,n)).size]))});
 fs.writeFileSync(path.join(U,'lauf.json'),JSON.stringify(ausgabe,null,1),{flag:'wx',mode:0o600});
 log({...ausgabe,observation});
 if(!observation||verify?.verified!==true)process.exitCode=1;
}catch(error){log({schritt,fehler:kurzFehler(error)});process.exitCode=1;}
