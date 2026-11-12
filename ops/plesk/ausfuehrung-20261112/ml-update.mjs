// AUSFÜHRUNG AUF DEN TATSÄCHLICHEN DATEN (Freigabe #168 6829898414 „Ja, Gesamtpaket ausführen“, Umfang f26ada8):
// natives Update des Acryl-Hauptprodukts cfg_8e7ebe96… von Revision 1 auf Revision 2 – genau EIN nativer Produktstand,
// keine Shopify-Änderung, keine Bindung, keine Katalogfreigabe. Gleicher Ablauf wie der geprüfte Kopienpilot uo-pilot.mjs
// (Teil A), nur ohne Kopie und mit der tatsächlichen Zustimmungsakte. Adapter, Review, Zielmodell und XLSX unverändert.
//   node ml-update.mjs               -> nur Vorprüfung gegen die Review-Pins (schreibt nichts in die Datenbanken)
//   node ml-update.mjs --ausfuehren  -> Vorprüfung, dann das Update; bricht bei der ersten Abweichung ohne Schreiben ab
// Voraussetzung für --ausfuehren: frische Sicherung (neuester Ordner in sicherungen-db/, jünger als 90 Minuten, nach 17:23Z).
import './vh-netzwaechter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL,fileURLToPath} from 'node:url';
const hier=import.meta.dirname,P=process.env.ML_P||path.resolve(hier,'..');
const RT=process.env.ML_RT||path.join(P,'kandidat-f85390b-20261112'),BASIS=process.env.ML_BASIS||path.join(P,'sicherungen-db'),LIVE=process.env.ML_LIVE||path.join(P,'acryl-employee-20261021-v1','data');
const ZIEL=path.join(BASIS,'kopientest-e49659f-20261111/main-target-preserved-metadata.preview.json'),REVIEW=path.join(BASIS,'updatebeobachtung-20261112/main-update-review.json');
const ZIEL_SHA='ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407',REVIEW_SHA='d980417e45469b4d34f2fbd9abff746cf6cdbe7864e67b2f416fc2561f7ad8d8',REVIEW_HASH='8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d';
const EXCEL='Tuerschild-Acrylglas-3mm_v7.xlsx',EXCEL_SHA='65d706e1a99cc599ba7a1c577de028208a5efd356f97bd997f68be3f899cde29';
const ZIEL_DOK='f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285',ZIEL_META='52476368aa083eebf168c30f1f2ea54415b18f1d6c02b53e41173fa58a2ef075';
const PINS={'ops/issue230-main-update-review-20261111/update-review.mjs':'6f68a00b590b6dedb5af29229fea816e31b4cab2bea5e937a67ed220a9fdd571','ops/issue230-main-resource-pins-20261111/read-resource-pins.mjs':'18952021f08bd9643d905c446ac502c0739edd7d6ae692254158004211f946b8','app/workshop/http.mjs':'e2d7071c46463ed097044dc979f22796670804e5dda4c389f84684a4fce0948f','app/workshop/repository.mjs':'f9bba8887d956d283fd14cfd34a9455de2130d45ad75a7e5042b458a307bb4b1','app/workshop/profile-library.mjs':'d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51','app/workshop/production-profiles.mjs':'931d595d1abc374d84da7330476218f1f319aacc2648aa8210f1b8b9076c4cb3','app/workshop/design-assets.mjs':'888d6935c1b59dd189589ebb6ee16c54402bfc203d731e42bb4b276d70a2bdf1','app/workshop/product-model.mjs':'f452d2590c6c9ec00fac260fd154d8fb5ec4f0fed1b7d34f98d16d594ae114a8','app/workshop/font-library.mjs':'fa34d4855716547b5c4ebfa453b036f9ab73a6e73c417f834e03aee87a89415b','app/workshop/form-product.mjs':'eb932fef506d1878c66aec741545ef3f1618cc4783bd184e6fb5e559751e3754','app/workshop/catalog.mjs':'0d236f7873f3fae1bdaed174511164a08fc3af0a4424c993481730f8dcb88459','app/configurator/variant-m/build.mjs':'b7dfb58afb136ed6ad6939b6a9df0a56c26eef4b16e5926c3b700594dd4fb782'};
const TENANT='gravuru',PRODUKT='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',IMPORTKEY='issue230.main-acryl.16190784602492.rev1-to2',DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'];
// Tatsächliche Zustimmung: wörtliche Nutzerantwort, von Astra übermittelt und in #168 dokumentiert
const ENTSCHEIDUNG={accepted:true,actor:'Chris (Nutzer, gravuru GmbH); ausgefuehrt durch Claude',quote:'Ja, Gesamtpaket ausführen',source:'GitHub Chris83638w/gravuru-2027 Issue 168 Kommentar 6829898414 (woertliche Nutzerantwort auf die gemeinsame Ausfuehrungsfrage, Umfang f26ada8; von Astra uebermittelt)',recordedAt:'2026-11-12T16:46:42Z'};
const AUSFUEHREN=process.argv.includes('--ausfuehren');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const log=e=>console.log(JSON.stringify({event:'ml_update',...e}));
const imp=p=>import(pathToFileURL(path.join(RT,p)).href);
const kurzFehler=e=>({code:e?.code??null,message:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300)});
let schritt='start';const ergebnis={schema:'gravuru-mainupdate-ausfuehrung/v1',kennzeichnung:AUSFUEHREN?'AUSFÜHRUNG auf den tatsächlichen Daten - natives Update Hauptacryl R1→R2; kein Shopify, keine Bindung, keine Katalogfreigabe':'VORPRÜFUNG auf den tatsächlichen Daten - es wird nichts geschrieben',erstellt:new Date().toISOString(),kandidat:path.basename(RT),modus:AUSFUEHREN?'ausfuehren':'vorpruefung'};
const zu=[];
try{
 schritt='pins';if(!process.env.ML_OHNE_PINS)for(const [f,h] of Object.entries(PINS))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Prüfsumme weicht ab: '+f);
 schritt='eingaben';if(dateiSha(ZIEL)!==ZIEL_SHA)throw new Error('Zielmodell weicht ab.');
 const reviewBytes=fs.readFileSync(REVIEW);if(sha(reviewBytes)!==REVIEW_SHA)throw new Error('Review weicht ab.');
 const review=JSON.parse(reviewBytes);if(review.reviewHash!==REVIEW_HASH)throw new Error('reviewHash weicht ab.');
 const excel=fs.readFileSync(path.join(hier,EXCEL));if(sha(excel)!==EXCEL_SHA)throw new Error('XLSX weicht ab.');
 const target=JSON.parse(fs.readFileSync(ZIEL,'utf8'));
 ergebnis.eingaben={reviewHash:review.reviewHash,reviewSha256:REVIEW_SHA,zielmodellSha256:ZIEL_SHA,excel:{datei:EXCEL,sha256:EXCEL_SHA,bytes:excel.length},skriptSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url)))};
 // Sicherung: muss nach dem Abschluss der sechs Entwürfe entstanden und frisch sein
 schritt='sicherung';const stand=fs.readdirSync(BASIS).filter(n=>/^\d{8}T\d{6}Z$/.test(n)).sort().at(-1)||'';
 const alterMin=(Date.now()-Date.parse(stand.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z')))/60000;
 const manifest=stand&&fs.existsSync(path.join(BASIS,stand,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(BASIS,stand,'manifest.json'),'utf8')).dateien:null;
 const sicherungOk=!!manifest&&DBS.every(f=>fs.existsSync(path.join(BASIS,stand,f))&&fs.statSync(path.join(BASIS,stand,f)).size===manifest[f].bytes)&&(process.env.ML_TEST_SICHERUNG==='1'||(stand>'20261112T172300Z'&&alterMin>=0&&alterMin<=90));
 ergebnis.sicherungVorher={stand,alterMinuten:Math.round(alterMin),frischUndVollstaendig:sicherungOk};
 if(AUSFUEHREN&&!sicherungOk)throw new Error('Keine frische vollständige Sicherung vorhanden.');
 const ts=ergebnis.erstellt.replace(/[-:]/g,'').slice(0,15)+'Z',U=path.join(BASIS,(AUSFUEHREN?'mainupdate-live-':'mainupdate-vorpruefung-')+ts),bau=path.join(U,'bau');
 fs.mkdirSync(U,{mode:0o700});fs.mkdirSync(bau,{mode:0o700});ergebnis.ordner=path.basename(U);ergebnis.daten='acryl-employee-20261021-v1/data (tatsächliche Dateien)';
 schritt='bau';const {build}=await imp('app/configurator/variant-m/build.mjs');build({outputDirectory:bau});
 const seed=JSON.parse(fs.readFileSync(path.join(bau,'models.json'),'utf8'))[0];
 schritt='module';
 const [{createFontLibrary},{createProfileLibrary},{createProductionProfiles},{createDesignAssetStore},{workshopCatalog},{validateProductDocument},{isFormProduct},{productOverview},{createProductRepository},adapter,{createNativeUpdateResourcePinReader}]=await Promise.all(['app/workshop/font-library.mjs','app/workshop/profile-library.mjs','app/workshop/production-profiles.mjs','app/workshop/design-assets.mjs','app/workshop/catalog.mjs','app/workshop/product-model.mjs','app/workshop/form-product.mjs','app/workshop/product-preview.mjs','app/workshop/repository.mjs','ops/issue230-main-update-review-20261111/update-review.mjs','ops/issue230-main-resource-pins-20261111/read-resource-pins.mjs'].map(imp));
 const wFile=path.join(LIVE,'workshop.sqlite'),aFile=path.join(LIVE,'design-assets.sqlite'),pFile=path.join(LIVE,'profiles.sqlite');
 const zaehle=()=>{const d=new DatabaseSync(wFile,{readOnly:true});try{const n=(q,...a)=>{try{return d.prepare(q).get(...a)?.n??null;}catch{return null;}};return {produkte:n('SELECT COUNT(*) AS n FROM products WHERE tenant_id=?',TENANT),revisionen:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=?',TENANT),importjournal:n('SELECT COUNT(*) AS n FROM import_items WHERE tenant_id=?',TENANT),bindungskoepfe:n('SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id=?',TENANT),bindungsrevisionen:n('SELECT COUNT(*) AS n FROM shop_product_binding_revisions WHERE tenant_id=?',TENANT),formbindungen:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=?',TENANT),preisvertraege:n('SELECT COUNT(*) AS n FROM form_shop_binding_personalization'),katalogfreigaben:n('SELECT COUNT(*) AS n FROM catalog_live_order_approvals'),kopf:n('SELECT revision AS n FROM products WHERE tenant_id=? AND id=?',TENANT,PRODUKT),revisionenProdukt:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=? AND product_id=?',TENANT,PRODUKT),mainR1:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=? AND product_id=? AND product_revision=1',TENANT,PRODUKT),mainR2:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=? AND product_id=? AND product_revision=2',TENANT,PRODUKT)};}finally{d.close();}};
 ergebnis.vorher=zaehle();
 // Dieselben nativen Instanzen wie im Kopienpilot (Nicht-Formprodukt-Zweig aus http.mjs:156), jetzt auf den tatsächlichen Dateien
 schritt='instanzen';
 const fonts=createFontLibrary({filename:aFile,tenantId:TENANT});zu.push(fonts);
 const profiles=createProfileLibrary({filename:pFile,catalog:workshopCatalog(seed.universal.localResources),tenantId:TENANT});zu.push(profiles);profiles.registerFonts(fonts.list());
 const productionProfiles=createProductionProfiles({filename:pFile,tenantId:TENANT});zu.push(productionProfiles);
 const assets=createDesignAssetStore({filename:aFile,tenantId:TENANT});zu.push(assets);
 const nativeValidate=value=>{const document=validateProductDocument(value);if(isFormProduct(document))throw Error('Dieser Anschluss gilt nur für das Haupt-Universalprodukt.');profiles.resolve(document);assets.validateDocument(document);productionProfiles.resolve(document);return document;};
 const nativeSnapshotMetadata=document=>({profiles:profiles.resolve(document),productionProfile:productionProfiles.resolve(document)});
 const readResourcePins=createNativeUpdateResourcePinReader({profiles,productionProfiles});
 const metadataSnapshot=adapter.guardedMetadataSnapshot(nativeSnapshotMetadata,readResourcePins);
 const repository=createProductRepository({filename:wFile,tenantId:TENANT,validateDocument:nativeValidate,snapshotMetadata:metadataSnapshot,catalogOverview:productOverview});zu.push(repository);
 const ctx={repository,metadataSnapshot,readResourcePins};
 // Vorprüfung: dieselben Vergleiche, die der Adapter unter der nativen Schreibsperre noch einmal ausführt
 schritt='vorpruefung';const pol=adapter.MAIN_POLICY,kopf=repository.head(PRODUKT),alt=repository.get(PRODUKT,{revision:1}),pinsIst=readResourcePins(target),pinsSoll=review.observation.resourcePins;
 const metaIst=adapter.digest(repository.previewMetadata(target)),valid=adapter.documentPins(repository.validate(target)),journalVorher=repository.importItem(IMPORTKEY);
 const vp={kopf:{revision:kopf.revision,status:kopf.status},r1:{publishedRevision:alt.publishedRevision,dokument:adapter.documentPins(alt.document).idBindingSha256,metadaten:adapter.digest(alt.metadata)},journalVorher:journalVorher?{id:journalVorher.id,fingerprint:journalVorher.fingerprint}:null,
  ressourcen:{settings:[pinsIst.settings,pinsSoll.settings],profile:[pinsIst.profiles.length,pinsSoll.profiles.length],kategorien:[pinsIst.categoryAssignments,pinsSoll.categoryAssignments],aufloesung:[pinsIst.resolutionSha256,pinsSoll.resolutionSha256],fertigungsprofil:[pinsIst.productionProfile,pinsSoll.productionProfile]},zielMetadaten:metaIst,zielDokument:valid};
 ergebnis.vorpruefung=vp;
 const vorOk={kopf_r1_entwurf:kopf.revision===1&&kopf.status==='draft'&&alt.publishedRevision===null,r1_dokument_gepinnt:vp.r1.dokument===pol.expectedPreimageBindingSha256&&vp.r1.metadaten===review.observation.preimage.metadataSha256,noch_kein_journaleintrag:journalVorher===null,
  ressourcen_wie_review:adapter.digest(pinsIst)===adapter.digest(pinsSoll),zielmetadaten_wie_review:metaIst===review.observation.targetMetadataSha256&&metaIst===ZIEL_META,zieldokument_wie_review:valid.idBindingSha256===review.target.idBindingSha256&&valid.productGroupSha256===review.target.productGroupSha256&&valid.idBindingSha256===ZIEL_DOK,
  bindungen_808_r1:ergebnis.vorher.mainR1===808&&ergebnis.vorher.mainR2===0,sechs_entwuerfe_im_stand:ergebnis.vorher.produkte===1090&&ergebnis.vorher.katalogfreigaben===26};
 ergebnis.vorpruefungen=vorOk;const vorGruen=Object.values(vorOk).every(Boolean);
 if(!AUSFUEHREN||!vorGruen){
  ergebnis.nachher=zaehle();ergebnis.unveraendert=JSON.stringify(ergebnis.vorher)===JSON.stringify(ergebnis.nachher);ergebnis.bestanden=vorGruen&&ergebnis.unveraendert&&!AUSFUEHREN;if(AUSFUEHREN)ergebnis.abgebrochen='Vorprüfung nicht grün - nichts geschrieben';
 }else{
  schritt='zustimmung';const approval=adapter.makeApprovalEvidence({review,acceptedReviewHash:review.reviewHash,excelAddendum:{file:EXCEL,sha256:EXCEL_SHA},decision:ENTSCHEIDUNG},target);
  const za=adapter.writeNewJson(path.join(U,'ZUSTIMMUNG-update.json'),approval);ergebnis.zustimmung={approvalHash:approval.approvalHash,datei:'ZUSTIMMUNG-update.json',sha256:za.sha256,bytes:za.bytes,actor:ENTSCHEIDUNG.actor,quote:ENTSCHEIDUNG.quote,recordedAt:ENTSCHEIDUNG.recordedAt};
  schritt='update';const t=Date.now(),r=adapter.executeApprovedUpdate(ctx,{review,approval,target,excelAddendumBytes:excel,execute:true});
  const q=adapter.writeNewJson(path.join(U,'QUITTUNG-update.json'),r);
  schritt='readback';const nach=zaehle(),v=ergebnis.vorher,journal=repository.importItem(IMPORTKEY),kopfNeu=repository.head(PRODUKT),r2=repository.get(PRODUKT,{revision:2}),r1=repository.get(PRODUKT,{revision:1});
  ergebnis.update={ms:Date.now()-t,quittung:{datei:'QUITTUNG-update.json',sha256:q.sha256,bytes:q.bytes,receiptHash:r.receiptHash,revision:r.revision,replayed:r.replayed,newRevisions:r.newRevisions,createdProducts:r.createdProducts,document:r.document,metadataSha256:r.metadataSha256,importKey:r.importKey,importFingerprint:r.importFingerprint,reviewHash:r.reviewHash,approvalHash:r.approvalHash,excelSha256:r.excelSha256,shopifyWrites:r.shopifyWrites,bindingWrites:r.bindingWrites,catalogApprovals:r.catalogApprovals,publications:r.publications,checkedUnderNativeWriteLockAt:r.checkedUnderNativeWriteLockAt},
   journal:journal?{key:journal.key??IMPORTKEY,id:journal.id,fingerprint:journal.fingerprint}:null,kopf:{revision:kopfNeu.revision,status:kopfNeu.status},r2:{dokument:adapter.documentPins(r2.document).idBindingSha256,metadaten:adapter.digest(r2.metadata),publishedRevision:r2.publishedRevision,createdAt:r2.createdAt},r1Erhalten:adapter.documentPins(r1.document).idBindingSha256===pol.expectedPreimageBindingSha256&&adapter.digest(r1.metadata)===review.observation.preimage.metadataSha256};
  ergebnis.nachher=nach;const gl=ks=>ks.every(k=>v[k]===nach[k]);
  ergebnis.pruefungen={...vorOk,update_rev2:r.revision===2&&r.replayed===false&&r.newRevisions===1&&r.createdProducts===0,eine_neue_revision:nach.revisionen===v.revisionen+1&&nach.revisionenProdukt===v.revisionenProdukt+1&&nach.kopf===2&&kopfNeu.status==='draft',ein_journaleintrag:nach.importjournal===v.importjournal+1&&journal?.id===PRODUKT&&journal?.fingerprint===review.importFingerprint,
   r2_dokument_und_metadaten_gepinnt:ergebnis.update.r2.dokument===ZIEL_DOK&&ergebnis.update.r2.metadaten===ZIEL_META&&r.document.idBindingSha256===ZIEL_DOK&&r.metadataSha256===ZIEL_META,r1_unveraendert_lesbar:ergebnis.update.r1Erhalten===true,
   produkte_bindungen_vertraege_katalog_unveraendert:gl(['produkte','bindungskoepfe','bindungsrevisionen','formbindungen','preisvertraege','katalogfreigaben','mainR1','mainR2']),keine_shopify_bindungs_katalogaktion:r.shopifyWrites===0&&r.bindingWrites===0&&r.catalogApprovals===0&&r.publications===0};
  ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(Boolean);
 }
 for(const x of zu.reverse())try{x.close?.();}catch{}
 const beleg=path.join(U,(AUSFUEHREN?'AUSFUEHRUNG':'VORPRUEFUNG')+'-mainupdate.json');fs.writeFileSync(beleg,JSON.stringify(ergebnis,null,1),{flag:'wx',mode:0o600});ergebnis.belegSha256=dateiSha(beleg);
 log({modus:ergebnis.modus,ordner:ergebnis.ordner,bestanden:ergebnis.bestanden,abgebrochen:ergebnis.abgebrochen??null,belegSha256:ergebnis.belegSha256,belegBytes:fs.statSync(beleg).size,skriptSha256:ergebnis.eingaben.skriptSha256,sicherung:ergebnis.sicherungVorher,vorpruefungen:Object.entries(ergebnis.vorpruefungen).map(([k,w])=>(w?'+':'-')+k).join(' '),pruefungen:ergebnis.pruefungen?Object.entries(ergebnis.pruefungen).map(([k,w])=>(w?'+':'-')+k).join(' '):null,vorpruefung:ergebnis.vorpruefung,zustimmung:ergebnis.zustimmung??null,update:ergebnis.update??null,vorher:ergebnis.vorher,nachher:ergebnis.nachher,unveraendert:ergebnis.unveraendert??null});
 if(!ergebnis.bestanden)process.exitCode=1;
}catch(error){for(const x of zu.reverse())try{x.close?.();}catch{}log({...ergebnis,schritt,fehler:kurzFehler(error),bestanden:false});process.exitCode=1;}
